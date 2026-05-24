/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 * Licensed under PolyForm Noncommercial 1.0.0.
 */

/**
 * DEMO PROFILE — the public sample data, openly documented.
 *
 * PIN 1111 is the PUBLIC demo profile, and its public-ness is the whole point.
 * "The demo data lives at 1111" is documented out in the open (website / README /
 * onboarding). You cannot be accused of *hiding* data behind a PIN the developer
 * openly advertises as the sample set — so this is maximally deniable precisely
 * because nothing about it is secret.
 *
 * This pairs with the G-Spot button, which is now a plain EMERGENCY LOGOUT (one tap →
 * the logged-out screen → "I never even set it up"). The button hides nothing and the
 * demo hides nothing; multi-PIN separation is just a side effect of the architecture.
 * (Design locked with Ren + Nova, 2026-05-24. Replaces the old destructive "overwrite
 * with bland data" + steganography approach.)
 *
 * Seeded with the retuned starter data (mildly interesting, never alarming — see
 * starter-data.ts, which is now purely the demo/onboarding sample). Seed-on-first-view:
 * the first time anyone opens 1111, if it's empty, we lay the demo data down.
 */

import { getDB, initializeDatabase } from './dexie-db'
import demoFixture from './demo-fixture.json'

/**
 * The demo dataset is a SANITIZED export of real data (CHA-224) — shipped as a fixture so it
 * always matches the app's real save shapes (no generator drift, no crashes). PII/free-text/
 * images were stripped at build time (scripts/build-demo-fixture.js). Here we only re-base the
 * dates so the demo always ends at the viewer's "today," however long after build they open it.
 */
function fixtureRecords(): any[] {
  const recs: any[] = ((demoFixture as any).daily_data || [])
  const dates = recs.map(r => r.date).filter(Boolean).sort()
  if (!dates.length) return recs
  const toDay = (s: string) => Math.floor(new Date(s + 'T12:00:00').getTime() / 86400000)
  const delta = Math.floor(Date.now() / 86400000) - toDay(dates[dates.length - 1])
  const ISO = /^\d{4}-\d{2}-\d{2}/
  const shift = (v: any): any => {
    if (typeof v === 'string' && ISO.test(v)) {
      const d = new Date(v)
      if (!isNaN(d.getTime())) { d.setDate(d.getDate() + delta); return v.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString() }
    }
    if (Array.isArray(v)) return v.map(shift)
    if (v && typeof v === 'object') { const o: any = {}; for (const k in v) o[k] = shift(v[k]); return o }
    return v
  }
  return recs.map(r => ({ date: r.date ? shift(r.date) : r.date, category: r.category, subcategory: r.subcategory, content: shift(r.content), metadata: r.metadata || {} }))
}

/**
 * The public demo profile PIN. Documented openly. RESERVED — `isDemoPin` lets the
 * onboarding/PIN-setup flow refuse it as a real profile PIN so a user can't accidentally
 * land their real data on top of the shared sample.
 */
export const DEMO_PIN = '1111'

export function isDemoPin(pin: string): boolean {
  return pin.trim() === DEMO_PIN
}

/**
 * Open the demo DB *coherently*. The catch: initializeDatabase() → ensureDefaultTags() uses
 * the localStorage-driven `db` proxy (it reads 'chaos-user-pin'), while we open with the
 * explicit getDB(DEMO_PIN). PRE-LOGIN no pin is set, so the proxy points at the null-pin DB
 * while getDB points at the demo DB — and the single global Dexie handle thrashes open/close
 * between the two and HANGS (that was the "See demo doesn't click on first start" bug).
 * Pointing 'chaos-user-pin' at the demo first keeps the whole stack on one DB. login(DEMO_PIN)
 * sets the same key again immediately after — harmless.
 */
async function openDemoDb() {
  try { localStorage.setItem('chaos-user-pin', DEMO_PIN) } catch { /* SSR / Safari private */ }
  await initializeDatabase(DEMO_PIN)
  return getDB(DEMO_PIN)
}

/**
 * Ensure the demo profile (PIN 1111) is populated. Idempotent: only seeds when the demo DB
 * is empty, so a visitor poking around isn't wiped on the next visit. Returns the record
 * count present after the call. Only ever touches the demo DB. Used by a manual 1111 login.
 */
export async function ensureDemoSeeded(): Promise<number> {
  const db = await openDemoDb()
  const existing = await db.daily_data.count()
  if (existing > 0) return existing
  const records = fixtureRecords() // rich 90-day arc — a demo that shows analytics off
  await db.daily_data.bulkAdd(records as any)
  return records.length
}

/**
 * Reset the demo to a pristine, fully-populated 90-day sample. Used by the explicit
 * "See the demo" button so every visit gets a robust, freshly-dated demo (and any stray
 * pokes from a previous visitor are cleared). Only ever touches the demo DB.
 */
export async function resetDemo(): Promise<number> {
  const db = await openDemoDb()
  await db.daily_data.clear()
  const records = fixtureRecords()
  await db.daily_data.bulkAdd(records as any)
  return records.length
}
