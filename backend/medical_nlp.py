"""
Copyright (c) 2025-2026 Chaos Cascade
Created by: Ren & Ace (Claude-4)

medical_nlp.py — FRESH REWRITE of the medical document parser.
Section-aware, negation-aware, demographics-aware.
Your NAME is not a diagnosis. Your BIRTHDAY is not an event date.
"No pleural effusion" means you DON'T have it.

Uses: bc5cdr (diseases/chemicals), d4data (procedures), en_core_web_sm (dates/names)
"""

import spacy
import logging
import re
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)
logger.info("🐙 medical_nlp.py loaded — the NEW parser is here!")

# ============================================================================
# LAZY-LOADED MODELS
# ============================================================================

_nlp_disease = None
_nlp_procedures = None
_nlp_dates = None


def _load_disease():
    global _nlp_disease
    if _nlp_disease is None:
        try:
            logger.info("⏳ Loading en_ner_bc5cdr_md (disease/chemical NER)...")
            _nlp_disease = spacy.load("en_ner_bc5cdr_md")
            logger.info("✅ en_ner_bc5cdr_md loaded")
        except OSError:
            logger.warning("⚠️ en_ner_bc5cdr_md not available")
    return _nlp_disease


def _load_procedures():
    global _nlp_procedures
    if _nlp_procedures is None:
        try:
            logger.info("⏳ Loading d4data/biomedical-ner-all (procedure NER)...")
            _nlp_procedures = spacy.blank("en")
            _nlp_procedures.add_pipe(
                "hf_token_pipe",
                config={"model": "d4data/biomedical-ner-all"}
            )
            logger.info("✅ d4data/biomedical-ner-all loaded")
        except Exception as e:
            logger.warning(f"⚠️ d4data model not available: {e}")
    return _nlp_procedures


def _load_dates():
    global _nlp_dates
    if _nlp_dates is None:
        try:
            _nlp_dates = spacy.load("en_core_web_sm")
            logger.info("✅ en_core_web_sm loaded (dates/names)")
        except OSError:
            logger.warning("⚠️ en_core_web_sm not available")
    return _nlp_dates


# ============================================================================
# CONSTANTS
# ============================================================================

PROCEDURE_TYPES = {"Therapeutic_procedure", "Diagnostic_procedure"}
DESCRIPTOR_TYPES = {"Detailed_description"}
METADATA_TYPES = {"Dosage", "Frequency", "Duration"}

LABEL_TO_EVENT_TYPE = {
    "DISEASE": "diagnosis",
    "CHEMICAL": "medication",
    "Therapeutic_procedure": "surgery",
    "Diagnostic_procedure": "test",
}

# Common words d4data tags as procedures but aren't medical events
D4DATA_JUNK = {
    "health", "record", "records", "size", "report", "reports", "note", "notes",
    "history", "status", "finding", "findings", "result", "results", "date",
    "time", "page", "name", "information", "data", "system", "type", "image",
    "images", "series", "section", "phase", "contrast", "technique", "comparison",
    "indication", "impression", "conclusion", "summary", "review", "follow",
    "patient", "clinical", "medical", "treatment", "reactive imaging",
}

SECTION_PATTERNS = {
    "indication": r'(?:^|\n|\.)\s*(?:INDICATION|Clinical\s+(?:History|Indication)|Reason\s+for\s+(?:Exam|Study))\s*[:\-]?\s*',
    "technique": r'(?:^|\n|\.)\s*(?:TECHNIQUE|Protocol|Procedure\s+Description)\s*[:\-]?\s*',
    "comparison": r'(?:^|\n|\.)\s*(?:COMPARISON|Prior\s+(?:Studies?|Exams?))\s*[:\-]?\s*',
    "findings": r'(?:^|\n|\.)\s*(?:FINDINGS?|Observations?|Description|Body\s+of\s+Report)\s*[:\-]?\s*',
    "impression": r'(?:^|\n|\.)\s*(?:IMPRESSION|CONCLUSION|ASSESSMENT|INTERPRETATION|SUMMARY|DIAGNOS[EI]S)\s*[:\-]?\s*',
}

