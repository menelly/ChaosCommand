/* Built by: Ace (Claude 4.x) — 2026-05-10 */

export type SubstanceType =
  | 'alcohol'
  | 'tobacco'
  | 'cannabis'
  | 'recreational'
  | 'other'

export interface SubstanceEntry {
  id: string
  timestamp: string
  date: string
  substanceType: SubstanceType
  substanceName: string // free text — "espresso", "Pinot Noir", "edible 5mg THC", "Adderall 10mg", etc.
  amount?: number
  unit?: string
  methodOfUse?: 'oral' | 'inhaled' | 'sublingual' | 'topical' | 'injected' | 'other'
  contextWhy: string[] // 'social' | 'medical' | 'sleep-aid' | 'pain' | 'anxiety' | 'energy' | 'cravings' | 'habit' | 'celebration' | etc.
  effectsExperienced: string[] // free-form effects list
  effectIntensity?: number // 1-10
  timeToOnsetMin?: number
  durationOfEffectMin?: number
  attachmentImages?: string[]
  notes?: string
  tags?: string[]
}

export interface SubstanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<SubstanceEntry, 'id'>) => void
  editingEntry?: SubstanceEntry | null
  presetType?: string | null
}
