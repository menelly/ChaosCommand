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
  /** Group in the builder's collapsible add-tracker list. */
  category: TrackableCategory
  /** True for user-built Forge trackers (different content shape + category). */
  isCustom?: boolean
  /** Non-standard storage (e.g. Manage trackers) — "logged today ✓" / copy-yest
   *  don't work yet; nav + "nothing today" do. Status integration is a follow-up. */
  statusUnsupported?: boolean
}

export const TRACKABLE_TRACKERS: readonly TrackableTracker[] = [
  // Body
  { id: 'pain', label: 'Pain', emoji: '🤕', href: '/pain', subcategory: 'pain', category: 'body' },
  { id: 'head-pain', label: 'Head Pain', emoji: '🤯', href: '/head-pain', subcategory: 'head-pain', category: 'body' },
  { id: 'cardiac', label: 'Heart Drama', emoji: '❤️', href: '/cardiac', subcategory: 'cardiac', category: 'body' },
  { id: 'dysautonomia', label: 'Autonomic Shenanigans', emoji: '🌀', href: '/dysautonomia', subcategory: 'dysautonomia', category: 'body' },
  { id: 'respiratory', label: 'Respiratory', emoji: '🫁', href: '/respiratory', subcategory: 'respiratory', category: 'body' },
  { id: 'seizure', label: 'Seizure', emoji: '⚡', href: '/seizure', subcategory: 'seizure', category: 'body' },
  { id: 'joint', label: 'Joint & MSK', emoji: '🦴', href: '/joint', subcategory: 'joint', category: 'body' },
  { id: 'energy', label: 'Energy & Pacing', emoji: '⚡', href: '/energy', subcategory: 'energy', category: 'body' },
  { id: 'bathroom', label: 'Potty Talk', emoji: '🚽', href: '/bathroom', subcategory: 'bathroom', category: 'body' },
  { id: 'upper-digestive', label: 'Upper Digestive', emoji: '🤢', href: '/upper-digestive', subcategory: 'upper-digestive', category: 'body' },
  { id: 'skin', label: 'Skin', emoji: '🩹', href: '/skin', subcategory: 'skin', category: 'body' },
  { id: 'food-allergens', label: 'Food Allergens', emoji: '⚠️', href: '/food-allergens', subcategory: 'food-allergens', category: 'body' },
  { id: 'reproductive-health', label: 'Reproductive Health', emoji: '🩸', href: '/reproductive-health', subcategory: 'reproductive-health', category: 'body' },
  { id: 'weather', label: 'Weather & Environment', emoji: '🌦️', href: '/weather-environment', subcategory: 'weather', category: 'body' },
  // Mind
  { id: 'brain-fog', label: 'Brain Fog', emoji: '🌫️', href: '/brain-fog', subcategory: 'brain-fog', category: 'mind' },
  { id: 'anxiety', label: 'Anxiety', emoji: '😰', href: '/anxiety-tracker', subcategory: 'anxiety', category: 'mind' }, // route slug ≠ storage key
  { id: 'mental-health', label: 'Mind & Mood', emoji: '🧠', href: '/mental-health', subcategory: 'mental-health', category: 'mind' },
  // Choice
  { id: 'food-choice', label: 'Food', emoji: '🍽️', href: '/food-choice', subcategory: 'food-choice', category: 'choice' },
  { id: 'substance', label: 'Substances', emoji: '🧪', href: '/substance', subcategory: 'substance', category: 'choice' },
  // Manage — daily-loggable only. Non-standard storage: nav + "nothing today"
  // work; "logged ✓" / copy-yest don't yet (status integration is a follow-up).
  { id: 'medications', label: 'Medications', emoji: '💊', href: '/medications', subcategory: 'medications', category: 'manage', statusUnsupported: true },
  { id: 'missed-work', label: 'Missed Work', emoji: '💼', href: '/work-disability', subcategory: 'missed-work', category: 'manage', statusUnsupported: true },
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
