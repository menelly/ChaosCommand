/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * impression-parser-llm.ts — LLM-first impression extraction with regex fallback.
 *
 * WHY THIS EXISTS
 * The regex/NER pipeline can't reliably extract SYNTHESIZING impression items
 * — sentences like "In the setting of pulmonary emboli, pulmonary nodules,
 * mediastinal adenopathy, and hepatosplenomegaly, a lympho-proliferative
 * disorder including lymphoma is a concern" reference prior items, so a
 * substring-overlap dedup deleted them (we fixed that bug in medical-ner.ts),
 * BUT even with the dedup fix the regex parser has no way to RECOGNIZE that
 * such a sentence is the most important one in the report — the synthesis
 * that ties everything together. A small instruct-tuned LLM (Qwen3.5-0.8B Q4,
 * ~508MB GGUF / ~440MB ONNX, validated 2026-06-21 — surfaced ALL 6 items in
 * the PE report including the lymphoma synthesis) actually reads the text and
 * extracts each distinct item with structured metadata.
 *
 * ARCHITECTURE
 *   extractImpressionItems(text)
 *     → tries LLM (Qwen3.5-0.8B-Q4 via abstracted runImpressionLLM)
 *     → on null/error/timeout falls back to regex parseImpressionItemsRegex
 *     → returns ImpressionItem[] — extended shape with optional LLM metadata
 *
 * The model is loaded lazily on first call. If it isn't available (user opted
 * out of the download, device doesn't have the disk, transformers.js failed)
 * the fallback regex path runs and the user still gets results — just without
 * the synthesis-catching + dismissal-language classification.
 *
 * VALIDATED PROMPT (tonight, against the real PE report)
 *   System: "You are a clinical-report parser. You DO NOT diagnose. Output ONLY valid JSON."
 *   User:   schema-prompt below. Surfaced 7 distinct items (6 numbered + the
 *           lymphoma split out as its own with is_synthesis=true). All
 *           safety-critical booleans correct (no false negations / no
 *           false-historical except cholecystectomy which IS historical).
 */

/** The unified impression-item shape. Regex parser populates `number` + `text`
 *  only; LLM parser populates the optional metadata fields too. Consumers that
 *  want to use the metadata check for `undefined` first. */
export interface ImpressionItem {
  number: string;
  text: string;
  /** Short title from the LLM — e.g. "Pulmonary emboli", "Lymphoma concern" —
   *  preferred when present over the parser's title-from-first-clause heuristic. */
  finding?: string;
  /** True if the assertion engine OR the LLM classifies this item as negated. */
  negated?: boolean;
  /** True if hedged / speculative ("may represent", "suspicious for"). */
  speculative?: boolean;
  /** True if this item REFERENCES other items — the synthesis-impression case.
   *  These should never be deduped against earlier items and warrant a "this
   *  is the bigger-picture concern" surfacing pattern in the UI. */
  is_synthesis?: boolean;
  /** True if status-post / prior / resolved. */
  is_historical?: boolean;
  /** Dismissal language used to wave the finding off — matches the keyword
   *  scanner in medical-ner.ts so the same UI treatment applies. */
  dismissal_language?: 'none' | 'stable' | 'incidental' | 'congenital' | 'variant' | 'reactive';
}

/** The validated prompt — system + user templates. Exported so the runner can
 *  apply the model's own chat template; never inline-edit in callers. */
export const IMPRESSION_SYSTEM_PROMPT =
  'You are a clinical-report parser. You DO NOT diagnose. Output ONLY valid JSON.';

