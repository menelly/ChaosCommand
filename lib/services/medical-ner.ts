/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * medical-ner.ts — medical document → structured events.
 *
 * Once a transformers.js NER wrapper (d4data biomedical-ner-all); as of
 * 2026-07-01 the model layer is native MedGemma (medgemma-doc-scan.ts) and
 * this file is the orchestration around it — sections, dates, assertion,
 * dismissed-finding surfacing, and the impression parser. The filename is
 * kept so imports don't churn; "NER" is now historical.
 */

import { classifyAssertion, classifyStatement } from './assertion';
import {
  extractImpressionItemsLLM,
  type ImpressionItem,
} from './impression-parser-llm';
import { scanDocumentMedGemma, type ScanFinding } from './medgemma-doc-scan';

/** Thrown by extractMedicalEvents when AI validation is REQUIRED (validateWithLLM)
 *  but no validator model is available. The caller must catch this and fail safe
 *  — refuse to surface raw NER, fall back to manual entry. Never ship unvetted. */
export const AI_VALIDATION_UNAVAILABLE = 'AI_VALIDATION_UNAVAILABLE';

// Map d4data entity labels to our event types.
// Note: Sign_symptom is intentionally mapped to 'finding', not 'diagnosis'.
// d4data tags symptom WORDS like "weakness", "lifting", "pain" as Sign_symptom
// regardless of whether they appear as standalone diagnoses or as fragments
// inside symptom descriptions. Treating every symptom-token as a diagnosis
// produces nonsense events ("limbs" as a diagnosis, "lifting" as a diagnosis).
const LABEL_TO_EVENT_TYPE: Record<string, string> = {
  'Disease_disorder': 'diagnosis',
  'Sign_symptom': 'finding',
  'Medication': 'medication',
  'Clinical_event': 'diagnosis',
  'Therapeutic_procedure': 'surgery',
  'Diagnostic_procedure': 'test',
  'Lab_value': 'lab',
  'Biological_structure': 'finding',
  'Severity': 'finding',
  'Outcome': 'finding',
};

// Entity labels we actually care about for medical events
const RELEVANT_LABELS = new Set(Object.keys(LABEL_TO_EVENT_TYPE));

// d4data junk filter — common words the model tags as procedures but aren't
const D4DATA_JUNK = new Set([
  'health', 'record', 'records', 'size', 'report', 'reports', 'note', 'notes',
  'history', 'status', 'finding', 'findings', 'result', 'results', 'date',
  'time', 'page', 'name', 'information', 'data', 'system', 'type', 'image',
  'images', 'series', 'section', 'phase', 'contrast', 'technique', 'comparison',
  'indication', 'impression', 'conclusion', 'summary', 'review', 'follow',
  'patient', 'clinical', 'medical', 'treatment', 'reactive imaging',
  // Severity/qualifier adjectives — these get tagged by d4data as Severity or
  // Lab_value entities when they appear in reference-range templates like
  // "G2 Mild, G3 Moderate, G4 Severe." They are descriptors, not events.
  'mild', 'moderate', 'severe', 'slight', 'marked', 'minimal', 'significant',
  'normal', 'abnormal', 'elevated', 'decreased', 'increased', 'low', 'high',
  'positive', 'negative', 'stable', 'unchanged', 'chronic', 'acute',
  // Stage-identifier fragments from reference tables
  'stage', 'grade', 'level', 'score',
  // MRI / radiology imaging vocabulary — these are sequence/acquisition terms,
  // not diagnoses or findings. d4data was not trained on radiology-heavy text
  // and aggressively misclassifies these. Add as needed.
  'diffusion', 'flow', 'void', 'flair', 'stir', 'dwi', 'adc', 'perfusion',
  'gadolinium', 'gad', 'sequence', 'sequences', 'axial', 'sagittal', 'coronal',
  'hyperintense', 'hypointense', 'isointense', 'enhancement', 'enhancing',
  't1', 't2', 't1w', 't2w', 'fov', 'tr', 'te', 'mri', 'ct', 'pet', 'spect',
  'ultrasound', 'doppler', 'fluoroscopy', 'tomography',
  // Single body parts — anatomy alone has no clinical meaning as an event;
  // a real diagnosis names the condition AND the location ("mass in the
  // foramen of Monroe"), not just the location.
  'limb', 'limbs', 'arm', 'arms', 'leg', 'legs', 'hand', 'hands', 'foot',
  'feet', 'head', 'neck', 'chest', 'back', 'abdomen', 'pelvis', 'spine',
  'globe', 'globes', 'orbit', 'orbits', 'muscle', 'muscles', 'bone', 'bones',
  'joint', 'joints', 'tissue', 'tissues', 'organ', 'organs', 'vessel',
  'vessels', 'nerve', 'nerves', 'artery', 'arteries', 'vein', 'veins',
  // Movement / activity verbs that get tagged as Sign_symptom in symptom
  // descriptions like "weakness with lifting"
  'lifting', 'walking', 'standing', 'sitting', 'running', 'bending', 'reaching',
  'climbing', 'gripping',
  // Common positional / directional fragments that leak out of multi-word
  // entities ("intra-axial" → "intra", "paracentral" → "para", etc.)
  'intra', 'extra', 'para', 'supra', 'infra', 'sub', 'super', 'pre', 'post',
  'anterior', 'posterior', 'medial', 'lateral', 'proximal', 'distal',
  'superior', 'inferior', 'central', 'peripheral',
]);

