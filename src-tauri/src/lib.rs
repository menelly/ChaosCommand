/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Launch the Flask backend sidecar automatically
      let sidecar = app.shell().sidecar("chaos-command-backend")
        .expect("failed to create sidecar command");
      let (_rx, _child) = sidecar.spawn()
        .expect("failed to spawn backend sidecar");
      log::info!("Backend sidecar started");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
