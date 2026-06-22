/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.8)
 *
 * medication-reminder-scheduler.ts — arms OS notifications from the medication
 * data that already exists. A med carries `enableReminders` + `reminderTimes`
 * (e.g. ["8:00 AM", "2:00 PM", "8:00 PM"] — genuinely multiple-times-a-day);
 * the form captures it and the PDF surfaces it, but nothing scheduled it. This
 * does.
 *
 * One recurring calendar-matching alarm per (medication × time), so a 3×/day
 * med = 3 daily notifications, each firing even when the app is closed (mobile
 * guarantee; desktop fire-when-closed varies). Tapping a med reminder opens the
 * daily "taken today" checklist.
 *
 * Gating layers (all must be true for a given time to arm):
 *   - master switch on            (chaos-notifications-enabled)
 *   - medication-reminders on     (chaos-medication-reminders — the category)
 *   - the med's own enableReminders, it's active, and the time parses
 */
"use client"

import {
  scheduleRecurringOsNotification,
  cancelOsNotification,
  scheduleReminder,
  cancelReminder,
} from '@/lib/services/notification-service'
import { isMobilePlatform } from '@/lib/platform'
import type { Medication } from '@/lib/types/medication-types'

export const MED_REMINDER_ACTION_TYPE = 'chaos-med-reminder'

// localStorage manifest of every key we've armed, so a re-sync can cancel the
// exact prior set — including times/meds that were since edited or deleted —
// before arming the fresh set. Without this, removing a time would orphan its
// OS alarm forever.
const MANIFEST_KEY = 'chaos-med-reminder-keys'

function readManifest(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MANIFEST_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeManifest(keys: string[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(MANIFEST_KEY, JSON.stringify(keys)) } catch { /* non-fatal */ }
}

/**
 * Parse a stored reminder-time string into 24h {hour, minute}.
 * Handles the canonical "8:00 AM" / "6:30 PM" the form produces, plus 24h
 * ("20:00") and terse ("8am") shapes for resilience. Returns null if unparseable
 * (a malformed time should drop ONE alarm, never throw the whole sync).
 */
export function parseReminderTime(s: string): { hour: number; minute: number } | null {
  if (!s) return null
  const t = s.trim().toLowerCase()

  // "8:00 am" / "6:30 pm" / "20:00" / "20:00" (am/pm optional)
  let m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/)
  if (m) {
    let hour = parseInt(m[1], 10)
    const minute = parseInt(m[2], 10)
    const ap = m[3]
    if (ap) { hour = hour % 12; if (ap === 'pm') hour += 12 }
    if (hour > 23 || minute > 59) return null
    return { hour, minute }
  }

  // "8am" / "8 pm" — no minutes
  m = t.match(/^(\d{1,2})\s*(am|pm)$/)
  if (m) {
    let hour = parseInt(m[1], 10) % 12
    if (m[2] === 'pm') hour += 12
    if (hour > 23) return null
    return { hour, minute: 0 }
  }

  return null
}

function medsCategoryOn(): boolean {
  if (typeof window === 'undefined') return false
  return (
    localStorage.getItem('chaos-notifications-enabled') === 'true' &&
    localStorage.getItem('chaos-medication-reminders') === 'true'
  )
}

// Desktop fires med reminders through the in-app ticker (fires once at the due
// minute, then marks itself fired — no spam), so we pre-arm a rolling window.
const DESKTOP_WINDOW_DAYS = 2

/** Cancel every medication reminder we previously armed (manifest-driven). Each
 *  key may be an OS alarm (mobile) OR an in-app ticker reminder (desktop), so we
 *  cancel BOTH — whichever doesn't exist is a harmless no-op. */
export async function cancelAllMedicationReminders(): Promise<void> {
  const prior = readManifest()
  await Promise.all(prior.flatMap(k => [cancelOsNotification(k), cancelReminder(k)]))
  writeManifest([])
}

/**
 * Reconcile OS medication reminders with the current medication list + the
 * settings toggles. Cancels the prior armed set, then (if the category is on)
 * arms one recurring alarm per active med × parseable time. Idempotent.
 *
 * Returns the number of alarms armed (0 when the category is off / not in Tauri).
 */
export async function syncMedicationReminders(medications: Medication[]): Promise<number> {
  // Always clear the prior set first so edits/deletes/toggles never orphan alarms.
  await cancelAllMedicationReminders()

  if (!medsCategoryOn()) return 0

  // Mobile: OS calendar-recurring alarms (fire even when fully closed). Desktop:
  // the OS interval path fires immediately + repeatedly on Windows (that was
  // Lyrica spamming), so route through the in-app ticker, which fires each dose
  // ONCE at its due minute and marks it fired.
  const mobile = isMobilePlatform()
  const armedKeys: string[] = []
  let armed = 0

  for (const med of medications) {
    if (!med.enableReminders || med.active === false) continue
    const times = med.reminderTimes || []
    if (times.length === 0) continue

    // PRIVACY: the real drug name NEVER goes in a notification unless the user
    // explicitly typed it as reminderLabel. Default popups say the generic word
    // "medication" (+ dose), so "Lithium"/"Zyprexa" can't surface on a screen
    // when someone's nearby. A custom label (e.g. "morning meds") is used verbatim.
    const label = (med.reminderLabel || '').trim()
    const displayName = label || 'medication'
    const dose = med.dose ? ` · ${med.dose}` : ''
    const title = `💊 Time for your ${displayName}`
    const body = `Take your dose${dose}. Tap to mark it taken.`

    for (const timeStr of times) {
      const hm = parseReminderTime(timeStr)
      if (!hm) {
        console.warn(`[med-reminder] could not parse time "${timeStr}" for ${displayName} — skipped`)
        continue
      }

      if (mobile) {
        // Stable key per med+time → re-syncing an unchanged med re-arms the same
        // id (cancel-then-add inside the helper = no duplicate).
        const key = `med-reminder-${med.id}-${hm.hour}-${hm.minute}`
        const ok = await scheduleRecurringOsNotification({
          key, title, body,
          match: { hour: hm.hour, minute: hm.minute },
          actionTypeId: MED_REMINDER_ACTION_TYPE,
        })
        if (ok) { armedKeys.push(key); armed++ }
      } else {
        // Desktop in-app ticker: pre-arm a rolling window, fires once per dose.
        // NEVER schedule a PAST time — it would fire instantly on the ticker's
        // startup kick and re-fire on every reopen (the constant firing).
        const now = Date.now()
        for (let off = 0; off <= DESKTOP_WINDOW_DAYS; off++) {
          const fire = new Date()
          fire.setDate(fire.getDate() + off)
          fire.setHours(hm.hour, hm.minute, 0, 0)
          if (fire.getTime() <= now) continue
          const id = `med-reminder-${med.id}-${hm.hour}-${hm.minute}-${fire.toISOString().split('T')[0]}`
          await scheduleReminder({ id, title, body, fireAt: fire.toISOString(), source: 'med-reminder' })
          armedKeys.push(id); armed++
        }
      }
    }
  }

  writeManifest(armedKeys)
  return armed
}
