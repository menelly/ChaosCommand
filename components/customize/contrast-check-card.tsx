/*
 * Contrast Check card.  (Ace, 2026-05-24)
 *
 * The accessibility-first reason this exists: Playwright/axe contrast scans have
 * a blind spot for token themes — they check the colors they can SEE, but can't
 * know that a "dark red on a secretly-dark theme" 911 card is unreadable. Manual
 * QA caught what automation missed (the danger-color bug, project_command_056).
 *
 * So: a live card that renders the CURRENT theme's real token pairs — background,
 * card, muted text, primary buttons, and the DANGER (destructive) swatch — each
 * with its measured WCAG ratio and a ✅/⚠️/❌. Flip theme → glance here → instantly
 * see if anything (especially the 911 danger swatch) went illegible. It's a dev
 * QA accelerator AND a real feature: anyone customizing their own colors gets the
 * same "did I just break my own text?" check.
 *
 * Reads tokens live off <body> (readTokenHex), re-reads when the theme prop
 * changes so cycling themes in the panel updates the swatches in place.
 */

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { readTokenHex, contrastRatio } from '@/lib/color'

interface Props {
  /** Current theme id — re-reads tokens when it changes (cycling themes in the panel). */
  theme?: string
  /** When true, render bare (no Card chrome / title) — for embedding inside a
   *  collapsible Settings section that already provides the heading. */
  embedded?: boolean
}

interface Pair {
  label: string
  /** token painted as the swatch background */
  bgVar: string
  /** token painted as the swatch text/foreground */
  fgVar: string
  /** AA threshold: 4.5 for body text, 3 for large/UI/borders */
  threshold: number
  /** safety-critical (the 911 danger pair) — flagged louder when it fails */
  critical?: boolean
  /** sample text to render in the swatch */
  sample: string
}

const PAIRS: Pair[] = [
  { label: 'Body text', bgVar: '--background', fgVar: '--foreground', threshold: 4.5, sample: 'The quick brown fox' },
  { label: 'Card text', bgVar: '--card', fgVar: '--card-foreground', threshold: 4.5, sample: 'Text on a card' },
  { label: 'Muted / hint text', bgVar: '--card', fgVar: '--muted-foreground', threshold: 4.5, sample: 'Subtle helper text' },
  { label: 'Primary button', bgVar: '--primary', fgVar: '--primary-foreground', threshold: 4.5, sample: 'Save' },
  { label: 'Secondary button', bgVar: '--secondary', fgVar: '--secondary-foreground', threshold: 4.5, sample: 'Cancel' },
  { label: 'Accent / highlight', bgVar: '--accent', fgVar: '--accent-foreground', threshold: 4.5, sample: 'Highlighted' },
  { label: 'Dropdown / menu', bgVar: '--popover', fgVar: '--popover-foreground', threshold: 4.5, sample: 'Menu item' },
  // info/success/warning are used as TINTED callouts (bg-info/10 + text-info on the
  // page bg), so the meaningful contrast is the status color against --background.
  { label: 'ℹ️ Info note', bgVar: '--background', fgVar: '--info', threshold: 4.5, sample: 'Helpful tip' },
  { label: '✓ Success note', bgVar: '--background', fgVar: '--success', threshold: 4.5, sample: 'Saved!' },
  { label: '⚠️ Warning note', bgVar: '--background', fgVar: '--warning', threshold: 4.5, sample: 'Heads up' },
  { label: '🚨 Danger / 911 card', bgVar: '--destructive', fgVar: '--destructive-foreground', threshold: 4.5, critical: true, sample: 'Call 911 NOW' },
  { label: 'Border visibility', bgVar: '--background', fgVar: '--border', threshold: 3, sample: '———————' },
]

function rating(ratio: number | null, threshold: number) {
  if (ratio === null) return { icon: '❓', word: 'unknown' }
  if (ratio >= threshold) return { icon: '✅', word: 'pass' }
  if (ratio >= 3) return { icon: '⚠️', word: 'low' }
  return { icon: '❌', word: 'fail' }
}

export function ContrastCheckCard({ theme, embedded }: Props) {
  const [tick, setTick] = useState(0)

  // Re-read whenever the theme changes (or a manual re-check is requested). The
  // theme class lands on <body> via the loader; a microtask defer lets the new
  // token values settle before we read them.
  useEffect(() => {
    const id = setTimeout(() => setTick((t) => t + 1), 0)
    return () => clearTimeout(id)
  }, [theme])

  const rows = useMemo(() => {
    // tick in deps so a re-check re-reads the live tokens
    void tick
    return PAIRS.map((p) => {
      const bg = readTokenHex(p.bgVar)
      const fg = readTokenHex(p.fgVar)
      const ratio = bg && fg ? contrastRatio(bg, fg) : null
      return { ...p, bg, fg, ratio, r: rating(ratio, p.threshold) }
    })
  }, [tick])

  const worst = rows.reduce<number | null>((acc, r) => {
    if (r.ratio === null) return acc
    return acc === null ? r.ratio : Math.min(acc, r.ratio)
  }, null)

  const inner = (
    <>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Live colors from your current theme. Flip themes or tweak your colors and watch these —
            if the 🚨 danger swatch ever shows ⚠️/❌, the 911 text is hard to read on that theme.
          </p>
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="text-xs font-normal underline opacity-70 hover:opacity-100 shrink-0"
          >
            Re-check
          </button>
        </div>

        {/* Heavy "flourish" themes (penguin/phosphor/amber/calm) force colors on broad
            selectors (`body.theme-X div {…!important}`), and a stylesheet !important beats
            React's normal inline style — so the swatches would render the THEME's colors,
            not the token's (Ren caught a ✅ accent that was actually invisible). We win the
            cascade by injecting !important rules whose doubled-class specificity (0,2,1)
            outranks the theme's `body.theme-X div` (0,1,2). */}
        <style dangerouslySetInnerHTML={{ __html: rows.map((row, i) => {
          const bg = row.bg ?? 'transparent'
          const fg = row.fg ?? 'inherit'
          const border = row.fgVar === '--border' ? (row.fg ?? 'transparent') : 'transparent'
          return `body .cc-sw-${i}.cc-sw-${i}.cc-sw-${i}{background-color:${bg}!important;border-color:${border}!important;}`
               // descendants: force the token text color AND kill any theme-injected
               // background (penguin/calm flourishes paint dark boxes behind inner text)
               + `body .cc-sw-${i}.cc-sw-${i}.cc-sw-${i} *{color:${fg}!important;background-color:transparent!important;background-image:none!important;text-shadow:none!important;}`
        }).join('') }} />

        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`cc-sw-${i} rounded-md border p-2 flex items-center justify-between gap-3`}
          >
            <div className="min-w-0">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-70">{row.label}</div>
              <div className="text-sm font-medium truncate">{row.sample}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-mono">{row.ratio !== null ? `${row.ratio.toFixed(2)}:1` : '—'}</div>
              <div className="text-xs">
                {row.r.icon}
                {row.critical && row.r.word !== 'pass' ? ' danger!' : ''}
              </div>
            </div>
          </div>
        ))}

        <p className="text-[0.6875rem] text-muted-foreground pt-1">
          {worst !== null ? (
            <>Lowest pair: <span className="font-mono">{worst.toFixed(2)}:1</span>. </>
          ) : null}
          AA needs 4.5:1 for normal text (3:1 for large text & borders).
        </p>
    </>
  )

  if (embedded) return <div className="space-y-2">{inner}</div>

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🔍 Contrast Check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{inner}</CardContent>
    </Card>
  )
}
