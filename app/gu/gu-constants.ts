/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-02
 *
 * GU tracker constants — episode types, options, red flags.
 * Safety-critical thresholds per clinical review (Chris, RN):
 *   - Urinary retention >300mL → risk of ureteral reflux + kidney damage
 *   - Visible blood in urine → always warrants evaluation
 *   - Flank pain + fever → pyelonephritis, not just a UTI
 */

import type { GUEpisodeType, VoidingSymptom, PainLocation, IncontinenceType } from './gu-types'

export const GU_CATEGORIES = {
  TRACKER: 'tracker',
} as const

export const GU_SUBCATEGORY = 'gu'

export const EPISODE_TYPES: { id: GUEpisodeType; name: string; icon: string; description: string; color: string }[] = [
  { id: 'voiding', name: 'Voiding Symptoms', icon: '💧', description: 'Frequency, urgency, hesitancy, weak stream', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'retention', name: 'Urinary Retention', icon: '🚨', description: 'Difficulty emptying — SAFETY CRITICAL if >300mL', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'incontinence', name: 'Incontinence', icon: '💦', description: 'Leakage — stress, urge, overflow, mixed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'pain', name: 'Pain / Dysuria', icon: '⚡', description: 'Burning, pelvic pain, flank pain', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'infection', name: 'Infection Symptoms', icon: '🦠', description: 'UTI, yeast, bacterial symptoms', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'sexual-health', name: 'Sexual Health', icon: '🌸', description: 'Dyspareunia, discharge, odor', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'pelvic-floor', name: 'Pelvic Floor', icon: '🧘', description: 'Prolapse sensation, pressure, PT tracking', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'output', name: 'Output Tracking', icon: '📊', description: 'Measured urine output and fluid balance', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'general', name: 'General GU Event', icon: '🫧', description: 'Mixed or other GU symptoms', color: 'bg-muted text-muted-foreground border-border' },
]

export const VOIDING_SYMPTOMS: { value: VoidingSymptom; label: string }[] = [
  { value: 'frequency', label: 'Increased frequency' },
  { value: 'urgency', label: 'Sudden urgency' },
  { value: 'hesitancy', label: 'Hesitancy (trouble starting)' },
  { value: 'weak-stream', label: 'Weak stream' },
  { value: 'intermittency', label: 'Stop/start stream' },
  { value: 'straining', label: 'Straining to void' },
  { value: 'incomplete-emptying', label: 'Feeling of incomplete emptying' },
  { value: 'nocturia', label: 'Waking at night to urinate' },
  { value: 'double-voiding', label: 'Double voiding' },
]

export const PAIN_LOCATIONS: { value: PainLocation; label: string }[] = [
  { value: 'suprapubic', label: 'Suprapubic / lower belly' },
  { value: 'urethral', label: 'Urethral / burning with urination' },
  { value: 'flank', label: 'Flank (kidney area)' },
  { value: 'pelvic', label: 'Pelvic' },
  { value: 'perineal', label: 'Perineal' },
  { value: 'testicular', label: 'Testicular' },
  { value: 'labial', label: 'Labial' },
  { value: 'diffuse', label: 'Diffuse / hard to localize' },
]

export const INCONTINENCE_TYPES: { value: IncontinenceType; label: string; description: string }[] = [
  { value: 'stress', label: 'Stress', description: 'Leaks with cough, sneeze, laugh, or exertion' },
  { value: 'urge', label: 'Urge', description: 'Sudden strong urge followed by leak before reaching bathroom' },
  { value: 'overflow', label: 'Overflow', description: 'Dribbling due to bladder not emptying fully' },
  { value: 'mixed', label: 'Mixed', description: 'Combination of stress and urge' },
  { value: 'functional', label: 'Functional', description: 'Can\'t reach the bathroom in time (mobility or cognitive)' },
  { value: 'other', label: 'Other / unsure', description: '' },
]

export const URINE_COLORS = [
  { value: 'clear', label: 'Clear', description: 'Very well hydrated or overhydrated' },
  { value: 'pale-yellow', label: 'Pale yellow', description: 'Well hydrated — normal' },
  { value: 'yellow', label: 'Yellow', description: 'Normal' },
  { value: 'dark-yellow', label: 'Dark yellow', description: 'Mildly dehydrated' },
  { value: 'amber', label: 'Amber / orange', description: 'Dehydrated or bilirubin' },
  { value: 'pink', label: 'Pink / light red', description: 'Hematuria — log and monitor' },
  { value: 'red', label: 'Red', description: 'Visible blood — warrants evaluation' },
  { value: 'brown', label: 'Brown / cola-colored', description: 'Possible rhabdo, liver issue, or old blood' },
  { value: 'cloudy', label: 'Cloudy / foamy', description: 'Possible infection or protein' },
]

// ── RED FLAGS ─────────────────────────────────────────────────────────────────
// These are safety-critical thresholds that trigger alert banners in the modal.

export const RED_FLAGS = {
  retention_threshold_ml: 300,  // >300mL retained → ureteral reflux risk (Chris, RN)
  flank_plus_fever: true,       // flank pain + fever = pyelonephritis until proven otherwise
  visible_blood: true,          // hematuria always warrants evaluation
  brown_urine: true,            // cola-colored = rhabdo/liver concern
}

export const RETENTION_WARNING = `Urinary retention over 300mL risks ureteral reflux and kidney damage.
If you cannot void or suspect significant retention, contact your care team or go to urgent care.
If you have a catheter, this is a device emergency.`

export const FLANK_FEVER_WARNING = `Flank pain with fever suggests the infection may have reached your kidneys (pyelonephritis).
This requires prompt medical evaluation — oral antibiotics alone may not be sufficient.`

export const HEMATURIA_WARNING = `Visible blood in urine always warrants evaluation.
Some causes are benign (UTI, exercise) but others are not. Log this and contact your provider.`

// Severity scale labels
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

// ── INFECTION TRIAGE GUIDANCE ─────────────────────────────────────────────────
// Shown contextually in the modal based on symptoms selected.
// NOT a diagnosis — guidance on urgency level for seeking care.

export const INFECTION_TRIAGE = {
  // Simple uncomplicated UTI — the "probably telehealth is fine" scenario
  uncomplicated: {
    trigger: 'dysuria + frequency/urgency, no fever, no flank pain, not pregnant, no catheter',
    level: 'routine' as const,
    guidance: `Symptoms suggest a simple UTI. Telehealth or your primary care within 1-2 days is usually fine.
Drink plenty of water. OTC phenazopyridine (AZO) helps burning but doesn't treat infection.
Note: it turns urine bright orange — normal, not blood.`,
  },

  // Complicated UTI — needs same-day attention
  complicated: {
    trigger: 'fever OR flank pain OR nausea/vomiting OR systemically unwell',
    level: 'urgent' as const,
    guidance: `Fever or flank pain with UTI symptoms suggests the infection may have spread to your kidneys (pyelonephritis).
This needs same-day evaluation — oral antibiotics may not be enough.
Go to urgent care or your provider today. If you feel very unwell, go to the ER.`,
  },

  // Catheter-associated UTI — device issue first
  catheter: {
    trigger: 'has catheter + infection symptoms',
    level: 'urgent' as const,
    guidance: `UTI with a urinary catheter (CAUTI) often requires catheter evaluation or change in addition to antibiotics.
Contact your care team today — don't wait on this one.`,
  },

  // Pregnancy — always treat promptly
  pregnancy: {
    trigger: 'pregnant + any UTI symptoms',
    level: 'urgent' as const,
    guidance: `UTI in pregnancy requires prompt treatment even if symptoms seem mild.
Untreated UTIs can cause preterm labor. Contact your OB/midwife today.`,
  },

  // Recurrent UTIs — pattern worth addressing
  recurrent: {
    trigger: '3+ UTIs in the past year',
    level: 'followup' as const,
    guidance: `Recurrent UTIs (3+ per year) are worth discussing with a urologist.
There may be an underlying cause (structural, hormonal, microbiome) that can be addressed to reduce frequency.`,
  },

  // Yeast infection
  yeast: {
    trigger: 'cottage-cheese discharge + itching, no fever',
    level: 'routine' as const,
    guidance: `Typical yeast infection symptoms. OTC treatment (Monistat/fluconazole) is reasonable for a first or occasional episode.
If this is your 4th+ this year, or OTC treatment isn't working, see a provider — may be resistant strain, diabetes, or immune issue.`,
  },

  // BV — needs prescription
  bv: {
    trigger: 'gray discharge + fishy odor',
    level: 'routine' as const,
    guidance: `Gray discharge with fishy odor suggests bacterial vaginosis (BV).
BV needs prescription antibiotics — OTC yeast treatments won't help.
Telehealth is fine for this; it's common and treatable.`,
  },

  // Discharge that might be STI
  sti_possible: {
    trigger: 'yellow/green discharge, new sexual partner, or no clear other cause',
    level: 'routine' as const,
    guidance: `Yellow or green discharge warrants STI testing, especially with a new partner.
Telehealth or a sexual health clinic can arrange testing discreetly.
Many STIs have no symptoms — testing is the only way to know.`,
  },

  // Visible blood without clear cause
  hematuria_no_infection: {
    trigger: 'blood in urine without obvious UTI symptoms',
    level: 'urgent' as const,
    guidance: `Blood in urine without infection symptoms needs evaluation to rule out kidney stones, bladder issues, or other causes.
One episode after intense exercise can be normal, but recurrent or unexplained hematuria warrants urology referral.`,
  },
}

// Helper: determine which triage guidance applies given entry state
export function getInfectionTriageLevel(
  hasFever: boolean,
  hasFlankPain: boolean,
  hasCatheter: boolean,
  dischargeCharacter: string | undefined,
  bloodVisible: boolean,
  infectionSuspected: boolean
): typeof INFECTION_TRIAGE[keyof typeof INFECTION_TRIAGE] | null {
  if (!infectionSuspected && !bloodVisible) return null
  if (hasFever || hasFlankPain) return INFECTION_TRIAGE.complicated
  if (hasCatheter && infectionSuspected) return INFECTION_TRIAGE.catheter
  if (bloodVisible && !infectionSuspected) return INFECTION_TRIAGE.hematuria_no_infection
  if (dischargeCharacter === 'cottage-cheese') return INFECTION_TRIAGE.yeast
  if (dischargeCharacter === 'gray') return INFECTION_TRIAGE.bv
  if (dischargeCharacter === 'yellow-green') return INFECTION_TRIAGE.sti_possible
  if (infectionSuspected) return INFECTION_TRIAGE.uncomplicated
  return null
}
