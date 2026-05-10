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
// 🧙‍♂️ Date Utilities - Timezone-Safe Date Handling (US Format)
// Fixes the timezone gremlins that cause date mismatches

/**
 * Get today's date in YYYY-MM-DD format in local timezone (for database storage)
 * This prevents timezone shifts when saving/loading dates
 */
export function getTodayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert a YYYY-MM-DD string to a Date object in local timezone
 * Prevents timezone shift issues when working with date strings
 */
export function localDateStringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in Date constructor
}

/**
 * Format a YYYY-MM-DD date string for US display (MM/DD/YYYY)
 * Uses local timezone to prevent date shifts
 */
export function formatLocalDateString(dateString: string, style: 'short' | 'long' = 'long'): string {
  try {
    const date = localDateStringToDate(dateString)

    if (style === 'short') {
      // MM/DD/YYYY format
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    } else {
      // Long format: "Friday, December 13, 2024"
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
      return date.toLocaleDateString('en-US', options)
    }
  } catch (error) {
    console.error('🚨 Error formatting date:', dateString, error)
    return dateString
  }
}

/**
 * Get a Date object for a specific local date string
 * Useful for date comparisons without timezone issues
 */
export function getLocalDateForString(dateString: string): Date {
  return localDateStringToDate(dateString)
}

/**
 * Check if a date string is today in local timezone
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayLocalDate()
}

/**
 * Get yesterday's date in local timezone
 */
export function getYesterdayLocalDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get a date N days ago in local timezone
 */
export function getDaysAgoLocalDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert MM/DD/YYYY input to YYYY-MM-DD for database storage
 */
export function usDateToDbDate(usDate: string): string {
  try {
    const [month, day, year] = usDate.split('/').map(Number)
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${year}-${monthStr}-${dayStr}`
  } catch (error) {
    console.error('🚨 Error converting US date to DB format:', usDate, error)
    return getTodayLocalDate()
  }
}

/**
 * Get the week number of the year for a given date
 */
export function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}

/**
 * Get the first day of a week given a week number and year
 * Returns the Sunday that starts the week
 */
export function getFirstDayOfWeek(year: number, weekNumber: number): Date {
  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1)

  // Find the first Sunday of the year
  const firstSunday = new Date(jan1)
  const dayOfWeek = jan1.getDay() // 0 = Sunday, 1 = Monday, etc.

  if (dayOfWeek !== 0) {
    // If Jan 1st is not Sunday, find the next Sunday
    firstSunday.setDate(jan1.getDate() + (7 - dayOfWeek))
  }

  // Add weeks to get to the desired week
  const targetWeek = new Date(firstSunday)
  targetWeek.setDate(firstSunday.getDate() + ((weekNumber - 1) * 7))

  return targetWeek
}

/**
 * Format a date for URL parameters (YYYY-MM-DD)
 */
export function formatDateForUrl(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a date from URL parameters (YYYY-MM-DD)
 */
export function parseDateFromUrl(dateStr: string): Date {
  return localDateStringToDate(dateStr)
}

/**
 * Get month name from month index (0-11)
 */
export function getMonthName(monthIndex: number): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return monthNames[monthIndex] || "Unknown"
}

/**
 * Get short month name from month index (0-11)
 */
export function getShortMonthName(monthIndex: number): string {
  const shortMonthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]
  return shortMonthNames[monthIndex] || "Unknown"
}

/**
 * Get day name from day index (0-6, Sunday = 0)
 */
export function getDayName(dayIndex: number): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return dayNames[dayIndex] || "Unknown"
}

/**
 * Get short day name from day index (0-6, Sunday = 0)
 */
export function getShortDayName(dayIndex: number): string {
  const shortDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return shortDayNames[dayIndex] || "Unknown"
}
