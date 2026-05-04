/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Opt-in automatic update check. Off by default. When the user enables it,
 * the app fetches the public manifest at most once every 12 hours on boot
 * and surfaces a toast if a newer version is available. No telemetry, no
 * identifiers — same fetch the manual button uses.
 */

import { APP_VERSION, UPDATE_MANIFEST_URL, isNewerVersion } from '@/lib/app-version'

const PREF_KEY = 'chaos-auto-update-check'
const LAST_CHECK_KEY = 'chaos-auto-update-last-check'
const THROTTLE_MS = 12 * 60 * 60 * 1000 // 12 hours

export interface AutoUpdateManifest {
  version: string
  released?: string
  url?: string
  notes?: string
}

export function getAutoUpdatePref(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PREF_KEY) === 'true'
}

export function setAutoUpdatePref(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREF_KEY, enabled ? 'true' : 'false')
}

/**
 * Run a silent update check IF the user has opted in AND the throttle window
 * has elapsed since the last check. Returns the newer manifest if one is
 * available, otherwise null. Errors are swallowed silently — this is a
 * best-effort background check, not something the user asked for.
 */
export async function maybeRunAutoUpdateCheck(): Promise<AutoUpdateManifest | null> {
  if (!getAutoUpdatePref()) return null

  const last = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10)
  const now = Date.now()
  if (Number.isFinite(last) && now - last < THROTTLE_MS) return null

  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 8000)
    const res = await fetch(UPDATE_MANIFEST_URL, {
      method: 'GET',
      signal: ctl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as Partial<AutoUpdateManifest>
    if (!data || typeof data.version !== 'string') return null

    localStorage.setItem(LAST_CHECK_KEY, String(now))

    if (!isNewerVersion(APP_VERSION, data.version)) return null

    return {
      version: data.version,
      released: typeof data.released === 'string' ? data.released : undefined,
      url: typeof data.url === 'string' ? data.url : undefined,
      notes: typeof data.notes === 'string' ? data.notes : undefined,
    }
  } catch {
    return null
  }
}
