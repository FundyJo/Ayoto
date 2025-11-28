# ZPE Plugin Development Guide

ZPE (Zenshine Plugin Extension) is a universal plugin format for Ayoto that uses WebAssembly (WASM) to enable cross-platform plugins that work on all operating systems without recompilation.

## Why ZPE?

### The Problem with Native Plugins

Traditional native plugins (.dll, .so, .dylib) require separate compilation for each target platform:
- To build a `.dll`, you need Windows
- To build a `.dylib`, you need macOS
- To build a `.so`, you need Linux

This creates a barrier for plugin developers who may only have access to one operating system.

### The ZPE Solution

ZPE plugins are compiled to WebAssembly (WASM), a portable binary format that runs everywhere:
- **Write once, run anywhere** - A single `.zpe` file works on Windows, macOS, Linux, Android, and iOS
- **No cross-compilation needed** - Build from any OS, deploy to all
- **Sandboxed execution** - Plugins run in a secure sandbox
- **Multiple language support** - Write plugins in Rust, C/C++, AssemblyScript, Go, Zig, and more

## ZPE File Format

A `.zpe` file is a ZIP archive containing:

```
my-plugin.zpe
├── manifest.json    # Required: Plugin metadata
├── plugin.wasm      # Required: WebAssembly module
└── README.md        # Optional: Documentation
```

### manifest.json

```json
{
  "id": "my-anime-provider",
  "name": "My Anime Provider",
  "version": "1.0.0",
  "targetAyotoVersion": "2.5.4",
  "author": "Your Name",
  "description": "A custom anime provider plugin",
  "homepage": "https://github.com/yourname/my-plugin",
  "pluginType": "mediaProvider",
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getLatest": true,
    "getEpisodes": true,
    "getStreams": true,
    "getAnimeDetails": true,
    "extractStream": false,
    "getHosterInfo": false
  },
  "abiVersion": 1
}
```

### Plugin Types

| Type | Description |
|------|-------------|
| `mediaProvider` | Provides anime listings, episodes, and stream URLs from a source website |
| `streamProvider` | Extracts video URLs from hosting services (Voe, Vidoza, etc.) |

### Capabilities

For **Media Providers**:
| Capability | Description |
|------------|-------------|
| `search` | Search for anime by query |
| `getPopular` | Get popular anime list |
| `getLatest` | Get latest anime/releases |
| `getEpisodes` | Get episode list for an anime |
| `getStreams` | Get stream sources for an episode |
| `getAnimeDetails` | Get detailed anime information |

For **Stream Providers**:
| Capability | Description |
|------------|-------------|
| `extractStream` | Extract video URL from a hoster |
| `getHosterInfo` | Get information about a hoster |

## Creating a ZPE Plugin

### Using Rust (Recommended)

1. **Create a new project**

```bash
cargo new --lib my-zpe-plugin
cd my-zpe-plugin
```

2. **Configure Cargo.toml**

```toml
[package]
name = "my-zpe-plugin"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = "s"
lto = true
```

3. **Implement the plugin**

```rust
use std::alloc::{alloc, dealloc, Layout};
use std::slice;

// ============================================================================
// Memory Management (Required exports)
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

fn success_response<T: serde::Serialize>(value: T) -> i64 {
    let response = serde_json::json!({
        "success": true,
        "value": value,
        "error": null
    });
    write_output(&response.to_string())
}

fn error_response(message: &str) -> i64 {
    let response = serde_json::json!({
        "success": false,
        "value": null,
        "error": message
    });
    write_output(&response.to_string())
}

// ============================================================================
// Lifecycle Functions
// ============================================================================

#[no_mangle]
pub extern "C" fn initialize() {
    // Plugin initialization code
}

#[no_mangle]
pub extern "C" fn shutdown() {
    // Plugin cleanup code
}

// ============================================================================
// Plugin Functions
// ============================================================================

/// Search for anime
/// Input JSON: { "query": "string", "page": number }
/// Output JSON: ZpeResult<ZpeAnimeList>
#[no_mangle]
pub extern "C" fn zpe_search(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    
    // Parse input
    let params: serde_json::Value = match serde_json::from_str(&input) {
        Ok(v) => v,
        Err(e) => return error_response(&format!("Invalid input: {}", e)),
    };
    
    let query = params["query"].as_str().unwrap_or("");
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    // Implement your search logic here
    // This example returns empty results
    let result = serde_json::json!({
        "items": [],
        "hasNextPage": false,
        "currentPage": page,
        "totalResults": 0
    });
    
    success_response(result)
}

/// Get popular anime
/// Input JSON: { "page": number }
#[no_mangle]
pub extern "C" fn zpe_get_popular(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    // Implement get_popular logic
    let result = serde_json::json!({
        "items": [],
        "hasNextPage": false,
        "currentPage": page,
        "totalResults": 0
    });
    
    success_response(result)
}

/// Get latest anime
#[no_mangle]
pub extern "C" fn zpe_get_latest(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    // Implement get_latest logic
    let result = serde_json::json!({
        "items": [],
        "hasNextPage": false,
        "currentPage": page,
        "totalResults": 0
    });
    
    success_response(result)
}

/// Get episodes for an anime
/// Input JSON: { "animeId": "string", "page": number }
#[no_mangle]
pub extern "C" fn zpe_get_episodes(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let anime_id = params["animeId"].as_str().unwrap_or("");
    let page = params["page"].as_u64().unwrap_or(1) as u32;
    
    // Implement get_episodes logic
    let result = serde_json::json!({
        "items": [],
        "hasNextPage": false,
        "currentPage": page,
        "totalEpisodes": 0
    });
    
    success_response(result)
}

/// Get streams for an episode
/// Input JSON: { "animeId": "string", "episodeId": "string" }
#[no_mangle]
pub extern "C" fn zpe_get_streams(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let anime_id = params["animeId"].as_str().unwrap_or("");
    let episode_id = params["episodeId"].as_str().unwrap_or("");
    
    // Implement get_streams logic
    let result = serde_json::json!({
        "items": []
    });
    
    success_response(result)
}

/// Get anime details
/// Input JSON: { "animeId": "string" }
#[no_mangle]
pub extern "C" fn zpe_get_anime_details(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let anime_id = params["animeId"].as_str().unwrap_or("");
    
    // Implement get_anime_details logic
    error_response("Not implemented")
}

/// Extract stream from URL (for stream providers)
/// Input JSON: { "url": "string" }
#[no_mangle]
pub extern "C" fn zpe_extract_stream(input_ptr: i32, input_len: i32) -> i64 {
    let input = read_input(input_ptr, input_len);
    let params: serde_json::Value = serde_json::from_str(&input).unwrap_or_default();
    let url = params["url"].as_str().unwrap_or("");
    
    // Implement extract_stream logic
    error_response("Not implemented")
}
```

