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

import { db } from '@/lib/database/dexie-db'
import { isMobilePlatform } from '@/lib/platform'

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

// Cache ONLY the positive. We must never cache a "denied" — the old code did
// (`_permissionChecked`) and it created the "granted at the OS level but the app
// insists it's blocked" bug: the reminder ticker checks permission on mount,
// often before the user has granted, that first `false` got cached for the whole
// session, and nothing re-checked it — not even an app restart, because the early
// check races the same way every launch.
let _permissionGranted = false

export async function ensureNotificationPermission(): Promise<boolean> {
  if (_permissionGranted) return true
  try {
    // Query the OS DIRECTLY via the raw plugin command. The plugin's JS
    // `isPermissionGranted()` short-circuits on `window.Notification.permission`,
    // a value cached once at webview startup that goes stale the moment the user
    // grants in system settings — so it keeps returning the startup answer. The
    // raw command always reflects current OS state.
    const { invoke } = await import('@tauri-apps/api/core')
    let granted = false
    try {
      // Returns true (granted), false (denied), or null (prompt — not yet asked).
      const res = await invoke<boolean | null>('plugin:notification|is_permission_granted')
      if (res === true) {
        granted = true
      } else if (res === null) {
        // Never been asked → ask now.
        const p = await invoke<string>('plugin:notification|request_permission')
        granted = p === 'granted'
      } else {
        // OS reports denied. Re-confirm via requestPermission (a no-op prompt if
        // already decided) so a just-granted permission is picked up immediately.
        const p = await invoke<string>('plugin:notification|request_permission')
        granted = p === 'granted'
      }
    } catch {
      // Not Tauri (plain browser / web build) — use the JS wrapper.
      const mod = await import('@tauri-apps/plugin-notification')
      granted = await mod.isPermissionGranted()
      if (!granted) granted = (await mod.requestPermission()) === 'granted'
    }
    _permissionGranted = granted
    return granted
  } catch (e) {
    console.warn('Notification permission check failed (not in Tauri?):', e)
    return false
  }
}

// ============================================================================
// HIGH-PRIORITY CHANNEL (heads-up banner + sound + vibration)
// ============================================================================
//
// Android 8+ delivers a notification's sound/vibration/heads-up behavior from
// its CHANNEL, not the notification. The Tauri plugin's implicit "default"
// channel is Importance.Default → it posts silently-ish into the shade with no
// heads-up banner, which is how a med reminder slid past unnoticed. We create a
// dedicated High-importance channel so reminders pop a banner, play a sound, and
// vibrate — a med reminder has to be impossible to miss. NOTE: the plugin warns
// a notification whose channelId doesn't exist WON'T FIRE, so every scheduler
// awaits ensureReminderChannel() before sending with this id.

export const REMINDER_CHANNEL_ID = 'chaos-reminders'
let _reminderChannelReady = false

