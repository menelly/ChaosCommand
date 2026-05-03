/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Registry of all sections that have hide-able trackers, with their localStorage
 * keys and tracker metadata. Used by the unified /customize Visible Trackers
 * panel to render section-aware toggles.
 *
 * NOTE on duplication: each section's page (app/body, app/mind, app/choice,
 * app/manage) owns the canonical tracker list with full metadata (icons, help
 * content, edition flags, routes). This file duplicates ONLY {id, name} for
 * the visibility UI. If a tracker is added/renamed in a section page, mirror
 * the change here. TODO: extract canonical lists into shared configs and
 * import from there to remove the sync hazard. Linear: CHA-future.
 */

export type SectionId = 'manage' | 'body' | 'mind' | 'choice'

export interface VisibilityTracker {
  id: string
  name: string
}

export interface VisibilitySection {
  id: SectionId
  label: string
  emoji: string
  storageKey: string
  description: string
  trackers: VisibilityTracker[]
}

// Mirrors app/body/page.tsx allTrackers
const BODY_TRACKERS: VisibilityTracker[] = [
  { id: 'upper-digestive', name: 'Upper Digestive' },
  { id: 'digestive-health', name: 'Lower Digestive (Bathroom)' },
  { id: 'pain-tracking', name: 'General Pain & Management' },
  { id: 'head-pain', name: 'Head Pain Tracker' },
  { id: 'dysautonomia', name: 'Dysautonomia Tracker' },
  { id: 'diabetes-tracker', name: 'Diabetes Tracker' },
  { id: 'food-allergens', name: 'Food Allergens' },
  { id: 'reproductive-health', name: 'Reproductive Health & Fertility' },
  { id: 'weather-environment', name: 'Weather & Environment' },
  { id: 'seizure-tracking', name: 'Seizure Tracker' },
]

// Mirrors app/mind/page.tsx allTrackers
const MIND_TRACKERS: VisibilityTracker[] = [
  { id: 'brain-fog', name: 'Brain Fog & Cognitive' },
  { id: 'mental-health-general', name: 'Mental Health Overview' },
  { id: 'anxiety-tracker', name: 'Anxiety & Panic Tracker' },
  { id: 'self-care-tracker', name: 'Self-Care Tracker' },
  { id: 'sensory-tracker', name: 'Sensory Processing Tracker' },
  { id: 'crisis-support', name: 'Crisis Support' },
]

// Mirrors app/choice/page.tsx allChoiceAreas
const CHOICE_TRACKERS: VisibilityTracker[] = [
  { id: 'sleep', name: 'Sleep' },
  { id: 'hydration', name: 'Hydration' },
  { id: 'food-choice', name: 'Food Choice' },
  { id: 'movement', name: 'Movement' },
  { id: 'energy', name: 'Energy & Pacing' },
  { id: 'coping-regulation', name: 'Coping & Regulation' },
]

export const VISIBILITY_SECTIONS: VisibilitySection[] = [
  {
    id: 'body',
    label: 'Body',
    emoji: '❤️',
    storageKey: 'chaos-body-hidden-trackers',
    description: 'Medical and physical wellness trackers shown on the Body page.',
    trackers: BODY_TRACKERS,
  },
  {
    id: 'mind',
    label: 'Mind',
    emoji: '🧠',
    storageKey: 'chaos-mind-hidden-trackers',
    description: 'Mental wellness trackers shown on the Mind page.',
    trackers: MIND_TRACKERS,
  },
  {
    id: 'choice',
    label: 'Choice',
    emoji: '🌱',
    storageKey: 'chaos-choice-hidden-trackers',
    description: 'Lifestyle / choice trackers shown on the Choice page.',
    trackers: CHOICE_TRACKERS,
  },
  {
    id: 'manage',
    label: 'Manage',
    emoji: '📋',
    storageKey: 'chaos-manage-hidden-trackers',
    description: 'Records and admin tools shown on the Manage page.',
    trackers: [], // populated dynamically from lib/manage/trackers-config to avoid duplication
  },
]

export function getSection(id: SectionId): VisibilitySection | undefined {
  return VISIBILITY_SECTIONS.find(s => s.id === id)
}
