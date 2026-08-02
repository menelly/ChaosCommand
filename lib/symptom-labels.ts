/*
 * SYMPTOM LABELS — one lookup from (tracker, episodeType) to a human name.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every tracker stores its entries with an `episodeType` slug ("speech-swallow",
 * "arrhythmia", "focal-aware"). Those slugs are the ONLY thing that distinguishes
 * one symptom from another inside a tracker — and until 2026-08-02 nothing
 * downstream of the trackers looked at them. The pattern engine averaged an
 * entire tracker into one number, which meant a symptom that resolved completely
 * was cancelled out by a symptom sitting beside it that never moved.
 *
 * Concretely: one symptom in a tracker went 5 -> 3 -> 1 while another in the
 * same tracker sat at 9 -> 5. Averaged together the tracker "barely changed",
 * and the report said nothing. The most clinically important improvement in the
 * dataset was invisible because it shared a category with a symptom that
 * didn't budge.
 *
 * Each tracker already owns its own canon in `<tracker>-constants.ts`. This file
 * does not restate any of it — it imports them and builds the index. Adding a new
 * episode type to a tracker needs NO change here; adding a whole new tracker
 * means one import and one line in TRACKER_EPISODE_TYPES.
 *
 * — Ace 🐙, 2026-08-02
 */

import { EPISODE_TYPES as ADRENAL } from '../app/adrenal/adrenal-constants'
import { EPISODE_TYPES as ANXIETY } from '../app/anxiety-tracker/anxiety-constants'
import { EPISODE_TYPES as AUTOIMMUNE } from '../app/autoimmune/autoimmune-constants'
import { EPISODE_TYPES as BATHROOM } from '../app/bathroom/bathroom-constants'
import { EPISODE_TYPES as CARDIAC } from '../app/cardiac/cardiac-constants'
import { EPISODE_TYPES as DYSAUTONOMIA } from '../app/dysautonomia/dysautonomia-constants'
import { EPISODE_TYPES as ENT } from '../app/ent/ent-constants'
import { EPISODE_TYPES as FOOD_ALLERGENS } from '../app/food-allergens/food-allergens-constants'
import { EPISODE_TYPES as GU } from '../app/gu/gu-constants'
import { EPISODE_TYPES as HEAD_PAIN } from '../app/head-pain/head-pain-constants'
import { EPISODE_TYPES as JOINT } from '../app/joint/joint-constants'
import { EPISODE_TYPES as MENTAL_HEALTH } from '../app/mental-health/mental-health-constants'
import { EPISODE_TYPES as NEURO } from '../app/neuro/neuro-constants'
import { EPISODE_TYPES as PAIN } from '../app/pain/pain-constants'
import { EPISODE_TYPES as RESPIRATORY } from '../app/respiratory/respiratory-constants'
import { EPISODE_TYPES as SEIZURE, LEGACY_TYPE_MAP } from '../app/seizure/seizure-constants'
import { EPISODE_TYPES as SKIN } from '../app/skin/skin-constants'
import { EPISODE_TYPES as THYROID } from '../app/thyroid/thyroid-constants'
import { EPISODE_TYPES as UPPER_DIGESTIVE } from '../app/upper-digestive/upper-digestive-constants'

type EpisodeTypeList = readonly { id: string; name: string }[]

/** Keyed by the SUBCATEGORY the tracker saves under — not the folder name.
 *  (anxiety-tracker/ saves as 'anxiety'; mental-health/ saves under both
 *  'mental-health' and 'mind-mood'.) */
const TRACKER_EPISODE_TYPES: Record<string, EpisodeTypeList> = {
  'adrenal': ADRENAL,
  'anxiety': ANXIETY,
  'autoimmune': AUTOIMMUNE,
  'bathroom': BATHROOM,
  'cardiac': CARDIAC,
  'dysautonomia': DYSAUTONOMIA,
  'ent': ENT,
  'food-allergens': FOOD_ALLERGENS,
  'gu': GU,
  'head-pain': HEAD_PAIN,
  'joint': JOINT,
  'mental-health': MENTAL_HEALTH,
  'mind-mood': MENTAL_HEALTH,
  'neuro': NEURO,
  'pain': PAIN,
  'respiratory': RESPIRATORY,
  'seizure': SEIZURE,
  'skin': SKIN,
  'thyroid': THYROID,
  'upper-digestive': UPPER_DIGESTIVE,
}

