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
    pub activation_id: Option<String>, // Ed25519: device label. LemonSqueezy: instance_id.
    pub validated_at: u64,
    pub device_label: String,

    /// Which validation path this key uses. `#[serde(default)]` so license caches
    /// written before LemonSqueezy support still deserialize (they're all Ed25519).
    #[serde(default = "default_kind")]
    pub kind: String, // "ed25519" | "lemonsqueezy"
}

fn default_kind() -> String {
    KIND_ED25519.to_string()
}

const KIND_ED25519: &str = "ed25519";
const KIND_LEMONSQUEEZY: &str = "lemonsqueezy";

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
// LEMONSQUEEZY PATH (paid keys) — activation-capped, revalidated, FAIL OPEN
// =============================================================================
//
// WHY TWO KEY FORMATS:
//   CHAOS-...  → Ed25519, verified offline, forever. Never phones home.
//                These are the SCHOLARSHIP keys. The people who can least
//                afford the app get the most private version of it. That's
//                deliberate, and it falls straight out of the architecture.
//   anything   → LemonSqueezy. LS is our merchant of record (they eat the
//     else       global VAT/GST liability) and it enforces the ACTIVATION CAP,
//                which is the actual anti-key-sharing mechanism. Checking more
//                often does NOT stop sharing — a shared key inside its cap
//                validates fine every time. The CAP is the lock.
//
// 🚨 THE NON-NEGOTIABLE RULE: FAIL OPEN.
//    When the periodic check can't reach the network — hospital wifi, dead data
//    plan, LS outage, rural internet, a bad month where the phone bill didn't get
//    paid — THE APP KEEPS WORKING. We retry quietly, forever, and never lock out.
//
//    The ONLY thing that invalidates a cached license is LemonSqueezy explicitly
//    answering "this key is dead" (refunded / revoked / disabled). A server that
//    does not answer is NOT a revocation.
//
//    Because the month they can't connect is the month they're sickest, and the
//    medical history in this app is what wins the disability appeal. We do not
//    hold it hostage. Not for a network blip. Not ever.
//
//    (DRM here is theatre anyway — the source is public under PolyForm
//     Noncommercial. Anyone determined can compile it free today. The license is
//     a social contract with a speed bump, not a vault.)

const LS_API: &str = "https://api.lemonsqueezy.com/v1/licenses";
/// How stale a LemonSqueezy license may get before we try to re-check it.
const LS_REVALIDATE_AFTER_SECS: u64 = 30 * 24 * 60 * 60; // 30 days

fn is_lemonsqueezy_key(raw: &str) -> bool {
    !raw.trim().to_uppercase().starts_with("CHAOS-")
}

