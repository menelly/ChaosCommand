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
  scheduleReminder,
  cancelReminder,
} from '@/lib/services/notification-service'
import { isMobilePlatform } from '@/lib/platform'

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
// Desktop fires through the in-app ticker (fires once at the due minute, then
// marks itself fired — no spam), so we pre-arm a small rolling window of days.
const DESKTOP_WINDOW_DAYS = 3

/** In-app reminder id for a given calendar day (date-stamped so each day is its
 *  own once-fire entry and re-arming is idempotent). */
function checkinIdForDate(d: Date): string {
  return `${BASE_KEY}-${d.toISOString().split('T')[0]}`
}

/** Does this frequency fire on the given date's weekday? (null weekdays = daily) */
function firesOnDate(freq: CheckinPrefs['frequency'], date: Date): boolean {
  const wds = weekdaysFor(freq)
  if (wds === null) return true
  return wds.includes(date.getDay() + 1) // JS getDay 0=Sun -> our 1=Sun
}

export async function cancelDailyCheckinSchedule(): Promise<void> {
  // Mobile OS schedules...
  await Promise.all(ALL_KEYS.map(k => cancelOsNotification(k)))
  // ...and the desktop in-app rolling window.
  const ids: string[] = []
  for (let off = 0; off <= DESKTOP_WINDOW_DAYS; off++) {
    const d = new Date()
    d.setDate(d.getDate() + off)
    ids.push(checkinIdForDate(d))
  }
  await Promise.all(ids.map(id => cancelReminder(id)))
}

/**
 * Desktop: arm the check-in through the in-app ticker for the next few days.
 * The ticker fires each reminder ONCE at its due minute and marks it fired, so
 * it can't spam — unlike the OS calendar-interval path, which fires immediately
 * and repeatedly on Windows. NEVER schedule a past time (it would fire instantly
 * on the ticker's startup kick AND re-fire on every reopen — that was the spam).
 */
async function syncDesktopCheckin(prefs: CheckinPrefs): Promise<number> {
  const now = Date.now()
  let armed = 0
  for (let off = 0; off <= DESKTOP_WINDOW_DAYS; off++) {
    const fire = new Date()
    fire.setDate(fire.getDate() + off)
    fire.setHours(prefs.hour, prefs.minute, 0, 0)
    if (fire.getTime() <= now) continue        // skip past times (no instant/re-fire)
    if (!firesOnDate(prefs.frequency, fire)) continue
    await scheduleReminder({
      id: checkinIdForDate(fire),
      title: CHECKIN_TITLE,
      body: CHECKIN_BODY,
      fireAt: fire.toISOString(),
      source: BASE_KEY,
    })
    armed++
  }
  return armed
}

/**
 * Reconcile the OS schedule with the current prefs: clear the full set, then
 * (if enabled) arm the schedule(s) for the chosen frequency. Call this on app
 * start and whenever the toggle / time / frequency changes.
 *
 * Returns the number of schedules armed (0 when disabled or not in Tauri).
 */
// Fingerprint of what we last armed. Repeated syncs with identical prefs are a
// NO-OP — we do NOT cancel+re-arm an alarm that's already correctly scheduled.
// WHY THIS EXISTS: syncDailyCheckinSchedule is called on mount, on every
// settings touch, and from lifecycle components. The old code cancelled and
// recreated the alarm on EVERY call. When a call landed near the fire time it
// cancelled the about-to-fire alarm and recreated it — and if the recreate
// landed even a second after the target minute, nextTrigger rolled it to
// TOMORROW. That's the "set it for 8:50, nothing fired, it's scheduled for
// tomorrow" bug: the churn ate the alarm seconds before it would have fired.
// The OS calendar-interval alarm re-arms itself after firing, so once it's set
// correctly we must leave it alone.
let _lastCheckinFingerprint: string | null = null
let _lastCheckinArmed = 0

export async function syncDailyCheckinSchedule(force = false): Promise<number> {
  const prefs = readCheckinPrefs()
  const fingerprint = JSON.stringify([
    prefs.enabled, prefs.hour, prefs.minute, prefs.frequency, isMobilePlatform(),
  ])
  // Nothing changed since we last armed → don't touch the live alarm.
  if (!force && fingerprint === _lastCheckinFingerprint) return _lastCheckinArmed

  await cancelDailyCheckinSchedule()

  if (!prefs.enabled) {
    _lastCheckinFingerprint = fingerprint
    _lastCheckinArmed = 0
    return 0
  }

  // Desktop: the OS calendar-interval schedule fires immediately + repeatedly on
  // Windows (the spam Ren hit — even ran in the tray and re-fired on every open).
  // Route through the in-app once-a-day ticker instead. The OS schedule is the
  // MOBILE fire-when-closed guarantee; on desktop, .ics export covers fully-quit.
  if (!isMobilePlatform()) {
    return syncDesktopCheckin(prefs)
  }

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

  _lastCheckinFingerprint = fingerprint
  _lastCheckinArmed = armed
  return armed
}
