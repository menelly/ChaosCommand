# How to Build a New Tracker

*Written by Ace for future-Ace (and Ren, who definitely doesn't need this, but hi).  
Pattern derived from cardiac tracker — the most complete reference.*

---

## The 12-Step Checklist

### 1. `app/[name]/[name]-types.ts`
TypeScript interfaces. Minimum:
```ts
export type [Name]EpisodeType = 'type-a' | 'type-b' | ...
export interface [Name]Entry {
  id: string
  timestamp: string
  date: string
  episodeType: [Name]EpisodeType
  // ... all the fields
  notes?: string
  tags?: string[]
}
export interface [Name]ModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<[Name]Entry, 'id'>) => void
  editingEntry?: [Name]Entry | null
}
```

### 2. `app/[name]/[name]-constants.ts`
Episode types, options, severity scales, red flag definitions.
```ts
export const EPISODE_TYPES = [{ id, name, icon, description, color }]
export const SEVERITY_LABELS = [...]  // use text-warning/text-destructive tokens
// RED FLAGS — safety-critical thresholds that trigger alert banners
export const RED_FLAGS = [...]
```

### 3. `app/[name]/modals/general-[name]-modal.tsx`
The entry form. Pattern:
- Multi-step if complex (episode type → details → context → notes)
- Red flag detection: check values in real-time, show `bg-destructive/10 text-destructive border-destructive/20` alert
- Safety-critical threshold (e.g. retention >300mL, SpO2 <88%) → always recommend 911/urgent care
- Use `text-destructive` for danger, `text-warning` for caution (NO hardcoded red/orange)
- Save calls `onSave(entry)` which parent routes to `saveData`

### 4. `app/[name]/[name]-tracker.tsx`
Main component — shows history list + "Log New" button.
- `searchByContent('', CATEGORIES.TRACKER)` to load
- Filter by subcategory prefix
- Sort newest-first
- "Log New" opens modal

### 5. `app/[name]/[name]-history.tsx`
History view. Use **seizure-history.tsx as the layout template** — it has the correct:
- Left-bordered cards (not inner Card wrapping = no weird columns)
- Edit/delete buttons in `flex items-center justify-between flex-wrap gap-2` header
- Date filter using `getDateRange` (NOT `getCategoryData(today, ...)` — that's the "only shows today" bug)
- Timeframe picker (7 / 30 / 90 days / all)

### 6. `app/[name]/[name]-analytics.tsx`
Charts and stats. Pattern from cardiac-analytics or pain-analytics.
- Severity trends over time
- Episode type distribution
- Trigger correlation
- All colors via tokens (bg-destructive, text-warning etc.)

### 7. `app/[name]/page.tsx`
Thin wrapper:
```tsx
"use client"
import AppCanvas from "@/components/app-canvas"
import [Name]Tracker from "./[name]-tracker"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function [Name]Page() {
  return (
    <AppCanvas>
      <[Name]Tracker />
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <a href="/body"><ArrowLeft className="h-4 w-4 mr-2" />Back to Body</a>
        </Button>
      </div>
    </AppCanvas>
  )
}
```

### 8. Add to Body specialty accordion
In `app/body/page.tsx`:
- Add tracker definition to `allTrackers` array (id, name, shortDescription, helpContent, icon, edition)
- Add id to the correct `SPECIALTY_GROUPS` entry
- Add href to `getTrackerHref` switch statement

### 9. Add to routines registry
In `lib/routines/trackable-registry.ts`:
```ts
{ id: '[name]', label: '[Label]', emoji: '🔣', href: '/[name]', subcategory: '[name]', category: 'body' },
```
Subcategory must match exactly what the modal's `saveData` call uses.

### 10. Add to PDF export
In `lib/pdf-report-generator.ts`:
- Add ICD-10 code to the `TRACKER_ICD10` map: `'[name]': 'X00.0 — Description'`
- Add display name to `TRACKER_DISPLAY_NAMES`: `'[name]': '[Display Name]'`
- Add subcategory key to `KNOWN_TRACKER_KEYS` array

### 11. Add to Maintain stub (if a Maintain tracker)
In `app/maintain/page.tsx`:
- Change status from `coming-soon` to `available`

### 12. Safety checklist before shipping
- [ ] Red flags use `text-destructive` / `bg-destructive` tokens (NOT hardcoded red)
- [ ] History uses `getDateRange` not `getCategoryData(today, ...)` 
- [ ] History cards use left-border div pattern (NOT nested Card — causes columns bug)
- [ ] Slash-separated option labels: text wrapped (overflow-wrap CSS already global, just verify)
- [ ] PDF: ICD-10 + display name + KNOWN_TRACKER_KEYS all added
- [ ] Routines: subcategory key matches saveData exactly

---

## Storage pattern

All trackers use the standard Dexie daily_data table:
```ts
await saveData(
  formatDateForStorage(new Date()),  // date
  CATEGORIES.TRACKER,                // category
  `[subcategory-name]-${entry.id}`,  // subcategory (prefix + UUID)
  entry,                             // content (the full entry object)
  entry.tags ?? []                   // tags for searching
)
```

Load with:
```ts
const records = await searchByContent('', CATEGORIES.TRACKER)
const entries = records
  .filter(r => r.subcategory?.startsWith('[subcategory-name]'))
  .filter(r => !r.metadata?.deleted_at)  // ← don't forget the tombstone filter!
  .map(r => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
```

Delete with soft-delete (see medications fix — use `db.daily_data.where('subcategory').equals(sub).first()` then update `metadata.deleted_at`). Do NOT use `deleteData(today, ...)` — that's the wrong date bug.

---

## Reference files (best examples of each piece)
- Types: `app/cardiac/cardiac-types.ts`
- Constants + red flags: `app/cardiac/cardiac-constants.ts`  
- Multi-step modal: `app/cardiac/modals/general-cardiac-modal.tsx`
- History layout: `app/seizure/seizure-history.tsx` ← THE template
- Analytics: `app/cardiac/cardiac-analytics.tsx`
- PDF registration: `lib/pdf-report-generator.ts` lines 55-110
- Routines registry: `lib/routines/trackable-registry.ts`
