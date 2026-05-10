/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
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
 * HEAD PAIN TRACKER - CONSTANTS
 * 
 * All the options, constants, and configuration for head pain tracking
 */

import {
  PainLocationOption,
  PainTypeOption,
  AuraSymptomOption,
  AssociatedSymptomOption,
  TriggerOption,
  TreatmentOption,
  FunctionalImpactOption,
  ResidualSymptomOption,
  HeadPainEpisodeType,
} from './head-pain-types'

// === EPISODE TYPES (v2 multi-modal) ===
export const EPISODE_TYPES = [
  {
    id: 'migraine-with-aura' as HeadPainEpisodeType,
    name: 'Migraine + Aura',
    icon: '✨',
    description: 'Migraine preceded by visual / sensory / speech aura',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'migraine-no-aura' as HeadPainEpisodeType,
    name: 'Migraine (no aura)',
    icon: '🤕',
    description: 'Migraine without classic aura — still throbbing/light/sound sensitive',
    color: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  {
    id: 'tension' as HeadPainEpisodeType,
    name: 'Tension',
    icon: '🎯',
    description: 'Band-like pressure, bilateral, no nausea',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'cluster' as HeadPainEpisodeType,
    name: 'Cluster',
    icon: '🔪',
    description: 'Severe one-sided, around eye/temple, watery eye, runny nose',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    id: 'sinus' as HeadPainEpisodeType,
    name: 'Sinus',
    icon: '👃',
    description: 'Pressure over cheekbones / forehead / behind eyes — often with congestion',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'worst-of-life' as HeadPainEpisodeType,
    name: 'Worst of Life',
    icon: '🚨',
    description: 'Sudden, severe, "worst headache ever" — RULE OUT SAH IMMEDIATELY',
    color: 'bg-red-200 text-red-900 border-red-300'
  },
  {
    id: 'general' as HeadPainEpisodeType,
    name: 'General / Other',
    icon: '🧠',
    description: 'Headache that doesn\'t fit the above buckets',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
] as const

export const getEpisodeTypeInfo = (episodeType?: string) => {
  if (!episodeType) return EPISODE_TYPES[6]
  return EPISODE_TYPES.find(t => t.id === episodeType) || EPISODE_TYPES[6]
}

export const getEpisodeTypeColor = (episodeType?: string): string => {
  const colors: Record<string, string> = {
    'migraine-with-aura': '#8b5cf6',
    'migraine-no-aura': '#7c3aed',
    'tension': '#3b82f6',
    'cluster': '#dc2626',
    'sinus': '#f59e0b',
    'worst-of-life': '#991b1b',
    'general': '#6b7280',
  }
  return colors[episodeType || 'general'] || '#6b7280'
}

// Pain Location Options
export const PAIN_LOCATIONS: PainLocationOption[] = [
  { value: 'forehead', label: 'Forehead', description: 'Front of head above eyebrows' },
  { value: 'temples', label: 'Temples', description: 'Sides of head near ears' },
  { value: 'top-of-head', label: 'Top of Head', description: 'Crown/vertex area' },
  { value: 'back-of-head', label: 'Back of Head', description: 'Occipital area' },
  { value: 'behind-eyes', label: 'Behind Eyes', description: 'Orbital/retro-orbital pain' },
  { value: 'around-eyes', label: 'Around Eyes', description: 'Periorbital area' },
  { value: 'cheekbones', label: 'Cheekbones', description: 'Sinus/maxillary area' },
  { value: 'jaw', label: 'Jaw/TMJ', description: 'Temporomandibular joint area' },
  { value: 'neck', label: 'Neck', description: 'Cervical/neck tension' },
  { value: 'one-side', label: 'One Side Only', description: 'Unilateral pain' },
  { value: 'whole-head', label: 'Whole Head', description: 'Generalized head pain' }
]

// Pain Type Options
export const PAIN_TYPES: PainTypeOption[] = [
  { value: 'throbbing', label: 'Throbbing', description: 'Pulsating, beating sensation' },
  { value: 'sharp', label: 'Sharp', description: 'Stabbing, piercing pain' },
  { value: 'dull-ache', label: 'Dull Ache', description: 'Constant, mild to moderate ache' },
  { value: 'pressure', label: 'Pressure', description: 'Squeezing, tight sensation' },
  { value: 'burning', label: 'Burning', description: 'Hot, burning sensation' },
  { value: 'electric', label: 'Electric', description: 'Shocking, zapping sensation' },
  { value: 'tight-band', label: 'Tight Band', description: 'Like a band around head' },
  { value: 'ice-pick', label: 'Ice Pick', description: 'Brief, sharp stabbing' },
  { value: 'crushing', label: 'Crushing', description: 'Heavy, crushing weight' }
]

// Aura Symptoms (primarily for migraines)
export const AURA_SYMPTOMS: AuraSymptomOption[] = [
  { value: 'visual-zigzag', label: 'Visual Zigzag Lines', description: 'Scintillating scotoma' },
  { value: 'visual-blind-spot', label: 'Blind Spots', description: 'Areas of vision loss' },
  { value: 'visual-flashing', label: 'Flashing Lights', description: 'Photopsia' },
  { value: 'visual-tunnel', label: 'Tunnel Vision', description: 'Peripheral vision loss' },
  { value: 'numbness-tingling', label: 'Numbness/Tingling', description: 'Usually face, arm, or hand' },
  { value: 'speech-difficulty', label: 'Speech Difficulty', description: 'Trouble speaking or finding words' },
  { value: 'confusion', label: 'Confusion', description: 'Mental fog or disorientation' },
  { value: 'weakness', label: 'Weakness', description: 'Muscle weakness, usually one-sided' },
  { value: 'smell-taste', label: 'Smell/Taste Changes', description: 'Phantom smells or tastes' }
]

// Associated Symptoms
export const ASSOCIATED_SYMPTOMS: AssociatedSymptomOption[] = [
  // Neurological
  { value: 'nausea', label: 'Nausea', category: 'gastrointestinal' },
  { value: 'vomiting', label: 'Vomiting', category: 'gastrointestinal' },
  { value: 'dizziness', label: 'Dizziness', category: 'neurological' },
  { value: 'vertigo', label: 'Vertigo', category: 'neurological' },
  { value: 'balance-problems', label: 'Balance Problems', category: 'neurological' },
  { value: 'fatigue', label: 'Fatigue', category: 'neurological' },
  { value: 'brain-fog', label: 'Brain Fog', category: 'neurological' },
  { value: 'memory-issues', label: 'Memory Issues', category: 'neurological' },
  
  // Sensory
  { value: 'light-sensitivity', label: 'Light Sensitivity', category: 'sensory' },
  { value: 'sound-sensitivity', label: 'Sound Sensitivity', category: 'sensory' },
  { value: 'smell-sensitivity', label: 'Smell Sensitivity', category: 'sensory' },
  { value: 'touch-sensitivity', label: 'Touch Sensitivity', category: 'sensory' },
  
  // Other
  { value: 'neck-stiffness', label: 'Neck Stiffness', category: 'other' },
  { value: 'runny-nose', label: 'Runny Nose', category: 'other' },
  { value: 'watery-eyes', label: 'Watery Eyes', category: 'other' },
  { value: 'restlessness', label: 'Restlessness', category: 'other' }
]

// Trigger Options
export const TRIGGERS: TriggerOption[] = [
  // Dietary
  { value: 'alcohol', label: 'Alcohol', category: 'dietary' },
  { value: 'caffeine', label: 'Caffeine', category: 'dietary' },
  { value: 'chocolate', label: 'Chocolate', category: 'dietary' },
  { value: 'aged-cheese', label: 'Aged Cheese', category: 'dietary' },
  { value: 'processed-meat', label: 'Processed Meat', category: 'dietary' },
  { value: 'msg', label: 'MSG', category: 'dietary' },
  { value: 'artificial-sweeteners', label: 'Artificial Sweeteners', category: 'dietary' },
  { value: 'skipped-meals', label: 'Skipped Meals', category: 'dietary' },
  
  // Environmental
  { value: 'bright-lights', label: 'Bright Lights', category: 'environmental' },
  { value: 'loud-sounds', label: 'Loud Sounds', category: 'environmental' },
  { value: 'strong-smells', label: 'Strong Smells', category: 'environmental' },
  { value: 'weather-changes', label: 'Weather Changes', category: 'environmental' },
  { value: 'barometric-pressure', label: 'Barometric Pressure', category: 'environmental' },
  { value: 'screen-time', label: 'Screen Time', category: 'environmental' },
  
  // Hormonal
  { value: 'menstruation', label: 'Menstruation', category: 'hormonal' },
  { value: 'ovulation', label: 'Ovulation', category: 'hormonal' },
  { value: 'hormone-changes', label: 'Hormone Changes', category: 'hormonal' },
  
  // Stress & Sleep
  { value: 'stress', label: 'Stress', category: 'stress' },
  { value: 'anxiety', label: 'Anxiety', category: 'stress' },
  { value: 'lack-of-sleep', label: 'Lack of Sleep', category: 'sleep' },
  { value: 'too-much-sleep', label: 'Too Much Sleep', category: 'sleep' },
  { value: 'sleep-schedule-change', label: 'Sleep Schedule Change', category: 'sleep' },
  
  // Other
  { value: 'physical-exertion', label: 'Physical Exertion', category: 'other' },
  { value: 'dehydration', label: 'Dehydration', category: 'other' },
  { value: 'neck-tension', label: 'Neck Tension', category: 'other' }
]

// Treatment Options
export const TREATMENTS: TreatmentOption[] = [
  // Medication
  { value: 'ibuprofen', label: 'Ibuprofen', category: 'medication' },
  { value: 'acetaminophen', label: 'Acetaminophen', category: 'medication' },
  { value: 'aspirin', label: 'Aspirin', category: 'medication' },
  { value: 'naproxen', label: 'Naproxen', category: 'medication' },
  { value: 'sumatriptan', label: 'Sumatriptan', category: 'medication' },
  { value: 'rizatriptan', label: 'Rizatriptan', category: 'medication' },
  { value: 'rimegepant', label: 'Nurtec ODT (rimegepant) — CGRP', category: 'medication' },
  { value: 'ubrogepant', label: 'Ubrelvy (ubrogepant) — CGRP', category: 'medication' },
  { value: 'atogepant', label: 'Qulipta (atogepant) — CGRP preventive', category: 'medication' },
  { value: 'cgrp-injectable', label: 'CGRP Injectable (Aimovig/Ajovy/Emgality)', category: 'medication' },
  { value: 'prescription-pain-med', label: 'Prescription Pain Med', category: 'medication' },
  { value: 'preventive-medication', label: 'Preventive Medication', category: 'medication' },

  // Natural
  { value: 'rest-dark-room', label: 'Rest in Dark Room', category: 'natural' },
  { value: 'cold-compress', label: 'Cold Compress', category: 'natural' },
  { value: 'warm-compress', label: 'Warm Compress', category: 'natural' },
  { value: 'massage', label: 'Massage', category: 'natural' },
  { value: 'essential-oils', label: 'Essential Oils', category: 'natural' },
  { value: 'hydration', label: 'Hydration', category: 'natural' },
  { value: 'caffeine', label: 'Caffeine', category: 'natural' },
  { value: 'magnesium', label: 'Magnesium', category: 'natural' },

  // Lifestyle
  { value: 'sleep', label: 'Sleep', category: 'lifestyle' },
  { value: 'meditation', label: 'Meditation', category: 'lifestyle' },
  { value: 'breathing-exercises', label: 'Breathing Exercises', category: 'lifestyle' },
  { value: 'gentle-exercise', label: 'Gentle Exercise', category: 'lifestyle' },
  { value: 'avoid-triggers', label: 'Avoid Triggers', category: 'lifestyle' },

  // Other
  { value: 'acupuncture', label: 'Acupuncture', category: 'other' },
  { value: 'chiropractic', label: 'Chiropractic', category: 'other' },
  { value: 'physical-therapy', label: 'Physical Therapy', category: 'other' }
]

// Functional Impact Options
export const FUNCTIONAL_IMPACT_OPTIONS: FunctionalImpactOption[] = [
  {
    value: 'none',
    label: 'None - No impact on daily activities',
    description: 'Able to function normally',
    color: '#22c55e' // green
  },
  {
    value: 'mild',
    label: 'Mild - Slight impact, can still function',
    description: 'Minor inconvenience but manageable',
    color: '#84cc16' // lime
  },
  {
    value: 'moderate',
    label: 'Moderate - Some activities affected',
    description: 'Need to modify some activities',
    color: '#eab308' // yellow
  },
  {
    value: 'severe',
    label: 'Severe - Most activities affected',
    description: 'Significant impact on daily life',
    color: '#f97316' // orange
  },
  {
    value: 'disabling',
    label: 'Disabling - Cannot function normally',
    description: 'Unable to perform normal activities',
    color: '#ef4444' // red
  }
]

// Residual Symptoms
export const RESIDUAL_SYMPTOMS: ResidualSymptomOption[] = [
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'brain-fog', label: 'Brain Fog' },
  { value: 'neck-stiffness', label: 'Neck Stiffness' },
  { value: 'light-sensitivity', label: 'Light Sensitivity' },
  { value: 'sound-sensitivity', label: 'Sound Sensitivity' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'dizziness', label: 'Dizziness' },
  { value: 'mood-changes', label: 'Mood Changes' },
  { value: 'scalp-tenderness', label: 'Scalp Tenderness' }
]

// Helper Functions
export const getPainIntensityLabel = (intensity: number): string => {
  if (intensity <= 2) return 'Mild'
  if (intensity <= 4) return 'Mild-Moderate'
  if (intensity <= 6) return 'Moderate'
  if (intensity <= 8) return 'Severe'
  return 'Extreme'
}

export const getPainIntensityColor = (intensity: number): string => {
  if (intensity <= 2) return '#22c55e' // green
  if (intensity <= 4) return '#84cc16' // lime
  if (intensity <= 6) return '#eab308' // yellow
  if (intensity <= 8) return '#f97316' // orange
  return '#ef4444' // red
}

export const getFunctionalImpactColor = (impact: string): string => {
  const option = FUNCTIONAL_IMPACT_OPTIONS.find(opt => opt.value === impact)
  return option?.color || '#6b7280' // gray fallback
}

// === RELATED TRACKERS ===
export const RELATED_TRACKERS = [
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Track triptan/CGRP/preventive doses', path: '/medications' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Sleep ↔ migraine correlation', path: '/sleep' },
  { id: 'mind-mood', name: 'Mind & Mood', icon: '🧠', description: 'Stress / mood correlation', path: '/mental-health' },
  { id: 'reproductive-health', name: 'Cycle', icon: '🌙', description: 'Menstrual migraine pattern', path: '/reproductive-health' },
]

