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
  Calendar,
  Clock,
  CheckSquare,
  FileText,
  Target,
  RotateCcw,
  DollarSign,
  BookOpen,
  Plane,
  Utensils,
  ShoppingCart,
  ChefHat,
  HelpCircle,
  EyeOff
} from "lucide-react"

interface TrackerButton {
  id: string
  name: string
  shortDescription: string
  helpContent: string
  icon: React.ReactNode
  status: 'available' | 'coming-soon' | 'planned'
  isFood?: boolean
  subTrackers?: Array<{id: string, name: string, icon: string}>
}

export default function PlanningIndex() {
  const [showFoodTrackers, setShowFoodTrackers] = useState(true)

  const trackers: TrackerButton[] = [
    // FOOD & EATING (with sub-trackers)
    {
      id: 'food-eating',
      name: 'Food & Eating',
      shortDescription: 'Meal tracking, macro tracking, food reminders (hideable)',
      helpContent: 'Comprehensive food tracking with gremlin meal types, optional macro tracking, food photos, and gentle reminders. Completely hideable for those with eating disorder history or food trauma. Includes meal planning and grocery integration.',
      icon: <Utensils className="h-5 w-5" />,
      status: 'coming-soon',
      isFood: true,
      subTrackers: [
        { id: 'meal-tracking', name: 'Meal Tracking', icon: '🍽️' },
        { id: 'grocery-lists', name: 'Grocery Lists', icon: '🛒' },
        { id: 'meal-planning', name: 'Meal Planning', icon: '📋' },
        { id: 'recipe-rolodex', name: 'Recipe Collection', icon: '👩‍🍳' }
      ]
    },

    // CALENDAR & TIME MANAGEMENT
    {
      id: 'monthly-calendar',
      name: 'Monthly Calendar',
      shortDescription: 'Classic grid view with events and appointments',
      helpContent: 'Traditional monthly calendar view with event tracking. Integrates with the existing calendar system - installation date becomes your start date for the annual calendar. Perfect for seeing the big picture of your month.',
      icon: <Calendar className="h-5 w-5" />,
      status: 'coming-soon'
    },
    {
      id: 'weekly-planner',
      name: 'Weekly Planner',
      shortDescription: '7-day overview with tasks and navigation',
      helpContent: 'Weekly view with arrow navigation through weeks. Dynamically generated when needed. Integrates with daily schedule and task management for complete weekly planning.',
      icon: <Calendar className="h-5 w-5" />,
      status: 'coming-soon'
    },
    {
      id: 'daily-schedule',
      name: 'Daily Schedule',
      shortDescription: 'Hourly time blocks with integrated mini-trackers',
      helpContent: 'Hourly time blocking with integrated small trackers like hydration, energy battery, and other quick-check items. Choose between schedule-only, task-list-only, or combined view.',
      icon: <Clock className="h-5 w-5" />,
      status: 'coming-soon'
    },

    // TASK & PROJECT MANAGEMENT
    {
      id: 'task-lists',
      name: 'Task Lists',
      shortDescription: 'To-dos with priorities and due dates',
      helpContent: 'Flexible task management with priorities, due dates, and project organization. Integrates with daily schedule - choose task-only view, schedule-only view, or combined planning.',
      icon: <CheckSquare className="h-5 w-5" />,
      status: 'coming-soon'
    },
    {
      id: 'notes-sections',
      name: 'Notes & Freeform Text',
      shortDescription: 'Flexible note-taking areas',
      helpContent: 'Freeform text areas for thoughts, ideas, and notes. Attach to specific days, projects, or keep as standalone notes. Perfect for brain dumps and quick captures.',
      icon: <FileText className="h-5 w-5" />,
      status: 'coming-soon'
    },

    // GOALS & HABITS
    {
      id: 'goals-tracker',
      name: 'Goals Tracker',
      shortDescription: 'Short and long-term goal management',
      helpContent: 'Track both short-term and long-term goals with progress monitoring, milestone tracking, and deadline management. Break big goals into manageable steps.',
      icon: <Target className="h-5 w-5" />,
      status: 'coming-soon'
    },
    {
      id: 'habit-tracker',
      name: 'Habit Tracker',
      shortDescription: 'Daily habit grid tracking',
      helpContent: 'Visual habit tracking with daily grids. Track multiple habits, see patterns over time, and build sustainable routines. Gentle approach for neurodivergent brains.',
      icon: <RotateCcw className="h-5 w-5" />,
      status: 'coming-soon'
    },

    // FINANCIAL PLANNING
    {
      id: 'budget-planner',
      name: 'Budget Planner',
      shortDescription: 'Income, expenses, categories with auto-math',
      helpContent: 'Budget tracking with automatic calculations. Set up income, track expenses by category, and let the app do the math for you. Visual spending insights and budget alerts.',
      icon: <DollarSign className="h-5 w-5" />,
      status: 'coming-soon'
    },

    // EDUCATION & LEARNING
    {
      id: 'study-planner',
      name: 'Study Planner',
      shortDescription: 'Educational goals for students, teachers, homeschooling',
      helpContent: 'Comprehensive study planning for students, teachers, and homeschooling parents. Includes school start reminders, homework tracking, project breakdown, and assignment planning.',
      icon: <BookOpen className="h-5 w-5" />,
      status: 'coming-soon'
    },

    // TRAVEL & EVENTS
    {
      id: 'travel-planner',
      name: 'Travel Planner',
      shortDescription: 'Trip planning and packing lists',
      helpContent: 'Complete travel planning with itinerary management, packing lists, document tracking, and travel reminders. Perfect for organizing trips of any size.',
      icon: <Plane className="h-5 w-5" />,
      status: 'coming-soon'
    }
  ]

  const handleTrackerClick = (trackerId: string) => {
    console.log(`Navigate to tracker: ${trackerId}`)
    // TODO: Implement navigation to individual tracker
  }

  return (
    <AppCanvas currentPage="planning">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8 text-green-500" />
            Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Organization tools for chaotic humans who want structure
          </p>
        </header>

        {/* Food Tracker Visibility Toggle */}
        <div className="mb-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFoodTrackers(!showFoodTrackers)}
            className="flex items-center gap-2"
          >
            <EyeOff className="h-4 w-4" />
            {showFoodTrackers ? 'Hide Food Trackers' : 'Show Food Trackers'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trackers
            .filter(tracker => !tracker.isFood || showFoodTrackers)
            .map((tracker) => (
            <Card 
              key={tracker.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader 
                className="pb-3 cursor-pointer"
                onClick={() => handleTrackerClick(tracker.id)}
              >
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
                
                {/* Sub-trackers for Food & Eating */}
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
          ))}
        </div>

        {/* HELP SECTION */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Planning & Productivity Help
            </CardTitle>
            <CardDescription>
              Comprehensive guides and tutorials for all planning tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              📖 Open Planning Guide
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            ← Back to Command Center
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
