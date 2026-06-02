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
import { AnxietyTypeOption, CopingStrategy, AnxietyEpisodeType } from './anxiety-types'

// === v2 EPISODE TYPES (multi-modal) ===
export const EPISODE_TYPES = [
  { id: 'panic-attack' as AnxietyEpisodeType, name: 'Panic Attack', icon: '😱', description: 'Intense fear with physical symptoms', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'generalized' as AnxietyEpisodeType, name: 'Generalized', icon: '😰', description: 'General worry / unease', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'social' as AnxietyEpisodeType, name: 'Social', icon: '😳', description: 'Anxiety around people / social situations', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'phobic' as AnxietyEpisodeType, name: 'Phobic', icon: '⚠️', description: 'Specific trigger / stimulus', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'ocd-shaped' as AnxietyEpisodeType, name: 'OCD-shaped', icon: '🔁', description: 'Intrusive thoughts + compulsion urges', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'meltdown' as AnxietyEpisodeType, name: 'Meltdown', icon: '🌪️', description: 'Sensory / emotional overload (AuDHD)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'shutdown' as AnxietyEpisodeType, name: 'Shutdown', icon: '🔇', description: 'Withdrawal / inability to function (AuDHD)', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'anticipatory' as AnxietyEpisodeType, name: 'Anticipatory', icon: '⏰', description: 'Worry about future events', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'performance' as AnxietyEpisodeType, name: 'Performance', icon: '🎭', description: 'Fear of being judged / failing', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'health' as AnxietyEpisodeType, name: 'Health Anxiety', icon: '🏥', description: 'Worry about illness / medical issues', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'general' as AnxietyEpisodeType, name: 'General / Other', icon: '🌫️', description: 'Other anxiety experience', color: 'bg-slate-100 text-slate-800 border-slate-200' },
] as const

export const getEpisodeTypeInfo = (id?: string) => {
  if (!id) return EPISODE_TYPES[10]
  return EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[10]
}

export const getEpisodeTypeColor = (id?: string): string => {
  const colors: Record<string, string> = {
    'panic-attack': '#dc2626',
    'generalized': '#eab308',
    'social': '#3b82f6',
    'phobic': '#8b5cf6',
    'ocd-shaped': '#06b6d4',
    'meltdown': '#a855f7',
    'shutdown': '#6b7280',
    'anticipatory': '#f97316',
    'performance': '#ec4899',
    'health': '#10b981',
    'general': '#64748b',
  }
  return colors[id || 'general'] || '#64748b'
}

// === RELATED TRACKERS ===
export const RELATED_TRACKERS = [
  { id: 'mind-mood', name: 'Mind & Mood', icon: '🧠', description: 'Mood / depression tracking', path: '/mental-health' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Sleep ↔ anxiety correlation', path: '/sleep' },
  { id: 'medications', name: 'Medications', icon: '💊', description: 'PRN benzo / SSRI tracking', path: '/medications' },
  { id: 'crisis-support', name: 'Crisis Support', icon: '🆘', description: '988 + safety planning', path: '/crisis-support' },
]

// === 🚨 988 / CRISIS RED FLAGS ===
// Different from 911 — mental health crisis line. The Suicide & Crisis Lifeline.
export const RED_FLAG_988_CRITERIA = [
  'Thoughts of suicide, dying, or "not being here" — call/text 988 (Suicide & Crisis Lifeline)',
  'Urges to harm yourself — reach out NOW: 988 (call/text) or chat at 988lifeline.org',
  'Intrusive thoughts about harming yourself or others that feel hard to resist',
  'Feeling completely hopeless, like nothing will ever get better',
  'Considering the means / making a plan — this is an emergency, please call 988 or 911',
  'Substance use combined with crisis thoughts — extra-high risk',
  'Recent loss / trauma combined with severe anxiety + isolation',
  'Severe panic with chest pain that doesn\'t resolve — also rule out cardiac (use Cardiac tracker)',
  'Anything that feels different, scarier, or worse than your typical anxiety',
]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  anxietyLevel?: number
  panicLevel?: number
  suicidalIdeation?: boolean
  selfHarmUrges?: boolean
  intrusiveThoughtsHarm?: boolean
  feelingHopeless?: boolean
  hospitalizationConsidered?: boolean
  physicalSymptoms?: string[]
}): string[] => {
  const flags: string[] = []
  if (entry.suicidalIdeation) {
    flags.push(`Thoughts of suicide / dying — please reach out: 988 (call or text), 988lifeline.org for chat. You don\'t have to be alone in this.`)
  }
  if (entry.selfHarmUrges) {
    flags.push(`Urges to harm yourself — please reach out NOW: 988 (call/text). If urges feel imminent, call 911 or go to ER.`)
  }
  if (entry.intrusiveThoughtsHarm) {
    flags.push(`Intrusive thoughts about harm — these are usually anxiety/OCD, not intent. But if hard to resist, reach out: 988.`)
  }
  if (entry.feelingHopeless && (entry.suicidalIdeation || entry.selfHarmUrges)) {
    flags.push(`Hopelessness + crisis thoughts — this combination is a high-risk pattern. 988 NOW.`)
  }
  if (entry.hospitalizationConsidered) {
    flags.push(`If you\'re considering hospitalization, that\'s a signal to get evaluated. Call 988, your therapist, or go to ER.`)
  }
  // Severe panic + chest = consider cardiac
  const physicalSymptoms = entry.physicalSymptoms || []
  if (entry.panicLevel && entry.panicLevel >= 8 && physicalSymptoms.some(s => /chest|heart/i.test(s))) {
    flags.push(`Severe panic with chest symptoms — anxiety can mimic heart attack, but heart attack can also mimic panic. If you\'re unsure, document in Cardiac tracker too and consider ER evaluation.`)
  }
  return flags
}

