/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * lab-geometry.golden.test.ts — Golden suite for the geometry lab extractor.
 *
 * WHY THIS EXISTS
 * The geometry extractor (CHA-367) reconstructs lab columns from pdf.js token
 * x-positions instead of regexing flattened text. It's the primary path for grid
 * portals (LabCorp, CareSpace/Epic). This suite pins its load-bearing behavior
 * against SYNTHETIC token grids so the self-calibrating header/column logic can't
 * silently regress (specimen-code drop, previous-result-column ignore, raw units,
 * single-bound ranges, abnormal-flag inference).
 *
 * All fixtures are SYNTHETIC. No real PHI. Values + names are obviously fake.
 * Tokens are hand-placed at plausible x/y so the geometry behaves as it would on
 * a real PDF, WITHOUT shipping anyone's labs.
 *
 * HOW TO RUN (no test framework is installed in this repo yet):
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-out lib/services/lab-geometry.golden.test.ts
 *   node .tmp-out/lib/services/lab-geometry.golden.test.js
 * Exits non-zero if any assertion fails — drop-in for CI once a runner lands.
 */

import { extractLabResultsGeometry } from './lab-geometry';
import type { PdfToken } from './text-extractor';
import type { LabResult } from './lab-parser';

// --- tiny token-grid builder ------------------------------------------------
// row(y, [x, "text"], [x, "text"], ...) → tokens on one horizontal line.
function row(y: number, ...cells: Array<[number, string]>): PdfToken[] {
  return cells.map(([x, str]) => ({ x, y, str }));
}
function page(...rows: PdfToken[][]): PdfToken[] {
  return rows.flat();
}

// --- assert harness (framework-free, mirrors lab-parser.golden.test.ts) ------
let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; }
  else { fail++; console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
}
function find(rows: LabResult[], testName: string): LabResult | undefined {
  return rows.find((r) => r.testName.toLowerCase() === testName.toLowerCase());
}

const NO_EXCLUSIONS = new Set<string>();

console.log('\n📐 lab-geometry golden suite\n');

