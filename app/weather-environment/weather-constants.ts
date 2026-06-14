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
  Droplets,
  TrendingUp,
  TrendingDown,
  Activity
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
  "High Pressure": TrendingUp,
  "Low Pressure": TrendingDown,
  "Pressure Swings": Activity,
  "Pressure Hell": Gauge,
  "Humid": Droplets,
  "Dry": Sun
}

export const WEATHER_TYPES: WeatherType[] = [
  "Sunny", "Cloudy", "Rainy", "Windy", "Stormy", "Snowy",
  "High Pressure", "Low Pressure", "Pressure Swings", "Pressure Hell",
  "Humid", "Dry"
]

export const WEATHER_IMPACTS: WeatherImpact[] = [
  "Not at all", "A little", "Yes", "A LOT"
]

// Impact is a 1–10 scale now. The old 4 labels become anchor points along the
// line ("Yes" and "A LOT" were too close as buttons). Legacy entries stored one
// of those strings; we map them onto the scale so old data still renders and
// analytics still works — no migration needed, no data lost.
export const IMPACT_ANCHORS: { value: number; label: WeatherImpact }[] = [
  { value: 1, label: "Not at all" },
  { value: 4, label: "A little" },
  { value: 7, label: "Yes" },
  { value: 10, label: "A LOT" },
]

const LEGACY_IMPACT_TO_NUMBER: Record<WeatherImpact, number> = {
  "Not at all": 1, "A little": 4, "Yes": 7, "A LOT": 10,
}

/** Normalize any stored impact (legacy string OR new 1–10 number) to a number.
 *  Returns 0 for missing/unknown = NOT RECORDED (null != "Not at all"). */
export function impactToNumber(impact: number | string | null | undefined): number {
  if (typeof impact === "number") return Math.min(10, Math.max(1, Math.round(impact)))
  if (impact && impact in LEGACY_IMPACT_TO_NUMBER) return LEGACY_IMPACT_TO_NUMBER[impact as WeatherImpact]
  return 0
}

/** Nearest anchor word for a 1–10 value — keeps text legible to a doctor. */
export function impactToLabel(impact: number | string | null | undefined): string {
  const n = impactToNumber(impact)
  if (!n) return "Not recorded"
  return IMPACT_ANCHORS.reduce((best, a) =>
    Math.abs(a.value - n) < Math.abs(best.value - n) ? a : best
  ).label
}

/** "7/10 (Yes)" — the history/export display format. "Not recorded" when null. */
export function impactDisplay(impact: number | string | null | undefined): string {
  const n = impactToNumber(impact)
  return n ? `${n}/10 (${impactToLabel(n)})` : "Not recorded"
}

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
    "High Pressure": "#f97316",
    "Low Pressure": "#6366f1",
    "Pressure Swings": "#ec4899",
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
