use tauri::{AppHandle, State, Window};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU32, Ordering};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};
use tauri_plugin_store::StoreExt;

const DISCORD_CLIENT_ID: &str = "1334161510120816680";
const DISCORD_DEFAULT_DETAILS: &str = "Browsing Anime";
const DISCORD_DEFAULT_STATE: &str = "Looking for anime to watch";
const DISCORD_DOWNLOAD_URL: &str = "https://github.com/hitarth-gg/zenshin/releases/latest";
const DISCORD_LARGE_IMAGE: &str = "icon";
const DISCORD_LARGE_IMAGE_TEXT: &str = "zanshin";

/// Store file name for settings persistence
const SETTINGS_STORE_FILE: &str = "settings.json";

/// Current Ayoto version (from Cargo.toml)
pub const AYOTO_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Maximum party size for watch together feature
const MAX_PARTY_SIZE: u32 = 10;

/// Modulo value for party ID generation to ensure reasonable length
const PARTY_ID_MODULO: u128 = 1_000_000_000_000;

/// Modulo values for join secret generation
const SECRET_PRIMARY_MODULO: u128 = 1_000_000_000;
const SECRET_SECONDARY_MODULO: u128 = 1_000_000;
const SECRET_DIVISOR: u128 = 17; // Prime number for better distribution

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub upload_limit: Option<i32>,
    pub download_limit: Option<i32>,
    pub downloads_folder: Option<String>,
    pub backend_port: Option<u16>,
    pub broadcast_discord_rpc: Option<bool>,
}

/// Watch party information for Discord Rich Presence
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WatchParty {
    /// Unique party ID
    pub party_id: String,
    /// Current number of members in the party
    pub current_size: u32,
    /// Maximum party size
    pub max_size: u32,
    /// Join secret for party invites (used by Discord)
    pub join_secret: Option<String>,
    /// Whether party is accepting new members
    pub is_open: bool,
}

impl Default for WatchParty {
    fn default() -> Self {
        WatchParty {
            party_id: generate_party_id(),
            current_size: 1,
            max_size: MAX_PARTY_SIZE,
            join_secret: Some(generate_join_secret()),
            is_open: true,
        }
    }
}

/// Generate a unique party ID
fn generate_party_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("zanshin_party_{}", timestamp % PARTY_ID_MODULO)
}

/// Generate a join secret for party invites
/// Note: This uses timestamp-based generation for simplicity.
/// For production use with security requirements, consider using
/// a cryptographically secure random number generator.
fn generate_join_secret() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    // Use prime divisor for better distribution across the ID space
    format!("zanshin_join_{}_{}", 
        timestamp % SECRET_PRIMARY_MODULO, 
        (timestamp / SECRET_DIVISOR) % SECRET_SECONDARY_MODULO)
}

pub struct DiscordRpcState {
    pub client: Mutex<Option<DiscordIpcClient>>,
    pub enabled: Mutex<bool>,
    pub current_party: Mutex<Option<WatchParty>>,
    pub party_enabled: Mutex<bool>,
}

pub struct AppState {
    pub settings: Mutex<Settings>,
    pub discord: DiscordRpcState,
}

/// Get Ayoto version for plugin compatibility checks
#[tauri::command]
pub fn get_ayoto_version() -> String {
    AYOTO_VERSION.to_string()
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
        .assets(
            activity::Assets::new()
                .large_image(DISCORD_LARGE_IMAGE)
                .large_text(DISCORD_LARGE_IMAGE_TEXT)
        )
        .buttons(vec![
            activity::Button::new("Download app", DISCORD_DOWNLOAD_URL)
        ])
}

