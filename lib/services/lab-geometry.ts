/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-geometry.ts — geometry-aware lab table extractor (CHA-367).
 *
 * The old text parsers flattened pdf.js output to a string, discarding each
 * token's x-position, then tried to rebuild columns with regex. They couldn't —
 * real-corpus recall was ≈0. This reads columns FROM the geometry instead:
 * cluster tokens into rows by y, detect the header row, set column anchors from
 * the header labels, assign each token to the nearest column by x. One engine,
 * self-calibrating per table, so it generalizes across grid portals rather than
 * hardcoding each one. Units are read RAW (the tokens arrive pre-`cleanExtractedText`,
 * so `x10E3/uL` etc. are intact).
 *
 * Scope: GRID formats (LabCorp, CareSpace/Epic). Inline-prose formats (Quest:
 * "Name value [L/H] Reference Range: <ref> unit") are intentionally left to the
 * text-parser fallback in lab-parser.ts — geometry can't help when there are no
 * columns. Proven in scripts/proto-geometry.mjs against the real corpus.
 */

import type { LabResult } from './lab-parser';
import type { PdfToken } from './text-extractor';

// --- role keywords (CONTAINS match, PRIORITY order: first hit wins per token) ---
// pdf.js returns each header CELL as one combined token ("Current Result and
// Flag"), so we match substrings. 'ignore' (previous) is checked before 'value'
// so "Previous Result and Date" doesn't register as a value column.
const ROLE: Array<[RegExp, ColRole]> = [
  [/previous/i, 'ignore'],
  [/\btest\b|analyte|component|^lab\b|^name\b/i, 'name'],
  [/current|your|^value|^result/i, 'value'],
  [/^units?\b/i, 'unit'],
  [/reference|normal|range|interval/i, 'range'],
];

type ColRole = 'name' | 'value' | 'unit' | 'range' | 'ignore';

const VAL = /^[<>]?=?\s*\d+(?:\.\d+)?$/;
const RANGE =
  /^(?:[<>]=?\s*(?:or\s*=\s*)?\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?|not\s+estab\.?|not\s+applicable|>\s*or\s*=\s*\d+)/i;
const FLAG = /^(High|Low|Abnormal|HH|LL|H|L|A)$/i;
// LabCorp prints a specimen-indicator code (01/02) in its own narrow column
// between name and value; it is NOT a lab value. Drop it everywhere.
const SPEC = /^0\d$/;

const Y_ROW_TOLERANCE = 3; // tokens within 3pt of y are the same table row

interface Anchor {
  x: number;
  role: ColRole;
}