// === 🚨 RED FLAG WARNINGS — SAH / stroke / meningitis / GCA / mass ===
// "SNOOP" framework + worst-headache-of-life rule.
export const RED_FLAG_911_CRITERIA = [
  '"Worst headache of your life" — especially sudden onset (rule out SAH)',
  'Thunderclap headache — peaks at maximum intensity in 60 seconds or less',
  'Headache with neck stiffness AND fever (possible meningitis)',
  'Headache with focal neurological deficit (one-sided weakness, numbness, vision loss, speech difficulty)',
  'Headache with new confusion, severe drowsiness, or altered consciousness',
  'New headache after age 50 (rule out giant cell arteritis, mass)',
  'Headache after head injury (especially with worsening symptoms)',
  'Severe headache during pregnancy or postpartum (rule out CVST, eclampsia)',
  'Headache that worsens with valsalva, coughing, or lying down (raised ICP)',
  'Anything that feels different, scarier, or worse than your usual headaches',
]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  painIntensity?: number
  worstHeadacheOfLife?: boolean
  thunderclapOnset?: boolean
  suddenOnset?: boolean
  neckStiffness?: boolean
  fever?: boolean
  focalNeuroDeficit?: boolean
  oneSidedWeakness?: boolean
  speechDifficulty?: boolean
  visionLoss?: boolean
  newAfterAge50?: boolean
  headInjuryRecent?: boolean
  pregnancyOrPostpartum?: boolean
}): string[] => {
  const flags: string[] = []

  if (entry.worstHeadacheOfLife || entry.episodeType === 'worst-of-life') {
    flags.push(`"Worst headache of life" — possible subarachnoid hemorrhage (SAH). Call 911 NOW.`)
  }
  if (entry.thunderclapOnset) {
    flags.push(`Thunderclap onset (peaked in <60 sec) — high SAH suspicion. Call 911 NOW.`)
  }
  if (entry.neckStiffness && entry.fever) {
    flags.push(`Neck stiffness + fever — possible meningitis. ER evaluation NOW.`)
  }
  if (entry.focalNeuroDeficit || entry.oneSidedWeakness || entry.speechDifficulty) {
    flags.push(`Focal neurological deficit (weakness / speech / vision) — possible stroke. Call 911 NOW (FAST: Face/Arms/Speech/Time).`)
  }
  if (entry.visionLoss && entry.newAfterAge50) {
    flags.push(`New headache after 50 with vision loss — possible giant cell arteritis. Same-day evaluation needed (vision-threatening).`)
  }
  if (entry.headInjuryRecent && entry.painIntensity && entry.painIntensity >= 7) {
    flags.push(`Severe headache after recent head injury — rule out subdural / epidural bleed. ER evaluation.`)
  }
  if (entry.pregnancyOrPostpartum && entry.painIntensity && entry.painIntensity >= 7) {
    flags.push(`Severe headache during pregnancy / postpartum — rule out CVST, preeclampsia, eclampsia. ER evaluation.`)
  }

  return flags
}

