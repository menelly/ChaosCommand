/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-parser.ts — Lab result extraction from medical documents.
 * Ported from Python medical_nlp.py extract_lab_results_from_text.
 *
 * Three format parsers:
 * 1. Horizontal (generic): "TestName value unit (low-high) FLAG"
 * 2. Vertical (MyChart/Epic/Intermountain): Card layout
 * 3. Mayo/graphical: Two-column "Normal range:" layout
 *
 * The NER model finds WHAT (test names). Regex finds HOW MUCH (values, units, ranges).
 */

import { buildExclusionSet, type MedicalEvent } from './medical-ner';
import { extractLabResultsGeometry, resolveLabNamesWithNer } from './lab-geometry';
import { checkLabValueSanity } from './lab-sanity-check';
import type { PdfToken } from './text-extractor';

/** Tag every result with sanity-check metadata. Called on the final result
 *  list from any extractor (geometry, text-fallback, etc.) so the UI gets
 *  consistent "verify this value?" prompts regardless of extraction path. */
function applySanityChecks(results: LabResult[]): LabResult[] {
  return results.map((r) => {
    const check = checkLabValueSanity(r);
    if (check.ok) return r;
    return {
      ...r,
      needs_typo_check: true,
      typo_check_reason: check.reason,
      typo_check_severity: check.severity,
    };
  });
}

// ============================================================================
// TYPES
// ============================================================================

export interface LabResult {
  testName: string;
  value: number | null;
  /**
   * The value as text, WITHOUT the unit (e.g. "5", "<4", ">10"). The unit
   * lives in `unit` and is appended by consumers (timeline title, PDF table,
   * diagnostics). All four parsers MUST honor this — baking the unit in here
   * is what produced "5 mg/dL mg/dL" (CHA-322).
   */
  valueText: string;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string;
  flag: string;
  isAbnormal: boolean;
  context: string;
  confidence: number;
  /** ISO collection date (YYYY-MM-DD) parsed from a per-result "Date/Time …"
   *  field when the report carries one (CareSpace). Undefined otherwise — the
   *  consumer falls back to the file-level / today's date. */
  date?: string;
  /** Set by lab-sanity-check when a value looks like it MIGHT be a typo or
   *  extraction error — e.g. inside a panic zone OR >5× the reference range.
   *  Surfaces a "verify this reading?" prompt in the review UI. Not a
   *  diagnosis — we're asking the parser/typist, not the patient. */
  needs_typo_check?: boolean;
  typo_check_reason?: string;
  typo_check_severity?: 'critical' | 'extreme';
}

/**
 * Document-level specimen COLLECTION date from a lab-report header.
 *
 * A lab is dated by when the specimen was DRAWN, not when the file was uploaded.
 * Quest/LabCorp print one header date ("Collected: 06/10/2020"); when no per-row
 * date exists (geometry's `date` field), the consumer was defaulting to *today*,
 * which stamps a 2020 panel as current and FABRICATES a trend on the timeline.
 * (Ren caught it dogfooding quest5.pdf — 2020 labs landing on 2026-06-22.)
 *
 * Priority: Collected/Drawn > Received > Reported. We deliberately do NOT match
 * the patient DOB ("Date of Birth", "DOB") or a print/footer date — only dates
 * sitting right after a specimen-event label. Returns ISO YYYY-MM-DD or null.
 */
