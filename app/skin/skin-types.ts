/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */

export type SkinEpisodeType =
  | 'rash'
  | 'hives'
  | 'eczema-flare'
  | 'mole-lesion'
  | 'wound'
  | 'sunburn'
  | 'allergic-contact'
  | 'general'

export type SkinCharacter =
  | 'red'
  | 'raised'
  | 'flat'
  | 'scaly'
  | 'oozing'
  | 'crusted'
  | 'blistered'
  | 'pigmented'
  | 'pustular'
  | 'necrotic'

export type SpreadingPattern =
  | 'localized'
  | 'spreading-slowly'
  | 'spreading-fast'
  | 'symmetric'
  | 'asymmetric'
  | 'unknown'

export interface SkinEntry {
  id: string
  timestamp: string
  date: string
  episodeType: SkinEpisodeType

  // Location & character
  bodyLocation: string[] // anatomical regions
  characterDescription: string[] // SkinCharacter values
  spreadingPattern?: SpreadingPattern
  sizeDescription?: string // "quarter-sized" or "5cm"

  // Severity scales
  severity?: number // 1-10
  itchiness?: number // 1-10
  pain?: number // 1-10

  // Anaphylaxis flags
  swelling?: boolean // face/lip/tongue
  throatTightness?: boolean
  breathingDifficulty?: boolean
  hivesPresent?: boolean
  epinephrineGiven?: boolean

  // Systemic warning signs
  fevePresent?: boolean
  mucousMembraneInvolvement?: boolean // mouth/eyes/genitals — SJS concern
  newMedicationRecent?: boolean // SJS / DRESS concern

  // Triggers
  suspectedTrigger: string[]

  // Treatment
  treatmentApplied: string[]
  treatmentResponse?: number // 1-5

  // Duration
  duration?: string

  // ABCDE for moles (when episodeType === 'mole-lesion')
  asymmetric?: boolean
  borderIrregular?: boolean
  colorVariable?: boolean
  diameterOver6mm?: boolean
  evolving?: boolean

  // Resolution
  erVisitRequired?: boolean

  // Attachments — PHOTOS ARE PRIMARY for this tracker
  photos?: string[]

  notes?: string
  tags?: string[]
}

export interface SkinModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<SkinEntry, 'id' | 'timestamp' | 'date'>) => void
  editingEntry?: SkinEntry | null
}
