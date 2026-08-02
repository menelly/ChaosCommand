/*
 * TREND ANALYSIS — "is this getting better?"
 *
 * WHY THIS EXISTS (2026-08-02, from a user reading a real exported report)
 * -----------------------------------------------------------------------
 *   Nothing in the report was geared to show whether anything was IMPROVING.
 *   Improvements were being reported into the app and the generated document
 *   never said so — a real gap, in the app's headline feature.
 *
 * This is not cosmetic. Insurance authorization for ongoing therapy turns on demonstrated
 * benefit. A report that says "mean severity 7.0/10, peak 9/10" reads as
 * unchanged and severe. A report that says "swallowing 5.0 -> 1.0 over six
 * weeks" is the evidence for continuing the therapy that caused it. Command was
 * already collecting the proof and throwing it away at the summary step.
 *
 * THREE THINGS THIS MODULE DOES THAT THE OLD INLINE TREND DID NOT
 * ---------------------------------------------------------------
 * 1. It reports EVERY series it can compute, including the ones with no trend.
 *    The old code returned nothing below a 15% change, and silence is
 *    indistinguishable from "no change" — a reader cannot tell a symptom that
 *    held steady from a symptom the engine refused to look at.
 * 2. It uses a rank test (Mann-Kendall, tie-corrected) instead of a flat percent
 *    threshold, so a consistent small improvement over fifty entries is not
 *    discarded while a single 40% swing over four is treated as fact.
 * 3. It knows that not every scale points the same way. On a mood or energy
 *    scale a rising number is GOOD news, and calling that "worsening" would put
 *    a false statement in a medical document.
 *
 * ON SAMPLE SIZE — deliberately permissive, never silent
 * ------------------------------------------------------
 * The floor is THREE points, which is low, and that is on purpose. The old
 * floor of ten excluded seizure, dysautonomia, autoimmune, cardiac and
 * respiratory outright on a real user's data — every one of them silent by
 * construction no matter how dramatic the change. A rare symptom is not a less
 * important symptom. Small series are emitted with `preliminary: true` and
 * wording that says so out loud, because reporting a weak finding honestly beats
 * hiding it. (Same principle as the app's standing rule against plausibility
 * filters on medical data: a zero from an instrument that could not have
 * measured looks exactly like an absence, and it is not one.)
 *
 * — Ace 🐙, 2026-08-02
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TrendPoint {
  date: string   // ISO yyyy-mm-dd
  value: number
}

export type TrendDirection = 'improving' | 'worsening' | 'no-clear-direction'
export type TrendStrength = 'strong' | 'moderate' | 'preliminary'
export type ScaleDirection = 'higher-is-worse' | 'higher-is-better'

export interface TrendResult {
  n: number
  firstDate: string
  lastDate: string
  spanDays: number
  earlyAvg: number
  lateAvg: number
  /** lateAvg - earlyAvg, in the scale's own units. Sign is RAW, not clinical. */
  absoluteChange: number
  percentChange: number
  /** Kendall's tau-b, -1..1. Negative = values falling over time. */
  tau: number
  /** Two-sided p from the tie-corrected normal approximation. */
  pValue: number
  direction: TrendDirection
  strength: TrendStrength
  preliminary: boolean
}

export interface SymptomTrend extends TrendResult {
  tracker: string
  trackerLabel: string
  /** null means "the whole tracker averaged together" (the old behaviour, kept
   *  because it answers a different and still-real question). */
  symptomId: string | null
  symptomLabel: string
  scaleDirection: ScaleDirection
  /** One printable sentence, safe to drop straight into a PDF. */
  summary: string
}

// ============================================================================
// SCALE SEMANTICS
// ============================================================================

