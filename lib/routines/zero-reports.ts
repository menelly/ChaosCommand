/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5)
 * Date: 2026-07-27  ·  CHA-427
 *
 * zero-reports.ts — "I checked, and it didn't bother me today" as DURABLE DATA.
 *
 * ── THE PROBLEM, in one line ────────────────────────────────────────────────
 * A GOOD DAY and an UNLOGGED DAY were byte-identical. Both were absence. So the
 * tracker could only ever measure how bad it was WHEN IT WAS BAD — it had no
 * denominator.
 *
 * ── WHAT WAS ALREADY RIGHT (do not rebuild it) ──────────────────────────────
 * The routine run flow ALREADY distinguishes the two states in the UI:
 *   - "Nothing today"  (routine-cleared.ts)  = I looked, nothing to report  ← genuine zero
 *   - the hide/skip eye (routine-skipped.ts) = not dealing with this now    ← no data
 * That distinction is good and it shipped a while ago. The bug was never the
 * button.
 *
 * ── THE ACTUAL BUG ──────────────────────────────────────────────────────────
 * routine-cleared.ts writes to localStorage, keyed per-routine + per-day, AND IS
 * DELIBERATELY WIPED ON EVERY FRESH RUN so the checklist starts clean. Correct
 * for a checklist. Catastrophic for data: the genuine-zero — the entire
 * denominator — was a checkmark that evaporated. It never reached the database,
 * never reached the export, and could never be counted.
 *
 * So: routine-cleared.ts stays exactly as it is and remains the per-run UI
 * state. THIS module is the permanent record that outlives the run.
 *
 * ── WHY IT MATTERS RIGHT NOW ────────────────────────────────────────────────
 * TREATMENT RESPONSE SHOWS UP AS FEWER BAD DAYS BEFORE IT SHOWS UP AS MILDER
 * ONES. If a treatment works, the first signal is likely 4 flare days a month
 * instead of 12 — not "flares dropped 7/10 to 5/10." Without genuine-zero data
 * that improvement is INVISIBLE, because 8 missing days look exactly like 8
 * forgotten days.
 *
 * It also builds the disability denominator for free: the thresholds that
 * actually decide a vocational expert's job list are FREQUENCY thresholds
 * (off-task share, absences per month). "How many days a month does this happen"
 * is generated as a byproduct of normal use.
 *
 * ── 🚨 THE MIGRATION RULE — READ BEFORE WRITING ANY ANALYTICS ───────────────
 * Zero-reports START on the day this shipped. Everything before that date has NO
 * genuine-zero data, only absence.
 *
 * ANALYTICS MUST NOT TREAT PRE-CHANGE ABSENCE AS A ZERO, and must not blend a
 * pre-change window with a post-change one. Doing so manufactures a fake
 * improvement trend at exactly the moment someone starts a new treatment — the
 * one way this feature could actively mislead a doctor. Use
 * `zeroReportsAvailableFrom()` to bound any denominator, and say so in the UI.
 */

import { db } from '@/lib/database/dexie-db'
import { shouldPersist } from '@/lib/pwa-mode'

/**
 * Dedicated category. Deliberately NOT written into each tracker's own data
 * shape: a zero-report is a statement ABOUT a tracker, not an entry IN it, and
 * mixing them would let a "nothing today" leak into a severity mean as if it
 * were a logged 0. Keeping it separate means existing analytics are untouched
 * until they opt in.
 */
export const ZERO_REPORT_CATEGORY = 'zero-report'

/**
 * The day genuine-zero recording began. Anything earlier is absence-of-unknown-
 * meaning, NOT a zero. Bound every denominator by this.
 */
export const ZERO_REPORTS_SINCE = '2026-07-27'

export interface ZeroReport {
  trackerId: string
  /** Which routine the user was running when they reported it (provenance). */
  routineId: string | null
  /** ISO timestamp of the tap. */
  reportedAt: string
  /** Where it came from, so later surfaces (e.g. the daily touch-base) can add their own. */
  source: 'routine-run' | 'tracker-page' | 'other'
}

/** Earliest date for which "no entry" can be read as a real zero. */
export function zeroReportsAvailableFrom(): string {
  return ZERO_REPORTS_SINCE
}

