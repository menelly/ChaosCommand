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
