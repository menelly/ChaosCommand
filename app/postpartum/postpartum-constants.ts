/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Postpartum & Newborn constants — sections, options, red flags, feeding-term
 * helper. Red flags (clinician-flagged, CHA-251):
 *   - HEMORRHAGE: boggy fundus, soaking >=1 pad/hr, or golf-ball+ clots → ER.
 *     #1 cause of preventable postpartum death; it can come on fast and late.
 *   - MASTITIS: red/hot/painful breast + fever/flu-feeling → provider today.
 *   - ENDOMETRITIS: fever + foul lochia + uterine tenderness → provider.
 *   - PPD/PPP: low/anxious mood screened gently; intrusive thoughts or thoughts
 *     of harming self/baby → immediate crisis resources (postpartum psychosis
 *     is an emergency).
 *   - NEWBORN: fever >=100.4F (38C) under 3 months = ER, no exceptions.
 *     Spreading jaundice, too-few wet diapers (dehydration), poor feeding.
 */

import type { PostpartumSection, LochiaFlow, RecoverySymptom, FeedMethod, FeedSide, DiaperType, FeedingTerm } from './postpartum-types'

export const POSTPARTUM_SUBCATEGORY = 'postpartum'

export const SECTIONS: { id: PostpartumSection; name: string; icon: string; description: string; color: string }[] = [
  { id: 'recovery', name: 'Recovery', icon: '🩹', description: 'Your healing — bleeding, uterus, pain, mood', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'feeding', name: 'Feeding', icon: '🍼', description: 'Which side, duration, pumping, bottles', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'infant', name: 'Baby', icon: '👶', description: 'Diapers, weight, sleep, jaundice', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'general', name: 'General', icon: '📋', description: 'Mixed or other note', color: 'bg-purple-100 text-purple-800 border-purple-200' },
]

export const LOCHIA_FLOW: { value: LochiaFlow; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'soaking', label: 'Soaking (a pad in under an hour)' },
]

export const RECOVERY_SYMPTOMS: { value: RecoverySymptom; label: string }[] = [
  { value: 'afterpains', label: 'Afterpains (cramping)' },
  { value: 'perineal-pain', label: 'Perineal pain / soreness' },
  { value: 'incision-pain', label: 'C-section incision pain' },
  { value: 'engorgement', label: 'Breast/chest engorgement' },
  { value: 'mastitis-signs', label: 'Red/hot/painful breast + feeling ill' },
  { value: 'hemorrhoids', label: 'Hemorrhoids' },
  { value: 'constipation', label: 'Constipation' },
  { value: 'night-sweats', label: 'Night sweats' },
  { value: 'hair-loss', label: 'Hair shedding' },
  { value: 'swelling', label: 'Swelling' },
]

export const FEED_METHODS: { value: FeedMethod; label: string }[] = [
  { value: 'breast-chest', label: 'Direct (breast/chest)' },
  { value: 'bottle-ebm', label: 'Bottle (expressed milk)' },
  { value: 'bottle-formula', label: 'Bottle (formula)' },
  { value: 'pump', label: 'Pumping session' },
  { value: 'combo', label: 'Combination' },
]

export const FEED_SIDES: { value: FeedSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
  { value: 'n-a', label: 'N/A' },
]

export const DIAPER_TYPES: { value: DiaperType; label: string }[] = [
  { value: 'wet', label: 'Wet' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'mixed', label: 'Both' },
  { value: 'dry', label: 'Dry (no output)' },
]

export const SEVERITY_LABELS: { level: number; label: string; color: string }[] = [
  { level: 1, label: 'Minimal', color: 'text-muted-foreground' },
  { level: 2, label: 'Very mild', color: 'text-muted-foreground' },
  { level: 3, label: 'Mild', color: 'text-muted-foreground' },
  { level: 4, label: 'Mild-moderate', color: 'text-warning' },
  { level: 5, label: 'Moderate', color: 'text-warning' },
  { level: 6, label: 'Moderate', color: 'text-warning' },
  { level: 7, label: 'Moderate-severe', color: 'text-warning' },
  { level: 8, label: 'Severe', color: 'text-destructive' },
  { level: 9, label: 'Very severe', color: 'text-destructive' },
  { level: 10, label: 'Crisis', color: 'text-destructive' },
]

// ── RED FLAGS ─────────────────────────────────────────────────────────────────
export const HEMORRHAGE_WARNING = `These can signal postpartum hemorrhage — soaking a pad an hour or less, passing clots bigger than a golf ball, or a uterus that feels soft/"boggy" rather than firm. Postpartum hemorrhage can come on fast, even weeks after birth, and is an emergency. Call 911 or go to the ER now. (Firmly massaging the top of the uterus can slow bleeding while you get help.)`

export const MASTITIS_WARNING = `A red, hot, painful area on the breast/chest along with fever or feeling flu-ish can be mastitis. Keep feeding/pumping from that side and contact your provider today — it often needs antibiotics.`

export const ENDOMETRITIS_WARNING = `Fever with foul-smelling lochia and uterine tenderness can signal a uterine infection (endometritis). Contact your provider today.`

export const PP_MOOD_CRISIS_WARNING = `Intrusive thoughts, or any thoughts of harming yourself or your baby, are a medical emergency — postpartum psychosis and severe PPD are treatable, and reaching out is the strong thing to do. You are not a bad parent for having these thoughts. Please contact a crisis line now (988 in the US) or go to the ER. You deserve help and so does your baby.`

export const PP_MOOD_NOTE = `Persistent low mood, anxiety, or not feeling like yourself for more than ~2 weeks postpartum is common and treatable (PPD/PPA). It's worth telling your provider — this is medical, not a failing.`

export const NEWBORN_FEVER_WARNING = `A fever of 100.4°F (38°C) or higher in a baby under 3 months is a medical emergency — go to the ER now, even if the baby seems otherwise okay. Newborn immune systems can't localize infection, so fever is taken very seriously.`

export const DEHYDRATION_WARNING = `Too few wet diapers (under ~6/day after the first week), a sunken soft spot, no tears, or a very sleepy baby who won't feed can signal dehydration. Contact your pediatrician / go to the ER.`

export const JAUNDICE_WARNING = `Jaundice that's spreading down the body (to the belly, arms, or legs), or a very yellow baby who is feeding poorly or hard to wake, needs prompt evaluation — call your pediatrician today.`

// Feeding-term helper — gender-neutral by default. Reads personalization pref later.
export function feedingNoun(term: FeedingTerm = 'feeding'): string {
  return term === 'breastfeeding' ? 'breastfeeding' : term === 'chestfeeding' ? 'chestfeeding' : 'feeding'
}

// Parent-term: what to call the user as a parent. Joy goes BOTH ways — neutral
// is the DEFAULT (safe for everyone), but a user who WANTS "Mama"/"Papa" gets it.
// Never auto-derived from pronouns; an explicit personalization choice (CHA-261).
// A free-form custom string is allowed (the pref can pass anything).
export function parentNoun(term: string = 'parent'): string {
  return (term && term.trim()) ? term.trim() : 'parent'
}
// Capitalized for headers ("Mama, how are you?" / "Parent, how are you?")
export function parentNounCap(term: string = 'parent'): string {
  const n = parentNoun(term)
  return n.charAt(0).toUpperCase() + n.slice(1)
}

// "Start the OTHER side" reminder from last recorded side.
export function nextSideHint(lastSide?: FeedSide): string | null {
  if (lastSide === 'left') return 'You fed left last time — consider starting on the right.'
  if (lastSide === 'right') return 'You fed right last time — consider starting on the left.'
  return null
}