export const getInterimMeasures = (entry: {
  episodeType?: string
  suicidalIdeation?: boolean
  selfHarmUrges?: boolean
  panicLevel?: number
}): string[] => {
  const measures: string[] = []
  if (entry.suicidalIdeation || entry.selfHarmUrges) {
    measures.push('988 — call or text. Available 24/7. Free. Confidential. They will NOT automatically dispatch police; you can ask for chat-only support.')
    measures.push('Crisis Text Line: text HOME to 741741.')
    measures.push('If alone and unsafe: remove access to means (medications, weapons), tell someone you trust where you are, get to a safer space if possible.')
  }
  if (entry.panicLevel && entry.panicLevel >= 7) {
    measures.push('5-4-3-2-1 grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Slows the spiral.')
    measures.push('Box breathing: in 4, hold 4, out 4, hold 4. Repeat 4 cycles. Resets vagal tone.')
  }
  return measures
}

// Anxiety Types with caring descriptions
export const ANXIETY_TYPES: AnxietyTypeOption[] = [
  {
    value: 'generalized',
    label: 'Generalized Anxiety',
    emoji: '😰',
    description: 'General worry and unease',
    color: 'bg-warning/10 text-warning'
  },
  {
    value: 'social',
    label: 'Social Anxiety',
    emoji: '😳',
    description: 'Anxiety around people or social situations',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'panic-attack',
    label: 'Panic Attack',
    emoji: '😱',
    description: 'Intense fear with physical symptoms',
    color: 'bg-destructive/10 text-destructive'
  },
  {
    value: 'meltdown',
    label: 'Meltdown',
    emoji: '🌪️',
    description: 'Overwhelming sensory/emotional overload',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'shutdown',
    label: 'Shutdown',
    emoji: '🔇',
    description: 'Withdrawal and inability to function',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'anticipatory',
    label: 'Anticipatory Anxiety',
    emoji: '⏰',
    description: 'Worry about future events',
    color: 'bg-warning/10 text-warning'
  },
  {
    value: 'performance',
    label: 'Performance Anxiety',
    emoji: '🎭',
    description: 'Fear of being judged or failing',
    color: 'bg-pink-100 text-pink-800'
  },
  {
    value: 'health',
    label: 'Health Anxiety',
    emoji: '🏥',
    description: 'Worry about illness or medical issues',
    color: 'bg-green-100 text-green-800'
  }
]

// Physical Symptoms
export const PHYSICAL_SYMPTOMS = [
  'Racing heart/palpitations',
  'Sweating',
  'Shaking/trembling',
  'Shortness of breath',
  'Chest tightness',
  'Nausea',
  'Dizziness',
  'Hot/cold flashes',
  'Muscle tension',
  'Headache',
  'Stomach upset',
  'Fatigue',
  'Restlessness',
  'Tingling/numbness'
]

// Mental/Emotional Symptoms
export const MENTAL_SYMPTOMS = [
  'Racing thoughts',
  'Catastrophic thinking',
  'Mind going blank',
  'Difficulty concentrating',
  'Feeling detached',
  'Fear of losing control',
  'Fear of dying',
  'Feeling overwhelmed',
  'Irritability',
  'Sense of doom',
  'Memory problems',
  'Indecisiveness',
  'Hypervigilance',
  'Emotional numbness'
]

// Common Triggers
export const COMMON_TRIGGERS = [
  'Work stress',
  'Social situations',
  'Health concerns',
  'Financial worries',
  'Relationship issues',
  'Loud noises',
  'Crowds',
  'Being late',
  'Uncertainty',
  'Conflict',
  'Sensory overload',
  'Lack of sleep',
  'Caffeine',
  'Hormonal changes',
  'Weather changes',
  'Technology issues',
  'Unexpected changes',
  'Being judged',
  'Perfectionism',
  'Past trauma reminders'
]

