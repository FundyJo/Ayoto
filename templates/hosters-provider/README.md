# Video Hosters Provider Plugin

A comprehensive stream provider plugin for extracting video URLs from various video hosting services.

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

## Installation

1. Build the plugin using the ZPE Builder
2. Install via Ayoto's plugin manager
3. The plugin will automatically handle URLs from supported hosters

## Usage

The plugin exports the following methods:

### `extractStream(url)`

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

### `getHosterInfo(url)`

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

### `isSupported(url)`

Checks if a URL is from a supported hoster.

```javascript
const supported = plugin.isSupported('https://filemoon.sx/e/example');
// Returns: true
```

### `getSupportedHosters()`

Returns a list of all supported hosters.

```javascript
const hosters = plugin.getSupportedHosters();
// Returns array of hoster info
```

## Response Format

All extractors return a standardized response:

```javascript
{
  url: string,           // Direct video URL
  format: string,        // 'mp4', 'm3u8', 'mkv', 'webm'
  quality: string,       // Quality label (e.g., 'Auto', '720p')
  server: string,        // Server name
  headers?: object,      // Optional headers for playback
  requiresHeaders?: bool // True if headers are required
  forceHls?: bool        // True if HLS player should be used
}
```

## Notes

- Some hosters require specific headers for playback (Vidmoly, Doodstream, Luluvdo)
- URLs are cached for 10 minutes to reduce requests
- The plugin handles redirects and obfuscated content automatically

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

## License

MIT License
