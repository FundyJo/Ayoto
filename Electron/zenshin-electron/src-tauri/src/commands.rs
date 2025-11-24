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
pub fn minimize_window(window: Window) {
    window.minimize().unwrap();
}

#[tauri::command]
pub fn maximize_window(window: Window) {
    if window.is_maximized().unwrap() {
        window.unmaximize().unwrap();
    } else {
        window.maximize().unwrap();
    }
}

#[tauri::command]
pub fn close_window(window: Window) {
    window.close().unwrap();
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
    let mut settings = state.settings.lock().unwrap();
    
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
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
pub async fn change_downloads_folder(state: State<'_, AppState>) -> Result<Settings, String> {
    // This would typically open a dialog to select a folder
    // For now, we'll just return the current settings
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
pub async fn change_backend_port(port: u16, state: State<'_, AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.backend_port = Some(port);
    Ok(())
}

#[tauri::command]
pub async fn set_discord_rpc(activity_details: serde_json::Value) -> Result<(), String> {
    // Discord RPC implementation would go here
    // This is a placeholder
    log::info!("Discord RPC activity: {:?}", activity_details);
    Ok(())
}

#[tauri::command]
pub async fn broadcast_discord_rpc(value: bool) -> Result<(), String> {
    // Discord RPC broadcast implementation would go here
    log::info!("Discord RPC broadcast: {}", value);
    Ok(())
}
