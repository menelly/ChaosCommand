import { voiceFor, SEVERITY_VOICES } from '../lib/severity-voices'

console.log(`\n${SEVERITY_VOICES.length} voice packs\n`)
console.log('ROTATION — same day, different trackers get different voices:')
for (const d of ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05']) {
  console.log(`  ${d}  neuro=${voiceFor('Severity', d).id.padEnd(11)} pain=${voiceFor('Pain level', d).id.padEnd(11)} fatigue=${voiceFor('Fatigue', d).id}`)
}

console.log('\nSAFETY — every pack must make 10 unmistakable:')
let bad = 0
for (const v of SEVERITY_VOICES) {
  const ok = /help|911|emergency/i.test(v.labels[10])
  if (!ok) bad++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${v.id.padEnd(11)} -> "${v.labels[10]}"`)
}

console.log('\nSHAPE — 11 rungs, none blank:')
for (const v of SEVERITY_VOICES) {
  const ok = v.labels.length === 11 && v.labels.every(l => !!l && l.trim().length > 0)
  if (!ok) bad++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${v.id.padEnd(11)} (${v.labels.length} rungs)`)
}

console.log('\nDETERMINISM — same input, same answer:')
const stable = voiceFor('Severity', '2026-08-02').id === voiceFor('Severity', '2026-08-02').id
if (!stable) bad++
console.log(`  ${stable ? 'PASS' : 'FAIL'}  repeated calls agree`)

console.log('\nSAMPLE — today, neuro:')
for (const [i, l] of voiceFor('Severity', '2026-08-02').labels.entries()) console.log(`  ${String(i).padStart(2)}  ${l}`)

console.log(bad === 0 ? '\nALL VOICE CHECKS PASSED.\n' : `\n${bad} FAILED\n`)
process.exit(bad === 0 ? 0 : 1)
