/*
 * SEVERITY INPUT — the one control for "how bad is it", built for hands that
 * don't always work.
 *
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * It replaces a bare <Slider> that was copy-pasted into 21 modals, and it fixes
 * three problems that turned out to be the same problem.
 *
 * 1. A SLIDER IS THE WORST POSSIBLE INPUT FOR THIS AUDIENCE.
 *    It needs press, drag, and controlled release — sustained fine motor
 *    control — from people whose hands are a symptom. Reported by a user
 *    (2026-08-02): on bad days they skip logging entirely, because their hands
 *    will not do it.
 *
 *    That is not an inconvenience, it is a DATA VALIDITY FAILURE, and it is
 *    biased in the worst available direction: entries go missing on the days
 *    hands are worst, which are the worse days generally. The record therefore
 *    systematically under-represents severity — the input method quietly argues
 *    against the user's own case for treatment. Every control here is a TAP.
 *    Nothing requires a drag, ever.
 *
 * 2. A PARKED DEFAULT MANUFACTURES DATA NOBODY ENTERED.
 *    The old sliders sat at 5 and wrote 5 on save whether or not anyone touched
 *    them. As a user put it: defaulting to a midline of 5 makes 5 meaningless.
 *    Worse than meaningless — indistinguishable. A stored 5 might
 *    be moderate energy or an untouched control, and nothing downstream can tell,
 *    so the trend engine computed trajectories over phantom values.
 *
 *    Here NOTHING is selected until the user selects it. `undefined` in,
 *    `undefined` out. There is no default to leak.
 *
 * 3. THE SAME DOMAIN KNOWLEDGE LIVED IN 21 FILES AND DRIFTED.
 *    External review (2026-08-02): "A lot of domain definition is in the
 *    components, this can cause drift across components as you add features."
 *    Confirmed the same day, twice: three copies of the severity field list had
 *    diverged and were silently dropping a whole tracker's data, and 39 parked
 *    slider defaults were scattered across 21 modals. One component, one place.
 *
 * ─── THREE STATES, NOT TWO ──────────────────────────────────────────────────
 *
 *   undefined  NOT REPORTED   — not answered. Excluded from analysis entirely.
 *   0          NONE           — answered: it was absent. REAL EVIDENCE, kept.
 *   1..max     REPORTED       — answered: this bad.
 *
 * The middle state is the one the app never had. "Swallowing was explicitly
 * fine on 14 of 20 check-ins" is strong clinical evidence, and until now it was
 * indistinguishable from never having been asked. Matches the existing storage
 * convention (`toSev` in pattern-engine treats 0 and blank as "no severity"), so
 * nothing breaks on adoption and the engine can learn about explicit-zero after.
 *
 * ─── ACCESSIBILITY CONTRACT ─────────────────────────────────────────────────
 *
 * - Every target is >= 44x44 CSS px (WCAG 2.5.5 Target Size).
 * - Tap only. No drag, no long-press, no gesture.
 * - Steppers for people who prefer one big repeatable target to eleven small ones.
 * - Full keyboard: arrows adjust, Home/End jump, Backspace clears.
 * - radiogroup semantics, so a screen reader announces position and total.
 * - Reduced-motion respected; no transition is load-bearing.
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { voiceFor, voiceById, BENEFIT_VOICE } from '@/lib/severity-voices'

export interface SeverityInputProps {
  /** undefined = not reported. 0 = explicitly none. 1..max = reported. */
  value: number | undefined
  onChange: (value: number | undefined) => void
  /** Top of the scale. Effectively always 10 here, but pain scales vary. */
  max?: number
  /** Words for a number, so "7" means something. Receives 0 for the none state. */
  label?: (value: number) => string
  /** Tailwind text-colour class for a value, matching each tracker's palette. */
  color?: (value: number) => string
  /** Hide the "Didn't bother me" button where an explicit zero is meaningless. */
  allowNone?: boolean
  /** Stable id for the rotating label voice — a tracker or field name. Different
   *  slots get different voices on the same day. Defaults to `title`. */
  voiceSlot?: string
  /** Pin a specific voice by id instead of rotating (pain keeps its gremlins). */
  voiceId?: string
  /** A BENEFIT scale — higher is better ("how much did this help?"). Swaps the
   *  deficit voices for benefit wording, since "6 — gravity has doubled" is
   *  nonsense as an effectiveness rating, and drops the "didn't bother me"
   *  button, which means nothing here. */
  kind?: 'severity' | 'benefit'
  /** Rendered above the scale. */
  title?: string
  disabled?: boolean
  className?: string
  /** Accessible name when `title` is not supplied. */
  'aria-label'?: string
}

/** Intensity ramp used when a tracker supplies no palette of its own. Deliberately
 *  not a red-to-green gradient: colour alone never carries the meaning (WCAG 1.4.1),
 *  the number and the word are always present. */
function defaultColor(v: number): string {
  if (v <= 0) return 'text-muted-foreground'
  if (v <= 2) return 'text-success'
  if (v <= 6) return 'text-warning'
  return 'text-destructive'
}

