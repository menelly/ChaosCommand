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
export interface MovementEntry {
  id: string
  date: string
  time: string
  type: string
  duration: string
  intensity: string
  energyBefore: number // 1-10 scale
  energyAfter: number // 1-10 scale
  bodyFeel: string[]
  location: string
  notes: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface MovementType {
  value: string
  emoji: string
  description: string
}

export interface IntensityLevel {
  value: string
  emoji: string
  description: string
}
