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
 * DIABETES TRACKER TYPES
 * Type definitions for diabetes tracking system
 */

export interface DiabetesEntry {
  id: string
  user_id: string
  entry_date: string
  entry_time: string
  blood_glucose?: number
  ketones?: number
  insulin_type?: string
  insulin_amount?: number
  carbs?: number
  cgm_timer?: number
  pump_timer?: number
  glp1_timer?: number
  mood?: string
  notes?: string
  tags?: string[]  // 🔥 FIX: Made tags optional
  created_at: string
}

export interface Timer {
  id: string
  type: 'cgm' | 'pump' | 'glp1'
  name: string
  inserted_at: string  // When the device was inserted
  expires_at: string   // When it needs to be changed
  user_id: string
}

export interface DiabetesAnalyticsProps {
  entries: DiabetesEntry[]
  currentDate: string
}

export interface DiabetesHistoryProps {
  // No props needed - self-contained
}

export interface TimerManagerProps {
  timers: Timer[]
  onTimersChange: (timers: Timer[]) => void
  currentUserId: string
}
