/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * safety-plan.golden.test.ts — the crisis-area regressions from 2026-10-29/30:
 *   CHA-771  Safety Plan said "saved", stored nothing; numbers weren't tappable
 *   CHA-770  Poison Help number, one source of truth
 *   CHA-772  MCP entries saved without a level → "🌈 /10"
 *
 * 🔒 ALL DATA HERE IS FAKE. 555-01xx numbers are reserved for fiction. Never paste a
 *    real safety-plan entry or a real person's number into this file.
 *
 * Run: npm test   (scripts/run-goldens.mjs compiles every *.golden.test.ts here)
 */

import {
  createDefaultSafetyPlan, normalizeSafetyPlan, pickSafetyPlanRecord,
  commitPendingInputs, missingAfterSave,
} from './safety-plan'
import { telHref, smsHref, parseTextInstruction, phoneDigits, POISON_HELP } from './crisis-contact'
import { checkEntryShape, expectedNumericFields } from './mcp-entry-shape'
import { CRISIS_RESOURCES } from '../../app/crisis-support/crisis-constants'

let pass = 0, fail = 0
function check(cond: boolean, label: string) {
  if (cond) pass++
  else { fail++; console.log(`  ✗ FAIL ${label}`) }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

console.log('\n🛡️ safety plan + crisis contacts + MCP shape golden suite\n')

// ─────────────────────────────────────────────────────────────────────────────
// A tiny fake of the daily_data table, keyed like the real one: [date, category, subcategory].
// saveData() updates the row for that key or adds one; that's the behaviour that matters.
type Row = { id: number; date: string; category: string; subcategory: string; content: any; metadata: any }
function fakeStore() {
  const rows: Row[] = []
  let next = 1
  return {
    rows,
    save(date: string, subcategory: string, content: any, updated_at: string) {
      const hit = rows.find(r => r.date === date && r.category === 'tracker' && r.subcategory === subcategory)
      // the real store keeps objects; round-trip through JSON so nothing is shared by reference
      const stored = JSON.parse(JSON.stringify(content))
      if (hit) { hit.content = stored; hit.metadata = { ...hit.metadata, updated_at } }
      else rows.push({ id: next++, date, category: 'tracker', subcategory, content: stored, metadata: { updated_at } })
    },
    get(date: string, subcategory: string) {
      return rows.find(r => r.date === date && r.category === 'tracker' && r.subcategory === subcategory) || null
    },
  }
}

const T0 = '2026-10-30T03:00:00.000Z'
const FAKE_CONTACT = { name: 'Test Friend', relationship: 'friend', phone: '(555) 010-0199', notes: '', address: '' }
const FAKE_REASON = 'my test cat needs me'

// ── CHA-771 THE REGRESSION: add a contact + a reason → save → reload → both visible & tappable
{
  const store = fakeStore()
  const plan = createDefaultSafetyPlan(T0)

  // Exactly what happened on 10-29: typed into the inputs, pressed Save, never pressed "+".
  const { plan: toSave, problems, added } = commitPendingInputs(plan, {
    lists: { reasonsToLive: FAKE_REASON },
    emergencyContact: FAKE_CONTACT,
  })
  check(problems.length === 0, 'complete drafts save without problems')
  check(added.includes('emergency contact') && added.includes('reasons to keep living'), 'pending contact + reason are committed on save')

  store.save('2026-10-30', 'safety-plan', toSave, T0)
  const back = normalizeSafetyPlan(store.get('2026-10-30', 'safety-plan')!.content, T0)
  check(missingAfterSave(toSave, back).length === 0, 'read-back verifies the save')

  // "reload": the loader picks the plan from all tracker rows
  const reloaded = normalizeSafetyPlan(pickSafetyPlanRecord(store.rows)!.content, T0)
  check(reloaded.emergencyContacts.length === 1 && reloaded.emergencyContacts[0].name === 'Test Friend', 'contact visible after reload')
  check(reloaded.reasonsToLive.includes(FAKE_REASON), 'reason visible after reload')
  check(telHref(reloaded.emergencyContacts[0]?.phone) === 'tel:5550100199', 'personal contact is a tel: link')
  check(telHref(reloaded.crisisHotlines[0].phone) === 'tel:988', 'built-in 988 is a tel: link')
}

// ── the toast must not lie: a write that lost the entries is caught by read-back
{
  const plan = commitPendingInputs(createDefaultSafetyPlan(T0), { lists: { reasonsToLive: FAKE_REASON }, emergencyContact: FAKE_CONTACT }).plan
  const emptyStored = createDefaultSafetyPlan(T0) // what the 10-29 record looked like: every list empty
  const missing = missingAfterSave(plan, emptyStored)
  check(missing.includes('reasons to keep living') && missing.includes('emergency contacts'), 'read-back flags the 10-29 failure shape')
  check(eq(missingAfterSave(plan, null), ['the whole plan']), 'no row at all is flagged')
}

// ── a half-typed contact blocks the save instead of vanishing
{
  const r = commitPendingInputs(createDefaultSafetyPlan(T0), {
    emergencyContact: { name: 'Test Friend', relationship: '', phone: '', notes: '', address: '' },
  })
  check(r.problems.length === 1 && /phone number/.test(r.problems[0]), 'name-without-phone is a problem, not a silent drop')
  check(r.plan.emergencyContacts.length === 0, 'and nothing half-made is added')
  const untouched = commitPendingInputs(createDefaultSafetyPlan(T0), {
    emergencyContact: { name: '', relationship: '', phone: '', notes: '', address: '' },
    crisisContact: { name: ' ', phone: '', available: '', notes: '', address: '' },
  })
  check(untouched.problems.length === 0 && untouched.added.length === 0, 'blank drafts are ignored')
  const dup = commitPendingInputs({ ...createDefaultSafetyPlan(T0), reasonsToLive: [FAKE_REASON] }, { lists: { reasonsToLive: `  ${FAKE_REASON} ` } })
  check(dup.plan.reasonsToLive.length === 1, 'an already-added reason is not duplicated')
}

// ── second day: the newest live row wins (the old loader took the FIRST row)
{
  const store = fakeStore()
  store.save('2026-10-29', 'safety-plan', createDefaultSafetyPlan(T0), '2026-10-29T22:35:55.600Z')
  const newer = { ...createDefaultSafetyPlan(T0), reasonsToLive: [FAKE_REASON] }
  store.save('2026-10-30', 'safety-plan', newer, '2026-10-30T09:00:00.000Z')
  store.rows.push({ id: 99, date: '2026-10-31', category: 'tracker', subcategory: 'safety-plan', content: newer, metadata: { updated_at: '2026-10-31T00:00:00.000Z', deleted_at: '2026-10-31T00:01:00.000Z' } })
  store.rows.push({ id: 100, date: '2026-10-31', category: 'tracker', subcategory: 'head-pain', content: {}, metadata: { updated_at: '2026-11-01T00:00:00.000Z' } })
  const picked = pickSafetyPlanRecord(store.rows)!
  check(picked.date === '2026-10-30', 'newest LIVE safety-plan row is picked (tombstones and other trackers ignored)')
  check(pickSafetyPlanRecord([]) === undefined, 'no rows → undefined')
}

// ── stored shapes the loader must survive
{
  const fromString = normalizeSafetyPlan(JSON.stringify({ reasonsToLive: ['x'] }), T0)
  check(fromString.reasonsToLive[0] === 'x' && Array.isArray(fromString.emergencyContacts), 'JSON-string content parses and missing lists default to []')
  check(Array.isArray(normalizeSafetyPlan({ safeSpaces: null }, T0).safeSpaces), 'a null list becomes []')
  check(normalizeSafetyPlan('not json', T0).crisisHotlines[0].phone === '988', 'garbage falls back to the default plan')
}

// ── crisis-contact links
check(telHref('988') === 'tel:988', 'tel 988')
check(telHref('911') === 'tel:911', 'tel 911')
check(telHref('1-866-488-7386') === 'tel:18664887386', 'tel strips dashes')
check(telHref('+44 116 123') === 'tel:+44116123', 'tel keeps a leading +')
check(telHref('') === '' && telHref(undefined) === '' && telHref('call me') === '', 'no digits → no link')
check(smsHref('741741', 'HOME') === 'sms:741741?body=HOME', 'sms with keyword')
check(eq(parseTextInstruction('Text HOME to 741741'), { keyword: 'HOME', number: '741741' }), 'parses "Text HOME to 741741"')
check(parseTextInstruction('Chat online') === null, 'non-text instruction → null')
check(phoneDigits(' (555) 010-0100 ') === '5550100100', 'phoneDigits')

// ── CHA-770 Poison Help: one number, everywhere
check(POISON_HELP.display === '1-800-222-1222', 'Poison Help display number (verified 2026-10-30 at poisoncenters.org)')
check(telHref(POISON_HELP.tel) === 'tel:+18002221222', 'Poison Help tel link')
check(phoneDigits(POISON_HELP.display) === phoneDigits(POISON_HELP.tel).replace('+', ''), 'display and tel are the same number')
{
  const card = CRISIS_RESOURCES.find(r => r.id === 'us-poison-help')
  check(!!card, 'Poison Help is in the resource list')
  check(card?.phone === POISON_HELP.display && card?.category === 'poison' && card?.cost === 'free' && card?.hours === '24/7' && card?.country === 'US', 'Poison Help card fields')
}

// ── CHA-772 MCP entry shape (fake head-pain entries, shaped like the app's)
{
  const appMade = [
    { id: '1', painIntensity: 2, treatmentEffectiveness: 3, painType: ['pressure'], date: '2026-05-02', timestamp: 'x' },
    { id: '2', painIntensity: 6, treatmentEffectiveness: 5, painType: [], date: '2026-05-03' },
    { id: '3', painIntensity: 4, painType: [], date: '2026-05-04' }, // no effectiveness here
  ]
  const aiMade = [{ id: 'ai', source: 'ai-mcp', notes: 'no level' }]
  const expected = expectedNumericFields([...appMade, ...aiMade])
  check(eq(expected, ['painIntensity']), `learns painIntensity (and not a 2-of-3 field) from app-made entries → ${JSON.stringify(expected)}`)
  check(checkEntryShape({ notes: 'migraine' }, appMade).length === 1, 'the 10-14 shape (no level) is refused')
  check(checkEntryShape({ painIntensity: null, notes: 'level not given' }, appMade).length === 0, 'explicit null = "not recorded" is allowed')
  check(checkEntryShape({ painIntensity: 7 }, appMade).length === 0, 'a number is fine')
  check(checkEntryShape({ painIntensity: '7' }, appMade).length === 1, 'a numeric string is refused')
  check(checkEntryShape({ anything: 1 }, aiMade).length === 0, 'a tracker with only AI entries has no learned rules')
  check(checkEntryShape({}, []).length === 0, 'empty tracker → no rules')
}

console.log(`\n${fail === 0 ? '✅' : '❌'} safety plan suite: ${pass} passed, ${fail} failed\n`)
if (fail > 0) process.exit(1)
