//! Tauri Commands for the Ayoto Plugin System
//! 
//! Exposes plugin management functionality to the frontend.
//! 
//! # Plugin Types
//! 
//! Commands support two types of plugins:
//! - **StreamProvider**: For video extraction from hosters (Voe, Vidoza, etc.)
//! - **MediaProvider**: For content listings from sites (aniworld.to, s.to, etc.)

use super::{
    get_plugin_loader, create_sample_plugin, create_sample_stream_provider,
    LoadedPlugin, PluginLoadResult, PluginSummary, PluginManifest,
    PopulatedAnime, Episode, SearchResult, EpisodesResult,
    AYOTO_VERSION
};

// ============================================================================
// Plugin Management Commands
// ============================================================================

/// Get Ayoto version for plugin compatibility checks
#[tauri::command]
pub fn get_ayoto_version() -> String {
    AYOTO_VERSION.to_string()
}

/// Load a plugin from JSON content
#[tauri::command]
pub fn load_plugin_from_json(json: String, source: String) -> PluginLoadResult {
    let loader = get_plugin_loader();
    loader.load_from_json(&json, &source)
}

/// Load a plugin from a file path
#[tauri::command]
pub fn load_plugin_from_file(path: String) -> PluginLoadResult {
    let loader = get_plugin_loader();
    loader.load_from_file(&path)
}

/// Get all loaded plugins
#[tauri::command]
pub fn get_all_plugins() -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_all_plugins()
}

/// Get enabled plugins only
#[tauri::command]
pub fn get_enabled_plugins() -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_enabled_plugins()
}

/// Get a plugin by its ID
#[tauri::command]
pub fn get_plugin(plugin_id: String) -> Option<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_plugin(&plugin_id)
}

/// Get plugin summaries for UI display
#[tauri::command]
pub fn get_plugins_summary() -> Vec<PluginSummary> {
    let loader = get_plugin_loader();
    loader.get_plugins_summary()
}

/// Enable or disable a plugin
#[tauri::command]
pub fn set_plugin_enabled(plugin_id: String, enabled: bool) -> Result<(), String> {
    let loader = get_plugin_loader();
    loader
        .set_plugin_enabled(&plugin_id, enabled)
        .map_err(|e| e.message)
}

/// Unload a plugin
#[tauri::command]
pub fn unload_plugin(plugin_id: String) -> Result<(), String> {
    let loader = get_plugin_loader();
    loader.unload_plugin(&plugin_id).map_err(|e| e.message)
}

/// Get plugins that support a specific capability
#[tauri::command]
pub fn get_plugins_with_capability(capability: String) -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_plugins_with_capability(&capability)
}

/// Get plugins that support a specific stream format
#[tauri::command]
pub fn get_plugins_by_format(format: String) -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_plugins_by_format(&format)
}

/// Get plugins that support Anime4K
#[tauri::command]
pub fn get_anime4k_plugins() -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_anime4k_plugins()
}

/// Get all Stream Provider plugins
#[tauri::command]
pub fn get_stream_providers() -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_stream_providers()
}

/// Get all Media Provider plugins
#[tauri::command]
pub fn get_media_providers() -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_media_providers()
}

/// Get stream provider plugins that support a specific hoster
#[tauri::command]
pub fn get_stream_providers_for_hoster(hoster: String) -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_stream_providers_for_hoster(&hoster)
}

/// Get media provider plugins that support a specific language
#[tauri::command]
pub fn get_media_providers_for_language(language: String) -> Vec<LoadedPlugin> {
    let loader = get_plugin_loader();
    loader.get_media_providers_for_language(&language)
}

/// Validate a plugin manifest without loading it
#[tauri::command]
pub fn validate_plugin_manifest(json: String) -> Result<super::ValidationResult, String> {
    let manifest = PluginManifest::from_json(&json)?;
    Ok(manifest.validate())
}

/// Create a sample plugin manifest for reference (Media Provider)
#[tauri::command]
pub fn get_sample_plugin_manifest() -> Result<String, String> {
    let sample = create_sample_plugin();
    sample.to_json()
}

/// Create a sample Stream Provider plugin manifest for reference
#[tauri::command]
pub fn get_sample_stream_provider_manifest() -> Result<String, String> {
    let sample = create_sample_stream_provider();
    sample.to_json()
}

/// Check if a plugin is compatible with the current Ayoto version
#[tauri::command]
pub fn check_plugin_compatibility(plugin_id: String) -> Result<super::PluginCompatibility, String> {
    let loader = get_plugin_loader();
    if let Some(plugin) = loader.get_plugin(&plugin_id) {
        Ok(plugin.compatibility)
    } else {
        Err(format!("Plugin '{}' not found", plugin_id))
    }
}

// ============================================================================
// Plugin API Commands (for executing plugin capabilities)
// ============================================================================

