/*
 * GOLDEN — trend-analysis
 *
 * The claims under test are ones that go into a document a doctor reads and an
 * insurer uses to decide whether to keep paying for a therapy. Getting the
 * direction backwards, or reporting a coin-flip as a finding, is not a cosmetic
 * bug. Each case below is a thing the OLD trend code got wrong on a real
 * user's data (2026-08-02), pinned so it cannot come back.
 *
 * Framework-free by house convention: assert, print, exit non-zero.
 */

import {
  computeTrend, applyScaleDirection, describeTrend, mannKendall,
  scaleDirectionForField, MIN_POINTS, type TrendPoint,
} from '../trend-analysis'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { console.log(`  PASS  ${name}`) }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
}

/** Build a series with one entry per day starting at a fixed date. */
function series(values: number[], startDay = 1): TrendPoint[] {
  return values.map((value, i) => ({
    date: `2026-06-${String(startDay + i).padStart(2, '0')}`,
    value,
  }))
}

console.log('\ntrend-analysis goldens\n')

// ---------------------------------------------------------------------------
console.log('THE CASE THIS FEATURE EXISTS FOR')
// ---------------------------------------------------------------------------
{
  // A symptom resolving under treatment: 5 -> 3 -> 1. Three entries, an 80%
  // recovery, and the old engine reported NOTHING — it required ten entries.
  const t = computeTrend(series([5, 3, 1]))
  check('a 5→3→1 recovery produces a trend at all', t !== null)
  check('it is reported IMPROVING', t?.direction === 'improving', `got ${t?.direction}`)
  check('it is flagged preliminary at n=3', t?.preliminary === true)
  check('percent change is ~-80%', Math.round(t!.percentChange) === -80, `got ${t?.percentChange}`)

  const words = describeTrend('Neuro — Speech / Swallowing', t!)
  check('the sentence contains the word IMPROVING', /IMPROVING/.test(words), words)
  check('the sentence says preliminary out loud', /[Pp]reliminary/.test(words), words)
  check('the sentence carries the numbers', words.includes('5.0') && words.includes('1.0'), words)
}

{
  // ...and the reason it was invisible: averaged with a symptom that did not
  // move, the tracker as a whole looks flat. Both series are real; the old code
  // only ever computed this one.
  const swallow = computeTrend(series([5, 3, 1]))!
  const weakness = computeTrend(series([9, 6, 6, 5]))!
  const pooled = computeTrend([...series([5, 3, 1]), ...series([9, 6, 6, 5])])!
  check('pooled series dilutes the recovery', Math.abs(pooled.percentChange) < Math.abs(swallow.percentChange),
    `pooled ${pooled.percentChange.toFixed(1)}% vs swallow ${swallow.percentChange.toFixed(1)}%`)
  check('weakness is still detected separately', weakness.direction === 'improving')
}

// ---------------------------------------------------------------------------
console.log('\nPOINTS, NOT PERCENT — "where is it getting 300%?"')
// ---------------------------------------------------------------------------
{
  // A real card from real data: five entries where a sub-scale reading went
  // 1 -> 4, reported as "WORSENING 300%". Arithmetically
  // true and clinically absurd — on a bounded ordinal scale a low baseline
  // manufactures enormous percentages, and these are ranked labels anyway, so
  // a 4 is not "four times" a 1.
  const t = computeTrend(series([1, 1, 2, 4, 4]))!
  const words = describeTrend('Mental Health overall', t)
  check('the 1→4 case leads with POINTS', /point/.test(words), words)
  check('...and never prints "300%"', !/300%/.test(words), words)
  // Percent is suppressed entirely below a baseline of 3, rather than printed
  // with a caveat nobody reads.
  check('...and suppresses percent on a tiny baseline', !/%/.test(words), words)
  check('the raw percentChange is still available to callers',
    Math.round(t.percentChange) === 300, String(t.percentChange))

  // With a baseline big enough for a ratio to mean something, percent returns
  // as a parenthetical.
  const big = computeTrend(series([8, 7, 6, 5, 4]))!
  const bigWords = describeTrend('Pain', big)
  check('a healthy baseline shows percent alongside points',
    /point/.test(bigWords) && /%/.test(bigWords), bigWords)
}

// ---------------------------------------------------------------------------
console.log('\nSCALE DIRECTION — a backwards claim is worse than no claim')
// ---------------------------------------------------------------------------
{
  const rising = computeTrend(series([2, 4, 6, 8]))!
  check('rising severity is WORSENING', rising.direction === 'worsening')

  const asMood = applyScaleDirection(rising, 'higher-is-better')
  check('rising MOOD is IMPROVING, not worsening', asMood.direction === 'improving', `got ${asMood.direction}`)

  const falling = applyScaleDirection(computeTrend(series([8, 6, 4, 2]))!, 'higher-is-better')
  check('falling energy is WORSENING', falling.direction === 'worsening')

  check('mood is a higher-is-better field', scaleDirectionForField('mood') === 'higher-is-better')
  check('energyLevel is a higher-is-better field', scaleDirectionForField('energyLevel') === 'higher-is-better')
  check('painLevel is a higher-is-worse field', scaleDirectionForField('painLevel') === 'higher-is-worse')
  // Deliberately NOT flipped: generic names used both ways across trackers.
  check('generic "rating" keeps the safe default', scaleDirectionForField('rating') === 'higher-is-worse')
  check('an unknown field keeps the safe default', scaleDirectionForField('wibble') === 'higher-is-worse')
  check('a missing field keeps the safe default', scaleDirectionForField(null) === 'higher-is-worse')

  // A flat series has no direction to flip, and flipping must not invent one.
  const flat = applyScaleDirection(computeTrend(series([5, 5, 5, 5]))!, 'higher-is-better')
  check('flipping a directionless trend leaves it directionless', flat.direction === 'no-clear-direction')
}

