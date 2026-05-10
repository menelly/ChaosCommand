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
// Food Choice Tracker Types

export interface SimpleFoodEntry {
  id: string
  timestamp: string
  didEat: boolean
  mealType?: string // breakfast, lunch, dinner, snack
  mood?: string // how they felt about eating
  notes?: string
  tags: string[]
}

export interface DetailedFoodEntry {
  id: string
  timestamp: string
  mealType: string
  foods: string[]
  
  // Macros (optional)
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  
  // Food groups
  foodGroups: string[]
  
  // Context
  notes?: string
  tags: string[]
}

export interface FoodChoiceEntry {
  simpleEntries: SimpleFoodEntry[]
  detailedEntries: DetailedFoodEntry[]
  generalNotes?: string
  tags: string[]
}

export interface FoodAnalytics {
  totalMeals: number
  eatingDays: number
  averageMealsPerDay: number
  commonMealTimes: Array<{time: string, count: number}>
  moodPatterns: Array<{mood: string, count: number}>
  foodGroupFrequency: Array<{group: string, count: number}>
}
