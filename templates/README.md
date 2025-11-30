# Ayoto Plugin Templates

This folder contains example plugin templates for Ayoto. These templates demonstrate how to create custom JavaScript/TypeScript plugins for the Ayoto application.

## Plugin Format

Ayoto uses **JavaScript/TypeScript plugins** that run in a sandboxed frontend environment. Plugins can perform web scraping via Tauri's HTTP plugin.

**Benefits:**
- ✅ Write in familiar JavaScript or TypeScript
- ✅ Works on all platforms (Windows, macOS, Linux, Android, iOS)
- ✅ No compilation needed
- ✅ Built-in web scraping support with HTTP client
- ✅ HTML parsing utilities included
- ✅ Easy debugging in browser dev tools

See [Plugin System Documentation](../docs/PLUGIN_SYSTEM.md) for details.

## Plugin Types

### Stream Provider Plugins (`streamProvider`)
Stream providers handle video extraction from hosting services like VOE, Vidoza, Streamtape, etc.

Key capabilities:
- `extractStream` - Extract video stream URLs from hoster pages
- `getHosterInfo` - Get information about the hoster

### Media Provider Plugins (`mediaProvider`)
Media providers supply anime/series search and listing functionality from sites like Aniworld.to, s.to, etc.

Key capabilities:
- `search` - Search for anime/series
- `getPopular` - Get popular titles
- `getLatest` - Get latest episodes/releases
- `getEpisodes` - Get episode list for a title
- `getStreams` - Get stream sources for an episode
- `getAnimeDetails` - Get detailed anime information

## Quick Start

1. Create a new `.js` file with the plugin structure:

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
    // ... parse and return results
    return {
      results: [],
      hasNextPage: false,
      currentPage: page
    }
  },

  // Implement other methods...
}
```

2. Load in Ayoto via Settings → Plugins → Load Plugin

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

## Supported Stream Formats

- `m3u8` - HLS streaming format
- `mp4` - Direct MP4 video
- `mkv` - Matroska video
- `webm` - WebM video
- `torrent` - Torrent magnet links

## Installation

1. Create or download a `.js` plugin file
2. Open Ayoto → Settings → Plugins
3. Click "Load Plugin" and select the file

## Notes

- Plugins run in a sandboxed environment
- All HTTP requests go through Tauri's secure HTTP plugin
- Rate limiting is supported via `scrapingConfig.rateLimitMs`
- Plugin storage is available for caching data

## License

These templates are provided under the same license as Ayoto. Feel free to modify and share.
