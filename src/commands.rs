use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub upload_limit: Option<i32>,
    pub download_limit: Option<i32>,
    pub downloads_folder: Option<String>,
    pub backend_port: Option<u16>,
}

pub struct AppState {
    pub settings: Mutex<Settings>,
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
pub async fn set_discord_rpc(activity_details: serde_json::Value) -> Result<(), String> {
    // TODO: Implement Discord RPC using discord-rich-presence crate
    // Placeholder implementation for now
    // Future implementation should use:
    // use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
    // let mut client = DiscordIpcClient::new(CLIENT_ID)?;
    // client.connect()?;
    // client.set_activity(activity)?;
    log::info!("Discord RPC activity (not yet implemented): {:?}", activity_details);
    Ok(())
}

#[tauri::command]
pub async fn broadcast_discord_rpc(value: bool) -> Result<(), String> {
    // TODO: Implement Discord RPC broadcast toggle
    // Placeholder implementation for now
    log::info!("Discord RPC broadcast (not yet implemented): {}", value);
    Ok(())
}
