/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * License validation via Polar.sh
 * Public endpoints only — no API keys in the binary.
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{command, Manager};

// Polar environment selection via Cargo feature flag.
// Default build → production (api.polar.sh + real org).
// `--features sandbox` → sandbox-api.polar.sh + sandbox org.
// Customer-portal endpoints are public (no API key), so a feature flag is
// sufficient — nothing secret leaks into sandbox builds.

#[cfg(not(feature = "sandbox"))]
const POLAR_BASE_URL: &str = "https://api.polar.sh/v1";
#[cfg(feature = "sandbox")]
const POLAR_BASE_URL: &str = "https://sandbox-api.polar.sh/v1";

#[cfg(not(feature = "sandbox"))]
const POLAR_ORG_ID: &str = "039db970-acae-4c1a-88cc-3a3bba63b685";
#[cfg(feature = "sandbox")]
const POLAR_ORG_ID: &str = "22252c63-6c15-4046-9792-5e5f05e4e4d3";

// Paths constructed from the base so a single switch covers everything.
// Using `macro_rules!` + `concat!` would let us keep them as &'static str,
// but a const fn via format_args isn't stable in const context yet, so we
// just build paths at call-time in the three commands below. The base URL
// + path approach is cheap and keeps the feature-flag switch to one place.
const VALIDATE_PATH: &str = "/customer-portal/license-keys/validate";
const ACTIVATE_PATH: &str = "/customer-portal/license-keys/activate";
const DEACTIVATE_PATH: &str = "/customer-portal/license-keys/deactivate";

fn polar_url(path: &str) -> String {
    format!("{}{}", POLAR_BASE_URL, path)
}

// 90 days offline grace — rural users, spotty internet, medical app can't brick
const OFFLINE_GRACE_SECONDS: u64 = 90 * 24 * 60 * 60;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseCache {
    pub key: String,
    pub valid: bool,
    pub activation_id: Option<String>,
    pub validated_at: u64, // unix timestamp
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub valid: bool,
    pub cached: bool,
    pub message: String,
    pub activation_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PolarValidateResponse {
    valid: bool,
}

#[derive(Debug, Deserialize)]
struct PolarActivateResponse {
    id: String,
}

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

    // Try online validation
    let client = reqwest::Client::new();
    let res = client
        .post(polar_url(VALIDATE_PATH))
        .json(&serde_json::json!({
            "key": cache.key,
            "organization_id": POLAR_ORG_ID
        }))
        .send()
        .await;

    match res {
        Ok(response) => {
            if let Ok(body) = response.json::<PolarValidateResponse>().await {
                // Update cache with fresh validation
                let updated = LicenseCache {
                    valid: body.valid,
                    validated_at: now_unix(),
                    ..cache.clone()
                };
                write_cache(&app, &updated);

                Ok(LicenseStatus {
                    valid: body.valid,
                    cached: false,
                    message: if body.valid {
                        "License valid".to_string()
                    } else {
                        "License expired or revoked".to_string()
                    },
                    activation_id: updated.activation_id,
                })
            } else {
                // Parse failed — fall back to cache
                offline_fallback(&cache)
            }
        }
        Err(_) => {
            // Network error — fall back to cache with grace period
            offline_fallback(&cache)
        }
    }
}

fn offline_fallback(cache: &LicenseCache) -> Result<LicenseStatus, String> {
    let age = now_unix().saturating_sub(cache.validated_at);
    if cache.valid && age < OFFLINE_GRACE_SECONDS {
        let days_left = (OFFLINE_GRACE_SECONDS - age) / 86400;
        Ok(LicenseStatus {
            valid: true,
            cached: true,
            message: format!("Offline — valid for {} more days", days_left),
            activation_id: cache.activation_id.clone(),
        })
    } else {
        Ok(LicenseStatus {
            valid: false,
            cached: true,
            message: "License needs online validation".to_string(),
            activation_id: None,
        })
    }
}

#[command]
pub async fn activate_license(app: tauri::AppHandle, key: String) -> Result<LicenseStatus, String> {
    let client = reqwest::Client::new();
    let label = device_label();

    let res = client
        .post(polar_url(ACTIVATE_PATH))
        .json(&serde_json::json!({
            "key": key,
            "organization_id": POLAR_ORG_ID,
            "label": label
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = res.status();

    if status.is_success() {
        let body: PolarActivateResponse = res
            .json()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        let cache = LicenseCache {
            key: key.clone(),
            valid: true,
            activation_id: Some(body.id),
            validated_at: now_unix(),
        };
        write_cache(&app, &cache);

        Ok(LicenseStatus {
            valid: true,
            cached: false,
            message: "License activated".to_string(),
            activation_id: cache.activation_id,
        })
    } else {
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());

        // Still might be valid — could be already activated on this device
        // Try a plain validate instead
        let validate_res = client
            .post(polar_url(VALIDATE_PATH))
            .json(&serde_json::json!({
                "key": key,
                "organization_id": POLAR_ORG_ID
            }))
            .send()
            .await;

        if let Ok(vr) = validate_res {
            if let Ok(body) = vr.json::<PolarValidateResponse>().await {
                if body.valid {
                    let cache = LicenseCache {
                        key,
                        valid: true,
                        activation_id: None,
                        validated_at: now_unix(),
                    };
                    write_cache(&app, &cache);
                    return Ok(LicenseStatus {
                        valid: true,
                        cached: false,
                        message: "License valid (already activated)".to_string(),
                        activation_id: None,
                    });
                }
            }
        }

        Err(format!("Activation failed ({}): {}", status, error_text))
    }
}

#[command]
pub async fn deactivate_license(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    let cache = read_cache(&app).ok_or("No license to deactivate")?;

    let activation_id = cache
        .activation_id
        .as_ref()
        .ok_or("No activation ID — license was validated but not activated on this device")?;

    let client = reqwest::Client::new();
    let res = client
        .post(polar_url(DEACTIVATE_PATH))
        .json(&serde_json::json!({
            "key": cache.key,
            "organization_id": POLAR_ORG_ID,
            "activation_id": activation_id
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if res.status().is_success() {
        clear_cache(&app);
        Ok(LicenseStatus {
            valid: false,
            cached: false,
            message: "License deactivated — device slot freed".to_string(),
            activation_id: None,
        })
    } else {
        let error_text = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Err(format!("Deactivation failed: {}", error_text))
    }
}

#[command]
pub fn get_cached_license(app: tauri::AppHandle) -> Option<LicenseCache> {
    read_cache(&app)
}
