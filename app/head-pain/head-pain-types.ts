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
 * HEAD PAIN TRACKER - TYPE DEFINITIONS
 * 
 * TypeScript interfaces and types for head pain tracking
 * Includes migraines, tension headaches, cluster headaches, sinus pain, etc.
 */

export interface HeadPainEntry {
  id: string
  timestamp: string
  date: string
  
  // Pain Details
  painIntensity: number // 1-10
  painLocation: string[] // multiple locations possible
  painType: string[] // throbbing, sharp, pressure, etc.
  
  // Aura Symptoms (primarily for migraines)
  auraPresent: boolean
  auraSymptoms: string[]
  auraDescription?: string
  
  // Associated Symptoms
  associatedSymptoms: string[]
  
  // Triggers
  triggers: string[]
  
  // Duration & Timing
  duration: string // e.g., "4 hours", "2 days"
  onsetTime?: string // when it started
  
  // Treatments
  treatments: string[]
  treatmentEffectiveness?: number // 1-5
  
  // Environmental
  weather?: string
  
  // Recovery
  recoveryTime?: string
  residualSymptoms: string[]
  
  // Functional Impact
  functionalImpact: 'none' | 'mild' | 'moderate' | 'severe' | 'disabling'
  workImpact?: string
  
  // Notes & Tags
  notes?: string
  tags?: string[]
}

// Pain Location Options
export interface PainLocationOption {
  value: string
  label: string
  description: string
}

// Pain Type Options
export interface PainTypeOption {
  value: string
  label: string
  description: string
}

// Aura Symptom Options
export interface AuraSymptomOption {
  value: string
  label: string
  description: string
}

// Associated Symptom Options
export interface AssociatedSymptomOption {
  value: string
  label: string
  category: 'neurological' | 'gastrointestinal' | 'sensory' | 'other'
}

// Trigger Options
export interface TriggerOption {
  value: string
  label: string
  category: 'dietary' | 'environmental' | 'hormonal' | 'stress' | 'sleep' | 'other'
}

// Treatment Options
export interface TreatmentOption {
  value: string
  label: string
  category: 'medication' | 'natural' | 'lifestyle' | 'other'
}

// Functional Impact Options
export interface FunctionalImpactOption {
  value: 'none' | 'mild' | 'moderate' | 'severe' | 'disabling'
  label: string
  description: string
  color: string
}

// Residual Symptom Options
export interface ResidualSymptomOption {
  value: string
  label: string
}

// Form State Interface
export interface HeadPainFormState {
  painIntensity: number
  painLocation: string[]
  painType: string[]
  auraPresent: boolean
  auraSymptoms: string[]
  auraDescription: string
  associatedSymptoms: string[]
  triggers: string[]
  duration: string
  onsetTime: string
  treatments: string[]
  treatmentEffectiveness: number
  weather: string
  recoveryTime: string
  residualSymptoms: string[]
  functionalImpact: 'none' | 'mild' | 'moderate' | 'severe' | 'disabling'
  workImpact: string
  notes: string
  tags: string[]
}

// Analytics Types
export interface HeadPainAnalytics {
  totalEpisodes: number
  averagePainIntensity: number
  mostCommonLocation: string
  mostCommonTrigger: string
  mostEffectiveTreatment: string
  averageDuration: string
  episodesThisMonth: number
  episodesLastMonth: number
  functionalImpactBreakdown: Record<string, number>
}
