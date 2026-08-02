/*
 * Run the real pattern engine over a real Chaos Command export.
 *
 * PHI: reads a local file, prints AGGREGATES ONLY (counts, trend directions,
 * tracker names). No entry text, no notes, no dates of birth, nothing that
 * leaves this machine. Never commit the input file.
 *
 * Usage: npx tsx scripts/_real-data-check.ts <path-to-export.json>
 */
import { readFileSync } from 'node:fs'
import { analyzeAllPatterns, computeSymptomTrends, computeTreatmentResponses } from '../lib/pattern-engine'
import { baseTrackerName } from '../lib/symptom-labels'

const path = process.argv[2]
const raw = JSON.parse(readFileSync(path, 'utf8'))
const rows: any[] = raw.daily_data || []

const NON_SYMPTOM = ['demographics', 'safety-plan', 'hope-reminders', 'employment-history',
  'disability-applications', 'missed-work', 'gaslight-garage']
const isSymptom = (s: string) => !!s && !NON_SYMPTOM.some(x => s === x || s.startsWith(x + '-'))

const trackers: Record<string, any[]> = {}
let dropped = 0
for (const r of rows) {
  if (r.category !== 'tracker') continue
  const sub = r.subcategory || ''
  if (!isSymptom(sub)) { dropped++; continue }
  const base = baseTrackerName(sub)
  ;(trackers[base] ||= []).push(r)
}

console.log(`\n=== GROUPING (${Object.keys(trackers).length} trackers, ${dropped} non-symptom dropped) ===`)
for (const [k, v] of Object.entries(trackers).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(v.length).padStart(3)}  ${k}`)
}

const trends = computeSymptomTrends(trackers as any)
const perSymptom = trends.filter(t => t.symptomId)

console.log(`\n=== TRENDS: ${trends.length} series (${perSymptom.length} per-symptom) ===`)
for (const dir of ['improving', 'worsening', 'no-clear-direction'] as const) {
  const list = perSymptom.filter(t => t.direction === dir)
  console.log(`\n--- ${dir.toUpperCase()} (${list.length}) ---`)
  for (const t of list.sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange))) {
    console.log(`  ${t.summary}`)
  }
}

const meds = (raw.daily_data || [])
  .filter((r: any) => String(r.subcategory || '').startsWith('medications-'))
  .map((r: any) => { try { return typeof r.content === 'string' ? JSON.parse(r.content) : r.content } catch { return null } })
  .filter(Boolean)
console.log(`\n=== MEDICATIONS: ${meds.length} records ===`)
for (const m of meds) {
  const nm = m.brandName || m.genericName || '(unnamed)'
  console.log(`  ${nm.padEnd(28)} dateStarted=${m.dateStarted || 'MISSING'}  dose=${m.dose || 'MISSING'}`)
}

const responses = computeTreatmentResponses(trackers as any, meds as any)
console.log(`\n=== TREATMENT RESPONSE: ${responses.length} ===`)
for (const r of responses) console.log(`  ${r.summary}`)

const res = analyzeAllPatterns(trackers as any)
console.log(`\n=== SUMMARY ===`)
console.log(`  ${res.summary.improvingCount} improving, ${res.summary.worseningCount} worsening`)
console.log(`  ${res.summary.insightCount} insights across ${res.summary.activeTrackers} trackers, ${res.summary.daysTracked} days`)
console.log(`\n  top trend insights:`)
for (const i of res.trends.slice(0, 12)) console.log(`    ${i.impact.padEnd(6)} ${i.title}`)
