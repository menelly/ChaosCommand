/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * bathroom-red-flag.golden.test.ts: the Analytics "Red flag" tile must count what
 * the entry SAYS, not only which episode type got picked. Before 2026-11-09, a
 * diarrhea entry with blood + severe pain showed "needs evaluation today" in the
 * form and then "Red flag: 0" in Analytics.
 *
 * 🔒 All entries here are made up.
 *
 * Run: npm test   (scripts/run-goldens.mjs compiles every *.golden.test.ts here)
 */

import { isBathroomRedFlag } from '../../app/bathroom/bathroom-constants'

let failed = 0
function check(name: string, got: unknown, want: unknown) {
  const ok = got === want
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${got}, want ${want})`}`)
  if (!ok) failed++
}

console.log('\nBathroom red flag goldens:')

// 🔴 The bug itself
check('diarrhea + blood + severe pain counts',
  isBathroomRedFlag({ episodeType: 'diarrhea', bloodInStool: true, severeAbdominalPain: true }), true)
check('diarrhea + blood alone counts',
  isBathroomRedFlag({ episodeType: 'diarrhea', bloodInStool: true }), true)
check('urinary + blood counts',
  isBathroomRedFlag({ episodeType: 'urinary', bloodInUrine: true }), true)
check('a warning with no blood counts (obstruction signs)',
  isBathroomRedFlag({ episodeType: 'constipation', cantPassGas: true, vomiting: true }), true)
check('the explicit dropdown still counts',
  isBathroomRedFlag({ episodeType: 'blood-or-red-flag' }), true)

// 🟢 Negative controls: it can't just say yes to everything
check('ordinary diarrhea does not count', isBathroomRedFlag({ episodeType: 'diarrhea' }), false)
check('a normal entry does not count', isBathroomRedFlag({ episodeType: 'normal-bm' }), false)
check('severe pain alone does not count', isBathroomRedFlag({ episodeType: 'diarrhea', severeAbdominalPain: true }), false)
check('explicit false blood does not count', isBathroomRedFlag({ episodeType: 'diarrhea', bloodInStool: false }), false)

if (failed) {
  console.error(`\n${failed} bathroom red flag golden(s) FAILED.`)
  process.exit(1)
}
console.log('\nAll bathroom red flag goldens passed.\n')
