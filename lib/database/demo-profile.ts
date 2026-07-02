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
import { deriveSession } from './session-crypto'
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
 * Open the demo DB *coherently*. deriveSession(DEMO_PIN) sets the hashed namespace +
 * key BEFORE we open, so the `db` proxy and getDB() both resolve the SAME demo DB.
 * (Historically this thrashed because the proxy and an explicit getDB(pin) pointed at
 * different DBs and the single global Dexie handle churned open/close and HANGS — the
 * "See demo doesn't click on first start" bug. One session → one DB → no thrash.)
 */
async function openDemoDb() {
  // Derive the demo session (sets the hashed namespace + key), so the `db` proxy and
  // getDB() both resolve the demo DB coherently. Demo data is encrypted with the demo
  // key (PIN 1111 is public, so this is not a secret — just keeps one code path).
  await deriveSession(DEMO_PIN)
  await initializeDatabase()
  return getDB()
}

/**
 * localStorage key holding the `built_at` of the fixture currently laid down in the demo DB.
 * Lets us SELF-HEAL: if the demo was seeded by an OLDER build (different/old-shaped data that
 * may crash newer views), we detect the mismatch and force a fresh reset to the current fixture.
 * This is why someone who poked 1111 in an old build still gets the clean current demo.
 */
const DEMO_FIXTURE_VERSION_KEY = 'chaos-demo-fixture-version'
const FIXTURE_BUILT_AT: string = (demoFixture as any).built_at || 'unknown'

/**
 * What's currently sitting under PIN 1111, by PROVENANCE — this is the safety gate that stops us
 * from ever wiping a real human's data.
 *
 *   'empty'      — nothing there; safe to seed the demo.
 *   'current'    — our demo, current fixture build; use as-is.
 *   'ours-stale' — our demo from an OLDER fixture (stamp present but mismatched); safe to refresh
 *                  (this is the self-heal path for the old crashy demo data).
 *   'foreign'    — data with NO stamp at all. We did NOT seed this. It could be a real person who
 *                  used 1111 as their actual PIN back when it was selectable (≤0.5.3). NEVER wipe
 *                  it silently — the caller must ask the human what to do.
 *
 * The stamp is the discriminator: only our own seeding writes DEMO_FIXTURE_VERSION_KEY, so unstamped
 * data is by definition not ours.
 */
export type DemoPinState = 'empty' | 'current' | 'ours-stale' | 'foreign'

export async function inspectDemoPin(): Promise<DemoPinState> {
  const db = await openDemoDb()
  const existing = await db.daily_data.count()
  if (existing === 0) return 'empty'
  let storedVersion: string | null = null
  try { storedVersion = localStorage.getItem(DEMO_FIXTURE_VERSION_KEY) } catch { /* SSR */ }
  if (storedVersion === FIXTURE_BUILT_AT) return 'current'
  if (storedVersion) return 'ours-stale'   // we seeded it in a prior version → safe to refresh
  return 'foreign'                          // unstamped → unknown origin → ASK, never wipe
}

/**
 * Ensure the demo profile (PIN 1111) is populated AND current — WITHOUT ever destroying data we
 * didn't create. Seeds when empty; refreshes our own stale demo (self-heal for the old "crashes on
 * Pain All-time" data); leaves a current demo alone; and on FOREIGN (unstamped, possibly-real) data
 * it does NOTHING and returns the existing count — the caller is responsible for inspecting first
 * (via inspectDemoPin) and asking the human before anything is wiped. Returns the record count
 * present after the call. Only touches the demo DB.
 */
export async function ensureDemoSeeded(): Promise<number> {
  const state = await inspectDemoPin()
  const db = await openDemoDb()

  // Don't touch foreign data, and don't re-seed a current demo.
  if (state === 'foreign' || state === 'current') return db.daily_data.count()

  // Empty (fresh) or our own stale demo → (re)lay the current fixture.
  if (state === 'ours-stale') await db.daily_data.clear()
  const records = fixtureRecords()
  await db.daily_data.bulkAdd(records as any)
  try { localStorage.setItem(DEMO_FIXTURE_VERSION_KEY, FIXTURE_BUILT_AT) } catch { /* SSR */ }
  return records.length
}

/**
 * MIGRATE the data currently under PIN 1111 to a brand-new PIN, then hand 1111 back to the demo.
 * For the upgrade case: a real person used 1111 for their actual records (back when it was a valid
 * PIN), and now needs that data preserved under a different PIN before 1111 becomes the public demo.
 *
 * Copies daily_data, user_tags, and image_blobs verbatim (ids preserved — the destination must be
 * unused, so there are no collisions and all internal links stay intact). REFUSES if the target PIN
 * already holds data, so we never clobber or silently merge into someone else's profile. After a
 * successful copy it resets 1111 to the demo and points the session at the new PIN. Returns the
 * number of data records moved.
 */
export async function migrateDemoToNewPin(newPin: string): Promise<number> {
  const np = newPin.trim()
  if (np.length < 4) throw new Error('PIN must be at least 4 characters.')
  if (np === DEMO_PIN) throw new Error('Choose a PIN other than 1111 — that one is the public demo.')

  // 1) Read everything under 1111 (demo key active → decrypted into memory).
  await deriveSession(DEMO_PIN)
  await initializeDatabase()
  const srcDb = getDB()
  const records = await srcDb.daily_data.toArray()
  const tags = await srcDb.user_tags.toArray()
  const blobs = await srcDb.image_blobs.toArray()

  // 2) Switch to the destination profile's key; refuse if it already holds data.
  await deriveSession(np)
  await initializeDatabase()
  const destDb = getDB()
  if ((await destDb.daily_data.count()) > 0) {
    throw new Error(`PIN ${np} is already in use. Pick a PIN that hasn't been set up yet.`)
  }

  // 3) Copy verbatim (ids preserved — dest is empty). Middleware RE-encrypts with the
  //    destination key on write; the cross-key move is why we switch sessions here.
  if (records.length) await destDb.daily_data.bulkAdd(records as any)
  if (tags.length) await destDb.user_tags.bulkAdd(tags as any)
  if (blobs.length) await destDb.image_blobs.bulkAdd(blobs as any)

  // 4) Switch back to the demo key and reset 1111 to the public demo.
  await deriveSession(DEMO_PIN)
  await initializeDatabase()
  const demoDb = getDB()
  await demoDb.daily_data.clear()
  await demoDb.daily_data.bulkAdd(fixtureRecords() as any)
  try { localStorage.setItem(DEMO_FIXTURE_VERSION_KEY, FIXTURE_BUILT_AT) } catch { /* SSR */ }

  // 5) Land the session on the new PIN (the caller calls login(np) right after, which
  //    re-derives + persists the session; we set currentUserPin so resume works too).
  await deriveSession(np)
  try { localStorage.setItem('currentUserPin', np) } catch { /* SSR */ }
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
  try { localStorage.setItem(DEMO_FIXTURE_VERSION_KEY, FIXTURE_BUILT_AT) } catch { /* SSR */ }
  return records.length
}
