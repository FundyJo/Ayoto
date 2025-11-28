//! Ayoto Plugin Loader
//! 
//! Handles loading, validating, and managing plugins.
//! Plugins can be loaded from files or directories.
//! 
//! # Plugin Extensions
//! 
//! The loader supports two types of plugin files:
//! - `.ayoto` - JSON-based manifest plugins (cross-platform by design)
//! - `.pl` - Native plugins with platform-specific libraries bundled inside
//!
//! # Plugin Types
//! 
//! Both extensions support two types of plugins:
//! - **StreamProvider**: For video extraction from hosters (Voe, Vidoza, etc.)
//! - **MediaProvider**: For content listings from sites (aniworld.to, s.to, etc.)
//!
//! # Native Plugin (.pl) Structure
//!
//! Native plugins use a unified `.pl` extension that works across all platforms.
//! The plugin contains a manifest.json and platform-specific libraries:
//!
//! ```text
//! my-plugin.pl/
//! ├── manifest.json       # Plugin manifest with nativeLibrary paths
//! └── lib/
//!     ├── linux/
//!     │   └── libplugin.so
//!     ├── windows/
//!     │   └── plugin.dll
//!     ├── macos/
//!     │   └── libplugin.dylib
//!     ├── android/
//!     │   └── libplugin.so
//!     └── ios/
//!         └── libplugin.dylib
//! ```

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};

use super::manifest::{PluginManifest, SemVer, TargetPlatform};
use super::types::{PluginError, PluginType};

/// Current Ayoto version (from Cargo.toml)
pub const AYOTO_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Plugin file extension for JSON-based plugins
pub const PLUGIN_EXTENSION: &str = "ayoto";

/// Native plugin file extension (unified across all platforms)
/// Instead of platform-specific extensions (.so, .dll, .dylib),
/// native plugins use the unified .pl extension
pub const NATIVE_PLUGIN_EXTENSION: &str = "pl";

/// All supported plugin extensions
pub const SUPPORTED_EXTENSIONS: &[&str] = &[PLUGIN_EXTENSION, NATIVE_PLUGIN_EXTENSION];

/// Loaded plugin with runtime state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedPlugin {
    /// Plugin manifest
    pub manifest: PluginManifest,
    /// Whether the plugin is currently enabled
    pub enabled: bool,
    /// Plugin source (file path or URL)
    pub source: String,
    /// Load timestamp
    pub loaded_at: i64,
    /// Last error (if any)
    pub last_error: Option<String>,
    /// Compatibility status
    pub compatibility: PluginCompatibility,
}

/// Plugin compatibility information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginCompatibility {
    /// Is compatible with current Ayoto version
    pub is_compatible: bool,
    /// Is compatible with current platform
    pub platform_compatible: bool,
    /// Warning messages for potential issues
    pub warnings: Vec<String>,
    /// Ayoto version the plugin was built for
    pub target_version: String,
    /// Current Ayoto version
    pub current_version: String,
}

/// Result of plugin loading operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLoadResult {
    pub success: bool,
    pub plugin_id: Option<String>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Plugin loader and manager
pub struct PluginLoader {
    /// Loaded plugins indexed by ID
    plugins: Arc<RwLock<HashMap<String, LoadedPlugin>>>,
    /// Plugin directories to search
    plugin_dirs: Vec<PathBuf>,
    /// Current platform
    current_platform: TargetPlatform,
}

impl PluginLoader {
    /// Create a new plugin loader
    pub fn new() -> Self {
        PluginLoader {
            plugins: Arc::new(RwLock::new(HashMap::new())),
            plugin_dirs: Vec::new(),
            current_platform: Self::detect_platform(),
        }
    }

