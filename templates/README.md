# Ayoto Plugin Templates

This folder contains example plugin templates for Ayoto. These templates demonstrate how to create custom JavaScript/TypeScript plugins for the Ayoto application using a modular folder structure with multiple scripts.

## Folder Structure

```
templates/
├── README.md                          # This documentation file
├── media-provider/                    # Media provider plugin template
│   ├── manifest.json                  # Plugin metadata and configuration
│   ├── icon.svg                       # Plugin icon (SVG, PNG, JPG, or ICO)
│   ├── README.md                      # Media provider documentation
│   └── src/
│       ├── index.js                   # Main plugin entry point
│       ├── api.js                     # API/HTTP request handling
│       ├── parser.js                  # HTML/JSON parsing logic
│       └── utils.js                   # Utility functions
├── aniworld-provider/                 # Aniworld.to media provider (ready to use)
│   ├── manifest.json                  # Plugin metadata and configuration
│   ├── icon.svg                       # Plugin icon
│   ├── README.md                      # Aniworld provider documentation
│   └── src/
│       └── index.js                   # Main plugin with search implementation
├── stream-provider/                   # Stream provider plugin template
│   ├── manifest.json                  # Plugin metadata and configuration
│   ├── icon.svg                       # Plugin icon
│   ├── README.md                      # Stream provider documentation
│   └── src/
│       ├── index.js                   # Main plugin entry point
│       ├── extractors.js              # Hoster-specific extraction logic
│       └── utils.js                   # Utility functions
├── media-provider-manifest.json       # Legacy single-file manifest example
├── media-provider-plugin.js           # Legacy single-file plugin example
├── stream-provider-manifest.json      # Legacy single-file manifest example
└── stream-provider-plugin.js          # Legacy single-file plugin example
```

## Plugin Format

Ayoto uses **JavaScript/TypeScript plugins** that run in a sandboxed frontend environment. Plugins can perform web scraping via Tauri's HTTP plugin.

**Benefits:**
- ✅ Write in familiar JavaScript or TypeScript
- ✅ Works on all platforms (Windows, macOS, Linux, Android, iOS)
- ✅ No compilation needed
- ✅ Built-in web scraping support with HTTP client
- ✅ HTML parsing utilities included
- ✅ Easy debugging in browser dev tools
- ✅ Modular structure with multiple source files
- ✅ Custom icons and descriptions

See [Plugin System Documentation](../docs/PLUGIN_SYSTEM.md) for details.

## Plugin Types

### Media Provider Plugins (`media-provider`)

Media providers supply anime/series search and listing functionality from sites like Aniworld.to, s.to, etc.

**Template location:** `templates/media-provider/`

Key capabilities:
- `search` - Search for anime/series
- `getPopular` - Get popular titles
- `getLatest` - Get latest episodes/releases
- `getEpisodes` - Get episode list for a title
- `getStreams` - Get stream sources for an episode
- `getAnimeDetails` - Get detailed anime information

### Stream Provider Plugins (`stream-provider`)

Stream providers handle video extraction from hosting services like VOE, Vidoza, Streamtape, etc.

**Template location:** `templates/stream-provider/`

Key capabilities:
- `extractStream` - Extract video stream URLs from hoster pages
- `getHosterInfo` - Get information about the hoster

## Quick Start

### Using the Folder Templates (Recommended)

1. **Copy a template** to create your own plugin:
   ```bash
   # For a media provider
   cp -r templates/media-provider my-media-provider
   
   # For a stream provider
   cp -r templates/stream-provider my-stream-provider
   ```

2. **Edit `manifest.json`** with your plugin information:
   - Change `id` to a unique identifier
   - Update `name`, `description`, and `author`
   - Set appropriate `permissions` and `capabilities`
   - Configure `security.allowedDomains` for your data source

3. **Add your plugin icon**:
   - Replace `icon.svg` with your own icon
   - Recommended size: 128x128 pixels
   - Supported formats: SVG (preferred), PNG, JPG, ICO

4. **Implement your plugin logic** in the `src/` directory

5. **Build the plugin**:
   ```bash
   # Linux/macOS
   ./scripts/build-plugin.sh ./my-media-provider
   
   # Windows
   scripts\build-plugin.bat .\my-media-provider
   
   # Cross-platform (Node.js)
   node scripts/build-plugin.mjs ./my-media-provider
   ```

### Using Legacy Single-File Templates

For simpler plugins, you can still use the single-file approach:

```javascript
const manifest = {
  id: 'my-provider',
  name: 'My Provider',
  version: '1.0.0',
  pluginType: 'mediaProvider',
  description: 'My custom anime provider',
  author: 'Your Name',
  capabilities: {
    search: true,
    getPopular: true,
    getEpisodes: true,
    getStreams: true
  },
  scrapingConfig: {
    baseUrl: 'https://example.com',
    rateLimitMs: 1000
  }
}

module.exports = {
  async init(context) {
    this.http = context.http
    this.html = context.html
  },

  async search(query, page = 1) {
    const response = await this.http.get(`https://example.com/search?q=${query}`)
    const titles = this.html.extractText(response.body, '.anime-title')
    return {
      results: [],
      hasNextPage: false,
      currentPage: page
    }
  }
}
```

## Web Scraping Features

### HTTP Client
```javascript
// GET request
const response = await context.http.get('https://example.com/page')

// POST request
const response = await context.http.post('https://api.example.com', { data: 'value' })

// With headers
const response = await context.http.get('https://example.com', {
  headers: { 'Accept': 'application/json' }
})
```

### HTML Parser
```javascript
// Extract text by selector
const titles = context.html.extractText(html, '.anime-title')

// Extract attribute
const links = context.html.extractAttribute(html, 'a', 'href')

// Extract by class
const cards = context.html.extractByClass(html, 'anime-card')

// Parse JSON from script
const data = context.html.extractJsonFromScript(html, 'window.__DATA__')
```

## Plugin Icon

Each plugin can include a custom icon:

- **Supported formats:** SVG (preferred), PNG, JPG, ICO
- **Recommended size:** 128x128 pixels
- **Location:** Root of the plugin folder as `icon.svg`, `icon.png`, etc.
- **Reference in manifest:** `"icon": "icon.svg"`

## Supported Stream Formats

- `m3u8` - HLS streaming format
- `mp4` - Direct MP4 video
- `mkv` - Matroska video
- `webm` - WebM video
- `dash` - MPEG-DASH
- `torrent` - Torrent magnet links

## Installation

1. Build your plugin using the build script
2. Open Ayoto → Settings → Plugins
3. Click "Load Plugin" and select the `.zpe` file

## Notes

- Plugins run in a sandboxed environment
- All HTTP requests go through Tauri's secure HTTP plugin
- Rate limiting is supported via `config.rateLimitMs`
- Plugin storage is available for caching data
- Use the modular folder structure for complex plugins

## License

These templates are provided under the same license as Ayoto. Feel free to modify and share.
