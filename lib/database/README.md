# 🗃️ Dexie Database System

## Overview

The Chaos Command Center uses **Dexie.js** (IndexedDB wrapper) for unified, persistent storage. This system replaced the previous complex multi-adapter approach that suffered from data persistence issues.

## 🎯 **Key Benefits**

- ✅ **Real Persistence**: Data survives hard refreshes and browser restarts
- ✅ **Unified Storage**: Text content and images in one system
- ✅ **SQL-like Queries**: Easy syntax with proper indexing
- ✅ **Date-First Organization**: Perfect for daily tracking apps
- ✅ **PWA Ready**: Offline-first with large storage capacity
- ✅ **Analytics Ready**: Easy correlation queries for insights

## 📊 **Database Schema**

### Main Table: `daily_data`
Stores all date-based content with hierarchical organization:

```typescript
interface DailyDataRecord {
  id?: number;
  date: string;           // '2025-06-16' - Primary organizational key
  category: string;       // 'calendar', 'tracker', 'journal', 'user'
  subcategory: string;    // 'monthly', 'pain', 'main', 'demographics'
  content: any;           // JSON content - flexible structure
  images?: string[];      // Array of image blob keys
  tags?: string[];        // User-defined tags for searching
  metadata?: {
    created_at: string;
    updated_at: string;
    user_id?: string;
    version?: number;
  };
}
```

### User Tags: `user_tags`
User-controlled tagging system with privacy controls:

```typescript
interface UserTag {
  id?: number;
  tag_name: string;
  color?: string;
  category_restrictions?: string[];  // Which categories this tag can appear in
  is_hidden?: boolean;              // Hide from main views
  created_at: string;
  updated_at: string;
}
```

### Image Storage: `image_blobs`
Binary data storage for images and documents:

```typescript
interface ImageBlob {
  id?: number;
  blob_key: string;       // Unique key for referencing
  blob_data: Blob;        // Actual image data
  filename?: string;
  mime_type: string;
  size: number;
  created_at: string;
  linked_records?: string[]; // Which daily_data records use this image
}
```

## 🔧 **Usage Examples**

### Basic Data Operations

```typescript
import { useDailyData } from '@/lib/database';

function MyComponent() {
  const { saveData, getSpecificData, getCategoryData } = useDailyData();

  // Save journal entry
  await saveData('2025-06-16', 'journal', 'main', 'Today was great!');

  // Get specific entry
  const entry = await getSpecificData('2025-06-16', 'journal', 'main');

  // Get all journal entries for a date
  const allJournals = await getCategoryData('2025-06-16', 'journal');
}
```

### Analytics Queries

```typescript
// Find all high pain days
const highPainDays = await db.daily_data
  .where(['category', 'subcategory'])
  .equals(['tracker', 'pain'])
  .and(record => record.content.level >= 8)
  .toArray();

// Search journal entries for anxiety mentions
const anxietyEntries = await db.daily_data
  .where('category').equals('journal')
  .and(record => JSON.stringify(record.content).includes('anxiety'))
  .toArray();

// Get date range for seasonal analysis
const winterData = await db.daily_data
  .where('date').between('2024-12-01', '2025-02-28', true, true)
  .toArray();
```

### Tag-Based Search

```typescript
// Search by user tags
const medicalEntries = await db.daily_data
  .where('tags').anyOf(['medical', 'doctor', 'appointment'])
  .toArray();

// Search with date range
const recentMedical = await db.daily_data
  .where('tags').anyOf(['medical'])
  .and(record => record.date >= '2025-06-01')
  .toArray();
```

## 🏗️ **Architecture Patterns**

### Date-First Hierarchy
All data follows this pattern:
```
2025-06-16 → category → subcategory → content
```

Examples:
- `2025-06-16` → `journal` → `main` → "Today was challenging..."
- `2025-06-16` → `tracker` → `pain` → {level: 7, location: "back"}
- `2025-06-16` → `calendar` → `monthly` → "Meeting at 2pm..."

### Category Organization
- **journal**: main, brain-dump, therapy, gratitude-wins, creative
- **tracker**: pain, sleep, mood, symptoms, medications, etc.
- **calendar**: monthly, weekly, daily
- **user**: demographics, providers, appointments, settings
- **planning**: tasks, events, budgets, meal-plans

## 🔄 **Migration from Old System**

The previous system used:
- ❌ sql.js (in-memory, lost on refresh)
- ❌ Complex UniversalStorageService with multiple adapters
- ❌ Separate SQLite + IndexedDB routing

New system provides:
- ✅ Single Dexie database with guaranteed persistence
- ✅ Unified API for all data types
- ✅ Automatic indexing for fast queries
- ✅ Built-in React hooks with live queries

## 🚀 **Getting Started**

### 1. Initialize Database
The database is automatically initialized via `DatabaseProvider` in the app layout.

### 2. Use in Components
```typescript
import { useDailyData } from '@/lib/database';

function MyTracker() {
  const { saveData, getSpecificData, isLoading, error } = useDailyData();
  
  // Your component logic here
}
```

### 3. Handle Loading States
```typescript
import { useDatabase } from '@/lib/database';

function App() {
  const { isInitialized, isLoading, error } = useDatabase();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!isInitialized) return <DatabaseError />;
  
  return <YourApp />;
}
```

## 📁 **File Structure**

```
lib/database/
├── dexie-db.ts              # Core database setup and schemas
├── hooks/
│   ├── use-database.ts      # Database initialization hook
│   └── use-daily-data.ts    # Main data operations hook
├── migration-helper.ts      # Data migration utilities
├── index.ts                 # Exports
└── README.md               # This file

components/database/
└── database-provider.tsx    # App wrapper for database initialization
```

## 🔍 **Debugging**

### View Database Contents
```typescript
// In browser console
import { db } from '@/lib/database';

// See all data
await db.daily_data.toArray();

// See specific date
await db.daily_data.where('date').equals('2025-06-16').toArray();

// See all tags
await db.user_tags.toArray();
```

### Clear Database (for testing)
```typescript
import { clearAllData } from '@/lib/database/migration-helper';
await clearAllData();
```

## 🎯 **Future Enhancements**

- **Sync**: Multi-device synchronization
- **Encryption**: Client-side encryption for sensitive data
- **Compression**: Automatic compression for large text content
- **Backup**: Automated backup/restore functionality
- **Analytics**: Built-in correlation analysis tools
