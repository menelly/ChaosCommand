/*
 * build-demo-fixture.js — turn Ren's real export into the sanitized public demo fixture.
 *
 * DEFAULT-DENY. We KEEP an explicit allowlist of tracker categories (structured medical
 * data Ren is fine making public — migraines, seizures, etc.), BLANK every free-text field
 * inside them, DROP everything else (demographics/address, providers, appointments, labs,
 * disability apps, missed-work, medical-events, Gaslight Garage, journals, calendar, images,
 * local_storage, specific meds), re-base dates to end today, and ADD neutral reproductive
 * sample data. Prints a kept/dropped summary; never prints raw values.
 *
 * Usage: node scripts/build-demo-fixture.js <input.json> <output.json>
 * Ace, 2026-05-24 (CHA-224).
 */
const fs = require('fs')

const [, , INPUT, OUTPUT] = process.argv
if (!INPUT || !OUTPUT) { console.error('usage: node build-demo-fixture.js <in> <out>'); process.exit(1) }

const src = JSON.parse(fs.readFileSync(INPUT, 'utf8'))
const dd = src.daily_data || []

// --- policy ---------------------------------------------------------------
// KEEP tracker/health records, EXCEPT these subcategory patterns (meds = specific drugs;
// hope-reminders = free-text affirmations).
const KEEP_CATEGORIES = new Set(['tracker', 'health'])
const DROP_SUBCAT_PATTERNS = [/^medications/i, /hope-reminders/i]
// Everything in any OTHER category is dropped (user/*, journal/*, calendar/*, daily/*,
// reminders/*, custom/*). Default-deny.
const FREE_TEXT_KEYS = new Set([
  'notes', 'note', 'text', 'freetext', 'freeText', 'description', 'generalnotes', 'generalNotes',
  'customnotes', 'customNotes', 'journal', 'reason', 'details', 'comment', 'comments', 'story',
  'whathappened', 'whatWasSaid', 'response', 'gratitude', 'context',
])

const keptCounts = {}
const droppedCounts = {}
const tally = (m, k) => { m[k] = (m[k] || 0) + 1 }

function shouldKeep(r) {
  if (!KEEP_CATEGORIES.has(r.category)) return false
  if (DROP_SUBCAT_PATTERNS.some(re => re.test(r.subcategory || ''))) return false
  return true
}

// Recursively blank any free-text field; leave structured (numbers, enums, arrays of short
// tokens) intact. Arrays of strings are kept ONLY if they look like enum tokens (short, no
// spaces-beyond-a-couple) — anything long/sentence-like is dropped to be safe.
function clean(val, key) {
  if (val == null) return val
  if (typeof val === 'string') {
    if (key && FREE_TEXT_KEYS.has(key)) return ''            // blank known free-text
    // a stray long string anywhere = treat as free-text, blank it
    if (val.length > 40 || /[.!?]\s/.test(val)) return ''
    return val
  }
  if (Array.isArray(val)) {
    return val.map(v => (typeof v === 'string'
      ? (v.length > 40 || /[.!?]\s/.test(v) ? '' : v)
      : clean(v))).filter(v => v !== '')
  }
  if (typeof val === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(val)) out[k] = clean(v, k)
    return out
  }
  return val
}

// --- pass 1: keep + clean -------------------------------------------------
let kept = []
for (const r of dd) {
  if (shouldKeep(r)) {
    kept.push({ date: r.date, category: r.category, subcategory: r.subcategory, content: clean(r.content), metadata: r.metadata || {} })
    tally(keptCounts, `${r.category}/${r.subcategory}`.replace(/-\d{6,}.*$/, '-*'))
  } else {
    tally(droppedCounts, r.category)
  }
}

