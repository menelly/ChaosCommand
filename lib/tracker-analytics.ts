/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus)
 *
 * TRACKER ANALYTICS ENGINE — one place where a tracker becomes numbers.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * There were 33 hand-written analytics panels, one per tracker, each computing
 * its own statistics from raw entries. They diverged exactly the way the 21
 * copy-pasted severity inputs diverged, and for the same reason: domain logic
 * living in components. The result, measured 2026-08-04:
 *
 *   - The strongest panel had rate-per-week, a severity histogram, a
 *     time-of-day distribution and a flare delta.
 *   - The weakest was 129 lines of tallies with no rate, no histogram and no
 *     direction — for a tracker whose data underwrites a treatment case.
 *   - Almost nothing anywhere computed a TREND. An app built to demonstrate
 *     that treatment is working mostly could not say whether anything was
 *     getting better.
 *
 * Worse, the pattern engine and the PDF generator each re-derived the same
 * statistics a third and fourth time, with their own notion of which field
 * means "severity". Three consumers, three answers, no way for a reader to
 * know which one was lying. A doctor reading the PDF and a patient pointing at
 * the app could legitimately be looking at different numbers for the same week.
 *
 * So: ONE engine, pure functions, no React. Each tracker supplies a small
 * config naming its own fields. Panels, Patterns and the PDF all call this and
 * therefore all quote the same number. Adding a metric here reaches every
 * tracker at once, instead of one improving while the rest drift.
 *
 * ─── THE RULE THIS FILE ENFORCES ────────────────────────────────────────────
 *
 * A COUNT IS NOT A FINDING. Counting how often a treatment was mentioned and
 * labelling the card "what helped" states an efficacy claim computed from
 * frequency — the most-logged treatment always wins, regardless of whether it
 * did anything. That is the same defect as a report crediting a drug for an
 * improvement it could not have caused, and it is worse than useless in a
 * document a clinician will read.
 *
 * Everything here that makes a comparative claim carries its sample size, and
 * returns `null` rather than a number when the sample cannot support it. An
 * absent card is honest. A confident wrong one is not.
 */

// ─── SAMPLE FLOORS ──────────────────────────────────────────────────────────
// Deliberately conservative. These are not statistical significance thresholds
// — they are "is it defensible to draw this on a screen a doctor may read".
export const FLOORS = {
  /** Minimum entries before any trend direction is reported. */
  trend: 6,
  /** Minimum entries in EACH arm before a with/without comparison is shown. */
  comparisonArm: 3,
  /** Minimum entries before a rate-per-week is meaningful rather than noise. */
  rate: 3,
  /** Minimum span in days before a rate is extrapolated. */
  rateDays: 7,
} as const

// ─── CONFIG ─────────────────────────────────────────────────────────────────

export interface TrackerAnalyticsConfig {
  /** Canonical tracker key, post-normalisation (e.g. 'autoimmune'). */
  key: string
  /**
   * Field holding the ordinal severity. Accepts several names because trackers
   * disagree — `severity`, `painLevel`, `symptomSeverity`. First one present on
   * an entry wins, so a tracker that renamed its field mid-life still reads.
   */
  severityFields: string[]
  /** Top of this tracker's severity scale. Almost always 10. */
  severityMax?: number
  /**
   * Optional baseline field. Where present, `severity - baseline` gives a
   * genuine delta — the difference between a flare and this person's normal,
   * which is far more informative than the absolute number.
   *
   * Also serves before/after pairs: a tracker recording energy before and
   * after an activity gets a real effect measurement out of the same machinery.
   */
  baselineField?: string
  /**
   * TRUE when a HIGHER number is BETTER — hours slept, fluid intake, spoons
   * remaining, energy after an activity.
   *
   * ⚠️ NOT COSMETIC. Without it the engine reads a tracker's best week as a
   * decline: rising `hoursSlept` would be reported as "worsening" and the
   * person would be told their sleep is deteriorating while it improves. Every
   * measure-style tracker MUST set this, and the default is `false` only
   * because symptom trackers outnumber them.
   */
  higherIsBetter?: boolean
  /**
   * A completed-out-of-expected pair (doses taken vs due, tasks done vs
   * planned). Rendered as a percentage with its denominator, never as a bare
   * count — "18" means nothing without knowing whether it was out of 20 or 60.
   */
  ratioFields?: { numerator: string; denominator: string; label: string }
  /** Unit shown beside the mean, e.g. 'h', 'ml', 'spoons'. */
  unit?: string
  /**
   * Optional per-entry treatment-response rating the user actually gave.
   * THIS IS REAL EFFICACY DATA and it must be preferred over any inference.
   */
  responseField?: string
  /** Field naming the kind of episode. */
  episodeTypeField?: string
  /** Array fields, by role. Used for distributions and for comparisons. */
  listFields?: {
    treatments?: string[]
    triggers?: string[]
    locations?: string[]
    character?: string[]
    patterns?: string[]
  }
  /** Boolean escalation flags, by display label. */
  flagFields?: Record<string, string>
  /**
   * Fields holding attached images. Counted across the window, because "I have
   * 14 photos of this from the last 3 months" is genuinely useful to bring to
   * an appointment — a photograph of what a rash or a swelling did three weeks
   * ago is evidence no severity number can replace.
   */
  attachmentFields?: string[]
}

