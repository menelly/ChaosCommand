/**
 * PATTERN ENGINE v2 — v2-aware semantic extractors + actionable detectors
 *
 * The original pattern-engine.ts knows the v1 schema (severity, generic
 * triggers/symptoms). It misses everything we shipped in v0.4.4-0.4.5:
 * status epilepticus, autonomic seizures, anaphylaxis pattern, celiac
 * aftermath, mood mixed states, multi-rescue migraines, baseline-delta
 * flares, 988 crisis flags, pyelonephritis pattern, etc.
 *
 * This module reads the rich v2 fields per-tracker and surfaces patterns
 * that actually matter clinically.
 *
 * Built by: Ace (Claude 4.x), 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

import { DailyDataRecord } from './database/dexie-db'
import { PatternInsight, TrackerData } from './pattern-engine'
import { differenceInDays, parseISO } from 'date-fns'

// ============================================================================
// SEMANTIC EXTRACTORS — read v2 entry shapes per tracker
// ============================================================================

// Helper: get all entries from a daily record (handles entries[] and singleton shapes)
function getEntries(record: DailyDataRecord): any[] {
  const c = record.content
  if (!c) return []
  if (Array.isArray(c.entries)) return c.entries
  if (Array.isArray(c.episodes)) return c.episodes
  return [c]
}

interface SeizureSignals {
  date: string
  isStatusEpilepticus: boolean
  isAutonomic: boolean
  hadAura: boolean
  rescueMedUsed: boolean
  emergencyServicesCalled: boolean
  multipleConsecutive: boolean
  durationMinutes?: number
  episodeType?: string
}

export function extractSeizureSignals(records: DailyDataRecord[]): SeizureSignals[] {
  const out: SeizureSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      out.push({
        date: e.date || r.date,
        isStatusEpilepticus: !!e.statusEpilepticus,
        isAutonomic: e.episodeType === 'autonomic',
        hadAura: !!e.auraPresent,
        rescueMedUsed: !!e.rescueMedicationUsed,
        emergencyServicesCalled: !!e.emergencyServicesCalled,
        multipleConsecutive: !!e.multipleConsecutive,
        durationMinutes: typeof e.durationMinutes === 'number' ? e.durationMinutes : undefined,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

interface PainSignals {
  date: string
  hasTearing: boolean
  hasThunderclap: boolean
  legWeakness: boolean
  bowelBladderChanges: boolean
  pulsatileMass: boolean
  isFlare: boolean  // chronic-flare with baseline > 0
  flareDelta: number | null  // current - baseline
  painLevel: number
  episodeType?: string
}

export function extractPainSignals(records: DailyDataRecord[]): PainSignals[] {
  const out: PainSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      const isFlare = e.episodeType === 'chronic-flare' && typeof e.baselinePainLevel === 'number'
      out.push({
        date: e.date || r.date,
        hasTearing: !!e.tearingQuality,
        hasThunderclap: !!e.thunderclapPattern,
        legWeakness: !!e.legWeakness,
        bowelBladderChanges: !!e.bowelBladderChanges,
        pulsatileMass: !!e.pulsatileMass,
        isFlare,
        flareDelta: isFlare ? (e.painLevel || 0) - (e.baselinePainLevel || 0) : null,
        painLevel: e.painLevel || 0,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

interface HeadPainSignals {
  date: string
  isWorstOfLife: boolean
  isThunderclap: boolean
  hadAura: boolean
  rescueRedosed: boolean
  rescueMedCount: number
  flareDelta: number | null
  painIntensity: number
  episodeType?: string
}

export function extractHeadPainSignals(records: DailyDataRecord[]): HeadPainSignals[] {
  const out: HeadPainSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      const baseline = typeof e.baselineHeadachePain === 'number' ? e.baselineHeadachePain : null
      out.push({
        date: e.date || r.date,
        isWorstOfLife: !!e.worstHeadacheOfLife || e.episodeType === 'worst-of-life',
        isThunderclap: !!e.thunderclapOnset,
        hadAura: !!e.auraPresent,
        rescueRedosed: !!e.rescueRedosed,
        rescueMedCount: Array.isArray(e.rescueMedicationsTaken) ? e.rescueMedicationsTaken.length : 0,
        flareDelta: baseline !== null ? (e.painIntensity || 0) - baseline : null,
        painIntensity: e.painIntensity || 0,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

interface FoodReactionSignals {
  date: string
  isAnaphylaxis: boolean
  isCeliacFamily: boolean
  hadDelayedReaction: boolean
  delayedReactionHours?: number
  hadAftermath: boolean  // brain fog / joint / fatigue / mood after
  aftermathDomains: string[]
  epipenUsed: boolean
  allergenName?: string
  episodeType?: string
}

export function extractFoodReactionSignals(records: DailyDataRecord[]): FoodReactionSignals[] {
  const out: FoodReactionSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      const aftermath: string[] = []
      if (e.brainFogAfter) aftermath.push('brain fog')
      if (e.jointPainAfter) aftermath.push('joint pain')
      if (e.fatigueAfter) aftermath.push('fatigue')
      if (e.moodChangesAfter) aftermath.push('mood changes')
      out.push({
        date: e.date || r.date,
        isAnaphylaxis: e.episodeType === 'severe-anaphylaxis' || !!e.epipenUsed,
        isCeliacFamily: e.episodeType === 'celiac-autoimmune' || e.episodeType === 'intolerance',
        hadDelayedReaction: !!e.delayedReaction,
        delayedReactionHours: typeof e.delayedReactionHours === 'number' ? e.delayedReactionHours : undefined,
        hadAftermath: aftermath.length > 0,
        aftermathDomains: aftermath,
        epipenUsed: !!e.epipenUsed,
        allergenName: e.allergenName,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

interface AnxietySignals {
  date: string
  suicidalIdeation: boolean
  selfHarmUrges: boolean
  feelingHopeless: boolean
  crisisContactMade: boolean
  hospitalizationConsidered: boolean
  panicLevel: number
  anxietyLevel: number
  isMeltdown: boolean
  episodeType?: string
}

export function extractAnxietySignals(records: DailyDataRecord[]): AnxietySignals[] {
  const out: AnxietySignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      out.push({
        date: e.date || r.date,
        suicidalIdeation: !!e.suicidalIdeation,
        selfHarmUrges: !!e.selfHarmUrges,
        feelingHopeless: !!e.feelingHopeless,
        crisisContactMade: !!e.crisisContactMade,
        hospitalizationConsidered: !!e.hospitalizationConsidered,
        panicLevel: e.panicLevel || 0,
        anxietyLevel: e.anxietyLevel || 0,
        isMeltdown: e.episodeType === 'meltdown' || e.anxietyType === 'meltdown',
        episodeType: e.episodeType || e.anxietyType,
      })
    }
  }
  return out
}

interface MindMoodSignals {
  date: string
  isMixedState: boolean       // high dep + high mania
  isRapidCycling: boolean
  depressionLevel: number
  maniaLevel: number
  meltdownOccurred: boolean
}

export function extractMindMoodSignals(records: DailyDataRecord[]): MindMoodSignals[] {
  const out: MindMoodSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      const dep = e.depressionLevel || 0
      const mania = e.maniaLevel || 0
      out.push({
        date: e.date || r.date,
        isMixedState: dep >= 7 && mania >= 6,
        isRapidCycling: e.moodSwingDirection === 'rapid-cycling',
        depressionLevel: dep,
        maniaLevel: mania,
        meltdownOccurred: !!e.meltdownOccurred,
      })
    }
  }
  return out
}

interface BathroomSignals {
  date: string
  blackTarryStool: boolean
  bloodInUrine: boolean
  pyelonephritisPattern: boolean  // UTI + fever + flank
  obstructionPattern: boolean      // no gas + vomiting
  noStoolDays?: number
  episodeType?: string
}

export function extractBathroomSignals(records: DailyDataRecord[]): BathroomSignals[] {
  const out: BathroomSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      out.push({
        date: e.date || r.date,
        blackTarryStool: e.bloodColor === 'black-tarry',
        bloodInUrine: !!e.bloodInUrine,
        pyelonephritisPattern: !!(e.feverWithUrinary && e.flankPain),
        obstructionPattern: !!(e.cantPassGas && e.vomiting),
        noStoolDays: typeof e.noStoolDays === 'number' ? e.noStoolDays : undefined,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

interface CardiacSignals {
  date: string
  isVT: boolean
  isSyncope: boolean
  hrPeak?: number
  symptomSeverity: number
  episodeType?: string
}

export function extractCardiacSignals(records: DailyDataRecord[]): CardiacSignals[] {
  const out: CardiacSignals[] = []
  for (const r of records) {
    for (const e of getEntries(r)) {
      out.push({
        date: e.date || r.date,
        isVT: e.rhythmType === 'VT',
        isSyncope: e.episodeType === 'syncope' || !!e.locOccurred,
        hrPeak: typeof e.hrPeak === 'number' ? e.hrPeak : undefined,
        symptomSeverity: e.symptomSeverity || 0,
        episodeType: e.episodeType,
      })
    }
  }
  return out
}

// ============================================================================
// PATTERN DETECTORS — actionable, severity-scored, sample-size-aware
// ============================================================================

interface InsightOpts {
  trackerData: TrackerData
  windowDays: number
}

let __idSeq = 0
const newId = (prefix: string) => `${prefix}-${Date.now()}-${++__idSeq}`

// === SEIZURE patterns ===
function detectSeizurePatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractSeizureSignals(opts.trackerData.seizure || [])
  if (sigs.length === 0) return insights

  const statusCount = sigs.filter(s => s.isStatusEpilepticus).length
  if (statusCount >= 1) {
    insights.push({
      id: newId('seizure-status'),
      type: 'trend',
      title: `🚨 ${statusCount} status epilepticus event${statusCount !== 1 ? 's' : ''} in ${opts.windowDays}-day window`,
      description: `Status epilepticus is a neurological emergency. Bring this to your neurologist with the dates: ${sigs.filter(s => s.isStatusEpilepticus).map(s => s.date).slice(0, 5).join(', ')}.`,
      confidence: 95,
      impact: 'high',
      data: { statusCount, dates: sigs.filter(s => s.isStatusEpilepticus).map(s => s.date) },
    })
  }

  const autonomicCount = sigs.filter(s => s.isAutonomic).length
  if (autonomicCount >= 3) {
    insights.push({
      id: newId('seizure-auto'),
      type: 'trend',
      title: `${autonomicCount} autonomic seizure events`,
      description: `Autonomic seizures are often misdiagnosed as POTS, MCAS, or panic. Show this cluster to your neurologist — pattern suggests a workup beyond cardiology / psychiatry alone.`,
      confidence: Math.min(70 + autonomicCount * 2, 95),
      impact: 'high',
      data: { autonomicCount },
    })
  }

  const auraTotal = sigs.filter(s => s.episodeType !== 'autonomic').length
  const auraCount = sigs.filter(s => s.hadAura).length
  if (auraTotal >= 5 && auraCount / auraTotal >= 0.6) {
    insights.push({
      id: newId('seizure-aura'),
      type: 'temporal',
      title: `Aura present in ${Math.round(auraCount / auraTotal * 100)}% of seizures`,
      description: `Reliable aura is medication-management-relevant — your auras give you a window for rescue meds, safety positioning, or PRN dosing. Track aura specifics in seizure entries.`,
      confidence: 80,
      impact: 'medium',
      data: { auraCount, auraTotal },
    })
  }

  const rescueCount = sigs.filter(s => s.rescueMedUsed).length
  if (rescueCount >= 3) {
    insights.push({
      id: newId('seizure-rescue'),
      type: 'treatment',
      title: `Rescue medication used ${rescueCount} times`,
      description: `If rescue med usage is increasing, baseline AED management may need adjustment. Bring this count to your next neuro visit.`,
      confidence: 75,
      impact: 'medium',
      data: { rescueCount },
    })
  }
  return insights
}

// === PAIN patterns ===
function detectPainPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractPainSignals(opts.trackerData.pain || [])
  if (sigs.length === 0) return insights

  if (sigs.some(s => s.hasTearing)) {
    const dates = sigs.filter(s => s.hasTearing).map(s => s.date)
    insights.push({
      id: newId('pain-tearing'),
      type: 'trend',
      title: `🚨 "Tearing" pain reported (${dates.length}×)`,
      description: `Tearing/ripping quality is a classic aortic dissection marker. If recurrent and unevaluated, urgent cardiology / vascular workup. Dates: ${dates.slice(0, 3).join(', ')}.`,
      confidence: 95, impact: 'high', data: { dates },
    })
  }

  if (sigs.some(s => s.hasThunderclap)) {
    const dates = sigs.filter(s => s.hasThunderclap).map(s => s.date)
    insights.push({
      id: newId('pain-thunderclap'),
      type: 'trend',
      title: `🚨 Thunderclap pain pattern (${dates.length}×)`,
      description: `Thunderclap onset suggests SAH or RCVS. If never imaged, MR angio recommended. Dates: ${dates.slice(0, 3).join(', ')}.`,
      confidence: 90, impact: 'high', data: { dates },
    })
  }

  if (sigs.some(s => s.legWeakness && s.bowelBladderChanges)) {
    insights.push({
      id: newId('pain-cauda'),
      type: 'trend',
      title: `🚨 Cauda equina pattern (back + leg weakness + bowel/bladder)`,
      description: `Surgical-window emergency. If not evaluated within 24-48 hours of onset, irreversible damage is possible. ER evaluation indicated.`,
      confidence: 95, impact: 'high', data: {},
    })
  }

  // Chronic flare delta tracking
  const flares = sigs.filter(s => s.isFlare && s.flareDelta !== null) as (PainSignals & { flareDelta: number })[]
  if (flares.length >= 3) {
    const avgDelta = flares.reduce((a, f) => a + f.flareDelta, 0) / flares.length
    const extremeFlares = flares.filter(f => f.flareDelta >= 6).length
    insights.push({
      id: newId('pain-flare-delta'),
      type: 'trend',
      title: `Chronic pain baseline +${Math.round(avgDelta * 10) / 10} avg flare delta`,
      description: `Across ${flares.length} flare events, average severity ${Math.round(avgDelta * 10) / 10} above your typical-day baseline. ${extremeFlares} were "extreme" flares (+6 above baseline) — those are the days specialists need to see most.`,
      confidence: 80,
      impact: extremeFlares >= 2 ? 'high' : 'medium',
      data: { avgDelta, extremeFlares, total: flares.length },
    })
  }
  return insights
}

// === HEAD-PAIN patterns ===
function detectHeadPainPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractHeadPainSignals(opts.trackerData['head-pain'] || [])
  if (sigs.length === 0) return insights

  if (sigs.some(s => s.isWorstOfLife)) {
    insights.push({
      id: newId('head-whol'),
      type: 'trend',
      title: `🚨 "Worst headache of life" reported`,
      description: `Single WHOL event warrants SAH workup if not yet done (CT + LP within 6h optimal, otherwise MR angio). Document presentation date for records.`,
      confidence: 95, impact: 'high', data: {},
    })
  }

  // Multi-rescue migraine — Ren's "needs Nurtec AND Imitrex" insight
  const multiRescueDays = sigs.filter(s => s.rescueRedosed || s.rescueMedCount >= 2)
  if (multiRescueDays.length >= 3) {
    insights.push({
      id: newId('head-multirescue'),
      type: 'treatment',
      title: `${multiRescueDays.length} migraines needed multiple rescue meds`,
      description: `Recurrent need for multiple rescues = your acute regimen may be undertreated. Discuss with neurology — preventive med options (CGRP injectables, atogepant) often help.`,
      confidence: 85, impact: 'high', data: { multiRescueCount: multiRescueDays.length },
    })
  }

  // Flare delta on migraines
  const deltas = sigs.filter(s => s.flareDelta !== null) as (HeadPainSignals & { flareDelta: number })[]
  if (deltas.length >= 3) {
    const extremeFlares = deltas.filter(d => d.flareDelta >= 5).length
    if (extremeFlares >= 2) {
      insights.push({
        id: newId('head-extreme-flares'),
        type: 'trend',
        title: `${extremeFlares} extreme migraine flares (+5 above baseline)`,
        description: `These are the "needs Nurtec AND Imitrex AND a dark room" days. Show your neurologist the count + delta — strongest case for preventive escalation.`,
        confidence: 85, impact: 'high', data: { extremeFlares, total: deltas.length },
      })
    }
  }
  return insights
}

// === FOOD-REACTION patterns ===
function detectFoodPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractFoodReactionSignals(opts.trackerData['food-allergens'] || [])
  if (sigs.length === 0) return insights

  const anaphCount = sigs.filter(s => s.isAnaphylaxis).length
  if (anaphCount >= 1) {
    insights.push({
      id: newId('food-anaph'),
      type: 'trend',
      title: `🚨 ${anaphCount} anaphylaxis event${anaphCount !== 1 ? 's' : ''}`,
      description: `Each anaphylaxis warrants allergy/immunology follow-up + EpiPen Rx renewal + emergency action plan review with anyone who might administer it.`,
      confidence: 95, impact: 'high', data: { anaphCount },
    })
  }

  // Celiac aftermath pattern (Ren's Luka context)
  const celiacEvents = sigs.filter(s => s.isCeliacFamily)
  const aftermathEvents = celiacEvents.filter(s => s.hadAftermath)
  if (celiacEvents.length >= 4 && aftermathEvents.length / celiacEvents.length >= 0.5) {
    const allDomains: Record<string, number> = {}
    aftermathEvents.forEach(e => e.aftermathDomains.forEach(d => { allDomains[d] = (allDomains[d] || 0) + 1 }))
    const topDomain = Object.entries(allDomains).sort((a, b) => b[1] - a[1])[0]
    insights.push({
      id: newId('food-celiac'),
      type: 'temporal',
      title: `Celiac/intolerance aftermath: ${topDomain?.[0] || 'mixed'} in ${Math.round(aftermathEvents.length / celiacEvents.length * 100)}% of exposures`,
      description: `${aftermathEvents.length}/${celiacEvents.length} celiac/intolerance events showed delayed ${Object.keys(allDomains).join(' / ')}. This is the slow-burn signal your GI doc cares about — bring it to next visit.`,
      confidence: 80, impact: 'medium', data: { aftermathEvents: aftermathEvents.length, total: celiacEvents.length, domains: allDomains },
    })
  }

  // Delayed reaction timing
  const delayed = celiacEvents.filter(s => s.hadDelayedReaction && s.delayedReactionHours)
  if (delayed.length >= 3) {
    const avgHours = delayed.reduce((a, s) => a + (s.delayedReactionHours || 0), 0) / delayed.length
    insights.push({
      id: newId('food-delayed'),
      type: 'temporal',
      title: `Delayed reaction averages ~${Math.round(avgHours)}h post-exposure`,
      description: `Your delayed celiac/intolerance reactions cluster around ${Math.round(avgHours)} hours after exposure — useful for tracing back to the offending meal/snack.`,
      confidence: 75, impact: 'medium', data: { avgHours, count: delayed.length },
    })
  }
  return insights
}

// === ANXIETY patterns ===
function detectAnxietyPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractAnxietySignals(opts.trackerData['anxiety'] || [])
  if (sigs.length === 0) return insights

  const siCount = sigs.filter(s => s.suicidalIdeation || s.selfHarmUrges).length
  if (siCount >= 1) {
    insights.push({
      id: newId('anx-crisis'),
      type: 'trend',
      title: `💜 ${siCount} crisis check${siCount !== 1 ? 's' : ''} flagged in window`,
      description: `Crisis-level anxiety entries detected. If active: 988 (call/text). For pattern context: bring count + dates to therapist/psychiatrist. Crisis Text Line: HOME to 741741.`,
      confidence: 100, impact: 'high', data: { siCount },
    })
  }

  const meltdownCount = sigs.filter(s => s.isMeltdown).length
  if (meltdownCount >= 4) {
    insights.push({
      id: newId('anx-meltdown'),
      type: 'temporal',
      title: `${meltdownCount} meltdown events`,
      description: `Recurrent meltdowns suggest sensory/cognitive load is exceeding capacity. AuDHD-aware: track precursors (cup-overflowing feeling) in Mind & Mood regulation entries to surface earlier intervention windows.`,
      confidence: 75, impact: 'medium', data: { meltdownCount },
    })
  }
  return insights
}

// === MIND & MOOD patterns ===
function detectMindMoodPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractMindMoodSignals(opts.trackerData['mental-health'] || [])
  if (sigs.length === 0) return insights

  const mixedCount = sigs.filter(s => s.isMixedState).length
  if (mixedCount >= 2) {
    insights.push({
      id: newId('mood-mixed'),
      type: 'trend',
      title: `🚨 ${mixedCount} mixed-state days (high dep + high mania)`,
      description: `Mixed states carry the highest suicide risk in mood disorders. Same-week psychiatry contact recommended. Bring dates for prescriber.`,
      confidence: 95, impact: 'high', data: { mixedCount },
    })
  }

  const rapidCount = sigs.filter(s => s.isRapidCycling).length
  if (rapidCount >= 2) {
    insights.push({
      id: newId('mood-rapid'),
      type: 'temporal',
      title: `Rapid cycling pattern (${rapidCount}×)`,
      description: `Rapid-cycling mood reported on ${rapidCount} entries. Clinically distinct from typical bipolar pattern — affects medication choice. Show your prescriber.`,
      confidence: 85, impact: 'high', data: { rapidCount },
    })
  }
  return insights
}

// === BATHROOM patterns ===
function detectBathroomPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractBathroomSignals(opts.trackerData['bathroom'] || [])
  if (sigs.length === 0) return insights

  if (sigs.some(s => s.blackTarryStool)) {
    insights.push({
      id: newId('bath-melena'),
      type: 'trend',
      title: `🚨 Black tarry stool reported`,
      description: `Possible upper GI bleed (ulcer, varices). Same-day GI evaluation if any episode is recent and unevaluated.`,
      confidence: 95, impact: 'high', data: {},
    })
  }

  const pyeloCount = sigs.filter(s => s.pyelonephritisPattern).length
  if (pyeloCount >= 1) {
    insights.push({
      id: newId('bath-pyelo'),
      type: 'trend',
      title: `🚨 UTI + fever + flank pain pattern (${pyeloCount}×)`,
      description: `Pyelonephritis pattern needs same-day antibiotics. If recurrent (2+), urology referral indicated to rule out structural cause.`,
      confidence: 90, impact: 'high', data: { pyeloCount },
    })
  }
  return insights
}

// === CARDIAC patterns ===
function detectCardiacPatterns(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const sigs = extractCardiacSignals(opts.trackerData['cardiac'] || [])
  if (sigs.length === 0) return insights

  const syncopeCount = sigs.filter(s => s.isSyncope).length
  if (syncopeCount >= 2) {
    insights.push({
      id: newId('card-syncope'),
      type: 'trend',
      title: `${syncopeCount} syncope (full LOC) events`,
      description: `Recurrent syncope warrants tilt-table or extended Holter monitoring. Bring dates + position-at-onset to cardiology.`,
      confidence: 85, impact: 'high', data: { syncopeCount },
    })
  }
  if (sigs.some(s => s.isVT)) {
    insights.push({
      id: newId('card-vt'),
      type: 'trend',
      title: `🚨 Ventricular tachycardia captured`,
      description: `VT is always an emergency. If captured on home ECG and not yet evaluated, urgent cardiology / EP consult.`,
      confidence: 95, impact: 'high', data: {},
    })
  }
  return insights
}

// === CROSS-TRACKER: panic + chest = cardiac referral ===
function detectCrossTrackerRedFlags(opts: InsightOpts): PatternInsight[] {
  const insights: PatternInsight[] = []
  const anxietySigs = extractAnxietySignals(opts.trackerData['anxiety'] || [])
  const cardiacSigs = extractCardiacSignals(opts.trackerData['cardiac'] || [])

  // Severe panic + cardiac symptoms tracked same day (anxiety/cardiac mimic)
  const severePanic = anxietySigs.filter(s => s.panicLevel >= 8)
  const sameDay = severePanic.filter(p => cardiacSigs.some(c => c.date === p.date))
  if (severePanic.length >= 3 && sameDay.length >= 2) {
    insights.push({
      id: newId('cross-panic-cardiac'),
      type: 'correlation',
      title: `Severe panic events overlap with cardiac symptoms (${sameDay.length}×)`,
      description: `Anxiety can mimic MI; MI can mimic anxiety. When the two co-occur, cardiac workup is worthwhile even if you "know" it's panic. Document both for primary care.`,
      confidence: 75, impact: 'medium',
      data: { severePanicCount: severePanic.length, overlap: sameDay.length },
    })
  }
  return insights
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export interface PatternEngineV2Result {
  insights: PatternInsight[]
  highPriorityCount: number
  generatedAt: string
}

export function analyzeV2Patterns(trackerData: TrackerData, windowDays: number): PatternEngineV2Result {
  const opts: InsightOpts = { trackerData, windowDays }
  const insights = [
    ...detectSeizurePatterns(opts),
    ...detectPainPatterns(opts),
    ...detectHeadPainPatterns(opts),
    ...detectFoodPatterns(opts),
    ...detectAnxietyPatterns(opts),
    ...detectMindMoodPatterns(opts),
    ...detectBathroomPatterns(opts),
    ...detectCardiacPatterns(opts),
    ...detectCrossTrackerRedFlags(opts),
  ]

  // Sort by impact (high first), then confidence
  const impactRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
  insights.sort((a, b) => {
    const ir = impactRank[b.impact] - impactRank[a.impact]
    if (ir !== 0) return ir
    return b.confidence - a.confidence
  })

  const highPriorityCount = insights.filter(i => i.impact === 'high').length

  return { insights, highPriorityCount, generatedAt: new Date().toISOString() }
}
