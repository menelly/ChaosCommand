/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Dynamic tracker source for the Routine builder (CHA-167). Users must be able
 * to add THEIR OWN trackers to a routine — including the custom ones they build
 * in Forge — not just a hardcoded built-in list. So the builder's pickable set =
 * the built-in TRACKABLE_TRACKERS registry + the user's custom trackers, loaded
 * at runtime from the 'custom-trackers' user-config record.
 *
 * Custom tracker storage (matches app/custom-tracker + Forge):
 *   - definitions: daily_data category 'user', subcategory 'custom-trackers',
 *     content.trackers = CustomTracker[] ({ id, name, category, ... })
 *   - entries:     category (body|mind|custom), subcategory `custom-${id}`,
 *     content { values, savedAt } — one record per day, last-write-wins.
 *   - route:       /custom-tracker?id=${id}
 */

import type { DailyDataRecord } from '@/lib/database/dexie-db'
import { TRACKABLE_TRACKERS, type TrackableTracker } from './trackable-registry'

type GetAllCategoryData = (category: string) => Promise<DailyDataRecord[]>

/** Load the user's custom (Forge-built) trackers as TrackableTracker records. */
export async function loadCustomTrackables(
  getAllCategoryData: GetAllCategoryData
): Promise<TrackableTracker[]> {
  try {
    const records = await getAllCategoryData('user')
    const defRecord = (records || [])
      .filter(r => r.subcategory === 'custom-trackers')
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
    const defs = defRecord?.content?.trackers
    if (!Array.isArray(defs)) return []
    return defs
      .filter((t: unknown): t is { id: string; name: string } =>
        typeof t === 'object' && t !== null &&
        typeof (t as { id?: unknown }).id === 'string' &&
        typeof (t as { name?: unknown }).name === 'string')
      .map(t => ({
        id: t.id,
        label: t.name,
        emoji: '🔧',
        href: `/custom-tracker?id=${encodeURIComponent(t.id)}`,
        subcategory: `custom-${t.id}`,
        category: 'custom' as const,
        isCustom: true,
      }))
  } catch {
    return []
  }
}

/** Built-in trackers + the user's custom trackers, ready for the builder list. */
export async function loadAllTrackables(
  getAllCategoryData: GetAllCategoryData
): Promise<TrackableTracker[]> {
  const custom = await loadCustomTrackables(getAllCategoryData)
  return [...TRACKABLE_TRACKERS, ...custom]
}

/** id → trackable lookup over a (possibly custom-augmented) trackable list. */
export function indexTrackables(list: TrackableTracker[]): Map<string, TrackableTracker> {
  return new Map(list.map(t => [t.id, t]))
}
