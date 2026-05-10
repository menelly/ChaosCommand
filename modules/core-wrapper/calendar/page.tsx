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

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTodayLocalDate, formatDateForUrl } from "@/lib/utils/dateUtils"
import { useDailyData, formatDateForStorage, CATEGORIES, SUBCATEGORIES } from "@/lib/database"
import AppCanvas from "@/components/app-canvas"

interface CalendarDay {
  date: number | null
  isCurrentMonth: boolean
  isToday: boolean
  content: string
}

interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
}

export default function MonthlyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarWeek[]>([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const { getSpecificData, saveData, isLoading } = useDailyData()

  // Load calendar content from storage
  const loadCalendarContent = async (year: number, month: number): Promise<Record<string, string>> => {
    if (isLoading) return {}

    const contentMap: Record<string, string> = {}
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    console.log(`🔍 Loading calendar content for ${year}-${month + 1}`)

    // Load content for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatDateForStorage(date)

      try {
        const record = await getSpecificData(dateStr, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY)
        let content = ''
        if (record?.content) {
          // Check if content is already a string or needs parsing
          if (typeof record.content === 'string') {
            content = record.content
          } else {
            // If it's an object, convert to string
            content = typeof record.content === 'object' ? JSON.stringify(record.content) : String(record.content)
          }
        }
        if (content) {
          contentMap[day.toString()] = content
          console.log(`📖 Loaded content for ${dateStr}: "${content}"`)
        }
      } catch (error) {
        console.error(`Failed to load content for ${dateStr}:`, error)
      }
    }

    console.log(`🔍 Final contentMap for ${year}-${month + 1}:`, contentMap)
    return contentMap
  }

  // Save calendar content to storage
  const saveMonthlyContent = async (day: number, content: string) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = new Date(year, month, day)
    const dateStr = formatDateForStorage(date)

    try {
      await saveData(dateStr, CATEGORIES.CALENDAR, SUBCATEGORIES.MONTHLY, content)
    } catch (error) {
      console.error(`Failed to save content for ${dateStr}:`, error)
    }
  }

  // Generate calendar data for the current month
  const generateCalendarData = async (date: Date): Promise<CalendarWeek[]> => {
    const year = date.getFullYear()
    const month = date.getMonth()

    // Load content for this month
    const contentMap = await loadCalendarContent(year, month)

    // Get first day of month and how many days in month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

    // Get today for comparison
    const today = new Date()

    const weeks: CalendarWeek[] = []
    let currentWeek: CalendarDay[] = []
    let weekNumber = 1

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push({
        date: null,
        isCurrentMonth: false,
        isToday: false,
        content: ""
      })
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day)
      const isToday = dayDate.toDateString() === today.toDateString()

      currentWeek.push({
        date: day,
        isCurrentMonth: true,
        isToday,
        content: contentMap[day.toString()] || ""
      })

      // If we've filled a week (7 days), start a new week
      if (currentWeek.length === 7) {
        weeks.push({
          weekNumber,
          days: currentWeek
        })
        currentWeek = []
        weekNumber++
      }
    }

    // Fill remaining cells in last week
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: null,
        isCurrentMonth: false,
        isToday: false,
        content: ""
      })
    }

    if (currentWeek.length > 0) {
      weeks.push({
        weekNumber,
        days: currentWeek
      })
    }

    return weeks
  }

  // Calculate actual week numbers (week of year)
  const getWeekOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 1)
    const diff = date.getTime() - start.getTime()
    const oneWeek = 1000 * 60 * 60 * 24 * 7
    return Math.ceil(diff / oneWeek)
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1))
  }

  // Handle day click (navigate to daily view)
  const getDayHref = (day: number): string => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return `/calendar/day/${dateStr}`
  }



  // Toggle bookmark
  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // TODO: Save to storage
  }

  // Generate calendar data when date changes
  useEffect(() => {
    const loadCalendar = async () => {
      const data = await generateCalendarData(currentDate)
      setCalendarData(data)
    }

    if (!isLoading) {
      loadCalendar()
    }
  }, [currentDate, isLoading])

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  return (
    <AppCanvas currentPage="calendar">
      <div className="space-y-6">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBookmark}
                className={`p-2 ${isBookmarked ? 'text-yellow-500' : 'text-muted-foreground'}`}
              >
                <Star className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card rounded-lg border p-4 mb-6">
              {/* Day headers */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div></div> {/* Empty cell for week numbers */}
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar weeks */}
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                  
                  {/* Day cells */}
                  {week.days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`
                        min-h-[100px] border rounded p-2 relative
                        ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                        ${day.isToday ? 'ring-2 ring-primary' : ''}
                      `}
                    >
                      {day.date && (
                        <>
                          <a
                            href={getDayHref(day.date!)}
                            className={`
                              absolute top-1 left-1 w-6 h-6 rounded text-xs font-medium flex items-center justify-center
                              hover:bg-accent hover:text-accent-foreground
                              ${day.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                            `}
                          >
                            {day.date}
                          </a>
                          
                          {/* Calendar Events */}
                          <div className="mt-8 text-xs leading-tight min-h-[60px] p-1">
                            {(() => {
                              // Parse calendar events from JSON
                              if (day.content) {
                                try {
                                  const calendarData = JSON.parse(day.content)
                                  if (calendarData.events && Array.isArray(calendarData.events)) {
                                    return calendarData.events.map((event: any, index: number) => (
                                      <div
                                        key={event.id || index}
                                        className="mb-1 p-1 rounded text-xs flex items-center gap-1"
                                        style={{
                                          backgroundColor: event.color || '#6b7280',
                                          color: 'white',
                                          fontSize: 'clamp(9px, 0.65rem, 10px)'
                                        }}
                                      >
                                        <span className="truncate">{event.title}</span>
                                      </div>
                                    ))
                                  }
                                } catch (e) {
                                  // If JSON parsing fails, show raw content as editable text
                                  return (
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      className="cursor-text"
                                      style={{ wordWrap: 'break-word' }}
                                      onBlur={(e) => {
                                        const content = e.currentTarget.textContent || ""
                                        saveMonthlyContent(day.date!, content)
                                      }}
                                      dangerouslySetInnerHTML={{ __html: day.content }}
                                    />
                                  )
                                }
                              }
                              return null
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
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
    </AppCanvas>
  )
}
