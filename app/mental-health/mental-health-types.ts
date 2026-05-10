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
export interface MentalHealthEntry {
  id: string
  date: string
  time: string
  
  // Mood & Emotional State
  mood: string // emoji-based mood selection
  moodIntensity: number // 1-10 scale
  emotionalState: string[] // multiple emotions can apply
  
  // Mental Health Scales (0-10)
  anxietyLevel: number
  depressionLevel: number
  maniaLevel: number
  energyLevel: number
  stressLevel: number
  brainFogSeverity: number

  // Symptoms & Triggers
  triggers: string[]
  cognitiveSymptoms: string[]
  copingStrategies: string[]
  
  // Therapy & Treatment
  therapyNotes: string
  medicationTaken: boolean
  medicationNotes: string
  
  // General
  notes: string
  tags: string[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface MoodOption {
  value: string
  emoji: string
  label: string
  color: string
}

export interface EmotionalState {
  value: string
  emoji: string
  label: string
  category: 'positive' | 'negative' | 'neutral'
}



export interface Trigger {
  value: string
  label: string
  category: 'environmental' | 'social' | 'physical' | 'emotional'
}

export interface CopingStrategy {
  value: string
  label: string
  category: 'immediate' | 'long-term' | 'professional'
}
