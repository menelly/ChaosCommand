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
 * 🔄 COMPATIBILITY MATRIX
 * 
 * Defines what features work where and how to handle limitations.
 * This matrix helps the website configurator show appropriate warnings
 * and helps the PDF generator know what to include/exclude.
 * 
 * Key Features:
 * - PWA vs PDF feature compatibility
 * - Graceful degradation strategies
 * - User-friendly limitation explanations
 * - Alternative suggestions for limited features
 */

import { ModuleMetadata, getModuleById } from './module-registry'

export type FeatureType = 
  | 'interactive'      // Buttons, forms, real-time updates
  | 'notification'     // Alerts, reminders, push notifications
  | 'media'           // Photos, videos, audio
  | 'connectivity'    // Click-to-call, external links, API calls
  | 'realtime'        // Live data, auto-refresh, sync
  | 'storage'         // Database writes, file uploads
  | 'navigation'      // Internal app navigation, deep links
  | 'accessibility'   // Screen reader, keyboard nav enhancements

export interface FeatureCompatibility {
  featureType: FeatureType
  pwaSupport: 'full' | 'partial' | 'none'
  pdfSupport: 'full' | 'partial' | 'none'
  
  // What happens in PDF when PWA feature isn't available
  pdfFallback?: {
    strategy: 'hide' | 'static' | 'placeholder' | 'alternative'
    description: string
    alternativeText?: string
  }
  
  // User-friendly explanation
  userExplanation: {
    limitation: string
    workaround?: string
    recommendation?: string
  }
}

/**
 * FEATURE COMPATIBILITY DEFINITIONS
 */
export const FEATURE_COMPATIBILITY: Record<FeatureType, FeatureCompatibility> = {
  interactive: {
    featureType: 'interactive',
    pwaSupport: 'full',
    pdfSupport: 'none',
    pdfFallback: {
      strategy: 'static',
      description: 'Interactive elements become static text or checkboxes',
      alternativeText: '☐ (checkbox for manual completion)'
    },
    userExplanation: {
      limitation: 'Buttons and forms don\'t work in PDF',
      workaround: 'PDF includes checkboxes and blank spaces for manual completion',
      recommendation: 'Use PWA for interactive features, PDF for planning templates'
    }
  },

  notification: {
    featureType: 'notification',
    pwaSupport: 'full',
    pdfSupport: 'none',
    pdfFallback: {
      strategy: 'placeholder',
      description: 'Reminder settings shown as reference text',
      alternativeText: '⏰ Reminder: [Set your own alarm]'
    },
    userExplanation: {
      limitation: 'PDF can\'t send notifications or reminders',
      workaround: 'PDF shows reminder schedules for you to set up manually',
      recommendation: 'Use PWA for automatic reminders, PDF as backup reference'
    }
  },

  media: {
    featureType: 'media',
    pwaSupport: 'full',
    pdfSupport: 'partial',
    pdfFallback: {
      strategy: 'placeholder',
      description: 'Photo placeholders with space for printed photos',
      alternativeText: '📷 [Photo space - attach printed photo here]'
    },
    userExplanation: {
      limitation: 'PDF can\'t store or display photos directly',
      workaround: 'PDF includes spaces to tape or staple printed photos',
      recommendation: 'Use PWA for digital photos, PDF for physical photo organization'
    }
  },

  connectivity: {
    featureType: 'connectivity',
    pwaSupport: 'full',
    pdfSupport: 'partial',
    pdfFallback: {
      strategy: 'static',
      description: 'Phone numbers and links shown as text',
      alternativeText: 'Phone: [number] (dial manually)'
    },
    userExplanation: {
      limitation: 'PDF links don\'t click-to-call or auto-open',
      workaround: 'All contact info is clearly displayed for manual dialing',
      recommendation: 'Use PWA for quick calling, PDF as contact reference sheet'
    }
  },

  realtime: {
    featureType: 'realtime',
    pwaSupport: 'full',
    pdfSupport: 'none',
    pdfFallback: {
      strategy: 'static',
      description: 'Shows data as of PDF generation time',
      alternativeText: 'Data as of: [generation date]'
    },
    userExplanation: {
      limitation: 'PDF shows a snapshot, doesn\'t update automatically',
      workaround: 'PDF includes generation date for reference',
      recommendation: 'Use PWA for live data, PDF for periodic snapshots'
    }
  },

  storage: {
    featureType: 'storage',
    pwaSupport: 'full',
    pdfSupport: 'none',
    pdfFallback: {
      strategy: 'placeholder',
      description: 'Blank spaces for handwritten entries',
      alternativeText: '_____________________ (write here)'
    },
    userExplanation: {
      limitation: 'PDF can\'t save data digitally',
      workaround: 'PDF provides spaces for handwritten notes and entries',
      recommendation: 'Use PWA for digital tracking, PDF for offline/backup recording'
    }
  },

  navigation: {
    featureType: 'navigation',
    pwaSupport: 'full',
    pdfSupport: 'partial',
    pdfFallback: {
      strategy: 'alternative',
      description: 'Page references and index instead of clickable links',
      alternativeText: 'See page [X] for details'
    },
    userExplanation: {
      limitation: 'PDF navigation uses page numbers instead of clicking',
      workaround: 'PDF includes detailed index and page references',
      recommendation: 'Both formats work well - PDF is actually great for flipping through pages'
    }
  },

  accessibility: {
    featureType: 'accessibility',
    pwaSupport: 'full',
    pdfSupport: 'partial',
    pdfFallback: {
      strategy: 'alternative',
      description: 'High contrast and large text options available',
      alternativeText: 'PDF optimized for screen readers and high contrast printing'
    },
    userExplanation: {
      limitation: 'PDF accessibility features are more limited',
      workaround: 'PDF can be generated with high contrast and large text',
      recommendation: 'PWA offers better accessibility, but PDF works with screen readers'
    }
  }
}

