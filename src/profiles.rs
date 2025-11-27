//! User Profile System
//! 
//! This module provides a Netflix-like user profile system where users can select
//! who is watching. Each profile can have different settings and watch history.
//! Profiles are persisted to disk using tauri-plugin-store.
//! 
//! Note: Age restriction functionality is NOT implemented yet as per requirements.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_store::StoreExt;

/// Maximum number of profiles allowed
pub const MAX_PROFILES: usize = 5;

/// Store file name for profiles
const PROFILES_STORE_FILE: &str = "profiles.json";

/// Store key for profiles data
const PROFILES_KEY: &str = "profiles";

/// Store key for active profile ID
const ACTIVE_PROFILE_KEY: &str = "active_profile_id";

/// Default avatar options for profiles
pub const DEFAULT_AVATARS: &[&str] = &[
    "avatar_red",
    "avatar_blue", 
    "avatar_green",
    "avatar_purple",
    "avatar_orange",
    "avatar_pink",
    "avatar_yellow",
    "avatar_cyan",
];

/// User profile
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    /// Unique profile identifier
    pub id: String,
    /// Profile display name
    pub name: String,
    /// Avatar identifier or URL
    pub avatar: String,
    /// Profile color theme
    pub color: String,
    /// Whether this is the main/default profile (kept for backwards compatibility, always false)
    #[serde(default)]
    pub is_main: bool,
    /// Creation timestamp (Unix milliseconds)
    pub created_at: i64,
    /// Last used timestamp (Unix milliseconds)  
    pub last_used_at: Option<i64>,
    /// Profile-specific settings (JSON)
    pub settings: ProfileSettings,
    // Note: Age restriction fields intentionally omitted as per requirements
}

/// Profile-specific settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSettings {
    /// Enable/disable autoplay next episode
    pub autoplay_next: bool,
    /// Enable/disable intro skip
    pub auto_skip_intro: bool,
    /// Enable/disable outro skip  
    pub auto_skip_outro: bool,
    /// Preferred video quality
    pub preferred_quality: Option<String>,
    /// Preferred audio language
    pub preferred_audio_lang: Option<String>,
    /// Preferred subtitle language
    pub preferred_subtitle_lang: Option<String>,
    /// Enable/disable subtitles by default
    pub subtitles_enabled: bool,
    /// Anime4K preset preference
    pub anime4k_preset: Option<String>,
    /// Custom profile settings (extensible)
    #[serde(default)]
    pub custom: HashMap<String, serde_json::Value>,
}

/// Profile manager state (in-memory cache)
pub struct ProfileState {
    /// All profiles indexed by ID
    profiles: Mutex<HashMap<String, UserProfile>>,
    /// Currently active profile ID
    active_profile_id: Mutex<Option<String>>,
    /// Whether profiles have been loaded from store
    loaded: Mutex<bool>,
}

impl Default for ProfileState {
    fn default() -> Self {
        // Start with empty profiles - will be loaded from store on first access
        ProfileState {
            profiles: Mutex::new(HashMap::new()),
            active_profile_id: Mutex::new(None),
            loaded: Mutex::new(false),
        }
    }
}

/// Get current timestamp in milliseconds
fn get_current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Generate a unique profile ID
fn generate_profile_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("profile_{}", timestamp % 1_000_000_000)
}

// =============================================================================
// Persistence Functions
// =============================================================================

