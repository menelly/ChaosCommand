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
 * 🧩 MODULE REGISTRY SYSTEM
 * 
 * Central registry for all Chaos Command Center modules with metadata
 * for future website configurator integration.
 * 
 * This system enables:
 * - Website configurator module selection
 * - PWA vs PDF compatibility tracking
 * - Category-based filtering and organization
 * - Custom naming and theming support
 * - Preview generation for website
 */

export type ModuleCategory = 
  | 'medical-tracking'
  | 'planning-calendar' 
  | 'mental-health'
  | 'life-management'
  | 'journal-documentation'
  | 'fun-motivation'
  | 'utilities'

export type ModuleStatus = 
  | 'available'      // Fully implemented and working
  | 'coming-soon'    // Planned but not yet built
  | 'in-progress'    // Currently being developed
  | 'legacy'         // Old version, being replaced

export type CompatibilityLevel = 
  | 'full'           // Works perfectly in both PWA and PDF
  | 'pwa-preferred'  // Works in PDF but better in PWA
  | 'pwa-only'       // Interactive features, PDF gets static version
  | 'pdf-friendly'   // Designed for PDF, works in PWA too

export interface ModuleMetadata {
  id: string
  name: string
  displayName: string
  description: string
  category: ModuleCategory
  status: ModuleStatus
  
  // Compatibility & Features
  compatibility: {
    pwa: CompatibilityLevel
    pdf: CompatibilityLevel
    notes?: string // Explain limitations or special features
  }
  
  // Website Configurator
  showInWebsite: boolean
  isPopular: boolean // Featured in website configurator
  suggestedWith?: string[] // Module IDs that work well together
  conflictsWith?: string[] // Module IDs that shouldn't be combined
  
  // Customization
  allowCustomTitle: boolean
  defaultTitle: string
  alternativeTitles?: string[] // Suggested alternatives for website
  
  // Visual & Preview
  icon: string // Lucide icon name or emoji
  previewImage?: string // For website configurator
  color?: string // Theme color hint
  
  // Technical
  componentPath?: string // Path to React component
  settingsPath?: string // Path to settings component
  route?: string // App route if it's a page
  
  // Consolidation info (for modules that combine multiple features)
  consolidatedFrom?: string[] // List of smaller features this replaces
  
  // Edition targeting (for future multi-edition strategy)
  editions: ('cares' | 'companion' | 'command')[]
}

/**
 * MASTER MODULE REGISTRY
 * All available modules with complete metadata
 */
