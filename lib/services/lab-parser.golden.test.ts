/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-parser.golden.test.ts — Golden-file regression suite for the lab parser.
 *
 * WHY THIS EXISTS
 * The lab parser is four regex parsers (vertical / mayo / result-range / horizontal)
 * with a long history of whack-a-mole fixes (CHA-322 unit doubling, test-name
 * bleed, single-bound reference ranges...). Every later refactor — especially the
 * planned de-jenga of pdf-report-generator and the extractSeverity unification —
 * risks silently regressing one of these. This suite pins the load-bearing
 * behavior of each format against synthetic fixtures so refactors are SAFE.
 *
 * All fixtures are SYNTHETIC. No real PHI. Values are obviously fake.
 *
 * HOW TO RUN (no test framework is installed in this repo yet):
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/lab-parser.golden.test.ts
 *   node .tmp-out/lib/services/lab-parser.golden.test.js
 * Exits non-zero if any assertion fails — drop-in for CI once a runner lands.
 * The assert harness is framework-free on purpose; port the `cases` array to
 * vitest/jest verbatim when one is adopted.
 */

import { extractLabResults, labResultsToEvents, type LabResult } from './lab-parser';

// ============================================================================
// TINY ASSERT HARNESS (no framework dependency)
// ============================================================================

let passed = 0;
let failed = 0;
let knownFail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    const msg = `  ✗ ${name}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(msg);
  }
}

/**
 * For a confirmed bug whose fix has wide blast radius and is deferred to a
 * deliberate, Ren-reviewed change (filed in Linear). We assert the CURRENT
 * (wrong) behavior so the suite stays green AND documents the defect — the day
 * the fix lands, this flips and tells you to promote it to a real `check`.
 */
function knownIssue(name: string, currentlyBrokenCond: boolean, linear: string) {
  if (currentlyBrokenCond) {
    knownFail++;
    console.log(`  ⚠ KNOWN ISSUE still present (${linear}): ${name}`);
  } else {
    // The bug appears fixed — fail loudly so someone promotes this to a real check.
    failed++;
    const msg = `  ✗ KNOWN ISSUE "${name}" (${linear}) looks FIXED — promote to a real assertion`;
    failures.push(msg);
    console.log(msg);
  }
}

/** Find a parsed result by (case-insensitive substring) test name. */
function byName(results: LabResult[], frag: string): LabResult | undefined {
  return results.find((r) => r.testName.toLowerCase().includes(frag.toLowerCase()));
}

// ============================================================================
// THE UNIVERSAL INVARIANT: CHA-322 — valueText NEVER contains the unit
// ============================================================================
// "5 mg/dL mg/dL" came from baking the unit into valueText. Every parser must
// keep valueText = the number only. We assert this on EVERY result of EVERY
// fixture, and also that the timeline title never doubles a unit token.

const UNIT_TOKENS = [
  'mg/dL', 'mEq/L', 'g/dL', 'g/L', 'K/uL', 'M/uL', 'mIU/L', 'mmol/L',
  'IU/mL', 'ng/mL', 'ng/dL', 'pg/mL', 'mcg/dL', 'U/L', 'fL', '%',
  'mm/hr', 'cells/uL', 'copies/mL',
];

function assertNoUnitDoubling(label: string, results: LabResult[]) {
  for (const r of results) {
    // valueText must not contain any unit token
    const dirty = UNIT_TOKENS.find((u) => r.valueText.includes(u));
    check(
      `[${label}] CHA-322: valueText "${r.valueText}" (${r.testName}) carries no unit`,
      !dirty,
      dirty ? `valueText leaked unit "${dirty}"` : undefined,
    );
  }
  // Title-level: "<value> <unit>" must not yield "<unit> <unit>"
  for (const ev of labResultsToEvents(results)) {
    const doubled = UNIT_TOKENS.find((u) => ev.title.includes(`${u} ${u}`));
    check(
      `[${label}] CHA-322: timeline title has no doubled unit — "${ev.title}"`,
      !doubled,
      doubled ? `doubled "${doubled}"` : undefined,
    );
  }
}

// ============================================================================
// FIXTURES + EXPECTATIONS (synthetic)
// ============================================================================

console.log('\n🧪 lab-parser golden suite\n');

// ---- 1. HORIZONTAL: "TestName value unit (low-high) FLAG" --------------------
{
  const label = 'horizontal';
  const text = `Glucose 105 mg/dL (70-99) H