export const getInterimMeasures = (entry: {
  worstHeadacheOfLife?: boolean
  thunderclapOnset?: boolean
  focalNeuroDeficit?: boolean
}): string[] => {
  const measures: string[] = []
  if (entry.worstHeadacheOfLife || entry.thunderclapOnset) {
    measures.push('Stay still, sit or lie down, dim lights. Do NOT take blood thinners, aspirin, or NSAIDs until evaluated — if this is SAH, those can worsen bleeding. Bring a list of current medications to the ER.')
  }
  if (entry.focalNeuroDeficit) {
    measures.push('Note the EXACT TIME symptoms started — stroke treatment windows are time-critical. Do not eat/drink in case procedures are needed.')
  }
  return measures
}

// === HEAD-PAIN GREMLINS (matched to pain tracker vibe) ===
export const GREMLIN_LABELS = [
  { value: 0,  label: 'No skull gremlins 🌈',           emoji: '🌈' },
  { value: 1,  label: 'Faint skull whisper',            emoji: '👶' },
  { value: 2,  label: 'Mild head fuzz',                 emoji: '🧠' },
  { value: 3,  label: 'Annoying head static',           emoji: '📻' },
  { value: 4,  label: 'Persistent skull gremlin',       emoji: '👹' },
  { value: 5,  label: 'Whole gremlin parade',           emoji: '🎪' },
  { value: 6,  label: 'Skull warfare — dim the lights', emoji: '🌑' },
  { value: 7,  label: 'Triptan time',                   emoji: '💊' },
  { value: 8,  label: 'NEED THE GOOD MEDS',             emoji: '💀' },
  { value: 9,  label: 'Brain on fire',                  emoji: '🔥' },
  { value: 10, label: 'CALL FOR HELP — 911 if WHOL or focal deficits', emoji: '🚨' },
]
export const getGremlinLabel = (level: number) =>
  GREMLIN_LABELS.find(g => g.value === level)?.label || 'Unknown'
export const getGremlinEmoji = (level: number) =>
  GREMLIN_LABELS.find(g => g.value === level)?.emoji || '🧠'