export const MODULE_REGISTRY: ModuleMetadata[] = [
  
  // 🏥 MEDICAL TRACKING MODULES
  {
    id: 'demographics',
    name: 'demographics',
    displayName: 'Demographics & Emergency Info',
    description: 'Personal information, emergency contacts, and medical ID data',
    category: 'medical-tracking',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full',
      notes: 'Essential foundation for OCR filtering and medical forms'
    },
    showInWebsite: true,
    isPopular: true,
    allowCustomTitle: false, // This should stay consistent for medical purposes
    defaultTitle: 'Demographics & Emergency Info',
    icon: 'User',
    route: '/demographics',
    editions: ['cares', 'command']
  },
  
  {
    id: 'providers',
    name: 'providers',
    displayName: 'Healthcare Providers',
    description: 'Contacts, appointments, therapy notes. Click-to-call integration.',
    category: 'medical-tracking',
    status: 'available',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Click-to-call only works in PWA, PDF shows contact info'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['appointments', 'demographics'],
    allowCustomTitle: true,
    defaultTitle: 'Healthcare Providers',
    alternativeTitles: ['Medical Team', 'Care Providers', 'Healthcare Contacts'],
    icon: 'Stethoscope',
    route: '/providers',
    consolidatedFrom: ['providers', 'appointments', 'therapy-notes'],
    editions: ['cares', 'command']
  },
  
  {
    id: 'appointments',
    name: 'appointments',
    displayName: 'Appointments & Scheduling',
    description: 'Medical appointments, reminders, and scheduling integration',
    category: 'medical-tracking',
    status: 'available',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Reminders and notifications only work in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['providers', 'calendar-monthly'],
    allowCustomTitle: true,
    defaultTitle: 'Appointments',
    alternativeTitles: ['Medical Calendar', 'Healthcare Schedule', 'Appointment Tracker'],
    icon: 'Calendar',
    route: '/appointments',
    editions: ['cares', 'command']
  },
  
  {
    id: 'medications',
    name: 'medications',
    displayName: 'Medications & Supplements',
    description: 'Dosing schedules, refill reminders, pharmacy contacts, side effects',
    category: 'medical-tracking',
    status: 'coming-soon',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Dosing reminders and pharmacy click-to-call only work in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['daily-symptoms', 'providers'],
    allowCustomTitle: true,
    defaultTitle: 'Medications & Supplements',
    alternativeTitles: ['Meds & Vitamins', 'Medication Tracker', 'Pills & Supplements'],
    icon: 'Pill',
    consolidatedFrom: ['medications', 'immunizations', 'side-effects'],
    editions: ['cares', 'command']
  },
  
  // 📅 PLANNING & CALENDAR MODULES
  {
    id: 'calendar-monthly',
    name: 'modern-monthly',
    displayName: 'Monthly Calendar',
    description: 'Full month view with events, appointments, and daily planning',
    category: 'planning-calendar',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full',
      notes: 'Perfect for both digital and print planning'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['weekly-planner', 'daily-schedule'],
    allowCustomTitle: true,
    defaultTitle: 'Monthly Calendar',
    alternativeTitles: ['Month View', 'Monthly Planner', 'Calendar Grid'],
    icon: 'Calendar',
    route: '/calendar',
    componentPath: 'components/modules/monthly-calendar',
    editions: ['companion', 'command']
  },
  
  {
    id: 'weekly-planner',
    name: 'modern-weekly',
    displayName: 'Weekly Planner',
    description: '7-day layout with tasks, appointments, and weekly goals',
    category: 'planning-calendar',
    status: 'coming-soon',
    compatibility: {
      pwa: 'full',
      pdf: 'full'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['calendar-monthly', 'daily-schedule'],
    allowCustomTitle: true,
    defaultTitle: 'Weekly Planner',
    alternativeTitles: ['Week View', 'Weekly Schedule', '7-Day Planner'],
    icon: 'CalendarDays',
    editions: ['companion', 'command']
  },
  
  {
    id: 'daily-schedule',
    name: 'daily-schedule',
    displayName: 'Daily Schedule',
    description: 'Hourly time slots with appointments and task blocks',
    category: 'planning-calendar',
    status: 'coming-soon',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Interactive time blocking works better in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['calendar-monthly', 'weekly-planner'],
    allowCustomTitle: true,
    defaultTitle: 'Daily Schedule',
    alternativeTitles: ['Daily Planner', 'Time Blocks', 'Hourly Schedule'],
    icon: 'Clock',
    componentPath: 'components/modules/daily-planners',
    editions: ['companion', 'command']
  },

  // 📅 PLANNING HUB (existing implementation)
  {
    id: 'planning-hub',
    name: 'planning',
    displayName: 'Planning Hub',
    description: 'Central planning dashboard with calendar integration and task management',
    category: 'planning-calendar',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full',
      notes: 'Planning layouts work great in both digital and print formats'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['calendar-monthly', 'journal-unified'],
    allowCustomTitle: true,
    defaultTitle: 'Planning Hub',
    alternativeTitles: ['Planning Center', 'Task Management', 'Daily Planning'],
    icon: 'Calendar',
    route: '/planning',
    editions: ['companion', 'command']
  },
  
  // 🧠 MENTAL HEALTH MODULES
  {
    id: 'mental-health-hub',
    name: 'mental-health',
    displayName: 'Mental Health Hub',
    description: 'Mood tracking, anxiety management, coping strategies, and crisis planning',
    category: 'mental-health',
    status: 'available',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Crisis plan and emergency contacts work better in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['journal-unified', 'daily-symptoms'],
    conflictsWith: ['mood-tracker'], // This hub includes mood tracking
    allowCustomTitle: true,
    defaultTitle: 'Mental Health Hub',
    alternativeTitles: ['Mental Wellness', 'Emotional Health', 'Mind Care'],
    icon: 'Brain',
    route: '/mental-health',
    consolidatedFrom: ['mood-tracker', 'anxiety-tracker', 'coping-strategies', 'crisis-plan'],
    editions: ['cares', 'command']
  },

  // 📝 JOURNAL & DOCUMENTATION MODULES
  {
    id: 'journal-unified',
    name: 'unified-journal',
    displayName: 'Unified Journal',
    description: 'One journal with optional subdivisions: gratitude, brain dump, victory log, etc.',
    category: 'journal-documentation',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['mental-health-hub', 'visual-diary'],
    allowCustomTitle: true,
    defaultTitle: 'Unified Journal',
    alternativeTitles: ['Daily Journal', 'Life Log', 'Captain\'s Log', 'Personal Diary'],
    icon: 'FileText',
    route: '/journal',
    consolidatedFrom: ['brain-dump', 'gratitude-journal', 'victory-log', 'thought-patterns'],
    editions: ['companion', 'command']
  },

  {
    id: 'visual-diary',
    name: 'visual-daily-diary',
    displayName: 'Visual Documentation',
    description: 'Photo-based symptom documentation integrated with journal',
    category: 'journal-documentation',
    status: 'coming-soon',
    compatibility: {
      pwa: 'pwa-only',
      pdf: 'pdf-friendly',
      notes: 'Photos only work in PWA, PDF gets text summaries'
    },
    showInWebsite: true,
    isPopular: false,
    suggestedWith: ['journal-unified', 'daily-symptoms'],
    allowCustomTitle: true,
    defaultTitle: 'Visual Documentation',
    alternativeTitles: ['Photo Diary', 'Visual Journal', 'Symptom Photos'],
    icon: 'Camera',
    editions: ['cares', 'command']
  },

  // 🎯 LIFE MANAGEMENT MODULES
  {
    id: 'work-life-hub',
    name: 'work-life',
    displayName: 'Work & Life Management',
    description: 'Career tracking, work projects, and professional development',
    category: 'life-management',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['calendar-monthly', 'daily-schedule'],
    allowCustomTitle: true,
    defaultTitle: 'Work & Life Management',
    alternativeTitles: ['Career Tracker', 'Professional Life', 'Work Planning'],
    icon: 'Briefcase',
    route: '/work-life',
    editions: ['companion', 'command']
  },

  // 🎨 FUN & MOTIVATION MODULES
  {
    id: 'fun-motivation-hub',
    name: 'fun-motivation',
    displayName: 'Fun & Motivation',
    description: 'Entertainment tracking, rewards, games, and motivation tools',
    category: 'fun-motivation',
    status: 'available',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Interactive games and rewards work better in PWA, daily fuzzy widget is PWA-only'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['journal-unified', 'mental-health-hub'],
    allowCustomTitle: true,
    defaultTitle: 'Fun & Motivation',
    alternativeTitles: ['Entertainment Hub', 'Rewards & Games', 'Motivation Station'],
    icon: 'Sparkles',
    route: '/fun-motivation',
    editions: ['companion', 'command']
  },

  // 🎯 DAILY WIDGETS (PWA-specific interactive elements)
  {
    id: 'daily-fuzzy-widget',
    name: 'daily-fuzzy',
    displayName: 'Daily Fuzzy Widget',
    description: 'Daily rotating motivational images with cute animals and encouraging messages',
    category: 'fun-motivation',
    status: 'available',
    compatibility: {
      pwa: 'pwa-only',
      pdf: 'full',
      notes: 'Date-specific images and interactivity only work in PWA, PDF gets simple placeholder'
    },
    showInWebsite: false, // This is a widget, not a standalone module
    isPopular: false,
    allowCustomTitle: false,
    defaultTitle: 'Daily Fuzzy',
    icon: 'Heart',
    editions: ['companion', 'command']
  },

  {
    id: 'survival-button-widget',
    name: 'survival-button',
    displayName: 'Survival Button Widget',
    description: 'Interactive encouragement button with cycling goblinisms and celebration effects',
    category: 'fun-motivation',
    status: 'available',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Interactive effects only in PWA, PDF shows static motivational message'
    },
    showInWebsite: false, // This is a widget, not a standalone module
    isPopular: false,
    allowCustomTitle: false,
    defaultTitle: 'Survival Button',
    icon: 'Zap',
    editions: ['cares', 'companion', 'command']
  },

  // 🏥 ADDITIONAL MEDICAL MODULES (from caresv3 reference)
  {
    id: 'daily-symptoms',
    name: 'daily-symptom-aggregate',
    displayName: 'Daily Symptom Aggregate',
    description: 'Pulls from all trackers, shows daily overview with quick-add links',
    category: 'medical-tracking',
    status: 'coming-soon',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Quick-add links and real-time aggregation work better in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['medications', 'mental-health-hub'],
    allowCustomTitle: true,
    defaultTitle: 'Daily Symptom Aggregate',
    alternativeTitles: ['Symptom Dashboard', 'Daily Health Summary', 'Health Overview'],
    icon: 'TrendingUp',
    editions: ['cares', 'command']
  },

  {
    id: 'pain-tracking',
    name: 'pain-tracker',
    displayName: 'Pain & Location Tracking',
    description: 'Body map, severity scales, triggers, treatments',
    category: 'medical-tracking',
    status: 'coming-soon',
    compatibility: {
      pwa: 'pwa-preferred',
      pdf: 'pdf-friendly',
      notes: 'Interactive body map works better in PWA'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['daily-symptoms', 'medications'],
    allowCustomTitle: true,
    defaultTitle: 'Pain & Location Tracking',
    alternativeTitles: ['Pain Tracker', 'Body Map', 'Pain Management'],
    icon: 'Zap',
    editions: ['cares', 'command']
  },

  // 🏥 PHYSICAL HEALTH HUB (existing implementation)
  {
    id: 'physical-health-hub',
    name: 'physical-health',
    displayName: 'Physical Health Hub',
    description: 'Comprehensive physical health tracking and symptom management',
    category: 'medical-tracking',
    status: 'available',
    compatibility: {
      pwa: 'full',
      pdf: 'full',
      notes: 'Works perfectly in both formats - mostly forms and data display'
    },
    showInWebsite: true,
    isPopular: true,
    suggestedWith: ['demographics', 'providers'],
    allowCustomTitle: true,
    defaultTitle: 'Physical Health Hub',
    alternativeTitles: ['Physical Health', 'Health Tracking', 'Symptom Management'],
    icon: 'Heart',
    route: '/physical-health',
    editions: ['cares', 'command']
  },

  // 🔧 UTILITY MODULES
  {
    id: 'settings-hub',
    name: 'settings',
    displayName: 'Settings & Preferences',
    description: 'App configuration, themes, data management, and user preferences',
    category: 'utilities',
    status: 'available',
    compatibility: {
      pwa: 'pwa-only',
      pdf: 'full',
      notes: 'Settings only relevant for PWA, PDF includes preference summary'
    },
    showInWebsite: false, // Not a user-selectable module
    isPopular: false,
    allowCustomTitle: false,
    defaultTitle: 'Settings',
    icon: 'Settings',
    route: '/settings',
    editions: ['cares', 'companion', 'command']
  }
]

