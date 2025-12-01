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

### Get Anime Details Example

```javascript
// Get detailed anime information
const details = await plugin.getAnimeDetails('dad-is-a-hero-mom-is-a-spirit-im-a-reincarnator');

// Details format:
{
  id: "dad-is-a-hero-mom-is-a-spirit-im-a-reincarnator",
  title: "Dad is a Hero, Mom is a Spirit, I'm a Reincarnator",
  altTitles: [
    "Reincarnated as the Daughter of the Legendary Hero and the Queen of Spirits",
    "Chichi wa Eiyū, Haha wa Seirei, Musume no Watashi wa Tenseisha",
    // ... more alternative titles
  ],
  cover: "https://aniworld.to/public/img/cover/..._220x330.png",
  banner: "https://aniworld.to/public/img/cover/..._800x300.png",
  description: "Ellen ist ein junges Mädchen, das aus dem modernen Japan...",
  genres: ["Komödie", "EngSub", "Fantasy", "GerSub"],
  directors: [],
  actors: ["深川芹亜", "Kazuyuki Okitsu", "Mai Nakahara"],
  producers: ["KADOKAWA", "J.C.STAFF"],
  countries: ["Japan"],
  status: "Ongoing",
  startYear: 2025,
  endYear: "Ongoing",
  year: 2025,
  fskRating: 12,
  imdbId: "tt32777700",
  imdbLink: "https://www.imdb.com/title/tt32777700",
  rating: 4,
  ratingCount: 444,
  ratingMax: 5,
  trailerUrl: "https://hahanoha-anime.com",
  seasons: [
    {
      seasonNumber: 1,
      title: "Staffel 1",
      isMovies: false,
      link: "/anime/stream/dad-is-a-hero-mom-is-a-spirit-im-a-reincarnator/staffel-1",
      episodeCount: 5,
      episodes: [
        {
          episodeNumber: 1,
          id: "1-1",
          title: "Episode 1",
          link: "/anime/stream/dad-is-a-hero-mom-is-a-spirit-im-a-reincarnator/staffel-1/episode-1"
        },
        // ... more episodes
      ]
    }
  ],
  seasonCount: 1,
  episodeCount: 5,
  hasMovies: false,
  anilistId: null,
  malId: null
}
```

### Anime with Movies Example

Some anime have movies in addition to regular seasons:

```javascript
const details = await plugin.getAnimeDetails('one-punch-man');

// If the anime has movies, they appear in the seasons array with isMovies: true
{
  // ...
  seasons: [
    {
      seasonNumber: 0,
      title: "Filme",
      isMovies: true,
      link: "/anime/stream/one-punch-man/filme",
      episodeCount: 2,
      episodes: [...]
    },
    {
      seasonNumber: 1,
      title: "Staffel 1",
      isMovies: false,
      // ...
    },
    // ... more seasons
  ],
  hasMovies: true,
  // ...
}
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
- For movies, episode IDs use the format `filme-episode` (e.g., "filme-1" for Film 1)
- Stream sources may include various hosters (VOE, Vidoza, Streamtape, etc.)
- Anime details include rich metadata parsed from the HTML:
  - Alternative titles (data-alternativetitles)
  - Full description (data-full-description)
  - Cast info (actors, directors, producers)
  - Country of origin
  - FSK age rating
  - IMDB ID and link
  - Aggregate user rating
  - Trailer URL
  - Complete season and episode structure

## License

MIT
