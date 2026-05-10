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
"use client"

import { useState } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  FileText,
  TestTube,
  Users,
  Home,
  Briefcase,
  Upload,
  Calendar,
  Clock,
  HelpCircle,
  FileImage,
  User,
  Pill,
  Stethoscope
} from "lucide-react"

interface TrackerButton {
  id: string
  name: string
  shortDescription: string
  helpContent: string
  icon: React.ReactNode
  status: 'available' | 'coming-soon' | 'planned'
  subTrackers?: Array<{id: string, name: string, icon: string}>
}

export default function WorkLifeIndex() {
  const trackers: TrackerButton[] = [
    // MEDICATIONS & SUPPLEMENTS
    {
      id: 'medications',
      name: 'Medications & Supplements',
      shortDescription: 'Dosing schedules, refill reminders, pharmacy contacts, side effects',
      helpContent: 'Track all your medications and supplements with dosing schedules, refill reminders, pharmacy contacts, and side effect monitoring. Essential for medication management and medical appointments.',
      icon: <Pill className="h-5 w-5" />,
      status: 'available'
    },

    // HEALTHCARE PROVIDERS
    {
      id: 'providers',
      name: 'Healthcare Providers',
      shortDescription: 'Contacts, appointments, therapy notes, specialists',
      helpContent: 'Manage all your healthcare providers including doctors, therapists, vision/dental/hearing specialists. Store contact info with click-to-call and website links, track appointments, link providers to specific conditions.',
      icon: <Stethoscope className="h-5 w-5" />,
      status: 'available'
    },

    // DIAGNOSES & TIMELINE
    {
      id: 'timeline',
      name: '🏆 Diagnoses & Timeline',
      shortDescription: 'Interactive medical timeline with provider linking',
      helpContent: 'Revolutionary interconnected medical timeline! Track diagnoses, surgeries, hospitalizations, and treatments with visual timeline view. Links directly to your healthcare providers for complete medical journey visualization.',
      icon: <FileText className="h-5 w-5" />,
      status: 'available'
    },

    // DEMOGRAPHICS & EMERGENCY INFO
    {
      id: 'demographics',
      name: 'Demographics & Emergency Info',
      shortDescription: 'Personal info and emergency contacts for OCR filtering and safety',
      helpContent: 'Store your personal information and emergency contacts. This data helps filter your personal details from OCR results (so it focuses on prescription data instead of grabbing your name) and keeps emergency contacts easily accessible.',
      icon: <User className="h-5 w-5" />,
      status: 'available',
      subTrackers: [
        { id: 'personal-info', name: 'Personal Information', icon: '👤' },
        { id: 'emergency-contacts', name: 'Emergency Contacts', icon: '📞' },
        { id: 'medical-info', name: 'Medical Information', icon: '🏥' },
        { id: 'ocr-filtering', name: 'OCR Privacy Filter', icon: '🛡️' }
      ]
    },

    // MEDICAL HISTORY & RECORDS
    {
      id: 'medical-history',
      name: 'Medical History',
      shortDescription: 'Past procedures, surgeries, major events with document uploads',
      helpContent: 'Comprehensive medical history tracking with timeline integration. Upload and store record scans, insurance cards, and important documents. Links to timeline for historical data - not just major events, but all medical interactions you want to remember.',
      icon: <FileText className="h-5 w-5" />,
      status: 'coming-soon',
      subTrackers: [
        { id: 'procedures', name: 'Procedures & Surgeries', icon: '🏥' },
        { id: 'document-uploads', name: 'Document Uploads', icon: '📄' },
        { id: 'insurance-cards', name: 'Insurance Cards', icon: '💳' },
        { id: 'timeline-integration', name: 'Timeline Integration', icon: '📅' }
      ]
    },
    {
      id: 'lab-results',
      name: 'Lab Results & Tests',
      shortDescription: 'Test results, trends, reference ranges',
      helpContent: 'Track lab results over time with trend analysis and reference range comparisons. Upload lab reports, track patterns, and monitor changes. Perfect for chronic conditions requiring regular monitoring.',
      icon: <TestTube className="h-5 w-5" />,
      status: 'coming-soon'
    },
    {
      id: 'family-history',
      name: 'Family History',
      shortDescription: 'Genetic health information (optional)',
      helpContent: 'Optional family health history tracking for genetic information. Completely optional - this can be skipped if not relevant or triggering. Useful for medical appointments when family history is requested.',
      icon: <Users className="h-5 w-5" />,
      status: 'planned'
    },

    // HOUSEHOLD MANAGEMENT
    {
      id: 'chore-chart',
      name: 'Chore Chart & Adulting',
      shortDescription: 'Household tasks with "normal people" guidance and reminders',
      helpContent: 'Household task management with built-in guidance for neurodivergent folks who weren\'t taught basic adulting skills. Includes default schedules like "most people change sheets weekly" and optional reminders. Perfect for learning and maintaining household routines.',
      icon: <Home className="h-5 w-5" />,
      status: 'coming-soon',
      subTrackers: [
        { id: 'task-tracking', name: 'Task Tracking', icon: '✅' },
        { id: 'adulting-guidance', name: 'Adulting Guidance', icon: '📚' },
        { id: 'reminder-system', name: 'Gentle Reminders', icon: '🔔' },
        { id: 'routine-building', name: 'Routine Building', icon: '🔄' }
      ]
    },

    // WORK & DISABILITY
    {
      id: 'missed-work',
      name: 'Missed Work & Disability',
      shortDescription: 'FMLA, accommodations, disability applications',
      helpContent: 'Comprehensive work and disability tracking including missed work days, FMLA usage, accommodation requests, and disability application progress. Essential for chronic illness and disability management.',
      icon: <Briefcase className="h-5 w-5" />,
      status: 'coming-soon',
      subTrackers: [
        { id: 'missed-days', name: 'Missed Work Days', icon: '📅' },
        { id: 'fmla-tracking', name: 'FMLA Tracking', icon: '📋' },
        { id: 'accommodations', name: 'Accommodations', icon: '♿' },
        { id: 'disability-apps', name: 'Disability Applications', icon: '📝' }
      ]
    },

    // EMPLOYMENT & CAREER
    {
      id: 'employment-history',
      name: 'Employment History',
      shortDescription: 'Job history, references, resume building',
      helpContent: 'Track employment history, maintain reference contacts, and build/update resumes. Useful for job applications and keeping career information organized.',
      icon: <Briefcase className="h-5 w-5" />,
      status: 'planned'
    },

    // DOCUMENT MANAGEMENT
    {
      id: 'document-vault',
      name: 'Document Vault',
      shortDescription: 'Important document storage and organization',
      helpContent: 'Secure storage for important documents like birth certificates, passports, insurance papers, and other critical life documents. Organized and searchable.',
      icon: <FileImage className="h-5 w-5" />,
      status: 'planned'
    }
  ]

  const getTrackerHref = (trackerId: string): string => {
    // Handle specific tracker navigation
    if (trackerId === 'medications') {
      return '/medications'
    }

    if (trackerId === 'providers') {
      return '/providers'
    }

    if (trackerId === 'timeline') {
      return '/timeline'
    }

    if (trackerId === 'demographics') {
      return '/demographics'
    }

    // Default fallback
    return '#'
  }

  return (
    <AppCanvas currentPage="work-life">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Briefcase className="h-8 w-8 text-orange-500" />
            Manage
          </h1>
          <p className="text-lg text-muted-foreground">
            Adulting support for humans who need life management help
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackers.map((tracker) => (
            <a
              key={tracker.id}
              href={getTrackerHref(tracker.id)}
              className="block"
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">
                      {tracker.icon}
                    </div>
                    <CardTitle className="text-base leading-tight">{tracker.name}</CardTitle>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {tracker.icon}
                          {tracker.name}
                        </DialogTitle>
                        <DialogDescription className="text-left">
                          {tracker.helpContent}
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
                <CardDescription className="text-sm mt-2">
                  {tracker.shortDescription}
                </CardDescription>
                
                {/* Sub-trackers */}
                {tracker.subTrackers && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-muted-foreground">Includes:</div>
                    <div className="grid grid-cols-2 gap-1">
                      {tracker.subTrackers.map((sub) => (
                        <div key={sub.id} className="text-xs p-1 rounded bg-muted/50">
                          {sub.icon} {sub.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>
            </a>
          ))}
        </div>

        {/* HELP SECTION */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Life Management Help
            </CardTitle>
            <CardDescription>
              Comprehensive guides for adulting, work management, and life organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              📖 Open Life Management Guide
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <a href="/">
              ← Back to Command Center
            </a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
