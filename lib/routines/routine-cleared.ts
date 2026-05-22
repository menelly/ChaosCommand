/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Nothing to log today" markers for routine trackers (CHA-167). On a good day
 * you don't HAVE a seizure to log (yay!) — but the routine should still surface
 * the tracker to remind you to check, and you want to clear it as consciously
 * handled: "I looked, nothing happened." That's real data about a good day, and
 * it lets a routine actually reach "All done ✓" instead of nagging forever.
 *
 * This is distinct from the session-only "skip / hide for now" dismiss. A
 * "nothing to log" clear PERSISTS for the day and counts toward completion. We
 * don't write a fake entry into the tracker's own data — we keep a lightweight
 * per-day marker in localStorage, pin-keyed, so the tracker's real history stays
 * honest (no phantom episodes).
 *
 * Storage: chaos-routine-cleared-${pin}-${YYYY-MM-DD} -> JSON array of trackerIds.
 * The date in the key means yesterday's clears never leak into today.
 */

const KEY_PREFIX = 'chaos-routine-cleared-'

function storageKey(pin: string, date: string): string {
  return `${KEY_PREFIX}${pin}-${date}`
}

function read(pin: string, date: string): string[] {
  if (typeof window === 'undefined' || !pin) return []
  try {
    const raw = localStorage.getItem(storageKey(pin, date))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(pin: string, date: string, ids: string[]): void {
  if (typeof window === 'undefined' || !pin) return
  try {
    localStorage.setItem(storageKey(pin, date), JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save routine clears:', e)
  }
}

/** Tracker ids the user marked "nothing to log" for the given day. */
export function getClearedTrackers(pin: string, date: string): Set<string> {
  return new Set(read(pin, date))
}

/** Mark a tracker as "nothing to log today" (persists for the day). */
export function markNothingToLog(pin: string, date: string, trackerId: string): void {
  if (!pin) return
  const set = new Set(read(pin, date))
  set.add(trackerId)
  write(pin, date, Array.from(set))
}

/** Undo a "nothing to log" clear (e.g. user actually wants to log after all). */
export function unmarkNothingToLog(pin: string, date: string, trackerId: string): void {
  if (!pin) return
  const set = new Set(read(pin, date))
  set.delete(trackerId)
  write(pin, date, Array.from(set))
}
