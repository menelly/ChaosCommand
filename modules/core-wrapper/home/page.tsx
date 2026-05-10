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
import SurvivalButton from "@/components/survival-button"
import DailyFuzzyWidget from "@/components/daily-fuzzy-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  Brain,
  Calendar,
  Target,
  Settings,
  FileText,
  Pill,
  Stethoscope,
  Users,
  TrendingUp,
  Camera,
  Briefcase,
  Utensils,
  DollarSign,
  CheckSquare,
  BookOpen,
  Home,
  Sparkles,
  Shield,
  Activity,
  Moon,
  Eye,
  Cloud,
  AlertTriangle,
  Ear,
  Phone,
  Clock,
  Plane,
  Palette,
  MessageSquare,
  Smartphone,
  Database
} from "lucide-react"

interface TrackerItem {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: 'available' | 'coming-soon' | 'planned'
  consolidatedFrom?: string[]
}

interface TrackerCategory {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  trackers: TrackerItem[]
}

export default function CompendiumIndex() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [deviceOverride, setDeviceOverride] = useState<'desktop' | 'tablet' | 'mobile' | null>(null)

  // Apply device override classes
  const getDeviceClasses = () => {
    if (deviceOverride === 'mobile') return 'max-w-sm mx-auto'
    if (deviceOverride === 'tablet') return 'max-w-2xl mx-auto'
    return '' // desktop - full width
  }

  const categories: TrackerCategory[] = [
    {
      id: 'physical-health',
      title: 'Physical Health',
      description: 'Medical tracking, symptoms, and physical wellness',
      icon: <Heart className="h-6 w-6" />,
      trackers: [
        {
          id: 'medications',
          name: 'Medications & Supplements',
          description: 'Dosing, refill reminders, side effects. Includes immunizations.',
          icon: <Pill className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['medications', 'immunizations', 'side-effects']
        },
        {
          id: 'providers',
          name: 'Healthcare Providers',
          description: 'Contacts, appointments, therapy notes. Click-to-call integration.',
          icon: <Stethoscope className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['providers', 'appointments', 'therapy-notes']
        },
        {
          id: 'daily-symptoms',
          name: 'Daily Symptom Aggregate',
          description: 'Pulls from all trackers, shows daily overview with quick-add links.',
          icon: <TrendingUp className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'diagnoses',
          name: 'Diagnoses & Timeline',
          description: 'Condition management with historical timeline. Export by doctor tag.',
          icon: <FileText className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'pain-tracking',
          name: 'Pain & Location Tracking',
          description: 'Body map, severity scales, triggers, treatments.',
          icon: <Heart className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'vitals',
          name: 'Vitals & Lab Results',
          description: 'BP, HR, glucose, lab trends. Health app integration if possible.',
          icon: <Activity className="h-5 w-5" />,
          status: 'coming-soon'
        },
        {
          id: 'allergies',
          name: 'Allergies & Environmental',
          description: 'Food allergies separate from environmental. Weather impact tracking.',
          icon: <Shield className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['food-allergies', 'environmental-allergies', 'weather-impact']
        },
        {
          id: 'reproductive-health',
          name: 'Reproductive Health',
          description: 'Menstrual cycle, fertility tracking. Gender-neutral, hideable.',
          icon: <Heart className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['menstrual-cycle', 'fertility']
        },
        {
          id: 'medical-history',
          name: 'Medical History & Records',
          description: 'Procedures, surgeries, record scans. Timeline integration.',
          icon: <FileText className="h-5 w-5" />,
          status: 'coming-soon',
          consolidatedFrom: ['medical-history', 'hospital-visits', 'procedures']
        },
        {
          id: 'dental-vision',
          name: 'Dental & Vision Care',
          description: 'Specialized provider tracking for dental, vision, hearing.',
          icon: <Eye className="h-5 w-5" />,
          status: 'planned'
        }
      ]
    },
    {
      id: 'mental-health',
      title: 'Mind',
      description: 'Mental health, emotional regulation, neurodivergent support, and personal control',
      icon: <Brain className="h-6 w-6" />,
      trackers: [
        {
          id: 'mental-health',
          name: 'Mental Health Tracking',
          description: 'Mood, anxiety, depression patterns with therapy integration.',
          icon: <Brain className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'brain-fog',
          name: 'Brain Fog & Cognitive',
          description: 'Word-finding, memory issues, cognitive tracking.',
          icon: <Cloud className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'panic-meltdowns',
          name: 'Crisis Management',
          description: 'Panic, meltdowns, triggers, coping strategies, regulation tools.',
          icon: <AlertTriangle className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['panic-tracker', 'meltdowns', 'regulation-tools', 'coping-strategies']
        },
        {
          id: 'sensory-overload',
          name: 'Sensory Processing',
          description: 'Sensory overload, preferences, environment tracking.',
          icon: <Ear className="h-5 w-5" />,
          status: 'available',
          consolidatedFrom: ['sensory-overload', 'sensory-preferences']
        },
        {
          id: 'crisis-plan',
          name: 'Crisis Plan',
          description: 'Emergency contacts, strategies. Option to show on app open.',
          icon: <Phone className="h-5 w-5" />,
          status: 'coming-soon'
        },
        {
          id: 'control',
          name: 'Control',
          description: 'Sleep, hydration, movement, pacing - things entirely within YOUR control.',
          icon: <Heart className="h-5 w-5" />,
          status: 'available'
        }
      ]
    },
    {
      id: 'planning',
      title: 'Planning & Productivity',
      description: 'Calendars, tasks, goals, and life organization',
      icon: <Calendar className="h-6 w-6" />,
      trackers: [
        {
          id: 'calendar',
          name: 'Calendar System',
          description: 'Monthly/weekly/daily views. Dynamic generation from install date.',
          icon: <Calendar className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'tasks',
          name: 'Task Management',
          description: 'To-dos, priorities, due dates. Choice of schedule vs task list.',
          icon: <CheckSquare className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'meal-planning',
          name: 'Meal Planning & Recipes',
          description: 'Recipe import, math scaling, grocery list integration.',
          icon: <Utensils className="h-5 w-5" />,
          status: 'coming-soon'
        },
        {
          id: 'budget',
          name: 'Budget & Finance',
          description: 'Income/expenses with math. Self-employment tax toggle.',
          icon: <DollarSign className="h-5 w-5" />,
          status: 'coming-soon'
        },
        {
          id: 'goals-habits',
          name: 'Goals & Habits',
          description: 'Goal tracking, habit grids, achievement system.',
          icon: <Target className="h-5 w-5" />,
          status: 'coming-soon'
        },
        {
          id: 'study-planner',
          name: 'Study & Education',
          description: 'Student, teacher, homeschool planning. Homework reminders.',
          icon: <BookOpen className="h-5 w-5" />,
          status: 'planned'
        },
        {
          id: 'chores',
          name: 'Household Management',
          description: 'Chore charts with "normal people" defaults and reminders.',
          icon: <Home className="h-5 w-5" />,
          status: 'planned'
        },
        {
          id: 'travel',
          name: 'Travel Planning',
          description: 'Trip planning, packing lists, itineraries.',
          icon: <Plane className="h-5 w-5" />,
          status: 'planned'
        },
        {
          id: 'creative-projects',
          name: 'Creative Projects',
          description: 'Art, writing, hobby tracking and project management.',
          icon: <Palette className="h-5 w-5" />,
          status: 'planned'
        }
      ]
    },
    {
      id: 'work-life',
      title: 'Work & Life Management',
      description: 'Professional tools and life administration',
      icon: <Briefcase className="h-6 w-6" />,
      trackers: [
        {
          id: 'missed-work',
          name: 'Missed Work & Disability',
          description: 'FMLA, accommodations, disability tracking for paperwork.',
          icon: <Briefcase className="h-5 w-5" />,
          status: 'available'
        },
        {
          id: 'client-management',
          name: 'Client & Contact Management',
          description: 'Professional networking, client information.',
          icon: <Users className="h-5 w-5" />,
          status: 'planned'
        },
        {
          id: 'time-tracking',
          name: 'Time & Productivity',
          description: 'Billable hours, productivity tracking.',
          icon: <Clock className="h-5 w-5" />,
          status: 'planned'
        }
      ]
    },
    {
      id: 'journal',
      title: 'Journal & Documentation',
      description: 'Unified journaling system with optional subdivisions',
      icon: <FileText className="h-6 w-6" />,
      trackers: [
        {
          id: 'unified-journal',
          name: 'Unified Journal',
          description: 'One journal with optional subdivisions: gratitude, brain dump, victory log, etc.',
          icon: <FileText className="h-5 w-5" />,
          status: 'coming-soon',
          consolidatedFrom: ['brain-dump', 'gratitude-journal', 'victory-log', 'thought-patterns']
        },
        {
          id: 'visual-diary',
          name: 'Visual Documentation',
          description: 'Photo-based symptom documentation integrated with journal.',
          icon: <Camera className="h-5 w-5" />,
          status: 'coming-soon'
        }
      ]
    }
  ]

  return (
    <div className={getDeviceClasses()}>
      <AppCanvas currentPage="index">
        <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            🌪️ Welcome to Your Chaos Command Center
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Embrace the beautiful disaster - organize the chaos, celebrate the wins
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Executive function support for chaotic humans who need their life management
            system to be as beautifully unhinged as they are. Normal is overrated.
          </p>
        </header>

        {/* TEMPORARY DEV BUTTONS - DELETE LATER */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">🧪 DEV:</span>
            <Button
              onClick={() => setDeviceOverride(deviceOverride === 'desktop' ? null : 'desktop')}
              variant={deviceOverride === 'desktop' ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
            >
              💻
            </Button>
            <Button
              onClick={() => setDeviceOverride(deviceOverride === 'tablet' ? null : 'tablet')}
              variant={deviceOverride === 'tablet' ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
            >
              📱
            </Button>
            <Button
              onClick={() => setDeviceOverride(deviceOverride === 'mobile' ? null : 'mobile')}
              variant={deviceOverride === 'mobile' ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
            >
              📲
            </Button>
            {deviceOverride && (
              <span className="text-xs text-yellow-700 dark:text-yellow-300">
                ({deviceOverride})
              </span>
            )}
          </div>
        </div>

        {/* SURVIVAL BUTTON + DAILY FUZZY WIDGET */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SurvivalButton />
          </div>
          <div className="lg:col-span-1">
            <DailyFuzzyWidget />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <a
              key={category.id}
              href={`/${category.id}`}
              className="block"
            >
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg">
                  {category.icon}
                  {category.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
              </CardHeader>
            </Card>
            </a>
          ))}
        </div>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>Built for chaotic humans who refuse to be normal. 🌪️💜</p>
          <div className="mt-2">
            <Badge variant="outline">No subscriptions</Badge>
            <Badge variant="outline" className="ml-2">Privacy-first</Badge>
            <Badge variant="outline" className="ml-2">Beautifully chaotic</Badge>
          </div>
        </footer>
        </div>
      </AppCanvas>
    </div>
  )
}
