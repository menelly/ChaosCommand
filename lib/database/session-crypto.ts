/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 *
 * Part of the Chaos Cascade Medical Management System.
 */

/**
 * SESSION CRYPTO — in-memory PIN-derived key + at-rest field encryption.
 *
 * WHY THIS EXISTS (the honest security story):
 *  - Before this, the live app stored the RAW PIN in localStorage AND in the
 *    IndexedDB database name (`ChaosCommand_1234`), and medical `content` was
 *    plaintext JSON. Anyone with devtools or the disk image read everything and
 *    saw every PIN. (Nova's encrypted architecture existed but was never wired
 *    into the live write path.)
 *  - This module fixes that: the PIN is turned into (a) a NAMESPACE HASH used to
 *    name the per-profile database, and (b) an AES-256-GCM key used to encrypt
 *    record content. Both are derived AT LOGIN and held ONLY in memory. The raw
 *    PIN is never persisted; the key is cleared on logout.
 *
 * THE LIMIT (stated plainly, not buried): a 4–6 digit PIN is low entropy. A
 * determined forensic attacker with the device image can brute-force ~10^4–10^6
 * candidate PINs offline regardless of PBKDF2 cost. This protects against a
 * CASUAL snoop (opens devtools / pokes the disk / grabs the app) — not a
 * nation-state with your seized device. That ceiling is set by "a scared kid must
 * type it in two seconds," not by the crypto. The correct partner to this module
 * is requiring the PIN on app-open so the key only lives during an active session.
 *
 * WHAT IS AND ISN'T ENCRYPTED: record `content` (the sensitive payload) is
 * encrypted. The index keys — date / category / subcategory / tags — stay
 * plaintext because IndexedDB queries need them. So an attacker could learn that
 * a profile HAS e.g. "seizure" entries on certain dates, but not what they say.
 * That's the standard index-preserving tradeoff; naming it honestly.
 */

// PBKDF2 cost — matches encrypted-export.ts (OWASP 2023 floor). Paid ONCE per
// login (not per field), so it can be strong without hurting write latency.
const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const IV_BYTES = 12

/** Prefix marking a value as encrypted-at-rest, so reads can tell cipher from legacy plaintext. */
const ENC_PREFIX = 'enc:v1:'

/** localStorage keys. Note: NO raw PIN is ever stored — only the namespace hash + a (non-secret) salt. */
const NS_KEY = 'cc.ns' // current profile namespace hash (safe to persist; it's a hash)
const saltKeyFor = (ns: string) => `cc.salt.${ns}`

// --- in-memory session state (never persisted) -----------------------------
let _key: CryptoKey | null = null
let _namespaceId: string | null = null

// --- base64 helpers (binary-safe) ------------------------------------------
function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// --- namespace hash (DB name) ----------------------------------------------
/** SHA-256(PIN) → 32 hex chars. Names the per-profile DB WITHOUT exposing the PIN. */
async function computeNamespaceId(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`cc-ns-v1:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/**
 * Public: compute the namespace hash for an ARBITRARY pin (not necessarily the
 * active session). Used by the few call sites that must open a SPECIFIC profile's
 * DB (demo seeding, profile-copy, migration) where getNamespaceId() — which only
 * knows the current session — isn't enough. Async because SHA-256 is async.
 */
export async function namespaceForPin(pin: string): Promise<string> {
  return computeNamespaceId(pin)
}

/** Per-profile PBKDF2 salt. Random, persisted (salts are not secret), stable across logins. */
function getOrCreateSalt(ns: string): Uint8Array {
  try {
    const stored = localStorage.getItem(saltKeyFor(ns))
    if (stored) return base64ToBytes(stored)
  } catch { /* SSR / private mode */ }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  try { localStorage.setItem(saltKeyFor(ns), bytesToBase64(salt)) } catch { /* best effort */ }
  return salt
}

async function deriveAesKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — the key can't be read back out of the CryptoKey
    ['encrypt', 'decrypt']
  )
}

// --- public API ------------------------------------------------------------

/**
 * Derive the session from a PIN: computes the namespace hash and the AES key,
 * holds both in memory, and persists ONLY the namespace hash (so getDB is sync
 * and the app knows which profile is active — without storing the PIN).
 * Call on login / unlock.
 */
export async function deriveSession(pin: string): Promise<string> {
  const ns = await computeNamespaceId(pin)
  const salt = getOrCreateSalt(ns)
  _key = await deriveAesKey(pin, salt)
  _namespaceId = ns
  try { localStorage.setItem(NS_KEY, ns) } catch { /* best effort */ }
  return ns
}

/** Wipe the in-memory key. Call on logout. Leaves the namespace hash pointer up to the caller. */
export function clearSessionKey(): void {
  _key = null
  _namespaceId = null
}

/** True once a PIN has been derived this session (i.e., we can encrypt/decrypt). */
export function hasSessionKey(): boolean {
  return _key !== null
}

/**
 * Current profile namespace hash for DB naming / prefs namespacing. Synchronous.
 * Falls back to the persisted pointer so getDB works before deriveSession resolves
 * (e.g. immediately after a refresh, before unlock). Returns null when logged out.
 */
export function getNamespaceId(): string | null {
  if (_namespaceId) return _namespaceId
  try { return localStorage.getItem(NS_KEY) } catch { return null }
}

/** Clear the persisted namespace pointer (full logout). */
export function clearNamespacePointer(): void {
  try { localStorage.removeItem(NS_KEY) } catch { /* ignore */ }
}

/** Is this stored value one of our encrypted envelopes (vs legacy plaintext)? */
export function isEncrypted(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(ENC_PREFIX)
}

/**
 * Encrypt an arbitrary JSON-serialisable value with the in-memory key.
 * Random IV per call (safe with a fixed key). Throws if no key — callers MUST
 * guarantee a key before writing to a profile DB (no silent plaintext).
 */
export async function encryptValue(value: unknown): Promise<string> {
  if (!_key) throw new Error('session-crypto: no key — cannot encrypt (refusing to write plaintext)')
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, plaintext))
  const combined = new Uint8Array(iv.length + ct.length)
  combined.set(iv); combined.set(ct, iv.length)
  return ENC_PREFIX + bytesToBase64(combined)
}

/**
 * Decrypt a value produced by encryptValue. If the value isn't one of our
 * envelopes (legacy plaintext), it's returned unchanged — so pre-existing
 * plaintext records stay readable with no migration. Throws only on a real
 * decrypt failure (wrong key / tampered data) so callers can surface it.
 */
export async function decryptValue(stored: unknown): Promise<unknown> {
  if (!isEncrypted(stored)) return stored // legacy plaintext or non-string — pass through
  if (!_key) throw new Error('session-crypto: no key — cannot decrypt')
  const combined = base64ToBytes(stored.slice(ENC_PREFIX.length))
  const iv = combined.slice(0, IV_BYTES)
  const ct = combined.slice(IV_BYTES)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, ct)
  return JSON.parse(new TextDecoder().decode(pt))
}
