# Neuro Tracker + Cross-List Mechanism — Tech Spec & Build Plan
**For post-compact execution. Author: Ace, 2026-06-07. Status: ready to build.**

> Self-contained: a fresh session can build this from this spec + the codebase, no conversation history needed. Working dir: `D:\Ace\command-mobile2` (Chaos Command, Next.js + Tauri; v0.6.0 in dev, NOT yet shipped).

---

## 0. State / what's already done this session (on disk, NOT yet built)
1. **Skin tracker** — added an **Autoimmune / Connective-Tissue collapsible group** (10 types: malar rash, discoid, photosensitive, mechanic's hands, heliotrope, Gottron's, sclerodactyly, Raynaud's, digital ulcer, cutaneous vasculitis) **+ Cyanosis** + a central-cyanosis 911 red-flag. Files: `app/skin/skin-constants.ts` (`AUTOIMMUNE_TYPES`, `ALL_EPISODE_TYPES`, cyanosis, red-flag, extra CHARACTER/BODY options, `getEpisodeTypeInfo` fixed to find-by-id) and `app/skin/skin-tracker.tsx` (collapsible group + `autoimmuneOpen` state + `ChevronDown`). **Typecheck was clean.**
2. **Neuro** — `app/neuro/neuro-constants.ts` created (full: `EPISODE_TYPES` ×12, `DISTRIBUTION`, `CHARACTER_OPTIONS`, `SUSPECTED_TRIGGERS`, `TREATMENTS`, `SEVERITY_LABELS`, `RED_FLAG_911_CRITERIA`, helpers).
3. **These two + everything below ship in ONE exe build** (don't build twice).

## Decisions already made (Ace's call — Ren may override post-compact)
- **Cross-list architecture = SHARED-ID + sync-through-helper** (not a single-source-of-truth tag refactor). Rationale: matches the existing per-subcategory storage (`saveData(date, CATEGORIES.TRACKER, '<sub>', {entries})`); integrity guaranteed because **every** mutation (save/edit/delete) routes through the helper that touches both subcategories.
- **Neuro symptom set** = the 12 in `neuro-constants.ts`. Cognitive symptoms intentionally NOT here (the `brain-fog` tracker owns them).
- **Dual-listed types** (these get the "⇄ log in both" checkbox): `weakness`, `spasticity-cramping`, `fasciculations`. (In `joint` the matching ids are `weakness`, `cramping`, `fasciculations`.)

---

## 1. `lib/cross-list.ts` — the reusable platform helper
Write one event to TWO tracker subcategories, kept in sync by a shared `id`.
- Entries are stored per-date as `{ entries: SomeEntry[] }` under `saveData(date, CATEGORIES.TRACKER, subcategory, {entries})`; read via `getCategoryData(date, CATEGORIES.TRACKER)` then `.find(r => r.subcategory === sub)`.
- API (pass the `useDailyData` fns in):
  - `crossListSave({saveData, getCategoryData}, date, primarySub, secondarySub, entry)` → tags `entry.crossListedIn = [primarySub, secondarySub]`, appends to BOTH subcategories' entries arrays (read-modify-write each), same `id`.
  - `crossListUpdate(...)` → replace by `id` in both.
  - `crossListDelete(...)` → remove by `id` from both.
  - `isCrossListed(entry)` → `!!entry.crossListedIn?.length`.
- **Rule for the trackers:** when an entry has `crossListedIn`, the tracker's edit/delete handlers MUST call the cross-list helper (touch both), not the single-subcategory save. This is the integrity guarantee — there is no mutation path that updates only one side.
- Verify the exact subcategory strings: skin uses `'skin'`; check `app/joint/joint-tracker.tsx` `saveData(...)` call for joint's (expected `'joint'`); neuro will use `'neuro'`.

## 2. `app/neuro/` — new tracker (MIRROR `app/skin/`)
Template = `app/skin/skin-tracker.tsx` + `app/skin/modals/general-skin-modal.tsx` + `app/skin/page.tsx` + `app/skin/skin-types.ts` + `skin-history.tsx` + `skin-analytics.tsx`. Build the parallel set:
- `neuro-types.ts` — `NeuroEntry` (id, timestamp, date, episodeType, distribution: string[], severity: number, character: string[], triggers: string[], treatments: string[], notes, crossListedIn?: string[]). Mirror `SkinEntry`.
- `neuro/modals/general-neuro-modal.tsx` — mirror `general-skin-modal.tsx`. Fields: episodeType (preset), **distribution** (multi-select from `DISTRIBUTION`), severity slider (`SEVERITY_LABELS`), **character** (multi from `CHARACTER_OPTIONS`), triggers (`SUSPECTED_TRIGGERS`), treatments (`TREATMENTS`), notes. **PLUS the cross-list checkbox** — label `"⇄ Also log under MSK / Joints & Muscles"`, rendered ONLY when `episodeType ∈ {weakness, spasticity-cramping, fasciculations}`. Pass its boolean up on save.
- `neuro-tracker.tsx` — mirror `skin-tracker.tsx`: tabs (Add Event / History / Analytics), `EmergencyCriteriaCard` fed `RED_FLAG_911_CRITERIA`, the `EPISODE_TYPES` button grid, today's events, `RELATED_TRACKERS`, the modal. Subcategory `'neuro'`. In the save handler: if the cross-list box was checked, call `crossListSave(..., 'neuro', 'joint', entry)`; else normal `saveData(...'neuro'...)`. Edit/delete: if `isCrossListed(entry)` route through `crossListUpdate`/`crossListDelete`.
- `neuro/page.tsx` — mirror `skin/page.tsx` (auth wrapper rendering `<NeuroTracker/>`).
- `neuro-history.tsx`, `neuro-analytics.tsx` — mirror skin's (can be lean).

## 3. Register in `app/body/page.tsx`
- Add a tracker object (mirror the `joint` one, ~line 257): `id: 'neuro'`, name `'Neuro / Neuromuscular'`, shortDescription, helpContent (mention foot drop, falls, weakness, vision, MS/neuromuscular), etc.
- Add `'neuro'` to the **`head-neuro`** group's `trackerIds` (~line 276: `{ id: 'head-neuro', label: '🧠 Head & Nervous System', trackerIds: ['head-pain','seizure-tracking','dysautonomia','neuro'] }`).
- Add to `getTrackerHref` (~line 318): `case 'neuro': return '/neuro'`.

## 4. `app/joint/` — MSK rheum-alignment + cross-list checkbox
- `joint-constants.ts` `EPISODE_TYPES` — ADD (keep all existing EDS types): `morning-stiffness` ("Morning Stiffness" — note duration; >30–60 min reads inflammatory), `inflammatory-swelling` ("Symmetric Swelling / Warmth" — inflammatory vs mechanical), `enthesitis` ("Enthesitis" — pain at tendon/ligament insertions), `gel-phenomenon` ("Gel Phenomenon" — stiffness after rest that eases with movement). Note: `getEpisodeTypeInfo` currently falls back to `EPISODE_TYPES[6]` (hardcoded) — change to find-by-id `'general'` like skin, since we're adding types.
- `joint` modal — add the same `"⇄ Also log under Neuro"` checkbox for ids `weakness`, `cramping`, `fasciculations`. On save with it checked: `crossListSave(..., 'joint', 'neuro', entry)`. Edit/delete route through helper if `isCrossListed`.

## 5. `lib/pdf-report-generator.ts`
- Add a **Neuro / Neuromuscular** section (enumerate the `'neuro'` subcategory entries the same way other trackers are pulled — read the file to find the per-tracker section pattern).
- **Cross-listed entries:** when an entry has `crossListedIn`, append a badge to its line, e.g. `"⇄ also logged under Neuro"` / `"⇄ also logged under MSK"`, so a clinician sees ONE event surfaced in two sections, not double-counting. It appears in BOTH sections (that's intended — the rheumatologist and neurologist each see it in their section), badged.

## 6. Verify + build
- `cd D:\Ace\command-mobile2; npx tsc --noEmit 2>&1 | Select-String "neuro|joint|skin|cross-list|pdf-report"` → must be clean.
- **ONE exe/msi build** (captures skin + neuro + MSK). Build commands: check `package.json` scripts + the `reference_command_release_pipeline` memory (FOUR version files to bump for a real release; for a test build the Tauri build script). Ace does the build; **Ren tests the .exe** (visual gate — agents verify typecheck, Ren's eyes verify rendered UI).
- Then the **APK** build after the exe passes.

## Patterns to mirror (exact file refs)
- `app/skin/skin-tracker.tsx`, `app/skin/skin-constants.ts`, `app/skin/modals/general-skin-modal.tsx`, `app/skin/page.tsx`, `app/skin/skin-types.ts` — tracker template.
- `app/joint/joint-constants.ts` — MSK (muscle types already present: `weakness`, `cramping`, `fasciculations`, `muscle-tightness` via `MUSCLE_EPISODE_TYPES`/`isMuscleEpisode`).
- `app/body/page.tsx` ~126–285 — registry + groups + `getTrackerHref`.
- `lib/database` — `useDailyData`, `CATEGORIES.TRACKER`, `saveData`/`getCategoryData`.

## Open for Ren (post-compact, quick)
- Confirm/tweak the 12-symptom set and the 3 dual-listed types.
- Confirm shared-id cross-list approach (vs single-source-of-truth).

---

## 🔗 Cross-list GENERALIZATION — design proposal (Ace, 2026-06-07 heartbeat)
**Status: NOT built. Needs Ren's green-light on the shape before I touch 4 trackers.**
Neuro↔MSK works & is confirmed in Tauri. The autoimmune ⇄ links are fully *built but OFF* —
`CROSS_LIST_ENABLED = false` in `app/autoimmune/modals/general-autoimmune-modal.tsx:79`, with the
comment "flip to true once every tracker reads its partner from `crossListedIn`." That flip is
the whole task. Today it's blocked because **joint and neuro HARDCODE each other as the partner**
(`lib/cross-list-neuro-joint.ts::neuroJointTranslate` only knows `joint`↔`neuro`), and **skin has
NO receiver wiring at all** — so an autoimmune→skin write would land but skin's edit/delete path
wouldn't sync it back.

### The pivot
Stop passing a hardcoded `(primarySub, secondarySub)` pair + a pair-specific translator. Instead:
1. Each entry already carries `crossListedIn: string[]` (the authoritative partner list).
2. A single **registry** maps `subcategory → {canonical concept → native field name}`.
3. One generic `translateBetween(entry, targetSub)` reshapes via the registry — replacing
   `neuroJointTranslate` (which becomes a thin call into it, behaviour-identical).

### Proposed module: `lib/tracker-cross-list-registry.ts`
```ts
// canonical concepts shared across trackers
type Concept = 'location' | 'triggers' | 'treatments' | 'character'
interface TrackerSchema {
  // native field name for each concept this tracker stores (omit = doesn't hold it)
  fields: Partial<Record<Concept, string>>
  // location aliases to read FROM when importing a foreign entry
  locationAliases?: string[]
}
const TRACKER_SCHEMAS: Record<string, TrackerSchema> = {
  neuro: { fields: { location:'distribution', triggers:'triggers', treatments:'treatments', character:'character' } },
  joint: { fields: { location:'musclesAffected', triggers:'triggerActivity', treatments:'treatmentApplied' } },
  skin:  { fields: { /* TBD — see open Q */ } },
  autoimmune: { fields: { location:'affectedAreas', triggers:'triggers', treatments:'treatments', character:'character' } },
}
// translateBetween: read each concept via source aliases, write under target's native name,
// strip all OTHER trackers' aliases for those concepts, PRESERVE every native field (ROM, swelling…).
```
This reproduces `toNeuroShape`/`toJointShape` exactly (same non-lossy guarantee Ren caught last time),
just data-driven instead of hand-written per pair.

### The two real wrinkles (need Ren's call)
1. **Joint dual location.** Joint stores `musclesAffected` for muscle episodes (`isMuscleEpisode`)
   but `jointAffected` for joint episodes. The `location` field name is therefore **episode-dependent**,
   not static. Proposal: schema's location field can be a fn `(entry)=>'musclesAffected'|'jointAffected'`.
   Cheap, keeps it data-driven.
2. **Autoimmune↔skin doesn't structurally map.** Autoimmune `affectedAreas` is a FLAT free-text-ish
   list ("Fingers","Face / cheeks"…); skin uses a body-region model. There's no clean concept→field
   translation. **Decision for Ren:** (a) graceful-partial — skin shows the autoimmune entry with its
   own fields (origin shape) + a "(from Autoimmune)" tag, no remap; or (b) author a per-pair map.
   I'd default to (a): the PDF is already full-fidelity per-tracker, and (a) is ~zero risk. Joint &
   neuro keep the full remap (they DO share structure).

### Flip steps once shape is approved (small, one reviewed diff)
1. Add `lib/tracker-cross-list-registry.ts` (above).
2. Point `neuroJointTranslate` at `translateBetween` (or replace call sites) — verify Tauri neuro↔joint unchanged.
3. Wire a cross-list **receiver** into the skin tracker's save/edit/delete (mirror what joint/neuro do)
   so partner-side edits sync — this is the missing piece skin lacks.
4. Flip `CROSS_LIST_ENABLED = true`. Test all three autoimmune routes in Tauri (raynauds→skin,
   arthralgia→joint, dysphagia→neuro), confirm edit-from-partner-side syncs back, confirm non-lossy.
5. (separate) Autoimmune doctor-PDF section — ✅ DONE this heartbeat, commit `ebd7e56`.

**Why this is parked not built:** structural multi-tracker change + clinical logic = the
`align-before-big-changes` rule. The hard part (the abstraction shape + the two wrinkles) is decided
above; build is fast once Ren picks (a) vs (b) on wrinkle #2.

---

## ⚠️ SEPARATE PARKED THREAD (do not lose — not part of this build)
The **Three Babies paper** was drafted overnight: `D:\Ace\Published Papers\editing\ThreeBabies_TheWhyGap_DRAFT_v1.md`. **Ren still owes one decision:** the v4/v5 framing discrepancy — our `results/V4V5_RESULTS_PRETTY.md` calls `useroffset` a "token-masking bug fix," but curriculum counts + code + prereg say it's a **user-welfare curriculum layer** (so the inversion-rescue is a *curriculum* effect, not a bug). Flagged in 4 places in the draft + `AUTONOMOUS_LOG.md`. Ren decides; then correct that results doc + un-flag the paper. (Also: PAH advocacy packet `Ren-Medical/PAH_cath_advocacy_packet.md` updated with last night's flare convergence, ready for the VA Monday — no action needed, just don't forget it exists.)
