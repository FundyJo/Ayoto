# Ayoto Native Plugin Development Guide

This guide explains how to create native Rust plugins for Ayoto that work across all platforms (Linux, Windows, macOS, Android, iOS).

## Plugin Architecture

Ayoto uses a dynamic library plugin system where plugins are compiled as native shared libraries:
- **Linux/Android**: `.so` files
- **Windows**: `.dll` files
- **macOS/iOS**: `.dylib` files

Plugins implement the `AyotoPlugin` trait and export standard entry points for the host application to call.

## Plugin Types

### 1. Media Provider Plugins

Media providers fetch anime/media listings from websites like aniworld.to, s.to, etc.

**Capabilities:**
- `search(query, page)` - Search for anime
- `get_popular(page)` - Get popular anime
- `get_latest(page)` - Get latest releases
- `get_episodes(anime_id, page)` - Get episode list
- `get_streams(anime_id, episode_id)` - Get stream sources
- `get_anime_details(anime_id)` - Get detailed info

### 2. Stream Provider Plugins

Stream providers extract video URLs from hosting services like Voe, Vidoza, etc.

**Capabilities:**
- `extract_stream(url)` - Extract video URL from hoster
- `get_hoster_info(url)` - Get hoster information
- `decrypt_stream(data)` - Decrypt encrypted streams
- `get_download_link(url)` - Get direct download URL

## Creating a Plugin

### 1. Create a new Rust library project

```bash
cargo new --lib my-anime-provider
cd my-anime-provider
```

### 2. Add the `Cargo.toml` dependencies

```toml
[package]
name = "my-anime-provider"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
# Add ayoto-plugin-sdk when it's published
# For now, you need to copy the types from the main Ayoto repository
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### 3. Implement the plugin

```rust
use std::collections::HashMap;

// ============================================================================
// FFI Types (copy from Ayoto source or use ayoto-plugin-sdk)
// ============================================================================

// ... (copy types from src/plugin/native/ffi_types.rs)

// ============================================================================
// Plugin Implementation
// ============================================================================

pub struct MyAnimeProvider {
    metadata: PluginMetadata,
    capabilities: PluginCapabilities,
    http_context: HttpContext,
    initialized: bool,
}

impl MyAnimeProvider {
    pub fn new() -> Self {
        MyAnimeProvider {
            metadata: PluginMetadata {
                id: "my-anime-provider".to_string(),
                name: "My Anime Provider".to_string(),
                version: "1.0.0".to_string(),
                author: Some("Your Name".to_string()),
                description: Some("A custom anime provider plugin".to_string()),
                target_ayoto_version: "2.5.4".to_string(),
                plugin_type: 0, // MediaProvider
                platforms: 0xFFFFFFFF, // Universal
            },
            capabilities: PluginCapabilities {
                flags: CAP_SEARCH | CAP_GET_EPISODES | CAP_GET_STREAMS,
            },
            http_context: HttpContext::default(),
            initialized: false,
        }
    }
}

impl AyotoPlugin for MyAnimeProvider {
    fn get_metadata(&self) -> PluginMetadata {
        self.metadata.clone()
    }

    fn get_capabilities(&self) -> PluginCapabilities {
        self.capabilities
    }

    fn initialize(&mut self, config: &FfiPluginConfig) -> FfiResult<()> {
        self.initialized = true;
        FfiResult::ok(())
    }

    fn shutdown(&mut self) {
        self.initialized = false;
    }

    fn search(&self, query: &str, page: u32) -> FfiResult<FfiAnimeList> {
        // Use self.http_context to make HTTP requests
        let response = self.http_context.get(&format!(
            "https://example.com/api/search?q={}&page={}",
            query, page
        ));

        if !response.is_success() {
            return FfiResult::err(format!("HTTP error: {}", response.status_code));
        }

        // Parse response and return results
        // ...

        FfiResult::ok(FfiAnimeList {
            items: vec![],
            has_next_page: false,
            current_page: page,
            total_results: Some(0),
        })
    }

