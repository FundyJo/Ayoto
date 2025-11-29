//! ZPE Plugin Loader
//!
//! Handles loading, managing, and unloading ZPE plugins.
//! ZPE files are ZIP archives containing a WASM module and manifest.
//!
//! # Plugin Icon Support
//!
//! Plugins can include icons in two ways:
//! 1. URL in manifest.json: `"icon": "https://example.com/icon.png"`
//! 2. Embedded file in the archive: `icon.png`, `icon.ico`, `icon.jpg`, `icon.jpeg`, `icon.svg`, or `icon.webp`
//!
//! When an icon file is present in the archive, it takes precedence over the URL in the manifest.
//! The embedded icon is converted to a base64 data URI for display in the UI.

use std::collections::HashMap;
use std::fs::File;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock, RwLock};

use super::runtime::{ZpePluginInstance, ZpeRuntime, ZpeRuntimeConfig};
use super::types::*;

/// Supported icon file names and their MIME types
const ICON_FILES: &[(&str, &str)] = &[
    ("icon.png", "image/png"),
    ("icon.ico", "image/x-icon"),
    ("icon.jpg", "image/jpeg"),
    ("icon.jpeg", "image/jpeg"),
    ("icon.svg", "image/svg+xml"),
    ("icon.webp", "image/webp"),
];

/// Container for a loaded ZPE plugin
pub struct ZpePluginContainer {
    /// Plugin manifest
    manifest: ZpeManifest,
    /// WASM instance
    instance: ZpePluginInstance,
    /// Path to the .zpe file
    file_path: PathBuf,
    /// Whether enabled
    enabled: bool,
    /// Load timestamp
    loaded_at: i64,
}

impl ZpePluginContainer {
    /// Get plugin info
    pub fn info(&self) -> ZpePluginInfo {
        ZpePluginInfo {
            id: self.manifest.id.clone(),
            name: self.manifest.name.clone(),
            version: self.manifest.version.clone(),
            author: self.manifest.author.clone(),
            description: self.manifest.description.clone(),
            icon: self.manifest.icon.clone(),
            target_ayoto_version: self.manifest.target_ayoto_version.clone(),
            plugin_type: self.manifest.plugin_type,
            capabilities: self.manifest.capabilities.clone(),
            file_path: self.file_path.display().to_string(),
            enabled: self.enabled,
            is_compatible: check_version_compatibility(&self.manifest.target_ayoto_version),
            loaded_at: self.loaded_at,
        }
    }

    /// Get mutable access to the instance
    pub fn instance_mut(&mut self) -> &mut ZpePluginInstance {
        &mut self.instance
    }

    /// Get the manifest
    pub fn manifest(&self) -> &ZpeManifest {
        &self.manifest
    }

    /// Check if enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Set enabled state
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }
}

/// ZPE Plugin Loader
pub struct ZpePluginLoader {
    /// Runtime for executing WASM
    runtime: ZpeRuntime,
    /// Loaded plugins
    plugins: Arc<RwLock<HashMap<String, ZpePluginContainer>>>,
    /// Plugin directories
    plugin_dirs: Vec<PathBuf>,
}

impl Default for ZpePluginLoader {
    fn default() -> Self {
        Self::new()
    }
}

impl ZpePluginLoader {
    /// Create a new ZPE plugin loader
    pub fn new() -> Self {
        ZpePluginLoader {
            runtime: ZpeRuntime::default(),
            plugins: Arc::new(RwLock::new(HashMap::new())),
            plugin_dirs: Vec::new(),
        }
    }

    /// Create with custom config
    pub fn with_config(config: ZpeRuntimeConfig) -> Self {
        ZpePluginLoader {
            runtime: ZpeRuntime::new(config),
            plugins: Arc::new(RwLock::new(HashMap::new())),
            plugin_dirs: Vec::new(),
        }
    }

    /// Add a plugin directory
    pub fn add_plugin_dir<P: AsRef<Path>>(&mut self, path: P) {
        self.plugin_dirs.push(path.as_ref().to_path_buf());
    }

