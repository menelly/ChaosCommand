/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5)
 * Date: 2026-07-27  ·  CHA-423
 *
 * daily-touch-base.tsx — two numbers, offered AFTER the survival check.
 *
 * ── 🚫 THE CONSTRAINT THAT OUTRANKS EVERY FEATURE IDEA HERE ─────────────────
 * The Survival Box's entire power is that IT DEMANDS NOTHING. It is the thing
 * you can do when you can do nothing. So:
 *
 *   - Checking the box completes the day. FULL STOP. This never gates it.
 *   - This appears AFTER the check, as an offer. Never before, never blocking.
 *   - Dismissing is NOT a failure state. No red, no nag, no "incomplete" badge.
 *     A checked box with no rating is a complete, valid, celebrated day.
 *
 * If usage of the survival box drops after this ships, THIS FEATURE IS WRONG and
 * the coupling gets reverted. The check-in is worth less than the check.
 *
 * ── ACCESSIBILITY: STEPPERS FIRST, SLIDER SECOND ────────────────────────────
 * A −10..+10 slider is a FINE MOTOR TASK, and a meaningful share of the people
 * this is for have hand involvement — tremor, weakness, neuropathy, pain. So the
 * big −/+ buttons are the primary control and the slider is the alternative, not
 * the other way round. Tap targets are deliberately generous.
 */

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Check, X, Pencil } from 'lucide-react'
import {
  CONFOUNDER_CHIPS,
  TOUCH_BASE_MIN,
  TOUCH_BASE_MAX,
  loadTouchBase,
  saveTouchBase,
  touchBaseLabel,
  type TouchBaseEntry,
} from '@/lib/touch-base'
import { todayKey } from '@/lib/survival-check'
import { getPref, setPref } from '@/lib/prefs'

/** Per-day dismissal, so declining once doesn't nag for the rest of the day. */
const DISMISS_PREF = 'chaos-touchbase-dismissed'

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const clamp = (v: number) => Math.max(TOUCH_BASE_MIN, Math.min(TOUCH_BASE_MAX, v))
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{touchBaseLabel(value)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0"
          aria-label={`${label} down one`}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= TOUCH_BASE_MIN}
        >
          <Minus className="h-5 w-5" />
        </Button>

        <div className="flex-1">
          <input
            type="range"
            min={TOUCH_BASE_MIN}
            max={TOUCH_BASE_MAX}
            step={1}
            value={value}
            aria-label={label}
            onChange={e => onChange(clamp(parseInt(e.target.value, 10)))}
            className="w-full accent-primary"
          />
        </div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 shrink-0"
          aria-label={`${label} up one`}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= TOUCH_BASE_MAX}
        >
          <Plus className="h-5 w-5" />
        </Button>

        <span
          className={`w-10 shrink-0 text-center text-lg font-semibold tabular-nums ${
            value === 0 ? 'text-muted-foreground' : value > 0 ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    </div>
  )
}

export default function DailyTouchBase() {
  const today = todayKey()
  const [entry, setEntry] = useState<TouchBaseEntry | null>(null)
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [physical, setPhysical] = useState(0)
  const [mental, setMental] = useState(0)
  const [confounders, setConfounders] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const e = await loadTouchBase(today)
      if (cancelled) return
      setEntry(e)
      if (e) {
        setPhysical(e.physical)
        setMental(e.mental)
        setConfounders(e.confounders ?? [])
        setNotes(e.notes ?? '')
      }
      setDismissed(getPref(DISMISS_PREF) === today)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [today])

  const toggleChip = (chip: string) =>
    setConfounders(prev => (prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]))

  const save = async () => {
    await saveTouchBase(today, { physical, mental, confounders, notes })
    setEntry({ physical, mental, confounders, notes, recordedAt: new Date().toISOString() })
    setOpen(false)
  }

  // "Not right now" — remembered for TODAY only, and it is not a failure state.
  const decline = () => {
    setDismissed(true)
    setOpen(false)
    try { setPref(DISMISS_PREF, today) } catch {}
  }

  if (!loaded) return null

  // ── Already rated: a quiet summary with an edit affordance ────────────────
  if (entry && !open) {
    const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`)
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Today:</span>
        <span className="font-medium text-foreground">body {fmt(entry.physical)}</span>
        <span className="font-medium text-foreground">mind {fmt(entry.mental)}</span>
        {entry.confounders?.length > 0 && (
          <span className="text-xs text-muted-foreground">· {entry.confounders.join(', ')}</span>
        )}
        <Button size="sm" variant="ghost" className="ml-auto gap-1 text-muted-foreground"
          onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
    )
  }

  // ── The offer. Deliberately small and easy to ignore. ─────────────────────
  if (!open) {
    if (dismissed) return null
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2">
        <span className="text-sm text-muted-foreground">
          Want to add two numbers? Takes five seconds. Totally optional.
        </span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={decline}>
            Not right now
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Sure
          </Button>
        </div>
      </div>
    )
  }

  // ── The form ──────────────────────────────────────────────────────────────
  return (
    <div className="mt-3 space-y-4 rounded-lg border border-border bg-muted/20 p-3">
      {/* THE ANCHOR. This sentence is the feature. Without it people rate against
          a healthy person's baseline, everyone sits at −7 forever, and we have
          rebuilt a deficit scale with extra steps. */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Compared to <span className="font-semibold text-foreground">your</span> usual — not to anyone else&apos;s.
        <br />
        <span className="font-semibold text-foreground">0 means your normal.</span> Below is a worse day than
        usual for you, above is a better one.
      </p>

      <Stepper label="Body" value={physical} onChange={setPhysical} />
      <Stepper label="Mind" value={mental} onChange={setMental} />

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">Anything skewing today?</span>
        <div className="flex flex-wrap gap-1.5">
          {CONFOUNDER_CHIPS.map(chip => {
            const on = confounders.includes(chip)
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={on}
                onClick={() => toggleChip(chip)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {chip}
              </button>
            )
          })}
        </div>
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        placeholder="Anything else? (optional)"
        className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
      />

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
          onClick={entry ? () => setOpen(false) : decline}>
          <X className="h-4 w-4" /> {entry ? 'Cancel' : 'Not right now'}
        </Button>
        <Button size="sm" className="ml-auto gap-1" onClick={save}>
          <Check className="h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  )
}
