# Plugin Template

This is a template for creating ZPE (Zanshin Plugin Extension) plugins for Ayoto.

## Structure

```
plugin-template/
├── manifest.json      # Plugin metadata and configuration
├── icon.png           # Plugin icon (PNG, JPG, or ICO)
├── src/
│   ├── index.js       # Main plugin entry point
│   ├── api.js         # API/HTTP request handling
│   ├── parser.js      # HTML/JSON parsing logic
│   └── utils.js       # Utility functions
└── README.md          # This file
```

## Getting Started

1. **Copy this template** to create your own plugin:
   ```bash
   cp -r plugin-template my-plugin
   cd my-plugin
   ```

2. **Edit `manifest.json`** with your plugin information:
   - Change `id` to a unique identifier
   - Update `name`, `description`, and `author`
   - Set appropriate `permissions` and `capabilities`
   - Configure `security.allowedDomains` for your data source

3. **Implement your plugin logic** in the `src/` directory:
   - `index.js` - Main entry point
   - `api.js` - HTTP requests to your data source
   - `parser.js` - Parse responses into structured data
   - `utils.js` - Helper functions

4. **Add your plugin icon** (optional):
   - Place as `icon.png`, `icon.jpg`, or `icon.ico`
   - Recommended size: 128x128 pixels

5. **Build the plugin** using the build script:
   ```bash
   # Linux/macOS
   ./scripts/build-plugin.sh ./my-plugin
   
   # Windows
   scripts\build-plugin.bat .\my-plugin
   
   # Or using Node.js (cross-platform)
   node scripts/build-plugin.mjs ./my-plugin
   ```

## Manifest Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plugin identifier |
| `name` | string | Yes | Human-readable name |
| `version` | string | Yes | Semantic version (e.g., "1.0.0") |
| `description` | string | Yes | Plugin description |
| `pluginType` | string | Yes | `media-provider`, `stream-provider`, `utility`, `theme`, or `integration` |
| `author` | object | Yes | Author information |
| `permissions` | array | No | Required permissions |
| `capabilities` | object | No | Plugin capabilities |
| `security` | object | No | Security settings |
| `main` | string | No | Main entry point (default: "src/index.js") |
| `scripts` | object | No | Additional script files to bundle |

### Permissions

- `network:http` - Make HTTP/HTTPS requests
- `network:websocket` - WebSocket connections
- `storage:local` - Local storage access
- `storage:cache` - Cache access
- `ui:notification` - Show notifications
- `ui:dialog` - Show dialogs

### Capabilities (Media Provider)

- `search` - Search for anime
- `getPopular` - Get popular anime
- `getLatest` - Get latest anime/episodes
- `getEpisodes` - Get episode lists
- `getStreams` - Get stream sources
- `getAnimeDetails` - Get detailed anime info

### Capabilities (Stream Provider)

- `extractStream` - Extract stream URLs from hosters
- `getHosterInfo` - Get hoster information

## Plugin API

The plugin receives a context object during initialization:

```javascript
async init(context) {
  this.http = context.http;       // HTTP client
  this.html = context.html;       // HTML parser
  this.storage = context.storage; // Plugin storage
}
```

### HTTP Client

```javascript
// GET request
const response = await this.http.get('https://example.com/api');

// POST request
const response = await this.http.post('https://example.com/api', {
  data: 'value'
});

// GET with headers
const response = await this.http.get('https://example.com/api', {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 60000
});

// Get JSON directly
const data = await this.http.getJson('https://example.com/api');
```

### HTML Parser

```javascript
// Extract text by selector
const titles = this.html.extractText(html, '.title');

// Extract attribute values
const links = this.html.extractAttribute(html, 'a', 'href');
const images = this.html.extractImages(html);

// Extract by class
const cards = this.html.extractByClass(html, 'card');

// Extract JSON from script
const data = this.html.extractJsonFromScript(html, 'playerData');
```

### Storage

```javascript
// Get value with default
const value = this.storage.get('key', defaultValue);

// Set value
this.storage.set('key', { data: 'value' });

// Remove value
this.storage.remove('key');

// Clear all plugin storage
this.storage.clear();
```

## Return Types

### Anime Object

```javascript
{
  id: 'anime-123',
  title: 'Anime Title',
  altTitles: ['Alternative Title'],
  cover: 'https://example.com/cover.jpg',
  banner: 'https://example.com/banner.jpg',
  description: 'Synopsis...',
  genres: ['Action', 'Adventure'],
  status: 'AIRING',
  year: 2024,
  episodeCount: 24,
  rating: 85,
  anilistId: 12345,
  malId: 67890
}
```

### Episode Object

```javascript
{
  id: 'ep-1',
  number: 1,
  title: 'Episode Title',
  thumbnail: 'https://example.com/thumb.jpg',
  duration: 1440, // seconds
  airDate: '2024-01-15'
}
```

### Stream Source

```javascript
{
  url: 'https://example.com/video.m3u8',
  format: 'm3u8', // m3u8, mp4, mkv, webm, dash, torrent
  quality: '1080p',
  server: 'Main',
  isDefault: true,
  headers: { 'Referer': 'https://example.com' }
}
```

### Paginated Result

```javascript
{
  results: [...],
  hasNextPage: true,
  currentPage: 1,
  totalPages: 10,
  totalItems: 100
}
```

## Security Best Practices

1. **Declare minimal permissions** - Only request what you need
2. **Use domain allowlists** - Restrict network access in `security.allowedDomains`
3. **Don't store sensitive data** - Avoid storing credentials
4. **Handle errors gracefully** - Wrap API calls in try/catch
5. **Avoid obfuscation** - Keep code readable (obfuscated code may be flagged)

## License

MIT
