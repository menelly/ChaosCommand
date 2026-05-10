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
export type AnxietyEpisodeType =
  | 'generalized'
  | 'social'
  | 'panic-attack'
  | 'phobic'
  | 'ocd-shaped'
  | 'meltdown'
  | 'shutdown'
  | 'anticipatory'
  | 'performance'
  | 'health'
  | 'general'

export interface AnxietyEntry {
  id: string
  timestamp?: string
  date: string
  time: string

  // CLASSIFICATION
  episodeType?: AnxietyEpisodeType  // v2 — falls back to anxietyType for legacy

  // Anxiety Levels & Type
  anxietyLevel: number // 1-10 scale
  panicLevel: number // 1-10 scale (0 = no panic, 10 = full meltdown)
  anxietyType: string // generalized, social, panic attack, meltdown, etc.

  // 🚨 988 / CRISIS MARKERS
  suicidalIdeation?: boolean
  selfHarmUrges?: boolean
  intrusiveThoughtsHarm?: boolean    // disturbing thoughts of harm to self/others
  feelingHopeless?: boolean
  crisisContactMade?: boolean        // reached out to 988, therapist, friend, etc.
  crisisContactType?: '988' | 'therapist' | 'friend' | 'crisis-line' | 'er' | 'other'
  hospitalizationConsidered?: boolean
  emergencyServicesCalled?: boolean
  erVisitRequired?: boolean

  // OCD-shaped fields (when episodeType === 'ocd-shaped')
  intrusionTheme?: string            // contamination, harm, scrupulosity, etc.
  compulsionsPerformed?: string[]    // checking, counting, rituals
  resistanceLevel?: number           // 0-10, ability to resist compulsion

  // PHOBIC fields (when episodeType === 'phobic')
  phobiaTrigger?: string             // specific stimulus
  avoidanceUsed?: boolean
  
  // Physical Symptoms
  physicalSymptoms: string[] // racing heart, sweating, shaking, etc.
  
  // Mental/Emotional Symptoms  
  mentalSymptoms: string[] // racing thoughts, catastrophizing, etc.
  
  // Triggers & Context
  triggers: string[] // what caused/contributed to anxiety
  location: string // where it happened
  socialContext: string // alone, with people, specific people, etc.
  
  // Duration & Intensity Timeline
  duration: string // how long it lasted
  peakIntensity: number // 1-10, highest point reached
  onsetSpeed: string // gradual, sudden, etc.
  
  // Coping & Recovery
  copingStrategies: string[] // what helped or was tried
  copingEffectiveness: { [strategy: string]: number } // 1-10 how well each worked
  recoveryTime: string // how long to feel better
  
  // Panic/Meltdown Specific
  panicSymptoms: string[] // specific panic attack symptoms
  meltdownTriggers: string[] // sensory overload, overwhelm, etc.
  shutdownAfter: boolean // did you shut down after?
  
  // Support & Aftermath
  supportReceived: string[] // who/what helped
  afterEffects: string[] // exhaustion, shame, relief, etc.
  
  // Prevention & Learning
  warningSigns: string[] // what you noticed before it started
  preventionAttempts: string[] // what you tried to prevent it
  lessonsLearned: string
  
  // General
  notes: string
  tags: string[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface AnxietyTypeOption {
  value: string
  label: string
  emoji: string
  description: string
  color: string
}

export interface AnxietyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<AnxietyEntry, 'id'>) => void
  editingEntry?: AnxietyEntry | null
  initialEpisodeType?: AnxietyEpisodeType
}

export interface CopingStrategy {
  value: string
  label: string
  category: 'breathing' | 'grounding' | 'movement' | 'cognitive' | 'social' | 'sensory' | 'emergency'
  emoji: string
  description: string
}
