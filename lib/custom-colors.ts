/*
 * "Customize my colors" — per-PIN custom color overrides.  (Ace, 2026-05-24)
 *
 * Model: pick a BASE theme you like, then nudge a handful of colors. We don't
 * rebuild a theme — we OVERRIDE the base theme's shadcn token vars with inline
 * values. Crucially these go on <body> (not <html>): the theme defines tokens via
 * `body.theme-X { --token }`, and an inline style ON body beats that class rule,
 * while every descendant inherits the override. (Setting them on <html> would lose
 * to body's class-level token — learned that the hard way.)
 *
 * Stored per-PIN as JSON under 'chaos-custom-colors' (rides lib/prefs.ts), so each
 * profile keeps its own tweaks. A curated 5 buckets — not all 20 tokens — so it's
 * "nudge my pink," not a 20-footgun control panel.
 */
import { getPref, setPref } from '@/lib/prefs'
import { hexToHslTriple } from '@/lib/color'

export type BucketKey = 'bg' | 'card' | 'primary' | 'text' | 'border'

export interface ColorBucket {
  key: BucketKey
  label: string
  hint: string
  /** shadcn token vars this bucket drives (kept in sync to one chosen color). */
  tokens: string[]
}

export const COLOR_BUCKETS: ColorBucket[] = [
  { key: 'bg', label: 'Background', hint: 'The page behind everything', tokens: ['--background'] },
  { key: 'card', label: 'Cards', hint: 'Tracker tiles & panels', tokens: ['--card', '--popover'] },
  { key: 'primary', label: 'Primary / Accent', hint: 'Buttons, highlights, focus', tokens: ['--primary', '--accent', '--ring'] },
  { key: 'text', label: 'Text', hint: 'Words on the page & cards', tokens: ['--foreground', '--card-foreground', '--popover-foreground'] },
  { key: 'border', label: 'Borders', hint: 'Card & input outlines', tokens: ['--border', '--input'] },
]

export type CustomColorMap = Partial<Record<BucketKey, string>> // bucket → hex

// Stored per BASE THEME (keyed by theme id) so tweaks belong to the theme you
// tweaked — switch themes and you see THAT theme (or its own saved tweaks), not
// the last theme's overrides bleeding across. The whole map is one per-PIN pref.
const PREF_KEY = 'chaos-custom-colors'
type CustomColorStore = Record<string, CustomColorMap> // themeId → bucket map

function readStore(): CustomColorStore {
  const raw = getPref(PREF_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: CustomColorStore): void {
  setPref(PREF_KEY, JSON.stringify(store))
}

export function getCustomColors(themeId: string): CustomColorMap {
  const map = readStore()[themeId]
  return map && typeof map === 'object' ? map : {}
}

export function saveCustomColors(themeId: string, map: CustomColorMap): void {
  const store = readStore()
  store[themeId] = map
  writeStore(store)
}

export function clearSavedCustomColors(themeId: string): void {
  const store = readStore()
  delete store[themeId]
  writeStore(store)
}

/** Apply a custom-color map as inline overrides on <body>. Browser-only. */
export function applyCustomColors(map: CustomColorMap): void {
  if (typeof document === 'undefined') return
  for (const bucket of COLOR_BUCKETS) {
    const hex = map[bucket.key]
    if (!hex) continue
    const triple = hexToHslTriple(hex)
    if (!triple) continue
    for (const token of bucket.tokens) document.body.style.setProperty(token, triple)
  }
}

/** Remove ALL custom overrides so the base theme shows through again. */
export function clearAppliedCustomColors(): void {
  if (typeof document === 'undefined') return
  for (const bucket of COLOR_BUCKETS) {
    for (const token of bucket.tokens) document.body.style.removeProperty(token)
  }
}
