/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/**
 * ENTITY DE-DUPLICATION (CHA-378)
 *
 * WHY THIS EXISTS
 * ---------------
 * `daily_data` is keyed by [date + category + subcategory]. That's correct for
 * *daily-log* data (a pain pull on 4/15 belongs to 4/15). It is WRONG for
 * *entity* data — a medication is a thing that persists across time, not an
 * event that happened on one day. Before the CHA-273 write-path fix, editing a
 * med on a day later than it was created spawned a SECOND row under a new date
 * (same `medications-{id}` subcategory, different date) — so one med could have
 * several physical rows.
 *
 * The medication LIST and the TIMELINE both re-project these rows. Without
 * de-duplication a med edited across days appears multiple times; without a
 * tombstone filter a *deleted* med (soft-deleted via metadata.deleted_at, so the
 * deletion can sync) keeps projecting. Three reported symptoms — deleted meds on
 * the timeline, duplicate meds on the timeline, duplicate meds in the list — are
 * all this one gap.
 *
 * This helper is the single place that gap gets closed: drop tombstones, then
 * collapse to one record per entity (the most recently updated live one).
 */

import { DailyDataRecord } from './dexie-db';

/** Best comparable timestamp for "which row is newest". */
function recordTime(r: DailyDataRecord): number {
  const t = r.metadata?.updated_at || r.metadata?.created_at || '';
  const ms = new Date(t).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Given raw daily_data records (typically all rows sharing a category), return
 * the live, de-duplicated set: tombstoned rows removed, and at most one row per
 * `subcategory` — the most recently updated one.
 *
 * Use `subcategory` as the identity because for entity stores it already encodes
 * the entity id (`medications-{id}`, `providers-{id}`, …). Date-spawned duplicates
 * share the subcategory and differ only by the row's `date`, which is exactly what
 * we want to collapse.
 */
export function latestLiveBySubcategory<T extends DailyDataRecord>(records: T[]): T[] {
  const latest = new Map<string, T>();
  for (const r of records) {
    if (r.metadata?.deleted_at) continue; // tombstone — skip
    const key = r.subcategory;
    const prev = latest.get(key);
    if (!prev || recordTime(r) >= recordTime(prev)) {
      latest.set(key, r);
    }
  }
  return [...latest.values()];
}

/**
 * The duplicate rows that `latestLiveBySubcategory` would discard — the live
 * losers (NOT the survivors, NOT already-tombstoned rows). Callers can tombstone
 * these to heal storage so the duplicate never re-projects anywhere again.
 */
export function staleDuplicates<T extends DailyDataRecord>(records: T[]): T[] {
  const winners = new Set(latestLiveBySubcategory(records).map(r => r.id));
  return records.filter(r => !r.metadata?.deleted_at && !winners.has(r.id));
}
