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
mod store;
mod sync;
mod trial;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;

/// Desktop "keep running in the tray so reminders keep firing" flag. OFF by
/// default — the user opts in via Settings → Notifications. The frontend syncs
/// this from the stored setting on startup and on toggle via `set_background_mode`.
/// When true, closing the window hides it to the tray instead of quitting, so
/// the in-app reminder ticker stays alive (desktop has no OS-scheduled
/// notifications — see notification-service.ts).
pub struct BackgroundMode(pub AtomicBool);

/// Frontend → backend: reflect the user's "remind me on desktop" choice into the
/// close-to-tray behaviour. (Autostart-on-login is toggled separately from JS
/// via the autostart plugin.)
#[tauri::command]
fn set_background_mode(enabled: bool, state: tauri::State<BackgroundMode>) {
  state.0.store(enabled, Ordering::Relaxed);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[allow(unused_mut)]
  let mut builder = tauri::Builder::default()
    .manage(sync::SyncState {
      session: Mutex::new(None),
    })
    .manage(BackgroundMode(AtomicBool::new(false)))
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init());

  // Desktop-only: autostart-on-login + close-to-tray. Both gated so the Android
  // build (which has neither concept) never compiles them.
  #[cfg(desktop)]
  {
    builder = builder
      .plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None::<Vec<&str>>,
      ))
      .on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
          let bg = window.state::<BackgroundMode>();
          if bg.0.load(Ordering::Relaxed) {
            // Opted into background reminders → hide to tray, keep the process
            // (and its reminder ticker) alive instead of exiting.
            api.prevent_close();
            let _ = window.hide();
          }
        }
      });
  }

  builder
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
      // Stash the AppHandle so the server thread can emit Tauri events
      // when an incoming /sync request lands data in the inbox.
      *server_state.app_handle.lock().expect("app_handle lock") =
        Some(app.handle().clone());
      // Best-effort spawn — if the bind fails (e.g. firewall on Windows
      // first-launch) we don't want to crash the whole app. The frontend
      // surfaces a clear error when it queries the bound port and gets
      // nothing back.
      if let Err(e) = server::spawn_server(Arc::clone(&server_state)) {
        eprintln!("[chaos-sync] failed to start persistent server: {}", e);
      }
      app.manage(server_state);
      app.manage(peer_store);

      // Desktop tray: lets the user reopen the window after close-to-tray, and
      // fully quit. Built unconditionally on desktop (cheap); the window only
      // actually hides-to-tray when the user opted into background reminders.
      #[cfg(desktop)]
      {
        use tauri::menu::{MenuBuilder, MenuItemBuilder};
        use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

        let show = MenuItemBuilder::with_id("show", "Show Chaos Command").build(app)?;
        let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
        let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

        TrayIconBuilder::with_id("main")
          .icon(app.default_window_icon().cloned().expect("default window icon"))
          .tooltip("Chaos Command")
          .menu(&menu)
          .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
              if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
              }
            }
            "quit" => app.exit(0),
            _ => {}
          })
          .on_tray_icon_event(|tray, event| {
            // Left-click the tray icon → restore the window.
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event
            {
              let app = tray.app_handle();
              if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
              }
            }
          })
          .build(app)?;
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      set_background_mode,
      license::validate_license,
      license::activate_license,
      license::deactivate_license,
      license::get_cached_license,
      trial::get_trial_status,
      store::check_store_entitlement,
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
      sync::sync_drain_inbox,
      sync::sync_list_peers,
      sync::sync_remove_peer,
      sync::sync_rename_peer,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
