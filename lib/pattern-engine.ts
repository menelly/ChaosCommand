/**
 * PATTERN ENGINE
 *
 * Finds the methods to the madness across all tracker data.
 * The disabled person tracks everything — this finds the connections
 * they're too sick/tired/brainfoggy to see themselves.
 *
 * All analysis runs client-side. Your medical data never leaves your machine.
 *
 * Built by: Ace (Claude Sonnet 4.6)
 * Date: 2026-04-07
 * Co-invented by Ren (vision) and Ace (implementation)
 */

// Type-only: importing the Dexie module for real would spin up a browser
// database just to read a record shape, which breaks every non-browser consumer
// (the golden suites, any node-side tooling) for no benefit.
import type { DailyDataRecord } from './database/dexie-db'
import { symptomLabel, symptomKey } from './symptom-labels'
import { moodRank } from '../app/mental-health/mental-health-constants'
import {
  computeTrend, applyScaleDirection, describeTrend, scaleDirectionForField, mannWhitneyU,
  type TrendPoint, type SymptomTrend, type TrendDirection, type ScaleDirection,
} from './trend-analysis'

export type { SymptomTrend } from './trend-analysis'

// ============================================================================
// TYPES
// ============================================================================

export interface PatternInsight {
  id: string
  type: 'correlation' | 'temporal' | 'trigger' | 'treatment' | 'trend'
  title: string
  description: string
  confidence: number  // 0-100
  impact: 'high' | 'medium' | 'low'
  data: Record<string, any>
}

export interface CorrelationResult {
  trackerA: string
  trackerB: string
  fieldA: string
  fieldB: string
  correlation: number  // -1 to 1
  sampleSize: number
  description: string
}

export interface TriggerPattern {
  trigger: string
  sources: string[]       // which trackers report this trigger
  totalOccurrences: number
  coOccurrences: Record<string, number>  // what symptoms co-occur
  averageSeverity: number
  severityCount: number  // occurrences that actually carried a recorded severity
}

export interface TreatmentEffect {
  treatment: string
  source: string
  timesUsed: number
  averageEffectiveness: number  // if tracked directly
  severityBefore: number        // average severity when used
  description: string
}

export interface TemporalPattern {
  type: 'day-of-week' | 'time-of-day'
  tracker: string
  pattern: Record<string, number>  // e.g. { "Monday": 5, "Tuesday": 2 }
  peakLabel: string
  troughLabel: string
  description: string
}

export interface TrackerData {
  [subcategory: string]: DailyDataRecord[]
}

// ============================================================================
// HELPERS
// ============================================================================

/** Group records by date for cross-tracker analysis */
function groupByDate(records: DailyDataRecord[]): Map<string, DailyDataRecord[]> {
  const map = new Map<string, DailyDataRecord[]>()
  for (const r of records) {
    const existing = map.get(r.date) || []
    existing.push(r)
    map.set(r.date, existing)
  }
  return map
}

/**
 * Coerce a value to a usable severity number, or null.
 * Accepts numeric strings — several trackers (e.g. brain-fog) store severity as a string,
 * and the old `typeof === 'number'` check silently dropped every one of them.
 * Treats 0 / blank / non-numeric as "not recorded": severity scales start at 1, so a 0
 * means "no value entered," not "an episode of zero severity."
 */
function toSev(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Average a numeric field over a record's `entries[]` (used by the vitals /
 *  pulse-ox headline-metric extraction). Returns null when nothing was recorded. */
