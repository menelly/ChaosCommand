/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Skip / hide for now" markers for a routine RUN (CHA-167). Skip is the soft
 * dismiss — "not dealing with this right now" — distinct from "nothing to log"
 * (routine-cleared.ts) which counts as done. Skipped trackers stay visible
 * (greyed, with Unskip) and are hidden from the flow bar's "Next".
 *
 * Scoped per-routine + per-day (not global) so skipping a tracker in one routine
 * doesn't skip it in another, and reset on each fresh Run (see routine-session)
 * so re-running a routine gives a clean checklist. Pin-keyed localStorage.
 *
 * Storage: chaos-routine-skipped-${pin}-${routineId}-${YYYY-MM-DD} -> JSON array.
 */

const KEY_PREFIX = 'chaos-routine-skipped-'

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
    console.error('Failed to save routine skips:', e)
  }
}

export function getSkippedTrackers(pin: string, routineId: string, date: string): Set<string> {
  return new Set(read(pin, routineId, date))
}

export function markSkipped(pin: string, routineId: string, date: string, trackerId: string): void {
  if (!pin || !routineId) return
  const set = new Set(read(pin, routineId, date))
  set.add(trackerId)
  write(pin, routineId, date, Array.from(set))
}

export function unmarkSkipped(pin: string, routineId: string, date: string, trackerId: string): void {
  if (!pin || !routineId) return
  const set = new Set(read(pin, routineId, date))
  set.delete(trackerId)
  write(pin, routineId, date, Array.from(set))
}

/** Wipe all skips for a routine+day — called when a fresh Run starts. */
export function clearAllSkipped(pin: string, routineId: string, date: string): void {
  if (typeof window === 'undefined' || !pin || !routineId) return
  try {
    localStorage.removeItem(storageKey(pin, routineId, date))
  } catch (e) {
    console.error('Failed to clear routine skips:', e)
  }
}
