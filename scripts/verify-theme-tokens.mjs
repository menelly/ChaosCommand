#!/usr/bin/env node
/*
 * Theme token completeness + validity gate.  (Ace, 2026-05-24)
 *
 * The bug class this kills: shadcn reads design tokens as `hsl(var(--token))`,
 * which SILENTLY fails if the value isn't a valid "H S% L%" triple (missing the
 * `%` on saturation/lightness, or an RGB triple wrongly dropped in an HSL slot).
 * When it fails, the element falls through to the default theme and you get the
 * "some themes are right, some go dark, nobody knows why" jenga.
 *
 * This script asserts that EVERY theme defines ALL 19 shadcn tokens in valid
 * "H S% L%" form, in its single source of truth (public/styles/themes/theme-X.css;
 * plus the bundled styles/themes/theme-calm.css for the default theme's no-flash
 * first paint). Run it before shipping. Exit code 1 = a theme is incomplete.
 *
 *   node scripts/verify-theme-tokens.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The 15 themes the app actually loads (must match theme-loader.tsx).
const THEMES = [
  'phosphor', 'amber', 'segfault', 'lavender', 'chaos', 'caelan', 'light',
  'colorblind', 'glitter', 'calm', 'accessibility', 'ace', 'grok',
  'wicked', 'taupe',
]

// The 19 shadcn design tokens every theme must define (--radius is optional and
// not an HSL triple, so it's not checked here).
const REQUIRED = [
  'background', 'foreground', 'card', 'card-foreground', 'popover',
  'popover-foreground', 'primary', 'primary-foreground', 'secondary',
  'secondary-foreground', 'muted', 'muted-foreground', 'accent',
  'accent-foreground', 'destructive', 'destructive-foreground', 'border',
  'input', 'ring',
]

// Valid shadcn HSL triple: hue (bare number) + saturation% + lightness%.
const HSL = /^-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?%\s+-?\d+(?:\.\d+)?%$/

const rel = (f) => f.replace(root + '\\', '').replace(root + '/', '').replace(/\\/g, '/')

function tokenDefs(css) {
  const found = {}
  const re = /--([a-z-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = re.exec(css))) found[m[1]] = m[2].trim()
  return found
}

const failures = []
for (const theme of THEMES) {
  const files = [join(root, 'public', 'styles', 'themes', `theme-${theme}.css`)]
  // Calm is the bundled default — its tokens must also be correct in the bundled copy.
  if (theme === 'calm') files.push(join(root, 'styles', 'themes', 'theme-calm.css'))

  for (const file of files) {
    if (!existsSync(file)) {
      failures.push(`theme-${theme}: MISSING FILE ${rel(file)}`)
      continue
    }
    const defs = tokenDefs(readFileSync(file, 'utf8'))
    for (const t of REQUIRED) {
      if (!(t in defs)) {
        failures.push(`theme-${theme} (${rel(file)}): missing --${t}`)
      } else if (!HSL.test(defs[t])) {
        failures.push(`theme-${theme} (${rel(file)}): --${t} malformed → "${defs[t]}" (need "H S% L%")`)
      }
    }
  }
}

if (failures.length) {
  console.error(`\n❌ theme-token check FAILED (${failures.length} problem${failures.length > 1 ? 's' : ''}):`)
  for (const f of failures) console.error('   - ' + f)
  console.error('\nEvery theme needs all 19 shadcn tokens as valid "H S% L%". Fix the above.\n')
  process.exit(1)
}

console.log(`✅ theme-tokens OK — all ${THEMES.length} themes define all ${REQUIRED.length} shadcn tokens in valid "H S% L%" form.`)