/// Search for anime using a specific plugin
/// Returns: List<PopulatedAnime>
#[tauri::command]
pub async fn plugin_search(
    plugin_id: String,
    query: String,
    _page: Option<u32>,
) -> Result<SearchResult, String> {
    let loader = get_plugin_loader();
    
    // Verify plugin exists and has search capability
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.search {
        return Err(format!("Plugin '{}' does not support search", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin search logic
    // For now, return a placeholder response showing the API works
    Ok(SearchResult {
        results: vec![PopulatedAnime {
            id: format!("{}-search-result", plugin_id),
            title: format!("Search result for: {}", query),
            alt_titles: vec![],
            cover: None,
            banner: None,
            description: Some(format!("This is a placeholder result from plugin '{}'", plugin.manifest.name)),
            anilist_id: None,
            mal_id: None,
            status: Some("AIRING".to_string()),
            episode_count: Some(12),
            genres: vec!["Action".to_string(), "Adventure".to_string()],
            year: Some(2024),
            rating: Some(85.0),
            media_type: Some("TV".to_string()),
            is_airing: Some(true),
            next_airing: None,
        }],
        has_next_page: false,
        current_page: 1,
        total_results: Some(1),
    })
}

/// Get popular anime from a specific plugin
/// Returns: List<PopulatedAnime>
#[tauri::command]
pub async fn plugin_get_popular(
    plugin_id: String,
    page: Option<u32>,
) -> Result<SearchResult, String> {
    let loader = get_plugin_loader();
    
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.get_popular {
        return Err(format!("Plugin '{}' does not support getPopular", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin getPopular logic
    Ok(SearchResult {
        results: vec![],
        has_next_page: false,
        current_page: page.unwrap_or(1),
        total_results: Some(0),
    })
}

/// Get latest anime from a specific plugin
/// Returns: List<PopulatedAnime>
#[tauri::command]
pub async fn plugin_get_latest(
    plugin_id: String,
    page: Option<u32>,
) -> Result<SearchResult, String> {
    let loader = get_plugin_loader();
    
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.get_latest {
        return Err(format!("Plugin '{}' does not support getLatest", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin getLatest logic
    Ok(SearchResult {
        results: vec![],
        has_next_page: false,
        current_page: page.unwrap_or(1),
        total_results: Some(0),
    })
}

/// Get episodes for an anime from a specific plugin
/// Returns: List<Episode>
#[tauri::command]
pub async fn plugin_get_episodes(
    plugin_id: String,
    anime_id: String,
    page: Option<u32>,
) -> Result<EpisodesResult, String> {
    let loader = get_plugin_loader();
    
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.get_episodes {
        return Err(format!("Plugin '{}' does not support getEpisodes", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin getEpisodes logic
    Ok(EpisodesResult {
        episodes: vec![Episode {
            id: format!("{}-ep-1", anime_id),
            number: 1,
            title: Some("Episode 1".to_string()),
            thumbnail: None,
            description: None,
            duration: Some(1440),
            air_date: None,
            is_filler: Some(false),
        }],
        has_next_page: false,
        current_page: page.unwrap_or(1),
        total_episodes: Some(1),
    })
}

/// Get stream sources for an episode from a specific plugin
/// Returns: PopulatedEpisode with StreamSources
#[tauri::command]
pub async fn plugin_get_streams(
    plugin_id: String,
    anime_id: String,
    episode_id: String,
) -> Result<super::PopulatedEpisode, String> {
    let loader = get_plugin_loader();
    
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.get_streams {
        return Err(format!("Plugin '{}' does not support getStreams", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin getStreams logic
    Ok(super::PopulatedEpisode {
        episode: Episode {
            id: episode_id.clone(),
            number: 1,
            title: Some("Episode 1".to_string()),
            thumbnail: None,
            description: None,
            duration: Some(1440),
            air_date: None,
            is_filler: Some(false),
        },
        sources: vec![super::StreamSource {
            url: format!("https://example.com/stream/{}/{}", anime_id, episode_id),
            format: super::StreamFormat::M3u8,
            quality: "1080p".to_string(),
            anime4k_support: true,
            is_default: Some(true),
            server: Some("Main".to_string()),
            headers: std::collections::HashMap::new(),
        }],
        subtitles: vec![],
        intro: None,
        outro: None,
    })
}

/// Get anime details from a specific plugin
/// Returns: PopulatedAnime
#[tauri::command]
pub async fn plugin_get_anime_details(
    plugin_id: String,
    anime_id: String,
) -> Result<PopulatedAnime, String> {
    let loader = get_plugin_loader();
    
    let plugin = loader
        .get_plugin(&plugin_id)
        .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

    if !plugin.manifest.capabilities.get_anime_details {
        return Err(format!("Plugin '{}' does not support getAnimeDetails", plugin_id));
    }

    if !plugin.enabled {
        return Err(format!("Plugin '{}' is disabled", plugin_id));
    }

    // TODO: Execute actual plugin getAnimeDetails logic
    Ok(PopulatedAnime {
        id: anime_id,
        title: "Anime Details".to_string(),
        alt_titles: vec![],
        cover: None,
        banner: None,
        description: Some("Detailed anime information would be here".to_string()),
        anilist_id: None,
        mal_id: None,
        status: None,
        episode_count: None,
        genres: vec![],
        year: None,
        rating: None,
        media_type: None,
        is_airing: None,
        next_airing: None,
    })
}

/// Search across all enabled plugins that support search
/// Returns results grouped by plugin
#[tauri::command]
pub async fn search_all_plugins(query: String) -> Vec<(String, SearchResult)> {
    let loader = get_plugin_loader();
    let plugins = loader.get_plugins_with_capability("search");
    
    let mut results = Vec::new();
    
    for plugin in plugins {
        if let Ok(result) = plugin_search(plugin.manifest.id.clone(), query.clone(), None).await {
            results.push((plugin.manifest.id, result));
        }
    }
    
    results
}