export function extractCollectionDate(text: string): string | null {
  const toIso = (mm: string, dd: string, yy: string): string => {
    let year = yy;
    if (year.length === 2) year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  };
  // Each tier: a specimen-event label, then up to 15 non-digit, non-newline
  // chars (": ", ":  "), then the date. The bounded gap keeps the match on the
  // same line so a label can't pair with an unrelated date below it.
  const DATE = '(\\d{1,2})\\/(\\d{1,2})\\/(\\d{2,4})';
  const tiers = [
    new RegExp(`(?:date\\s+collected|collected|collection\\s+date|specimen\\s+(?:collected|date)|drawn)\\b[^\\n\\d]{0,15}${DATE}`, 'i'),
    new RegExp(`received\\b[^\\n\\d]{0,15}${DATE}`, 'i'),
    new RegExp(`(?:reported|report\\s+date|result\\s+date)\\b[^\\n\\d]{0,15}${DATE}`, 'i'),
  ];
  for (const re of tiers) {
    const m = text.match(re);
    if (m) return toIso(m[1], m[2], m[3]);
  }
  return null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LAB_UNITS = '(?:mg\\/dL|mEq\\/L|g\\/dL|g\\/L|%|K\\/uL|M\\/uL|mIU\\/L|mmol\\/L|IU\\/mL|' +
  'µIU\\/mL|uIU\\/mL|U\\/L|ng\\/mL|ng\\/dL|pg\\/mL|mcg\\/dL|µg\\/dL|' +
  'cells\\/uL|cells\\/mcL|x10\\^[0-9]+\\/uL|fL|pg|mL\\/min|' +
  'mm\\/hr|sec|seconds|ratio|copies\\/mL|MEq\\/L|mmHg)';

const LAB_FLAGS = '(?:\\b(?:H|L|HH|LL|HIGH|LOW|CRITICAL|ABNORMAL|ABN|CRIT)\\b|\\*)';

// ============================================================================
// HORIZONTAL FORMAT PARSER
// ============================================================================

function parseHorizontalFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  const pattern = new RegExp(
    '(\\b[\\w\\s\\-\\(\\)]+?)\\s+' +          // Test name
    '([<>]?\\s*\\d+(?:\\.\\d+)?)\\s*' +         // Value
    '(' + LAB_UNITS + ')\\s*' +                  // Unit
    '(?:' +
      '[\\(\\[]?\\s*' +
      '(\\d+(?:\\.\\d+)?)\\s*' +                 // Low bound
      '[-–]\\s*' +
      '(\\d+(?:\\.\\d+)?)\\s*' +                 // High bound
      '[\\)\\]]?' +
    ')?\\s*' +
    '(' + LAB_FLAGS + ')?',                      // Flag
    'gi'
  );

  let match;
  while ((match = pattern.exec(text)) !== null) {
    let testName = match[1].trim()
      .replace(/^[\s\-:,]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (testName.length < 2 || testName.length > 60) continue;
    if (nameExclusions.has(testName.toLowerCase())) continue;
    if (/^[\d\s.]+$/.test(testName)) continue;

    const key = testName.toLowerCase();
    if (seenTests.has(key)) continue;
    seenTests.add(key);

    const valueText = match[2].trim();
    const unit = match[3].trim();
    const refLowText = match[4];
    const refHighText = match[5];
    let flag = (match[6] || '').trim();

    const valueClean = valueText.replace(/[<>]/g, '').trim();
    let value: number | null = null;
    try { value = parseFloat(valueClean); if (isNaN(value)) value = null; } catch { value = null; }

    const refLow = refLowText ? parseFloat(refLowText) : null;
    const refHigh = refHighText ? parseFloat(refHighText) : null;

    let isAbnormal = !!flag;
    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) { isAbnormal = true; flag = 'L'; }
      else if (refHigh !== null && value > refHigh) { isAbnormal = true; flag = 'H'; }
    }

    const contextStart = Math.max(0, match.index - 100);
    const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
    const context = text.slice(contextStart, contextEnd).trim();

    results.push({
      testName, value, valueText, unit,
      referenceLow: refLow, referenceHigh: refHigh,
      referenceText: refLow && refHigh ? `${refLow}-${refHigh}` : '',
      flag, isAbnormal,
      context: context.slice(0, 200),
      confidence: refLow && refHigh ? 0.92 : 0.80,
    });
  }

  return results;
}

// ============================================================================
// VERTICAL FORMAT PARSER (MyChart/Epic/Intermountain)
// ============================================================================

function parseVerticalFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  // Detect vertical format
  if (!/Test Date\s*\n[\s\S]*?\nTest Location/.test(text)) return results;

  // Clean page artifacts
  let clean = text;
  clean = clean.replace(/Copyright\s+.?\d{4}[\s\S]*?Page\s+\d+\s+of\s+\d+\s*/g, '');
  clean = clean.replace(/\n*---\s*Page\s+\d+\s*---\n*/g, '\n');
  clean = clean.replace(/^\d{2}\/\d{2}\/\d{4}\s+Test Results\s*$/gm, '');
  clean = clean.replace(/^Health Record\s*$/gm, '');
  clean = clean.replace(/^Notes\s*$/gm, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  const pattern = new RegExp(
    '(?<test_name>[A-Za-z][\\w \\-\\(\\)/]+?)\\s*\\n' +
    'Test Date\\s*\\n' +
    '(?<date>\\d{2}\\/\\d{2}\\/\\d{4})\\s*\\n' +
    'Test Location\\s*\\n' +
    '(?:(?!Range).*?\\n)*?' +
    'Range \\(Normal\\)\\s*\\n' +
    '(?<range_line>.*?)\\s*\\n' +
    'Value\\s*\\n' +
    '(?<value_line>.*?)\\s*\\n' +
    'Interpretation\\s*\\n' +
    '(?<interp>(?:LLOW|LOW|HI|HIGH|H|L|LL|HH|CRITICAL|CRIT|ABNORMAL|ABN)?\\s*)\\n',
    'gm'
  );

  let match;
  while ((match = pattern.exec(clean)) !== null) {
    const testName = match.groups!.test_name.trim();
    const rangeLine = match.groups!.range_line.trim();
    const valueLine = match.groups!.value_line.trim();
    const interp = (match.groups!.interp || '').trim();

    if (testName.length < 2 || testName.length > 80) continue;
    if (nameExclusions.has(testName.toLowerCase())) continue;
    if (/^[\d\s.]+$/.test(testName)) continue;
    if (['notes', 'note', 'comments', 'comment', 'see note'].includes(testName.toLowerCase())) continue;

    const key = testName.toLowerCase();
    if (seenTests.has(key)) continue;
    seenTests.add(key);

    // Parse value. Keep valueText as the value ONLY (no unit) — `unit` is a
    // separate field and consumers append it. Baking the unit in here is what
    // produced "5 mg/dL mg/dL" downstream (CHA-322).
    let value: number | null = null;
    let unit = '';
    let valueText = valueLine;
    const valueMatch = valueLine.match(/([<>]?\s*\d+(?:\.\d+)?)\s*(.+)/);
    if (valueMatch) {
      valueText = valueMatch[1].trim();
      const valStr = valueMatch[1].replace(/[<>]/g, '').trim();
      try { value = parseFloat(valStr); if (isNaN(value)) value = null; } catch { value = null; }
      unit = valueMatch[2].trim();
    }

    // Parse range
    let refLow: number | null = null;
    let refHigh: number | null = null;
    const rangeMatch = rangeLine.match(/([<>]?\s*\d+(?:\.\d+)?)\s*\S+\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      try {
        refLow = parseFloat(rangeMatch[1].replace(/[<>]/g, '').trim());
        refHigh = parseFloat(rangeMatch[2].trim());
      } catch { /* ignore */ }
    }

    // Parse flag
    let flag = '';
    let isAbnormal = false;
    const interpUpper = interp.toUpperCase();
    if (interpUpper.includes('LLOW') || interpUpper === 'LL') { flag = 'LL'; isAbnormal = true; }
    else if (['LOW', 'L'].includes(interpUpper)) { flag = 'L'; isAbnormal = true; }
    else if (['HI', 'HIGH', 'H', 'HH'].includes(interpUpper)) { flag = 'H'; isAbnormal = true; }
    else if (['CRITICAL', 'CRIT'].includes(interpUpper)) { flag = 'CRITICAL'; isAbnormal = true; }

    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) { isAbnormal = true; flag = flag || 'L'; }
      else if (refHigh !== null && value > refHigh) { isAbnormal = true; flag = flag || 'H'; }
    }

    results.push({
      testName, value, valueText, unit,
      referenceLow: refLow, referenceHigh: refHigh,
      referenceText: refLow || refHigh ? rangeLine : '',
      flag, isAbnormal,
      context: `Vertical format: ${testName} = ${valueLine}`,
      confidence: refLow && refHigh ? 0.90 : 0.75,
    });
  }

  return results;
}

// ============================================================================
// MAYO/GRAPHICAL FORMAT PARSER
// ============================================================================

function parseMayoFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  // Detect: need multiple "Normal range:" entries and NOT vertical format
  if (/Test Date\s*\n[\s\S]*?\nTest Location/.test(text)) return results;
  if ((text.match(/Normal range:/g) || []).length < 2) return results;

  let clean = text;
  clean = clean.replace(/\n*---\s*Page\s+\d+\s*---\n*/g, '\n');
  clean = clean.replace(/^\d+\/\d+\/\d+,.*$/gm, '');
  clean = clean.replace(/^https?:\/\/\S+.*$/gm, '');
  clean = clean.replace(/^.*\d\.\.\d.*$/gm, '');
  clean = clean.replace(/^[a-z]\d\d\s+[a-z]\.\..*$/gm, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  const lines = clean.split('\n').filter(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('Normal range:')) continue;

    const rangeMatches = [...lines[i].matchAll(
      /Normal range:\s*([\d.]+)\s*-\s*([\d.]+)\s*(\S+(?:\(\d+\))?(?:\/\S+)*)/g
    )];
    if (rangeMatches.length === 0) continue;

    const nameLine = i > 0 ? lines[i - 1].trim() : '';
    const valueLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

    if (!nameLine || /^(Results|Name:|Collected|Ordering|Specimens)/.test(nameLine)) continue;

    const valMatches = [...valueLine.matchAll(/([\d.]+)\s*(Low|High)?/gi)];

    type TestEntry = [string, RegExpMatchArray, RegExpMatchArray | undefined];
    let tests: TestEntry[];

    if (rangeMatches.length === 2) {
      const words = nameLine.split(/\s+/);
      const mid = Math.floor(words.length / 2);
      const name1 = words.slice(0, Math.max(mid, 1)).join(' ');
      const name2 = words.slice(Math.max(mid, 1)).join(' ');
      tests = [
        [name1, rangeMatches[0], valMatches[0]],
        [name2, rangeMatches[1], valMatches[1]],
      ];
    } else if (rangeMatches.length === 1) {
      tests = [[nameLine, rangeMatches[0], valMatches[0]]];
    } else {
      continue;
    }

    for (const [testName, rmatch, vmatch] of tests) {
      const trimmedName = testName.trim();
      if (!trimmedName || trimmedName.length < 2) continue;
      if (nameExclusions.has(trimmedName.toLowerCase())) continue;

      const key = trimmedName.toLowerCase();
      if (seenTests.has(key)) continue;
      seenTests.add(key);

      const refLow = parseFloat(rmatch[1]);
      const refHigh = parseFloat(rmatch[2]);
      const unit = rmatch[3];

      let value: number | null = null;
      let valueText = '';
      let flag = '';
      let isAbnormal = false;

      if (vmatch) {
        const valStr = vmatch[1];
        const flagStr = vmatch[2] || '';
        try { value = parseFloat(valStr); if (isNaN(value)) value = null; } catch { value = null; }
        // valueText holds the value ONLY (no unit). `unit` is appended by
        // consumers; baking it in here doubled the unit downstream (CHA-322).
        valueText = valStr;
        if (flagStr) {
          flag = flagStr.toLowerCase() === 'low' ? 'L' : 'H';
          isAbnormal = true;
        }
      }

      if (!isAbnormal && value !== null) {
        if (value < refLow) { isAbnormal = true; flag = flag || 'L'; }
        else if (value > refHigh) { isAbnormal = true; flag = flag || 'H'; }
      }

      results.push({
        testName: trimmedName, value, valueText, unit,
        referenceLow: refLow, referenceHigh: refHigh,
        referenceText: `${refLow} ${unit}-${refHigh} ${unit}`,
        flag, isAbnormal,
        context: `Mayo format: ${trimmedName} = ${value} ${unit}`,
        confidence: 0.90,
      });
    }
  }

  return results;
}

// ============================================================================
// RESULT-RANGE CARD FORMAT (LabCorp / Quest / many specialist panels)
// ============================================================================
//
// Catches the vertical card pattern that doesn't have MyChart's Test Date /
// Test Location signature. Looks like:
//
//   dsDNA ANTIBODY
//   Result: 17 IU/mL (High)
//   Reference range: <4 IU/mL
//   Status: final
//
// Test name on its own line, "Result:" line with value/unit/optional flag,
// "Reference range:" line with single-bound or range. Status / Lab comments
// optional and ignored.