// Coping Strategies organized by category
export const COPING_STRATEGIES: CopingStrategy[] = [
  // Breathing
  { value: 'deep-breathing', label: 'Deep breathing', category: 'breathing', emoji: '🫁', description: '4-7-8 or box breathing' },
  { value: 'breath-counting', label: 'Counting breaths', category: 'breathing', emoji: '🔢', description: 'Focus on counting each breath' },
  
  // Grounding
  { value: '5-4-3-2-1', label: '5-4-3-2-1 technique', category: 'grounding', emoji: '👀', description: '5 things you see, 4 hear, 3 feel, 2 smell, 1 taste' },
  { value: 'cold-water', label: 'Cold water on face/hands', category: 'grounding', emoji: '❄️', description: 'Activates dive response' },
  { value: 'grounding-objects', label: 'Grounding objects', category: 'grounding', emoji: '🪨', description: 'Fidget toys, stress balls, textures' },
  
  // Movement
  { value: 'walking', label: 'Walking/pacing', category: 'movement', emoji: '🚶', description: 'Gentle movement to release energy' },
  { value: 'stretching', label: 'Stretching', category: 'movement', emoji: '🤸', description: 'Release muscle tension' },
  { value: 'exercise', label: 'Exercise', category: 'movement', emoji: '💪', description: 'Burn off anxious energy' },
  
  // Cognitive
  { value: 'positive-self-talk', label: 'Positive self-talk', category: 'cognitive', emoji: '💭', description: 'Reassuring yourself' },
  { value: 'reality-check', label: 'Reality checking', category: 'cognitive', emoji: '🔍', description: 'Is this thought realistic?' },
  { value: 'mindfulness', label: 'Mindfulness', category: 'cognitive', emoji: '🧘', description: 'Present moment awareness' },
  
  // Social
  { value: 'call-someone', label: 'Call someone', category: 'social', emoji: '📞', description: 'Reach out for support' },
  { value: 'remove-from-situation', label: 'Leave the situation', category: 'social', emoji: '🚪', description: 'Take a break from triggers' },
  
  // Sensory
  { value: 'music', label: 'Calming music', category: 'sensory', emoji: '🎵', description: 'Soothing sounds' },
  { value: 'weighted-blanket', label: 'Weighted blanket', category: 'sensory', emoji: '🛏️', description: 'Deep pressure comfort' },
  { value: 'aromatherapy', label: 'Aromatherapy', category: 'sensory', emoji: '🌸', description: 'Calming scents' },
  
  // Emergency
  { value: 'medication', label: 'PRN medication', category: 'emergency', emoji: '💊', description: 'As-needed anxiety medication' },
  { value: 'crisis-hotline', label: 'Crisis hotline', category: 'emergency', emoji: '🆘', description: 'Professional support' },
  { value: 'safe-space', label: 'Go to safe space', category: 'emergency', emoji: '🏠', description: 'Your comfort zone' }
]

// Duration Options
export const DURATION_OPTIONS = [
  'Less than 5 minutes',
  '5-15 minutes', 
  '15-30 minutes',
  '30 minutes - 1 hour',
  '1-2 hours',
  '2-4 hours',
  'Most of the day',
  'All day',
  'Multiple days'
]

// Onset Speed
export const ONSET_SPEED = [
  'Gradual (built up slowly)',
  'Moderate (noticed within minutes)',
  'Sudden (hit like a wave)',
  'Instant (0 to panic immediately)'
]

// Social Context
export const SOCIAL_CONTEXT = [
  'Alone',
  'With family',
  'With friends', 
  'With strangers',
  'In a crowd',
  'At work/school',
  'Online/social media',
  'On the phone',
  'In a meeting',
  'Public speaking'
]

// After Effects
export const AFTER_EFFECTS = [
  'Exhausted',
  'Relieved',
  'Embarrassed',
  'Ashamed',
  'Proud (handled it well)',
  'Confused',
  'Angry',
  'Sad',
  'Numb',
  'Grateful for support',
  'More anxious',
  'Physically drained',
  'Emotionally raw',
  'Hopeful'
]

// Caring Goblinisms for anxiety tracking
export const ANXIETY_GOBLINISMS = [
  "Anxiety entry saved! The worry sprites are organizing your feelings with care! 💜✨",
  "Your brave tracking has been logged! The anxiety angels are cheering for your self-awareness! 🌟",
  "Panic documented with love! The overwhelm pixies are taking gentle notes! 🧚‍♀️💖",
  "Meltdown recorded! The sensory goblins understand and are sending virtual hugs! 🤗",
  "Your anxiety journey is being witnessed with compassion! The support sprites approve! 💫",
  "Entry saved! The coping strategy elves are proud of your efforts! 🧝‍♀️✨",
  "Anxiety data logged! Your brain goblins are grateful for the attention and care! 🧠💜",
  "Tracking complete! The mental health fairies are dancing for your courage! 🧚‍♂️🌈"
]