4. **Build the plugin**

```bash
# Install the WASM target
rustup target add wasm32-unknown-unknown

# Build in release mode
cargo build --release --target wasm32-unknown-unknown
```

5. **Create the ZPE package**

```bash
# Create manifest.json
cat > manifest.json << 'EOF'
{
  "id": "my-anime-provider",
  "name": "My Anime Provider",
  "version": "1.0.0",
  "targetAyotoVersion": "2.5.4",
  "pluginType": "mediaProvider",
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getLatest": true,
    "getEpisodes": true,
    "getStreams": true,
    "getAnimeDetails": false,
    "extractStream": false,
    "getHosterInfo": false
  },
  "abiVersion": 1
}
EOF

# Copy the WASM file
cp target/wasm32-unknown-unknown/release/my_zpe_plugin.wasm plugin.wasm

# Create the ZPE archive
zip my-anime-provider.zpe manifest.json plugin.wasm
```

### Using AssemblyScript

AssemblyScript is TypeScript that compiles to WebAssembly, making it accessible to JavaScript developers.

1. **Install AssemblyScript**

```bash
npm init -y
npm install --save-dev assemblyscript
npx asinit .
```

2. **Implement the plugin** (assembly/index.ts)

```typescript
// Memory allocation
export function allocate(size: i32): i32 {
  return heap.alloc(size) as i32;
}

export function deallocate(ptr: i32, size: i32): void {
  heap.free(ptr);
}

// Initialize
export function initialize(): void {
  // Plugin initialization
}

// Shutdown
export function shutdown(): void {
  // Plugin cleanup
}

// Search function
export function zpe_search(inputPtr: i32, inputLen: i32): i64 {
  // Read input string
  const input = String.UTF8.decodeUnsafe(inputPtr, inputLen);
  const params = JSON.parse(input);
  
  // Implement search logic
  const result = JSON.stringify({
    success: true,
    value: {
      items: [],
      hasNextPage: false,
      currentPage: 1,
      totalResults: 0
    },
    error: null
  });
  
  // Write result to memory
  const bytes = String.UTF8.encode(result);
  const ptr = allocate(bytes.byteLength);
  memory.copy(ptr, changetype<usize>(bytes), bytes.byteLength);
  
  // Return packed ptr/len
  return (i64(ptr) << 32) | i64(bytes.byteLength);
}
```

3. **Build**

```bash
npm run asbuild
```

## Data Types

### ZpeAnime

```typescript
interface ZpeAnime {
  id: string;
  title: string;
  altTitles: string[];
  coverUrl?: string;
  bannerUrl?: string;
  description?: string;
  anilistId?: number;
  malId?: number;
  episodeCount?: number;
  year?: number;
  rating?: number;  // 0-100
  status?: string;  // "AIRING", "FINISHED", "NOT_YET_RELEASED"
  mediaType?: string;  // "TV", "MOVIE", "OVA", "ONA", "SPECIAL"
  genres: string[];
  isAiring?: boolean;
}
```

### ZpeEpisode

```typescript
interface ZpeEpisode {
  id: string;
  number: number;
  title?: string;
  thumbnailUrl?: string;
  description?: string;
  duration?: number;  // seconds
  airDate?: string;  // ISO 8601
  isFiller?: boolean;
}
```

### ZpeStreamSource

```typescript
interface ZpeStreamSource {
  url: string;
  quality: string;  // "1080p", "720p", "480p"
  server?: string;
  format: string;  // "m3u8", "mp4", "mkv", "webm", "torrent"
  anime4kSupport: boolean;
  isDefault: boolean;
  headers: Record<string, string>;
}
```

## Best Practices

1. **Keep plugins small** - Optimize for size using LTO and small optimization levels
2. **Handle errors gracefully** - Always return proper error messages
3. **Validate input** - Check all input parameters before processing
4. **Follow semver** - Version your plugins properly
5. **Test thoroughly** - Test on multiple platforms before release

## HTTP Requests

ZPE plugins currently need to implement HTTP requests through the host's HTTP context.
Future versions will provide built-in HTTP support via imported host functions.

## Publishing Plugins

1. Create a GitHub release with your `.zpe` file
2. Add a README with installation instructions
3. Submit to the Ayoto plugin registry (coming soon)

## Debugging

To debug your WASM plugin:

1. Build with debug info: `cargo build --target wasm32-unknown-unknown`
2. Use `wasm2wat` to inspect the WAT (text format)
3. Add logging via the `log_message` host function

## Support

- [Ayoto Discord](https://discord.gg/ayoto)
- [GitHub Issues](https://github.com/FundyJo/Ayoto/issues)
