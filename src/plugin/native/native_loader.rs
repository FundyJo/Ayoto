//! Native Plugin Loader
//! 
//! Handles loading, managing, and unloading native Rust plugins compiled
//! as dynamic libraries (.so/.dll/.dylib).
//! 
//! # Cross-Platform Support
//! 
//! - **Linux**: `.so` files (e.g., `libplugin.so`)
//! - **Windows**: `.dll` files (e.g., `plugin.dll`)
//! - **macOS**: `.dylib` files (e.g., `libplugin.dylib`)
//! - **Android**: `.so` files (ARM/ARM64)
//! 
//! # Safety
//! 
//! Loading native plugins involves unsafe operations. This loader implements
//! safety checks including ABI version verification and capability validation.

use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use serde::{Deserialize, Serialize};

use super::plugin_trait::*;
use super::runtime::PluginRuntime;
use super::ffi_types::*;

// ============================================================================
// Platform-Specific File Extensions
// ============================================================================

/// Get the platform-specific plugin file extension
pub fn get_plugin_extension() -> &'static str {
    #[cfg(target_os = "linux")]
    return "so";
    #[cfg(target_os = "android")]
    return "so";
    #[cfg(target_os = "windows")]
    return "dll";
    #[cfg(target_os = "macos")]
    return "dylib";
    #[cfg(target_os = "ios")]
    return "dylib";
    #[cfg(not(any(
        target_os = "linux",
        target_os = "android",
        target_os = "windows",
        target_os = "macos",
        target_os = "ios"
    )))]
    return "so";
}

/// Get the platform name
pub fn get_platform_name() -> &'static str {
    #[cfg(target_os = "linux")]
    return "linux";
    #[cfg(target_os = "android")]
    return "android";
    #[cfg(target_os = "windows")]
    return "windows";
    #[cfg(target_os = "macos")]
    return "macos";
    #[cfg(target_os = "ios")]
    return "ios";
    #[cfg(not(any(
        target_os = "linux",
        target_os = "android",
        target_os = "windows",
        target_os = "macos",
        target_os = "ios"
    )))]
    return "unknown";
}

// ============================================================================
// Native Plugin Container
// ============================================================================

/// Container for a loaded native plugin
/// 
/// Manages the lifetime of the plugin and its associated library handle.
pub struct NativePluginContainer {
    /// The plugin instance
    plugin: Box<dyn AyotoPlugin>,
    /// Library handle (platform-specific)
    #[cfg(unix)]
    handle: Option<*mut std::ffi::c_void>,
    #[cfg(windows)]
    handle: Option<*mut std::ffi::c_void>,
    /// Path to the library file
    library_path: PathBuf,
    /// Whether the plugin is initialized
    initialized: bool,
    /// Plugin metadata (cached)
    metadata: NativePluginInfo,
}

// Safety: The plugin trait requires Send + Sync, and we manage the handle carefully
unsafe impl Send for NativePluginContainer {}
unsafe impl Sync for NativePluginContainer {}

impl NativePluginContainer {
    /// Get a reference to the plugin
    pub fn plugin(&self) -> &dyn AyotoPlugin {
        self.plugin.as_ref()
    }

    /// Get a mutable reference to the plugin
    pub fn plugin_mut(&mut self) -> &mut dyn AyotoPlugin {
        self.plugin.as_mut()
    }

    /// Get the library path
    pub fn library_path(&self) -> &Path {
        &self.library_path
    }

    /// Check if initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Get plugin info
    pub fn info(&self) -> &NativePluginInfo {
        &self.metadata
    }
}

impl Drop for NativePluginContainer {
    fn drop(&mut self) {
        // Shutdown the plugin first
        self.plugin.shutdown();

        // Close the library handle
        #[cfg(unix)]
        {
            if let Some(handle) = self.handle.take() {
                unsafe {
                    libc::dlclose(handle);
                }
            }
        }

        #[cfg(windows)]
        {
            if let Some(handle) = self.handle.take() {
                unsafe {
                    // Windows: FreeLibrary
                    extern "system" {
                        fn FreeLibrary(handle: *mut std::ffi::c_void) -> i32;
                    }
                    FreeLibrary(handle);
                }
            }
        }
    }
}

