/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Per-tracker "celebrate when I save" preferences. Confetti is gated globally
 * by chaos-confetti-level, but some trackers are emotionally inappropriate
 * places to fire dopamine confetti (logging a panic attack, filling out a
 * safety plan). This module owns the per-tracker opt-OUT list.
 *
 * Storage shape: localStorage key chaos-celebration-disabled-${pin}, value is
 * a JSON array of tracker IDs the user has opted out of. Default is empty
 * (celebrate everywhere) so newly added trackers celebrate without an opt-in
 * step. The first time the key is written for a PIN, we pre-populate a small
 * sensitivity list so crisis/mental-health surfaces don't celebrate on first
 * run.
 */

const KEY_PREFIX = 'chaos-celebration-disabled-'
const FIRST_RUN_FLAG_PREFIX = 'chaos-celebration-defaults-applied-'

// Trackers that should NOT celebrate by default. Logging a crisis or panic
// attack is a "thank you for surviving," not a "yay you did the thing"
// moment — confetti there reads as gross. Users can re-enable per-tracker
// if they actually want it.
export const SENSITIVITY_DEFAULTS: readonly string[] = [
  'crisis-support',
  'mental-health-general',
  'anxiety-tracker',
]

function storageKey(pin: string): string {
  return `${KEY_PREFIX}${pin}`
}

function firstRunFlag(pin: string): string {
  return `${FIRST_RUN_FLAG_PREFIX}${pin}`
}

function readRaw(pin: string): string[] | null {
  if (typeof window === 'undefined' || !pin) return null
  try {
    const raw = localStorage.getItem(storageKey(pin))
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return null
  }
}

function writeRaw(pin: string, ids: string[]): void {
  if (typeof window === 'undefined' || !pin) return
  try {
    localStorage.setItem(storageKey(pin), JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save celebration prefs:', e)
  }
}

// One-shot: seed the sensitivity defaults the first time a PIN ever reads or
// writes celebration prefs. Tracked by a separate flag so a user who
// deliberately empties the disabled set isn't re-seeded next session.
function ensureFirstRunDefaults(pin: string): void {
  if (typeof window === 'undefined' || !pin) return
  const flag = firstRunFlag(pin)
  if (localStorage.getItem(flag) === '1') return
  if (readRaw(pin) === null) {
    writeRaw(pin, [...SENSITIVITY_DEFAULTS])
  }
  try {
    localStorage.setItem(flag, '1')
  } catch (e) {
    console.error('Failed to set celebration first-run flag:', e)
  }
}

export function initCelebrationDefaults(pin: string): void {
  ensureFirstRunDefaults(pin)
}

export function getCelebrationDisabled(pin: string): Set<string> {
  if (!pin) return new Set()
  ensureFirstRunDefaults(pin)
  const list = readRaw(pin)
  return new Set(list ?? [])
}

export function setCelebrationDisabled(pin: string, set: Set<string>): void {
  if (!pin) return
  writeRaw(pin, Array.from(set))
}

export function isCelebrationEnabled(trackerId: string, pin: string): boolean {
  if (!pin) return true
  return !getCelebrationDisabled(pin).has(trackerId)
}

export function setCelebrationForTracker(
  trackerId: string,
  pin: string,
  enabled: boolean
): void {
  if (!pin) return
  const disabled = getCelebrationDisabled(pin)
  if (enabled) {
    disabled.delete(trackerId)
  } else {
    disabled.add(trackerId)
  }
  setCelebrationDisabled(pin, disabled)
}
