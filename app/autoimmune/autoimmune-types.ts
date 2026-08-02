/* Built by: Ace (Claude 4.x) — 2026-06-07 */

export type AutoimmuneEpisodeType =
  | 'sicca-eyes'
  | 'sicca-mouth'
  | 'raynauds'
  | 'mechanic-hands'
  | 'inflammatory-rash'
  | 'arthralgia'
  | 'morning-stiffness'
  | 'myalgia'
  | 'constitutional'
  | 'oral-ulcers'
  | 'serositis'
  | 'lymphadenopathy'
  | 'dysphagia'
  | 'alopecia'
  | 'general'

export interface AutoimmuneEntry {
  id: string
  timestamp: string
  date: string
  episodeType: AutoimmuneEpisodeType

  // Where / what's affected (glands, vasculature, skin, joints, systemic)
  affectedAreas: string[]
  /** THREE STATES since 2026-08-02 (see components/ui/severity-input.tsx):
   *    undefined -> not reported (not asked / not answered) — excluded from analysis
   *    0         -> answered: absent. "It didn't bother me" is EVIDENCE, not a blank.
   *    1-10      -> answered: this bad.
   *  Previously a REQUIRED number with the form parked at 5, so every save wrote a
   *  severity whether or not anyone entered one — making a stored 5 impossible to
   *  tell apart from an untouched control. */
  severity?: number
  character: string[]

  triggers: string[]
  treatments: string[]

  duration?: string
  erVisitRequired?: boolean

  // Cross-list marker — present when this event is ALSO logged under another
  // tracker (skin / joint / neuro). Set/maintained by the cross-list helper.
  crossListedIn?: string[]

  notes?: string
  tags?: string[]
}

export interface AutoimmuneModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<AutoimmuneEntry, 'id'>) => void
  editingEntry?: AutoimmuneEntry | null
  presetType?: string | null
}