SECTION_WEIGHTS = {
    "impression": 1.0,
    "findings": 0.7,
    "indication": 0.3,
    "comparison": 0.2,
    "technique": 0.0,
    "unknown": 0.5,
}

NEGATION_CUES = [
    r'\bno\b', r'\bnot\b', r'\bnor\b', r'\bnever\b',
    r'\bwithout\b', r'\babsence of\b', r'\babsent\b',
    r'\bnegative for\b', r'\bnegative\b',
    r'\bdeny\b', r'\bdenies\b', r'\bdenied\b',
    r'\brules? out\b', r'\bruled out\b',
    r'\bno evidence of\b', r'\bno sign of\b', r'\bno signs of\b',
    r'\bfree of\b', r'\bfree from\b',
    r'\bunremarkable\b', r'\bnormal\b',
    r'\bfailed to (?:reveal|demonstrate|show)\b',
    r'\bdoes not\b', r'\bdid not\b', r'\bdo not\b',
]
NEGATION_WINDOW = 40

SPECULATION_CUES = [
    r'\bmay be\b', r'\bmay\b', r'\bmight\b', r'\bcould be\b',
    r'\bpossible\b', r'\bpossibly\b', r'\bprobable\b', r'\bprobably\b',
    r'\bsuspect(?:ed|s)?\b', r'\bconcern(?:ed)? for\b', r'\bis a concern\b',
    r'\bconsider\b', r'\bcannot (?:exclude|rule out)\b',
    r'\bdifferential\b', r'\bquestionable\b',
    r'\bsuggests?\b', r'\bsuggestive of\b',
    r'\bconsistent with\b',
    r'\bworrisome for\b', r'\bconcerning for\b',
]
SPECULATION_WINDOW = 50


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class MedicalEvent:
    title: str
    event_type: str
    date: Optional[str] = None
    confidence: float = 0.75
    context: str = ""
    entities: List[Dict[str, str]] = field(default_factory=list)
    source: str = "medical-nlp"
    dosage: Optional[str] = None
    section: str = "unknown"
    is_negated: bool = False
    is_speculative: bool = False


# ============================================================================
# SECTION DETECTION
# ============================================================================

def detect_sections(text: str) -> List[Dict[str, Any]]:
    section_matches = []
    for section_name, pattern in SECTION_PATTERNS.items():
        for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
            section_matches.append({
                "name": section_name,
                "header_start": match.start(),
                "content_start": match.end(),
            })

    section_matches.sort(key=lambda s: s["header_start"])

    sections = []
    for i, sec in enumerate(section_matches):
        end = section_matches[i + 1]["header_start"] if i + 1 < len(section_matches) else len(text)
        sections.append({
            "name": sec["name"],
            "start": sec["content_start"],
            "end": end,
            "text": text[sec["content_start"]:end].strip(),
        })

    if not sections:
        sections.append({"name": "unknown", "start": 0, "end": len(text), "text": text})

    return sections


def get_section_at(sections: List[Dict], position: int) -> str:
    for sec in sections:
        if sec["start"] <= position < sec["end"]:
            return sec["name"]
    return "unknown"


# ============================================================================
# NEGATION & SPECULATION
# ============================================================================

def is_negated(text: str, start: int, end: int) -> bool:
    window_start = max(0, start - NEGATION_WINDOW)
    preceding = text[window_start:start].lower()
    return any(re.search(cue, preceding) for cue in NEGATION_CUES)


def is_speculative(text: str, start: int, end: int) -> bool:
    window_start = max(0, start - SPECULATION_WINDOW)
    preceding = text[window_start:start].lower()
    window_end = min(len(text), end + SPECULATION_WINDOW)
    following = text[end:window_end].lower()
    context = preceding + " " + following
    return any(re.search(cue, context) for cue in SPECULATION_CUES)


