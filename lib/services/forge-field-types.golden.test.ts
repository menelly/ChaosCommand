/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * forge-field-types.golden.test.ts — guards CHA-463 (tap severity in Forge).
 *
 * What this protects, in plain words:
 *   1. The new tap `severity` type is counted as a number, so it shows up in
 *      the trend stats and the doctor PDF instead of silently vanishing.
 *   2. The old slider `scale` type is still counted exactly as before —
 *      trackers people already built must not change underneath them.
 *   3. "Not reported" (blank) is never turned into a zero, and an explicit
 *      zero ("didn't bother me") is kept as a real answer.
 *   4. A broken `max` in a saved tracker can't make the buttons disappear.
 *
 * Run with `npm test` (scripts/run-goldens.mjs picks it up automatically).
 */

import {
  NUMERIC_FIELD_TYPES,
  isNumericFieldType,
  severityMaxFor,
  summarizeSeverity,
} from './forge-field-types'

let pass = 0, fail = 0
function check(cond: boolean, what: string) {
  if (cond) pass++
  else { fail++; console.log(`  ✗ FAIL: ${what}`) }
}

console.log('\n👆 forge-field-types golden suite (CHA-463)\n')

// --- 1 + 2: who counts as a number -----------------------------------------
check(isNumericFieldType('severity'), 'severity is numeric (else it is silently dropped from stats + PDF)')
for (const t of ['scale', 'number', 'percentage', 'duration']) {
  check(isNumericFieldType(t), `${t} is still numeric (unchanged)`)
}
for (const t of ['dropdown', 'checkbox', 'text', 'multiselect', 'tags', 'date', 'time', 'datetime', '', undefined, null]) {
  check(!isNumericFieldType(t as any), `${String(t)} is NOT numeric`)
}
check(NUMERIC_FIELD_TYPES.length === 5, 'exactly five numeric types (update this test on purpose if you add one)')

// --- 3: three states, not two ----------------------------------------------
const s = summarizeSeverity([7, undefined, '', null, 0, '3', 'junk', 5])
check(s !== null, 'summary exists when there are answers')
check(s!.answered === 4, `blanks/junk skipped, zero kept: answered=4 (got ${s!.answered})`)
check(s!.noneCount === 1, `one explicit "didn't bother me" (got ${s!.noneCount})`)
check(Math.abs(s!.mean - 3.75) < 1e-9, `mean includes the zero day: 3.75 (got ${s!.mean})`)
check(s!.lowest === 0 && s!.highest === 7, `range 0–7 (got ${s!.lowest}–${s!.highest})`)
check(summarizeSeverity([undefined, '', null]) === null, 'nothing answered → null, never an invented zero')
check(summarizeSeverity([]) === null, 'no entries → null')

// --- 4: a broken max can't break the buttons -------------------------------
check(severityMaxFor({ max: 10 }) === 10, 'max 10 kept')
check(severityMaxFor({ max: 5 }) === 5, 'max 5 kept')
check(severityMaxFor({}) === 10, 'missing max → 10')
check(severityMaxFor(undefined) === 10, 'missing field → 10')
check(severityMaxFor({ max: 0 }) === 10, 'max 0 → 10 (no zero-button scale)')
check(severityMaxFor({ max: 1000 }) === 10, 'max 1000 → 10 (a number-field default must not make 1000 buttons)')
check(severityMaxFor({ max: NaN }) === 10, 'NaN → 10')

console.log(`\n  ${pass} passed, ${fail} failed`)
if (fail > 0) { console.log('  ❌ FAIL\n'); process.exit(1) }
console.log('  ✅ PASS\n')