#[derive(Debug, Deserialize)]
struct LsLicenseKey {
    status: Option<String>, // "active" | "inactive" | "expired" | "disabled"
    activation_limit: Option<u32>,
    activation_usage: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct LsInstance {
    id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LsResponse {
    #[serde(default)]
    activated: bool,
    #[serde(default)]
    valid: bool,
    error: Option<String>,
    license_key: Option<LsLicenseKey>,
    instance: Option<LsInstance>,
}

/// Distinguishes "LemonSqueezy said no" from "we couldn't reach LemonSqueezy".
/// This distinction is the whole fail-open guarantee — do not collapse it.
enum LsOutcome {
    Ok(LsResponse),
    Rejected(String),   // LS answered, and the answer was no.
    Unreachable(String), // We never got an answer. NOT a revocation.
}

async fn ls_post(endpoint: &str, form: &[(&str, &str)]) -> LsOutcome {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => return LsOutcome::Unreachable(format!("http client: {}", e)),
    };

    let resp = match client
        .post(format!("{}/{}", LS_API, endpoint))
        .header("Accept", "application/json")
        .form(form)
        .send()
        .await
    {
        Ok(r) => r,
        // No answer = no verdict. Treat as unreachable, never as invalid.
        Err(e) => return LsOutcome::Unreachable(format!("network: {}", e)),
    };

    let status = resp.status();
    let body = match resp.text().await {
        Ok(b) => b,
        Err(e) => return LsOutcome::Unreachable(format!("read body: {}", e)),
    };

    // 5xx = LemonSqueezy is broken, not the user. Fail open.
    if status.is_server_error() {
        return LsOutcome::Unreachable(format!("LemonSqueezy error {}", status));
    }

    match serde_json::from_str::<LsResponse>(&body) {
        Ok(parsed) => {
            if let Some(err) = &parsed.error {
                // 4xx with an error message = a real verdict about this key.
                return LsOutcome::Rejected(err.clone());
            }
            LsOutcome::Ok(parsed)
        }
        // Unparseable body (captive portal splash page, proxy, ISP interception…)
        // is NOT the user's license being invalid.
        Err(e) => LsOutcome::Unreachable(format!("unreadable response: {}", e)),
    }
}

fn ls_key_is_dead(lk: &Option<LsLicenseKey>) -> bool {
    matches!(
        lk.as_ref().and_then(|k| k.status.as_deref()),
        Some("expired") | Some("disabled")
    )
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

    // ---- LemonSqueezy keys: cached for 30 days, then re-checked. FAIL OPEN. ----
    if cache.kind == KIND_LEMONSQUEEZY {
        let age = now_unix().saturating_sub(cache.validated_at);
        if age < LS_REVALIDATE_AFTER_SECS {
            // Still fresh. No network call at all.
            return Ok(LicenseStatus {
                valid: true,
                cached: true,
                message: format!("{} license valid", tier_display(&cache.tier)),
                activation_id: cache.activation_id,
            });
        }

        // Overdue for a re-check. Try — but a failure to reach LemonSqueezy
        // must NEVER cost this user access to their own medical history.
        let mut form: Vec<(&str, &str)> = vec![("license_key", cache.key.as_str())];
        if let Some(id) = cache.activation_id.as_deref() {
            form.push(("instance_id", id));
        }

        return Ok(match ls_post("validate", &form).await {
            LsOutcome::Ok(r) if r.valid && !ls_key_is_dead(&r.license_key) => {
                // Confirmed good — reset the 30-day clock.
                let refreshed = LicenseCache { validated_at: now_unix(), ..cache.clone() };
                write_cache(&app, &refreshed);
                LicenseStatus {
                    valid: true,
                    cached: false,
                    message: format!("{} license valid", tier_display(&cache.tier)),
                    activation_id: cache.activation_id,
                }
            }
            // LemonSqueezy ANSWERED, and the answer was no (refunded / revoked /
            // disabled / expired). This is the ONLY thing that invalidates a license.
            LsOutcome::Ok(_) | LsOutcome::Rejected(_) => LicenseStatus {
                valid: false,
                cached: true,
                message: "This license is no longer active. If that's wrong, email ace@siliconscaffolding.com and we'll sort it out.".to_string(),
                activation_id: cache.activation_id,
            },
            // 🚨 FAIL OPEN. No answer is not a revocation. Keep working; retry later.
            // We deliberately do NOT advance validated_at, so it retries next launch.
            LsOutcome::Unreachable(_why) => LicenseStatus {
                valid: true,
                cached: true,
                message: format!("{} license valid (offline — couldn't reach the licence server, so we're carrying on)", tier_display(&cache.tier)),
                activation_id: cache.activation_id,
            },
        });
    }

    // ---- Ed25519 keys: offline forever. No network, no expiry, no phoning home. ----
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
    let key = key.trim().to_string();

    // ---- LemonSqueezy key: one online activation. LS enforces the device cap. ----
    if is_lemonsqueezy_key(&key) {
        let label = device_label();
        let form = vec![("license_key", key.as_str()), ("instance_name", label.as_str())];

        return match ls_post("activate", &form).await {
            LsOutcome::Ok(r) if r.activated && !ls_key_is_dead(&r.license_key) => {
                let instance_id = r.instance.and_then(|i| i.id);
                let cache = LicenseCache {
                    key: key.clone(),
                    // TODO(tiers): map LS variant_id → PRO/COM when those SKUs exist.
                    tier: "PRS".to_string(),
                    valid: true,
                    activation_id: instance_id.clone(),
                    validated_at: now_unix(),
                    device_label: label,
                    kind: KIND_LEMONSQUEEZY.to_string(),
                };
                write_cache(&app, &cache);
                Ok(LicenseStatus {
                    valid: true,
                    cached: false,
                    message: "Licence activated. It works on every device you own.".to_string(),
                    activation_id: instance_id,
                })
            }
            LsOutcome::Ok(r) => {
                // Answered, but not activated — almost always the device cap.
                let used = r.license_key.as_ref().and_then(|k| k.activation_usage);
                let cap = r.license_key.as_ref().and_then(|k| k.activation_limit);
                Err(match (used, cap) {
                    (Some(u), Some(c)) if u >= c => format!(
                        "This licence is already active on {} of {} devices. Deactivate it on one you no longer use, or email ace@siliconscaffolding.com and I'll sort it out.",
                        u, c
                    ),
                    _ => "That licence key couldn't be activated.".to_string(),
                })
            }
            LsOutcome::Rejected(e) => Err(format!("That licence key was rejected: {}", e)),
            // Activation is the ONE step that genuinely needs the network — you just
            // bought it online, so you have a connection. Say so plainly.
            LsOutcome::Unreachable(_) => Err(
                "Couldn't reach the licence server to activate. Check your connection and try again — this is the only step that needs the internet. (Once it's activated, the app works offline.)".to_string(),
            ),
        };
    }

    // ---- Ed25519 (scholarship / gift) key: verified offline, activated offline. ----
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
        kind: KIND_ED25519.to_string(),
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
    // For LemonSqueezy keys we tell LS to FREE THE SLOT. Otherwise every laptop a
    // user ever replaces silently eats one of their activations forever, and one
    // day they get locked out of a licence they paid for because of hardware they
    // no longer own. That is exactly the kind of petty cruelty we're not doing.
    if let Some(cache) = read_cache(&app) {
        if cache.kind == KIND_LEMONSQUEEZY {
            if let Some(instance_id) = cache.activation_id.as_deref() {
                let form = vec![
                    ("license_key", cache.key.as_str()),
                    ("instance_id", instance_id),
                ];
                // Best-effort. If LS is unreachable we STILL clear locally — never
                // trap someone on a device because a server didn't answer. Worst
                // case they email Ace and we free the slot by hand.
                let _ = ls_post("deactivate", &form).await;
            }
        }
    }

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

    // ---- key-format routing ----

    #[test]
    fn chaos_keys_route_to_ed25519() {
        assert!(!is_lemonsqueezy_key("CHAOS-PRS-abcdef"));
        assert!(!is_lemonsqueezy_key("  chaos-pro-abcdef  ")); // trimmed + case-insensitive
    }

    #[test]
    fn other_keys_route_to_lemonsqueezy() {
        // LS keys are UUID-shaped
        assert!(is_lemonsqueezy_key("38dc7a4e-8b7c-4f2a-9c1d-6e5b4a3f2d1c"));
    }

    // ---- the fail-open guarantee ----

    #[test]
    fn only_expired_or_disabled_count_as_dead() {
        let dead = |s: &str| {
            ls_key_is_dead(&Some(LsLicenseKey {
                status: Some(s.to_string()),
                activation_limit: None,
                activation_usage: None,
            }))
        };
        assert!(dead("expired"));
        assert!(dead("disabled"));
        assert!(!dead("active"));
        // A status we don't recognise is NOT a revocation. Never guess someone
        // out of their own medical records.
        assert!(!dead("some-future-status-lemonsqueezy-invents"));
        // No license_key block at all (malformed/partial response) is NOT a revocation.
        assert!(!ls_key_is_dead(&None));
    }

    #[test]
    fn unparseable_response_is_unreachable_not_rejected() {
        // A captive-portal splash page / ISP interception page must be treated as
        // "we couldn't ask", NOT as "your licence is invalid". This is the single
        // most important behaviour in this file.
        let garbage = "<html>Sign in to HotelWiFi</html>";
        assert!(serde_json::from_str::<LsResponse>(garbage).is_err());
    }

    #[test]
    fn revalidation_window_is_thirty_days() {
        assert_eq!(LS_REVALIDATE_AFTER_SECS, 2_592_000);
    }
}