/** Cluster a page's tokens into rows (top-to-bottom), each row left-to-right. */
function rowsFromPage(tokens: PdfToken[]): PdfToken[][] {
  const toks = tokens.filter((t) => t.str.trim());
  toks.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfToken[][] = [];
  let cur: PdfToken[] = [];
  let lastY: number | null = null;
  for (const tk of toks) {
    if (lastY !== null && Math.abs(tk.y - lastY) > Y_ROW_TOLERANCE) {
      rows.push(cur);
      cur = [];
    }
    cur.push(tk);
    lastY = tk.y;
  }
  if (cur.length) rows.push(cur);
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

/** A header row defines the column anchors. Needs a name-ish column plus a
 *  value-ish or range-ish column, else it's not a header. */
function detectHeader(row: PdfToken[]): Anchor[] | null {
  const anchors: Anchor[] = [];
  const seen = new Set<ColRole>();
  for (const tk of row) {
    for (const [re, role] of ROLE) {
      if (re.test(tk.str)) {
        if (!seen.has(role)) {
          anchors.push({ x: tk.x, role });
          seen.add(role);
        }
        break;
      }
    }
  }
  const roles = new Set(anchors.map((a) => a.role));
  if (roles.has('name') && (roles.has('value') || roles.has('range'))) return anchors;
  return null;
}

function nearestRole(anchors: Anchor[], x: number): ColRole {
  let best = anchors[0];
  let bd = Infinity;
  for (const a of anchors) {
    const d = Math.abs(a.x - x);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  return best.role;
}

/** Parse reference bounds from a range string. Shapes seen across portals:
 *    "4-10"  → [4, 10]    "<4" → [null, 4]    ">10" / ">or=60" → [10/60, null]
 *  Mirrors lab-parser.ts so confidence/abnormal logic stays consistent. */
function parseRefBounds(range: string): { low: number | null; high: number | null } {
  const r = range.trim();
  const bounded = r.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (bounded) return { low: parseFloat(bounded[1]), high: parseFloat(bounded[2]) };
  const upper = r.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (upper) return { low: null, high: parseFloat(upper[1]) };
  const lower = r.match(/>\s*(?:or\s*=\s*)?(\d+(?:\.\d+)?)/i);
  if (lower) return { low: parseFloat(lower[1]), high: null };
  return { low: null, high: null };
}

/** Pull a per-result collection date out of a name cell. CareSpace prints
 *  "Date/Time MM/DD/YYYY HH:MM AM/PM" as a leftmost field that buckets into the
 *  name column. A date is a STRUCTURED field (one universal shape on every report
 *  — NOT a semantic judgment like "is this word a place"), so we parse it
 *  directly: this both CAPTURES the real collection date and removes the field
 *  from the name. (Semantic pollution — provider/location — is left to the NER
 *  model; this only touches the date.) Returns the ISO date + the de-dated name. */
function extractDateFromName(name: string): { date: string | null; name: string } {
  const m = name.match(
    /Date\/?Time\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?/i,
  );
  if (!m) return { date: null, name };
  const mm = m[1].padStart(2, '0');
  const dd = m[2].padStart(2, '0');
  let yyyy = m[3];
  if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
  const cleaned = name.replace(m[0], '').replace(/\s{2,}/g, ' ').trim();
  return { date: `${yyyy}-${mm}-${dd}`, name: cleaned };
}

function normalizeFlag(raw: string): string {
  const f = raw.toUpperCase();
  if (['LL'].includes(f)) return 'LL';
  if (['LOW', 'L'].includes(f)) return 'L';
  if (['HH'].includes(f)) return 'HH';
  if (['HIGH', 'HI', 'H'].includes(f)) return 'H';
  if (['ABNORMAL', 'ABN', 'A'].includes(f)) return 'ABNORMAL';
  return '';
}

/** Extract lab rows from one page's positioned tokens. */
function parsePageGeometry(
  pageRows: PdfToken[][],
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const out: LabResult[] = [];
  let anchors: Anchor[] | null = null;

  for (const row of pageRows) {
    const h = detectHeader(row);
    if (h) {
      anchors = h;
      continue;
    }
    if (!anchors) continue;

    const buckets: Record<ColRole, string[]> = {
      name: [],
      value: [],
      unit: [],
      range: [],
      ignore: [],
    };
    for (const tk of row) {
      if (SPEC.test(tk.str)) continue;
      buckets[nearestRole(anchors, tk.x)].push(tk.str);
    }

    // Raw name straight from the columns. Geometry's job is COLUMNS, not name
    // cleaning — a metadata-polluted cell ("Ordered By … DO BUN") is honest
    // geometry output. Resolving the SEMANTIC analyte out of that noise is the
    // NER model's job (see resolveLabNamesWithNer). The one thing we parse here
    // is the STRUCTURED date field (universal shape, and it's the real collection
    // date) — pulling it out also de-pollutes the name.
    const { date: rowDate, name: deDated } = extractDateFromName(buckets.name.join(' ').trim());
    const testName = deDated;
    if (!/[A-Za-z]/.test(testName) || testName.length < 2) continue;
    const key = testName.toLowerCase();
    if (nameExclusions.has(key)) continue;
    if (seenTests.has(key)) continue;

    // value column may carry value + flag
    let valueText = '';
    let flagRaw = '';
    for (const t of buckets.value) {
      if (VAL.test(t) && !valueText) valueText = t;
      else if (FLAG.test(t) && !flagRaw) flagRaw = t;
    }
    if (!valueText) continue; // a lab row requires a numeric value

    // range column may carry the range + (CareSpace) a trailing unit
    let rangeText = '';
    let unitFromRange = '';
    for (const t of buckets.range) {
      if (RANGE.test(t) && !rangeText) rangeText = t;
      else if (/[A-Za-z%]/.test(t)) unitFromRange += (unitFromRange ? ' ' : '') + t;
    }
    const unit = buckets.unit.join(' ').trim() || unitFromRange;

    seenTests.add(key);

    const valClean = valueText.replace(/[<>=]/g, '').trim();
    let value: number | null = parseFloat(valClean);
    if (isNaN(value)) value = null;

    const { low: refLow, high: refHigh } = parseRefBounds(rangeText);

    let flag = normalizeFlag(flagRaw);
    let isAbnormal = !!flag;
    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) {
        isAbnormal = true;
        flag = 'L';
      } else if (refHigh !== null && value > refHigh) {
        isAbnormal = true;
        flag = 'H';
      }
    }

    out.push({
      testName,
      value,
      valueText,
      unit,
      referenceLow: refLow,
      referenceHigh: refHigh,
      referenceText: rangeText,
      flag,
      isAbnormal,
      context: `Geometry grid: ${testName} = ${valueText}${unit ? ' ' + unit : ''}${rangeText ? ` (ref: ${rangeText})` : ''}`,
      // Geometry with a usable reference is the strongest signal we have;
      // value-only (no range to corroborate) is still solid but flagged lower.
      confidence: refLow !== null || refHigh !== null ? 0.94 : 0.82,
      date: rowDate ?? undefined,
    });
  }

  return out;
}

