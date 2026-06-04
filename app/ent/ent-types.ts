/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * ENT (ear/nose/throat) tracker types.
 * Covers the common-but-underserved cluster: recurrent sinus, ear infections,
 * vertigo/dizziness, tinnitus, hearing changes, throat/voice. Several real
 * red flags live here — sudden sensorineural hearing loss is a same-day
 * emergency (steroid window), and so is anything that looks like mastoiditis.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type ENTEpisodeType =
  | 'ear'         // otitis, pain, drainage, fullness, pressure
  | 'hearing'     // hearing change / loss — SAFETY: sudden SNHL
  | 'tinnitus'    // ringing/buzzing
  | 'vertigo'     // spinning, BPPV, vestibular
  | 'sinus'       // congestion, pressure, infection
  | 'throat'      // sore throat, hoarseness, swallowing
  | 'nosebleed'   // epistaxis
  | 'general'

export type EarSide = 'left' | 'right' | 'both'

export type EarSymptom =
  | 'pain'
  | 'fullness'      // pressure / blocked feeling
  | 'drainage'      // otorrhea — note character below
  | 'itching'
  | 'popping'
  | 'muffled-hearing'

export type DrainageCharacter =
  | 'none'
  | 'clear'
  | 'cloudy'
  | 'purulent'      // yellow/green — infection
  | 'bloody'
  | 'foul-smelling' // can indicate cholesteatoma / chronic infection

export type VertigoType =
  | 'positional'    // BPPV — triggered by head position
  | 'spontaneous'   // comes on at rest
  | 'continuous'
  | 'lightheaded'   // pre-syncope feeling, NOT true spinning (different cause)

export type SinusSymptom =
  | 'congestion'
  | 'facial-pressure'
  | 'facial-pain'
  | 'postnasal-drip'
  | 'reduced-smell'
  | 'discolored-discharge'
  | 'dental-pain'   // maxillary sinus refers to upper teeth

export type ThroatSymptom =
  | 'sore'
  | 'hoarseness'    // >2-3wk hoarseness = needs scope (red flag)
  | 'difficulty-swallowing'
  | 'painful-swallowing'
  | 'lump-sensation' // globus
  | 'voice-loss'
  | 'cough'

export interface ENTEntry {
  id: string
  timestamp: string
  date: string
  episodeType: ENTEpisodeType

  // EAR
  earSide?: EarSide
  earSymptoms?: EarSymptom[]
  drainageCharacter?: DrainageCharacter

  // HEARING (safety-relevant)
  hearingChanged?: boolean
  hearingChangeSide?: EarSide
  hearingSudden?: boolean        // sudden onset → sudden SNHL red flag (steroid window)
  hearingWithVertigo?: boolean   // hearing loss + vertigo = inner-ear, escalate

  // TINNITUS
  tinnitusPresent?: boolean
  tinnitusSide?: EarSide
  tinnitusPulsatile?: boolean    // pulsatile (heartbeat-synced) is its own red flag — vascular

  // VERTIGO
  vertigoType?: VertigoType
  vertigoDurationSec?: number    // seconds (BPPV) vs minutes-hours (vestibular) matters
  vertigoWithHeadMovement?: boolean
  nystagmusNoted?: boolean

  // SINUS
  sinusSymptoms?: SinusSymptom[]
  sinusDaysOngoing?: number      // >10 days or worsening-after-improving = bacterial pattern
  feverPresent?: boolean

  // THROAT
  throatSymptoms?: ThroatSymptom[]
  hoarsenessDays?: number        // >2-3 weeks = laryngoscopy red flag

  // NOSEBLEED
  nosebleedDurationMin?: number  // >20min despite pressure = needs care
  nosebleedBothNostrils?: boolean

  // RED FLAG ESCALATIONS (user-recorded actions)
  difficultyBreathing?: boolean  // throat swelling → airway → emergency
  drooling?: boolean             // can't swallow secretions → epiglottitis concern
  neckStiffness?: boolean        // + fever + ear = mastoiditis/meningitis concern
  erVisit?: boolean
  urgentCareVisit?: boolean
  entNotified?: boolean

  // CONTEXT
  recentURI?: boolean            // recent cold often precedes ear/sinus
  allergyFlare?: boolean
  recentAirTravel?: boolean      // barotrauma
  recentSwimming?: boolean       // swimmer's ear

  // STANDARD
  severity: number               // 1-10
  notes?: string
  tags?: string[]
}

export interface ENTModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<ENTEntry, 'id'>) => void
  editingEntry?: ENTEntry | null
}
