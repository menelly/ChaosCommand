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
 * RESPIRATORY TRACKER TYPES
 * Asthma attacks, SOB, cough, allergic reactions, wheezing, pleuritic pain.
 */

export type RespiratoryEpisodeType =
  | 'asthma-attack'
  | 'sob'
  | 'cough'
  | 'allergic-reaction'
  | 'wheeze'
  | 'pleuritic-pain'
  | 'general'

export type PeakFlowZone = 'green' | 'yellow' | 'red' | 'unknown'

export type CoughCharacter =
  | 'dry'
  | 'wet-clear'
  | 'wet-yellow'
  | 'wet-green'
  | 'wet-blood'
  | 'barking'
  | 'unknown'

export type BreathingPattern =
  | 'wheezy'
  | 'stridor'
  | 'shallow'
  | 'rapid'
  | 'labored'
  | 'tripod-needed'
  | 'normal-just-uncomfortable'

export interface RespiratoryEntry {
  id: string
  timestamp: string
  date: string
  episodeType: RespiratoryEpisodeType

  // Severity & character
  severity: number // 1-10
  breathingPattern?: BreathingPattern
  chestTightness?: number // 1-10
  coughCharacter?: CoughCharacter

  // Objective measurements
  peakFlowReading?: number // L/min
  peakFlowZone?: PeakFlowZone
  spo2Lowest?: number
  hrAtEvent?: number

  // Inhaler / rescue medication
  inhalerUsed?: boolean
  inhalerName?: string
  inhalerDoses?: number
  inhalerResponse?: number // 1-5

  // Anaphylaxis flags (allergic-reaction only — but checkable on any modal)
  swelling?: boolean // face/lips/tongue
  hivesPresent?: boolean
  throatTightness?: boolean
  epinephrineGiven?: boolean

  // Triggers
  triggers: string[]
  symptoms: string[]

  // Resolution
  timeToResolutionMin?: number
  erVisitRequired?: boolean

  // Attachments
  attachmentImages?: string[]

  // Meta
  notes?: string
  tags?: string[]
}

export interface RespiratoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<RespiratoryEntry, 'id'>) => void
  editingEntry?: RespiratoryEntry | null
}
