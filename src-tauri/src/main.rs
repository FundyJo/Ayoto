// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod plugin;
mod miracast;
mod providers;

use plugin::{PluginManager, Anime};
use miracast::{MiracastManager, MiracastDevice, CastState};
use providers::ExampleProvider;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    plugin_manager: Arc<Mutex<PluginManager>>,
    miracast_manager: Arc<MiracastManager>,
}

// Tauri commands for the frontend

#[tauri::command]
async fn search_anime(
    query: String,
    state: tauri::State<'_, AppState>
) -> Result<Vec<Anime>, String> {
    let manager = state.plugin_manager.lock().await;
    
    // Get the first available provider (in this case, the example provider)
    let providers = manager.list_providers();
    if providers.is_empty() {
        return Err("No providers available".to_string());
    }
    
    let provider = manager.get_provider(&providers[0])
        .ok_or("Provider not found")?;
    
    provider.search(&query).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_anime(
    id: String,
    state: tauri::State<'_, AppState>
) -> Result<Anime, String> {
    let manager = state.plugin_manager.lock().await;
    
    let providers = manager.list_providers();
    if providers.is_empty() {
        return Err("No providers available".to_string());
    }
    
    let provider = manager.get_provider(&providers[0])
        .ok_or("Provider not found")?;
    
    provider.get_anime(&id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_providers(
    state: tauri::State<'_, AppState>
) -> Result<Vec<String>, String> {
    let manager = state.plugin_manager.lock().await;
    Ok(manager.list_providers())
}

#[tauri::command]
async fn scan_miracast_devices(
    state: tauri::State<'_, AppState>
) -> Result<Vec<MiracastDevice>, String> {
    state.miracast_manager.scan_devices().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_cast(
    device_id: String,
    media_url: String,
    state: tauri::State<'_, AppState>
) -> Result<(), String> {
    state.miracast_manager.start_cast(&device_id, &media_url).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_cast(
    state: tauri::State<'_, AppState>
) -> Result<(), String> {
    state.miracast_manager.stop_cast().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_cast_state(
    state: tauri::State<'_, AppState>
) -> Result<CastState, String> {
    Ok(state.miracast_manager.get_cast_state().await)
}

#[tokio::main]
async fn main() {
    // Initialize plugin manager and register providers
    let mut plugin_manager = PluginManager::new();
    plugin_manager.register_provider(Box::new(ExampleProvider::new()));
    
    // Initialize Miracast manager
    let miracast_manager = MiracastManager::new();
    
    let app_state = AppState {
        plugin_manager: Arc::new(Mutex::new(plugin_manager)),
        miracast_manager: Arc::new(miracast_manager),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            search_anime,
            get_anime,
            list_providers,
            scan_miracast_devices,
            start_cast,
            stop_cast,
            get_cast_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
