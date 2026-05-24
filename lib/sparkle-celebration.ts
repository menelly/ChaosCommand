/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Shared "sparkle" celebration — purple confetti + floating emojis. Used
 * by tracker save flows AND the Command Zone task celebration so both
 * surfaces share one visual language.
 *
 * Respects:
 *   - chaos-confetti-level (Off / Subtle / Party / CHAOS) for size/skip
 *   - chaos-celebration-emoji  (single-emoji pick, weighted ~60% in pool)
 *
 * Floating emojis are injected directly into document.body as positioned
 * elements so this works outside any React tree without prop drilling.
 */

import confetti from 'canvas-confetti'
import { getPref, setPref, removePref } from '@/lib/prefs'

const EMOJI_KEY = 'chaos-celebration-emoji'
const NEUTRAL_POOL = ['✨', '⭐', '💜', '🌟', '🎉']
const DOMINANT_WEIGHT = 0.6

export const AVAILABLE_EMOJIS = [
  '🐧', '🐙', '🌸', '💜', '🌟', '🦭', '🐝', '🦋', '🐱', '⭐',
] as const

export type ChosenEmoji = typeof AVAILABLE_EMOJIS[number]

export function getChosenEmoji(): ChosenEmoji | null {
  if (typeof window === 'undefined') return null
  const raw = getPref(EMOJI_KEY)
  if (raw && (AVAILABLE_EMOJIS as readonly string[]).includes(raw)) {
    return raw as ChosenEmoji
  }
  return null
}

export function setChosenEmoji(emoji: ChosenEmoji | null): void {
  if (typeof window === 'undefined') return
  if (emoji === null) removePref(EMOJI_KEY)
  else setPref(EMOJI_KEY, emoji)
}

interface SparkleOptions {
  /** Override the dominant emoji for this single fire (Command Zone uses 'random'). */
  dominantEmoji?: ChosenEmoji | null
  /** Suppress floating emojis (confetti only). Default false. */
  noEmojis?: boolean
}

export function fireSparkleCelebration(opts: SparkleOptions = {}): void {
  if (typeof window === 'undefined') return
  const level = getPref('chaos-confetti-level') || 'medium'
  if (level === 'none') return
  const scale = level === 'low' ? 0.3 : level === 'medium' ? 0.6 : 1.0

  // Triple-burst confetti — center, left, right (matches Command Zone vibe).
  const palette = ['#b19cd9', '#87ceeb', '#dda0dd', '#f0e6ff', '#e6f3ff']
  const sidePalette = ['#b19cd9', '#87ceeb', '#dda0dd']

  confetti({
    particleCount: Math.round(150 * scale),
    spread: 70,
    origin: { y: 0.6 },
    colors: palette,
  })
  setTimeout(() => {
    confetti({
      particleCount: Math.round(100 * scale),
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: sidePalette,
    })
  }, 200)
  setTimeout(() => {
    confetti({
      particleCount: Math.round(100 * scale),
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: sidePalette,
    })
  }, 400)

  if (opts.noEmojis) return

  // Floating emoji rain.
  const dominant = opts.dominantEmoji !== undefined ? opts.dominantEmoji : getChosenEmoji()
  const baseCount = 8
  const emojiCount = Math.max(1, Math.round(baseCount * scale))
  for (let i = 0; i < emojiCount; i++) {
    const useDominant = dominant && Math.random() < DOMINANT_WEIGHT
    const emoji = useDominant
      ? dominant
      : NEUTRAL_POOL[Math.floor(Math.random() * NEUTRAL_POOL.length)]
    spawnFloatingEmoji(emoji as string, i)
  }
}

function spawnFloatingEmoji(emoji: string, index: number): void {
  const el = document.createElement('div')
  el.textContent = emoji
  // Random position in central 80% of viewport.
  const left = 10 + Math.random() * 80
  const top = 10 + Math.random() * 80
  el.style.cssText = [
    'position: fixed',
    `left: ${left}vw`,
    `top: ${top}vh`,
    'font-size: 2.5rem',
    'pointer-events: none',
    'user-select: none',
    'z-index: 9999',
    'opacity: 0',
    `animation: chaos-sparkle-emoji 3s ease-out ${index * 40}ms forwards`,
    'will-change: transform, opacity',
  ].join(';')
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3500 + index * 40)

  ensureKeyframesInjected()
}

let keyframesInjected = false
function ensureKeyframesInjected(): void {
  if (keyframesInjected) return
  if (typeof document === 'undefined') return
  const style = document.createElement('style')
  style.setAttribute('data-chaos-sparkle', 'true')
  style.textContent = `
    @keyframes chaos-sparkle-emoji {
      0%   { opacity: 0; transform: translateY(0) scale(0.5) rotate(0deg); }
      15%  { opacity: 1; transform: translateY(-10px) scale(1) rotate(-8deg); }
      80%  { opacity: 1; transform: translateY(-40px) scale(1) rotate(8deg); }
      100% { opacity: 0; transform: translateY(-80px) scale(0.7) rotate(0deg); }
    }
  `
  document.head.appendChild(style)
  keyframesInjected = true
}
