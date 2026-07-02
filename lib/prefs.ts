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
 * Storage key shape:  `chaos-pref:<namespaceHash>:<key>`  (e.g. chaos-pref:a1b2…:chaos-theme)
 * Active profile source:  the hashed namespace (session-crypto getNamespaceId()) — NOT
 *   the raw PIN. Namespacing by the raw PIN used to leak it in the localStorage key name;
 *   the hash is a stable per-profile id that exposes nothing.
 *
 * Two deliberate fallbacks so nothing breaks:
 *  1. BEFORE login (no active profile) — e.g. the login screen, first paint — we
 *     read/write the LEGACY global key, so the app still themes itself pre-login.
 *  2. MIGRATION — the first time a profile reads a pref it doesn't have yet, if a
 *     legacy global value exists we adopt it into the profile namespace. So existing
 *     users keep their current theme/settings the first time they log in after
 *     this ships. (Raw-PIN-namespaced keys from before the hash switch are renamed
 *     to the hash namespace by migratePrefKeys(), called from the login migration.)
 *
 * Keep this in sync with the inline pre-paint theme script in app/layout.tsx,
 * which must replicate this namespacing by hand (it can't import TS) — it reads the
 * persisted namespace pointer 'cc.ns'.
 */

import { getNamespaceId } from './database/session-crypto'

const NS = 'chaos-pref'

/** The active profile's hashed namespace (or null pre-login → legacy global fallback). */
function activePin(): string | null {
  return getNamespaceId()
}

function nsKey(pin: string, key: string): string {
  return `${NS}:${pin}:${key}`
}

/**
 * Dash-namespaced localStorage key families that also embed the raw PIN
 * (`<prefix>-<pin>` or `<prefix>-<pin>-<suffix>`). Kept next to prefs because they
 * share the same "raw PIN in the key name" leak and the same rename migration.
 * If you add a new `something-${pin}` localStorage key, add its prefix here too.
 */
const PIN_DASH_PREFIXES = [
  'chaos-onboarding-complete',
  'chaos-personalization-prompted',
  'daily-tasks',
  'gear-check',
  'gear-items',
  'schedule',
  'selfcare-items',
  'selfcare-state',
]

/**
 * One-time rename of a profile's localStorage keys from the old raw-PIN namespace
 * to the hashed namespace — prefs (`chaos-pref:<pin>:*`) AND all the dash-namespaced
 * families above — so switching to hashes doesn't orphan (reset) existing state
 * (theme, onboarding-complete, daily zone, self-care) AND the raw PIN stops
 * appearing in any localStorage key name. Prefix-anchored (no false positives).
 * Idempotent; safe to call every login. Called from the login-time migration.
 */
export function migrateProfileKeys(rawPin: string, namespace: string): void {
  if (rawPin === namespace) return
  try {
    const colonOld = `${NS}:${rawPin}:`
    const colonNew = `${NS}:${namespace}:`
    const renames: Array<[string, string]> = []

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith(colonOld)) {
        renames.push([k, colonNew + k.slice(colonOld.length)])
        continue
      }
      for (const p of PIN_DASH_PREFIXES) {
        const stem = `${p}-${rawPin}`
        if (k === stem || k.startsWith(`${stem}-`)) {
          renames.push([k, `${p}-${namespace}` + k.slice(stem.length)])
          break
        }
      }
    }

    for (const [oldKey, newKey] of renames) {
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey)!)
      }
      localStorage.removeItem(oldKey) // drop the raw-PIN-named key (closes the leak)
    }
  } catch {
    /* SSR / private mode — no-op */
  }
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
