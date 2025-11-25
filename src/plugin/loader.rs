//! Ayoto Plugin Loader
//! 
//! Handles loading, validating, and managing .ayoto plugins.
//! Plugins can be loaded from files or directories.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use serde::{Deserialize, Serialize};

use super::manifest::{PluginManifest, SemVer, TargetPlatform};
use super::types::PluginError;

/// Current Ayoto version (from Cargo.toml)
pub const AYOTO_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Plugin file extension
pub const PLUGIN_EXTENSION: &str = "ayoto";

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

    /// Load a plugin from a file
    pub fn load_from_file<P: AsRef<Path>>(&self, path: P) -> PluginLoadResult {
        let path = path.as_ref();
        
        // Check file extension
        if path.extension().map(|e| e.to_str()) != Some(Some(PLUGIN_EXTENSION)) {
            return PluginLoadResult {
                success: false,
                plugin_id: None,
                errors: vec![format!(
                    "Invalid plugin file extension. Expected .{}", 
                    PLUGIN_EXTENSION
                )],
                warnings: vec![],
            };
        }

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
                    "search" => caps.search,
                    "getPopular" => caps.get_popular,
                    "getLatest" => caps.get_latest,
                    "getEpisodes" => caps.get_episodes,
                    "getStreams" => caps.get_streams,
                    "getAnimeDetails" => caps.get_anime_details,
                    "scraping" => caps.scraping,
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

    /// Load all plugins from configured directories
    pub fn load_all_from_dirs(&self) -> Vec<PluginLoadResult> {
        let mut results = Vec::new();

        for dir in &self.plugin_dirs {
            if !dir.exists() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map(|e| e.to_str()) == Some(Some(PLUGIN_EXTENSION)) {
                        results.push(self.load_from_file(&path));
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
    if caps.search { count += 1; }
    if caps.get_popular { count += 1; }
    if caps.get_latest { count += 1; }
    if caps.get_episodes { count += 1; }
    if caps.get_streams { count += 1; }
    if caps.get_anime_details { count += 1; }
    if caps.scraping { count += 1; }
    count
}

/// Create a sample plugin manifest for testing
pub fn create_sample_plugin() -> PluginManifest {
    PluginManifest {
        id: "sample-provider".to_string(),
        name: "Sample Anime Provider".to_string(),
        version: "1.0.0".to_string(),
        target_ayoto_version: AYOTO_VERSION.to_string(),
        max_ayoto_version: None,
        description: Some("A sample plugin demonstrating the Ayoto plugin system".to_string()),
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
        },
        platforms: vec![TargetPlatform::Universal],
        scraping_config: Some(super::manifest::ScrapingConfig {
            base_url: "https://example.com".to_string(),
            user_agent: Some("Ayoto/1.0".to_string()),
            rate_limit_ms: Some(1000),
            requires_javascript: false,
            selectors: None,
        }),
        config: serde_json::json!({
            "defaultQuality": "1080p",
            "preferredServer": "main"
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
        assert_eq!(result.plugin_id, Some("sample-provider".to_string()));
    }

    #[test]
    fn test_get_plugins_with_capability() {
        let loader = PluginLoader::new();
        let sample = create_sample_plugin();
        let json = sample.to_json().unwrap();
        loader.load_from_json(&json, "test");

        let search_plugins = loader.get_plugins_with_capability("search");
        assert_eq!(search_plugins.len(), 1);
        assert_eq!(search_plugins[0].manifest.id, "sample-provider");
    }
}
