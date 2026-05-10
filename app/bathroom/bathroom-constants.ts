/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v0.4.5 — Tier 2 multi-modal)
 */

import { BathroomEpisodeType } from './bathroom-types'

export const EPISODE_TYPES = [
  { id: 'normal-bm' as BathroomEpisodeType, name: 'Normal BM', icon: '💩', description: 'Everything went smoothly', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'constipation' as BathroomEpisodeType, name: 'Constipation', icon: '🪨', description: 'Hard, infrequent, painful, or didn\'t go', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'diarrhea' as BathroomEpisodeType, name: 'Diarrhea', icon: '💦', description: 'Loose, frequent, urgent, watery', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'urinary' as BathroomEpisodeType, name: 'Urinary', icon: '🚽', description: 'Pee-related — frequency, urgency, pain, leakage', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'blood-or-red-flag' as BathroomEpisodeType, name: '🚨 Blood / Red flag', icon: '🩸', description: 'Blood in stool/urine, severe pain, obstruction signs', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'general' as BathroomEpisodeType, name: 'General', icon: '🧻', description: 'Other bathroom event', color: 'bg-gray-100 text-gray-800 border-gray-200' },
] as const

export const getEpisodeTypeInfo = (id?: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[5]
export const getEpisodeTypeColor = (id?: string): string => {
  const colors: Record<string, string> = {
    'normal-bm': '#10b981', 'constipation': '#f59e0b', 'diarrhea': '#3b82f6',
    'urinary': '#eab308', 'blood-or-red-flag': '#dc2626', 'general': '#6b7280',
  }
  return colors[id || 'general'] || '#6b7280'
}

export const BRISTOL_SCALE = [
  { value: '1', label: 'Type 1 — Hard lumps (very constipated)' },
  { value: '2', label: 'Type 2 — Lumpy sausage (slightly constipated)' },
  { value: '3', label: 'Type 3 — Sausage with cracks (normal)' },
  { value: '4', label: 'Type 4 — Smooth soft sausage (ideal)' },
  { value: '5', label: 'Type 5 — Soft blobs (lacking fiber)' },
  { value: '6', label: 'Type 6 — Mushy ragged (mild diarrhea)' },
  { value: '7', label: 'Type 7 — Liquid (severe diarrhea)' },
]

export const PAIN_LEVELS = [
  { value: 'None', emoji: '😌', label: 'None' },
  { value: 'Mild', emoji: '😐', label: 'Mild' },
  { value: 'Moderate', emoji: '😣', label: 'Moderate' },
  { value: 'Severe', emoji: '😫', label: 'Severe' },
  { value: 'WHY', emoji: '😱', label: 'WHY (extreme)' },
]

export const URINARY_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'frequent', label: 'Frequent (more than usual)' },
  { value: 'urgency', label: 'Urgency (had to go NOW)' },
  { value: 'painful', label: 'Painful / burning' },
  { value: 'blood', label: '🚨 Blood in urine' },
  { value: 'leakage', label: 'Leakage / incontinence' },
  { value: 'retention', label: 'Retention (couldn\'t go)' },
]

export const BLOOD_COLORS = [
  { value: 'bright-red', label: 'Bright red (lower GI)' },
  { value: 'dark-red', label: 'Dark red (mid GI)' },
  { value: 'black-tarry', label: '🚨 Black / tarry (upper GI bleed)' },
  { value: 'mucus', label: 'Mucus / pink-streaked' },
  { value: 'unknown', label: 'Unknown / not sure' },
]

export const COMMON_TRIGGERS = [
  'Stress', 'Travel', 'New food', 'Spicy food', 'Dairy', 'Gluten', 'High-FODMAP', 'Caffeine',
  'Alcohol', 'Dehydration', 'Low fiber', 'Sedentary', 'Med change', 'Antibiotic', 'NSAIDs',
  'Hormonal cycle', 'Anxiety / panic', 'Unknown',
]

