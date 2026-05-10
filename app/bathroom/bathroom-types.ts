/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v0.4.5 — Tier 2 multi-modal)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 */

export type BathroomEpisodeType =
  | 'normal-bm'
  | 'constipation'
  | 'diarrhea'
  | 'urinary'
  | 'blood-or-red-flag'
  | 'general'

export interface BathroomEntry {
  id: string
  timestamp?: string
  date: string
  time: string

  // v2 classification
  episodeType: BathroomEpisodeType

  // Bowel
  status?: string  // legacy field
  bristolScale?: string  // 1-7
  bowelCount?: number
  painLevel?: string  // 'None' | 'Mild' | 'Moderate' | 'Severe' | 'WHY'
  painScore?: number  // 0-10

  // Stool red flags
  bloodInStool?: boolean
  bloodColor?: 'bright-red' | 'dark-red' | 'black-tarry' | 'mucus' | 'unknown'
  noStoolDays?: number  // for constipation — days without BM

  // Urinary
  urinaryType?: 'normal' | 'frequent' | 'urgency' | 'painful' | 'blood' | 'leakage' | 'retention'
  urineColor?: string
  urineCount?: number  // visits
  urinaryPainScore?: number  // 0-10
  bloodInUrine?: boolean
  feverWithUrinary?: boolean  // pyelonephritis red flag
  flankPain?: boolean  // kidney pain

  // Severity / impact
  severeAbdominalPain?: boolean
  cantPassGas?: boolean  // obstruction marker
  vomiting?: boolean

  // Context
  triggers?: string[]
  recentDietChange?: boolean
  recentMedChange?: boolean
  hydrationLevel?: 'good' | 'low' | 'minimal'

  // Photos / attachments
  photos?: string[]
  attachmentImages?: string[]

  // Treatment
  treatments?: string[]

  // Outcome
  erVisitRequired?: boolean
  emergencyServicesCalled?: boolean

  // Meta
  notes?: string
  tags?: string[]

  createdAt?: string
  updatedAt?: string
  count?: number  // legacy
}

export interface BathroomModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<BathroomEntry, 'id'>) => void
  editingEntry?: BathroomEntry | null
  initialEpisodeType?: BathroomEpisodeType
}
