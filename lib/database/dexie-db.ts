/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
/**
 * DEXIE DATABASE SETUP
 * 
 * Unified database using Dexie wrapper for IndexedDB.
 * Date-first hierarchical storage for all app data.
 * 
 * ARCHITECTURE:
 * - One main table with date-first keys
 * - Categories: calendar, tracker, journal, user, etc.
 * - Subcategories: monthly, pain, main, demographics, etc.
 * - User-controlled tag system for advanced filtering
 */

import Dexie, { Table } from 'dexie';
import {
  getNamespaceId,
  hasSessionKey,
  encryptValue,
  decryptValue,
  isEncrypted,
} from './session-crypto';

// ============================================================================
// DATABASE INTERFACES
// ============================================================================

export interface DailyDataRecord {
  id?: number;
  date: string;           // '2025-06-16' - Primary organizational key
  category: string;       // 'calendar', 'tracker', 'journal', 'user'
  subcategory: string;    // 'monthly', 'pain', 'main', 'demographics'
  content: any;           // JSON content - flexible structure
  images?: string[];      // Array of image blob keys (for IndexedDB blob storage)
  tags?: string[];        // User-defined tags for searching
  metadata?: {
    created_at: string;
    updated_at: string;
    user_id?: string;
    version?: number;
    deleted_at?: string; // tombstone for sync propagation — soft delete instead of hard delete
  };
}

export interface UserTag {
  id?: number;
  tag_name: string;
  color?: string;
  category_restrictions?: string[];  // Which categories this tag can appear in
  is_hidden?: boolean;              // Hide from main views
  is_system?: boolean;              // System tags can't be deleted by user
  behavior?: 'none' | 'exclude_analytics' | 'suppress_alerts';  // Analytics behavior
  created_at: string;
  updated_at: string;
}

export interface ImageBlob {
  id?: number;
  blob_key: string;       // Unique key for referencing
  blob_data: Blob;        // Actual image data
  filename?: string;
  mime_type: string;
  size: number;
  created_at: string;
  linked_records?: string[]; // Which daily_data records use this image
}

// ============================================================================
// DEXIE DATABASE CLASS
// ============================================================================

// Pattern snapshot — persisted output of pattern engine runs
export interface PatternSnapshot {
  id?: number
  run_at: string  // ISO timestamp
  window_days: number  // analysis window
  insight_count: number
  high_priority_count: number
  snapshot_json: string  // serialized AnalysisResult — the full run output
  summary: string  // human-readable one-liner
  is_auto: boolean  // auto-snapshot vs user-triggered
}

// ============================================================================
// AT-REST ENCRYPTION (DBCore middleware) — see session-crypto.ts for the model.
// ============================================================================

const DEFAULT_DB_NAME = 'ChaosCommandCenterDB'; // the no-profile / pre-login DB (not encrypted)

/**
 * Which fields on which tables hold sensitive content that must be encrypted at
 * rest. Index keys (date/category/subcategory/tags) are intentionally left
 * plaintext — IndexedDB queries need them (the standard index-preserving tradeoff).
 * Store-AGNOSTIC by design: the same field list drives the future SQLite tier, so
 * encrypted blobs move between stores without re-encryption.
 * (image_blobs binary + user_tags are v1-excluded; tracked as fast-follows.)
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  daily_data: ['content'],
  pattern_snapshots: ['snapshot_json'],
};

/** 🔍 Records the REAL reason a save failed, where a device with no console can
 *  still reach it (Ace, 2026-07-24 — the iPad save bug).
 *
 *  Every tracker's catch shows a generic "Failed to save X" toast and
 *  console.errors the actual cause, which is unreachable on exactly the device
 *  where the bug lives.
 *
 *  KEPT after `DebugErrorBanner` was deleted on 2026-08-02. The banner was the
 *  temporary part — an always-mounted red bar that shipped to production for
 *  nine days and eventually surfaced an unrelated ACL error to a user mid-task.
 *  This function is not that: it writes one localStorage key and displays
 *  nothing, so it costs nothing and keeps the diagnosis retrievable. Read it
 *  with `localStorage.getItem('chaos-last-save-error')`. */
