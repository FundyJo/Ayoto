# Aniworld.to Media Provider Plugin

A media provider plugin for [aniworld.to](https://aniworld.to) - German anime streaming site.

## Features

- **Search**: Search for anime series using aniworld.to's AJAX API
- **Episodes**: Get episode lists for any series
- **Streams**: Extract streaming sources from episode pages
- **Details**: Fetch detailed anime information

## Search API

The plugin uses aniworld.to's AJAX search endpoint:

```
GET https://aniworld.to/ajax/seriesSearch?keyword={query}
```

### Response Format

The API returns a JSON array with the following structure:

```json
[
  {
    "name": "The Misfit of Demon King Academy",
    "link": "the-misfit-of-demon-king-academy",
    "description": "Anos, der Dämonenkönig der Tyrannei, hat unzählige Menschen...",
    "cover": "/public/img/cover/the-misfit-of-demon-king-academy-stream-cover-..._150x225.jpg",
    "productionYear": "(2020 - 2024)"
  }
]
```

## Capabilities

| Capability | Supported |
|------------|-----------|
| search | ✅ |
| getPopular | ❌ |
| getLatest | ❌ |
| getEpisodes | ✅ |
| getStreams | ✅ |
| getAnimeDetails | ✅ |

## Usage

### Search Example

```javascript
// Search for anime
const results = await plugin.search('naruto');

// Results format:
{
  results: [
    {
      id: "naruto",
      title: "Naruto",
      cover: "https://aniworld.to/public/img/cover/...",
      description: "...",
      year: "(2002 - 2007)",
      link: "/anime/stream/naruto"
    }
  ],
  hasNextPage: false,
  currentPage: 1,
  totalResults: 5
}
```

### Get Episodes Example

```javascript
// Get episodes for an anime (using the id/link from search)
const episodes = await plugin.getEpisodes('naruto');

// Episodes format:
{
  results: [
    {
      id: "1-1",
      number: 1,
      season: 1,
      title: "Staffel 1 - Episode 1",
      thumbnail: null
    }
  ],
  hasNextPage: false,
  currentPage: 1
}
```

### Get Streams Example

```javascript
// Get stream sources for an episode
const streams = await plugin.getStreams('naruto', '1-1');

// Streams format:
[
  {
    url: "https://voe.sx/...",
    format: "embed",
    quality: "HD",
    server: "VOE",
    isDefault: true
  }
]
```

## Installation

1. Build the plugin using the build script:
   ```bash
   node scripts/build-plugin.mjs ./templates/aniworld-provider
   ```

2. Load the generated `.zpe` file in Ayoto:
   - Go to Settings → Plugins
   - Click "Load Plugin"
   - Select the `.zpe` file

## Configuration

The plugin is configured via `manifest.json`:

```json
{
  "scrapingConfig": {
    "baseUrl": "https://aniworld.to",
    "rateLimitMs": 1000,
    "timeout": 30000
  }
}
```

## Notes

- Aniworld.to is a German anime streaming site
- The search API returns all results at once (no pagination)
- Episode IDs use the format `season-episode` (e.g., "1-1" for Season 1, Episode 1)
- Stream sources may include various hosters (VOE, Vidoza, Streamtape, etc.)

## License

MIT
