/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (v2 refactor — CHA-153)
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent.
 * Open source under PolyForm Noncommercial 1.0.0.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * SEIZURE TRACKER CONSTANTS
 * v2 — multi-modal episode types + status epilepticus red flags.
 */

import { SeizureEpisodeType, ConsciousnessLevel, DurationCategory } from './seizure-types'

// === EPISODE TYPES (v2 multi-modal interface) ===
export const EPISODE_TYPES = [
  {
    id: 'focal-aware' as SeizureEpisodeType,
    name: 'Focal Aware',
    icon: '⚡',
    description: 'Simple partial — fully conscious, localized symptoms',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'focal-impaired' as SeizureEpisodeType,
    name: 'Focal Impaired',
    icon: '🌀',
    description: 'Complex partial — altered awareness, automatisms',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'tonic-clonic' as SeizureEpisodeType,
    name: 'Tonic-Clonic',
    icon: '💥',
    description: 'Generalized convulsion — stiffening + jerking, LOC',
    color: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  {
    id: 'absence' as SeizureEpisodeType,
    name: 'Absence',
    icon: '👁️',
    description: 'Brief staring spells, sudden pauses in awareness',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'myoclonic' as SeizureEpisodeType,
    name: 'Myoclonic',
    icon: '⚡',
    description: 'Sudden brief jerks — single or clusters',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  },
  {
    id: 'atonic' as SeizureEpisodeType,
    name: 'Atonic (Drop)',
    icon: '⬇️',
    description: 'Sudden loss of muscle tone — drop attack',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'autonomic' as SeizureEpisodeType,
    name: 'Autonomic',
    icon: '💓',
    description: 'Sudden HR/BP/GI/sweating changes — often misdiagnosed as POTS, MCAS, or panic',
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'general' as SeizureEpisodeType,
    name: 'General / Other',
    icon: '⚡',
    description: 'Unknown classification, mixed, or other seizure event',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
] as const

// Backward-compat: map legacy string seizureType to new episodeType id
export const LEGACY_TYPE_MAP: Record<string, SeizureEpisodeType> = {
  'Focal Aware (Simple Partial)': 'focal-aware',
  'Focal Impaired Awareness (Complex Partial)': 'focal-impaired',
  'Focal to Bilateral Tonic-Clonic': 'tonic-clonic',
  'Generalized Tonic-Clonic': 'tonic-clonic',
  'Absence': 'absence',
  'Myoclonic': 'myoclonic',
  'Atonic (Drop Attack)': 'atonic',
  'Tonic': 'general',
  'Clonic': 'general',
  'Unknown/Uncertain': 'general',
}

export const mapLegacyType = (legacyType?: string): SeizureEpisodeType => {
  if (!legacyType) return 'general'
  return LEGACY_TYPE_MAP[legacyType] || 'general'
}

// === SYMPTOM CATEGORIES (preserved from v1 — solid medical content) ===
export const SYMPTOM_CATEGORIES = {
  motor_focal: {
    label: 'Motor (Focal)',
    symptoms: ['Twitching (one side)', 'Jerking (one side)', 'Hand/Arm Movements', 'Leg Movements', 'Facial Twitching']
  },
  motor_generalized: {
    label: 'Motor (Generalized)',
    symptoms: ['Muscle Stiffening (Tonic)', 'Rhythmic Jerking (Clonic)', 'Loss of Muscle Tone', 'Whole Body Stiffening', 'Bilateral Jerking']
  },
  sensory: {
    label: 'Sensory',
    symptoms: ['Tingling/Numbness', 'Visual Disturbances', 'Auditory Changes', 'Strange Tastes', 'Strange Smells', 'Vertigo/Spinning']
  },
  cognitive: {
    label: 'Cognitive/Emotional',
    symptoms: ['Déjà Vu', 'Jamais Vu', 'Fear/Panic', 'Memory Disturbance', 'Confusion During', 'Difficulty Speaking', 'Forced Thoughts', 'Emotional Surge']
  },
  autonomic: {
    label: 'Autonomic',
    symptoms: ['Racing Heart', 'Nausea', 'Flushing/Sweating', 'Goosebumps', 'Rising Sensation (Epigastric)', 'Breathing Changes']
  },
  awareness: {
    label: 'Awareness Changes',
    symptoms: ['Staring/Unresponsive', 'Confusion During', 'Loss of Consciousness', 'Partial Awareness']
  },
  automatisms: {
    label: 'Automatisms',
    symptoms: ['Lip Smacking', 'Chewing Motions', 'Hand Fumbling', 'Picking at Clothes', 'Walking/Wandering', 'Repetitive Movements']
  },
  severe: {
    label: 'Severe/Emergency Signs',
    symptoms: ['Incontinence', 'Tongue Biting', 'Cyanosis (Blue Lips)', 'Fall/Collapse', 'Injury During']
  },
  brief: {
    label: 'Brief Episodes',
    symptoms: ['Eye Fluttering', 'Brief Staring', 'Sudden Jerk', 'Head Drop', 'Brief Blank']
  }
}

// Episode-type-aware symptom suggestions
export const EPISODE_TYPE_SYMPTOMS: Record<SeizureEpisodeType, string[]> = {
  'focal-aware': [
    ...SYMPTOM_CATEGORIES.motor_focal.symptoms,
    ...SYMPTOM_CATEGORIES.sensory.symptoms,
    ...SYMPTOM_CATEGORIES.cognitive.symptoms,
    ...SYMPTOM_CATEGORIES.autonomic.symptoms,
  ],
  'focal-impaired': [
    ...SYMPTOM_CATEGORIES.motor_focal.symptoms,
    ...SYMPTOM_CATEGORIES.sensory.symptoms,
    ...SYMPTOM_CATEGORIES.cognitive.symptoms,
    ...SYMPTOM_CATEGORIES.autonomic.symptoms,
    ...SYMPTOM_CATEGORIES.awareness.symptoms,
    ...SYMPTOM_CATEGORIES.automatisms.symptoms,
  ],
  'tonic-clonic': [
    ...SYMPTOM_CATEGORIES.motor_generalized.symptoms,
    ...SYMPTOM_CATEGORIES.awareness.symptoms,
    ...SYMPTOM_CATEGORIES.autonomic.symptoms,
    ...SYMPTOM_CATEGORIES.severe.symptoms,
  ],
  'absence': [
    ...SYMPTOM_CATEGORIES.brief.symptoms,
    'Lip Smacking', 'Hand Fumbling', 'Staring/Unresponsive',
  ],
  'myoclonic': [
    'Sudden Jerk', 'Arm/Leg Jerk', 'Whole Body Jerk', 'Cluster of Jerks', 'Drop (from jerk)',
  ],
  'atonic': [
    'Loss of Muscle Tone', 'Head Drop', 'Fall/Collapse', 'Sudden Drop', 'Brief Limpness',
  ],
  'autonomic': [
    // Autonomic seizures = ictal autonomic dysfunction. Often pure or near-pure
    // autonomic features without classic motor signs, which is why they get
    // misdiagnosed as POTS, MCAS, vasovagal, or panic disorder.
    'Sudden HR Spike (tachycardia)',
    'Sudden HR Drop (bradycardia)',
    'Sudden BP Spike',
    'Sudden BP Drop',
    'Flushing/Sweating',
    'Pallor (sudden paleness)',
    'Goosebumps',
    'Pupil Changes',
    'Sudden Nausea / Vomiting',
    'Abdominal Pain (sudden)',
    'Rising Sensation (Epigastric)',
    'Air Hunger / Hyperventilation',
    'Sudden Urge to Urinate / Defecate',
    'Sudden Salivation / Drooling',
    'Lacrimation (sudden tearing)',
    'Piloerection (hair standing up)',
    'Confusion During',
    'Brief Awareness Change',
  ],
  'general': [
    ...SYMPTOM_CATEGORIES.motor_focal.symptoms,
    ...SYMPTOM_CATEGORIES.motor_generalized.symptoms,
    ...SYMPTOM_CATEGORIES.sensory.symptoms,
    ...SYMPTOM_CATEGORIES.cognitive.symptoms,
    ...SYMPTOM_CATEGORIES.autonomic.symptoms,
    ...SYMPTOM_CATEGORIES.awareness.symptoms,
    ...SYMPTOM_CATEGORIES.automatisms.symptoms,
    ...SYMPTOM_CATEGORIES.severe.symptoms,
    ...SYMPTOM_CATEGORIES.brief.symptoms,
  ],
}

export const getSymptomsForEpisodeType = (episodeType: SeizureEpisodeType): string[] => {
  const symptoms = EPISODE_TYPE_SYMPTOMS[episodeType] || EPISODE_TYPE_SYMPTOMS['general']
  return [...new Set(symptoms)]
}

// === AURA / PRODROME ===
export const AURA_SYMPTOMS = [
  'Visual Changes', 'Strange Smells', 'Strange Tastes', 'Déjà Vu', 'Fear/Anxiety',
  'Nausea', 'Dizziness', 'Tingling', 'Confusion', 'Emotional Changes',
  'Auditory Changes', 'Rising Sensation'
]

// === POSTICTAL (recovery) ===
export const POST_SEIZURE_SYMPTOMS = [
  'Confusion', 'Disorientation', 'Fatigue/Exhaustion', 'Headache', 'Muscle Soreness',
  'Memory Problems', 'Speech Difficulties', 'Slurred Speech', 'Word Finding Difficulty',
  'Emotional Changes', 'Irritability', 'Depression/Sadness', 'Anxiety', 'Sleep Need',
  'Nausea', 'Vomiting', 'Weakness', 'Coordination Problems', 'Vision Changes',
  'Sensitivity to Light', 'Sensitivity to Sound', 'Difficulty Concentrating',
  'Feeling "Not Right"', "Todd's Paresis (post-ictal weakness)"
]

// === TRIGGERS ===
export const COMMON_TRIGGERS = [
  'Stress', 'Sleep Deprivation', 'Missed Medication', 'Flashing Lights', 'Alcohol',
  'Illness/Fever', 'Hormonal Changes', 'Dehydration', 'Low Blood Sugar', 'Caffeine',
  'Loud Noises', 'Strong Smells', 'Heat/Overheating', 'Physical Exhaustion',
  'Emotional Upset', 'Recent Med Change'
]

// === CONSCIOUSNESS LEVELS (typed) ===
export const CONSCIOUSNESS_OPTIONS: { value: ConsciousnessLevel; label: string }[] = [
  { value: 'fully-aware', label: 'Fully Aware' },
  { value: 'partially-aware', label: 'Partially Aware' },
  { value: 'unaware', label: 'Unaware / Unconscious' },
  { value: 'confused', label: 'Confused' },
  { value: 'unknown', label: 'Unknown' }
]

// === DURATION (typed) ===
export const DURATION_OPTIONS: { value: DurationCategory; label: string; isStatusEpilepticus?: boolean }[] = [
  { value: 'under-30s', label: 'Less than 30 seconds' },
  { value: '30s-1min', label: '30 seconds – 1 minute' },
  { value: '1-2min', label: '1–2 minutes' },
  { value: '2-5min', label: '2–5 minutes' },
  { value: '5-10min', label: '5–10 minutes', isStatusEpilepticus: true },
  { value: 'over-10min', label: 'More than 10 minutes', isStatusEpilepticus: true },
  { value: 'unknown', label: 'Unknown' },
]

export const RECOVERY_TIME_OPTIONS = [
  'Immediate (0–5 minutes)',
  'Quick (5–15 minutes)',
  'Moderate (15–30 minutes)',
  'Slow (30–60 minutes)',
  'Extended (1–2 hours)',
  'Very Long (2+ hours)',
  'Still recovering'
]

// === SEVERITY ===
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

// === RELATED TRACKERS ===
export const RELATED_TRACKERS = [
  { id: 'medications', name: 'Medications', icon: '💊', description: 'AED adherence is a top trigger', path: '/medications' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Sleep deprivation correlation', path: '/sleep' },
  { id: 'mind-mood', name: 'Mind & Mood', icon: '🧠', description: 'Stress / mood correlation', path: '/mental-health' },
  { id: 'appointments', name: 'Appointments', icon: '🩺', description: 'Track neuro follow-ups', path: '/providers' },
]

// === HELPERS ===
export const getEpisodeTypeInfo = (episodeType?: SeizureEpisodeType | string) => {
  if (!episodeType) return EPISODE_TYPES[7] // general
  return EPISODE_TYPES.find(t => t.id === episodeType) || EPISODE_TYPES[7]
}

export const getEpisodeTypeColor = (episodeType?: SeizureEpisodeType | string): string => {
  const colorMap: Record<string, string> = {
    'focal-aware': '#10b981',
    'focal-impaired': '#f59e0b',
    'tonic-clonic': '#dc2626',
    'absence': '#8b5cf6',
    'myoclonic': '#06b6d4',
    'atonic': '#f97316',
    'autonomic': '#ec4899',
    'general': '#6b7280',
  }
  return colorMap[episodeType || 'general'] || '#6b7280'
}

export const getSeverityLabel = (severity: number) => {
  return SEVERITY_LABELS.find(s => s.value === severity)?.label || 'Unknown'
}

export const getSeverityColor = (severity: number) => {
  return SEVERITY_LABELS.find(s => s.value === severity)?.color || 'text-gray-500'
}

export const isLongDuration = (cat?: DurationCategory): boolean => {
  return cat === '5-10min' || cat === 'over-10min'
}

// === 🚨 RED FLAG WARNINGS — Status Epilepticus + emergency criteria ===
// Status epilepticus = a single seizure ≥5 min OR multiple seizures without recovery between.
// This is a NEUROLOGICAL EMERGENCY with high mortality if untreated.
export const RED_FLAG_911_CRITERIA = [
  'Single seizure lasting 5 minutes or longer (status epilepticus — call 911)',
  'Multiple seizures in a row without regaining awareness between them (status epilepticus)',
  'First-ever seizure — even if brief, get evaluated',
  'Seizure with serious injury (head injury, broken bone, deep cut)',
  'Seizure in water (pool, bath, lake) — even if brief',
  'Difficulty breathing or staying conscious AFTER the seizure ends',
  'Seizure during pregnancy',
  'Seizure with high fever (especially in adults)',
  'Seizure after head injury, drug overdose, or poisoning',
  "Anything that feels different, scarier, or worse than this person's usual seizures",
]

// Returns array of red-flag warning strings. Empty = no red flags detected.
export const getRedFlagWarnings = (entry: {
  episodeType?: string
  durationCategory?: string
  durationMinutes?: number
  statusEpilepticus?: boolean
  multipleConsecutive?: boolean
  noRecoveryBetween?: boolean
  injuriesOccurred?: boolean
  injuryRequiredER?: boolean
  symptoms?: string[]
  consciousness?: string
}): string[] => {
  const flags: string[] = []
  const symptoms = entry.symptoms || []

  // STATUS EPILEPTICUS — single ≥5min
  if (
    entry.statusEpilepticus ||
    entry.durationCategory === '5-10min' ||
    entry.durationCategory === 'over-10min' ||
    (entry.durationMinutes && entry.durationMinutes >= 5)
  ) {
    flags.push(`Status epilepticus — seizure lasting 5 minutes or longer is a NEUROLOGICAL EMERGENCY. Call 911 NOW.`)
  }

  // Multiple consecutive without recovery
  if (entry.multipleConsecutive && entry.noRecoveryBetween) {
    flags.push(`Multiple seizures without recovery between — also status epilepticus. Call 911 NOW.`)
  }

  // ER-level injury
  if (entry.injuryRequiredER) {
    flags.push(`Injury severe enough for ER — get evaluated for both the injury and the seizure cause.`)
  }

  // Severe symptoms during/after
  if (symptoms.includes('Cyanosis (Blue Lips)')) {
    flags.push(`Cyanosis (blue lips) indicates oxygen problem — call 911 if not resolving immediately post-seizure.`)
  }

  // Persistent unresponsiveness post-seizure
  if (entry.consciousness === 'unaware' && entry.durationMinutes && entry.durationMinutes >= 3) {
    flags.push(`Prolonged unresponsiveness — confirm breathing, call 911 if not regaining awareness.`)
  }

  return flags
}

// Interim measures while waiting for help / between events. Conservative seizure first-aid.
export const getInterimMeasures = (entry: {
  episodeType?: string
  durationCategory?: string
  durationMinutes?: number
  statusEpilepticus?: boolean
  symptoms?: string[]
}): string[] => {
  const measures: string[] = []

  // Universal seizure first-aid for the witness/caregiver
  measures.push(
    'STAY: stay with the person until fully alert. TIME: note when it started — duration drives 911 decision. SAFE: clear hard/sharp objects, cushion the head, loosen anything tight around the neck.'
  )
  measures.push(
    'DO NOT put anything in their mouth. DO NOT hold them down. DO NOT try to stop the movements.'
  )
  measures.push(
    'After convulsions stop: turn person onto their side (recovery position) to keep airway clear. Do not give food, water, or pills until fully alert.'
  )

  // If duration is approaching 5 min — call 911 NOW
  if (
    entry.durationCategory === '2-5min' ||
    (entry.durationMinutes && entry.durationMinutes >= 2 && entry.durationMinutes < 5)
  ) {
    measures.push(
      'Duration approaching 5 minutes — start dialing 911 NOW. Do not wait for the 5-minute mark.'
    )
  }

  // Active status epilepticus
  if (
    entry.statusEpilepticus ||
    entry.durationCategory === '5-10min' ||
    entry.durationCategory === 'over-10min'
  ) {
    measures.push(
      'If a rescue medication has been prescribed (Diastat, Valtoco, Nayzilam, etc.), administer per the personal seizure action plan. EMS is still required even after rescue med.'
    )
  }

  return measures
}

// === SAFETY / TOAST MESSAGES ===
export const SEIZURE_SAFETY_MESSAGES = [
  "⚡ Seizure recorded. Take care of yourself. 💚",
  "🛡️ Episode tracked. Rest and recover safely. 💜",
  "📋 Data saved. Focus on your recovery now. 🌟",
  "💚 Tracked safely. You're doing great managing this. ⚡",
  "🌈 Episode logged. Take time to rest and heal. 💙"
]

export const getRandomSafetyMessage = (): string => {
  return SEIZURE_SAFETY_MESSAGES[Math.floor(Math.random() * SEIZURE_SAFETY_MESSAGES.length)]
}

// === LEGACY EXPORTS (preserved for backwards compatibility with seizure-history etc) ===
export const SEIZURE_TYPES = EPISODE_TYPES.map(t => t.name) // legacy flat string list
export const formatDuration = (duration?: string): string => {
  if (!duration) return ''
  return duration.replace('Less than ', '<').replace('More than ', '>')
}

export const getSeizureTypeColor = (type?: string): string => {
  // accept either legacy seizureType strings or new episodeType ids
  if (!type) return '#6b7280'
  const newId = LEGACY_TYPE_MAP[type] || (type as SeizureEpisodeType)
  return getEpisodeTypeColor(newId)
}

export const getSeverityLevel = (entry: any): 'Low' | 'Medium' | 'High' | 'Critical' => {
  let score = 0
  const dur = entry.durationCategory || entry.duration || ''
  if (typeof dur === 'string') {
    if (dur.includes('5-10') || dur.includes('over-10') || dur.includes('More than 10')) score += 3
    else if (dur.includes('2-5')) score += 2
    else if (dur.includes('1-2')) score += 1
  }
  if (entry.consciousness === 'unaware' || entry.consciousness === 'Unaware/Unconscious') score += 2
  else if (entry.consciousness === 'confused' || entry.consciousness === 'Confused') score += 1
  if (entry.injuriesOccurred) score += 2
  if (entry.statusEpilepticus) score += 4
  const rec = entry.recoveryTime || ''
  if (typeof rec === 'string') {
    if (rec.includes('Extended') || rec.includes('Very Long')) score += 2
    else if (rec.includes('Slow')) score += 1
  }
  if (score >= 6) return 'Critical'
  if (score >= 4) return 'High'
  if (score >= 2) return 'Medium'
  return 'Low'
}
