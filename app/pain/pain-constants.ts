/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-154 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * PAIN TRACKER CONSTANTS (v2)
 * Multi-modal episode types + cross-tracker referrals + 911 red flags
 * (MI, AAA, cauda equina, aortic dissection, SAH).
 */

import { PainEpisodeType } from './pain-types'

// === EPISODE TYPES (v2 multi-modal) ===
export const EPISODE_TYPES = [
  {
    id: 'acute' as PainEpisodeType,
    name: 'Acute Pain',
    icon: '⚡',
    description: 'New pain — injury, sudden onset, recent change',
    color: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  {
    id: 'chronic-flare' as PainEpisodeType,
    name: 'Chronic Flare',
    icon: '🌋',
    description: 'Existing chronic pain spiking above your baseline',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'post-surgical' as PainEpisodeType,
    name: 'Post-Surgical',
    icon: '🩹',
    description: 'Pain after a surgery or procedure',
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'general' as PainEpisodeType,
    name: 'General Pain',
    icon: '🔥',
    description: 'Other pain that doesn\'t fit above',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
] as const

// === CROSS-TRACKER REFERRALS ===
// Chest pain belongs in cardiac (better arrhythmia/MI fields).
// Head pain belongs in head-pain (better migraine/aura/SAH fields).
export const CROSS_TRACKER_REFERRALS = [
  {
    id: 'chest-pain',
    name: 'Chest Pain',
    icon: '💔',
    description: 'Chest pain belongs in the Cardiac tracker — better fields for radiation, MI red flags, ECG strips',
    path: '/cardiac',
    cta: 'Go to Cardiac'
  },
  {
    id: 'head-pain',
    name: 'Head Pain / Migraine',
    icon: '🤕',
    description: 'Head pain has its own tracker — migraine subtypes, aura tracking, SAH red flags',
    path: '/head-pain',
    cta: 'Go to Head Pain'
  },
  {
    id: 'joint',
    name: 'Joint / MSK',
    icon: '🦴',
    description: 'Joint pain has its own tracker — per-joint frequency, subluxation tracking, EDS-friendly fields',
    path: '/joint',
    cta: 'Go to Joint Tracker'
  }
]

// === BODY LOCATIONS ===
export const PAIN_LOCATIONS = [
  'Neck',
  'Shoulders (left)',
  'Shoulders (right)',
  'Upper back',
  'Mid back',
  'Lower back',
  'Tailbone',
  'Abdomen (upper)',
  'Abdomen (mid)',
  'Abdomen (lower)',
  'Pelvis',
  'Left arm',
  'Right arm',
  'Left wrist/hand',
  'Right wrist/hand',
  'Left hip',
  'Right hip',
  'Left thigh',
  'Right thigh',
  'Left knee',
  'Right knee',
  'Left lower leg',
  'Right lower leg',
  'Left ankle/foot',
  'Right ankle/foot',
  'Joints (multiple)',
  'Whole body',
  'Other'
]

// === RADIATION SITES (critical for red-flag detection) ===
export const RADIATION_SITES = [
  'Down left arm',
  'Down right arm',
  'Into jaw',
  'Into neck',
  'Between shoulder blades',
  'Into back',
  'Into chest',
  'Down left leg',
  'Down right leg',
  'Into groin',
  'Into shoulder',
  'Other'
]

// === PAIN CHARACTER ===
export const PAIN_CHARACTERS = [
  'Sharp',
  'Dull',
  'Throbbing',
  'Burning',
  'Stabbing',
  'Aching',
  'Cramping',
  'Shooting',
  'Tingling',
  'Numbness',
  'Pressure',
  'Tight / Squeezing',
  'Electric',
  'Tearing / Ripping' // 🚨 dissection marker
]

// === PAIN PATTERN / QUALITY ===
export const PAIN_PATTERNS = [
  'Constant',
  'Intermittent',
  'Worsening',
  'Improving',
  'Comes and goes',
  'Morning stiffness',
  'Worse with movement',
  'Better with rest',
  'Radiating',
  'Thunderclap (peaked in <60 seconds)' // 🚨 SAH marker
]

// === COMMON TRIGGERS ===
export const COMMON_TRIGGERS = [
  'Stress',
  'Weather change',
  'Lack of sleep',
  'Physical activity',
  'Sitting too long',
  'Standing too long',
  'Poor posture',
  'Certain foods',
  'Hormonal changes',
  'Dehydration',
  'Skipped meals',
  'Overexertion',
  'Cold',
  'Heat',
  'Lifting / Bending',
  'Stress / Argument',
  'Unknown'
]

// === TREATMENTS (non-medication) ===
export const TREATMENTS = [
  'Rest',
  'Ice',
  'Heat',
  'Massage',
  'Stretching',
  'Meditation',
  'Deep breathing',
  'Hot bath / shower',
  'Gentle exercise',
  'Physical therapy',
  'Acupuncture',
  'TENS unit',
  'Topical cream',
  'Essential oils',
  'Distraction',
  'Music therapy',
  'Compression',
  'Elevation'
]

// === MEDICATIONS ===
export const MEDICATIONS = [
  'Ibuprofen',
  'Acetaminophen',
  'Aspirin',
  'Naproxen',
  'Prescription pain med',
  'Muscle relaxer',
  'Topical analgesic',
  'CBD',
  'Medical marijuana',
  'Other'
]

// === SEVERITY LABELS (clinical — preserved for PDF export / docs) ===
export const SEVERITY_LABELS = [
  { value: 0, label: 'No pain', color: 'text-gray-500' },
  { value: 1, label: 'Very mild', color: 'text-green-600' },
  { value: 2, label: 'Mild', color: 'text-green-500' },
  { value: 3, label: 'Mild-moderate', color: 'text-warning' },
  { value: 4, label: 'Moderate', color: 'text-warning' },
  { value: 5, label: 'Moderate', color: 'text-warning' },
  { value: 6, label: 'Moderate-severe', color: 'text-warning' },
  { value: 7, label: 'Severe', color: 'text-destructive' },
  { value: 8, label: 'Very severe', color: 'text-destructive' },
  { value: 9, label: 'Extreme', color: 'text-destructive' },
  { value: 10, label: 'Crisis (call 911)', color: 'text-destructive' }
]

// === 👹 GREMLIN LABELS (the fun ones — for the modal slider) ===
// Real disabled people deserve real medical software AND levity. Both/and.
export const GREMLIN_LABELS = [
  { value: 0,  label: 'No gremlins today 🌈',          emoji: '🌈' },
  { value: 1,  label: 'Tiny gremlin nibble',           emoji: '👶' },
  { value: 2,  label: 'Mildly pesky gremlin',          emoji: '👹' },
  { value: 3,  label: 'Annoying gremlin party',        emoji: '🎉' },
  { value: 4,  label: 'Whole gremlin gang showed up',  emoji: '👹👹' },
  { value: 5,  label: 'Gremlin uprising in progress',  emoji: '🔥' },
  { value: 6,  label: 'Gremlin warfare — bring snacks',emoji: '⚔️' },
  { value: 7,  label: 'Severe gremlin invasion',       emoji: '😤' },
  { value: 8,  label: 'GREMLIN APOCALYPSE',            emoji: '💀' },
  { value: 9,  label: 'Cosmic gremlin event',          emoji: '🌋' },
  { value: 10, label: 'TOTAL GREMLIN CRISIS — 911 if you can\'t function', emoji: '🚨' },
]

export const getGremlinLabel = (level: number) =>
  GREMLIN_LABELS.find(g => g.value === level)?.label || 'Unknown gremlin status'

export const getGremlinEmoji = (level: number) =>
  GREMLIN_LABELS.find(g => g.value === level)?.emoji || '👹'

// === RELATED TRACKERS ===
export const RELATED_TRACKERS = [
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Track pain med doses', path: '/medications' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Sleep ↔ pain correlation', path: '/sleep' },
  { id: 'movement', name: 'Movement', icon: '🚶', description: 'Activity ↔ pain correlation', path: '/movement' },
  { id: 'mind-mood', name: 'Mind & Mood', icon: '🧠', description: 'Mood ↔ pain correlation', path: '/mental-health' },
]

// === HELPERS ===
export const getEpisodeTypeInfo = (episodeType?: string) => {
  if (!episodeType) return EPISODE_TYPES[3] // general
  return EPISODE_TYPES.find(t => t.id === episodeType) || EPISODE_TYPES[3]
}

export const getEpisodeTypeColor = (episodeType?: string): string => {
  const colors: Record<string, string> = {
    'acute': '#ef4444',
    'chronic-flare': '#f97316',
    'post-surgical': '#f59e0b',
    'general': '#6b7280',
  }
  return colors[episodeType || 'general'] || '#6b7280'
}

export const getSeverityLabel = (level: number) =>
  SEVERITY_LABELS.find(s => s.value === level)?.label || 'Unknown'

export const getSeverityColor = (level: number) =>
  SEVERITY_LABELS.find(s => s.value === level)?.color || 'text-gray-500'

// === 🚨 RED FLAG WARNINGS ===
// MI, AAA, cauda equina, aortic dissection, SAH, peritonitis.
// Better one false alarm than missed catastrophe.
export const RED_FLAG_911_CRITERIA = [
  'Chest pain that radiates to arm, jaw, neck, or back — possible heart attack',
  'Chest pain with sweating, nausea, shortness of breath, or sense of doom — possible MI',
  '"Tearing" or "ripping" pain (chest, back, or abdomen) — possible aortic dissection',
  'Sudden, severe, "thunderclap" pain that peaks in seconds — especially in the head',
  'Severe abdominal pain with rigidity, fever, vomiting, or pulsating mass',
  'Severe back pain with leg weakness, numbness, or loss of bowel/bladder control — cauda equina syndrome',
  'Pain so severe you can\'t move, speak, or function — 8/10 or higher',
  'Pain after major trauma, fall, or accident',
  'Pain with high fever or signs of serious infection',
  'Anything that feels different, scarier, or worse than your usual pain',
]

// Returns array of red-flag warnings detected from current entry data
export const getRedFlagWarnings = (entry: {
  episodeType?: string
  painLevel?: number
  painLocations?: string[]
  painCharacter?: string[]
  painPattern?: string[]
  radiatesTo?: string[]
  suddenOnset?: boolean
  thunderclapPattern?: boolean
  tearingQuality?: boolean
  shortnessOfBreath?: boolean
  sweatingNausea?: boolean
  legWeakness?: boolean
  bowelBladderChanges?: boolean
  saddleAnesthesia?: boolean
  feverPresent?: boolean
  abdominalRigidity?: boolean
  pulsatileMass?: boolean
}): string[] => {
  const flags: string[] = []
  const locations = entry.painLocations || []
  const character = entry.painCharacter || []
  const pattern = entry.painPattern || []
  const radiatesTo = entry.radiatesTo || []

  // Severity gate
  if (entry.painLevel && entry.painLevel >= 9) {
    flags.push(`Pain ${entry.painLevel}/10 — call 911 if you can\'t function`)
  }

  // Tearing/ripping = aortic dissection until proven otherwise
  if (entry.tearingQuality || character.some(c => /tearing|ripping/i.test(c))) {
    flags.push(`Tearing or ripping pain — possible aortic dissection. Call 911 NOW.`)
  }

  // Thunderclap = SAH until proven otherwise
  if (entry.thunderclapPattern || pattern.some(p => /thunderclap/i.test(p))) {
    flags.push(`Thunderclap pain (peaked in seconds) — possible subarachnoid hemorrhage. Call 911 NOW.`)
  }

  // Chest + radiation = MI
  const hasChest = locations.some(l => /chest/i.test(l))
  const hasMIRadiation = radiatesTo.some(r => /arm|jaw|shoulder blade|back/i.test(r))
  if (hasChest && hasMIRadiation) {
    flags.push(`Chest pain with radiation — possible MI. Call 911. (Also: Cardiac tracker has better fields for this.)`)
  }
  if (hasChest && (entry.shortnessOfBreath || entry.sweatingNausea)) {
    flags.push(`Chest pain with shortness of breath / sweating / nausea — possible MI. Call 911 NOW.`)
  }

  // Back + leg weakness / bowel-bladder = cauda equina
  const hasBack = locations.some(l => /back|tailbone/i.test(l))
  if (hasBack && (entry.legWeakness || entry.bowelBladderChanges || entry.saddleAnesthesia)) {
    flags.push(`Back pain with leg weakness / bowel-bladder change / saddle numbness — possible cauda equina syndrome. Surgical emergency. Call 911 / go to ER NOW.`)
  }

  // Severe abdominal — AAA / peritonitis
  const hasAbdomen = locations.some(l => /abdomen|pelvis/i.test(l))
  if (hasAbdomen && entry.painLevel && entry.painLevel >= 7) {
    if (entry.pulsatileMass) {
      flags.push(`Severe abdominal pain with pulsating mass — possible AAA (abdominal aortic aneurysm). Call 911 NOW.`)
    }
    if (entry.abdominalRigidity || entry.feverPresent) {
      flags.push(`Severe abdominal pain with rigidity or fever — possible peritonitis or surgical abdomen. ER evaluation needed.`)
    }
  }

  return flags
}

// Interim measures while waiting for help. Conservative.
export const getInterimMeasures = (entry: {
  episodeType?: string
  painLocations?: string[]
  painCharacter?: string[]
  shortnessOfBreath?: boolean
  legWeakness?: boolean
}): string[] => {
  const measures: string[] = []
  const locations = entry.painLocations || []
  const character = entry.painCharacter || []

  // Suspected MI / chest pain with red flag character
  if (locations.some(l => /chest/i.test(l)) && character.some(c => /crushing|tight|pressure|tearing/i.test(c))) {
    measures.push('Sit or lie down, loosen tight clothing, stay still. If you have no aspirin allergy, no bleeding disorder, and no recent surgery, chew (do not swallow whole) one regular 325mg aspirin while waiting for EMS. Confirm with the 911 dispatcher.')
  }

  // Suspected cauda equina
  if (locations.some(l => /back|tailbone/i.test(l)) && entry.legWeakness) {
    measures.push('Stay still. Cauda equina syndrome has a narrow surgical window — do NOT delay ER evaluation. Bring a list of medications and any recent imaging.')
  }

  // SOB
  if (entry.shortnessOfBreath) {
    measures.push('Sit upright, lean slightly forward (tripod position), focus on slow pursed-lip breathing — inhale through nose 2 seconds, exhale through pursed lips 4 seconds.')
  }

  return measures
}

// === PAIN GOBLINISMS (preserved from v1 — Ren\'s vibe) ===
export const PAIN_GOBLINISMS = [
  'The pain goblins have been documented! 🔥🧙‍♂️',
  'Ouchie sprites are taking detailed notes! 💥📝',
  'Pain level recorded in the grimace grimoire! 😬📚',
  'The discomfort demons have updated their charts! 👹📊',
  'Your pain patterns are filed in the ache archives! 🗂️⚡',
  'The hurt historians have catalogued your experience! 📖💢',
  'Pain tracking complete — the relief researchers are pleased! 🔬✨',
  'Ouch data saved by the suffering scribes! 📋🔥'
]

export const getPainGoblinism = (): string =>
  PAIN_GOBLINISMS[Math.floor(Date.now() / 1000) % PAIN_GOBLINISMS.length]
