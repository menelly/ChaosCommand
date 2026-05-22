/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Nothing to log today" markers for a routine RUN (CHA-167). On a good day you
 * don't HAVE a seizure to log (yay!) — but the routine should still surface the
 * tracker to remind you to check, and you clear it as consciously handled: "I
 * looked, nothing happened." Counts toward "all done"; distinct from skip.
 *
 * We don't write a fake entry into the tracker's own data — just a lightweight
 * per-routine, per-day marker, reset on each fresh Run (see routine-session) so
 * re-running gives a clean checklist. Pin-keyed localStorage.
 *
 * Storage: chaos-routine-cleared-${pin}-${routineId}-${YYYY-MM-DD} -> JSON array.
 */

const KEY_PREFIX = 'chaos-routine-cleared-'

function storageKey(pin: string, routineId: string, date: string): string {
  return `${KEY_PREFIX}${pin}-${routineId}-${date}`
}

function read(pin: string, routineId: string, date: string): string[] {
  if (typeof window === 'undefined' || !pin || !routineId) return []
  try {
    const raw = localStorage.getItem(storageKey(pin, routineId, date))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(pin: string, routineId: string, date: string, ids: string[]): void {
  if (typeof window === 'undefined' || !pin || !routineId) return
  try {
    localStorage.setItem(storageKey(pin, routineId, date), JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save routine clears:', e)
  }
}

export function getClearedTrackers(pin: string, routineId: string, date: string): Set<string> {
  return new Set(read(pin, routineId, date))
}

export function markNothingToLog(pin: string, routineId: string, date: string, trackerId: string): void {
  if (!pin || !routineId) return
  const set = new Set(read(pin, routineId, date))
  set.add(trackerId)
  write(pin, routineId, date, Array.from(set))
}

export function unmarkNothingToLog(pin: string, routineId: string, date: string, trackerId: string): void {
  if (!pin || !routineId) return
  const set = new Set(read(pin, routineId, date))
  set.delete(trackerId)
  write(pin, routineId, date, Array.from(set))
}

/** Wipe all "nothing to log" marks for a routine+day — called on a fresh Run. */
export function clearAllCleared(pin: string, routineId: string, date: string): void {
  if (typeof window === 'undefined' || !pin || !routineId) return
  try {
    localStorage.removeItem(storageKey(pin, routineId, date))
  } catch (e) {
    console.error('Failed to clear routine "nothing" marks:', e)
  }
}
