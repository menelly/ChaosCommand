/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Energy & Pacing Types - Spoon Theory Based
 *
 * Designed specifically for ME/CFS, POTS, and chronic fatigue conditions.
 * Uses spoon theory concepts for real energy management and pacing.
 */

// Activity with its energy cost
export interface ActivityDefinition {
  id: string
  name: string
  emoji: string
  defaultCost: number // 1-5 spoons
  category: ActivityCategory
  description?: string
}

export type ActivityCategory =
  | 'self-care'      // Showering, grooming, getting dressed
  | 'household'      // Cleaning, laundry, cooking
  | 'errands'        // Shopping, appointments, driving
  | 'social'         // Talking, visiting, calls
  | 'physical'       // Walking, exercise, standing
  | 'mental'         // Work, focus tasks, decisions
  | 'rest'           // Restorative activities (negative cost)
  | 'other'

// A logged activity instance
export interface ActivityLog {
  id: string
  activityId: string        // Reference to activity definition
  activityName: string      // Stored name (in case definition changes)
  timestamp: string
  spoonCost: number         // Actual cost used (may be customized)
  duration?: number         // Minutes, if relevant
  notes?: string
  wasWorthIt?: boolean      // Optional reflection
  tags?: string[]
}

// Rest period (restores spoons, but usually not fully)
export interface RestPeriod {
  id: string
  timestamp: string
  duration: number          // Minutes
  restType: RestType
  spoonsRestored: number    // How much energy restored
  quality?: 'poor' | 'okay' | 'good' | 'great'
  notes?: string
}

export type RestType =
  | 'lying-down'
  | 'sitting-quietly'
  | 'nap'
  | 'meditation'
  | 'gentle-stretch'
  | 'other'

// PEM (Post-Exertional Malaise) tracking - critical for ME/CFS
export interface PEMEvent {
  id: string
  date: string
  severity: 1 | 2 | 3 | 4 | 5  // 1 = mild, 5 = severe crash
  onsetDelay: number           // Hours after overexertion
  duration?: number            // Hours/days it lasted
  suspectedTriggers: string[]  // Activities that might have caused it
  symptoms: string[]
  notes?: string
}

// Daily energy record
export interface DailyEnergyRecord {
  date: string

  // Morning baseline
  morningSpoons: number        // Starting energy for the day (0-10 typically)
  morningNotes?: string

  // Activity tracking
  activities: ActivityLog[]
  restPeriods: RestPeriod[]

  // Running totals (calculated)
  totalSpent: number
  totalRestored: number

  // End of day reflection
  endOfDayEnergy?: number      // 0-5 scale, how you actually feel
  pemRisk?: 'low' | 'moderate' | 'high' | 'danger'
  endOfDayNotes?: string

  // Tags for filtering
  tags?: string[]
}

// User's personalized activity costs (learned over time)
export interface PersonalizedActivityCost {
  activityId: string
  personalCost: number         // Their typical cost
  variance: number             // How much it varies for them
  notes?: string
  lastUpdated: string
}

// Analytics types
export interface EnergyAnalytics {
  // Summary stats
  averageDailySpoons: number
  averageSpent: number
  averageRestored: number

  // Activity insights
  highCostActivities: Array<{activity: string, avgCost: number, frequency: number}>
  lowCostActivities: Array<{activity: string, avgCost: number, frequency: number}>

  // PEM patterns
  pemFrequency: number
  commonPEMTriggers: Array<{trigger: string, count: number}>

  // Pacing success
  daysWithinBudget: number
  daysOverBudget: number
  pacingScore: number          // 0-100%
}

// For backwards compatibility with old entries
export interface LegacyEnergyEntry {
  id: string
  date: string
  energyLevel: number
  notes?: string
  activities?: string[]
  tags?: string[]
  createdAt: string
  updatedAt: string
}