/// Load profiles from persistent store
fn load_profiles_from_store(app: &AppHandle) -> HashMap<String, UserProfile> {
    match app.store(PROFILES_STORE_FILE) {
        Ok(store) => {
            if let Some(value) = store.get(PROFILES_KEY) {
                match serde_json::from_value::<HashMap<String, UserProfile>>(value.clone()) {
                    Ok(profiles) => {
                        log::info!("Loaded {} profiles from store", profiles.len());
                        return profiles;
                    }
                    Err(e) => {
                        log::warn!("Failed to deserialize profiles: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            log::warn!("Failed to open profile store: {}", e);
        }
    }
    HashMap::new()
}

/// Load active profile ID from persistent store
fn load_active_profile_from_store(app: &AppHandle) -> Option<String> {
    match app.store(PROFILES_STORE_FILE) {
        Ok(store) => {
            if let Some(value) = store.get(ACTIVE_PROFILE_KEY) {
                if let Some(id) = value.as_str() {
                    return Some(id.to_string());
                }
            }
        }
        Err(e) => {
            log::warn!("Failed to load active profile: {}", e);
        }
    }
    None
}

/// Save profiles to persistent store
fn save_profiles_to_store(app: &AppHandle, profiles: &HashMap<String, UserProfile>) -> Result<(), String> {
    let store = app.store(PROFILES_STORE_FILE)
        .map_err(|e| format!("Failed to open profile store: {}", e))?;
    
    let value = serde_json::to_value(profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;
    
    store.set(PROFILES_KEY, value);
    store.save()
        .map_err(|e| format!("Failed to save profiles: {}", e))?;
    
    log::info!("Saved {} profiles to store", profiles.len());
    Ok(())
}

/// Save active profile ID to persistent store
fn save_active_profile_to_store(app: &AppHandle, active_id: &Option<String>) -> Result<(), String> {
    let store = app.store(PROFILES_STORE_FILE)
        .map_err(|e| format!("Failed to open profile store: {}", e))?;
    
    match active_id {
        Some(id) => store.set(ACTIVE_PROFILE_KEY, serde_json::Value::String(id.clone())),
        None => store.set(ACTIVE_PROFILE_KEY, serde_json::Value::Null),
    }
    
    store.save()
        .map_err(|e| format!("Failed to save active profile: {}", e))?;
    
    Ok(())
}

/// Ensure in-memory state is synchronized with persistent store
fn ensure_profiles_loaded(app: &AppHandle, state: &ProfileState) {
    let mut loaded = state.loaded.lock().unwrap();
    
    // Only load once
    if *loaded {
        return;
    }
    
    let mut profiles = state.profiles.lock().unwrap();
    let mut active_id = state.active_profile_id.lock().unwrap();
    
    // Load from store
    let stored_profiles = load_profiles_from_store(app);
    *profiles = stored_profiles;
    
    let stored_active = load_active_profile_from_store(app);
    // Only set active if the profile still exists
    if let Some(ref id) = stored_active {
        if profiles.contains_key(id) {
            *active_id = stored_active;
        }
    }
    
    *loaded = true;
}

// =============================================================================
// Tauri Commands
// =============================================================================

/// Get all user profiles
#[tauri::command]
pub fn profile_get_all(
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<Vec<UserProfile>, String> {
    ensure_profiles_loaded(&app, &state);
    
    let profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    let mut profile_list: Vec<UserProfile> = profiles.values().cloned().collect();
    
    // Sort by creation date
    profile_list.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    
    Ok(profile_list)
}

/// Get a specific profile by ID
#[tauri::command]
pub fn profile_get(
    profile_id: String,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<Option<UserProfile>, String> {
    ensure_profiles_loaded(&app, &state);
    
    let profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    Ok(profiles.get(&profile_id).cloned())
}

/// Get the currently active profile
#[tauri::command]
pub fn profile_get_active(
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<Option<UserProfile>, String> {
    ensure_profiles_loaded(&app, &state);
    
    let active_id = state
        .active_profile_id
        .lock()
        .map_err(|e| format!("Failed to lock active profile: {}", e))?;
    
    if let Some(id) = active_id.as_ref() {
        let profiles = state
            .profiles
            .lock()
            .map_err(|e| format!("Failed to lock profiles: {}", e))?;
        Ok(profiles.get(id).cloned())
    } else {
        Ok(None)
    }
}

/// Set the active profile
#[tauri::command]
pub fn profile_set_active(
    profile_id: String,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<UserProfile, String> {
    ensure_profiles_loaded(&app, &state);
    
    // Verify profile exists
    let mut profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    if !profiles.contains_key(&profile_id) {
        return Err(format!("Profile '{}' not found", profile_id));
    }
    
    // Update last used timestamp
    if let Some(profile) = profiles.get_mut(&profile_id) {
        profile.last_used_at = Some(get_current_timestamp());
    }
    
    // Set active profile
    let mut active_id = state
        .active_profile_id
        .lock()
        .map_err(|e| format!("Failed to lock active profile: {}", e))?;
    *active_id = Some(profile_id.clone());
    
    // Persist changes
    save_profiles_to_store(&app, &profiles)?;
    save_active_profile_to_store(&app, &active_id)?;
    
    log::info!("Profile switched to: {}", profile_id);
    
    Ok(profiles.get(&profile_id).unwrap().clone())
}

/// Create a new profile
#[tauri::command]
pub fn profile_create(
    name: String,
    avatar: String,
    color: String,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<UserProfile, String> {
    ensure_profiles_loaded(&app, &state);
    
    // Validate name
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err("Profile name cannot be empty".to_string());
    }
    if trimmed_name.len() > 20 {
        return Err("Profile name must be 20 characters or less".to_string());
    }
    
    let mut profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    // Check max profiles
    if profiles.len() >= MAX_PROFILES {
        return Err(format!("Maximum of {} profiles allowed", MAX_PROFILES));
    }
    
    // Check for duplicate names
    if profiles.values().any(|p| p.name.to_lowercase() == trimmed_name.to_lowercase()) {
        return Err("A profile with this name already exists".to_string());
    }
    
    let profile_id = generate_profile_id();
    let profile = UserProfile {
        id: profile_id.clone(),
        name: trimmed_name.to_string(),
        avatar: if avatar.is_empty() { "avatar_blue".to_string() } else { avatar },
        color: if color.is_empty() { "#3b82f6".to_string() } else { color },
        is_main: false,
        created_at: get_current_timestamp(),
        last_used_at: None,
        settings: ProfileSettings::default(),
    };
    
    profiles.insert(profile_id.clone(), profile.clone());
    
    // Persist changes
    save_profiles_to_store(&app, &profiles)?;
    
    log::info!("Profile created: {} ({})", profile.name, profile_id);
    
    Ok(profile)
}

/// Update an existing profile
#[tauri::command]
pub fn profile_update(
    profile_id: String,
    name: Option<String>,
    avatar: Option<String>,
    color: Option<String>,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<UserProfile, String> {
    ensure_profiles_loaded(&app, &state);
    
    let mut profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    // Check if profile exists
    if !profiles.contains_key(&profile_id) {
        return Err(format!("Profile '{}' not found", profile_id));
    }
    
    // Update name if provided
    if let Some(ref new_name) = name {
        let trimmed_name = new_name.trim();
        if trimmed_name.is_empty() {
            return Err("Profile name cannot be empty".to_string());
        }
        if trimmed_name.len() > 20 {
            return Err("Profile name must be 20 characters or less".to_string());
        }
        
        // Check for duplicate names (excluding current profile)
        let has_duplicate = profiles.values()
            .any(|p| p.id != profile_id && p.name.to_lowercase() == trimmed_name.to_lowercase());
        if has_duplicate {
            return Err("A profile with this name already exists".to_string());
        }
    }
    
    // Now perform the updates
    let profile = profiles.get_mut(&profile_id).unwrap();
    
    if let Some(new_name) = name {
        profile.name = new_name.trim().to_string();
    }
    
    if let Some(new_avatar) = avatar {
        profile.avatar = new_avatar;
    }
    
    if let Some(new_color) = color {
        profile.color = new_color;
    }
    
    let updated_profile = profile.clone();
    
    // Persist changes
    save_profiles_to_store(&app, &profiles)?;
    
    log::info!("Profile updated: {}", profile_id);
    
    Ok(updated_profile)
}

/// Update profile settings
#[tauri::command]
pub fn profile_update_settings(
    profile_id: String,
    settings: ProfileSettings,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<UserProfile, String> {
    ensure_profiles_loaded(&app, &state);
    
    let mut profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    let profile = profiles
        .get_mut(&profile_id)
        .ok_or_else(|| format!("Profile '{}' not found", profile_id))?;
    
    profile.settings = settings;
    
    let updated_profile = profile.clone();
    
    // Persist changes
    save_profiles_to_store(&app, &profiles)?;
    
    log::info!("Profile settings updated: {}", profile_id);
    
    Ok(updated_profile)
}

/// Delete a profile
#[tauri::command]
pub fn profile_delete(
    profile_id: String,
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<(), String> {
    ensure_profiles_loaded(&app, &state);
    
    let mut profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    
    // Check if profile exists
    if !profiles.contains_key(&profile_id) {
        return Err(format!("Profile '{}' not found", profile_id));
    }
    
    profiles.remove(&profile_id);
    
    // If deleted profile was active, clear active profile
    let mut active_id = state
        .active_profile_id
        .lock()
        .map_err(|e| format!("Failed to lock active profile: {}", e))?;
    
    if active_id.as_ref() == Some(&profile_id) {
        *active_id = None;
    }
    
    // Persist changes
    save_profiles_to_store(&app, &profiles)?;
    save_active_profile_to_store(&app, &active_id)?;
    
    log::info!("Profile deleted: {}", profile_id);
    
    Ok(())
}

/// Get available avatars
#[tauri::command]
pub fn profile_get_avatars() -> Vec<&'static str> {
    DEFAULT_AVATARS.to_vec()
}

/// Get profile count
#[tauri::command]
pub fn profile_get_count(
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<usize, String> {
    ensure_profiles_loaded(&app, &state);
    
    let profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    Ok(profiles.len())
}

/// Check if more profiles can be created
#[tauri::command]
pub fn profile_can_create(
    app: AppHandle,
    state: State<'_, ProfileState>,
) -> Result<bool, String> {
    ensure_profiles_loaded(&app, &state);
    
    let profiles = state
        .profiles
        .lock()
        .map_err(|e| format!("Failed to lock profiles: {}", e))?;
    Ok(profiles.len() < MAX_PROFILES)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_profile_state() {
        let state = ProfileState::default();
        let profiles = state.profiles.lock().unwrap();
        let loaded = state.loaded.lock().unwrap();
        
        // No default profile - starts empty and not loaded
        assert_eq!(profiles.len(), 0);
        assert!(!*loaded);
    }

    #[test]
    fn test_generate_profile_id() {
        let id1 = generate_profile_id();
        let id2 = generate_profile_id();
        
        assert!(id1.starts_with("profile_"));
        assert!(id2.starts_with("profile_"));
        // IDs should be unique (with very high probability)
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_default_avatars() {
        assert!(!DEFAULT_AVATARS.is_empty());
        assert!(DEFAULT_AVATARS.contains(&"avatar_blue"));
    }

    #[test]
    fn test_profile_settings_default() {
        let settings = ProfileSettings::default();
        assert!(!settings.autoplay_next);
        assert!(!settings.auto_skip_intro);
    }
}
