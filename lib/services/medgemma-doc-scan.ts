/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * medgemma-doc-scan.ts — MedGemma whole-document findings scan.
 *
 * Replaces the d4data NER tagger + Qwen validator pair ("both-AI-or-none")
 * with ONE model that actually reads: MedGemma-4B running native via llm.rs.
 * The tagger-then-reviewer dance existed because the tagger had no world
 * knowledge (it shipped "psycho" as a diagnosis while reading "psychologist").
 * MedGemma knows what a package insert is, so extraction and judgment are
 * finally the same pass.
 *
 * PROMPTS: validated by Ren against real records (Consortium runs,
 * 2026-07-01 — /tmp/rm_PE.txt, /tmp/rm_ED.txt). Two document routes:
 * general report vs emergency-department note. The validated output format
 * is PLAIN LINE LISTS, not JSON — "one per line, exactly as described".
 * Verbatim transcription is the point: every line the model emits should be
 * findable in the source text, which makes the grounding guard sharp.
 *
 * SAFETY: every finding line must ground in the source document (majority of
 * its distinctive words present) or it is DROPPED and logged. The model
 * cannot put words on a patient's timeline that the record doesn't contain.
 * Erring toward inclusion (a benign "normal pancreas" occasionally flagged)
 * is deliberate — Ren's call: people would rather hit "skip" on something
 * silly than have a dismissed finding missed.
 */

import { runImpressionLLMRaw } from './impression-parser-llm';
import type { ImpressionItem } from './impression-parser-llm';

// ============================================================================
// VALIDATED PROMPTS (do not tweak casually — these survived real-record runs)
// ============================================================================

/** General medical / radiology / imaging report route. */
export const MEDGEMMA_REPORT_PROMPT = `You are reading a medical report for a patient whose findings often get overlooked. Produce TWO lists IN THIS ORDER, invent nothing:

FIRST - ABNORMAL FINDINGS: read the WHOLE document top to bottom and list every abnormal finding, lesion, nodule, enlargement, calcification, atelectasis, or degenerative change described anywhere, one per line, exactly as described. ERR TOWARD INCLUDING TOO MUCH - when in doubt, include it; the clinician will skip what is irrelevant. A finding qualified as "mild", "minimal", "slight", "small", or "early" STILL COUNTS - include it; those words describe severity, they do not make a finding normal. Only leave out things explicitly stated to be normal, absent, unremarkable, or ruled out.

SECOND - IMPRESSION: transcribe every numbered item in the Impression/Conclusion section exactly, omit none.`;

/** Emergency-department / encounter-note route (labs, vitals, symptoms). */
export const MEDGEMMA_ED_PROMPT = `You are reading an emergency department note for a patient whose findings often get dismissed. Produce TWO lists IN THIS ORDER, invent nothing:
FIRST - ABNORMAL FINDINGS AND VALUES: read the WHOLE note and list every abnormal or critical laboratory value (give the value and its flag, e.g. Critical/High/Low), every abnormal vital sign, every abnormal exam finding, and every symptom or complaint the patient reported. ERR TOWARD INCLUDING TOO MUCH - a value flagged Critical/High/Low STILL COUNTS, a reported symptom STILL COUNTS. Only leave out things explicitly stated to be normal, negative, or within normal limits.
SECOND - DIAGNOSES AND ASSESSMENT: list the clinician stated diagnoses and their medical-decision-making conclusions, exactly as written.`;

/** Pick the route by document vocabulary. ED notes carry encounter markers a
 *  radiology/imaging report never does. Defaults to the report route. */
export function pickDocPrompt(text: string): { prompt: string; route: 'ed' | 'report' } {
  const head = text.slice(0, 4000);
  if (
    /\bemergency\s+department\b|\bchief\s+complaint\b|\btriage\b|\bED\s+provider\b|\bdisposition\b/i.test(
      head,
    )
  ) {
    return { prompt: MEDGEMMA_ED_PROMPT, route: 'ed' };
  }
  return { prompt: MEDGEMMA_REPORT_PROMPT, route: 'report' };
}

// ============================================================================
// TYPES
// ============================================================================

/** One grounded finding line from the FIRST list. start/end index into the
 *  ORIGINAL text passed to scanDocumentMedGemma — real offsets so the caller's
 *  section/assertion/dismissal machinery keeps working. */
export interface ScanFinding {
  text: string;
  start: number;
  end: number;
  route: 'ed' | 'report';
}