/**
 * Fields where a HIGHER number is BETTER. Everything else defaults to
 * higher-is-worse, which is what the rest of the engine has always assumed and
 * is correct for the overwhelming majority of trackers.
 *
 * Keyed by the severity FIELD actually read, not by tracker, because one tracker
 * can store more than one kind of scale.
 *
 * ⚠️ `level` and `rating` are deliberately absent. They are generic names used
 * by several trackers in both directions, and guessing wrong would print a
 * backwards claim in a medical report. They keep the default; if a specific
 * tracker's `rating` is known to be higher-is-better, add it here explicitly
 * rather than widening the rule.
 */
const HIGHER_IS_BETTER_FIELDS = new Set(['mood', 'energyLevel', 'energy'])

export function scaleDirectionForField(field: string | null | undefined): ScaleDirection {
  return field && HIGHER_IS_BETTER_FIELDS.has(field) ? 'higher-is-better' : 'higher-is-worse'
}

// ============================================================================
// STATISTICS
// ============================================================================

/** Abramowitz & Stegun 7.1.26 — max absolute error 1.5e-7, ample here. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}

/** Two-sided p-value for a standard normal z. */
function twoSidedP(z: number): number {
  return Math.max(0, Math.min(1, 1 - erf(Math.abs(z) / Math.SQRT2)))
}

/** Σ t(t-1)(2t+5) and Σ t(t-1)/2 over groups of tied values. */
function tieSums(values: (number | string)[]): { varTerm: number; pairTerm: number } {
  const counts = new Map<number | string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  let varTerm = 0
  let pairTerm = 0
  for (const t of counts.values()) {
    if (t < 2) continue
    varTerm += t * (t - 1) * (2 * t + 5)
    pairTerm += (t * (t - 1)) / 2
  }
  return { varTerm, pairTerm }
}

/**
 * Mann-Kendall trend test with tie correction, plus Kendall's tau-b.
 *
 * A rank test rather than a regression because severity is ordinal — the step
 * from 3 to 4 is not reliably the same size as the step from 8 to 9, and a
 * patient's "moderate" is not a measured quantity. Rank tests do not assume it
 * is. They are also robust to the one catastrophic day that would drag a least-
 * squares line around by itself.
 *
 * Ties matter twice here and both are corrected: tied SEVERITIES (people log the
 * same number repeatedly) and tied DATES (several entries on one day).
 */
export function mannKendall(points: TrendPoint[]): { tau: number; pValue: number; s: number } {
  const n = points.length
  if (n < 3) return { tau: 0, pValue: 1, s: 0 }

  let s = 0
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = points[j].value - points[i].value
      s += d > 0 ? 1 : d < 0 ? -1 : 0
    }
  }

  const valueTies = tieSums(points.map(p => p.value))
  const dateTies = tieSums(points.map(p => p.date))

  const n0 = (n * (n - 1)) / 2
  const denom = Math.sqrt((n0 - valueTies.pairTerm) * (n0 - dateTies.pairTerm))
  const tau = denom > 0 ? s / denom : 0

  const varS = (n * (n - 1) * (2 * n + 5) - valueTies.varTerm - dateTies.varTerm) / 18
  if (varS <= 0) return { tau, pValue: 1, s }

  // Continuity correction: pull |S| one step toward zero before standardizing.
  const z = (s - Math.sign(s)) / Math.sqrt(varS)
  return { tau, pValue: twoSidedP(z), s }
}

/**
 * Mann-Whitney U (Wilcoxon rank-sum) with tie correction — "are these two
 * groups drawn from the same distribution?"
 *
 * Used for before-treatment vs since-treatment comparisons. A rank test again,
 * for the same reason as above (severity is ordinal, and one catastrophic day
 * should not decide the answer) and additionally because the two groups are
 * usually different sizes and different variances, which a t-test handles
 * badly.
 *
 * Returns the rank-biserial correlation as the effect size: -1..1, where a
 * negative value means group B tends to sit LOWER than group A.
 */