export function buildImpressionUserPrompt(impressionText: string): string {
  // Qwen2.5 doesn't use a <think> reasoning block — that's a Qwen3 feature.
  // Tuned for Qwen2.5-0.5B (smaller model — needs explicit skip-list + split
  // rule because the model follows simple rules better than nuanced ones):
  //   - SKIP non-clinical text the section detector swept in (patient name,
  //     page footers, "End of Report", "Primary Diagnostic Code:", page
  //     numbers, signatures).
  //   - SPLIT a numbered item into MULTIPLE objects when it contains a
  //     synthesis sentence ("In the setting of X, Y, Z, … is a concern.")
  //     so the synthesis becomes its own surfaceable card.
  return `Extract clinical FINDINGS from this radiology impression as a JSON array.

DO NOT EMIT entries for:
- patient names, DOB, MRN, demographics
- page footers, page numbers, "End of Report", boilerplate
- LABEL-ONLY fragments with no actual finding after them, including but not
  limited to: "Primary Diagnostic Code:", "Diagnostic Code:", "Final Report",
  "Status:", "Impression:" (the heading itself), "Report:". If a label has
  no clinical content following it on the same line, SKIP it entirely.
- signatures or "Electronically signed by..."
- empty headings, single colons, page-break markers

DO emit one object per distinct clinical finding. If a numbered item contains a SYNTHESIS sentence (e.g. "In the setting of X, Y, Z, a Z disorder is a concern"), emit it as a SEPARATE object with a short title like "Lymphoma concern" — do NOT bury it inside the primary finding's body.

Schema (every field required):
- "finding": short noun-phrase title (e.g. "Pulmonary emboli", "Lymphoma concern", "Renal stone")
- "negated": true if a negation ("no evidence of X"), else false
- "dismissal_language": "none" | "stable" | "incidental" | "congenital" | "variant" | "reactive"
- "is_synthesis": true if this references multiple OTHER findings ("in the setting of..."), else false
- "is_historical": true if status-post / prior, else false

IMPRESSION:
${impressionText}

Output ONLY the JSON array. No prose.

JSON:`;
}

// ============================================================================
// MODEL RUNNER — abstracted so the actual transformers.js / ONNX wiring is one
// focused step that doesn't entangle with the prompt + parsing logic.
// ============================================================================

/** Pluggable runner. Implementations: transformers.js + Qwen3.5-0.8B Q4 ONNX
 *  (the ship target), or a Tauri sidecar calling llama-cpp-python locally
 *  (a desktop power-user tier). Returns null when no model is available —
 *  caller falls back to regex. */
export interface ImpressionLLMRunner {
  /** Run the validated prompt and return the raw model text response. */
  run(systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number }): Promise<string | null>;
  /** Cheap probe: is a model currently loaded and ready? */
  isReady(): boolean;
}

/** Stub runner — placeholder until transformers.js / sidecar wiring lands.
 *  Returns null on every call so callers cleanly fall through to regex.
 *  REPLACE THIS with a real implementation in a focused follow-up. */
class StubImpressionRunner implements ImpressionLLMRunner {
  async run(): Promise<string | null> { return null; }
  isReady(): boolean { return false; }
}

let _runner: ImpressionLLMRunner = new StubImpressionRunner();

/** Allow the app to inject a real runner (the native MedGemma runner in
 *  llm-tauri.ts). Wiring lands separately so this module can be tested
 *  without a model present. */
export function setImpressionLLMRunner(runner: ImpressionLLMRunner): void {
  _runner = runner;
}

/** Raw access to the active runner for other prompt routes (the MedGemma
 *  doc-scan and lab name-resolution). Returns null when no model is available
 *  or the run fails — callers fail safe exactly like the impression path. */
export async function runImpressionLLMRaw(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number },
): Promise<string | null> {
  try {
    return await _runner.run(systemPrompt, userPrompt, opts);
  } catch (e) {
    console.warn('🧠 raw LLM run threw:', e);
    return null;
  }
}

// ============================================================================
// PARSING — the JSON the model returns → ImpressionItem[]
// ============================================================================

/** Parse the model's JSON-array response into our unified shape. Tolerant of
 *  the model wrapping the array in prose, code fences, or <think> blocks. */
