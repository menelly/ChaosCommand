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
 * DIABETES TRACKER CONSTANTS
 * Constants, tags, and configuration for diabetes tracking
 */

// Insulin types
export const INSULIN_TYPES = [
  'rapid-acting',
  'short-acting', 
  'intermediate',
  'long-acting',
  'mixed',
  'other'
] as const

// Common mood options
export const MOOD_OPTIONS = [
  { value: 'great', label: '😊 Great' },
  { value: 'good', label: '🙂 Good' },
  { value: 'okay', label: '😐 Okay' },
  { value: 'tired', label: '😴 Tired' },
  { value: 'stressed', label: '😰 Stressed' },
  { value: 'sick', label: '🤒 Sick' },
  { value: 'low', label: '📉 Low' },
  { value: 'high', label: '📈 High' }
] as const

// Common tags for diabetes tracking
export const COMMON_TAGS = [
  'before-meal',
  'after-meal', 
  'bedtime',
  'morning',
  'exercise',
  'sick',
  'stress',
  'correction',
  'nope'
] as const

// Timer type configurations
export const TIMER_CONFIGS = {
  cgm: {
    name: 'CGM',
    defaultDays: 10,
    color: '#ef4444', // Red
    icon: '📊'
  },
  pump: {
    name: 'Pump Site',
    defaultDays: 3,
    color: '#3b82f6', // Blue
    icon: '💉'
  },
  glp1: {
    name: 'GLP-1',
    defaultDays: 7,
    color: '#10b981', // Green
    icon: '💊'
  }
} as const

// Blood glucose ranges (mg/dL)
export const BG_RANGES = {
  LOW: { min: 0, max: 70, label: 'Low', color: '#ef4444' },
  NORMAL: { min: 70, max: 180, label: 'In Range', color: '#10b981' },
  HIGH: { min: 180, max: 999, label: 'High', color: '#f59e0b' }
} as const

// Ketone ranges (mmol/L)
export const KETONE_RANGES = {
  NORMAL: { min: 0, max: 0.6, label: 'Normal', color: '#10b981' },
  TRACE: { min: 0.6, max: 1.5, label: 'Trace', color: '#f59e0b' },
  MODERATE: { min: 1.5, max: 3.0, label: 'Moderate', color: '#ef4444' },
  HIGH: { min: 3.0, max: 99, label: 'High', color: '#dc2626' }
} as const

// Utility functions
export const getTimeRemaining = (timer: { expires_at: string }) => {
  const expires = new Date(timer.expires_at)
  const now = new Date()
  const remainingMs = expires.getTime() - now.getTime()

  if (remainingMs <= 0) return { expired: true, text: "⚠️ EXPIRED!" }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return { expired: false, text: `${days}d ${hours}h remaining` }
  } else {
    return { expired: false, text: `${hours}h remaining` }
  }
}

export const getBGRangeInfo = (bg: number) => {
  if (bg <= BG_RANGES.LOW.max) return BG_RANGES.LOW
  if (bg <= BG_RANGES.NORMAL.max) return BG_RANGES.NORMAL
  return BG_RANGES.HIGH
}

export const getKetoneRangeInfo = (ketones: number) => {
  if (ketones <= KETONE_RANGES.NORMAL.max) return KETONE_RANGES.NORMAL
  if (ketones <= KETONE_RANGES.TRACE.max) return KETONE_RANGES.TRACE
  if (ketones <= KETONE_RANGES.MODERATE.max) return KETONE_RANGES.MODERATE
  return KETONE_RANGES.HIGH
}
