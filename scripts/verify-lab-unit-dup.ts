/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * verify-lab-unit-dup.ts — CHA-322 regression check.
 *
 * Confirms the lab parser no longer doubles the unit ("5 mg/dL mg/dL").
 * The invariant under test: LabResult.valueText holds the value ONLY (no
 * unit), so consumers that append `unit` produce a single unit.
 *
 * Run with Node 23+ (native TS type-stripping, no build step):
 *   node scripts/verify-lab-unit-dup.ts
 */

import { extractLabResults, labResultsToEvents, type LabResult } from '../lib/services/lab-parser'

let failures = 0
function check(name: string, cond: boolean, detail: string) {
  const tag = cond ? 'PASS' : 'FAIL'
  if (!cond) failures++
  console.log(`  [${tag}] ${name}${cond ? '' : ' — ' + detail}`)
}

// A unit appearing twice in a row, e.g. "mg/dL mg/dL" or "mm/hr mm/hr".
function hasDoubledUnit(s: string): boolean {
  return /(\b[A-Za-z%][A-Za-z%/]*)\s+\1\b/.test(s)
}

function reportLine(r: LabResult): string {
  // Mirrors the consumer contract: value text + separate unit.
  return `${r.valueText} ${r.unit}`.trim()
}

// ---------------------------------------------------------------------------
// Fixture 1: MyChart / Epic vertical format (hits parseVerticalFormat)
// ---------------------------------------------------------------------------
const verticalText = `Glucose
Test Date
01/15/2026
Test Location
Quest Diagnostics
Range (Normal)
70 - 99 mg/dL
Value
126 mg/dL
Interpretation
HIGH
`

// ---------------------------------------------------------------------------
// Fixture 2: Mayo / graphical two-column format (hits parseMayoFormat)
// ---------------------------------------------------------------------------
const mayoText = `Sedimentation Rate
Normal range: 0 - 20 mm/hr
31 High
Hemoglobin
Normal range: 12.0 - 16.0 g/dL
13.5
`

console.log('CHA-322 — lab unit-duplication regression check\n')

console.log('Vertical (MyChart) format:')
const vLabs = extractLabResults(verticalText)
check('parsed ≥1 lab', vLabs.length >= 1, `got ${vLabs.length}`)
for (const r of vLabs) {
  check(`valueText has no unit baked in (${r.testName})`, !/[a-zA-Z%/]/.test(r.valueText.replace(/^[<>]\s*/, '')), `valueText="${r.valueText}"`)
  check(`render not doubled (${r.testName})`, !hasDoubledUnit(reportLine(r)), `"${reportLine(r)}"`)
}
const vEvents = labResultsToEvents(vLabs, '2026-01-15')
for (const e of vEvents) check(`timeline title not doubled`, !hasDoubledUnit(e.title), `"${e.title}"`)

console.log('\nMayo / graphical format:')
const mLabs = extractLabResults(mayoText)
check('parsed ≥1 lab', mLabs.length >= 1, `got ${mLabs.length}`)
for (const r of mLabs) {
  check(`valueText has no unit baked in (${r.testName})`, !/[a-zA-Z%/]/.test(r.valueText.replace(/^[<>]\s*/, '')), `valueText="${r.valueText}"`)
  check(`render not doubled (${r.testName})`, !hasDoubledUnit(reportLine(r)), `"${reportLine(r)}"`)
}
const mEvents = labResultsToEvents(mLabs, '2026-01-15')
for (const e of mEvents) check(`timeline title not doubled`, !hasDoubledUnit(e.title), `"${e.title}"`)

console.log('\nSample rendered lines:')
for (const r of [...vLabs, ...mLabs]) console.log(`  ${r.testName}: "${reportLine(r)}"`)

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
