//! Ayoto Plugin Trait Definition
//! 
//! Defines the interface that all native Ayoto plugins must implement.
//! Plugins are Rust dynamic libraries that expose specific functions
//! for the plugin system to call.
//! 
//! # Plugin Entry Point
//! 
//! Every plugin must export a `create_plugin` function with this signature:
//! ```ignore
//! #[no_mangle]
//! pub extern "C" fn create_plugin() -> *mut dyn AyotoPlugin;
//! ```

use super::ffi_types::*;

// ============================================================================
// Plugin Trait
// ============================================================================

/// Main plugin trait that all Ayoto plugins must implement
/// 
/// This trait defines the interface between the host application and plugins.
/// Plugins are compiled as dynamic libraries and loaded at runtime.
pub trait AyotoPlugin: Send + Sync {
    // ======================== Metadata ========================
    
    /// Get plugin metadata
    fn get_metadata(&self) -> PluginMetadata;
    
    /// Get plugin capabilities as a bitmask
    fn get_capabilities(&self) -> PluginCapabilities;
    
    // ======================== Lifecycle ========================
    
    /// Initialize the plugin with configuration
    /// Called once when the plugin is loaded
    fn initialize(&mut self, config: &FfiPluginConfig) -> FfiResult<()>;
    
    /// Cleanup before unloading
    /// Called once when the plugin is about to be unloaded
    fn shutdown(&mut self);
    
    // ======================== Media Provider Methods ========================
    
    /// Search for anime by query
    fn search(&self, query: &str, page: u32) -> FfiResult<FfiAnimeList>;
    
    /// Get popular anime
    fn get_popular(&self, page: u32) -> FfiResult<FfiAnimeList>;
    
    /// Get latest anime
    fn get_latest(&self, page: u32) -> FfiResult<FfiAnimeList>;
    
    /// Get episodes for an anime
    fn get_episodes(&self, anime_id: &str, page: u32) -> FfiResult<FfiEpisodeList>;
    
    /// Get stream sources for an episode
    fn get_streams(&self, anime_id: &str, episode_id: &str) -> FfiResult<FfiStreamSourceList>;
    
    /// Get detailed anime information
    fn get_anime_details(&self, anime_id: &str) -> FfiResult<FfiAnime>;
    
    // ======================== Stream Provider Methods ========================
    
    /// Extract stream URL from a hoster URL
    fn extract_stream(&self, url: &str) -> FfiResult<FfiStreamSource>;
    
    /// Get information about a hoster URL
    fn get_hoster_info(&self, url: &str) -> FfiResult<HosterInfo>;
    
    /// Decrypt an encrypted stream
    fn decrypt_stream(&self, encrypted_data: &str) -> FfiResult<FfiStreamSource>;
    
    /// Get direct download link from a hoster URL
    fn get_download_link(&self, url: &str) -> FfiResult<String>;
    
    // ======================== HTTP Context Methods ========================
    
    /// Set the HTTP context for making requests
    /// This allows the host to inject an HTTP client for plugins to use
    fn set_http_context(&mut self, context: HttpContext);
}

// ============================================================================
// Plugin Capabilities
// ============================================================================

/// Plugin capabilities bitmask
#[derive(Debug, Clone, Copy, Default)]
pub struct PluginCapabilities {
    /// Raw capabilities bitmask
    pub flags: u32,
}

// Media Provider capabilities
pub const CAP_SEARCH: u32 = 1 << 0;
pub const CAP_GET_POPULAR: u32 = 1 << 1;
pub const CAP_GET_LATEST: u32 = 1 << 2;
pub const CAP_GET_EPISODES: u32 = 1 << 3;
pub const CAP_GET_STREAMS: u32 = 1 << 4;
pub const CAP_GET_ANIME_DETAILS: u32 = 1 << 5;
pub const CAP_SCRAPING: u32 = 1 << 6;

// Stream Provider capabilities
pub const CAP_EXTRACT_STREAM: u32 = 1 << 8;
pub const CAP_GET_HOSTER_INFO: u32 = 1 << 9;
pub const CAP_DECRYPT_STREAM: u32 = 1 << 10;
pub const CAP_GET_DOWNLOAD_LINK: u32 = 1 << 11;

impl PluginCapabilities {
    /// Create new capabilities with specified flags
    pub fn new(flags: u32) -> Self {
        PluginCapabilities { flags }
    }

    /// Create empty capabilities
    pub fn none() -> Self {
        PluginCapabilities { flags: 0 }
    }

    /// Create media provider capabilities
    pub fn media_provider() -> Self {
        PluginCapabilities {
            flags: CAP_SEARCH | CAP_GET_POPULAR | CAP_GET_LATEST | 
                   CAP_GET_EPISODES | CAP_GET_STREAMS | CAP_GET_ANIME_DETAILS,
        }
    }