/**
 * Run the geometry extractor over a PDF's positioned tokens (from
 * extractPdfTokens). Returns [] when no grid header is found — that's the
 * dispatcher's cue to fall through to the inline text parsers.
 *
 * Names come out RAW here (metadata and all). Name cleaning is a separate,
 * NER-powered step (resolveLabNamesWithNer) — geometry does columns, the model
 * does "which of these words is the actual analyte." Kept sync + model-free so
 * the golden suite stays hermetic.
 */
export function extractLabResultsGeometry(
  pages: PdfToken[][],
  nameExclusions: Set<string>
): LabResult[] {
  const seenTests = new Set<string>();
  const results: LabResult[] = [];
  for (const page of pages) {
    results.push(...parsePageGeometry(rowsFromPage(page), nameExclusions, seenTests));
  }
  return results;
}

/**
 * Resolve the real analyte out of metadata-polluted geometry names using the NER
 * model the app already ships. The model knows "Miami" is a place, a provider
 * name is a person, and "BUN"/"Hgb" is the test — so we trim each name to the
 * span the model marks as a medical entity, dropping the leading/trailing
 * metadata that the geometry's column-bucketing swept in. This is the principled
 * inverse of hand-stripping prefixes: recognize the signal, don't enumerate the
 * noise. No hardcoded test list anywhere.
 *
 * - Single-token names (already a clean analyte) skip the model entirely.
 * - If the model finds no medical entity in the cell, the RAW name is kept — the
 *   user edits it on the review screen rather than us guessing.
 * - Async because the model is; dynamic import keeps this off the geometry unit
 *   tests' dependency graph.
 *
 * NOTE: this loads the ~64MB NER model in the lab path too (lab-only mode used to
 * skip it). Desktop-only feature; the model caches after first download.
 */
export async function resolveLabNamesWithNer(rows: LabResult[]): Promise<LabResult[]> {
  if (!rows.some((r) => /\s/.test(r.testName))) return rows; // all clean → no model

  let extractEntities: (text: string) => Promise<Array<{ start: number; end: number }>>;
  try {
    ({ extractEntities } = await import('./medical-ner'));
  } catch {
    return rows; // model module unavailable → keep raw names
  }

  const out: LabResult[] = [];
  for (const row of rows) {
    let testName = row.testName;
    if (/\s/.test(testName)) {
      try {
        const ents = await extractEntities(testName);
        if (ents.length) {
          const start = Math.min(...ents.map((e) => e.start));
          const end = Math.max(...ents.map((e) => e.end));
          const resolved = testName.slice(start, end).trim();
          // Only accept a non-empty result that actually contains a letter.
          if (resolved.length >= 2 && /[A-Za-z]/.test(resolved)) testName = resolved;
        }
      } catch {
        /* model failed on this cell → keep the raw name */
      }
    }
    out.push(testName === row.testName ? row : { ...row, testName });
  }
  return out;
}
