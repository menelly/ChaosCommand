/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

import { FoodReactionEpisodeType } from './food-allergens-types'

// === EPISODE TYPES ===
export const EPISODE_TYPES = [
  {
    id: 'mild' as FoodReactionEpisodeType,
    name: 'Mild Reaction',
    icon: '😬',
    description: 'Itching, mild rash, mild GI — no airway involvement',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'moderate' as FoodReactionEpisodeType,
    name: 'Moderate Reaction',
    icon: '⚠️',
    description: 'Hives, swelling, GI distress, but no airway/breathing involvement',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'severe-anaphylaxis' as FoodReactionEpisodeType,
    name: 'Severe / Anaphylaxis',
    icon: '🚨',
    description: 'Multisystem — skin + airway/breathing. EpiPen + 911 territory',
    color: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  {
    id: 'celiac-autoimmune' as FoodReactionEpisodeType,
    name: 'Celiac / Autoimmune',
    icon: '🌾',
    description: 'Gluten / autoimmune flare — GI + brain fog + joint + fatigue',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'intolerance' as FoodReactionEpisodeType,
    name: 'Intolerance',
    icon: '🥛',
    description: 'FODMAP, lactose, histamine, etc. — GI-dominant, non-IgE',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'confirmed-exposure' as FoodReactionEpisodeType,
    name: 'Known Allergen Exposure',
    icon: '⚠️',
    description: 'Exposed to a known allergen — track what happened',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'unknown-trigger' as FoodReactionEpisodeType,
    name: 'Unknown Trigger',
    icon: '❓',
    description: 'Got sick, don\'t know why — capture context to find pattern',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  {
    id: 'general' as FoodReactionEpisodeType,
    name: 'General',
    icon: '🍽️',
    description: 'Other food-related reaction',
    color: 'bg-stone-100 text-stone-800 border-stone-200'
  }
] as const

export const getEpisodeTypeInfo = (id?: string) => {
  if (!id) return EPISODE_TYPES[7]
  return EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[7]
}

export const getEpisodeTypeColor = (id?: string): string => {
  const colors: Record<string, string> = {
    'mild': '#eab308',
    'moderate': '#f97316',
    'severe-anaphylaxis': '#dc2626',
    'celiac-autoimmune': '#d97706',
    'intolerance': '#3b82f6',
    'confirmed-exposure': '#a855f7',
    'unknown-trigger': '#6b7280',
    'general': '#78716c',
  }
  return colors[id || 'general'] || '#6b7280'
}

// === SYMPTOMS — categorized so analytics can detect anaphylaxis + celiac patterns ===
export const SYMPTOM_CATEGORIES = {
  skin: ['Hives / Wheals', 'Itching (no rash)', 'Rash', 'Eczema flare', 'Flushing', 'Pale/clammy'],
  airway: ['Throat tightness', 'Difficulty swallowing', 'Voice change / hoarseness', 'Tongue swelling'],
  breathing: ['Shortness of Breath', 'Wheezing', 'Cough', 'Chest tightness'],
  swelling: ['Face swelling', 'Lip swelling', 'Eye swelling', 'Hand/foot swelling'],
  gi: ['Nausea', 'Vomiting', 'Stomach cramps', 'Diarrhea', 'Bloating', 'Heartburn'],
  cardiovascular: ['Rapid heartbeat', 'Dizziness', 'Lightheadedness', 'Loss of consciousness', 'Hypotension (low BP)'],
  // Celiac / autoimmune slow-burn pattern
  celiacAutoimmune: ['Brain fog', 'Joint pain', 'Profound fatigue', 'Headache', 'Mood changes / irritability', 'Mouth ulcers', 'Tingling/numbness'],
  other: ['Runny / stuffy nose', 'Watery eyes', 'Red itchy eyes', 'Sense of doom']
}

// Flat symptom list for the modal multi-select
export const ALL_SYMPTOMS = [
  ...SYMPTOM_CATEGORIES.skin,
  ...SYMPTOM_CATEGORIES.airway,
  ...SYMPTOM_CATEGORIES.breathing,
  ...SYMPTOM_CATEGORIES.swelling,
  ...SYMPTOM_CATEGORIES.gi,
  ...SYMPTOM_CATEGORIES.cardiovascular,
  ...SYMPTOM_CATEGORIES.celiacAutoimmune,
  ...SYMPTOM_CATEGORIES.other,
]

// Symptom suggestions filtered by episode type — keeps the celiac frame
// from suggesting EpiPen and the IgE frame from drowning in brain-fog.
export const EPISODE_TYPE_SYMPTOMS: Record<FoodReactionEpisodeType, string[]> = {
  'mild': [...SYMPTOM_CATEGORIES.skin, ...SYMPTOM_CATEGORIES.gi.slice(0, 3), ...SYMPTOM_CATEGORIES.other],
  'moderate': [...SYMPTOM_CATEGORIES.skin, ...SYMPTOM_CATEGORIES.swelling, ...SYMPTOM_CATEGORIES.gi, ...SYMPTOM_CATEGORIES.other],
  'severe-anaphylaxis': [
    ...SYMPTOM_CATEGORIES.skin,
    ...SYMPTOM_CATEGORIES.airway,
    ...SYMPTOM_CATEGORIES.breathing,
    ...SYMPTOM_CATEGORIES.swelling,
    ...SYMPTOM_CATEGORIES.gi,
    ...SYMPTOM_CATEGORIES.cardiovascular,
  ],
  'celiac-autoimmune': [
    ...SYMPTOM_CATEGORIES.gi,
    ...SYMPTOM_CATEGORIES.celiacAutoimmune,
    ...SYMPTOM_CATEGORIES.other,
  ],
  'intolerance': [
    ...SYMPTOM_CATEGORIES.gi,
    'Brain fog', 'Profound fatigue', 'Headache',
    ...SYMPTOM_CATEGORIES.other.slice(0, 2),
  ],
  'confirmed-exposure': ALL_SYMPTOMS,  // anything possible, depending on the known allergen
  'unknown-trigger': ALL_SYMPTOMS,
  'general': ALL_SYMPTOMS,
}

export const getSymptomsForEpisodeType = (type: FoodReactionEpisodeType): string[] => {
  return [...new Set(EPISODE_TYPE_SYMPTOMS[type] || ALL_SYMPTOMS)]
}

// === EXPOSURE ===
export const EXPOSURE_SOURCES = [
  'Restaurant meal',
  'School / cafeteria meal',
  'Home cooking — same kitchen as allergen',
  'Home cooking — dedicated GF/allergen-free',
  'Packaged food (label issue)',
  'Cross-contamination suspected',
  'Shared utensils / surfaces',
  'New food tried',
  'Medication',
  'Supplement',
  'Unknown source',
]

export const EXPOSURE_ROUTES: { value: string; label: string }[] = [
  { value: 'ingested', label: 'Ingested (ate / drank)' },
  { value: 'cross-contamination', label: 'Cross-contamination' },
  { value: 'airborne', label: 'Airborne (steam / flour dust)' },
  { value: 'topical', label: 'Topical (skin contact)' },
  { value: 'unknown', label: 'Unknown' },
]

// === TREATMENTS ===
export const COMMON_TREATMENTS = [
  'Antihistamine — Benadryl (diphenhydramine)',
  'Antihistamine — Zyrtec / Claritin / Allegra',
  'EpiPen / Epinephrine auto-injector',
  'Inhaler / Bronchodilator',
  'Steroid medication (oral)',
  'Steroid medication (IV)',
  'IV fluids',
  'Oxygen therapy',
  'Emergency room visit',
  'Called 911',
  'Rest and monitoring',
  'Activated charcoal',
  'Zofran (ondansetron)',
  'Pepcid / Famotidine',
]

// === SEVERITY LEVELS ===
export const SEVERITY_LEVELS: { value: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening'; label: string; color: string }[] = [
  { value: 'Mild', label: 'Mild', color: 'text-warning' },
  { value: 'Moderate', label: 'Moderate', color: 'text-warning' },
  { value: 'Severe', label: 'Severe', color: 'text-destructive' },
  { value: 'Life-threatening', label: 'Life-threatening', color: 'text-destructive' },
]

// === RELATED TRACKERS ===
export const RELATED_TRACKERS = [
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Track antihistamines, EpiPen Rx', path: '/medications' },
  { id: 'upper-digestive', name: 'Upper Digestive', icon: '🤢', description: 'GI symptom timeline', path: '/upper-digestive' },
  { id: 'bathroom', name: 'Bathroom', icon: '🚽', description: 'Track bowel changes (celiac/IBS)', path: '/bathroom' },
  { id: 'skin', name: 'Skin', icon: '✨', description: 'Photo-track hives, eczema', path: '/skin' },
  { id: 'respiratory', name: 'Respiratory', icon: '🫁', description: 'Track airway / breathing reactions', path: '/respiratory' },
]

// === 🚨 RED FLAG WARNINGS ===
// Anaphylaxis = multisystem reaction. Two-organ-system rule: skin +
// (airway OR breathing OR cardiovascular OR GI) = anaphylaxis criteria.
// Single-system can still be life-threatening if airway alone.
export const RED_FLAG_911_CRITERIA = [
  'Throat tightness, difficulty swallowing, or hoarseness — airway involvement, anaphylaxis until proven otherwise',
  'Difficulty breathing, wheezing, or chest tightness — give EpiPen and call 911',
  'Skin reaction (hives, swelling) PLUS any breathing, GI, or cardiovascular symptom — anaphylaxis pattern',
  'Loss of consciousness, severe dizziness, pale/clammy — possible anaphylactic shock',
  'Tongue or face swelling — airway can close fast, EpiPen + 911',
  'Severe persistent vomiting or diarrhea after known allergen — escalating reaction',
  'No improvement 5-10 minutes after EpiPen — second dose + 911',
  'Reaction to a never-before-eaten food (especially nuts, shellfish, sesame) — get evaluated',
  'Anything that feels different, scarier, or worse than previous reactions',
]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  symptoms?: string[]
  hivesPresent?: boolean
  swellingPresent?: boolean
  throatTightness?: boolean
  difficultyBreathing?: boolean
  difficultySwallowing?: boolean
  voiceChange?: boolean
  giSymptoms?: boolean
  hypotension?: boolean
  lossOfConsciousness?: boolean
  reactionSeverity?: string
}): string[] => {
  const flags: string[] = []
  const symptoms = entry.symptoms || []

  const hasSkin = entry.hivesPresent || entry.swellingPresent ||
    symptoms.some(s => /hives|wheals|swelling|flushing/i.test(s))
  const hasAirway = entry.throatTightness || entry.difficultySwallowing || entry.voiceChange ||
    symptoms.some(s => /throat tightness|swallowing|tongue swelling|hoarseness/i.test(s))
  const hasBreathing = entry.difficultyBreathing ||
    symptoms.some(s => /shortness of breath|wheezing|chest tight/i.test(s))
  const hasCardio = entry.hypotension || entry.lossOfConsciousness ||
    symptoms.some(s => /loss of consciousness|hypotension|pale\/clammy|sense of doom/i.test(s))
  const hasGI = entry.giSymptoms ||
    symptoms.some(s => /vomit|severe.*diarrhea|stomach cramp/i.test(s))

  // Direct airway involvement = anaphylaxis until proven otherwise
  if (hasAirway) {
    flags.push(`Airway involvement (throat tightness / swallowing / voice change / tongue swelling) — anaphylaxis until proven otherwise. Use EpiPen if prescribed and call 911.`)
  }
  if (hasBreathing) {
    flags.push(`Breathing involvement (SOB / wheezing / chest tightness) — anaphylaxis pattern. Use EpiPen and call 911.`)
  }

  // Two-system rule: skin + (airway/breathing/cardio/GI) = anaphylaxis
  if (hasSkin && (hasBreathing || hasCardio || hasGI) && !hasAirway && !hasBreathing) {
    flags.push(`Skin + ${hasCardio ? 'cardiovascular' : 'GI'} symptoms — meets anaphylaxis criteria. Use EpiPen if prescribed and call 911.`)
  }
  if (hasSkin && hasAirway === false && hasBreathing === false && (hasCardio || hasGI)) {
    if (!flags.length) {
      flags.push(`Multisystem reaction — possible anaphylaxis. Use EpiPen if prescribed and call 911.`)
    }
  }

  // Cardiovascular collapse alone
  if (hasCardio) {
    flags.push(`Cardiovascular involvement (LOC / hypotension / pale clammy) — possible anaphylactic shock. EpiPen + 911 NOW.`)
  }

  // Life-threatening severity selected
  if (entry.reactionSeverity === 'Life-threatening' && flags.length === 0) {
    flags.push(`Severity flagged life-threatening — call 911.`)
  }

  return flags
}

