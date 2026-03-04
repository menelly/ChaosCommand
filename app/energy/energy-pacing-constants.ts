/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Energy & Pacing Constants - ME/CFS and POTS Friendly
 *
 * Activity costs based on common chronic illness experiences.
 * Users can personalize these over time as they learn their own patterns.
 */

import { ActivityDefinition, RestType } from './energy-pacing-types'

// ============================================================================
// ACTIVITY DEFINITIONS - Grouped by category with realistic spoon costs
// ============================================================================

export const ACTIVITIES: ActivityDefinition[] = [
  // SELF-CARE (often surprisingly high cost for chronic illness)
  { id: 'shower', name: 'Shower/Bath', emoji: '🚿', defaultCost: 3, category: 'self-care', description: 'Full shower or bath' },
  { id: 'quick-wash', name: 'Quick Freshen Up', emoji: '💦', defaultCost: 1, category: 'self-care', description: 'Sink wash, dry shampoo, minimal effort' },
  { id: 'hair-wash', name: 'Wash Hair', emoji: '🧴', defaultCost: 2, category: 'self-care', description: 'Hair washing and drying' },
  { id: 'get-dressed', name: 'Get Dressed', emoji: '👕', defaultCost: 1, category: 'self-care', description: 'Change clothes, getting ready' },
  { id: 'full-ready', name: 'Full Getting Ready', emoji: '💄', defaultCost: 3, category: 'self-care', description: 'Shower, hair, makeup/grooming, outfit' },
  { id: 'teeth-meds', name: 'Teeth & Meds', emoji: '💊', defaultCost: 1, category: 'self-care', description: 'Basic hygiene and medications' },

  // HOUSEHOLD
  { id: 'cooking-simple', name: 'Simple Cooking', emoji: '🍳', defaultCost: 2, category: 'household', description: 'Quick meal, reheating, minimal prep' },
  { id: 'cooking-full', name: 'Full Cooking', emoji: '🍲', defaultCost: 4, category: 'household', description: 'Full meal prep, multiple steps' },
  { id: 'dishes', name: 'Dishes', emoji: '🍽️', defaultCost: 2, category: 'household', description: 'Washing dishes, loading dishwasher' },
  { id: 'laundry-start', name: 'Start Laundry', emoji: '🧺', defaultCost: 1, category: 'household', description: 'Load washer/dryer' },
  { id: 'laundry-fold', name: 'Fold Laundry', emoji: '👚', defaultCost: 2, category: 'household', description: 'Folding and putting away' },
  { id: 'light-tidying', name: 'Light Tidying', emoji: '🧹', defaultCost: 1, category: 'household', description: 'Quick pickup, surface cleaning' },
  { id: 'cleaning', name: 'Cleaning', emoji: '🧽', defaultCost: 3, category: 'household', description: 'Vacuuming, mopping, scrubbing' },
  { id: 'deep-clean', name: 'Deep Cleaning', emoji: '✨', defaultCost: 5, category: 'household', description: 'Major cleaning project' },

  // ERRANDS (often the biggest spoon drain)
  { id: 'grocery-quick', name: 'Quick Store Trip', emoji: '🛒', defaultCost: 3, category: 'errands', description: '15-30 min, few items' },
  { id: 'grocery-full', name: 'Full Grocery Shop', emoji: '🛍️', defaultCost: 5, category: 'errands', description: 'Full shopping trip, 45+ min' },
  { id: 'doctor-appt', name: 'Doctor Appointment', emoji: '🏥', defaultCost: 4, category: 'errands', description: 'Medical appointment (travel + waiting + appt)' },
  { id: 'pharmacy', name: 'Pharmacy Run', emoji: '💊', defaultCost: 2, category: 'errands', description: 'Picking up prescriptions' },
  { id: 'driving-short', name: 'Short Drive', emoji: '🚗', defaultCost: 1, category: 'errands', description: 'Under 15 minutes' },
  { id: 'driving-long', name: 'Long Drive', emoji: '🚙', defaultCost: 3, category: 'errands', description: '30+ minutes of driving' },
  { id: 'errand-general', name: 'General Errand', emoji: '📦', defaultCost: 2, category: 'errands', description: 'Post office, bank, etc.' },

  // SOCIAL (variable but often draining)
  { id: 'phone-call', name: 'Phone Call', emoji: '📱', defaultCost: 2, category: 'social', description: 'Phone or video call' },
  { id: 'text-convo', name: 'Text Conversation', emoji: '💬', defaultCost: 1, category: 'social', description: 'Extended texting/messaging' },
  { id: 'visit-home', name: 'Visitor at Home', emoji: '🏠', defaultCost: 3, category: 'social', description: 'Someone visiting your space' },
  { id: 'visit-out', name: 'Going Out to Visit', emoji: '🚪', defaultCost: 4, category: 'social', description: 'Visiting someone else' },
  { id: 'social-event', name: 'Social Event', emoji: '🎉', defaultCost: 5, category: 'social', description: 'Party, gathering, group event' },
  { id: 'meal-out', name: 'Eating Out', emoji: '🍴', defaultCost: 3, category: 'social', description: 'Restaurant, cafe, takeout pickup' },

  // PHYSICAL
  { id: 'walking-short', name: 'Short Walk', emoji: '🚶', defaultCost: 2, category: 'physical', description: 'Under 10 minutes' },
  { id: 'walking-long', name: 'Longer Walk', emoji: '🚶‍♀️', defaultCost: 4, category: 'physical', description: '15+ minutes' },
  { id: 'standing', name: 'Extended Standing', emoji: '🧍', defaultCost: 2, category: 'physical', description: 'Standing for 15+ min (POTS nightmare)' },
  { id: 'stairs', name: 'Stairs', emoji: '🪜', defaultCost: 2, category: 'physical', description: 'Going up/down stairs multiple times' },
  { id: 'gentle-exercise', name: 'Gentle Exercise', emoji: '🧘', defaultCost: 2, category: 'physical', description: 'Stretching, gentle yoga, PT exercises' },
  { id: 'exercise', name: 'Exercise/Workout', emoji: '💪', defaultCost: 4, category: 'physical', description: 'Actual workout or physical activity' },

  // MENTAL (cognitive load matters!)
  { id: 'work-light', name: 'Light Work', emoji: '💻', defaultCost: 2, category: 'mental', description: 'Easy tasks, emails, organizing' },
  { id: 'work-focus', name: 'Focused Work', emoji: '🎯', defaultCost: 3, category: 'mental', description: 'Concentration-heavy tasks' },
  { id: 'work-heavy', name: 'Heavy Mental Work', emoji: '🧠', defaultCost: 4, category: 'mental', description: 'Problem-solving, complex decisions' },
  { id: 'reading', name: 'Reading', emoji: '📖', defaultCost: 1, category: 'mental', description: 'Light reading, scrolling' },
  { id: 'studying', name: 'Studying/Learning', emoji: '📚', defaultCost: 3, category: 'mental', description: 'Active learning, courses' },
  { id: 'decision-making', name: 'Decision Making', emoji: '🤔', defaultCost: 2, category: 'mental', description: 'Planning, choices, appointments' },

  // REST (negative cost = restores spoons!)
  { id: 'rest-lying', name: 'Lying Down Rest', emoji: '🛋️', defaultCost: -2, category: 'rest', description: 'Horizontal rest, not sleeping' },
  { id: 'rest-nap', name: 'Nap', emoji: '😴', defaultCost: -3, category: 'rest', description: 'Actual sleep during the day' },
  { id: 'rest-meditation', name: 'Meditation', emoji: '🧘‍♀️', defaultCost: -1, category: 'rest', description: 'Meditation or breathing exercises' },
  { id: 'rest-quiet', name: 'Quiet Sitting', emoji: '☁️', defaultCost: -1, category: 'rest', description: 'Sitting quietly, minimal stimulation' },
  { id: 'rest-comfort', name: 'Comfort Activity', emoji: '🧸', defaultCost: -1, category: 'rest', description: 'Low-energy comfort (TV, music, crafts)' },
]

