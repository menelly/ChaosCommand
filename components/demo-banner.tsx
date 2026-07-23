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
        background: 'linear-gradient(90deg, #6d28d9, #db2777)',
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
      <span>
        🎮 <strong>Demo mode</strong> — every page is real and clickable, but
        nothing you type in this browser tab is saved.
      </span>
      <span style={{ opacity: 0.97 }}>
        📲 <strong>To use it for real: install it.</strong> On iPhone/iPad, tap
        <strong> Share → Add to Home Screen</strong>. Opened from your home screen it
        saves your data (encrypted, on your device) — and a clean install, not a
        Safari tab full of other stuff, is the safer way to keep medical info.
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