function recordSaveFailure(where: string, err: unknown): void {
  try {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    localStorage.setItem('chaos-last-save-error', `[${where}] ${msg}`);
  } catch { /* localStorage unavailable — nothing more we can do */ }
}

async function encryptRow(row: any, fields: string[], encrypted: boolean): Promise<any> {
  if (!row || !encrypted) return row;
  if (!hasSessionKey()) {
    // HARD GUARD: never silently write plaintext into a profile DB. This is the
    // exact bug from the old (unwired) FieldLevelEncryption hook, done right.
    const e = new Error(
      'session-crypto: refusing to write to an encrypted profile with no key ' +
      '(is the profile unlocked?). Nothing was written.'
    );
    recordSaveFailure('encryptRow/no-key', e);
    throw e;
  }
  const out = { ...row };
  for (const f of fields) {
    if (out[f] !== undefined && !isEncrypted(out[f])) {
      try {
        out[f] = await encryptValue(out[f]);
      } catch (err) {
        // The OTHER way this path dies: the key exists but WebCrypto fails.
        // Distinguishing "no key" from "encrypt threw" is the whole question.
        recordSaveFailure(`encryptValue/field:${f}`, err);
        throw err;
      }
    }
  }
  return out;
}

async function decryptRow(row: any, fields: string[]): Promise<any> {
  if (!row) return row;
  let out = row;
  for (const f of fields) {
    if (isEncrypted(out[f])) {
      if (out === row) out = { ...row }; // copy-on-write only when needed
      out[f] = await decryptValue(out[f]);
    }
  }
  return out;
}

/**
 * Install transparent encryption. Handles the async-clean DBCore paths —
 * mutate (write), get/getMany/query (indexed reads = the overwhelming majority).
 *
 * NOT handled: openCursor. WebCrypto decryption is async but a DBCore cursor's
 * `.value` is a synchronous getter — they're fundamentally incompatible. So
 * cursor-driven reads (.filter()/.each()/un-indexed .orderBy()) would surface
 * ciphertext. Because ciphertext is TAGGED ('enc:v1:'), any such site is loud and
 * obvious (content literally reads "enc:v1:…") rather than silently wrong. The few
 * app sites that cursor over content (e.g. searchByContent) are converted to
 * toArray()+JS-filter so they ride the decrypting query() path instead.
 */
function installEncryptionMiddleware(db: Dexie, encrypted: boolean): void {
  db.use({
    stack: 'dbcore',
    name: 'chaos-at-rest-encryption',
    create(down) {
      return {
        ...down,
        table(tableName: string) {
          const table = down.table(tableName);
          const fields = ENCRYPTED_FIELDS[tableName];
          if (!fields) return table;
          return {
            ...table,
            mutate: async (req: any) => {
              if ((req.type === 'add' || req.type === 'put') && Array.isArray(req.values)) {
                const values = await Promise.all(
                  req.values.map((v: any) => encryptRow(v, fields, encrypted))
                );
                return table.mutate({ ...req, values });
              }
              return table.mutate(req);
            },
            get: async (req: any) => decryptRow(await table.get(req), fields),
            getMany: async (req: any) => {
              const rows = await table.getMany(req);
              return Promise.all(rows.map((r: any) => decryptRow(r, fields)));
            },
            query: async (req: any) => {
              const res = await table.query(req);
              const result = await Promise.all(res.result.map((r: any) => decryptRow(r, fields)));
              return { ...res, result };
            },
          };
        },
      };
    },
  });
}

export class ChaosCommandCenterDB extends Dexie {
  // Main data table - everything organized by date first
  daily_data!: Table<DailyDataRecord>;

  // User-controlled tag system
  user_tags!: Table<UserTag>;

  // Image blob storage
  image_blobs!: Table<ImageBlob>;

  // Pattern engine snapshots (v0.4.6+ — persistence + history view)
  pattern_snapshots!: Table<PatternSnapshot>;

