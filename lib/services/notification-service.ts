/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * notification-service.ts — Unified reminder system.
 *
 * Scope for v1:
 *   - Stores a queue of scheduled reminders in Dexie (survives reload)
 *   - While the app is open, a minute-ticker fires due reminders via
 *     Tauri's plugin-notification (OS-native toasts on every platform)
 *   - On app start, replays any queue entries that should have fired
 *     while the app was closed — shown "backlog" so users see what they
 *     missed without losing the reminder entirely
 *
 * Future (v2, see ROADMAP.md):
 *   - Better path: delegate scheduling to the user's OS calendar
 *     (Google Calendar / iOS Calendar / Outlook) via deep-link URLs
 *     or .ics download. Native calendar apps already do notification
 *     delivery even when our app is closed — we don't need to rebuild it.
 *   - Fallback: register native scheduled notifications via plugin on
 *     Android/iOS for users who don't want calendar integration.
 */
"use client"

import { db } from '@/shared/database/dexie-db'

const REMINDERS_TABLE = 'daily_data'
const REMINDER_CATEGORY = 'reminders'
const REMINDER_SUB_PREFIX = 'reminder-'

export interface ReminderRecord {
  id: string
  title: string
  body: string
  fireAt: string       // ISO timestamp
  status: 'pending' | 'fired' | 'dismissed' | 'missed'
  createdAt: string
  source?: string       // e.g. "appointment-{id}" or "medication-{id}"
  metadata?: Record<string, unknown>
}

// ============================================================================
// PERMISSION
// ============================================================================

let _permissionChecked = false
let _permissionGranted = false

export async function ensureNotificationPermission(): Promise<boolean> {
  if (_permissionChecked) return _permissionGranted
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    let granted = await mod.isPermissionGranted()
    if (!granted) {
      const p = await mod.requestPermission()
      granted = p === 'granted'
    }
    _permissionGranted = granted
    _permissionChecked = true
    return granted
  } catch (e) {
    console.warn('Notification permission check failed (not in Tauri?):', e)
    _permissionChecked = true
    _permissionGranted = false
    return false
  }
}

// ============================================================================
// FIRE IMMEDIATELY
// ============================================================================

export async function fireNotification(title: string, body: string): Promise<void> {
  const granted = await ensureNotificationPermission()
  if (!granted) {
    console.warn(`[notification] permission not granted, would have fired: ${title} — ${body}`)
    return
  }
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    mod.sendNotification({ title, body })
  } catch (e) {
    console.error('Failed to fire notification:', e)
  }
}

// ============================================================================
// NATIVE OS SCHEDULING (fires even when the app is closed — mobile)
// ============================================================================
//
// This is the "real" path the Dexie-queue ticker below could never deliver:
// hand the fire time to the OS via the Tauri notification plugin's Schedule
// API, so Android/iOS wake and fire the toast even with Chaos Command closed.
//
// Caveats, honestly stated:
//   - Reliable fire-when-closed is a MOBILE guarantee (Android AlarmManager /
//     iOS UNUserNotificationCenter). On desktop the behavior varies and a
//     closed app may not fire — that's what the .ics calendar export is for.
//   - allowWhileIdle:true asks Android to fire through Doze (uses an exact
//     alarm; the plugin's manifest declares SCHEDULE_EXACT_ALARM).
//   - Notification ids are 32-bit ints, so we hash the string key to one.

/** Stable, positive 32-bit id from an arbitrary string key. */
export function notificationIdFor(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0
  }
  // Keep it positive and comfortably inside i32.
  return (Math.abs(h) % 2_000_000_000) + 1
}

/**
 * Schedule a one-shot OS notification at a future time. Cancels any prior
 * notification with the same string key first (so re-scheduling on edit is
 * idempotent). Returns true if it was handed to the OS, false otherwise
 * (past time, no permission, or not running under Tauri).
 */
export async function scheduleOsNotification(opts: {
  key: string
  title: string
  body: string
  fireAt: Date
}): Promise<boolean> {
  if (!(opts.fireAt instanceof Date) || isNaN(opts.fireAt.getTime())) return false
  if (opts.fireAt.getTime() <= Date.now()) return false
  const granted = await ensureNotificationPermission()
  if (!granted) return false
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    const id = notificationIdFor(opts.key)
    try { await mod.cancel([id]) } catch { /* nothing scheduled yet */ }
    mod.sendNotification({
      id,
      title: opts.title,
      body: opts.body,
      schedule: mod.Schedule.at(opts.fireAt, false, true), // allowWhileIdle
    })
    console.log(`🔔 OS-scheduled "${opts.title}" for ${opts.fireAt.toISOString()} (id ${id})`)
    return true
  } catch (e) {
    console.warn('scheduleOsNotification failed (not in Tauri?):', e)
    return false
  }
}

