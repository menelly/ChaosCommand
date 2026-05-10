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
 * NOTIFICATIONS HOOK 🔔
 * React hook for health tracking notifications
 */

import { useEffect, useState } from 'react'
import { HealthNotifications } from '@/lib/notifications'

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeNotifications = async () => {
      const enabled = await HealthNotifications.initialize()
      setIsEnabled(enabled)
      setIsInitialized(true)
    }

    initializeNotifications()
  }, [])

  return {
    isEnabled,
    isInitialized,
    
    // Friendly notification methods
    gentleReminder: HealthNotifications.gentleReminder,
    celebrateStreak: HealthNotifications.celebrateStreak,
    supportiveCheckIn: HealthNotifications.supportiveCheckIn,
    friendlyInsight: HealthNotifications.friendlyInsight,
    syncSuccess: HealthNotifications.syncSuccess,
    
    // Generic send method
    send: HealthNotifications.send
  }
}

// Notification settings hook
export function useNotificationSettings() {
  const [settings, setSettings] = useState({
    gentleReminders: true,
    streakCelebrations: true,
    supportiveCheckIns: true,
    friendlyInsights: true,
    syncNotifications: true
  })

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Save to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify({
      ...settings,
      [key]: value
    }))
  }

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('notificationSettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load notification settings:', error)
      }
    }
  }, [])

  return {
    settings,
    updateSetting,
    
    // Helper methods
    isEnabled: (type: keyof typeof settings) => settings[type],
    enableAll: () => {
      const allEnabled = Object.keys(settings).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {} as typeof settings)
      setSettings(allEnabled)
      localStorage.setItem('notificationSettings', JSON.stringify(allEnabled))
    },
    disableAll: () => {
      const allDisabled = Object.keys(settings).reduce((acc, key) => ({
        ...acc,
        [key]: false
      }), {} as typeof settings)
      setSettings(allDisabled)
      localStorage.setItem('notificationSettings', JSON.stringify(allDisabled))
    }
  }
}