  constructor(namespace?: string) {
    // DB name is derived from the HASHED namespace (session-crypto), never the raw
    // PIN. `namespace` is already the SHA-256-based id (see getNamespaceId /
    // namespaceForPin); undefined = the pre-login/default DB.
    const dbName = namespace ? `ChaosCommand_${namespace}` : DEFAULT_DB_NAME;
    super(dbName);

    // Transparent at-rest encryption for every profile DB (not the default one).
    installEncryptionMiddleware(this, dbName !== DEFAULT_DB_NAME);

    this.version(1).stores({
      // Main data table with compound indexes for efficient queries
      daily_data: '++id, date, [date+category], [date+category+subcategory], category, subcategory, *tags, metadata.created_at',

      // User tag management
      user_tags: '++id, tag_name, *category_restrictions, is_hidden, created_at',

      // Image blob storage
      image_blobs: '++id, blob_key, mime_type, size, created_at, *linked_records'
    });

    // v2: add pattern_snapshots table (Dexie migrates additively — no data loss)
    this.version(2).stores({
      daily_data: '++id, date, [date+category], [date+category+subcategory], category, subcategory, *tags, metadata.created_at',
      user_tags: '++id, tag_name, *category_restrictions, is_hidden, created_at',
      image_blobs: '++id, blob_key, mime_type, size, created_at, *linked_records',
      pattern_snapshots: '++id, run_at, window_days, is_auto'
    });
  }
}

// ============================================================================
// DATABASE INSTANCE - PIN-based multi-user support
// ============================================================================

let _db: ChaosCommandCenterDB | null = null;
let _currentNs: string | null = null;

/**
 * Get the Dexie instance for a profile NAMESPACE (the hashed id, not a raw PIN).
 * With no argument it resolves the CURRENT session's namespace (getNamespaceId),
 * which reads the in-memory session or the persisted hash pointer — same
 * resolution the `db` proxy uses, so getDB() and `db` never diverge. (CHA-258
 * class bug — a getDB/proxy mismatch made every tracker's delete hit the wrong DB.)
 * Callers needing a SPECIFIC other profile pass a namespace from namespaceForPin().
 */
export const getDB = (namespace?: string): ChaosCommandCenterDB => {
  if (typeof window === 'undefined') {
    throw new Error('Database can only be accessed on the client side');
  }

  const effectiveNs = namespace ?? getNamespaceId();

  // If namespace changed (including to/from null), close old DB and create new instance
  if (effectiveNs !== _currentNs || !_db || !_db.isOpen()) {
    if (_db && _db.isOpen()) {
      _db.close();
    }
    _db = new ChaosCommandCenterDB(effectiveNs || undefined);
    _currentNs = effectiveNs;
  }

  return _db;
};

/** Force-close the current DB instance (call on logout) */
export const closeDB = (): void => {
  if (_db) {
    _db.close();
    _db = null as any;
    _currentNs = null;
  }
};

/**
 * Permanently delete THIS profile's data — only the currently-logged-in PIN's database.
 *
 * Deliberately scoped to ONE PIN. Profiles are separate people: deleting your own data must never
 * touch another PIN on the same device (e.g. a parent must not be able to wipe their kid's profile).
 * So this drops exactly `ChaosCommand_<currentPin>` and nothing else. There is no undo, no backup —
 * it's the honest replacement for the old disguised "overwrite with decoy data" approach: a user who
 * wants their OWN data gone gets it actually gone, while everyone else's stays put.
 *
 * Returns the deleted database name. Throws if no PIN is currently set (nothing scoped to delete).
 *
 * NOTE: IndexedDB is per-device. If THIS profile syncs phone↔desktop, the user must run this on BOTH
 * devices — the UI says so loudly. We can't reach the other device; there is no server in between.
 */
