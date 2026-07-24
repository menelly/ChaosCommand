/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * DemoBanner — renders on the "try me" demo BUILD, but only while it's actually
 * a sandbox (opened in a browser tab). Two jobs:
 *   1. Tell tab visitors this is a sandbox where nothing they type is saved, so
 *      they don't enter real medical info thinking it's tracked.
 *   2. Point them at the real path: install it to the home screen, where writes
 *      turn ON and it becomes the actual app. (Ren, 2026-07-23.)
 *
 * Once INSTALLED (standalone), this deploy is no longer a sandbox — writes persist —
 * so the "nothing is saved" banner would be a lie and we render nothing. The
 * security disclosure (pwa-security-disclosure) covers the installed-app messaging.
 *
 * Inline styles on purpose: must render identically regardless of theme and must
 * not depend on token CSS being loaded.
 */

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isDemoSandbox } from "@/lib/pwa-mode";

const IS_DEMO_BUILD = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const SITE_URL = 'https://chaoscommand.center/'

export function DemoBanner() {
  // Client-only decision (isDemoSandbox needs `window`). Render nothing until
  // mounted so SSR and first client paint agree (no hydration mismatch).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!IS_DEMO_BUILD) return null
  if (!mounted) return null
  // Installed to the home screen → real app, writes persist → no "demo" banner.
  if (!isDemoSandbox()) return null

  return (
    <div
      role="region"
      aria-label="Demo mode notice"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem 1rem',
        padding: '0.5rem 1rem',
        // Warning red, NOT the old purple/pink gradient. This banner's job changed
        // on 2026-07-24 from "fun demo" to "your data is not being kept" — it has
        // to read as a warning at a glance. (Ren: make it REALLY clear.)
        background: 'linear-gradient(90deg, #991b1b, #b91c1c)',
        color: '#fff',
        fontSize: '0.85rem',
        lineHeight: 1.35,
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        // Below the nav layer so it never buries the fixed top-right hamburger /
        // home controls on mobile: content(0) < banner(30) < backdrop(40) <
        // menu button + open sidebar(50). Was 1000. (Ren caught it, 2026-06-23.)
        zIndex: 30,
        boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
      }}
    >
      {/* ⚠️ COPY CHANGED 2026-07-24 — DO NOT SOFTEN, AND DO NOT RESTORE THE OLD TEXT.
          The previous version said "To use it for real: install it… opened from your
          home screen it saves your data." That is FALSE: an installed PWA does not
          save (CHA-413), and on some browsers a save even shows a SUCCESS TOAST and
          is gone after logout. We were instructing people to trust it with medical
          data it silently discards. Installability is now gated off entirely on this
          build; this copy must not invite it back. Restore the old wording only when
          an installed PWA demonstrably persists a tracker entry across a relaunch. */}
      <span style={{ fontSize: '1rem' }}>
        ⚠️ <strong>DEMO ONLY — NOTHING YOU ENTER HERE IS SAVED.</strong>
      </span>
      <span style={{ opacity: 0.97 }}>
        Look around, click everything, it&rsquo;s all real. But <strong>every entry
        disappears</strong> — <strong>even when it says it saved.</strong> Please
        don&rsquo;t put anything here you need to keep.
      </span>
      <span style={{ opacity: 0.97 }}>
        💻 <strong>To actually track your health, get the real app</strong> — it keeps
        your data encrypted on your own device. (iPhone/iPad: adding this page to your
        home screen <strong>will not</strong> make it save. A native iOS app is coming.)
      </span>
      <Link
        href={SITE_URL}
        style={{
          color: '#fff',
          fontWeight: 700,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        ← Back to the website
      </Link>
    </div>
  );
}
