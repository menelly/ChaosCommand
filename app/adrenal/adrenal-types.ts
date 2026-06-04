/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Adrenal tracker types. Adrenal insufficiency (Addison's), Cushing's, and
 * general cortisol-pattern tracking — plus the single most important feature:
 * ADRENAL CRISIS warning + stress-dosing log. Adrenal crisis kills fast and is
 * preventable with timely steroids; this tracker centers that.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type AdrenalEpisodeType =
  | 'symptoms'      // daily fatigue/cortisol-pattern symptoms
  | 'stress-dose'   // recorded a stress dose of steroids (sick day rules)
  | 'crisis-warning' // crisis warning signs present — SAFETY CRITICAL
  | 'labs'          // cortisol, ACTH, electrolytes
  | 'general'

export type AdrenalDirection = 'insufficiency' | 'excess' | 'unsure'

export type InsufficiencySymptom =
  | 'profound-fatigue'
  | 'dizziness-standing'   // orthostatic — low BP
  | 'salt-craving'
  | 'nausea'
  | 'weight-loss'
  | 'low-blood-pressure'
  | 'darkening-skin'       // hyperpigmentation (primary AI)
  | 'muscle-weakness'
  | 'abdominal-pain'
  | 'low-mood'

export type ExcessSymptom =
  | 'central-weight-gain'
  | 'moon-face'
  | 'easy-bruising'
  | 'purple-stretch-marks'
  | 'high-blood-pressure'
  | 'muscle-weakness'
  | 'mood-changes'
  | 'high-blood-sugar'
  | 'insomnia'

export interface AdrenalEntry {
  id: string
  timestamp: string
  date: string
  episodeType: AdrenalEpisodeType

  direction?: AdrenalDirection
  insufficiencySymptoms?: InsufficiencySymptom[]
  excessSymptoms?: ExcessSymptom[]

  // STRESS DOSING (sick-day rules for adrenal insufficiency)
  stressDoseGiven?: boolean
  stressDoseMed?: string         // hydrocortisone, prednisone, etc.
  stressDoseMg?: number
  stressDoseReason?: string      // illness, surgery, injury, vomiting, etc.
  routeInjection?: boolean       // emergency IM injection (Solu-Cortef) given

  // CRISIS WARNING (safety-critical cluster)
  vomiting?: boolean             // can't keep oral steroids down → injection needed
  severeWeakness?: boolean
  confusion?: boolean
  unableToKeepMedsDown?: boolean
  emergencyInjectionUsed?: boolean

  // LABS
  cortisol?: number
  acth?: number
  sodium?: number
  potassium?: number
  labNotes?: string

  erVisit?: boolean
  endoNotified?: boolean

  severity: number               // 1-10
  notes?: string
  tags?: string[]
}

export interface AdrenalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<AdrenalEntry, 'id'>) => void
  editingEntry?: AdrenalEntry | null
}
