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

import { DailyDataRecord } from './database/dexie-db'

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

/** Extract numeric severity from various tracker formats */
function extractSeverity(record: DailyDataRecord): number | null {
  const c = record.content
  if (!c) return null
  // Direct severity field
  if (typeof c.severity === 'number') return c.severity
  // Pain level
  if (typeof c.painLevel === 'number') return c.painLevel
  // Mood (often 1-10)
  if (typeof c.mood === 'number') return c.mood
  // Energy level
  if (typeof c.energyLevel === 'number') return c.energyLevel
  if (typeof c.energy === 'number') return c.energy
  // Nested in entries
  if (Array.isArray(c.entries)) {
    const severities = c.entries
      .map((e: any) => e.severity ?? e.painLevel ?? e.intensity)
      .filter((v: any) => typeof v === 'number')
    if (severities.length > 0) return severities.reduce((a: number, b: number) => a + b, 0) / severities.length
  }
  // Episodes with severity
  if (Array.isArray(c.episodes)) {
    const severities = c.episodes
      .map((e: any) => e.severity)
      .filter((v: any) => typeof v === 'number')
    if (severities.length > 0) return severities.reduce((a: number, b: number) => a + b, 0) / severities.length
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
            averageSeverity: 0
          }
        }
        const tp = triggerMap[key]
        tp.totalOccurrences++
        if (!tp.sources.includes(tracker)) tp.sources.push(tracker)

        // Track co-occurring symptoms
        for (const symptom of symptoms) {
          tp.coOccurrences[symptom] = (tp.coOccurrences[symptom] || 0) + 1
        }

        // Running average severity
        if (severity !== null) {
          tp.averageSeverity = tp.averageSeverity + (severity - tp.averageSeverity) / tp.totalOccurrences
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

    insights.push({
      id: `trigger-${tp.trigger.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'trigger',
      title: crossTracker
        ? `${tp.trigger} — Cross-System Trigger`
        : `${tp.trigger} Trigger Pattern`,
      description: crossTracker
        ? `"${tp.trigger}" triggers episodes across ${tp.sources.length} systems (${sourceNames}). Appeared ${tp.totalOccurrences} times with avg severity ${tp.averageSeverity.toFixed(1)}/10.${topCoOccurrence.length > 0 ? ` Often comes with: ${topCoOccurrence.join(', ')}.` : ''}`
        : `"${tp.trigger}" appeared ${tp.totalOccurrences} times in ${sourceNames} with avg severity ${tp.averageSeverity.toFixed(1)}/10.${topCoOccurrence.length > 0 ? ` Often comes with: ${topCoOccurrence.join(', ')}.` : ''}`,
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
 * "Your pain severity has decreased 30% over the last month."
 */
function findSeverityTrends(data: TrackerData): PatternInsight[] {
  const insights: PatternInsight[] = []

  for (const [tracker, records] of Object.entries(data)) {
    if (records.length < 10) continue

    // Get dated severities, sorted chronologically
    const dated: { date: string; severity: number }[] = []
    for (const record of records) {
      const sev = extractSeverity(record)
      if (sev !== null) {
        dated.push({ date: record.date, severity: sev })
      }
    }
    if (dated.length < 10) continue

    dated.sort((a, b) => a.date.localeCompare(b.date))

    // Compare first third vs last third
    const third = Math.floor(dated.length / 3)
    const earlyAvg = dated.slice(0, third).reduce((sum, d) => sum + d.severity, 0) / third
    const lateAvg = dated.slice(-third).reduce((sum, d) => sum + d.severity, 0) / third

    const change = lateAvg - earlyAvg
    const pctChange = earlyAvg !== 0 ? (change / earlyAvg) * 100 : 0
    const absChange = Math.abs(pctChange)

    // Only report meaningful trends (15%+ change)
    if (absChange >= 15) {
      const trackerName = formatTrackerName(tracker)
      const direction = change > 0 ? 'increased' : 'decreased'
      const emoji = change > 0 ? '📈' : '📉'
      // For most trackers, decreasing severity is GOOD
      const isGoodNews = change < 0

      insights.push({
        id: `trend-${tracker}`,
        type: 'trend',
        title: `${trackerName} — ${direction} ${Math.round(absChange)}%`,
        description: `${trackerName} severity has ${direction} ~${Math.round(absChange)}% over your tracking period (${earlyAvg.toFixed(1)} → ${lateAvg.toFixed(1)} avg). Based on ${dated.length} entries.`,
        confidence: Math.min(90, 40 + dated.length * 2),
        impact: absChange >= 30 ? 'high' : 'medium',
        data: {
          tracker,
          earlyAvg,
          lateAvg,
          percentChange: pctChange,
          sampleSize: dated.length,
          isImproving: isGoodNews
        }
      })
    }
  }

  return insights
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
  summary: {
    totalEntries: number
    activeTrackers: number
    daysTracked: number
    topTracker: string
    insightCount: number
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
    summary: {
      totalEntries,
      activeTrackers,
      daysTracked: allDates.size,
      topTracker: formatTrackerName(topTracker),
      insightCount: all.length
    }
  }
}