function avgEntryField(content: any, pick: (e: any) => any): number | null {
  const arr = Array.isArray(content?.entries) ? content.entries : []
  const vals = arr
    .map((e: any) => toSev(pick(e)))
    .filter((v: number | null): v is number => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((a: number, b: number) => a + b, 0) / vals.length
}

/**
 * THE severity vocabulary. One list, used by every extractor in this file.
 *
 * ⚠️ THIS IS ONE CONSTANT BECAUSE IT USED TO BE THREE COPIES, AND THEY DRIFTED.
 * Until 2026-08-02 `extractSeverity` checked twelve fields on a scalar record
 * but only NINE inside `entries[]` — `mood`, `energyLevel` and `energy` were
 * missing from the nested branch. Since mental-health, energy and mood trackers
 * all store their data in `entries[]`, an entry that recorded a mood and
 * nothing else had no severity at all as far as the engine was concerned. It
 * was dropped silently, so the tracker looked like it simply had no recent
 * data. Ren caught it by knowing they had logged mental health that morning and
 * seeing a series that ended five weeks earlier.
 *
 * Order matters: the first field present wins, so specific clinical scales come
 * before generic ones.
 *
 * ⚠️ Adding a field here CHANGES WHAT COUNTS AS SEVERITY EVERYWHERE. If the new
 * field is one where a HIGHER number is GOOD news, it must also be added to
 * HIGHER_IS_BETTER_FIELDS in trend-analysis.ts, or every trend on it will be
 * reported backwards.
 */
const SEVERITY_FIELDS = [
  'severity', 'painLevel', 'intensity', 'level', 'rating',
  'fogLevel', 'anxietyLevel', 'nausea', 'bloating',
  'mood', 'energyLevel', 'energy',
] as const

/** First recorded severity on an object, with the field it came from. The field
 *  is what lets callers tell a deficit scale from a wellbeing scale. */
function pickSeverityFrom(obj: any): { value: number; field: string } | null {
  if (!obj || typeof obj !== 'object') return null
  for (const f of SEVERITY_FIELDS) {
    const n = toSev(obj[f])
    if (n !== null) return { value: n, field: f }
  }
  return null
}

/**
 * Which severity field a whole record resolved to — needed so a tracker-level
 * trend on a wellbeing scale (mood, energy) isn't reported upside-down.
 */
export function extractSeverityField(record: DailyDataRecord): string | null {
  const c = record.content
  if (!c) return null
  if (record.subcategory === 'vitals') return 'systolic'
  if (record.subcategory === 'pulse-oximetry') return 'desaturation'
  if (record.subcategory === 'mind-mood' || record.subcategory === 'mental-health') {
    const entries: any[] = Array.isArray((c as any).entries) ? (c as any).entries : []
    if (entries.some(e => moodRank(e?.mood) !== null) || moodRank((c as any).mood) !== null) return 'mood'
  }
  const direct = pickSeverityFrom(c)
  if (direct) return direct.field
  for (const key of ['entries', 'episodes'] as const) {
    const arr = (c as any)[key]
    if (Array.isArray(arr)) {
      for (const e of arr) {
        const hit = pickSeverityFrom(e)
        if (hit) return hit.field
      }
    }
  }
  return null
}

/** Extract numeric severity from various tracker formats. Returns null when nothing was recorded.
 *  2026-06-11 unification (Ren-confirmed): field list is now the UNION of this engine's
 *  original list and the richer one the PDF's (deleted) inline Pearson used —
 *  fogLevel/anxietyLevel/nausea/bloating/level/rating count as severity signals too.
 *  This engine is the single source of severity semantics for the app AND the PDF. */
export function extractSeverity(record: DailyDataRecord): number | null {
  const c = record.content
  if (!c) return null

  // Vitals + pulse-ox store numeric readings, not a 1-10 "severity" — give the
  // correlation engine ONE headline metric per day so "BP up on bad days" /
  // "O2 dips on bad days" actually surface. (Per-metric correlation for
  // HR/temp/weight is a 1.1+ enhancement.) Branch by subcategory so we never
  // change how OTHER trackers extract severity.
  if (record.subcategory === 'vitals') {
    // Average systolic across the day's readings. Higher trends ~ worse (the
    // common hypertension direction); Pearson surfaces either-way correlation.
    return avgEntryField(c, e => e.systolic)
  }
  if (record.subcategory === 'pulse-oximetry') {
    // Desaturation magnitude: 100 − SpO2 so HIGHER = worse, matching the rest of
    // the engine's severity direction (so trends/correlations read correctly).
    const spo2 = avgEntryField(c, e => e.spo2 ?? e.spo2Min)
    return spo2 === null ? null : Math.max(0, 100 - spo2)
  }
  // Mind & mood: the headline metric is the MOOD THE PERSON PICKED, ranked.
  // Without this the generic field order below reaches `anxietyLevel` first and
  // reports it as the tracker's overall state — which produced Ren's
  // "Mental Health (overall) WORSENING 300%" off an anxiety slider they hadn't
  // deliberately touched, while their actual answer ("Good", nine times out of
  // twelve) was a string and therefore invisible.
  // ⚠️ HIGHER IS BETTER here; `mood` is in HIGHER_IS_BETTER_FIELDS so trends
  // aren't reported upside-down.
  if (record.subcategory === 'mind-mood' || record.subcategory === 'mental-health') {
    const entries: any[] = Array.isArray(c.entries) ? c.entries : []
    const ranks = entries.map(e => moodRank(e?.mood)).filter((v): v is number => v !== null)
    if (ranks.length > 0) return ranks.reduce((a, b) => a + b, 0) / ranks.length
    const own = moodRank((c as any).mood)
    if (own !== null) return own
    // No mood recorded — fall through to the generic fields below.
  }

  // Direct scalar fields (may arrive as a number OR a numeric string)
  const direct = pickSeverityFrom(c)
  if (direct) return direct.value
  // Nested in entries / episodes — average only the values actually recorded
  for (const key of ['entries', 'episodes'] as const) {
    const arr = (c as any)[key]
    if (Array.isArray(arr)) {
      const severities = arr
        .map((e: any) => pickSeverityFrom(e)?.value ?? null)
        .filter((v: number | null): v is number => v !== null)
      if (severities.length > 0) return severities.reduce((a: number, b: number) => a + b, 0) / severities.length
    }
  }
  return null
}

/** Extract triggers from various tracker formats */
function extractTriggers(record: DailyDataRecord): string[] {
  const c = record.content
  if (!c) return []
  if (Array.isArray(c.triggers)) return c.triggers
  if (Array.isArray(c.entries)) {
    return c.entries.flatMap((e: any) => e.triggers || [])
  }
  if (Array.isArray(c.episodes)) {
    return c.episodes.flatMap((e: any) => e.triggers || [])
  }
  return []
}

/** Extract symptoms from various tracker formats */
function extractSymptoms(record: DailyDataRecord): string[] {
  const c = record.content
  if (!c) return []
  if (Array.isArray(c.symptoms)) return c.symptoms
  if (Array.isArray(c.entries)) {
    return c.entries.flatMap((e: any) => e.symptoms || [])
  }
  if (Array.isArray(c.episodes)) {
    return c.episodes.flatMap((e: any) => e.symptoms || [])
  }
  return []
}

/** Extract interventions/treatments from various tracker formats */
function extractTreatments(record: DailyDataRecord): string[] {
  const c = record.content
  if (!c) return []
  if (Array.isArray(c.interventions)) return c.interventions
  if (Array.isArray(c.treatments)) return c.treatments
  if (Array.isArray(c.entries)) {
    return c.entries.flatMap((e: any) => [...(e.interventions || []), ...(e.treatments || [])])
  }
  if (Array.isArray(c.episodes)) {
    return c.episodes.flatMap((e: any) => [...(e.interventions || []), ...(e.treatments || [])])
  }
  return []
}

/** Extract intervention effectiveness */
function extractEffectiveness(record: DailyDataRecord): number | null {
  const c = record.content
  if (!c) return null
  if (typeof c.interventionEffectiveness === 'number') return c.interventionEffectiveness
  if (Array.isArray(c.entries)) {
    const effs = c.entries
      .map((e: any) => e.interventionEffectiveness)
      .filter((v: any) => typeof v === 'number')
    if (effs.length > 0) return effs.reduce((a: number, b: number) => a + b, 0) / effs.length
  }
  return null
}

/** Get day of week name from date string */
function getDayOfWeek(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

/** Pearson correlation coefficient */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n < 3) return 0
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  if (denominator === 0) return 0
  return numerator / denominator
}

