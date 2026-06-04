/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Postpartum & Newborn tracker types. ONE module, three sections, because new
 * parents are drowning and "not another fucking app" is the whole point:
 *   - Recovery  : the birthing PARENT's body (lochia, fundus, healing, mood)
 *   - Feeding   : bridges parent + infant (which side last, duration, pumping,
 *                 bottle) — gender-neutral term (breast/chest/feeding)
 *   - Infant    : the baby (diapers, intake, weight, sleep, jaundice)
 *
 * Safety-critical (per clinician review, CHA-251):
 *   - Postpartum hemorrhage: boggy uterus + soaking a pad/hr + large clots
 *   - Postpartum mood: PPD/PPP screening with crisis escalation
 *   - Newborn fever <3mo, dehydration signs, spreading jaundice
 *
 * Language is gender-neutral by default ("parent", configurable feeding term).
 * When the personalization pref (CHA-261) lands, the feeding term + parent
 * label read from it.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type PostpartumSection = 'recovery' | 'feeding' | 'infant' | 'general'

export type FeedingTerm = 'breastfeeding' | 'chestfeeding' | 'feeding'

// ── RECOVERY (birthing parent) ──────────────────────────────────────────────
export type LochiaFlow = 'none' | 'spotting' | 'light' | 'moderate' | 'heavy' | 'soaking'
export type LochiaColor = 'rubra-red' | 'serosa-pink-brown' | 'alba-yellow-white'
export type FundusFirmness = 'firm' | 'boggy'   // boggy = hemorrhage red flag
export type DeliveryType = 'vaginal' | 'c-section' | 'vbac' | 'assisted'

export type RecoverySymptom =
  | 'afterpains'
  | 'perineal-pain'
  | 'incision-pain'        // C-section
  | 'engorgement'
  | 'mastitis-signs'       // red/hot/painful breast + fever/flu-feeling
  | 'hemorrhoids'
  | 'constipation'
  | 'night-sweats'
  | 'hair-loss'
  | 'swelling'

// ── FEEDING ──────────────────────────────────────────────────────────────────
export type FeedMethod = 'breast-chest' | 'bottle-ebm' | 'bottle-formula' | 'pump' | 'combo'
export type FeedSide = 'left' | 'right' | 'both' | 'n-a'

// ── INFANT ─────────────────────────────────────────────────────────────────
export type DiaperType = 'wet' | 'dirty' | 'mixed' | 'dry'
export type StoolColor = 'meconium-black' | 'transitional-green' | 'yellow-seedy' | 'brown' | 'pale-clay' | 'red-blood' | 'other'

export interface PostpartumEntry {
  id: string
  timestamp: string
  date: string
  section: PostpartumSection

  // ── RECOVERY ──
  daysPostpartum?: number
  deliveryType?: DeliveryType
  lochiaFlow?: LochiaFlow
  lochiaColor?: LochiaColor
  padsSoakedPerHour?: number      // >=1 pad/hr soaked = hemorrhage red flag
  largeClots?: boolean            // clots bigger than a golf ball = red flag
  fundusFirmness?: FundusFirmness // boggy = red flag
  recoverySymptoms?: RecoverySymptom[]
  feverPresent?: boolean          // + mastitis signs, or endometritis concern
  // Mood / PPD screening (gentle, not diagnostic)
  moodCheck?: boolean
  moodLow?: boolean
  moodAnxious?: boolean
  intrusiveThoughts?: boolean     // → crisis escalation
  thoughtsOfHarm?: boolean        // → crisis escalation (self or baby)

  // ── FEEDING ──
  feedMethod?: FeedMethod
  feedSideStarted?: FeedSide      // which side started — drives "start the OTHER side next"
  feedSideLast?: FeedSide
  feedDurationLeftMin?: number
  feedDurationRightMin?: number
  bottleAmountMl?: number
  pumpedAmountMl?: number
  latchQuality?: number           // 1-10
  supplyConcern?: boolean

  // ── INFANT ──
  diaperType?: DiaperType
  stoolColor?: StoolColor
  wetDiapers24h?: number          // dehydration watch (low = concern)
  infantWeightG?: number
  infantSleepHours?: number
  jaundiceNoted?: boolean
  jaundiceSpreading?: boolean     // spreading down body = red flag
  infantFeverTempF?: number       // <3mo + >=100.4F = ER red flag
  infantFeedingPoorly?: boolean

  // ── ACTIONS ──
  erVisit?: boolean
  providerNotified?: boolean
  lactationConsult?: boolean

  severity?: number               // 1-10 (recovery discomfort / overall)
  notes?: string
  tags?: string[]
}

export interface PostpartumModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<PostpartumEntry, 'id'>) => void
  editingEntry?: PostpartumEntry | null
  feedingTerm?: FeedingTerm       // from personalization pref (CHA-261); default 'feeding'
  parentTerm?: string             // what to call the user as a parent: 'mama'/'papa'/'parent'/custom (CHA-261)
  lastFeedSide?: FeedSide         // computed from history → "start the other side"
}
