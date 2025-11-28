//! FFI-Safe Types for Ayoto Native Plugin System
//! 
//! These types are designed to be safe across FFI boundaries and work
//! consistently across all supported platforms (Linux, Windows, macOS, Android, iOS).
//! 
//! All types use C-compatible representations and avoid Rust-specific constructs
//! that don't translate well across dynamic library boundaries.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Plugin Metadata
// ============================================================================

/// Plugin metadata stored as plain Rust types for thread safety
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginMetadata {
    /// Unique plugin identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// Plugin version (semver format)
    pub version: String,
    /// Plugin author
    pub author: Option<String>,
    /// Plugin description
    pub description: Option<String>,
    /// Target Ayoto version
    pub target_ayoto_version: String,
    /// Plugin type (0 = MediaProvider, 1 = StreamProvider)
    pub plugin_type: u8,
    /// Supported platforms bitmask
    pub platforms: u32,
}

impl Default for PluginMetadata {
    fn default() -> Self {
        PluginMetadata {
            id: String::new(),
            name: String::new(),
            version: String::from("0.0.0"),
            author: None,
            description: None,
            target_ayoto_version: env!("CARGO_PKG_VERSION").to_string(),
            plugin_type: PLUGIN_TYPE_MEDIA_PROVIDER,
            platforms: PLATFORM_UNIVERSAL,
        }
    }
}

/// Plugin type constants
pub const PLUGIN_TYPE_MEDIA_PROVIDER: u8 = 0;
pub const PLUGIN_TYPE_STREAM_PROVIDER: u8 = 1;

/// Platform bitmask constants
pub const PLATFORM_LINUX: u32 = 1 << 0;
pub const PLATFORM_WINDOWS: u32 = 1 << 1;
pub const PLATFORM_MACOS: u32 = 1 << 2;
pub const PLATFORM_ANDROID: u32 = 1 << 3;
pub const PLATFORM_IOS: u32 = 1 << 4;
pub const PLATFORM_UNIVERSAL: u32 = 0xFFFFFFFF;

// ============================================================================
// FFI Result Type
// ============================================================================

/// FFI-safe result type for plugin operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FfiResult<T> {
    /// Success flag
    pub success: bool,
    /// Result value (only valid if success is true)
    pub value: T,
    /// Error message (only valid if success is false)
    pub error: String,
}

impl<T: Default> FfiResult<T> {
    /// Create a success result
    pub fn ok(value: T) -> Self {
        FfiResult {
            success: true,
            value,
            error: String::new(),
        }
    }

    /// Create an error result
    pub fn err(message: String) -> Self {
        FfiResult {
            success: false,
            value: T::default(),
            error: message,
        }
    }
}

impl<T: Default> Default for FfiResult<T> {
    fn default() -> Self {
        FfiResult {
            success: false,
            value: T::default(),
            error: String::from("Not initialized"),
        }
    }
}

// ============================================================================
// Anime Data Types
// ============================================================================

/// Anime information
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiAnime {
    /// Unique identifier
    pub id: String,
    /// Anime title
    pub title: String,
    /// Alternative titles
    pub alt_titles: Vec<String>,
    /// Cover image URL
    pub cover_url: Option<String>,
    /// Banner image URL
    pub banner_url: Option<String>,
    /// Description/synopsis
    pub description: Option<String>,
    /// AniList ID (0 if not available)
    pub anilist_id: Option<u32>,
    /// MyAnimeList ID (0 if not available)
    pub mal_id: Option<u32>,
    /// Episode count (0 if unknown)
    pub episode_count: Option<u32>,
    /// Release year (0 if unknown)
    pub year: Option<u32>,
    /// Rating (0-100, scaled from 0-10)
    pub rating: Option<f32>,
    /// Status (Unknown, Airing, Finished, NotYetReleased)
    pub status: Option<String>,
    /// Media type (TV, Movie, OVA, ONA, Special)
    pub media_type: Option<String>,
    /// Genres
    pub genres: Vec<String>,
    /// Whether currently airing
    pub is_airing: Option<bool>,
}

/// Anime list result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiAnimeList {
    /// Array of anime
    pub items: Vec<FfiAnime>,
    /// Whether there are more results
    pub has_next_page: bool,
    /// Current page number
    pub current_page: u32,
    /// Total results count
    pub total_results: Option<u32>,
}

// ============================================================================
// Episode Types
// ============================================================================

/// Episode information
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiEpisode {
    /// Unique episode identifier
    pub id: String,
    /// Episode number
    pub number: u32,
    /// Episode title
    pub title: Option<String>,
    /// Thumbnail URL
    pub thumbnail_url: Option<String>,
    /// Episode description
    pub description: Option<String>,
    /// Duration in seconds
    pub duration: Option<u32>,
    /// Air date (ISO 8601 timestamp)
    pub air_date: Option<String>,
    /// Is filler episode
    pub is_filler: Option<bool>,
}

