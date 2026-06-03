/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * The set of trackers a Routine can include (CHA-167). Command never had a
 * single master list of loggable trackers — each tracker page just calls
 * saveData(date, CATEGORIES.TRACKER, '<subcategory>', ...) with its own key.
 * This registry is the explicit source of truth that maps a routine-eligible
 * tracker to the three things Routines needs:
 *   - href:        where "Log now" navigates (NOT always the subcategory!)
 *   - subcategory: the daily_data key, for the "logged today ✓" query
 *   - label/emoji: how it renders in the builder + run cards
 *
 * Subcategory keys below are VERIFIED against what each page actually writes
 * (grep of CATEGORIES.TRACKER saveData calls). Note the exceptions where the
 * route slug and the storage key diverge (anxiety, weather).
 *
 * NOT YET LISTED (non-standard storage — they persist through dedicated hooks,
 * not the standard tracker bucket): medications, hydration, diabetes/glucose,
 * sleep. They're the highest-value routine members, so wiring their status +
 * autofill is the first follow-up after the run page lands.
 */

export type TrackableCategory = 'body' | 'mind' | 'choice' | 'manage' | 'custom'

/** Display order + labels for the builder's grouped (collapsible) tracker list. */
export const TRACKABLE_CATEGORY_ORDER: TrackableCategory[] = ['body', 'mind', 'choice', 'manage', 'custom']
export const TRACKABLE_CATEGORY_LABELS: Record<TrackableCategory, string> = {
  body: '🫀 Body',
  mind: '🧠 Mind',
  choice: '👍 Choice',
  manage: '📋 Manage',
  custom: '🔧 Custom',
}

export interface TrackableTracker {
  /** Stable id used in routine config. Equal to subcategory unless noted. */
  id: string
  label: string
  emoji: string
  /** Route the "Log now" button navigates to. */
  href: string
  /** daily_data subcategory (category is CATEGORIES.TRACKER for built-ins). */
  subcategory: string
  /** Some trackers store ONE record PER entry under `name-<id>` subcategories
   *  (hydration-, sleep-, missed-work-). When set, "logged today" matches any
   *  record whose subcategory STARTS WITH this, instead of an exact match. */
  subcategoryPrefix?: string
  /** Group in the builder's collapsible add-tracker list. */
  category: TrackableCategory
  /** True for user-built Forge trackers (different content shape + category). */
  isCustom?: boolean
  /** "logged today ✓" doesn't work yet (bespoke storage we haven't wired) — nav
   *  + "nothing today" still do. Shown as "status coming soon". See CHA-192. */
  statusUnsupported?: boolean
  /** "Copy last" doesn't work for this tracker (per-entry JSON records are messy
   *  to clone) — hide the copy buttons even though status works. */
  copyUnsupported?: boolean
}

