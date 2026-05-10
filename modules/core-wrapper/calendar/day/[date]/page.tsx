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

import { useState, useEffect, use } from "react"
import { ChevronLeft, ChevronRight, Star, Settings, Calendar, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { formatDateForStorage, CATEGORIES, SUBCATEGORIES } from "@/lib/database/dexie-db"
import AppCanvas from "@/components/app-canvas"
import SurvivalButton from "@/components/survival-button"
import DailyFuzzyWidget from "@/components/daily-fuzzy-widget"

interface DailyDashboardProps {
  params: Promise<{
    date: string // Format: "2024-12-15"
  }>
}

interface DashboardWidget {
  id: string
  name: string
  component: React.ReactNode
  enabled: boolean
  category: 'health' | 'planning' | 'wellness' | 'fun'
}

export default function DailyDashboard({ params }: DailyDashboardProps) {
  const resolvedParams = use(params)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [dailyData, setDailyData] = useState<any>({})
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>([])

  // Load enabled widgets from localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem('daily-dashboard-widgets')
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets)
        setEnabledWidgets(parsed)
      } catch (error) {
        console.error('Failed to parse dashboard settings:', error)
        // Default widgets if parsing fails
        setEnabledWidgets(['survival-button', 'daily-fuzzy'])
      }
    } else {
      // Default widgets for new users
      setEnabledWidgets(['survival-button', 'daily-fuzzy'])
    }
  }, [])

  const { getCategoryData, isLoading } = useDailyData()

  // Parse date from URL params
  useEffect(() => {
    try {
      const date = new Date(resolvedParams.date)
      if (!isNaN(date.getTime())) {
        setCurrentDate(date)
      }
    } catch (error) {
      console.error('Invalid date format:', resolvedParams.date)
    }
  }, [resolvedParams.date])

  // Load daily data
  useEffect(() => {
    const loadDailyData = async () => {
      if (isLoading) return

      const dateKey = formatDateForStorage(currentDate)
      const data = await getCategoryData(dateKey, CATEGORIES.DAILY)
      setDailyData(data || {})
    }

    loadDailyData()
  }, [currentDate, isLoading])

  // Navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate)
    prevDay.setDate(prevDay.getDate() - 1)
    setCurrentDate(prevDay)
    const dateStr = prevDay.toISOString().split('T')[0]
    window.history.replaceState(null, '', `/calendar/day/${dateStr}`)
  }

  const goToNextDay = () => {
    const nextDay = new Date(currentDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setCurrentDate(nextDay)
    const dateStr = nextDay.toISOString().split('T')[0]
    window.history.replaceState(null, '', `/calendar/day/${dateStr}`)
  }

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // TODO: Save bookmark to storage
  }

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Check if date is today
  const isToday = () => {
    const today = new Date()
    return currentDate.toDateString() === today.toDateString()
  }

  // Available widgets (will expand as we build trackers)
  const availableWidgets: DashboardWidget[] = [
    {
      id: 'survival-button',
      name: 'Survival Button',
      component: <SurvivalButton />,
      enabled: enabledWidgets.includes('survival-button'),
      category: 'wellness'
    },
    {
      id: 'daily-fuzzy',
      name: 'Daily Fuzzy Widget',
      component: <DailyFuzzyWidget />,
      enabled: enabledWidgets.includes('daily-fuzzy'),
      category: 'wellness'
    },
    {
      id: 'quick-add-medication',
      name: 'Quick Add Medication',
      component: (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💊 Quick Add Medication</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Coming soon - will integrate with medication tracker</p>
            <Button size="sm" variant="outline" disabled>
              Add Medication
            </Button>
          </CardContent>
        </Card>
      ),
      enabled: enabledWidgets.includes('quick-add-medication'),
      category: 'health'
    },
    {
      id: 'symptom-check',
      name: 'Symptom Check-in',
      component: (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🤒 Symptom Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Coming soon - will integrate with symptom tracker</p>
            <Button size="sm" variant="outline" disabled>
              Log Symptoms
            </Button>
          </CardContent>
        </Card>
      ),
      enabled: enabledWidgets.includes('symptom-check'),
      category: 'health'
    },

    {
      id: 'daily-tasks',
      name: 'Daily Tasks',
      component: (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">✅ Daily Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Coming soon - will integrate with planning tracker</p>
            <Button size="sm" variant="outline" disabled>
              View Tasks
            </Button>
          </CardContent>
        </Card>
      ),
      enabled: enabledWidgets.includes('daily-tasks'),
      category: 'planning'
    }
  ]

  // Filter enabled widgets
  const activeWidgets = availableWidgets.filter(widget => widget.enabled)

  return (
    <AppCanvas>
      <div className="flex h-screen">
        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="text-center">
                  <h1 className="text-2xl font-bold">
                    {formatDisplayDate(currentDate)}
                  </h1>
                  {isToday() && (
                    <Badge variant="secondary" className="mt-1">
                      Today
                    </Badge>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextDay}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleBookmark}
                >
                  <Star className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href="/settings">
                    <Settings className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Dashboard Widgets - Survival (2/3) + Daily Fuzzy (1/3) */}
            <div className="flex gap-4 mb-6">
              {/* Survival Button - 2/3 width */}
              {activeWidgets.find(w => w.id === 'survival-button') && (
                <div className="flex-[2]">
                  {activeWidgets.find(w => w.id === 'survival-button')?.component}
                </div>
              )}

              {/* Daily Fuzzy - 1/3 width */}
              {activeWidgets.find(w => w.id === 'daily-fuzzy') && (
                <div className="flex-[1]">
                  {activeWidgets.find(w => w.id === 'daily-fuzzy')?.component}
                </div>
              )}
            </div>

            {/* Other Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {activeWidgets.filter(w => w.id !== 'survival-button' && w.id !== 'daily-fuzzy').map((widget) => (
                <div key={widget.id} className="relative">
                  {widget.component}
                </div>
              ))}
            </div>

            {/* Placeholder for future content */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📝 Daily Notes & Journal
                  <Badge variant="outline">Coming Soon</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This will integrate with the journal tracker for daily text entries, 
                  reflections, and free-form notes.
                </p>
              </CardContent>
            </Card>

            {/* Navigation Links */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                asChild
              >
                <a href="/calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly View
                </a>
              </Button>
              

              <Button
                variant="outline"
                asChild
              >
                <a href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppCanvas>
  )
}
