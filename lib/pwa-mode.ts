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

// Once we've EVER seen this instance running installed, we remember it here.
const PWA_LATCH_KEY = 'chaos-pwa-installed'

/**
 * True when running as an installed PWA (home-screen / standalone), any platform.
 *
 * Detection is fail-safe on purpose. The cost of a false NEGATIVE here is
 * catastrophic — on the demo build it flips the app into sandbox mode and
 * silently discards a real user's medical entries — while a false positive just
 * lets a throwaway tab save to its own local store. So we OR together three
 * independent signals and then LATCH: iOS notoriously drops display-mode /
 * navigator.standalone after navigation or an update, so once we've seen this
 * instance installed even once, we stay in "installed" mode.
 *
 * On iOS the installed PWA has its own storage sandbox (separate from Safari),
 * so the latch can never leak from an install into the public demo tab.
 */
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false

  // 1. Standard display-mode (desktop + Android + modern iOS standalone launch).
  const inDisplayMode = (mode: string) =>
    window.matchMedia?.(`(display-mode: ${mode})`)?.matches === true
  const displaySignal = inDisplayMode('standalone') || inDisplayMode('minimal-ui') || inDisplayMode('fullscreen')

  // 2. iOS legacy flag — set when launched from the home-screen icon.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true

  // 3. Launch signal — the manifest start_url is "/?source=pwa", so a launch
  //    from the installed icon lands with that query (survives on modern iOS
  //    even when the display-mode flags don't).
  let launchedFromPwa = false
  try {
    launchedFromPwa = new URLSearchParams(window.location.search).get('source') === 'pwa'
  } catch { /* no URL access — ignore */ }

  const detectedNow = displaySignal || iosStandalone || launchedFromPwa

  // LATCH: sticky in localStorage so a later flaky launch can't demote us back
  // to demo mode and start dropping writes.
  try {
    if (detectedNow) {
      window.localStorage.setItem(PWA_LATCH_KEY, '1')
      return true
    }
    if (window.localStorage.getItem(PWA_LATCH_KEY) === '1') return true
  } catch { /* localStorage blocked — fall back to the live signal */ }

  return detectedNow
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
