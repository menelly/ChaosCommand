/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * User-preferred confetti rendering style for tracker saves and the
 * Command Zone task celebration. Two flavors:
 *
 *  - 'sparkle'   → canvas-confetti + floating emojis (default; Command Zone vibe)
 *  - 'survival'  → drawn survival-box particle engine (green-check crates)
 *
 * Personalization of the floating emoji pool is via `chaos-celebration-emoji`
 * (see lib/sparkle-celebration.ts) — orthogonal to this rendering toggle.
 *
 * Separate from the intensity pref (`chaos-confetti-level`: Off/Subtle/Party/CHAOS)
 * and the per-tracker enable/disable toggle (`chaos-celebration-disabled-${pin}`).
 */

import { getPref, setPref } from '@/lib/prefs'

export type CelebrationStyle = 'sparkle' | 'survival'

const STYLE_KEY = 'chaos-celebration-style'

export function getCelebrationStyle(): CelebrationStyle {
  if (typeof window === 'undefined') return 'sparkle'
  const raw = getPref(STYLE_KEY)
  if (raw === 'survival') return 'survival'
  return 'sparkle'
}

export function setCelebrationStyle(style: CelebrationStyle): void {
  if (typeof window === 'undefined') return
  setPref(STYLE_KEY, style)
}
