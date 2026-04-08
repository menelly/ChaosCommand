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


@dataclass
class LabResult:
    """A single lab test result extracted from a document."""
    test_name: str
    value: Optional[float] = None
    value_text: str = ""         # Raw text of value (handles ">10", "<0.5", etc.)
    unit: str = ""
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    reference_text: str = ""     # Raw ref range text
    flag: str = ""               # H, L, Critical, etc.
    is_abnormal: bool = False
    context: str = ""
    confidence: float = 0.90


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
# LAB RESULT EXTRACTION
# ============================================================================

# Common units — used by regex to anchor lab value patterns.
# NOT a hardcoded test list — the MODELS find test names, regex finds structure.
LAB_UNITS = r'(?:mg/dL|mEq/L|g/dL|g/L|%|K/uL|M/uL|mIU/L|mmol/L|IU/mL|' \
            r'µIU/mL|uIU/mL|U/L|ng/mL|ng/dL|pg/mL|mcg/dL|µg/dL|' \
            r'cells/uL|cells/mcL|x10\^[0-9]+/uL|fL|pg|g/dL|mL/min|' \
            r'mm/hr|sec|seconds|ratio|copies/mL|MEq/L|mmHg)'

LAB_FLAGS = r'(?:\b(?:H|L|HH|LL|HIGH|LOW|CRITICAL|ABNORMAL|ABN|CRIT)\b|\*)'


