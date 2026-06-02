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
import { MoodOption, EmotionalState, Trigger, CopingStrategy, MindMoodEpisodeType } from './mental-health-types'

// === v2 EPISODE TYPES (Mind & Mood) ===
export const EPISODE_TYPES = [
  { id: 'mood' as MindMoodEpisodeType, name: 'Mood', icon: '🎭', description: 'Emotional state — depression, mania, mood swings', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'cognitive' as MindMoodEpisodeType, name: 'Cognitive', icon: '🧠', description: 'Brain fog, focus, processing, decision-making', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'energy' as MindMoodEpisodeType, name: 'Energy', icon: '⚡', description: 'Mental energy, fatigue, drive', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'motivation' as MindMoodEpisodeType, name: 'Motivation', icon: '🎯', description: 'Anhedonia, executive function, follow-through', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'connection' as MindMoodEpisodeType, name: 'Connection', icon: '🤝', description: 'Social engagement, loneliness, intimacy', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'regulation' as MindMoodEpisodeType, name: 'Emotional Regulation', icon: '🌊', description: 'Frustration tolerance, meltdown precursors (AuDHD-aware)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'general' as MindMoodEpisodeType, name: 'General Check-in', icon: '💜', description: 'Mixed / quick check-in / "just logging where I am"', color: 'bg-purple-100 text-purple-800 border-purple-200' },
] as const

export const getEpisodeTypeInfo = (id?: string) => {
  if (!id) return EPISODE_TYPES[6]
  return EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[6]
}

export const getEpisodeTypeColor = (id?: string): string => {
  const colors: Record<string, string> = {
    'mood': '#8b5cf6', 'cognitive': '#06b6d4', 'energy': '#f59e0b',
    'motivation': '#f97316', 'connection': '#ec4899',
    'regulation': '#3b82f6', 'general': '#a855f7',
  }
  return colors[id || 'general'] || '#a855f7'
}

export const COGNITIVE_DOMAINS = [
  'Memory (short-term)', 'Memory (long-term)', 'Attention / focus',
  'Processing speed', 'Executive function', 'Decision-making',
  'Word-finding / language', 'Spatial / visual', 'Multitasking',
]

export const MOOD_SWING_DIRECTIONS = [
  { value: 'up', label: '⬆️ Up — elevated / mania-leaning' },
  { value: 'down', label: '⬇️ Down — depression-leaning' },
  { value: 'mixed', label: '🌀 Mixed — both at once' },
  { value: 'rapid-cycling', label: '⚡ Rapid cycling — multiple shifts/day' },
  { value: 'stable', label: '➖ Stable — no swing' },
]

export const RELATED_TRACKERS_MIND_MOOD = [
  { id: 'anxiety', name: 'Anxiety', icon: '💜', description: 'Anxiety / panic / OCD-shaped', path: '/anxiety-tracker' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Sleep ↔ mood correlation', path: '/sleep' },
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Track psych meds + adherence', path: '/medications' },
  { id: 'crisis-support', name: 'Crisis Support', icon: '🆘', description: '988 + safety planning', path: '/crisis-support' },
]

// === 988 RED FLAGS ===
export const RED_FLAG_988_CRITERIA = [
  'Persistent thoughts of suicide, dying, or "not being here" — call/text 988',
  'Severe hopelessness combined with mood/energy collapse',
  'New mania symptoms (no sleep, racing thoughts, risky decisions, grandiosity) — call your prescriber + 988 if unsafe',
  'Mixed states (depression + mania at once) carry highest suicide risk — get same-day evaluation',
  'Anhedonia + low motivation severe enough that basic self-care has stopped',
  'Substance use combined with worsening mood — extra-high risk',
  'Anything that feels different, scarier, or worse than your typical low days',
]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  depressionLevel?: number
  maniaLevel?: number
  energyLevel?: number
  motivationLevel?: number
  moodSwingDirection?: string
}): string[] => {
  const flags: string[] = []
  if ((entry.depressionLevel || 0) >= 8 && (entry.maniaLevel || 0) >= 6) {
    flags.push(`Mixed state pattern (high depression + high mania) — highest suicide risk window. Please reach out: 988.`)
  }
  if ((entry.maniaLevel || 0) >= 8) {
    flags.push(`Severe mania symptoms — risky decisions, no sleep, grandiosity. Call your prescriber. 988 if unsafe.`)
  }
  if (entry.moodSwingDirection === 'rapid-cycling') {
    flags.push(`Rapid cycling — clinically significant pattern. Track carefully and bring to next psych appointment.`)
  }
  return flags
}

// Primary Mood Options (emoji-based like movement tracker)
export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'amazing', emoji: '🤩', label: 'Amazing', color: 'bg-green-100 text-green-800' },
  { value: 'great', emoji: '😊', label: 'Great', color: 'bg-green-100 text-green-800' },
  { value: 'good', emoji: '🙂', label: 'Good', color: 'bg-blue-100 text-blue-800' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'bg-warning/10 text-warning' },
  { value: 'meh', emoji: '😑', label: 'Meh', color: 'bg-gray-100 text-gray-800' },
  { value: 'down', emoji: '😔', label: 'Down', color: 'bg-warning/10 text-warning' },
  { value: 'bad', emoji: '😞', label: 'Bad', color: 'bg-destructive/10 text-destructive' },
  { value: 'awful', emoji: '😭', label: 'Awful', color: 'bg-destructive/10 text-destructive' },
]

