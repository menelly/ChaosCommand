/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Thyroid tracker constants. Red flags:
 *   - Thyroid storm (hyperthyroid emergency): high fever + racing heart +
 *     agitation/confusion. Mortality is real; this is an ER-now pattern.
 *   - Myxedema crisis (severe hypothyroid): extreme cold + drowsiness/
 *     unresponsiveness. Also an emergency.
 *   - New eye changes with hyper symptoms → Graves' ophthalmology referral.
 */

import type { ThyroidEpisodeType, HypoSymptom, HyperSymptom } from './thyroid-types'

export const THYROID_SUBCATEGORY = 'thyroid'

export const EPISODE_TYPES: { id: ThyroidEpisodeType; name: string; icon: string; description: string; color: string }[] = [
  { id: 'symptoms', name: 'Symptoms', icon: '🦋', description: 'Daily hypo/hyper symptom log', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'labs', name: 'Lab Results', icon: '🧪', description: 'TSH, T3, T4, antibodies', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'medication', name: 'Medication', icon: '💊', description: 'Dose, timing, response', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'general', name: 'General', icon: '📋', description: 'Mixed or other thyroid note', color: 'bg-muted text-muted-foreground border-border' },
]

export const HYPO_SYMPTOMS: { value: HypoSymptom; label: string }[] = [
  { value: 'fatigue', label: 'Fatigue / sluggishness' },
  { value: 'cold-intolerance', label: 'Cold intolerance' },
  { value: 'weight-gain', label: 'Weight gain' },
  { value: 'constipation', label: 'Constipation' },
  { value: 'dry-skin', label: 'Dry skin' },
  { value: 'hair-loss', label: 'Hair loss / thinning' },
  { value: 'brain-fog', label: 'Brain fog' },
  { value: 'depression', label: 'Low mood / depression' },
  { value: 'puffiness', label: 'Facial puffiness' },
  { value: 'slow-heart-rate', label: 'Slow heart rate' },
  { value: 'heavy-periods', label: 'Heavy periods' },
  { value: 'muscle-aches', label: 'Muscle aches / cramps' },
]

export const HYPER_SYMPTOMS: { value: HyperSymptom; label: string }[] = [
  { value: 'palpitations', label: 'Palpitations' },
  { value: 'heat-intolerance', label: 'Heat intolerance' },
  { value: 'weight-loss', label: 'Weight loss' },
  { value: 'diarrhea', label: 'Diarrhea / frequent BMs' },
  { value: 'anxiety', label: 'Anxiety / jitteriness' },
  { value: 'tremor', label: 'Hand tremor' },
  { value: 'insomnia', label: 'Insomnia' },
  { value: 'sweating', label: 'Excessive sweating' },
  { value: 'rapid-heart-rate', label: 'Rapid heart rate' },
  { value: 'eye-changes', label: 'Eye changes (bulging/dryness)' },
  { value: 'light-periods', label: 'Light / absent periods' },
  { value: 'increased-appetite', label: 'Increased appetite' },
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

export const THYROID_STORM_WARNING = `Fever, a racing heart, and agitation or confusion together can signal thyroid storm — a hyperthyroid emergency. This is life-threatening and needs emergency care now. Call 911 or go to the ER.`

export const MYXEDEMA_WARNING = `Extreme cold intolerance with drowsiness or unresponsiveness can signal myxedema crisis — a severe hypothyroid emergency. Seek emergency care now.`

export const GRAVES_EYE_NOTE = `New eye changes (bulging, pressure, double vision, dryness) alongside hyperthyroid symptoms can be Graves' eye disease. Mention it to your provider — an ophthalmology referral may be needed.`

// Reference ranges for gentle context (NOT diagnostic — labs vary by assay)
export const LAB_REFERENCE = {
  tsh: '0.4–4.0 mIU/L (typical)',
  freeT4: '0.8–1.8 ng/dL (typical)',
  freeT3: '2.3–4.2 pg/mL (typical)',
}
