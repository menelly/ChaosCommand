/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.8)
 *
 * daily-checkin-scheduler.ts — turns the "Daily Check-ins" toggle in
 * Notification Settings from a decorative preference into a live OS-scheduled
 * reminder.
 *
 * The reminder is the gentle, no-guilt nudge: "Want to track today, or are you
 * skipping?" — tapping it opens the Routines hub so a bad day costs one tap,
 * not fifteen. A quiet day is real data too (that's the whole ethos), so the
 * copy never scolds.
 *
 * Settings are read from the same localStorage keys the NotificationsModal
 * writes (device-level, not per-PIN — notifications belong to the OS/device,
 * not a profile). Scheduling is delegated to the OS via the notification
 * plugin's calendar-matching interval, so it fires even when the app is closed
 * (mobile guarantee; desktop fire-when-closed varies — that's what the .ics
 * export is for).
 */
"use client"

import {
  scheduleRecurringOsNotification,
  cancelOsNotification,
} from '@/lib/services/notification-service'

// actionTypeId tag so the tap-router recognises our notification as the
// daily check-in and routes to /routines.
export const DAILY_CHECKIN_ACTION_TYPE = 'chaos-daily-checkin'

const BASE_KEY = 'daily-checkin'
// Every key we might ever schedule under, so a re-sync can clear the full set
// before re-arming the current frequency (idempotent, no duplicate stacking).
const ALL_KEYS = [
  BASE_KEY,
  ...[1, 2, 3, 4, 5, 6, 7].map(wd => `${BASE_KEY}-wd-${wd}`),
]

const CHECKIN_TITLE = 'Daily check-in 💜'
const CHECKIN_BODY =
  'Want to track today, or are you skipping? Either is real data. Tap to open your routines.'

interface CheckinPrefs {
  enabled: boolean
  hour: number
  minute: number
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
}

/** Read the current check-in prefs from localStorage (SSR-safe). */
export function readCheckinPrefs(): CheckinPrefs {
  if (typeof window === 'undefined') {
    return { enabled: false, hour: 20, minute: 0, frequency: 'daily' }
  }
  const masterOn = localStorage.getItem('chaos-notifications-enabled') === 'true'
  const checkinsOn = localStorage.getItem('chaos-daily-checkins') === 'true'
  const time = localStorage.getItem('chaos-reminder-time') || '20:00'
  const freq = (localStorage.getItem('chaos-reminder-frequency') || 'daily') as CheckinPrefs['frequency']

  const [hStr, mStr] = time.split(':')
  const hour = Math.min(23, Math.max(0, parseInt(hStr, 10) || 20))
  const minute = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0))

  // The check-in only arms when BOTH the master switch AND the check-in toggle
  // are on — the master switch is the user's single off-ramp for everything.
  return { enabled: masterOn && checkinsOn, hour, minute, frequency: freq }
}

/** Which weekdays (1=Sun … 7=Sat) a frequency fires on; null = every day. */
function weekdaysFor(freq: CheckinPrefs['frequency']): number[] | null {
  switch (freq) {
    case 'weekdays': return [2, 3, 4, 5, 6] // Mon–Fri
    case 'weekends': return [1, 7]          // Sun, Sat
    case 'daily':
    case 'custom':                          // custom UI not built yet → daily
    default: return null
  }
}

/**
 * Cancel every check-in notification this scheduler could have armed.
 * Safe to call unconditionally (no-op outside Tauri / when nothing scheduled).
 */
export async function cancelDailyCheckinSchedule(): Promise<void> {
  await Promise.all(ALL_KEYS.map(k => cancelOsNotification(k)))
}

/**
 * Reconcile the OS schedule with the current prefs: clear the full set, then
 * (if enabled) arm the schedule(s) for the chosen frequency. Call this on app
 * start and whenever the toggle / time / frequency changes.
 *
 * Returns the number of schedules armed (0 when disabled or not in Tauri).
 */
export async function syncDailyCheckinSchedule(): Promise<number> {
  await cancelDailyCheckinSchedule()

  const prefs = readCheckinPrefs()
  if (!prefs.enabled) return 0

  const weekdays = weekdaysFor(prefs.frequency)
  let armed = 0

  if (weekdays === null) {
    // Every day at hour:minute — one calendar-matching schedule.
    const ok = await scheduleRecurringOsNotification({
      key: BASE_KEY,
      title: CHECKIN_TITLE,
      body: CHECKIN_BODY,
      match: { hour: prefs.hour, minute: prefs.minute },
      actionTypeId: DAILY_CHECKIN_ACTION_TYPE,
    })
    if (ok) armed++
  } else {
    // One schedule per weekday (the interval matcher fires on a single
    // weekday, so weekdays-only / weekends-only need several).
    for (const wd of weekdays) {
      const ok = await scheduleRecurringOsNotification({
        key: `${BASE_KEY}-wd-${wd}`,
        title: CHECKIN_TITLE,
        body: CHECKIN_BODY,
        match: { weekday: wd, hour: prefs.hour, minute: prefs.minute },
        actionTypeId: DAILY_CHECKIN_ACTION_TYPE,
      })
      if (ok) armed++
    }
  }

  return armed
}
