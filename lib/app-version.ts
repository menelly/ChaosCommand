/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Single source of truth for the app's version string and the URL of the
 * opt-in update manifest. Bump APP_VERSION in lockstep with
 * src-tauri/tauri.conf.json on every release. The check-for-updates
 * button compares this string against what the manifest reports.
 */

export const APP_VERSION = '0.4.0'

/**
 * URL of the public, static JSON manifest hosted alongside the release
 * downloads. Expected shape:
 *   {
 *     "version": "0.2.5",
 *     "released": "2026-05-15",
 *     "url": "https://chaoscommand.center/download",
 *     "notes": "Optional human-readable changelog summary."
 *   }
 *
 * The endpoint MUST send `Access-Control-Allow-Origin: *` (or echo the
 * Tauri webview origin) so the renderer can fetch it without a proxy.
 */
export const UPDATE_MANIFEST_URL = 'https://chaoscommand.center/version.json'

/**
 * Compare two dotted-numeric version strings (e.g. "0.2.0" vs "0.2.5").
 * Returns true if `candidate` is strictly newer than `current`. Tolerates
 * differing segment counts ("0.2" < "0.2.1") and leading "v". Any
 * non-numeric segments are treated as 0 to fail safely (no false-positive
 * "update available").
 */
export function isNewerVersion(current: string, candidate: string): boolean {
  const norm = (v: string) =>
    String(v || '')
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map(s => {
        const n = parseInt(s, 10)
        return Number.isFinite(n) ? n : 0
      })

  const a = norm(current)
  const b = norm(candidate)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (bi > ai) return true
    if (bi < ai) return false
  }
  return false
}