    /// Create stream provider capabilities
    pub fn stream_provider() -> Self {
        PluginCapabilities {
            flags: CAP_EXTRACT_STREAM | CAP_GET_HOSTER_INFO | 
                   CAP_DECRYPT_STREAM | CAP_GET_DOWNLOAD_LINK,
        }
    }

    /// Check if a capability is present
    pub fn has(&self, cap: u32) -> bool {
        self.flags & cap != 0
    }

    /// Add a capability
    pub fn add(&mut self, cap: u32) {
        self.flags |= cap;
    }

    /// Remove a capability
    pub fn remove(&mut self, cap: u32) {
        self.flags &= !cap;
    }
}

// ============================================================================
// HTTP Context for Plugins
// ============================================================================

/// HTTP context that allows plugins to make HTTP requests
/// 
/// The host application provides this context so plugins can make
/// HTTP requests for web scraping without needing their own HTTP client.
#[derive(Clone)]
pub struct HttpContext {
    /// Function to execute HTTP requests
    pub request_fn: Option<fn(&FfiHttpRequest) -> FfiHttpResponse>,
    /// User agent to use
    pub user_agent: String,
    /// Default timeout in seconds
    pub default_timeout: u32,
}

impl Default for HttpContext {
    fn default() -> Self {
        HttpContext {
            request_fn: None,
            user_agent: format!("Ayoto/{}", env!("CARGO_PKG_VERSION")),
            default_timeout: 30,
        }
    }
}

impl HttpContext {
    /// Make an HTTP GET request
    pub fn get(&self, url: &str) -> FfiHttpResponse {
        self.request(&FfiHttpRequest::get(url))
    }

    /// Make an HTTP POST request
    pub fn post(&self, url: &str, body: &str) -> FfiHttpResponse {
        self.request(&FfiHttpRequest::post(url, body))
    }

    /// Make a generic HTTP request
    pub fn request(&self, req: &FfiHttpRequest) -> FfiHttpResponse {
        if let Some(request_fn) = self.request_fn {
            request_fn(req)
        } else {
            FfiHttpResponse {
                status_code: 0,
                body: "HTTP context not initialized".to_string(),
                ..Default::default()
            }
        }
    }
}

// ============================================================================
// Plugin Function Signatures
// ============================================================================

/// Type alias for the plugin creation function
/// Every plugin must export this function
pub type CreatePluginFn = unsafe extern "C" fn() -> *mut dyn AyotoPlugin;

/// Type alias for the plugin destruction function
/// Every plugin must export this function
pub type DestroyPluginFn = unsafe extern "C" fn(*mut dyn AyotoPlugin);

/// Type alias for getting plugin ABI version
/// Used to ensure compatibility between host and plugin
pub type GetPluginAbiFn = unsafe extern "C" fn() -> u32;

/// Current plugin ABI version
/// Increment this when making breaking changes to the plugin interface
pub const PLUGIN_ABI_VERSION: u32 = 1;

// ============================================================================
// Default Implementation
// ============================================================================

/// Default implementation of AyotoPlugin that returns "not implemented" for all methods
/// Plugins can extend this to only implement the methods they need
pub struct DefaultPlugin {
    pub metadata: PluginMetadata,
    pub capabilities: PluginCapabilities,
    pub http_context: HttpContext,
    pub initialized: bool,
}

impl DefaultPlugin {
    pub fn new(id: &str, name: &str, version: &str) -> Self {
        DefaultPlugin {
            metadata: PluginMetadata {
                id: id.to_string(),
                name: name.to_string(),
                version: version.to_string(),
                author: None,
                description: None,
                target_ayoto_version: env!("CARGO_PKG_VERSION").to_string(),
                plugin_type: PLUGIN_TYPE_MEDIA_PROVIDER,
                platforms: PLATFORM_UNIVERSAL,
            },
            capabilities: PluginCapabilities::none(),
            http_context: HttpContext::default(),
            initialized: false,
        }
    }
}

fn not_implemented<T: Default>(method: &str) -> FfiResult<T> {
    FfiResult::err(format!("Method '{}' not implemented", method))
}

impl AyotoPlugin for DefaultPlugin {
    fn get_metadata(&self) -> PluginMetadata {
        self.metadata.clone()
    }

    fn get_capabilities(&self) -> PluginCapabilities {
        self.capabilities
    }

    fn initialize(&mut self, _config: &FfiPluginConfig) -> FfiResult<()> {
        self.initialized = true;
        FfiResult::ok(())
    }

    fn shutdown(&mut self) {
        self.initialized = false;
    }

    fn search(&self, _query: &str, _page: u32) -> FfiResult<FfiAnimeList> {
        not_implemented("search")
    }

    fn get_popular(&self, _page: u32) -> FfiResult<FfiAnimeList> {
        not_implemented("get_popular")
    }

