/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus)
 *
 * TRACKER ANALYTICS CONFIG — the only per-tracker knowledge in the pipeline.
 *
 * Each tracker declares its own field names and nothing else. Every metric
 * comes from lib/tracker-analytics.ts, so a new metric added there appears in
 * every tracker at once instead of one improving and the rest drifting.
 *
 * ⚠️ FIELD NAMES ARE LISTS ON PURPOSE. Trackers renamed fields over time and
 * old entries still carry the old name. The engine takes the first name present
 * on each entry, so a rename does not silently zero out a user's history — it
 * just adds a name to the list. A single hardcoded field name is how a tracker
 * quietly stops counting its own oldest data.
 */

import type { TrackerAnalyticsConfig } from './tracker-analytics'

/** Names that have meant "how bad was it" somewhere in this codebase. */
const COMMON_SEVERITY = ['severity', 'painLevel', 'symptomSeverity', 'severityLevel', 'level']

/** Names that have meant "what did you do about it". */
const COMMON_TREATMENTS = ['treatments', 'treatmentApplied', 'medications', 'interventions']

const COMMON_TRIGGERS = ['triggers', 'triggerActivity', 'painTriggers', 'suspectedTriggers']

export const TRACKER_ANALYTICS: Record<string, TrackerAnalyticsConfig> = {
  autoimmune: {
    key: 'autoimmune',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      locations: ['affectedAreas', 'bodyAreas'],
      character: ['character'],
    },
    flagFields: { 'ER visits': 'erVisitRequired' },
  },

  joint: {
    key: 'joint',
    severityFields: COMMON_SEVERITY,
    // The user's own rating of how well the treatment worked. Real efficacy
    // testimony, collected since day one and never once displayed.
    responseField: 'treatmentResponse',
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      locations: ['jointAffected', 'musclesAffected'],
    },
    flagFields: {
      'ER visits': 'erVisitRequired',
      'Swelling': 'swellingPresent',
      'Bruising': 'bruisingPresent',
      'Self-reduced': 'selfReducedFlag',
    },
  },

  pain: {
    key: 'pain',
    severityFields: COMMON_SEVERITY,
    // Where the existing "avg flare delta" tile comes from. Now available to
    // every tracker that records a baseline, instead of pain alone.
    baselineField: 'baselinePainLevel',
    responseField: 'effectiveness',
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      locations: ['painLocations'],
      character: ['painCharacter', 'painQuality', 'painType'],
      patterns: ['painPattern'],
    },
    flagFields: { 'Sudden onset': 'suddenOnset' },
  },

  'head-pain': {
    key: 'head-pain',
    severityFields: [...COMMON_SEVERITY, 'painIntensity'],
    responseField: 'effectiveness',
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      locations: ['painLocations', 'headLocations'],
      character: ['painCharacter', 'painQuality'],
      patterns: ['painPattern'],
    },
  },

  seizure: {
    key: 'seizure',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      triggers: COMMON_TRIGGERS,
      character: ['seizureSymptoms', 'symptoms', 'auraSymptoms', 'postSeizureSymptoms'],
    },
    flagFields: {
      'Injuries': 'injuriesOccurred',
      'Witnessed': 'witnessPresent',
      'Dose missed': 'medicationMissed',
      'Aura present': 'auraPresent',
    },
  },

  'mental-health': {
    key: 'mental-health',
    // This tracker records several parallel scales. `moodIntensity` is the one
    // that means "how strong was this state", so it is the severity spine; the
    // rest are separate series and belong in their own panel, not averaged
    // together into a single meaningless number.
    severityFields: ['moodIntensity', ...COMMON_SEVERITY],
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: ['copingStrategies', ...COMMON_TREATMENTS],
      triggers: COMMON_TRIGGERS,
      character: ['emotionalState', 'cognitiveSymptoms'],
    },
  },

  skin: {
    key: 'skin',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      // `suspectedTrigger` is singular here — a real stored field name, not a
      // typo to tidy. Renaming it in code would orphan every existing entry.
      triggers: ['suspectedTrigger', ...COMMON_TRIGGERS],
      locations: ['bodyLocation', 'affectedAreas', 'bodyAreas'],
      character: ['character', 'appearance'],
    },
    flagFields: { 'ER visits': 'erVisitRequired', 'Epinephrine given': 'epinephrineGiven' },
    // Photo documentation matters more here than almost anywhere: a rash three
    // weeks ago is unreproducible at an appointment.
    attachmentFields: ['photos'],
  },

  neuro: {
    key: 'neuro',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      // Neurological distribution (dermatomal, glove-and-stocking, etc.) is
      // this tracker's location analogue.
      locations: ['distribution', 'affectedAreas', 'bodyAreas'],
      character: ['symptoms'],
    },
    flagFields: { 'ER visits': 'erVisitRequired' },
  },

  anxiety: {
    key: 'anxiety',
    severityFields: ['anxietyLevel', ...COMMON_SEVERITY],
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: ['copingStrategies', ...COMMON_TREATMENTS],
      triggers: COMMON_TRIGGERS,
      character: ['symptoms', 'physicalSymptoms'],
    },
  },

  'upper-digestive': {
    key: 'upper-digestive',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      character: ['symptoms'],
    },
    flagFields: { 'ER visits': 'erVisitRequired', 'Red flag': 'redFlag' },
  },

  dysautonomia: {
    key: 'dysautonomia',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      character: ['symptoms'],
    },
  },

  cardiac: {
    key: 'cardiac',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      character: ['symptoms'],
    },
    flagFields: { 'ER visits': 'erVisitRequired' },
  },

  respiratory: {
    key: 'respiratory',
    severityFields: COMMON_SEVERITY,
    episodeTypeField: 'episodeType',
    listFields: {
      treatments: COMMON_TREATMENTS,
      triggers: COMMON_TRIGGERS,
      character: ['symptoms'],
    },
    flagFields: { 'ER visits': 'erVisitRequired' },
  },
  // ─── MEASURE-STYLE TRACKERS ───────────────────────────────────────────────
  // These do not record "how bad was it" — they record an amount, and for most
  // of them MORE IS BETTER. `higherIsBetter` is load-bearing here: without it
  // the engine reports a good sleep month as deteriorating.

  sleep: {
    key: 'sleep',
    severityFields: ['hoursSlept', 'sleepHours', 'hours'],
    severityMax: 14,
    higherIsBetter: true,
    unit: 'h',
    listFields: {
      treatments: ['sleepAids', 'preSleepFactors'],
      triggers: ['disruptions'],
      character: ['wakeFeeling', 'quality', 'dreamType'],
    },
    flagFields: { 'Woke repeatedly': 'wokeUpMultipleTimes' },
  },

  hydration: {
    key: 'hydration',
    severityFields: ['amount'],
    // Volume, not a 0-10 scale. The histogram is meaningless at this range, so
    // the renderer should show daily totals over time instead — the engine
    // still supplies mean, trend and rate, which are the useful parts.
    severityMax: 0,
    higherIsBetter: true,
    unit: 'ml',
    listFields: { character: ['drinkType'] },
  },

  energy: {
    key: 'energy',
    // Spoon theory: what you started the day holding.
    severityFields: ['morningSpoons'],
    severityMax: 20,
    higherIsBetter: true,
    unit: 'spoons',
    listFields: { triggers: ['activities'], treatments: ['restPeriods'] },
  },

  movement: {
    key: 'movement',
    // A before/after pair, which means every logged movement carries its own
    // effect measurement. energyAfter - energyBefore is the benefit, and it has
    // never been shown anywhere.
    severityFields: ['energyAfter'],
    baselineField: 'energyBefore',
    severityMax: 10,
    higherIsBetter: true,
    unit: 'energy',
    episodeTypeField: 'type',
    listFields: { character: ['bodyFeel', 'intensity'], locations: ['location'] },
  },

  bathroom: {
    key: 'bathroom',
    severityFields: ['painScore', 'painLevel'],
    episodeTypeField: 'episodeType',
    listFields: { character: ['bristolScale'], triggers: COMMON_TRIGGERS },
  },

  'medication-adherence': {
    key: 'medication-adherence',
    severityFields: [],
    higherIsBetter: true,
    // Doses taken out of doses due. A bare "18 taken" is unreadable without
    // knowing whether 18 or 60 were expected.
    ratioFields: { numerator: 'taken', denominator: 'expected', label: 'Doses taken' },
  },

  'self-care': {
    key: 'self-care',
    severityFields: [],
    higherIsBetter: true,
    ratioFields: { numerator: 'completedCount', denominator: 'totalCount', label: 'Completed' },
  },
}

/** Config for a tracker, or a permissive default so nothing renders empty. */
export function analyticsConfigFor(key: string): TrackerAnalyticsConfig {
  return (
    TRACKER_ANALYTICS[key] || {
      key,
      severityFields: COMMON_SEVERITY,
      episodeTypeField: 'episodeType',
      listFields: {
        treatments: COMMON_TREATMENTS,
        triggers: COMMON_TRIGGERS,
      },
    }
  )
}
