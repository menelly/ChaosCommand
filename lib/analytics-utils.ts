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
 * ANALYTICS SCALE STANDARDIZATION UTILITIES
 * Because we can't expect charts to understand "divide chocolate by telephone"
 */

// ============================================================================
// SEVERITY SCALE CONVERSIONS (All convert to 0-10 scale)
// ============================================================================

/**
 * Convert digestive severity text to 0-10 scale
 */
export const digestiveSeverityToNumber = (severity: string): number => {
  switch (severity?.toLowerCase()) {
    case 'mild': return 3
    case 'moderate': return 6
    case 'severe': return 9
    default: return 0
  }
}

/**
 * Convert food allergen severity to 0-10 scale
 */
export const allergenSeverityToNumber = (severity: string): number => {
  switch (severity?.toLowerCase()) {
    case 'mild': return 2
    case 'moderate': return 5
    case 'severe': return 8
    case 'life-threatening': return 10
    default: return 0
  }
}

/**
 * Convert weather impact to 0-10 scale
 */
export const weatherImpactToNumber = (impact: string): number => {
  switch (impact?.toLowerCase()) {
    case 'none': return 0
    case 'minimal': return 2
    case 'mild': return 3
    case 'moderate': return 5
    case 'significant': return 7
    case 'severe': return 9
    case 'extreme': return 10
    default: return 0
  }
}

/**
 * Convert head pain intensity (1-10) to standardized 0-10 scale
 * (This is just a passthrough since 1-10 maps to 1-10, but keeps it consistent)
 */
export const headPainIntensityToNumber = (intensity: number | string): number => {
  const num = Number(intensity) || 0
  return Math.max(0, Math.min(10, num)) // Clamp to 0-10 range
}

/**
 * Convert head pain treatment effectiveness (1-5) to 0-10 scale
 */
export const headPainEffectivenessToNumber = (effectiveness: number | string): number => {
  const num = Number(effectiveness) || 0
  if (num === 0) return 0
  // Map 1-5 to 2-10 (so 1=2, 2=4, 3=6, 4=8, 5=10)
  return Math.max(0, Math.min(10, num * 2))
}

/**
 * Convert general pain level (0-10) - passthrough with validation
 */
export const painLevelToNumber = (level: number | string): number => {
  const num = Number(level) || 0
  return Math.max(0, Math.min(10, num)) // Clamp to 0-10 range
}

/**
 * Convert general effectiveness (0-10) - passthrough with validation
 */
export const effectivenessToNumber = (effectiveness: number | string): number => {
  const num = Number(effectiveness) || 0
  return Math.max(0, Math.min(10, num)) // Clamp to 0-10 range
}

// ============================================================================
// DATA SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize numeric data for charts - ensures no NaN, Infinity, or out-of-range values
 */
export const sanitizeChartNumber = (value: any, min: number = 0, max: number = 10): number => {
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.max(min, Math.min(max, num))
}

/**
 * Sanitize chart data array - removes entries with invalid numeric values
 */
export const sanitizeChartData = <T extends Record<string, any>>(
  data: T[], 
  numericFields: (keyof T)[]
): T[] => {
  return data.filter(item => {
    return numericFields.every(field => {
      const value = item[field]
      const num = Number(value)
      return !isNaN(num) && isFinite(num)
    })
  }).map(item => {
    const sanitized = { ...item }
    numericFields.forEach(field => {
      sanitized[field] = sanitizeChartNumber(item[field]) as T[keyof T]
    })
    return sanitized
  })
}

/**
 * Safe division for averages - returns 0 instead of NaN or Infinity
 */
export const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) return 0
  const result = numerator / denominator
  return isFinite(result) ? result : 0
}

/**
 * Safe average calculation
 */
export const safeAverage = (values: number[]): number => {
  if (values.length === 0) return 0
  const validValues = values.filter(v => isFinite(v) && !isNaN(v))
  if (validValues.length === 0) return 0
  return safeDivide(validValues.reduce((sum, v) => sum + v, 0), validValues.length)
}

// ============================================================================
// SCALE DISPLAY HELPERS
// ============================================================================

/**
 * Convert 0-10 scale back to display format for different trackers
 */
export const formatScaleForDisplay = (value: number, scaleType: 'pain' | 'headpain' | 'digestive' | 'allergen' | 'weather'): string => {
  const num = Math.round(value)
  
  switch (scaleType) {
    case 'pain':
      return `${num}/10`
    case 'headpain':
      return `${num}/10`
    case 'digestive':
      if (num <= 2) return 'Mild'
      if (num <= 5) return 'Moderate'
      return 'Severe'
    case 'allergen':
      if (num <= 1) return 'Mild'
      if (num <= 4) return 'Moderate'
      if (num <= 7) return 'Severe'
      return 'Life-threatening'
    case 'weather':
      if (num === 0) return 'None'
      if (num <= 2) return 'Minimal'
      if (num <= 4) return 'Mild'
      if (num <= 6) return 'Moderate'
      if (num <= 8) return 'Significant'
      return 'Severe'
    default:
      return `${num}/10`
  }
}
