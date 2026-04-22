/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * License validation via Ed25519-signed keys.
 *
 * Keys are issued by the seller (Ren) using the generate_keys.py tool in
 * E:/Ace/chaos-command-licensing, which signs each key with an Ed25519
 * private key. The public key below verifies the signature offline —
 * no network call, no server dependency, no central authority to fail.
 *
 * This is the opposite of the old Polar implementation (v0.1-ish) which
 * needed HTTPS to api.polar.sh for every validation. Ed25519 offline
 * works for:
 *   - itch.io distribution (buyer gets key from itch, pastes into app)
 *   - email delivery (Ren emails keys to friends / scholarship recipients)
 *   - USB handoff (medical users in connectivity-poor areas)
 *   - 15-year-old potato laptops in basements
 *
 * Key format:
 *   CHAOS-{TIER}-{base64url(nonce[16] || signature[64])}
 *
 * where TIER is 3 chars (PRS / PRO / COM) and the signed payload is
 * the UTF-8 string "{TIER}:{hex(nonce)}".
 */

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{command, Manager};

// =============================================================================
// CRYPTO: Ed25519 PUBLIC KEY (embedded; private key is NOT in the binary)
// =============================================================================

// Generated 2026-04-22. If this ever needs rotation, all outstanding keys
// issued with the old signing key become invalid; regenerate and redistribute.
const LICENSE_PUBLIC_KEY_BYTES: [u8; PUBLIC_KEY_LENGTH] = [
    0x88, 0x82, 0x81, 0xB5, 0x9E, 0xA9, 0x64, 0xC6, 0xBB, 0xFC, 0xF6, 0xB1, 0xA0, 0xBB, 0x93, 0x0B,
    0x01, 0xE5, 0x1F, 0x0A, 0x45, 0x1B, 0x52, 0x0A, 0x99, 0x5B, 0x65, 0xAD, 0x40, 0x8B, 0xD9, 0xB1,
];

const NONCE_LENGTH: usize = 16;

// =============================================================================
// DATA TYPES
// =============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseCache {
    pub key: String,
    pub tier: String,         // "PRS" | "PRO" | "COM"
    pub valid: bool,
    pub activation_id: Option<String>, // kept for frontend compatibility
    pub validated_at: u64,
    pub device_label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub valid: bool,
    pub cached: bool,
    pub message: String,
    pub activation_id: Option<String>,
}

// =============================================================================
// KEY PARSING & VERIFICATION
// =============================================================================

#[derive(Debug)]
struct ParsedKey {
    tier: String,        // "PRS" | "PRO" | "COM"
    nonce: [u8; NONCE_LENGTH],
    signature: [u8; SIGNATURE_LENGTH],
}

fn parse_key(raw: &str) -> Result<ParsedKey, String> {
    let trimmed = raw.trim();
    let parts: Vec<&str> = trimmed.splitn(3, '-').collect();
    if parts.len() != 3 {
        return Err("Invalid key format: expected CHAOS-TIER-BLOB".into());
    }
    if parts[0] != "CHAOS" {
        return Err("Invalid key prefix".into());
    }
    let tier = parts[1].to_string();
    if !matches!(tier.as_str(), "PRS" | "PRO" | "COM") {
        return Err(format!("Unknown tier: {}", tier));
    }

    let blob = URL_SAFE_NO_PAD
        .decode(parts[2])
        .map_err(|e| format!("Invalid key body (base64url): {}", e))?;

    if blob.len() != NONCE_LENGTH + SIGNATURE_LENGTH {
        return Err(format!(
            "Invalid key body length: expected {} bytes, got {}",
            NONCE_LENGTH + SIGNATURE_LENGTH,
            blob.len()
        ));
    }

    let mut nonce = [0u8; NONCE_LENGTH];
    nonce.copy_from_slice(&blob[..NONCE_LENGTH]);

    let mut signature = [0u8; SIGNATURE_LENGTH];
    signature.copy_from_slice(&blob[NONCE_LENGTH..]);

    Ok(ParsedKey { tier, nonce, signature })
}

fn verify_key(parsed: &ParsedKey) -> Result<(), String> {
    let verifying_key = VerifyingKey::from_bytes(&LICENSE_PUBLIC_KEY_BYTES)
        .map_err(|e| format!("Public key setup error: {}", e))?;

    let sig = Signature::from_bytes(&parsed.signature);

    // Reconstruct the exact payload that was signed on the seller side:
    //   "{TIER}:{hex(nonce)}"
    let hex_nonce: String = parsed.nonce.iter().map(|b| format!("{:02x}", b)).collect();
    let payload = format!("{}:{}", parsed.tier, hex_nonce);

    verifying_key
        .verify(payload.as_bytes(), &sig)
        .map_err(|_| "Signature does not match — key is not valid.".to_string())
}

