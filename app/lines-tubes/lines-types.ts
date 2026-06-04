/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes tracker types. The COMPLICATION half of indwelling-device care:
 * "is this device causing a problem?" (Devices & Timers handles "when does it
 * need changing?"). Clinician framing (Chris, RN): people with lines, tubes,
 * ostomies, and drains live with a constant low-grade question of "is this
 * normal or is this the thing that lands me in the ER?" This tracker documents
 * the site, catches the safety-critical patterns (CLABSI, airway, obstruction,
 * dislodged immature tracts, air embolism), and builds the record a provider
 * actually needs.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type DeviceType =
  | "picc"               // peripherally inserted central catheter
  | "central-port"       // implanted port (Port-a-Cath)
  | "central-tunneled"   // tunneled central line (Hickman/Broviac)
  | "central-temp"       // non-tunneled / temporary central line
  | "midline"            // midline catheter (NOT central)
  | "peripheral-iv"      // peripheral IV
  | "ostomy-colostomy"
  | "ostomy-ileostomy"
  | "ostomy-urostomy"
  | "foley"              // indwelling urinary catheter
  | "suprapubic"         // suprapubic catheter
  | "feeding-ng"         // nasogastric tube
  | "feeding-gtube"      // G-tube / PEG
  | "feeding-gj"         // GJ / J-tube
  | "trach"              // tracheostomy
  | "drain"              // surgical drain (JP, Penrose, etc.)
  | "wound-vac"          // negative-pressure wound therapy
  | "other"

export type ProblemType =
  | "routine-check"      // no problem — logging a look / care done
  | "site-infection"     // redness, warmth, pus, ± fever
  | "occlusion"          // won't flush / draw / drain — clogged
  | "dislodgement"       // came out / partially out / migrated
  | "leakage"            // leaking around the site / stoma / connector
  | "mechanical"         // kinked, cracked, broken clamp, balloon issue
  | "skin-breakdown"     // peristomal / site skin irritation or breakdown
  | "bleeding"           // bleeding at the site
  | "output-change"      // ostomy/drain output color/volume/blood change
  | "pain"               // pain at or around the site
  | "general"

export type OutputColor =
  | "normal"
  | "cloudy"
  | "dark"
  | "bloody"
  | "bilious-green"      // bile — feeding/GI drains
  | "serous-clear"
  | "serosanguinous"     // pink-tinged — common for fresh drains
  | "purulent"           // pus — infection
  | "other"

export interface LinesEntry {
  id: string
  timestamp: string
  date: string

  deviceType: DeviceType
  deviceLabel?: string            // optional custom name, e.g. "Right arm PICC"
  daysSincePlacement?: number     // matters for dislodged feeding tubes (immature tract)

  problemType: ProblemType

  // SITE APPEARANCE
  redness?: boolean
  warmth?: boolean
  swelling?: boolean
  drainagePresent?: boolean
  drainageDescription?: string
  odorPresent?: boolean
  feverPresent?: boolean

  // FUNCTION
  flushes?: boolean               // does it flush (lines/tubes)
  draining?: boolean              // is it draining (foley/drains/ostomy)
  fullyDislodged?: boolean        // came all the way out
  partiallyDislodged?: boolean    // backed out / migrated

  // OUTPUT (ostomy / drains / urinary)
  outputMl?: number
  outputColor?: OutputColor
  noOutput?: boolean              // concerning for ostomy + symptoms / blocked foley
  outputBlood?: boolean

  // OBSTRUCTION CLUSTER (ostomy)
  abdominalDistension?: boolean
  cramping?: boolean
  vomiting?: boolean

  // AIRWAY (trach)
  breathingDifficulty?: boolean
  cantClearSecretions?: boolean

  // PAIN
  painSeverity?: number           // 1-10

  // ACTIONS TAKEN
  flushedAttempted?: boolean
  dressingChanged?: boolean
  homeHealthNotified?: boolean
  providerNotified?: boolean
  erVisit?: boolean

  // STANDARD
  severity: number                // 1-10 overall
  notes?: string
  tags?: string[]
}

export interface LinesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<LinesEntry, "id">) => void
  editingEntry?: LinesEntry | null
}
