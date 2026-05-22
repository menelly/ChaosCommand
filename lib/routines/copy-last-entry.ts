/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * "Same as yesterday" / copy-last-entry for routines (CHA-167). On a day where a
 * stable thing is unchanged (same meds, same hydration goal), the user can clone
 * their most recent prior entry into today in one tap instead of re-entering it.
 * Then they tweak or remove it with the tracker's existing Edit / Delete buttons.
 *
 * Generic on purpose: it clones the most recent entry object without needing to
 * understand any tracker's fields, so it works across all standard trackers
 * (content.entries[]) AND custom Forge trackers (content.values{}). Only the date
 * (+ a fresh id) is restamped; the entry's own time fields carry over, which is
 * exactly what you want for a "same routine time" log (and editable after).
 */

import type { DailyDataRecord } from "@/lib/database/dexie-db"
import type { TrackableTracker } from "./trackable-registry"

type SaveData = (
  date: string, category: string, subcategory: string, content: unknown, tags?: string[]
) => Promise<void>
type GetDateRange = (start: string, end: string, category?: string) => Promise<DailyDataRecord[]>

export interface CopyResult {
  ok: boolean
  /** The date the copied entry came from (for the confirmation toast). */
  srcDate?: string
  reason?: "no-prior" | "unknown-shape"
}

/**
 * Clone a tracker's most recent entry from before today into today.
 * Returns { ok:false, reason:'no-prior' } if there's nothing earlier to copy.
 */
export async function copyLastEntryToToday(
  tracker: TrackableTracker,
  today: string,
  getDateRange: GetDateRange,
  saveData: SaveData
): Promise<CopyResult> {
  // All categories — custom trackers live under body/mind/custom, not 'tracker'.
  const records = await getDateRange("2000-01-01", today)
  const mine = records.filter(r => r.subcategory === tracker.subcategory)
  const src = mine
    .filter(r => r.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!src) return { ok: false, reason: "no-prior" }

  const category = src.category
  const entries = src.content?.entries

  // Standard tracker: clone the most recent entry, append to today's bucket.
  if (Array.isArray(entries) && entries.length > 0) {
    const last = entries[entries.length - 1]
    const clone = JSON.parse(JSON.stringify(last)) as Record<string, unknown>
    clone.date = today
    if ("id" in clone) clone.id = typeof clone.id === "number" ? Date.now() : String(Date.now())
    const todayRec = mine.find(r => r.date === today)
    const todayEntries = Array.isArray(todayRec?.content?.entries) ? todayRec!.content.entries : []
    await saveData(today, category, tracker.subcategory, { entries: [...todayEntries, clone] }, todayRec?.tags ?? src.tags ?? [])
    return { ok: true, srcDate: src.date }
  }

  // Custom (Forge) tracker: clone the values object.
  const values = src.content?.values
  if (values && typeof values === "object") {
    await saveData(today, category, tracker.subcategory, {
      trackerId: src.content?.trackerId,
      trackerName: src.content?.trackerName,
      values,
      savedAt: new Date().toISOString(),
    }, src.tags ?? [])
    return { ok: true, srcDate: src.date }
  }

  return { ok: false, reason: "unknown-shape" }
}