// ============================================================================
// Native Plugin Info (Serializable)
// ============================================================================

/// Serializable information about a native plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePluginInfo {
    /// Plugin ID
    pub id: String,
    /// Plugin name
    pub name: String,
    /// Plugin version
    pub version: String,
    /// Plugin author
    pub author: Option<String>,
    /// Plugin description
    pub description: Option<String>,
    /// Target Ayoto version
    pub target_ayoto_version: String,
    /// Plugin type (0 = MediaProvider, 1 = StreamProvider)
    pub plugin_type: u8,
    /// Capabilities flags
    pub capabilities: u32,
    /// Library path
    pub library_path: String,
    /// Whether the plugin is enabled
    pub enabled: bool,
    /// Whether the plugin is compatible with current Ayoto version
    pub is_compatible: bool,
    /// Load timestamp
    pub loaded_at: i64,
}

// ============================================================================
// Native Plugin Loader
// ============================================================================

/// Load result for native plugins
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePluginLoadResult {
    /// Whether loading was successful
    pub success: bool,
    /// Plugin ID (if successful)
    pub plugin_id: Option<String>,
    /// Error messages
    pub errors: Vec<String>,
    /// Warning messages
    pub warnings: Vec<String>,
}

/// Native plugin loader
/// 
/// Handles loading and managing native Rust plugins.
pub struct NativePluginLoader {
    /// Loaded plugins
    plugins: Arc<RwLock<HashMap<String, NativePluginContainer>>>,
    /// Plugin runtime
    runtime: PluginRuntime,
    /// Plugin directories
    plugin_dirs: Vec<PathBuf>,
}

impl Default for NativePluginLoader {
    fn default() -> Self {
        Self::new()
    }
}

impl NativePluginLoader {
    /// Create a new native plugin loader
    pub fn new() -> Self {
        NativePluginLoader {
            plugins: Arc::new(RwLock::new(HashMap::new())),
            runtime: PluginRuntime::new(),
            plugin_dirs: Vec::new(),
        }
    }

    /// Add a plugin directory
    pub fn add_plugin_dir<P: AsRef<Path>>(&mut self, path: P) {
        self.plugin_dirs.push(path.as_ref().to_path_buf());
    }

    /// Set the plugin runtime
    pub fn set_runtime(&mut self, runtime: PluginRuntime) {
        self.runtime = runtime;
    }