// Categories mirror the app's real sections (app/body, app/mind, app/choice).
// statusUnsupported = bespoke storage we haven't taught the status query yet
// (nav + "nothing today" work; "logged ✓" / copy-yest don't) → see CHA-192.
export const TRACKABLE_TRACKERS: readonly TrackableTracker[] = [
  // ── Body ──
  { id: 'pain', label: 'Pain', emoji: '🤕', href: '/pain', subcategory: 'pain', category: 'body' },
  { id: 'head-pain', label: 'Head Pain', emoji: '🤯', href: '/head-pain', subcategory: 'head-pain', category: 'body' },
  { id: 'cardiac', label: 'Heart Drama', emoji: '❤️', href: '/cardiac', subcategory: 'cardiac', category: 'body' },
  { id: 'dysautonomia', label: 'Autonomic Shenanigans', emoji: '🌀', href: '/dysautonomia', subcategory: 'dysautonomia', category: 'body' },
  { id: 'respiratory', label: 'Respiratory', emoji: '🫁', href: '/respiratory', subcategory: 'respiratory', category: 'body' },
  { id: 'seizure', label: 'Seizure', emoji: '⚡', href: '/seizure', subcategory: 'seizure', category: 'body' },
  { id: 'joint', label: 'Joint & MSK', emoji: '🦴', href: '/joint', subcategory: 'joint', category: 'body' },
  { id: 'bathroom', label: 'Potty Talk', emoji: '🚽', href: '/bathroom', subcategory: 'bathroom', category: 'body' },
  { id: 'upper-digestive', label: 'Upper Digestive', emoji: '🤢', href: '/upper-digestive', subcategory: 'upper-digestive', category: 'body' },
  { id: 'skin', label: 'Skin', emoji: '🩹', href: '/skin', subcategory: 'skin', category: 'body' },
  { id: 'reproductive-health', label: 'Reproductive Health', emoji: '🩸', href: '/reproductive-health', subcategory: 'reproductive-health', category: 'body' },
  { id: 'food-allergens', label: 'Food Allergens', emoji: '⚠️', href: '/food-allergens', subcategory: 'food-allergens', category: 'body' },
  { id: 'weather', label: 'Weather & Environment', emoji: '🌦️', href: '/weather-environment', subcategory: 'weather', category: 'body' },
  { id: 'diabetes', label: 'Diabetes', emoji: '💉', href: '/diabetes', subcategory: 'diabetes', category: 'body', statusUnsupported: true },
  { id: 'vitals', label: 'Vitals', emoji: '🩺', href: '/vitals', subcategory: 'vitals', category: 'body', statusUnsupported: true },
  // ── Mind ──
  { id: 'brain-fog', label: 'Brain Fog', emoji: '🌫️', href: '/brain-fog', subcategory: 'brain-fog', category: 'mind' },
  { id: 'mental-health', label: 'Mind & Mood', emoji: '🧠', href: '/mental-health', subcategory: 'mental-health', category: 'mind' },
  { id: 'anxiety', label: 'Anxiety', emoji: '😰', href: '/anxiety-tracker', subcategory: 'anxiety', category: 'mind' }, // route slug ≠ storage key
  { id: 'self-care', label: 'Self-Care', emoji: '🛁', href: '/self-care-tracker', subcategory: 'self-care', category: 'mind', statusUnsupported: true },
  { id: 'sensory', label: 'Sensory', emoji: '🌈', href: '/sensory-tracker', subcategory: 'sensory', category: 'mind', statusUnsupported: true },
  { id: 'journal', label: 'Journal', emoji: '📝', href: '/journal', subcategory: 'journal', category: 'mind', statusUnsupported: true },
  // (Crisis Support is intentionally NOT a routine item — it's an emergency tool, not a daily batch log.)
  // ── Choice ──
  { id: 'food-choice', label: 'Food', emoji: '🍽️', href: '/food-choice', subcategory: 'food-choice', category: 'choice' },
  { id: 'substance', label: 'Substances', emoji: '🧪', href: '/substance', subcategory: 'substance', category: 'choice' },
  { id: 'energy', label: 'Energy & Pacing', emoji: '⚡', href: '/energy', subcategory: 'energy', category: 'choice' },
  { id: 'hydration', label: 'Hydration', emoji: '💧', href: '/hydration', subcategory: 'hydration', subcategoryPrefix: 'hydration-', category: 'choice', copyUnsupported: true },
  { id: 'sleep', label: 'Sleep', emoji: '🛌', href: '/sleep', subcategory: 'sleep', subcategoryPrefix: 'sleep-', category: 'choice', copyUnsupported: true },
  { id: 'movement', label: 'Movement', emoji: '🏃', href: '/movement', subcategory: 'movement', category: 'choice', statusUnsupported: true },
  { id: 'coping-regulation', label: 'Coping & Regulation', emoji: '🧘', href: '/coping-regulation', subcategory: 'coping-regulation', category: 'choice', statusUnsupported: true },
  // ── Manage (daily-loggable only) ──
  { id: 'medications', label: 'Medications', emoji: '💊', href: '/medications', subcategory: 'medications', category: 'manage', statusUnsupported: true },
  { id: 'missed-work', label: 'Missed Work', emoji: '💼', href: '/work-disability', subcategory: 'missed-work', subcategoryPrefix: 'missed-work-', category: 'manage', copyUnsupported: true },
  // ── Command Zone sections (navigate directly to the right part of the home page) ──
  { id: 'cz-survival', label: 'Survival Check', emoji: '🆘', href: '/#survival', subcategory: 'cz-survival', category: 'manage', statusUnsupported: true, copyUnsupported: true },
  { id: 'cz-tasks', label: "Today's Tasks", emoji: '📦', href: '/#tasks', subcategory: 'cz-tasks', category: 'manage', statusUnsupported: true, copyUnsupported: true },
  { id: 'cz-schedule', label: "Today's Schedule", emoji: '🕐', href: '/#schedule', subcategory: 'cz-schedule', category: 'manage', statusUnsupported: true, copyUnsupported: true },
  { id: 'cz-gear', label: 'Gear Check', emoji: '🎒', href: '/#gear', subcategory: 'cz-gear', category: 'manage', statusUnsupported: true, copyUnsupported: true },
  { id: 'cz-selfcare', label: 'Self-Care Check', emoji: '✨', href: '/#selfcare', subcategory: 'cz-selfcare', category: 'manage', statusUnsupported: true, copyUnsupported: true },
]

const BY_ID = new Map(TRACKABLE_TRACKERS.map(t => [t.id, t]))

export function getTrackable(id: string): TrackableTracker | undefined {
  return BY_ID.get(id)
}

/** Resolve a list of routine tracker ids to their full records, preserving order
 *  and silently dropping any that are no longer in the registry. */
export function resolveTrackables(ids: string[]): TrackableTracker[] {
  return ids.map(id => BY_ID.get(id)).filter((t): t is TrackableTracker => t !== undefined)
}