function parseResultRangeFormat(
  text: string,
  nameExclusions: Set<string>,
  seenTests: Set<string>
): LabResult[] {
  const results: LabResult[] = [];

  // Detect: need at least one "Result:" line followed reasonably soon by a
  // "Reference range:" line. Allow leading whitespace — VA / My HealtheVet
  // and several specialist panels indent these lines in the extracted text.
  if (!/^\s*Result:\s/m.test(text) || !/^\s*Reference range:\s/m.test(text)) {
    return results;
  }

  // Match a card. Test name is on the line BEFORE "Result:". Use multiline
  // mode so ^/$ are line anchors. Tolerate leading whitespace AND blank
  // lines between the test header and the Result line (My HealtheVet
  // formats often render them with a paragraph break).
  //
  // NOTE: test_name char class uses literal ' ' instead of \s so the
  // regex cannot bleed the test name across newlines. With \s, captures
  // like "you.\ndsDNA ANTIBODY" happened because the line above (the
  // boilerplate "your provider will contact you.") got pulled in.
  const pattern = new RegExp(
    '^[ \\t]*(?<test_name>[A-Za-z][\\w \\-\\(\\)/\\.,]{1,80}?)[ \\t]*\\n' +
    '(?:[ \\t]*\\n)*' +
    '[ \\t]*Result:\\s*(?<value>[<>]?\\s*\\d+(?:\\.\\d+)?)\\s*(?<unit>' + LAB_UNITS + ')\\s*' +
    '(?:\\((?<flag_paren>[A-Za-z]+)\\)|\\b(?<flag_bare>HIGH|LOW|HH|LL|H|L|CRITICAL|CRIT|ABNORMAL|ABN)\\b)?[ \\t]*\\n' +
    '(?:[ \\t]*\\n)*' +
    // ⚠️ THE LINE THAT SAYS "High" USED TO BREAK THE PARSE.
    //
    // This previously allowed ONLY blank lines between Result: and Reference
    // range:. Real portal output puts an "Interpretation: High" line in that
    // gap, so the whole card failed to match, zero labs were extracted, and the
    // NER pass then scavenged the leftovers - filing "Reference range: 4 - 27
    // mm/hr" and "Status: Final" as DIAGNOSES while dropping the analyte, the
    // value, and the abnormal flag. Two junk rows on the timeline and the real
    // abnormal result discarded, because the most informative line in the block
    // was treated as noise.
    //
    // Interpretation is now CAPTURED - it is the cleanest statement of high/low
    // anywhere in the card - and a BOUNDED set of other labelled lines is
    // tolerated in between. Bounded on purpose: a greedy "any line" would let
    // one card's name bleed into the next card's numbers.
    '(?:[ \t]*(?:Interpretation|Interp|Abnormal Flag|Flag):[ \t]*(?<flag_interp>[A-Za-z][A-Za-z ]{0,24}?)[ \t]*\n(?:[ \t]*\n)*)?' +
    '(?:[ \t]*(?:Status|Units?|Performing Lab|Performed By|Collected|Collection Date|Analysis Date|Specimen):[^\n]*\n(?:[ \t]*\n)*){0,4}' +
    '[ \\t]*Reference range:\\s*(?<ref>[^\\n]+?)[ \\t]*\\n',
    'gmi'
  );

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const testName = match.groups!.test_name.trim();
    const valueRaw = match.groups!.value.trim();
    const unit = match.groups!.unit.trim();
    const refLine = match.groups!.ref.trim();
    const flagRaw = (match.groups!.flag_paren || match.groups!.flag_bare || '').trim().toUpperCase();

    if (testName.length < 2 || testName.length > 80) continue;
    if (nameExclusions.has(testName.toLowerCase())) continue;
    if (/^[\d\s.]+$/.test(testName)) continue;
    // Skip card-internal labels that the regex might catch in malformed text
    if (['result', 'reference range', 'status', 'lab comments', 'comments'].includes(testName.toLowerCase())) continue;

    const key = testName.toLowerCase();
    if (seenTests.has(key)) continue;
    seenTests.add(key);

    // Parse value
    let value: number | null = null;
    const valClean = valueRaw.replace(/[<>]/g, '').trim();
    try { value = parseFloat(valClean); if (isNaN(value)) value = null; } catch { value = null; }

    // Parse reference range. Three shapes commonly seen:
    //   "<4 IU/mL" or "< 4 IU/mL"   → upper bound only
    //   ">10 IU/mL"                  → lower bound only
    //   "4-10 IU/mL" or "4 - 10 IU/mL" → bounded range
    let refLow: number | null = null;
    let refHigh: number | null = null;
    const rangeMatch = refLine.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    const upperOnlyMatch = refLine.match(/<\s*(\d+(?:\.\d+)?)/);
    const lowerOnlyMatch = refLine.match(/>\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      refLow = parseFloat(rangeMatch[1]);
      refHigh = parseFloat(rangeMatch[2]);
    } else if (upperOnlyMatch) {
      refHigh = parseFloat(upperOnlyMatch[1]);
    } else if (lowerOnlyMatch) {
      refLow = parseFloat(lowerOnlyMatch[1]);
    }

    // Normalize flag
    let flag = '';
    if (['LL', 'LLOW'].includes(flagRaw)) flag = 'LL';
    else if (['LOW', 'L'].includes(flagRaw)) flag = 'L';
    else if (['HH'].includes(flagRaw)) flag = 'HH';
    else if (['HIGH', 'HI', 'H'].includes(flagRaw)) flag = 'H';
    else if (['CRITICAL', 'CRIT'].includes(flagRaw)) flag = 'CRITICAL';
    else if (['ABNORMAL', 'ABN'].includes(flagRaw)) flag = 'ABNORMAL';

    let isAbnormal = !!flag;
    if (!isAbnormal && value !== null) {
      if (refLow !== null && value < refLow) { isAbnormal = true; flag = 'L'; }
      else if (refHigh !== null && value > refHigh) { isAbnormal = true; flag = 'H'; }
    }

    results.push({
      testName,
      value,
      valueText: valueRaw,
      unit,
      referenceLow: refLow,
      referenceHigh: refHigh,
      referenceText: refLine,
      flag,
      isAbnormal,
      context: `Result-range card: ${testName} = ${valueRaw} ${unit} (ref: ${refLine})`,
      confidence: refLow !== null || refHigh !== null ? 0.92 : 0.78,
    });
  }

  return results;
}

