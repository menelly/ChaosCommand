/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

mod license;
mod sync;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(sync::SyncState {
      session: Mutex::new(None),
    })
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      license::validate_license,
      license::activate_license,
      license::deactivate_license,
      license::get_cached_license,
      sync::sync_start_host,
      sync::sync_send_data,
      sync::sync_receive_data,
      sync::sync_stop,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
