/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

import {
  QualityType,
  WakeFeelingType,
  DreamType,
  DisruptionType,
  PreSleepFactorType,
  SleepAidType,
  EnvironmentIssueType
} from './sleep-constants'

export interface SleepEntry {
  id: string
  date: string

  // Core sleep data
  hoursSlept: number
  quality: QualityType
  bedTime?: string
  wakeTime?: string

  // Disruptions
  wokeUpMultipleTimes: boolean
  timesWoken?: number
  disruptions: DisruptionType[]

  // How you woke up
  wakeFeeling: WakeFeelingType

  // Dreams
  dreamType: DreamType
  dreamNotes?: string

  // Pre-sleep factors
  preSleepFactors: PreSleepFactorType[]

  // Sleep aids
  sleepAids: SleepAidType[]

  // Environment
  environmentIssues: EnvironmentIssueType[]

  // Naps
  hadNap: boolean
  napDuration?: number // in minutes

  // Notes and tags
  notes: string
  tags: string[]

  // Metadata
  createdAt: string
  updatedAt: string
}

// For backwards compatibility with old entries
export interface LegacySleepEntry {
  id: string
  date: string
  hoursSlept: number
  quality: "Great" | "Okay" | "Restless" | "Terrible"
  wokeUpMultipleTimes: boolean
  bedTime?: string
  wakeTime?: string
  notes: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// Convert legacy entry to new format
export function migrateLegacyEntry(legacy: LegacySleepEntry): SleepEntry {
  return {
    ...legacy,
    disruptions: legacy.wokeUpMultipleTimes ? ['unknown'] : ['none'],
    wakeFeeling: 'okay',
    dreamType: 'none',
    preSleepFactors: [],
    sleepAids: ['none'],
    environmentIssues: ['none'],
    hadNap: false
  }
}

// Check if entry is legacy format
export function isLegacyEntry(entry: SleepEntry | LegacySleepEntry): entry is LegacySleepEntry {
  return !('disruptions' in entry)
}