// Group activities by category for UI
export const ACTIVITIES_BY_CATEGORY = {
  'self-care': ACTIVITIES.filter(a => a.category === 'self-care'),
  'household': ACTIVITIES.filter(a => a.category === 'household'),
  'errands': ACTIVITIES.filter(a => a.category === 'errands'),
  'social': ACTIVITIES.filter(a => a.category === 'social'),
  'physical': ACTIVITIES.filter(a => a.category === 'physical'),
  'mental': ACTIVITIES.filter(a => a.category === 'mental'),
  'rest': ACTIVITIES.filter(a => a.category === 'rest'),
}

export const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  'self-care': { label: 'Self Care', emoji: '🚿', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'household': { label: 'Household', emoji: '🏠', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  'errands': { label: 'Errands', emoji: '🛒', color: 'bg-red-100 text-red-800 border-red-200' },
  'social': { label: 'Social', emoji: '💬', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'physical': { label: 'Physical', emoji: '🚶', color: 'bg-green-100 text-green-800 border-green-200' },
  'mental': { label: 'Mental', emoji: '🧠', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'rest': { label: 'Rest', emoji: '😴', color: 'bg-teal-100 text-teal-800 border-teal-200' },
}

// ============================================================================
// SPOON BUDGET PRESETS
// ============================================================================

export const SPOON_PRESETS = [
  { value: 2, label: 'Rough day', emoji: '😵', description: 'Starting very low - protect yourself' },
  { value: 4, label: 'Low energy', emoji: '😔', description: 'Less than usual - pace carefully' },
  { value: 6, label: 'Moderate', emoji: '😐', description: 'Average day - steady pacing' },
  { value: 8, label: 'Good day', emoji: '🙂', description: 'Better than usual - still pace!' },
  { value: 10, label: 'Great day', emoji: '😊', description: 'High energy - but dont overdo it!' },
] as const

// ============================================================================
// PEM RISK THRESHOLDS
// ============================================================================

export const PEM_THRESHOLDS = {
  safe: 0.5,        // Used less than 50% of budget
  caution: 0.75,    // Used 50-75% of budget
  warning: 0.9,     // Used 75-90% of budget
  danger: 1.0,      // Used 90%+ or over budget
}

export const getPEMRiskLevel = (spent: number, budget: number) => {
  if (budget <= 0) return 'danger'
  const ratio = spent / budget

  if (ratio >= PEM_THRESHOLDS.danger) return 'danger'
  if (ratio >= PEM_THRESHOLDS.warning) return 'warning'
  if (ratio >= PEM_THRESHOLDS.caution) return 'caution'
  return 'safe'
}

export const PEM_RISK_INFO = {
  safe: {
    label: 'Looking Good',
    color: 'text-green-600 bg-green-50 border-green-200',
    emoji: '💚',
    message: 'Plenty of spoons left. Keep pacing!'
  },
  caution: {
    label: 'Pacing Zone',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    emoji: '💛',
    message: 'Getting into moderate use. Consider what\'s essential.'
  },
  warning: {
    label: 'Low Spoons',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    emoji: '🧡',
    message: 'Running low! Rest if you can. Prioritize carefully.'
  },
  danger: {
    label: 'Crash Risk',
    color: 'text-red-600 bg-red-50 border-red-200',
    emoji: '❤️‍🩹',
    message: 'High PEM risk! Please rest. Tomorrow-you will thank you.'
  },
}

// ============================================================================
// ENCOURAGEMENT MESSAGES
// ============================================================================

export const PACING_ENCOURAGEMENTS = {
  underBudget: [
    'Great pacing today! Your future self thanks you.',
    'Staying within budget - thats the goal!',
    'Sustainable energy use. Well done!',
    'Protecting your spoons like a pro.',
  ],
  atBudget: [
    'Right at your limit - time to rest.',
    'Budget reached! No more activities today.',
    'You made it through! Rest time now.',
    'Exactly on target. Be gentle with yourself.',
  ],
  overBudget: [
    'Over budget, but you\'re aware - that matters.',
    'Tomorrow might be rough. Rest extra tonight.',
    'Logging this helps you learn. No judgment.',
    'Some days are like this. Document and rest.',
  ],
  restLogged: [
    'Rest is productive. You\'re recharging!',
    'Spoon restoration in progress.',
    'Taking breaks is good pacing.',
    'Your body thanks you for the rest.',
  ],
}

export const GOBLIN_MODE_LABELS = {
  spoons: 'Chaos Units',
  spent: 'Chaos Deployed',
  remaining: 'Chaos Reserves',
  budget: 'Daily Chaos Allowance',
  pem: 'Crash-o-Meter',
}

export const PROFESSIONAL_LABELS = {
  spoons: 'Energy Units',
  spent: 'Energy Spent',
  remaining: 'Energy Remaining',
  budget: 'Daily Energy Budget',
  pem: 'Fatigue Risk',
}
