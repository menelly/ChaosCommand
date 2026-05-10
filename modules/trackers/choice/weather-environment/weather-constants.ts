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
// Weather Environment Tracker Constants
// Extracted from weather-environment-tracker.tsx for modularization

import {
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Zap,
  CloudSnow,
  Gauge,
  Droplets
} from 'lucide-react'
import type { WeatherType, WeatherImpact, AllergenType, AllergenSeverity } from './weather-types'

// Weather icons mapping
export const WEATHER_ICONS = {
  "Sunny": Sun,
  "Cloudy": Cloud,
  "Rainy": CloudRain,
  "Windy": Wind,
  "Stormy": Zap,
  "Snowy": CloudSnow,
  "Pressure Hell": Gauge,
  "Humid": Droplets,
  "Dry": Sun
}

export const WEATHER_TYPES: WeatherType[] = [
  "Sunny", "Cloudy", "Rainy", "Windy", "Stormy", "Snowy", "Pressure Hell", "Humid", "Dry"
]

export const WEATHER_IMPACTS: WeatherImpact[] = [
  "Not at all", "A little", "Yes", "A LOT"
]

export const ALLERGEN_TYPES: AllergenType[] = [
  "Pollen", "Dust", "Mold", "Pet Dander", "Smoke", "Chemical", "Fragrance", "Other"
]

export const ALLERGEN_SEVERITIES: AllergenSeverity[] = [
  "Mild", "Moderate", "Severe", "Extreme"
]

export const COMMON_SYMPTOMS = [
  "Sneezing", "Runny nose", "Stuffy nose", "Itchy eyes", "Watery eyes", "Red eyes",
  "Scratchy throat", "Coughing", "Wheezing", "Shortness of breath", "Chest tightness",
  "Skin rash", "Hives", "Itchy skin", "Headache", "Fatigue", "Brain fog"
]

// Helper functions
export const getWeatherColor = (weatherType: WeatherType): string => {
  const colors: Record<WeatherType, string> = {
    "Sunny": "#facc15",
    "Cloudy": "#9ca3af",
    "Rainy": "#3b82f6",
    "Windy": "#14b8a6",
    "Stormy": "#8b5cf6",
    "Snowy": "#e5e7eb",
    "Pressure Hell": "#ef4444",
    "Humid": "#06b6d4",
    "Dry": "#f59e0b"
  }
  return colors[weatherType] || "#9ca3af"
}

export const getSeverityColor = (severity: AllergenSeverity): string => {
  const colors: Record<AllergenSeverity, string> = {
    "Mild": "#22c55e",
    "Moderate": "#eab308",
    "Severe": "#f97316",
    "Extreme": "#ef4444"
  }
  return colors[severity] || "#9ca3af"
}