    fn get_latest(&self, _page: u32) -> FfiResult<FfiAnimeList> {
        not_implemented("get_latest")
    }

    fn get_episodes(&self, _anime_id: &str, _page: u32) -> FfiResult<FfiEpisodeList> {
        not_implemented("get_episodes")
    }

    fn get_streams(&self, _anime_id: &str, _episode_id: &str) -> FfiResult<FfiStreamSourceList> {
        not_implemented("get_streams")
    }

    fn get_anime_details(&self, _anime_id: &str) -> FfiResult<FfiAnime> {
        not_implemented("get_anime_details")
    }

    fn extract_stream(&self, _url: &str) -> FfiResult<FfiStreamSource> {
        not_implemented("extract_stream")
    }

    fn get_hoster_info(&self, _url: &str) -> FfiResult<HosterInfo> {
        not_implemented("get_hoster_info")
    }

    fn decrypt_stream(&self, _encrypted_data: &str) -> FfiResult<FfiStreamSource> {
        not_implemented("decrypt_stream")
    }

    fn get_download_link(&self, _url: &str) -> FfiResult<String> {
        not_implemented("get_download_link")
    }

    fn set_http_context(&mut self, context: HttpContext) {
        self.http_context = context;
    }
}

// ============================================================================
// Plugin Entry Point Functions
// ============================================================================

// NOTE: The macro below is for internal use within the Ayoto crate only.
// External plugins should manually implement the entry points as shown
// in the documentation (docs/NATIVE_PLUGIN_DEVELOPMENT.md).
//
// Example for external plugins:
// ```rust
// #[no_mangle]
// pub extern "C" fn create_plugin() -> *mut dyn AyotoPlugin {
//     Box::into_raw(Box::new(MyPlugin::new())) as *mut dyn AyotoPlugin
// }
//
// #[no_mangle]
// pub extern "C" fn destroy_plugin(plugin: *mut dyn AyotoPlugin) {
//     if !plugin.is_null() {
//         unsafe { let _ = Box::from_raw(plugin); }
//     }
// }
//
// #[no_mangle]
// pub extern "C" fn get_plugin_abi_version() -> u32 { 1 }
// ```

/// Macro to export plugin entry points (internal use only)
/// 
/// **Note**: This macro is designed for use within the Ayoto crate.
/// External plugins should manually implement the entry points.
/// See `docs/NATIVE_PLUGIN_DEVELOPMENT.md` for examples.
/// 
/// Usage:
/// ```ignore
/// ayoto_plugin_export!(MyPlugin);
/// ```
#[macro_export]
macro_rules! ayoto_plugin_export {
    ($plugin_type:ty) => {
        #[no_mangle]
        pub extern "C" fn create_plugin() -> *mut dyn $crate::plugin::native::AyotoPlugin {
            let plugin = Box::new(<$plugin_type>::new());
            Box::into_raw(plugin) as *mut dyn $crate::plugin::native::AyotoPlugin
        }

        #[no_mangle]
        pub extern "C" fn destroy_plugin(plugin: *mut dyn $crate::plugin::native::AyotoPlugin) {
            if !plugin.is_null() {
                unsafe {
                    let _ = Box::from_raw(plugin);
                }
            }
        }

        #[no_mangle]
        pub extern "C" fn get_plugin_abi_version() -> u32 {
            $crate::plugin::native::PLUGIN_ABI_VERSION
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_capabilities() {
        let mut caps = PluginCapabilities::none();
        assert!(!caps.has(CAP_SEARCH));

        caps.add(CAP_SEARCH);
        assert!(caps.has(CAP_SEARCH));

        caps.remove(CAP_SEARCH);
        assert!(!caps.has(CAP_SEARCH));
    }

    #[test]
    fn test_media_provider_capabilities() {
        let caps = PluginCapabilities::media_provider();
        assert!(caps.has(CAP_SEARCH));
        assert!(caps.has(CAP_GET_EPISODES));
        assert!(caps.has(CAP_GET_STREAMS));
        assert!(!caps.has(CAP_EXTRACT_STREAM));
    }

    #[test]
    fn test_stream_provider_capabilities() {
        let caps = PluginCapabilities::stream_provider();
        assert!(caps.has(CAP_EXTRACT_STREAM));
        assert!(caps.has(CAP_GET_HOSTER_INFO));
        assert!(!caps.has(CAP_SEARCH));
    }

    #[test]
    fn test_default_plugin() {
        let plugin = DefaultPlugin::new("test", "Test Plugin", "1.0.0");
        assert!(!plugin.initialized);
        
        let caps = plugin.get_capabilities();
        assert_eq!(caps.flags, 0);
        
        let meta = plugin.get_metadata();
        assert_eq!(meta.id, "test");
        assert_eq!(meta.name, "Test Plugin");
    }
}