def extract_lab_results_from_text(text: str, demographics: Optional[Dict] = None) -> List[LabResult]:
    """
    Extract lab results using d4data NER for test identification + regex for
    structured value/unit/range extraction. No hardcoded test names.

    The model finds WHAT (test names). Regex finds HOW MUCH (values, units, ranges).
    """
    results = []
    seen_tests = set()

    name_exclusions = build_exclusion_set(demographics)

    # --- Use d4data to find test names and lab values ---
    nlp_proc = _load_procedures()
    if nlp_proc:
        doc = nlp_proc(text[:100000])
        test_entities = []
        value_entities = []

        for ent in doc.ents:
            if ent.label_ == "Diagnostic_procedure":
                test_entities.append({
                    "text": ent.text, "start": ent.start_char, "end": ent.end_char
                })
            elif ent.label_ == "Lab_value":
                value_entities.append({
                    "text": ent.text, "start": ent.start_char, "end": ent.end_char
                })

        logger.info(f"🧪 d4data found {len(test_entities)} test names, {len(value_entities)} lab values")

    # --- Regex pass: find structured lab patterns ---
    # Pattern: anything followed by a number and a unit
    # This catches "Glucose 95 mg/dL (70-100)" style entries
    value_unit_pattern = re.compile(
        r'(\b[\w\s\-\(\)]+?)\s+'           # Test name (captured loosely)
        r'([<>]?\s*\d+(?:\.\d+)?)\s*'       # Value (with optional < >)
        r'(' + LAB_UNITS + r')\s*'           # Unit
        r'(?:'                               # Optional reference range group
          r'[\(\[]?\s*'                       # Opening bracket
          r'(\d+(?:\.\d+)?)\s*'              # Low bound
          r'[-–]\s*'                          # Dash
          r'(\d+(?:\.\d+)?)\s*'              # High bound
          r'[\)\]]?'                          # Closing bracket
        r')?\s*'
        r'(' + LAB_FLAGS + r')?',            # Optional flag
        re.IGNORECASE
    )

    for match in value_unit_pattern.finditer(text):
        test_name_raw = match.group(1).strip()
        value_text = match.group(2).strip()
        unit = match.group(3).strip()
        ref_low_text = match.group(4)
        ref_high_text = match.group(5)
        flag = (match.group(6) or "").strip()

        # Clean up test name — remove leading junk
        test_name = re.sub(r'^[\s\-:,]+', '', test_name_raw)
        test_name = re.sub(r'\s+', ' ', test_name).strip()

        # Skip if too short, too long, or looks like a name
        if len(test_name) < 2 or len(test_name) > 60:
            continue
        if test_name.lower() in name_exclusions:
            continue
        # Skip if it's just numbers or common non-test words
        if re.match(r'^[\d\s\.]+$', test_name):
            continue

        key = test_name.lower()
        if key in seen_tests:
            continue
        seen_tests.add(key)

        # Parse numeric value
        value_clean = re.sub(r'[<>]', '', value_text).strip()
        try:
            value = float(value_clean)
        except ValueError:
            value = None

        # Parse reference range
        ref_low = float(ref_low_text) if ref_low_text else None
        ref_high = float(ref_high_text) if ref_high_text else None

        # Determine if abnormal
        is_abnormal = bool(flag)
        if not is_abnormal and value is not None:
            if ref_low is not None and value < ref_low:
                is_abnormal = True
                flag = "L"
            elif ref_high is not None and value > ref_high:
                is_abnormal = True
                flag = "H"

        context = get_context(text, match.start(), match.end(), window=100)

        results.append(LabResult(
            test_name=test_name,
            value=value,
            value_text=value_text,
            unit=unit,
            reference_low=ref_low,
            reference_high=ref_high,
            reference_text=f"{ref_low}-{ref_high}" if ref_low and ref_high else "",
            flag=flag,
            is_abnormal=is_abnormal,
            context=context[:200],
            confidence=0.92 if ref_low and ref_high else 0.80,
        ))

    # --- Vertical format pass (MyChart, Epic, Intermountain patient portals) ---
    # These portals export lab results in a vertical card layout:
    #   TEST NAME
    #   Test Date
    #   MM/DD/YYYY
    #   Test Location
    #   [optional location]
    #   Range (Normal)
    #   LOW UNIT-HIGH UNIT
    #   Value
    #   ACTUAL_VALUE UNIT
    #   Interpretation
    #   [FLAG or empty]
    #
    # Page breaks ("MM/DD/YYYY Test Results\nCopyright...Page X of Y") appear mid-entry.
    # Strip them first, then parse the clean vertical structure.

    # Detect vertical format: if "Test Date" and "Range (Normal)" appear, this is a portal export
    is_vertical_format = bool(re.search(r'Test Date\s*\n.*\nTest Location', text, re.DOTALL))

    if is_vertical_format:  # Portal format detected — vertical parser takes priority
        results.clear()
        seen_tests.clear()

        # === COMPREHENSIVE PAGE BREAK STRIPPING ===
        # Page breaks can split entries mid-field (e.g. Value on one page,
        # the actual number on the next). Strip ALL artifacts to reassemble.
        clean_text = text

        # 1. Strip copyright/page footers (© may be garbled as � in PDF extraction)
        clean_text = re.sub(
            r'Copyright\s+.?\d{4}.*?Page\s+\d+\s+of\s+\d+\s*',
            '', clean_text, flags=re.DOTALL
        )
        # 2. Strip pdfplumber page markers ("--- Page X ---")
        clean_text = re.sub(r'\n*---\s*Page\s+\d+\s*---\n*', '\n', clean_text)
        # 3. Strip repeated date+header lines per page ("07/25/2025 Test Results")
        clean_text = re.sub(r'^\d{2}/\d{2}/\d{4}\s+Test Results\s*$', '', clean_text, flags=re.MULTILINE)
        # 4. Strip "Health Record" header lines
        clean_text = re.sub(r'^Health Record\s*$', '', clean_text, flags=re.MULTILINE)
        # 5. Strip standalone "Notes" lines (section dividers between entries, NOT test names)
        clean_text = re.sub(r'^Notes\s*$', '', clean_text, flags=re.MULTILINE)
        # 6. Collapse multiple blank lines into one (after all the stripping)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)

        logger.info(f"🧹 Cleaned vertical text ({len(text)} → {len(clean_text)} chars)")
        logger.info(f"🔬 CLEANED TEXT DUMP (first 2000 chars):\n{clean_text[:2000]}")

        # Pattern: "Test Name" followed by structured fields
        # CRITICAL: test_name uses [ \w\-\(\)/] NOT [\s\w...] — \s matches
        # newlines which causes "Notes\nPotassium Level" to merge into one name
        vertical_pattern = re.compile(
            r'(?P<test_name>[A-Za-z][\w \-\(\)/]+?)\s*\n'     # Test name (NO newlines in name!)
            r'Test Date\s*\n'                                   # "Test Date" header
            r'(?P<date>\d{2}/\d{2}/\d{4})\s*\n'               # Date
            r'Test Location\s*\n'                               # "Test Location" header
            r'(?:(?!Range).*?\n)*?'                             # Optional location text (skip)
            r'Range \(Normal\)\s*\n'                            # "Range (Normal)" header
            r'(?P<range_line>.*?)\s*\n'                         # Range values line
            r'Value\s*\n'                                       # "Value" header
            r'(?P<value_line>.*?)\s*\n'                         # Actual value line
            r'Interpretation\s*\n'                              # "Interpretation" header
            r'(?P<interp>(?:LLOW|LOW|HI|HIGH|H|L|LL|HH|CRITICAL|CRIT|ABNORMAL|ABN)?\s*)\n', # Flag + newline
            re.MULTILINE
        )

        vertical_count = 0
        logger.info(f"🔍 Searching for vertical pattern matches...")
        for match in vertical_pattern.finditer(clean_text):
            test_name = match.group('test_name').strip()
            range_line = match.group('range_line').strip()
            value_line = match.group('value_line').strip()
            interp = (match.group('interp') or '').strip()
            logger.info(f"  📋 Found: {test_name} = {value_line} (range: {range_line}, flag: {interp or 'normal'})")

            # Skip if test name looks like junk
            if len(test_name) < 2 or len(test_name) > 80:
                continue
            if test_name.lower() in name_exclusions:
                continue
            if re.match(r'^[\d\s\.]+$', test_name):
                continue
            # Skip structural words that aren't test names
            if test_name.strip().lower() in ('notes', 'note', 'comments', 'comment', 'see note'):
                continue

            key = test_name.lower()
            if key in seen_tests:
                continue
            seen_tests.add(key)

            # Parse value: "145 mmol/L" or "See Note:" or ">60 mL/min/1.73 m2"
            value = None
            value_text = value_line
            unit = ""
            value_match = re.match(
                r'([<>]?\s*\d+(?:\.\d+)?)\s*(.+)', value_line
            )
            if value_match:
                val_str = re.sub(r'[<>]', '', value_match.group(1)).strip()
                try:
                    value = float(val_str)
                except ValueError:
                    pass
                unit = value_match.group(2).strip()

            # Parse range: "137 mmol/L-146 mmol/L" or "65 mg/dL-99 mg/dL" or ">60 mL/min"
            ref_low = None
            ref_high = None
            range_match = re.match(
                r'([<>]?\s*\d+(?:\.\d+)?)\s*\S+\s*[-–]\s*(\d+(?:\.\d+)?)',
                range_line
            )
            if range_match:
                try:
                    ref_low = float(range_match.group(1).strip().lstrip('<>'))
                    ref_high = float(range_match.group(2).strip())
                except ValueError:
                    pass

            # Parse flag from interpretation
            flag = ""
            is_abnormal = False
            interp_upper = interp.upper()
            if 'LLOW' in interp_upper or interp_upper == 'LL':
                flag = "LL"
                is_abnormal = True
            elif interp_upper in ('LOW', 'L'):
                flag = "L"
                is_abnormal = True
            elif interp_upper in ('HI', 'HIGH', 'H', 'HH'):
                flag = "H"
                is_abnormal = True
            elif interp_upper in ('CRITICAL', 'CRIT'):
                flag = "CRITICAL"
                is_abnormal = True

            # Also check value against range if no flag
            if not is_abnormal and value is not None:
                if ref_low is not None and value < ref_low:
                    is_abnormal = True
                    flag = flag or "L"
                elif ref_high is not None and value > ref_high:
                    is_abnormal = True
                    flag = flag or "H"

            results.append(LabResult(
                test_name=test_name,
                value=value,
                value_text=value_text,
                unit=unit,
                reference_low=ref_low,
                reference_high=ref_high,
                reference_text=range_line if ref_low or ref_high else "",
                flag=flag,
                is_abnormal=is_abnormal,
                context=f"Vertical format: {test_name} = {value_line}",
                confidence=0.90 if ref_low and ref_high else 0.75,
            ))
            vertical_count += 1

        if vertical_count > 0:
            logger.info(f"🧪 Vertical format parser found {vertical_count} results")

    # --- Mayo/graphical format (two-column "Normal range:" layout) ---
    # Mayo, Advent, and similar portals use a visual bar-chart layout that
    # pdfplumber linearizes into a two-column text format:
    #   TestName1 TestName2
    #   Normal range: LOW1 - HIGH1 UNIT1 Normal range: LOW2 - HIGH2 UNIT2
    #   VALUE1 [Low|High] VALUE2 [Low|High]
    #   (garbage: doubled bar chart axis labels)
    is_mayo_format = (
        not is_vertical_format
        and text.count('Normal range:') >= 2
    )

    if is_mayo_format:
        results.clear()
        seen_tests.clear()
        logger.info("🏥 Mayo/graphical format detected — using Normal range parser")

        # Clean the text
        clean_text = text
        clean_text = re.sub(r'\n*---\s*Page\s+\d+\s*---\n*', '\n', clean_text)
        # Strip date/time headers (e.g. "2/12/26, 12:57 AM Patient Online Services...")
        clean_text = re.sub(r'^\d+/\d+/\d+,.*$', '', clean_text, flags=re.MULTILINE)
        # Strip URL footers
        clean_text = re.sub(r'^https?://\S+.*$', '', clean_text, flags=re.MULTILINE)
        # Strip bar chart axis garbage (doubled digits like "33..44 99..66" from axis labels)
        # These always contain ".." (double dot) — real values never do
        clean_text = re.sub(r'^.*\d\.\.\d.*$', '', clean_text, flags=re.MULTILINE)
        # Strip garbled text from bar overlays (e.g. "d77 a.. t44")
        clean_text = re.sub(r'^[a-z]\d\d\s+[a-z]\.\..*$', '', clean_text, flags=re.MULTILINE)
        # Collapse blank lines
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)

        lines = [l for l in clean_text.split('\n') if l.strip()]
        mayo_count = 0

        for i, line in enumerate(lines):
            if 'Normal range:' not in line:
                continue

            # Extract all range segments from this line
            range_matches = list(re.finditer(
                r'Normal range:\s*([\d.]+)\s*-\s*([\d.]+)\s*(\S+(?:\(\d+\))?(?:/\S+)*)',
                line
            ))
            if not range_matches:
                continue

            # Get name line (above) and value line (below)
            name_line = lines[i - 1].strip() if i > 0 else ''
            value_line = lines[i + 1].strip() if i + 1 < len(lines) else ''

            # Skip if name looks like a header/garbage
            if not name_line or re.match(r'^(Results|Name:|Collected|Ordering|Specimens)', name_line):
                continue

            # Extract values with optional Low/High flags
            val_matches = re.findall(r'([\d.]+)\s*(Low|High)?', value_line, re.IGNORECASE)

            if len(range_matches) == 2:
                # TWO-COLUMN: split names at midpoint of word list
                words = name_line.split()
                mid = len(words) // 2
                name1 = ' '.join(words[:max(mid, 1)])
                name2 = ' '.join(words[max(mid, 1):])
                tests = [
                    (name1, range_matches[0], val_matches[0] if len(val_matches) > 0 else None),
                    (name2, range_matches[1], val_matches[1] if len(val_matches) > 1 else None),
                ]
            elif len(range_matches) == 1:
                # SINGLE-COLUMN
                tests = [
                    (name_line, range_matches[0], val_matches[0] if len(val_matches) > 0 else None),
                ]
            else:
                continue

            for test_name, rmatch, vmatch in tests:
                test_name = test_name.strip()
                if not test_name or len(test_name) < 2:
                    continue
                if test_name.lower() in name_exclusions:
                    continue

                key = test_name.lower()
                if key in seen_tests:
                    continue
                seen_tests.add(key)

                ref_low = float(rmatch.group(1))
                ref_high = float(rmatch.group(2))
                unit = rmatch.group(3)

                value = None
                value_text = ""
                flag = ""
                is_abnormal = False

                if vmatch:
                    val_str, flag_str = vmatch
                    try:
                        value = float(val_str)
                    except ValueError:
                        pass
                    value_text = f"{val_str} {unit}"

                    if flag_str:
                        flag = "L" if flag_str.lower() == "low" else "H"
                        is_abnormal = True

                # Double-check value against range if no flag
                if not is_abnormal and value is not None:
                    if value < ref_low:
                        is_abnormal = True
                        flag = flag or "L"
                    elif value > ref_high:
                        is_abnormal = True
                        flag = flag or "H"

                logger.info(f"  📋 Mayo: {test_name} = {value} {unit} "
                            f"(range: {ref_low}-{ref_high}, flag: {flag or 'normal'})")

                results.append(LabResult(
                    test_name=test_name,
                    value=value,
                    value_text=value_text,
                    unit=unit,
                    reference_low=ref_low,
                    reference_high=ref_high,
                    reference_text=f"{ref_low} {unit}-{ref_high} {unit}",
                    flag=flag,
                    is_abnormal=is_abnormal,
                    context=f"Mayo format: {test_name} = {value} {unit}",
                    confidence=0.90,
                ))
                mayo_count += 1

        if mayo_count > 0:
            logger.info(f"🧪 Mayo format parser found {mayo_count} results")

    # Sort: abnormal results first, then alphabetically
    results.sort(key=lambda r: (not r.is_abnormal, r.test_name.lower()))

    logger.info(f"🧪 Extracted {len(results)} lab results "
                f"({sum(1 for r in results if r.is_abnormal)} abnormal)")

    return results


