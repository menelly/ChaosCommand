/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Single source of truth for the tracker list shown on /manage. Both the
 * /manage page itself and the unified /customize hub read from this so
 * toggle state stays consistent and adding a new tracker only happens once.
 */

import {
  FileText,
  TestTube,
  Briefcase,
  Upload,
  FileImage,
  User,
  Pill,
  Stethoscope,
  Plus,
} from "lucide-react"
import type { ReactNode } from "react"

export const HIDDEN_TRACKERS_KEY = 'chaos-manage-hidden-trackers'

export interface TrackerConfig {
  id: string
  name: string
  shortDescription: string
  helpContent: string
  icon: ReactNode
  status: 'available' | 'coming-soon' | 'planned'
  href: string
  subTrackers?: Array<{ id: string; name: string; icon: string }>
}

export const TRACKERS: TrackerConfig[] = [
  {
    id: 'medications',
    name: 'Medications & Supplements',
    shortDescription: 'Dosing schedules, refill reminders, pharmacy contacts, side effects',
    helpContent: 'Track all your medications and supplements with dosing schedules, refill reminders, pharmacy contacts, and side effect monitoring. Essential for medication management and medical appointments.',
    icon: <Pill className="h-5 w-5" />,
    status: 'available',
    href: '/medications',
  },
  {
    id: 'providers',
    name: 'Healthcare Providers',
    shortDescription: 'Contacts, appointments, therapy notes, specialists',
    helpContent: 'Manage all your healthcare providers including doctors, therapists, vision/dental/hearing specialists. Store contact info with click-to-call and website links, track appointments, link providers to specific conditions.',
    icon: <Stethoscope className="h-5 w-5" />,
    status: 'available',
    href: '/providers',
  },
  {
    id: 'timeline',
    name: '🏆 Medical History & Timeline',
    shortDescription: 'View and filter your full medical timeline',
    helpContent: 'Your complete medical history in one place! Visual timeline view with provider linking, diagnoses, surgeries, hospitalizations, treatments, and labs. Add new entries via "Add to Timeline" or "Import Records".',
    icon: <FileText className="h-5 w-5" />,
    status: 'available',
    href: '/timeline',
  },
  {
    id: 'add',
    name: '➕ Add to Timeline',
    shortDescription: 'Add an event or lab result by hand — works everywhere',
    helpContent: 'Hand-enter a medical event (diagnosis, medication, surgery, appointment, etc.) or a lab result. Lightweight, no model download, works on phone and desktop. Goes straight into your timeline.',
    icon: <Plus className="h-5 w-5" />,
    status: 'available',
    href: '/add',
  },
  {
    id: 'import',
    name: '📥 Import Medical Records',
    shortDescription: 'Upload PDFs, auto-extract events and labs (desktop)',
    helpContent: 'Desktop-only PDF importer. Runs a 64MB local AI model to pull diagnoses, medications, procedures, and lab values out of documents — all on-device, nothing uploaded. Hidden on mobile because the model download is unreliable there.',
    icon: <Upload className="h-5 w-5" />,
    status: 'available',
    href: '/import',
  },
  {
    id: 'demographics',
    name: 'Demographics & Emergency Info',
    shortDescription: 'Personal info and emergency contacts for OCR filtering and safety',
    helpContent: 'Store your personal information and emergency contacts. This data helps filter your personal details from OCR results (so it focuses on prescription data instead of grabbing your name) and keeps emergency contacts easily accessible.',
    icon: <User className="h-5 w-5" />,
    status: 'available',
    href: '/demographics',
    subTrackers: [
      { id: 'personal-info', name: 'Personal Information', icon: '👤' },
      { id: 'emergency-contacts', name: 'Emergency Contacts', icon: '📞' },
      { id: 'medical-info', name: 'Medical Information', icon: '🏥' },
      { id: 'ocr-filtering', name: 'OCR Privacy Filter', icon: '🛡️' },
    ],
  },
  {
    id: 'lab-results',
    name: 'Lab Results & Tests',
    shortDescription: 'Upload lab reports, track values and trends, catch what "normal" is hiding',
    helpContent: 'Upload lab report PDFs for automatic extraction of test values, reference ranges, and flags. Track trends over time — see your ferritin going 7, 8, 9 across months. Abnormal results highlighted. No hardcoded test lists — the NLP finds what matters.',
    icon: <TestTube className="h-5 w-5" />,
    status: 'available',
    href: '/lab-results',
  },
  {
    id: 'work-disability',
    name: 'Missed Work & Disability',
    shortDescription: 'Missed work tracking, employment history, SSDI applications, accommodations',
    helpContent: 'Track missed work days with impact levels and total limitation flags. Employment history with accommodation tracking (requested vs received). SSDI/disability application management with deadline tracking. Built-in SSDI education guide. Weaponize your paperwork.',
    icon: <Briefcase className="h-5 w-5" />,
    status: 'available',
    href: '/work-disability',
    subTrackers: [
      { id: 'missed-days', name: 'Missed Work Days', icon: '📅' },
      { id: 'employment', name: 'Employment History', icon: '🏢' },
      { id: 'disability-apps', name: 'SSDI / Applications', icon: '📝' },
      { id: 'ssdi-guide', name: 'SSDI Guide', icon: '📚' },
    ],
  },
  {
    id: 'gaslight-garage',
    name: 'Gaslight Garage',
    shortDescription: '"No REALLY, and I have proof" — your medical evidence locker',
    helpContent: 'Store photos, screenshots, and documents that prove what happened. Rashes that got dismissed, patient portal messages, before/after images, lab results that contradict what you were told. Your receipts, organized and ready to deploy.',
    icon: <FileImage className="h-5 w-5" />,
    status: 'available',
    href: '/gaslight-garage',
  },
]