    /// Detect current platform
    fn detect_platform() -> TargetPlatform {
        #[cfg(target_os = "windows")]
        return TargetPlatform::Windows;
        #[cfg(target_os = "macos")]
        return TargetPlatform::Macos;
        #[cfg(target_os = "linux")]
        return TargetPlatform::Linux;
        #[cfg(target_os = "ios")]
        return TargetPlatform::Ios;
        #[cfg(target_os = "android")]
        return TargetPlatform::Android;
        #[cfg(not(any(
            target_os = "windows",
            target_os = "macos",
            target_os = "linux",
            target_os = "ios",
            target_os = "android"
        )))]
        return TargetPlatform::Universal;
    }

    /// Add a plugin directory to search
    pub fn add_plugin_dir<P: AsRef<Path>>(&mut self, path: P) {
        self.plugin_dirs.push(path.as_ref().to_path_buf());
    }

    /// Load a plugin from JSON content
    pub fn load_from_json(&self, json: &str, source: &str) -> PluginLoadResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Parse manifest
        let manifest = match PluginManifest::from_json(json) {
            Ok(m) => m,
            Err(e) => {
                errors.push(e);
                return PluginLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Validate manifest
        let validation = manifest.validate();
        if !validation.is_valid {
            errors.extend(validation.errors);
            return PluginLoadResult {
                success: false,
                plugin_id: Some(manifest.id.clone()),
                errors,
                warnings: validation.warnings,
            };
        }
        warnings.extend(validation.warnings);

        // Check version compatibility
        let compatibility = self.check_compatibility(&manifest);
        if !compatibility.is_compatible {
            warnings.push(format!(
                "Plugin '{}' v{} was built for Ayoto v{} but current version is v{}. There may be compatibility issues.",
                manifest.name, manifest.version, manifest.target_ayoto_version, AYOTO_VERSION
            ));
        }
        if !compatibility.platform_compatible {
            errors.push(format!(
                "Plugin '{}' does not support the current platform",
                manifest.name
            ));
            return PluginLoadResult {
                success: false,
                plugin_id: Some(manifest.id.clone()),
                errors,
                warnings,
            };
        }

        // Create loaded plugin
        let loaded_plugin = LoadedPlugin {
            manifest: manifest.clone(),
            enabled: true,
            source: source.to_string(),
            loaded_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
            last_error: None,
            compatibility,
        };

        // Add to plugins map
        let plugin_id = manifest.id.clone();
        if let Ok(mut plugins) = self.plugins.write() {
            plugins.insert(plugin_id.clone(), loaded_plugin);
        } else {
            errors.push("Failed to acquire write lock on plugins".to_string());
            return PluginLoadResult {
                success: false,
                plugin_id: Some(plugin_id),
                errors,
                warnings,
            };
        }

        PluginLoadResult {
            success: true,
            plugin_id: Some(plugin_id),
            errors,
            warnings,
        }
    }

    /// Load a plugin from a file (.ayoto or .pl)
    pub fn load_from_file<P: AsRef<Path>>(&self, path: P) -> PluginLoadResult {
        let path = path.as_ref();
        
        // Get file extension
        let extension = path.extension().and_then(|e| e.to_str());
        
        match extension {
            Some(PLUGIN_EXTENSION) => self.load_ayoto_plugin(path),
            Some(NATIVE_PLUGIN_EXTENSION) => self.load_native_plugin(path),
            _ => PluginLoadResult {
                success: false,
                plugin_id: None,
                errors: vec![format!(
                    "Invalid plugin file extension. Expected .{} or .{}", 
                    PLUGIN_EXTENSION,
                    NATIVE_PLUGIN_EXTENSION
                )],
                warnings: vec![],
            },
        }
    }

    /// Load a JSON-based .ayoto plugin
    fn load_ayoto_plugin(&self, path: &Path) -> PluginLoadResult {
        // Read file content
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                return PluginLoadResult {
                    success: false,
                    plugin_id: None,
                    errors: vec![format!("Failed to read plugin file: {}", e)],
                    warnings: vec![],
                };
            }
        };

        self.load_from_json(&content, &path.display().to_string())
    }

    /// Load a native .pl plugin (directory with manifest.json and platform-specific libraries)
    fn load_native_plugin(&self, path: &Path) -> PluginLoadResult {
        let mut warnings = Vec::new();
        
        // Native plugins should be directories containing a manifest.json and lib/ folder
        // If a single .pl file is provided, we treat it as a JSON manifest
        let manifest_path = if path.is_dir() {
            path.join("manifest.json")
        } else {
            // Single .pl file - treat as JSON manifest with native library paths
            // Add a warning to clarify this behavior
            warnings.push(
                "Loading .pl file as JSON manifest. For full native plugin support, \
                 use a directory structure with manifest.json and platform-specific libraries.".to_string()
            );
            let mut result = self.load_ayoto_plugin(path);
            result.warnings.extend(warnings);
            return result;
        };

        // Read manifest
        let content = match std::fs::read_to_string(&manifest_path) {
            Ok(c) => c,
            Err(e) => {
                return PluginLoadResult {
                    success: false,
                    plugin_id: None,
                    errors: vec![format!("Failed to read plugin manifest: {}", e)],
                    warnings: vec![],
                };
            }
        };

        // Parse manifest
        let manifest = match PluginManifest::from_json(&content) {
            Ok(m) => m,
            Err(e) => {
                return PluginLoadResult {
                    success: false,
                    plugin_id: None,
                    errors: vec![e],
                    warnings: vec![],
                };
            }
        };

        // Validate that native library exists for current platform
        if let Some(ref native_lib) = manifest.native_library {
            if let Some(lib_path) = native_lib.get_for_current_platform() {
                let full_lib_path = path.join(lib_path);
                if !full_lib_path.exists() {
                    warnings.push(format!(
                        "Native library not found for current platform: {}",
                        full_lib_path.display()
                    ));
                }
            } else {
                warnings.push(
                    "No native library path defined for current platform".to_string()
                );
            }
        }

        // Load the plugin using the JSON loader
        let mut result = self.load_from_json(&content, &path.display().to_string());
        result.warnings.extend(warnings);
        result
    }

    /// Check plugin compatibility with current Ayoto version and platform
    fn check_compatibility(&self, manifest: &PluginManifest) -> PluginCompatibility {
        let mut warnings = Vec::new();

        // Check version compatibility
        let is_compatible = manifest
            .is_compatible_with_ayoto(AYOTO_VERSION)
            .unwrap_or(false);

        if !is_compatible {
            let current_major = SemVer::parse(AYOTO_VERSION)
                .map(|v| v.major)
                .unwrap_or(0);
            let target_major = SemVer::parse(&manifest.target_ayoto_version)
                .map(|v| v.major)
                .unwrap_or(0);

            if current_major > target_major {
                warnings.push(format!(
                    "This plugin was built for Ayoto v{}. API changes in v{} may cause issues.",
                    manifest.target_ayoto_version, AYOTO_VERSION
                ));
            }
        }

        // Check platform compatibility
        let platform_compatible = manifest.supports_platform(&self.current_platform);

        PluginCompatibility {
            is_compatible,
            platform_compatible,
            warnings,
            target_version: manifest.target_ayoto_version.clone(),
            current_version: AYOTO_VERSION.to_string(),
        }
    }

    /// Get a loaded plugin by ID
    pub fn get_plugin(&self, plugin_id: &str) -> Option<LoadedPlugin> {
        self.plugins.read().ok()?.get(plugin_id).cloned()
    }

    /// Get all loaded plugins
    pub fn get_all_plugins(&self) -> Vec<LoadedPlugin> {
        self.plugins
            .read()
            .map(|p| p.values().cloned().collect())
            .unwrap_or_default()
    }

    /// Get enabled plugins
    pub fn get_enabled_plugins(&self) -> Vec<LoadedPlugin> {
        self.get_all_plugins()
            .into_iter()
            .filter(|p| p.enabled)
            .collect()
    }

    /// Enable or disable a plugin
    pub fn set_plugin_enabled(&self, plugin_id: &str, enabled: bool) -> Result<(), PluginError> {
        let mut plugins = self.plugins.write().map_err(|_| PluginError {
            code: "LOCK_ERROR".to_string(),
            message: "Failed to acquire write lock".to_string(),
            details: None,
        })?;

        if let Some(plugin) = plugins.get_mut(plugin_id) {
            plugin.enabled = enabled;
            Ok(())
        } else {
            Err(PluginError {
                code: "NOT_FOUND".to_string(),
                message: format!("Plugin '{}' not found", plugin_id),
                details: None,
            })
        }
    }

    /// Unload a plugin
    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), PluginError> {
        let mut plugins = self.plugins.write().map_err(|_| PluginError {
            code: "LOCK_ERROR".to_string(),
            message: "Failed to acquire write lock".to_string(),
            details: None,
        })?;

        if plugins.remove(plugin_id).is_some() {
            Ok(())
        } else {
            Err(PluginError {
                code: "NOT_FOUND".to_string(),
                message: format!("Plugin '{}' not found", plugin_id),
                details: None,
            })
        }
    }

    /// Get plugins with a specific capability
    pub fn get_plugins_with_capability(&self, capability: &str) -> Vec<LoadedPlugin> {
        self.get_enabled_plugins()
            .into_iter()
            .filter(|p| {
                let caps = &p.manifest.capabilities;
                match capability {
                    // Media Provider capabilities
                    "search" => caps.search,
                    "getPopular" => caps.get_popular,
                    "getLatest" => caps.get_latest,
                    "getEpisodes" => caps.get_episodes,
                    "getStreams" => caps.get_streams,
                    "getAnimeDetails" => caps.get_anime_details,
                    "scraping" => caps.scraping,
                    // Stream Provider capabilities
                    "extractStream" => caps.extract_stream,
                    "getHosterInfo" => caps.get_hoster_info,
                    "decryptStream" => caps.decrypt_stream,
                    "getDownloadLink" => caps.get_download_link,
                    _ => false,
                }
            })
            .collect()
    }

    /// Get plugins that support a specific format
    pub fn get_plugins_by_format(&self, format: &str) -> Vec<LoadedPlugin> {
        self.get_enabled_plugins()
            .into_iter()
            .filter(|p| p.manifest.formats.iter().any(|f| f == format))
            .collect()
    }

    /// Get plugins that support Anime4K
    pub fn get_anime4k_plugins(&self) -> Vec<LoadedPlugin> {
        self.get_enabled_plugins()
            .into_iter()
            .filter(|p| p.manifest.anime4k_support)
            .collect()
    }

    /// Get plugins by type (StreamProvider or MediaProvider)
    pub fn get_plugins_by_type(&self, plugin_type: &PluginType) -> Vec<LoadedPlugin> {
        self.get_enabled_plugins()
            .into_iter()
            .filter(|p| &p.manifest.plugin_type == plugin_type)
            .collect()
    }

    /// Get all Stream Provider plugins
    pub fn get_stream_providers(&self) -> Vec<LoadedPlugin> {
        self.get_plugins_by_type(&PluginType::StreamProvider)
    }

    /// Get all Media Provider plugins
    pub fn get_media_providers(&self) -> Vec<LoadedPlugin> {
        self.get_plugins_by_type(&PluginType::MediaProvider)
    }

    /// Get stream provider plugins that support a specific hoster
    pub fn get_stream_providers_for_hoster(&self, hoster: &str) -> Vec<LoadedPlugin> {
        let hoster_lower = hoster.to_lowercase();
        self.get_stream_providers()
            .into_iter()
            .filter(|p| {
                if let Some(ref config) = p.manifest.stream_provider_config {
                    config.supported_hosters.iter().any(|h| h.to_lowercase() == hoster_lower)
                } else {
                    false
                }
            })
            .collect()
    }

    /// Get media provider plugins that support a specific language
    pub fn get_media_providers_for_language(&self, language: &str) -> Vec<LoadedPlugin> {
        let lang_lower = language.to_lowercase();
        self.get_media_providers()
            .into_iter()
            .filter(|p| {
                if let Some(ref config) = p.manifest.media_provider_config {
                    config.languages.iter().any(|l| l.to_lowercase() == lang_lower)
                } else {
                    true // If no languages specified, assume all languages
                }
            })
            .collect()
    }

    /// Load all plugins from configured directories
    /// Supports both .ayoto (JSON-based) and .pl (native) plugins
    pub fn load_all_from_dirs(&self) -> Vec<PluginLoadResult> {
        let mut results = Vec::new();
        
        // Pre-compute the native plugin directory suffix to avoid repeated allocations
        let native_dir_suffix = format!(".{}", NATIVE_PLUGIN_EXTENSION);

        for dir in &self.plugin_dirs {
            if !dir.exists() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str());
                    
                    // Check if extension matches any supported extension
                    if SUPPORTED_EXTENSIONS.iter().any(|&e| Some(e) == ext) {
                        results.push(self.load_from_file(&path));
                    }
                    // Also check for .pl directories (native plugins)
                    else if path.is_dir() {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            if name.ends_with(&native_dir_suffix) {
                                results.push(self.load_from_file(&path));
                            }
                        }
                    }
                }
            }
        }

        results
    }

    /// Get plugin summary for display
    pub fn get_plugins_summary(&self) -> Vec<PluginSummary> {
        self.get_all_plugins()
            .into_iter()
            .map(|p| PluginSummary {
                id: p.manifest.id,
                name: p.manifest.name,
                version: p.manifest.version,
                plugin_type: p.manifest.plugin_type,
                description: p.manifest.description,
                author: p.manifest.author,
                icon: p.manifest.icon,
                enabled: p.enabled,
                is_compatible: p.compatibility.is_compatible,
                target_version: p.compatibility.target_version,
                capabilities_count: count_capabilities(&p.manifest.capabilities),
            })
            .collect()
    }
}