    /// Load a native plugin from a file path
    /// 
    /// # Safety
    /// 
    /// Loading a dynamic library is inherently unsafe. This function performs
    /// safety checks but cannot guarantee the plugin is safe.
    pub fn load_plugin<P: AsRef<Path>>(&self, path: P) -> NativePluginLoadResult {
        let path = path.as_ref();
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Check file exists
        if !path.exists() {
            errors.push(format!("Plugin file not found: {}", path.display()));
            return NativePluginLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }

        // Check file extension
        let extension = path.extension().and_then(OsStr::to_str).unwrap_or("");
        if extension != get_plugin_extension() {
            errors.push(format!(
                "Invalid plugin extension '{}', expected '{}'",
                extension,
                get_plugin_extension()
            ));
            return NativePluginLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }

        // Load the library
        #[allow(unused_variables)]
        let load_result: Result<(*mut std::ffi::c_void, Box<dyn AyotoPlugin>), String>;
        
        #[cfg(unix)]
        {
            load_result = unsafe { self.load_library_unix(path) };
        }
        
        #[cfg(windows)]
        {
            load_result = unsafe { self.load_library_windows(path) };
        }
        
        #[cfg(not(any(unix, windows)))]
        {
            load_result = Err("Platform not supported for native plugins".to_string());
        }

        let (handle, plugin) = match load_result {
            Ok(result) => result,
            Err(e) => {
                errors.push(e);
                return NativePluginLoadResult {
                    success: false,
                    plugin_id: None,
                    errors,
                    warnings,
                };
            }
        };

        // Get plugin metadata
        let metadata = plugin.get_metadata();
        let plugin_id = metadata.id.clone();
        
        if plugin_id.is_empty() {
            errors.push("Plugin has empty ID".to_string());
            return NativePluginLoadResult {
                success: false,
                plugin_id: None,
                errors,
                warnings,
            };
        }

        // Check if already loaded
        if let Ok(plugins) = self.plugins.read() {
            if plugins.contains_key(&plugin_id) {
                warnings.push(format!("Plugin '{}' already loaded, replacing", plugin_id));
            }
        }

        // Check version compatibility
        let is_compatible = check_version_compatibility(&metadata.target_ayoto_version);
        if !is_compatible {
            warnings.push(format!(
                "Plugin '{}' targets Ayoto v{}, current version is v{}",
                plugin_id, metadata.target_ayoto_version, env!("CARGO_PKG_VERSION")
            ));
        }

        // Create plugin info
        let info = NativePluginInfo {
            id: plugin_id.clone(),
            name: metadata.name.clone(),
            version: metadata.version.clone(),
            author: metadata.author.clone(),
            description: metadata.description.clone(),
            target_ayoto_version: metadata.target_ayoto_version.clone(),
            plugin_type: metadata.plugin_type,
            capabilities: plugin.get_capabilities().flags,
            library_path: path.display().to_string(),
            enabled: true,
            is_compatible,
            loaded_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0),
        };

        // Create container
        let container = NativePluginContainer {
            plugin,
            handle: Some(handle),
            library_path: path.to_path_buf(),
            initialized: false,
            metadata: info,
        };

        // Store the plugin
        if let Ok(mut plugins) = self.plugins.write() {
            plugins.insert(plugin_id.clone(), container);
        } else {
            errors.push("Failed to acquire write lock".to_string());
            return NativePluginLoadResult {
                success: false,
                plugin_id: Some(plugin_id),
                errors,
                warnings,
            };
        }

        // Initialize the plugin
        if let Err(e) = self.initialize_plugin(&plugin_id) {
            warnings.push(format!("Plugin initialization warning: {}", e));
        }

