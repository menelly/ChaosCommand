/*
 * Per-PIN UI preferences.  (Ace, 2026-05-24 — CHA-226)
 *
 * Medical DATA is already isolated per PIN (Dexie `ChaosCommand_<pin>`). But the
 * UI PREFERENCES — theme, font, animations, text scale, visible trackers, custom
 * colors, etc. — lived in GLOBAL localStorage, so every profile on the device
 * shared one set. That's wrong: a parent and a kid (different PINs) want their own
 * theme and their own visible trackers. This helper namespaces those prefs by the
 * active PIN.
 *
 * Storage key shape:  `chaos-pref:<activePin>:<key>`   (e.g. chaos-pref:4821:chaos-theme)
 * Active PIN source:  localStorage 'chaos-user-pin' (set on login; DO NOT scope this one).
 *
 * Two deliberate fallbacks so nothing breaks:
 *  1. BEFORE login (no active PIN) — e.g. the login screen, first paint — we
 *     read/write the LEGACY global key, so the app still themes itself pre-login.
 *  2. MIGRATION — the first time a PIN reads a pref it doesn't have yet, if a
 *     legacy global value exists we adopt it into the PIN namespace. So existing
 *     users keep their current theme/settings the first time they log in after
 *     this ships; they just become that PIN's settings going forward.
 *
 * Keep this in sync with the inline pre-paint theme script in app/layout.tsx,
 * which must replicate this namespacing by hand (it can't import TS).
 */

const PIN_KEY = 'chaos-user-pin'
const NS = 'chaos-pref'

function activePin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY)
  } catch {
    return null // SSR / private mode
  }
}

function nsKey(pin: string, key: string): string {
  return `${NS}:${pin}:${key}`
}

/** Read a per-PIN pref. Falls back to legacy global (pre-login), and migrates an
 *  existing global value into the PIN namespace on first read. */
export function getPref(key: string, fallback: string | null = null): string | null {
  try {
    const pin = activePin()
    if (!pin) return localStorage.getItem(key) ?? fallback // pre-login: legacy global

    const scoped = localStorage.getItem(nsKey(pin, key))
    if (scoped !== null) return scoped

    // One-time migration: adopt the legacy global value for this PIN if present.
    const legacy = localStorage.getItem(key)
    if (legacy !== null) {
      localStorage.setItem(nsKey(pin, key), legacy)
      return legacy
    }
    return fallback
  } catch {
    return fallback
  }
}

/** Write a per-PIN pref (or legacy global if no PIN is active yet). */
export function setPref(key: string, value: string): void {
  try {
    const pin = activePin()
    localStorage.setItem(pin ? nsKey(pin, key) : key, value)
  } catch {
    /* SSR / private mode — no-op */
  }
}

/** Remove a per-PIN pref. */
export function removePref(key: string): void {
  try {
    const pin = activePin()
    localStorage.removeItem(pin ? nsKey(pin, key) : key)
  } catch {
    /* no-op */
  }
}

/** Convenience for numeric prefs (text scale, bounce intensity, …). */
export function getPrefNumber(key: string, fallback: number): number {
  const raw = getPref(key)
  if (raw === null) return fallback
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}
