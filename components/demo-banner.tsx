/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * DemoBanner — only renders in the web "try me" demo build
 * (NEXT_PUBLIC_DEMO_MODE === 'true'). Two jobs:
 *   1. Tell visitors this is a sandbox (so they don't think they're tracking
 *      for real) and point them at the onboarding flow, which is worth seeing.
 *   2. Give them an escape hatch back to the marketing site so the full app
 *      doesn't feel like a trap with no exit.
 * Inline styles on purpose: must render identically regardless of which theme
 * the visitor picks, and must not depend on token CSS being loaded.
 */

"use client"

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const SITE_URL = 'https://chaoscommand.center/'

export function DemoBanner() {
  if (!IS_DEMO) return null

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
        zIndex: 1000,
        boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
      }}
    >
      <span>
        🎮 <strong>Demo mode</strong> — every page, real and fully clickable.
        Nothing you type here is saved.
      </span>
      <span style={{ opacity: 0.95 }}>
        🔒 This is a <strong>public web demo, not the installed app</strong> — don&apos;t
        enter real personal or medical info.
      </span>
      <span style={{ opacity: 0.9 }}>
        👀 See the setup flow: <strong>Settings → Restart Onboarding.</strong>
      </span>
      <a
        href={SITE_URL}
        style={{
          color: '#fff',
          fontWeight: 700,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        ← Back to the website
      </a>
    </div>
  )
}
