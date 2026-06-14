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
// Weather Environment Tracker Types
// Extracted from weather-environment-tracker.tsx for modularization

// Weather types from caresv3 - now supporting multiple selections
// "Pressure Hell" kept as the "ugh, pressure, who knows which" catch-all (and so
// every old entry stays valid); High/Low/Swings let people who DO track the
// barometer say which direction wrecks them — they hit people opposite ways.
export type WeatherType = "Sunny" | "Cloudy" | "Rainy" | "Windy" | "Stormy" | "Snowy" | "High Pressure" | "Low Pressure" | "Pressure Swings" | "Pressure Hell" | "Humid" | "Dry"
export type WeatherImpact = "Not at all" | "A little" | "Yes" | "A LOT"

// Environmental allergen types
export type AllergenType = "Pollen" | "Dust" | "Mold" | "Pet Dander" | "Smoke" | "Chemical" | "Fragrance" | "Other"
export type AllergenSeverity = "Mild" | "Moderate" | "Severe" | "Extreme"

// Weather Entry Interface
export interface WeatherData {
  weatherTypes: WeatherType[] // Changed to array for multiple selections
  // 1–10 scale. number = new entries; WeatherImpact string = legacy (auto-mapped
  // via impactToNumber). undefined = NOT RECORDED (user never set it) — distinct
  // from 1 / "Not at all".
  impact?: number | WeatherImpact
  description: string
  tags: string[]
  timestamp: string
  // Backward compatibility fields
  weatherType?: WeatherType // Old single selection field
  date?: string // For history display
  displayDate?: string // For history display
}

// Environmental Allergen Entry Interface  
export interface AllergenData {
  allergenType: AllergenType
  allergenName: string
  severity: AllergenSeverity
  symptoms: string[]
  location: string
  duration: string // How long symptoms lasted
  treatment: string
  notes: string
  tags: string[]
  timestamp: string
  // For history display
  date?: string
  displayDate?: string
}

// Component Props
export interface WeatherEnvironmentTrackerProps {
  selectedDate?: Date
}