/**
 * UTILITY FUNCTIONS
 */

export function getModulesByCategory(category: ModuleCategory): ModuleMetadata[] {
  return MODULE_REGISTRY.filter(module => module.category === category)
}

export function getModuleById(id: string): ModuleMetadata | undefined {
  return MODULE_REGISTRY.find(module => module.id === id)
}

export function getAvailableModules(): ModuleMetadata[] {
  return MODULE_REGISTRY.filter(module => module.status === 'available')
}

export function getPopularModules(): ModuleMetadata[] {
  return MODULE_REGISTRY.filter(module => module.isPopular && module.showInWebsite)
}

export function getModulesForEdition(edition: 'cares' | 'companion' | 'command'): ModuleMetadata[] {
  return MODULE_REGISTRY.filter(module => module.editions.includes(edition))
}

export function getCompatibleModules(moduleId: string): ModuleMetadata[] {
  const module = getModuleById(moduleId)
  if (!module) return []
  
  return MODULE_REGISTRY.filter(other => {
    if (other.id === moduleId) return false
    if (module.conflictsWith?.includes(other.id)) return false
    if (other.conflictsWith?.includes(moduleId)) return false
    return true
  })
}

export function getSuggestedModules(moduleId: string): ModuleMetadata[] {
  const module = getModuleById(moduleId)
  if (!module?.suggestedWith) return []
  
  return module.suggestedWith
    .map(id => getModuleById(id))
    .filter((mod): mod is ModuleMetadata => mod !== undefined)
}

