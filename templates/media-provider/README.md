# Media Provider Plugin Template

This is a template for creating ZPE (Zanshin Plugin Extension) media provider plugins for Ayoto.

## Description

Media provider plugins supply anime/series search and listing functionality from streaming sites. This template demonstrates a complete implementation with multiple source files for better code organization.

## Structure

```
media-provider/
├── manifest.json      # Plugin metadata and configuration
├── icon.png           # Plugin icon (128x128 PNG recommended)
├── README.md          # This documentation file
└── src/
    ├── index.js       # Main plugin entry point
    ├── api.js         # API/HTTP request handling
    ├── parser.js      # HTML/JSON parsing logic
    └── utils.js       # Utility functions
```

## Getting Started

1. **Copy this template** to create your own plugin:
   ```bash
   cp -r templates/media-provider my-media-provider
   cd my-media-provider
   ```

2. **Edit `manifest.json`** with your plugin information:
   - Change `id` to a unique identifier (e.g., "my-anime-site")
   - Update `name`, `description`, and `author`
   - Set appropriate `permissions` and `capabilities`
   - Configure `security.allowedDomains` for your data source
   - Update `config.baseUrl` to your target site

3. **Add your plugin icon**:
   - Replace `icon.png` with your own icon
   - Recommended size: 128x128 pixels
   - Supported formats: PNG, JPG, ICO

4. **Implement your plugin logic** in the `src/` directory:
   - `index.js` - Main entry point with all plugin methods
   - `api.js` - HTTP requests to your data source
   - `parser.js` - Parse HTML/JSON responses into structured data
   - `utils.js` - Helper functions (caching, formatting, etc.)

5. **Build the plugin** using the build script:
   ```bash
   # Linux/macOS
   ./scripts/build-plugin.sh ./my-media-provider
   
   # Windows
   scripts\build-plugin.bat .\my-media-provider
   
   # Cross-platform (Node.js)
   node scripts/build-plugin.mjs ./my-media-provider
   ```

## Capabilities

Media provider plugins can implement the following methods:

| Method | Description |
|--------|-------------|
| `search(query, page)` | Search for anime by title |
| `getPopular(page)` | Get popular anime list |
| `getLatest(page)` | Get latest episodes/anime |
| `getEpisodes(animeId, page)` | Get episode list for an anime |
| `getStreams(animeId, episodeId)` | Get stream sources for an episode |
| `getAnimeDetails(animeId)` | Get detailed anime information |

## Return Types

### Search/List Results
```javascript
{
  results: [
    {
      id: 'anime-123',
      title: 'Anime Title',
      cover: 'https://example.com/cover.jpg',
      description: 'Synopsis...'
    }
  ],
  hasNextPage: true,
  currentPage: 1
}
```

### Anime Details
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

### Episode List
```javascript
{
  results: [
    {
      id: 'ep-1',
      number: 1,
      title: 'Episode Title',
      thumbnail: 'https://example.com/thumb.jpg',
      duration: 1440,
      airDate: '2024-01-15'
    }
  ],
  hasNextPage: false,
  currentPage: 1
}
```

### Stream Sources
```javascript
[
  {
    url: 'https://example.com/video.m3u8',
    format: 'm3u8',
    quality: '1080p',
    server: 'Main',
    isDefault: true,
    headers: { 'Referer': 'https://example.com' }
  }
]
```

## Permissions

Declare only the permissions your plugin needs:

- `network:http` - Make HTTP/HTTPS requests
- `network:websocket` - WebSocket connections (if needed)
- `storage:local` - Persistent local storage
- `storage:cache` - Temporary cache storage
- `ui:notification` - Show notifications (optional)

## Security Best Practices

1. **Declare minimal permissions** - Only request what you need
2. **Use domain allowlists** - Restrict network access in `security.allowedDomains`
3. **Don't store sensitive data** - Avoid storing credentials
4. **Handle errors gracefully** - Wrap API calls in try/catch
5. **Avoid obfuscation** - Keep code readable (obfuscated code may be flagged)

## License

MIT - Feel free to modify and share.