// ============================================================================
// MAIN LAB EXTRACTION
// ============================================================================

/**
 * Diagnostic trace describing what each parser saw on the most recent
 * extraction attempt. Written to localStorage under DIAG_KEY by
 * extractLabResults() so the user-facing import page can surface it when
 * 0 results are returned. Production-debuggable without devtools.
 */
export interface LabParserDiagnostics {
  timestamp: string
  textLength: number
  textSample: string // first ~3000 chars of (cleaned) input
  attempts: Array<{
    parser: 'vertical' | 'mayo' | 'result-range' | 'horizontal'
    detectionPassed: boolean
    detectionReason: string
    resultsFound: number
    sampleResults: string[] // first 3 testNames found, for quick eyeballing
  }>
  finalResultsCount: number
  finalParser: 'vertical' | 'mayo' | 'result-range' | 'horizontal' | 'none'
}

const DIAG_KEY = 'chaos-lab-parser-last-trace'

function detectionVertical(text: string): { ok: boolean; reason: string } {
  const ok = /Test Date\s*\n[\s\S]*?\nTest Location/.test(text)
  return { ok, reason: ok ? 'Found "Test Date ... Test Location" header' : 'No "Test Date / Test Location" signature (MyChart/Epic format)' }
}
function detectionMayo(text: string): { ok: boolean; reason: string } {
  if (/Test Date\s*\n[\s\S]*?\nTest Location/.test(text)) return { ok: false, reason: 'Skipped: vertical format detected (Mayo only runs on non-vertical)' }
  const count = (text.match(/Normal range:/g) || []).length
  return { ok: count >= 2, reason: count >= 2 ? `Found ${count} "Normal range:" entries` : `Need ≥2 "Normal range:" entries; found ${count}` }
}
function detectionResultRange(text: string): { ok: boolean; reason: string } {
  const hasResult = /^\s*Result:\s/m.test(text)
  const hasRef = /^\s*Reference range:\s/m.test(text)
  if (!hasResult) return { ok: false, reason: 'No line starting with "Result:"' }
  if (!hasRef) return { ok: false, reason: 'No line starting with "Reference range:"' }
  return { ok: true, reason: 'Found both "Result:" and "Reference range:" lines' }
}