impl Default for PluginLoader {
    fn default() -> Self {
        Self::new()
    }
}

/// Plugin summary for UI display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSummary {
    pub id: String,
    pub name: String,
    pub version: String,
    pub plugin_type: PluginType,
    pub description: Option<String>,
    pub author: Option<String>,
    pub icon: Option<String>,
    pub enabled: bool,
    pub is_compatible: bool,
    pub target_version: String,
    pub capabilities_count: usize,
}

fn count_capabilities(caps: &super::manifest::PluginCapabilities) -> usize {
    let mut count = 0;
    // Media Provider capabilities
    if caps.search { count += 1; }
    if caps.get_popular { count += 1; }
    if caps.get_latest { count += 1; }
    if caps.get_episodes { count += 1; }
    if caps.get_streams { count += 1; }
    if caps.get_anime_details { count += 1; }
    if caps.scraping { count += 1; }
    // Stream Provider capabilities
    if caps.extract_stream { count += 1; }
    if caps.get_hoster_info { count += 1; }
    if caps.decrypt_stream { count += 1; }
    if caps.get_download_link { count += 1; }
    count
}

/// Create a sample Media Provider plugin manifest for testing
pub fn create_sample_plugin() -> PluginManifest {
    create_sample_media_provider()
}

/// Create a sample Media Provider plugin manifest
pub fn create_sample_media_provider() -> PluginManifest {
    PluginManifest {
        id: "sample-media-provider".to_string(),
        name: "Sample Anime Provider".to_string(),
        version: "1.0.0".to_string(),
        plugin_type: PluginType::MediaProvider,
        target_ayoto_version: AYOTO_VERSION.to_string(),
        max_ayoto_version: None,
        description: Some("A sample media provider plugin demonstrating the Ayoto plugin system".to_string()),
        author: Some("Ayoto Team".to_string()),
        homepage: Some("https://github.com/FundyJo/Ayoto".to_string()),
        icon: None,
        providers: vec!["Sample Provider".to_string()],
        formats: vec!["m3u8".to_string(), "mp4".to_string()],
        anime4k_support: true,
        capabilities: super::manifest::PluginCapabilities {
            search: true,
            get_popular: true,
            get_latest: true,
            get_episodes: true,
            get_streams: true,
            get_anime_details: true,
            scraping: true,
            ..Default::default()
        },
        platforms: vec![TargetPlatform::Universal],
        scraping_config: Some(super::manifest::ScrapingConfig {
            base_url: "https://example.com".to_string(),
            user_agent: Some("Ayoto/1.0".to_string()),
            rate_limit_ms: Some(1000),
            requires_javascript: false,
            selectors: None,
        }),
        stream_provider_config: None,
        media_provider_config: Some(super::types::MediaProviderConfig {
            base_url: Some("https://aniworld.to".to_string()),
            languages: vec!["de".to_string(), "en".to_string()],
            content_types: vec!["anime".to_string(), "series".to_string()],
            requires_auth: false,
            has_nsfw: false,
        }),
        native_library: None,
        config: serde_json::json!({
            "defaultQuality": "1080p",
            "preferredServer": "main"
        }),
    }
}

