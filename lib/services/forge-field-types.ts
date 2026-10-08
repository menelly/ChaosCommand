/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * forge-field-types.ts — the ONE place that knows what kinds of fields a
 * Forge (custom) tracker can have, and which of them are numbers. (CHA-463)
 *
 * ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────
 *
 * 🧭 Before this, "which field types are numbers?" was answered in FOUR places
 *    (the analytics allowlist, the analytics card, the doctor PDF, the history
 *    view), each with its own hand-typed list. Adding a new numeric type meant
 *    finding all four. Miss one and nothing crashes — the new field just
 *    quietly never shows up in the stats or the doctor's report. That's the
 *    worst kind of bug for this app: code runs, data is wrong, nobody is told.
 *
 *    So the list lives here now, once, and everyone asks this file.
 *
 * 🎚️ THE NEW TYPE: `severity` — ten tappable buttons, 1 to 10.
 *    The old `scale` type is a drag-only slider. Sliders need press + drag +
 *    controlled release, which is exactly what bad-hand days take away, so
 *    entries go missing on the WORST days and the record under-reports.
 *    The built-in trackers moved to taps on 2026-08-02 (`SeverityInput`);
 *    custom trackers were missed. This is the fix.
 *
 *    `scale` is NOT changed or reinterpreted. Trackers people already built
 *    keep their slider. `severity` sits beside it and the builder chooses.
 *    (Ren, 2026-08-04: "keep slider as an option and just ADD a 1-10 clicky.")
 *
 * 📦 STORAGE SHAPE: a severity answer is stored exactly like a scale answer —
 *    a plain number under `values[field.id]`. The only difference is that a
 *    severity field can also be *absent* (never tapped = not reported), and
 *    `0` means "explicitly none / didn't bother me", which is real evidence.
 *
 *      (key missing)  NOT REPORTED  — left out of every average
 *      0              NONE          — answered "not today"; counted
 *      1..max         REPORTED      — answered, this bad
 *
 * This file has no React and no browser imports on purpose, so the golden
 * test suite (npm test) can run it under plain node.
 */

/** Every kind of field a Forge tracker can contain. */
export type ForgeFieldType =
  | 'scale'        // 🎚️ legacy drag slider — kept for trackers that already use it
  | 'severity'     // 👆 tap 1–10 buttons (CHA-463) — the accessible one
  | 'dropdown'
  | 'checkbox'
  | 'text'
  | 'number'
  | 'percentage'
  | 'duration'
  | 'multiselect'
  | 'tags'
  | 'date'
  | 'time'
  | 'datetime'

/**
 * 🔢 The field types whose answers are numbers and belong in averages,
 * trend lines, and the doctor PDF's "mean (range)" line.
 *
 * ⚠️ This is an ALLOWLIST. A numeric type that isn't in here doesn't throw —
 * it silently vanishes from analytics. If you add a numeric type, add it here.
 */
export const NUMERIC_FIELD_TYPES: readonly ForgeFieldType[] = [
  'scale',
  'severity',
  'number',
  'percentage',
  'duration',
]

/** Does this field's answer get averaged/charted like a number? */
export function isNumericFieldType(type: string | undefined | null): boolean {
  return !!type && (NUMERIC_FIELD_TYPES as readonly string[]).includes(type)
}

// ─── SEVERITY-SPECIFIC HELPERS ─────────────────────────────────────────────

/** Ten buttons unless the builder chose otherwise. */
export const SEVERITY_DEFAULT_MAX = 10

/** The scale sizes the builder offers. Kept to a couple of choices so it's
 *  a tap, not a typing exercise, and capped at 10 so the buttons stay big
 *  enough for shaky hands on a phone. */
export const SEVERITY_MAX_CHOICES = [5, 10] as const

/**
 * What's the top of this severity field's scale? Reads the field's saved
 * `max`, but never trusts it blindly: anything missing, weird, or outside
 * 2..10 falls back to 10. A broken config should never make the buttons
 * disappear or shrink to nothing.
 */
export function severityMaxFor(field: { max?: number } | undefined | null): number {
  const raw = field?.max
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return SEVERITY_DEFAULT_MAX
  const whole = Math.round(raw)
  if (whole < 2 || whole > 10) return SEVERITY_DEFAULT_MAX
  return whole
}

/** Summary of a severity field's answers, for the PDF and analytics. */
export interface SeveritySummary {
  /** How many answers were real numbers (including explicit zeros). */
  answered: number
  /** How many of those were an explicit 0 — "didn't bother me". */
  noneCount: number
  /** Average over every answer, zeros included (a zero day IS a data point). */
  mean: number
  lowest: number
  highest: number
}

/**
 * Boil a pile of stored severity answers down to numbers a doctor can read.
 * Blanks / undefined / junk are "not reported" and are skipped, never
 * counted as zero — inventing a zero would be the parked-default bug again,
 * just pointing the other way. Returns null when nothing was answered.
 */
export function summarizeSeverity(rawValues: unknown[]): SeveritySummary | null {
  const nums = rawValues
    .filter(v => v !== undefined && v !== null && v !== '')
    .map(v => Number(v))
    .filter(n => Number.isFinite(n))
  if (!nums.length) return null
  return {
    answered: nums.length,
    noneCount: nums.filter(n => n === 0).length,
    mean: nums.reduce((a, b) => a + b, 0) / nums.length,
    lowest: Math.min(...nums),
    highest: Math.max(...nums),
  }
}
