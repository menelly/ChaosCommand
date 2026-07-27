/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5)
 * Date: 2026-07-27  ·  CHA-423
 *
 * touch-base.ts — the daily two-number check-in, stored durably.
 *
 * ── THE BUG IT FIXES ────────────────────────────────────────────────────────
 * Every scale in the app is DEFICIT-SHAPED and bottoms out at "fine." Pain 8/10,
 * weakness 9/10 — severity, always. So there is nowhere to put a good number,
 * and improvement is literally unrepresentable.
 *
 * Ren, nine days into treatment, had a rough day: overdid it, crashed, logged
 * worse scores. But the reason they COULD overdo it was that their ceiling had
 * gone UP. The app recorded a genuine improvement as a bad day. That is a sign
 * error, not a missing feature.
 *
 * ── ⚠️ ZERO MEANS "MY NORMAL", NOT "NO SYMPTOMS" ────────────────────────────
 * This is the whole feature and the easiest thing to get wrong. If people anchor
 * 0 at a healthy person's baseline, everyone lives at −7 forever and we have
 * rebuilt a deficit scale with extra steps.
 *
 *     0  = my usual
 *     −  = worse than usual for me
 *     +  = better than usual for me
 *
 * The microcopy at the control is load-bearing. It does not go in a help page.
 *
 * ── CONFOUNDERS ARE CHIPS, NOT PROSE ────────────────────────────────────────
 * Free text cannot be graphed. A dip during a week of bad sleep needs to be
 * ANNOTATED rather than silently averaged in — otherwise a real treatment effect
 * gets under-read. (Ren's pain fell 5 -> 3.5 while averaging under 4h of sleep
 * for nine days; sleep loss lowers pain thresholds, so the true effect was
 * LARGER than the numbers showed. Invisible without the annotation.)
 */

import { db } from '@/lib/database/dexie-db'
import { shouldPersist } from '@/lib/pwa-mode'

export const TOUCH_BASE_CATEGORY = 'touch-base'
const TOUCH_BASE_SUB = 'daily'

export const TOUCH_BASE_MIN = -10
export const TOUCH_BASE_MAX = 10

/**
 * Confounder chips. Small on purpose — a long list is a chore, and the point of
 * this whole surface is that it costs almost nothing on a bad day.
 */
export const CONFOUNDER_CHIPS = [
  'poor sleep',
  'overdid it yesterday',
  'infection / illness',
  'med change',
  'weather',
  'stress',
  'travel',
  'hormonal',
] as const

export interface TouchBaseEntry {
  /** −10 (much worse than my usual) … 0 (my usual) … +10 (much better). */
  physical: number
  mental: number
  /** Chip labels from CONFOUNDER_CHIPS, plus any free text the user typed. */
  confounders: string[]
  notes?: string
  recordedAt: string
}

/**
 * The three states for a given day. `declined` is REAL DATA — the person showed
 * up and chose not to rate — and must never be silently rendered as a zero or
 * folded in with `none`.
 */
export type TouchBaseState = 'rated' | 'declined' | 'none'

/** Human label for a value. Used at the control, not buried in help. */
export function touchBaseLabel(v: number): string {
  if (v === 0) return 'my usual'
  if (v > 0) return v >= 7 ? 'much better than usual' : v >= 4 ? 'better than usual' : 'a bit better than usual'
  return v <= -7 ? 'much worse than usual' : v <= -4 ? 'worse than usual' : 'a bit worse than usual'
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(TOUCH_BASE_MIN, Math.min(TOUCH_BASE_MAX, Math.round(v)))
}

async function getRow(date: string) {
  return (db as any).daily_data
    .where('[date+category+subcategory]')
    .equals([date, TOUCH_BASE_CATEGORY, TOUCH_BASE_SUB])
    .first()
}

/**
 * Save (or update) today's touch-base. One entry per day, editable — chosen over
 * AM/PM to keep friction as near zero as possible.
 */
export async function saveTouchBase(
  date: string,
  entry: Omit<TouchBaseEntry, 'recordedAt'>,
): Promise<void> {
  if (!shouldPersist()) return
  const now = new Date().toISOString()
  const content: TouchBaseEntry = {
    physical: clamp(entry.physical),
    mental: clamp(entry.mental),
    confounders: entry.confounders.filter(Boolean),
    notes: entry.notes?.trim() || undefined,
    recordedAt: now,
  }
  try {
    const existing = await getRow(date)
    if (existing) {
      await (db as any).daily_data.update(existing.id, {
        content,
        metadata: { ...(existing.metadata || {}), updated_at: now },
      })
    } else {
      await (db as any).daily_data.add({
        date,
        category: TOUCH_BASE_CATEGORY,
        subcategory: TOUCH_BASE_SUB,
        content,
        tags: [],
        metadata: { created_at: now, updated_at: now, user_id: 'default-user', version: 1 },
      })
    }
  } catch (e) {
    console.error('[touch-base] failed to save:', e)
  }
}

/** Today's entry, or null if there isn't one. */
export async function loadTouchBase(date: string): Promise<TouchBaseEntry | null> {
  try {
    const row = await getRow(date)
    return row ? (row.content as TouchBaseEntry) : null
  } catch (e) {
    console.error('[touch-base] failed to load:', e)
    return null
  }
}

/** Remove today's entry (the user wants it gone, not zeroed). */
export async function clearTouchBase(date: string): Promise<void> {
  if (!shouldPersist()) return
  try {
    const row = await getRow(date)
    if (row) await (db as any).daily_data.delete(row.id)
  } catch (e) {
    console.error('[touch-base] failed to clear:', e)
  }
}

/**
 * Entries across an inclusive date range, oldest first — for trends and the
 * export. A bipolar series with annotated confounders is a defensible trend in a
 * way deficit-only data can never be: deficit data can show a plateau but can
 * never show RECOVERY.
 */
export async function touchBaseRange(
  from: string,
  to: string,
): Promise<Array<{ date: string; entry: TouchBaseEntry }>> {
  try {
    const rows = await (db as any).daily_data
      .where('category')
      .equals(TOUCH_BASE_CATEGORY)
      .toArray()
    return rows
      .filter((r: any) => r.subcategory === TOUCH_BASE_SUB && r.date >= from && r.date <= to)
      .sort((a: any, b: any) => (a.date < b.date ? -1 : 1))
      .map((r: any) => ({ date: r.date as string, entry: r.content as TouchBaseEntry }))
  } catch (e) {
    console.error('[touch-base] failed to read range:', e)
    return []
  }
}