/// Create a sample Stream Provider plugin manifest
pub fn create_sample_stream_provider() -> PluginManifest {
    PluginManifest {
        id: "sample-stream-provider".to_string(),
        name: "Sample Stream Extractor".to_string(),
        version: "1.0.0".to_string(),
        plugin_type: PluginType::StreamProvider,
        target_ayoto_version: AYOTO_VERSION.to_string(),
        max_ayoto_version: None,
        description: Some("A sample stream provider plugin for extracting videos from hosters".to_string()),
        author: Some("Ayoto Team".to_string()),
        homepage: Some("https://github.com/FundyJo/Ayoto".to_string()),
        icon: None,
        providers: vec!["Voe".to_string(), "Vidoza".to_string()],
        formats: vec!["m3u8".to_string(), "mp4".to_string()],
        anime4k_support: false,
        capabilities: super::manifest::PluginCapabilities {
            extract_stream: true,
            get_hoster_info: true,
            decrypt_stream: true,
            get_download_link: true,
            ..Default::default()
        },
        platforms: vec![TargetPlatform::Universal],
        scraping_config: None,
        stream_provider_config: Some(super::types::StreamProviderConfig {
            supported_hosters: vec!["voe".to_string(), "vidoza".to_string(), "streamtape".to_string()],
            supports_encrypted: true,
            supports_download: true,
            url_patterns: vec![
                r"https?://voe\.sx/.*".to_string(),
                r"https?://vidoza\.[a-z]+/.*".to_string(),
                r"https?://streamtape\.com/.*".to_string(),
            ],
            priority: 10,
        }),
        media_provider_config: None,
        native_library: None,
        config: serde_json::json!({
            "timeout": 30,
            "retries": 3
        }),
    }
}