        NativePluginLoadResult {
            success: true,
            plugin_id: Some(plugin_id),
            errors,
            warnings,
        }
    }

    /// Load library on Unix systems (Linux, macOS, Android, iOS)
    #[cfg(unix)]
    unsafe fn load_library_unix(&self, path: &Path) -> Result<(*mut std::ffi::c_void, Box<dyn AyotoPlugin>), String> {
        use std::ffi::CString;

        // Load the library
        let path_cstr = CString::new(path.to_string_lossy().as_bytes())
            .map_err(|_| "Invalid path".to_string())?;
        
        let handle = libc::dlopen(path_cstr.as_ptr(), libc::RTLD_NOW | libc::RTLD_LOCAL);
        if handle.is_null() {
            let error = std::ffi::CStr::from_ptr(libc::dlerror())
                .to_string_lossy()
                .to_string();
            return Err(format!("Failed to load library: {}", error));
        }

        // Check ABI version
        let abi_version_fn: GetPluginAbiFn = {
            let sym_name = CString::new("get_plugin_abi_version").unwrap();
            let sym = libc::dlsym(handle, sym_name.as_ptr());
            if sym.is_null() {
                libc::dlclose(handle);
                return Err("Plugin missing get_plugin_abi_version function".to_string());
            }
            std::mem::transmute(sym)
        };

        let abi_version = abi_version_fn();
        if abi_version != PLUGIN_ABI_VERSION {
            libc::dlclose(handle);
            return Err(format!(
                "ABI version mismatch: plugin has v{}, expected v{}",
                abi_version, PLUGIN_ABI_VERSION
            ));
        }

        // Get create_plugin function
        let create_fn: CreatePluginFn = {
            let sym_name = CString::new("create_plugin").unwrap();
            let sym = libc::dlsym(handle, sym_name.as_ptr());
            if sym.is_null() {
                libc::dlclose(handle);
                return Err("Plugin missing create_plugin function".to_string());
            }
            std::mem::transmute(sym)
        };

        // Create plugin instance
        let plugin_ptr = create_fn();
        if plugin_ptr.is_null() {
            libc::dlclose(handle);
            return Err("create_plugin returned null".to_string());
        }

        let plugin = Box::from_raw(plugin_ptr);
        Ok((handle, plugin))
    }

    /// Load library on Windows
    #[cfg(windows)]
    unsafe fn load_library_windows(&self, path: &Path) -> Result<(*mut std::ffi::c_void, Box<dyn AyotoPlugin>), String> {
        use std::os::windows::ffi::OsStrExt;

        extern "system" {
            fn LoadLibraryW(lpFileName: *const u16) -> *mut std::ffi::c_void;
            fn GetProcAddress(hModule: *mut std::ffi::c_void, lpProcName: *const i8) -> *mut std::ffi::c_void;
            fn FreeLibrary(handle: *mut std::ffi::c_void) -> i32;
            fn GetLastError() -> u32;
        }

        // Convert path to wide string
        let wide_path: Vec<u16> = path.as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let handle = LoadLibraryW(wide_path.as_ptr());
        if handle.is_null() {
            return Err(format!("Failed to load library: error code {}", GetLastError()));
        }

        // Check ABI version
        let abi_fn_name = b"get_plugin_abi_version\0";
        let abi_fn = GetProcAddress(handle, abi_fn_name.as_ptr() as *const i8);
        if abi_fn.is_null() {
            FreeLibrary(handle);
            return Err("Plugin missing get_plugin_abi_version function".to_string());
        }

        let abi_version_fn: GetPluginAbiFn = std::mem::transmute(abi_fn);
        let abi_version = abi_version_fn();
        if abi_version != PLUGIN_ABI_VERSION {
            FreeLibrary(handle);
            return Err(format!(
                "ABI version mismatch: plugin has v{}, expected v{}",
                abi_version, PLUGIN_ABI_VERSION
            ));
        }

        // Get create_plugin function
        let create_fn_name = b"create_plugin\0";
        let create_fn = GetProcAddress(handle, create_fn_name.as_ptr() as *const i8);
        if create_fn.is_null() {
            FreeLibrary(handle);
            return Err("Plugin missing create_plugin function".to_string());
        }

        let create_plugin_fn: CreatePluginFn = std::mem::transmute(create_fn);
        let plugin_ptr = create_plugin_fn();
        if plugin_ptr.is_null() {
            FreeLibrary(handle);
            return Err("create_plugin returned null".to_string());
        }

        let plugin = Box::from_raw(plugin_ptr);
        Ok((handle, plugin))
    }

    /// Initialize a plugin
    fn initialize_plugin(&self, plugin_id: &str) -> Result<(), String> {
        let config = self.runtime.create_plugin_config();
        let http_context = self.runtime.create_http_context();

        if let Ok(mut plugins) = self.plugins.write() {
            if let Some(container) = plugins.get_mut(plugin_id) {
                container.plugin_mut().set_http_context(http_context);
                let result = container.plugin_mut().initialize(&config);
                if result.success {
                    container.initialized = true;
                    Ok(())
                } else {
                    Err(result.error)
                }
            } else {
                Err(format!("Plugin '{}' not found", plugin_id))
            }
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Unload a plugin
    pub fn unload_plugin(&self, plugin_id: &str) -> Result<(), String> {
        if let Ok(mut plugins) = self.plugins.write() {
            if plugins.remove(plugin_id).is_some() {
                Ok(())
            } else {
                Err(format!("Plugin '{}' not found", plugin_id))
            }
        } else {
            Err("Failed to acquire write lock".to_string())
        }
    }

    /// Get all loaded plugins
    pub fn get_all_plugins(&self) -> Vec<NativePluginInfo> {
        self.plugins
            .read()
            .map(|p| p.values().map(|c| c.info().clone()).collect())
            .unwrap_or_default()
    }

    /// Get a plugin by ID
    pub fn get_plugin(&self, plugin_id: &str) -> Option<NativePluginInfo> {
        self.plugins
            .read()
            .ok()?
            .get(plugin_id)
            .map(|c| c.info().clone())
    }

    /// Execute a search on a specific plugin
    pub fn plugin_search(&self, plugin_id: &str, query: &str, page: u32) -> Result<FfiAnimeList, String> {
        let plugins = self.plugins.read().map_err(|_| "Failed to acquire read lock")?;
        let container = plugins.get(plugin_id).ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;
        
        let result = container.plugin().search(query, page);
        if result.success {
            Ok(result.value)
        } else {
            Err(result.error)
        }
    }

    /// Execute get_episodes on a specific plugin
    pub fn plugin_get_episodes(&self, plugin_id: &str, anime_id: &str, page: u32) -> Result<FfiEpisodeList, String> {
        let plugins = self.plugins.read().map_err(|_| "Failed to acquire read lock")?;
        let container = plugins.get(plugin_id).ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;
        
        let result = container.plugin().get_episodes(anime_id, page);
        if result.success {
            Ok(result.value)
        } else {
            Err(result.error)
        }
    }

    /// Execute get_streams on a specific plugin
    pub fn plugin_get_streams(&self, plugin_id: &str, anime_id: &str, episode_id: &str) -> Result<FfiStreamSourceList, String> {
        let plugins = self.plugins.read().map_err(|_| "Failed to acquire read lock")?;
        let container = plugins.get(plugin_id).ok_or_else(|| format!("Plugin '{}' not found", plugin_id))?;
        
        let result = container.plugin().get_streams(anime_id, episode_id);
        if result.success {
            Ok(result.value)
        } else {
            Err(result.error)
        }
    }

    /// Load all plugins from configured directories
    pub fn load_all_from_dirs(&self) -> Vec<NativePluginLoadResult> {
        let mut results = Vec::new();
        let extension = get_plugin_extension();

        for dir in &self.plugin_dirs {
            if !dir.exists() {
                continue;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(OsStr::to_str) == Some(extension) {
                        results.push(self.load_plugin(&path));
                    }
                }
            }
        }

        results
    }
}

