/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Per-day "skip / hide for now" markers for routine trackers (CHA-167). Skip is
 * the soft dismiss — "not dealing with this right now" — distinct from the
 * "nothing to log today" positive clear (routine-cleared.ts) which counts as
 * done. Skipped trackers stay visible (greyed, with an Unskip) so they're never
 * lost, and they're hidden from the flow bar's "Next" so it doesn't loop back.
 *
 * Persisted per-day in localStorage so BOTH surfaces — the run page list and the
 * bottom flow bar on a tracker page — share one skip state, and a skip survives
 * a reload instead of silently resetting. Pin-keyed; the date in the key means
 * yesterday's skips never leak into today.
 *
 * Storage: chaos-routine-skipped-${pin}-${YYYY-MM-DD} -> JSON array of trackerIds.
 */

const KEY_PREFIX = 'chaos-routine-skipped-'

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
    console.error('Failed to save routine skips:', e)
  }
}

export function getSkippedTrackers(pin: string, date: string): Set<string> {
  return new Set(read(pin, date))
}

export function markSkipped(pin: string, date: string, trackerId: string): void {
  if (!pin) return
  const set = new Set(read(pin, date))
  set.add(trackerId)
  write(pin, date, Array.from(set))
}

export function unmarkSkipped(pin: string, date: string, trackerId: string): void {
  if (!pin) return
  const set = new Set(read(pin, date))
  set.delete(trackerId)
  write(pin, date, Array.from(set))
}
