mod commands;

use commands::*;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app_state = AppState {
    settings: Mutex::new(Settings {
      upload_limit: Some(-1),
      download_limit: Some(-1),
      downloads_folder: None,
      backend_port: Some(64621),
      broadcast_discord_rpc: Some(true),
    }),
    discord: DiscordRpcState {
      client: Mutex::new(None),
      enabled: Mutex::new(true),
    },
  };

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_websocket::init())
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      let windows = app.webview_windows();
      if let Some((_, window)) = windows.iter().next() {
        let _ = window.set_focus();
        let _ = window.unminimize();
      }
    }))
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .manage(app_state)
    .invoke_handler(tauri::generate_handler![
      minimize_window,
      maximize_window,
      close_window,
      open_folder,
      oauth_login,
      open_vlc,
      open_animepahe,
      window_reload,
      save_to_settings,
      get_settings_json,
      change_downloads_folder,
      change_backend_port,
      set_discord_rpc,
      broadcast_discord_rpc,
    ])
    .setup(|app| {
      // Enable logging in both debug and production builds
      // Debug: Info level for detailed debugging
      // Production: Warn level for errors and warnings only
      let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Info
      } else {
        log::LevelFilter::Warn
      };
      
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log_level)
          .build(),
      )?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