export const getInterimMeasures = (entry: {
  episodeType?: string
  symptoms?: string[]
  throatTightness?: boolean
  difficultyBreathing?: boolean
  hivesPresent?: boolean
  swellingPresent?: boolean
  epipenUsed?: boolean
}): string[] => {
  const measures: string[] = []
  const symptoms = entry.symptoms || []
  const hasAirway = entry.throatTightness || symptoms.some(s => /throat|swallow|hoarseness/i.test(s))
  const hasBreathing = entry.difficultyBreathing || symptoms.some(s => /breath|wheez/i.test(s))
  const hasSkin = entry.hivesPresent || entry.swellingPresent

  if ((hasAirway || hasBreathing) && !entry.epipenUsed) {
    measures.push('If you have an EpiPen prescribed: USE IT NOW. Do not wait. Anaphylaxis kills via airway/circulatory collapse, and epinephrine is the only first-line treatment. Lay flat with legs elevated unless breathing is harder lying down (then sit upright).')
  }
  if (entry.epipenUsed) {
    measures.push('After EpiPen: call 911 even if symptoms improve — biphasic reactions can occur 4-12 hours later. Bring used EpiPen to the ER. A second EpiPen dose is OK if no improvement after 5-10 min.')
  }
  if (hasSkin && !hasAirway && !hasBreathing) {
    measures.push('For skin-only reactions: oral antihistamine (Benadryl 25-50mg adult, weight-based for kids). Watch for airway/breathing changes — if any develop, EpiPen + 911.')
  }
  if (entry.episodeType === 'celiac-autoimmune') {
    measures.push('Celiac / autoimmune reactions don\'t respond to EpiPen. Hydrate, rest, and document the cross-contamination source for the next 7-14 days as inflammation subsides. Track GI / brain fog / joint symptoms over time.')
  }
  return measures
}
