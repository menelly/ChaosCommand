/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * medical-ner.ts — Transformers.js-powered medical NER
 * Replaces the entire Flask/spaCy backend with a single ONNX model
 * running directly in the browser/Tauri WebView.
 *
 * Model: d4data/biomedical-ner-all (DistilBERT, int8 quantized, ~64MB)
 * Same model the Python backend used — just in ONNX format.
 */

import { classifyAssertion, classifyStatement } from './assertion';
import { extractImpressionItemsLLM, type ImpressionItem } from './impression-parser-llm';

// Transformers.js is loaded dynamically to avoid SSG prerender issues
// (new URL() calls in onnxruntime-web fail during Node.js-based static generation)
type TokenClassificationPipeline = any;
let _transformersModule: any = null;
async function getTransformers() {
  if (!_transformersModule) {
    // Dynamic import bypasses SSG static analysis
    _transformersModule = await import('./transformers-shim.mjs');
  }
  return _transformersModule;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MODEL_ID = 'onnx-community/biomedical-ner-all-ONNX';
const MODEL_OPTIONS = {
  dtype: 'q8' as const,  // int8 quantized — 64MB instead of 254MB
};

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

// ============================================================================
// SINGLETON MODEL LOADER
// ============================================================================

let _pipeline: TokenClassificationPipeline | null = null;
let _loading: Promise<TokenClassificationPipeline> | null = null;

/**
 * Get the NER pipeline. Loads the model on first call, reuses after.
 * Progress callback fires during download/load for UI feedback.
 */
export async function getNerPipeline(
  onProgress?: (progress: { status: string; progress?: number; file?: string }) => void
): Promise<TokenClassificationPipeline> {
  if (_pipeline) return _pipeline;

  if (_loading) return _loading;

  _loading = (async () => {
    console.log('⏳ Loading medical NER model...');
    const startTime = Date.now();

    const { pipeline: pipelineFn } = await getTransformers();

    // Model loads from HuggingFace CDN, cached by browser after first download.
    // Local models disabled: Tauri's WebView returns HTML 404 pages that break JSON parsing.
    // WASM backend forced: WebGL isn't available in all Android WebViews.
    const { env: tfEnv } = await getTransformers();
    tfEnv.allowLocalModels = false;
    tfEnv.allowRemoteModels = true;
    // Force WASM backend — WebGL can fail silently in Tauri Android WebView
    tfEnv.backends.onnx.wasm.proxy = false;

    console.log(`📦 Model source: HuggingFace CDN (cached by browser after first load)`);

    try {
      const pipe = await pipelineFn('token-classification', MODEL_ID, {
        ...MODEL_OPTIONS,
        progress_callback: onProgress || ((p: any) => {
          if (p.status === 'progress' && p.progress !== undefined) {
            console.log(`📦 Loading model: ${Math.round(p.progress)}%`);
          }
        }),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Medical NER model loaded in ${elapsed}s`);

      _pipeline = pipe;
      _loading = null;
      return pipe;
    } catch (err) {
      _loading = null;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ NER model failed to load: ${msg}`);
      // Surface which URL failed if it's a fetch error
      if (msg.includes('<!DOCTYPE') || msg.includes('Unexpected token')) {
        throw new Error(
          `NER model loading failed — a fetch returned HTML instead of data. ` +
          `This usually means the device can't reach HuggingFace CDN. ` +
          `NER features require an internet connection on first use. Original: ${msg.slice(0, 200)}`
        );
      }
      throw err;
    }
  })();

  return _loading;
}

/**
 * Check if the model is already loaded.
 */
export function isModelLoaded(): boolean {
  return _pipeline !== null;
}

// ============================================================================
// NER EXTRACTION
// ============================================================================

export interface NerEntity {
  text: string;
  label: string;
  score: number;
  start: number;
  end: number;
}

/**
 * Run NER on text and return raw entities.
 * Handles chunking for long documents (model max ~512 tokens).
 */
export async function extractEntities(
  text: string,
  onProgress?: (progress: { status: string; progress?: number; file?: string }) => void
): Promise<NerEntity[]> {
  const pipe = await getNerPipeline(onProgress);

  // Chunk text for long documents (DistilBERT has 512 token limit)
  // Use ~2000 chars per chunk with 200 char overlap for context
  const CHUNK_SIZE = 2000;
  const OVERLAP = 200;
  const chunks: { text: string; offset: number }[] = [];

  if (text.length <= CHUNK_SIZE) {
    chunks.push({ text, offset: 0 });
  } else {
    for (let i = 0; i < text.length; i += CHUNK_SIZE - OVERLAP) {
      chunks.push({
        text: text.slice(i, i + CHUNK_SIZE),
        offset: i,
      });
    }
  }

  const allEntities: NerEntity[] = [];

  for (const chunk of chunks) {
    const results = await pipe(chunk.text, {
      aggregation_strategy: 'simple',
    });

    // results is an array of entity objects
    for (const ent of results as any[]) {
      // Strip B-/I- prefixes from labels
      const rawLabel = ent.entity_group || ent.entity || '';
      const label = rawLabel.replace(/^[BI]-/, '');

      if (!RELEVANT_LABELS.has(label)) continue;

      let entityText = (ent.word || '').trim();

      // Clean WordPiece tokenizer artifacts (DistilBERT splits words into subwords)
      // "##el", "##tion", "##ing" are subword fragments — not real entities
      if (entityText.startsWith('##')) continue;
      // Remove ## markers from within reassembled text ("hepato ##megaly" → "hepatomegaly")
      entityText = entityText.replace(/\s*##/g, '').trim();

      if (entityText.length < 2) continue;
      if (D4DATA_JUNK.has(entityText.toLowerCase())) continue;

      allEntities.push({
        text: entityText,
        label,
        score: ent.score || 0,
        start: (ent.start || 0) + chunk.offset,
        end: (ent.end || 0) + chunk.offset,
      });
    }
  }

  // Deduplicate overlapping entities from chunk overlaps
  // Keep the one with higher score
  const deduped = deduplicateEntities(allEntities);

  console.log(`🧠 NER extracted ${deduped.length} entities from ${chunks.length} chunks`);
  return deduped;
}

/**
 * Deduplicate entities that overlap due to chunking.
 */
function deduplicateEntities(entities: NerEntity[]): NerEntity[] {
  if (entities.length === 0) return [];

  // Sort by start position, then by score descending
  entities.sort((a, b) => a.start - b.start || b.score - a.score);

  const result: NerEntity[] = [entities[0]];

  for (let i = 1; i < entities.length; i++) {
    const prev = result[result.length - 1];
    const curr = entities[i];

    // If overlapping, keep the higher-scored one
    if (curr.start < prev.end) {
      if (curr.score > prev.score) {
        result[result.length - 1] = curr;
      }
      // Otherwise skip curr (prev had higher score)
    } else {
      result.push(curr);
    }
  }

  return result;
}

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
): Promise<MedicalEvent[]> {
  console.log(`🐙 MEDICAL_NER extract called! demographics=${demographics ? 'YES' : 'NO'}`);

  const nameExclusions = buildExclusionSet(demographics);
  const excludedDates = getExcludedDates(demographics);

  const chunk = text.slice(0, 100000);

  // --- DOCUMENT-LEVEL DATE ---
  const docDate = findDocumentDate(chunk, excludedDates);

  // --- SECTIONS ---
  const sections = detectSections(chunk);
  console.log(`📄 Sections found: ${sections.map(s => s.name).join(', ')}`);

  const impressionSection = sections.find(s => s.name === 'impression') || null;
  const findingsSection = sections.find(s => s.name === 'findings') || null;
  const impressionEntitiesLower = new Set<string>();

  // Pre-compute the impression's flattened text so the NER loop below can
  // dedupe against it. Done BEFORE NER so the doctor's own summary wins
  // over model fragments — e.g. "Pulmonary emboli in right basilar..."
  // survives instead of being silenced by a bare "pulmonary" entity.
  // LLM-first with regex fallback. Qwen3.5-0.8B-Q4 (when wired in) correctly
  // surfaces synthesis-impression items like "in the setting of X,Y,Z lymphoma
  // is a concern" — the case the regex parser's substring-dedup used to delete.
  // When no LLM is available (stub runner / user opted out / WebGPU absent),
  // extractImpressionItemsLLM returns null and we fall through to the regex
  // parser, which is itself now better (dedup-fix + inline sentence-splitter).
  const impressionItems: ImpressionItem[] = impressionSection
    ? ((await extractImpressionItemsLLM(impressionSection.text)) ?? parseImpressionItems(impressionSection.text))
    : [];
  const impressionTextLower = impressionItems
    .map(i => i.text.toLowerCase())
    .join(' | ');

  // --- DATES ---
  const datesFound = extractDatesFromText(chunk, excludedDates);

  // --- NER ENTITIES ---
  const entities = await extractEntities(chunk, onProgress);

  const events: MedicalEvent[] = [];
  const seenKeys = new Set<string>();
  let eventCounter = 0;

  // --- PROCESS NER ENTITIES ---
  for (const ent of entities) {
    const key = ent.text.toLowerCase().trim();
    // Floor: 4+ chars AND at least one vowel. Kills subword tokens that
    // escape the WordPiece cleanup ("nod", "cho", "sub", "per", "pan",
    // "arch", "basil", "retro", "para", "media", "ate") without a
    // hardcoded list.
    if (key.length < 4) continue;
    if (!/[aeiouy]/i.test(key)) continue;
    if (nameExclusions.has(key) || seenKeys.has(key)) continue;
    // Sub-word tokenizer fragment guard — short entities are almost always
    // tokenizer artifacts (e.g. "intra" leaked from "intra-axial").
    if (ent.text.trim().length < MIN_ENTITY_LENGTH) continue;
    // Junk filter — common words / radiology vocab / single body parts /
    // movement verbs that d4data tags as clinical entities but aren't.
    if (D4DATA_JUNK.has(key)) continue;
    // Skip entities already covered by the doctor's impression summary.
    // impressionTextLower is populated BEFORE this loop so multi-word
    // impressions win over fragment-level NER tags.
    if (impressionTextLower && impressionTextLower.includes(key)) continue;

    // Assertion (NegEx/ConText). Replaces the old 40-char window, which both
    // surfaced negatives as positives AND — the dangerous one — suppressed real
    // findings via pseudo-negation: "no change in thyroid nodule" matched a bare
    // "no" and DROPPED the nodule, so a tracked finding the patient may never
    // have been told about silently vanished. The engine's pseudo-negation guard
    // keeps "no change in X" AFFIRMED. Only a TRUE negation ("no evidence of
    // fracture") is dropped. (CHA-367 §3.B)
    const { assertion } = classifyAssertion(chunk, ent.start, ent.end);
    if (assertion === 'negated') {
      console.log(`🚫 NEGATED: '${ent.text}' — skipping`);
      continue;
    }

    const section = getSectionAt(sections, ent.start);
    const weight = SECTION_WEIGHTS[section] ?? 0.5;

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

    const speculative = assertion === 'speculative' || isSpeculative(chunk, ent.start, ent.end);
    seenKeys.add(key);

    let eventType = LABEL_TO_EVENT_TYPE[ent.label] || 'finding';

    // ANGIO is a procedure, not a medication
    if (eventType === 'medication' && /angio|contrast|bolus/.test(key)) {
      eventType = 'test';
    }

    const contextStart = Math.max(0, ent.start - 150);
    const contextEnd = Math.min(chunk.length, ent.end + 150);
    const context = chunk.slice(contextStart, contextEnd).trim();

    const nearestDate = findNearestDate(context, datesFound, excludedDates);
    const confidence = Math.round(0.90 * weight * (speculative ? 0.7 : 1.0) * 100);

    if (section === 'impression') {
      impressionEntitiesLower.add(key);
    }

    const tags = [eventType, 'imported', 'ner'];
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

    // Confidence floor — skip noisy low-confidence detections rather than
    // surfacing them to the user-review queue. d4data on radiology / specialist
    // text produces a long tail of weak detections that overwhelm signal.
    // EXCEPTION: a dismissal-flagged finding (congenital/stable/variant/
    // incidental) is the whole point of this tool — never let the floor bury it.
    // Findings-section weight (0.7) drops these to ~63%, under the 70 floor,
    // which is exactly how the buried C1 non-union stayed buried.
    if (confidence < MIN_EVENT_CONFIDENCE && !dismissalSignal) continue;

    const eventDate = nearestDate || docDate || new Date().toISOString().split('T')[0];

    events.push({
      id: `nlp-${Date.now()}-${eventCounter++}`,
      type: eventType,
      title: `${speculative ? '⚠️ ' : ''}${ent.text.trim()}`,
      date: eventDate,
      end_date: null,
      provider: null,
      location: null,
      description: context.slice(0, 300),
      status: 'active',
      severity: null,
      tags,
      confidence,
      sources: ['ner'],
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

  // --- §3.C SENTENCE-LEVEL FINDINGS SCAN ---
  // d4data is unreliable on radiology prose, so relying on it to TAG
  // "congenital nonunion of the posterior arch of C1" is how that finding stayed
  // buried. This pass reads the FINDINGS section sentence-by-sentence and
  // surfaces any AFFIRMED finding carrying a dismissal word (congenital / stable
  // / variant / incidental) whose content does NOT appear in the impression —
  // regardless of whether NER tagged it. Gated on a dismissal word + not-in-
  // impression so it stays low-noise (it isn't trying to surface every sentence).
  if (findingsSection) {
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
