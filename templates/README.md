# Ayoto Plugin Templates

This folder contains example plugin templates for Ayoto. These templates demonstrate how to create custom plugins for the Ayoto application.

## Plugin Formats

Ayoto supports three plugin formats:

### 1. ZPE Universal Plugins (Recommended) - `.zpe`

ZPE (Zenshine Plugin Extension) plugins are **WebAssembly-based** and work on **all platforms** without recompilation.

**Benefits:**
- ✅ Write once, run anywhere (Windows, macOS, Linux, Android, iOS)
- ✅ No need for platform-specific compilation
- ✅ Sandboxed execution for security
- ✅ Can be written in Rust, C/C++, AssemblyScript, Go, Zig

**Example:** `zpe-plugins/sample-media-provider/`

See [ZPE Plugin Development Guide](../docs/ZPE_PLUGIN_DEVELOPMENT.md) for details.

### 2. Native Rust Plugins - `.so/.dll/.dylib`

Native plugins are compiled Rust dynamic libraries. They offer maximum performance but require separate compilation for each platform.

**When to use:**
- Maximum performance is critical
- Platform-specific features are needed
- You can compile for all target platforms

See [Native Plugin Development Guide](../docs/NATIVE_PLUGIN_DEVELOPMENT.md) for details.

### 3. JSON Manifest Plugins (Legacy) - `.ayoto`

JSON plugins are configuration files that define metadata and capabilities. They cannot execute code directly.

**Examples:** `plugins/aniworld-provider.ayoto`, `plugins/voe-provider.ayoto`

## Plugin Types

Both ZPE and native plugins can be either:

### Stream Provider Plugins (`streamProvider`)
Stream providers handle video extraction from hosting services like VOE, Vidoza, Streamtape, etc.

Key capabilities:
- `extractStream` - Extract video stream URLs from hoster pages
- `getHosterInfo` - Get information about the hoster
- `decryptStream` - Handle encrypted/obfuscated streams
- `getDownloadLink` - Provide direct download links

### Media Provider Plugins (`mediaProvider`)
Media providers supply anime/series search and listing functionality from sites like Aniworld.to, s.to, etc.

Key capabilities:
- `search` - Search for anime/series
- `getPopular` - Get popular titles
- `getLatest` - Get latest episodes/releases
- `getEpisodes` - Get episode list for a title
- `getStreams` - Get stream sources for an episode
- `getAnimeDetails` - Get detailed anime information

## Quick Start: ZPE Plugin

1. Copy `zpe-plugins/sample-media-provider/`
2. Modify `manifest.json` with your plugin info
3. Implement your logic in `src/lib.rs`
4. Build: `cargo build --release --target wasm32-unknown-unknown`
5. Package: `zip my-plugin.zpe manifest.json plugin.wasm`
6. Load in Ayoto via Settings → Plugins

## Supported Stream Formats

- `m3u8` - HLS streaming format
- `mp4` - Direct MP4 video
- `mkv` - Matroska video
- `webm` - WebM video
- `torrent` - Torrent magnet links

## Installation

### ZPE Plugins (.zpe)
1. Download or create a `.zpe` file
2. Open Ayoto → Settings → Plugins
3. Click "Load Plugin" and select the file

### Native Plugins
1. Build for your platform (see Native Plugin Development Guide)
2. Place in the plugins directory
3. Restart Ayoto

### JSON Plugins (.ayoto)
1. Create or download a `.ayoto` file
2. Open Ayoto → Settings → Plugins
3. Click "Add Plugin" and select the file

## Notes

- ZPE plugins are recommended for maximum compatibility
- The `anime4kSupport` flag indicates Anime4K shader compatibility
- All plugins should include proper `headers` for web requests

## License

These templates are provided under the same license as Ayoto. Feel free to modify and share.
