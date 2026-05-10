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
 * 🎛️ USER CONFIGURATION SCHEMA
 * 
 * Standardized configuration structure for the website configurator.
 * This schema defines how user selections and customizations are stored
 * and transmitted between the website, PWA, and PDF generation systems.
 * 
 * Key Features:
 * - Website configurator output format
 * - PWA configuration import/export
 * - PDF generation parameters
 * - Theme and customization settings
 * - Module selection and arrangement
 */

import { ModuleCategory } from './module-registry'

export type ProductFormat = 'pwa' | 'pdf' | 'both'
export type ThemePreset = 'minimalist' | 'creative' | 'chaos-goblin' | 'custom'
export type Edition = 'cares' | 'companion' | 'command'

/**
 * THEME CUSTOMIZATION
 */
export interface ThemeCustomization {
  preset: ThemePreset
  
  // Color scheme
  colors?: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  
  // Typography
  fonts?: {
    heading: string
    body: string
    accent: string
  }
  
  // Custom branding
  customTitle?: string // Override "Chaos Command Center"
  customSubtitle?: string
  customLogo?: string // Base64 or URL
  
  // Personality mode
  personalityMode: 'minimalist' | 'fun' | 'chaos'
  
  // Custom CSS (advanced users)
  customCSS?: string
}

/**
 * MODULE CONFIGURATION
 */
export interface ModuleConfiguration {
  moduleId: string
  
  // Customization
  customTitle?: string // Override default module title
  isEnabled: boolean
  
  // Layout (for PWA)
  position?: {
    x: number
    y: number
    width: number
    height: number
    page?: number
  }
  
  // Module-specific settings
  settings?: Record<string, any>
  
  // PDF-specific overrides
  pdfSettings?: {
    includeInPDF: boolean
    pdfTitle?: string
    pdfLayout?: 'full-page' | 'half-page' | 'quarter-page'
    pageBreakBefore?: boolean
  }
}

/**
 * LAYOUT PREFERENCES
 */
export interface LayoutPreferences {
  // PWA Layout
  pwa?: {
    sidebarPosition: 'left' | 'right' | 'hidden'
    defaultView: 'dashboard' | 'calendar' | 'custom'
    compactMode: boolean
    showHelpButtons: boolean
  }
  
  // PDF Layout
  pdf?: {
    pageSize: 'A4' | 'Letter' | 'A5' | 'Custom'
    orientation: 'portrait' | 'landscape'
    margins: {
      top: number
      right: number
      bottom: number
      left: number
    }
    includeIndex: boolean
    includePageNumbers: boolean
    startDate?: string // For dated planners
    monthCount?: number // How many months to generate
  }
}

/**
 * ACCESSIBILITY PREFERENCES
 */
export interface AccessibilityPreferences {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReaderOptimized: boolean
  keyboardNavigationEnhanced: boolean
  colorBlindFriendly: boolean
}

/**
 * PRIVACY & DATA PREFERENCES
 */
export interface PrivacyPreferences {
  dataStorage: 'local-only' | 'cloud-sync' | 'hybrid'
  analyticsOptIn: boolean
  crashReportingOptIn: boolean
  shareUsageData: boolean
  
  // Medical data specific
  medicalDataEncryption: boolean
  emergencyDataAccess: boolean // Allow emergency contacts to access critical info
}

/**
 * MAIN USER CONFIGURATION
 */
export interface UserConfiguration {
  // Metadata
  configVersion: string // For future compatibility
  createdAt: string
  updatedAt: string
  configId: string // Unique identifier
  
  // Product Selection
  productFormat: ProductFormat
  edition: Edition
  
  // User Info (optional, for personalization)
  userInfo?: {
    name?: string
    timezone?: string
    preferredLanguage?: string
  }
  
  // Theme & Appearance
  theme: ThemeCustomization
  
  // Module Selection & Configuration
  modules: ModuleConfiguration[]
  enabledCategories: ModuleCategory[]
  
  // Layout & Preferences
  layout: LayoutPreferences
  accessibility: AccessibilityPreferences
  privacy: PrivacyPreferences
  
  // Website Purchase Info (for licensing)
  purchaseInfo?: {
    orderId: string
    purchaseDate: string
    licenseKey: string
    customerEmail: string
  }
  
