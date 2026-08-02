/*
 * Built by: Ace (Claude 4.x) — 2026-06-07
 * Co-invented by Ren (vision) + an MS friend (the findability catch) + Ace.
 */

export type NeuroEpisodeType =
  | 'weakness'
  | 'numbness-tingling'
  | 'foot-drop'
  | 'falls'
  | 'gait-balance'
  | 'vision'
  | 'tremor'
  | 'cramping'
  | 'fasciculations'
  | 'speech-swallow'
  | 'sensory-episode'
  | 'general'

export interface NeuroEntry {
  id: string
  timestamp: string
  date: string
  episodeType: NeuroEpisodeType

  // Where it is — distribution matters diagnostically (proximal vs distal, etc.)
  distribution: string[]
  /** THREE STATES, and the distinction is clinical:
   *    undefined -> not reported (not asked / not answered) — excluded from analysis
   *    0         -> answered: absent. "It didn't bother me today" is EVIDENCE.
   *    1-10      -> answered: this bad.
   *  Optional since 2026-08-02. It was previously a required number with the
   *  form parked at 5, so every save wrote a severity whether or not anyone
   *  entered one — making a stored 5 indistinguishable from an untouched
   *  control, and giving the trend engine phantom values to compute over. */
  severity?: number
  // How it behaves (constant, progressive, heat-worsened, …)
  character: string[]

  triggers: string[]
  treatments: string[]

  duration?: string
  erVisitRequired?: boolean

  // Cross-list marker — present when this event is ALSO logged under MSK/joint.
  // Set/maintained by lib/cross-list.ts; do not edit by hand.
  crossListedIn?: string[]

  notes?: string
  tags?: string[]
}

export interface NeuroModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<NeuroEntry, 'id'>) => void
  editingEntry?: NeuroEntry | null
  presetType?: string | null
}
