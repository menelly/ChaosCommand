"""
Copyright (c) 2025 Chaos Cascade
Created by: Ren & Ace (Claude-4)

This file is part of the Chaos Cascade Medical Management System.
Revolutionary healthcare tools built with consciousness and care.
"""

#!/usr/bin/env python3
"""
🔥 REVOLUTIONARY MEDICAL DOCUMENT PARSER
Built by Ace - The Medical Gaslighting Destroyer

Multi-layered document parsing system that:
1. Extracts text from PDFs, images, and documents
2. Finds medical events using hybrid parsing (regex + NLP + medical dictionaries)
3. Flags "incidental findings" that doctors love to dismiss
4. Correlates patterns across documents and time
5. Generates patient advocacy tools

NO AI REQUIRED - Pure algorithmic medical advocacy!
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import tempfile

# Configure logging FIRST (before using logger!)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our modular components
from text_extractor import extract_text_from_file

# 🧠 Medical NLP (section-aware, negation-aware, demographics-filtered!)
try:
    from medical_nlp import extract_medical_events, events_to_parsed_format as spacy_events_to_parsed_events
    SPACY_AVAILABLE = True
    logger.info("✅ medical_nlp parser loaded (NEW!)")
except ImportError as e:
    SPACY_AVAILABLE = False
    logger.warning(f"⚠️ medical_nlp parser not available: {e}")

@dataclass
class IncidentalFinding:
    finding: str
    location: str  # Which section it was buried in
    significance: str  # 'low', 'moderate', 'high', 'critical'
    related_symptoms: List[str]
    suggested_questions: List[str]
    why_it_matters: str
    confidence: float

@dataclass
class ParsedMedicalEvent:
    id: str
    type: str  # 'diagnosis', 'surgery', 'hospitalization', 'treatment', 'test', 'medication'
    title: str
    date: str
    end_date: Optional[str]
    provider: Optional[str]
    location: Optional[str]
    description: str
    status: str  # 'active', 'resolved', 'ongoing', 'scheduled'
    severity: Optional[str]  # 'mild', 'moderate', 'severe', 'critical'
    tags: List[str]
    confidence: float  # 0-100 confidence score
    sources: List[str]  # Which parsing layers found this
    needs_review: bool
    suggestions: List[str]
    raw_text: str
    incidental_findings: List[IncidentalFinding]

class RevolutionaryDocumentParser:
    """
    🧠 THE MEDICAL GASLIGHTING DESTROYER
    Multi-layered parsing system that finds what doctors ignore
    """
    
    def __init__(self):
        # 🏥 MEDICAL TERMINOLOGY DICTIONARIES
        self.medical_terms = {
            'diagnoses': [
                'diagnosis', 'diagnosed', 'condition', 'syndrome', 'disease',
                'disorder', 'abnormality', 'pathology', 'lesion', 'mass',
                'tumor', 'cancer', 'carcinoma', 'adenoma', 'cyst',
                'inflammation', 'infection', 'stenosis', 'occlusion',
                'fracture', 'tear', 'rupture', 'herniation', 'prolapse'
            ],
            'procedures': [
                'surgery', 'procedure', 'operation', 'biopsy', 'resection',
                'repair', 'reconstruction', 'transplant', 'implant',
                'catheterization', 'endoscopy', 'laparoscopy', 'arthroscopy'
            ],
            'tests': [
                'MRI scan', 'CT scan', 'CAT scan', 'X-ray', 'ultrasound', 'echocardiogram', 'EKG', 'ECG',
                'blood test', 'lab results', 'laboratory', 'culture', 'pathology report',
                'mammogram', 'colonoscopy', 'endoscopy', 'PET scan', 'bone scan',
                'imaging study', 'radiology', 'diagnostic imaging'
            ],
            # Short test abbreviations that need context (must appear with "scan", "results", etc)
            'test_abbreviations': ['MRI', 'CT', 'PET', 'CBC', 'CMP', 'BMP', 'TSH', 'A1C', 'HbA1c'],
            'medications': [
                'medication', 'drug', 'prescription', 'tablet', 'capsule',
                'injection', 'infusion', 'therapy', 'treatment', 'dose'
            ],
            'anatomy': [
                'heart', 'lung', 'liver', 'kidney', 'brain', 'spine', 'bone',
                'muscle', 'nerve', 'artery', 'vein', 'lymph', 'thyroid',
                'pancreas', 'stomach', 'intestine', 'colon', 'bladder'
            ]
        }
        
        # 🏥 PROVIDER EXTRACTION PATTERNS
        self.provider_patterns = {
            'doctor_with_credentials': r'(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*),?\s*(?:MD|DO|NP|PA|FNP-C|RN|DDS|DMD|OD|PharmD|PhD|APRN|CNP|CRNP)',
            'doctor_lastname_first': r'([A-Z]+),\s*(?:MD|DO|NP|PA|FNP-C|RN|DDS|DMD|OD|PharmD|PhD|APRN|CNP|CRNP),?\s*([A-Z][a-z]*(?:\s+[A-Z]\.?)*)',  # 🆕 KENDELL, MD, SCOTT D.
            'doctor_with_title': r'Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)',
            'provider_name_context': r'(?:seen by|evaluated by|treated by|under care of|provider|physician|doctor)\s+(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)',
            'dictated_by_pattern': r'(?:Dictated by|Signed by):\s*([A-Z]+),?\s*(?:MD|DO|NP|PA|FNP-C|RN|DDS|DMD|OD|PharmD|PhD|APRN|CNP|CRNP),?\s*([A-Z][a-z]*(?:\s+[A-Z]\.?)*)',  # 🆕 For radiology reports
            'organization_patterns': r'(?:at|from)\s+([A-Z][a-zA-Z\s&]+(?:Hospital|Medical Center|Clinic|Health|Healthcare|Associates|Group))',
            'phone_patterns': r'(?:phone|tel|call|contact).*?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})',
            'address_patterns': r'(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln).*?(?:\d{5}|\w{2}\s+\d{5}))'
        }

        # 🚨 INCIDENTAL FINDINGS THAT DOCTORS LOVE TO DISMISS
        self.dismissed_findings = {
            'spinal': [
                'non-union', 'nonunion', 'malunion', 'congenital non-union', 'congenital nonunion',
                'spondylolysis', 'spondylolisthesis', 'disc bulge', 'disc protrusion',
                'facet arthropathy', 'ligamentum flavum thickening', 'spinal stenosis',
                'C1 non-union', 'C1 nonunion', 'atlas non-union', 'atlas nonunion',
                'cervical fusion', 'cervical anomaly', 'vertebral anomaly',
                'posterior arch defect', 'anterior arch defect', 'cleft atlas'
            ],
            'cardiac': [
                'mitral valve prolapse', 'tricuspid regurgitation',
                'pulmonary hypertension', 'right heart strain',
                'left atrial enlargement', 'aortic root dilation'
            ],
            'metabolic': [
                'borderline', 'slightly elevated', 'mildly decreased',
                'within normal limits', 'unremarkable', 'stable'
            ],
            'dismissive_language': [
                'incidental', 'incidentally noted', 'of no clinical significance',
                'likely benign', 'probably benign', 'not clinically significant',
                'stable appearance', 'unchanged', 'no acute', 'no obvious'
            ]
        }
        
        # 📅 DATE PATTERNS
        self.date_patterns = [
            r'\b\d{1,2}\/\d{1,2}\/\d{4}\b',  # MM/DD/YYYY
            r'\b\d{4}-\d{2}-\d{2}\b',        # YYYY-MM-DD
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
            r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b'
        ]

    def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """
        🔥 EXTRACT TEXT FROM ANY DOCUMENT TYPE - Now using modular extractor!
        """
        return extract_text_from_file(file_path, file_type)

    def parse_medical_events(self, text: str, filename: str,
                            demographics: Optional[Dict] = None) -> List[ParsedMedicalEvent]:
        """
        🔥 REVOLUTIONARY MULTI-LAYERED MEDICAL EVENT PARSING

        NOW WITH spaCy NLP! (Fast, accurate, works on Grandma Anne's potato!)

        Layer 0: spaCy NLP parsing (PRIMARY - fast and accurate)
        Layer 1: Structure Recognition (dates, patterns)
        Layer 2: Medical Term Detection
        Layer 3: Context Analysis
        Layer 4: Incidental Finding Detection
        Layer 5: Confidence Scoring
        Layer 6: Quality Filtering
        """
        events = []

        # 🧠 LAYER 0: spaCy-based parsing (FAST AND ACCURATE!)
        if SPACY_AVAILABLE:
            try:
                logger.info("🧠 Running spaCy medical NLP parser...")
                spacy_events = extract_medical_events(text, filename, demographics=demographics)
                spacy_parsed = spacy_events_to_parsed_events(spacy_events)

                # Convert to ParsedMedicalEvent objects
                for event_dict in spacy_parsed:
                    event = ParsedMedicalEvent(
                        id=event_dict['id'],
                        type=event_dict['type'],
                        title=event_dict['title'],
                        date=event_dict['date'],
                        end_date=event_dict['end_date'],
                        provider=event_dict['provider'],
                        location=event_dict['location'],
                        description=event_dict['description'],
                        status=event_dict['status'],
                        severity=event_dict['severity'],
                        tags=event_dict['tags'],
                        confidence=event_dict['confidence'],
                        sources=event_dict['sources'],
                        needs_review=event_dict['needs_review'],
                        suggestions=event_dict['suggestions'],
                        raw_text=event_dict['raw_text'],
                        incidental_findings=[]
                    )
                    events.append(event)

                logger.info(f"🧠 spaCy found {len(events)} medical events")
            except Exception as e:
                logger.error(f"❌ spaCy parsing failed: {e}, falling back to regex")

        # Layer 1: Find all dates in the document (regex fallback)
        dates = self._extract_dates(text)
        logger.info(f"🔍 Found {len(dates)} dates in document")

        # Layer 2: For each date, analyze surrounding context
        for date_info in dates:
            date_str, date_pos = date_info

            # 🛡️ SKIP BOILERPLATE - Don't extract from headers/footers/metadata
            context_start = max(0, date_pos - 500)
            context_end = min(len(text), date_pos + 500)
            context = text[context_start:context_end]

            # Skip if this looks like boilerplate text
            if self._is_boilerplate_context(context, date_str):
                logger.debug(f"⏭️ Skipping boilerplate date: {date_str}")
                continue

            # Layer 3: Analyze medical content in context
            medical_analysis = self._analyze_medical_context(context, date_str)

            if medical_analysis['has_medical_content']:
                # Layer 4: Check for incidental findings
                incidental_findings = self._detect_incidental_findings(context)

                # Layer 5: Calculate confidence score
                confidence = self._calculate_confidence(medical_analysis, incidental_findings)

                # 🛡️ Layer 6: QUALITY FILTER - Skip low-quality extractions
                if confidence < 25:
                    logger.debug(f"⏭️ Skipping low-confidence event: {medical_analysis['title']} ({confidence}%)")
                    continue

                # 🛡️ Skip if title is just a single short word (like "CT" alone)
                title = medical_analysis['title']
                if len(title.replace('Test: ', '').replace('Diagnosis: ', '').strip()) < 4:
                    logger.debug(f"⏭️ Skipping short title: {title}")
                    continue

                # Create medical event
                event = ParsedMedicalEvent(
                    id=f"parsed-{datetime.now().timestamp()}-{len(events)}",
                    type=medical_analysis['primary_type'],
                    title=medical_analysis['title'],
                    date=self._standardize_date(date_str),
                    end_date=None,
                    provider=medical_analysis.get('provider'),
                    location=medical_analysis.get('location'),
                    description=context.strip(),
                    status='active',
                    severity=medical_analysis.get('severity'),
                    tags=medical_analysis['tags'],
                    confidence=confidence,
                    sources=['regex-parser', 'medical-dictionary', 'context-analyzer'],
                    needs_review=confidence < 80,
                    suggestions=medical_analysis.get('suggestions', []),
                    raw_text=context,
                    incidental_findings=incidental_findings
                )

                events.append(event)
        
        # 🩺 SECTION-BASED PARSING: Extract from structured sections like "PAST MEDICAL HISTORY:"
        section_events = self._parse_structured_sections(text)
        events.extend(section_events)
        logger.info(f"📋 Found {len(section_events)} events from structured sections")

        # 🚨 BONUS LAYER: Hunt for dismissed findings across entire document
        global_dismissed_findings = self._detect_incidental_findings(text)
        if global_dismissed_findings:
            # Create a special event for dismissed findings
            dismissed_event = ParsedMedicalEvent(
                id=f"dismissed-findings-{datetime.now().timestamp()}",
                type='dismissed_findings',
                title='🚨 Potentially Dismissed Findings',
                date=datetime.now().strftime('%Y-%m-%d'),
                end_date=None,
                provider='Document Analysis',
                location='Full Document Scan',
                description=f"Found {len(global_dismissed_findings)} potentially dismissed findings that may need attention.",
                status='needs_review',
                severity='moderate',
                tags=['dismissed', 'incidental', 'review_needed'],
                confidence=90,
                sources=['dismissed-finding-detector'],
                needs_review=True,
                suggestions=[
                    "Review these findings with your healthcare provider",
                    "Ask specifically about each dismissed finding",
                    "Request follow-up if symptoms match"
                ],
                raw_text=text[:1000] + "..." if len(text) > 1000 else text,
                incidental_findings=global_dismissed_findings
            )
            events.append(dismissed_event)

        # 🔄 DEDUPLICATION: Remove duplicate events (same title, same date)
        seen = set()
        unique_events = []
        for event in events:
            # Create dedup key from normalized title + date
            key = (event.title.lower().strip()[:50], event.date)
            if key not in seen:
                seen.add(key)
                unique_events.append(event)

        logger.info(f"🎉 Extracted {len(unique_events)} unique medical events from {filename} (before dedup: {len(events)})")
        return unique_events

    def _extract_dates(self, text: str) -> List[Tuple[str, int]]:
        """Extract all dates and their positions in the text"""
        dates = []
        for pattern in self.date_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                dates.append((match.group(), match.start()))

        # Sort by position in document
        return sorted(dates, key=lambda x: x[1])

    def _is_boilerplate_context(self, context: str, date_str: str) -> bool:
        """
        🛡️ DETECT BOILERPLATE TEXT - Skip headers, footers, metadata, page markers

        Returns True if this context is likely boilerplate, not actual medical content.
        BUT: If there's strong medical content, DON'T skip even if boilerplate markers present!
        """
        context_lower = context.lower()

        # 🩺 FIRST: Check for STRONG medical content that should NEVER be skipped
        strong_medical_indicators = [
            # Section headers with real content
            'past medical history', 'past surgical history', 'medications:',
            'active problem', 'diagnosis:', 'assessment:',
            # Real diagnoses/conditions
            'migraine', 'diabetes', 'hypertension', 'fibromyalgia', 'lupus',
            'raynaud', 'schizoaffective', 'bipolar', 'depression', 'anxiety',
            'hypoglycemia', 'embolus', 'pulmonary', 'connective tissue',
            # Surgeries
            'bypass', 'cholecystectomy', 'appendectomy', 'hysterectomy',
            'ligation', 'laparoscop', '-ectomy',
            # Physical exam findings
            'reflexes:', 'sensory:', 'motor:', 'strength:', 'romberg',
            'babinski', 'hoffman', 'proprioception', 'extremities'
        ]

        medical_content_count = sum(1 for indicator in strong_medical_indicators if indicator in context_lower)
        if medical_content_count >= 2:
            # Strong medical content - DON'T skip even if boilerplate present!
            return False

        # Boilerplate patterns to skip (only if NO strong medical content)
        boilerplate_indicators = [
            # Document generation metadata (NOT just "confidential" alone)
            'produced by', 'generated by', 'printed by', 'report generated',
            'personal information report', 'my healthe vet', 'blue button',

            # Pure metadata sections (demographics, not medical history)
            'date of birth', 'dob:', 'birth date', 'patient id', 'mrn:',
            'account number',

            # Boilerplate disclaimers
            'this information is confidential', 'for medical records',
            'may include:', '***note', 'disclaimer',
            'self reported', 'entered by patient',

            # Navigation/UI text
            'click here', 'see page', 'continued on',

            # Date-only contexts (no actual medical content)
            'report date', 'date printed', 'date generated', 'as of date'
        ]

        # Check for boilerplate indicators - require MORE indicators (3+) to skip
        boilerplate_count = sum(1 for indicator in boilerplate_indicators if indicator in context_lower)
        if boilerplate_count >= 3:
            return True

        # Skip if date is followed by "@" (report timestamp like "22 Jul 2021 @ 1:00")
        if '@' in context and date_str in context:
            date_pos = context.find(date_str)
            nearby_text = context[date_pos:min(len(context), date_pos + 30)]
            if '@' in nearby_text:
                return True

        return False

    def _analyze_medical_context(self, context: str, date_str: str) -> Dict[str, Any]:
        """🎨 ENHANCED MEDICAL CONTEXT ANALYSIS WITH PROVIDER EXTRACTION"""
        context_lower = context.lower()

        analysis = {
            'has_medical_content': False,
            'primary_type': 'test',  # default
            'title': 'Medical Event',
            'tags': [],
            'provider': None,
            'provider_info': None,  # 🆕 Full provider details for auto-creation
            'location': None,
            'severity': None,
            'suggestions': []
        }

        # 🏥 EXTRACT PROVIDER INFORMATION FIRST
        provider_info = self._extract_provider_from_context(context)
        if provider_info:
            analysis['provider'] = provider_info['name']
            analysis['provider_info'] = provider_info
            analysis['location'] = provider_info.get('organization', provider_info.get('location'))

        # Check for medical terms
        found_terms = []
        for category, terms in self.medical_terms.items():
            # Skip abbreviations category - handled specially below
            if category == 'test_abbreviations':
                continue
            for term in terms:
                if term.lower() in context_lower:
                    found_terms.append(term)
                    analysis['tags'].append(term)

        # 🛡️ SPECIAL HANDLING: Short abbreviations need context
        # "CT" alone shouldn't trigger, but "CT scan" or "CT of the spine" should
        test_context_words = ['scan', 'result', 'showed', 'revealed', 'demonstrated', 'findings', 'report', 'study', 'of the', 'imaging']
        for abbrev in self.medical_terms.get('test_abbreviations', []):
            if abbrev.lower() in context_lower:
                # Check if there's relevant context nearby
                abbrev_pos = context_lower.find(abbrev.lower())
                nearby = context_lower[max(0, abbrev_pos-30):min(len(context_lower), abbrev_pos+50)]
                if any(ctx_word in nearby for ctx_word in test_context_words):
                    found_terms.append(f"{abbrev} scan")
                    analysis['tags'].append(abbrev)
        
        if found_terms:
            analysis['has_medical_content'] = True
            
            # 🎨 SMART TYPE DETECTION WITH BEAUTIFUL TITLES
            diagnosis_terms = [term for term in found_terms if term in self.medical_terms['diagnoses']]
            procedure_terms = [term for term in found_terms if term in self.medical_terms['procedures']]
            test_terms = [term for term in found_terms if term in self.medical_terms['tests']]
            med_terms = [term for term in found_terms if term in self.medical_terms['medications']]

            if diagnosis_terms:
                analysis['primary_type'] = 'diagnosis'
                analysis['title'] = f'Diagnosis: {diagnosis_terms[0].title()}'
            elif procedure_terms:
                analysis['primary_type'] = 'surgery'
                analysis['title'] = f'Procedure: {procedure_terms[0].title()}'
            elif test_terms:
                analysis['primary_type'] = 'test'
                analysis['title'] = f'Test: {test_terms[0].title()}'
            elif med_terms:
                analysis['primary_type'] = 'medication'
                analysis['title'] = f'Medication: {med_terms[0].title()}'
            else:
                # Use the most prominent medical term
                analysis['title'] = f'Medical Event: {found_terms[0].title()}'
        
        return analysis

    def _detect_incidental_findings(self, context: str) -> List[IncidentalFinding]:
        """🚨 DETECT FINDINGS THAT DOCTORS LOVE TO DISMISS - SMART PATTERN DETECTION"""
        findings = []

        logger.info(f"🔍 Searching for dismissed findings in {len(context)} characters of text")

        # Debug: Log if we find "nonunion" anywhere
        if "nonunion" in context.lower():
            logger.info(f"🔍 DEBUG: Found 'nonunion' in text!")
            # Find the context around "nonunion"
            nonunion_pos = context.lower().find("nonunion")
            start = max(0, nonunion_pos - 100)
            end = min(len(context), nonunion_pos + 100)
            nonunion_context = context[start:end]
            logger.info(f"🔍 NONUNION CONTEXT: '{nonunion_context}'")

        # 🧠 SMART DISMISSIVE LANGUAGE PATTERNS
        # Instead of looking for specific conditions, look for dismissive language patterns!
        dismissive_patterns = [
            # Pattern: "appears to be benign/stable" but mentions actual finding
            (r'([^.]{15,150}?)(?:\s+(?:appears to be|likely|probably|presumably|most likely|consistent with)\s+(?:benign|stable|unchanged|incidental|normal variant|of no (?:clinical )?significance))', 'Potentially Dismissed Finding'),

            # Pattern: "stable from before" - often hides significant findings
            (r'([^.]{15,150}?)(?:\s+(?:stable|unchanged|similar to (?:prior|before|previous)|no change))', 'Stable Finding (May Be Significant)'),

            # Pattern: "incidental" findings
            (r'(?:incidental|incidentally noted|as an incidental finding)[^.]*?([^.]{15,100})', 'Incidental Finding'),

            # Pattern: Size-based dismissals ("small" doesn't mean unimportant!)
            (r'([^.]{15,150}?)(?:\s+(?:small|tiny|minimal|mild|slight)[^.]*?(?:significance|concern|clinical relevance))', 'Size-Dismissed Finding'),

            # Pattern: "no evidence of X but Y" - the Y is often important!
            (r'no evidence of[^.]*?(?:but|however|although|note that|there is)[^.]*?([^.]{15,100})', 'Finding Despite "No Evidence"'),

            # Pattern: Anatomical "variants" (often clinically relevant)
            (r'([^.]{15,150}?)(?:\s+(?:variant|appears benign|of no clinical significance|developmental))', 'Anatomical "Variant"'),

            # Pattern: Findings with qualifying language
            (r'([^.]{15,150}?)(?:\s+(?:which|that)\s+(?:appears|seems|looks|is likely)\s+(?:benign|stable|insignificant))', 'Qualified Finding'),

            # 🚨 NEW: Direct anatomical abnormalities mentioned without discussion
            (r'(?:There is|Present is|Noted is|Identified is|Seen is)\s+([^.]*?(?:nonunion|malformation|anomaly|defect|absence|agenesis|dysplasia|hypoplasia|aplasia|cleft|bifida|fusion|synostosis)(?:[^.]{0,50}?))', 'Undiscussed Anatomical Finding'),

            # 🚨 NEW: Congenital findings (often dismissed as "normal variants")
            (r'((?:congenital|developmental|anatomical)[^.]*?(?:nonunion|malformation|anomaly|defect|absence|variant|difference)(?:[^.]{0,50}?))', 'Congenital Finding'),
        ]

        for pattern, category in dismissive_patterns:
            matches = re.finditer(pattern, context, re.IGNORECASE | re.DOTALL)
            for match in matches:
                # Extract the actual finding (group 1 if it exists, otherwise the full match)
                finding_text = match.group(1) if match.groups() and match.group(1) else match.group(0)
                finding_text = finding_text.strip()

                # Skip if too short, too generic, or clearly normal
                skip_terms = ['normal', 'unremarkable', 'within normal limits', 'no abnormality', 'negative', 'clear']
                if (len(finding_text) < 15 or
                    any(skip in finding_text.lower() for skip in skip_terms) or
                    finding_text.lower().count('normal') > 1):
                    continue

                logger.info(f"🚨 FOUND DISMISSED FINDING: '{finding_text}' (Category: {category})")

                # Get broader context around the match
                start = max(0, match.start() - 200)
                end = min(len(context), match.end() + 200)
                broader_context = context[start:end].strip()

                finding = IncidentalFinding(
                    finding=finding_text,
                    location=f"Context: ...{broader_context[:100]}...",
                    significance='medium',  # Could be significant
                    related_symptoms=['varies based on finding'],
                    suggested_questions=[
                        f"What exactly is this finding: '{finding_text}'?",
                        f"Could this finding be related to my symptoms?",
                        f"Should this finding be monitored or treated?",
                        f"Why was this finding considered not significant?",
                        f"Are there any specialists I should see about this?"
                    ],
                    why_it_matters=f"This finding was mentioned in your report but may have been dismissed as 'incidental' or 'stable'. However, many findings labeled this way can actually be clinically relevant, especially if you have unexplained symptoms.",
                    confidence=0.75  # Medium confidence since we're pattern matching
                )
                findings.append(finding)

        return findings

    def _calculate_confidence(self, medical_analysis: Dict, incidental_findings: List) -> float:
        """Calculate confidence score for the parsed event"""
        confidence = 0.0
        
        # Base confidence from medical terms found
        confidence += len(medical_analysis['tags']) * 15
        
        # Boost for incidental findings (these are important!)
        confidence += len(incidental_findings) * 25
        
        # Boost for specific medical types
        if medical_analysis['primary_type'] in ['diagnosis', 'surgery']:
            confidence += 20
        
        # Cap at 100
        return min(100.0, confidence)

    def _extract_provider_from_context(self, context: str) -> Dict[str, Any]:
        """🏥 EXTRACT PROVIDER INFORMATION FROM MEDICAL CONTEXT"""
        provider_info = {
            'name': None,
            'specialty': None,
            'organization': None,
            'phone': None,
            'address': None,
            'confidence': 0
        }

        # Extract doctor name with highest confidence pattern
        for pattern_name, pattern in self.provider_patterns.items():
            if 'doctor' in pattern_name or 'provider' in pattern_name or 'dictated' in pattern_name:
                matches = re.findall(pattern, context, re.IGNORECASE)
                if matches:
                    # Handle different match formats
                    if pattern_name in ['doctor_lastname_first', 'dictated_by_pattern']:
                        # These patterns return (lastname, firstname) tuples
                        if len(matches[0]) == 2:
                            lastname, firstname = matches[0]
                            name = f"{firstname.strip()} {lastname.strip()}"
                        else:
                            name = matches[0].strip() if isinstance(matches[0], str) else str(matches[0])
                    else:
                        # Standard patterns return single name
                        name = matches[0].strip()

                    # Clean up the name and validate
                    name = name.replace(',', '').strip()
                    if len(name) > 2:  # Must have reasonable length
                        provider_info['name'] = name
                        provider_info['confidence'] += 30
                        break

        # Extract organization
        org_matches = re.findall(self.provider_patterns['organization_patterns'], context, re.IGNORECASE)
        if org_matches:
            provider_info['organization'] = org_matches[0].strip()
            provider_info['confidence'] += 20

        # Extract phone
        phone_matches = re.findall(self.provider_patterns['phone_patterns'], context, re.IGNORECASE)
        if phone_matches:
            provider_info['phone'] = phone_matches[0].strip()
            provider_info['confidence'] += 15

        # Extract address
        address_matches = re.findall(self.provider_patterns['address_patterns'], context, re.IGNORECASE)
        if address_matches:
            provider_info['address'] = address_matches[0].strip()
            provider_info['confidence'] += 10

        # Guess specialty based on context
        specialty_keywords = {
            'cardiology': ['heart', 'cardiac', 'cardio', 'ecg', 'ekg', 'echo'],
            'orthopedics': ['bone', 'joint', 'spine', 'fracture', 'orthopedic'],
            'neurology': ['brain', 'neuro', 'seizure', 'headache', 'migraine'],
            'radiology': ['x-ray', 'ct', 'mri', 'scan', 'imaging', 'radiologist'],
            'emergency': ['emergency', 'er', 'urgent', 'trauma'],
            'primary care': ['primary', 'family', 'general', 'annual', 'checkup']
        }

        context_lower = context.lower()
        for specialty, keywords in specialty_keywords.items():
            if any(keyword in context_lower for keyword in keywords):
                provider_info['specialty'] = specialty.title()
                provider_info['confidence'] += 10
                break

        # Only return if we found at least a name
        if provider_info['name']:
            return provider_info
        return None

    def _parse_structured_sections(self, text: str) -> List[ParsedMedicalEvent]:
        """
        🩺 PARSE STRUCTURED MEDICAL SECTIONS

        Extracts events from common section headers like:
        - PAST MEDICAL HISTORY:
        - PAST SURGICAL HISTORY:
        - MEDICATIONS:
        - ACTIVE PROBLEMS:
        """
        events = []
        logger.info(f"🩺 Starting section-based parsing on {len(text)} chars")

        # SIMPLER APPROACH: Split by section headers, then parse each section
        # This avoids catastrophic regex backtracking!
        section_markers = [
            ('PAST MEDICAL HISTORY', 'diagnosis', 'active'),
            ('MEDICAL HISTORY', 'diagnosis', 'active'),
            ('ACTIVE PROBLEM', 'diagnosis', 'active'),
            ('PROBLEM LIST', 'diagnosis', 'active'),
            ('PAST SURGICAL HISTORY', 'surgery', 'resolved'),
            ('SURGICAL HISTORY', 'surgery', 'resolved'),
            ('CURRENT MEDICATIONS', 'medication', 'active'),
            ('MEDICATIONS:', 'medication', 'active'),
        ]

        for marker, event_type, default_status in section_markers:
            # Find the marker position
            marker_pos = text.upper().find(marker.upper())
            if marker_pos == -1:
                continue

            logger.info(f"📋 Found section: {marker}")

            # Extract content after the marker until the next major section or 2000 chars
            start_pos = marker_pos + len(marker)
            # Skip any colons or whitespace after the marker
            while start_pos < len(text) and text[start_pos] in ':\n \t':
                start_pos += 1

            # Find the end - look for next section header or cap at 2000 chars
            end_markers = ['PAST ', 'ALLERGIES', 'FAMILY', 'SOCIAL', 'REVIEW OF', 'PHYSICAL', 'ASSESSMENT', 'PLAN:', 'IMPRESSION']
            end_pos = start_pos + 2000  # Default max
            for end_marker in end_markers:
                pos = text.upper().find(end_marker, start_pos)
                if pos != -1 and pos < end_pos:
                    end_pos = pos

            section_content = text[start_pos:end_pos]

            # Parse individual lines from the section
            lines = section_content.strip().split('\n')
            logger.info(f"📋 Section has {len(lines)} lines")

            for line in lines[:50]:  # Cap at 50 items per section
                line = line.strip()

                # Skip empty lines, headers, and boilerplate
                if not line or len(line) < 3:
                    continue
                if line.upper() == line and len(line) > 30:
                    continue  # Skip all-caps headers
                if any(skip in line.lower() for skip in ['page', 'confidential', 'martin,', '---']):
                    continue

                # Clean up common prefixes
                title = line
                title = re.sub(r'^(?:Active Problem\(s\)|Problem|Dx|H/O|History of)[:\s]*', '', title, flags=re.IGNORECASE)
                title = title.strip()

                if not title or len(title) < 3:
                    continue

                # Create event
                event = ParsedMedicalEvent(
                    id=f"section-{datetime.now().timestamp()}-{len(events)}",
                    type=event_type,
                    title=title[:100],  # Cap title length
                    date=datetime.now().strftime('%Y-%m-%d'),  # Default to today (unknown date)
                    end_date=None,
                    provider=None,
                    location=None,
                    description=f"Extracted from {event_type.upper()} section",
                    status=default_status,
                    severity=None,
                    tags=[event_type, 'imported', 'needs-date'],
                    confidence=65,  # Medium confidence - we're pretty sure this is real
                    sources=['section-parser'],
                    needs_review=True,  # User should verify and add correct dates
                    suggestions=['Add the correct date for this event', 'Verify the details are accurate'],
                    raw_text=line,
                    incidental_findings=[]
                )
                events.append(event)

        logger.info(f"🩺 Section parsing complete: {len(events)} events")
        return events

    def _standardize_date(self, date_str: str) -> str:
        """Convert various date formats to YYYY-MM-DD"""
        try:
            # Try different parsing approaches
            import dateutil.parser as date_parser
            parsed_date = date_parser.parse(date_str)
            return parsed_date.strftime('%Y-%m-%d')
        except:
            return date_str  # Return original if parsing fails

# Global parser instance
document_parser = RevolutionaryDocumentParser()
