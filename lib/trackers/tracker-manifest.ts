/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.8)
 *
 * SINGLE SOURCE OF TRUTH for "what trackers exist" (CHA-315). Historically the
 * tracker list was duplicated across ~8 surfaces (routine registry, visibility-
 * sections, section pages, customize, sidebar, PDF, patterns, onboarding), each
 * hand-maintained — so new trackers silently fell out of features (CHA-314,
 * CHA-192). This manifest is the one place a tracker is defined; every consumer
 * DERIVES its slice via the selectors below.
 *
 * ── THE LOAD-BEARING DESIGN RULE: ids are persisted in user data. ──
 * The same tracker historically has DIFFERENT ids on different surfaces, and
 * those ids live in saved user data we must not orphan:
 *   - routine configs store `RoutineTracker.trackerId` (the routine-registry id),
 *   - the visibility panel stores hidden ids in localStorage (the section id).
 * e.g. Pain = `pain` (routines) but `pain-tracking` (visibility); Mind&Mood =
 * `mental-health` vs `mental-health-general`; Endocrine = 3 ids vs 1.
 * ⇒ We DO NOT change ids. Each entry carries a `canonicalId` (internal, free to
 *    choose) PLUS per-surface aliases (`routineId`, `visibilityId`). Every
 *    consumer keeps reading/writing the id IT already uses. No data migration.
 *
 * MIGRATION STATUS: Step 1 — manifest authored, NO consumer wired yet. Consumers
 * get migrated one at a time, behavior-preserving, each validated against its old
 * hardcoded list before the old list is deleted. Until then this file is inert
 * (imported by nothing) and cannot affect the running app.
 */

export type TrackerSection = 'body' | 'mind' | 'choice' | 'manage' | 'command-zone'

export interface TrackerDef {
  /** Internal stable id for the manifest. NOT persisted in user data — free to
   *  choose. Equals the route slug unless noted. Consumers use the alias fields. */
  canonicalId: string
  label: string
  emoji: string
  /** Route the "Log now" / nav button goes to. */
  route: string
  section: TrackerSection

  // ── storage ──────────────────────────────────────────────────────────────
  /** daily_data subcategory (category = CATEGORIES.TRACKER for built-ins). */
  subcategory: string
  /** Set for trackers storing ONE record per entry under `<prefix><id>` (hydration-,
   *  sleep-, missed-work-). "logged today" matches subcategory STARTS-WITH this. */
  subcategoryPrefix?: string

  // ── per-surface id ALIASES (so we never orphan persisted user data) ────────
  /** id used in saved routine configs (was: trackable-registry id). Defaults to canonicalId. */
  routineId?: string
  /** id used in localStorage hidden-tracker lists + section pages (was: visibility id). Defaults to canonicalId. */
  visibilityId?: string

  // ── capability flags (each consumer filters on what it cares about) ────────
  /** Can be added to a Routine. (Crisis Support is intentionally false.) */
  routineEligible?: boolean
  /** Routine "logged today ✓" works (standard exact-match storage). When false,
   *  nav + "nothing today" still work; status/copy don't (bespoke storage). CHA-192. */
  statusSupported?: boolean
  /** "Copy last" hidden (per-entry JSON records are messy to clone). */
  copyUnsupported?: boolean

  // ── hub modelling ──────────────────────────────────────────────────────────
  /** Parent hubs (Endocrine) list child canonicalIds. Surfaces choose to show the
   *  parent or flatten to children; routines/section show the PARENT (CHA-315 decision). */
  children?: string[]
  /** True for the child sub-trackers of a hub (diabetes/thyroid/adrenal). */
  isHubChild?: boolean

  // ── future hook (CHA-315 sibling): declarative cross-listing ───────────────
  /** Symptom-level cross-list pairings, read by lib/cross-list.ts once expansion
   *  lands. Declaring pairs here (vs hardcoding per component) makes that work
   *  cheap. EMPTY for now — neuro↔joint stays hardcoded until the expansion ticket. */
  crossLinks?: Array<{ withTracker: string; sharedTypes: string[] }>
}

