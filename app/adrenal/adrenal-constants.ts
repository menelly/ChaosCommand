/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Adrenal tracker constants. THE red flag here is adrenal crisis, which is
 * rapidly fatal and preventable:
 *   - Vomiting + can't keep steroids down (adrenal insufficiency) → emergency
 *     IM hydrocortisone injection + ER. Oral dosing fails if you can't keep it
 *     down; this is the #1 way people with AI die avoidably.
 *   - Severe weakness + confusion + low BP cluster → crisis, ER now.
 * Sick-day / stress-dosing rules are core: double/triple oral steroids for
 * illness; inject + ER if vomiting.
 */

import type { AdrenalEpisodeType, InsufficiencySymptom, ExcessSymptom } from './adrenal-types'

export const ADRENAL_SUBCATEGORY = 'adrenal'

export const EPISODE_TYPES: { id: AdrenalEpisodeType; name: string; icon: string; description: string; color: string }[] = [
  { id: 'symptoms', name: 'Symptoms', icon: '🔥', description: 'Fatigue, cortisol-pattern symptoms', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'stress-dose', name: 'Stress Dose', icon: '💉', description: 'Log a sick-day / stress dose of steroids', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'crisis-warning', name: 'Crisis Warning', icon: '🚨', description: 'Crisis warning signs — emergency guidance', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'labs', name: 'Lab Results', icon: '🧪', description: 'Cortisol, ACTH, electrolytes', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'general', name: 'General', icon: '📋', description: 'Mixed or other adrenal note', color: 'bg-muted text-muted-foreground border-border' },
]

export const INSUFFICIENCY_SYMPTOMS: { value: InsufficiencySymptom; label: string }[] = [
  { value: 'profound-fatigue', label: 'Profound fatigue / exhaustion' },
  { value: 'dizziness-standing', label: 'Dizziness on standing' },
  { value: 'salt-craving', label: 'Salt craving' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'weight-loss', label: 'Weight loss' },
  { value: 'low-blood-pressure', label: 'Low blood pressure' },
  { value: 'darkening-skin', label: 'Skin darkening (hyperpigmentation)' },
  { value: 'muscle-weakness', label: 'Muscle weakness' },
  { value: 'abdominal-pain', label: 'Abdominal pain' },
  { value: 'low-mood', label: 'Low mood' },
]

export const EXCESS_SYMPTOMS: { value: ExcessSymptom; label: string }[] = [
  { value: 'central-weight-gain', label: 'Central weight gain' },
  { value: 'moon-face', label: 'Facial rounding (moon face)' },
  { value: 'easy-bruising', label: 'Easy bruising' },
  { value: 'purple-stretch-marks', label: 'Purple stretch marks' },
  { value: 'high-blood-pressure', label: 'High blood pressure' },
  { value: 'muscle-weakness', label: 'Muscle weakness' },
  { value: 'mood-changes', label: 'Mood changes' },
  { value: 'high-blood-sugar', label: 'High blood sugar' },
  { value: 'insomnia', label: 'Insomnia' },
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

export const ADRENAL_CRISIS_WARNING = `These are adrenal crisis warning signs. If you have adrenal insufficiency and you're vomiting or can't keep your steroids down, oral dosing will NOT work — you need an emergency injection (e.g. Solu-Cortef / hydrocortisone IM) and the ER now. Adrenal crisis is life-threatening and moves fast. Do not wait. Call 911 or go to the ER.`

export const STRESS_DOSE_NOTE = `Sick-day rules (adrenal insufficiency): for illness/fever/injury, oral steroids are typically doubled or tripled per your endocrinologist's plan. If you can't keep them down (vomiting), use your emergency injection and go to the ER. Log what you took here so you and your provider can see the pattern.`

export const LAB_REFERENCE = {
  cortisol: 'AM cortisol ~6–23 µg/dL (timing-dependent)',
  sodium: '135–145 mmol/L',
  potassium: '3.5–5.0 mmol/L',
}
