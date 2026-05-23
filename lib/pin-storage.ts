/*
 * Copyright (c) 2025-2026 Chaos Cascade — Ren & Ace (Claude 4.x)
 * PolyForm Noncommercial 1.0.0.
 */

/**
 * PER-PIN LOCAL STORAGE  (CHA-206)
 *
 * A PIN in Chaos Command is a full IDENTITY, not just a data key. Dexie already
 * isolates each PIN's tracker data in its own encrypted database
 * (dexie-db.ts → `ChaosCommand_<pin>`). But localStorage was GLOBAL — so UI
 * settings AND the few real-data localStorage stores (coping sessions, custom
 * coping techniques) bled across every PIN. Under the duress/decoy ("g-spot")
 * model that's a hole: log in as the 1111 decoy and you'd still see the real
 * identity's coping history + settings.
 *
 * This wrapper scopes EVERY localStorage key to the active PIN, so each identity
 * gets its own settings + localStorage data — matching the per-PIN Dexie vaults.
 * Use `pinStorage` everywhere instead of `localStorage`.
 *
 * Threat model: casual coercion ("abuser glances at the open app"), same as the
 * existing per-PIN Dexie databases. A forensic examiner could still see that
 * multiple key-sets exist; defeating THAT is a separate, larger effort.
 *
 * Keys that intentionally stay GLOBAL:
 *   - chaos-user-pin   : the pointer to WHICH pin is active. Scoping it by the
 *                        active pin is circular — you'd never find the pin. 🔒
 *   - chaos-data-pin   : a separate PIN credential (data/duress). Also a pointer.
 *   - cc.field.salt.* / cc-* : crypto-salt keys; secure-pin-database-architecture
 *                        already hashes these per-PIN with its own scheme.
 */

const GLOBAL_KEYS = new Set<string>([
  'chaos-user-pin',
  'chaos-data-pin',
])

const PREFIX_TAG = 'u' // scoped keys look like  u<hash>.<originalKey>
const MIGRATION_FLAG = 'cc.pin-storage.migrated.v1' // global

function isGlobal(key: string): boolean {
  if (GLOBAL_KEYS.has(key)) return true
  // crypto-salt + already-scoped keys keep their own naming
  if (key.startsWith('cc.field.salt') || key.startsWith('cc-')) return true
  if (key.startsWith(MIGRATION_FLAG)) return true
  return false
}

/** Tiny synchronous, non-reversible-ish hash (djb2). Strong crypto isn't needed
 *  for key NAMESPACING — actual data is AES-encrypted at the Dexie layer. We
 *  just need different PINs to land on different prefixes, synchronously (all
 *  localStorage access in the app is sync). */
function syncHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

function activePin(): string {
  try {
    return localStorage.getItem('chaos-user-pin') || ''
  } catch {
    return '' // Safari private mode etc.
  }
}

/** The current identity's key prefix.
 *  No PIN (default identity) → BARE keys (no prefix): the majority of users have
 *  no PIN, so they get zero change and zero migration risk — their existing flat
 *  keys keep working untouched.
 *  A PIN set → `u<hash>.` prefix: that identity's settings + data are isolated. */
function activePrefix(): string {
  const pin = activePin()
  return pin ? `${PREFIX_TAG}${syncHash(pin)}.` : ''
}

function scopedKey(key: string): string {
  return isGlobal(key) ? key : activePrefix() + key
}

export const pinStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(scopedKey(key))
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(scopedKey(key), value)
    } catch {
      /* quota / private mode — swallow, same as a bare localStorage failure */
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(scopedKey(key))
    } catch {
      /* ignore */
    }
  },
}

/**
 * EXPLICIT, GUIDED MIGRATION — do NOT call this automatically at boot.
 *
 * ⚠️ Auto-running this on login would copy the shared flat keys into WHATEVER
 * pin logs in next — including the duress/decoy PIN (e.g. 1111) — re-leaking the
 * real identity's data into the decoy. That defeats the entire feature.
 *
 * Instead, call this ONLY from a deliberate "make this my primary identity"
 * setup flow, where the user has just chosen their REAL pin and explicitly wants
 * their existing settings/coping data to move into it. Idempotent (global flag).
 * The no-PIN default identity needs no migration — it already reads the flat keys.
 */
export function migrateFlatKeysToActivePin(): void {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return

    const prefix = activePrefix()
    const flatKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (isGlobal(key)) continue
      if (key.startsWith(PREFIX_TAG) && /^u[0-9a-z]+\./.test(key)) continue // already scoped
      flatKeys.push(key)
    }

    for (const key of flatKeys) {
      const val = localStorage.getItem(key)
      if (val === null) continue
      const scoped = prefix + key
      // Don't clobber an already-scoped value if one somehow exists.
      if (localStorage.getItem(scoped) === null) {
        localStorage.setItem(scoped, val)
      }
      // Leave the flat key in place for now (non-destructive). A later cleanup
      // pass can remove flats once we're confident nothing reads them directly.
    }

    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
    console.log(`🔐 pin-storage: migrated ${flatKeys.length} flat keys into ${prefix}`)
  } catch (e) {
    console.warn('pin-storage migration skipped:', e)
  }
}
