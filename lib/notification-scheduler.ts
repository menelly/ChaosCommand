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
 * NOTIFICATION SCHEDULER 🕐
 * Friendly reminder system for tracking check-ins
 */

import { HealthNotifications } from './notifications'
import { useDailyData } from './database'
import { format, subDays, isToday, parseISO } from 'date-fns'

export interface TrackerConfig {
  id: string
  name: string
  reminderTime?: string // "14:00" format
  skipWeekends?: boolean
  maxRemindersPerDay?: number
}

export class NotificationScheduler {
  private static trackers: TrackerConfig[] = [
    { id: 'dysautonomia', name: 'Dysautonomia', reminderTime: '14:00' },
    { id: 'head-pain', name: 'Head Pain', reminderTime: '19:00' },
    { id: 'upper-digestive', name: 'Upper Digestive', reminderTime: '20:00' },
    { id: 'pain-tracking', name: 'Pain', reminderTime: '21:00' },
    { id: 'movement', name: 'Movement', reminderTime: '18:00' }
  ]

  private static remindersSentToday: Set<string> = new Set()

  /**
   * Check all trackers for missed days and send gentle reminders
   */
  static async checkAllTrackers(): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    for (const tracker of this.trackers) {
      await this.checkTracker(tracker, today)
    }
  }

  /**
   * Check a specific tracker for missed tracking
   */
  static async checkTracker(tracker: TrackerConfig, today: string): Promise<void> {
    try {
      // Skip if we already sent a reminder for this tracker today
      const reminderKey = `${tracker.id}-${today}`
      if (this.remindersSentToday.has(reminderKey)) {
        return
      }

      // Skip weekends if configured
      if (tracker.skipWeekends && this.isWeekend(today)) {
        return
      }

      // Check if user has tracked today
      const hasTrackedToday = await this.hasTrackedToday(tracker.id, today)
      
      if (!hasTrackedToday) {
        // Check how many days they've missed
        const daysMissed = await this.getDaysMissed(tracker.id, today)
        
        if (daysMissed === 1) {
          // First missed day - gentle reminder
          await HealthNotifications.gentleReminder(tracker.name)
        } else if (daysMissed > 1 && daysMissed <= 3) {
          // Multiple missed days - supportive check-in
          await HealthNotifications.supportiveCheckIn(tracker.name, daysMissed)
        }
        // After 3+ days, we stop reminding to avoid being pushy
        
        this.remindersSentToday.add(reminderKey)
      } else {
        // They tracked today! Check for streak celebration
        const streak = await this.getCurrentStreak(tracker.id, today)
        if (streak > 0 && streak % 7 === 0) { // Celebrate weekly streaks
          await HealthNotifications.celebrateStreak(tracker.name, streak)
        }
      }
    } catch (error) {
      console.error(`Error checking tracker ${tracker.id}:`, error)
    }
  }

  /**
   * Check if user has tracked today for a specific tracker
   */
  private static async hasTrackedToday(trackerId: string, today: string): Promise<boolean> {
    // This would need to be implemented based on your database structure
    // For now, returning false to trigger reminders for testing
    return false
  }

  /**
   * Get number of consecutive days missed
   */
  private static async getDaysMissed(trackerId: string, today: string): Promise<number> {
    // This would check the database for the last tracking date
    // For now, returning 1 for testing
    return 1
  }

  /**
   * Get current tracking streak
   */
  private static async getCurrentStreak(trackerId: string, today: string): Promise<number> {
    // This would calculate consecutive tracking days
    // For now, returning 0
    return 0
  }

  /**
   * Check if date is weekend
   */
  private static isWeekend(dateString: string): boolean {
    const date = parseISO(dateString)
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  /**
   * Start the notification scheduler
   */
  static start(): void {
    // Check every hour during waking hours (8 AM to 10 PM)
    const checkInterval = setInterval(() => {
      const hour = new Date().getHours()
      if (hour >= 8 && hour <= 22) {
        this.checkAllTrackers()
      }
    }, 60 * 60 * 1000) // 1 hour

    // Clear reminders sent today at midnight
    const midnightReset = setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.remindersSentToday.clear()
      }
    }, 60 * 1000) // Check every minute

    console.log('🔔 Friendly notification scheduler started')
  }

  /**
   * Send a test notification
   */
  static async testNotification(): Promise<void> {
    await HealthNotifications.gentleReminder('Test Tracker')
  }
}

// Auto-start scheduler in desktop environment
if (typeof window !== 'undefined' && window.__TAURI__) {
  // Start after a short delay to ensure everything is initialized
  setTimeout(() => {
    NotificationScheduler.start()
  }, 5000)
}