Sodium 140 mEq/L (135-145)
Potassium 5.8 mEq/L (3.5-5.1) H
Hemoglobin 11.2 g/dL (12.0-16.0) L
Vitamin D 18 ng/mL`;
  const res = extractLabResults(text);

  const glu = byName(res, 'Glucose');
  check(`[${label}] Glucose parsed`, !!glu);
  if (glu) {
    check(`[${label}] Glucose value=105`, glu.value === 105, `got ${glu.value}`);
    check(`[${label}] Glucose unit=mg/dL`, glu.unit === 'mg/dL', `got "${glu.unit}"`);
    check(`[${label}] Glucose ref 70-99`, glu.referenceLow === 70 && glu.referenceHigh === 99);
    check(`[${label}] Glucose flagged H`, glu.flag === 'H' && glu.isAbnormal);
  }

  const na = byName(res, 'Sodium');
  check(`[${label}] Sodium in-range → not abnormal`, !!na && !na.isAbnormal, na ? `flag="${na.flag}"` : 'missing');

  const hgb = byName(res, 'Hemoglobin');
  check(`[${label}] Hemoglobin low flagged L`, !!hgb && hgb.flag === 'L' && hgb.isAbnormal);

  // Inferred abnormality: Potassium 5.8 > 5.1 with explicit H
  const k = byName(res, 'Potassium');
  check(`[${label}] Potassium high`, !!k && k.isAbnormal && k.flag === 'H');

  // Missing reference range still parses, lower confidence, not abnormal
  const vitd = byName(res, 'Vitamin D');
  check(`[${label}] Vitamin D parses without a ref range`, !!vitd && vitd.value === 18);
  if (vitd) check(`[${label}] Vitamin D no-ref → not abnormal`, !vitd.isAbnormal);

  assertNoUnitDoubling(label, res);

  // KNOWN ISSUE: horizontal test-name bleeds the preceding line because the
  // name char-class includes \s (which matches \n). The result-range parser
  // already fixed this (literal space, not \s); horizontal has not. Filed:
  const bleedText = `LABORATORY RESULTS\nGlucose 105 mg/dL (70-99) H`;
  const bleed = extractLabResults(bleedText);
  const bled = byName(bleed, 'Glucose');
  knownIssue(
    'horizontal name absorbs preceding line ("LABORATORY RESULTS Glucose")',
    !!bled && bled.testName !== 'Glucose',
    'CHA — horizontal name-bleed',
  );
}

// ---- 2. RESULT-RANGE CARD: LabCorp/Quest/VA ---------------------------------
{
  const label = 'result-range';
  const text = `dsDNA ANTIBODY
Result: 17 IU/mL (High)
Reference range: <4 IU/mL
Status: final

C-REACTIVE PROTEIN
Result: 2 mg/dL
Reference range: 0-1 mg/dL

