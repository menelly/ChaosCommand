/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5)
 * Date: 2026-07-27  ·  CHA-428
 *
 * survival-check.ts — durable storage for the Survival Check.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The survival check is the most emotionally load-bearing number in the app. It
 * is the one thing a user taps on a day they could do nothing else, and the
 * count is a running record of "I showed up." Its own copy is *"If you just
 * CAN'T today, that's OK."*
 *
 * It was also the LEAST durable data we stored. survival-button.tsx persisted
 * entirely to localStorage — survivalChecked / survivalCount / lastCheckedDate,
 * keyed per PIN — and never touched daily_data like every other tracker. So:
 *
 *   - it never appeared in the PDF export, which is exactly where "this person
 *     self-reported every day for three months" is the most credible thing on
 *     the page for a clinician or an adjudicator;
 *   - it never synced (the button *triggers* auto-sync while being excluded
 *     from it — check in on the phone, open the desktop, different streak);
 *   - it was in no backup, and a browser storage clear or an OS "clear app
 *     data" wiped a multi-month streak with no warning and no recovery;
 *   - it could not be graphed or correlated, so "did my check-ins fall off in
 *     the two weeks before the flare?" was unanswerable.
 *
 * ── 🚨 THE STREAK IS SACRED ─────────────────────────────────────────────────
 * Users have long streaks and that number means something to them. Losing one
 * to our own refactor would be a genuinely cruel bug. The migration therefore
 * NEVER recomputes the count from rows — it carries the old total forward as an
 * explicit legacy baseline and only adds days observed AFTER migration.
 *
 * ── ⚠️ IT IS A LIFETIME TOTAL, NOT A CONSECUTIVE STREAK ─────────────────────
 * The original never reset on a missed day. That is deliberate and correct:
 * punishing a missed day would be exactly backwards for this user base, and the
 * whole point is that the box demands nothing. DO NOT "fix" this into a
 * consecutive streak. This module preserves the existing semantics rather than
 * reinterpreting them.
 */

import { db } from '@/lib/database/dexie-db'
import { shouldPersist } from '@/lib/pwa-mode'

export const SURVIVAL_CATEGORY = 'survival'
const CHECK_SUB = 'check'
const LEGACY_SUB = 'legacy-count'

/** Legacy localStorage keys — read during migration, then kept as a fallback. */
const LS_CHECKED = 'survivalChecked'
const LS_COUNT = 'survivalCount'
const LS_DATE = 'lastCheckedDate'
const LS_MIGRATED = 'chaos-survival-migrated'

export interface SurvivalState {
  /** Total days survived — legacy baseline plus post-migration days. */
  count: number
  /** Is today already checked? */
  checkedToday: boolean
  /** Most recent checked date, 'YYYY-MM-DD', or '' if never. */
  lastCheckedDate: string
}

interface LegacyBaseline {
  count: number
  /** Every check on or before this date is ALREADY included in `count`. */
  throughDate: string
  migratedAt: string
}

/** Local-time date key. Deliberately not UTC — midnight must mean the user's midnight. */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lsKey(base: string, pin: string | null): string {
  return pin ? `${base}_${pin}` : base
}

// ── raw row helpers ─────────────────────────────────────────────────────────

async function getRow(date: string, sub: string) {
  return (db as any).daily_data
    .where('[date+category+subcategory]')
    .equals([date, SURVIVAL_CATEGORY, sub])
    .first()
}

async function allCheckRows(): Promise<Array<{ date: string }>> {
  try {
    const rows = await (db as any).daily_data
      .where('category')
      .equals(SURVIVAL_CATEGORY)
      .toArray()
    return rows.filter((r: any) => r.subcategory === CHECK_SUB)
  } catch (e) {
    console.error('[survival] failed to read check rows:', e)
    return []
  }
}

async function readLegacyBaseline(): Promise<LegacyBaseline | null> {
  try {
    const rows = await (db as any).daily_data
      .where('category')
      .equals(SURVIVAL_CATEGORY)
      .toArray()
    const row = rows.find((r: any) => r.subcategory === LEGACY_SUB)
    return row ? (row.content as LegacyBaseline) : null
  } catch {
    return null
  }
}

// ── migration ───────────────────────────────────────────────────────────────

/**
 * One-time carry-forward of the localStorage streak into daily_data.
 *
 * Stores the old total as a BASELINE with the date it runs through, rather than
 * synthesising fake per-day rows for history we never recorded. Days on or
 * before `throughDate` are already inside `count`, so they can never be
 * double-counted when a check row happens to exist for one of them.
 *
 * Idempotent, and safe to call on every mount.
 */