/**
 * MODULE-SPECIFIC COMPATIBILITY ANALYSIS
 */
export interface ModuleCompatibilityAnalysis {
  moduleId: string
  moduleName: string
  
  // Overall compatibility
  pwaScore: number // 0-100, how well it works in PWA
  pdfScore: number // 0-100, how well it works in PDF
  
  // Feature breakdown
  features: {
    featureType: FeatureType
    isUsed: boolean
    impact: 'high' | 'medium' | 'low' // How much this affects the module
    fallbackQuality: 'excellent' | 'good' | 'fair' | 'poor'
  }[]
  
  // User-facing summary
  summary: {
    pwaStrengths: string[]
    pdfStrengths: string[]
    pdfLimitations: string[]
    recommendation: string
  }
}

/**
 * ANALYZE MODULE COMPATIBILITY
 */
export function analyzeModuleCompatibility(moduleId: string): ModuleCompatibilityAnalysis | null {
  const module = getModuleById(moduleId)
  if (!module) return null

  // Define what features each module type typically uses
  const moduleFeatures = getModuleFeatures(module)
  
  // Calculate scores
  let pwaScore = 100 // PWA always gets full score for its features
  let pdfScore = 100
  
  const featureAnalysis = moduleFeatures.map(feature => {
    const compatibility = FEATURE_COMPATIBILITY[feature.featureType]
    
    // Reduce PDF score based on feature limitations
    if (feature.isUsed && feature.impact === 'high') {
      if (compatibility.pdfSupport === 'none') pdfScore -= 30
      else if (compatibility.pdfSupport === 'partial') pdfScore -= 15
    } else if (feature.isUsed && feature.impact === 'medium') {
      if (compatibility.pdfSupport === 'none') pdfScore -= 20
      else if (compatibility.pdfSupport === 'partial') pdfScore -= 10
    } else if (feature.isUsed && feature.impact === 'low') {
      if (compatibility.pdfSupport === 'none') pdfScore -= 10
      else if (compatibility.pdfSupport === 'partial') pdfScore -= 5
    }

    return {
      featureType: feature.featureType,
      isUsed: feature.isUsed,
      impact: feature.impact,
      fallbackQuality: getFallbackQuality(compatibility, feature.impact)
    }
  })

  // Generate user-friendly summary
  const summary = generateCompatibilitySummary(module, featureAnalysis)

  return {
    moduleId,
    moduleName: module.displayName,
    pwaScore: Math.max(0, pwaScore),
    pdfScore: Math.max(0, pdfScore),
    features: featureAnalysis,
    summary
  }
}

/**
 * HELPER FUNCTIONS
 */
