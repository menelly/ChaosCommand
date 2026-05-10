/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v2 refactor — CHA-153)
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * SEIZURE TRACKER TYPES
 * v2 architecture — multi-modal episode classification with status epilepticus red flags.
 */

export type SeizureEpisodeType =
  | 'focal-aware'
  | 'focal-impaired'
  | 'tonic-clonic'
  | 'absence'
  | 'myoclonic'
  | 'atonic'
  | 'general'

export type ConsciousnessLevel =
  | 'fully-aware'
  | 'partially-aware'
  | 'unaware'
  | 'confused'
  | 'unknown'

export type DurationCategory =
  | 'under-30s'
  | '30s-1min'
  | '1-2min'
  | '2-5min'
  | '5-10min'
  | 'over-10min'
  | 'unknown'

export interface SeizureEntry {
  id: string
  timestamp: string
  date: string

  // EPISODE CLASSIFICATION
  episodeType: SeizureEpisodeType
  // Legacy field (preserved for back-compat with v1 entries)
  seizureType?: string

  // DURATION (CRITICAL — drives status epilepticus detection)
  durationCategory?: DurationCategory
  durationMinutes?: number  // exact minutes when known (>5 = status epilepticus)

  // STATUS EPILEPTICUS / EMERGENCY MARKERS
  statusEpilepticus?: boolean    // single seizure ≥5 minutes
  multipleConsecutive?: boolean  // multiple seizures without recovery between
  consecutiveCount?: number
  noRecoveryBetween?: boolean    // didn't regain awareness between events
  rescueMedicationUsed?: boolean
  rescueMedicationDetails?: string
  emergencyServicesCalled?: boolean

  // AWARENESS
  consciousness?: ConsciousnessLevel
  locOccurred?: boolean

  // AURA / PRODROME (Pre-seizure)
  auraPresent?: boolean
  auraSymptoms?: string[]
  auraDescription?: string
  auraDurationSeconds?: number

  // ICTAL (During seizure)
  symptoms: string[]
  symptomDescription?: string

  // POSTICTAL (Recovery)
  recoveryTime?: string
  postSeizureSymptoms?: string[]
  todsParesis?: boolean   // post-ictal weakness/paralysis

  // SAFETY / INJURY
  location?: string
  witnessPresent?: boolean
  injuriesOccurred?: boolean
  injuryDetails?: string
  injuryRequiredER?: boolean
  fellOrInjured?: boolean
  tongueBitten?: boolean
  incontinence?: boolean

  // TRIGGERS / CONTEXT
  triggers?: string[]
  medicationMissed?: boolean
  missedMedicationDetails?: string

  // PRE-EVENT CONTEXT (for trigger correlation analytics)
  hoursOfSleepLastNight?: number
  possibleDehydration?: boolean
  recentIllness?: boolean
  flashingLights?: boolean

  // SEVERITY
  symptomSeverity?: number  // 1-10

  // ATTACHMENTS (EEG screenshots, video stills, etc)
  attachmentImages?: string[]

  // META
  notes?: string
  tags?: string[]
}

export interface SeizureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<SeizureEntry, 'id'>) => void
  editingEntry?: SeizureEntry | null
}

export interface SeizureStats {
  totalSeizures: number
  thisWeek: number
  thisMonth: number
  averagePerWeek: number
  mostCommonType: string
  mostCommonTriggers: string[]
  injuryRate: number
  medicationCompliance: number
  statusEpilepticusCount: number
  rescueMedUsageCount: number
}