// Flag legend per entry: rE=routineEligible, sS=statusSupported.
// Aliases only set when they DIFFER from canonicalId (keeps the table readable).
export const TRACKER_MANIFEST: readonly TrackerDef[] = [
  // ── Body ───────────────────────────────────────────────────────────────────
  { canonicalId: 'pain', label: 'Pain', emoji: '🤕', route: '/pain', section: 'body', subcategory: 'pain', visibilityId: 'pain-tracking', routineEligible: true, statusSupported: true },
  { canonicalId: 'head-pain', label: 'Head Pain', emoji: '🤯', route: '/head-pain', section: 'body', subcategory: 'head-pain', routineEligible: true, statusSupported: true },
  { canonicalId: 'cardiac', label: 'Heart Drama', emoji: '❤️', route: '/cardiac', section: 'body', subcategory: 'cardiac', routineEligible: true, statusSupported: true },
  { canonicalId: 'dysautonomia', label: 'Autonomic Shenanigans', emoji: '🌀', route: '/dysautonomia', section: 'body', subcategory: 'dysautonomia', routineEligible: true, statusSupported: true },
  { canonicalId: 'respiratory', label: 'Respiratory', emoji: '🫁', route: '/respiratory', section: 'body', subcategory: 'respiratory', routineEligible: true, statusSupported: true },
  { canonicalId: 'seizure', label: 'Seizure', emoji: '⚡', route: '/seizure', section: 'body', subcategory: 'seizure', visibilityId: 'seizure-tracking', routineEligible: true, statusSupported: true },
  { canonicalId: 'joint', label: 'Joint & MSK', emoji: '🦴', route: '/joint', section: 'body', subcategory: 'joint', routineEligible: true, statusSupported: true,
    crossLinks: [{ withTracker: 'neuro', sharedTypes: ['weakness', 'cramping', 'fasciculations'] }] },
  { canonicalId: 'neuro', label: 'Neuro / Neuromuscular', emoji: '🧬', route: '/neuro', section: 'body', subcategory: 'neuro', routineEligible: true, statusSupported: true,
    crossLinks: [{ withTracker: 'joint', sharedTypes: ['weakness', 'spasticity-cramping', 'fasciculations'] }] }, // NEW — was orphaned from routines (CHA-314)
  { canonicalId: 'autoimmune', label: 'Autoimmune / Connective Tissue', emoji: '🛡️', route: '/autoimmune', section: 'body', subcategory: 'autoimmune', routineEligible: true, statusSupported: true }, // NEW — CHA-314
  { canonicalId: 'bathroom', label: 'Potty Talk', emoji: '🚽', route: '/bathroom', section: 'body', subcategory: 'bathroom', visibilityId: 'digestive-health', routineEligible: true, statusSupported: true },
  { canonicalId: 'upper-digestive', label: 'Upper Digestive', emoji: '🤢', route: '/upper-digestive', section: 'body', subcategory: 'upper-digestive', routineEligible: true, statusSupported: true },
  { canonicalId: 'skin', label: 'Skin', emoji: '🩹', route: '/skin', section: 'body', subcategory: 'skin', routineEligible: true, statusSupported: true },
  { canonicalId: 'reproductive-health', label: 'Reproductive Health', emoji: '🩸', route: '/reproductive-health', section: 'body', subcategory: 'reproductive-health', routineEligible: true, statusSupported: true },
  { canonicalId: 'food-allergens', label: 'Food Allergens', emoji: '⚠️', route: '/food-allergens', section: 'body', subcategory: 'food-allergens', routineEligible: true, statusSupported: true },
  { canonicalId: 'weather', label: 'Weather & Environment', emoji: '🌦️', route: '/weather-environment', section: 'body', subcategory: 'weather', visibilityId: 'weather-environment', routineEligible: true, statusSupported: true },
  // Endocrine = parent hub; children remain individually addressable. Routines + section show the PARENT (CHA-315).
  { canonicalId: 'endocrine', label: 'Endocrine', emoji: '🧪', route: '/endocrine', section: 'body', subcategory: 'endocrine', routineEligible: true, statusSupported: false, copyUnsupported: true,
    children: ['diabetes', 'thyroid', 'adrenal'] },
  { canonicalId: 'diabetes', label: 'Diabetes', emoji: '💉', route: '/diabetes', section: 'body', subcategory: 'diabetes', routineEligible: true, statusSupported: false, isHubChild: true },
  { canonicalId: 'thyroid', label: 'Thyroid', emoji: '🦋', route: '/thyroid', section: 'body', subcategory: 'thyroid', routineEligible: true, statusSupported: false, isHubChild: true },
  { canonicalId: 'adrenal', label: 'Adrenal', emoji: '🔥', route: '/adrenal', section: 'body', subcategory: 'adrenal', routineEligible: true, statusSupported: false, isHubChild: true },
  { canonicalId: 'vitals', label: 'Vitals', emoji: '🩺', route: '/vitals', section: 'body', subcategory: 'vitals', routineEligible: true, statusSupported: true }, // built 2026-06-09 (CHA-317) — standard storage, status supported
  { canonicalId: 'gu', label: 'Genitourinary', emoji: '💧', route: '/gu', section: 'body', subcategory: 'gu', routineEligible: true, statusSupported: false },
  { canonicalId: 'ent', label: 'Ear, Nose & Throat', emoji: '👂', route: '/ent', section: 'body', subcategory: 'ent', routineEligible: true, statusSupported: false },
  { canonicalId: 'postpartum', label: 'Postpartum & Newborn', emoji: '👶', route: '/postpartum', section: 'body', subcategory: 'postpartum', routineEligible: true, statusSupported: false },

  // ── Mind ─────────────────────────────────────────────────────────────────
  { canonicalId: 'brain-fog', label: 'Brain Fog', emoji: '🌫️', route: '/brain-fog', section: 'mind', subcategory: 'brain-fog', routineEligible: true, statusSupported: true },
  { canonicalId: 'mental-health', label: 'Mind & Mood', emoji: '🧠', route: '/mental-health', section: 'mind', subcategory: 'mental-health', visibilityId: 'mental-health-general', routineEligible: true, statusSupported: true },
  { canonicalId: 'anxiety', label: 'Anxiety', emoji: '😰', route: '/anxiety-tracker', section: 'mind', subcategory: 'anxiety', visibilityId: 'anxiety-tracker', routineEligible: true, statusSupported: true },
  { canonicalId: 'self-care', label: 'Self-Care', emoji: '🛁', route: '/self-care-tracker', section: 'mind', subcategory: 'self-care', visibilityId: 'self-care-tracker', routineEligible: true, statusSupported: false },
  { canonicalId: 'sensory', label: 'Sensory', emoji: '🌈', route: '/sensory-tracker', section: 'mind', subcategory: 'sensory', visibilityId: 'sensory-tracker', routineEligible: true, statusSupported: false },
  { canonicalId: 'journal', label: 'Journal', emoji: '📝', route: '/journal', section: 'mind', subcategory: 'journal', routineEligible: true, statusSupported: false },
  // Crisis Support: emergency tool, NOT a daily batch log → never routine-eligible (preserved from trackable-registry).
  { canonicalId: 'crisis-support', label: 'Crisis Support', emoji: '🆘', route: '/crisis-support', section: 'mind', subcategory: 'crisis-support', routineEligible: false },

  // ── Choice (section-page ids already match routine ids — no aliases needed) ─
  { canonicalId: 'food-choice', label: 'Food', emoji: '🍽️', route: '/food-choice', section: 'choice', subcategory: 'food-choice', routineEligible: true, statusSupported: true },
  { canonicalId: 'substance', label: 'Substances', emoji: '🧪', route: '/substance', section: 'choice', subcategory: 'substance', routineEligible: true, statusSupported: true },
  { canonicalId: 'energy', label: 'Energy & Pacing', emoji: '⚡', route: '/energy', section: 'choice', subcategory: 'energy', routineEligible: true, statusSupported: true },
  { canonicalId: 'hydration', label: 'Hydration', emoji: '💧', route: '/hydration', section: 'choice', subcategory: 'hydration', subcategoryPrefix: 'hydration-', routineEligible: true, statusSupported: true, copyUnsupported: true },
  { canonicalId: 'sleep', label: 'Sleep', emoji: '🛌', route: '/sleep', section: 'choice', subcategory: 'sleep', subcategoryPrefix: 'sleep-', routineEligible: true, statusSupported: true, copyUnsupported: true },
  { canonicalId: 'movement', label: 'Movement', emoji: '🏃', route: '/movement', section: 'choice', subcategory: 'movement', routineEligible: true, statusSupported: false },
  { canonicalId: 'coping-regulation', label: 'Coping & Regulation', emoji: '🧘', route: '/coping-regulation', section: 'choice', subcategory: 'coping-regulation', routineEligible: true, statusSupported: false },

  // ── Manage (daily-loggable members only; the admin/record tools — providers,
  //    timeline, import, demographics, lab-results, gaslight-garage — stay in
  //    lib/manage/trackers-config.tsx, which is ALREADY a single source. The
  //    manifest will absorb/reference them in a later migration step, not now.) ─
  { canonicalId: 'medications', label: 'Medications', emoji: '💊', route: '/medications', section: 'manage', subcategory: 'medications', routineEligible: true, statusSupported: false }, // covers meds + OTC + supplements (CHA-307)
  { canonicalId: 'missed-work', label: 'Missed Work', emoji: '💼', route: '/work-disability', section: 'manage', subcategory: 'missed-work', subcategoryPrefix: 'missed-work-', routineEligible: true, statusSupported: false, copyUnsupported: true },
  { canonicalId: 'lines-tubes', label: 'Lines & Tubes', emoji: '🔌', route: '/lines-tubes', section: 'manage', subcategory: 'lines-tubes', routineEligible: true, statusSupported: false },

  // ── Command Zone (single routine step → home) ──────────────────────────────
  { canonicalId: 'command-zone', label: 'Command Zone', emoji: '🎯', route: '/', section: 'command-zone', subcategory: 'command-zone', routineEligible: true, statusSupported: false, copyUnsupported: true },
]