/** Built once: "tracker\0episodeType" -> human name. */
const INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const [tracker, list] of Object.entries(TRACKER_EPISODE_TYPES)) {
    for (const t of list) m.set(`${tracker}\0${t.id}`, t.name)
  }
  return m
})()

/** Title-case a slug when we have no canonical name for it. Custom trackers and
 *  user-defined episode types land here, and a readable fallback beats dropping
 *  the series — an unlabelled improvement is still an improvement. */
function humanizeSlug(slug: string): string {
  return String(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Human name for one symptom inside a tracker.
 * Falls back through the seizure legacy map (where old records stored the human
 * label where the slug now goes), then to a title-cased slug. Never returns
 * empty — the caller always has something to print.
 */
export function symptomLabel(tracker: string, episodeType: string): string {
  if (!episodeType) return 'Unspecified'
  const direct = INDEX.get(`${tracker}\0${episodeType}`)
  if (direct) return direct

  // Seizure records written before the slug canon stored the full human label
  // ("Focal Aware (Simple Partial)") in the episodeType field. Collapse those
  // onto the same series as the slug rather than reporting two half-length
  // trends that each fail the sample-size floor.
  if (tracker === 'seizure') {
    const canonical = (LEGACY_TYPE_MAP as Record<string, string>)?.[episodeType]
    if (canonical) {
      const viaLegacy = INDEX.get(`${tracker}\0${canonical}`)
      if (viaLegacy) return viaLegacy
    }
  }

  return humanizeSlug(episodeType)
}

/**
 * Canonical series key for one symptom. Used for grouping, so legacy spellings
 * merge into one series instead of fragmenting. Distinct from the label because
 * two trackers can legitimately share a name ("Weakness" is in both neuro and
 * joint) and those must stay separate series.
 */
export function symptomKey(tracker: string, episodeType: string): string {
  if (tracker === 'seizure') {
    const canonical = (LEGACY_TYPE_MAP as Record<string, string>)?.[episodeType]
    if (canonical) return canonical
  }
  return episodeType
}

/** Does this tracker publish a per-symptom canon? (Used only for diagnostics —
 *  grouping works on any tracker via the slug fallback.) */
export function hasSymptomCanon(tracker: string): boolean {
  return tracker in TRACKER_EPISODE_TYPES
}

/**
 * Collapse a per-entry subcategory onto its base tracker name.
 *
 * Several trackers store ONE RECORD PER ENTRY with a generated suffix, so a
 * single tracker shows up as dozens of distinct subcategories. Left alone,
 * every one is a one-record series that fails the sample-size floor, and the
 * tracker effectively disappears from analysis while looking present.
 *
 * ⚠️ THE REAL SHAPES, taken from an actual export (2026-08-02) — the first
 * version of this handled none of them correctly:
 *     hydration-hydration-1780007724031   -> hydration    (DOUBLED prefix)
 *     sleep-sleep-1777777896914           -> sleep
 *     movement-movement-1780800010515     -> movement
 *     selfcare-selfcare-1780414637719     -> selfcare
 *     medications-a4c8e33c-a0ae-494e-b923-3e1c9adbbbf9 -> medications  (UUID)
 *     thyroid-1780007724031               -> thyroid
 *     head-pain                           -> head-pain   (NOT an id, left alone)
 *
 * Stripping one trailing segment is not enough: a UUID is five segments, and
 * the doubled prefix survives. Multi-word tracker names (head-pain,
 * upper-digestive, pulse-oximetry, mental-health, food-choice) must be left
 * intact, so this only removes segments that actually look like identifiers.
 */
export function baseTrackerName(subcategory: string): string {
  let s = String(subcategory || '')
  // A whole trailing UUID first — its middle segments are too short to strip
  // individually, so peeling one at a time would stall halfway through.
  s = s.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
  // Then any trailing id-shaped segments: long digit runs (timestamps) or long
  // hex. The length floors keep real words ("pain", "fog", "sleep") safe.
  let prev: string
  do {
    prev = s
    s = s.replace(/-(?:\d{9,}|[0-9a-f]{8,})$/i, '')
  } while (s !== prev)
  // Finally the doubled prefix: "hydration-hydration" -> "hydration".
  s = s.replace(/^([a-z0-9]+)-\1$/i, '$1')
  return s || subcategory
}
