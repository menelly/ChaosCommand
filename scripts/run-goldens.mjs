/*
 * run-goldens.mjs — runs every framework-free golden suite in lib/services.
 *
 * Each *.golden.test.ts is a standalone script: it imports its target module,
 * runs check() assertions, prints PASS/FAIL, and process.exit(1)s on any
 * failure. We compile them all with tsc (commonjs) into .tmp-goldens, run each
 * with node, and exit non-zero if any suite fails. This is what `npm test`
 * (and CI) invoke — no test framework, no config, just the goldens.
 */

import { execSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'lib/services'
const OUT = '.tmp-goldens'

const goldens = readdirSync(DIR)
  .filter(f => f.endsWith('.golden.test.ts'))
  .sort()
  .map(f => join(DIR, f).replace(/\\/g, '/'))

if (goldens.length === 0) {
  console.error('No *.golden.test.ts suites found in', DIR)
  process.exit(1)
}

console.log(`\nCompiling ${goldens.length} golden suite(s)...\n`)
try {
  execSync(
    `npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck ` +
    `--moduleResolution node --rootDir . --outDir ${OUT} ${goldens.join(' ')}`,
    { stdio: 'inherit' }
  )
} catch {
  console.error('\nGolden compile failed.')
  process.exit(1)
}

let failed = 0
for (const g of goldens) {
  const js = `${OUT}/${g.replace(/\.ts$/, '.js')}`
  try {
    execSync(`node ${js}`, { stdio: 'inherit' })
  } catch {
    failed++
    console.error(`✗ suite failed: ${g}`)
  }
}

try { rmSync(OUT, { recursive: true, force: true }) } catch { /* best-effort cleanup */ }

console.log(`\n${'='.repeat(46)}`)
console.log(failed === 0 ? `✅ All ${goldens.length} golden suites passed.` : `❌ ${failed} of ${goldens.length} golden suites FAILED.`)
console.log(`${'='.repeat(46)}\n`)
process.exit(failed === 0 ? 0 : 1)
