# Ayoto Plugin System

## Overview

The Ayoto Plugin System allows developers to create JavaScript/TypeScript plugins for anime streaming providers. Plugins run in the frontend and can perform web scraping to fetch anime data from various sources.

## Plugin Format

Plugins are JavaScript files that export a set of functions for searching, fetching episodes, and extracting streams.

## JavaScript Plugin Format

Plugins are written in JavaScript/TypeScript and run in a sandboxed environment in the browser. They have access to:

- HTTP client for web scraping (via Tauri's HTTP plugin with full TLS support)
- HTML parsing utilities for extracting data from web pages
- Local storage for caching data
- Logging facilities

### Basic Structure

```javascript
// Plugin manifest is defined as an object
const manifest = {
  id: 'my-provider',
  name: 'My Anime Provider',
  version: '1.0.0',
  pluginType: 'mediaProvider', // or 'streamProvider'
  description: 'A custom anime provider plugin',
  author: 'Your Name',
  capabilities: {
    search: true,
    getPopular: true,
    getLatest: true,
    getEpisodes: true,
    getStreams: true,
    getAnimeDetails: true
  },
  scrapingConfig: {
    baseUrl: 'https://example.com',
    userAgent: 'Ayoto/2.5.4',
    rateLimitMs: 1000
  }
}

// Plugin implementation
module.exports = {
  // Called when the plugin is loaded
  async init(context) {
    this.http = context.http
    this.html = context.html
    this.storage = context.storage
  },

  // Search for anime by query
  async search(query, page = 1) {
    const response = await this.http.get(`https://example.com/search?q=${encodeURIComponent(query)}&page=${page}`)
    const results = this.html.extractByClass(response.body, 'anime-card')
    
    return {
      results: results.map(item => ({
        id: 'anime-id',
        title: 'Anime Title',
        cover: 'https://example.com/cover.jpg',
        description: 'Description...'
      })),
      hasNextPage: true,
      currentPage: page
    }
  },

  // Get popular anime
  async getPopular(page = 1) {
    // Implementation...
  },

  // Get latest anime/episodes
  async getLatest(page = 1) {
    // Implementation...
  },

  // Get episodes for an anime
  async getEpisodes(animeId, page = 1) {
    // Implementation...
  },

  // Get stream sources for an episode
  async getStreams(animeId, episodeId) {
    // Implementation...
  },

  // Get detailed anime information
  async getAnimeDetails(animeId) {
    // Implementation...
  },

  // Called when the plugin is unloaded
  async shutdown() {
    // Cleanup...
  }
}
```

## Plugin Types

### Media Provider

Media providers fetch anime listings, episodes, and metadata from websites like aniworld.to, s.to, etc.

Capabilities:
- `search` - Search for anime by title
- `getPopular` - Get popular anime list
- `getLatest` - Get latest episodes/anime
- `getEpisodes` - Get episode list for an anime
- `getStreams` - Get stream sources for an episode
- `getAnimeDetails` - Get detailed anime information

### Stream Provider

Stream providers extract direct video URLs from hoster websites like Voe, Vidoza, etc.

Capabilities:
- `extractStream` - Extract direct stream URL from hoster page
- `getHosterInfo` - Get information about a hoster

## Web Scraping Features

### HTTP Client

The plugin context provides an HTTP client for making requests:

```javascript
// Simple GET request
const response = await context.http.get('https://example.com/page')

// GET with options
const response = await context.http.get('https://example.com/api', {
  headers: {
    'Accept': 'application/json'
  },
  timeout: 60000
})

// POST request
const response = await context.http.post('https://example.com/api', {
  data: { key: 'value' }
})

// Response object
{
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'text/html' },
  body: '<html>...</html>',
  ok: true,
  url: 'https://example.com/page'
}
```

### HTML Parser

Built-in HTML parsing utilities for extracting data:

```javascript
const html = context.html

// Extract text by CSS selector
const titles = html.extractText(response.body, '.anime-title')

// Extract attribute values
const links = html.extractAttribute(response.body, 'a', 'href')
const images = html.extractAttribute(response.body, 'img', 'src')

// Extract by class name
const cards = html.extractByClass(response.body, 'anime-card')

// Extract by ID
const content = html.extractById(response.body, 'main-content')

// Decode HTML entities
const text = html.decodeEntities('&amp;lt;Hello&amp;gt;')

// Extract JSON from script tag
const data = html.extractJsonFromScript(response.body, 'window.__DATA__')
```

### Storage

Plugins can store data locally:

```javascript
const storage = context.storage

// Store a value
storage.set('lastSearch', 'naruto')

// Get a value
const value = storage.get('lastSearch', 'default')

// Remove a value
storage.remove('lastSearch')

// Clear all plugin storage
storage.clear()
```

## Return Types

### PopulatedAnime

```typescript
interface PopulatedAnime {
  id: string;              // Unique identifier
  title: string;           // Anime title
  altTitles?: string[];    // Alternative titles
  cover?: string;          // Cover image URL
  banner?: string;         // Banner image URL
  description?: string;    // Synopsis
  anilistId?: number;      // AniList ID
  malId?: number;          // MyAnimeList ID
  status?: string;         // AIRING, FINISHED, etc.
  episodeCount?: number;   // Total episodes
  genres?: string[];       // Genre list
  year?: number;           // Release year
  rating?: number;         // Rating (0-100)
  mediaType?: string;      // TV, MOVIE, OVA, etc.
  isAiring?: boolean;      // Currently airing
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
  format: string;          // m3u8, mp4, mkv, webm, torrent
  quality: string;         // 1080p, 720p, 480p, etc.
  anime4kSupport?: boolean; // Supports Anime4K upscaling
  isDefault?: boolean;     // Default source
  server?: string;         // Server name
  headers?: Record<string, string>; // Required headers
}
```

## Supported Formats

- `m3u8` - HLS streaming
- `mp4` - Direct MP4 files
- `mkv` - Matroska format
- `webm` - WebM format
- `torrent` - Torrent magnet links

## Loading Plugins

Plugins can be loaded programmatically:

```javascript
import { jsPluginManager } from './plugins'

// Load a plugin with manifest and code
const result = await jsPluginManager.loadPlugin(manifest, pluginCode)

if (result.success) {
  console.log(`Plugin ${result.pluginId} loaded successfully`)
}

// Get all loaded plugins
const plugins = jsPluginManager.getAllPlugins()

// Use a plugin
const plugin = await jsPluginManager.getPlugin('my-provider')
const results = await plugin.search('naruto')
```

## Security Considerations

- Plugins run in a sandboxed environment
- All network requests go through Tauri's HTTP plugin
- Plugins can only access their own local storage
- No access to the file system except through approved APIs
- Rate limiting is enforced to prevent abuse