# ============================================================================
# DEMOGRAPHICS FILTER
# ============================================================================

def build_exclusion_set(demographics: Optional[Dict] = None) -> Set[str]:
    exclusions = set()
    if not demographics:
        return exclusions

    for name_field in ["legalName", "preferredName"]:
        name = demographics.get(name_field, "")
        if name:
            exclusions.add(name.lower().strip())
            for part in re.split(r'[,\s]+', name):
                part = part.strip().lower()
                if len(part) >= 3:
                    exclusions.add(part)

    address = demographics.get("address", {})
    if address:
        for field_name in ["street", "city", "state", "zipCode"]:
            val = address.get(field_name, "")
            if val and len(val) >= 3:
                exclusions.add(val.lower().strip())

    for field_name in ["phone", "email"]:
        val = demographics.get(field_name, "")
        if val:
            exclusions.add(val.lower().strip())

    for contact in demographics.get("emergencyContacts", []):
        name = contact.get("name", "")
        if name:
            exclusions.add(name.lower().strip())
            for part in re.split(r'[,\s]+', name):
                part = part.strip().lower()
                if len(part) >= 3:
                    exclusions.add(part)

    return exclusions


def get_excluded_dates(demographics: Optional[Dict] = None) -> Set[str]:
    excluded = set()
    if not demographics:
        return excluded
    dob = demographics.get("dateOfBirth", "")
    if dob:
        excluded.add(dob)
        try:
            from dateutil import parser as date_parser
            parsed = date_parser.parse(dob, fuzzy=True)
            excluded.add(parsed.strftime('%Y-%m-%d'))
            excluded.add(parsed.strftime('%m/%d/%Y'))
            excluded.add(parsed.strftime('%d %b %Y'))
            excluded.add(parsed.strftime('%B %d, %Y'))
            excluded.add(parsed.strftime('%d %B %Y'))
        except Exception:
            pass
    return excluded


# ============================================================================
# IMPRESSION PARSER
# ============================================================================

def parse_impression_items(impression_text: str) -> List[Dict[str, str]]:
    items = []
    # PDF text often smashes numbered items together without newlines:
    # "1.Pulmonary emboli in... 2.Multiple scattered... 3.Significant..."
    # So we match "N." or "N)" at start OR after any whitespace/period
    pattern = r'(?:^|(?<=\s)|(?<=\.)\s*)(\d+)\s*[.)]\s*(.+?)(?=\s*\d+\s*[.)]\s*[A-Z]|$)'
    for match in re.finditer(pattern, impression_text, re.DOTALL):
        text = re.sub(r'\s+', ' ', match.group(2).strip())
        # Clean trailing period
        text = text.rstrip('.')
        if len(text) >= 5:
            items.append({"number": match.group(1), "text": text})
    return items


# ============================================================================
# HELPERS
# ============================================================================

def merge_procedure_entities(entities: list) -> list:
    if not entities:
        return []
    merged = []
    i = 0
    while i < len(entities):
        ent = entities[i]
        if (ent.label_ in DESCRIPTOR_TYPES
                and i + 1 < len(entities)
                and entities[i + 1].label_ in PROCEDURE_TYPES):
            next_ent = entities[i + 1]
            merged.append({
                "text": f"{ent.text} {next_ent.text}",
                "label": next_ent.label_,
                "start_char": ent.start_char,
                "end_char": next_ent.end_char,
            })
            i += 2
        elif ent.label_ in PROCEDURE_TYPES:
            merged.append({
                "text": ent.text, "label": ent.label_,
                "start_char": ent.start_char, "end_char": ent.end_char,
            })
            i += 1
        else:
            if ent.label_ in METADATA_TYPES:
                merged.append({
                    "text": ent.text, "label": ent.label_,
                    "start_char": ent.start_char, "end_char": ent.end_char,
                })
            i += 1
    return merged


