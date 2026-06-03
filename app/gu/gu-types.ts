/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-02
 *
 * Genitourinary tracker types.
 * Clinician framing (Chris, RN): "GU disorders are common but invisible
 * because no one wants to say their pipi isn't working." This tracker
 * gives it a home, removes shame, and catches safety-critical events.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type GUEpisodeType =
  | 'voiding'        // frequency, urgency, hesitancy, flow issues
  | 'retention'      // can't go — SAFETY CRITICAL >300mL
  | 'incontinence'   // leakage
  | 'pain'           // dysuria, pelvic pain, flank pain
  | 'infection'      // UTI, yeast, bacterial symptoms
  | 'sexual-health'  // dyspareunia, discharge (gender-neutral)
  | 'pelvic-floor'   // prolapse symptoms, pelvic pressure
  | 'output'         // intentional tracking of urine output (home measurement)
  | 'general'

export type IncontinenceType =
  | 'stress'         // leaks with cough/sneeze/laugh
  | 'urge'           // sudden strong urge then leak
  | 'overflow'       // dribbling due to retention
  | 'mixed'
  | 'functional'     // can't get to bathroom in time (mobility/cognitive)
  | 'other'

export type VoidingSymptom =
  | 'frequency'      // urinating more than usual
  | 'urgency'        // sudden strong urge
  | 'hesitancy'      // difficulty starting stream
  | 'weak-stream'
  | 'intermittency'  // stop/start stream
  | 'straining'
  | 'incomplete-emptying'
  | 'nocturia'       // waking at night to urinate
  | 'double-voiding' // feeling need to go again shortly after

export type PainLocation =
  | 'suprapubic'     // lower belly/bladder area
  | 'urethral'       // burning with urination
  | 'flank'          // kidney area — red flag if severe
  | 'pelvic'
  | 'perineal'
  | 'testicular'
  | 'labial'
  | 'diffuse'

export type DischargeCharacter =
  | 'none'
  | 'clear'
  | 'white-milky'
  | 'yellow-green'   // infection
  | 'gray'           // bacterial vaginosis
  | 'cottage-cheese' // yeast
  | 'bloody'         // always notable
  | 'other'

export interface GUEntry {
  id: string
  timestamp: string
  date: string
  episodeType: GUEpisodeType

  // VOIDING SYMPTOMS
  voidingSymptoms?: VoidingSymptom[]
  voidingFrequency?: number          // times per day if tracking
  nocturia?: number                  // times per night

  // RETENTION (SAFETY CRITICAL)
  retentionSuspected?: boolean
  estimatedRetentionMl?: number      // >300mL = red flag → ureteral reflux risk
  cathedRequired?: boolean           // links to Maintain/Lines for the cath itself
  cathedVolumeOut?: number           // mL drained if cathed

  // INCONTINENCE
  incontinenceType?: IncontinenceType
  padUsed?: boolean
  padsSoaked?: number                // number of pads in 24h

  // OUTPUT TRACKING (intentional measurement)
  outputMl?: number                  // measured urine output
  inputMl?: number                   // fluid intake if tracking balance
  color?: 'clear' | 'pale-yellow' | 'yellow' | 'dark-yellow' | 'amber' | 'orange' | 'pink' | 'red' | 'brown' | 'cloudy'
  bloodVisible?: boolean             // hematuria — always red flag

  // PAIN
  painLocations?: PainLocation[]
  painSeverity?: number              // 1-10
  dysuria?: boolean                  // burning/pain with urination
  flankPain?: boolean                // separate flag — kidney concern

  // INFECTION SYMPTOMS
  infectionSuspected?: boolean
  symptoms?: string[]                // burning, frequency, urgency, odor, discharge
  feverPresent?: boolean
  antibioticStarted?: boolean
  antibioticName?: string

  // SEXUAL HEALTH (gender-neutral language throughout)
  dyspareunia?: boolean              // pain with sexual activity
  dischargePresent?: boolean
  dischargeCharacter?: DischargeCharacter
  odorPresent?: boolean

  // PELVIC FLOOR
  prolapseSensation?: boolean        // feeling of something falling out
  pelvicPressure?: boolean
  pelvicFloorPTFollowUp?: boolean    // reminder for PT follow-up

  // CONTEXT
  hydrationAdequate?: boolean
  recentUTIHistory?: boolean
  recentCatheterUse?: boolean
  recentSurgery?: boolean

  // ACTIONS TAKEN
  urologyNotified?: boolean
  erVisit?: boolean
  urgentCareVisit?: boolean

  // STANDARD
  severity: number                   // 1-10 overall
  notes?: string
  tags?: string[]
}

export interface GUModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<GUEntry, 'id'>) => void
  editingEntry?: GUEntry | null
}