// ============================================================================
// Version Compatibility
// ============================================================================

/// Check if a plugin's target version is compatible with current Ayoto version
fn check_version_compatibility(target_version: &str) -> bool {
    let current = env!("CARGO_PKG_VERSION");
    
    // Parse versions
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
        (Some((cur_major, _, _)), Some((target_major, _, _))) => {
            // Same major version = compatible
            cur_major == target_major
        }
        _ => false,
    }
}

// ============================================================================
// Global Native Plugin Loader
// ============================================================================

use std::sync::OnceLock;

static NATIVE_PLUGIN_LOADER: OnceLock<NativePluginLoader> = OnceLock::new();

/// Get the global native plugin loader
pub fn get_native_plugin_loader() -> &'static NativePluginLoader {
    NATIVE_PLUGIN_LOADER.get_or_init(NativePluginLoader::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform_extension() {
        let ext = get_plugin_extension();
        #[cfg(target_os = "linux")]
        assert_eq!(ext, "so");
        #[cfg(target_os = "windows")]
        assert_eq!(ext, "dll");
        #[cfg(target_os = "macos")]
        assert_eq!(ext, "dylib");
    }

    #[test]
    fn test_version_compatibility() {
        // These tests assume current version follows semver
        let current = env!("CARGO_PKG_VERSION");
        assert!(check_version_compatibility(current));
    }

    #[test]
    fn test_native_plugin_loader_creation() {
        let loader = NativePluginLoader::new();
        assert!(loader.get_all_plugins().is_empty());
    }
}
