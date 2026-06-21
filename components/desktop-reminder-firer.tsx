/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.8)
 *
 * DesktopReminderFirer — the desktop reminder path.
 *
 * WHY THIS EXISTS: the Tauri notification plugin only implements scheduled
 * notifications on mobile (Android/iOS). On desktop `Schedule.interval` is a
 * no-op (verified in the plugin's desktop.rs — it ignores the schedule field).
 * So on Windows/macOS/Linux we fire reminders ourselves, from a minute-ticker,
 * using immediate notifications — which DO work on desktop.
 *
 * For that to be reliable the process has to stay alive, which is what the
 * "remind me on desktop" setting does (close-to-tray + autostart, handled in
 * Rust). This component is gated purely on that setting's flag, so it is inert
 * on mobile (flag never set there — mobile uses the OS schedule) and on web.
 *
 * Precision note: this is a while-running approximation with a 5-minute grace
 * window for ticker jitter / brief sleeps. The exact "fires even when fully
 * quit" path is native Windows ScheduledToastNotification (rides in with MSIX) —
 * a deliberate follow-up, see STORE_LAUNCH.md.
 */
"use client"

import { useEffect, useRef } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { invoke } from '@tauri-apps/api/core'
import { useMedicationTracker } from '@/lib/hooks/use-medication-tracker'
import { fireNotification } from '@/lib/services/notification-service'
import { readCheckinPrefs } from '@/lib/services/daily-checkin-scheduler'
import { parseReminderTime } from '@/lib/services/medication-reminder-scheduler'

export const DESKTOP_BACKGROUND_KEY = 'chaos-desktop-background'

const GRACE_MS = 5 * 60 * 1000 // fire if we're within 5 min past the target time
const FIRED_PREFIX = 'chaos-desktop-fired-'

function backgroundOn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DESKTOP_BACKGROUND_KEY) === 'true'
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Has `key` already fired today? Marks via localStorage so it fires once/day. */
function alreadyFired(key: string): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(`${FIRED_PREFIX}${key}-${todayKey()}`) === '1'
}
function markFired(key: string): void {
  try { localStorage.setItem(`${FIRED_PREFIX}${key}-${todayKey()}`, '1') } catch { /* non-fatal */ }
}

/** True if `now` is at/just-past the target h:m today (within the grace window). */
function dueNow(now: Date, hour: number, minute: number): boolean {
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  const delta = now.getTime() - target.getTime()
  return delta >= 0 && delta < GRACE_MS
}

function medsCategoryOn(): boolean {
  if (typeof window === 'undefined') return false
  return (
    localStorage.getItem('chaos-notifications-enabled') === 'true' &&
    localStorage.getItem('chaos-medication-reminders') === 'true'
  )
}

export default function DesktopReminderFirer() {
  const { medications } = useMedicationTracker()
  const medsRef = useRef(medications)
  medsRef.current = medications

  // Sync the Rust close-to-tray flag from the stored setting on startup (Rust
  // defaults to off; after a restart it needs to learn the user's choice).
  useEffect(() => {
    if (!isTauri()) return
    invoke('set_background_mode', { enabled: backgroundOn() }).catch(() => { /* not desktop */ })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !isTauri()) return

    const tick = () => {
      if (!backgroundOn()) return
      const now = new Date()

      // --- Daily check-in ---
      const ci = readCheckinPrefs() // enabled already factors master + check-in toggle
      if (ci.enabled) {
        const wd = now.getDay() + 1 // JS 0=Sun → registry 1=Sun
        const freq = localStorage.getItem('chaos-reminder-frequency') || 'daily'
        const dayOk =
          freq === 'daily' ||
          (freq === 'weekdays' && wd >= 2 && wd <= 6) ||
          (freq === 'weekends' && (wd === 1 || wd === 7)) ||
          freq === 'custom'
        if (dayOk && dueNow(now, ci.hour, ci.minute) && !alreadyFired('checkin')) {
          void fireNotification(
            'Daily check-in 💜',
            'Want to track today, or are you skipping? Either is real data. Open your routines when you’re ready.',
          )
          markFired('checkin')
        }
      }

      // --- Medication reminders (multiple times a day) ---
      if (medsCategoryOn()) {
        for (const med of medsRef.current) {
          if (!med.enableReminders || med.active === false) continue
          const name = med.brandName || med.genericName || 'your medication'
          const dose = med.dose ? ` · ${med.dose}` : ''
          for (const t of med.reminderTimes || []) {
            const hm = parseReminderTime(t)
            if (!hm) continue
            const key = `med-${med.id}-${hm.hour}-${hm.minute}`
            if (dueNow(now, hm.hour, hm.minute) && !alreadyFired(key)) {
              void fireNotification(`💊 Time for ${name}`, `Take your dose${dose}.`)
              markFired(key)
            }
          }
        }
      }
    }

    tick() // catch anything already due on mount
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return null
}