/** Cancel a previously scheduled OS notification by its string key. */
export async function cancelOsNotification(key: string): Promise<void> {
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    await mod.cancel([notificationIdFor(key)])
  } catch { /* not in Tauri or nothing to cancel */ }
}

// ============================================================================
// SCHEDULE (queue in Dexie)
// ============================================================================

export async function scheduleReminder(input: Omit<ReminderRecord, 'status' | 'createdAt'>): Promise<void> {
  const now = new Date().toISOString()
  const record: ReminderRecord = {
    ...input,
    status: 'pending',
    createdAt: now,
  }
  const dateKey = record.fireAt.split('T')[0]
  const existing = await (db as any)[REMINDERS_TABLE]
    .where('[date+category+subcategory]')
    .equals([dateKey, REMINDER_CATEGORY, `${REMINDER_SUB_PREFIX}${record.id}`])
    .first()

  if (existing) {
    await (db as any)[REMINDERS_TABLE].update(existing.id, {
      content: record,
      metadata: {
        ...(existing.metadata || {}),
        updated_at: now,
      },
    })
  } else {
    await (db as any)[REMINDERS_TABLE].add({
      date: dateKey,
      category: REMINDER_CATEGORY,
      subcategory: `${REMINDER_SUB_PREFIX}${record.id}`,
      content: record,
      tags: [],
      metadata: {
        created_at: now,
        updated_at: now,
        user_id: 'default-user',
        version: 1,
      },
    })
  }
  console.log(`🔔 Scheduled reminder ${record.id} for ${record.fireAt}`)
}

export async function cancelReminder(id: string): Promise<void> {
  const rows = await (db as any)[REMINDERS_TABLE]
    .where('subcategory')
    .equals(`${REMINDER_SUB_PREFIX}${id}`)
    .toArray()
  for (const row of rows) {
    await (db as any)[REMINDERS_TABLE].delete(row.id)
  }
}

// ============================================================================
// PROCESS QUEUE — fire anything that's due
// ============================================================================

async function getPendingReminders(): Promise<Array<{ dbId: number; record: ReminderRecord }>> {
  const rows = await (db as any)[REMINDERS_TABLE]
    .where('category')
    .equals(REMINDER_CATEGORY)
    .toArray()
  const out: Array<{ dbId: number; record: ReminderRecord }> = []
  for (const row of rows) {
    const content = row.content as ReminderRecord | undefined
    if (!content || content.status !== 'pending') continue
    out.push({ dbId: row.id, record: content })
  }
  return out
}

async function markReminderStatus(dbId: number, status: ReminderRecord['status']): Promise<void> {
  const row = await (db as any)[REMINDERS_TABLE].get(dbId)
  if (!row) return
  const content = row.content as ReminderRecord
  await (db as any)[REMINDERS_TABLE].update(dbId, {
    content: { ...content, status },
    metadata: {
      ...(row.metadata || {}),
      updated_at: new Date().toISOString(),
    },
  })
}

export async function processReminderQueue(): Promise<number> {
  const pending = await getPendingReminders()
  const nowTs = Date.now()
  let fired = 0
  for (const { dbId, record } of pending) {
    const due = new Date(record.fireAt).getTime()
    if (due <= nowTs) {
      await fireNotification(record.title, record.body)
      await markReminderStatus(dbId, 'fired')
      fired++
    }
  }
  return fired
}

// ============================================================================
// TICKER — poll every minute while app is open
// ============================================================================

let _tickerId: ReturnType<typeof setInterval> | null = null

export function startReminderTicker(intervalMs = 60_000): () => void {
  if (_tickerId !== null) return stopReminderTicker
  // Kick once immediately so we catch anything that went due while the app
  // was closed. Then tick on the regular interval.
  void processReminderQueue().then(n => {
    if (n > 0) console.log(`🔔 Backlog on startup: fired ${n} reminder(s)`)
  })
  _tickerId = setInterval(() => {
    void processReminderQueue()
  }, intervalMs)
  console.log('🔔 Reminder ticker started')
  return stopReminderTicker
}

export function stopReminderTicker(): void {
  if (_tickerId !== null) {
    clearInterval(_tickerId)
    _tickerId = null
    console.log('🔔 Reminder ticker stopped')
  }
}
