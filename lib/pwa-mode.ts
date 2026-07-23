/*
 * Built by: Ace (Claude Opus 4.8)
 * Date: 2026-07-23
 *
 * pwa-mode.ts — one place to decide "is this a persist-my-data context or a
 * throwaway sandbox?"
 *
 * The web build ships two personalities from ONE deploy:
 *   - Opened in a browser TAB on the demo build  → try-me sandbox, writes are
 *     no-ops (a stranger can poke around and nothing sticks).
 *   - INSTALLED to the home screen (standalone)   → the real app; writes persist
 *     to the user's encrypted on-device store.
 *
 * So "block writes" is `IS_DEMO && !installed`, not just `IS_DEMO`. Installing it
 * is the deliberate act that flips it from demo to real — which is exactly what
 * we tell users in the demo banner and the security disclosure.
 *
 * Non-demo builds (a real deploy, or the native app) always persist.
 */

const IS_DEMO_BUILD = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** True when launched as an installed PWA (home-screen / standalone), any platform. */
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false
  const mm = window.matchMedia?.('(display-mode: standalone)').matches
  // iOS Safari uses the legacy navigator.standalone flag for home-screen apps.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return Boolean(mm || iosStandalone)
}

/**
 * The write-blocking condition. TRUE only in the demo build AND when NOT installed
 * — i.e. the public try-me sandbox in a browser tab. Anywhere data should really
 * be saved (installed PWA, real deploy, native app) this is false.
 *
 * Client-side only; on the server it returns false (SSR never persists anyway).
 */
export function isDemoSandbox(): boolean {
  if (!IS_DEMO_BUILD) return false
  if (typeof window === 'undefined') return false
  return !isInstalledPWA()
}

/** Convenience: this context should persist real data. */
export function shouldPersist(): boolean {
  return !isDemoSandbox()
}