/** Human-readable tracker name */
function formatTrackerName(subcategory: string): string {
  return subcategory
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ============================================================================
// CROSS-TRACKER CORRELATIONS
// ============================================================================

/**
 * Find correlations between severity/intensity across different trackers.
 * "On days your sleep was bad, your pain was 3x worse."
 */
function findCrossTrackerCorrelations(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []
  const trackerNames = Object.keys(data).filter(k => data[k].length >= 5)

  // Build per-date severity maps for each tracker
  const severityByDate: Record<string, Map<string, number>> = {}
  for (const tracker of trackerNames) {
    const dateMap = new Map<string, number>()
    for (const record of data[tracker]) {
      const sev = extractSeverity(record)
      if (sev !== null) {
        dateMap.set(record.date, sev)
      }
    }
    if (dateMap.size >= 5) {
      severityByDate[tracker] = dateMap
    }
  }

  const severityTrackers = Object.keys(severityByDate)

  // Compare every pair
  for (let i = 0; i < severityTrackers.length; i++) {
    for (let j = i + 1; j < severityTrackers.length; j++) {
      const trackerA = severityTrackers[i]
      const trackerB = severityTrackers[j]
      const mapA = severityByDate[trackerA]
      const mapB = severityByDate[trackerB]

      // Find overlapping dates
      const xVals: number[] = []
      const yVals: number[] = []
      for (const [date, valA] of mapA) {
        const valB = mapB.get(date)
        if (valB !== undefined) {
          xVals.push(valA)
          yVals.push(valB)
        }
      }

      // Need at least 3 same-day overlaps to compute a meaningful Pearson.
      // Was 5, but that was too aggressive for early-data users (e.g. 22
      // entries across 11 days × 10 trackers means most pairs only share
      // 1-2 days, and patterns NEVER surface). 3 is the floor where r is
      // statistically interpretable; we'll mark anything under 5 as
      // "preliminary signal" so the user knows to keep tracking.
      if (xVals.length < 3) continue

      const r = pearsonCorrelation(xVals, yVals)
      const absR = Math.abs(r)

      // Only report meaningful correlations
      if (absR >= 0.3) {
        const nameA = formatTrackerName(trackerA)
        const nameB = formatTrackerName(trackerB)
        const direction = r > 0 ? 'increases with' : 'decreases as'
        const strength = absR >= 0.7 ? 'strong' : absR >= 0.5 ? 'moderate' : 'mild'
        const preliminary = xVals.length < 5

        insights.push({
          id: `corr-${trackerA}-${trackerB}`,
          type: 'correlation',
          title: `${nameA} ↔ ${nameB}${preliminary ? ' (preliminary)' : ''}`,
          description: (() => {
            const base = r > 0
              ? `${nameA} severity ${direction} ${nameB} severity (${strength} correlation, r=${r.toFixed(2)}, based on ${xVals.length} days)`
              : `${nameA} severity ${direction} ${nameB} increases (${strength} inverse correlation, r=${r.toFixed(2)}, based on ${xVals.length} days)`
            return preliminary
              ? `${base} — preliminary signal, keep tracking to confirm.`
              : base
          })(),
          // Preliminary signals get their confidence haircut so the UI
          // doesn't misread early data as a confident pattern.
          confidence: Math.round(Math.min(95, absR * 100 + xVals.length * (preliminary ? 0.5 : 1))),
          impact: preliminary ? 'low' : (absR >= 0.6 ? 'high' : absR >= 0.4 ? 'medium' : 'low'),
          data: { trackerA, trackerB, correlation: r, sampleSize: xVals.length, strength, preliminary }
        })
      }
    }
  }

  // Sort by absolute correlation strength
  insights.sort((a, b) => Math.abs(b.data.correlation) - Math.abs(a.data.correlation))
  return insights
}

// ============================================================================
// TRIGGER ANALYSIS
// ============================================================================

/**
 * Analyze triggers across ALL trackers that report them.
 * "Stress is your #1 trigger — it shows up in digestive, dysautonomia, AND head pain episodes."
 */
function findTriggerPatterns(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []
  const triggerMap: Record<string, TriggerPattern> = {}

  for (const [tracker, records] of Object.entries(data)) {
    for (const record of records) {
      const triggers = extractTriggers(record)
      const symptoms = extractSymptoms(record)
      const severity = extractSeverity(record)

      for (const trigger of triggers) {
        const key = trigger.toLowerCase()
        if (!triggerMap[key]) {
          triggerMap[key] = {
            trigger,
            sources: [],
            totalOccurrences: 0,
            coOccurrences: {},
            averageSeverity: 0,
            severityCount: 0
          }
        }
        const tp = triggerMap[key]
        tp.totalOccurrences++
        if (!tp.sources.includes(tracker)) tp.sources.push(tracker)

        // Track co-occurring symptoms
        for (const symptom of symptoms) {
          tp.coOccurrences[symptom] = (tp.coOccurrences[symptom] || 0) + 1
        }

        // Running average severity — averaged over occurrences that actually recorded one
        // (was dividing by totalOccurrences, skewing the mean when some occurrences had no severity)
        if (severity !== null) {
          tp.severityCount++
          tp.averageSeverity = tp.averageSeverity + (severity - tp.averageSeverity) / tp.severityCount
        }
      }
    }
  }

  // Convert to insights — only triggers that appear 3+ times
  const significantTriggers = Object.values(triggerMap)
    .filter(t => t.totalOccurrences >= 3)
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)

  for (const tp of significantTriggers.slice(0, 15)) {
    const crossTracker = tp.sources.length > 1
    const sourceNames = tp.sources.map(formatTrackerName).join(', ')
    const topCoOccurrence = Object.entries(tp.coOccurrences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([s]) => s)

    // Only state a severity figure when one was actually recorded — a fabricated "0.0/10"
    // reads as "painless" on a doctor-facing report, which is a misrepresentation.
    const severityClause = tp.severityCount > 0 ? ` with avg severity ${tp.averageSeverity.toFixed(1)}/10` : ''
    const coClause = topCoOccurrence.length > 0 ? ` Often comes with: ${topCoOccurrence.join(', ')}.` : ''

    insights.push({
      id: `trigger-${tp.trigger.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'trigger',
      title: crossTracker
        ? `${tp.trigger} — Cross-System Trigger`
        : `${tp.trigger} Trigger Pattern`,
      description: crossTracker
        ? `"${tp.trigger}" triggers episodes across ${tp.sources.length} systems (${sourceNames}). Appeared ${tp.totalOccurrences} times${severityClause}.${coClause}`
        : `"${tp.trigger}" appeared ${tp.totalOccurrences} times in ${sourceNames}${severityClause}.${coClause}`,
      confidence: Math.min(95, 50 + tp.totalOccurrences * 5 + (crossTracker ? 15 : 0)),
      impact: crossTracker ? 'high' : tp.totalOccurrences >= 8 ? 'high' : 'medium',
      data: {
        trigger: tp.trigger,
        occurrences: tp.totalOccurrences,
        sources: tp.sources,
        averageSeverity: tp.averageSeverity,
        topCoOccurrences: topCoOccurrence
      }
    })
  }

  return insights
}

// ============================================================================
// TREATMENT EFFECTIVENESS
// ============================================================================

/**
 * Analyze which treatments/interventions actually help.
 * "Compression stockings have a 4.2/5 effectiveness rating across your dysautonomia episodes."
 */
function findTreatmentEffectiveness(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []
  const treatmentMap: Record<string, TreatmentEffect> = {}

  for (const [tracker, records] of Object.entries(data)) {
    for (const record of records) {
      const treatments = extractTreatments(record)
      const effectiveness = extractEffectiveness(record)
      const severity = extractSeverity(record)

      for (const treatment of treatments) {
        const key = `${treatment.toLowerCase()}-${tracker}`
        if (!treatmentMap[key]) {
          treatmentMap[key] = {
            treatment,
            source: tracker,
            timesUsed: 0,
            averageEffectiveness: 0,
            severityBefore: 0,
            description: ''
          }
        }
        const te = treatmentMap[key]
        te.timesUsed++

        if (effectiveness !== null) {
          te.averageEffectiveness = te.averageEffectiveness + (effectiveness - te.averageEffectiveness) / te.timesUsed
        }
        if (severity !== null) {
          te.severityBefore = te.severityBefore + (severity - te.severityBefore) / te.timesUsed
        }
      }
    }
  }

  // Convert to insights — treatments used 3+ times
  const significantTreatments = Object.values(treatmentMap)
    .filter(t => t.timesUsed >= 3)
    .sort((a, b) => b.averageEffectiveness - a.averageEffectiveness)

  // Top effective treatments
  for (const te of significantTreatments.slice(0, 10)) {
    const sourceName = formatTrackerName(te.source)
    const hasEffectiveness = te.averageEffectiveness > 0

    insights.push({
      id: `treatment-${te.treatment.toLowerCase().replace(/\s+/g, '-')}-${te.source}`,
      type: 'treatment',
      title: `${te.treatment}`,
      description: hasEffectiveness
        ? `Used ${te.timesUsed} times for ${sourceName} episodes. Average effectiveness: ${te.averageEffectiveness.toFixed(1)}/5. Avg severity when needed: ${te.severityBefore.toFixed(1)}/10.`
        : `Used ${te.timesUsed} times for ${sourceName} episodes. Avg severity when needed: ${te.severityBefore.toFixed(1)}/10.`,
      confidence: Math.min(90, 40 + te.timesUsed * 5),
      impact: te.averageEffectiveness >= 4 ? 'high' : te.averageEffectiveness >= 3 ? 'medium' : 'low',
      data: {
        treatment: te.treatment,
        source: te.source,
        timesUsed: te.timesUsed,
        averageEffectiveness: te.averageEffectiveness,
        averageSeverity: te.severityBefore
      }
    })
  }

  return insights
}

// ============================================================================
// TEMPORAL PATTERNS
// ============================================================================

/**
 * Find day-of-week patterns.
 * "Your dysautonomia episodes cluster on Monday and Thursday."
 */
function findTemporalPatterns(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (const [tracker, records] of Object.entries(data)) {
    if (records.length < 14) continue  // Need at least 2 weeks of data

    // Count entries per day of week
    const dayCounts: Record<string, number> = {}
    for (const day of days) dayCounts[day] = 0
    for (const record of records) {
      const day = getDayOfWeek(record.date)
      dayCounts[day]++
    }

    const counts = Object.values(dayCounts)
    const mean = counts.reduce((a, b) => a + b, 0) / 7
    const max = Math.max(...counts)
    const min = Math.min(...counts)

    // Only report if there's meaningful variation (peak is 2x+ the minimum, or 50%+ above mean)
    if (max >= mean * 1.5 && max >= min * 2 && max >= 3) {
      const peakDay = days[counts.indexOf(max)]
      const troughDay = days[counts.indexOf(min)]
      const trackerName = formatTrackerName(tracker)

      insights.push({
        id: `temporal-dow-${tracker}`,
        type: 'temporal',
        title: `${trackerName} — ${peakDay} Peak`,
        description: `Your ${trackerName.toLowerCase()} episodes cluster on ${peakDay}s (${max} entries) vs ${troughDay}s (${min} entries). Based on ${records.length} total entries.`,
        confidence: Math.min(90, 40 + records.length * 2),
        impact: max >= mean * 2 ? 'high' : 'medium',
        data: { tracker, pattern: dayCounts, peakDay, troughDay, totalEntries: records.length }
      })
    }
  }

  return insights
}

// ============================================================================
// SEVERITY TRENDS
// ============================================================================

/**
 * Detect whether things are getting better or worse.
 *
 * ⚠️ REWRITTEN 2026-08-02 — the previous version could not see the finding this
 * whole feature exists for. Three things were wrong with it and all three were
 * invisible from the code; they only showed up when Ren exported a real report
 * and read it:
 *
 *  1. IT ANALYSED TRACKERS, BUT THE SIGNAL LIVES IN SYMPTOMS. Ren's neuro
 *     tracker holds weakness (9→5, stubborn) beside swallowing (5→1, an 80%
 *     recovery on immunosuppressants). Averaged into one series they cancel, the
 *     tracker "barely moved", and nothing was emitted at all. The most important
 *     improvement in the dataset was invisible because it shared a category with
 *     a symptom that didn't budge.
 *  2. `records.length < 10` SILENCED MOST TRACKERS BY CONSTRUCTION. In Ren's own
 *     data that gate excluded seizure (9), dysautonomia (8), autoimmune (7),
 *     upper digestive (6), cardiac (6), movement (6) and respiratory (5) — no
 *     matter how large the change inside them.
 *  3. A FLAT 15% THRESHOLD IGNORED SAMPLE SIZE in both directions: a 40% swing
 *     on four entries passed as fact, a consistent 14% improvement over fifty
 *     was thrown away.
 *
 * Now: per-symptom series, a floor of three, a rank test that carries its own
 * uncertainty, and — importantly — series with no trend are still RETURNED (see
 * `computeSymptomTrends`), because a report that omits them lets a reader
 * mistake "we didn't look" for "nothing changed".
 */
function findSeverityTrends(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []

  for (const t of computeSymptomTrends(data)) {
    // Insights are the notable subset. The full table, including the flat
    // series, goes out separately for the report to print.
    if (t.direction === 'no-clear-direction') continue

    // Point change, not percent — see describeTrend() for why a bounded ordinal
    // scale cannot support a meaningful ratio.
    const pts = Math.abs(t.absoluteChange)
    const magnitude = `${pts.toFixed(1)} pt${pts === 1 ? '' : 's'}`
    // Caps, not an emoji, and not an arrow. An arrow describes the NUMBER, and
    // on a mood or energy scale a rising number is the good news — an icon that
    // contradicts the word beside it is worse than no icon. Emoji are out
    // because these titles are rendered into a PDF in Helvetica, where they
    // arrive as empty boxes.
    const word = t.direction === 'improving' ? 'IMPROVING' : 'WORSENING'

    // Confidence tracks BOTH how much data there is and how consistent it was,
    // instead of the old count-only formula that let four entries look certain.
    const consistency = Math.round((1 - Math.min(1, t.pValue)) * 40)
    const volume = Math.min(35, t.n * 3)
    const confidence = Math.max(20, Math.min(92, 20 + consistency + volume))

    insights.push({
      id: t.symptomId ? `trend-${t.tracker}-${t.symptomId}` : `trend-${t.tracker}`,
      type: 'trend',
      title: `${t.symptomLabel} — ${word} ${magnitude}`,
      description: t.summary,
      confidence,
      // A symptom moving 30%+ on real numbers is the headline of the report.
      // Preliminary series never claim high impact however big the swing.
      // A 2+ point move on a 10-point scale is a real change. The old gate was
      // ">=30%", which a 1 -> 1.3 drift satisfied and a 7 -> 5 drop did not.
      impact: !t.preliminary && pts >= 2 ? 'high' : 'medium',
      data: {
        tracker: t.tracker,
        symptomId: t.symptomId,
        symptomLabel: t.symptomLabel,
        earlyAvg: t.earlyAvg,
        lateAvg: t.lateAvg,
        absoluteChange: t.absoluteChange,
        percentChange: t.percentChange,
        sampleSize: t.n,
        tau: t.tau,
        pValue: t.pValue,
        preliminary: t.preliminary,
        strength: t.strength,
        firstDate: t.firstDate,
        lastDate: t.lastDate,
        scaleDirection: t.scaleDirection,
        isImproving: t.direction === 'improving',
      }
    })
  }

  /*
   * SORT BY THE NUMBER THE READER CAN SEE.
   *
   * This used to sort by the preliminary flag and then by percent change, while
   * the card displayed CONFIDENCE — so an 86% sat below a 70% and the order
   * looked arbitrary. Ren caught it immediately: "How can we have 70%
   * confidence in 5 entries and have improving with 86% confidence showing
   * BELOW?" A list whose visible number does not explain its own ordering reads
   * as random, and that quietly undermines everything else on the page.
   *
   * Confidence first, then point change as the tie-break.
   */
  insights.sort((a, b) =>
    (b.confidence - a.confidence) ||
    (Math.abs(b.data.absoluteChange ?? 0) - Math.abs(a.data.absoluteChange ?? 0))
  )

  return insights
}

// ============================================================================
// PER-SYMPTOM TREND TABLE
// ============================================================================

/**
 * Pull a severity out of one ENTRY (not a whole day's record), reporting which
 * field it came from so the caller can tell a deficit scale from a wellbeing
 * scale. Mirrors `extractSeverity`'s field list deliberately — one severity
 * vocabulary for the whole app, per the 2026-06-11 unification.
 */
function pickEntrySeverity(e: any): { value: number; field: string } | null {
  // Was a third copy of the field list. Now the same SEVERITY_FIELDS everything
  // else uses — see the warning on that constant for what drift cost us.
  return pickSeverityFrom(e)
}

/** The per-entry symptom discriminator. `episodeType` is near-universal across
 *  trackers; `eventType` and `painType` cover the rest. */
function pickEntryType(e: any): string | null {
  const raw = e?.episodeType ?? e?.eventType ?? e?.painType ?? e?.symptomType ?? null
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/**
 * Every severity series in the dataset, at BOTH resolutions:
 *   - one series per (tracker, symptom) — where the clinical signal lives
 *   - one series per tracker overall — which answers a different, still-real
 *     question ("is my neuro burden going down on the whole?")
 *
 * Returns EVERY computable series, including flat ones. Callers decide what to
 * show; nothing is dropped here, because a dropped series and a stable symptom
 * look identical downstream and they are not the same fact.
 */
export function computeSymptomTrends(data: TrackerData): SymptomTrend[] {
  const out: SymptomTrend[] = []

  for (const [tracker, records] of Object.entries(data)) {
    if (!records || records.length === 0) continue
    const trackerLabel = formatTrackerName(tracker)

    // --- per-symptom series -------------------------------------------------
    const bySymptom = new Map<string, { points: TrendPoint[]; fields: Set<string> }>()
    for (const record of records) {
      const c: any = record.content
      if (!c) continue
      const entries: any[] = Array.isArray(c.entries) ? c.entries
        : Array.isArray(c.episodes) ? c.episodes
          : Array.isArray(c) ? c
            : []
      for (const e of entries) {
        const type = pickEntryType(e)
        if (!type) continue
        const sev = pickEntrySeverity(e)
        if (!sev) continue
        const key = symptomKey(tracker, type)
        let bucket = bySymptom.get(key)
        if (!bucket) { bucket = { points: [], fields: new Set() }; bySymptom.set(key, bucket) }
        bucket.points.push({ date: record.date, value: sev.value })
        bucket.fields.add(sev.field)
      }
    }

    for (const [key, bucket] of bySymptom) {
      const raw = computeTrend(bucket.points)
      if (!raw) continue
      // Mixed fields in one series would make the direction ambiguous, so a
      // single wellbeing-style field is enough to treat the series as one.
      const field = [...bucket.fields].find(f => scaleDirectionForField(f) === 'higher-is-better') ?? [...bucket.fields][0]
      const scale = scaleDirectionForField(field)
      const t = applyScaleDirection(raw, scale)
      const label = `${trackerLabel} — ${symptomLabel(tracker, key)}`
      out.push({
        ...t,
        tracker,
        trackerLabel,
        symptomId: key,
        symptomLabel: symptomLabel(tracker, key),
        scaleDirection: scale,
        summary: describeTrend(label, t),
      })
    }

    // --- whole-tracker series ----------------------------------------------
    const trackerPoints: TrendPoint[] = []
    const trackerFields = new Set<string>()
    for (const record of records) {
      const sev = extractSeverity(record)
      if (sev !== null) {
        trackerPoints.push({ date: record.date, value: sev })
        const f = extractSeverityField(record)
        if (f) trackerFields.add(f)
      }
    }
    // A single wellbeing-style field is enough to treat the series as one, the
    // same rule the per-symptom path uses.
    const trackerField = [...trackerFields].find(f => scaleDirectionForField(f) === 'higher-is-better') ?? [...trackerFields][0] ?? null
    const rawTracker = computeTrend(trackerPoints)
    if (rawTracker) {
      // Direction is NOT automatically higher-is-worse here. A mood or energy
      // tracker resolves to a wellbeing field, where a rising number is the
      // good news — reporting that as "worsening" would put a false statement
      // in a medical document. (vitals/pulse-ox report synthetic field names
      // that are already normalised so higher = worse.)
      const trackerScale = scaleDirectionForField(trackerField)
      const t = applyScaleDirection(rawTracker, trackerScale)
      out.push({
        ...t,
        tracker,
        trackerLabel,
        symptomId: null,
        symptomLabel: `${trackerLabel} (overall)`,
        scaleDirection: trackerScale,
        summary: describeTrend(`${trackerLabel} overall`, t),
      })
    }
  }

  return out
}

// ============================================================================
// TREATMENT RESPONSE
// ============================================================================

export interface TreatmentResponse {
  /** EVERY treatment started in this window, not the one we liked the look of. */
  medications: string[]
  /** Earliest start date in the window — where the before/since split falls. */
  startedOn: string
  /** Latest start date in the window; equals startedOn for a lone treatment. */
  windowEnd: string
  tracker: string
  trackerLabel: string
  symptomId: string
  symptomLabel: string
  beforeAvg: number
  sinceAvg: number
  beforeN: number
  sinceN: number
  percentChange: number
  pValue: number
  effect: number
  direction: TrendDirection
  scaleDirection: ScaleDirection
  summary: string
}

/** Enough entries on each side that a comparison means anything at all. */
const MIN_SIDE_N = 3

/** Whole days between two ISO dates. */
function daysBetweenISO(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a)
  return Number.isFinite(ms) ? Math.abs(Math.round(ms / 86_400_000)) : Number.MAX_SAFE_INTEGER
}

/**
 * Compare each symptom BEFORE a medication started against SINCE it started.
 *
 * WHY: "severity fell 40% over the tracking period" is a weaker claim than
 * "this symptom improved from 5.0 to 1.3 since treatment began on 16 July,"
 * and the second is the only framing a prior-authorization reviewer acts on. The
 * old engine could not produce it at all — trends ran across the whole window
 * with nothing aligned to when treatment actually began.
 *
 * ⚠️ WHAT THIS IS NOT: proof of causation. Treatments overlap, disease activity
 * fluctuates on its own, and a person who starts a new drug is usually changing
 * other things too. This is a documented temporal association and the report
 * says so in those words. Presenting it as more than that would be dishonest in
 * a document meant to be relied on.
 */
export function computeTreatmentResponses(
  data: TrackerData,
  medications: { brandName?: string; genericName?: string; dateStarted?: string; dateStopped?: string; conditionTreating?: string }[],
): TreatmentResponse[] {
  const out: TreatmentResponse[] = []
  if (!Array.isArray(medications) || medications.length === 0) return out

  const started = medications
    .map(m => ({
      name: (m.brandName || m.genericName || '').trim(),
      date: (m.dateStarted || '').trim(),
    }))
    .filter(m => m.name && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (started.length === 0) return out

  /*
   * CLUSTER TREATMENTS STARTED CLOSE TOGETHER INTO ONE WINDOW.
   *
   * Treatments begun within WINDOW_DAYS of each other cannot be told apart by
   * this data — with sparse entries the before/since split lands identically,
   * so they produce the same numbers and reporting them separately manufactures
   * three findings out of one observation.
   *
   * 30 days is deliberately generous. The cost of over-grouping is a vaguer
   * statement ("something in this window helped"); the cost of under-grouping
   * is a false attribution to a specific drug, which is far worse in a document
   * that informs prescribing.
   */
  const WINDOW_DAYS = 30
  const windows: { start: string; end: string; names: string[] }[] = []
  for (const med of started) {
    const last = windows[windows.length - 1]
    if (last && daysBetweenISO(last.start, med.date) <= WINDOW_DAYS) {
      last.names.push(med.name)
      last.end = med.date
    } else {
      windows.push({ start: med.date, end: med.date, names: [med.name] })
    }
  }

  for (const [tracker, records] of Object.entries(data)) {
    if (!records || records.length === 0) continue
    const trackerLabel = formatTrackerName(tracker)

    // Same grouping as computeSymptomTrends — per symptom, because a drug that
    // fixes one symptom and not another is exactly the finding worth having.
    const bySymptom = new Map<string, { points: TrendPoint[]; fields: Set<string> }>()
    for (const record of records) {
      const c: any = record.content
      if (!c) continue
      const entries: any[] = Array.isArray(c.entries) ? c.entries
        : Array.isArray(c.episodes) ? c.episodes
          : Array.isArray(c) ? c
            : []
      for (const e of entries) {
        const type = pickEntryType(e)
        if (!type) continue
        const sev = pickEntrySeverity(e)
        if (!sev) continue
        const key = symptomKey(tracker, type)
        let bucket = bySymptom.get(key)
        if (!bucket) { bucket = { points: [], fields: new Set() }; bySymptom.set(key, bucket) }
        bucket.points.push({ date: record.date, value: sev.value })
        bucket.fields.add(sev.field)
      }
    }

    for (const [key, bucket] of bySymptom) {
      const field = [...bucket.fields].find(f => scaleDirectionForField(f) === 'higher-is-better') ?? [...bucket.fields][0]
      const scale = scaleDirectionForField(field)

      for (const med of windows) {
        const before = bucket.points.filter(p => p.date < med.start).map(p => p.value)
        const since = bucket.points.filter(p => p.date >= med.start).map(p => p.value)
        // Both sides must be real. A drug started before tracking began has no
        // "before", and one started last week has no "since" — neither is a
        // failure, they simply cannot answer the question yet.
        if (before.length < MIN_SIDE_N || since.length < MIN_SIDE_N) continue

        const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
        const beforeAvg = mean(before)
        const sinceAvg = mean(since)
        const change = sinceAvg - beforeAvg
        const pointChange = change
        const percentChange = beforeAvg !== 0 ? (change / beforeAvg) * 100 : 0

        const { pValue, effect } = mannWhitneyU(before, since)
        const notable = pValue < 0.10 || Math.abs(percentChange) >= 25
        let direction: TrendDirection =
          notable && change !== 0 ? (change < 0 ? 'improving' : 'worsening') : 'no-clear-direction'
        if (scale === 'higher-is-better' && direction !== 'no-clear-direction') {
          direction = direction === 'improving' ? 'worsening' : 'improving'
        }
        if (direction === 'no-clear-direction') continue

        const label = symptomLabel(tracker, key)
        const word = direction === 'improving' ? 'improved' : 'worsened'
        const names = med.names.join(', ')
        const windowText = med.start === med.end
          ? `since ${med.start}`
          : `since ${med.start} (through ${med.end})`
        out.push({
          medications: med.names,
          startedOn: med.start,
          windowEnd: med.end,
          tracker,
          trackerLabel,
          symptomId: key,
          symptomLabel: label,
          beforeAvg, sinceAvg,
          beforeN: before.length, sinceN: since.length,
          percentChange, pValue, effect,
          direction,
          scaleDirection: scale,
          // Deliberately passive and un-attributed: the symptom changed ACROSS a
          // window, and more than one thing may have been started in it. Naming
          // every treatment lets a clinician weigh onset times we cannot know —
          // some immunosuppressants take 8-12 weeks to act, so a change two
          // weeks in is almost certainly something else started in the same
          // window. We cannot know onset times; a clinician can.
          summary:
            `${label} ${word} ${windowText}, during which ${med.names.length > 1 ? 'these treatments were' : 'this treatment was'} started: ${names}. ` +
            `${beforeAvg.toFixed(1)} before (n=${before.length}) → ${sinceAvg.toFixed(1)} after (n=${since.length}), ` +
            `${Math.abs(pointChange).toFixed(1)} point${Math.abs(pointChange) === 1 ? '' : 's'}` +
            (pValue < 0.05 ? ` (p≈${pValue.toFixed(3)}).` : ` (p≈${pValue.toFixed(2)}).`) +
            (med.names.length > 1
              ? ' This data cannot distinguish between treatments started in the same window.'
              : ''),
        })
      }
    }
  }

  // Strongest, best-supported first.
  out.sort((a, b) => (a.pValue - b.pValue) || (Math.abs(b.sinceAvg - b.beforeAvg) - Math.abs(a.sinceAvg - a.beforeAvg)))
  return out
}

// ============================================================================
// CO-OCCURRENCE ANALYSIS
// ============================================================================

/**
 * Find what happens on the SAME DAY across trackers.
 * "On 80% of days you logged dysautonomia, you also logged head pain."
 */
function findCoOccurrences(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []
  const trackerNames = Object.keys(data).filter(k => data[k].length >= 5)

  // Build date sets per tracker
  const dateSets: Record<string, Set<string>> = {}
  for (const tracker of trackerNames) {
    dateSets[tracker] = new Set(data[tracker].map(r => r.date))
  }

  for (let i = 0; i < trackerNames.length; i++) {
    for (let j = i + 1; j < trackerNames.length; j++) {
      const a = trackerNames[i]
      const b = trackerNames[j]
      const setA = dateSets[a]
      const setB = dateSets[b]

      // Count overlapping days
      let overlap = 0
      for (const date of setA) {
        if (setB.has(date)) overlap++
      }

      const smallerSet = Math.min(setA.size, setB.size)
      // Lowered from (smallerSet < 5 || overlap < 3) — too aggressive for
      // early-data users. 3 entries with 2 overlaps is enough to flag a
      // co-occurrence worth noticing.
      if (smallerSet < 3 || overlap < 2) continue

      const overlapPct = (overlap / smallerSet) * 100

      // Only report strong co-occurrence (60%+)
      if (overlapPct >= 60) {
        const nameA = formatTrackerName(a)
        const nameB = formatTrackerName(b)
        // Report from the perspective of the smaller set (more informative)
        const [primary, secondary] = setA.size <= setB.size ? [nameA, nameB] : [nameB, nameA]

        insights.push({
          id: `cooccur-${a}-${b}`,
          type: 'correlation',
          title: `${primary} + ${secondary} — Same Day Pattern`,
          description: `On ${Math.round(overlapPct)}% of days you tracked ${primary.toLowerCase()}, you also tracked ${secondary.toLowerCase()} (${overlap} of ${smallerSet} days).`,
          confidence: Math.min(90, 40 + overlap * 3),
          impact: overlapPct >= 80 ? 'high' : 'medium',
          data: { trackerA: a, trackerB: b, overlap, overlapPercent: overlapPct, daysA: setA.size, daysB: setB.size }
        })
      }
    }
  }

  insights.sort((a, b) => b.data.overlapPercent - a.data.overlapPercent)
  return insights.slice(0, 10)  // Top 10
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Run all pattern analyses on the tracker data.
 * Returns categorized insights for the UI.
 */
export function analyzeAllPatterns(data: TrackerData): {
  all: PatternInsight[]
  correlations: PatternInsight[]
  triggers: PatternInsight[]
  treatments: PatternInsight[]
  temporal: PatternInsight[]
  trends: PatternInsight[]
  /** EVERY computable severity series, including the flat ones — so the report
   *  can print a trajectory line for each system rather than leaving a silence
   *  the reader will misread as "no improvement". */
  symptomTrends: SymptomTrend[]
  summary: {
    totalEntries: number
    activeTrackers: number
    daysTracked: number
    topTracker: string
    insightCount: number
    improvingCount: number
    worseningCount: number
  }
} {
  // Count total entries and active trackers
  const allDates = new Set<string>()
  let totalEntries = 0
  let topTracker = ''
  let topCount = 0

  for (const [tracker, records] of Object.entries(data)) {
    totalEntries += records.length
    for (const r of records) allDates.add(r.date)
    if (records.length > topCount) {
      topCount = records.length
      topTracker = tracker
    }
  }

  const activeTrackers = Object.values(data).filter(r => r.length > 0).length

  // Run all analyses
  const correlations = [
    ...findCrossTrackerCorrelations(data),
    ...findCoOccurrences(data)
  ]
  const triggers = findTriggerPatterns(data)
  const treatments = findTreatmentEffectiveness(data)
  const temporal = findTemporalPatterns(data)
  const trends = findSeverityTrends(data)
  const symptomTrends = computeSymptomTrends(data)

  const all = [...correlations, ...triggers, ...treatments, ...temporal, ...trends]
    .sort((a, b) => {
      // Sort by impact first, then confidence
      const impactOrder = { high: 3, medium: 2, low: 1 }
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact]
      if (impactDiff !== 0) return impactDiff
      return b.confidence - a.confidence
    })

  return {
    all,
    correlations,
    triggers,
    treatments,
    temporal,
    trends,
    symptomTrends,
    summary: {
      totalEntries,
      activeTrackers,
      daysTracked: allDates.size,
      topTracker: formatTrackerName(topTracker),
      insightCount: all.length,
      // Counted over per-symptom series only. The whole-tracker series is an
      // average of these, so including it would double-count the same movement.
      improvingCount: symptomTrends.filter(t => t.symptomId && t.direction === 'improving').length,
      worseningCount: symptomTrends.filter(t => t.symptomId && t.direction === 'worsening').length,
    }
  }
}