// ---------------------------------------------------------------------------
console.log('\nSILENCE IS NOT AN ANSWER')
// ---------------------------------------------------------------------------
{
  const flat = computeTrend(series([5, 5, 5, 5, 5, 5]))
  check('a genuinely flat series still RETURNS a result', flat !== null)
  check('a flat series says no clear direction', flat?.direction === 'no-clear-direction')
  const words = describeTrend('Neuro — Weakness', flat!)
  check('the flat sentence explains itself rather than staying silent',
    /NO CLEAR DIRECTION/.test(words) && /different things/.test(words), words)
}

{
  // Noise must not read as a finding.
  const noisy = computeTrend(series([5, 8, 3, 7, 4, 6, 5, 7, 4, 6]))
  check('a bouncing series is not called a trend', noisy?.direction === 'no-clear-direction',
    `got ${noisy?.direction} p=${noisy?.pValue.toFixed(3)}`)
}

// ---------------------------------------------------------------------------
console.log('\nSAMPLE SIZE IS REPORTED, NOT USED AS A GATE')
// ---------------------------------------------------------------------------
{
  check('two points is not a trend', computeTrend(series([9, 1])) === null)
  check('one point is not a trend', computeTrend(series([9])) === null)
  check('zero points is not a trend', computeTrend([]) === null)
  check('the floor is three', MIN_POINTS === 3)

  // The old flat 15% rule threw this away. It is a real, consistent improvement.
  const small = computeTrend(series([10, 10, 9, 9, 9, 9, 8, 9, 8, 8, 8, 8, 8, 7]))
  check('a small but consistent improvement over many entries is detected',
    small?.direction === 'improving', `got ${small?.direction} (${small?.percentChange.toFixed(1)}%)`)
  check('...and is NOT flagged preliminary at n=14', small?.preliminary === false)

  // ...while a big swing on few entries is detected but hedged.
  const jumpy = computeTrend(series([8, 2, 3]))
  check('a big swing on 3 entries is still reported', jumpy?.direction === 'improving')
  check('...but flagged preliminary', jumpy?.preliminary === true)
  check('...and its sentence names the sample size', /n=3/.test(describeTrend('X', jumpy!)))
}

// ---------------------------------------------------------------------------
console.log('\nMANN-KENDALL')
// ---------------------------------------------------------------------------
{
  const up = mannKendall(series([1, 2, 3, 4, 5, 6, 7, 8]))
  check('perfect increase gives tau = 1', Math.abs(up.tau - 1) < 1e-9, `tau=${up.tau}`)
  check('perfect increase is significant', up.pValue < 0.01, `p=${up.pValue}`)

  const down = mannKendall(series([8, 7, 6, 5, 4, 3, 2, 1]))
  check('perfect decrease gives tau = -1', Math.abs(down.tau + 1) < 1e-9, `tau=${down.tau}`)

  const same = mannKendall(series([4, 4, 4, 4, 4]))
  check('an all-tied series has tau 0 and p 1', same.tau === 0 && same.pValue === 1)

  // Several entries on ONE day are ties in time, not evidence of a trend over
  // time. Without the date-tie correction this reads as a strong signal.
  const sameDay: TrendPoint[] = [1, 3, 5, 7, 9].map(v => ({ date: '2026-06-01', value: v }))
  const t = computeTrend(sameDay)
  check('five entries on a single day is not a trend over time',
    t?.direction === 'no-clear-direction' || t!.pValue > 0.10,
    `p=${t?.pValue.toFixed(3)} dir=${t?.direction}`)

  check('p-values stay in [0,1]', [up, down, same].every(r => r.pValue >= 0 && r.pValue <= 1))
}

// ---------------------------------------------------------------------------
console.log('\nDATES AND ROBUSTNESS')
// ---------------------------------------------------------------------------
{
  // Input order must not matter — records do not arrive sorted.
  const forwards = computeTrend(series([9, 7, 5, 3]))!
  const shuffled = computeTrend([series([9, 7, 5, 3])[2], series([9, 7, 5, 3])[0], series([9, 7, 5, 3])[3], series([9, 7, 5, 3])[1]])!
  check('unsorted input gives the same answer', forwards.percentChange === shuffled.percentChange && forwards.tau === shuffled.tau)
  check('span is measured across the real window', forwards.spanDays === 3, `got ${forwards.spanDays}`)
  check('first/last dates are the real endpoints',
    forwards.firstDate === '2026-06-01' && forwards.lastDate === '2026-06-04')

  // Junk must be dropped, not crash and not count.
  const dirty = computeTrend([
    ...series([6, 4, 2]),
    { date: '', value: 5 } as TrendPoint,
    { date: '2026-06-09', value: NaN } as TrendPoint,
  ])
  check('blank dates and NaN values are dropped', dirty?.n === 3, `n=${dirty?.n}`)

  // An early average of zero cannot produce a percentage; it must not produce
  // Infinity either, and the report must still be able to say something.
  const fromZero = computeTrend(series([0, 0, 4, 6]))
  check('a zero baseline does not yield Infinity', Number.isFinite(fromZero!.percentChange))
  check('a zero baseline still reports the absolute move', fromZero!.absoluteChange > 0)
}

console.log(failures === 0 ? '\nAll trend-analysis goldens passed.\n' : `\n${failures} FAILURE(S).\n`)
process.exit(failures === 0 ? 0 : 1)