// ============================================================================
// FIXTURE 1 — LabCorp grid
//   columns: Test | (01 specimen) | Current Result and Flag | Previous Result | Units | Reference Interval
//   exercises: specimen-code drop, previous-result IGNORE column, raw unit
//   (x10E3/uL must NOT be mangled), High-flag, single-bound "<" range.
// ============================================================================
{
  const p = page(
    row(700, [50, 'Test'], [200, 'Current Result and Flag'], [350, 'Previous Result and Date'], [480, 'Units'], [560, 'Reference Interval']),
    // Glucose 105 High, previous 99, mg/dL, 65-99  → High by flag
    row(680, [50, 'Glucose'], [120, '01'], [200, '105'], [240, 'High'], [350, '99'], [480, 'mg/dL'], [560, '65-99']),
    // WBC 7.2, previous 6.8, x10E3/uL (RAW unit), 3.4-10.8 → normal
    row(660, [50, 'WBC'], [120, '01'], [200, '7.2'], [350, '6.8'], [480, 'x10E3/uL'], [560, '3.4-10.8']),
    // CRP <0.03, single-bound upper "<3.0" → normal (value below upper)
    row(640, [50, 'CRP'], [120, '02'], [200, '<0.03'], [480, 'mg/L'], [560, '<3.0']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);

  check('labcorp: 3 rows', rows.length === 3, `got ${rows.length}`);

  const glu = find(rows, 'Glucose');
  check('labcorp: glucose value 105', glu?.valueText === '105', glu?.valueText);
  check('labcorp: glucose unit mg/dL', glu?.unit === 'mg/dL', glu?.unit);
  check('labcorp: glucose flag High→H', glu?.flag === 'H', glu?.flag);
  check('labcorp: glucose abnormal', glu?.isAbnormal === true);
  check('labcorp: glucose ref 65-99', glu?.referenceLow === 65 && glu?.referenceHigh === 99,
    `${glu?.referenceLow}-${glu?.referenceHigh}`);
  check('labcorp: glucose did NOT absorb previous-result 99 as value', glu?.valueText !== '99');

  const wbc = find(rows, 'WBC');
  check('labcorp: WBC raw unit x10E3/uL intact', wbc?.unit === 'x10E3/uL', wbc?.unit);
  check('labcorp: WBC value 7.2', wbc?.valueText === '7.2', wbc?.valueText);
  check('labcorp: WBC normal (no flag)', wbc?.isAbnormal === false && wbc?.flag === '');

  const crp = find(rows, 'CRP');
  check('labcorp: CRP value <0.03 preserved', crp?.valueText === '<0.03', crp?.valueText);
  check('labcorp: CRP single-bound upper 3.0', crp?.referenceHigh === 3.0 && crp?.referenceLow === null,
    `${crp?.referenceLow}/${crp?.referenceHigh}`);
  check('labcorp: CRP normal (0.03 < 3.0)', crp?.isAbnormal === false);
}

// ============================================================================
// FIXTURE 2 — CareSpace/Epic grid
//   columns: Lab | Your result | Normal range   (unit trails inside range cell)
//   exercises: header synonyms (Lab/Your result/Normal range), unit-from-range,
//   abnormal-by-bounds inference (no explicit flag token).
// ============================================================================
{
  const p = page(
    row(700, [50, 'Lab'], [250, 'Your result'], [450, 'Normal range']),
    // Sodium 140, 135-145 mmol/L → normal, unit pulled from range cell
    row(680, [50, 'Sodium'], [250, '140'], [450, '135-145'], [520, 'mmol/L']),
    // Potassium 5.9, 3.5-5.1 mmol/L → HIGH by bounds (no flag token present)
    row(660, [50, 'Potassium'], [250, '5.9'], [450, '3.5-5.1'], [520, 'mmol/L']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);

  check('carespace: 2 rows', rows.length === 2, `got ${rows.length}`);

  const na = find(rows, 'Sodium');
  check('carespace: sodium value 140', na?.valueText === '140', na?.valueText);
  check('carespace: sodium unit-from-range mmol/L', na?.unit === 'mmol/L', na?.unit);
  check('carespace: sodium ref 135-145', na?.referenceLow === 135 && na?.referenceHigh === 145);
  check('carespace: sodium normal', na?.isAbnormal === false);

  const k = find(rows, 'Potassium');
  check('carespace: potassium abnormal-by-bounds (5.9 > 5.1)', k?.isAbnormal === true && k?.flag === 'H',
    `abnormal=${k?.isAbnormal} flag=${k?.flag}`);
}

// ============================================================================
// FIXTURE 3 — no header → geometry returns [] (dispatcher falls through to text)
//   A prose page (rad-report style) has no name/value/range header row.
// ============================================================================
{
  const p = page(
    row(700, [50, 'CLINICAL'], [120, 'HISTORY:'], [220, 'Neck'], [260, 'pain']),
    row(680, [50, 'IMPRESSION:']),
    row(660, [50, 'Congenital'], [130, 'nonunion'], [210, 'posterior'], [300, 'C1']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);
  check('no-header: geometry returns [] (lets text parsers run)', rows.length === 0, `got ${rows.length}`);
}

// ============================================================================
// FIXTURE 4 — demographics exclusion respected
//   A token row whose "name" matches an excluded term must be dropped.
// ============================================================================
{
  const p = page(
    row(700, [50, 'Test'], [200, 'Result'], [560, 'Reference Interval']),
    row(680, [50, 'Glucose'], [200, '90'], [560, '65-99']),
    row(660, [50, 'Shalia'], [200, '42'], [560, '10-50']), // a name leaking into the table
  );
  const rows = extractLabResultsGeometry([p], new Set(['shalia']));
  check('exclusion: excluded name dropped', find(rows, 'Shalia') === undefined);
  check('exclusion: real lab kept', find(rows, 'Glucose')?.valueText === '90');
}

// ============================================================================
// FIXTURE 5 — per-result Date/Time field (structured date extraction)
//   "Date/Time 09/18/2020 8:32 AM Ferritin" → name "Ferritin" + date 2020-09-18.
//   The date is a STRUCTURED field: parse it (capturing the real collection
//   date) and remove it from the name. (Semantic pollution stays NER's job.)
// ============================================================================
{
  const p = page(
    row(700, [50, 'Lab'], [400, 'Your result'], [550, 'Normal range']),
    row(680, [30, 'Date/Time'], [80, '09/18/2020'], [140, '8:32'], [175, 'AM'], [210, 'Ferritin'],
            [400, '24.40'], [550, '10-200'], [620, 'ng/mL']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);

  check('date: 1 row', rows.length === 1, `got ${rows.length}`);
  const fer = find(rows, 'Ferritin');
  check('date: name de-dated to "Ferritin"', fer?.testName === 'Ferritin', fer?.testName);
  check('date: collection date parsed → 2020-09-18', fer?.date === '2020-09-18', fer?.date);
  check('date: value 24.40 intact', fer?.valueText === '24.40', fer?.valueText);
  check('date: unit ng/mL intact', fer?.unit === 'ng/mL', fer?.unit);
}

// ============================================================================
// FIXTURE 6 — LabCorp "TESTS | RESULT | FLAG | UNITS | REFERENCE INTERVAL | LAB"
//   The real-world miss Ren caught: an abnormal RA Factor (21.2 HIGH, ref
//   0.0-13.9) was silently dropped to "0 results" because:
//     (a) the header "TESTS" (plural) didn't match \btest\b, so the rightmost
//         "LAB" code column wrongly claimed the name role; and
//     (b) the FLAG column had no role, so "High" mis-bucketed into units.
//   This locks both: TESTS→name, dedicated FLAG column, LAB code ignored.
//   SAFETY-CRITICAL: a dropped abnormal is the exact failure the product exists
//   to prevent.
// ============================================================================
{
  const p = page(
    row(700, [720, 'TESTS'], [890, 'RESULT'], [990, 'FLAG'], [1090, 'UNITS'],
            [1180, 'REFERENCE'], [1280, 'INTERVAL'], [1360, 'LAB']),
    // Category header line — name only, no value → correctly skipped.
    row(685, [595, 'Rheumatoid'], [660, 'Arthritis'], [710, 'Factor']),
    // The result line. "01" at far right is the specimen/lab code (dropped).
    row(670, [595, 'RA'], [640, 'Latex'], [700, 'Turbid.'],
            [910, '21.2'], [990, 'High'], [1095, 'IU/mL'], [1190, '0.0-13.9'], [1355, '01']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);

  check('labcorp-flag: exactly 1 row (NOT 0 — the dropped-abnormal bug)', rows.length === 1, `got ${rows.length}`);
  const ra = rows[0];
  check('labcorp-flag: name = "RA Latex Turbid."', ra?.testName === 'RA Latex Turbid.', ra?.testName);
  check('labcorp-flag: value 21.2', ra?.valueText === '21.2', ra?.valueText);
  check('labcorp-flag: FLAG column → High→H', ra?.flag === 'H', ra?.flag);
  check('labcorp-flag: abnormal', ra?.isAbnormal === true);
  check('labcorp-flag: unit IU/mL (not polluted by "High")', ra?.unit === 'IU/mL', ra?.unit);
  check('labcorp-flag: ref 0.0-13.9', ra?.referenceLow === 0 && ra?.referenceHigh === 13.9,
    `${ra?.referenceLow}-${ra?.referenceHigh}`);
  check('labcorp-flag: name not "01" (lab code did not claim name)', ra?.testName !== '01');
}

// ============================================================================
// FIXTURE 7 — Quest 2-column (Analyte | Value), FUSED value+flag and FUSED
//   "Reference Range: lo-hi unit" tokens. The real-world bug Ren caught on a
//   Quest CBC/panel: a ferritin of 5 (flag L, ref 16-154 ng/mL) was SILENTLY
//   DROPPED — pdf.js emits the value cell as ONE token "5 L", which the bare-
//   numeric VAL test rejected, so the row produced no value and was discarded.
//   Every ABNORMAL Quest row (the clinically important ones) vanished this way,
//   and ALL units were lost because the unit lives inside the fused reference
//   token (or as a bare "%" token) that collapsed into the value bucket.
//   Mirrors the real pdf.js geometry: name@~68, "N FLAG"@~344, fused ref@~368,
//   under a 2-anchor "Analyte | Value" header.
// ============================================================================
{
  const p = page(
    row(700, [57, 'Analyte'], [335, 'Value']),
    row(680, [68, 'FERRITIN'], [344, '5 L'], [368, 'Reference Range: 16-154 ng/mL']),
    row(640, [57, 'Analyte'], [335, 'Value']),
    row(620, [57, 'NEUTROPHILS'], [341, '64.9'], [368, '%']),
    row(600, [57, 'GLUCOSE'], [341, '82'], [368, 'Reference Range: 65-99 mg/dL']),
    row(580, [57, 'POTASSIUM'], [341, '13.0 H'], [368, 'Reference Range: 3.5-5.1 mmol/L']),
  );
  const rows = extractLabResultsGeometry([p], NO_EXCLUSIONS);

  const fer = find(rows, 'FERRITIN');
  check('quest: ferritin row NOT dropped (the abnormal-drop bug)', !!fer,
    `extracted: [${rows.map((r) => r.testName).join(', ')}]`);
  check('quest: ferritin value = 5', fer?.valueText === '5', fer?.valueText);
  check('quest: ferritin flag L', fer?.flag === 'L', fer?.flag);
  check('quest: ferritin abnormal', fer?.isAbnormal === true);
  check('quest: ferritin unit ng/mL (from fused ref token)', fer?.unit === 'ng/mL', fer?.unit);
  check('quest: ferritin ref 16-154', fer?.referenceLow === 16 && fer?.referenceHigh === 154,
    `${fer?.referenceLow}-${fer?.referenceHigh}`);

  const neu = find(rows, 'NEUTROPHILS');
  check('quest: CBC bare-unit "%" captured', neu?.unit === '%', neu?.unit);
  check('quest: neutrophils value 64.9', neu?.valueText === '64.9', neu?.valueText);

  const glu = find(rows, 'GLUCOSE');
  check('quest: glucose unit mg/dL (fused ref)', glu?.unit === 'mg/dL', glu?.unit);
  check('quest: glucose ref 65-99', glu?.referenceLow === 65 && glu?.referenceHigh === 99,
    `${glu?.referenceLow}-${glu?.referenceHigh}`);
  check('quest: glucose in-range → not abnormal', glu?.isAbnormal === false);

  const k = find(rows, 'POTASSIUM');
  check('quest: potassium row NOT dropped (fused "13.0 H")', !!k);
  check('quest: potassium value 13.0 + flag H', k?.valueText === '13.0' && k?.flag === 'H',
    `${k?.valueText}/${k?.flag}`);
  check('quest: potassium unit mmol/L', k?.unit === 'mmol/L', k?.unit);
}

// --- summary ----------------------------------------------------------------
console.log('\n──────────────────────────────────────────');
console.log(`PASS: ${pass}   FAIL: ${fail}`);
console.log('──────────────────────────────────────────\n');
if (fail > 0) process.exit(1);