// ─── ENTRY NORMALISATION ────────────────────────────────────────────────────

export interface TrackerEntry {
  id?: string
  date?: string
  timestamp?: string
  [k: string]: unknown
}

/** A stored row as it comes out of daily_data. */
export interface DailyRecord {
  date?: string
  category?: string
  subcategory?: string
  content?: unknown
}

const TS_SUFFIX = /-\d{10,}$/
const UUID_SUFFIX = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reduce a stored `subcategory` to the tracker it belongs to.
 *
 * ⚠️ READ BEFORE "SIMPLIFYING" THIS.
 *
 * Two different things end up in that column, and only one of them is a bug:
 *
 *   'pain'                              a plain tracker key. Left alone.
 *   'medications-<uuid>'                DELIBERATE. Entity stores key rows by
 *                                       entity so one medication persists across
 *                                       dates — see lib/database/dedupe.ts.
 *                                       Normalising it here is correct for
 *                                       ANALYTICS (we want all medication rows
 *                                       grouped) but the entity id must never be
 *                                       stripped at the storage layer.
 *   'hydration-hydration-<timestamp>'   The name appears TWICE because the entry
 *                                       id already carries the prefix and the
 *                                       save prepends it again. Event-style
 *                                       trackers write one row per event, so
 *                                       every row lands in its own group.
 *
 * The third case is why several high-volume trackers had no analytics: anything
 * grouping on an exact subcategory match found one row per group and could not
 * compute anything. Their own pages were fine — they read with startsWith() —
 * so the failure was invisible from inside the tracker.
 *
 * This is fixed at the READ layer on purpose. Changing the write path would
 * break those working readers and would not help a single existing user without
 * a migration over everyone's stored rows. Normalising the question instead of
 * the data is retroactive, reversible, and touches nobody's records.
 */
export function trackerKeyOf(subcategory: string | undefined | null): string {
  if (!subcategory) return ''
  let s = subcategory.trim()
  s = s.replace(UUID_SUFFIX, '')
  s = s.replace(TS_SUFFIX, '')
  // collapse a doubled leading segment: 'sleep-sleep' -> 'sleep'
  const parts = s.split('-')
  if (parts.length >= 2 && parts[0] === parts[1]) {
    s = [parts[0], ...parts.slice(2)].join('-')
  }
  return s
}

function parseMaybeJson(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const t = v.trim()
  if (!t || (t[0] !== '{' && t[0] !== '[')) return v
  try {
    return JSON.parse(t)
  } catch {
    return v
  }
}

/**
 * Pull every entry belonging to `key` out of a set of stored rows.
 *
 * Handles all three storage shapes seen in the wild, because they all exist in
 * real exports and a reader that assumes one of them silently returns nothing:
 *   content = { entries: [...] }     the common case
 *   content = [...]                  a bare array
 *   content = { ...entry }           a single entry stored directly
 * plus any of the above still JSON-encoded as a string.
 */
