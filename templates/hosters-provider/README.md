# Video Hosters Provider Plugin

A comprehensive stream provider plugin for extracting video URLs from various video hosting services.

## Overview

The hosters-provider plugin works **alongside media provider plugins** (like aniworld-provider) to enable seamless video playback in Vidstack. When a media provider returns streams with `embed` or `redirect` format (hoster page URLs), this plugin extracts the actual playable video URLs (m3u8, mp4) that Vidstack can play.

## Supported Hosters

| Hoster | Pattern | Description |
|--------|---------|-------------|
| Vidoza | `vidoza.net`, `vidoza.org` | MP4 direct links |
| Vidmoly | `vidmoly.to`, `vidmoly.me` | HLS streams, requires headers |
| VOE | `voe.sx`, `voe-network.net` | Obfuscated HLS streams |
| Streamtape | `streamtape.com`, `streamtape.net` | Token-based MP4 links |
| SpeedFiles | `speedfiles.net` | Multi-encoded MP4 links |
| Luluvdo | `luluvdo.com` | Embedded player with custom headers |
| LoadX | `loadx.ws` | AJAX-based HLS streams |
| Filemoon | `filemoon.sx`, `filemoon.to` | Packed JS with HLS |
| Doodstream | `doodstream.com`, `dood.re` | Token + timestamp based links |

## How It Works with Media Providers

1. **Media Provider Flow (e.g., aniworld-provider):**
   - User searches for anime → gets results
   - User selects an episode → provider fetches stream sources
   - Provider returns streams with format `embed` or `redirect` (hoster URLs like VOE, Vidoza)

2. **Automatic Extraction:**
   - When user clicks "Extract & Play" on an embed/redirect stream
   - The app automatically uses hosters-provider via `pluginAPI.extractStream(url)`
   - hosters-provider identifies the hoster and extracts the direct video URL
   - The extracted URL (m3u8 or mp4) is passed to Vidstack for playback

3. **Result:**
   - User gets smooth video playback in Vidstack
   - No need to open external hoster pages

## Installation

1. Build the plugin using the ZPE Builder:
   ```bash
   node scripts/build-plugin.mjs templates/hosters-provider
   ```

2. Install via Ayoto's plugin manager:
   - Go to Settings → Plugins
   - Click "Load Plugin" and select the `.zpe` file

3. The plugin will automatically be used when media providers return embed/redirect streams

## Usage

### Automatic (Recommended)

The plugin is automatically used by Ayoto when:
- A media provider (like aniworld-provider) returns streams with `format: 'embed'` or `format: 'redirect'`
- User clicks "Extract & Play" button on such streams
- The app calls `pluginAPI.extractStream(url)` which uses this plugin

### Manual API Usage

If you need to call the plugin directly:

#### `extractStream(url)`

Extracts the direct video URL from a hoster page.

```javascript
const result = await plugin.extractStream('https://vidoza.net/example.html');
// Returns:
// {
//   url: 'https://...',
//   format: 'mp4',
//   quality: 'Auto',
//   server: 'Vidoza'
// }
```

#### `getHosterInfo(url)`

Returns information about the hoster for a given URL.

```javascript
const info = await plugin.getHosterInfo('https://streamtape.com/v/example');
// Returns:
// {
//   name: 'Streamtape',
//   supported: true,
//   key: 'streamtape'
// }
```

#### `isSupported(url)`

Checks if a URL is from a supported hoster.

```javascript
const supported = plugin.isSupported('https://filemoon.sx/e/example');
// Returns: true
```

#### `getSupportedHosters()`

Returns a list of all supported hosters.

```javascript
const hosters = plugin.getSupportedHosters();
// Returns array of hoster info
```

## Response Format

All extractors return a standardized response compatible with Vidstack:

```javascript
{
  url: string,           // Direct video URL (m3u8 or mp4)
  format: string,        // 'mp4', 'm3u8', 'mkv', 'webm'
  quality: string,       // Quality label (e.g., 'Auto', '720p')
  server: string,        // Server name
  headers?: object,      // Optional headers for playback
  requiresHeaders?: bool // True if headers are required
  forceHls?: bool        // True if HLS player should be used
}
```

## Integration Example

Here's how a media provider plugin works with hosters-provider:

```javascript
// In aniworld-provider's getStreams method:
async getStreams(animeId, episodeId) {
  // Fetch episode page and find hoster links
  const streams = [
    {
      url: 'https://voe.sx/e/abc123',   // Hoster page URL
      format: 'embed',                   // Needs extraction
      server: 'VOE',
      quality: 'HD'
    },
    {
      url: 'https://vidoza.net/xyz456.html',
      format: 'embed',
      server: 'Vidoza', 
      quality: 'HD'
    }
  ];
  return streams;
}

// When user clicks "Extract & Play":
// 1. App detects format === 'embed'
// 2. Calls pluginAPI.extractStream('https://voe.sx/e/abc123')
// 3. hosters-provider returns: { url: 'https://...m3u8', format: 'm3u8', ... }
// 4. Vidstack plays the m3u8 URL directly
```

## Notes

- Some hosters require specific headers for playback (Vidmoly, Doodstream, Luluvdo)
- URLs are cached for 10 minutes to reduce requests
- The plugin handles redirects and obfuscated content automatically
- Extraction may take a few seconds depending on the hoster

## Development

The plugin is structured as follows:

```
hosters-provider/
├── manifest.json      # Plugin manifest
├── icon.svg          # Plugin icon
├── src/
│   ├── index.js      # Main plugin entry point
│   ├── extractors.js # Hoster-specific extractors
│   └── utils.js      # Utility functions
└── README.md         # This file
```

## Adding New Hosters

To add support for a new hoster:

1. Add the hoster pattern to `supportedHosters` in `src/index.js`
2. Implement the extraction logic in `src/extractors.js`
3. Test with sample URLs from the hoster

## License

MIT License