/// Create a sample native plugin manifest with platform-specific library paths
pub fn create_sample_native_plugin() -> PluginManifest {
    PluginManifest {
        id: "sample-native-plugin".to_string(),
        name: "Sample Native Plugin".to_string(),
        version: "1.0.0".to_string(),
        plugin_type: PluginType::MediaProvider,
        target_ayoto_version: AYOTO_VERSION.to_string(),
        max_ayoto_version: None,
        description: Some("A sample native plugin with platform-specific libraries".to_string()),
        author: Some("Ayoto Team".to_string()),
        homepage: Some("https://github.com/FundyJo/Ayoto".to_string()),
        icon: None,
        providers: vec!["Native Provider".to_string()],
        formats: vec!["m3u8".to_string(), "mp4".to_string()],
        anime4k_support: true,
        capabilities: super::manifest::PluginCapabilities {
            search: true,
            get_episodes: true,
            get_streams: true,
            ..Default::default()
        },
        platforms: vec![TargetPlatform::Universal],
        scraping_config: None,
        stream_provider_config: None,
        media_provider_config: None,
        native_library: Some(super::manifest::NativeLibraryPaths {
            linux: Some("lib/linux/libplugin.so".to_string()),
            windows: Some("lib/windows/plugin.dll".to_string()),
            macos: Some("lib/macos/libplugin.dylib".to_string()),
            android: Some("lib/android/libplugin.so".to_string()),
            ios: Some("lib/ios/libplugin.dylib".to_string()),
        }),
        config: serde_json::json!({
            "nativeFeature": true
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_loader_creation() {
        let loader = PluginLoader::new();
        assert!(loader.get_all_plugins().is_empty());
    }

    #[test]
    fn test_load_from_json() {
        let loader = PluginLoader::new();
        let sample = create_sample_plugin();
        let json = sample.to_json().unwrap();
        
        let result = loader.load_from_json(&json, "test");
        assert!(result.success, "Errors: {:?}", result.errors);
        assert_eq!(result.plugin_id, Some("sample-media-provider".to_string()));
    }

    #[test]
    fn test_get_plugins_with_capability() {
        let loader = PluginLoader::new();
        let sample = create_sample_plugin();
        let json = sample.to_json().unwrap();
        loader.load_from_json(&json, "test");

        let search_plugins = loader.get_plugins_with_capability("search");
        assert_eq!(search_plugins.len(), 1);
        assert_eq!(search_plugins[0].manifest.id, "sample-media-provider");
    }

    #[test]
    fn test_stream_provider_loading() {
        let loader = PluginLoader::new();
        let sample = create_sample_stream_provider();
        let json = sample.to_json().unwrap();
        
        let result = loader.load_from_json(&json, "test");
        assert!(result.success, "Errors: {:?}", result.errors);
        assert_eq!(result.plugin_id, Some("sample-stream-provider".to_string()));
        
        // Verify we can find it by type
        let stream_providers = loader.get_stream_providers();
        assert_eq!(stream_providers.len(), 1);
        assert_eq!(stream_providers[0].manifest.plugin_type, PluginType::StreamProvider);
    }

    #[test]
    fn test_get_stream_providers_for_hoster() {
        let loader = PluginLoader::new();
        let sample = create_sample_stream_provider();
        let json = sample.to_json().unwrap();
        loader.load_from_json(&json, "test");

        // Should find the stream provider for "voe" hoster
        let voe_providers = loader.get_stream_providers_for_hoster("voe");
        assert_eq!(voe_providers.len(), 1);
        
        // Should find for "Vidoza" (case insensitive)
        let vidoza_providers = loader.get_stream_providers_for_hoster("Vidoza");
        assert_eq!(vidoza_providers.len(), 1);
        
        // Should not find for unknown hoster
        let unknown_providers = loader.get_stream_providers_for_hoster("unknown");
        assert_eq!(unknown_providers.len(), 0);
    }

    #[test]
    fn test_native_plugin_extension() {
        // Verify the native plugin extension constant
        assert_eq!(NATIVE_PLUGIN_EXTENSION, "pl");
        assert!(SUPPORTED_EXTENSIONS.contains(&"ayoto"));
        assert!(SUPPORTED_EXTENSIONS.contains(&"pl"));
    }

    #[test]
    fn test_native_plugin_manifest() {
        let sample = create_sample_native_plugin();
        assert!(sample.is_native_plugin());
        assert!(sample.native_library.is_some());
        
        let native_lib = sample.native_library.as_ref().unwrap();
        assert_eq!(native_lib.linux, Some("lib/linux/libplugin.so".to_string()));
        assert_eq!(native_lib.windows, Some("lib/windows/plugin.dll".to_string()));
        assert_eq!(native_lib.macos, Some("lib/macos/libplugin.dylib".to_string()));
    }

    #[test]
    fn test_load_native_plugin_from_json() {
        let loader = PluginLoader::new();
        let sample = create_sample_native_plugin();
        let json = sample.to_json().unwrap();
        
        let result = loader.load_from_json(&json, "test.pl");
        assert!(result.success, "Errors: {:?}", result.errors);
        assert_eq!(result.plugin_id, Some("sample-native-plugin".to_string()));
        
        // Verify it's marked as a native plugin
        let plugin = loader.get_plugin("sample-native-plugin").unwrap();
        assert!(plugin.manifest.is_native_plugin());
    }

    #[test]
    fn test_invalid_extension_rejected() {
        let loader = PluginLoader::new();
        
        // Try loading with invalid extension
        let result = loader.load_from_file("/tmp/test.invalid");
        assert!(!result.success);
        assert!(result.errors[0].contains("Invalid plugin file extension"));
    }
}
