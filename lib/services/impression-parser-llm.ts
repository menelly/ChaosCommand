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
  return `Parse this radiology IMPRESSION into a JSON list. Surface EVERY numbered item — never merge, never drop, ESPECIALLY synthesis/concern items even if they reference earlier items.

For each item emit ONE object:
- "finding": short noun-phrase title. For a synthesis item like "in the setting of X, Y, Z, lymphoma is a concern" the title is "Lymphoma concern" or "Possible lymphoproliferative disorder".
- "negated": true if the item is a negation (e.g. "no evidence of X"), else false.
- "dismissal_language": "none" | "stable" | "incidental" | "congenital" | "variant" | "reactive"
- "is_synthesis": true if this item ties together / references OTHER items (e.g. "in the setting of …"), else false.
- "is_historical": true if status-post / prior / resolved, else false.

Output a JSON array, one object per numbered item, in order.

IMPRESSION:
${impressionText}

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

/** Run the LLM impression extraction. Returns null on any failure
 *  (no runner, runner error, malformed JSON, empty array) — caller falls back
 *  to the regex parser. */
export async function extractImpressionItemsLLM(
  impressionText: string,
): Promise<ImpressionItem[] | null> {
  if (!_runner.isReady()) return null;
  let raw: string | null = null;
  try {
    raw = await _runner.run(
      IMPRESSION_SYSTEM_PROMPT,
      buildImpressionUserPrompt(impressionText),
      { maxTokens: 900 },
    );
  } catch (e) {
    console.warn('impression LLM threw, falling back to regex:', e);
    return null;
  }
  if (!raw) return null;
  const items = parseImpressionLLMResponse(raw);
  return items.length > 0 ? items : null;
}