export function SeverityInput({
  value,
  onChange,
  max = 10,
  label,
  color,
  allowNone = true,
  voiceSlot,
  voiceId,
  kind = 'severity',
  title,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: SeverityInputProps) {
  const steps = React.useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max])

  // Resolved once per mount so the wording holds still while you're using it —
  // a label that re-rolls on every render flickers, which is unpleasant
  // generally and worse for anyone with vestibular or attention issues.
  const voice = React.useMemo(
    () => kind === 'benefit'
      ? BENEFIT_VOICE
      : (voiceId ? voiceById(voiceId) : undefined) ?? voiceFor(voiceSlot ?? title ?? 'severity'),
    [kind, voiceId, voiceSlot, title],
  )
  // "Didn't bother me" is meaningless on a benefit scale — 0 there is "not at
  // all", which is already the first rung.
  const showNone = allowNone && kind !== 'benefit'
  const labelFor = label ?? ((v: number) => voice.labels[v] ?? String(v))
  const colorFor = color ?? defaultColor
  const reported = value !== undefined

  // Stepping from "not reported" starts at 1 rather than jumping to the middle —
  // the same reason there is no parked default. Never invent a value.
  const step = (delta: number) => {
    if (disabled) return
    const next = value === undefined ? (delta > 0 ? 1 : 0) : value + delta
    const lo = (allowNone && kind !== 'benefit') ? 0 : 1
    onChange(Math.max(lo, Math.min(max, next)))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowRight': case 'ArrowUp': e.preventDefault(); step(1); break
      case 'ArrowLeft': case 'ArrowDown': e.preventDefault(); step(-1); break
      case 'Home': e.preventDefault(); onChange((allowNone && kind !== 'benefit') ? 0 : 1); break
      case 'End': e.preventDefault(); onChange(max); break
      // Clearing back to "not reported" must always be reachable. A mis-tap
      // should never force someone to record a severity they did not have.
      case 'Backspace': case 'Delete': e.preventDefault(); onChange(undefined); break
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2 min-h-[1.5rem]">
        {title && <span className="text-sm font-medium">{title}</span>}
        <span className="text-sm" aria-live="polite">
          {reported ? (
            <span className={cn('font-semibold', colorFor(value!))}>
              {/* "Your 6", not "6/10". Whose judgement this is belongs in the
                  label — it is a self-report, and phrasing it like a measurement
                  invites everyone (including the person entering it) to treat it
                  as more objective than it is. */}
              {value === 0 ? labelFor(0) : `Your ${value} — ${labelFor(value!)}`}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Not reported</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Steppers: one large repeatable target, for anyone who would rather
            press the same spot twice than hit a specific small one. */}
        <button
          type="button"
          disabled={disabled || value === (allowNone ? 0 : 1)}
          onClick={() => step(-1)}
          aria-label="Less severe"
          className="h-11 w-11 shrink-0 rounded-lg border border-input bg-background text-lg font-semibold
                     hover:bg-accent disabled:opacity-40 disabled:pointer-events-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          −
        </button>

        <div
          role="radiogroup"
          aria-label={ariaLabel ?? title ?? 'Severity'}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={onKeyDown}
          className="flex flex-1 flex-wrap gap-1 rounded-lg p-0.5
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {steps.map(n => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${n} of ${max}, ${labelFor(n)}`}
                disabled={disabled}
                tabIndex={-1}
                // Tapping the current value clears it. Undoing a mis-tap must not
                // require finding a separate control.
                onClick={() => onChange(selected ? undefined : n)}
                className={cn(
                  'h-11 min-w-[2.25rem] flex-1 rounded-md border text-sm font-semibold',
                  'motion-safe:transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent',
                  // Everything at or below the selection reads as filled, so the
                  // magnitude is visible at a glance and not only in the number.
                  !selected && reported && value! > n && 'bg-primary/20 border-primary/30',
                )}
              >
                {n}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={disabled || value === max}
          onClick={() => step(1)}
          aria-label="More severe"
          className="h-11 w-11 shrink-0 rounded-lg border border-input bg-background text-lg font-semibold
                     hover:bg-accent disabled:opacity-40 disabled:pointer-events-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          +
        </button>
      </div>

      {/* Says out loud whose scale this is. Nobody else gets a vote, there is no
          right answer, and a 7 today need not match a 7 last month. */}
      <p className="text-xs text-muted-foreground italic">
        Your scale, your call — there&apos;s no wrong answer here. 🐙
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {showNone && (
          // An explicit zero is an ANSWER, not a blank. "It was fine today" is
          // evidence, and the app could not previously record it.
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === 0 ? undefined : 0)}
            className={cn(
              'h-11 rounded-lg border px-3 text-sm font-medium motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === 0
                ? 'border-success bg-success/15 text-success'
                : 'border-input bg-background hover:bg-accent',
            )}
          >
            Didn&apos;t bother me
          </button>
        )}
        {reported && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(undefined)}
            className="h-11 rounded-lg px-3 text-sm text-muted-foreground underline underline-offset-4
                       hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