// =============================================================================
// CACHE (local JSON next to app data)
// =============================================================================

fn cache_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("license_cache.json")
}

fn read_cache(app: &tauri::AppHandle) -> Option<LicenseCache> {
    let path = cache_path(app);
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

fn write_cache(app: &tauri::AppHandle, cache: &LicenseCache) {
    let path = cache_path(app);
    if let Ok(data) = serde_json::to_string_pretty(cache) {
        fs::write(path, data).ok();
    }
}

fn clear_cache(app: &tauri::AppHandle) {
    let path = cache_path(app);
    fs::remove_file(path).ok();
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn device_label() -> String {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    format!("chaos-command-{}", hostname)
}

fn tier_display(code: &str) -> &'static str {
    match code {
        "PRS" => "Personal",
        "PRO" => "Professional",
        "COM" => "Commercial",
        _ => "Unknown",
    }
}

// =============================================================================
// TAURI COMMANDS (frontend IPC interface unchanged)
// =============================================================================

#[command]
pub async fn validate_license(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    let cache = match read_cache(&app) {
        Some(c) => c,
        None => {
            return Ok(LicenseStatus {
                valid: false,
                cached: false,
                message: "No license key found".to_string(),
                activation_id: None,
            })
        }
    };

    // Re-verify signature every time — belt AND suspenders. A tampered cache
    // file with valid=true but wrong signature should still fail.
    let parsed = match parse_key(&cache.key) {
        Ok(p) => p,
        Err(e) => {
            return Ok(LicenseStatus {
                valid: false,
                cached: true,
                message: format!("Cached license unreadable: {}", e),
                activation_id: None,
            });
        }
    };

    match verify_key(&parsed) {
        Ok(()) => Ok(LicenseStatus {
            valid: true,
            cached: true,
            message: format!("{} license valid", tier_display(&parsed.tier)),
            activation_id: cache.activation_id,
        }),
        Err(e) => Ok(LicenseStatus {
            valid: false,
            cached: true,
            message: e,
            activation_id: None,
        }),
    }
}

#[command]
pub async fn activate_license(
    app: tauri::AppHandle,
    key: String,
) -> Result<LicenseStatus, String> {
    let parsed = parse_key(&key).map_err(|e| format!("Invalid license key: {}", e))?;
    verify_key(&parsed).map_err(|e| e)?;

    let label = device_label();
    let cache = LicenseCache {
        key: key.clone(),
        tier: parsed.tier.clone(),
        valid: true,
        activation_id: Some(label.clone()), // local-only; no server-side slot tracking
        validated_at: now_unix(),
        device_label: label,
    };
    write_cache(&app, &cache);

    Ok(LicenseStatus {
        valid: true,
        cached: false,
        message: format!("{} license activated", tier_display(&parsed.tier)),
        activation_id: cache.activation_id,
    })
}

#[command]
pub async fn deactivate_license(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    // Offline deactivation just clears the local cache. There's no central
    // "slot" to free on a remote server; the concept is device-local.
    // Users who want to move to a new machine just activate there with the
    // same key. Seller-side slot enforcement (if desired later) would need
    // a central validation server.
    clear_cache(&app);
    Ok(LicenseStatus {
        valid: false,
        cached: false,
        message: "License deactivated on this device".to_string(),
        activation_id: None,
    })
}

#[command]
pub fn get_cached_license(app: tauri::AppHandle) -> Option<LicenseCache> {
    read_cache(&app)
}

// =============================================================================
// TESTS (cargo test --lib license::tests) — optional but useful
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_invalid_prefix_rejected() {
        assert!(parse_key("NOPE-PRS-abc").is_err());
    }

    #[test]
    fn parse_invalid_tier_rejected() {
        assert!(parse_key("CHAOS-XYZ-abc").is_err());
    }

    #[test]
    fn parse_too_short_rejected() {
        assert!(parse_key("CHAOS-PRS-abc").is_err());
    }

    #[test]
    fn verify_fake_signature_rejected() {
        // 80 bytes of zeros — valid length, but signature won't verify
        let fake_blob = vec![0u8; NONCE_LENGTH + SIGNATURE_LENGTH];
        let encoded = URL_SAFE_NO_PAD.encode(&fake_blob);
        let key = format!("CHAOS-PRS-{}", encoded);
        let parsed = parse_key(&key).unwrap();
        assert!(verify_key(&parsed).is_err());
    }
}
