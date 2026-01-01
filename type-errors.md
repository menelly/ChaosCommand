# CommandTauri Type Errors - Tech Debt
**Generated:** 2026-01-01
**Total Errors:** 22
**Status:** Pre-existing (not from current session)

## Summary by File
| File | Errors | Category |
|------|--------|----------|
| app/settings/data-management-modal.tsx | 4 | G-Spot integration |
| lib/graph-service.ts | 3 | DailyDataRecord types |
| modules/trackers/body/head-pain/* | 2 | Flask analytics types |
| components/forge/tracker-preview.tsx | 2 | TagInput props |
| app/head-pain/page.tsx | 2 | HeadPainEntry types |
| lib/database/*.ts | 3 | Index signatures |
| app/custom-tracker/[id]/page.tsx | 1 | 'boolean' vs 'checkbox' |
| modules/trackers/body/upper-digestive/* | 2 | Entry types |
| shared/types/parsers/configs/provider.ts | 1 | Missing module |
| app/pain/pain-flask-analytics.tsx | 1 | Missing 'charts' prop |

## Common Patterns

### 1. Missing `charts` property in Flask analytics
Many flask analytics components are missing `charts: {}` in their data objects.
**Files:** pain-flask-analytics, head-pain-flask-analytics, digestive-flask-analytics

### 2. Entry type mismatches
Some trackers have duplicate/conflicting Entry types between files.
**Files:** head-pain, upper-digestive

### 3. DailyDataRecord.data property
graph-service uses `.data` property that doesn't exist on DailyDataRecord.

---

## Raw Errors

```
app/custom-tracker/[id]/page.tsx(165,13): error TS2367: This comparison appears to be unintentional because the types '"number" | "time" | "text" | "date" | "tags" | "scale" | "checkbox" | "dropdown" | "multiselect" | "datetime"' and '"boolean"' have no overlap.

app/head-pain/page.tsx(508,15): error TS2322: Type 'import("E:/Ace/CommandTauri-Working/app/head-pain/head-pain-types").HeadPainEntry[]' is not assignable to type 'HeadPainEntry[]'.
  Type 'HeadPainEntry' is missing the following properties from type 'HeadPainEntry': entry_date, entry_time, pain_type, severity, and 4 more.

app/head-pain/page.tsx(510,15): error TS2322: Type '(days: number) => Promise<import("E:/Ace/CommandTauri-Working/app/head-pain/head-pain-types").HeadPainEntry[]>' is not assignable to type '(days: number) => Promise<HeadPainEntry[]>'.

app/pain/pain-flask-analytics.tsx(239,24): error TS2345: Argument of type '...' is not assignable to parameter of type 'SetStateAction<FlaskAnalyticsData | null>'.
  Property 'charts' is missing in type '...' but required in type 'FlaskAnalyticsData'.

app/settings/data-management-modal.tsx(109,9): error TS2345: Argument of type '"costco_receipt"' is not assignable to parameter of type 'BoringFileType | undefined'.

app/settings/data-management-modal.tsx(115,60): error TS2339: Property 'mimeType' does not exist on type '{ filename: string; content: string; }'.

app/settings/data-management-modal.tsx(148,78): error TS2739: Type 'File' is missing the following properties from type '{ filename: string; content: string; }': filename, content

app/settings/data-management-modal.tsx(155,47): error TS2304: Cannot find name 'importData'.

components/forge/tracker-preview.tsx(170,15): error TS2322: Type '{ tags: any; onTagsChange: (newTags: any) => void; placeholder: string; }' is not assignable to type 'IntrinsicAttributes & TagInputProps'.
  Property 'tags' does not exist on type 'IntrinsicAttributes & TagInputProps'.

components/forge/tracker-preview.tsx(171,30): error TS7006: Parameter 'newTags' implicitly has an 'any' type.

lib/database/advanced-hybrid-router.ts(132,16): error TS2339: Property 'ping' does not exist on type 'MedicalSQLiteDB'.

lib/database/backup_original/hybrid-router.ts(106,24): error TS7053: Element implicitly has an 'any' type...

lib/database/hooks/use-daily-data.ts(393,30): error TS2339: Property 'metadata' does not exist on type 'Omit<DailyDataRecord, "id" | "metadata">'.

lib/database/hybrid-router.ts(106,24): error TS7053: Element implicitly has an 'any' type...

lib/graph-service.ts(85,9): error TS2353: Object literal may only specify known properties, and 'data' does not exist in type 'DailyDataRecord'.

lib/graph-service.ts(190,29): error TS2339: Property 'data' does not exist on type 'DailyDataRecord'.

lib/graph-service.ts(238,29): error TS2339: Property 'data' does not exist on type 'DailyDataRecord'.

modules/trackers/body/head-pain/head-pain-flask-analytics.tsx(225,63): error TS2349: This expression is not callable.
  Type 'Number' has no call signatures.

modules/trackers/body/head-pain/head-pain-flask-analytics.tsx(296,24): error TS2345: Property 'charts' is missing...

modules/trackers/body/upper-digestive/digestive-flask-analytics.tsx(279,24): error TS2345: Property 'charts' is missing...

modules/trackers/body/upper-digestive/page.tsx(645,15): error TS2322: Type 'UpperDigestiveEntry[]' is not assignable to type 'DigestiveEntry[]'.

shared/types/parsers/configs/provider.ts(28,45): error TS2307: Cannot find module '../types' or its corresponding type declarations.
```
