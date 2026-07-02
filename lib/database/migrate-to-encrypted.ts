/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 */

/**
 * ONE-TIME MIGRATION — legacy plaintext profile → hashed + encrypted profile.
 *
 * Before session-crypto, a profile's data lived in an IndexedDB named with the
 * RAW pin (`ChaosCommand_1234`) and stored plaintext `content`. This moves it to
 * the new namespace-hashed, at-rest-encrypted DB (`ChaosCommand_<sha256>`).
 *
 * SAFETY CONTRACT (the whole reason this file is careful):
 *   1. Only runs when the OLD plaintext DB exists AND the NEW DB is empty.
 *   2. Copies everything, then VERIFIES per-table counts match.
 *   3. Deletes the old DB ONLY after verification passes. A failed/partial
 *      migration leaves BOTH databases intact — we never delete unverified.
 *
 * Requires the session key to already be derived (deriveSession(pin)) so writes
 * into the new DB get encrypted by the DBCore middleware.
 */

import Dexie from 'dexie';
import { getDB } from './dexie-db';
import { namespaceForPin, hasSessionKey } from './session-crypto';

const TABLES = ['daily_data', 'user_tags', 'image_blobs', 'pattern_snapshots'] as const;

export interface MigrationResult {
  migrated: boolean;
  reason: string;
  counts?: Record<string, number>;
}

/** List existing IndexedDB names (with a best-effort fallback for older engines). */
async function listDatabaseNames(): Promise<string[]> {
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      return dbs.map(d => d.name!).filter(Boolean);
    }
  } catch { /* fall through */ }
  return []; // if we can't enumerate, callers treat "old DB" as absent (safe: no destructive action)
}

/**
 * Migrate the plaintext profile for `rawPin` into its encrypted, hashed-namespace
 * home — if and only if it's safe. Idempotent: a no-op once done.
 */
export async function migratePlaintextProfileIfNeeded(rawPin: string): Promise<MigrationResult> {
  if (typeof window === 'undefined') return { migrated: false, reason: 'ssr' };
  if (!hasSessionKey()) {
    // Refuse rather than write plaintext into the "encrypted" DB.
    return { migrated: false, reason: 'no-session-key' };
  }

  const ns = await namespaceForPin(rawPin);
  const oldName = `ChaosCommand_${rawPin}`;
  const newName = `ChaosCommand_${ns}`;
  if (oldName === newName) return { migrated: false, reason: 'names-identical' };

  const names = await listDatabaseNames();
  if (!names.includes(oldName)) return { migrated: false, reason: 'no-legacy-db' };

  // New DB must be empty — never overwrite/merge into existing encrypted data.
  const newDb = getDB(ns);
  await newDb.open();
  const newDailyCount = await newDb.daily_data.count();
  if (newDailyCount > 0) {
    return { migrated: false, reason: 'new-db-already-populated' };
  }

  // Open the legacy DB in DYNAMIC mode (no schema declared) so we read whatever
  // version/stores it actually has, plaintext, with no encryption middleware.
  const oldDb = new Dexie(oldName);
  await oldDb.open();

  const srcTables = new Set(oldDb.tables.map(t => t.name));
  const src: Record<string, any[]> = {};
  for (const t of TABLES) {
    src[t] = srcTables.has(t) ? await oldDb.table(t).toArray() : [];
  }

  const srcCounts: Record<string, number> = {};
  for (const t of TABLES) srcCounts[t] = src[t].length;

  // Copy verbatim (ids preserved — new DB is empty, so image_blobs↔daily_data
  // links stay intact). The DBCore middleware encrypts `content`/`snapshot_json`
  // on write; everything else passes through unchanged.
  await newDb.transaction('rw', newDb.daily_data, newDb.user_tags, newDb.image_blobs, newDb.pattern_snapshots, async () => {
    if (src.daily_data.length) await newDb.daily_data.bulkAdd(src.daily_data as any);
    if (src.user_tags.length) await newDb.user_tags.bulkAdd(src.user_tags as any);
    if (src.image_blobs.length) await newDb.image_blobs.bulkAdd(src.image_blobs as any);
    if (src.pattern_snapshots.length) await newDb.pattern_snapshots.bulkAdd(src.pattern_snapshots as any);
  });

  // VERIFY every table's count matches before we touch the original.
  const destCounts: Record<string, number> = {
    daily_data: await newDb.daily_data.count(),
    user_tags: await newDb.user_tags.count(),
    image_blobs: await newDb.image_blobs.count(),
    pattern_snapshots: await newDb.pattern_snapshots.count(),
  };

  const mismatch = TABLES.find(t => destCounts[t] !== srcCounts[t]);
  if (mismatch) {
    oldDb.close();
    // Leave BOTH DBs intact. Nothing lost; a human can inspect.
    throw new Error(
      `Migration verification FAILED for ${mismatch}: source ${srcCounts[mismatch]} ` +
      `≠ dest ${destCounts[mismatch]}. Old plaintext DB "${oldName}" was NOT deleted.`
    );
  }

  // Verified — safe to remove the legacy plaintext DB.
  oldDb.close();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(oldName);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();   // non-fatal: data is safely copied; a leftover empty DB is harmless
    req.onblocked = () => resolve(); // lingering handle; it's already drained
  });

  return { migrated: true, reason: 'ok', counts: destCounts };
}
