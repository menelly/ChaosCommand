/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

/**
 * RESPIRATORY TRACKER CONSTANTS
 */

import { CoughCharacter, BreathingPattern, PeakFlowZone } from './respiratory-types'

export const EPISODE_TYPES = [
  {
    id: 'asthma-attack',
    name: 'Asthma Attack',
    icon: '🌬️',
    description: 'Wheezing, chest tightness, inhaler use',
    color: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  {
    id: 'sob',
    name: 'Shortness of Breath',
    icon: '😮‍💨',
    description: 'Air hunger, breathlessness without wheeze',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'cough',
    name: 'Cough Episode',
    icon: '😷',
    description: 'Persistent or unusual cough',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'allergic-reaction',
    name: 'Allergic Reaction',
    icon: '🐝',
    description: 'Hives, swelling, throat tightness, anaphylaxis concern',
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'wheeze',
    name: 'Wheezing',
    icon: '🎵',
    description: 'Audible wheeze without full asthma attack',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  },
  {
    id: 'pleuritic-pain',
    name: 'Pleuritic Pain',
    icon: '💉',
    description: 'Sharp pain on inspiration',
    color: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  {
    id: 'general',
    name: 'General Respiratory',
    icon: '🫁',
    description: 'Mixed or other respiratory event',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
] as const

export const RESPIRATORY_SYMPTOMS = [
  // Breathing mechanics
  'Wheezing',
  'Stridor (high-pitched on inspiration)',
  'Shortness of Breath',
  'Air Hunger / Cannot Get Enough Air',
  'Rapid Breathing',
  'Shallow Breathing',
  'Labored Breathing',
  'Using Accessory Muscles',
  'Tripod Position Needed',
  'Single-word Sentences (cannot complete phrases)',

  // Chest sensations
  'Chest Tightness',
  'Chest Pressure',
  'Chest Pain on Inspiration (pleuritic)',
  'Burning Chest with Exertion',

  // Cough/sputum
  'Cough (dry)',
  'Cough (productive)',
  'Wheeze with cough',
  'Coughing up blood',

  // Voice/throat
  'Hoarse Voice',
  'Throat Tightness',
  'Swallowing Difficulty',

  // Allergic reaction
  'Hives / Welts',
  'Lip / Face / Tongue Swelling',
  'Itchy mouth or throat',
  'Sense of Doom',

  // Hypoxia signs
  'Blue Lips / Fingernails (cyanosis)',
  'Confusion / Restlessness',
  'Drowsiness',

  // Other
  'Sneezing',
  'Runny Nose',
  'Watery Eyes',
  'Fatigue',
  'Nausea',
]

export const RESPIRATORY_TRIGGERS = [
  // Allergens
  'Pollen',
  'Mold',
  'Pet Dander',
  'Dust Mites',
  'Cockroach',

  // Food allergens
  'Food Allergen (known)',
  'Food Allergen (unknown / new food)',

  // Sting/bite
  'Insect Sting',
  'Insect Bite',

  // Environmental
  'Cold Air',
  'Hot/Humid Air',
  'Smoke (cigarette)',
  'Smoke (wildfire / outdoor)',
  'Strong Perfume / Cleaning Products',
  'Air Quality (high AQI)',
  'Mowing / Grass Cutting',
  'Construction Dust',

  // Activity
  'Exercise / Exertion',
  'Laughing Hard',
  'Crying',

  // Medication
  'NSAID (aspirin/ibuprofen)',
  'Beta Blocker',
  'New Medication',
  'Missed Inhaler / Controller Med',

  // Illness
  'Cold / URI',
  'Flu / COVID',
  'Bronchitis / Pneumonia',

  // Stress / hormonal
  'Stress / Anxiety',
  'Menstrual Cycle',
  'GERD / Reflux',

  // Unknown
  'No Identifiable Trigger',
]

export const COUGH_CHARACTERS: { value: CoughCharacter; label: string }[] = [
  { value: 'dry', label: 'Dry / Hacking' },
  { value: 'wet-clear', label: 'Wet — Clear sputum' },
  { value: 'wet-yellow', label: 'Wet — Yellow sputum' },
  { value: 'wet-green', label: 'Wet — Green sputum' },
  { value: 'wet-blood', label: 'Wet — Blood-tinged' },
  { value: 'barking', label: 'Barking (croup-like)' },
  { value: 'unknown', label: 'Unknown / Not noted' },
]

export const BREATHING_PATTERNS: { value: BreathingPattern; label: string }[] = [
  { value: 'normal-just-uncomfortable', label: 'Looks normal but feels uncomfortable' },
  { value: 'wheezy', label: 'Audibly Wheezing' },
  { value: 'shallow', label: 'Shallow Breathing' },
  { value: 'rapid', label: 'Rapid (>20-25/min)' },
  { value: 'labored', label: 'Labored / Effortful' },
  { value: 'tripod-needed', label: 'Tripod Position Needed' },
  { value: 'stridor', label: 'Stridor (high-pitched on inspiration)' },
]

export const PEAK_FLOW_ZONES: { value: PeakFlowZone; label: string; color: string }[] = [
  { value: 'green', label: 'Green Zone (≥80% personal best)', color: 'text-green-600' },
  { value: 'yellow', label: 'Yellow Zone (50-79% personal best)', color: 'text-warning' },
  { value: 'red', label: 'Red Zone (<50% personal best — emergency)', color: 'text-destructive' },
  { value: 'unknown', label: 'Unknown / No personal best on file', color: 'text-gray-500' },
]

export const RESPIRATORY_INTERVENTIONS = [
  'Rescue Inhaler (Albuterol)',
  'Nebulizer Treatment',
  'Steroid Inhaler',
  'Oral Steroid (Prednisone)',
  'Antihistamine (Benadryl)',
  'Epinephrine (EpiPen)',
  'Sit Upright / Tripod',
  'Pursed-Lip Breathing',
  'Cool Air / Open Window',
  'Remove from Trigger',
  'Supplemental Oxygen',
  'ER Visit / EMS',
]

export const SEVERITY_LABELS = [
  { value: 1, label: 'Very Mild', color: 'text-green-600' },
  { value: 2, label: 'Mild', color: 'text-green-500' },
  { value: 3, label: 'Mild-Moderate', color: 'text-warning' },
  { value: 4, label: 'Moderate', color: 'text-warning' },
  { value: 5, label: 'Moderate', color: 'text-warning' },
  { value: 6, label: 'Moderate-Severe', color: 'text-warning' },
  { value: 7, label: 'Severe', color: 'text-destructive' },
  { value: 8, label: 'Very Severe', color: 'text-destructive' },
  { value: 9, label: 'Extreme', color: 'text-destructive' },
  { value: 10, label: 'Crisis (call 911)', color: 'text-destructive' }
]

export const RELATED_TRACKERS = [
  { id: 'dysautonomia', name: 'Dysautonomia / SpO2', icon: '💓', description: 'Chronic SpO2 trends', path: '/dysautonomia' },
  { id: 'cardiac', name: 'Cardiac Events', icon: '🫀', description: 'Concurrent cardiac symptoms', path: '/cardiac' },
  { id: 'food-allergens', name: 'Food Allergens', icon: '🥜', description: 'Allergen exposure tracking', path: '/food-allergens' },
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Inhaler / steroid adherence', path: '/medications' },
  { id: 'weather-environment', name: 'Weather / Environment', icon: '🌫️', description: 'AQI & environmental triggers', path: '/weather-environment' },
]

// 🚨 Red flag criteria — when to call 911 NOW for respiratory
export const RED_FLAG_911_CRITERIA = [
  'Lips, fingernails, or face turning blue (cyanosis)',
  'Cannot speak more than 1-2 words at a time',
  'Tripod position needed to breathe',
  'Inhaler not helping after 2-3 doses',
  'Throat or tongue swelling, voice changes (anaphylaxis)',
  'Hives plus any breathing difficulty (anaphylaxis)',
  'SpO2 below 88% (or below your personal sick baseline)',
  'Peak flow in red zone (<50% personal best)',
  'Confusion, drowsiness, or restlessness with breathing trouble',
  'Coughing up significant amounts of blood',
  'Sudden severe chest pain with shortness of breath (PE concern)',
]

export const getSeverityLabel = (severity: number) => SEVERITY_LABELS.find(s => s.value === severity)?.label || 'Unknown'
export const getSeverityColor = (severity: number) => SEVERITY_LABELS.find(s => s.value === severity)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[6]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  severity?: number
  spo2Lowest?: number
  peakFlowZone?: string
  symptoms?: string[]
  swelling?: boolean
  throatTightness?: boolean
  hivesPresent?: boolean
  inhalerResponse?: number
}): string[] => {
  const flags: string[] = []
  const symptoms = entry.symptoms || []

  if (entry.severity && entry.severity >= 8) {
    flags.push(`Severity ${entry.severity}/10 — call 911 for severe respiratory distress`)
  }
  if (entry.spo2Lowest !== undefined && entry.spo2Lowest < 88) {
    flags.push(`SpO2 ${entry.spo2Lowest}% — call 911 (below 88% is hypoxia)`)
  }
  if (entry.peakFlowZone === 'red') {
    flags.push(`Peak flow in RED zone (<50% personal best) — call 911`)
  }
  if (symptoms.includes('Blue Lips / Fingernails (cyanosis)')) {
    flags.push(`Cyanosis — call 911 NOW (oxygenation failure)`)
  }
  if (symptoms.includes('Single-word Sentences (cannot complete phrases)')) {
    flags.push(`Cannot speak in full sentences — call 911`)
  }
  if (symptoms.includes('Confusion / Restlessness') || symptoms.includes('Drowsiness')) {
    flags.push(`Altered mental status with respiratory symptoms — call 911 (CO2 retention or hypoxia)`)
  }
  if (symptoms.includes('Tripod Position Needed') || symptoms.includes('Using Accessory Muscles')) {
    flags.push(`Tripod position / accessory muscles in use — severe respiratory distress, call 911`)
  }
  // Anaphylaxis: any 2+ of (skin/respiratory/GI/CV) involvement after exposure = anaphylaxis
  const skinInvolvement = entry.hivesPresent || entry.swelling || symptoms.includes('Hives / Welts') || symptoms.includes('Lip / Face / Tongue Swelling')
  const airwayInvolvement = entry.throatTightness || symptoms.includes('Throat Tightness') || symptoms.includes('Stridor (high-pitched on inspiration)') || symptoms.includes('Hoarse Voice')
  const breathingInvolvement = symptoms.includes('Shortness of Breath') || symptoms.includes('Wheezing') || symptoms.includes('Air Hunger / Cannot Get Enough Air')
  if ((skinInvolvement && airwayInvolvement) || (skinInvolvement && breathingInvolvement) || airwayInvolvement) {
    if (skinInvolvement || airwayInvolvement || breathingInvolvement) {
      flags.push(`Possible ANAPHYLAXIS pattern — use EpiPen if available and call 911 IMMEDIATELY`)
    }
  }
  if (entry.inhalerResponse !== undefined && entry.inhalerResponse <= 2) {
    flags.push(`Rescue inhaler not helping — call 911 / consider ER`)
  }
  if (symptoms.includes('Coughing up blood')) {
    flags.push(`Hemoptysis (blood in cough) — needs emergency evaluation`)
  }
  return flags
}

export const getInterimMeasures = (entry: {
  episodeType?: string
  symptoms?: string[]
  swelling?: boolean
  throatTightness?: boolean
  hivesPresent?: boolean
}): string[] => {
  const measures: string[] = []
  const symptoms = entry.symptoms || []

  // Anaphylaxis-shaped → EpiPen
  const skinInvolvement = entry.hivesPresent || entry.swelling || symptoms.includes('Hives / Welts') || symptoms.includes('Lip / Face / Tongue Swelling')
  const airwayInvolvement = entry.throatTightness || symptoms.includes('Throat Tightness') || symptoms.includes('Stridor (high-pitched on inspiration)')
  if (skinInvolvement || airwayInvolvement || entry.episodeType === 'allergic-reaction') {
    measures.push('If you have an EpiPen, USE IT NOW (outer thigh, hold 3 seconds). Then call 911. Lie flat and elevate legs unless breathing is worse lying down — then sit up.')
  }

  // Asthma / wheezing / SOB
  if (entry.episodeType === 'asthma-attack' || symptoms.includes('Wheezing') || symptoms.includes('Shortness of Breath')) {
    measures.push('Sit upright, lean slightly forward (tripod). Use rescue inhaler (albuterol) — 2 puffs, wait 1 minute, repeat up to 3 sets. Slow pursed-lip breathing between doses.')
  }

  // SOB without wheeze
  if (symptoms.includes('Air Hunger / Cannot Get Enough Air')) {
    measures.push('Sit upright. Slow inhale through nose 2 seconds, exhale through pursed lips 4 seconds. Try to keep breathing controlled rather than fast.')
  }

  // Laryngospasm / throat closing
  if (entry.throatTightness || symptoms.includes('Throat Tightness')) {
    measures.push('If known laryngospasm history: pinch nose closed, take small fast sips of cold water through pursed lips (the "Reisman maneuver" can interrupt laryngospasm). If anaphylaxis suspected — EpiPen first.')
  }

  return measures
}