export function collectEntries(records: DailyRecord[], key: string): TrackerEntry[] {
  const out: TrackerEntry[] = []
  for (const rec of records || []) {
    if (trackerKeyOf(rec?.subcategory) !== key) continue
    const content = parseMaybeJson(rec?.content)
    let candidates: unknown[] = []
    if (Array.isArray(content)) {
      candidates = content
    } else if (content && typeof content === 'object') {
      const maybe = (content as Record<string, unknown>).entries
      candidates = Array.isArray(maybe) ? maybe : [content]
    }
    for (const c of candidates) {
      const e = parseMaybeJson(c)
      if (e && typeof e === 'object' && !Array.isArray(e)) {
        const entry = e as TrackerEntry
        // Rows carry the date; entries do not always. Backfill so every
        // downstream time calculation has something to work with.
        if (!entry.date && rec?.date) entry.date = rec.date
        out.push(entry)
      }
    }
  }
  return out
}

// ─── FIELD ACCESS ───────────────────────────────────────────────────────────

function firstNumber(entry: TrackerEntry, fields: string[]): number | undefined {
  for (const f of fields) {
    const v = entry[f]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

function firstList(entry: TrackerEntry, fields: string[] | undefined): string[] {
  if (!fields) return []
  for (const f of fields) {
    const v = entry[f]
    if (Array.isArray(v)) return v.filter(x => typeof x === 'string' && x.trim() !== '') as string[]
    if (typeof v === 'string' && v.trim() !== '') return [v]
  }
  return []
}

/** Entry time as ms, preferring an explicit timestamp over the day bucket. */
function entryTime(entry: TrackerEntry): number | undefined {
  const ts = entry.timestamp
  if (typeof ts === 'string') {
    const t = Date.parse(ts)
    if (Number.isFinite(t)) return t
  }
  const d = entry.date
  if (typeof d === 'string') {
    const t = Date.parse(d.length <= 10 ? `${d}T12:00:00` : d)
    if (Number.isFinite(t)) return t
  }
  return undefined
}

// ─── RESULT TYPES ───────────────────────────────────────────────────────────

export interface Counted {
  label: string
  count: number
  /** Share of entries that mention it, 0..1. */
  share: number
}

export interface TrendResult {
  /** null when the sample cannot support a direction — render nothing. */
  direction: 'improving' | 'worsening' | 'stable' | null
  /** Change in severity units across the window (negative = improving). */
  change: number | null
  firstHalfMean: number | null
  secondHalfMean: number | null
  n: number
  /** Human-readable reason the direction is null, for a muted caption. */
  suppressedBecause?: string
}

export interface TreatmentComparison {
  label: string
  /** Mean severity on entries WHERE this treatment was recorded. */
  withMean: number
  withN: number
  /** Mean severity on entries where it was NOT. */
  withoutMean: number
  withoutN: number
  /** withMean - withoutMean. Negative means lower severity alongside it. */
  delta: number
  /** The user's own effectiveness rating, where the tracker collects one. */
  ratedEffectiveness: number | null
  ratedN: number
}

export interface TrackerAnalytics {
  key: string
  entries: number
  /** Distinct days with at least one entry. */
  days: number
  spanDays: number
  /** Entries per week. null below the floor — a rate from 2 points is a lie. */
  ratePerWeek: number | null
  severityMean: number | null
  severityPeak: number | null
  severityN: number
  /** severity - baseline, where the tracker records a baseline. */
  deltaMean: number | null
  deltaN: number
  /** Index = severity value, value = count. Length severityMax+1. */
  severityHistogram: number[]
  /** 24 buckets, index = local hour. */
  hourHistogram: number[]
  episodeTypes: Counted[]
  treatments: Counted[]
  triggers: Counted[]
  locations: Counted[]
  character: Counted[]
  patterns: Counted[]
  flags: Record<string, number>
  trend: TrendResult
  /**
   * Direction of HOW OFTEN, as distinct from how bad.
   *
   * For episodic conditions this is the more important of the two and often the
   * only one that moves. Seizures, dislocations and anaphylaxis do not
   * meaningfully get milder — they get more or less frequent, and a panel that
   * can only report severity will call a doubling of seizure frequency
   * "stable" because each one scored the same.
   */
  frequencyTrend: TrendResult
  /**
   * Honest treatment comparison. EMPTY when no treatment clears the arm floor
   * — an empty section says "not enough data yet", which is true, where a
   * frequency tally says "this one helped most", which may not be.
   */
  treatmentComparisons: TreatmentComparison[]
  /** Completed-out-of-expected, where the tracker records a pair. */
  ratio: { label: string; completed: number; expected: number; pct: number } | null
  /** Total attached images across the window. */
  attachments: number
  /** Mirrors config, so a renderer knows which way to point the arrow. */
  higherIsBetter: boolean
  unit?: string
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function mean(xs: number[]): number | null {
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/**
 * How many things does this value represent?
 *
 * The same conceptual quantity is stored three different ways across trackers,
 * and a reader that understands only one of them silently returns nothing:
 *   3                          already a count
 *   [a, b, c]                  a list of the things
 *   { a: true, b: false }      a map of thing -> done
 *   { a: '2026-06-08T12:00' }  a map of thing -> WHEN it was done
 *
 * ⚠️ THAT LAST SHAPE ALMOST SHIPPED A 0% ADHERENCE FIGURE. Doses due are a
 * list; doses taken are a map keyed by medication whose VALUE IS A TIMESTAMP,
 * not a boolean. A reader demanding `=== true` found a denominator of 254 and a
 * numerator of 0, and reported perfect non-adherence with total confidence.
 * Nothing threw. The only reason it was caught is that the number was checked
 * against reality instead of merely rendering.
 *
 * So: presence counts, and only an explicit negative is excluded. Anything
 * recorded against a slot means something happened in that slot.
 */
function countable(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  if (Array.isArray(v)) return v.length
  if (v && typeof v === 'object') {
    return Object.values(v as Record<string, unknown>).filter(
      x => x !== false && x !== null && x !== undefined && x !== '' && x !== 0,
    ).length
  }
  return undefined
}

function tally(lists: string[][], total: number): Counted[] {
  const c = new Map<string, number>()
  for (const list of lists) {
    // A single entry listing the same value twice must not count twice.
    for (const v of new Set(list)) c.set(v, (c.get(v) || 0) + 1)
  }
  return [...c.entries()]
    .map(([label, count]) => ({ label, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ─── THE ENGINE ─────────────────────────────────────────────────────────────

export function computeTrackerAnalytics(
  entries: TrackerEntry[],
  config: TrackerAnalyticsConfig,
): TrackerAnalytics {
  const max = config.severityMax ?? 10
  const list = config.listFields || {}

  // Sort by time so trend halves and spans mean what they say. Entries without
  // a usable time sink to the end rather than being dropped — they still count
  // toward totals and distributions, just not toward anything time-ordered.
  const timed = entries
    .map(e => ({ e, t: entryTime(e) }))
    .sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))

  const withTime = timed.filter(x => x.t !== undefined) as { e: TrackerEntry; t: number }[]

  const days = new Set(
    entries.map(e => (typeof e.date === 'string' ? e.date.slice(0, 10) : null)).filter(Boolean),
  ).size

  let spanDays = 0
  if (withTime.length >= 2) {
    spanDays = Math.max(1, Math.round((withTime[withTime.length - 1].t - withTime[0].t) / 86_400_000))
  }

  const ratePerWeek =
    entries.length >= FLOORS.rate && spanDays >= FLOORS.rateDays
      ? (entries.length / spanDays) * 7
      : null

  // severity
  const sevs: number[] = []
  const histogram = new Array(max + 1).fill(0)
  for (const e of entries) {
    const s = firstNumber(e, config.severityFields)
    if (s === undefined) continue
    sevs.push(s)
    const idx = Math.round(s)
    if (idx >= 0 && idx <= max) histogram[idx] += 1
  }

  // delta vs baseline
  const deltas: number[] = []
  if (config.baselineField) {
    for (const e of entries) {
      const s = firstNumber(e, config.severityFields)
      const b = firstNumber(e, [config.baselineField])
      if (s !== undefined && b !== undefined) deltas.push(s - b)
    }
  }

  // time of day — only from entries carrying a real timestamp. A date-only
  // entry has no hour, and bucketing it at midnight would invent a nocturnal
  // pattern that nobody reported.
  const hourHistogram = new Array(24).fill(0)
  for (const e of entries) {
    if (typeof e.timestamp !== 'string') continue
    const t = Date.parse(e.timestamp)
    if (!Number.isFinite(t)) continue
    hourHistogram[new Date(t).getHours()] += 1
  }

  const flags: Record<string, number> = {}
  for (const [label, field] of Object.entries(config.flagFields || {})) {
    flags[label] = entries.reduce((n, e) => n + (e[field] === true ? 1 : 0), 0)
  }

  // completed-out-of-expected. Both arms are summed across entries rather than
  // averaging per-entry percentages, because a day with 1 of 1 and a day with
  // 2 of 12 are not equally weighted observations.
  let ratio: TrackerAnalytics['ratio'] = null
  if (config.ratioFields) {
    let done = 0
    let due = 0
    for (const e of entries) {
      const num = countable(e[config.ratioFields.numerator])
      const den = countable(e[config.ratioFields.denominator])
      if (num !== undefined && den !== undefined && den > 0) {
        done += num
        due += den
      }
    }
    if (due > 0) {
      ratio = { label: config.ratioFields.label, completed: done, expected: due, pct: done / due }
    }
  }

  return {
    key: config.key,
    entries: entries.length,
    days,
    spanDays,
    ratePerWeek,
    severityMean: mean(sevs),
    severityPeak: sevs.length ? Math.max(...sevs) : null,
    severityN: sevs.length,
    deltaMean: mean(deltas),
    deltaN: deltas.length,
    severityHistogram: histogram,
    hourHistogram,
    episodeTypes: tally(
      entries.map(e =>
        config.episodeTypeField && typeof e[config.episodeTypeField] === 'string'
          ? [e[config.episodeTypeField] as string]
          : [],
      ),
      entries.length,
    ),
    treatments: tally(entries.map(e => firstList(e, list.treatments)), entries.length),
    triggers: tally(entries.map(e => firstList(e, list.triggers)), entries.length),
    locations: tally(entries.map(e => firstList(e, list.locations)), entries.length),
    character: tally(entries.map(e => firstList(e, list.character)), entries.length),
    patterns: tally(entries.map(e => firstList(e, list.patterns)), entries.length),
    flags,
    trend: computeTrend(withTime.map(x => x.e), config),
    frequencyTrend: computeFrequencyTrend(withTime.map(x => x.e)),
    treatmentComparisons: compareTreatments(entries, config),
    ratio,
    attachments: (config.attachmentFields || []).reduce(
      (n, f) => n + entries.reduce((m, e) => m + (Array.isArray(e[f]) ? (e[f] as unknown[]).length : 0), 0),
      0,
    ),
    higherIsBetter: !!config.higherIsBetter,
    unit: config.unit,
  }
}

/**
 * Direction of travel across the window.
 *
 * Split-half rather than a regression slope, deliberately. A slope over a dozen
 * irregularly-spaced points is easy to compute, hard to defend, and trivially
 * dragged by one bad day at an endpoint. Comparing the mean of the earlier half
 * against the later half is cruder, far more robust, and — the part that
 * matters — explainable in one sentence to a doctor who is entitled to ask how
 * the number was produced.
 *
 * `entries` must already be sorted by time.
 */
export function computeTrend(
  entries: TrackerEntry[],
  config: TrackerAnalyticsConfig,
): TrendResult {
  const sevs = entries
    .map(e => firstNumber(e, config.severityFields))
    .filter((v): v is number => v !== undefined)

  if (sevs.length < FLOORS.trend) {
    return {
      direction: null,
      change: null,
      firstHalfMean: null,
      secondHalfMean: null,
      n: sevs.length,
      suppressedBecause: `${sevs.length} of ${FLOORS.trend} entries needed`,
    }
  }

  const mid = Math.floor(sevs.length / 2)
  const a = mean(sevs.slice(0, mid))!
  const b = mean(sevs.slice(sevs.length - mid))!
  const change = b - a

  // Under a fifth of a point of movement on a 0-10 scale is not a direction,
  // it is rounding. Calling it "improving" would be the sort of confident
  // noise this engine exists to refuse.
  const STABLE_BAND = 0.2

  // ⚠️ Direction depends on which way "good" points. For a symptom, a rising
  // number is worse; for hours slept or fluid intake it is better. Getting this
  // backwards tells someone their best month was a decline, in the app they
  // use to decide whether a treatment is working.
  const worseWhenRising = !config.higherIsBetter
  const gotWorse = worseWhenRising ? change > 0 : change < 0

  const direction =
    Math.abs(change) < STABLE_BAND ? 'stable' : gotWorse ? 'worsening' : 'improving'

  return { direction, change, firstHalfMean: a, secondHalfMean: b, n: sevs.length }
}

/**
 * Is this happening MORE or LESS often?
 *
 * Splits the observed span down the middle by TIME (not by entry count — that
 * would make both halves equal by construction and the answer always "stable")
 * and compares events per week either side.
 *
 * ⚠️ More events is worse, always — `higherIsBetter` describes the SEVERITY
 * scale, not the event rate. Nobody wants more seizures because higher hours
 * of sleep are good. This is the one place that flag must not be consulted.
 *
 * 🚨 THE ADOPTION ARTEFACT — THE REASON THE FLOOR BELOW IS PER-HALF.
 *
 * The first version of this floored only the TOTAL entry count, and against a
 * real export it reported "more often" for almost every tracker in the app,
 * typically 0.1/wk rising to 1–4/wk. That was not disease progression. It was
 * somebody starting to use the tracker: sparse entries months ago, dense
 * entries recently. The metric was measuring LOGGING BEHAVIOUR and printing it
 * as SYMPTOM FREQUENCY.
 *
 * The giveaway was hydration — nobody drinks thirty-seven times more water,
 * they just start recording it. Had that shipped, the app would have told
 * people their seizures were becoming more frequent, in a document intended
 * for a neurologist, when all that changed was that they started writing them
 * down.
 *
 * So each half must independently clear the floor. One entry in the earlier
 * half is not a baseline rate, it is a single event with a denominator
 * attached. And even when both halves qualify, the caller must say out loud
 * that this reflects logged events — see the panel's caption.
 *
 * `entries` must already be sorted by time.
 */
export function computeFrequencyTrend(entries: TrackerEntry[]): TrendResult {
  const times = entries
    .map(entryTime)
    .filter((t): t is number => t !== undefined)
    .sort((a, b) => a - b)

  const spanDays = times.length >= 2 ? (times[times.length - 1] - times[0]) / 86_400_000 : 0

  // Needs both enough events AND enough span. Two weeks of data cannot show a
  // change in frequency no matter how many events are in it.
  if (times.length < FLOORS.trend || spanDays < FLOORS.rateDays * 2) {
    return {
      direction: null,
      change: null,
      firstHalfMean: null,
      secondHalfMean: null,
      n: times.length,
      suppressedBecause:
        times.length < FLOORS.trend
          ? `${times.length} of ${FLOORS.trend} entries needed`
          : `needs at least ${FLOORS.rateDays * 2} days of history`,
    }
  }

  const mid = times[0] + (times[times.length - 1] - times[0]) / 2
  const halfDays = spanDays / 2
  const firstN = times.filter(t => t < mid).length
  const secondN = times.length - firstN

  // ⚠️ PER-HALF FLOOR. Without this, a tracker with two entries in its first
  // three months and twenty in its last three reports a dramatic worsening
  // that is entirely an artefact of the user adopting the app.
  if (firstN < FLOORS.comparisonArm || secondN < FLOORS.comparisonArm) {
    return {
      direction: null,
      change: null,
      firstHalfMean: null,
      secondHalfMean: null,
      n: times.length,
      suppressedBecause: `needs ${FLOORS.comparisonArm}+ entries in each half of the window (have ${firstN} and ${secondN})`,
    }
  }

  const first = (firstN / halfDays) * 7
  const second = (secondN / halfDays) * 7

  const change = second - first
  // Under a quarter of an event per week is not a change in frequency.
  const STABLE_BAND = 0.25
  const direction =
    Math.abs(change) < STABLE_BAND ? 'stable' : change > 0 ? 'worsening' : 'improving'

  return { direction, change, firstHalfMean: first, secondHalfMean: second, n: times.length }
}

/**
 * What actually helped — as far as the data can honestly say.
 *
 * ⚠️ THIS REPLACES A FREQUENCY TALLY THAT WAS LABELLED AS EFFICACY. Counting
 * mentions ranks the most-logged treatment first no matter what it did, and a
 * clinician reading a card headed "what helped" will not read it as "what you
 * typed most often".
 *
 * Two honest sources, in order of preference:
 *
 *  1. `responseField` — the user's OWN effectiveness rating for that entry.
 *     Direct testimony. Always preferred where the tracker collects it.
 *  2. Severity alongside vs without. Observational and confounded — you reach
 *     for a treatment BECAUSE it is a bad day, which biases it toward looking
 *     harmful. Reported as a difference with both sample sizes attached, never
 *     as a ranking and never with causal wording.
 *
 * Anything failing the arm floor is omitted entirely rather than shown with a
 * caveat, because a number on screen outlives its caveat.
 */
export function compareTreatments(
  entries: TrackerEntry[],
  config: TrackerAnalyticsConfig,
): TreatmentComparison[] {
  const fields = config.listFields?.treatments
  if (!fields) return []

  const rows = entries.map(e => ({
    treatments: new Set(firstList(e, fields)),
    severity: firstNumber(e, config.severityFields),
    response: config.responseField ? firstNumber(e, [config.responseField]) : undefined,
  }))

  const labels = new Set<string>()
  for (const r of rows) for (const t of r.treatments) labels.add(t)

  const out: TreatmentComparison[] = []
  for (const label of labels) {
    const withArm = rows.filter(r => r.treatments.has(label))
    const withoutArm = rows.filter(r => !r.treatments.has(label))

    const withSev = withArm.map(r => r.severity).filter((v): v is number => v !== undefined)
    const withoutSev = withoutArm.map(r => r.severity).filter((v): v is number => v !== undefined)

    if (withSev.length < FLOORS.comparisonArm || withoutSev.length < FLOORS.comparisonArm) continue

    const rated = withArm.map(r => r.response).filter((v): v is number => v !== undefined)

    const withMean = mean(withSev)!
    const withoutMean = mean(withoutSev)!
    out.push({
      label,
      withMean,
      withN: withSev.length,
      withoutMean,
      withoutN: withoutSev.length,
      delta: withMean - withoutMean,
      ratedEffectiveness: rated.length ? mean(rated) : null,
      ratedN: rated.length,
    })
  }

  // Rank by the user's own rating where it exists, else by observed difference.
  // On a measure where higher is better, a POSITIVE delta is the good one, so
  // the sort has to flip with it.
  const better = config.higherIsBetter ? -1 : 1
  return out.sort((a, b) => {
    if (a.ratedEffectiveness !== null && b.ratedEffectiveness !== null) {
      return b.ratedEffectiveness - a.ratedEffectiveness
    }
    if (a.ratedEffectiveness !== null) return -1
    if (b.ratedEffectiveness !== null) return 1
    return (a.delta - b.delta) * better
  })
}

/**
 * Convenience: records in, analytics out. The path most panels want.
 */
export function analyzeRecords(
  records: DailyRecord[],
  config: TrackerAnalyticsConfig,
): TrackerAnalytics {
  return computeTrackerAnalytics(collectEntries(records, config.key), config)
}
