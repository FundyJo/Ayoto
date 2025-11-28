//! ZPE Type Definitions
//!
//! Types used for communication between the host and ZPE plugins.
//! These types are designed to be serializable and work across the WASM boundary.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// ZPE Plugin manifest embedded in the .zpe archive
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeManifest {
    /// Unique plugin identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// Plugin version (semver)
    pub version: String,
    /// Target Ayoto version
    pub target_ayoto_version: String,
    /// Plugin author
    pub author: Option<String>,
    /// Plugin description
    pub description: Option<String>,
    /// Plugin homepage/repository URL
    pub homepage: Option<String>,
    /// Plugin type
    pub plugin_type: ZpePluginType,
    /// Plugin capabilities
    pub capabilities: ZpeCapabilities,
    /// ZPE ABI version this plugin was built for
    pub abi_version: u32,
}

impl Default for ZpeManifest {
    fn default() -> Self {
        ZpeManifest {
            id: String::new(),
            name: String::new(),
            version: "1.0.0".to_string(),
            target_ayoto_version: env!("CARGO_PKG_VERSION").to_string(),
            author: None,
            description: None,
            homepage: None,
            plugin_type: ZpePluginType::MediaProvider,
            capabilities: ZpeCapabilities::default(),
            abi_version: super::ZPE_ABI_VERSION,
        }
    }
}

impl ZpeManifest {
    /// Validate the manifest
    pub fn validate(&self) -> ZpeValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        if self.id.is_empty() {
            errors.push("Plugin ID is required".to_string());
        }

        if self.name.is_empty() {
            errors.push("Plugin name is required".to_string());
        }

        if self.version.is_empty() {
            errors.push("Plugin version is required".to_string());
        }

        if self.abi_version != super::ZPE_ABI_VERSION {
            warnings.push(format!(
                "Plugin ABI version {} differs from current version {}",
                self.abi_version, super::ZPE_ABI_VERSION
            ));
        }

        ZpeValidationResult {
            valid: errors.is_empty(),
            errors,
            warnings,
        }
    }

    /// Parse manifest from JSON
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("Invalid manifest JSON: {}", e))
    }

    /// Serialize manifest to JSON
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize manifest: {}", e))
    }
}

/// Plugin type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum ZpePluginType {
    /// Media provider (anime listings, episodes)
    #[default]
    MediaProvider,
    /// Stream provider (video URL extraction)
    StreamProvider,
}

/// Plugin capabilities
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeCapabilities {
    /// Can search for anime
    pub search: bool,
    /// Can get popular anime
    pub get_popular: bool,
    /// Can get latest anime
    pub get_latest: bool,
    /// Can get episode lists
    pub get_episodes: bool,
    /// Can get stream sources
    pub get_streams: bool,
    /// Can get detailed anime info
    pub get_anime_details: bool,
    /// Can extract streams from URLs
    pub extract_stream: bool,
    /// Can get hoster information
    pub get_hoster_info: bool,
}

/// Result of manifest validation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeValidationResult {
    /// Whether validation passed
    pub valid: bool,
    /// Error messages
    pub errors: Vec<String>,
    /// Warning messages
    pub warnings: Vec<String>,
}

/// Result of loading a ZPE plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeLoadResult {
    /// Whether loading was successful
    pub success: bool,
    /// Plugin ID (if successful)
    pub plugin_id: Option<String>,
    /// Error messages
    pub errors: Vec<String>,
    /// Warning messages
    pub warnings: Vec<String>,
}

/// Information about a loaded ZPE plugin (serializable)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpePluginInfo {
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
    /// Plugin type
    pub plugin_type: ZpePluginType,
    /// Plugin capabilities
    pub capabilities: ZpeCapabilities,
    /// Path to the .zpe file
    pub file_path: String,
    /// Whether the plugin is enabled
    pub enabled: bool,
    /// Whether compatible with current Ayoto version
    pub is_compatible: bool,
    /// Load timestamp
    pub loaded_at: i64,
}

/// Anime data type for ZPE plugins
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeAnime {
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
    /// Description
    pub description: Option<String>,
    /// AniList ID
    pub anilist_id: Option<u32>,
    /// MyAnimeList ID
    pub mal_id: Option<u32>,
    /// Episode count
    pub episode_count: Option<u32>,
    /// Release year
    pub year: Option<u32>,
    /// Rating (0-100)
    pub rating: Option<f32>,
    /// Status
    pub status: Option<String>,
    /// Media type
    pub media_type: Option<String>,
    /// Genres
    pub genres: Vec<String>,
    /// Currently airing
    pub is_airing: Option<bool>,
}

/// Anime list result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeAnimeList {
    /// List of anime
    pub items: Vec<ZpeAnime>,
    /// Has more pages
    pub has_next_page: bool,
    /// Current page
    pub current_page: u32,
    /// Total results
    pub total_results: Option<u32>,
}

/// Episode data type
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeEpisode {
    /// Episode ID
    pub id: String,
    /// Episode number
    pub number: u32,
    /// Episode title
    pub title: Option<String>,
    /// Thumbnail URL
    pub thumbnail_url: Option<String>,
    /// Description
    pub description: Option<String>,
    /// Duration in seconds
    pub duration: Option<u32>,
    /// Air date (ISO 8601)
    pub air_date: Option<String>,
    /// Is filler episode
    pub is_filler: Option<bool>,
}

