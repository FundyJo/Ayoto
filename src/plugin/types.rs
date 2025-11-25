//! Ayoto Plugin Type Definitions
//! 
//! This module defines all the types used in the Ayoto plugin system.
//! Plugins return strongly-typed objects for anime search, episodes, streaming, etc.

use serde::{Deserialize, Serialize};

/// Represents an anime from search results or listings
/// Contains basic information about an anime
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopulatedAnime {
    /// Unique identifier for the anime within the provider
    pub id: String,
    /// Title of the anime
    pub title: String,
    /// Alternative titles (Japanese, English, Romaji, etc.)
    #[serde(default)]
    pub alt_titles: Vec<String>,
    /// Cover image URL
    pub cover: Option<String>,
    /// Banner image URL
    pub banner: Option<String>,
    /// Description/synopsis
    pub description: Option<String>,
    /// AniList ID for cross-referencing
    pub anilist_id: Option<u32>,
    /// MyAnimeList ID for cross-referencing
    pub mal_id: Option<u32>,
    /// Airing status (AIRING, FINISHED, NOT_YET_RELEASED, etc.)
    pub status: Option<String>,
    /// Total number of episodes (if known)
    pub episode_count: Option<u32>,
    /// Genres
    #[serde(default)]
    pub genres: Vec<String>,
    /// Release year
    pub year: Option<u32>,
    /// Average rating (0-100 scale)
    pub rating: Option<f32>,
    /// Media type (TV, MOVIE, OVA, ONA, SPECIAL)
    pub media_type: Option<String>,
    /// Whether the anime is currently airing
    pub is_airing: Option<bool>,
    /// Next airing episode info (if airing)
    pub next_airing: Option<NextAiringEpisode>,
}

/// Information about the next airing episode
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextAiringEpisode {
    /// Episode number
    pub episode: u32,
    /// Unix timestamp of when the episode airs
    pub airing_at: i64,
    /// Time until episode airs in seconds
    pub time_until_airing: i64,
}

/// Represents an episode in an anime
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Episode {
    /// Unique episode identifier
    pub id: String,
    /// Episode number
    pub number: u32,
    /// Episode title (optional)
    pub title: Option<String>,
    /// Episode thumbnail URL
    pub thumbnail: Option<String>,
    /// Episode description
    pub description: Option<String>,
    /// Episode duration in seconds
    pub duration: Option<u32>,
    /// Air date (ISO 8601 format)
    pub air_date: Option<String>,
    /// Whether this is a filler episode
    pub is_filler: Option<bool>,
}

/// Represents stream source for video playback
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamSource {
    /// Stream URL
    pub url: String,
    /// Stream format (m3u8, mp4, mkv, webm, torrent)
    pub format: StreamFormat,
    /// Quality label (1080p, 720p, 480p, etc.)
    pub quality: String,
    /// Whether this source supports Anime4K shaders
    pub anime4k_support: bool,
    /// Whether this is the default/recommended source
    pub is_default: Option<bool>,
    /// Server name (optional)
    pub server: Option<String>,
    /// Headers required for the stream (for protected sources)
    #[serde(default)]
    pub headers: std::collections::HashMap<String, String>,
}

/// Available stream formats
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StreamFormat {
    /// HLS streaming format
    M3u8,
    /// Direct MP4 files
    Mp4,
    /// Matroska format
    Mkv,
    /// WebM format
    Webm,
    /// Torrent magnet links
    Torrent,
}

impl std::fmt::Display for StreamFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StreamFormat::M3u8 => write!(f, "m3u8"),
            StreamFormat::Mp4 => write!(f, "mp4"),
            StreamFormat::Mkv => write!(f, "mkv"),
            StreamFormat::Webm => write!(f, "webm"),
            StreamFormat::Torrent => write!(f, "torrent"),
        }
    }
}

/// Subtitle track information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subtitle {
    /// Subtitle file URL
    pub url: String,
    /// Language code (en, de, ja, etc.)
    pub lang: String,
    /// Display label
    pub label: String,
    /// Whether this is the default subtitle
    pub is_default: Option<bool>,
}

/// Populated episode with stream sources ready for playback
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopulatedEpisode {
    /// Episode information
    pub episode: Episode,
    /// Available stream sources
    pub sources: Vec<StreamSource>,
    /// Available subtitle tracks
    #[serde(default)]
    pub subtitles: Vec<Subtitle>,
    /// Intro timestamps (start, end) in seconds for skip intro feature
    pub intro: Option<(u32, u32)>,
    /// Outro timestamps (start, end) in seconds for skip outro feature  
    pub outro: Option<(u32, u32)>,
}

/// Search result containing multiple anime matches
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    /// List of matching anime
    pub results: Vec<PopulatedAnime>,
    /// Whether there are more results
    pub has_next_page: bool,
    /// Current page number
    pub current_page: u32,
    /// Total results count (if available)
    pub total_results: Option<u32>,
}

/// Episodes list result with pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpisodesResult {
    /// List of episodes
    pub episodes: Vec<Episode>,
    /// Whether there are more episodes
    pub has_next_page: bool,
    /// Current page number
    pub current_page: u32,
    /// Total episodes count
    pub total_episodes: Option<u32>,
}

/// Plugin error types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginError {
    /// Error code
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Additional error details
    pub details: Option<String>,
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for PluginError {}

/// Result type for plugin operations
pub type PluginResult<T> = Result<T, PluginError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_format_display() {
        assert_eq!(StreamFormat::M3u8.to_string(), "m3u8");
        assert_eq!(StreamFormat::Mp4.to_string(), "mp4");
        assert_eq!(StreamFormat::Mkv.to_string(), "mkv");
    }

    #[test]
    fn test_populated_anime_serialization() {
        let anime = PopulatedAnime {
            id: "test-123".to_string(),
            title: "Test Anime".to_string(),
            alt_titles: vec!["テストアニメ".to_string()],
            cover: Some("https://example.com/cover.jpg".to_string()),
            banner: None,
            description: Some("A test anime".to_string()),
            anilist_id: Some(12345),
            mal_id: Some(54321),
            status: Some("AIRING".to_string()),
            episode_count: Some(12),
            genres: vec!["Action".to_string(), "Comedy".to_string()],
            year: Some(2024),
            rating: Some(85.5),
            media_type: Some("TV".to_string()),
            is_airing: Some(true),
            next_airing: None,
        };

        let json = serde_json::to_string(&anime).unwrap();
        assert!(json.contains("test-123"));
        assert!(json.contains("Test Anime"));
    }
}
