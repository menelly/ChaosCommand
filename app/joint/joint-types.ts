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
  | 'morning-stiffness'
  | 'inflammatory-swelling'
  | 'enthesitis'
  | 'gel-phenomenon'
  | 'general'

export interface JointEntry {
  id: string
  timestamp: string
  date: string
  episodeType: JointEpisodeType
  jointAffected: string[]
  /** Muscle groups affected — populated instead of jointAffected for muscle
   *  event types (weakness / cramping / fasciculations / muscle tightness). */
  musclesAffected?: string[]
  /** THREE STATES since 2026-08-02 (see components/ui/severity-input.tsx):
   *    undefined -> not reported (not asked / not answered) — excluded from analysis
   *    0         -> answered: absent. "It didn't bother me" is EVIDENCE, not a blank.
   *    1-10      -> answered: this bad.
   *  Previously a REQUIRED number with the form parked at 5, so every save wrote a
   *  severity whether or not anyone entered one — making a stored 5 impossible to
   *  tell apart from an untouched control. */
  severity?: number
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
  // Cross-list marker — present when this event is ALSO logged under Neuro.
  // Set/maintained by lib/cross-list.ts; do not edit by hand.
  crossListedIn?: string[]
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
