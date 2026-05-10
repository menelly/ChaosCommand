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
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getFirstDayOfWeek, getWeekOfYear, formatDateForUrl, getShortDayName } from "@/lib/utils/dateUtils"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { formatDateForStorage, CATEGORIES, SUBCATEGORIES } from "@/lib/database/dexie-db"
import CalendarSidebar from "@/components/calendar-sidebar"

interface WeeklyViewProps {
  params: Promise<{
    week: string // Format: "2024-W50"
  }>
}

interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  content: string
}

export default function WeeklyView({ params }: WeeklyViewProps) {
  const resolvedParams = use(params)
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [currentWeek, setCurrentWeek] = useState<{ year: number; week: number }>({ year: 2024, week: 1 })
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [verticalLayout, setVerticalLayout] = useState(true)
  const { getSpecificData, saveData, isLoading } = useDailyData()

  // Load layout setting from localStorage
  useEffect(() => {
    const savedVerticalLayout = localStorage.getItem('chaos-vertical-week') !== 'false'
    setVerticalLayout(savedVerticalLayout)
  }, [])

  // Parse week parameter (format: "2024-W50")
  const parseWeekParam = (weekParam: string) => {
    const match = weekParam.match(/(\d{4})-W(\d+)/)
    if (match) {
      return {
        year: parseInt(match[1]),
        week: parseInt(match[2])
      }
    }
    // Fallback to current week
    const now = new Date()
    return {
      year: now.getFullYear(),
      week: getWeekOfYear(now)
    }
  }

  // Load weekly content from storage
  const loadWeeklyContent = async (year: number, weekNumber: number): Promise<Record<string, string>> => {
    if (isLoading) return {}

    const contentMap: Record<string, string> = {}
    const firstDay = getFirstDayOfWeek(year, weekNumber)

    // Load content for each day of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDay)
      date.setDate(firstDay.getDate() + i)
      const dateStr = formatDateForStorage(date)

      try {
        const record = await getSpecificData(dateStr, CATEGORIES.DAILY, 'calendar-weekly')
        const content = record?.content || ''
        if (content) {
          contentMap[dateStr] = content
        }
      } catch (error) {
        console.error(`Failed to load content for ${dateStr}:`, error)
      }
    }

    return contentMap
  }

  // Save weekly content to storage
  const saveWeeklyContent = async (date: Date, content: string) => {
    const dateStr = formatDateForStorage(date)

    try {
      await saveData(dateStr, CATEGORIES.CALENDAR, SUBCATEGORIES.WEEKLY, content)
    } catch (error) {
      console.error(`Failed to save content for ${dateStr}:`, error)
    }
  }

  // Generate week data
  const generateWeekData = async (year: number, weekNumber: number): Promise<WeekDay[]> => {
    const firstDay = getFirstDayOfWeek(year, weekNumber)
    const today = new Date()
    const weekDays: WeekDay[] = []

    // Load content for this week
    const contentMap = await loadWeeklyContent(year, weekNumber)

    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDay)
      date.setDate(firstDay.getDate() + i)
      const dateStr = formatDateForStorage(date)

      weekDays.push({
        date,
        dayName: getShortDayName(date.getDay()),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        content: contentMap[dateStr] || ""
      })
    }

    return weekDays
  }

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeek = currentWeek.week - 1
    if (newWeek < 1) {
      setCurrentWeek({ year: currentWeek.year - 1, week: 52 })
    } else {
      setCurrentWeek({ ...currentWeek, week: newWeek })
    }
  }

  const goToNextWeek = () => {
    const newWeek = currentWeek.week + 1
    if (newWeek > 52) {
      setCurrentWeek({ year: currentWeek.year + 1, week: 1 })
    } else {
      setCurrentWeek({ ...currentWeek, week: newWeek })
    }
  }

  // Handle day click (navigate to daily view)
  const getDayHref = (date: Date): string => {
    const dateStr = formatDateForUrl(date)
    return `/calendar/day/${dateStr}`
  }

  // Toggle bookmark
  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // TODO: Save to storage
  }

  // Go to month view
  const getMonthHref = (): string => {
    const firstDay = getFirstDayOfWeek(currentWeek.year, currentWeek.week)
    return `/calendar?year=${firstDay.getFullYear()}&month=${firstDay.getMonth()}`
  }

  // Initialize week data
  useEffect(() => {
    const parsed = parseWeekParam(resolvedParams.week)
    setCurrentWeek(parsed)
  }, [resolvedParams.week])

  // Update week data when currentWeek changes
  useEffect(() => {
    const loadWeek = async () => {
      const data = await generateWeekData(currentWeek.year, currentWeek.week)
      setWeekData(data)
    }

    if (!isLoading) {
      loadWeek()
      // Update URL
      window.history.replaceState(null, '', `/calendar/week/${currentWeek.year}-W${currentWeek.week}`)
    }
  }, [currentWeek, isLoading])

  const getWeekDateRange = () => {
    if (weekData.length === 0) return ""
    const firstDay = weekData[0].date
    const lastDay = weekData[6].date
    
    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' })
    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' })
    
    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay.getDate()}-${lastDay.getDate()}, ${firstDay.getFullYear()}`
    } else {
      return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}, ${firstDay.getFullYear()}`
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <div className="flex h-full">
        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6 pr-[200px]">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <h1 className="text-2xl font-bold">
                    {getWeekDateRange()}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Week {currentWeek.week}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-sm"
                >
                  <a href={getMonthHref()}>
                    📅 Month View
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleBookmark}
                  className={`p-2 ${isBookmarked ? 'text-yellow-500' : 'text-muted-foreground'}`}
                >
                  <Star className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Weekly Grid */}
            <div className="bg-card rounded-lg border p-2 mb-6">
              {verticalLayout ? (
                /* VERTICAL LAYOUT - Tall columns (current) */
                <div className="grid grid-cols-7 gap-1">
                  {weekData.map((day, index) => (
                    <div
                      key={index}
                      className={`
                        min-h-[500px] border rounded p-2 relative
                        ${day.isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}
                      `}
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          {day.dayName}
                        </div>
                        <a
                          href={getDayHref(day.date)}
                          className={`
                            w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center
                            hover:bg-accent hover:text-accent-foreground
                            ${day.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}
                          `}
                          title={`Go to ${day.date.toLocaleDateString()}`}
                        >
                          {day.dayNumber}
                        </a>
                      </div>

                      {/* Editable content area */}
                      <div
                        key={`${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`}
                        className="text-sm leading-relaxed cursor-text min-h-[450px] p-2 rounded border-dashed border-2 border-transparent hover:border-muted-foreground/20 focus-within:border-primary/50"
                        contentEditable
                        suppressContentEditableWarning
                        style={{
                          wordWrap: 'break-word',
                          outline: 'none'
                        }}
                        onBlur={(e) => {
                          const content = e.currentTarget.textContent || ""
                          saveWeeklyContent(day.date, content)
                        }}
                        dangerouslySetInnerHTML={{ __html: day.content || '' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* HORIZONTAL LAYOUT - Wide rows */
                <div className="space-y-2">
                  {weekData.map((day, index) => (
                    <div
                      key={index}
                      className={`
                        min-h-[120px] border rounded p-3 flex gap-4
                        ${day.isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}
                      `}
                    >
                      <div className="flex-shrink-0 w-24 flex flex-col items-center justify-center">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {day.dayName}
                        </div>
                        <a
                          href={getDayHref(day.date)}
                          className={`
                            w-10 h-10 rounded-full text-lg font-medium flex items-center justify-center
                            hover:bg-accent hover:text-accent-foreground
                            ${day.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}
                          `}
                          title={`Go to ${day.date.toLocaleDateString()}`}
                        >
                          {day.dayNumber}
                        </a>
                      </div>
                      <div
                        key={`${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}`}
                        className="flex-1 text-sm leading-relaxed cursor-text min-h-[80px] p-2 rounded border-dashed border-2 border-transparent hover:border-muted-foreground/20 focus-within:border-primary/50"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ wordWrap: 'break-word', outline: 'none' }}
                        onBlur={(e) => {
                          const content = e.currentTarget.textContent || ""
                          saveWeeklyContent(day.date, content)
                        }}
                        dangerouslySetInnerHTML={{ __html: day.content || '' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom links */}
            <div className="flex justify-center gap-8">
              <Button
                variant="outline"
                asChild
                className="px-6"
              >
                <a href="/goals">
                  📋 GOALS
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="px-6"
              >
                <a href="/notes">
                  📝 NOTES
                </a>
              </Button>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