/// Episode list result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiEpisodeList {
    /// Array of episodes
    pub items: Vec<FfiEpisode>,
    /// Whether there are more results
    pub has_next_page: bool,
    /// Current page number
    pub current_page: u32,
    /// Total episode count
    pub total_episodes: u32,
}

// ============================================================================
// Stream Types
// ============================================================================

/// Stream format constants
pub const STREAM_FORMAT_M3U8: u8 = 0;
pub const STREAM_FORMAT_MP4: u8 = 1;
pub const STREAM_FORMAT_MKV: u8 = 2;
pub const STREAM_FORMAT_WEBM: u8 = 3;
pub const STREAM_FORMAT_TORRENT: u8 = 4;

/// Stream source
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiStreamSource {
    /// Stream URL
    pub url: String,
    /// Quality label (e.g., "1080p", "720p")
    pub quality: String,
    /// Server name
    pub server: Option<String>,
    /// Stream format
    pub format: u8,
    /// Whether Anime4K is supported
    pub anime4k_support: bool,
    /// Whether this is the default source
    pub is_default: bool,
    /// Custom headers for the stream
    pub headers: HashMap<String, String>,
}

impl FfiStreamSource {
    /// Get format as string
    pub fn format_string(&self) -> &'static str {
        match self.format {
            STREAM_FORMAT_M3U8 => "m3u8",
            STREAM_FORMAT_MP4 => "mp4",
            STREAM_FORMAT_MKV => "mkv",
            STREAM_FORMAT_WEBM => "webm",
            STREAM_FORMAT_TORRENT => "torrent",
            _ => "unknown",
        }
    }
}

/// Stream source list
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiStreamSourceList {
    /// Array of stream sources
    pub items: Vec<FfiStreamSource>,
}

/// Subtitle track
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiSubtitle {
    /// Subtitle URL
    pub url: String,
    /// Language code (en, de, ja, etc.)
    pub lang: String,
    /// Display label
    pub label: String,
    /// Whether this is the default subtitle
    pub is_default: bool,
}

/// Populated episode with streams
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiPopulatedEpisode {
    /// Episode information
    pub episode: FfiEpisode,
    /// Available stream sources
    pub sources: Vec<FfiStreamSource>,
    /// Available subtitles
    pub subtitles: Vec<FfiSubtitle>,
    /// Intro timestamps (start, end) in seconds
    pub intro: Option<(u32, u32)>,
    /// Outro timestamps (start, end) in seconds
    pub outro: Option<(u32, u32)>,
}

// ============================================================================
// HTTP Request/Response Types for Scraping
// ============================================================================

/// HTTP method constants
pub const HTTP_METHOD_GET: u8 = 0;
pub const HTTP_METHOD_POST: u8 = 1;
pub const HTTP_METHOD_PUT: u8 = 2;
pub const HTTP_METHOD_DELETE: u8 = 3;
pub const HTTP_METHOD_HEAD: u8 = 4;

/// HTTP request for plugin scraping
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiHttpRequest {
    /// Request URL
    pub url: String,
    /// HTTP method
    pub method: u8,
    /// Request body (for POST/PUT)
    pub body: Option<String>,
    /// Headers
    pub headers: HashMap<String, String>,
    /// Timeout in seconds
    pub timeout_secs: u32,
    /// Follow redirects
    pub follow_redirects: bool,
}

impl FfiHttpRequest {
    /// Create a GET request
    pub fn get(url: &str) -> Self {
        FfiHttpRequest {
            url: url.to_string(),
            method: HTTP_METHOD_GET,
            body: None,
            headers: HashMap::new(),
            timeout_secs: 30,
            follow_redirects: true,
        }
    }

    /// Create a POST request
    pub fn post(url: &str, body: &str) -> Self {
        FfiHttpRequest {
            url: url.to_string(),
            method: HTTP_METHOD_POST,
            body: Some(body.to_string()),
            headers: HashMap::new(),
            timeout_secs: 30,
            follow_redirects: true,
        }
    }

    /// Add a header
    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }

    /// Set timeout
    pub fn with_timeout(mut self, secs: u32) -> Self {
        self.timeout_secs = secs;
        self
    }
}

/// HTTP response
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiHttpResponse {
    /// Response status code
    pub status_code: u16,
    /// Response body
    pub body: String,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Final URL (after redirects)
    pub final_url: Option<String>,
}

impl FfiHttpResponse {
    /// Check if the request was successful (2xx status)
    pub fn is_success(&self) -> bool {
        self.status_code >= 200 && self.status_code < 300
    }

    /// Get a header value
    pub fn get_header(&self, key: &str) -> Option<&String> {
        self.headers.get(&key.to_lowercase())
    }
}

// ============================================================================
// Plugin Context Types
// ============================================================================

/// Plugin context capabilities flags
pub const CAPABILITY_HTTP: u32 = 1 << 0;
pub const CAPABILITY_STORAGE: u32 = 1 << 1;
pub const CAPABILITY_LOGGING: u32 = 1 << 2;
pub const CAPABILITY_CRYPTO: u32 = 1 << 3;

