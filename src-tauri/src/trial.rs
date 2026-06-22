/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * trial.rs — 14-day full-feature trial clock.
 *
 * The store model (see STORE_LAUNCH): free download + a 14-day in-app trial we
 * control, then a one-time unlock (offline Ed25519 key OR store IAP). This file
 * owns ONLY the clock: it stamps the first-launch time into the app data dir and
 * reports days remaining. The trial is goodwill — a determined user can delete
 * the file to reset it; that's an accepted tradeoff. The real gate is the
 * key/IAP entitlement (license.rs + the TS entitlement resolver).
 */

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{command, Manager};

const TRIAL_DAYS: u64 = 14;
const SECS_PER_DAY: u64 = 86_400;

#[derive(Debug, Serialize, Deserialize)]
struct TrialRecord {
    started_at: u64, // unix seconds — first launch
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrialStatus {
    pub started_at: u64,
    pub days_total: u64,
    pub days_remaining: i64,    // floored at 0
    pub seconds_remaining: i64, // floored at 0
    pub expired: bool,
}

fn trial_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join("trial.json")
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn read_record(app: &tauri::AppHandle) -> Option<TrialRecord> {
    let data = fs::read_to_string(trial_path(app)).ok()?;
    serde_json::from_str(&data).ok()
}

fn write_record(app: &tauri::AppHandle, rec: &TrialRecord) {
    if let Ok(data) = serde_json::to_string_pretty(rec) {
        fs::write(trial_path(app), data).ok();
    }
}

/// Pure clock math — split out so it's unit-testable without a real AppHandle.
fn status_from(started_at: u64, now: u64) -> TrialStatus {
    let elapsed = now.saturating_sub(started_at);
    let total_secs = (TRIAL_DAYS * SECS_PER_DAY) as i64;
    let seconds_remaining = total_secs - elapsed as i64;
    let expired = seconds_remaining <= 0;
    let days_remaining = if expired {
        0
    } else {
        (seconds_remaining as f64 / SECS_PER_DAY as f64).ceil() as i64
    };
    TrialStatus {
        started_at,
        days_total: TRIAL_DAYS,
        days_remaining,
        seconds_remaining: seconds_remaining.max(0),
        expired,
    }
}

/// Returns the trial status, INITIALIZING the trial on first call (first launch
/// stamps "now"). Idempotent: later calls read the stored start time.
#[command]
pub fn get_trial_status(app: tauri::AppHandle) -> TrialStatus {
    let started_at = match read_record(&app) {
        Some(rec) => rec.started_at,
        None => {
            let now = now_unix();
            write_record(&app, &TrialRecord { started_at: now });
            now
        }
    };
    status_from(started_at, now_unix())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_trial_has_full_days() {
        let now = 1_000_000_000;
        let s = status_from(now, now);
        assert_eq!(s.days_total, 14);
        assert!(!s.expired);
        assert_eq!(s.days_remaining, 14);
    }

    #[test]
    fn ten_days_in_leaves_four() {
        let start = 1_000_000_000;
        let now = start + 10 * SECS_PER_DAY;
        let s = status_from(start, now);
        assert!(!s.expired);
        assert_eq!(s.days_remaining, 4);
    }

    #[test]
    fn exactly_fourteen_days_is_expired() {
        let start = 1_000_000_000;
        let now = start + 14 * SECS_PER_DAY;
        let s = status_from(start, now);
        assert!(s.expired);
        assert_eq!(s.days_remaining, 0);
        assert_eq!(s.seconds_remaining, 0);
    }

    #[test]
    fn past_expiry_clamps_at_zero() {
        let start = 1_000_000_000;
        let now = start + 30 * SECS_PER_DAY;
        let s = status_from(start, now);
        assert!(s.expired);
        assert_eq!(s.days_remaining, 0);
        assert_eq!(s.seconds_remaining, 0);
    }

    #[test]
    fn partial_day_rounds_up() {
        // 13 days + 1 hour elapsed → ~22h left → still "1 day" remaining.
        let start = 1_000_000_000;
        let now = start + 13 * SECS_PER_DAY + 3600;
        let s = status_from(start, now);
        assert!(!s.expired);
        assert_eq!(s.days_remaining, 1);
    }
}