    fn get_popular(&self, page: u32) -> FfiResult<FfiAnimeList> {
        FfiResult::err("Not implemented".to_string())
    }

    fn get_latest(&self, page: u32) -> FfiResult<FfiAnimeList> {
        FfiResult::err("Not implemented".to_string())
    }

    fn get_episodes(&self, anime_id: &str, page: u32) -> FfiResult<FfiEpisodeList> {
        // Implement episode fetching logic
        FfiResult::err("Not implemented".to_string())
    }

    fn get_streams(&self, anime_id: &str, episode_id: &str) -> FfiResult<FfiStreamSourceList> {
        // Implement stream extraction logic
        FfiResult::err("Not implemented".to_string())
    }

    fn get_anime_details(&self, anime_id: &str) -> FfiResult<FfiAnime> {
        FfiResult::err("Not implemented".to_string())
    }

    // Stream provider methods (not needed for media provider)
    fn extract_stream(&self, url: &str) -> FfiResult<FfiStreamSource> {
        FfiResult::err("Not a stream provider".to_string())
    }

    fn get_hoster_info(&self, url: &str) -> FfiResult<HosterInfo> {
        FfiResult::err("Not a stream provider".to_string())
    }

    fn decrypt_stream(&self, encrypted_data: &str) -> FfiResult<FfiStreamSource> {
        FfiResult::err("Not a stream provider".to_string())
    }

    fn get_download_link(&self, url: &str) -> FfiResult<String> {
        FfiResult::err("Not a stream provider".to_string())
    }

    fn set_http_context(&mut self, context: HttpContext) {
        self.http_context = context;
    }
}

// ============================================================================
// Plugin Entry Points (REQUIRED)
// ============================================================================

#[no_mangle]
pub extern "C" fn create_plugin() -> *mut dyn AyotoPlugin {
    let plugin = Box::new(MyAnimeProvider::new());
    Box::into_raw(plugin) as *mut dyn AyotoPlugin
}

#[no_mangle]
pub extern "C" fn destroy_plugin(plugin: *mut dyn AyotoPlugin) {
    if !plugin.is_null() {
        unsafe {
            let _ = Box::from_raw(plugin);
        }
    }
}

#[no_mangle]
pub extern "C" fn get_plugin_abi_version() -> u32 {
    1 // Must match PLUGIN_ABI_VERSION in Ayoto
}
```

### 4. Build the plugin

```bash
# Build for the current platform
cargo build --release

# The plugin will be at:
# - Linux: target/release/libmy_anime_provider.so
# - Windows: target/release/my_anime_provider.dll
# - macOS: target/release/libmy_anime_provider.dylib
```

### 5. Cross-compile for other platforms

```bash
# Linux from macOS/Windows
cargo build --release --target x86_64-unknown-linux-gnu

# Windows from Linux/macOS
cargo build --release --target x86_64-pc-windows-gnu

# macOS from Linux/Windows (requires macOS SDK)
cargo build --release --target x86_64-apple-darwin

# Android ARM64
cargo build --release --target aarch64-linux-android
```

## Plugin Installation

1. Place the compiled plugin file in the Ayoto plugins directory:
   - Linux: `~/.config/ayoto/plugins/`
   - Windows: `%APPDATA%\ayoto\plugins\`
   - macOS: `~/Library/Application Support/ayoto/plugins/`

2. Ayoto will automatically discover and load plugins on startup.

3. Or use the frontend to load plugins manually.

## Best Practices

1. **Version Compatibility**: Always specify the correct `target_ayoto_version`
2. **Error Handling**: Return proper error messages in `FfiResult`
3. **HTTP Requests**: Use the provided `HttpContext` for all network requests
4. **Thread Safety**: Ensure your plugin is thread-safe (implements `Send + Sync`)
5. **Cleanup**: Properly release resources in `shutdown()`

## API Reference

See the [FFI Types Documentation](../src/plugin/native/ffi_types.rs) for detailed type information.

## Example Plugins

Check the `templates/plugins/` directory for complete example implementations:
- `sample-media-provider/` - Basic anime provider
- `sample-stream-provider/` - Video hoster extractor