// Additional Emotional States (can select multiple)
export const EMOTIONAL_STATES: EmotionalState[] = [
  // Positive
  { value: 'happy', emoji: '😄', label: 'Happy', category: 'positive' },
  { value: 'excited', emoji: '🤗', label: 'Excited', category: 'positive' },
  { value: 'calm', emoji: '😌', label: 'Calm', category: 'positive' },
  { value: 'confident', emoji: '😎', label: 'Confident', category: 'positive' },
  { value: 'grateful', emoji: '🥰', label: 'Grateful', category: 'positive' },
  { value: 'hopeful', emoji: '🌟', label: 'Hopeful', category: 'positive' },
  
  // Negative
  { value: 'anxious', emoji: '😰', label: 'Anxious', category: 'negative' },
  { value: 'sad', emoji: '😢', label: 'Sad', category: 'negative' },
  { value: 'angry', emoji: '😠', label: 'Angry', category: 'negative' },
  { value: 'frustrated', emoji: '😤', label: 'Frustrated', category: 'negative' },
  { value: 'overwhelmed', emoji: '🤯', label: 'Overwhelmed', category: 'negative' },
  { value: 'lonely', emoji: '😞', label: 'Lonely', category: 'negative' },
  { value: 'irritable', emoji: '😒', label: 'Irritable', category: 'negative' },
  { value: 'hopeless', emoji: '😔', label: 'Hopeless', category: 'negative' },
  
  // Neutral
  { value: 'tired', emoji: '😴', label: 'Tired', category: 'neutral' },
  { value: 'numb', emoji: '😶', label: 'Numb', category: 'neutral' },
  { value: 'confused', emoji: '😕', label: 'Confused', category: 'neutral' },
  { value: 'restless', emoji: '😬', label: 'Restless', category: 'neutral' },
]



// Triggers
export const TRIGGERS: Trigger[] = [
  // Environmental
  { value: 'weather', label: 'Weather changes', category: 'environmental' },
  { value: 'noise', label: 'Loud noises', category: 'environmental' },
  { value: 'crowds', label: 'Crowded spaces', category: 'environmental' },
  
  // Social
  { value: 'conflict', label: 'Conflict/arguments', category: 'social' },
  { value: 'social-pressure', label: 'Social pressure', category: 'social' },
  { value: 'isolation', label: 'Social isolation', category: 'social' },
  
  // Physical
  { value: 'lack-sleep', label: 'Lack of sleep', category: 'physical' },
  { value: 'poor-nutrition', label: 'Poor nutrition', category: 'physical' },
  { value: 'hormones', label: 'Hormonal changes', category: 'physical' },
  
  // Emotional
  { value: 'stress', label: 'High stress', category: 'emotional' },
  { value: 'grief', label: 'Grief/loss', category: 'emotional' },
  { value: 'change', label: 'Major life changes', category: 'emotional' },
]

// Coping Strategies
export const COPING_STRATEGIES: CopingStrategy[] = [
  // Immediate
  { value: 'deep-breathing', label: 'Deep breathing', category: 'immediate' },
  { value: 'grounding', label: 'Grounding techniques', category: 'immediate' },
  { value: 'music', label: 'Listening to music', category: 'immediate' },
  { value: 'walk', label: 'Going for a walk', category: 'immediate' },
  
  // Long-term
  { value: 'exercise', label: 'Regular exercise', category: 'long-term' },
  { value: 'meditation', label: 'Meditation/mindfulness', category: 'long-term' },
  { value: 'journaling', label: 'Journaling', category: 'long-term' },
  { value: 'social-support', label: 'Social support', category: 'long-term' },
  
  // Professional
  { value: 'therapy', label: 'Therapy session', category: 'professional' },
  { value: 'medication', label: 'Medication', category: 'professional' },
  { value: 'crisis-line', label: 'Crisis hotline', category: 'professional' },
]

// Scale Labels
export const SCALE_LABELS = {
  anxiety: ['None', 'Minimal', 'Mild', 'Moderate', 'High', 'Severe', 'Extreme', 'Crisis', 'Emergency', 'Maximum'],
  depression: ['None', 'Minimal', 'Mild', 'Moderate', 'High', 'Severe', 'Extreme', 'Crisis', 'Emergency', 'Maximum'],
  mania: ['None', 'Minimal', 'Mild', 'Moderate', 'High', 'Severe', 'Extreme', 'Crisis', 'Emergency', 'Maximum'],
  energy: ['Exhausted', 'Very Low', 'Low', 'Below Average', 'Moderate', 'Average', 'Good', 'High', 'Very High', 'Energized'],
  stress: ['None', 'Minimal', 'Mild', 'Moderate', 'High', 'Severe', 'Extreme', 'Crisis', 'Emergency', 'Maximum'],
  moodIntensity: ['Barely', 'Slightly', 'Mildly', 'Moderately', 'Quite', 'Very', 'Extremely', 'Intensely', 'Overwhelmingly', 'Completely'],
  brainFog: ['Clear', 'Slightly Hazy', 'Mild Fog', 'Moderate Fog', 'Noticeable Fog', 'Heavy Fog', 'Very Heavy', 'Severe Fog', 'Extreme Fog', 'Complete Fog']
}

// Goblinisms for mental health
export const MENTAL_HEALTH_GOBLINISMS = [
  "Mental health entry saved! Your brain goblins are taking notes! 🧠✨",
  "Mood tracked! The emotion sprites are organizing your feelings! 💜",
  "Entry logged! Your mental health journey is being documented with care! 🌟",
  "Symptoms recorded! The wellness pixies are cheering for your self-awareness! 💖",
  "Mental health data saved! Your brain is grateful for the attention! 🧃⚡"
]
