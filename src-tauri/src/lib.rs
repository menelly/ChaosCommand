/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

mod license;
mod peers;
mod server;
mod sync;

use std::sync::{Arc, Mutex};
use tauri::Manager;

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
    .setup(|app| {
      // Persistent peer registry + auto-sync HTTP server. We load the
      // registry from disk (creating a fresh one with a self_peer_id on
      // first run) and spawn the server thread before returning so the
      // frontend can immediately query the bound port.
      let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
      let peer_store = Arc::new(peers::PeerStore::load(&app_data_dir)?);
      let server_state = Arc::new(server::ServerState::new(Arc::clone(&peer_store)));
      // Best-effort spawn — if the bind fails (e.g. firewall on Windows
      // first-launch) we don't want to crash the whole app. The frontend
      // surfaces a clear error when it queries the bound port and gets
      // nothing back.
      if let Err(e) = server::spawn_server(Arc::clone(&server_state)) {
        eprintln!("[chaos-sync] failed to start persistent server: {}", e);
      }
      app.manage(server_state);
      app.manage(peer_store);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      license::validate_license,
      license::activate_license,
      license::deactivate_license,
      license::get_cached_license,
      // Deprecated one-shot commands — return a clear error for any
      // frontend that hasn't been migrated yet.
      sync::sync_start_host,
      sync::sync_send_data,
      sync::sync_receive_data,
      sync::sync_stop,
      // New auto-sync command surface.
      sync::sync_get_self_info,
      sync::sync_open_pairing_window,
      sync::sync_close_pairing_window,
      sync::sync_complete_pairing,
      sync::sync_to_peer,
      sync::sync_publish_snapshot,
      sync::sync_list_peers,
      sync::sync_remove_peer,
      sync::sync_rename_peer,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
