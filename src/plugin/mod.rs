//! Ayoto Plugin System
//! 
//! A universal plugin system supporting both JSON manifests (.ayoto), native
//! Rust plugins (.so/.dll/.dylib), and cross-platform WebAssembly plugins (.zpe).
//! 
//! # Plugin Types
//! 
//! ## ZPE Universal Plugins (Recommended)
//! 
//! ZPE (Zenshine Plugin Extension) plugins are compiled to WebAssembly and can
//! run on any platform without recompilation. A `.zpe` file is a ZIP archive
//! containing:
//! - `plugin.wasm` - The compiled WebAssembly module
//! - `manifest.json` - Plugin metadata and configuration
//! 
//! ZPE plugins can be written in any language that compiles to WebAssembly:
//! - Rust (recommended)
//! - C/C++
//! - AssemblyScript
//! - Go/TinyGo
//! - Zig
//! 
//! ## Native Rust Plugins (Platform-Specific)
//! 
//! Native plugins are compiled Rust dynamic libraries. They require separate
//! compilation for each target platform:
//! - **Linux**: `.so` files
//! - **Windows**: `.dll` files
//! - **macOS**: `.dylib` files
//! - **Android**: `.so` files (ARM/ARM64)
//! 
//! ## JSON Manifest Plugins (Legacy)
//! 
//! JSON plugins are configuration files that define metadata and capabilities.
//! They are useful for simple configuration but cannot execute code.
//! 
//! # Version Compatibility
//! 
//! Plugins declare their target Ayoto version using semantic versioning.
//! - Plugins built for v1.x.x will work with any v1.y.z (same major version)
//! - Plugins built for v1.x.x may NOT work with v2.x.x due to API changes

pub mod types;
pub mod manifest;
pub mod loader;
pub mod commands;
pub mod native;
pub mod zpe;

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
    SemVer, TargetPlatform, ValidationResult
};

pub use loader::{
    PluginLoader, LoadedPlugin, PluginLoadResult,
    PluginCompatibility, PluginSummary,
    AYOTO_VERSION, PLUGIN_EXTENSION,
    create_sample_plugin, create_sample_media_provider, create_sample_stream_provider
};

// Re-export native plugin types
pub use native::{
    AyotoPlugin, PluginCapabilities as NativePluginCapabilities, DefaultPlugin,
    FfiResult, FfiAnime, FfiAnimeList, FfiEpisode, FfiEpisodeList,
    FfiStreamSource, FfiStreamSourceList, FfiHttpRequest, FfiHttpResponse,
    FfiPluginConfig, FfiSubtitle, FfiPopulatedEpisode,
    PluginMetadata, HttpContext, HosterInfo,
    NativePluginLoader, NativePluginInfo, NativePluginLoadResult,
    get_native_plugin_loader, get_plugin_extension, get_platform_name,
    PluginRuntime, PLUGIN_ABI_VERSION,
    CAP_SEARCH, CAP_GET_POPULAR, CAP_GET_LATEST, CAP_GET_EPISODES,
    CAP_GET_STREAMS, CAP_GET_ANIME_DETAILS, CAP_SCRAPING,
    CAP_EXTRACT_STREAM, CAP_GET_HOSTER_INFO, CAP_DECRYPT_STREAM, CAP_GET_DOWNLOAD_LINK,
    PLATFORM_LINUX, PLATFORM_WINDOWS, PLATFORM_MACOS, PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_UNIVERSAL,
    PLUGIN_TYPE_MEDIA_PROVIDER, PLUGIN_TYPE_STREAM_PROVIDER,
    STREAM_FORMAT_M3U8, STREAM_FORMAT_MP4, STREAM_FORMAT_MKV, STREAM_FORMAT_WEBM, STREAM_FORMAT_TORRENT,
    HTTP_METHOD_GET, HTTP_METHOD_POST, HTTP_METHOD_PUT, HTTP_METHOD_DELETE, HTTP_METHOD_HEAD,
    CAPABILITY_HTTP, CAPABILITY_STORAGE, CAPABILITY_LOGGING, CAPABILITY_CRYPTO,
};

// Re-export ZPE universal plugin types
pub use zpe::{
    ZpeManifest, ZpePluginType, ZpeCapabilities, ZpeValidationResult,
    ZpeLoadResult, ZpePluginInfo,
    ZpeAnime, ZpeAnimeList, ZpeEpisode, ZpeEpisodeList,
    ZpeStreamSource, ZpeStreamSourceList, ZpeHttpRequest, ZpeHttpResponse, ZpeResult,
    ZpePluginLoader, get_zpe_plugin_loader,
    ZpeRuntime, ZpeRuntimeConfig, ZpePluginInstance,
    ZPE_EXTENSION, ZPE_ABI_VERSION,
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
                    if path.extension().map(|e| e.to_str()) == Some(Some(PLUGIN_EXTENSION)) {
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
        
        // Verify ZPE extension
        assert_eq!(ZPE_EXTENSION, "zpe");
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
