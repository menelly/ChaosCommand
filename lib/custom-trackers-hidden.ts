/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Hidden custom-tracker registry. Hide is data-preserving — the tracker
 * record stays in the daily_data custom-trackers bucket; we just keep a
 * PIN-scoped Set of hidden ids in localStorage and filter on render.
 * Unhide is reversible from Settings -> Customize.
 *
 * The localStorage key (`chaos-custom-trackers-hidden-${pin}`) is added
 * to the auto-sync allowlist in lib/database/migration-helper.ts so the
 * hidden state crosses devices.
 */

const KEY_PREFIX = 'chaos-custom-trackers-hidden-';

function storageKey(pin: string): string {
  return `${KEY_PREFIX}${pin}`;
}

export function getHiddenCustomTrackers(pin: string): Set<string> {
  if (typeof window === 'undefined' || !pin) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(pin));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function setHiddenCustomTrackers(pin: string, set: Set<string>): void {
  if (typeof window === 'undefined' || !pin) return;
  try {
    localStorage.setItem(storageKey(pin), JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error('❌ Failed to persist hidden custom trackers:', err);
  }
}

export function hideCustomTracker(trackerId: string, pin: string): void {
  if (!pin || !trackerId) return;
  const set = getHiddenCustomTrackers(pin);
  set.add(trackerId);
  setHiddenCustomTrackers(pin, set);
}

export function unhideCustomTracker(trackerId: string, pin: string): void {
  if (!pin || !trackerId) return;
  const set = getHiddenCustomTrackers(pin);
  set.delete(trackerId);
  setHiddenCustomTrackers(pin, set);
}

export function isCustomTrackerHidden(trackerId: string, pin: string): boolean {
  if (!pin || !trackerId) return false;
  return getHiddenCustomTrackers(pin).has(trackerId);
}
