/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Logged today?" status for routine cards (CHA-167). A tracker stores all of a
 * given day's entries in one daily_data record (date + CATEGORIES.TRACKER +
 * subcategory, content.entries = that day's list). So "logged today" is simply:
 * today's record exists for that subcategory AND has at least one entry.
 *
 * These are PURE functions — the run page fetches records via
 * useDailyData().getDateRange(today, today, CATEGORIES.TRACKER) and passes them
 * in. No DB or window access here, so it's trivially testable.
 */

import type { DailyDataRecord } from '@/lib/database/dexie-db'

export interface TrackerLoggedStatus {
  loggedToday: boolean
  /** Human label for the most recent log today, e.g. "7:42 AM". Null if none. */
  lastLoggedLabel: string | null
}

// Per-entry timestamp field names seen across the tracker modals. We try these
// in order for an accurate "logged at" time, then fall back to the record's
// own metadata.updated_at (always present).
const ENTRY_TIME_FIELDS = ['time', 'timestamp', 'datetime', 'dateTime', 'loggedAt', 'entryTime', 'createdAt']

function parseMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

/** Best-effort most-recent timestamp (ms) for a day's record. Scans built-in
 *  entry arrays, then the custom-tracker savedAt, then record metadata. */
function latestEntryMs(record: DailyDataRecord): number | null {
  const entries: unknown = record.content?.entries
  let best: number | null = null
  if (Array.isArray(entries)) {
    for (const e of entries) {
      if (typeof e !== 'object' || e === null) continue
      for (const field of ENTRY_TIME_FIELDS) {
        const ms = parseMs((e as Record<string, unknown>)[field])
        if (ms !== null && (best === null || ms > best)) best = ms
      }
    }
  }
  // Custom (Forge) trackers store one object per day: { values, savedAt }.
  if (best === null) best = parseMs(record.content?.savedAt)
  if (best === null) best = parseMs(record.metadata?.updated_at) ?? parseMs(record.metadata?.created_at)
  return best
}

/** Did this record capture a log today? Trackers store wildly different content
 *  shapes — content.entries[] (most), a flat object (energy), a raw array
 *  (weather), content.values{} (custom Forge), or a JSON string. So: any record
 *  that exists for the subcategory today with non-empty content counts as logged.
 *  (Trackers only write a record when there's data, so this is safe.) */
function recordHasLog(record: DailyDataRecord | undefined): boolean {
  if (!record) return false
  const c = record.content as unknown
  if (c == null) return false
  if (Array.isArray(c)) return c.length > 0                       // weather: raw array
  if (typeof c === 'string') return c.trim().length > 0           // missed-work: JSON string
  if (typeof c === 'object') {
    const obj = c as Record<string, unknown>
    if (Array.isArray(obj.entries)) return obj.entries.length > 0
    if (Array.isArray(obj.activities)) return (obj.activities as unknown[]).length > 0  // energy
    if (obj.values && typeof obj.values === 'object') return Object.keys(obj.values as object).length > 0
    return Object.keys(obj).length > 0                            // energy flat object + fallback
  }
  return false
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Status for one subcategory given today's already-fetched tracker records. */
export function computeTrackerStatus(
  todayRecords: DailyDataRecord[],
  subcategory: string
): TrackerLoggedStatus {
  const record = todayRecords.find(r => r.subcategory === subcategory)
  if (!recordHasLog(record) || !record) return { loggedToday: false, lastLoggedLabel: null }
  const ms = latestEntryMs(record)
  return { loggedToday: true, lastLoggedLabel: ms !== null ? formatTime(ms) : null }
}

/** Status for every tracker in a routine, keyed by tracker id. Pass the
 *  resolved trackables (built-in + custom) so custom subcategories work too. */
export function buildStatusMap(
  todayRecords: DailyDataRecord[],
  trackables: { id: string; subcategory: string }[]
): Record<string, TrackerLoggedStatus> {
  const out: Record<string, TrackerLoggedStatus> = {}
  for (const t of trackables) {
    out[t.id] = computeTrackerStatus(todayRecords, t.subcategory)
  }
  return out
}

/** True when every tracker in the routine has been logged today. */
export function allLogged(statusMap: Record<string, TrackerLoggedStatus>): boolean {
  const vals = Object.values(statusMap)
  return vals.length > 0 && vals.every(s => s.loggedToday)
}