export function mannWhitneyU(a: number[], b: number[]): { pValue: number; effect: number } {
  const na = a.length, nb = b.length
  if (na < 2 || nb < 2) return { pValue: 1, effect: 0 }

  const all = [...a.map(v => ({ v, g: 0 })), ...b.map(v => ({ v, g: 1 }))]
    .sort((x, y) => x.v - y.v)

  // Midranks for ties.
  const ranks = new Array<number>(all.length)
  let tieVarTerm = 0
  let i = 0
  while (i < all.length) {
    let j = i
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++
    const midrank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[k] = midrank
    const t = j - i + 1
    if (t > 1) tieVarTerm += t * t * t - t
    i = j + 1
  }

  let rankSumA = 0
  for (let k = 0; k < all.length; k++) if (all[k].g === 0) rankSumA += ranks[k]

  const uA = rankSumA - (na * (na + 1)) / 2
  const n = na + nb
  const meanU = (na * nb) / 2
  const varU = ((na * nb) / 12) * ((n + 1) - tieVarTerm / (n * (n - 1)))
  if (varU <= 0) return { pValue: 1, effect: 0 }

  const z = (uA - meanU - Math.sign(uA - meanU) * 0.5) / Math.sqrt(varU)
  // Rank-biserial: +1 means every A value exceeds every B value. Negated so the
  // sign matches "B is lower than A" = negative = a drop after treatment.
  const effect = -(2 * uA / (na * nb) - 1)
  return { pValue: twoSidedP(z), effect }
}

// ============================================================================
// TREND COMPUTATION
// ============================================================================

/** Below this we cannot say anything at all — two points is a line, not a trend. */
export const MIN_POINTS = 3
/** At or below this, everything is flagged preliminary regardless of the p-value. */
const PRELIMINARY_N = 5
/** A change this large is worth reporting even when n is too small for the test
 *  to reach significance. A real symptom went 5 -> 1 on three entries; a purely
 *  statistical gate would have thrown away the finding the report exists for. */
const NOTABLE_PCT = 25

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a)
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : 0
}

/**
 * Compute the trend for one series. Returns null ONLY when there is genuinely
 * not enough data to compute anything — never as a way of hiding a weak result.
 */
