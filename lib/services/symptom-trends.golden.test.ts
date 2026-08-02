/*
 * GOLDEN — symptom trends end to end, on the record shapes the app actually
 * writes (content.entries[] carrying episodeType + severity).
 *
 * `trend-analysis.golden.test.ts` covers the statistics. This one covers the
 * part that was actually broken: the engine analysed TRACKERS when the signal
 * lives in SYMPTOMS, so one symptom's recovery was averaged away against
 * another sitting beside it in the same tracker, and the report said nothing.
 * Found by a user (2026-08-02) who was logging improvements the generated
 * document never mentioned.
 */
import { analyzeAllPatterns, computeSymptomTrends, computeTreatmentResponses } from '../pattern-engine'

const rec = (date: string, subcategory: string, entries: any[]) => ({
  date, subcategory, category: 'tracker', content: { entries },
} as any)

// A neuro tracker where one symptom recovers under treatment while another
// stays stubborn — the exact pair the old engine averaged into silence.
const data: Record<string, any[]> = {
  neuro: [
    rec('2026-06-20', 'neuro', [
      { episodeType: 'speech-swallow', severity: 5 },
      { episodeType: 'weakness', severity: 9 },
    ]),
    rec('2026-07-05', 'neuro', [
      { episodeType: 'speech-swallow', severity: 4 },
      { episodeType: 'weakness', severity: 6 },
    ]),
    rec('2026-07-20', 'neuro', [
      { episodeType: 'speech-swallow', severity: 3 },
      { episodeType: 'weakness', severity: 6 },
    ]),
    rec('2026-08-01', 'neuro', [
      { episodeType: 'speech-swallow', severity: 1 },
      { episodeType: 'weakness', severity: 5 },
    ]),
  ],
  // Five entries — under the OLD floor of ten, so this was silent no matter what.
  respiratory: [
    rec('2026-07-01', 'respiratory', [{ episodeType: 'shortness-of-breath', severity: 7 }]),
    rec('2026-07-10', 'respiratory', [{ episodeType: 'shortness-of-breath', severity: 6 }]),
    rec('2026-07-18', 'respiratory', [{ episodeType: 'shortness-of-breath', severity: 4 }]),
    rec('2026-07-25', 'respiratory', [{ episodeType: 'shortness-of-breath', severity: 3 }]),
    rec('2026-08-01', 'respiratory', [{ episodeType: 'shortness-of-breath', severity: 2 }]),
  ],
  // A wellbeing scale that is RISING — must read as improving, not worsening.
  'mind-mood': [
    rec('2026-07-01', 'mind-mood', [{ episodeType: 'general', mood: 3 }]),
    rec('2026-07-10', 'mind-mood', [{ episodeType: 'general', mood: 5 }]),
    rec('2026-07-20', 'mind-mood', [{ episodeType: 'general', mood: 6 }]),
    rec('2026-08-01', 'mind-mood', [{ episodeType: 'general', mood: 8 }]),
  ],
  // Unknown slug on a tracker with no canon — must not vanish.
  'custom-trackers': [
    rec('2026-07-01', 'custom-trackers', [{ episodeType: 'jaw_clenching', severity: 8 }]),
    rec('2026-07-15', 'custom-trackers', [{ episodeType: 'jaw_clenching', severity: 5 }]),
    rec('2026-08-01', 'custom-trackers', [{ episodeType: 'jaw_clenching', severity: 2 }]),
  ],
}

const trends = computeSymptomTrends(data)
console.log(`\n${trends.length} series computed\n`)
for (const t of trends) {
  console.log(`  [${t.direction.toUpperCase()}] ${t.summary}`)
}

const res = analyzeAllPatterns(data)
console.log(`\nsummary: ${res.summary.improvingCount} improving, ${res.summary.worseningCount} worsening`)
console.log(`\ntrend insights (${res.trends.length}):`)
for (const i of res.trends) console.log(`  ${i.impact.padEnd(6)} conf=${String(i.confidence).padStart(2)}  ${i.title}`)

// --- the definition of done -------------------------------------------------
const swallow = trends.find(t => t.tracker === 'neuro' && t.symptomId === 'speech-swallow')
const mood = trends.find(t => t.tracker === 'mind-mood' && t.symptomId === 'general')
const custom = trends.find(t => t.tracker === 'custom-trackers')
const resp = trends.find(t => t.tracker === 'respiratory' && t.symptomId)

