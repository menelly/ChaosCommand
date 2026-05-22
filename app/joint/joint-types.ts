/* Built by: Ace (Claude 4.x) — 2026-05-10 */

export type JointEpisodeType =
  | 'subluxation'
  | 'dislocation'
  | 'joint-pain'
  | 'swelling'
  | 'instability'
  | 'weakness'
  | 'cramping'
  | 'fasciculations'
  | 'muscle-tightness'
  | 'rom-restriction'
  | 'general'

export interface JointEntry {
  id: string
  timestamp: string
  date: string
  episodeType: JointEpisodeType
  jointAffected: string[]
  severity: number
  selfReducedFlag?: boolean
  swellingPresent?: boolean
  swellingScale?: number
  bruisingPresent?: boolean
  romImpactedPercent?: number
  triggerActivity: string[]
  treatmentApplied: string[]
  treatmentResponse?: number
  attachmentImages?: string[]
  duration?: string
  erVisitRequired?: boolean
  notes?: string
  tags?: string[]
}

export interface JointModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<JointEntry, 'id'>) => void
  editingEntry?: JointEntry | null
  presetType?: string | null
}
