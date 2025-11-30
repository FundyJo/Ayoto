# Stream Provider Plugin Template

This is a template for creating ZPE (Zanshin Plugin Extension) stream provider plugins for Ayoto.

## Description

Stream provider plugins handle video extraction from hosting services like VOE, Vidoza, Streamtape, etc. They extract direct video URLs from hoster pages so that the video player can stream the content.

## Structure

```
stream-provider/
├── manifest.json      # Plugin metadata and configuration
├── icon.svg           # Plugin icon (SVG recommended)
├── README.md          # This documentation file
└── src/
    ├── index.js       # Main plugin entry point
    ├── extractors.js  # Hoster-specific extraction logic
    └── utils.js       # Utility functions
```

## Getting Started

1. **Copy this template** to create your own plugin:
   ```bash
   cp -r templates/stream-provider my-stream-provider
   cd my-stream-provider
   ```

2. **Edit `manifest.json`** with your plugin information:
   - Change `id` to a unique identifier (e.g., "my-hoster-extractor")
   - Update `name`, `description`, and `author`
   - Configure `security.allowedDomains` for the hosters you support
   - Set appropriate `config` options

3. **Add your plugin icon**:
   - Replace `icon.svg` with your own icon
   - Recommended size: 128x128 pixels
   - Supported formats: SVG (preferred), PNG, JPG, ICO

4. **Implement your plugin logic** in the `src/` directory:
   - `index.js` - Main entry point with core methods
   - `extractors.js` - Hoster-specific extraction functions
   - `utils.js` - Helper functions (URL handling, parsing, etc.)

5. **Build the plugin** using the build script:
   ```bash
   # Linux/macOS
   ./scripts/build-plugin.sh ./my-stream-provider
   
   # Windows
   scripts\build-plugin.bat .\my-stream-provider
   
   # Cross-platform (Node.js)
   node scripts/build-plugin.mjs ./my-stream-provider
   ```

## Capabilities

Stream provider plugins implement the following methods:

| Method | Description |
|--------|-------------|
| `extractStream(url)` | Extract direct video URL from a hoster page |
| `getHosterInfo(url)` | Get information about a hoster (name, supported, etc.) |

## Return Types

### Stream Source
```javascript
{
  url: 'https://example.com/video.mp4',
  format: 'mp4',        // m3u8, mp4, mkv, webm, dash
  quality: '1080p',
  server: 'VidStream',
  headers: {            // Optional headers required for playback
    'Referer': 'https://example.com'
  }
}
```

### Hoster Info
```javascript
{
  name: 'VidStream',
  supported: true,
  key: 'vidstream'
}
```

## Supported Stream Formats

- `m3u8` - HLS streaming format
- `mp4` - Direct MP4 video
- `mkv` - Matroska video
- `webm` - WebM video
- `dash` - MPEG-DASH
- `torrent` - Torrent magnet links

## Permissions

Declare only the permissions your plugin needs:

- `network:http` - Make HTTP/HTTPS requests (required)
- `storage:cache` - Temporary cache storage (recommended)

## Adding New Hosters

To add support for a new hoster:

1. Add the hoster pattern to `supportedHosters` in `src/index.js`
2. Create an extraction function in `src/extractors.js`
3. Add the domain to `security.allowedDomains` in `manifest.json`

Example:
```javascript
// In src/index.js - supportedHosters
'newhoster': {
  pattern: /newhoster\.com/i,
  name: 'NewHoster'
}

// In src/extractors.js
async extractNewHoster(url, http, html) {
  const response = await http.get(url);
  // Extract video URL...
  return { url: videoUrl, format: 'mp4', quality: 'Default', server: 'NewHoster' };
}
```

## Security Best Practices

1. **Declare minimal permissions** - Only request what you need
2. **Use domain allowlists** - Restrict network access in `security.allowedDomains`
3. **Avoid eval()** - Don't execute dynamic code from responses
4. **Handle errors gracefully** - Wrap extraction in try/catch
5. **Cache results** - Use storage to avoid repeated requests

## License

MIT - Feel free to modify and share.