/**
 * CATEGORIES METADATA
 */
export const CATEGORY_INFO = {
  'medical-tracking': {
    name: 'Medical Tracking',
    description: 'Health monitoring, symptoms, providers, and medical management',
    icon: 'Heart',
    color: 'red'
  },
  'planning-calendar': {
    name: 'Planning & Calendar',
    description: 'Scheduling, time management, and calendar views',
    icon: 'Calendar',
    color: 'blue'
  },
  'mental-health': {
    name: 'Mental Health',
    description: 'Mood tracking, emotional wellness, and mental health support',
    icon: 'Brain',
    color: 'purple'
  },
  'life-management': {
    name: 'Life Management',
    description: 'Budgets, chores, projects, and daily life organization',
    icon: 'Home',
    color: 'green'
  },
  'journal-documentation': {
    name: 'Journal & Documentation',
    description: 'Writing, reflection, photo documentation, and memory keeping',
    icon: 'FileText',
    color: 'orange'
  },
  'fun-motivation': {
    name: 'Fun & Motivation',
    description: 'Games, rewards, entertainment tracking, and motivation tools',
    icon: 'Sparkles',
    color: 'pink'
  },
  'utilities': {
    name: 'Utilities',
    description: 'Layout tools, dividers, and structural components',
    icon: 'Settings',
    color: 'gray'
  }
} as const
