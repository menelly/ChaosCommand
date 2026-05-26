/*
 * Backup reminder — OPT-IN, per-PIN. (Ace, 2026-05-26 — CHA-226 family)
 *
 * Command already has encrypted AES-256 export + import/restore. The missing
 * resilience piece was a gentle nudge to actually DO it. This is consent-to-be-
 * nagged: OFF by default, the user turns it on and picks the cadence. Respects
 * people (esp. AuDHD/disabled) who hate forced notifications — presume competence.
 *
 * Tracking is local + privacy-preserving (no phone-home): we store the last backup
 * time + the entry count at that time, per PIN, in prefs. "Backed up" = ANY export
 * (encrypted OR plain) — both leave a recoverable copy, which is the whole point.
 *
 * Storage (per-PIN via lib/prefs):
 *   chaos-backup-reminder-enabled    'true' | 'false'   (default false)
 *   chaos-backup-reminder-cadence    weekly|monthly|entries|never (default entries)
 *   chaos-backup-reminder-threshold  number of new entries (default 20)
 *   chaos-backup-last-at             ms timestamp of last export
 *   chaos-backup-last-count          daily_data count at last export
 *   chaos-backup-nudge-dismissed-at  ms timestamp of last "remind me later"
 */
import { getPref, setPref, getPrefNumber } from '@/lib/prefs'
import { db } from '@/lib/database/dexie-db'

export type BackupCadence = 'weekly' | 'monthly' | 'entries' | 'never'

const K_ENABLED = 'chaos-backup-reminder-enabled'
const K_CADENCE = 'chaos-backup-reminder-cadence'
const K_THRESHOLD = 'chaos-backup-reminder-threshold'
const K_LAST_AT = 'chaos-backup-last-at'
const K_LAST_COUNT = 'chaos-backup-last-count'
const K_DISMISSED_AT = 'chaos-backup-nudge-dismissed-at'

const DAY = 86_400_000
const SNOOZE_MS = 3 * DAY // "remind me later" hushes it for 3 days
const DEFAULT_THRESHOLD = 20

export interface BackupReminderSettings {
  enabled: boolean
  cadence: BackupCadence
  entryThreshold: number
}

export function getBackupSettings(): BackupReminderSettings {
  return {
    enabled: getPref(K_ENABLED) === 'true',
    cadence: ((getPref(K_CADENCE) as BackupCadence) || 'entries'),
    entryThreshold: getPrefNumber(K_THRESHOLD, DEFAULT_THRESHOLD),
  }
}

export function setBackupSettings(p: Partial<BackupReminderSettings>): void {
  if (p.enabled !== undefined) setPref(K_ENABLED, String(p.enabled))
  if (p.cadence !== undefined) setPref(K_CADENCE, p.cadence)
  if (p.entryThreshold !== undefined) setPref(K_THRESHOLD, String(p.entryThreshold))
}

/**
 * Stamp a successful export as a backup. Call from BOTH export handlers
 * (encrypted + plain). Clears any active snooze — fresh slate.
 */
export async function recordBackup(): Promise<void> {
  try {
    const count = await db.daily_data.count()
    setPref(K_LAST_AT, String(Date.now()))
    setPref(K_LAST_COUNT, String(count))
    setPref(K_DISMISSED_AT, '') // a real backup resets the clock entirely
  } catch {
    /* best-effort; never block an export on bookkeeping */
  }
}

/** "Remind me later" — hush the nudge for SNOOZE_MS. */
export function snoozeBackupNudge(): void {
  setPref(K_DISMISSED_AT, String(Date.now()))
}

export interface BackupNudge {
  show: boolean
  message: string
  entriesSince: number
}

/**
 * Decide whether to show the dashboard nudge right now. Pure read — safe to call
 * on mount. Returns show=false unless the user opted in AND the cadence is due
 * AND they haven't snoozed recently AND there's actually data to lose.
 */
export async function getBackupNudge(): Promise<BackupNudge> {
  const none: BackupNudge = { show: false, message: '', entriesSince: 0 }
  const s = getBackupSettings()
  if (!s.enabled || s.cadence === 'never') return none

  let count = 0
  try {
    count = await db.daily_data.count()
  } catch {
    return none
  }
  if (count === 0) return none // nothing to back up yet — never nag an empty profile

  const lastAt = getPrefNumber(K_LAST_AT, 0)
  const lastCount = getPrefNumber(K_LAST_COUNT, 0)
  const dismissedAt = getPrefNumber(K_DISMISSED_AT, 0)
  const now = Date.now()

  if (dismissedAt && now - dismissedAt < SNOOZE_MS) return none // recently snoozed

  const entriesSince = Math.max(0, count - lastCount)

  // Never backed up, but data exists → always worth one nudge (past snooze).
  if (!lastAt) {
    return {
      show: true,
      entriesSince: count,
      message: `You've logged ${count} ${count === 1 ? 'thing' : 'things'} and haven't backed up yet. Want to save a copy somewhere safe? 🐧`,
    }
  }

  let due = false
  if (s.cadence === 'entries') due = entriesSince >= s.entryThreshold
  else if (s.cadence === 'weekly') due = now - lastAt >= 7 * DAY
  else if (s.cadence === 'monthly') due = now - lastAt >= 30 * DAY

  if (!due) return none

  const message =
    s.cadence === 'entries'
      ? `You've logged ${entriesSince} new ${entriesSince === 1 ? 'thing' : 'things'} since your last backup. Want to export them somewhere safe? 🐧`
      : `It's been a while since your last backup. Want to export a fresh copy somewhere safe? 🐧`

  return { show: true, message, entriesSince }
}