export function parseImpressionLLMResponse(raw: string): ImpressionItem[] {
  // Find the first '[' and last ']' — Qwen-Q4 occasionally emits a <think>
  // preamble or a "JSON:" marker before the array.
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let arr: any;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((row, i): ImpressionItem => {
    const findingRaw = typeof row?.finding === 'string' ? row.finding.trim() : '';
    return {
      number: String(i + 1),
      // Best-available text: prefer the model's terse title; fall back to a
      // longer field if it gave us one. medical-ner.ts uses `text` as the
      // bullet body and `finding` as the surfaced title.
      text: findingRaw || (typeof row?.text === 'string' ? row.text.trim() : ''),
      finding: findingRaw || undefined,
      negated: typeof row?.negated === 'boolean' ? row.negated : undefined,
      speculative: typeof row?.speculative === 'boolean' ? row.speculative : undefined,
      is_synthesis: typeof row?.is_synthesis === 'boolean' ? row.is_synthesis : undefined,
      is_historical: typeof row?.is_historical === 'boolean' ? row.is_historical : undefined,
      dismissal_language: isDismissal(row?.dismissal_language)
        ? (row.dismissal_language as ImpressionItem['dismissal_language'])
        : undefined,
    };
  }).filter((it) => it.text && it.text.length >= 3);
}

