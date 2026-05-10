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
 * SEIZURE TRACKER TYPES
 * TypeScript interfaces for seizure tracking data
 */

export interface SeizureEntry {
  id: string
  timestamp: string
  date: string
  seizureType: string
  duration: string
  consciousness: string
  auraSymptoms: string[]
  auraDescription?: string
  seizureSymptoms: string[]
  seizureDescription?: string
  recoveryTime: string
  postSeizureSymptoms: string[]
  triggers: string[]
  location: string
  witnessPresent: boolean
  injuriesOccurred: boolean
  injuryDetails?: string
  medicationTaken: boolean
  medicationMissed: boolean
  rescueMedicationDetails?: string
  missedMedicationDetails?: string
  notes?: string
  tags?: string[]
}

export interface SeizureFormData {
  seizureType: string
  duration: string
  consciousness: string
  auraSymptoms: string[]
  auraDescription: string
  seizureSymptoms: string[]
  seizureDescription: string
  recoveryTime: string
  postSeizureSymptoms: string[]
  triggers: string[]
  location: string
  witnessPresent: boolean
  injuriesOccurred: boolean
  injuryDetails: string
  medicationTaken: boolean
  medicationMissed: boolean
  medicationTiming: string
  notes: string
  tags: string[]
}

export interface SeizureStats {
  totalSeizures: number
  thisWeek: number
  thisMonth: number
  averagePerWeek: number
  mostCommonType: string
  mostCommonTriggers: string[]
  injuryRate: number
  medicationCompliance: number
}
