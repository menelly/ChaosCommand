/*
 * "Customize my colors" — tweak the base of a theme you like.  (Ace, 2026-05-24)
 *
 * Pick a base theme in the Theme selector above, then nudge a handful of colors
 * here. Live preview, per-PIN, reset to the base anytime. A soft contrast warning
 * fires if you're about to make text unreadable — it warns, it never blocks (your
 * eyes, your call).
 */
'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import {
  COLOR_BUCKETS,
  type BucketKey,
  type CustomColorMap,
  getCustomColors,
  saveCustomColors,
  clearSavedCustomColors,
  applyCustomColors,
  clearAppliedCustomColors,
} from '@/lib/custom-colors'
import { readTokenHex, contrastRatio } from '@/lib/color'

const FALLBACK = '#808080'

export default function ColorCustomizer({ theme }: { theme: string }) {
  const [colors, setColors] = useState<CustomColorMap>({})
  const [swatches, setSwatches] = useState<Record<BucketKey, string>>({} as Record<BucketKey, string>)
  const [hydrated, setHydrated] = useState(false)

  // Seed each picker from the saved override, or — for untouched buckets — the
  // base theme's LIVE value (so you start from "what the theme actually uses").
  const seedSwatches = (saved: CustomColorMap) => {
    const next = {} as Record<BucketKey, string>
    for (const b of COLOR_BUCKETS) {
      next[b.key] = saved[b.key] || readTokenHex(b.tokens[0]) || FALLBACK
    }
    setSwatches(next)
  }

  // On mount AND whenever the base theme changes: reset overrides to THIS theme's
  // saved tweaks (or none), then seed the pickers from the result. This is why
  // switching themes shows the new theme, not the previous theme's overrides.
  useEffect(() => {
    const saved = getCustomColors(theme)
    clearAppliedCustomColors()
    applyCustomColors(saved)
    setColors(saved)
    seedSwatches(saved)
    setHydrated(true)
  }, [theme])

  const handleChange = (key: BucketKey, hex: string) => {
    const next = { ...colors, [key]: hex }
    setColors(next)
    setSwatches((s) => ({ ...s, [key]: hex }))
    saveCustomColors(theme, next)
    applyCustomColors(next)
  }

  const handleReset = () => {
    clearSavedCustomColors(theme)
    clearAppliedCustomColors() // strip inline overrides so the base theme shows through
    setColors({})
    // Re-read base values now that overrides are gone.
    seedSwatches({})
  }

  // Soft contrast check: text vs background and text vs cards.
  const textVsBg = contrastRatio(swatches.text ?? FALLBACK, swatches.bg ?? FALLBACK)
  const textVsCard = contrastRatio(swatches.text ?? FALLBACK, swatches.card ?? FALLBACK)
  const worst = Math.min(textVsBg ?? 21, textVsCard ?? 21)
  const lowContrast = hydrated && worst < 4.5

  const hasOverrides = Object.keys(colors).length > 0

  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Custom Colors</Label>
      <div className="p-4 border rounded-lg space-y-3">
        <p className="text-xs text-muted-foreground">
          Tweak the theme you picked above — the pickers start from that theme&apos;s own colors. Changes apply instantly and save automatically for this theme &amp; profile. &ldquo;Reset&rdquo; restores the theme&apos;s defaults.
        </p>

        <div className="space-y-2.5">
          {COLOR_BUCKETS.map((b) => (
            <div key={b.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{b.label}</div>
                <div className="text-[11px] text-muted-foreground">{b.hint}</div>
              </div>
              <input
                type="color"
                aria-label={`${b.label} color`}
                value={swatches[b.key] ?? FALLBACK}
                onChange={(e) => handleChange(b.key, e.target.value)}
                className="h-9 w-14 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
            </div>
          ))}
        </div>

        {lowContrast && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20 p-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Heads up — your text and background are low contrast ({worst}:1, below the 4.5:1 readability mark).
              Still your call, but it may be hard to read.
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasOverrides}
          className="w-full"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" />
          Reset to theme default
        </Button>
      </div>
    </div>
  )
}
