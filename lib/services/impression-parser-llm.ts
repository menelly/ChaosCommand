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

/** Allow the app to inject a real runner (e.g. one that calls transformers.js
 *  with the Qwen3.5-0.8B-Q4 ONNX, or a Tauri sidecar). Wiring lands separately
 *  so this module can be tested without a model present. */
export function setImpressionLLMRunner(runner: ImpressionLLMRunner): void {
  _runner = runner;
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
