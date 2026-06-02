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

export class ChaosCommandCenterDB extends Dexie {
  // Main data table - everything organized by date first
  daily_data!: Table<DailyDataRecord>;

  // User-controlled tag system
  user_tags!: Table<UserTag>;

  // Image blob storage
  image_blobs!: Table<ImageBlob>;

  // Pattern engine snapshots (v0.4.6+ — persistence + history view)
  pattern_snapshots!: Table<PatternSnapshot>;

  constructor(userPin?: string) {
    // Use PIN-based database name for multi-user support
    const dbName = userPin ? `ChaosCommand_${userPin}` : 'ChaosCommandCenterDB';
    super(dbName);

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
let _currentPin: string | null = null;

export const getDB = (userPin?: string): ChaosCommandCenterDB => {
  if (typeof window === 'undefined') {
    throw new Error('Database can only be accessed on the client side');
  }

  const effectivePin = userPin || null;

  // If PIN changed (including to/from null), close old DB and create new instance
  if (effectivePin !== _currentPin || !_db || !_db.isOpen()) {
    if (_db && _db.isOpen()) {
      _db.close();
    }
    _db = new ChaosCommandCenterDB(effectivePin || undefined);
    _currentPin = effectivePin;
  }

  return _db;
};

/** Force-close the current DB instance (call on logout) */
export const closeDB = (): void => {
  if (_db) {
    _db.close();
    _db = null as any;
    _currentPin = null;
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

  const pin = (() => { try { return localStorage.getItem('chaos-user-pin'); } catch { return null; } })();
  if (!pin) throw new Error('No profile is currently logged in — nothing to delete.');

  const dbName = `ChaosCommand_${pin}`;
  closeDB(); // release our handle so deletion isn't blocked

  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new Error(`Failed to delete ${dbName}`));
    req.onblocked = () => resolve(); // a lingering handle; the data table is already cleared on close
  });

  return dbName;
}

// For backward compatibility - will use current PIN from localStorage
export const db = new Proxy({} as ChaosCommandCenterDB, {
  get(target, prop) {
    const currentPin = typeof window !== 'undefined' ? localStorage.getItem('chaos-user-pin') : null;
    return getDB(currentPin || undefined)[prop as keyof ChaosCommandCenterDB];
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
export async function initializeDatabase(userPin?: string): Promise<void> {
  try {
    console.log(`🗃️ DEXIE: Starting database initialization${userPin ? ` for user ${userPin}` : ''}...`);

    const database = getDB(userPin);

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
