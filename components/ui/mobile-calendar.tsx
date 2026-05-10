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

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileCalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
  modifiers?: {
    [key: string]: Date[]
  }
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MobileCalendar({ selected, onSelect, className, modifiers = {} }: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selected || new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Get first day of month and how many days in month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  // Generate calendar days
  const calendarDays: (Date | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }
  
  const isSelected = (date: Date | null) => {
    if (!date || !selected) return false
    return date.toDateString() === selected.toDateString()
  }
  
  const hasModifier = (date: Date | null, modifierKey: string) => {
    if (!date || !modifiers[modifierKey]) return false
    return modifiers[modifierKey].some(modDate => 
      modDate.toDateString() === date.toDateString()
    )
  }
  
  const handleDateClick = (date: Date | null) => {
    if (date && onSelect) {
      onSelect(date)
    }
  }
  
  return (
    <div className={cn("p-3", className)}>
      {/* Header */}
      <div className="flex justify-center items-center mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 text-center">
          <h2 className="text-sm font-medium">
            {MONTHS[month]} {year}
          </h2>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <div key={index} className="h-8 flex items-center justify-center">
            {date ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateClick(date)}
                className={cn(
                  "h-8 w-8 p-0 text-xs font-normal",
                  isSelected(date) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isToday(date) && !isSelected(date) && "bg-accent text-accent-foreground",
                  hasModifier(date, 'menstrual') && "bg-red-500 text-white hover:bg-red-600",
                  hasModifier(date, 'fertile') && "bg-green-500 text-white hover:bg-green-600",
                  hasModifier(date, 'ovulation') && "bg-purple-500 text-white hover:bg-purple-600"
                )}
              >
                {date.getDate()}
              </Button>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