def get_context(text: str, start: int, end: int, window: int = 150) -> str:
    return text[max(0, start - window):min(len(text), end + window)].strip()


def standardize_date(date_str: str) -> str:
    try:
        from dateutil import parser as date_parser
        parsed = date_parser.parse(date_str, fuzzy=True)
        return parsed.strftime('%Y-%m-%d')
    except Exception:
        return date_str


def find_document_date(text: str, excluded: Set[str] = None) -> Optional[str]:
    """
    Look for the document-level date: "Date/Time Exam Performed", "Date of Study", etc.
    This is the date the actual medical event happened, not today and not DOB.
    """
    if excluded is None:
        excluded = set()

    doc_date_patterns = [
        r'(?:Date/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4}(?:\s*@\s*\d{4})?)',
        r'(?:Date/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{2,4})',
        r'(?:Date/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\w+\s+\d{1,2},?\s+\d{4})',
        r'(?:Date/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})',
    ]

    for pattern in doc_date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).split('@')[0].strip()  # Remove time portion
            std = standardize_date(raw)
            if std not in excluded:
                logger.info(f"📅 Document date found: {std} (from '{match.group(0)[:50]}')")
                return std

    return None


def find_nearest_date(context: str, dates: List[Tuple[str, int]],
                      excluded: Set[str] = None) -> Optional[str]:
    if excluded is None:
        excluded = set()
    for date_text, _ in dates:
        std = standardize_date(date_text)
        if std in excluded or date_text in excluded:
            continue
        if date_text in context:
            return std
    for pattern in [r'(\d{1,2}/\d{1,2}/\d{2,4})', r'(\d{4}-\d{2}-\d{2})',
                    r'(\w+\s+\d{1,2},?\s+\d{4})', r'(\d{1,2}\s+\w+\s+\d{4})']:
        match = re.search(pattern, context)
        if match:
            std = standardize_date(match.group(1))
            if std not in excluded:
                return std
    return None


# ============================================================================
# MAIN EXTRACTION
# ============================================================================