// --- pass 2: re-base dates so the kept set ends TODAY ---------------------
const toDays = s => Math.floor(new Date(s + 'T12:00:00').getTime() / 86400000)
const keptDates = kept.map(r => r.date).filter(Boolean).sort()
const maxDay = toDays(keptDates[keptDates.length - 1])
const todayDay = Math.floor(Date.now() / 86400000)
const deltaDays = todayDay - maxDay
const shiftDate = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + deltaDays); return d.toISOString().slice(0, 10) }
const ISO = /^\d{4}-\d{2}-\d{2}/
function shiftDeep(v) {
  if (typeof v === 'string' && ISO.test(v)) {
    const d = new Date(v); if (!isNaN(d)) { d.setDate(d.getDate() + deltaDays); return v.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString() }
  }
  if (Array.isArray(v)) return v.map(shiftDeep)
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = shiftDeep(x); return o }
  return v
}
kept = kept.map(r => ({ ...r, date: r.date ? shiftDate(r.date) : r.date, content: shiftDeep(r.content), metadata: shiftDeep(r.metadata) }))

// --- pass 3: add neutral reproductive sample (Ren tracks it off) ----------
// Shape mirrors what the reproductive tracker reads (subcategory 'reproductive-health').
// Neutral 28-day cycle over the last ~8 weeks. No free text.
const repro = []
for (let back = 56; back >= 0; back -= 1) {
  const d = new Date(); d.setDate(d.getDate() - back)
  const date = d.toISOString().slice(0, 10)
  const cycleDay = ((56 - back) % 28) + 1
  const isFlow = cycleDay <= 4
  if (isFlow || cycleDay === 14 || back % 7 === 0) {
    const ts = `${date}T08:00:00.000Z`
    repro.push({
      date, category: 'tracker', subcategory: 'reproductive-health',
      content: { cycleDay, flow: isFlow ? 'medium' : 'none', symptoms: isFlow ? ['cramps'] : [], notes: '' },
      metadata: { created_at: ts, updated_at: ts },
    })
  }
}
kept.push(...repro)

// --- assemble fixture -----------------------------------------------------
const fixture = {
  format: 'chaos-command-demo-fixture',
  built_at: new Date().toISOString(),
  source: 'sanitized export of real data (CHA-224); PII/free-text/images stripped',
  daily_data: kept,
  user_tags: (src.user_tags || []).filter(t => t.is_system),   // system tags only (NOPE / I KNOW)
  image_blobs: [],                                              // never ship images
  // local_storage intentionally omitted
}

fs.writeFileSync(OUTPUT, JSON.stringify(fixture, null, 2))

// --- summary (safe: counts + verification only) ---------------------------
console.log('=== DEMO FIXTURE BUILT ===')
console.log('output:', OUTPUT, `(${(fs.statSync(OUTPUT).size / 1024).toFixed(0)} KB)`)
console.log('\nKEPT tracker records (' + kept.length + ' incl. ' + repro.length + ' synthetic reproductive):')
Object.entries(keptCounts).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + String(n).padStart(3) + '  ' + k))
console.log('\nDROPPED by category:')
Object.entries(droppedCounts).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log('  ' + String(n).padStart(3) + '  ' + k))
console.log('\nimage_blobs shipped:', fixture.image_blobs.length, '| user_tags (system-only):', fixture.user_tags.length, '| local_storage: omitted')
console.log('dates re-based by', deltaDays, 'days (ends today)')

// --- safety scan: assert no obvious PII/free-text survived ----------------
const blob = JSON.stringify(fixture).toLowerCase()
const RED_FLAGS = ['address', 'phone', 'dr.', 'gaslight', 'demographic', 'provider', 'appointment', 'abilify', 'disability-app', 'lab-result', '@']
const hits = RED_FLAGS.filter(f => blob.includes(f))
console.log('\nSAFETY SCAN — red-flag substrings still present:', hits.length ? '⚠️ ' + hits.join(', ') : 'NONE ✓')
const longStrings = []
;(function walk(v) { if (typeof v === 'string' && v.length > 40) longStrings.push(v.slice(0, 30)); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk) })(fixture.daily_data)
console.log('long (>40-char) strings remaining in kept data:', longStrings.length ? '⚠️ ' + longStrings.length + ' (review)' : 'NONE ✓')
