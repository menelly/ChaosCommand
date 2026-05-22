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

export interface TrackableTracker {
  /** Stable id used in routine config. Equal to subcategory unless noted. */
  id: string
  label: string
  emoji: string
  /** Route the "Log now" button navigates to. */
  href: string
  /** daily_data subcategory (category is CATEGORIES.TRACKER for built-ins). */
  subcategory: string
  /** True for user-built Forge trackers (different content shape + category). */
  isCustom?: boolean
}

export const TRACKABLE_TRACKERS: readonly TrackableTracker[] = [
  { id: 'pain', label: 'Pain', emoji: '🤕', href: '/pain', subcategory: 'pain' },
  { id: 'head-pain', label: 'Head Pain', emoji: '🤯', href: '/head-pain', subcategory: 'head-pain' },
  { id: 'cardiac', label: 'Heart Drama', emoji: '❤️', href: '/cardiac', subcategory: 'cardiac' },
  { id: 'dysautonomia', label: 'Autonomic Shenanigans', emoji: '🌀', href: '/dysautonomia', subcategory: 'dysautonomia' },
  { id: 'respiratory', label: 'Respiratory', emoji: '🫁', href: '/respiratory', subcategory: 'respiratory' },
  { id: 'seizure', label: 'Seizure', emoji: '⚡', href: '/seizure', subcategory: 'seizure' },
  { id: 'joint', label: 'Joint & MSK', emoji: '🦴', href: '/joint', subcategory: 'joint' },
  { id: 'brain-fog', label: 'Brain Fog', emoji: '🌫️', href: '/brain-fog', subcategory: 'brain-fog' },
  { id: 'energy', label: 'Energy & Pacing', emoji: '⚡', href: '/energy', subcategory: 'energy' },
  { id: 'bathroom', label: 'Potty Talk', emoji: '🚽', href: '/bathroom', subcategory: 'bathroom' },
  { id: 'upper-digestive', label: 'Upper Digestive', emoji: '🤢', href: '/upper-digestive', subcategory: 'upper-digestive' },
  { id: 'skin', label: 'Skin', emoji: '🩹', href: '/skin', subcategory: 'skin' },
  { id: 'substance', label: 'Substances', emoji: '🧪', href: '/substance', subcategory: 'substance' },
  { id: 'food-choice', label: 'Food', emoji: '🍽️', href: '/food-choice', subcategory: 'food-choice' },
  { id: 'food-allergens', label: 'Food Allergens', emoji: '⚠️', href: '/food-allergens', subcategory: 'food-allergens' },
  { id: 'reproductive-health', label: 'Reproductive Health', emoji: '🩸', href: '/reproductive-health', subcategory: 'reproductive-health' },
  // route slug ≠ storage key:
  { id: 'anxiety', label: 'Anxiety', emoji: '😰', href: '/anxiety-tracker', subcategory: 'anxiety' },
  { id: 'mental-health', label: 'Mind & Mood', emoji: '🧠', href: '/mental-health', subcategory: 'mental-health' },
  { id: 'weather', label: 'Weather & Environment', emoji: '🌦️', href: '/weather-environment', subcategory: 'weather' },
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
