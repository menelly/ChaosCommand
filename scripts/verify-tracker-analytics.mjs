/*
 * Runs the REAL lib/tracker-analytics.ts against a real export and prints what
 * each panel would show. Not a reimplementation — jiti loads the actual module,
 * so if this prints a good number the shipped code produces that number.
 *
 * Usage:  node scripts/verify-tracker-analytics.mjs <export.json>
 *
 * ⚠️ Point it at YOUR OWN export. It prints aggregate statistics from personal
 *    health data — keep the output local, never paste it into a commit, a
 *    ticket, or an issue.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)
const jiti = require('jiti')(path.join(process.cwd(), 'scripts', 'x.js'), { esmResolve: true })

const { trackerKeyOf, collectEntries, computeTrackerAnalytics } = jiti('../lib/tracker-analytics.ts')
const { analyticsConfigFor, TRACKER_ANALYTICS } = jiti('../lib/tracker-analytics-config.ts')

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/verify-tracker-analytics.mjs <export.json>')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(file, 'utf8'))
const records = (raw.daily_data || []).filter(r => r.category === 'tracker')

// ── 1. does the normaliser actually un-shatter the keys? ────────────────────
const rawKeys = new Set(records.map(r => r.subcategory))
const normKeys = new Set(records.map(r => trackerKeyOf(r.subcategory)))
console.log('=== KEY NORMALISATION ===')
console.log(`raw distinct subcategories : ${rawKeys.size}`)
console.log(`after trackerKeyOf()       : ${normKeys.size}`)

const counts = new Map()
for (const r of records) {
  const k = trackerKeyOf(r.subcategory)
  counts.set(k, (counts.get(k) || 0) + 1)
}
const recovered = [...counts.entries()]
  .filter(([k, n]) => n > 1 && [...rawKeys].filter(x => trackerKeyOf(x) === k).length > 1)
  .sort((a, b) => b[1] - a[1])
console.log('\nunshattered (were 1-row groups, now aggregable):')
for (const [k, n] of recovered) console.log(`   ${k.padEnd(22)} ${String(n).padStart(4)} rows`)

// ── 2. run every configured tracker ─────────────────────────────────────────
console.log('\n=== PANELS ===')
const keys = [...counts.keys()].filter(k => counts.get(k) >= 3).sort()

for (const key of keys) {
  const cfg = analyticsConfigFor(key)
  const entries = collectEntries(records, key)
  if (!entries.length) continue
  const a = computeTrackerAnalytics(entries, cfg)

  const configured = key in TRACKER_ANALYTICS ? '' : '  (default config)'
  console.log(`\n── ${key}${configured}`)
  console.log(
    `   n=${a.entries}  days=${a.days}  span=${a.spanDays}d  ` +
      `rate=${a.ratePerWeek === null ? '—' : a.ratePerWeek.toFixed(1) + '/wk'}`,
  )
  console.log(
    `   severity: n=${a.severityN} ` +
      `mean=${a.severityMean === null ? '—' : a.severityMean.toFixed(1)} ` +
      `peak=${a.severityPeak ?? '—'}` +
      (a.deltaN ? `  delta=${a.deltaMean.toFixed(1)} (n=${a.deltaN})` : ''),
  )

  if (a.ratio) {
    console.log(
      `   ${a.ratio.label}: ${(a.ratio.pct * 100).toFixed(0)}%  ` +
        `(${a.ratio.completed} of ${a.ratio.expected})`,
    )
  }

  const t = a.trend
  if (t.direction) {
    // Arrow shows which way the NUMBER moved; the word says whether that is
    // good. They deliberately disagree on measures where higher is better.
    const arrow = t.change === null || Math.abs(t.change) < 0.2 ? '→' : t.change < 0 ? '↓' : '↑'
    console.log(
      `   TREND: ${arrow} ${t.direction}${a.higherIsBetter ? ' (higher=better)' : ''}  ` +
        `${t.firstHalfMean.toFixed(1)} → ${t.secondHalfMean.toFixed(1)} ` +
        `(${t.change >= 0 ? '+' : ''}${t.change.toFixed(1)}, n=${t.n})`,
    )
  } else {
    console.log(`   TREND: suppressed — ${t.suppressedBecause}`)
  }

  const hist = a.severityHistogram
  if (a.severityN) {
    const peak = Math.max(...hist)
    const spark = hist.map(v => (v === 0 ? '·' : '▁▂▃▄▅▆▇█'[Math.min(7, Math.ceil((v / peak) * 7))])).join('')
    console.log(`   histogram 0-10: ${spark}`)
  }
  const hrs = a.hourHistogram
  if (hrs.some(Boolean)) {
    const peak = Math.max(...hrs)
    const spark = hrs.map(v => (v === 0 ? '·' : '▁▂▃▄▅▆▇█'[Math.min(7, Math.ceil((v / peak) * 7))])).join('')
    console.log(`   by hour   0-23: ${spark}`)
  }

  if (a.treatmentComparisons.length) {
    console.log('   TREATMENT COMPARISON (severity with vs without):')
    for (const c of a.treatmentComparisons.slice(0, 5)) {
      const rated = c.ratedEffectiveness === null ? '' : `  rated=${c.ratedEffectiveness.toFixed(1)}/10 (n=${c.ratedN})`
      console.log(
        `      ${c.label.slice(0, 38).padEnd(40)} ` +
          `${c.withMean.toFixed(1)} (n=${c.withN})  vs  ${c.withoutMean.toFixed(1)} (n=${c.withoutN})  ` +
          `Δ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(1)}${rated}`,
      )
    }
  } else if (a.treatments.length) {
    console.log(
      `   TREATMENT COMPARISON: suppressed — ${a.treatments.length} treatment(s) logged, ` +
        `none with both arms >= floor`,
    )
  }

  const flagged = Object.entries(a.flags).filter(([, v]) => v > 0)
  if (flagged.length) console.log('   flags: ' + flagged.map(([k, v]) => `${k}=${v}`).join('  '))
}
