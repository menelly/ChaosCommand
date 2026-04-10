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

// Map d4data entity labels to our event types
const LABEL_TO_EVENT_TYPE: Record<string, string> = {
  'Disease_disorder': 'diagnosis',
  'Sign_symptom': 'diagnosis',
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
]);

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

    // Configure Transformers.js to look for models in our bundled public/ directory.
    // The model files are in public/models/ner/ which Tauri serves at /models/ner/.
    // By setting localModelPath, Transformers.js will check there first before HuggingFace.
    const { env: tfEnv } = await getTransformers();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    tfEnv.localModelPath = `${origin}/models/`;
    tfEnv.allowLocalModels = true;
    tfEnv.allowRemoteModels = true;  // Fallback to HuggingFace if local fails

    console.log(`📦 Model search paths: local=${tfEnv.localModelPath}, remote=HuggingFace`);

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

const SECTION_PATTERNS: Record<string, RegExp> = {
  indication: /(?:^|\n|\.)\s*(?:INDICATION|Clinical\s+(?:History|Indication)|Reason\s+for\s+(?:Exam|Study))\s*[:\-]?\s*/gi,
  technique: /(?:^|\n|\.)\s*(?:TECHNIQUE|Protocol|Procedure\s+Description)\s*[:\-]?\s*/gi,
  comparison: /(?:^|\n|\.)\s*(?:COMPARISON|Prior\s+(?:Studies?|Exams?))\s*[:\-]?\s*/gi,
  findings: /(?:^|\n|\.)\s*(?:FINDINGS?|Observations?|Description|Body\s+of\s+Report)\s*[:\-]?\s*/gi,
  impression: /(?:^|\n|\.)\s*(?:IMPRESSION|CONCLUSION|ASSESSMENT|INTERPRETATION|SUMMARY|DIAGNOS[EI]S)\s*[:\-]?\s*/gi,
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
  const docDatePatterns = [
    /(?:Date\/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4}(?:\s*@\s*\d{4})?)/i,
    /(?:Date\/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:Date\/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(?:Date\/?Time\s+(?:Exam\s+)?Perform\w*|Date\s+of\s+(?:Exam|Study|Procedure|Service|Report))\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})/i,
  ];

  for (const pattern of docDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].split('@')[0].trim();
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
  const pattern = /(?:^|\s|\.)\s*(\d+)\s*[.)]\s*(.+?)(?=\s*\d+\s*[.)]\s*[A-Z]|$)/gm;
  let match;
  while ((match = pattern.exec(impressionText)) !== null) {
    const text = match[2].replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    if (text.length >= 5) {
      items.push({ number: match[1], text });
    }
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
    if (key.length < 3 || nameExclusions.has(key) || seenKeys.has(key)) continue;

    if (isNegated(chunk, ent.start, ent.end)) {
      console.log(`🚫 NEGATED: '${ent.text}' — skipping`);
      continue;
    }

    const section = getSectionAt(sections, ent.start);
    const weight = SECTION_WEIGHTS[section] ?? 0.5;

    if (section === 'technique') continue;

    const speculative = isSpeculative(chunk, ent.start, ent.end);
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

    const suggestions: string[] = [];
    if (!nearestDate && !docDate) suggestions.push('Verify date', 'Add provider information');
    if (speculative) suggestions.push('Described as possible/suspected — confirm with provider');

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
      needs_review: (!nearestDate && !docDate) || speculative,
      suggestions,
      raw_text: context,
      dosage: null,
      incidental_findings: [],
    });
  }

  // --- IMPRESSION DIRECT PARSING ---
  if (impressionSection) {
    const items = parseImpressionItems(impressionSection.text);
    console.log(`📋 ${items.length} numbered impression items found`);

    for (const item of items) {
      const itemLower = item.text.toLowerCase();
      const alreadyCaptured = Array.from(seenKeys).some(
        k => k.length >= 5 && itemLower.includes(k)
      );
      if (alreadyCaptured) continue;

      const titleMatch = item.text.match(
        /^(.+?)(?:\.\s|(?:in|of|with)\s+(?:the\s+)?(?:right|left|bilateral))/i
      );
      let title = titleMatch ? titleMatch[1].trim() : item.text.split('.')[0].trim();
      if (title.length > 80) title = title.slice(0, 77) + '...';

      const key = title.toLowerCase().trim();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const speculative = isSpeculative(item.text, 0, item.text.length);
      const nearestDate = findNearestDate(item.text, datesFound, excludedDates);

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
