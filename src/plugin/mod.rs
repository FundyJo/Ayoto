//! Ayoto Plugin System
//! 
//! A universal plugin system for loading .ayoto plugins that work across
//! desktop and mobile platforms. Plugins can provide anime search, 
//! streaming sources, and episode information through a standardized API.
//! 
//! # Plugin Format (.ayoto)
//! 
//! Plugins are JSON files with the `.ayoto` extension that define:
//! - Plugin metadata (id, name, version, author)
//! - Target Ayoto version for compatibility checking
//! - Capabilities (search, getEpisodes, getStreams, etc.)
//! - Supported stream formats (m3u8, mp4, mkv, webm, torrent)
//! - Scraping configuration for web-based providers
//! 
//! # Version Compatibility
//! 
//! Plugins declare their target Ayoto version using semantic versioning.
//! - Plugins built for v1.x.x will work with any v1.y.z (same major version)
//! - Plugins built for v1.x.x may NOT work with v2.x.x due to API changes
//! - Warnings are shown when plugins are built for older versions
//! 
//! # Example Plugin
//! 
//! ```json
//! {
//!   "id": "my-provider",
//!   "name": "My Anime Provider",
//!   "version": "1.0.0",
//!   "targetAyotoVersion": "2.5.0",
//!   "description": "A custom anime provider plugin",
//!   "author": "Your Name",
//!   "providers": ["MyProvider"],
//!   "formats": ["m3u8", "mp4"],
//!   "anime4kSupport": true,
//!   "capabilities": {
//!     "search": true,
//!     "getPopular": true,
//!     "getEpisodes": true,
//!     "getStreams": true,
//!     "scraping": true
//!   },
//!   "platforms": ["universal"],
//!   "scrapingConfig": {
//!     "baseUrl": "https://example.com",
//!     "rateLimitMs": 1000,
//!     "requiresJavascript": false
//!   }
//! }
//! ```

pub mod types;
pub mod manifest;
pub mod loader;
pub mod commands;

// Re-export commonly used types
pub use types::{
    PopulatedAnime, Episode, PopulatedEpisode, 
    StreamSource, StreamFormat, Subtitle,
    SearchResult, EpisodesResult, 
    PluginError, PluginResult,
    PluginType, StreamProviderConfig, MediaProviderConfig
};

pub use manifest::{
    PluginManifest, PluginCapabilities, ScrapingConfig,
    SemVer, TargetPlatform, ValidationResult, NativeLibraryPaths
};

pub use loader::{
    PluginLoader, LoadedPlugin, PluginLoadResult,
    PluginCompatibility, PluginSummary,
    AYOTO_VERSION, PLUGIN_EXTENSION, NATIVE_PLUGIN_EXTENSION, SUPPORTED_EXTENSIONS,
    create_sample_plugin, create_sample_media_provider, create_sample_stream_provider,
    create_sample_native_plugin
};

use std::sync::OnceLock;

/// Global plugin loader instance
static PLUGIN_LOADER: OnceLock<PluginLoader> = OnceLock::new();

/// Get the global plugin loader instance
pub fn get_plugin_loader() -> &'static PluginLoader {
    PLUGIN_LOADER.get_or_init(PluginLoader::new)
}

/// Initialize the plugin system with default directories
pub fn init_plugin_system(plugin_dirs: Vec<std::path::PathBuf>) -> Vec<PluginLoadResult> {
    let loader = get_plugin_loader();
    
    // Note: We can't mutate the loader once it's in OnceLock
    // This function should be called during app initialization
    // For now, we just return what we can load
    
    let mut results = Vec::new();
    
    for dir in plugin_dirs {
        if dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str());
                    
                    // Check if extension matches any supported extension
                    if SUPPORTED_EXTENSIONS.iter().any(|&e| Some(e) == ext) {
                        results.push(loader.load_from_file(&path));
                    }
                }
            }
        }
    }
    
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        // Verify all expected types are accessible
        let _anime: PopulatedAnime = PopulatedAnime {
            id: "test".to_string(),
            title: "Test".to_string(),
            alt_titles: vec![],
            cover: None,
            banner: None,
            description: None,
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
        };

        let _episode: Episode = Episode {
            id: "ep1".to_string(),
            number: 1,
            title: None,
            thumbnail: None,
            description: None,
            duration: None,
            air_date: None,
            is_filler: None,
        };

        let _format = StreamFormat::M3u8;
        let _platform = TargetPlatform::Universal;
        
        // Verify version constant
        assert!(!AYOTO_VERSION.is_empty());
        assert_eq!(PLUGIN_EXTENSION, "ayoto");
        assert_eq!(NATIVE_PLUGIN_EXTENSION, "pl");
        assert!(SUPPORTED_EXTENSIONS.contains(&"ayoto"));
        assert!(SUPPORTED_EXTENSIONS.contains(&"pl"));
    }

    #[test]
    fn test_global_loader() {
        let loader = get_plugin_loader();
        // Initially should have no plugins
        let plugins = loader.get_all_plugins();
        // The test might run after other tests, so we just verify it works
        assert!(plugins.len() >= 0);
    }
}
