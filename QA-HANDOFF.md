# CommandTauri QA Handoff - 2026-01-01

## What We're Doing
Page-by-page QA of the CommandTauri medical tracking app. Ren is testing each tracker and reporting issues.

## Completed Trackers (Tested & Fixed)

### 1. Food Allergens (`app/food-allergens/`)
- Created `food-allergens-analytics.tsx` with full local analytics
- Added `loadAllEntries` function with timezone fix
- Added Back to Body button
- Wired analytics into tracker

### 2. Reproductive Health (`app/reproductive-health/`)
- Fixed calendar modifiers timezone (add `T12:00:00` to date strings)
- Fixed OPK count to include negatives
- Added `currentLmpDate` computed value
- Fixed ~10+ timezone bugs in `ovulation-predictor.ts`
- Added Back to Body button

### 3. Weather & Environment (`app/weather-environment/`)
- Built full `weather-analytics-desktop.tsx` with weather + allergen analytics
- Added `loadAllWeatherEntries` and `loadAllAllergenEntries` functions
- Fixed header centering
- Added Back to Body button
- Removed deprecated DailyDashboardToggle

### 4. Upper Digestive (`app/upper-digestive/`)
- QA'd and fixed

### 5. Bathroom (`app/bathroom/`)
- QA'd and fixed

### 6. Pain (`app/pain/`)
- QA'd and fixed

### 7. Head Pain (`app/head-pain/`)
- QA'd and fixed

### 8. Dysautonomia (`app/dysautonomia/`)
- QA'd and fixed

### 9. Diabetes (`app/diabetes/`)
- QA'd and fixed

## Standard Fix Patterns

### Timezone Bug Fix
When creating Date objects from date-only strings (YYYY-MM-DD), add `T12:00:00`:
```tsx
// BAD - interprets as UTC midnight, shows wrong day in EST
new Date('2026-01-01')

// GOOD - interprets as noon local time
new Date('2026-01-01' + 'T12:00:00')
```

### Back to Body Button
```tsx
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const router = useRouter()

// At bottom of component:
<div className="flex justify-center pt-4">
  <Button variant="outline" onClick={() => router.push('/body')}>
    <ArrowLeft className="h-4 w-4 mr-2" />
    Back to Body
  </Button>
</div>
```

### loadAllEntries Pattern
```tsx
const loadAllEntries = async (days: number): Promise<EntryType[]> => {
  const allEntries: EntryType[] = []
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = formatDateForStorage(date)

    try {
      const data = await getSpecificData(dateStr, CATEGORIES.TRACKER, 'tracker-key')
      if (data?.content) {
        let entries = data.content
        if (typeof entries === 'string') {
          try { entries = JSON.parse(entries) } catch (e) { entries = [] }
        }
        if (!Array.isArray(entries)) entries = [entries]
        allEntries.push(...entries)
      }
    } catch (error) {
      console.error(`Error loading for ${dateStr}:`, error)
    }
  }
  return allEntries
}
```

### Remove DailyDashboardToggle
This feature was deprecated. Remove import and usage from any tracker that has it.

## Trackers Still Needing QA
(Ren is testing page by page - wait for their feedback)

- anxiety-tracker
- brain-fog
- coping-regulation
- crisis-support
- custom-tracker
- energy
- hydration
- medications
- mental-health
- movement
- other-symptoms
- seizure
- self-care-tracker
- sensory-tracker
- sleep

(Upper digestive, bathroom, pain, head pain, dysautonomia, diabetes already done!)

## Key Things to Check Per Tracker
1. Header centered?
2. Analytics working (not Flask stub)?
3. Back to Body button present?
4. Calendar showing correct dates (timezone fix)?
5. DailyDashboardToggle removed?
6. Decimal formatting (use .toFixed(1) then parseFloat())?

## Notes
- Ren has a hysterectomy so reproductive health testing was "making it up" lol
- We removed the daily dashboard feature entirely
- Analytics should be LOCAL Dexie calculations, not Flask API calls