// ── derived lookups ──────────────────────────────────────────────────────────
const BY_CANONICAL = new Map(TRACKER_MANIFEST.map(t => [t.canonicalId, t]))
/** routineId (alias-aware) → def, for resolving saved RoutineTracker.trackerId. */
const BY_ROUTINE_ID = new Map(TRACKER_MANIFEST.map(t => [t.routineId ?? t.canonicalId, t]))
/** visibilityId (alias-aware) → def, for the visibility/section surfaces. */
const BY_VISIBILITY_ID = new Map(TRACKER_MANIFEST.map(t => [t.visibilityId ?? t.canonicalId, t]))

export function getByCanonical(id: string): TrackerDef | undefined { return BY_CANONICAL.get(id) }
export function getByRoutineId(id: string): TrackerDef | undefined { return BY_ROUTINE_ID.get(id) }
export function getByVisibilityId(id: string): TrackerDef | undefined { return BY_VISIBILITY_ID.get(id) }

/** The routine-id a consumer should use for a def (what saved configs store). */
export function routineIdOf(t: TrackerDef): string { return t.routineId ?? t.canonicalId }
/** The visibility-id a consumer should use (what localStorage stores). */
export function visibilityIdOf(t: TrackerDef): string { return t.visibilityId ?? t.canonicalId }

/** Trackers a Routine can include — the routine builder's source (replaces the
 *  hand-maintained TRACKABLE_TRACKERS). Excludes Crisis Support; hub children are
 *  included so they remain addressable, but the section/builder shows the parent. */
export function routineEligibleTrackers(): TrackerDef[] {
  return TRACKER_MANIFEST.filter(t => t.routineEligible)
}

/** Trackers in a given section (for section pages + visibility panel). */
export function trackersInSection(section: TrackerSection): TrackerDef[] {
  return TRACKER_MANIFEST.filter(t => t.section === section)
}
