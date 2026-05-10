/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
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
 * CARDIAC TRACKER TYPES
 * TypeScript interfaces for cardiac event tracking — arrhythmias, chest pain,
 * syncope, presyncope, palpitations.
 */

export type CardiacEpisodeType =
  | 'arrhythmia'
  | 'chest-pain'
  | 'syncope'
  | 'presyncope'
  | 'palpitations'
  | 'general'

export type RhythmType =
  | 'NSR'
  | 'PAC'
  | 'PAC-couplet'
  | 'PVC'
  | 'PVC-couplet'
  | 'SVT'
  | 'AVNRT'
  | 'AVRT'
  | 'AFib'
  | 'Aflutter'
  | 'VT'
  | 'bradycardia'
  | 'sinus-tachycardia'
  | 'heart-block'
  | 'unknown'

export type PositionType =
  | 'standing'
  | 'sitting'
  | 'lying'
  | 'transitioning'
  | 'sleep'
  | 'exertion'
  | 'unknown'

export type ResolutionMethod =
  | 'valsalva'
  | 'cough'
  | 'cold-water-face'
  | 'lying-flat'
  | 'medication'
  | 'spontaneous'
  | '911'
  | 'cardioversion'
  | 'pacing-rest'
  | 'other'

export interface CardiacEntry {
  id: string
  timestamp: string
  date: string
  episodeType: CardiacEpisodeType

  // RHYTHM CLASSIFICATION
  rhythmType?: RhythmType
  hrPeak?: number
  hrAverage?: number
  hrAtOnset?: number
  hrAtResolution?: number

  // ECG OBJECTIVE FINDINGS (from home ECG strips)
  uWavesNoted?: boolean // hypokalemia indicator
  stChanges?: boolean
  ecgStripImages?: string[] // blob keys for ViHealth screenshot uploads

  // VITALS AT EVENT
  bpAtEvent?: string // e.g., "119/82"
  spo2AtEvent?: number

  // CHEST PAIN CHARACTER (when applicable)
  chestPainCharacter?: 'pressure' | 'sharp' | 'burning' | 'crushing' | 'tightness' | 'tearing' | 'other'
  chestPainRadiation?: string[] // 'left-arm' | 'jaw' | 'back' | 'right-arm' | 'neck' | 'epigastric'

  // LOC TRACKING (critical for syncope characterization)
  locOccurred?: boolean
  locDurationMin?: number // 0 if no LOC
  prodromePresent?: boolean
  prodromeDurationSec?: number
  prodromeSymptoms?: string[]
  positionAtOnset?: PositionType
  positionAtResolution?: PositionType

  // RESOLUTION
  resolutionMethod?: ResolutionMethod
  valsalvaSuccessSeconds?: number // how long bear-down took to break it
  timeToResolutionMin?: number
  erVisitRequired?: boolean

  // PRE-EVENT CONTEXT (key trigger correlations)
  hoursOfSleepLastNight?: number
  possibleDehydration?: boolean
  possibleElectrolyteLoss?: boolean
  caffeineOnBoard?: boolean

  // SYMPTOMS & TRIGGERS
  symptoms: string[]
  symptomSeverity: number // 1-10 scale
  triggers: string[]
  duration?: string // "5 minutes", "30 seconds", etc.

  // NOTES & TAGS
  notes?: string
  tags?: string[]
}

export interface CardiacModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<CardiacEntry, 'id' | 'timestamp' | 'date'>) => void
  editingEntry?: CardiacEntry | null
}