// Sub-word / tokenizer-fragment guard — entities shorter than this are
// almost always tokenizer artifacts (sub-word pieces that escaped aggregation)
// rather than real clinical entities.
const MIN_ENTITY_LENGTH = 4;

// Confidence floor for surfacing extracted events to the user-review queue.
// d4data confidences below this on radiology / specialist text tend to be
// noise; raise to filter aggressively. The user can lower this if they
// want more recall at the cost of more noise.
const MIN_EVENT_CONFIDENCE = 70;

// ---------------------------------------------------------------------------
// BOILERPLATE / NON-CLINICAL BLOCK DETECTION  (Layer-1 safety floor)
// ---------------------------------------------------------------------------
// A multi-document dump (e.g. a VA Blue Button export, 100+ pages) sweeps device
// package inserts, FDA Emergency-Use-Authorization notices, assay disclaimers,
// and lab reference-range tables INTO "impression"-weighted regions. NER then
// mines those blocks for single words — "shock", "blood", "state", "hyper",
// "glucose", "nuclei", "acid", "reference", "range" — and stamps each a 90%
// finding. This text is ABOUT a test/device; it is NEVER the patient's finding.
// Dropping entities inside these blocks cannot bury a real finding, so it is the
// safe floor. (Caught on Ren's 129-page VA report, 2026-06-30.)
// SAFETY NOTE (Ren, 2026-06-30): these cues match ONLY regulatory / device-
// instruction prose — sentences that, by definition, contain no patient result.
// Do NOT add cues that sit ADJACENT to real values. In particular "reference
// range" was pulled: a lab result ("Glucose 142, reference range 70-99") lives
// RIGHT NEXT TO its reference range, so excluding that region would bury the
// patient's actual glucose. The word "glucose" or "shock" is NEVER banned —
// only an entity physically inside one of these regulatory sentences is skipped,
// and even then any genuinely-ambiguous call is left to the Qwen validator.
const BOILERPLATE_CUES: RegExp[] = [
  /should not be used (?:on|in|for) patients?/i,
  /emergency use authorization/i,
  /this (?:test|system|device|assay|product)\s+(?:does not|should not|is (?:only|not|intended for)|has not been)/i,
  /follow[-\s]?up testing by a (?:pcr|molecular|confirmatory)/i,
  /does not (?:differentiate|distinguish) between/i,
  /(?:authorized|for use) under the .{0,40}food and drug administration/i,
  /package insert|manufacturer'?s? (?:instructions|insert)/i,
  /negative result does not (?:rule out|exclude|preclude)/i,
  /for in[-\s]?vitro diagnostic use/i,
  /(?:has |have )?not been (?:cleared|approved) by (?:the )?fda/i,
  /intended use[:\s]/i,
];

/** Char-index spans of the chunk that are non-clinical boilerplate. NER entities
 *  whose position lands in any span are skipped — they describe a test/device,
 *  not the patient. Windows are generous because inserts run long. */
function findBoilerplateSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const cue of BOILERPLATE_CUES) {
    const re = new RegExp(cue.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push([Math.max(0, m.index - 250), Math.min(text.length, m.index + 450)]);
      if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-width loop
    }
  }
  return spans;
}

function positionInSpans(spans: Array<[number, number]>, start: number, end: number): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

// ============================================================================
// (2026-07-01) The transformers.js NER model loader lived here — getNerPipeline,
// isModelLoaded, extractEntities, deduplicateEntities — loading d4data
// biomedical-ner-all in the WebView. It is GONE. Its whole job (turn a
// document into candidate findings) is now done by MedGemma reading the
// document natively (medgemma-doc-scan.ts), which has the medical vocabulary
// the tagger lacked — the tagger shipped "psycho" as a diagnosis while reading
// "psychologist". NerEntity stays as a shared shape; the model is retired.
// ============================================================================

export interface NerEntity {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
}

/**
 * Deduplicate entities that overlap due to chunking.
 */
// ============================================================================
// SECTION DETECTION (ported from Python)
// ============================================================================

// A real section header sits at the START of a line and is terminated by a
// COLON/DASH, a line break, or end-of-text — e.g. "IMPRESSION:", "Interpretation:",
// or "IMPRESSION" alone on its line. It is NEVER a prose word mid-sentence.
//
// The old patterns allowed a PERIOD as a header-start and made the colon optional
// (`(?:^|\n|\.)…[:\-]?`), so a lab report's interpretive prose —
// "…supplementation. Interpretation and therapy are based on…" — was mis-read as a
// radiology IMPRESSION section. That false section then fed the vitamin-D
// commentary, the lab disclaimer, and the TSH pregnancy-range text to the
// diagnosis parser + NER, which hallucinated events ("pregnancy", "Second"
// trimester, "TSH Analysis:") onto a medical timeline. (Quest lab report, caught
// by Ren 2026-06-22.) Requiring the header SHAPE — line-anchored + colon/break
// terminator — keeps real radiology headers (with OR without a colon) while
// rejecting lab prose, for every doc type at once.
const sectionHeader = (alternation: string): RegExp =>
  new RegExp(`(?:^|\\n)[ \\t\\r]*(?:${alternation})[ \\t\\r]*(?:[:\\-]|(?=\\n)|$)`, 'gi');