function tryParser(
  parser: 'vertical' | 'mayo' | 'result-range' | 'horizontal',
  fn: (t: string, ex: Set<string>, seen: Set<string>) => LabResult[],
  detectionFn: ((t: string) => { ok: boolean; reason: string }) | null,
  text: string,
  exclusions: Set<string>,
  seen: Set<string>,
  attempts: LabParserDiagnostics['attempts']
): LabResult[] {
  const detection = detectionFn ? detectionFn(text) : { ok: true, reason: 'Fallback parser, always runs' }
  let results: LabResult[] = []
  if (detection.ok) {
    try {
      results = fn(text, exclusions, seen)
    } catch (e) {
      attempts.push({ parser, detectionPassed: detection.ok, detectionReason: `${detection.reason} — but parser threw: ${e instanceof Error ? e.message : String(e)}`, resultsFound: 0, sampleResults: [] })
      return []
    }
  }
  attempts.push({
    parser,
    detectionPassed: detection.ok,
    detectionReason: detection.reason,
    resultsFound: results.length,
    sampleResults: results.slice(0, 3).map(r => `${r.testName}: ${r.valueText} ${r.unit}`),
  })
  return results
}

/**
 * Extract lab results from text. Tries vertical (MyChart), mayo, result-range
 * card (LabCorp/Quest/specialist panels), then horizontal as fallback.
 *
 * Side effect: writes a diagnostic trace to localStorage[DIAG_KEY] describing
 * which parsers were attempted and why each succeeded/failed. The import
 * page reads this when results are empty so users can see what went wrong
 * without devtools access.
 */
export function extractLabResults(
  text: string,
  demographics?: Record<string, any> | null
): LabResult[] {
  // Normalize: guarantee a trailing newline. The vertical and result-range
  // card parsers anchor each record on a terminating "\n", so a document whose
  // LAST line is the final record (no trailing blank line — common in pdf.js
  // text extraction) silently dropped its last lab result. Adding one newline
  // is strictly additive (recovers the dropped record; can't change any other
  // match) and uniform across parsers. Regression-locked in lab-parser.golden.test.ts.
  if (!text.endsWith('\n')) text = text + '\n';

  const nameExclusions = buildExclusionSet(demographics);
  const seenTests = new Set<string>();

  const attempts: LabParserDiagnostics['attempts'] = []
  let finalResults: LabResult[] = []
  let finalParser: LabParserDiagnostics['finalParser'] = 'none'

  // Vertical (MyChart/Epic)
  const verticalResults = tryParser('vertical', parseVerticalFormat, detectionVertical, text, nameExclusions, seenTests, attempts)
  if (verticalResults.length > 0) {
    finalResults = verticalResults; finalParser = 'vertical'
  } else {
    // Mayo
    const mayoResults = tryParser('mayo', parseMayoFormat, detectionMayo, text, nameExclusions, seenTests, attempts)
    if (mayoResults.length > 0) {
      finalResults = mayoResults; finalParser = 'mayo'
    } else {
      // Result-range card (LabCorp / Quest / VA / specialist panels)
      const rangeResults = tryParser('result-range', parseResultRangeFormat, detectionResultRange, text, nameExclusions, seenTests, attempts)
      if (rangeResults.length > 0) {
        finalResults = rangeResults; finalParser = 'result-range'
      } else {
        // Horizontal (last resort)
        const horizontalResults = tryParser('horizontal', parseHorizontalFormat, null, text, nameExclusions, seenTests, attempts)
        if (horizontalResults.length > 0) {
          finalResults = horizontalResults; finalParser = 'horizontal'
        }
      }
    }
  }

  // Persist diagnostics for production debugging via the import-page viewer.
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const diag: LabParserDiagnostics = {
        timestamp: new Date().toISOString(),
        textLength: text.length,
        textSample: text.slice(0, 3000),
        attempts,
        finalResultsCount: finalResults.length,
        finalParser,
      }
      localStorage.setItem(DIAG_KEY, JSON.stringify(diag))
    }
  } catch { /* localStorage full or blocked — fail silent */ }

  console.log(`🧪 Lab parser: ${finalResults.length} results via ${finalParser}`)
  return applySanityChecks(sortLabResults(finalResults))
}