/// Plugin configuration
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfiPluginConfig {
    /// Plugin data directory
    pub data_dir: Option<String>,
    /// Plugin cache directory
    pub cache_dir: Option<String>,
    /// Available capabilities
    pub capabilities: u32,
    /// User agent to use for HTTP requests
    pub user_agent: String,
    /// Ayoto version
    pub ayoto_version: String,
}

impl FfiPluginConfig {
    /// Create default config
    pub fn new() -> Self {
        FfiPluginConfig {
            data_dir: None,
            cache_dir: None,
            capabilities: CAPABILITY_HTTP | CAPABILITY_LOGGING,
            user_agent: format!("Ayoto/{}", env!("CARGO_PKG_VERSION")),
            ayoto_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

// ============================================================================
// Hoster Information
// ============================================================================

/// Information about a video hoster
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HosterInfo {
    /// Hoster name (e.g., "Voe", "Vidoza")
    pub name: String,
    /// Base domain
    pub domain: String,
    /// Whether the hoster requires decryption
    pub requires_decryption: bool,
    /// Whether the hoster is supported
    pub is_supported: bool,
    /// Quality options available
    pub qualities: Vec<String>,
}

// ============================================================================
// Conversion Helpers
// ============================================================================

impl From<FfiAnime> for super::super::types::PopulatedAnime {
    fn from(ffi: FfiAnime) -> Self {
        super::super::types::PopulatedAnime {
            id: ffi.id,
            title: ffi.title,
            alt_titles: ffi.alt_titles,
            cover: ffi.cover_url,
            banner: ffi.banner_url,
            description: ffi.description,
            anilist_id: ffi.anilist_id,
            mal_id: ffi.mal_id,
            status: ffi.status,
            episode_count: ffi.episode_count,
            genres: ffi.genres,
            year: ffi.year,
            rating: ffi.rating,
            media_type: ffi.media_type,
            is_airing: ffi.is_airing,
            next_airing: None,
        }
    }
}

impl From<FfiEpisode> for super::super::types::Episode {
    fn from(ffi: FfiEpisode) -> Self {
        super::super::types::Episode {
            id: ffi.id,
            number: ffi.number,
            title: ffi.title,
            thumbnail: ffi.thumbnail_url,
            description: ffi.description,
            duration: ffi.duration,
            air_date: ffi.air_date,
            is_filler: ffi.is_filler,
        }
    }
}

impl From<FfiStreamSource> for super::super::types::StreamSource {
    fn from(ffi: FfiStreamSource) -> Self {
        let format = match ffi.format {
            STREAM_FORMAT_M3U8 => super::super::types::StreamFormat::M3u8,
            STREAM_FORMAT_MP4 => super::super::types::StreamFormat::Mp4,
            STREAM_FORMAT_MKV => super::super::types::StreamFormat::Mkv,
            STREAM_FORMAT_WEBM => super::super::types::StreamFormat::Webm,
            STREAM_FORMAT_TORRENT => super::super::types::StreamFormat::Torrent,
            _ => super::super::types::StreamFormat::M3u8,
        };

        super::super::types::StreamSource {
            url: ffi.url,
            format,
            quality: ffi.quality,
            anime4k_support: ffi.anime4k_support,
            is_default: Some(ffi.is_default),
            server: ffi.server,
            headers: ffi.headers,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffi_result_ok() {
        let result: FfiResult<i32> = FfiResult::ok(42);
        assert!(result.success);
        assert_eq!(result.value, 42);
        assert!(result.error.is_empty());
    }

    #[test]
    fn test_ffi_result_err() {
        let result: FfiResult<i32> = FfiResult::err("Something went wrong".to_string());
        assert!(!result.success);
        assert_eq!(result.error, "Something went wrong");
    }

    #[test]
    fn test_ffi_anime_default() {
        let anime = FfiAnime::default();
        assert!(anime.id.is_empty());
        assert!(anime.title.is_empty());
    }

    #[test]
    fn test_http_request_builder() {
        let req = FfiHttpRequest::get("https://example.com")
            .with_header("Accept", "application/json")
            .with_timeout(60);
        
        assert_eq!(req.url, "https://example.com");
        assert_eq!(req.method, HTTP_METHOD_GET);
        assert_eq!(req.timeout_secs, 60);
        assert_eq!(req.headers.get("Accept"), Some(&"application/json".to_string()));
    }

    #[test]
    fn test_http_response_is_success() {
        let mut response = FfiHttpResponse::default();
        
        response.status_code = 200;
        assert!(response.is_success());
        
        response.status_code = 404;
        assert!(!response.is_success());
        
        response.status_code = 500;
        assert!(!response.is_success());
    }

    #[test]
    fn test_stream_format_string() {
        let source = FfiStreamSource {
            format: STREAM_FORMAT_M3U8,
            ..Default::default()
        };
        assert_eq!(source.format_string(), "m3u8");

        let source = FfiStreamSource {
            format: STREAM_FORMAT_MP4,
            ..Default::default()
        };
        assert_eq!(source.format_string(), "mp4");
    }
}