function getModuleFeatures(module: ModuleMetadata): { featureType: FeatureType; isUsed: boolean; impact: 'high' | 'medium' | 'low' }[] {
  // This would be expanded based on actual module implementations
  // For now, we'll make educated guesses based on module categories
  
  const baseFeatures: { featureType: FeatureType; isUsed: boolean; impact: 'high' | 'medium' | 'low' }[] = [
    { featureType: 'storage', isUsed: true, impact: 'high' }, // All modules store data
    { featureType: 'accessibility', isUsed: true, impact: 'medium' } // All modules should be accessible
  ]

  // Add category-specific features
  switch (module.category) {
    case 'medical-tracking':
      return [
        ...baseFeatures,
        { featureType: 'connectivity', isUsed: true, impact: 'high' }, // Click-to-call providers
        { featureType: 'notification', isUsed: true, impact: 'high' }, // Medication reminders
        { featureType: 'media', isUsed: true, impact: 'medium' }, // Symptom photos
        { featureType: 'interactive', isUsed: true, impact: 'medium' } // Forms and buttons
      ]
    
    case 'planning-calendar':
      return [
        ...baseFeatures,
        { featureType: 'interactive', isUsed: true, impact: 'high' }, // Date picking, event creation
        { featureType: 'navigation', isUsed: true, impact: 'medium' }, // Month/week/day navigation
        { featureType: 'notification', isUsed: true, impact: 'medium' } // Event reminders
      ]
    
    case 'mental-health':
      return [
        ...baseFeatures,
        { featureType: 'interactive', isUsed: true, impact: 'high' }, // Mood tracking, forms
        { featureType: 'connectivity', isUsed: true, impact: 'high' }, // Crisis contacts
        { featureType: 'notification', isUsed: true, impact: 'medium' } // Check-in reminders
      ]
    
    default:
      return [
        ...baseFeatures,
        { featureType: 'interactive', isUsed: true, impact: 'medium' }
      ]
  }
}

function getFallbackQuality(compatibility: FeatureCompatibility, impact: 'high' | 'medium' | 'low'): 'excellent' | 'good' | 'fair' | 'poor' {
  if (compatibility.pdfSupport === 'full') return 'excellent'
  if (compatibility.pdfSupport === 'partial') {
    return impact === 'high' ? 'fair' : 'good'
  }
  // pdfSupport === 'none'
  if (compatibility.pdfFallback?.strategy === 'alternative') return 'good'
  if (compatibility.pdfFallback?.strategy === 'static') return 'fair'
  return 'poor'
}

function generateCompatibilitySummary(module: ModuleMetadata, features: any[]): ModuleCompatibilityAnalysis['summary'] {
  const pwaStrengths = ['Full interactivity', 'Real-time updates', 'Automatic reminders']
  const pdfStrengths = ['Printable format', 'No battery required', 'Works offline always']
  const pdfLimitations: string[] = []
  
  // Add specific limitations based on features
  features.forEach((feature: any) => {
    const compatibility = FEATURE_COMPATIBILITY[feature.featureType as FeatureType]
    if (feature.isUsed && compatibility.pdfSupport === 'none') {
      pdfLimitations.push(compatibility.userExplanation.limitation)
    }
  })

  // Generate recommendation
  let recommendation = 'Both formats work well for different use cases.'
  if (module.category === 'medical-tracking') {
    recommendation = 'PWA recommended for daily use, PDF excellent as emergency backup.'
  } else if (module.category === 'planning-calendar') {
    recommendation = 'Both formats excellent - choose based on digital vs paper preference.'
  }

  return {
    pwaStrengths,
    pdfStrengths,
    pdfLimitations: [...new Set(pdfLimitations)], // Remove duplicates
    recommendation
  }
}

/**
 * BATCH ANALYSIS FOR WEBSITE CONFIGURATOR
 */
export function analyzeConfigurationCompatibility(moduleIds: string[]): {
  overallPwaScore: number
  overallPdfScore: number
  moduleAnalyses: ModuleCompatibilityAnalysis[]
  recommendations: string[]
} {
  const analyses = moduleIds
    .map(id => analyzeModuleCompatibility(id))
    .filter((analysis): analysis is ModuleCompatibilityAnalysis => analysis !== null)

  const overallPwaScore = analyses.length > 0 
    ? Math.round(analyses.reduce((sum, a) => sum + a.pwaScore, 0) / analyses.length)
    : 100

  const overallPdfScore = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.pdfScore, 0) / analyses.length)
    : 100

  const recommendations: string[] = []
  
  if (overallPdfScore < 70) {
    recommendations.push('Consider PWA format for the best experience with your selected modules.')
  }
  if (overallPdfScore > 85) {
    recommendations.push('Your selection works great in PDF format!')
  }
  if (analyses.some(a => a.features.some(f => f.featureType === 'media' && f.isUsed))) {
    recommendations.push('Photo features work best in PWA, but PDF includes spaces for printed photos.')
  }

  return {
    overallPwaScore,
    overallPdfScore,
    moduleAnalyses: analyses,
    recommendations
  }
}