export async function migrateSurvivalFromLocalStorage(pin: string | null): Promise<void> {
  if (!shouldPersist()) return
  if (typeof window === 'undefined') return

  try {
    if (window.localStorage.getItem(lsKey(LS_MIGRATED, pin)) === '1') return
    if (await readLegacyBaseline()) {
      window.localStorage.setItem(lsKey(LS_MIGRATED, pin), '1')
      return
    }

    const rawCount = window.localStorage.getItem(lsKey(LS_COUNT, pin))
    const rawDate = window.localStorage.getItem(lsKey(LS_DATE, pin)) || ''
    const count = rawCount ? parseInt(rawCount, 10) : 0

    // Nothing to carry forward — still mark migrated so we stop looking.
    if (!Number.isFinite(count) || count <= 0) {
      window.localStorage.setItem(lsKey(LS_MIGRATED, pin), '1')
      return
    }

    const now = new Date().toISOString()
    const baseline: LegacyBaseline = {
      count,
      // If we somehow have a count with no date, fence it at today so nothing
      // already counted can be re-counted.
      throughDate: rawDate || todayKey(),
      migratedAt: now,
    }

    await (db as any).daily_data.add({
      date: baseline.throughDate,
      category: SURVIVAL_CATEGORY,
      subcategory: LEGACY_SUB,
      content: baseline,
      tags: [],
      metadata: { created_at: now, updated_at: now, user_id: 'default-user', version: 1 },
    })

    window.localStorage.setItem(lsKey(LS_MIGRATED, pin), '1')
    console.log(`[survival] migrated legacy streak: ${count} days through ${baseline.throughDate}`)
  } catch (e) {
    // A failed migration must never cost the user their streak — leave the
    // localStorage values untouched and un-flagged so we retry next mount.
    console.error('[survival] migration failed (will retry):', e)
  }
}

// ── read / write ────────────────────────────────────────────────────────────

/**
 * Current survival state. Reads the database first and falls back to
 * localStorage — so a user who skips a release, or whose DB is unavailable,
 * still sees their streak instead of a heartbreaking zero.
 */
export async function loadSurvivalState(pin: string | null): Promise<SurvivalState> {
  const today = todayKey()

  try {
    const [baseline, rows] = await Promise.all([readLegacyBaseline(), allCheckRows()])
    const through = baseline?.throughDate ?? ''
    const post = rows.filter(r => !through || r.date > through)
    const dbCount = (baseline?.count ?? 0) + post.length

    if (baseline || rows.length) {
      const dates = rows.map(r => r.date).sort()
      const lastRow = dates.length ? dates[dates.length - 1] : ''
      return {
        count: dbCount,
        checkedToday: rows.some(r => r.date === today),
        lastCheckedDate: lastRow > through ? lastRow : through,
      }
    }
  } catch (e) {
    console.error('[survival] DB read failed, falling back to localStorage:', e)
  }

  // FALLBACK — pre-migration, or the DB is unreachable.
  if (typeof window === 'undefined') return { count: 0, checkedToday: false, lastCheckedDate: '' }
  try {
    const count = parseInt(window.localStorage.getItem(lsKey(LS_COUNT, pin)) || '0', 10) || 0
    const date = window.localStorage.getItem(lsKey(LS_DATE, pin)) || ''
    const checked = window.localStorage.getItem(lsKey(LS_CHECKED, pin)) === 'true'
    return { count, checkedToday: checked && date === today, lastCheckedDate: date }
  } catch {
    return { count: 0, checkedToday: false, lastCheckedDate: '' }
  }
}

/**
 * Record that the user survived today. Idempotent per date — tapping twice
 * cannot inflate the count (the original relied on a `lastCheckedDate !== today`
 * guard in component state; this enforces it at the storage layer).
 *
 * Returns the state after the write so the caller can render without re-reading.
 */
export async function recordSurvival(pin: string | null): Promise<SurvivalState> {
  const today = todayKey()
  const now = new Date().toISOString()

  // Keep localStorage in sync for one release, so a downgrade or a partial
  // rollout doesn't strand the streak in a store the old code can't see.
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(lsKey(LS_CHECKED, pin), 'true')
      window.localStorage.setItem(lsKey(LS_DATE, pin), today)
    } catch { /* storage blocked — DB is the real record anyway */ }
  }

  if (shouldPersist()) {
    try {
      const existing = await getRow(today, CHECK_SUB)
      if (!existing) {
        await (db as any).daily_data.add({
          date: today,
          category: SURVIVAL_CATEGORY,
          subcategory: CHECK_SUB,
          content: { checked: true, checkedAt: now },
          tags: [],
          metadata: { created_at: now, updated_at: now, user_id: 'default-user', version: 1 },
        })
      }
    } catch (e) {
      console.error('[survival] failed to record survival:', e)
    }
  }

  const state = await loadSurvivalState(pin)

  // Mirror the count back to localStorage so the fallback path stays truthful.
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(lsKey(LS_COUNT, pin), String(state.count)) } catch {}
  }
  return state
}

/** Un-check today. The original allowed toggling off; preserve that. */
export async function undoSurvival(pin: string | null): Promise<SurvivalState> {
  const today = todayKey()

  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(lsKey(LS_CHECKED, pin), 'false') } catch {}
  }

  if (shouldPersist()) {
    try {
      const existing = await getRow(today, CHECK_SUB)
      if (existing) await (db as any).daily_data.delete(existing.id)
    } catch (e) {
      console.error('[survival] failed to undo survival:', e)
    }
  }
  return loadSurvivalState(pin)
}

/**
 * Export summary — days checked in over a range, for the doctor/adjudicator PDF.
 * Engagement evidence: "self-reported on N of M days" is credible in a way a
 * symptom average never is.
 */
export async function survivalSummary(from: string, to: string): Promise<{ days: number; from: string; to: string }> {
  const rows = await allCheckRows()
  return { days: rows.filter(r => r.date >= from && r.date <= to).length, from, to }
}