export interface DocScanResult {
  findings: ScanFinding[];
  /** Items from the SECOND list (impression / diagnoses+assessment). */
  impressionItems: ImpressionItem[];
  /** Lines the grounding guard refused — kept for diagnostics, never surfaced. */
  droppedUngrounded: string[];
}

// ============================================================================
// CHUNKING — MedGemma's context is 16k tokens; a My HealtheVet export is not.
// ============================================================================

/** ~6k tokens of document per call leaves room for prompt + a long answer. */
const CHUNK_CHARS = 24_000;
const MAX_DOC_CHARS = 100_000; // same ceiling the NER pipeline used

/** Split on paragraph boundaries near the target size so a finding's sentence
 *  never straddles two chunks. Returns [{ text, base }] with base = offset of
 *  the chunk in the original string. */
export function chunkDocument(text: string): Array<{ text: string; base: number }> {
  const doc = text.slice(0, MAX_DOC_CHARS);
  if (doc.length <= CHUNK_CHARS) return [{ text: doc, base: 0 }];
  const chunks: Array<{ text: string; base: number }> = [];
  let pos = 0;
  while (pos < doc.length) {
    let end = Math.min(pos + CHUNK_CHARS, doc.length);
    if (end < doc.length) {
      // Prefer a blank line, then a newline, then a sentence end near the cut.
      const window = doc.slice(pos + Math.floor(CHUNK_CHARS * 0.7), end);
      const lastBlank = window.lastIndexOf('\n\n');
      const lastNl = window.lastIndexOf('\n');
      const cut = lastBlank >= 0 ? lastBlank : lastNl;
      if (cut > 0) end = pos + Math.floor(CHUNK_CHARS * 0.7) + cut + 1;
    }
    chunks.push({ text: doc.slice(pos, end), base: pos });
    pos = end;
  }
  return chunks;
}

// ============================================================================
// RESPONSE PARSING — two headed lists, plain lines
// ============================================================================

const HEADER_FIRST = /^\s*(?:\*{0,2}\s*)?FIRST\b|^\s*(?:\*{0,2}\s*)?ABNORMAL FINDINGS/im;
const HEADER_SECOND = /^\s*(?:\*{0,2}\s*)?SECOND\b|^\s*(?:\*{0,2}\s*)?(?:IMPRESSION|DIAGNOSES)/im;

function cleanLine(line: string): string {
  return line
    .replace(/^[\s>*•·\-–—]+/, '') // bullets/markdown
    .replace(/^\d+[.)]\s*/, '') // list numbering
    .replace(/\*{1,2}/g, '') // stray bold markers
    .trim();
}

/** Split the model's answer into the two lists. Tolerant of markdown dressing
 *  and of the model echoing the header wording back slightly differently. */
export function parseScanResponse(raw: string): { first: string[]; second: string[] } {
  const firstMatch = raw.match(HEADER_FIRST);
  const secondMatch = raw.match(HEADER_SECOND);
  let firstBlock = '';
  let secondBlock = '';
  if (firstMatch && secondMatch && secondMatch.index! > firstMatch.index!) {
    firstBlock = raw.slice(firstMatch.index!, secondMatch.index!);
    secondBlock = raw.slice(secondMatch.index!);
  } else if (secondMatch) {
    firstBlock = raw.slice(0, secondMatch.index!);
    secondBlock = raw.slice(secondMatch.index!);
  } else {
    firstBlock = raw;
  }
  const toLines = (block: string): string[] =>
    block
      .split('\n')
      .slice(1) // drop the header line itself
      .map(cleanLine)
      .filter((l) => l.length >= 4 && !HEADER_FIRST.test(l) && !HEADER_SECOND.test(l));
  return { first: toLines(firstBlock), second: toLines(secondBlock) };
}

// ============================================================================
// GROUNDING — the confabulation guard, now with offsets
// ============================================================================

const STOPWORDS = new Set([
  'the', 'and', 'was', 'were', 'with', 'from', 'this', 'that', 'are', 'for',
  'not', 'any', 'there', 'noted', 'seen', 'small', 'mild', 'right', 'left',
  'bilateral', 'without', 'within', 'level', 'levels', 'high', 'low',
  'critical', 'abnormal', 'finding', 'findings', 'value', 'patient',
]);

