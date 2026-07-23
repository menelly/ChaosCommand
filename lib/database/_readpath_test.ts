/*
 * HEADLESS read-path test — does the encryption middleware DECRYPT the exact
 * query shapes the trackers use? (.where(index).equals(x).toArray(), compound
 * indexes, single-date). If any come back as `enc:v1:` strings, that read path
 * rides openCursor (not the decrypting query()) — the "trackers show nothing
 * while the pattern engine sees data" bug.
 */
import 'fake-indexeddb/auto'
;(globalThis as any).window = globalThis
const _ls = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (_ls.has(k) ? _ls.get(k)! : null),
  setItem: (k: string, v: string) => { _ls.set(k, String(v)) },
  removeItem: (k: string) => { _ls.delete(k) },
  clear: () => _ls.clear(),
}

import { deriveSession } from './session-crypto'
import { getDB, closeDB } from './dexie-db'

let fails = 0
const isCipher = (rows: any[]) =>
  rows.length > 0 && rows.some((r) => typeof r?.content === 'string' && r.content.startsWith('enc:v1:'))
const isPlainObj = (rows: any[]) =>
  rows.length > 0 && rows.every((r) => r?.content && typeof r.content === 'object')
function check(label: string, rows: any[]) {
  const cipher = isCipher(rows)
  const ok = rows.length > 0 && !cipher && isPlainObj(rows)
  console.log(`${ok ? 'PASS decrypts' : cipher ? 'FAIL CIPHERTEXT' : 'FAIL empty/odd'}  ${label}  (n=${rows.length})`)
  if (!ok) fails++
}

async function main() {
  const PIN = '4242'
  await deriveSession(PIN)
  const db = getDB()
  await db.open()

  const now = new Date().toISOString()
  await (db as any).daily_data.bulkAdd([
    { date: '2026-07-01', category: 'tracker', subcategory: 'pain', content: { level: 7, note: 'A' }, tags: ['x'], metadata: { created_at: now, updated_at: now } },
    { date: '2026-07-02', category: 'tracker', subcategory: 'pain', content: { level: 3, note: 'B' }, tags: ['y'], metadata: { created_at: now, updated_at: now } },
    { date: '2026-07-02', category: 'journal', subcategory: 'main', content: { text: 'C' }, tags: [], metadata: { created_at: now, updated_at: now } },
  ])

  // 1) whole-table toArray (pattern-engine style — known good)
  check('.toArray() [whole table / getAll]', await (db as any).daily_data.toArray())
  // 2) single-index where().toArray()  (getAllCategoryData style)
  check(".where('category').equals('tracker').toArray()", await (db as any).daily_data.where('category').equals('tracker').toArray())
  // 3) single date where (get-by-date style)
  check(".where('date').equals('2026-07-02').toArray()", await (db as any).daily_data.where('date').equals('2026-07-02').toArray())
  // 4) COMPOUND index where().toArray()  (getCategoryData / history style)
  check(".where(['date','category']).equals(['2026-07-02','tracker']).toArray()", await (db as any).daily_data.where(['date', 'category']).equals(['2026-07-02', 'tracker']).toArray())
  check(".where(['date','category','subcategory']).equals(...).toArray()", await (db as any).daily_data.where(['date', 'category', 'subcategory']).equals(['2026-07-01', 'tracker', 'pain']).toArray())
  // 5) multiEntry tags anyOf (tag search style)
  check(".where('tags').anyOf(['x','y']).toArray()", await (db as any).daily_data.where('tags').anyOf(['x', 'y']).toArray())
  // getDateRange fix candidates: index-range query (no .and) — must decrypt
  check(".where('date').between(...).toArray() [getDateRange no-cat fix]", await (db as any).daily_data.where('date').between('2026-07-01', '2026-07-03', true, true).toArray())
  // 6) explicit cursor (.filter) + .and() — expected to surface ciphertext (the bug)
  check(".filter(cursor).toArray() [expected ciphertext]", await (db as any).daily_data.filter(() => true).toArray())
  check(".where('date').between(...).and(cat).toArray() [THE getDateRange BUG]", await (db as any).daily_data.where('date').between('2026-07-01', '2026-07-03', true, true).and((r: any) => r.category === 'tracker').toArray())

  closeDB()
  console.log(`\n${fails === 0 ? '✅ every read path decrypts' : `❌ ${fails} read path(s) return CIPHERTEXT — that's the tracker-blindness bug`}`)
  process.exit(0)
}
main().catch((e) => { console.error('TEST ERROR:', e); process.exit(1) })
