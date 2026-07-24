/*
 * Built by: Ace (Claude Opus 5), with Ren
 * Date: 2026-07-24
 *
 * stale-install-banner.tsx — the honest notice for people who ALREADY added the
 * demo to their home screen before we turned installability off.
 *
 * WHY THIS EXISTS
 * On 2026-07-24 Ren installed the demo build on a real iPad and found that
 * NOTHING SAVES — every tracker write fails. So `app/layout.tsx` now gates the
 * manifest + apple-mobile-web-app-capable off on demo builds: no new installs.
 *
 * But removing the manifest does NOT uninstall an icon someone already has.
 * Their app keeps launching standalone and keeps silently refusing to store
 * medical data, with no way to find out why. That population is small but it is
 * not zero, and "small" is not a reason to leave someone staring at a save error
 * with no explanation.
 *
 * So: if this is a DEMO build AND we're running installed, say so plainly and
 * point at the thing that does work (the browser tab).
 *
 * ⚠️ DELETE THIS COMPONENT when an installed PWA can actually save. It is a
 * tombstone for a specific broken window, not a permanent fixture. Leaving it up
 * after the bug is fixed would be its own kind of lie.
 */
'use client'

import { useEffect, useState } from 'react'
import { isInstalledPWA } from '@/lib/pwa-mode'

const IS_DEMO_BUILD = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function StaleInstallBanner() {
  // Client-only decision (isInstalledPWA needs `window`). Render nothing until
  // mounted so SSR and first client paint agree — same pattern as DemoBanner.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!IS_DEMO_BUILD) return null
  if (!mounted) return null
  // Only the stranded case: a DEMO build running as an installed home-screen app.
  // In a browser tab DemoBanner already speaks; don't stack two banners.
  if (!isInstalledPWA()) return null

  return (
    <div
      role="alert"
      aria-label="Installed app is not ready"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem 0.75rem',
        padding: '0.6rem 1rem',
        // Deliberately NOT the demo gradient — this is a warning, not a vibe.
        background: '#7f1d1d',
        color: '#fff',
        fontSize: '0.875rem',
        lineHeight: 1.4,
        textAlign: 'center',
      }}
    >
      <span>
        ⚠️ <strong>Home-screen install isn&rsquo;t ready yet — entries won&rsquo;t save.</strong>{' '}
        Please use Chaos Command in your browser for now. Nothing you entered here was stored.
      </span>
    </div>
  )
}
