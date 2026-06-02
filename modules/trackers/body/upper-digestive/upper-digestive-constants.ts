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
 * UPPER DIGESTIVE TRACKER CONSTANTS
 * Episode types, symptoms, triggers, treatments, and helper functions
 */

// Episode Types for Multi-Modal Interface
export const EPISODE_TYPES = [
  {
    id: 'nausea',
    name: 'Nausea Episode',
    icon: '🤢',
    description: 'General nausea, morning sickness, motion sickness',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'reflux',
    name: 'Reflux/Heartburn',
    icon: '🔥',
    description: 'GERD, acid reflux, heartburn symptoms',
    color: 'bg-destructive/10 text-destructive border-destructive/20'
  },
  {
    id: 'gastroparesis',
    name: 'Gastroparesis',
    icon: '🐌',
    description: 'Delayed gastric emptying, early satiety',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'indigestion',
    name: 'Indigestion',
    icon: '😵',
    description: 'General stomach upset, discomfort after eating',
    color: 'bg-warning/10 text-warning border-warning/20'
  },
  {
    id: 'general',
    name: 'General Upper GI',
    icon: '🤮',
    description: 'Mixed or other upper digestive symptoms',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
] as const

// Comprehensive Upper Digestive Symptoms
export const UPPER_DIGESTIVE_SYMPTOMS = [
  // Nausea-related
  'Nausea',
  'Vomiting',
  'Dry Heaving',
  'Motion Sickness',
  'Morning Sickness',
  'Food Aversion',
  
  // Reflux/GERD
  'Heartburn',
  'Acid Reflux',
  'Regurgitation',
  'Sour Taste',
  'Burning Throat',
  'Chest Pain (reflux)',
  
  // Gastroparesis/Motility
  'Early Satiety',
  'Feeling Full Quickly',
  'Food Sitting Heavy',
  'Delayed Gastric Emptying',
  'Bloating (upper)',
  'Stomach Distension',
  
  // General Indigestion
  'Stomach Pain',
  'Stomach Cramping',
  'Stomach Burning',
  'Indigestion',
  'Dyspepsia',
  'Loss of Appetite',
  
  // Other Upper GI
  'Hiccups (persistent)',
  'Belching/Burping',
  'Stomach Gurgling',
  'Upper Abdominal Pain'
]

// Common Triggers
export const UPPER_DIGESTIVE_TRIGGERS = [
  // Food-related
  'Spicy Food',
  'Fatty/Greasy Food',
  'Acidic Food (citrus, tomato)',
  'Chocolate',
  'Caffeine',
  'Alcohol',
  'Large Meals',
  'Eating Too Fast',
  'Eating Late at Night',
  'Carbonated Drinks',
  'Dairy Products',
  'Gluten',
  'High Fiber Foods',
  'Raw Vegetables',
  
  // Lifestyle/Environmental
  'Stress/Anxiety',
  'Lack of Sleep',
  'Lying Down After Eating',
  'Physical Activity After Eating',
  'Smoking',
  'Certain Medications',
  'Hormonal Changes',
  'Motion/Travel',
  'Strong Smells',
  'Heat/Hot Weather',
  
  // Medical/Physical
  'Gastroparesis Flare',
  'GERD Flare',
  'Illness/Infection',
  'Dehydration',
  'Blood Sugar Changes',
  'Menstruation'
]

// Treatments & Interventions
export const UPPER_DIGESTIVE_TREATMENTS = [
  // Medications
  'Antacid (Tums, Rolaids)',
  'H2 Blocker (Pepcid, Zantac)',
  'PPI (Omeprazole, Nexium)',
  'Anti-nausea Medication',
  'Prokinetic Medication',
  'Ginger Supplements',
  'Probiotics',
  
  // Dietary Interventions
  'Small Frequent Meals',
  'Bland Diet (BRAT)',
  'Clear Liquids Only',
  'Avoiding Trigger Foods',
  'Eating Slowly',
  'Chewing Thoroughly',
  'Room Temperature Foods',
  'Low Fat Diet',
  'Low Fiber Diet',
  
  // Position/Physical
  'Sitting Upright After Eating',
  'Elevating Head of Bed',
  'Walking After Meals',
  'Avoiding Lying Down',
  'Deep Breathing',
  'Gentle Abdominal Massage',
  
  // Natural Remedies
  'Ginger Tea',
  'Peppermint Tea',
  'Chamomile Tea',
  'Crackers/Dry Toast',
  'Ice Chips',
  'Cold Compress on Forehead',
  'Fresh Air',
  'Acupressure (P6 point)',
  
  // Lifestyle
  'Rest/Sleep',
  'Stress Management',
  'Avoiding Strong Smells',
  'Staying Hydrated'
]

// Related Trackers for Cross-Reference
export const RELATED_TRACKERS = [
  {
    id: 'dysautonomia',
    name: 'Dysautonomia Tracking',
    icon: '💓',
    description: 'Track gastroparesis and autonomic GI symptoms',
    path: '/dysautonomia'
  },
  {
    id: 'food-allergens',
    name: 'Food & Allergen Tracking',
    icon: '🍎',
    description: 'Identify food triggers and allergic reactions',
    path: '/food-allergens'
  },
  {
    id: 'lower-digestive',
    name: 'Lower Digestive (Bathroom)',
    icon: '💩',
    description: 'Track lower GI symptoms and bowel movements',
    path: '/bathroom'
  },
  {
    id: 'pain',
    name: 'Pain Tracking',
    icon: '🤕',
    description: 'Map abdominal pain location and severity',
    path: '/pain'
  }
]

// Severity Labels (1-10 scale)
export const SEVERITY_LABELS = [
  { value: 1, label: 'Very Mild', color: 'text-green-600' },
  { value: 2, label: 'Mild', color: 'text-green-500' },
  { value: 3, label: 'Mild-Moderate', color: 'text-warning' },
  { value: 4, label: 'Moderate', color: 'text-warning' },
  { value: 5, label: 'Moderate', color: 'text-warning' },
  { value: 6, label: 'Moderate-Severe', color: 'text-warning' },
  { value: 7, label: 'Severe', color: 'text-destructive' },
  { value: 8, label: 'Very Severe', color: 'text-destructive' },
  { value: 9, label: 'Extreme', color: 'text-destructive' },
  { value: 10, label: 'Crisis', color: 'text-destructive' }
]

// Duration Units for Structured Input
export const DURATION_UNITS = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' }
]

// Goblin Messages
export const UPPER_DIGESTIVE_GOBLINISMS = [
  "Upper digestive chaos documented! The stomach sprites are taking notes! 🤢✨",
  "Your tummy troubles have been logged by the nausea gnomes! 🧚‍♀️",
  "Digestive drama saved! The heartburn hobgoblins approve! 🔥",
  "Your stomach saga has been recorded by the indigestion imps! 🧚‍♂️",
  "Upper GI entry logged! The reflux fairies are pleased! 💫",
  "Gastroparesis gremlin has filed your report! 🐌✨",
  "The belly button bureaucrats have processed your symptoms! 🤮📋"
]

// Helper Functions
export const getSeverityLabel = (severity: number) => {
  const label = SEVERITY_LABELS.find(s => s.value === severity)
  return label ? label.label : 'Unknown'
}

export const getSeverityColor = (severity: number) => {
  const label = SEVERITY_LABELS.find(s => s.value === severity)
  return label ? label.color : 'text-gray-500'
}

export const getEpisodeTypeInfo = (episodeType: string) => {
  return EPISODE_TYPES.find(type => type.id === episodeType) || EPISODE_TYPES[4] // default to general
}