/**
 * Geometry-first lab extraction for PDFs (CHA-367). Runs the column-aware
 * geometry extractor on the PDF's positioned tokens; if it finds grid rows
 * (LabCorp, CareSpace/Epic), those win — they read units raw and reconstruct
 * columns by x instead of regexing flattened text. If geometry finds nothing
 * (inline-prose formats like Quest, or a non-grid doc), falls through to the
 * existing text parsers via extractLabResults().
 *
 * `tokens` comes from extractTextAndTokensFromPdf (same single pdf.js pass that
 * produced `text`). Callers without a PDF (pasted text) keep calling
 * extractLabResults directly — geometry needs the geometry.
 */
export async function extractLabResultsSmart(
  tokens: PdfToken[][],
  text: string,
  demographics?: Record<string, any> | null
): Promise<LabResult[]> {
  const nameExclusions = buildExclusionSet(demographics);
  const rawGeometry =
    tokens.length > 0 ? extractLabResultsGeometry(tokens, nameExclusions) : [];
  // Clean metadata-polluted names with the NER model (geometry does columns; the
  // model decides which token is the analyte). Falls back to raw names on failure.
  const geometryResults =
    rawGeometry.length > 0 ? await resolveLabNamesWithNer(rawGeometry) : [];

  if (geometryResults.length > 0) {
    // Persist a diagnostic trace so the import page can show geometry won and
    // how many rows it pulled (parity with the text-parser trace below).
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const diag: LabParserDiagnostics = {
          timestamp: new Date().toISOString(),
          textLength: text.length,
          textSample: text.slice(0, 3000),
          attempts: [{
            parser: 'result-range', // closest existing enum; label clarifies
            detectionPassed: true,
            detectionReason: `Geometry grid extractor: ${geometryResults.length} rows from ${tokens.length} page(s)`,
            resultsFound: geometryResults.length,
            sampleResults: geometryResults.slice(0, 3).map(r => `${r.testName}: ${r.valueText} ${r.unit}`),
          }],
          finalResultsCount: geometryResults.length,
          finalParser: 'result-range',
        };
        localStorage.setItem(DIAG_KEY, JSON.stringify(diag));
      }
    } catch { /* localStorage full or blocked — fail silent */ }

    console.log(`🧪 Lab parser: ${geometryResults.length} results via geometry`);
    return applySanityChecks(sortLabResults(geometryResults));
  }

  // No grid → existing text-parser dispatch (writes its own diagnostics).
  return extractLabResults(text, demographics);
}

/** Read the most recent parser diagnostic trace, if any. */
export function getLastLabParserDiagnostics(): LabParserDiagnostics | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const raw = localStorage.getItem(DIAG_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LabParserDiagnostics
  } catch {
    return null
  }
}

function sortLabResults(results: LabResult[]): LabResult[] {
  return results.sort((a, b) => {
    if (a.isAbnormal !== b.isAbnormal) return a.isAbnormal ? -1 : 1;
    return a.testName.toLowerCase().localeCompare(b.testName.toLowerCase());
  });
}

/**
 * Convert lab results to MedicalEvent format for the timeline.
 */
export function labResultsToEvents(labs: LabResult[], docDate?: string | null): MedicalEvent[] {
  return labs.map((lab, i) => {
    const flagPrefix = ['H', 'HH', 'HIGH', 'CRITICAL', 'CRIT'].includes(lab.flag) ? '🔴 ' :
                       ['L', 'LL', 'LOW'].includes(lab.flag) ? '🔵 ' : '';

    let title = `${flagPrefix}${lab.testName}: ${lab.valueText} ${lab.unit}`;
    if (lab.referenceText) title += ` (ref: ${lab.referenceText})`;

    return {
      id: `nlp-lab-${Date.now()}-${i}`,
      type: 'lab',
      title,
      date: docDate || new Date().toISOString().split('T')[0],
      end_date: null,
      provider: null,
      location: null,
      description: lab.context,
      status: 'active',
      severity: null,
      tags: ['lab', 'imported', 'lab-parser'],
      confidence: Math.round(lab.confidence * 100),
      sources: ['lab-parser'],
      needs_review: false,
      suggestions: [],
      raw_text: lab.context,
      dosage: null,
      incidental_findings: [],
    };
  });
}