const SECTION_PATTERNS: Record<string, RegExp> = {
  indication: sectionHeader('INDICATION|Clinical\\s+(?:History|Indication)|Reason\\s+for\\s+(?:Exam|Study)'),
  technique: sectionHeader('TECHNIQUE|Protocol|Procedure\\s+Description'),
  comparison: sectionHeader('COMPARISON|Prior\\s+(?:Studies?|Exams?)'),
  findings: sectionHeader('FINDINGS?|Observations?|Description|Body\\s+of\\s+Report'),
  impression: sectionHeader('IMPRESSION|CONCLUSION|ASSESSMENT|INTERPRETATION|SUMMARY|DIAGNOS[EI]S'),
};

const SECTION_WEIGHTS: Record<string, number> = {
  impression: 1.0,
  findings: 0.7,
  indication: 0.3,
  comparison: 0.2,
  technique: 0.0,
  unknown: 0.5,
};

interface Section {
  name: string;
  start: number;
  end: number;
  text: string;
}

export function detectSections(text: string): Section[] {
  const matches: { name: string; headerStart: number; contentStart: number }[] = [];

  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        name,
        headerStart: match.index,
        contentStart: match.index + match[0].length,
      });
    }
  }

  matches.sort((a, b) => a.headerStart - b.headerStart);

  const sections: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].headerStart : text.length;
    sections.push({
      name: matches[i].name,
      start: matches[i].contentStart,
      end,
      text: text.slice(matches[i].contentStart, end).trim(),
    });
  }

  if (sections.length === 0) {
    sections.push({ name: 'unknown', start: 0, end: text.length, text });
  }

  return sections;
}

function getSectionAt(sections: Section[], position: number): string {
  for (const sec of sections) {
    if (sec.start <= position && position < sec.end) {
      return sec.name;
    }
  }
  return 'unknown';
}

// ============================================================================
// NEGATION & SPECULATION DETECTION (ported from Python)
// ============================================================================

const NEGATION_CUES = [
  /\bno\b/, /\bnot\b/, /\bnor\b/, /\bnever\b/,
  /\bwithout\b/, /\babsence of\b/, /\babsent\b/,
  /\bnegative for\b/, /\bnegative\b/,
  /\bdeny\b/, /\bdenies\b/, /\bdenied\b/,
  /\brules? out\b/, /\bruled out\b/,
  /\bno evidence of\b/, /\bno sign of\b/, /\bno signs of\b/,
  /\bfree of\b/, /\bfree from\b/,
  /\bunremarkable\b/, /\bnormal\b/,
  /\bfailed to (?:reveal|demonstrate|show)\b/,
  /\bdoes not\b/, /\bdid not\b/, /\bdo not\b/,
];
const NEGATION_WINDOW = 40;

const SPECULATION_CUES = [
  /\bmay be\b/, /\bmay\b/, /\bmight\b/, /\bcould be\b/,
  /\bpossible\b/, /\bpossibly\b/, /\bprobable\b/, /\bprobably\b/,
  /\bsuspect(?:ed|s)?\b/, /\bconcern(?:ed)? for\b/, /\bis a concern\b/,
  /\bconsider\b/, /\bcannot (?:exclude|rule out)\b/,
  /\bdifferential\b/, /\bquestionable\b/,
  /\bsuggests?\b/, /\bsuggestive of\b/,
  /\bconsistent with\b/,
  /\bworrisome for\b/, /\bconcerning for\b/,
];
const SPECULATION_WINDOW = 50;

function isNegated(text: string, start: number, end: number): boolean {
  const windowStart = Math.max(0, start - NEGATION_WINDOW);
  const preceding = text.slice(windowStart, start).toLowerCase();
  return NEGATION_CUES.some(cue => cue.test(preceding));
}

function isSpeculative(text: string, start: number, end: number): boolean {
  const windowStart = Math.max(0, start - SPECULATION_WINDOW);
  const preceding = text.slice(windowStart, start).toLowerCase();
  const windowEnd = Math.min(text.length, end + SPECULATION_WINDOW);
  const following = text.slice(end, windowEnd).toLowerCase();
  const context = preceding + ' ' + following;
  return SPECULATION_CUES.some(cue => cue.test(context));
}

// ============================================================================
// DEMOGRAPHICS FILTER (ported from Python)
// ============================================================================

export function buildExclusionSet(demographics?: Record<string, any> | null): Set<string> {
  const exclusions = new Set<string>();
  if (!demographics) return exclusions;

  for (const nameField of ['legalName', 'preferredName']) {
    const name = demographics[nameField] || '';
    if (name) {
      exclusions.add(name.toLowerCase().trim());
      for (const part of name.split(/[,\s]+/)) {
        const p = part.trim().toLowerCase();
        if (p.length >= 3) exclusions.add(p);
      }
    }
  }

  const address = demographics.address || {};
  for (const field of ['street', 'city', 'state', 'zipCode']) {
    const val = address[field] || '';
    if (val && val.length >= 3) exclusions.add(val.toLowerCase().trim());
  }

  for (const field of ['phone', 'email']) {
    const val = demographics[field] || '';
    if (val) exclusions.add(val.toLowerCase().trim());
  }

  for (const contact of demographics.emergencyContacts || []) {
    const name = contact.name || '';
    if (name) {
      exclusions.add(name.toLowerCase().trim());
      for (const part of name.split(/[,\s]+/)) {
        const p = part.trim().toLowerCase();
        if (p.length >= 3) exclusions.add(p);
      }
    }
  }

  return exclusions;
}

