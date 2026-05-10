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
 * MIGRATION HELPER
 * 
 * Utilities for migrating data from old storage systems to Dexie.
 * Useful if we need to preserve any existing data.
 */

import { db, DailyDataRecord, CATEGORIES, getCurrentTimestamp } from './dexie-db';

/**
 * Migrate localStorage journal entries to Dexie
 */
export async function migrateLocalStorageJournals(): Promise<void> {
  try {
    const savedEntries = localStorage.getItem('journal-entries');
    if (!savedEntries) {
      console.log('📦 MIGRATION: No localStorage journal entries found');
      return;
    }

    const entries = JSON.parse(savedEntries);
    const migrationRecords: Omit<DailyDataRecord, 'id'>[] = [];

    // Convert old format to new format
    Object.entries(entries).forEach(([date, tabEntries]) => {
      if (typeof tabEntries === 'object' && tabEntries !== null) {
        Object.entries(tabEntries as Record<string, string>).forEach(([tab, content]) => {
          if (content && content.trim()) {
            migrationRecords.push({
              date,
              category: CATEGORIES.JOURNAL,
              subcategory: tab,
              content,
              tags: [],
              metadata: {
                created_at: getCurrentTimestamp(),
                updated_at: getCurrentTimestamp(),
                user_id: 'default-user',
                version: 1
              }
            });
          }
        });
      }
    });

    if (migrationRecords.length > 0) {
      await db.daily_data.bulkAdd(migrationRecords);
      console.log(`📦 MIGRATION: Migrated ${migrationRecords.length} journal entries`);
      
      // Optionally clear localStorage after successful migration
      // localStorage.removeItem('journal-entries');
    }

  } catch (error) {
    console.error('💥 MIGRATION: Failed to migrate localStorage journals:', error);
  }
}

/**
 * Export all data for backup purposes
 */
export async function exportAllData(): Promise<string> {
  try {
    const allData = await db.daily_data.toArray();
    const allTags = await db.user_tags.toArray();
    const allImages = await db.image_blobs.toArray();

    const exportData = {
      version: '1.0',
      exported_at: getCurrentTimestamp(),
      daily_data: allData,
      user_tags: allTags,
      image_blobs: allImages
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('💥 EXPORT: Failed to export data:', error);
    throw error;
  }
}

/**
 * Import data from backup
 */
export async function importData(jsonData: string): Promise<void> {
  try {
    const importData = JSON.parse(jsonData);
    
    if (importData.daily_data) {
      await db.daily_data.bulkAdd(importData.daily_data);
    }
    
    if (importData.user_tags) {
      await db.user_tags.bulkAdd(importData.user_tags);
    }
    
    if (importData.image_blobs) {
      await db.image_blobs.bulkAdd(importData.image_blobs);
    }

    console.log('📦 IMPORT: Data imported successfully');
  } catch (error) {
    console.error('💥 IMPORT: Failed to import data:', error);
    throw error;
  }
}

/**
 * Clear all data (for testing/reset purposes)
 */
export async function clearAllData(): Promise<void> {
  try {
    await db.daily_data.clear();
    await db.user_tags.clear();
    await db.image_blobs.clear();
    console.log('🗑️ CLEAR: All data cleared');
  } catch (error) {
    console.error('💥 CLEAR: Failed to clear data:', error);
    throw error;
  }
}