export function computeTrend(rawPoints: TrendPoint[]): TrendResult | null {
  const points = rawPoints
    .filter(p => p && Number.isFinite(p.value) && !!p.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  const n = points.length
  if (n < MIN_POINTS) return null

  // Early third vs late third. With small n the thirds collapse toward single
  // points, which is fine — it is still first-versus-last, just noisier, and the
  // preliminary flag says so.
  const third = Math.max(1, Math.floor(n / 3))
  const early = points.slice(0, third)
  const late = points.slice(-third)
  const mean = (xs: TrendPoint[]) => xs.reduce((sum, p) => sum + p.value, 0) / xs.length
  const earlyAvg = mean(early)
  const lateAvg = mean(late)

  const absoluteChange = lateAvg - earlyAvg
  const percentChange = earlyAvg !== 0 ? (absoluteChange / earlyAvg) * 100 : 0

  const { tau, pValue } = mannKendall(points)

  // Two independent routes to declaring a direction. The statistical route
  // catches consistent-but-small movement across many entries; the magnitude
  // route catches large movement across few. Requiring both would silence the
  // rare-symptom case, and requiring neither would report noise.
  const statistical = pValue < 0.10
  const large = Math.abs(percentChange) >= NOTABLE_PCT
  const hasDirection = (statistical || large) && absoluteChange !== 0

  const strength: TrendStrength =
    pValue < 0.05 && n >= 8 ? 'strong'
      : pValue < 0.10 && n > PRELIMINARY_N ? 'moderate'
        : 'preliminary'

  return {
    n,
    firstDate: points[0].date,
    lastDate: points[n - 1].date,
    spanDays: daysBetween(points[0].date, points[n - 1].date),
    earlyAvg,
    lateAvg,
    absoluteChange,
    percentChange,
    tau,
    pValue,
    // Raw direction only — "rising" or "falling". Whether that is good or bad
    // depends on the scale, and is resolved by the caller.
    direction: hasDirection ? (absoluteChange < 0 ? 'improving' : 'worsening') : 'no-clear-direction',
    strength,
    preliminary: strength === 'preliminary' || n <= PRELIMINARY_N,
  }
}

/**
 * Apply scale semantics to a raw trend. `computeTrend` reports FALLING as
 * "improving" because that is right for severity scales; on a mood or energy
 * scale it is exactly backwards, and a backwards claim in a medical document is
 * worse than no claim.
 */
export function applyScaleDirection(t: TrendResult, scale: ScaleDirection): TrendResult {
  if (scale !== 'higher-is-better' || t.direction === 'no-clear-direction') return t
  return { ...t, direction: t.direction === 'improving' ? 'worsening' : 'improving' }
}

// ============================================================================
// WORDS
// ============================================================================

const DIRECTION_WORD: Record<TrendDirection, string> = {
  'improving': 'IMPROVING',
  'worsening': 'WORSENING',
  'no-clear-direction': 'NO CLEAR DIRECTION',
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : iso
}

/**
 * One sentence a clinician can read without decoding anything. Always states the
 * numbers, always states n, and says "preliminary" out loud when it is.
 */
export function describeTrend(label: string, t: TrendResult): string {
  const word = DIRECTION_WORD[t.direction]
  const nums = `${t.earlyAvg.toFixed(1)} → ${t.lateAvg.toFixed(1)}`
  const window = t.spanDays >= 1 ? ` (${fmtDate(t.firstDate)}–${fmtDate(t.lastDate)})` : ''
  const sample = `n=${t.n}`

  if (t.direction === 'no-clear-direction') {
    return `${label}: NO CLEAR DIRECTION — averaged ${t.earlyAvg.toFixed(1)} early vs ${t.lateAvg.toFixed(1)} recently${window}, ${sample}. Recorded because "no trend detected" and "not looked at" are different things.`
  }

  // POINTS, NOT PERCENT — from a user reading a card headed "WORSENING 300%"
  // (2026-08-02) and asking, reasonably, where 300% had come from.
  //
  // It was getting it from (4 - 1) / 1. Arithmetically true, clinically
  // meaningless: on a bounded ordinal scale a low baseline manufactures huge
  // percentages, so a three-point move on a ten-point scale reads as a
  // catastrophe. Worse, it isn't even a ratio scale — a 4 is not "four times" a
  // 1, because the numbers are ranked labels, not quantities. Percent change
  // assumes a true zero and equal intervals; severity scales have neither.
  //
  // So the headline is the POINT change, which is what the scale can actually
  // support. Percent is kept only as a parenthetical, and only when the
  // baseline is big enough for the ratio not to be noise — below 3 it is
  // dropped entirely rather than printed with a caveat nobody reads.
  const pts = Math.abs(t.absoluteChange)
  const ptsStr = `${pts.toFixed(1)} point${pts === 1 ? '' : 's'}`
  const pct = Math.abs(Math.round(t.percentChange))
  const ratio = t.earlyAvg >= 3 ? `, ${pct}%` : ''
  /*
   * Two DIFFERENT weaknesses, described differently. Lumping them under one
   * "preliminary" label produced "Preliminary — only 23 entries in this
   * series", which is not a sentence anyone should read in a medical report:
   * 23 is a perfectly good sample, and the actual problem there was that the
   * movement wasn't consistent. Say which one it is.
   */
  const fewPoints = t.n <= 5
  const inconsistent = t.pValue >= 0.10
  const caveat = fewPoints
    ? ` Preliminary — only ${t.n} entr${t.n === 1 ? 'y' : 'ies'} in this series.`
    : inconsistent
      ? ` Direction is not consistent entry-to-entry (p≈${t.pValue.toFixed(2)}) — the averages moved, but the day-to-day pattern is noisy.`
      : t.strength === 'strong'
        ? ` Consistent across the period (p≈${t.pValue.toFixed(3)}).`
        : ''

  return `${label}: ${word} — ${nums} (${ptsStr}${ratio})${window}, ${sample}.${caveat}`
}