function getExcludedDates(demographics?: Record<string, any> | null): Set<string> {
  const excluded = new Set<string>();
  if (!demographics) return excluded;
  const dob = demographics.dateOfBirth || '';
  if (dob) {
    excluded.add(dob);
    // Try to parse and add multiple formats
    try {
      const parsed = new Date(dob);
      if (!isNaN(parsed.getTime())) {
        excluded.add(parsed.toISOString().split('T')[0]); // YYYY-MM-DD
        excluded.add(`${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`);
      }
    } catch { /* ignore parse failures */ }
  }
  return excluded;
}

// ============================================================================
// DATE EXTRACTION (replaces en_core_web_sm DATE entities)
// ============================================================================

const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
  /(\d{4}-\d{2}-\d{2})/g,
  /(\w+ \d{1,2},?\s+\d{4})/g,
  /(\d{1,2}\s+\w+\s+\d{4})/g,
];

function standardizeDate(dateStr: string): string {
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch { /* ignore */ }
  return dateStr;
}

function findDocumentDate(text: string, excludedDates: Set<string>): string | null {
  // Date labels in PRIORITY order — the clinical-event date (when the scan/draw
  // happened) wins over report-processing dates (received/reported). DOB is never
  // a label here AND is in excludedDates, so the patient's birthday can't leak in.
  // Broad on purpose: the C1 CT defaulted to "today" because its header label
  // wasn't covered (only "Date of Exam"/"Performed" were). Now covers the common
  // radiology + lab header labels.
  const DATE_LABELS = [
    'Date\\s+of\\s+(?:Exam|Study|Procedure|Service)',
    // "Exam Date", "Exam Date/Time", "Examination Date/Time" (the C1 CT label).
    'Exam(?:ination)?\\s+Date(?:\\s*\\/?\\s*Time)?',
    'Study\\s+Date(?:\\s*\\/?\\s*Time)?', 'Acquisition\\s+Date', 'Date\\s+Acquired',
    'Date\\/?Time\\s+(?:Exam\\s+)?Perform\\w*', 'Date\\s+Performed', 'Performed\\s+on',
    'Date\\s+collected', 'Collected(?:\\s+on)?', 'Specimen\\s+collected',
    'DOS', 'Date\\s+of\\s+Service',
    // Encounter dates — fallback when no explicit exam/collection label.
    'Admit(?:ted)?\\s+Date', 'Discharge\\s+Date', 'Service\\s+Date',
    'Date\\s+received', 'Date\\s+reported', 'Date\\s+of\\s+Report', 'Reported(?:\\s+on)?',
  ];
  const DATE_VALUE =
    '(\\d{1,2}\\s+\\w+\\s+\\d{4}(?:\\s*@\\s*\\d{4})?|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\w+\\s+\\d{1,2},?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2})';

  for (const label of DATE_LABELS) {
    const m = text.match(new RegExp(`${label}\\s*[:\\-]?\\s*${DATE_VALUE}`, 'i'));
    if (m) {
      const raw = m[1].split('@')[0].trim();
      const std = standardizeDate(raw);
      if (!excludedDates.has(std)) return std;
    }
  }
  return null;
}

function extractDatesFromText(text: string, excludedDates: Set<string>): { text: string; position: number }[] {
  const dates: { text: string; position: number }[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const std = standardizeDate(match[1]);
      if (!excludedDates.has(std) && !excludedDates.has(match[1])) {
        dates.push({ text: match[1], position: match.index });
      }
    }
  }
  return dates;
}

function findNearestDate(
  context: string,
  dates: { text: string; position: number }[],
  excludedDates: Set<string>
): string | null {
  for (const d of dates) {
    const std = standardizeDate(d.text);
    if (!excludedDates.has(std) && context.includes(d.text)) {
      return std;
    }
  }
  // Fallback: find any date in context
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(context);
    if (match) {
      const std = standardizeDate(match[1]);
      if (!excludedDates.has(std)) return std;
    }
  }
  return null;
}

// ============================================================================
// IMPRESSION PARSER (ported from Python)
// ============================================================================

function parseImpressionItems(impressionText: string): { number: string; text: string }[] {
  const items: { number: string; text: string }[] = [];
  // [\s\S]+? so items can span line breaks (PDFs often wrap impression bodies
  // across 3-4 lines). Terminator lookahead matches the NEXT number followed
  // by . or ), with optional whitespace — no longer requires [A-Z] because
  // items can legitimately start with a digit (e.g. "5. 7 mm renal stone").
  const pattern = /(?:^|[\n\r]|\.\s)\s*(\d+)\s*[.)]\s+([\s\S]+?)(?=\s*\d+\s*[.)]\s+\S|\s*$)/g;
  let match;
  while ((match = pattern.exec(impressionText)) !== null) {
    const text = match[2].replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    if (text.length >= 5) {
      items.push({ number: match[1], text });
    }
  }

  // Fall-through: many reports (Intermountain US/MRI, lots of pediatric
  // formats) write a single prose IMPRESSION paragraph instead of a numbered
  // list. With no numbers, the loop above returns 0 → the impression parser
  // produced no events at all → the file showed "Found 0 medical events".
  // Sentence-split as a second-chance pass, capped to a few items to keep
  // the review queue clean.
  if (items.length === 0 && impressionText.trim().length >= 10) {
    const sentences = impressionText
      .split(/(?<=[.;])\s+(?=[A-Z])|\n+/)
      .map((s) => s.replace(/\s+/g, ' ').trim().replace(/\.$/, ''))
      .filter((s) => s.length >= 8 && /[a-z]/i.test(s));
    sentences.slice(0, 6).forEach((s, i) => items.push({ number: String(i + 1), text: s }));
  }
  return items;
}