export const BATHROOM_GOBLINISMS = [
  "Potty adventure documented! The digestive goblins approve! 💩✨",
  "Your bathroom journey has been logged by the toilet sprites! 🧚‍♀️🚽",
  "Digestive data saved! The bowel movement minions celebrate! 🎉",
  "Your potty tale has been recorded by the porcelain pixies! 🧚‍♂️",
  "Bathroom entry logged! The flush fairies are pleased! 💫🚽",
]

// === 🚨 RED FLAGS ===
export const RED_FLAG_911_CRITERIA = [
  'Black, tarry stools — possible upper GI bleed (ulcer, varices). ER same-day.',
  'Bright red blood in toilet bowl with severe pain or large quantity — significant lower GI bleed',
  'No bowel movement for 5+ days WITH severe abdominal pain, vomiting, or no gas — possible obstruction',
  'Painful urination + fever + flank/back pain — possible kidney infection (pyelonephritis), needs antibiotics same-day',
  'Visible blood in urine without obvious cause (no UTI, no menstruation) — needs evaluation',
  'Severe abdominal pain that won\'t resolve, especially rigid abdomen — possible peritonitis',
  'Persistent vomiting with constipation — possible obstruction',
  'Anything that feels different, scarier, or worse than your usual gut chaos',
]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  bloodInStool?: boolean
  bloodColor?: string
  bloodInUrine?: boolean
  feverWithUrinary?: boolean
  flankPain?: boolean
  severeAbdominalPain?: boolean
  cantPassGas?: boolean
  noStoolDays?: number
  vomiting?: boolean
  urinaryType?: string
  painScore?: number
}): string[] => {
  const flags: string[] = []
  if (entry.bloodColor === 'black-tarry') {
    flags.push(`Black tarry stool — possible upper GI bleed. Same-day ER evaluation.`)
  }
  if (entry.bloodInStool && entry.severeAbdominalPain) {
    flags.push(`Blood in stool + severe abdominal pain — needs evaluation today.`)
  }
  if (entry.feverWithUrinary && (entry.flankPain || entry.urinaryType === 'painful')) {
    flags.push(`UTI symptoms + fever + flank pain — possible kidney infection (pyelonephritis). Same-day evaluation.`)
  }
  if (entry.bloodInUrine && !entry.flankPain) {
    flags.push(`Visible blood in urine — needs evaluation if no obvious cause (no menstruation, no recent UTI confirmed).`)
  }
  if (entry.cantPassGas && (entry.vomiting || (entry.noStoolDays && entry.noStoolDays >= 3))) {
    flags.push(`No gas + vomiting / multi-day no BM — possible bowel obstruction. ER evaluation.`)
  }
  if (entry.noStoolDays && entry.noStoolDays >= 5 && entry.severeAbdominalPain) {
    flags.push(`5+ days no BM with severe abdominal pain — possible obstruction or impaction. ER.`)
  }
  if (entry.urinaryType === 'retention' && (entry.painScore || 0) >= 7) {
    flags.push(`Urinary retention + severe pain — possible obstruction / spinal issue. Same-day evaluation.`)
  }
  return flags
}

export const getInterimMeasures = (entry: {
  episodeType?: string
  feverWithUrinary?: boolean
}): string[] => {
  const measures: string[] = []
  if (entry.feverWithUrinary) {
    measures.push('Hydrate aggressively while you wait for evaluation. Cranberry / over-the-counter UTI products won\'t treat pyelonephritis — you need antibiotics. Same-day appointment > waiting til Monday.')
  }
  return measures
}

export const RELATED_TRACKERS = [
  { id: 'food-allergens', name: 'Food Reactions', icon: '🍽️', description: 'Track gluten / FODMAP / celiac flares', path: '/food-allergens' },
  { id: 'hydration', name: 'Hydration', icon: '💧', description: 'Hydration drives bowel + urinary patterns', path: '/hydration' },
  { id: 'pain', name: 'Pain', icon: '🔥', description: 'Severe abdominal pain — also log there', path: '/pain' },
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Many meds cause GI / urinary changes', path: '/medications' },
]