const checks: [string, boolean][] = [
  ['the recovering symptom has its own series', !!swallow],
  ['it is reported IMPROVING', swallow?.direction === 'improving'],
  ['it is labelled from the tracker canon', swallow?.symptomLabel === 'Speech / Swallowing'],
  ['the summary names when it started', !!swallow?.firstDate && swallow.summary.includes('Jun')],
  ['respiratory (n=5, was silent) is IMPROVING', resp?.direction === 'improving'],
  ['rising mood reads as IMPROVING', mood?.direction === 'improving'],
  ['unknown slug survives with a readable label', custom?.symptomLabel === 'Jaw Clenching'],
  ['weakness is its own series', !!trends.find(t => t.symptomId === 'weakness')],
  ['whole-tracker series still produced', !!trends.find(t => t.tracker === 'neuro' && t.symptomId === null)],
]
console.log('')
let bad = 0
for (const [name, ok] of checks) { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`) }
console.log(bad === 0 ? '\nDEFINITION OF DONE: met.' : `\n${bad} FAILED`)

// --- treatment response -----------------------------------------------------
const meds = [
  { genericName: 'treatment-a', dateStarted: '2026-07-16' },
  { genericName: 'started-yesterday', dateStarted: '2026-08-01' },  // no "since" data
  { genericName: 'no-date-recorded' },
]
const denseNeuro: Record<string, any[]> = {
  neuro: ([
    ['2026-06-20', 6], ['2026-06-25', 5], ['2026-07-01', 6], ['2026-07-08', 5],
    ['2026-07-14', 5], ['2026-07-18', 3], ['2026-07-22', 2], ['2026-07-28', 2],
    ['2026-08-01', 1],
  ] as [string, number][]).map(([d, v]) => rec(d, 'neuro', [{ episodeType: 'speech-swallow', severity: v }])),
}
const responses = computeTreatmentResponses(denseNeuro, meds as any)
console.log(`\ntreatment responses (${responses.length}):`)
for (const r of responses) console.log('  ' + r.summary)

const tchecks: [string, boolean][] = [
  // The contract changed on 2026-08-02 from PER-DRUG attribution to treatment
  // WINDOWS, after a user pointed out that the report was crediting a
  // slow-acting drug with an improvement it could not yet have caused, while
  // saying nothing about the side effects it WAS causing. The asymmetry is the
  // proof of the error: a report that assigns benefits and ignores harms is
  // arguing, not reporting. These assertions pin the new, un-attributed shape.
  ['the treatment window is detected', responses.some(r => r.medications.includes('treatment-a'))],
  ['the window direction is improving', responses.find(r => r.medications.includes('treatment-a'))?.direction === 'improving'],
  ['the summary names the window start date', !!responses.find(r => r.medications.includes('treatment-a'))?.summary.includes('2026-07-16')],
  // Treatments started close together are GROUPED, not reported separately —
  // with sparse entries they produce identical numbers, and three rows of one
  // observation reads as three independent confirmations.
  ['co-started treatments share one window',
    responses.filter(r => r.medications.includes('treatment-a')).every(r => r.medications.includes('started-yesterday'))],
  ['every co-started treatment is NAMED, so a clinician can weigh onset times',
    !!responses.find(r => r.medications.length > 1)?.summary.includes('started-yesterday')],
  ['a multi-treatment window says it cannot separate them',
    !!responses.find(r => r.medications.length > 1)?.summary.includes('cannot distinguish')],
  // A treatment with no recorded start date cannot be placed on the timeline
  // at all, so it must not appear.
  ['a drug with no start date is excluded', !responses.some(r => r.medications.includes('no-date-recorded'))],
  // The old wording is gone: no sentence may claim a named drug did it.
  ['no summary claims a single drug caused the change',
    responses.every(r => !/since \w+ was started/.test(r.summary))],
  ['no medications at all returns empty', computeTreatmentResponses(denseNeuro, []).length === 0],
]
console.log('')
for (const [name, ok] of tchecks) { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`) }
console.log(bad === 0 ? '\nALL CHECKS PASSED.\n' : `\n${bad} FAILED\n`)
process.exit(bad === 0 ? 0 : 1)
