/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * User-defined Routines — named, ordered sequences of trackers a user logs in
 * one flow instead of opening each tracker separately (CHA-167). Chronic-illness
 * patients have multi-tracker routines (morning meds + glucose + mood + pain) and
 * the "open each separately" friction is the first thing dropped on a bad day.
 *
 * Storage shape: localStorage key chaos-routines-${pin}, value is a JSON array of
 * Routine objects. Pin-keyed so each profile owns its own routines, same posture
 * as celebration-prefs. Routines start EMPTY — no first-run seeding; the user
 * builds the ones that match their actual life.
 *
 * This module owns config only (CRUD + time-window math). "Logged today" status
 * and autofill prior-entry matching are daily_data queries that live with the
 * routine run page.
 */

const KEY_PREFIX = 'chaos-routines-'

/** Time-of-day window a routine belongs to. Drives autofill prior-entry matching. */
export type RoutineTimeWindow = 'morning' | 'night' | 'custom'

/** One tracker's membership in a routine. */
export interface RoutineTracker {
  /** Matches a trackers-config id; used to resolve name/emoji/href. */
  trackerId: string
  /** Opt-in autofill from the most recent in-window entry. Default OFF (trust). */
  autofill: boolean
}

/** A named, ordered routine. */
export interface Routine {
  id: string
  name: string
  emoji: string
  /** Ordered — the order trackers appear as cards on the run page. */
  trackers: RoutineTracker[]
  timeWindow: RoutineTimeWindow
  /** 0-23, only meaningful when timeWindow === 'custom'. Window is this ±6h. */
  customCenterHour?: number
  createdAt: string
}

function storageKey(pin: string): string {
  return `${KEY_PREFIX}${pin}`
}

function isRoutineTracker(x: unknown): x is RoutineTracker {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as RoutineTracker).trackerId === 'string' &&
    typeof (x as RoutineTracker).autofill === 'boolean'
  )
}

function isRoutine(x: unknown): x is Routine {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Routine
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.emoji === 'string' &&
    Array.isArray(r.trackers) &&
    r.trackers.every(isRoutineTracker) &&
    (r.timeWindow === 'morning' || r.timeWindow === 'night' || r.timeWindow === 'custom')
  )
}

function readAll(pin: string): Routine[] {
  if (typeof window === 'undefined' || !pin) return []
  try {
    const raw = localStorage.getItem(storageKey(pin))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRoutine)
  } catch {
    return []
  }
}

function writeAll(pin: string, routines: Routine[]): void {
  if (typeof window === 'undefined' || !pin) return
  try {
    localStorage.setItem(storageKey(pin), JSON.stringify(routines))
  } catch (e) {
    console.error('Failed to save routines:', e)
  }
}

function newId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ---- Public API ----------------------------------------------------------

export function listRoutines(pin: string): Routine[] {
  if (!pin) return []
  return readAll(pin)
}

export function getRoutine(pin: string, id: string): Routine | null {
  if (!pin) return null
  return readAll(pin).find(r => r.id === id) ?? null
}

export function createRoutine(
  pin: string,
  init: { name: string; emoji?: string; timeWindow?: RoutineTimeWindow; customCenterHour?: number }
): Routine | null {
  if (!pin) return null
  const timeWindow = init.timeWindow ?? 'custom'
  const routine: Routine = {
    id: newId(),
    name: init.name.trim() || 'Untitled Routine',
    emoji: init.emoji?.trim() || '📋',
    trackers: [],
    timeWindow,
    customCenterHour:
      timeWindow === 'custom'
        ? init.customCenterHour ?? new Date().getHours()
        : undefined,
    createdAt: new Date().toISOString(),
  }
  const all = readAll(pin)
  all.push(routine)
  writeAll(pin, all)
  return routine
}

/** Update a routine's identity/window fields. Returns the updated routine. */
export function updateRoutine(
  pin: string,
  id: string,
  patch: Partial<Pick<Routine, 'name' | 'emoji' | 'timeWindow' | 'customCenterHour'>>
): Routine | null {
  if (!pin) return null
  const all = readAll(pin)
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return null
  const next: Routine = { ...all[idx], ...patch }
  // Keep customCenterHour coherent with timeWindow.
  if (next.timeWindow !== 'custom') next.customCenterHour = undefined
  else if (next.customCenterHour === undefined) next.customCenterHour = new Date().getHours()
  all[idx] = next
  writeAll(pin, all)
  return next
}

export function deleteRoutine(pin: string, id: string): void {
  if (!pin) return
  writeAll(pin, readAll(pin).filter(r => r.id !== id))
}

/** Replace a routine's tracker list wholesale — covers add / remove / reorder. */
export function setRoutineTrackers(pin: string, id: string, trackers: RoutineTracker[]): Routine | null {
  if (!pin) return null
  const all = readAll(pin)
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], trackers }
  writeAll(pin, all)
  return all[idx]
}

/** Toggle opt-in autofill for one tracker within one routine. */
export function setTrackerAutofill(
  pin: string,
  id: string,
  trackerId: string,
  autofill: boolean
): Routine | null {
  if (!pin) return null
  const all = readAll(pin)
  const idx = all.findIndex(r => r.id === id)
  if (idx === -1) return null
  all[idx] = {
    ...all[idx],
    trackers: all[idx].trackers.map(t => (t.trackerId === trackerId ? { ...t, autofill } : t)),
  }
  writeAll(pin, all)
  return all[idx]
}

// ---- Time-window math (drives autofill prior-entry matching) -------------

/**
 * Hour bounds for a routine's time-of-day window, as [startHour, endHour).
 * endHour may exceed 24 to represent a window that wraps past midnight (night).
 * Callers compare an entry's local hour, adding 24 to hours < startHour when
 * the window wraps. Defaults mirror CHA-167:
 *   morning  → 5..12   (5am – noon)
 *   night    → 17..26  (5pm – 2am, wraps)
 *   custom   → center ±6
 */
export function getWindowHours(routine: Routine): { startHour: number; endHour: number } {
  switch (routine.timeWindow) {
    case 'morning':
      return { startHour: 5, endHour: 12 }
    case 'night':
      return { startHour: 17, endHour: 26 }
    case 'custom': {
      const center = routine.customCenterHour ?? 12
      return { startHour: center - 6, endHour: center + 6 }
    }
  }
}

/** True if an ISO timestamp falls within the routine's time-of-day window. */
export function isWithinWindow(isoTimestamp: string, routine: Routine): boolean {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return false
  const { startHour, endHour } = getWindowHours(routine)
  const hour = d.getHours()
  // Normalise into the window's frame, accounting for wrap past midnight.
  const h = hour < (startHour % 24) ? hour + 24 : hour
  const start = ((startHour % 24) + 24) % 24
  const startNorm = start
  const endNorm = startNorm + (endHour - startHour)
  return h >= startNorm && h < endNorm
}