/// Episode list result
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeEpisodeList {
    /// List of episodes
    pub items: Vec<ZpeEpisode>,
    /// Has more pages
    pub has_next_page: bool,
    /// Current page
    pub current_page: u32,
    /// Total episodes
    pub total_episodes: u32,
}

/// Stream source
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeStreamSource {
    /// Stream URL
    pub url: String,
    /// Quality label
    pub quality: String,
    /// Server name
    pub server: Option<String>,
    /// Format (m3u8, mp4, etc.)
    pub format: String,
    /// Supports Anime4K
    pub anime4k_support: bool,
    /// Is default source
    pub is_default: bool,
    /// Required headers
    pub headers: HashMap<String, String>,
}

/// Stream source list
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeStreamSourceList {
    /// List of sources
    pub items: Vec<ZpeStreamSource>,
}

/// HTTP request for plugin HTTP operations
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeHttpRequest {
    /// Request URL
    pub url: String,
    /// HTTP method
    pub method: String,
    /// Request body
    pub body: Option<String>,
    /// Headers
    pub headers: HashMap<String, String>,
    /// Timeout in seconds
    pub timeout_secs: u32,
}

/// HTTP response
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeHttpResponse {
    /// Status code
    pub status_code: u16,
    /// Response body
    pub body: String,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Success flag
    pub success: bool,
    /// Error message (if any)
    pub error: Option<String>,
}

/// Result type for plugin operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZpeResult<T> {
    /// Success flag
    pub success: bool,
    /// Result value
    pub value: Option<T>,
    /// Error message
    pub error: Option<String>,
}

impl<T> ZpeResult<T> {
    /// Create a success result
    pub fn ok(value: T) -> Self {
        ZpeResult {
            success: true,
            value: Some(value),
            error: None,
        }
    }

    /// Create an error result
    pub fn err(message: String) -> Self {
        ZpeResult {
            success: false,
            value: None,
            error: Some(message),
        }
    }
}

impl<T: Default> Default for ZpeResult<T> {
    fn default() -> Self {
        ZpeResult {
            success: false,
            value: None,
            error: Some("Not initialized".to_string()),
        }
    }
}

// Conversion implementations to standard types
impl From<ZpeAnime> for super::super::types::PopulatedAnime {
    fn from(zpe: ZpeAnime) -> Self {
        super::super::types::PopulatedAnime {
            id: zpe.id,
            title: zpe.title,
            alt_titles: zpe.alt_titles,
            cover: zpe.cover_url,
            banner: zpe.banner_url,
            description: zpe.description,
            anilist_id: zpe.anilist_id,
            mal_id: zpe.mal_id,
            status: zpe.status,
            episode_count: zpe.episode_count,
            genres: zpe.genres,
            year: zpe.year,
            rating: zpe.rating,
            media_type: zpe.media_type,
            is_airing: zpe.is_airing,
            next_airing: None,
        }
    }
}

impl From<ZpeEpisode> for super::super::types::Episode {
    fn from(zpe: ZpeEpisode) -> Self {
        super::super::types::Episode {
            id: zpe.id,
            number: zpe.number,
            title: zpe.title,
            thumbnail: zpe.thumbnail_url,
            description: zpe.description,
            duration: zpe.duration,
            air_date: zpe.air_date,
            is_filler: zpe.is_filler,
        }
    }
}

impl From<ZpeStreamSource> for super::super::types::StreamSource {
    fn from(zpe: ZpeStreamSource) -> Self {
        let format = match zpe.format.to_lowercase().as_str() {
            "m3u8" | "hls" => super::super::types::StreamFormat::M3u8,
            "mp4" => super::super::types::StreamFormat::Mp4,
            "mkv" => super::super::types::StreamFormat::Mkv,
            "webm" => super::super::types::StreamFormat::Webm,
            "torrent" | "magnet" => super::super::types::StreamFormat::Torrent,
            unknown => {
                log::warn!("Unknown stream format '{}', defaulting to M3u8", unknown);
                super::super::types::StreamFormat::M3u8
            }
        };

        super::super::types::StreamSource {
            url: zpe.url,
            format,
            quality: zpe.quality,
            anime4k_support: zpe.anime4k_support,
            is_default: Some(zpe.is_default),
            server: zpe.server,
            headers: zpe.headers,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_validation() {
        let mut manifest = ZpeManifest::default();
        let result = manifest.validate();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());

        manifest.id = "test-plugin".to_string();
        manifest.name = "Test Plugin".to_string();
        let result = manifest.validate();
        assert!(result.valid);
    }

    #[test]
    fn test_zpe_result() {
        let result: ZpeResult<i32> = ZpeResult::ok(42);
        assert!(result.success);
        assert_eq!(result.value, Some(42));

        let result: ZpeResult<i32> = ZpeResult::err("Error".to_string());
        assert!(!result.success);
        assert_eq!(result.error, Some("Error".to_string()));
    }
}
