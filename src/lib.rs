mod commands;
pub mod anime4k;
pub mod profiles;
pub mod miracast;

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

  // Initialize Anime4K state
  let anime4k_state = anime4k::Anime4KState::default();
  
  // Initialize Profile state
  let profile_state = profiles::ProfileState::default();
  
  // Initialize Miracast state
  let miracast_state = miracast::MiracastState::default();

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_websocket::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
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
    .manage(anime4k_state)
    .manage(profile_state)
    .manage(miracast_state)
    .invoke_handler(tauri::generate_handler![
      // Window management commands
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
      // App version command
      get_ayoto_version,
      // Anime4K commands
      anime4k::anime4k_get_presets,
      anime4k::anime4k_get_preset,
      anime4k::anime4k_get_requirements,
      anime4k::anime4k_get_config,
      anime4k::anime4k_set_config,
      anime4k::anime4k_toggle,
      anime4k::anime4k_get_css_filter,
      anime4k::anime4k_recommend_preset,
      // Profile commands
      profiles::profile_get_all,
      profiles::profile_get,
      profiles::profile_get_active,
      profiles::profile_set_active,
      profiles::profile_create,
      profiles::profile_update,
      profiles::profile_update_settings,
      profiles::profile_update_linked_accounts,
      profiles::profile_delete,
      profiles::profile_get_avatars,
      profiles::profile_get_count,
      profiles::profile_can_create,
      // Miracast commands
      miracast::miracast_start_scan,
      miracast::miracast_stop_scan,
      miracast::miracast_get_devices,
      miracast::miracast_connect,
      miracast::miracast_disconnect,
      miracast::miracast_get_session,
      miracast::miracast_start_cast,
      miracast::miracast_stop_cast,
      miracast::miracast_update_position,
      miracast::miracast_set_quality,
      miracast::miracast_is_supported,
      miracast::miracast_get_quality_presets,
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