async function findRow(date: string, trackerId: string) {
  return (db as any).daily_data
    .where('[date+category+subcategory]')
    .equals([date, ZERO_REPORT_CATEGORY, trackerId])
    .first()
}

/**
 * Record "I checked this tracker and it didn't bother me today."
 *
 * Idempotent per (date, tracker) — tapping twice updates rather than duplicating,
 * so a re-run of the routine can't inflate the count.
 *
 * No-ops in the throwaway demo sandbox (nothing a visitor types is kept there).
 */
export async function recordZeroReport(
  date: string,
  trackerId: string,
  routineId: string | null,
  source: ZeroReport['source'] = 'routine-run',
): Promise<void> {
  if (!trackerId || !date) return
  if (!shouldPersist()) return

  const now = new Date().toISOString()
  const content: ZeroReport = { trackerId, routineId, reportedAt: now, source }

  try {
    const existing = await findRow(date, trackerId)
    if (existing) {
      await (db as any).daily_data.update(existing.id, {
        content,
        metadata: { ...(existing.metadata || {}), updated_at: now },
      })
    } else {
      await (db as any).daily_data.add({
        date,
        category: ZERO_REPORT_CATEGORY,
        subcategory: trackerId,
        content,
        tags: [],
        metadata: { created_at: now, updated_at: now, user_id: 'default-user', version: 1 },
      })
    }
  } catch (e) {
    // Never let a bookkeeping write break the routine flow — the user tapped a
    // button and expects the checklist to advance. The UI marker (routine-cleared)
    // is written separately and independently, so the run still behaves correctly.
    console.error('[zero-report] failed to record:', e)
  }
}

/** Undo — the user said "actually I do have something to log." */
export async function removeZeroReport(date: string, trackerId: string): Promise<void> {
  if (!trackerId || !date) return
  if (!shouldPersist()) return
  try {
    const existing = await findRow(date, trackerId)
    if (existing) await (db as any).daily_data.delete(existing.id)
  } catch (e) {
    console.error('[zero-report] failed to remove:', e)
  }
}

/** Every tracker id reported as a genuine zero on a given date. */
export async function getZeroReportsForDate(date: string): Promise<Set<string>> {
  try {
    const rows = await (db as any).daily_data
      .where('[date+category]')
      .equals([date, ZERO_REPORT_CATEGORY])
      .toArray()
    return new Set(rows.map((r: any) => r.subcategory as string))
  } catch (e) {
    console.error('[zero-report] failed to read for date:', e)
    return new Set()
  }
}

/**
 * Count of genuine-zero days for one tracker across an inclusive date range.
 *
 * ⚠️ The caller is responsible for clamping `from` to `zeroReportsAvailableFrom()`
 * — this function reports what is stored, it cannot know whether the window you
 * asked for predates the feature.
 */
export async function countZeroReports(
  trackerId: string,
  from: string,
  to: string,
): Promise<number> {
  try {
    const rows = await (db as any).daily_data
      .where('category')
      .equals(ZERO_REPORT_CATEGORY)
      .toArray()
    return rows.filter(
      (r: any) => r.subcategory === trackerId && r.date >= from && r.date <= to,
    ).length
  } catch (e) {
    console.error('[zero-report] failed to count:', e)
    return 0
  }
}

/**
 * The three states, made explicit for any surface that needs to reason about a
 * day. `no_data` is the honest answer for "we don't know" and MUST NOT be
 * silently rendered as a zero.
 */
export type DayState = 'logged' | 'genuine_zero' | 'no_data'

/**
 * Resolve a single (tracker, date) into one of the three states.
 * `hasLoggedEntry` is passed in because only the caller knows how that
 * particular tracker stores its own entries.
 */
export async function resolveDayState(
  date: string,
  trackerId: string,
  hasLoggedEntry: boolean,
): Promise<DayState> {
  if (hasLoggedEntry) return 'logged'
  if (date < ZERO_REPORTS_SINCE) return 'no_data'
  const zeros = await getZeroReportsForDate(date)
  return zeros.has(trackerId) ? 'genuine_zero' : 'no_data'
}
