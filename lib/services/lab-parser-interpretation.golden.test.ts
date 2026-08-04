/*
 * Golden: portal lab cards that carry an "Interpretation:" line.
 *
 * ⚠️ THE BUG THIS EXISTS TO PREVENT — and it failed in the worst direction.
 *
 * parseResultRangeFormat allowed only BLANK lines between "Result:" and
 * "Reference range:". Real portal exports put "Interpretation: High" in that
 * gap. The card then failed to match, the lab was dropped entirely, and the
 * NER pass scavenged the leftovers — filing "Reference range: 4 - 27 mm/hr"
 * and "Status: Final" onto the timeline as DIAGNOSES.
 *
 * 🚨 THE FAILURE WAS BIASED, WHICH IS WHY IT MATTERS.
 * NORMAL results usually carry no Interpretation line. ABNORMAL ones do.
 * So the parser systematically discarded the abnormal values and kept the
 * normal ones, building a lab history that reads healthier than the patient
 * is. A real CMP came back with every normal analyte present and chloride and
 * bicarbonate — the only two abnormals — missing.
 *
 * An app whose whole purpose is helping someone be believed must not quietly
 * delete the evidence.
 */

import { extractLabResults } from './lab-parser'

type Case = { name: string; run: () => void }
const cases: Case[] = []
const test = (name: string, run: () => void) => cases.push({ name, run })
const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg)
}

const rowsOf = (input: string): any[] => {
  const r: any = extractLabResults(input)
  return r?.results ?? r
}

const ESR_CARD = `ESR
Result: 30.0 mm/hr
Interpretation: High
Reference range: 4 - 27 mm/hr
Status: Final
`

/** Normals without an Interpretation line, abnormals with one — the exact
 *  shape that produced a one-sided CMP. */
const CMP = `Sodium
Result: 139 mmol/L
Reference range: 135 - 145 mmol/L
Status: Final

Potassium
Result: 4.1 mmol/L
Reference range: 3.5 - 5.1 mmol/L
Status: Final

Chloride
Result: 112 mmol/L
Interpretation: High
Reference range: 98 - 107 mmol/L
Status: Final

Bicarbonate
Result: 18 mmol/L
Interpretation: Low
Reference range: 22 - 29 mmol/L
Status: Final
`

test('a card with an Interpretation line is parsed at all', () => {
  const rows = rowsOf(ESR_CARD)
  assert(rows.length >= 1, `expected >=1 lab, got ${rows.length}`)
})

test('the analyte, value and unit survive', () => {
  const r = rowsOf(ESR_CARD)[0]
  assert(/esr/i.test(r.testName), `testName was ${r.testName}`)
  assert(r.value === 30, `value was ${r.value}`)
  assert(/mm\/hr/i.test(r.unit || ''), `unit was ${r.unit}`)
})

test('"Interpretation: High" becomes flag H', () => {
  const r = rowsOf(ESR_CARD)[0]
  assert(r.flag === 'H', `flag was ${r.flag}`)
  assert(r.isAbnormal === true, 'should be marked abnormal')
})

test('ABNORMAL results are not dropped while normals survive', () => {
  const rows = rowsOf(CMP)
  const names = rows.map(r => String(r.testName).toLowerCase())
  assert(rows.length === 4, `expected 4 analytes, got ${rows.length}: ${names.join(', ')}`)
  assert(names.some(n => n.includes('chloride')), 'chloride was dropped')
  assert(names.some(n => n.includes('bicarb')), 'bicarbonate was dropped')
})

test('worded interpretations map to the right direction', () => {
  const rows = rowsOf(CMP)
  const cl = rows.find(r => /chloride/i.test(r.testName))
  const bi = rows.find(r => /bicarb/i.test(r.testName))
  assert(cl?.flag === 'H', `chloride flag was ${cl?.flag}`)
  assert(bi?.flag === 'L', `bicarbonate flag was ${bi?.flag}`)
})

test('a normal result is not falsely flagged', () => {
  const rows = rowsOf(CMP)
  const na = rows.find(r => /sodium/i.test(r.testName))
  assert(!na?.isAbnormal, 'sodium 139 in 135-145 must not be abnormal')
})

// ── runner ──────────────────────────────────────────────────────────────────
let failed = 0
console.log('\nLAB PARSER — INTERPRETATION LINES')
for (const c of cases) {
  try {
    c.run()
    console.log(`  PASS  ${c.name}`)
  } catch (e: any) {
    failed++
    console.log(`  FAIL  ${c.name}\n        ${e.message}`)
  }
}
if (failed) {
  console.log(`\n${failed} lab-parser golden(s) failed.`)
  process.exit(1)
}
console.log('\nAll lab-parser interpretation goldens passed.')
