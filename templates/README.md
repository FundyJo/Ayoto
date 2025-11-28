# Ayoto Plugin Templates

This folder contains example plugin templates for Ayoto. These templates demonstrate how to create custom plugins for the Ayoto application.

## Plugin Types

Ayoto supports two types of plugins:

### 1. Stream Provider Plugins (`streamProvider`)
Stream providers handle video extraction from hosting services like VOE, Vidoza, Streamtape, etc.

**Example:** `voe-provider.ayoto`

Key capabilities:
- `extractStream` - Extract video stream URLs from hoster pages
- `getHosterInfo` - Get information about the hoster
- `decryptStream` - Handle encrypted/obfuscated streams
- `getDownloadLink` - Provide direct download links

### 2. Media Provider Plugins (`mediaProvider`)
Media providers supply anime/series search and listing functionality from sites like Aniworld.to, s.to, etc.

**Example:** `aniworld-provider.ayoto`

Key capabilities:
- `search` - Search for anime/series
- `getPopular` - Get popular titles
- `getLatest` - Get latest episodes/releases
- `getEpisodes` - Get episode list for a title
- `getStreams` - Get stream sources for an episode
- `getAnimeDetails` - Get detailed anime information
- `scraping` - Web scraping support

## Plugin File Formats

Ayoto supports two plugin formats:

### JSON Plugins (`.ayoto`)

Simple JSON-formatted manifest files. Example:

```json
{
  "id": "unique-plugin-id",
  "name": "Plugin Display Name",
  "version": "1.0.0",
  "pluginType": "streamProvider | mediaProvider",
  "description": "Plugin description",
  "author": "Author Name",
  "icon": "https://example.com/icon.png",
  "providers": ["Provider1", "Provider2"],
  "formats": ["m3u8", "mp4"],
  "anime4kSupport": true,
  "capabilities": {
    // Capabilities specific to plugin type
  },
  "config": {
    // Plugin-specific configuration
  }
}
```

### Native Plugins (`.pl`)

**Unified Extension**: Instead of platform-specific extensions (`.so`, `.dll`, `.dylib`), native plugins use the unified `.pl` extension that works across all platforms.

Native plugins are directories containing a `manifest.json` and platform-specific libraries:

```text
my-native-plugin.pl/
├── manifest.json
└── lib/
    ├── linux/
    │   └── libplugin.so
    ├── windows/
    │   └── plugin.dll
    ├── macos/
    │   └── libplugin.dylib
    ├── android/
    │   └── libplugin.so
    └── ios/
        └── libplugin.dylib
```

The manifest includes a `nativeLibrary` field specifying paths for each platform:

```json
{
  "id": "my-native-plugin",
  "name": "My Native Plugin",
  "version": "1.0.0",
  "nativeLibrary": {
    "linux": "lib/linux/libplugin.so",
    "windows": "lib/windows/plugin.dll",
    "macos": "lib/macos/libplugin.dylib",
    "android": "lib/android/libplugin.so",
    "ios": "lib/ios/libplugin.dylib"
  }
}
```

## Supported Stream Formats

- `m3u8` - HLS streaming format
- `mp4` - Direct MP4 video
- `mkv` - Matroska video
- `webm` - WebM video
- `torrent` - Torrent magnet links

## Installation

1. Create or download a `.ayoto` plugin file
2. Open Ayoto and navigate to Settings > Plugins
3. Click "Add Plugin" and select your plugin file
4. Enable the plugin

## Creating Your Own Plugin

1. Copy one of the template files as a starting point
2. Modify the `id`, `name`, `version`, and other metadata
3. Update `capabilities` based on what your plugin supports
4. Configure `endpoints` and `config` for your target service
5. Add any service-specific configuration (scraping rules, patterns, etc.)

## Notes

- The `anime4kSupport` flag indicates if the plugin's streams are compatible with Anime4K shaders
- Stream providers should specify `supportedHosters` and `urlPatterns`
- Media providers should specify `baseUrl` and `languages`
- All plugins should include proper `headers` for web requests

## License

These templates are provided under the same license as Ayoto. Feel free to modify and share.
