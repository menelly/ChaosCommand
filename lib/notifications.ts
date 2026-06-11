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
 * DESKTOP NOTIFICATIONS UTILITY 🔔
 * Tauri-powered desktop notifications for health tracking alerts
 */

import { isTauri } from '@tauri-apps/api/core'

// Real Tauri notification plugin, lazy-imported so web builds never choke.
// (For MONTHS these were stubs that console.log'd — the entire desktop
// notification pipeline existed (Cargo crate, lib.rs registration, capability
// permission, JS package) except this last inch. Windows now gets real toasts.
// Found during Ren's 2026-06-11 smoke test: "can we make Windows care?")
const isPermissionGranted = async (): Promise<boolean> => {
  const mod = await import('@tauri-apps/plugin-notification')
  return mod.isPermissionGranted()
}
const requestPermission = async (): Promise<string> => {
  const mod = await import('@tauri-apps/plugin-notification')
  return mod.requestPermission()
}
const sendNotification = async (options: any): Promise<void> => {
  const mod = await import('@tauri-apps/plugin-notification')
  mod.sendNotification(options)
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  sound?: boolean
}

export class HealthNotifications {
  // window.__TAURI__ only exists when app.withGlobalTauri is enabled in
  // tauri.conf.json — ours isn't, so that check was ALWAYS false and every
  // notification fell through to the web API (which WebView2 ignores).
  // isTauri() from the official API detects the runtime regardless.
  private static get isDesktop(): boolean {
    if (typeof window === 'undefined') return false
    if ((window as any).__TAURI__) return true
    try {
      return isTauri()
    } catch {
      return false
    }
  }

  /**
   * Initialize notifications and request permissions
   */
  static async initialize(): Promise<boolean> {
    if (!this.isDesktop) return false

    try {
      let permissionGranted = await isPermissionGranted()
      
      if (!permissionGranted) {
        const permission = await requestPermission()
        permissionGranted = permission === 'granted'
      }

      return permissionGranted
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
      return false
    }
  }

  /**
   * Send a health tracking notification
   */
  static async send(options: NotificationOptions): Promise<void> {
    if (!this.isDesktop) {
      // Fallback to browser notification for web version
      this.sendBrowserNotification(options)
      return
    }

    try {
      await sendNotification({
        title: options.title,
        body: options.body,
        icon: options.icon
      })
    } catch (error) {
      console.error('Failed to send notification:', error)
      // Fallback to browser notification
      this.sendBrowserNotification(options)
    }
  }

  /**
   * Browser fallback notification
   */
  private static sendBrowserNotification(options: NotificationOptions): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/32x32.png'
      })
    }
  }

  // 💜 FRIENDLY HEALTH COMPANION METHODS

  /**
   * Gentle tracking reminder - like a caring friend checking in
   */
  static async gentleReminder(trackerName: string): Promise<void> {
    const friendlyMessages = [
      `Hey friend! Your ${trackerName} tracker is here when you're ready 💜`,
      `No pressure, but ${trackerName} tracking is available if you want to check in 🤗`,
      `Just a gentle nudge - ${trackerName} data when you feel up to it! ✨`,
      `Your ${trackerName} tracker misses you! But only track when it feels right 💙`,
      `Friendly reminder: ${trackerName} tracking is here for you today 🌸`
    ]

    const randomMessage = friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)]

    await this.send({
      title: '🌟 Gentle Check-in',
      body: randomMessage,
      icon: '/icons/128x128.png'
    })
  }

  /**
   * Celebration for tracking consistency
   */
  static async celebrateStreak(trackerName: string, days: number): Promise<void> {
    await this.send({
      title: '🎉 You\'re amazing!',
      body: `${days} days of ${trackerName} tracking! Your consistency is inspiring 💜`,
      icon: '/icons/128x128.png'
    })
  }

  /**
   * Supportive check-in after missed days
   */
  static async supportiveCheckIn(trackerName: string, daysMissed: number): Promise<void> {
    const supportiveMessages = [
      `No judgment here! ${trackerName} tracking is ready when you are 💙`,
      `Life happens! Your ${trackerName} tracker will be here whenever you're ready 🤗`,
      `Taking breaks is okay! ${trackerName} tracking when you feel up to it ✨`,
      `You're doing great! ${trackerName} data whenever it works for you 💜`
    ]

    const message = supportiveMessages[Math.floor(Math.random() * supportiveMessages.length)]

    await this.send({
      title: '💙 No Pressure Check-in',
      body: message,
      icon: '/icons/128x128.png'
    })
  }

  /**
   * Analytics insight - but friendly!
   */
  static async friendlyInsight(insight: string): Promise<void> {
    await this.send({
      title: '✨ Interesting Pattern!',
      body: `Thought you might find this cool: ${insight} 📊💜`,
      icon: '/icons/128x128.png'
    })
  }

  /**
   * Sync success notification
   */
  static async syncSuccess(deviceCount: number): Promise<void> {
    await this.send({
      title: '🔄 Sync Complete',
      body: `Successfully synced data across ${deviceCount} devices`,
      icon: '/icons/128x128.png'
    })
  }

  /**
   * Emergency alert notification
   */
  static async emergencyAlert(message: string): Promise<void> {
    await this.send({
      title: '🚨 EMERGENCY ALERT',
      body: message,
      icon: '/icons/128x128.png'
    })
  }
}

// Auto-initialize on import in desktop environment. initialize() itself
// checks isDesktop (real isTauri() detection now) and no-ops on web.
if (typeof window !== 'undefined') {
  HealthNotifications.initialize().then(success => {
    if (success) {
      console.log('🔔 Desktop notifications initialized successfully')
    }
  })
}
