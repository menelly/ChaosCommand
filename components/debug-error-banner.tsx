/*
 * Built by: Ace (Claude Opus 5), with Ren
 * Date: 2026-07-24
 *
 * 🔍 TEMPORARY DIAGNOSTIC — DELETE ME once the iOS save bug is fixed.
 * Paired with recordSaveFailure() in lib/database/dexie-db.ts.
 *
 * WHY THIS EXISTS
 * On iOS there is no console. Every tracker catches its save error, shows a
 * generic "Failed to save X" toast, and console.errors the REAL reason — which
 * is unreachable on the exact device where the bug happens. We burned an hour
 * guessing because the app HAD the diagnosis and wouldn't show it.
 *
 * Known so far (2026-07-24, on pwa.chaoscommand.center, a clean origin):
 *   - localStorage writes persist fine (survival counter survives logout/login)
 *   - EVERY Dexie `daily_data` write fails  -> the encrypted write path
 *   - demo gate is not involved (this build has DEMO_MODE off entirely)
 * So the question is narrow: is there a session key at write time, and if there
 * is, does encryptValue() itself throw?
 *
 * Renders ONLY when there is something to report, so it costs nothing when
 * things work.
 */
'use client'

import { useEffect, useState } from 'react'
import { hasSessionKey, getNamespaceId } from '@/lib/database/session-crypto'

const KEY = 'chaos-last-save-error'

export function DebugErrorBanner() {
  const [err, setErr] = useState<string | null>(null)
  const [keyState, setKeyState] = useState<string>('')

  useEffect(() => {
    const read = () => {
      try {
        setErr(localStorage.getItem(KEY))
      } catch { /* ignore */ }
      try {
        // The two facts that decide this: is a key derived, and is a profile pointed at?
        setKeyState(`key=${hasSessionKey() ? 'YES' : 'NO'} ns=${getNamespaceId() ? 'set' : 'none'}`)
      } catch (e) {
        setKeyState(`keyState threw: ${String(e)}`)
      }
    }
    read()
    // Poll: the error is written from a non-React context (a Dexie middleware),
    // so there's no state update to subscribe to.
    const t = setInterval(read, 1000)

    // Catch-all for anything that ISN'T the encryption path, so a different
    // failure can't hide behind an empty banner.
    const onErr = (e: ErrorEvent) => {
      try { localStorage.setItem(KEY, `[window.onerror] ${e.message}`) } catch {}
    }
    const onRej = (e: PromiseRejectionEvent) => {
      const r: any = e.reason
      const msg = r instanceof Error ? `${r.name}: ${r.message}` : String(r)
      try { localStorage.setItem(KEY, `[unhandledrejection] ${msg}`) } catch {}
    }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)
    return () => {
      clearInterval(t)
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onRej)
    }
  }, [])

  if (!err) return null

  return (
    <div
      role="alert"
      style={{
        padding: '0.6rem 0.9rem',
        background: '#111827',
        color: '#fca5a5',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.75rem',
        lineHeight: 1.45,
        wordBreak: 'break-word',
        borderBottom: '2px solid #dc2626',
      }}
    >
      <div style={{ color: '#fbbf24', fontWeight: 700 }}>🔍 SAVE DIAGNOSTIC (temporary)</div>
      <div>{err}</div>
      <div style={{ color: '#93c5fd' }}>{keyState}</div>
      <button
        onClick={() => { try { localStorage.removeItem(KEY) } catch {}; setErr(null) }}
        style={{
          marginTop: '0.4rem', padding: '0.2rem 0.6rem', fontSize: '0.7rem',
          background: '#374151', color: '#fff', border: '1px solid #6b7280', borderRadius: 4,
        }}
      >
        clear
      </button>
    </div>
  )
}