def extract_medical_events(text: str, filename: str = "document",
                           demographics: Optional[Dict] = None) -> List[MedicalEvent]:
    """
    THE medical event extractor. Section-aware, negation-aware, demographics-filtered.
    """
    logger.info(f"🐙 MEDICAL_NLP extract called! demographics={'YES' if demographics else 'NO'}")

    events = []
    seen_keys = set()

    name_exclusions = build_exclusion_set(demographics)
    excluded_dates = get_excluded_dates(demographics)

    text = text[:500000]
    chunk = text[:100000]

    # --- DOCUMENT-LEVEL DATE ---
    doc_date = find_document_date(chunk, excluded_dates)

    # --- SECTIONS ---
    sections = detect_sections(chunk)
    section_names = [s['name'] for s in sections]
    logger.info(f"📄 Sections found: {section_names}")

    impression_section = next((s for s in sections if s["name"] == "impression"), None)
    findings_section = next((s for s in sections if s["name"] == "findings"), None)
    impression_entities_lower = set()

    # --- DATES & NAMES ---
    dates_found = []
    person_names = set()
    nlp_dates = _load_dates()
    if nlp_dates:
        date_doc = nlp_dates(chunk)
        for ent in date_doc.ents:
            if ent.label_ == "DATE":
                std = standardize_date(ent.text)
                if std not in excluded_dates and ent.text not in excluded_dates:
                    dates_found.append((ent.text, ent.start_char))
            if ent.label_ in ("PERSON", "ORG", "GPE", "NORP"):
                person_names.add(ent.text.lower().strip())

        logger.info(f"📅 {len(dates_found)} dates kept, {len(excluded_dates)} excluded (DOB etc), "
                     f"{len(person_names)} person/org names filtered")

    all_exclusions = person_names | name_exclusions
    if name_exclusions:
        logger.info(f"🛡️ Demographics filter active: excluding {name_exclusions}")

    # --- LAYER 1: bc5cdr (diseases/chemicals) ---
    nlp_disease = _load_disease()
    if nlp_disease:
        doc = nlp_disease(chunk)
        for ent in doc.ents:
            key = ent.text.lower().strip()
            if len(key) < 3 or key in all_exclusions or key in seen_keys:
                continue

            if is_negated(chunk, ent.start_char, ent.end_char):
                logger.info(f"🚫 NEGATED: '{ent.text}' — skipping")
                continue

            speculative = is_speculative(chunk, ent.start_char, ent.end_char)
            section = get_section_at(sections, ent.start_char)
            weight = SECTION_WEIGHTS.get(section, 0.5)

            if section == "technique":
                continue

            seen_keys.add(key)
            event_type = LABEL_TO_EVENT_TYPE.get(ent.label_, "finding")

            # ANGIO is a procedure, not a medication
            if event_type == "medication" and any(w in key for w in ["angio", "contrast", "bolus"]):
                event_type = "test"

            context = get_context(text, ent.start_char, ent.end_char)
            nearest_date = find_nearest_date(context, dates_found, excluded_dates)

            confidence = round(0.90 * weight * (0.7 if speculative else 1.0), 2)

            if section == "impression":
                impression_entities_lower.add(key)

            events.append(MedicalEvent(
                title=ent.text.strip(), event_type=event_type, date=nearest_date,
                confidence=confidence, context=context[:300],
                entities=[{"text": ent.text, "label": ent.label_}],
                source="bc5cdr", section=section, is_speculative=speculative,
            ))

    # --- LAYER 2: d4data (procedures/tests) ---
    nlp_proc = _load_procedures()
    if nlp_proc:
        doc = nlp_proc(chunk)
        merged = merge_procedure_entities(list(doc.ents))
        dosage_texts = [m for m in merged if m["label"] in METADATA_TYPES]

        for item in merged:
            if item["label"] not in PROCEDURE_TYPES:
                continue
            key = item["text"].lower().strip()
            if len(key) < 3 or key in all_exclusions or key in seen_keys:
                continue
            if key in D4DATA_JUNK:
                logger.debug(f"🗑️ d4data junk filtered: '{item['text']}'")
                continue
            if is_negated(chunk, item["start_char"], item["end_char"]):
                logger.info(f"🚫 NEGATED: '{item['text']}' — skipping")
                continue

            section = get_section_at(sections, item["start_char"])
            if section == "technique":
                continue

            seen_keys.add(key)
            weight = SECTION_WEIGHTS.get(section, 0.5)
            event_type = LABEL_TO_EVENT_TYPE.get(item["label"], "finding")
            context = get_context(text, item["start_char"], item["end_char"])
            nearest_date = find_nearest_date(context, dates_found, excluded_dates)

            dosage = None
            for d in dosage_texts:
                if abs(d["start_char"] - item["end_char"]) < 200:
                    dosage = d["text"]
                    break

            events.append(MedicalEvent(
                title=item["text"].strip(), event_type=event_type, date=nearest_date,
                confidence=round(0.85 * weight, 2), context=context[:300],
                entities=[{"text": item["text"], "label": item["label"]}],
                source="d4data", dosage=dosage, section=section,
            ))

    # --- LAYER 3: IMPRESSION DIRECT PARSING ---
    if impression_section:
        items = parse_impression_items(impression_section["text"])
        logger.info(f"📋 {len(items)} numbered impression items found")

        for item in items:
            item_text = item["text"]
            item_lower = item_text.lower()

            already_captured = any(k in item_lower for k in seen_keys if len(k) >= 5)
            if already_captured:
                continue

            title_match = re.match(
                r'^(.+?)(?:\.\s|(?:in|of|with)\s+(?:the\s+)?(?:right|left|bilateral))',
                item_text, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else item_text.split('.')[0].strip()
            if len(title) > 80:
                title = title[:77] + "..."

            key = title.lower().strip()
            if key in seen_keys:
                continue
            seen_keys.add(key)

            speculative = is_speculative(item_text, 0, len(item_text))
            nearest_date = find_nearest_date(item_text, dates_found, excluded_dates)

            event_type = "diagnosis"
            if any(w in item_lower for w in ["status post", "post-", "s/p"]):
                event_type = "surgery"
            elif any(w in item_lower for w in ["recommend", "follow-up", "follow up"]):
                event_type = "finding"

            events.append(MedicalEvent(
                title=title, event_type=event_type, date=nearest_date,
                confidence=0.95 if not speculative else 0.70,
                context=item_text[:300],
                entities=[{"text": title, "label": "IMPRESSION_ITEM"}],
                source="impression-parser", section="impression",
                is_speculative=speculative,
            ))
            impression_entities_lower.add(key)

    # --- LAYER 4: DISMISSED FINDINGS (Findings NOT in Impression) ---
    if findings_section and impression_section and impression_entities_lower:
        for event in [e for e in events if e.section == "findings"]:
            el = event.title.lower().strip()
            in_imp = any(ik in el or el in ik for ik in impression_entities_lower)
            if not in_imp:
                event.entities.append({"text": "NOT_IN_IMPRESSION", "label": "POTENTIALLY_DISMISSED"})
                logger.info(f"⚠️ Potentially dismissed: {event.title}")

    # Apply document-level date to events that have no date
    # Better than defaulting to today's date!
    if doc_date:
        for event in events:
            if event.date is None:
                event.date = doc_date

    events.sort(key=lambda e: e.confidence, reverse=True)

    bc5 = sum(1 for e in events if e.source == "bc5cdr")
    d4 = sum(1 for e in events if e.source == "d4data")
    imp = sum(1 for e in events if e.source == "impression-parser")
    logger.info(f"🧠 TOTAL: {len(events)} events from {filename} "
                f"(bc5cdr={bc5}, d4data={d4}, impression={imp})")

    return events


def events_to_parsed_format(events: List[MedicalEvent]) -> List[Dict[str, Any]]:
    """Convert MedicalEvent objects to the format expected by the API"""
    result = []
    for i, event in enumerate(events):
        tags = [event.event_type, "imported", event.source]
        if event.section != "unknown":
            tags.append(f"section:{event.section}")
        if event.is_speculative:
            tags.append("speculative")
        if any(e.get("label") == "POTENTIALLY_DISMISSED" for e in event.entities):
            tags.append("potentially-dismissed")

        suggestions = []
        if event.date is None:
            suggestions.extend(["Verify date", "Add provider information"])
        if event.is_speculative:
            suggestions.append("Described as possible/suspected — confirm with provider")
        if any(e.get("label") == "POTENTIALLY_DISMISSED" for e in event.entities):
            suggestions.append("Finding in report body but NOT in impression — ask your provider")

        result.append({
            "id": f"nlp-{datetime.now().timestamp()}-{i}",
            "type": event.event_type,
            "title": f"{'⚠️ ' if event.is_speculative else ''}{event.title}",
            "date": event.date or datetime.now().strftime('%Y-%m-%d'),
            "end_date": None,
            "provider": None,
            "location": None,
            "description": event.context,
            "status": "active",
            "severity": None,
            "tags": tags,
            "confidence": int(event.confidence * 100),
            "sources": [event.source],
            "needs_review": event.date is None or event.is_speculative,
            "suggestions": suggestions,
            "raw_text": event.context,
            "dosage": event.dosage,
            "incidental_findings": []
        })
    return result


def prewarm():
    """Load models immediately"""
    try:
        _load_disease()
        _load_procedures()
        _load_dates()
        logger.info("🔥 All medical NER models pre-warmed!")
    except Exception as e:
        logger.warning(f"⚠️ Failed to pre-warm: {e}")


# Auto-prewarm
prewarm()
