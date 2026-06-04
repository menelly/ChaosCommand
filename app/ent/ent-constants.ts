/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * ENT tracker constants — episode types, options, red flags, triage.
 *
 * Safety-critical thresholds (clinical):
 *   - SUDDEN sensorineural hearing loss = ER/ENT SAME DAY. Steroids work best
 *     within ~72h; every day of delay lowers recovery odds. This is the one
 *     people most often sit on thinking "it'll clear" — it won't.
 *   - Hearing loss + vertigo + tinnitus together = inner-ear, urgent.
 *   - Pulsatile tinnitus = vascular workup (not "just ringing").
 *   - Hoarseness > 2-3 weeks = laryngoscopy (rule out laryngeal pathology).
 *   - Throat + drooling + difficulty breathing = airway emergency (epiglottitis).
 *   - Ear pain/drainage + fever + behind-ear swelling/redness = mastoiditis, ER.
 *   - Nosebleed > 20 min despite firm pressure = needs care.
 */

import type { ENTEpisodeType, EarSymptom, SinusSymptom, ThroatSymptom, VertigoType } from './ent-types'

export const ENT_SUBCATEGORY = 'ent'

export const EPISODE_TYPES: { id: ENTEpisodeType; name: string; icon: string; description: string; color: string }[] = [
  { id: 'ear', name: 'Ear', icon: '👂', description: 'Pain, fullness, drainage, infection', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'hearing', name: 'Hearing Change', icon: '🔇', description: 'Hearing loss or change — SAME-DAY if sudden', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'tinnitus', name: 'Tinnitus', icon: '🔔', description: 'Ringing, buzzing, or pulsatile sound', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'vertigo', name: 'Vertigo / Dizziness', icon: '🌀', description: 'Spinning, positional, vestibular', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'sinus', name: 'Sinus', icon: '🤧', description: 'Congestion, pressure, infection', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'throat', name: 'Throat / Voice', icon: '🗣️', description: 'Sore throat, hoarseness, swallowing', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'nosebleed', name: 'Nosebleed', icon: '🩸', description: 'Epistaxis tracking', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'general', name: 'General ENT', icon: '👃', description: 'Mixed or other ENT symptoms', color: 'bg-muted text-muted-foreground border-border' },
]

export const EAR_SYMPTOMS: { value: EarSymptom; label: string }[] = [
  { value: 'pain', label: 'Ear pain (otalgia)' },
  { value: 'fullness', label: 'Fullness / pressure / blocked' },
  { value: 'drainage', label: 'Drainage (otorrhea)' },
  { value: 'itching', label: 'Itching' },
  { value: 'popping', label: 'Popping / crackling' },
  { value: 'muffled-hearing', label: 'Muffled hearing' },
]

export const SINUS_SYMPTOMS: { value: SinusSymptom; label: string }[] = [
  { value: 'congestion', label: 'Congestion' },
  { value: 'facial-pressure', label: 'Facial pressure' },
  { value: 'facial-pain', label: 'Facial pain' },
  { value: 'postnasal-drip', label: 'Postnasal drip' },
  { value: 'reduced-smell', label: 'Reduced sense of smell' },
  { value: 'discolored-discharge', label: 'Discolored discharge' },
  { value: 'dental-pain', label: 'Upper tooth pain' },
]

export const THROAT_SYMPTOMS: { value: ThroatSymptom; label: string }[] = [
  { value: 'sore', label: 'Sore throat' },
  { value: 'hoarseness', label: 'Hoarseness' },
  { value: 'difficulty-swallowing', label: 'Difficulty swallowing' },
  { value: 'painful-swallowing', label: 'Painful swallowing (odynophagia)' },
  { value: 'lump-sensation', label: 'Lump sensation (globus)' },
  { value: 'voice-loss', label: 'Voice loss' },
  { value: 'cough', label: 'Cough' },
]

export const VERTIGO_TYPES: { value: VertigoType; label: string; description: string }[] = [
  { value: 'positional', label: 'Positional (BPPV)', description: 'Triggered by head/position changes, lasts seconds' },
  { value: 'spontaneous', label: 'Spontaneous', description: 'Comes on at rest, can last minutes to hours' },
  { value: 'continuous', label: 'Continuous', description: 'Constant, doesn\'t fully resolve' },
  { value: 'lightheaded', label: 'Lightheaded (not spinning)', description: 'Faint/woozy feeling — often NOT inner-ear; could be BP/cardiac' },
]

// ── SEVERITY ────────────────────────────────────────────────────────────────
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
// Shown contextually in the modal based on what's selected.

export const SUDDEN_HEARING_LOSS_WARNING = `Sudden hearing loss is a medical emergency. Steroid treatment works best within ~72 hours — every day of delay lowers the chance of recovery. Do not wait to see if it clears on its own. Contact ENT or go to urgent care/ER today.`

export const HEARING_VERTIGO_TINNITUS_WARNING = `Hearing loss with vertigo and/or tinnitus points to an inner-ear cause that needs prompt evaluation. Contact your provider today.`

export const PULSATILE_TINNITUS_WARNING = `Pulsatile tinnitus (ringing that pulses with your heartbeat) warrants evaluation for a vascular cause — it's not the same as ordinary tinnitus. Mention it specifically to your provider.`

export const HOARSENESS_WARNING = `Hoarseness lasting more than 2-3 weeks should be examined with a laryngoscopy to rule out laryngeal causes. Worth scheduling an ENT visit.`

export const AIRWAY_WARNING = `Difficulty breathing, drooling, or being unable to swallow your own saliva can signal airway swelling (e.g. epiglottitis). This is an emergency — call 911 or go to the ER now.`

export const MASTOIDITIS_WARNING = `Ear infection with fever plus redness, swelling, or tenderness behind the ear can signal mastoiditis, which needs urgent treatment. Go to urgent care or the ER.`

export const NOSEBLEED_WARNING = `A nosebleed that won't stop after 20 minutes of firm continuous pressure (pinching the soft part of the nose, leaning forward) needs medical care.`

export const SINUS_BACTERIAL_NOTE = `Sinus symptoms lasting more than 10 days without improvement — or improving then worsening ("double-sickening") — suggest a bacterial sinus infection that may warrant antibiotics. Most viral sinusitis resolves on its own; telehealth can help decide.`
