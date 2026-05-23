/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * PAIN TRACKER TYPES (v2)
 * Multi-modal episode classification with body-system-aware red flags.
 * Chest pain → cross-link to cardiac. Head pain → cross-link to head-pain.
 */

export type PainEpisodeType =
  | 'acute'
  | 'chronic-flare'
  | 'post-surgical'
  | 'general'

export type PainCharacter =
  | 'sharp'
  | 'dull'
  | 'throbbing'
  | 'burning'
  | 'stabbing'
  | 'aching'
  | 'cramping'
  | 'shooting'
  | 'tingling'
  | 'numbness'
  | 'pressure'
  | 'tight'
  | 'electric'
  | 'tearing'  // CRITICAL — aortic dissection marker

export type PainPattern =
  | 'constant'
  | 'intermittent'
  | 'worsening'
  | 'improving'
  | 'comes-and-goes'
  | 'morning-stiffness'
  | 'worse-with-movement'
  | 'better-with-rest'
  | 'radiating'
  | 'thunderclap'  // CRITICAL — SAH marker (sudden onset, max severity in seconds)

export interface PainEntry {
  id: string
  timestamp: string
  date: string

  // CLASSIFICATION
  episodeType: PainEpisodeType

  // CORE PAIN
  painLevel: number  // 0-10
  painLocations: string[]  // body parts
  painCharacter: string[]  // sharp/dull/etc
  painPattern: string[]    // constant/intermittent/etc
  painDuration?: string

  // ONSET (critical for red flags)
  suddenOnset?: boolean        // came on in seconds — thunderclap territory
  thunderclapPattern?: boolean // peaked within ~60 seconds
  tearingQuality?: boolean     // dissection marker

  // RADIATION (critical for MI / cauda equina detection)
  radiatesTo?: string[]  // 'left-arm', 'jaw', 'down-leg', 'between-shoulder-blades', etc.

  // ASSOCIATED RED-FLAG SYMPTOMS
  shortnessOfBreath?: boolean
  sweatingNausea?: boolean       // sympathetic surge — MI marker with chest pain
  legWeakness?: boolean          // cauda equina marker with back pain
  bowelBladderChanges?: boolean  // cauda equina marker
  saddleAnesthesia?: boolean     // cauda equina marker
  feverPresent?: boolean
  abdominalRigidity?: boolean    // peritonitis / surgical abdomen
  pulsatileMass?: boolean        // AAA marker

  // TRIGGERS / CONTEXT
  triggers?: string[]
  activityAtOnset?: string

  // TREATMENT
  treatments?: string[]
  medications?: string[]
  effectiveness?: number  // 0-10 — how well treatment worked

  // POST-SURGICAL CONTEXT (when episodeType === 'post-surgical')
  daysPostSurgery?: number
  surgeryType?: string

  // CHRONIC FLARE CONTEXT (when episodeType === 'chronic-flare')
  baselinePainLevel?: number  // their normal-day pain — flare is delta from this
  flareLikelyTrigger?: string

  // SAFETY / EMERGENCY MARKERS
  erVisitRequired?: boolean
  emergencyServicesCalled?: boolean

  // ATTACHMENTS (photos, lab pdfs, etc)
  attachmentImages?: string[]

  // META
  notes?: string
  tags?: string[]

  // LEGACY (for back-compat with v1 entries)
  painType?: string[]
  painQuality?: string[]
  painTriggers?: string[]
  activity?: string
  created_at?: string
  updated_at?: string
}

export interface PainModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<PainEntry, 'id'>) => void
  editingEntry?: PainEntry | null
  initialEpisodeType?: PainEpisodeType
}