  // Advanced Customizations
  advanced?: {
    customModules?: any[] // For future custom module support
    apiIntegrations?: Record<string, any> // For future integrations
    automationRules?: any[] // For future automation features
  }
}

/**
 * CONFIGURATION PRESETS
 * Pre-built configurations for common use cases
 */
export const CONFIGURATION_PRESETS: Record<string, Partial<UserConfiguration>> = {
  'medical-focused': {
    edition: 'cares',
    enabledCategories: ['medical-tracking', 'mental-health', 'journal-documentation'],
    theme: {
      preset: 'minimalist',
      personalityMode: 'minimalist',
      colors: {
        primary: '#dc2626', // Medical red
        secondary: '#1f2937',
        accent: '#059669',
        background: '#ffffff',
        text: '#111827'
      }
    }
  },
  
  'planning-focused': {
    edition: 'companion',
    enabledCategories: ['planning-calendar', 'life-management', 'journal-documentation'],
    theme: {
      preset: 'creative',
      personalityMode: 'fun',
      colors: {
        primary: '#2563eb', // Planning blue
        secondary: '#7c3aed',
        accent: '#059669',
        background: '#ffffff',
        text: '#111827'
      }
    }
  },
  
  'everything-chaos': {
    edition: 'command',
    enabledCategories: ['medical-tracking', 'planning-calendar', 'mental-health', 'life-management', 'journal-documentation', 'fun-motivation'],
    theme: {
      preset: 'chaos-goblin',
      personalityMode: 'chaos',
      colors: {
        primary: '#7c3aed', // Chaos purple
        secondary: '#ec4899',
        accent: '#f59e0b',
        background: '#1f2937',
        text: '#f9fafb'
      }
    }
  }
}

/**
 * VALIDATION FUNCTIONS
 */
export function validateUserConfiguration(config: UserConfiguration): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields
  if (!config.configVersion) errors.push('Config version is required')
  if (!config.edition) errors.push('Edition selection is required')
  if (!config.productFormat) errors.push('Product format is required')
  if (!config.modules || config.modules.length === 0) errors.push('At least one module must be selected')
  
  // Module validation
  config.modules.forEach((module, index) => {
    if (!module.moduleId) errors.push(`Module ${index} is missing moduleId`)
    if (typeof module.isEnabled !== 'boolean') errors.push(`Module ${index} isEnabled must be boolean`)
  })
  
  // Theme validation
  if (!config.theme.preset) errors.push('Theme preset is required')
  if (!config.theme.personalityMode) errors.push('Personality mode is required')
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function createDefaultConfiguration(edition: Edition = 'command'): UserConfiguration {
  const now = new Date().toISOString()
  
  return {
    configVersion: '1.0.0',
    createdAt: now,
    updatedAt: now,
    configId: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    productFormat: 'both',
    edition,
    
    theme: {
      preset: 'creative',
      personalityMode: 'fun'
    },
    
    modules: [],
    enabledCategories: edition === 'cares' 
      ? ['medical-tracking', 'mental-health']
      : edition === 'companion'
      ? ['planning-calendar', 'life-management', 'journal-documentation']
      : ['medical-tracking', 'planning-calendar', 'mental-health', 'life-management', 'journal-documentation'],
    
    layout: {
      pwa: {
        sidebarPosition: 'left',
        defaultView: 'dashboard',
        compactMode: false,
        showHelpButtons: true
      },
      pdf: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        includeIndex: true,
        includePageNumbers: true,
        monthCount: 12
      }
    },
    
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      keyboardNavigationEnhanced: false,
      colorBlindFriendly: false
    },
    
    privacy: {
      dataStorage: 'local-only',
      analyticsOptIn: false,
      crashReportingOptIn: false,
      shareUsageData: false,
      medicalDataEncryption: true,
      emergencyDataAccess: false
    }
  }
}

/**
 * EXPORT/IMPORT UTILITIES
 */
export function exportConfiguration(config: UserConfiguration): string {
  return JSON.stringify(config, null, 2)
}

export function importConfiguration(configJson: string): UserConfiguration {
  const config = JSON.parse(configJson) as UserConfiguration
  const validation = validateUserConfiguration(config)
  
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`)
  }
  
  return config
}