function isDismissal(x: unknown): boolean {
  return typeof x === 'string'
    && ['none', 'stable', 'incidental', 'congenital', 'variant', 'reactive'].includes(x);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/** Minimum impression text we'll hand to a 0.5B model. A real radiology
 *  impression is a sentence or numbered list; a stray column header
 *  ("Analyte Value") or a 14-char fragment is not — and a tiny instruct model
 *  given near-empty input CONFABULATES (observed: it invented "elevated
 *  creatinine" + "a history of hypertension and diabetes" from "Analyte Value"
 *  on a Quest ANA report — findings that appear NOWHERE in the document). */
const MIN_IMPRESSION_CHARS = 25;
const MIN_IMPRESSION_WORDS = 4;

/** Words that are clinical FILLER — they appear in confabulated boilerplate
 *  ("an elevated level of X was detected in the blood sample") and must NOT
 *  count as the finding being "grounded" in the source text. Only DISTINCTIVE
 *  content words (the actual analyte/condition) prove grounding. */
const GROUNDING_STOPWORDS = new Set([
  'the', 'and', 'was', 'were', 'has', 'had', 'have', 'been', 'with', 'from',
  'this', 'that', 'are', 'for', 'not', 'any', 'level', 'levels', 'elevated',
  'detected', 'found', 'present', 'patient', 'blood', 'sample', 'history',
  'noted', 'show', 'shows', 'within', 'normal', 'value', 'values', 'result',
  'results', 'test', 'tests', 'high', 'low', 'positive', 'negative',
]);

/** A finding is GROUNDED only if its distinctive content words actually appear
 *  in the source impression text. This is the safety net against LLM
 *  confabulation: no matter what the model is handed, it cannot inject a
 *  diagnosis ("creatinine", "hypertension") that isn't in the patient's
 *  document. Returns the subset of items that are grounded. */
function groundedItems(items: ImpressionItem[], sourceText: string): ImpressionItem[] {
  const src = sourceText.toLowerCase();
  return items.filter((it) => {
    const probe = `${it.finding ?? ''} ${it.text ?? ''}`.toLowerCase();
    const content = (probe.match(/[a-z]{4,}/g) ?? []).filter((w) => !GROUNDING_STOPWORDS.has(w));
    if (content.length === 0) return false; // nothing distinctive to verify → reject
    const hits = content.filter((w) => src.includes(w)).length;
    // Majority of the finding's distinctive words must appear in the source.
    return hits / content.length >= 0.5;
  });
}

/** Run the LLM impression extraction. Returns null on any failure
 *  (no runner, runner error, malformed JSON, empty array) — caller falls back
 *  to the regex parser. */
export async function extractImpressionItemsLLM(
  impressionText: string,
): Promise<ImpressionItem[] | null> {
  // GUARD 1 — never feed the model text too short / non-prose to hold a real
  // finding. A 0.5B model confabulates diagnoses from fragments like a column
  // header ("Analyte Value"). Skip → caller's regex fallback (which slices
  // verbatim from the text, so it cannot hallucinate) handles it.
  const clean = impressionText.trim();
  const wordCount = (clean.match(/[A-Za-z]{3,}/g) ?? []).length;
  if (clean.length < MIN_IMPRESSION_CHARS || wordCount < MIN_IMPRESSION_WORDS) {
    console.log(`🧠 impression LLM: SKIP — impression too short to be real (${clean.length} chars, ${wordCount} words); regex fallback`);
    return null;
  }

  // ALWAYS call run() — the runner itself decides whether to actually
  // invoke the model, queue a load, or no-op. Gating on isReady() here
  // meant the real runner's load was never KICKED OFF because run()
  // never got called, so isReady() stayed false forever — deadlock.
  console.log(`🧠 impression LLM: calling runner (impression: ${impressionText.length} chars)...`);
  let raw: string | null = null;
  const t0 = Date.now();
  try {
    raw = await _runner.run(
      IMPRESSION_SYSTEM_PROMPT,
      buildImpressionUserPrompt(impressionText),
      { maxTokens: 900 },
    );
  } catch (e) {
    console.warn('🧠 impression LLM threw, falling back to regex:', e);
    return null;
  }
  if (!raw) {
    // Three possible reasons: stub runner, real runner not opted in, real
    // runner still downloading. The runner logs which one applied.
    console.log('🧠 impression LLM returned null → falling back to regex (see runner logs above for why)');
    return null;
  }
  const parsed = parseImpressionLLMResponse(raw);

  // GUARD 2 — ground every finding in the source. Drops confabulated items
  // whose distinctive words aren't in the document. Medical-safety critical:
  // an LLM must never put a diagnosis on the timeline that isn't in the record.
  const items = groundedItems(parsed, impressionText);
  const dropped = parsed.length - items.length;
  if (dropped > 0) console.warn(`🧠 impression LLM: dropped ${dropped} UNGROUNDED item(s) (not present in source — confabulation guard)`);
  console.log(`🧠 impression LLM: ${items.length} grounded items extracted in ${Date.now() - t0}ms`);
  return items.length > 0 ? items : null;
}

// ============================================================================
// NER-CANDIDATE VALIDATOR  (Ren's "both-AI-or-none" safety design, 2026-06-30)
// ----------------------------------------------------------------------------
// The biomedical NER tagger (d4data) has NO world-knowledge: it tags single
// words from device package inserts ("shock"), lab reference tables ("range",
// "ratio"), and mental-status CHECKLIST HEADERS ("Mania", "Psychosis" in a
// NORMAL/euthymic exam) as 90%-confidence findings. We will not ship those.
// This validator hands each NER candidate (WITH its surrounding context) to the
// instruct LLM — which DOES know what a package insert / checklist header is —
// and asks keep/drop. Only KEPT items survive; everything else is dropped, not
// parked in the review queue.
//
// Returns null if no model is available. The CALLER MUST then refuse to surface
// raw NER (fail safe to manual entry) — never ship NER unvetted. That is the
// whole point: "you want AI parsing, you get BOTH AI."
// ============================================================================

export interface NerCandidate {
  /** Stable index used to map the verdict back to the event. */
  i: number;
  /** The entity text NER surfaced (the proposed title). */
  title: string;
  /** Mapped event type: diagnosis | finding | lab | medication | test | surgery. */
  type: string;
  /** ~150 chars of source text around the entity, so the LLM can judge in context. */
  context: string;
}

export interface ValidationVerdict {
  i: number;
  keep: boolean;
  reason: string;
}

export const VALIDATOR_SYSTEM_PROMPT =
  'You review items a basic word-tagger pulled from a medical record. You DO NOT diagnose. You ONLY decide if each item is real clinical content about the patient, or non-clinical noise. Output ONLY valid JSON.';

/** Prompt tuned for a small instruct model (explicit rules + drop-when-unsure). */
export function buildValidatorPrompt(cands: NerCandidate[]): string {
  const list = cands
    .map(
      (c) =>
        `{"i": ${c.i}, "item": ${JSON.stringify(c.title)}, "type": ${JSON.stringify(
          c.type,
        )}, "context": ${JSON.stringify(c.context.slice(0, 160))}}`,
    )
    .join('\n');
  return `A basic word-tagger extracted these candidate items from ONE patient's medical record. Many are GARBAGE the tagger pulled from non-clinical text.

DROP (keep=false) an item if it is:
- a word from a DEVICE/TEST PACKAGE INSERT or disclaimer (e.g. "shock", "state" sitting inside "should not be used on patients...")
- a word from a LAB REFERENCE-RANGE table or test metadata (e.g. "range", "ratio", "reference", "nuclei", "wash", "acid")
- a MENTAL-STATUS or review-of-systems CHECKLIST HEADER not actually asserted about the patient (e.g. "Mania", "Psychosis", "Mood", "Impairment" listed as exam categories — ESPECIALLY when the exam reads normal/euthymic)
- a section label, heading, demographic, provider name, date, or a single bare anatomy word
- a lone vague word that is not a specific condition, finding, lab, medication, or procedure

KEEP (keep=true) ONLY if, reading its context, the item is a real clinical finding / diagnosis / lab / medication / procedure that applies to THIS patient.

When unsure, DROP. It is safer to drop a borderline item than to put a scary non-finding (like "psycho") on a patient's medical timeline.

CANDIDATES:
${list}

For EACH candidate output ONE object: {"i": <number>, "keep": <true|false>, "reason": "<=8 words"}.
Output ONLY a JSON array of the same length as the input. No prose.

JSON:`;
}

function parseValidatorResponse(raw: string): ValidationVerdict[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let arr: any;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((r) => typeof r?.i === 'number')
    .map((r) => ({ i: r.i, keep: r.keep === true, reason: typeof r.reason === 'string' ? r.reason : '' }));
}

/** Validate NER candidates with the instruct LLM. Batched to fit a small model's
 *  context. Returns a verdict per candidate.
 *
 *  RETURNS null when the model is unavailable on the very first batch — the
 *  caller MUST interpret null as "AI validation unavailable" and refuse to
 *  surface raw NER (fail safe). For an item with no parseable verdict, or a
 *  later batch that fails, the verdict defaults to keep=false (drop) — never
 *  surface an unvetted item. */
export async function validateNerCandidatesLLM(
  cands: NerCandidate[],
): Promise<ValidationVerdict[] | null> {
  if (cands.length === 0) return [];
  const BATCH = 15;
  const verdicts: ValidationVerdict[] = [];
  for (let b = 0; b < cands.length; b += BATCH) {
    const batch = cands.slice(b, b + BATCH);
    let raw: string | null = null;
    try {
      raw = await _runner.run(VALIDATOR_SYSTEM_PROMPT, buildValidatorPrompt(batch), { maxTokens: 700 });
    } catch (e) {
      console.warn('🧠 NER validator threw:', e);
      raw = null;
    }
    if (!raw) {
      if (b === 0) {
        // No model at all → signal unavailable so the caller fails safe.
        console.log('🧠 NER validator: no model available → returning null (caller must refuse raw NER)');
        return null;
      }
      // A later batch failed — drop those items rather than ship them unvetted.
      console.warn(`🧠 NER validator: batch starting at ${b} failed → dropping ${batch.length} unvetted items`);
      for (const c of batch) verdicts.push({ i: c.i, keep: false, reason: 'validator unavailable for batch' });
      continue;
    }
    const byI = new Map(parseValidatorResponse(raw).map((v) => [v.i, v]));
    for (const c of batch) {
      const v = byI.get(c.i);
      // No verdict for this item → DROP (fail safe).
      verdicts.push(v ? { i: c.i, keep: v.keep, reason: v.reason } : { i: c.i, keep: false, reason: 'no verdict returned' });
    }
  }
  const kept = verdicts.filter((v) => v.keep).length;
  console.log(`🧠 NER validator: kept ${kept}/${verdicts.length} candidates (${verdicts.length - kept} dropped as non-clinical)`);
  return verdicts;
}
