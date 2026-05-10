/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * CARDIAC TRACKER CONSTANTS
 * Episode types, rhythm classifications, symptoms, triggers, interventions.
 */

import { RhythmType, ResolutionMethod, PositionType } from './cardiac-types'

// Episode Types for Multi-Modal Interface
export const EPISODE_TYPES = [
  {
    id: 'arrhythmia',
    name: 'Arrhythmia Event',
    icon: '⚡',
    description: 'PAC, PVC, SVT, AFib, or other rhythm event',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    id: 'chest-pain',
    name: 'Chest Pain',
    icon: '💔',
    description: 'Chest pain, pressure, tightness, or discomfort',
    color: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    id: 'syncope',
    name: 'Syncope (LOC)',
    icon: '😵',
    description: 'Full loss of consciousness episode',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'presyncope',
    name: 'Presyncope',
    icon: '😶‍🌫️',
    description: 'Near-faint without full LOC — got horizontal in time',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'palpitations',
    name: 'Palpitations',
    icon: '💓',
    description: 'Awareness of heartbeat — flutters, skips, pounding',
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'general',
    name: 'General Cardiac Event',
    icon: '🫀',
    description: 'Mixed cardiac symptoms or other heart-related event',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
] as const

// Rhythm Type Options (for dropdown)
export const RHYTHM_TYPES: { value: RhythmType; label: string; description: string }[] = [
  { value: 'NSR', label: 'Normal Sinus Rhythm', description: 'Normal rhythm' },
  { value: 'PAC', label: 'PAC (Premature Atrial Contraction)', description: 'Single atrial early beat' },
  { value: 'PAC-couplet', label: 'PAC Couplet', description: 'Two PACs in a row' },
  { value: 'PVC', label: 'PVC (Premature Ventricular Contraction)', description: 'Single ventricular early beat' },
  { value: 'PVC-couplet', label: 'PVC Couplet', description: 'Two PVCs in a row' },
  { value: 'SVT', label: 'SVT (Supraventricular Tachycardia)', description: 'Fast rhythm above ventricles' },
  { value: 'AVNRT', label: 'AVNRT', description: 'AV nodal reentrant tachycardia (Valsalva-responsive)' },
  { value: 'AVRT', label: 'AVRT', description: 'AV reentrant tachycardia (accessory pathway)' },
  { value: 'AFib', label: 'Atrial Fibrillation', description: 'Irregularly irregular rhythm' },
  { value: 'Aflutter', label: 'Atrial Flutter', description: 'Sawtooth pattern, often regular' },
  { value: 'VT', label: 'VT (Ventricular Tachycardia)', description: 'Fast wide-complex rhythm — emergency' },
  { value: 'sinus-tachycardia', label: 'Sinus Tachycardia', description: 'Normal rhythm but fast (>100bpm)' },
  { value: 'bradycardia', label: 'Bradycardia', description: 'Slow heart rate (<60bpm)' },
  { value: 'heart-block', label: 'Heart Block', description: 'AV conduction delay or block' },
  { value: 'unknown', label: 'Unknown / Not Captured', description: 'Episode without ECG capture' }
]

// Cardiac Symptoms
export const CARDIAC_SYMPTOMS = [
  // Arrhythmia awareness
  'Heart Pounding',
  'Heart Racing',
  'Heart Fluttering',
  'Heart Skipping Beats',
  'Heart Stopping Sensation',
  'Awareness of Heartbeat',

  // Chest symptoms
  'Chest Pain',
  'Chest Pressure',
  'Chest Tightness',
  'Chest Burning',
  'Chest Heaviness',

  // Hemodynamic
  'Dizziness',
  'Lightheadedness',
  'Pre-syncope (near-faint)',
  'Syncope (full faint)',
  'Tunnel Vision',
  'Black-Out Spots',

  // Sympathetic surge
  'Sweating',
  'Nausea',
  'Anxiety/Doom',
  'Trembling',
  'Cold/Clammy',
  'Hot Flush',

  // Respiratory/perfusion
  'Shortness of Breath',
  'Air Hunger',
  'Cough',
  'Fatigue',

  // Radiation/referred (when chest pain present)
  'Left Arm Pain',
  'Right Arm Pain',
  'Jaw Pain',
  'Back Pain',
  'Neck Pain',
  'Epigastric Pain',

  // Other
  'Headache',
  'Vision Changes'
]

// Cardiac Triggers
export const CARDIAC_TRIGGERS = [
  // Electrolyte
  'Missed Magnesium Dose',
  'Missed Potassium Supplement',
  'Diarrhea/Vomiting (electrolyte loss)',
  'Diuretic Effect',

  // Sleep & circadian
  'Sleep Deprivation',
  'Just Woke Up',
  'Falling Asleep',
  'REM Sleep',

  // Sympathetic
  'Stress / Emotional Surge',
  'Anxiety / Panic',
  'Anger / Frustration',
  'Heavy/Disturbing Reading',
  'Argument',

  // Stimulants/inhibitors
  'Caffeine',
  'Alcohol',
  'Nicotine',
  'Decongestant Medication',
  'Stimulant Medication',
  'Cannabis',

  // Activity/position
  'Exertion',
  'Position Change (lying ↔ standing)',
  'Right-Side Sleeping',
  'Bending Forward',
  'Valsalva (straining)',

  // Metabolic
  'Hyperglycemia',
  'Hypoglycemia',
  'Dehydration',
  'Skipped Meal',
  'Heavy Meal',

  // Illness
  'Fever / Infection',
  'Recent Illness',

  // Female-specific
  'Menstrual Cycle (PMS)',
  'Menstrual Cycle (Day 1-3)',
  'Hormonal Shift',

  // Unknown
  'No Identifiable Trigger'
]

// Resolution Methods (for dropdown / multi-select)
export const RESOLUTION_METHODS: { value: ResolutionMethod; label: string }[] = [
  { value: 'valsalva', label: 'Valsalva Maneuver (bear down)' },
  { value: 'cough', label: 'Cough' },
  { value: 'cold-water-face', label: 'Cold Water on Face / Ice Dive' },
  { value: 'lying-flat', label: 'Lying Flat' },
  { value: 'pacing-rest', label: 'Pacing / Rest' },
  { value: 'medication', label: 'PRN Medication' },
  { value: 'spontaneous', label: 'Spontaneously Resolved' },
  { value: '911', label: '911 / EMS Called' },
  { value: 'cardioversion', label: 'Cardioversion' },
  { value: 'other', label: 'Other' }
]

// Position Types
export const POSITION_OPTIONS: { value: PositionType; label: string }[] = [
  { value: 'standing', label: 'Standing' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'lying', label: 'Lying Down' },
  { value: 'transitioning', label: 'Position Transition' },
  { value: 'sleep', label: 'During Sleep' },
  { value: 'exertion', label: 'Exertion / Exercise' },
  { value: 'unknown', label: 'Unknown' }
]

// Chest Pain Character Options
export const CHEST_PAIN_CHARACTERS = [
  { value: 'pressure', label: 'Pressure' },
  { value: 'sharp', label: 'Sharp / Stabbing' },
  { value: 'burning', label: 'Burning' },
  { value: 'crushing', label: 'Crushing / Heavy' },
  { value: 'tightness', label: 'Tightness / Squeezing' },
  { value: 'tearing', label: 'Tearing / Ripping' },
  { value: 'other', label: 'Other / Difficult to Describe' }
]

// Chest Pain Radiation Sites
export const CHEST_PAIN_RADIATION = [
  'Left Arm',
  'Right Arm',
  'Jaw',
  'Neck',
  'Back (between shoulder blades)',
  'Epigastric / Upper Abdomen',
  'Throat'
]

// Prodrome Symptom Options (for syncope/presyncope)
export const PRODROME_SYMPTOMS = [
  'Sweating',
  'Hot Flush',
  'Cold/Clammy',
  'Nausea',
  'Dizziness',
  'Tunnel Vision',
  'Hearing Changes (Muffling/Ringing)',
  'Tingling',
  'Sense of Doom',
  'Heart Pounding',
  'Trembling',
  'Yawning',
  'No Warning'
]

// Severity Labels (matches dysautonomia pattern)
export const SEVERITY_LABELS = [
  { value: 1, label: 'Very Mild', color: 'text-green-600' },
  { value: 2, label: 'Mild', color: 'text-green-500' },
  { value: 3, label: 'Mild-Moderate', color: 'text-yellow-600' },
  { value: 4, label: 'Moderate', color: 'text-yellow-500' },
  { value: 5, label: 'Moderate', color: 'text-orange-500' },
  { value: 6, label: 'Moderate-Severe', color: 'text-orange-600' },
  { value: 7, label: 'Severe', color: 'text-red-500' },
  { value: 8, label: 'Very Severe', color: 'text-red-600' },
  { value: 9, label: 'Extreme', color: 'text-red-700' },
  { value: 10, label: 'Crisis (call 911)', color: 'text-red-800' }
]

// Duration Units (matches dysautonomia)
export const DURATION_UNITS = [
  { value: 'seconds', label: 'seconds' },
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' }
]

// Related Trackers for Cross-Reference
export const RELATED_TRACKERS = [
  {
    id: 'dysautonomia',
    name: 'Dysautonomia / POTS',
    icon: '💓',
    description: 'Track autonomic episodes, BP, SpO2',
    path: '/dysautonomia'
  },
  {
    id: 'medications',
    name: 'Medication Adherence',
    icon: '💊',
    description: 'Track Mg, K, beta blocker, antiarrhythmic doses',
    path: '/medications'
  },
  {
    id: 'sleep',
    name: 'Sleep Tracking',
    icon: '😴',
    description: 'Sleep correlation with arrhythmia patterns',
    path: '/sleep'
  },
  {
    id: 'lab-results',
    name: 'Lab Results',
    icon: '🧪',
    description: 'Mg, K, BMP correlations with episodes',
    path: '/lab-results'
  }
]

// Helper Functions
export const getSeverityLabel = (severity: number) => {
  const label = SEVERITY_LABELS.find(s => s.value === severity)
  return label ? label.label : 'Unknown'
}

export const getSeverityColor = (severity: number) => {
  const label = SEVERITY_LABELS.find(s => s.value === severity)
  return label ? label.color : 'text-gray-500'
}

export const getEpisodeTypeInfo = (episodeType: string) => {
  return EPISODE_TYPES.find(type => type.id === episodeType) || EPISODE_TYPES[5] // default to general
}

export const getRhythmInfo = (rhythmType: string) => {
  return RHYTHM_TYPES.find(r => r.value === rhythmType)
}

// 🚨 RED FLAG WARNINGS — when to call 911 / EMS
// These are intentionally broad. Better false alarm than missed MI.
export const RED_FLAG_911_CRITERIA = [
  'Crushing, tearing, or radiating chest pain (especially to left arm, jaw, neck, or back)',
  'Chest pain with shortness of breath, sweating, nausea, or sense of doom',
  'Loss of consciousness (full faint), especially without prodrome or while seated/lying',
  'Chest pain lasting more than 10-15 minutes that is not relieved by rest or nitroglycerin',
  'Sudden severe shortness of breath, especially while at rest',
  'Heart rate over 180 bpm sustained, OR under 40 bpm with symptoms (dizziness, fainting)',
  'Symptoms after recent surgery, long flight, or known clotting disorder (PE concern)',
  'Pregnancy or recent postpartum with cardiac symptoms',
  'Severity 8/10 or higher with cardiac symptoms',
  'Anything that feels different, scarier, or worse than past episodes',
]

// Returns an array of red-flag warning strings for a given entry. Empty array = no red flags detected.
export const getRedFlagWarnings = (entry: {
  episodeType?: string
  rhythmType?: string
  hrPeak?: number
  spo2AtEvent?: number
  symptomSeverity?: number
  symptoms?: string[]
  chestPainCharacter?: string
  chestPainRadiation?: string[]
  locOccurred?: boolean
  locDurationMin?: number
}): string[] => {
  const flags: string[] = []
  const symptoms = entry.symptoms || []

  // Severity threshold
  if (entry.symptomSeverity && entry.symptomSeverity >= 8) {
    flags.push(`Severity ${entry.symptomSeverity}/10 — call 911 for severe symptoms`)
  }

  // Heart rate extremes
  if (entry.hrPeak && entry.hrPeak >= 180) {
    flags.push(`Sustained HR ≥180 bpm — call 911`)
  }
  if (entry.hrPeak && entry.hrPeak < 40) {
    flags.push(`HR <40 bpm — call 911 if symptomatic (dizziness, fainting)`)
  }

  // SpO2
  if (entry.spo2AtEvent && entry.spo2AtEvent < 88) {
    flags.push(`SpO2 <88% — call 911`)
  }

  // Rhythm type — VT is always an emergency
  if (entry.rhythmType === 'VT') {
    flags.push(`Ventricular Tachycardia — call 911 NOW`)
  }

  // Syncope (true LOC) — high-risk for cardiac cause
  if (entry.episodeType === 'syncope' || entry.locOccurred) {
    flags.push(`Loss of consciousness — see emergency care, especially if no prodrome or occurred lying/sitting`)
  }

  // Chest pain + radiation = MI red flag
  if (
    (entry.episodeType === 'chest-pain' || symptoms.some(s => s.toLowerCase().includes('chest'))) &&
    entry.chestPainRadiation && entry.chestPainRadiation.length > 0
  ) {
    flags.push(`Chest pain with radiation — possible MI, call 911`)
  }

  // Chest pain character
  if (entry.chestPainCharacter === 'crushing' || entry.chestPainCharacter === 'tearing') {
    flags.push(`${entry.chestPainCharacter === 'tearing' ? 'Tearing/ripping' : 'Crushing'} chest pain — call 911 (MI / aortic dissection concern)`)
  }

  // Chest pain + multiple sympathetic surge symptoms
  if (entry.episodeType === 'chest-pain' || symptoms.some(s => s.toLowerCase().includes('chest'))) {
    const surgeSymptoms = ['Sweating', 'Nausea', 'Anxiety/Doom', 'Shortness of Breath', 'Air Hunger']
    const surgeCount = surgeSymptoms.filter(s => symptoms.includes(s)).length
    if (surgeCount >= 2) {
      flags.push(`Chest pain with multiple sympathetic symptoms (sweating/nausea/SOB/doom) — call 911`)
    }
  }

  return flags
}

// Returns interim first-aid measures relevant to the entered symptoms — things that
// can help while waiting for EMS. NOT a substitute for calling 911. Always conservative.
export const getInterimMeasures = (entry: {
  episodeType?: string
  rhythmType?: string
  hrPeak?: number
  symptoms?: string[]
  chestPainCharacter?: string
  chestPainRadiation?: string[]
}): string[] => {
  const measures: string[] = []
  const symptoms = entry.symptoms || []

  // SVT-family arrhythmia → Valsalva and ice dive both work via vagal stimulation
  if (
    entry.rhythmType === 'SVT' ||
    entry.rhythmType === 'AVNRT' ||
    entry.rhythmType === 'AVRT' ||
    (entry.hrPeak && entry.hrPeak >= 150 && entry.hrPeak < 180)
  ) {
    measures.push('Vagal maneuvers can sometimes break SVT: bear down (Valsalva) for 10-15 seconds, OR splash cold water on your face / submerge face in ice water briefly. Stop if you feel worse.')
  }

  // Suspected MI / chest pain with red flags
  const hasChestPain =
    entry.episodeType === 'chest-pain' ||
    symptoms.some(s => s.toLowerCase().includes('chest'))
  const hasRadiation = entry.chestPainRadiation && entry.chestPainRadiation.length > 0
  if (hasChestPain && (hasRadiation || entry.chestPainCharacter === 'crushing')) {
    measures.push('Sit or lie down, loosen tight clothing, stay still. If you have no aspirin allergy, no bleeding disorder, and no recent surgery, chew (do not swallow whole) one regular 325mg aspirin while waiting for EMS. Confirm with the 911 dispatcher.')
  }

  // Severe shortness of breath
  if (
    symptoms.includes('Shortness of Breath') ||
    symptoms.includes('Air Hunger')
  ) {
    measures.push('Sit upright, lean slightly forward (tripod position), focus on slow pursed-lip breathing — inhale through nose 2 seconds, exhale through pursed lips 4 seconds.')
  }

  // Bradycardia with symptoms
  if (entry.hrPeak && entry.hrPeak < 50 && entry.hrPeak >= 40) {
    measures.push('Lie flat with legs slightly elevated. If feeling faint, forceful coughing ("cough CPR") may briefly raise output.')
  }

  // Presyncope / dizziness / lightheaded — get horizontal
  if (
    symptoms.includes('Lightheadedness') ||
    symptoms.includes('Dizziness') ||
    symptoms.includes('Pre-syncope (near-faint)') ||
    symptoms.includes('Tunnel Vision')
  ) {
    measures.push('Get horizontal NOW — lie flat with legs elevated above heart level. Do not try to walk it off.')
  }

  return measures
}
