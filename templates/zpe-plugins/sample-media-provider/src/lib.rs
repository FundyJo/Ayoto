//! Sample ZPE Media Provider Plugin
//!
//! This is a template plugin that demonstrates how to create a ZPE media provider
//! for Ayoto. Plugins are compiled to WebAssembly and can run on any platform.
//!
//! # Building
//!
//! ```bash
//! # Install the WASM target
//! rustup target add wasm32-unknown-unknown
//!
//! # Build in release mode
//! cargo build --release --target wasm32-unknown-unknown
//!
//! # The output will be at: target/wasm32-unknown-unknown/release/sample_media_provider.wasm
//! ```
//!
//! # Packaging
//!
//! Create a ZIP file with the `.zpe` extension containing:
//! - manifest.json
//! - plugin.wasm (renamed from the built .wasm file)

use serde::{Deserialize, Serialize};
use std::alloc::{alloc, dealloc, Layout};
use std::slice;

// ============================================================================
// Data Types
// ============================================================================

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Anime {
    id: String,
    title: String,
    alt_titles: Vec<String>,
    cover_url: Option<String>,
    banner_url: Option<String>,
    description: Option<String>,
    anilist_id: Option<u32>,
    mal_id: Option<u32>,
    episode_count: Option<u32>,
    year: Option<u32>,
    rating: Option<f32>,
    status: Option<String>,
    media_type: Option<String>,
    genres: Vec<String>,
    is_airing: Option<bool>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct AnimeList {
    items: Vec<Anime>,
    has_next_page: bool,
    current_page: u32,
    total_results: Option<u32>,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Episode {
    id: String,
    number: u32,
    title: Option<String>,
    thumbnail_url: Option<String>,
    description: Option<String>,
    duration: Option<u32>,
    air_date: Option<String>,
    is_filler: Option<bool>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct EpisodeList {
    items: Vec<Episode>,
    has_next_page: bool,
    current_page: u32,
    total_episodes: u32,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct StreamSource {
    url: String,
    quality: String,
    server: Option<String>,
    format: String,
    anime4k_support: bool,
    is_default: bool,
    headers: std::collections::HashMap<String, String>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct StreamSourceList {
    items: Vec<StreamSource>,
}

#[derive(Serialize)]
struct ZpeResult<T> {
    success: bool,
    value: Option<T>,
    error: Option<String>,
}

impl<T> ZpeResult<T> {
    fn ok(value: T) -> Self {
        ZpeResult {
            success: true,
            value: Some(value),
            error: None,
        }
    }

    fn err(message: &str) -> Self {
        ZpeResult {
            success: false,
            value: None,
            error: Some(message.to_string()),
        }
    }
}

// ============================================================================
// Memory Management (Required by Ayoto)
// ============================================================================

/// Allocate memory for the host to write data
#[no_mangle]
pub extern "C" fn allocate(size: i32) -> i32 {
    let layout = Layout::from_size_align(size as usize, 1).unwrap();
    unsafe { alloc(layout) as i32 }
}

/// Free allocated memory
#[no_mangle]
pub extern "C" fn deallocate(ptr: i32, size: i32) {
    let layout = Layout::from_size_align(size as usize, 1).unwrap();
    unsafe { dealloc(ptr as *mut u8, layout) }
}

// ============================================================================
// Helper Functions
// ============================================================================

fn read_input(ptr: i32, len: i32) -> String {
    unsafe {
        let slice = slice::from_raw_parts(ptr as *const u8, len as usize);
        String::from_utf8_lossy(slice).to_string()
    }
}

fn write_output(s: &str) -> i64 {
    let bytes = s.as_bytes();
    let ptr = allocate(bytes.len() as i32);
    unsafe {
        let dest = slice::from_raw_parts_mut(ptr as *mut u8, bytes.len());
        dest.copy_from_slice(bytes);
    }
    // Pack ptr and len into i64 (ptr in high 32 bits, len in low 32 bits)
    ((ptr as i64) << 32) | (bytes.len() as i64)
}

fn success_response<T: Serialize>(value: T) -> i64 {
    let result = ZpeResult::ok(value);
    write_output(&serde_json::to_string(&result).unwrap())
}

fn error_response(message: &str) -> i64 {
    let result: ZpeResult<()> = ZpeResult::err(message);
    write_output(&serde_json::to_string(&result).unwrap())
}

// ============================================================================
// Lifecycle Functions
// ============================================================================

/// Called when the plugin is loaded
#[no_mangle]
pub extern "C" fn initialize() {
    // Initialize any plugin state here
    // This is called once when the plugin is first loaded
}

/// Called when the plugin is unloaded
#[no_mangle]
pub extern "C" fn shutdown() {
    // Cleanup any resources here
    // This is called when the plugin is unloaded
}

// ============================================================================
// Plugin API Implementation
// ============================================================================

/// Search for anime
/// Input JSON: { "query": "string", "page": number }
#[no_mangle]
pub extern "C" fn zpe_search(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    
    let params: serde_json::Value = match serde_json::from_str(&input) {
        Ok(v) => v,
        Err(e) => return error_response(&format!("Invalid input: {}", e)),
    };
    
    let query = params["query"].as_str().unwrap_or("");
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    // SAMPLE: Return demo results
    // In a real plugin, you would:
    // 1. Make HTTP requests to your source website
    // 2. Parse the HTML/JSON response
    // 3. Convert to the Anime struct
    
    let results = AnimeList {
        items: vec![
            Anime {
                id: "sample-1".to_string(),
                title: format!("Search Result for '{}' - Item 1", query),
                alt_titles: vec!["Alternative Title".to_string()],
                cover_url: Some("https://example.com/cover1.jpg".to_string()),
                description: Some("This is a sample anime description.".to_string()),
                year: Some(2024),
                rating: Some(85.0),
                status: Some("AIRING".to_string()),
                media_type: Some("TV".to_string()),
                genres: vec!["Action".to_string(), "Adventure".to_string()],
                is_airing: Some(true),
                ..Default::default()
            },
            Anime {
                id: "sample-2".to_string(),
                title: format!("Search Result for '{}' - Item 2", query),
                year: Some(2023),
                status: Some("FINISHED".to_string()),
                media_type: Some("TV".to_string()),
                genres: vec!["Comedy".to_string(), "Slice of Life".to_string()],
                ..Default::default()
            },
        ],
        has_next_page: page < 3,
        current_page: page,
        total_results: Some(6),
    };
    
    success_response(results)
}

/// Get popular anime
/// Input JSON: { "page": number }
#[no_mangle]
pub extern "C" fn zpe_get_popular(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    let results = AnimeList {
        items: vec![
            Anime {
                id: "popular-1".to_string(),
                title: "Most Popular Anime".to_string(),
                rating: Some(95.0),
                status: Some("AIRING".to_string()),
                ..Default::default()
            },
        ],
        has_next_page: false,
        current_page: page,
        total_results: Some(1),
    };
    
    success_response(results)
}

/// Get latest anime
/// Input JSON: { "page": number }
#[no_mangle]
pub extern "C" fn zpe_get_latest(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    let results = AnimeList {
        items: vec![
            Anime {
                id: "latest-1".to_string(),
                title: "Latest Release".to_string(),
                year: Some(2024),
                status: Some("AIRING".to_string()),
                ..Default::default()
            },
        ],
        has_next_page: false,
        current_page: page,
        total_results: Some(1),
    };
    
    success_response(results)
}

/// Get episodes for an anime
/// Input JSON: { "animeId": "string", "page": number }
#[no_mangle]
pub extern "C" fn zpe_get_episodes(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let _anime_id = params["animeId"].as_str().unwrap_or("");
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    let results = EpisodeList {
        items: vec![
            Episode {
                id: "ep-1".to_string(),
                number: 1,
                title: Some("Episode 1: The Beginning".to_string()),
                duration: Some(1440), // 24 minutes in seconds
                is_filler: Some(false),
                ..Default::default()
            },
            Episode {
                id: "ep-2".to_string(),
                number: 2,
                title: Some("Episode 2: The Journey".to_string()),
                duration: Some(1440),
                is_filler: Some(false),
                ..Default::default()
            },
            Episode {
                id: "ep-3".to_string(),
                number: 3,
                title: Some("Episode 3: The Challenge".to_string()),
                duration: Some(1440),
                is_filler: Some(true),
                ..Default::default()
            },
        ],
        has_next_page: false,
        current_page: page,
        total_episodes: 3,
    };
    
    success_response(results)
}

/// Get streams for an episode
/// Input JSON: { "animeId": "string", "episodeId": "string" }
#[no_mangle]
pub extern "C" fn zpe_get_streams(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let anime_id = params["animeId"].as_str().unwrap_or("");
    let episode_id = params["episodeId"].as_str().unwrap_or("");
    
    let mut headers = std::collections::HashMap::new();
    headers.insert("Referer".to_string(), "https://example.com".to_string());
    
    let results = StreamSourceList {
        items: vec![
            StreamSource {
                url: format!("https://example.com/stream/{}/{}/1080p.m3u8", anime_id, episode_id),
                quality: "1080p".to_string(),
                server: Some("Main Server".to_string()),
                format: "m3u8".to_string(),
                anime4k_support: true,
                is_default: true,
                headers: headers.clone(),
            },
            StreamSource {
                url: format!("https://example.com/stream/{}/{}/720p.m3u8", anime_id, episode_id),
                quality: "720p".to_string(),
                server: Some("Main Server".to_string()),
                format: "m3u8".to_string(),
                anime4k_support: true,
                is_default: false,
                headers: headers.clone(),
            },
            StreamSource {
                url: format!("https://example.com/stream/{}/{}/480p.mp4", anime_id, episode_id),
                quality: "480p".to_string(),
                server: Some("Backup Server".to_string()),
                format: "mp4".to_string(),
                anime4k_support: false,
                is_default: false,
                headers,
            },
        ],
    };
    
    success_response(results)
}

/// Get anime details
/// Input JSON: { "animeId": "string" }
#[no_mangle]
pub extern "C" fn zpe_get_anime_details(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let anime_id = params["animeId"].as_str().unwrap_or("");
    
    let anime = Anime {
        id: anime_id.to_string(),
        title: format!("Anime Details for {}", anime_id),
        alt_titles: vec!["Japanese Title".to_string(), "Romaji Title".to_string()],
        cover_url: Some("https://example.com/cover.jpg".to_string()),
        banner_url: Some("https://example.com/banner.jpg".to_string()),
        description: Some("This is the full description of the anime. It contains plot details, character information, and other relevant information about the series.".to_string()),
        anilist_id: Some(12345),
        mal_id: Some(54321),
        episode_count: Some(24),
        year: Some(2024),
        rating: Some(87.5),
        status: Some("AIRING".to_string()),
        media_type: Some("TV".to_string()),
        genres: vec![
            "Action".to_string(),
            "Adventure".to_string(),
            "Fantasy".to_string(),
        ],
        is_airing: Some(true),
    };
    
    success_response(anime)
}

/// Extract stream from URL (for stream providers - not implemented in this media provider)
/// Input JSON: { "url": "string" }
#[no_mangle]
pub extern "C" fn zpe_extract_stream(input_ptr: i32, input_len: i32) -> i64 {
    error_response("This is a media provider plugin, not a stream provider")
}