export async function ensureReminderChannel(): Promise<void> {
  if (_reminderChannelReady) return
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    await mod.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Reminders',
      description: 'Medication reminders and daily check-ins',
      importance: mod.Importance.High,     // heads-up banner
      visibility: mod.Visibility.Private,  // PHI: hide content on lock screen
      sound: 'default',
      vibration: true,
      lights: true,
    })
    _reminderChannelReady = true
  } catch (e) {
    // createChannel is unavailable outside Tauri / on web — don't block firing;
    // callers fall back to no channelId (default channel) if this never set the flag.
    console.warn('ensureReminderChannel failed (not in Tauri?):', e)
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
    await ensureReminderChannel()
    mod.sendNotification({ title, body, channelId: _reminderChannelReady ? REMINDER_CHANNEL_ID : undefined })
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
  // DESKTOP GUARD: sendNotification ignores `schedule` on desktop and misfires
  // (fires immediately, not at fireAt). Scheduled delivery is a mobile capability,
  // so refuse on desktop — callers route desktop through the in-app ticker
  // (scheduleReminder). Backstop so no future caller reintroduces the bug.
  if (!isMobilePlatform()) return false
  const granted = await ensureNotificationPermission()
  if (!granted) return false
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    await ensureReminderChannel()
    const id = notificationIdFor(opts.key)
    try { await mod.cancel([id]) } catch { /* nothing scheduled yet */ }
    mod.sendNotification({
      id,
      title: opts.title,
      body: opts.body,
      channelId: _reminderChannelReady ? REMINDER_CHANNEL_ID : undefined,
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

/**
 * Schedule a RECURRING OS notification using a calendar-matching interval
 * (e.g. every day at 20:00, or every Monday at 09:00). Unlike
 * scheduleOsNotification (one-shot), this fires repeatedly and keeps firing
 * even when the app is closed — the OS owns the schedule (iOS
 * UNCalendarNotificationTrigger repeats:true / Android calendar alarm).
 *
 * `match` is a partial set of calendar components; the notification fires
 * whenever the wall clock matches all provided fields. Omitting `weekday`
 * → every day; setting `weekday` (1=Sun … 7=Sat) → that day each week.
 *
 * Idempotent: cancels any prior notification under the same string key first,
 * so re-syncing on a settings change never stacks duplicates.
 *
 * `actionTypeId` tags the notification so the tap-router can recognise it as
 * ours and route accordingly. Returns true if handed to the OS.
 */
export async function scheduleRecurringOsNotification(opts: {
  key: string
  title: string
  body: string
  match: { hour?: number; minute?: number; weekday?: number; day?: number }
  actionTypeId?: string
}): Promise<boolean> {
  // DESKTOP GUARD: sendNotification ignores `schedule` on desktop and fires
  // IMMEDIATELY + repeatedly (the spam). Calendar-recurring scheduling is a
  // mobile-only capability, so refuse on desktop — callers route desktop through
  // the in-app once-a-day ticker instead. Belt-and-suspenders so no future caller
  // can reintroduce the spam.
  if (!isMobilePlatform()) return false
  const granted = await ensureNotificationPermission()
  if (!granted) return false
  try {
    const mod = await import('@tauri-apps/plugin-notification')
    await ensureReminderChannel()
    const id = notificationIdFor(opts.key)
    try { await mod.cancel([id]) } catch { /* nothing scheduled yet */ }
    mod.sendNotification({
      id,
      title: opts.title,
      body: opts.body,
      actionTypeId: opts.actionTypeId,
      channelId: _reminderChannelReady ? REMINDER_CHANNEL_ID : undefined,
      // allowWhileIdle:true → fire through Android Doze using an exact alarm.
      schedule: mod.Schedule.interval(opts.match, true),
    })
    console.log(`🔁 OS-scheduled recurring "${opts.title}" @ ${JSON.stringify(opts.match)} (id ${id})`)
    return true
  } catch (e) {
    console.warn('scheduleRecurringOsNotification failed (not in Tauri?):', e)
    return false
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

/**
 * How long after a reminder's fire time it's still worth showing. A reminder
 * that came due in the last STALE_GRACE_MS fires normally (you just missed it —
 * useful). One older than that is marked 'missed' SILENTLY and never shown.
 *
 * WHY: the ticker's startup kick (startReminderTicker) runs processReminderQueue
 * once on every app open. Without this bound, opening the app after it was closed
 * for hours/days replayed EVERY past-due reminder at once — the "flooded with a
 * dozen old notifications on open" bug (both platforms). Worse for meds: a 6-hour-
 * old "time for your 8am dose" firing at 2pm is not just noise, it's misleading.
 * 60 minutes catches a genuinely-just-missed dose without dumping a backlog.
 */
export const STALE_GRACE_MS = 60 * 60 * 1000

export async function processReminderQueue(): Promise<number> {
  const pending = await getPendingReminders()
  const nowTs = Date.now()
  let fired = 0
  let skippedStale = 0
  for (const { dbId, record } of pending) {
    const due = new Date(record.fireAt).getTime()
    if (due > nowTs) continue // not due yet
    if (nowTs - due > STALE_GRACE_MS) {
      // Past the grace window → mark missed, do NOT fire. This is the whole
      // fix for the open-the-app flood: stale reminders retire silently.
      await markReminderStatus(dbId, 'missed')
      skippedStale++
      continue
    }
    await fireNotification(record.title, record.body)
    await markReminderStatus(dbId, 'fired')
    fired++
  }
  if (skippedStale > 0) {
    console.log(`🔕 Retired ${skippedStale} stale reminder(s) silently (past ${STALE_GRACE_MS / 60000}min grace) — no flood`)
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
