/*
 * HEADLESS end-to-end test — plaintext → encrypted profile migration.
 * Runs the REAL migratePlaintextProfileIfNeeded against fake-indexeddb + node
 * webcrypto, with the browser-API shims the client code guards on.
 *
 * Not part of the goldens harness (needs fake-indexeddb). Run via:
 *   npx tsc --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --rootDir . --outDir .tmp-migtest lib/database/_migration_test.ts
 *   node .tmp-migtest/lib/database/_migration_test.js
 */
import 'fake-indexeddb/auto' // registers indexedDB / IDBKeyRange globally (side effect)

// --- shims the app guards on (typeof window, localStorage). node23 has webcrypto. ---
;(globalThis as any).window = globalThis
const _ls = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => (_ls.has(k) ? _ls.get(k)! : null),
  setItem: (k: string, v: string) => { _ls.set(k, String(v)) },
  removeItem: (k: string) => { _ls.delete(k) },
  clear: () => _ls.clear(),
}

import Dexie from 'dexie'
import { migratePlaintextProfileIfNeeded } from './migrate-to-encrypted'
import { deriveSession, namespaceForPin } from './session-crypto'
import { getDB, closeDB } from './dexie-db'

const STORES = {
  daily_data: '++id, date, [date+category], [date+category+subcategory], category, subcategory, *tags, metadata.created_at',
  user_tags: '++id, tag_name, *category_restrictions, is_hidden, created_at',
  image_blobs: '++id, blob_key, mime_type, size, created_at, *linked_records',
  pattern_snapshots: '++id, run_at, window_days, is_auto',
}

let failures = 0
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failures++
}

async function main() {
  const PIN = '1234'
  const legacyName = `ChaosCommand_${PIN}`
  const hash = await namespaceForPin(PIN)
  const newName = `ChaosCommand_${hash}`
  const CANARY = 'PLAINTEXT-CANARY'
  const now = new Date().toISOString()

  // 1) Seed a LEGACY plaintext DB: raw-pin name, plaintext content, NO middleware.
  const legacy = new Dexie(legacyName)
  legacy.version(2).stores(STORES)
  await legacy.open()
  await (legacy as any).daily_data.bulkAdd([
    { date: '2026-07-01', category: 'tracker', subcategory: 'pain', content: { level: 7, note: CANARY }, tags: [], metadata: { created_at: now, updated_at: now } },
    { date: '2026-07-02', category: 'journal', subcategory: 'main', content: { text: 'second row survives' }, tags: [], metadata: { created_at: now, updated_at: now } },
  ])
  await (legacy as any).user_tags.add({ tag_name: 'NOPE', color: '#EF4444', category_restrictions: [], is_hidden: false, is_system: true, behavior: 'exclude_analytics', created_at: now, updated_at: now })
  const srcDaily = await (legacy as any).daily_data.count()
  const srcTags = await (legacy as any).user_tags.count()
  legacy.close()
  console.log(`seeded ${legacyName}: daily_data=${srcDaily}, user_tags=${srcTags}, hash=${hash}`)

  // 2) Derive the session key, then run the REAL migration.
  await deriveSession(PIN)
  const result = await migratePlaintextProfileIfNeeded(PIN)
  console.log('migration result:', JSON.stringify(result))
  check('migration reported migrated:true', result.migrated === true)
  check('counts preserved (daily_data)', result.counts?.daily_data === srcDaily)
  check('counts preserved (user_tags)', result.counts?.user_tags === srcTags)

  // 3) Old plaintext DB gone, new hashed DB present.
  const dbNames = (await indexedDB.databases()).map(d => d.name)
  check('old plaintext DB deleted', !dbNames.includes(legacyName))
  check('new hashed DB exists', dbNames.includes(newName))

  // 4) AT REST = ENCRYPTED: read the new DB with a BARE Dexie (no middleware).
  const raw = new Dexie(newName)
  raw.version(2).stores(STORES)
  await raw.open()
  const rawRows = await (raw as any).daily_data.toArray()
  const allEnc = rawRows.length > 0 && rawRows.every((r: any) => typeof r.content === 'string' && r.content.startsWith('enc:v1:'))
  check('content ENCRYPTED at rest (enc:v1: prefix, bare read)', allEnc)
  check('index key (date) stays plaintext by design', rawRows.some((r: any) => r.date === '2026-07-01'))
  raw.close()

  // 5) THROUGH the app path (with middleware) it DECRYPTS back.
  const appDb = getDB(hash)
  await appDb.open()
  const appRows = await (appDb as any).daily_data.toArray()
  const canaryBack = appRows.find((r: any) => r?.content?.note === CANARY)
  check('decrypts through app path (canary readable)', !!canaryBack)
  check('all rows survive the round-trip', appRows.length === srcDaily)
  closeDB()

  // 6) Idempotent: a second run is a safe no-op.
  const again = await migratePlaintextProfileIfNeeded(PIN)
  check('idempotent second run (no-op)', again.migrated === false)

  console.log(`\n${failures === 0 ? '✅ ALL MIGRATION CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error('TEST ERROR:', e); process.exit(1) })