    /// Load a ZPE plugin from file
    pub fn load_plugin<P: AsRef<Path>>(&self, path: P) -> ZpeLoadResult {
        let path = path.as_ref();
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Check file exists
        if !path.exists() {
            errors.push(format!("File not found: {}", path.display()));
            return ZpeLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }

        // Check extension
        if path.extension().and_then(|e| e.to_str()) != Some(super::ZPE_EXTENSION) {
            errors.push(format!(
                "Invalid file extension. Expected .{}, got {:?}",
                super::ZPE_EXTENSION,
                path.extension()
            ));
            return ZpeLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }

        // Read the ZIP archive
        let file = match File::open(path) {
            Ok(f) => f,
            Err(e) => {
                errors.push(format!("Failed to open file: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        let mut archive = match zip::ZipArchive::new(file) {
            Ok(a) => a,
            Err(e) => {
                errors.push(format!("Invalid ZPE archive: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Read manifest.json
        let mut manifest = match self.read_manifest(&mut archive) {
            Ok(m) => m,
            Err(e) => {
                errors.push(e);
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Try to read embedded icon file (takes precedence over URL in manifest)
        if let Some(icon_data_uri) = self.read_icon_from_archive(&mut archive) {
            manifest.icon = Some(icon_data_uri);
        }

        // Validate manifest
        let validation = manifest.validate();
        if !validation.valid {
            errors.extend(validation.errors);
            return ZpeLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }
        warnings.extend(validation.warnings);

        let plugin_id = manifest.id.clone();

        // Check if already loaded
        if let Ok(plugins) = self.plugins.read() {
            if plugins.contains_key(&plugin_id) {
                warnings.push(format!("Plugin '{}' already loaded, replacing", plugin_id));
            }
        }

        // Read plugin.wasm
        let wasm_bytes = match self.read_wasm(&mut archive) {
            Ok(b) => b,
            Err(e) => {
                errors.push(e);
                return ZpeLoadResult {
                    success: false,
                    plugin_id: Some(plugin_id),
                    errors,
                    warnings,
                };
            }
        };

        // Create WASM instance
        let mut instance = match self.runtime.create_instance(&wasm_bytes) {
            Ok(i) => i,
            Err(e) => {
                errors.push(format!("Failed to create WASM instance: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: Some(plugin_id),
                    errors,
                    warnings,
                };
            }
        };

        // Initialize the plugin
        if let Err(e) = instance.initialize() {
            warnings.push(format!("Plugin initialization warning: {}", e));
        }

        // Check version compatibility
        if !check_version_compatibility(&manifest.target_ayoto_version) {
            warnings.push(format!(
                "Plugin targets Ayoto v{}, current version is v{}",
                manifest.target_ayoto_version,
                env!("CARGO_PKG_VERSION")
            ));
        }

        // Create container
        let container = ZpePluginContainer {
            manifest,
            instance,
            file_path: path.to_path_buf(),
            enabled: true,
            loaded_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
        };

        // Store plugin
        if let Ok(mut plugins) = self.plugins.write() {
            plugins.insert(plugin_id.clone(), container);
        } else {
            errors.push("Failed to acquire write lock".to_string());
            return ZpeLoadResult {
                success: false,
                plugin_id: Some(plugin_id),
                errors,
                warnings,
            };
        }

        ZpeLoadResult {
            success: true,
            plugin_id: Some(plugin_id),
            errors,
            warnings,
        }
    }

    /// Read manifest from archive
    fn read_manifest(&self, archive: &mut zip::ZipArchive<File>) -> Result<ZpeManifest, String> {
        let mut file = archive
            .by_name("manifest.json")
            .map_err(|_| "manifest.json not found in archive".to_string())?;

        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| format!("Failed to read manifest.json: {}", e))?;

        ZpeManifest::from_json(&contents)
    }

    /// Read WASM module from archive
    fn read_wasm(&self, archive: &mut zip::ZipArchive<File>) -> Result<Vec<u8>, String> {
        let mut file = archive
            .by_name("plugin.wasm")
            .map_err(|_| "plugin.wasm not found in archive".to_string())?;

        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes)
            .map_err(|e| format!("Failed to read plugin.wasm: {}", e))?;

        Ok(bytes)
    }

    /// Maximum icon file size (1MB) to prevent loading excessively large files
    const MAX_ICON_SIZE: u64 = 1024 * 1024;

    /// Read icon file from archive and convert to base64 data URI
    ///
    /// Looks for icon files in the following order: icon.png, icon.ico, icon.jpg, icon.jpeg, icon.svg, icon.webp
    /// Returns None if no icon file is found in the archive or if the file exceeds MAX_ICON_SIZE.
    fn read_icon_from_archive<R: std::io::Read + std::io::Seek>(
        &self,
        archive: &mut zip::ZipArchive<R>,
    ) -> Option<String> {
        use base64::{engine::general_purpose::STANDARD, Engine as _};

        for (filename, mime_type) in ICON_FILES {
            if let Ok(file) = archive.by_name(filename) {
                // Check file size before reading to avoid loading very large files
                let size = file.size();
                if size == 0 || size > Self::MAX_ICON_SIZE {
                    continue;
                }

                // We need to drop the borrow before accessing again
                drop(file);

                // Re-access the file to read its contents
                if let Ok(mut file) = archive.by_name(filename) {
                    let mut bytes = Vec::with_capacity(size as usize);
                    if file.read_to_end(&mut bytes).is_ok() && !bytes.is_empty() {
                        // Convert to base64 data URI
                        let base64_str = STANDARD.encode(&bytes);
                        return Some(format!("data:{};base64,{}", mime_type, base64_str));
                    }
                }
            }
        }
        None
    }

    /// Load plugin from bytes (for embedded plugins)
    pub fn load_plugin_from_bytes(&self, bytes: &[u8], source: &str) -> ZpeLoadResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        let cursor = Cursor::new(bytes);
        let mut archive = match zip::ZipArchive::new(cursor) {
            Ok(a) => a,
            Err(e) => {
                errors.push(format!("Invalid ZPE archive: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Read and parse manifest
        let manifest_content = {
            let mut file = match archive.by_name("manifest.json") {
                Ok(f) => f,
                Err(_) => {
                    errors.push("manifest.json not found in archive".to_string());
                    return ZpeLoadResult {
                        success: false,
                        plugin_id: None,
                        errors,
                        warnings,
                    };
                }
            };
            let mut contents = String::new();
            if let Err(e) = file.read_to_string(&mut contents) {
                errors.push(format!("Failed to read manifest.json: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
            contents
        };

        let mut manifest = match ZpeManifest::from_json(&manifest_content) {
            Ok(m) => m,
            Err(e) => {
                errors.push(e);
                return ZpeLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Try to read embedded icon file (takes precedence over URL in manifest)
        if let Some(icon_data_uri) = self.read_icon_from_archive(&mut archive) {
            manifest.icon = Some(icon_data_uri);
        }

        let validation = manifest.validate();
        if !validation.valid {
            errors.extend(validation.errors);
            return ZpeLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }
        warnings.extend(validation.warnings);

        let plugin_id = manifest.id.clone();

        // Read WASM bytes
        let wasm_bytes = {
            let mut file = match archive.by_name("plugin.wasm") {
                Ok(f) => f,
                Err(_) => {
                    errors.push("plugin.wasm not found in archive".to_string());
                    return ZpeLoadResult {
                        success: false,
                        plugin_id: Some(plugin_id),
                        errors,
                        warnings,
                    };
                }
            };
            let mut bytes = Vec::new();
            if let Err(e) = file.read_to_end(&mut bytes) {
                errors.push(format!("Failed to read plugin.wasm: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: Some(plugin_id),
                    errors,
                    warnings,
                };
            }
            bytes
        };

        // Create instance
        let mut instance = match self.runtime.create_instance(&wasm_bytes) {
            Ok(i) => i,
            Err(e) => {
                errors.push(format!("Failed to create WASM instance: {}", e));
                return ZpeLoadResult {
                    success: false,
                    plugin_id: Some(plugin_id),
                    errors,
                    warnings,
                };
            }
        };

        if let Err(e) = instance.initialize() {
            warnings.push(format!("Plugin initialization warning: {}", e));
        }

        let container = ZpePluginContainer {
            manifest,
            instance,
            file_path: PathBuf::from(source),
            enabled: true,
            loaded_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
        };

        if let Ok(mut plugins) = self.plugins.write() {
            plugins.insert(plugin_id.clone(), container);
        } else {
            errors.push("Failed to acquire write lock".to_string());
            return ZpeLoadResult {
                success: false,
                plugin_id: Some(plugin_id),
                errors,
                warnings,
            };
        }

        ZpeLoadResult {
            success: true,
            plugin_id: Some(plugin_id),
            errors,
            warnings,
        }
    }

    /// Unload a plugin
    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), String> {
        if let Ok(mut plugins) = self.plugins.write() {
            if let Some(mut container) = plugins.remove(plugin_id) {
                container.instance_mut().shutdown();
                Ok(())
            } else {
                Err(format!("Plugin '{}' not found", plugin_id))
            }
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get all loaded plugins
    pub fn get_all_plugins(&self) -> Vec<ZpePluginInfo> {
        self.plugins
            .read()
            .map(|p| p.values().map(|c| c.info()).collect())
            .unwrap_or_default()
    }

    /// Get a plugin by ID
    pub fn get_plugin(&self, plugin_id: &str) -> Option<ZpePluginInfo> {
        self.plugins.read().ok()?.get(plugin_id).map(|c| c.info())
    }

    /// Set plugin enabled state
    pub fn set_plugin_enabled(&self, plugin_id: &str, enabled: bool) -> Result<(), String> {
        if let Ok(mut plugins) = self.plugins.write() {
            if let Some(container) = plugins.get_mut(plugin_id) {
                container.set_enabled(enabled);
                Ok(())
            } else {
                Err(format!("Plugin '{}' not found", plugin_id))
            }
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Search using a plugin
    pub fn plugin_search(
        &self,
        plugin_id: &str,
        query: &str,
        page: u32,
    ) -> Result<ZpeAnimeList, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.search {
                return Err(format!("Plugin '{}' does not support search", plugin_id));
            }

            container.instance_mut().search(query, page)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get popular anime using a plugin
    pub fn plugin_get_popular(&self, plugin_id: &str, page: u32) -> Result<ZpeAnimeList, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.get_popular {
                return Err(format!(
                    "Plugin '{}' does not support get_popular",
                    plugin_id
                ));
            }

            container.instance_mut().get_popular(page)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get latest anime using a plugin
    pub fn plugin_get_latest(&self, plugin_id: &str, page: u32) -> Result<ZpeAnimeList, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.get_latest {
                return Err(format!(
                    "Plugin '{}' does not support get_latest",
                    plugin_id
                ));
            }

            container.instance_mut().get_latest(page)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get episodes using a plugin
    pub fn plugin_get_episodes(
        &self,
        plugin_id: &str,
        anime_id: &str,
        page: u32,
    ) -> Result<ZpeEpisodeList, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.get_episodes {
                return Err(format!(
                    "Plugin '{}' does not support get_episodes",
                    plugin_id
                ));
            }

            container.instance_mut().get_episodes(anime_id, page)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get streams using a plugin
    pub fn plugin_get_streams(
        &self,
        plugin_id: &str,
        anime_id: &str,
        episode_id: &str,
    ) -> Result<ZpeStreamSourceList, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.get_streams {
                return Err(format!(
                    "Plugin '{}' does not support get_streams",
                    plugin_id
                ));
            }

            container.instance_mut().get_streams(anime_id, episode_id)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get anime details using a plugin
    pub fn plugin_get_anime_details(
        &self,
        plugin_id: &str,
        anime_id: &str,
    ) -> Result<ZpeAnime, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.get_anime_details {
                return Err(format!(
                    "Plugin '{}' does not support get_anime_details",
                    plugin_id
                ));
            }

            container.instance_mut().get_anime_details(anime_id)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Extract stream using a plugin
    pub fn plugin_extract_stream(
        &self,
        plugin_id: &str,
        url: &str,
    ) -> Result<ZpeStreamSource, String> {
        if let Ok(mut plugins) = self.plugins.write() {
            let container = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;

            if !container.is_enabled() {
                return Err(format!("Plugin '{}' is disabled", plugin_id));
            }

            if !container.manifest().capabilities.extract_stream {
                return Err(format!(
                    "Plugin '{}' does not support extract_stream",
                    plugin_id
                ));
            }

            container.instance_mut().extract_stream(url)
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Load all plugins from configured directories
    pub fn load_all_from_dirs(&self) -> Vec<ZpeLoadResult> {
        let mut results = Vec::new();

        for dir in &self.plugin_dirs {
            if !dir.exists() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some(super::ZPE_EXTENSION) {
                        results.push(self.load_plugin(&path));
                    }
                }
            }
        }

        results
    }
}

/// Check version compatibility
fn check_version_compatibility(target_version: &str) -> bool {
    let current = env!("CARGO_PKG_VERSION");

    let parse_version = |v: &str| -> Option<(u32, u32, u32)> {
        let parts: Vec<&str> = v.split('-').next()?.split('.').collect();
        if parts.len() != 3 {
            return None;
        }
        Some((
            parts[0].parse().ok()?,
            parts[1].parse().ok()?,
            parts[2].parse().ok()?,
        ))
    };

    match (parse_version(current), parse_version(target_version)) {
        (Some((cur_major, _, _)), Some((target_major, _, _))) => cur_major == target_major,
        _ => false,
    }
}

// Global ZPE plugin loader
static ZPE_PLUGIN_LOADER: OnceLock<ZpePluginLoader> = OnceLock::new();

/// Get the global ZPE plugin loader
pub fn get_zpe_plugin_loader() -> &'static ZpePluginLoader {
    ZPE_PLUGIN_LOADER.get_or_init(ZpePluginLoader::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_loader_creation() {
        let loader = ZpePluginLoader::new();
        assert!(loader.get_all_plugins().is_empty());
    }

    #[test]
    fn test_version_compatibility() {
        let current = env!("CARGO_PKG_VERSION");
        assert!(check_version_compatibility(current));
        assert!(!check_version_compatibility("99.0.0"));
    }

    #[test]
    fn test_icon_files_constant() {
        // Verify that all expected icon formats are supported
        let supported_formats: Vec<&str> = ICON_FILES.iter().map(|(name, _)| *name).collect();
        assert!(supported_formats.contains(&"icon.png"));
        assert!(supported_formats.contains(&"icon.ico"));
        assert!(supported_formats.contains(&"icon.jpg"));
        assert!(supported_formats.contains(&"icon.jpeg"));
        assert!(supported_formats.contains(&"icon.svg"));
        assert!(supported_formats.contains(&"icon.webp"));
    }

    #[test]
    fn test_icon_mime_types() {
        // Verify MIME types are correctly mapped
        for (filename, mime_type) in ICON_FILES {
            match *filename {
                "icon.png" => assert_eq!(*mime_type, "image/png"),
                "icon.ico" => assert_eq!(*mime_type, "image/x-icon"),
                "icon.jpg" | "icon.jpeg" => assert_eq!(*mime_type, "image/jpeg"),
                "icon.svg" => assert_eq!(*mime_type, "image/svg+xml"),
                "icon.webp" => assert_eq!(*mime_type, "image/webp"),
                _ => panic!("Unexpected icon filename: {}", filename),
            }
        }
    }

    #[test]
    fn test_base64_encoding() {
        use base64::{engine::general_purpose::STANDARD, Engine as _};

        // Test that base64 encoding works correctly
        let test_data = b"test icon data";
        let encoded = STANDARD.encode(test_data);
        let data_uri = format!("data:image/png;base64,{}", encoded);

        assert!(data_uri.starts_with("data:image/png;base64,"));
        assert!(!data_uri.is_empty());
    }

    #[test]
    fn test_max_icon_size() {
        // Verify that MAX_ICON_SIZE is a reasonable limit (1MB)
        assert_eq!(ZpePluginLoader::MAX_ICON_SIZE, 1024 * 1024);
    }
}
