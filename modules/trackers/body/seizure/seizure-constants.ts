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
 * SEIZURE TRACKER CONSTANTS
 * Constants, options, and helper functions for seizure tracking
 */

// Seizure Types (Medical Classification)
export const SEIZURE_TYPES = [
  'Focal Aware (Simple Partial)',
  'Focal Impaired Awareness (Complex Partial)',
  'Focal to Bilateral Tonic-Clonic',
  'Generalized Tonic-Clonic',
  'Absence',
  'Myoclonic',
  'Atonic (Drop Attack)',
  'Tonic',
  'Clonic',
  'Unknown/Uncertain'
]

// Aura Symptoms (Pre-seizure warning signs)
export const AURA_SYMPTOMS = [
  'Visual Changes',
  'Strange Smells',
  'Strange Tastes',
  'Déjà Vu',
  'Fear/Anxiety',
  'Nausea',
  'Dizziness',
  'Tingling',
  'Confusion',
  'Emotional Changes',
  'Auditory Changes',
  'Rising Sensation'
]

// Seizure Symptoms (During seizure)
export const SEIZURE_SYMPTOMS = [
  'Muscle Stiffening',
  'Jerking Movements',
  'Loss of Muscle Tone',
  'Staring/Unresponsive',
  'Automatisms (repetitive movements)',
  'Lip Smacking',
  'Hand Movements',
  'Walking/Wandering',
  'Speech Changes',
  'Breathing Changes',
  'Incontinence',
  'Tongue Biting'
]

// Post-Seizure Symptoms (Recovery phase) - COMPLETE MEDICAL LIST
export const POST_SEIZURE_SYMPTOMS = [
  'Confusion',
  'Disorientation',
  'Fatigue/Exhaustion',
  'Headache',
  'Muscle Soreness',
  'Memory Problems',
  'Speech Difficulties',
  'Slurred Speech',
  'Word Finding Difficulty',
  'Emotional Changes',
  'Irritability',
  'Depression/Sadness',
  'Anxiety',
  'Sleep Need',
  'Nausea',
  'Vomiting',
  'Weakness',
  'Coordination Problems',
  'Vision Changes',
  'Sensitivity to Light',
  'Sensitivity to Sound',
  'Difficulty Concentrating',
  'Feeling "Not Right"',
  'Increased Appetite',
  'Decreased Appetite'
]

// Common Seizure Triggers
export const COMMON_TRIGGERS = [
  'Stress',
  'Sleep Deprivation',
  'Missed Medication',
  'Flashing Lights',
  'Alcohol',
  'Illness/Fever',
  'Hormonal Changes',
  'Dehydration',
  'Low Blood Sugar',
  'Caffeine',
  'Loud Noises',
  'Strong Smells',
  'Heat/Overheating',
  'Physical Exhaustion',
  'Emotional Upset'
]

// Consciousness Levels
export const CONSCIOUSNESS_LEVELS = [
  'Fully Aware',
  'Partially Aware',
  'Unaware/Unconscious',
  'Confused',
  'Unknown'
]

// Duration Options
export const DURATION_OPTIONS = [
  'Less than 30 seconds',
  '30 seconds - 1 minute',
  '1-2 minutes',
  '2-5 minutes',
  '5-10 minutes',
  'More than 10 minutes',
  'Unknown'
]

// Recovery Time Options
export const RECOVERY_TIME_OPTIONS = [
  'Immediate (0-5 minutes)',
  'Quick (5-15 minutes)',
  'Moderate (15-30 minutes)',
  'Slow (30-60 minutes)',
  'Extended (1-2 hours)',
  'Very Long (2+ hours)',
  'Still recovering'
]

// Helper Functions
export const getSeizureTypeColor = (type: string): string => {
  const colorMap: { [key: string]: string } = {
    'Focal Aware (Simple Partial)': '#10b981', // green
    'Focal Impaired Awareness (Complex Partial)': '#f59e0b', // amber
    'Focal to Bilateral Tonic-Clonic': '#ef4444', // red
    'Generalized Tonic-Clonic': '#dc2626', // dark red
    'Absence': '#8b5cf6', // purple
    'Myoclonic': '#06b6d4', // cyan
    'Atonic (Drop Attack)': '#f97316', // orange
    'Tonic': '#84cc16', // lime
    'Clonic': '#ec4899', // pink
    'Unknown/Uncertain': '#6b7280' // gray
  }
  return colorMap[type] || '#6b7280'
}

export const getSeverityLevel = (entry: any): 'Low' | 'Medium' | 'High' | 'Critical' => {
  let score = 0
  
  // Duration scoring
  if (entry.duration.includes('5-10') || entry.duration.includes('More than 10')) score += 3
  else if (entry.duration.includes('2-5')) score += 2
  else if (entry.duration.includes('1-2')) score += 1
  
  // Consciousness scoring
  if (entry.consciousness === 'Unaware/Unconscious') score += 2
  else if (entry.consciousness === 'Confused') score += 1
  
  // Injury scoring
  if (entry.injuriesOccurred) score += 2
  
  // Recovery scoring
  if (entry.recoveryTime.includes('Extended') || entry.recoveryTime.includes('Very Long')) score += 2
  else if (entry.recoveryTime.includes('Slow')) score += 1
  
  if (score >= 6) return 'Critical'
  if (score >= 4) return 'High'
  if (score >= 2) return 'Medium'
  return 'Low'
}

export const formatDuration = (duration: string): string => {
  return duration.replace('Less than ', '<').replace('More than ', '>')
}

// Seizure Safety Messages
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
