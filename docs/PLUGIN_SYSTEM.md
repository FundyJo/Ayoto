# Ayoto Plugin System

## Overview

The Ayoto Plugin System allows developers to create universal plugins for anime streaming providers. Ayoto supports three plugin formats:

1. **ZPE (Zenshine Plugin Extension)** - Universal WebAssembly plugins (`.zpe`) - **Recommended**
2. **Native Plugins** - Platform-specific compiled plugins (`.dll/.so/.dylib`)
3. **JSON Plugins** - Configuration-only plugins (`.ayoto`) - Legacy

## Plugin Formats Comparison

| Feature | ZPE (.zpe) | Native | JSON (.ayoto) |
|---------|------------|--------|---------------|
| Cross-platform | ✅ Yes | ❌ Per-platform | ✅ Yes |
| Execute code | ✅ Yes | ✅ Yes | ❌ No |
| Performance | Good | Best | N/A |
| Security | ✅ Sandboxed | ⚠️ Full access | ✅ Safe |
| Languages | Rust, C/C++, Go, etc. | Rust | JSON |
| Compile once | ✅ Yes | ❌ No | N/A |

## ZPE Plugins (Recommended)

ZPE plugins use WebAssembly (WASM) to run on any platform. A single `.zpe` file works on Windows, macOS, Linux, Android, and iOS.

See the [ZPE Plugin Development Guide](ZPE_PLUGIN_DEVELOPMENT.md) for detailed instructions.

### Quick Example

```bash
# Build your ZPE plugin
cargo build --release --target wasm32-unknown-unknown

# Package it
zip my-plugin.zpe manifest.json plugin.wasm
```

## JSON Plugin Format (Legacy)

Plugins use the `.ayoto` file extension and contain a JSON manifest defining the plugin's capabilities, version compatibility, and configuration.

### Basic Structure

```json
{
  "id": "my-provider",
  "name": "My Anime Provider",
  "version": "1.0.0",
  "targetAyotoVersion": "2.5.0",
  "description": "A custom anime provider plugin",
  "author": "Your Name",
  "providers": ["MyProvider"],
  "formats": ["m3u8", "mp4"],
  "anime4kSupport": true,
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getEpisodes": true,
    "getStreams": true,
    "scraping": true
  },
  "platforms": ["universal"],
  "scrapingConfig": {
    "baseUrl": "https://example.com",
    "rateLimitMs": 1000,
    "requiresJavascript": false
  }
}
```

## Version Compatibility

Plugins use semantic versioning (semver) for version management:

- **Plugin Version**: The version of your plugin (e.g., `1.0.0`)
- **Target Ayoto Version**: The minimum Ayoto version your plugin is compatible with
- **Max Ayoto Version** (optional): The maximum Ayoto version supported

### Compatibility Rules

1. Plugins built for `v1.x.x` will work with any `v1.y.z` (same major version)
2. Plugins built for `v1.x.x` may NOT work with `v2.x.x` due to API changes
3. Users see warnings when using plugins built for older versions

## Capabilities

Plugins can implement any combination of these capabilities:

| Capability | Function Signature | Description |
|------------|-------------------|-------------|
| `search` | `search(query: string) -> List<PopulatedAnime>` | Search for anime by title |
| `getPopular` | `getPopular(page: number) -> List<PopulatedAnime>` | Get popular anime list |
| `getLatest` | `getLatest(page: number) -> List<PopulatedAnime>` | Get latest anime/episodes |
| `getEpisodes` | `getEpisodes(animeId: string, page: number) -> List<Episode>` | Get episode list for an anime |
| `getStreams` | `getStreams(animeId: string, episodeId: string) -> PopulatedEpisode` | Get stream sources for an episode |
| `getAnimeDetails` | `getAnimeDetails(animeId: string) -> PopulatedAnime` | Get detailed anime information |
| `scraping` | - | Plugin uses web scraping for data extraction |

## Return Types

### PopulatedAnime

