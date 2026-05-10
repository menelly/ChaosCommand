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
// Food Choice Tracker Constants

export const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast', emoji: '🌅' },
  { value: 'lunch', label: '☀️ Lunch', emoji: '☀️' },
  { value: 'dinner', label: '🌙 Dinner', emoji: '🌙' },
  { value: 'snack', label: '🍪 Snack', emoji: '🍪' },
  { value: 'other', label: '🤷‍♀️ Other', emoji: '🤷‍♀️' }
] as const

export const EATING_MOODS = [
  { value: 'great', label: '😊 Felt great!', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: '🙂 Pretty good', color: 'bg-blue-100 text-blue-800' },
  { value: 'okay', label: '😐 It was okay', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'struggled', label: '😔 Struggled a bit', color: 'bg-orange-100 text-orange-800' },
  { value: 'difficult', label: '😰 Really difficult', color: 'bg-red-100 text-red-800' }
] as const

export const FOOD_GROUPS = [
  { value: 'fruits', label: '🍎 Fruits', color: 'bg-red-100 text-red-800' },
  { value: 'vegetables', label: '🥕 Vegetables', color: 'bg-green-100 text-green-800' },
  { value: 'grains', label: '🌾 Grains', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'protein', label: '🥩 Protein', color: 'bg-purple-100 text-purple-800' },
  { value: 'dairy', label: '🥛 Dairy', color: 'bg-blue-100 text-blue-800' },
  { value: 'fats', label: '🥑 Healthy Fats', color: 'bg-green-100 text-green-800' },
  { value: 'treats', label: '🍰 Treats', color: 'bg-pink-100 text-pink-800' },
  { value: 'beverages', label: '☕ Beverages', color: 'bg-brown-100 text-brown-800' }
] as const

export const GENTLE_ENCOURAGEMENTS = [
  "You fed your flesh suit! 🎉✨",
  "Nourishment achieved! 🌟",
  "Your body says thank you! 💚",
  "Fuel for the chaos machine! ⚡",
  "Flesh suit maintenance complete! 🛠️",
  "You did the eating thing! 🍽️✨",
  "Sustenance acquired! 🏆",
  "Body battery recharged! 🔋"
] as const

export const DETAILED_ENCOURAGEMENTS = [
  "Nutrition data logged like a boss! 📊✨",
  "Food science in action! 🧪",
  "Macro tracking mastery! 💪",
  "Nutritional awareness level up! 🎮",
  "Food group bingo! 🎯",
  "Detailed fuel report filed! 📋",
  "Comprehensive nourishment noted! 📝",
  "Advanced flesh suit maintenance! 🔧"
] as const