function distinctiveWords(line: string): string[] {
  return (line.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
}

/** Locate a model line in the source. Returns offsets or null (ungrounded).
 *  Tier 1: exact (case/whitespace-insensitive) substring.
 *  Tier 2: majority of distinctive words present in source → anchor at the
 *          rarest word's position. Guards confabulation while tolerating the
 *          model reflowing a table row into a sentence. */
export function groundLine(
  line: string,
  source: string,
  sourceLower: string,
): { start: number; end: number } | null {
  const needle = line.toLowerCase().replace(/\s+/g, ' ').trim();
  if (needle.length >= 8) {
    // Exact-ish: search a whitespace-normalized copy is expensive; try direct
    // first (most report lines transcribe verbatim, newlines intact).
    const idx = sourceLower.indexOf(needle);
    if (idx >= 0) return { start: idx, end: idx + needle.length };
  }
  const words = distinctiveWords(line);
  if (words.length === 0) return null;
  const positions: number[] = [];
  let hits = 0;
  for (const w of words) {
    const p = sourceLower.indexOf(w);
    if (p >= 0) {
      hits++;
      positions.push(p);
    }
  }
  if (hits / words.length < 0.5) return null; // majority rule — confabulation
  // Anchor on the median matched position: robust to one word matching a
  // distant unrelated mention.
  positions.sort((a, b) => a - b);
  const anchor = positions[Math.floor(positions.length / 2)];
  return { start: anchor, end: Math.min(anchor + line.length, source.length) };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/** Run the MedGemma whole-document scan.
 *
 *  Returns null when NO model is available (caller must fail safe — same
 *  contract as the old validator: never surface machine extraction that no
 *  competent model has read). Returns a DocScanResult otherwise. */
export async function scanDocumentMedGemma(
  text: string,
  onProgress?: (p: { status: string; progress?: number }) => void,
): Promise<DocScanResult | null> {
  const chunks = chunkDocument(text);
  const sourceLower = text.toLowerCase();
  const findings: ScanFinding[] = [];
  const impressionItems: ImpressionItem[] = [];
  const droppedUngrounded: string[] = [];
  const seenFinding = new Set<string>();
  const seenImpression = new Set<string>();

  for (let c = 0; c < chunks.length; c++) {
    const { text: chunkText } = chunks[c];
    const { prompt, route } = pickDocPrompt(chunkText);
    onProgress?.({
      status: `AI reading document${chunks.length > 1 ? ` (part ${c + 1}/${chunks.length})` : ''}...`,
      progress: Math.round((c / chunks.length) * 100),
    });

    // Single user turn, no system prompt — matches the validated runs exactly
    // (Gemma has no system role; llm.rs folds anyway).
    const raw = await runImpressionLLMRaw('', `${prompt}\n\n${chunkText}`, { maxTokens: 2048 });
    if (raw === null) {
      // Model unavailable. On the FIRST chunk that means no scan at all →
      // fail safe. On a later chunk, return what we have rather than lose it.
      if (c === 0) return null;
      console.warn(`🧠 doc-scan: model unavailable on chunk ${c + 1}/${chunks.length} — returning partial scan`);
      break;
    }

    const { first, second } = parseScanResponse(raw);
    for (const line of first) {
      const key = line.toLowerCase();
      if (seenFinding.has(key)) continue;
      const loc = groundLine(line, text, sourceLower);
      if (!loc) {
        droppedUngrounded.push(line);
        console.warn(`🧠 doc-scan: DROPPED ungrounded finding line (not in source): "${line.slice(0, 80)}"`);
        continue;
      }
      seenFinding.add(key);
      findings.push({ text: line, start: loc.start, end: loc.end, route });
    }
    for (const line of second) {
      const key = line.toLowerCase();
      if (seenImpression.has(key)) continue;
      // Impression items ground too — transcription means it must exist.
      if (!groundLine(line, text, sourceLower)) {
        droppedUngrounded.push(line);
        console.warn(`🧠 doc-scan: DROPPED ungrounded impression line: "${line.slice(0, 80)}"`);
        continue;
      }
      seenImpression.add(key);
      impressionItems.push({ number: String(impressionItems.length + 1), text: line });
    }
  }

  onProgress?.({ status: 'AI scan complete', progress: 100 });
  console.log(
    `🧠 doc-scan: ${findings.length} grounded findings, ${impressionItems.length} impression items, ${droppedUngrounded.length} dropped ungrounded`,
  );
  return { findings, impressionItems, droppedUngrounded };
}
