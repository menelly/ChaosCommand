/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Per-run routine sessions (CHA-167). A routine isn't a once-a-day thing — you
 * might run a meal/glucose routine every meal, or a hydration routine five times
 * a day. So "done" can't mean "logged today"; it means "logged since you tapped
 * Run *this time*."
 *
 * Tapping Run on the hub calls startRun(), stamping a fresh session time for that
 * routine. The run page + flow bar then treat a tracker as done only if its most
 * recent log is at/after that stamp. Running again later the same day re-stamps →
 * a fresh checklist. No time-windows to configure; the USER sets the cadence by
 * running it when they need it.
 *
 * Persisted per-routine in localStorage (pin-keyed) so the run survives a reload
 * and is shared by the run page and the flow bar. Navigating *back* to a run
 * (flow bar's "← routine") does NOT re-stamp — only the explicit Run button does.
 */

import { formatDateForStorage } from '@/lib/database'
import { clearAllSkipped } from './routine-skipped'
import { clearAllCleared } from './routine-cleared'

const KEY_PREFIX = 'chaos-routine-run-'

function storageKey(pin: string, routineId: string): string {
  return `${KEY_PREFIX}${pin}-${routineId}`
}

/** Epoch ms of when this routine's current run started, or null if never run. */
export function getRunStart(pin: string, routineId: string): number | null {
  if (typeof window === 'undefined' || !pin || !routineId) return null
  try {
    const raw = localStorage.getItem(storageKey(pin, routineId))
    if (raw === null) return null
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Stamp a fresh run for this routine (called when the user taps Run). Returns
 *  the new start time. */
export function startRun(pin: string, routineId: string): number {
  const now = Date.now()
  if (typeof window === 'undefined' || !pin || !routineId) return now
  try {
    localStorage.setItem(storageKey(pin, routineId), String(now))
    // Fresh run = clean slate: wipe this routine's skips + "nothing" marks too,
    // so re-running gives a fully fresh checklist (not just reset logged status).
    const date = formatDateForStorage(new Date())
    clearAllSkipped(pin, routineId, date)
    clearAllCleared(pin, routineId, date)
  } catch (e) {
    console.error('Failed to start routine run:', e)
  }
  return now
}