/// Creates a Discord activity with party information for watch-together features
fn create_activity_with_party<'a>(
    details: &'a str, 
    state: &'a str,
    party: &'a WatchParty,
) -> activity::Activity<'a> {
    let mut act = activity::Activity::new()
        .details(details)
        .state(state)
        .assets(
            activity::Assets::new()
                .large_image(DISCORD_LARGE_IMAGE)
                .large_text(DISCORD_LARGE_IMAGE_TEXT)
        );
    
    // Add party information
    act = act.party(
        activity::Party::new()
            .id(&party.party_id)
            .size([party.current_size as i32, party.max_size as i32])
    );
    
    // Add join secret if party is open
    if party.is_open {
        if let Some(ref secret) = party.join_secret {
            act = act.secrets(
                activity::Secrets::new()
                    .join(secret)
            );
        }
    }
    
    // Add buttons
    act = act.buttons(vec![
        activity::Button::new("Download app", DISCORD_DOWNLOAD_URL)
    ]);
    
    act
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
pub fn set_fullscreen(window: Window, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_fullscreen(window: Window) -> Result<bool, String> {
    window.is_fullscreen().map_err(|e| e.to_string())
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
    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_url(&url, None::<&str>);
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
    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_url(&url, None::<&str>);
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
    app: AppHandle,
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
        "broadcastDiscordRpc" => {
            if let Some(v) = value.as_bool() {
                settings.broadcast_discord_rpc = Some(v);
            }
        }
        _ => {}
    }
    
    // Persist settings to disk
    let store = app.store(SETTINGS_STORE_FILE)
        .map_err(|e| format!("Failed to open settings store: {}", e))?;
    
    let settings_value = serde_json::to_value(&*settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    store.set("settings", settings_value);
    store.save()
        .map_err(|e| format!("Failed to save settings: {}", e))?;
    
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

        // Check if party info should be included
        let party_enabled = *state.discord.party_enabled.lock()
            .map_err(|e| format!("Failed to lock party_enabled: {}", e))?;
        
        let party = state.discord.current_party.lock()
            .map_err(|e| format!("Failed to lock current_party: {}", e))?;

        let act = if party_enabled && party.is_some() {
            create_activity_with_party(details, state_text, party.as_ref().unwrap())
        } else {
            create_activity(details, state_text)
        };

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

// =============================================================================
// Watch Party Commands
// =============================================================================

/// Create a new watch party for watch-together functionality
#[tauri::command]
pub async fn discord_create_party(state: State<'_, AppState>) -> Result<WatchParty, String> {
    let mut party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    let mut party_enabled = state.discord.party_enabled.lock()
        .map_err(|e| format!("Failed to lock party_enabled: {}", e))?;
    
    let new_party = WatchParty::default();
    *party = Some(new_party.clone());
    *party_enabled = true;
    
    log::info!("Created new watch party: {}", new_party.party_id);
    
    Ok(new_party)
}

/// Get current watch party information
#[tauri::command]
pub fn discord_get_party(state: State<'_, AppState>) -> Result<Option<WatchParty>, String> {
    let party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    Ok(party.clone())
}

/// Update party size (when members join or leave)
#[tauri::command]
pub fn discord_update_party_size(
    current_size: u32,
    state: State<'_, AppState>
) -> Result<WatchParty, String> {
    let mut party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    let current = party.as_mut()
        .ok_or("No active watch party")?;
    
    if current_size > current.max_size {
        return Err(format!("Party size cannot exceed maximum of {}", current.max_size));
    }
    
    current.current_size = current_size;
    
    log::info!("Updated party size to {}/{}", current_size, current.max_size);
    
    Ok(current.clone())
}

/// Set whether the party is open for new members
#[tauri::command]
pub fn discord_set_party_open(
    is_open: bool,
    state: State<'_, AppState>
) -> Result<WatchParty, String> {
    let mut party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    let current = party.as_mut()
        .ok_or("No active watch party")?;
    
    current.is_open = is_open;
    
    // Regenerate join secret when reopening
    if is_open {
        current.join_secret = Some(generate_join_secret());
    }
    
    log::info!("Party open status set to: {}", is_open);
    
    Ok(current.clone())
}

/// Leave/disband the current watch party
#[tauri::command]
pub fn discord_leave_party(state: State<'_, AppState>) -> Result<(), String> {
    let mut party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    let mut party_enabled = state.discord.party_enabled.lock()
        .map_err(|e| format!("Failed to lock party_enabled: {}", e))?;
    
    if party.is_some() {
        log::info!("Leaving watch party");
        *party = None;
        *party_enabled = false;
    }
    
    Ok(())
}

/// Enable or disable party display in Discord RPC
#[tauri::command]
pub fn discord_set_party_enabled(
    enabled: bool,
    state: State<'_, AppState>
) -> Result<(), String> {
    let mut party_enabled = state.discord.party_enabled.lock()
        .map_err(|e| format!("Failed to lock party_enabled: {}", e))?;
    
    *party_enabled = enabled;
    
    log::info!("Party display in Discord RPC set to: {}", enabled);
    
    Ok(())
}

/// Get the invite link/secret for the current party
#[tauri::command]
pub fn discord_get_party_invite(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let party = state.discord.current_party.lock()
        .map_err(|e| format!("Failed to lock current_party: {}", e))?;
    
    if let Some(ref p) = *party {
        if p.is_open {
            Ok(p.join_secret.clone())
        } else {
            Err("Party is not open for new members".to_string())
        }
    } else {
        Err("No active watch party".to_string())
    }
}
