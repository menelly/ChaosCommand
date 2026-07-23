# 🗂️ DATABASE ARCHITECTURE - DEXIE UNIFIED STORAGE (DECEMBER 2024)

## 🎯 **MAJOR ARCHITECTURE CHANGE - DECEMBER 2024**

**MIGRATED FROM**: Complex SQLite + IndexedDB multi-adapter system with persistence issues
**MIGRATED TO**: Unified Dexie.js (IndexedDB wrapper) with guaranteed persistence

### **Why the Change?**
- ❌ **Old System**: sql.js created in-memory databases that were lost on refresh
- ❌ **Old System**: Complex routing between SQLite/IndexedDB/localStorage
- ❌ **Old System**: Data loss on hard refresh was unacceptable
- ✅ **New System**: Dexie provides real persistence with SQL-like syntax
- ✅ **New System**: One unified database for text + images
- ✅ **New System**: Perfect for PWA offline-first architecture

```
Date: "2025-06-15" -> {
  calendar_data: {
    monthly: "Doctor appointment at 2pm",
    weekly: "Busy week with appointments",
    daily: "Remember to take meds"
  },
  health_data: {
    symptoms: {pain: 7, fatigue: 5, mood: 6},
    medications: [{med: "aspirin", taken: true, time: "8am"}],
    vitals: {bp: "120/80", weight: "150lbs"}
  },
  planning_data: {
    tasks: [{task: "grocery shopping", done: false}],
    appointments: [{doctor: "Dr. Smith", time: "2pm"}],
    events: [{title: "birthday party", time: "7pm"}]
  },
  media_keys: {
    photos: ["photo-key-1", "photo-key-2"],
    documents: ["doc-key-1"],
    audio: ["audio-key-1"]
  }
}
```

## 🏗️ DATABASE ARCHITECTURE

> **⚠️ OUTDATED SCHEMA INFORMATION REMOVED**
> For current, accurate database schema information, see:
> **`/roadmap/CURRENT-DATABASE-SCHEMA.md`** ← THE AUTHORITATIVE SOURCE

**This section previously contained outdated database table definitions that no longer match the actual implementation. The current system uses Dexie (IndexedDB) with a different structure than what was documented here.**

## 🔗 HOW IT ALL CONNECTS

### Example: Doctor Appointment Flow

1. **Provider Table**: Dr. Smith's contact info stored once
2. **Daily Content**: June 15th appointment links to Dr. Smith via `provider_id`
3. **Next Day**: June 16th symptoms can reference the appointment
4. **Photos**: Prescription photos stored in IndexedDB with date key

### Example: Medication Tracking

1. **Medication Table**: Aspirin details stored once
2. **Daily Content**: Each day tracks if aspirin was taken
3. **Symptoms**: Can correlate pain levels with medication compliance
4. **Trends**: Query date range to see medication patterns

## 🚀 STORAGE API USAGE

### Core Functions

```typescript
// Create date record (automatic when first content added)
await ensureDateRecord("2025-06-15")

// Save content
await saveDateContent("2025-06-15", "calendar", "monthly", "Doctor appointment")
await saveDateContent("2025-06-15", "health", "symptoms", {pain: 7, fatigue: 5})

// Get content
const monthlyText = await getDateContent("2025-06-15", "calendar", "monthly")
const symptoms = await getDateContent("2025-06-15", "health", "symptoms")

// Get all content for a date
const allContent = await getAllDateContent("2025-06-15")

// Get date range (for trends, weekly views)
const weekData = await getDateRangeContent("2025-06-15", "2025-06-21", "health", "symptoms")
```

### Calendar-Specific Helpers

```typescript
// Save calendar content by view type
await saveCalendarContent("2025-06-15", "monthly", "text content")
await saveCalendarContent("2025-06-15", "weekly", "different text")
await saveCalendarContent("2025-06-15", "daily", "daily notes")

// Get calendar content by view type
const monthlyContent = await getCalendarContent("2025-06-15", "monthly")
```

## 🎯 KEY BENEFITS

### 1. **Lazy Creation**
- Database starts empty
- Date records created only when user adds content
- Efficient, user-driven growth

### 2. **Rich Connections**
- "Went roller skating Tuesday" → "Legs hurt Wednesday"
- Visual timeline shows cause and effect
- Pattern recognition for health triggers

### 3. **Flexible Content**
- Text, JSON, numbers all supported
- Easy to add new categories/subcategories
- Media files linked by date

### 4. **Query Power**
- "Show me all high-pain days and what happened before"
- "Medication compliance this month"
- "Energy levels after exercise days"

## 🔧 MIGRATION NOTES

### From Old Calendar Storage
- Old: `calendar-2025-06-15` key with single content
- New: `2025-06-15-calendar-monthly` with proper categorization
- Migration script needed to move existing data

### Adding New Categories
1. No database changes needed!
2. Just start using new category/subcategory names
3. Storage system handles it automatically

## 🚨 IMPORTANT REMINDERS

### DO NOT:
- Create separate tables for each tracker type
- Store duplicate reference data (provider info, etc.)
- Mix temporal data with reference data

### DO:
- Use date-centric storage for anything that happens "on a day"
- Link to reference tables via IDs
- Keep media files in IndexedDB with date-based keys
- Think "what date did this happen?" for data organization

## 🎉 FUTURE EXPANSION

This architecture supports:
- **Health Tracking**: Symptoms, medications, appointments
- **Planning**: Tasks, events, goals
- **Media**: Photos, documents, voice notes
- **Analytics**: Trends, patterns, correlations
- **Connections**: Linking related dates and events

**The foundation is built! Now we can add features without architectural changes.**
