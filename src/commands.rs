use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};

const DISCORD_CLIENT_ID: &str = "1334161510120816680";
const DISCORD_DEFAULT_DETAILS: &str = "Browsing Anime";
const DISCORD_DEFAULT_STATE: &str = "Looking for anime to watch";
const DISCORD_DOWNLOAD_URL: &str = "https://github.com/hitarth-gg/zenshin/releases/latest";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub upload_limit: Option<i32>,
    pub download_limit: Option<i32>,
    pub downloads_folder: Option<String>,
    pub backend_port: Option<u16>,
    pub broadcast_discord_rpc: Option<bool>,
}

pub struct DiscordRpcState {
    pub client: Mutex<Option<DiscordIpcClient>>,
    pub enabled: Mutex<bool>,
}

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub discord: DiscordRpcState,
}

/// Creates a new Discord IPC client and connects to Discord
fn create_discord_client() -> Option<DiscordIpcClient> {
    let mut client = DiscordIpcClient::new(DISCORD_CLIENT_ID);
    if client.connect().is_ok() {
        Some(client)
    } else {
        log::warn!("Failed to connect to Discord");
        None
    }
}

/// Creates the default Discord activity with optional custom details and state
fn create_activity<'a>(details: &'a str, state: &'a str) -> activity::Activity<'a> {
    activity::Activity::new()
        .details(details)
        .state(state)
        .buttons(vec![
            activity::Button::new("Download app", DISCORD_DOWNLOAD_URL)
        ])
}

#[tauri::command]
pub fn minimize_window(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn maximize_window(window: Window) -> Result<(), String> {
    let is_maximized = window.is_maximized()
        .map_err(|e| format!("Failed to query window state: {}", e))?;
    
    if is_maximized {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn close_window(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn oauth_login(url: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    let _ = app.shell().open(&url, None);
    Ok(())
}

#[tauri::command]
pub async fn open_vlc(command: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", &command])
            .spawn()
            .map_err(|e| format!("Failed to launch VLC: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("sh")
            .args(&["-c", &command])
            .spawn()
            .map_err(|e| format!("Failed to launch VLC: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_animepahe(url: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    let _ = app.shell().open(&url, None);
    Ok(())
}

#[tauri::command]
pub fn window_reload(window: Window) -> Result<(), String> {
    use tauri::Emitter;
    window.emit("tauri://reload", ()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn save_to_settings(
    key: String,
    value: serde_json::Value,
    state: State<'_, AppState>
) -> Result<(), String> {
    let mut settings = state.settings.lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    
    match key.as_str() {
        "uploadLimit" => {
            if let Some(v) = value.as_i64() {
                settings.upload_limit = Some(v as i32);
            }
        }
        "downloadLimit" => {
            if let Some(v) = value.as_i64() {
                settings.download_limit = Some(v as i32);
            }
        }
        "downloadsFolder" => {
            if let Some(v) = value.as_str() {
                settings.downloads_folder = Some(v.to_string());
            }
        }
        "backendPort" => {
            if let Some(v) = value.as_u64() {
                settings.backend_port = Some(v as u16);
            }
        }
        _ => {}
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_settings_json(state: State<'_, AppState>) -> Result<Settings, String> {
    let settings = state.settings.lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn change_downloads_folder(state: State<'_, AppState>) -> Result<Settings, String> {
    // TODO: Implement folder selection dialog using tauri-plugin-dialog
    // For now, returning current settings as placeholder
    // Future implementation should use:
    // use tauri_plugin_dialog::DialogExt;
    // let folder = app.dialog().file().pick_folder().await;
    let settings = state.settings.lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn change_backend_port(port: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    settings.backend_port = Some(port);
    Ok(())
}

#[tauri::command]
pub async fn set_discord_rpc(activity_details: serde_json::Value, state: State<'_, AppState>) -> Result<(), String> {
    let enabled = *state.discord.enabled.lock()
        .map_err(|e| format!("Failed to lock discord enabled state: {}", e))?;
    
    if !enabled {
        return Ok(());
    }

    let mut client_guard = state.discord.client.lock()
        .map_err(|e| format!("Failed to lock discord client: {}", e))?;
    
    if client_guard.is_none() {
        *client_guard = create_discord_client();
        if client_guard.is_none() {
            return Ok(());
        }
    }

    if let Some(ref mut client) = *client_guard {
        let details = activity_details.get("details")
            .and_then(|v| v.as_str())
            .unwrap_or(DISCORD_DEFAULT_DETAILS);
        
        let state_text = activity_details.get("state")
            .and_then(|v| v.as_str())
            .unwrap_or(DISCORD_DEFAULT_STATE);

        let act = create_activity(details, state_text);

        if let Err(e) = client.set_activity(act) {
            log::warn!("Failed to set Discord activity: {:?}", e);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn broadcast_discord_rpc(value: bool, state: State<'_, AppState>) -> Result<(), String> {
    let mut enabled = state.discord.enabled.lock()
        .map_err(|e| format!("Failed to lock discord enabled state: {}", e))?;
    
    *enabled = value;

    if !value {
        // Disconnect Discord client when disabled
        let mut client_guard = state.discord.client.lock()
            .map_err(|e| format!("Failed to lock discord client: {}", e))?;
        
        if let Some(ref mut client) = *client_guard {
            let _ = client.close();
        }
        *client_guard = None;
    } else {
        // Try to connect when enabled
        let mut client_guard = state.discord.client.lock()
            .map_err(|e| format!("Failed to lock discord client: {}", e))?;
        
        if client_guard.is_none() {
            if let Some(mut client) = create_discord_client() {
                // Set default activity
                let act = create_activity(DISCORD_DEFAULT_DETAILS, DISCORD_DEFAULT_STATE);
                let _ = client.set_activity(act);
                *client_guard = Some(client);
            }
        }
    }

    log::info!("Discord RPC broadcast changed to: {}", value);
    Ok(())
}
