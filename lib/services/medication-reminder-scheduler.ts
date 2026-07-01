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
 * Reminders are CONSOLIDATED by time: all meds due at the same clock time share
 * ONE recurring alarm (5 meds at 8:00 AM = 1 "8:00 AM meds" notification, not 5),
 * each firing even when the app is closed (mobile guarantee; desktop fire-when-
 * closed varies). Per-med scheduling is preserved — a BID med joins both its
 * time buckets, a PM-only med just the evening one. Tapping a reminder opens the
 * daily "taken today" checklist (which still lists every individual dose).
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

/**
 * Bucket title uses the ACTUAL clock time, not a daypart word. WHY: a daypart
 * ("morning meds") is ambiguous the moment someone has two buckets in the same
 * part of day — an 8:00 dose and a 9:30 post-breakfast dose would BOTH read
 * "morning meds" and you couldn't tell which notification is which. It also
 * assumes a day shape that's wrong for shift workers (whose "morning" might be
 * 8 PM). The scheduled time is unambiguous and shift-agnostic. */
function formatBucketTime(hm: { hour: number; minute: number }): string {
  const ap = hm.hour < 12 ? 'AM' : 'PM'
  const h12 = hm.hour % 12 === 0 ? 12 : hm.hour % 12
  return `${h12}:${String(hm.minute).padStart(2, '0')} ${ap}`
}

/**
 * Build ONE notification for all meds due at a given time (the consolidation).
 *
 * PRIVACY (unchanged from the per-med version): a real drug name appears ONLY
 * if the user explicitly typed it as reminderLabel. Every unlabeled med is
 * counted generically ("and 2 more doses"), never named — so "Lithium" /
 * "Zyprexa" can't surface on a screen when someone's standing nearby.
 *
 * - 1 med  → the personal, dose-carrying phrasing (unchanged behavior).
 * - N meds → friendly daypart title + a privacy-safe "what to take" line.
 */
function buildBucketNotification(
  hm: { hour: number; minute: number },
  meds: Medication[],
): { title: string; body: string } {
  const labels = meds.map(m => (m.reminderLabel || '').trim()).filter(Boolean)
  const genericCount = meds.length - labels.length

  if (meds.length === 1) {
    const only = meds[0]
    const name = (only.reminderLabel || '').trim() || 'medication'
    const dose = only.dose ? ` · ${only.dose}` : ''
    return {
      title: `💊 Time for your ${name}`,
      body: `Take your dose${dose}. Tap to mark it taken.`,
    }
  }

  const title = `💊 Time for your ${formatBucketTime(hm)} meds`
  let what: string
  if (labels.length === 0) {
    what = `You have ${meds.length} doses to take`
  } else if (genericCount === 0) {
    what = `Take: ${labels.join(', ')}`
  } else {
    what = `Take: ${labels.join(', ')} and ${genericCount} more dose${genericCount === 1 ? '' : 's'}`
  }
  return { title, body: `${what}. Tap to mark them taken.` }
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
// Fingerprint of the last-armed med set, so a re-sync with identical data is a
// NO-OP. WHY: this is called on every change to the `medications` array, which
// can re-fire with a fresh array identity but identical content (Dexie live
// query / re-render). The old code cancelled + recreated EVERY med alarm on each
// call — the same churn that ate the daily check-in: a re-sync landing near a
// dose's fire minute cancelled the about-to-fire alarm and recreated it for
// tomorrow. Only re-arm when the meds/times/toggles actually change.
let _lastMedFingerprint: string | null = null
let _lastMedArmed = 0

export async function syncMedicationReminders(medications: Medication[], force = false): Promise<number> {
  const fingerprint = JSON.stringify([
    medsCategoryOn(),
    isMobilePlatform(),
    (medications || []).map(m => [m.id, m.enableReminders, m.active, m.reminderTimes, m.reminderLabel, m.dose]),
  ])
  // Nothing changed since the last arm → leave the live alarms untouched.
  if (!force && fingerprint === _lastMedFingerprint) return _lastMedArmed

  // Always clear the prior set first so edits/deletes/toggles never orphan alarms.
  await cancelAllMedicationReminders()

  if (!medsCategoryOn()) {
    _lastMedFingerprint = fingerprint
    _lastMedArmed = 0
    return 0
  }

  // Mobile: OS calendar-recurring alarms (fire even when fully closed). Desktop:
  // the OS interval path fires immediately + repeatedly on Windows (that was
  // Lyrica spamming), so route through the in-app ticker, which fires each dose
  // ONCE at its due minute and marks it fired.
  const mobile = isMobilePlatform()
  const armedKeys: string[] = []
  let armed = 0

  // CONSOLIDATION: bucket every (active med × parseable time) by the CLOCK TIME,
  // so all meds due at 8:00 AM become ONE notification instead of five. Per-med
  // scheduling is untouched — a BID med lands in both its buckets, a PM-only med
  // only in the evening one — because we bucket the DELIVERY, not the schedule.
  // Map key is "H:M"; value is the list of meds due then.
  const buckets = new Map<string, { hm: { hour: number; minute: number }; meds: Medication[] }>()
  for (const med of medications) {
    if (!med.enableReminders || med.active === false) continue
    for (const timeStr of med.reminderTimes || []) {
      const hm = parseReminderTime(timeStr)
      if (!hm) {
        console.warn(`[med-reminder] could not parse time "${timeStr}" for med ${med.id} — skipped`)
        continue
      }
      const bk = `${hm.hour}:${hm.minute}`
      const bucket = buckets.get(bk)
      if (bucket) {
        // A med listing the same time twice shouldn't appear twice in one popup.
        if (!bucket.meds.some(m => m.id === med.id)) bucket.meds.push(med)
      } else {
        buckets.set(bk, { hm, meds: [med] })
      }
    }
  }

  for (const { hm, meds } of buckets.values()) {
    const { title, body } = buildBucketNotification(hm, meds)

    if (mobile) {
      // Stable key per TIME bucket → re-syncing unchanged meds re-arms the same
      // id (cancel-then-add inside the helper = no duplicate).
      const key = `med-reminder-bucket-${hm.hour}-${hm.minute}`
      const ok = await scheduleRecurringOsNotification({
        key, title, body,
        match: { hour: hm.hour, minute: hm.minute },
        actionTypeId: MED_REMINDER_ACTION_TYPE,
      })
      if (ok) { armedKeys.push(key); armed++ }
    } else {
      // Desktop in-app ticker: pre-arm a rolling window, fires once per bucket.
      // NEVER schedule a PAST time — it would fire instantly on the ticker's
      // startup kick and re-fire on every reopen (the constant firing).
      const now = Date.now()
      for (let off = 0; off <= DESKTOP_WINDOW_DAYS; off++) {
        const fire = new Date()
        fire.setDate(fire.getDate() + off)
        fire.setHours(hm.hour, hm.minute, 0, 0)
        if (fire.getTime() <= now) continue
        const id = `med-reminder-bucket-${hm.hour}-${hm.minute}-${fire.toISOString().split('T')[0]}`
        await scheduleReminder({ id, title, body, fireAt: fire.toISOString(), source: 'med-reminder' })
        armedKeys.push(id); armed++
      }
    }
  }

  writeManifest(armedKeys)
  _lastMedFingerprint = fingerprint
  _lastMedArmed = armed
  return armed
}