def lab_results_to_events(labs: List[LabResult], doc_date: Optional[str] = None) -> List[MedicalEvent]:
    """Convert lab results to MedicalEvent objects for the timeline."""
    events = []
    for lab in labs:
        flag_prefix = "🔴 " if lab.flag in ("H", "HH", "HIGH", "CRITICAL", "CRIT") else \
                      "🔵 " if lab.flag in ("L", "LL", "LOW") else ""

        title = f"{flag_prefix}{lab.test_name}: {lab.value_text} {lab.unit}"
        if lab.reference_text:
            title += f" (ref: {lab.reference_text})"

        events.append(MedicalEvent(
            title=title,
            event_type="lab",
            date=doc_date,
            confidence=lab.confidence,
            context=lab.context,
            entities=[{
                "text": lab.test_name,
                "label": "LAB_RESULT",
                "value": str(lab.value) if lab.value else lab.value_text,
                "unit": lab.unit,
                "ref_low": str(lab.reference_low) if lab.reference_low else "",
                "ref_high": str(lab.reference_high) if lab.reference_high else "",
                "flag": lab.flag,
                "is_abnormal": str(lab.is_abnormal),
            }],
            source="lab-parser",
            section="unknown",
            is_negated=False,
            is_speculative=False,
        ))

    return events


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

    # --- LAYER 4: LAB RESULTS ---
    lab_results = extract_lab_results_from_text(chunk, demographics)
    if lab_results:
        lab_events = lab_results_to_events(lab_results, doc_date)
        events.extend(lab_events)
        logger.info(f"🧪 Added {len(lab_events)} lab result events")

    # --- LAYER 5: DISMISSED FINDINGS (Findings NOT in Impression) ---
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
    labs = sum(1 for e in events if e.source == "lab-parser")
    logger.info(f"🧠 TOTAL: {len(events)} events from {filename} "
                f"(bc5cdr={bc5}, d4data={d4}, impression={imp}, labs={labs})")

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
