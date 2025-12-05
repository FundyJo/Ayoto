mod commands;
pub mod anime4k;
pub mod profiles;
pub mod miracast;

use commands::*;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

/// Store file name for settings persistence
const SETTINGS_STORE_FILE: &str = "settings.json";

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
      current_party: Mutex::new(None),
      party_enabled: Mutex::new(false),
    },
  };

  // Initialize Anime4K state
  let anime4k_state = anime4k::Anime4KState::default();
  
  // Initialize Profile state
  let profile_state = profiles::ProfileState::default();
  
  // Initialize Miracast state
  let miracast_state = miracast::MiracastState::default();

  #[allow(unused_mut)]
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_websocket::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_deep_link::init());

  // Desktop-only plugins
  #[cfg(desktop)]
  {
    builder = builder
      .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        let windows = app.webview_windows();
        if let Some((_, window)) = windows.iter().next() {
          let _ = window.set_focus();
          let _ = window.unminimize();
        }
      }))
      .plugin(tauri_plugin_window_state::Builder::default().build());
  }

  builder
    .manage(app_state)
    .manage(anime4k_state)
    .manage(profile_state)
    .manage(miracast_state)
    .invoke_handler(tauri::generate_handler![
      // Window management commands
      minimize_window,
      maximize_window,
      close_window,
      set_fullscreen,
      is_fullscreen,
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
      // Discord party commands
      discord_create_party,
      discord_get_party,
      discord_update_party_size,
      discord_set_party_open,
      discord_leave_party,
      discord_set_party_enabled,
      discord_get_party_invite,
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
      miracast::miracast_heartbeat,
      miracast::miracast_reconnect,
      miracast::miracast_report_error,
      miracast::miracast_set_auto_reconnect,
      miracast::miracast_get_connection_health,
    ])
    .setup(|app| {
      // Enable logging in both debug and production builds
      // Debug: Debug level for maximum detail
      // Production: Warn level for errors and warnings only
      let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
      } else {
        log::LevelFilter::Warn
      };
      
      // Log startup info
      if cfg!(debug_assertions) {
        log::info!("Starting Zanshin in debug mode");
        log::info!("Log level: {:?}", log_level);
      }
      
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log_level)
          .build(),
      )?;
      
      // Load persisted settings from store
      if let Ok(store) = app.handle().store(SETTINGS_STORE_FILE) {
        if let Some(settings_value) = store.get("settings") {
          if let Ok(persisted_settings) = serde_json::from_value::<Settings>(settings_value.clone()) {
            // Update the managed state with persisted settings
            let state: tauri::State<AppState> = app.state();
            if let Ok(mut settings) = state.settings.lock() {
              if let Some(v) = persisted_settings.upload_limit {
                settings.upload_limit = Some(v);
              }
              if let Some(v) = persisted_settings.download_limit {
                settings.download_limit = Some(v);
              }
              if let Some(v) = persisted_settings.downloads_folder {
                settings.downloads_folder = Some(v);
              }
              if let Some(v) = persisted_settings.backend_port {
                settings.backend_port = Some(v);
              }
              if let Some(v) = persisted_settings.broadcast_discord_rpc {
                settings.broadcast_discord_rpc = Some(v);
                // Also update Discord RPC enabled state
                if let Ok(mut enabled) = state.discord.enabled.lock() {
                  *enabled = v;
                }
              }
              log::info!("Loaded persisted settings from store");
            };
          }
        }
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