TESTOSTERONE TOTAL
Result: 250 ng/dL (Low)
Reference range: >300 ng/dL
`;
  const res = extractLabResults(text);

  const dsdna = byName(res, 'dsDNA');
  check(`[${label}] dsDNA parsed`, !!dsdna);
  if (dsdna) {
    check(`[${label}] dsDNA value=17`, dsdna.value === 17);
    check(`[${label}] dsDNA upper-only ref <4`, dsdna.referenceHigh === 4 && dsdna.referenceLow === null);
    check(`[${label}] dsDNA flagged H (explicit)`, dsdna.flag === 'H' && dsdna.isAbnormal);
  }

  const crp = byName(res, 'C-REACTIVE');
  check(`[${label}] CRP inferred-abnormal (2 > 1)`, !!crp && crp.isAbnormal && crp.flag === 'H');

  const testo = byName(res, 'TESTOSTERONE');
  check(`[${label}] TESTOSTERONE lower-only ref >300`, !!testo && testo.referenceLow === 300 && testo.referenceHigh === null);
  if (testo) check(`[${label}] TESTOSTERONE flagged L (explicit)`, testo.flag === 'L' && testo.isAbnormal);

  assertNoUnitDoubling(label, res);
}

// ---- 3. REGRESSION LOCK: last card with NO trailing newline (bug fixed) ------
{
  const label = 'result-range/no-trailing-newline';
  // Document whose final character is NOT a newline. pdf.js extraction often
  // ends mid-line. Pre-fix this dropped the last lab silently (CHA-246 class).
  const text = `FERRITIN\nResult: 8 ng/mL (Low)\nReference range: 15-150 ng/mL`;
  check(`[${label}] input does NOT end in newline (precondition)`, !text.endsWith('\n'));
  const res = extractLabResults(text);
  const fer = byName(res, 'FERRITIN');
  check(`[${label}] last card recovered (was silently dropped)`, !!fer, `got ${res.length} result(s)`);
  if (fer) check(`[${label}] FERRITIN value=8, flagged L`, fer.value === 8 && fer.flag === 'L');
  assertNoUnitDoubling(label, res);
}

// ---- 4. MAYO / GRAPHICAL: two-column "Normal range:" ------------------------
{
  const label = 'mayo';
  const text = `Results
Hemoglobin
Normal range: 12.0 - 16.0 g/dL
10.5 Low
White Blood Cell Count
Normal range: 4.0 - 11.0 K/uL
6.2
Platelet Count
Normal range: 150 - 400 K/uL
520 High`;
  const res = extractLabResults(text);

  const hgb = byName(res, 'Hemoglobin');
  check(`[${label}] Hemoglobin parsed via mayo`, !!hgb);
  if (hgb) {
    check(`[${label}] Hemoglobin value=10.5`, hgb.value === 10.5);
    check(`[${label}] Hemoglobin ref 12-16`, hgb.referenceLow === 12 && hgb.referenceHigh === 16);
    check(`[${label}] Hemoglobin flagged L (explicit "Low")`, hgb.flag === 'L' && hgb.isAbnormal);
  }
  const wbc = byName(res, 'White Blood Cell');
  check(`[${label}] WBC in-range → not abnormal`, !!wbc && !wbc.isAbnormal);
  const plt = byName(res, 'Platelet');
  check(`[${label}] Platelet flagged H (explicit "High")`, !!plt && plt.flag === 'H' && plt.isAbnormal);

  assertNoUnitDoubling(label, res);
}

// ---- 5. VERTICAL / MyChart-Epic card ----------------------------------------
{
  const label = 'vertical';
  const text = `Glucose
Test Date
03/14/2026
Test Location
Quest Diagnostics
Range (Normal)
70 mg/dL - 99 mg/dL
Value
118 mg/dL
Interpretation
HIGH
`;
  const res = extractLabResults(text);
  const glu = byName(res, 'Glucose');
  check(`[${label}] Glucose parsed via vertical (Test Date/Location signature)`, !!glu);
  if (glu) {
    check(`[${label}] Glucose value=118`, glu.value === 118, `got ${glu.value}`);
    check(`[${label}] Glucose unit=mg/dL`, glu.unit === 'mg/dL', `got "${glu.unit}"`);
    check(`[${label}] Glucose flagged H (Interpretation HIGH)`, glu.flag === 'H' && glu.isAbnormal);
  }
  assertNoUnitDoubling(label, res);
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\n──────────────────────────────────────────`);
console.log(`PASS: ${passed}   FAIL: ${failed}   KNOWN-ISSUE: ${knownFail}`);
if (failed > 0) {
  console.log(`\nFailures:`);
  failures.forEach((f) => console.log(f));
}
console.log(`──────────────────────────────────────────\n`);

if (typeof process !== 'undefined' && (process as any).exit) {
  (process as any).exit(failed > 0 ? 1 : 0);
}
