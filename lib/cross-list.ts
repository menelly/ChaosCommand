/*
 * Built by: Ace (Claude 4.x) — 2026-06-07
 * Cross-list helper: write ONE event to TWO tracker subcategories, kept in
 * sync by a shared `id`. Used so a neuromuscular symptom (weakness / cramping /
 * fasciculations) can live in BOTH the Neuro and MSK (joint) trackers — a
 * neurologist and a rheumatologist each find it in their own section — without
 * the two copies ever drifting. Every mutation (save/edit/delete) routes
 * through here and touches both subcategories, so there is no path that
 * updates only one side. That is the integrity guarantee.
 *
 * Storage model (matches the existing trackers): entries live per-date under
 *   saveData(date, CATEGORIES.TRACKER, subcategory, { entries })
 * read via getCategoryData(date, CATEGORIES.TRACKER).find(r => r.subcategory === sub).
 */

import { CATEGORIES } from '@/lib/database'

// The two useDailyData fns the trackers already have; passed in so this stays
// a plain module (no hook rules) and is trivially testable.
export interface CrossListDataFns {
  saveData: (date: string, category: string, subcategory: string, content: any, tags?: string[]) => Promise<void>
  getCategoryData: (date: string, category: string) => Promise<any[]>
}

// Anything with a stable id and the cross-list marker.
export interface CrossListable {
  id: string
  date: string
  crossListedIn?: string[]
  [key: string]: any
}

export function isCrossListed(entry: { crossListedIn?: string[] } | null | undefined): boolean {
  return !!entry?.crossListedIn?.length
}

async function readEntries(fns: CrossListDataFns, date: string, sub: string): Promise<any[]> {
  const records = await fns.getCategoryData(date, CATEGORIES.TRACKER)
  const rec = records.find(r => r.subcategory === sub)
  if (!rec?.content?.entries) return []
  let entries = rec.content.entries
  if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { return [] } }
  return Array.isArray(entries) ? entries : []
}

// Optional translator: reshape the shared entry into the form NATIVE to each
// target subcategory before writing, so trackers that store the same concepts
// under different field names still render fully. Identity by default.
export type CrossListTranslate = (entry: any, targetSub: string) => any

// Upsert the entry (by id) into BOTH subcategories under the entry's own date,
// tagged so each side knows it is shared. Idempotent: re-running replaces in place.
export async function crossListSave(
  fns: CrossListDataFns,
  primarySub: string,
  secondarySub: string,
  entry: CrossListable,
  translate?: CrossListTranslate,
): Promise<void> {
  const tagged = { ...entry, crossListedIn: [primarySub, secondarySub] }
  const date = tagged.date
  for (const sub of [primarySub, secondarySub]) {
    const existing = await readEntries(fns, date, sub)
    const toWrite = translate ? translate(tagged, sub) : tagged
    const next = [...existing.filter((e: any) => e.id !== tagged.id), toWrite]
    await fns.saveData(date, CATEGORIES.TRACKER, sub, { entries: next })
  }
}

// Edit = upsert by id in both (same as save).
export async function crossListUpdate(
  fns: CrossListDataFns,
  primarySub: string,
  secondarySub: string,
  entry: CrossListable,
  translate?: CrossListTranslate,
): Promise<void> {
  return crossListSave(fns, primarySub, secondarySub, entry, translate)
}

// Remove the shared id from both subcategories.
export async function crossListDelete(
  fns: CrossListDataFns,
  primarySub: string,
  secondarySub: string,
  date: string,
  id: string,
): Promise<void> {
  for (const sub of [primarySub, secondarySub]) {
    const existing = await readEntries(fns, date, sub)
    const next = existing.filter((e: any) => e.id !== id)
    await fns.saveData(date, CATEGORIES.TRACKER, sub, { entries: next })
  }
}
