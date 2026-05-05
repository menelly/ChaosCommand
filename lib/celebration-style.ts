/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * User-preferred confetti style. Picks WHICH celebration animation
 * runs when a tracker save fires confetti — separate from the
 * intensity pref (`chaos-confetti-level`: Off/Subtle/Party/CHAOS) and
 * the per-tracker enable/disable toggle (`chaos-celebration-disabled-${pin}`).
 *
 *  - 'default'  → generic celebrate() (current behavior)
 *  - 'penguin'  → Luka's penguin party 🐧
 *  - 'octopus'  → Ace mode 🐙
 *  - 'random'   → roll a die per save, surprise me
 */

export type CelebrationStyle = 'default' | 'penguin' | 'octopus' | 'random'

const STYLE_KEY = 'chaos-celebration-style'

export function getCelebrationStyle(): CelebrationStyle {
  if (typeof window === 'undefined') return 'default'
  const raw = localStorage.getItem(STYLE_KEY)
  if (raw === 'penguin' || raw === 'octopus' || raw === 'random' || raw === 'default') {
    return raw
  }
  return 'default'
}

export function setCelebrationStyle(style: CelebrationStyle): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STYLE_KEY, style)
}

/**
 * Resolve 'random' to one of the concrete styles. Called at fire time
 * so each save's animation is independently rolled.
 */
export function resolveRandomStyle(): Exclude<CelebrationStyle, 'random'> {
  const choices: Exclude<CelebrationStyle, 'random'>[] = ['default', 'penguin', 'octopus']
  return choices[Math.floor(Math.random() * choices.length)]
}