```typescript
interface PopulatedAnime {
  id: string;              // Unique identifier
  title: string;           // Anime title
  altTitles: string[];     // Alternative titles
  cover?: string;          // Cover image URL
  banner?: string;         // Banner image URL
  description?: string;    // Synopsis
  anilistId?: number;      // AniList ID for cross-referencing
  malId?: number;          // MyAnimeList ID
  status?: string;         // AIRING, FINISHED, NOT_YET_RELEASED
  episodeCount?: number;   // Total episode count
  genres: string[];        // Genre list
  year?: number;           // Release year
  rating?: number;         // Rating (0-100)
  mediaType?: string;      // TV, MOVIE, OVA, ONA, SPECIAL
  isAiring?: boolean;      // Currently airing
  nextAiring?: NextAiringEpisode;
}
```

### Episode

```typescript
interface Episode {
  id: string;              // Unique identifier
  number: number;          // Episode number
  title?: string;          // Episode title
  thumbnail?: string;      // Thumbnail URL
  description?: string;    // Episode description
  duration?: number;       // Duration in seconds
  airDate?: string;        // Air date (ISO 8601)
  isFiller?: boolean;      // Filler episode flag
}
```

### StreamSource

```typescript
interface StreamSource {
  url: string;             // Stream URL
  format: StreamFormat;    // m3u8, mp4, mkv, webm, torrent
  quality: string;         // 1080p, 720p, 480p, etc.
  anime4kSupport: boolean; // Supports Anime4K upscaling
  isDefault?: boolean;     // Default source
  server?: string;         // Server name
  headers: Record<string, string>; // Required headers
}
```

## Supported Formats

- `m3u8` - HLS streaming
- `mp4` - Direct MP4 files
- `mkv` - Matroska format
- `webm` - WebM format
- `torrent` - Torrent magnet links

## Target Platforms

Plugins can specify which platforms they support:

- `universal` - All platforms (default)
- `desktop` - Windows, macOS, Linux
- `mobile` - iOS, Android
- `windows` - Windows only
- `macos` - macOS only
- `linux` - Linux only
- `ios` - iOS only
- `android` - Android only

## Scraping Configuration

For plugins that use web scraping:

```json
{
  "scrapingConfig": {
    "baseUrl": "https://example.com",
    "userAgent": "Ayoto/2.5.0",
    "rateLimitMs": 1000,
    "requiresJavascript": false,
    "selectors": {
      "searchResults": ".anime-card",
      "title": ".anime-title",
      "cover": ".anime-cover img"
    }
  }
}
```

## Using Plugins in Frontend

### JavaScript/React

```javascript
import { 
  pluginBridge, 
  loadPluginFromFile, 
  pluginSearch 
} from './plugins'

// Initialize the bridge
await pluginBridge.init()

// Load a plugin
const result = await loadPluginFromFile('/path/to/plugin.ayoto')
if (result.success) {
  console.log(`Loaded plugin: ${result.pluginId}`)
}

// Search using a plugin
const searchResults = await pluginSearch('my-provider', 'Naruto')
console.log(searchResults.results) // Array of PopulatedAnime
```

### Loading Plugins via Dialog

```javascript
import { pluginBridge } from './plugins'

// Open file dialog and load selected plugin
const result = await pluginBridge.loadPluginFromDialog()
```

## Plugin Management Commands

From the Rust backend (via Tauri):

- `get_ayoto_version()` - Get current Ayoto version
- `load_plugin_from_json(json, source)` - Load from JSON
- `load_plugin_from_file(path)` - Load from file
- `get_all_plugins()` - List all plugins
- `get_enabled_plugins()` - List enabled plugins
- `set_plugin_enabled(pluginId, enabled)` - Enable/disable
- `unload_plugin(pluginId)` - Unload a plugin
- `validate_plugin_manifest(json)` - Validate without loading

## Example Plugin

See `resources/plugins/sample-provider.ayoto` for a complete example.

## Development Workflow

1. Create your `.ayoto` manifest file
2. Define capabilities your plugin supports
3. Set appropriate `targetAyotoVersion` for compatibility
4. Test loading with `validate_plugin_manifest`
5. Distribute the `.ayoto` file to users

## Security Considerations

- Plugins cannot execute arbitrary code
- All network requests go through Tauri's HTTP plugin
- Scraping respects rate limits defined in configuration
- User consent is required before loading plugins