// ============================================================================
// MAIN EXTRACTION — THE FULL PIPELINE
// ============================================================================

export interface MedicalEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  end_date: string | null;
  provider: string | null;
  location: string | null;
  description: string;
  status: string;
  severity: string | null;
  tags: string[];
  confidence: number;
  sources: string[];
  needs_review: boolean;
  suggestions: string[];
  raw_text: string;
  dosage: string | null;
  incidental_findings: string[];
}

/**
 * THE medical event extractor. Section-aware, negation-aware, demographics-filtered.
 * Direct port of Python's extract_medical_events + events_to_parsed_format.
 */
export async function extractMedicalEvents(
  text: string,
  filename: string = 'document',
  demographics?: Record<string, any> | null,
  onProgress?: (progress: { status: string; progress?: number; file?: string }) => void,
  opts?: { validateWithLLM?: boolean },
): Promise<MedicalEvent[]> {
  console.log(`🐙 MEDICAL_NER extract called! demographics=${demographics ? 'YES' : 'NO'}`);

  const nameExclusions = buildExclusionSet(demographics);
  const excludedDates = getExcludedDates(demographics);

  const chunk = text.slice(0, 100000);

  // --- NON-CLINICAL BOILERPLATE REGIONS (Layer-1 safety floor) ---
  // Regulatory / device-instruction prose (EUA notices, "should not be used on
  // patients", package inserts). Entities inside these are skipped below — this
  // text describes a test/device, never the patient. Context-scoped, NOT a word
  // ban: "glucose"/"shock" elsewhere (a real result or diagnosis) are untouched.
  const boilerplateSpans = findBoilerplateSpans(chunk);
  if (boilerplateSpans.length) console.log(`🧾 ${boilerplateSpans.length} non-clinical boilerplate region(s) detected — entities inside will be skipped`);

  // --- DOCUMENT-LEVEL DATE ---
  const docDate = findDocumentDate(chunk, excludedDates);

  // --- SECTIONS ---
  const sections = detectSections(chunk);
  console.log(`📄 Sections found: ${sections.map(s => s.name).join(', ')}`);

  const impressionSection = sections.find(s => s.name === 'impression') || null;
  const findingsSection = sections.find(s => s.name === 'findings') || null;
  const impressionEntitiesLower = new Set<string>();

  // --- MEDGEMMA WHOLE-DOCUMENT SCAN (2026-07-01) ---
  // Replaces BOTH halves of the old "both-AI-or-none" pair (d4data NER tagger
  // + Qwen validator) with one model that actually reads the document. Every
  // finding it returns is GROUNDED — located in the source text — so it
  // arrives with real char offsets and the section/assertion/dismissal
  // machinery below keeps working unchanged.
  const scan = await scanDocumentMedGemma(chunk, onProgress);
  if (scan === null && opts?.validateWithLLM) {
    // AI parsing is on but no model is available → fail safe, exactly like
    // the old validator contract: never surface machine extraction no
    // competent model has read.
    throw new Error(AI_VALIDATION_UNAVAILABLE);
  }

  // Impression items: the scan's SECOND list is the doctor's own summary,
  // transcribed and grounded. Fall back to the regex parser when the scan is
  // unavailable (AI off) — that path slices verbatim text and can't hallucinate.
  const impressionItems: ImpressionItem[] =
    scan && scan.impressionItems.length > 0
      ? scan.impressionItems
      : impressionSection
        ? ((await extractImpressionItemsLLM(impressionSection.text)) ?? parseImpressionItems(impressionSection.text))
        : [];
  const impressionTextLower = impressionItems
    .map(i => i.text.toLowerCase())
    .join(' | ');

  // --- DATES ---
  const datesFound = extractDatesFromText(chunk, excludedDates);

  const scanFindings: ScanFinding[] = scan?.findings ?? [];

  const events: MedicalEvent[] = [];
  const seenKeys = new Set<string>();
  let eventCounter = 0;

  // --- PROCESS MEDGEMMA FINDINGS ---
  for (const ent of scanFindings) {
    const key = ent.text.toLowerCase().trim();
    if (key.length < 4) continue;
    if (!/[aeiouy]/i.test(key)) continue;
    if (nameExclusions.has(key) || seenKeys.has(key)) continue;
    // Junk floor kept from the NER era — MedGemma emits whole phrases so this
    // almost never fires, but it's a free guard against a degenerate line.
    if (D4DATA_JUNK.has(key)) continue;
    // Skip findings sitting inside regulatory/device boilerplate (package
    // inserts, EUA notices) — that text is about a test, not the patient.
    if (positionInSpans(boilerplateSpans, ent.start, ent.end)) {
      console.log(`🧾 BOILERPLATE: '${ent.text}' inside a regulatory block — skipping`);
      continue;
    }
    // Skip findings already covered by the doctor's impression summary.
    if (impressionTextLower && impressionTextLower.includes(key)) continue;

    // Assertion (NegEx/ConText), statement-level — the scan line IS the full
    // statement. Belt-and-suspenders on top of the prompt's own "leave out
    // things explicitly stated to be normal, absent, or ruled out": a TRUE
    // negation ("no evidence of fracture") is dropped; pseudo-negation
    // ("no change in thyroid nodule") stays AFFIRMED so tracked findings the
    // patient may never have been told about don't vanish. (CHA-367 §3.B)
    const { assertion } = classifyStatement(ent.text);
    if (assertion === 'negated') {
      console.log(`🚫 NEGATED: '${ent.text}' — skipping`);
      continue;
    }

    const section = getSectionAt(sections, ent.start);
    if (section === 'technique') continue;

    // DISMISSED-FINDING SIGNALS — words clinicians use to WAVE OFF a finding the
    // patient often was never actually told about. These do NOT mean harmless:
    //   • "stable / no change"      → a finding that's being TRACKED (so it
    //                                  exists, and someone is watching it).
    //   • "congenital / developmental" → "you've always had it" — used to dismiss,
    //                                  but it means LIFELONG and uninvestigated,
    //                                  not benign. (Ren's record literally reads
    //                                  "congenital nonunion of the posterior arch
    //                                  of C1" — the canonical buried finding.)
    //   • "normal/anatomic variant" → categorized-away as not-worth-discussing.
    //   • "incidental"              → an unexpected finding noted in passing.
    // All get flagged for review with language that does NOT wave them off.
    const aroundEntity = chunk.slice(Math.max(0, ent.start - 70), ent.end + 25);
    let dismissalSignal: '' | 'stability' | 'congenital' | 'variant' | 'incidental' = '';
    if (/\b(?:no\s+(?:significant\s+)?(?:interval\s+)?change|stable|unchanged)\b/i.test(aroundEntity)) dismissalSignal = 'stability';
    else if (/\b(?:congenital|developmental)\b/i.test(aroundEntity)) dismissalSignal = 'congenital';
    else if (/\b(?:normal\s+variant|anatomic(?:al)?\s+variant|developmental\s+variant)\b/i.test(aroundEntity)) dismissalSignal = 'variant';
    else if (/\bincidental(?:ly)?\b/i.test(aroundEntity)) dismissalSignal = 'incidental';

    const speculative = assertion === 'speculative' || isSpeculative(ent.text, 0, ent.text.length);
    seenKeys.add(key);

    // Scan lines carry no NER label — infer the event type from the line
    // itself. Conservative: everything is a 'finding' unless it clearly reads
    // as a lab value or a status-post procedure.
    let eventType = 'finding';
    if (
      /\b\d+(?:\.\d+)?\s*(?:mg\/dl|mmol\/l|mcg|ng\/ml|g\/dl|k\/ul|iu\/l|u\/l|mmhg|bpm|%)\b/i.test(key) ||
      (/\b(?:critical|high|low)\b/i.test(key) && /\d/.test(key))
    ) {
      eventType = 'lab';
    } else if (/\b(?:status[- ]post|s\/p)\b|\b(?:resection|repair|fusion|replacement)\b|ectomy\b/i.test(key)) {
      eventType = 'surgery';
    }

    const contextStart = Math.max(0, ent.start - 150);
    const contextEnd = Math.min(chunk.length, ent.end + 150);
    const context = chunk.slice(contextStart, contextEnd).trim();

    const nearestDate = findNearestDate(context, datesFound, excludedDates);
    // A MedGemma finding is grounded model output the model DELIBERATELY
    // surfaced — not a tagger's stray guess — so it doesn't get the NER-era
    // section-weight penalty that dragged a real finding down to 63% (under the
    // floor) just for living in the findings section. Solid fixed confidence;
    // hedged/speculative wording still knocks it down. (weight is unused now.)
    const confidence = speculative ? 72 : 88;

    if (section === 'impression') {
      impressionEntitiesLower.add(key);
    }

    const tags = [eventType, 'imported', 'medgemma'];
    if (section !== 'unknown') tags.push(`section:${section}`);
    if (speculative) tags.push('speculative');
    if (dismissalSignal) { tags.push('potential-dismissed-finding'); tags.push(`dismissed:${dismissalSignal}`); }

    const suggestions: string[] = [];
    if (!nearestDate && !docDate) suggestions.push('Verify date', 'Add provider information');
    if (speculative) suggestions.push('Described as possible/suspected — confirm with provider');
    // Dismissed-finding prompts — worded to NOT wave the finding off.
    if (dismissalSignal === 'stability') suggestions.push('Described as "stable/unchanged" — a finding that\'s being tracked. Confirm a provider actually told you about it.');
    else if (dismissalSignal === 'congenital') suggestions.push('Described as "congenital/developmental" — often used to wave a finding off, but it means lifelong, NOT harmless. Worth understanding and confirming it was ever explained to you.');
    else if (dismissalSignal === 'variant') suggestions.push('Called a "variant" — make sure you understand what it is and whether it needs monitoring; don\'t let it be filed away unexplained.');
    else if (dismissalSignal === 'incidental') suggestions.push('Noted as "incidental" — an unexpected finding that may still warrant follow-up. Ask whether it does.');

    // Confidence floor — kept from the NER era but scan findings are grounded
    // MedGemma output, not tagger noise, so only the EXCEPTION matters much:
    // a dismissal-flagged finding (congenital/stable/variant/incidental) is
    // the whole point of this tool — never let the floor bury it. (The buried
    // C1 non-union is the canonical case.)
    if (confidence < MIN_EVENT_CONFIDENCE && !dismissalSignal) continue;

    const eventDate = nearestDate || docDate || new Date().toISOString().split('T')[0];

    let title = ent.text.trim();
    if (title.length > 80) title = title.slice(0, 77) + '...';

    events.push({
      id: `nlp-${Date.now()}-${eventCounter++}`,
      type: eventType,
      title: `${speculative ? '⚠️ ' : ''}${title}`,
      date: eventDate,
      end_date: null,
      provider: null,
      location: null,
      // The clean grounded finding line — NOT the raw char-window slice, which
      // started mid-word ("ent. There is expansion..."). raw_text keeps the
      // surrounding context for anyone who wants to see it in situ.
      description: ent.text.trim(),
      status: 'active',
      severity: null,
      tags,
      confidence,
      sources: ['medgemma'],
      needs_review: (!nearestDate && !docDate) || speculative || !!dismissalSignal,
      suggestions,
      raw_text: context,
      dosage: null,
      incidental_findings: [],
    });
  }

  // --- IMPRESSION DIRECT PARSING ---
  if (impressionSection) {
    // impressionItems was already parsed above (before the NER loop) so the
    // NER loop could dedupe against it. Reuse rather than re-parse.
    console.log(`📋 ${impressionItems.length} numbered impression items found`);

    for (const item of impressionItems) {
      // Title FIRST (so the dedup compares titles, not body prose).
      const titleMatch = item.text.match(
        /^(.+?)(?:\.\s|(?:in|of|with)\s+(?:the\s+)?(?:right|left|bilateral))/i
      );
      let title = titleMatch ? titleMatch[1].trim() : item.text.split('.')[0].trim();
      if (title.length > 80) title = title.slice(0, 77) + '...';
      const key = title.toLowerCase().trim();

      // Dedupe ONLY on title — not on substring-overlap with the body. The old
      // check dropped any item whose body contained a 5+ char word already
      // seen. Synthesizing impressions (#4 in the PE report: "In the setting of
      // pulmonary emboli, pulmonary nodules, mediastinal adenopathy, and
      // hepatosplenomegaly, a lympho-proliferative disorder including lymphoma
      // is a concern.") legitimately reference prior items — and that's the
      // MOST IMPORTANT item, the one tying everything together. So a body that
      // mentions earlier findings must NOT delete the item; only a duplicate
      // TITLE does.
      if (seenKeys.has(key)) continue;

      // Assertion check — the impression parser used to surface EVERY bullet,
      // including negatives ("No evidence of acute fracture" → a 95% diagnosis).
      // The bullet IS the statement (the negation is inside it), so use the
      // statement-level classifier (probes both ends) rather than entity-scoped
      // classifyAssertion. DROP negated ones; pseudo-negation ("no interval
      // change in the mass") stays affirmed so real findings survive. (§3.B)
      const assertion = classifyStatement(item.text).assertion;
      if (assertion === 'negated') {
        console.log(`🚫 NEGATED impression item: '${title}' — skipping`);
        continue;
      }
      seenKeys.add(key);

      const speculative = assertion === 'speculative' || isSpeculative(item.text, 0, item.text.length);
      const nearestDate = findNearestDate(item.text, datesFound, excludedDates);

      const itemLower = item.text.toLowerCase();
      let eventType = 'diagnosis';
      if (/status post|post-|s\/p/.test(itemLower)) eventType = 'surgery';
      else if (/recommend|follow-up|follow up/.test(itemLower)) eventType = 'finding';

      const tags = [eventType, 'imported', 'impression-parser'];
      tags.push('section:impression');
      if (speculative) tags.push('speculative');

      const suggestions: string[] = [];
      if (!nearestDate && !docDate) suggestions.push('Verify date');
      if (speculative) suggestions.push('Described as possible/suspected — confirm with provider');

      events.push({
        id: `nlp-${Date.now()}-${eventCounter++}`,
        type: eventType,
        title: `${speculative ? '⚠️ ' : ''}${title}`,
        date: nearestDate || docDate || new Date().toISOString().split('T')[0],
        end_date: null,
        provider: null,
        location: null,
        description: item.text.slice(0, 300),
        status: 'active',
        severity: null,
        tags,
        confidence: speculative ? 70 : 95,
        sources: ['impression-parser'],
        needs_review: (!nearestDate && !docDate) || speculative,
        suggestions,
        raw_text: item.text,
        dosage: null,
        incidental_findings: [],
      });

      impressionEntitiesLower.add(key);
    }
  }

  // --- DISMISSED FINDINGS (in findings but NOT in impression) ---
  if (findingsSection && impressionSection && impressionEntitiesLower.size > 0) {
    for (const event of events) {
      if (event.tags.includes('section:findings')) {
        const el = event.title.replace(/^⚠️ /, '').toLowerCase().trim();
        const inImpression = Array.from(impressionEntitiesLower).some(
          ik => ik.includes(el) || el.includes(ik)
        );
        if (!inImpression) {
          event.tags.push('potentially-dismissed');
          event.suggestions.push('Finding in report body but NOT in impression — ask your provider');
        }
      }
    }
  }

  // --- §3.C SENTENCE-LEVEL FINDINGS SCAN (LEGACY — only when MedGemma is OFF) ---
  // This regex sentence-splitter existed because d4data couldn't read radiology
  // prose, so it crudely swept the FINDINGS section for dismissed findings. Its
  // splitter breaks mid-sentence ("...superior inferior dimension, but this
  // appears benign" → a fragment titled "dimension, but this appears benign"),
  // and MedGemma now reads the whole section properly and catches these itself.
  // So it ONLY runs as the fallback when the scan didn't (AI parsing off / no
  // model) — when MedGemma ran, it owns findings and this stays out of the way.
  if (findingsSection && scan === null) {
    const imprLow = impressionTextLower; // already lowercased, '|'-joined
    const DISMISS_SENT = /\bcongenital\b|\bdevelopmental\b|\bnormal\s+variant\b|\banatomic(?:al)?\s+variant\b|\bincidental(?:ly)?\b|\bno\s+(?:significant\s+)?(?:interval\s+)?change\b|\bunchanged\b|\bstable\b/i;
    // Hard negation that ISN'T pseudo — a real "no evidence of X" is not a finding.
    const HARD_NEG = /\bno\s+evidence\s+of\b|\bnegative\s+for\b|\bruled?\s+out\b|\bnot\s+(?:seen|identified|present|appreciated)\b|\bis\s+absent\b/i;
    const PSEUDO = /\bno\s+(?:significant\s+)?(?:interval\s+)?change\b|\bno\s+new\b/i;

    const sentences = findingsSection.text
      .split(/(?<=[.;])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    for (const sent of sentences) {
      const low = sent.toLowerCase();
      const dm = low.match(DISMISS_SENT);
      if (!dm) continue;
      // Skip true negations (but keep "no change" — that's a dismissal signal).
      if (HARD_NEG.test(low) && !PSEUDO.test(low)) continue;

      // Reflected in the impression already? (significant words overlap)
      const sigWords = low.match(/\b[a-z]{5,}\b/g) || [];
      const overlap = sigWords.filter(w => imprLow.includes(w)).length;
      const reflected = sigWords.length > 0 && overlap / sigWords.length >= 0.5;
      if (reflected) continue;

      // Dedupe against what we already surfaced.
      let title = sent.replace(/^(?:there\s+is|there\s+are|note\s+is\s+made\s+of|noted\s+is|seen\s+is)\s+/i, '').trim();
      title = title.replace(/\.$/, '').trim();
      if (title.length > 90) title = title.slice(0, 87) + '...';
      const titleKey = title.toLowerCase();
      if (seenKeys.has(titleKey)) continue;
      if (Array.from(seenKeys).some(k => k.length >= 6 && titleKey.includes(k))) continue;
      seenKeys.add(titleKey);

      const signal: 'congenital' | 'variant' | 'incidental' | 'stability' =
        /congenital|developmental/i.test(dm[0]) ? 'congenital'
        : /variant/i.test(dm[0]) ? 'variant'
        : /incidental/i.test(dm[0]) ? 'incidental'
        : 'stability';
      const msg: Record<typeof signal, string> = {
        congenital: 'In your report\'s FINDINGS but not the impression, described as "congenital" — lifelong does NOT mean harmless. Ask your provider to explain it and whether it needs monitoring.',
        variant: 'In your report\'s FINDINGS but not the impression, filed as a "variant" — make sure you understand what it is and whether it matters for you.',
        incidental: 'In your report\'s FINDINGS but not the impression, noted as "incidental" — an unexpected finding that may still warrant follow-up.',
        stability: 'In your report\'s FINDINGS but not the impression, described as "stable/unchanged" — it\'s a tracked finding. Confirm a provider actually told you about it.',
      };
      const nearestDate = findNearestDate(sent, datesFound, excludedDates);

      events.push({
        id: `nlp-${Date.now()}-${eventCounter++}`,
        type: 'finding',
        title: `🔎 ${title}`,
        date: nearestDate || docDate || new Date().toISOString().split('T')[0],
        end_date: null,
        provider: null,
        location: null,
        description: sent.slice(0, 300),
        status: 'active',
        severity: null,
        tags: ['finding', 'imported', 'findings-scan', 'section:findings', 'potentially-dismissed', `dismissed:${signal}`],
        confidence: 80,
        sources: ['findings-scan'],
        needs_review: true,
        suggestions: [msg[signal]],
        raw_text: sent,
        dosage: null,
        incidental_findings: [],
      });
    }
  }

  // NOTE (2026-07-01): the old Qwen "AI validation pass" is gone. It existed
  // because the d4data tagger had no judgment and needed a second model to
  // veto its garbage ("both-AI-or-none"). MedGemma read the document itself
  // and every finding is grounded in the source text — the extractor and the
  // reviewer are finally the same competent model. The fail-safe contract
  // survives at the top of this function: AI parsing on + no model → throw
  // AI_VALIDATION_UNAVAILABLE, never surface unvetted extraction.

  // Apply document-level date to events without dates
  if (docDate) {
    for (const event of events) {
      if (!event.date || event.date === new Date().toISOString().split('T')[0]) {
        event.date = docDate;
      }
    }
  }

  // Sort by confidence descending
  events.sort((a, b) => b.confidence - a.confidence);

  console.log(`🧠 TOTAL: ${events.length} events from ${filename}`);

  return events;
}
