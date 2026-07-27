/*
 * Built by: Ace (Claude Opus 4.8)
 * Date: 2026-07-23
 *
 * pwa-runtime.tsx — the small web/PWA runtime glue. Three jobs, all no-ops in
 * the native Tauri app:
 *
 *   1. Register the service worker (offline shell — public/sw.js).
 *   2. Request PERSISTENT storage. iOS/Safari can evict a site's IndexedDB when
 *      space is low or the app sits unused — catastrophic for a medical tracker.
 *      An installed PWA is far likelier to be granted persistence; ask for it.
 *   3. Show the iOS "Add to Home Screen" hint (iOS hides the install flow behind
 *      Share → Add to Home Screen, so users need to be told once).
 *
 * The background auto-lock is NOT here — it already lives in user-context.tsx
 * (visibilitychange → logout), platform-agnostic, and works in the PWA as-is.
 */

'use client'

import { useEffect, useState } from 'react'
import { getPref, setPref } from '@/lib/prefs'
import { isNativeApp } from '@/lib/pwa-mode'

const IOS_HINT_KEY = 'chaos-ios-install-hint-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes navigator.standalone for home-screen apps.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as Mac; disambiguate by touch.
    (navigator.platform === 'MacIntel' && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1)
  const webkit = /webkit/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
  return iOS && webkit
}

export default function PwaRuntime() {
  const [showIosHint, setShowIosHint] = useState(false)

  useEffect(() => {
    if (isNativeApp()) return

    // 1. Service worker (production only — dev has its own asset pipeline).
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[pwa] service worker registration failed:', err)
      })
    }

    // 2. Persistent storage — fight IndexedDB eviction of medical data.
    if (navigator.storage?.persist) {
      navigator.storage.persisted().then((already) => {
        if (!already) navigator.storage.persist().then((granted) => {
          console.log(`[pwa] persistent storage ${granted ? 'granted' : 'denied'}`)
        })
      }).catch(() => {})
    }

    // 3. iOS install hint — only iOS Safari, not already installed, not dismissed.
    if (isIOSSafari() && !isStandalone() && getPref(IOS_HINT_KEY) !== 'true') {
      setShowIosHint(true)
    }
  }, [])

  const dismissHint = () => {
    setShowIosHint(false)
    try { setPref(IOS_HINT_KEY, 'true') } catch {}
  }

  if (!showIosHint) return null

  return (
    <div
      role="dialog"
      aria-label="Install Chaos Command"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="text-sm font-semibold text-foreground">Install Chaos Command 🐙</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Add it to your home screen so it opens like an app and keeps your data more reliably:
        tap <span className="font-semibold text-foreground">Share</span> (the box with the up-arrow),
        then <span className="font-semibold text-foreground">Add to Home Screen</span>.
      </p>
      <button
        onClick={dismissHint}
        className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        Got it
      </button>
    </div>
  )
}