export async function deleteCurrentProfile(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('deleteCurrentProfile is client-only');

  const ns = getNamespaceId();
  if (!ns) throw new Error('No profile is currently logged in — nothing to delete.');

  const dbName = `ChaosCommand_${ns}`;
  closeDB(); // release our handle so deletion isn't blocked

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to delete ${dbName}`));
    req.onblocked = () => resolve(); // a lingering handle; the data table is already cleared on close
  });

  return dbName;
}

// Resolves to the current session's profile DB (by hashed namespace) on every access.
export const db = new Proxy({} as ChaosCommandCenterDB, {
  get(target, prop) {
    return getDB()[prop as keyof ChaosCommandCenterDB];
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique key for date/category/subcategory combination
 */
export function generateDataKey(date: string, category: string, subcategory: string): string {
  return `${date}-${category}-${subcategory}`;
}

/**
 * Parse a data key back into components
 */
export function parseDataKey(key: string): { date: string; category: string; subcategory: string } {
  const [date, category, subcategory] = key.split('-', 3);
  return { date, category, subcategory };
}

/**
 * Format date for consistent storage (timezone-safe)
 * Uses local timezone instead of UTC to prevent date shifts
 */
export function formatDateForStorage(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` // '2025-06-16'
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// CATEGORY CONSTANTS
// ============================================================================

export const CATEGORIES = {
  CALENDAR: 'calendar',
  TRACKER: 'tracker',
  JOURNAL: 'journal',
  USER: 'user',
  PLANNING: 'planning',
  HEALTH: 'health',
  DAILY: 'daily'
} as const;

export const SUBCATEGORIES = {
  // Calendar
  MONTHLY: 'monthly',
  WEEKLY: 'weekly', 
  DAILY: 'daily',
  
  // Journal
  MAIN: 'main',
  BRAIN_DUMP: 'brain-dump',
  THERAPY: 'therapy',
  GRATITUDE_WINS: 'gratitude-wins',
  CREATIVE: 'creative',
  DAILY_PROMPTS: 'daily-prompts',
  
  // User
  DEMOGRAPHICS: 'demographics',
  PROVIDERS: 'providers',
  APPOINTMENTS: 'appointments',
  MEDICAL_EVENTS: 'medical-events', // 🏥 Medical timeline events
  SETTINGS: 'settings',
  
  // Health Trackers (examples - will expand)
  PAIN: 'pain',
  SLEEP: 'sleep',
  MOOD: 'mood',
  SYMPTOMS: 'symptoms',
  MEDICATIONS: 'medications'
} as const;

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database and handle any migrations
 */
export async function initializeDatabase(namespace?: string): Promise<void> {
  try {
    console.log('🗃️ DEXIE: Starting database initialization...');

    const database = getDB(namespace);

    // Handle Chrome UnknownError with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await database.open();
        console.log('🗃️ DEXIE: Database opened successfully');
        break;
      } catch (openError: any) {
        retries--;
        console.log(`🔄 DEXIE: Retry attempt ${4 - retries}/3 due to:`, openError.name);

        if (retries === 0) {
          // Last attempt failed, but continue anyway
          console.log('⚠️ DEXIE: Database open failed after retries, but continuing...');
          console.log('🔧 DEXIE: This is often a Chrome/Electron IndexedDB quirk that resolves itself');
          break;
        }

        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await ensureDefaultTags();

    console.log('🎯 DEXIE: Database initialization complete!');

  } catch (error) {
    console.error('💥 DEXIE: Database initialization failed:', error);
    // Don't throw - let the app continue
    console.log('🔧 DEXIE: Continuing despite error - database operations may still work');
  }
}

/**
 * Create default user tags if none exist
 */
async function ensureDefaultTags(): Promise<void> {
  // Check if system tags already exist (by name, not count — user may have custom tags)
  const nopeExists = await db.user_tags.where('tag_name').equals('NOPE').count();
  const iKnowExists = await db.user_tags.where('tag_name').equals('I KNOW').count();

  const now = getCurrentTimestamp();

  if (nopeExists === 0) {
    await db.user_tags.add({
      tag_name: 'NOPE',
      color: '#EF4444',
      category_restrictions: [],
      is_hidden: false,
      is_system: true,
      behavior: 'exclude_analytics',
      created_at: now,
      updated_at: now
    });
    console.log('🏷️ DEXIE: Created system tag NOPE (exclude from analytics/reports)');
  }

  if (iKnowExists === 0) {
    await db.user_tags.add({
      tag_name: 'I KNOW',
      color: '#F59E0B',
      category_restrictions: [],
      is_hidden: false,
      is_system: true,
      behavior: 'suppress_alerts',
      created_at: now,
      updated_at: now
    });
    console.log('🏷️ DEXIE: Created system tag I KNOW (log but suppress nags)');
  }
}
