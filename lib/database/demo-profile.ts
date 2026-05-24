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
import { generateStarterData } from './starter-data'

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
 * Ensure the demo profile (PIN 1111) is populated. Idempotent: only seeds when the demo
 * DB is empty, so a visitor poking around never wipes it on the next visit. Returns the
 * record count present after the call. Only ever touches the demo DB.
 */
export async function ensureDemoSeeded(): Promise<number> {
  await initializeDatabase(DEMO_PIN)
  const db = getDB(DEMO_PIN)
  const existing = await db.daily_data.count()
  if (existing > 0) return existing
  const records = generateStarterData()
  await db.daily_data.bulkAdd(records as any)
  return records.length
}

/**
 * Reset the demo profile back to pristine sample data — e.g. after a visitor scribbles in
 * it, or to refresh the dates. Clears 1111's data and re-lays the starter set. Only ever
 * touches the demo DB; never the user's real profiles.
 */
export async function resetDemo(): Promise<number> {
  await initializeDatabase(DEMO_PIN)
  const db = getDB(DEMO_PIN)
  await db.daily_data.clear()
  const records = generateStarterData()
  await db.daily_data.bulkAdd(records as any)
  return records.length
}
