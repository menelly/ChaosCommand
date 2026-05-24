/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 * Licensed under PolyForm Noncommercial 1.0.0.
 */

/**
 * ENCRYPTED BACKUP — honest, boring, store-safe medical-data export.
 *
 * This REPLACES the old "G-Spot" steganographic exporters (webpack-hot-update
 * disguise in g-spot-crypto.ts, fake-Costco-receipt disguise in
 * g-spot-4.0-*.ts). Per Nova's 2026-05-24 security review: disguising medical
 * data as other file types reads as clandestine tradecraft and is an app-store
 * + forensic red flag. ENCRYPTING exported medical data, by contrast, is exactly
 * what a responsible health app is *supposed* to do — expected, legitimate,
 * unremarkable. Security should look boring. This does.
 *
 * Format: a plainly-labeled JSON envelope. Password-based:
 *   PBKDF2(SHA-256, 210k iters) → AES-256-GCM. Random salt + IV per export.
 * No hidden purpose, no time-based keys, no disguise. It says what it is:
 * "this is an encrypted backup; you need the password to read it."
 */

const FORMAT_TAG = 'chaoscommand-encrypted-backup'
const FORMAT_VERSION = 1
const PBKDF2_ITERATIONS = 210_000 // OWASP 2023 floor for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedBackupEnvelope {
  format: typeof FORMAT_TAG
  v: number
  created: string
  kdf: 'PBKDF2-SHA256'
  iterations: number
  cipher: 'AES-256-GCM'
  salt: string // base64
  iv: string // base64
  data: string // base64 ciphertext (+ GCM tag)
  record_count: number
}

// --- small base64 helpers (binary-safe) ----------------------------------
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

// --- key derivation -------------------------------------------------------
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// --- public API -----------------------------------------------------------

/**
 * Encrypt a full data export (the JSON string from exportAllData() — daily_data +
 * tags + image blobs) into a labeled, password-protected backup envelope, so an
 * import round-trips everything importData() can restore. Returns the file content
 * + a suggested filename.
 */
export async function encryptBackup(
  payloadJson: string,
  password: string
): Promise<{ filename: string; content: string }> {
  if (!password) throw new Error('A password is required to encrypt the backup.')

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveAesKey(password, salt)

  const plaintext = new TextEncoder().encode(payloadJson)
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  )

  // best-effort record count for the (cosmetic) envelope field
  let recordCount = 0
  try { recordCount = JSON.parse(payloadJson)?.daily_data?.length ?? 0 } catch { /* leave 0 */ }

  const envelope: EncryptedBackupEnvelope = {
    format: FORMAT_TAG,
    v: FORMAT_VERSION,
    created: new Date().toISOString(),
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(ciphertext),
    record_count: recordCount,
  }

  const date = new Date().toISOString().slice(0, 10)
  return {
    filename: `chaos-command-backup-${date}.ccbackup`,
    content: JSON.stringify(envelope, null, 2),
  }
}

/**
 * Decrypt a backup envelope back into the export JSON string (feed straight to
 * importData()). Throws on a wrong password (AES-GCM tag mismatch) or a
 * malformed/foreign file.
 */
export async function decryptBackup(
  fileContent: string,
  password: string
): Promise<string> {
  if (!password) throw new Error('A password is required to open the backup.')

  let env: EncryptedBackupEnvelope
  try {
    env = JSON.parse(fileContent)
  } catch {
    throw new Error('This file is not a Chaos Command backup (could not parse).')
  }
  if (env?.format !== FORMAT_TAG || !env.data || !env.salt || !env.iv) {
    throw new Error('This file is not a recognized Chaos Command encrypted backup.')
  }

  const salt = base64ToBytes(env.salt)
  const iv = base64ToBytes(env.iv)
  const ciphertext = base64ToBytes(env.data)
  const key = await deriveAesKey(password, salt)

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  } catch {
    // AES-GCM authentication failed — wrong password or tampered file.
    throw new Error('Could not decrypt — wrong password, or the file was modified.')
  }

  // Return the decrypted export JSON string; the caller hands it to importData().
  return new TextDecoder().decode(plaintext)
}

/** Trigger a browser download of the encrypted backup file. */
export function downloadBackup(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
