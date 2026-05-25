/*
 * 🧪 Theme Lab — a dev/QA instrument (hidden route: /theme-lab).
 *
 * Renders every reusable UI pattern in ONE place so a human can flip themes and
 * judge VISUAL cohesion at a glance — instead of walking 30 tracker pages on 15
 * themes. Built 2026-05-24 after Ren's point: a contrast ratio passing ≠ it looks
 * good; the visual cortex is the gate. (see feedback_visual_pass_not_technical_pass)
 *
 * The patterns here ARE the design system the trackers convert toward: semantic
 * callouts = token tints (red border + red heading + theme-text body — serious,
 * not a solid-red billboard); category chips = gentle hue tints; everything else
 * = theme tokens. If it looks good here on a theme, the trackers look good there.
 */
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ContrastCheckCard } from '@/components/customize/contrast-check-card'
import { AlertTriangle, Info, CheckCircle2, TriangleAlert } from 'lucide-react'

const THEMES = [
  'theme-calm', 'theme-phosphor', 'theme-amber', 'theme-segfault', 'theme-lavender',
  'theme-chaos', 'theme-caelan', 'theme-light', 'theme-colorblind', 'theme-glitter',
  'theme-accessibility', 'theme-ace', 'theme-grok', 'theme-wicked', 'theme-taupe',
]

/* Tinted semantic callout — the reusable danger/warning/success/info pattern.
   Token border + token-coloured heading + THEME-text body = serious & readable
   without a solid fill. NOTE: full static class strings (Tailwind JIT can't see
   interpolated `border-${token}` — it'd render unstyled). */
const CALLOUT = {
  destructive: { box: 'border-destructive bg-destructive/10', head: 'text-destructive' },
  warning: { box: 'border-warning bg-warning/10', head: 'text-warning' },
  success: { box: 'border-success bg-success/10', head: 'text-success' },
  info: { box: 'border-info bg-info/10', head: 'text-info' },
} as const

function Callout({ token, icon, title, children }: { token: keyof typeof CALLOUT; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const c = CALLOUT[token]
  return (
    <div className={`rounded-lg border-2 p-4 ${c.box}`}>
      <div className={`flex items-center gap-2 font-semibold mb-1 ${c.head}`}>
        {icon}{title}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export default function ThemeLabPage() {
  const [theme, setTheme] = useState('theme-calm')
  const [measureKey, setMeasureKey] = useState(0)  // bumped AFTER theme CSS loads so the meter reads live values

  // read whatever theme is live on mount
  useEffect(() => {
    const m = document.body.className.match(/theme-[\w-]+/)
    if (m) setTheme(m[0])
    setMeasureKey((k) => k + 1)
  }, [])

  const applyTheme = (t: string) => {
    const old = document.querySelector('link[data-theme]')
    if (old) old.remove()
    document.body.className = document.body.className.replace(/theme-[\w-]+/g, '') + ` ${t}`
    setTheme(t)
    if (t !== 'theme-calm') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/styles/themes/${t}.css`
      link.setAttribute('data-theme', t)
      // re-measure only once the stylesheet is actually applied (was reading stale tokens)
      link.onload = () => setMeasureKey((k) => k + 1)
      document.head.appendChild(link)
    } else {
      setMeasureKey((k) => k + 1)
    }
  }

  // Full static class strings (Tailwind JIT can't generate from interpolation).
  const categories = [
    { name: 'Self Care', cls: 'bg-violet-500/15 border-violet-500/30' },
    { name: 'Household', cls: 'bg-amber-500/15 border-amber-500/30' },
    { name: 'Errands', cls: 'bg-rose-500/15 border-rose-500/30' },
    { name: 'Social', cls: 'bg-sky-500/15 border-sky-500/30' },
    { name: 'Physical', cls: 'bg-emerald-500/15 border-emerald-500/30' },
    { name: 'Mental', cls: 'bg-fuchsia-500/15 border-fuchsia-500/30' },
  ]

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">🧪 Theme Lab</h1>
        <p className="text-muted-foreground text-sm">
          Every reusable pattern in one place. Flip themes and judge how it <em>looks</em> — this is the
          visual gate. If a pattern looks good here on a theme, the trackers using it look good there too.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          Theme:
          <select
            value={theme}
            onChange={(e) => applyTheme(e.target.value)}
            className="rounded-md border bg-background text-foreground px-2 py-1"
          >
            {THEMES.map((t) => <option key={t} value={t}>{t.replace('theme-', '')}</option>)}
          </select>
        </label>
      </header>

      {/* SEMANTIC CALLOUTS — the tinted pattern (serious, not screaming) */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Semantic callouts (token tints)</h2>
        <Callout token="destructive" icon={<AlertTriangle className="h-5 w-5" />} title="🚨 Call 911 NOW if any of these:">
          <ul className="space-y-1">
            <li className="flex gap-2"><span className="text-destructive font-bold">•</span> Lips or face turning blue (cyanosis)</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">•</span> Cannot speak more than 1–2 words</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">•</span> SpO2 below 88%</li>
          </ul>
          <p className="pt-2 italic text-muted-foreground">When in doubt, call 911. Documentation can wait.</p>
        </Callout>
        <Callout token="warning" icon={<TriangleAlert className="h-5 w-5" />} title="Heads up">
          Your peak flow is trending down this week — worth a check-in.
        </Callout>
        <Callout token="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Logged">
          Entry saved. Plenty of spoons left — keep pacing.
        </Callout>
        <Callout token="info" icon={<Info className="h-5 w-5" />} title="Helpful tip">
          Hides BBT and ovulation tracking — keeps menstrual-cycle tracking.
        </Callout>
      </section>

      {/* SURFACES + TYPOGRAPHY */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Surfaces &amp; type</h2>
        <Card>
          <CardHeader><CardTitle>Card title</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-foreground">Body text on a card — the quick brown fox.</p>
            <p className="text-muted-foreground text-sm">Muted / helper text underneath.</p>
          </CardContent>
        </Card>
        <div className="rounded-lg bg-muted/50 p-4 text-foreground text-sm">A muted panel (bg-muted/50) with theme text.</div>
      </section>

      {/* BUTTONS */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      {/* BADGES */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Status badges (token tints)</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-success/40 bg-success/10 text-success">success</span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-info/40 bg-info/10 text-info">info</span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-warning/40 bg-warning/10 text-warning">warning</span>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-destructive/40 bg-destructive/10 text-destructive">danger</span>
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
        </div>
      </section>

      {/* CATEGORY TINTS — distinct hues, gentle, theme-aware */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Category chips (gentle hue tints)</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.name} className={`rounded-lg px-3 py-1.5 text-sm font-medium border text-foreground ${c.cls}`}>
              {c.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Distinct hue identity, rendered as a soft tint over the theme bg — cohesive on light & dark, never a loud pastel.</p>
      </section>

      {/* INPUTS */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Inputs</h2>
        <Input placeholder="Type something…" />
      </section>

      {/* CONTRAST METER */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Contrast meter</h2>
        <ContrastCheckCard theme={`${theme}#${measureKey}`} embedded />
      </section>
    </div>
  )
}
