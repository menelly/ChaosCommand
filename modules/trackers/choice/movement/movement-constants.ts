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
import { MovementType, IntensityLevel } from './movement-types'

export const MOVEMENT_TYPES: MovementType[] = [
  { value: "stretching", emoji: "🧘", description: "Gentle stretching" },
  { value: "walking", emoji: "🚶", description: "Walking (any distance)" },
  { value: "bed_exercises", emoji: "🛏️", description: "Exercises in bed" },
  { value: "chair_exercises", emoji: "🪑", description: "Chair exercises" },
  { value: "dancing", emoji: "💃", description: "Dancing/moving to music" },
  { value: "swimming", emoji: "🏊", description: "Swimming/water movement" },
  { value: "yoga", emoji: "🧘‍♀️", description: "Yoga/gentle poses" },
  { value: "tai_chi", emoji: "🥋", description: "Tai chi/qigong" },
  { value: "physical_therapy", emoji: "🏥", description: "Physical therapy exercises" },
  { value: "household", emoji: "🏠", description: "Household activities" },
  { value: "gardening", emoji: "🌱", description: "Gardening" },
  { value: "other", emoji: "✨", description: "Other movement" }
]

export const INTENSITY_LEVELS: IntensityLevel[] = [
  { value: "very_gentle", emoji: "🌸", description: "Very gentle - barely noticeable effort" },
  { value: "gentle", emoji: "🌿", description: "Gentle - light effort" },
  { value: "moderate", emoji: "🌞", description: "Moderate - noticeable effort" },
  { value: "vigorous", emoji: "🔥", description: "Vigorous - strong effort" }
]

export const BODY_FEELINGS = [
  "Energized", "Tired", "Relaxed", "Stiff", "Loose", "Strong", "Weak", 
  "Balanced", "Unsteady", "Comfortable", "Uncomfortable", "Proud", 
  "Accomplished", "Frustrated", "Peaceful", "Invigorated"
]

export const MOVEMENT_GOBLINISMS = [
  "Movement logged! Your body goblins are cheering! 💖✨",
  "Every movement counts! The motion sprites are proud! 🌟",
  "Movement entry saved! Your muscles are sending thank you notes! 💌",
  "Motion documented! The activity pixies are doing happy dances! 💃",
  "Movement tracked! Your body is grateful for the love! 🥰"
]

// Helper functions
export const getMovementType = (typeValue: string): MovementType => {
  if (!typeValue) {
    console.warn('getMovementType called with undefined/null typeValue:', typeValue)
    return { value: 'unknown', emoji: '❓', description: 'Unknown movement type' }
  }
  const found = MOVEMENT_TYPES.find(t => t.value === typeValue)
  if (!found) {
    console.warn('getMovementType: No match found for typeValue:', typeValue)
    return { value: typeValue, emoji: '❓', description: typeValue }
  }
  return found
}

export const getIntensityLevel = (intensityValue: string): IntensityLevel => {
  return INTENSITY_LEVELS.find(i => i.value === intensityValue) || INTENSITY_LEVELS[0]
}
