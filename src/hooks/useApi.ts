import {Anime} from '../index.ts';
// @ts-ignore
import {Aniworld} from './scraper/aniworld.js';

// Cache key generator
// Function to generate cache key from arguments
function generateCacheKey(...args: string[]) {
  return args.join('-');
}

interface CacheItem {
  value: any; // Replace 'any' with a more specific type if possible
  timestamp: number;
}

// Session storage cache creation
// Function to create a cache in session storage
function createOptimizedSessionStorageCache(
  maxSize: number,
  maxAge: number,
  cacheKey: string,
) {
  const cache = new Map<string, CacheItem>(
    JSON.parse(sessionStorage.getItem(cacheKey) || '[]'),
  );
  const keys = new Set<string>(cache.keys());

  function isItemExpired(item: CacheItem) {
    return Date.now() - item.timestamp > maxAge;
  }

  function updateSessionStorage() {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify(Array.from(cache.entries())),
    );
  }

  return {
    get(key: string) {
      if (cache.has(key)) {
        const item = cache.get(key);
        if (!isItemExpired(item!)) {
          keys.delete(key);
          keys.add(key);
          return item!.value;
        }
        cache.delete(key);
        keys.delete(key);
      }
      return undefined;
    },
    set(key: string, value: any) {
      if (cache.size >= maxSize) {
        const oldestKey = keys.values().next().value;
        if (oldestKey !== undefined) { // Sicherstellen, dass oldestKey definiert ist
          cache.delete(oldestKey);
          keys.delete(oldestKey);
        }
      }
      keys.add(key);
      cache.set(key, { value, timestamp: Date.now() });
      updateSessionStorage();
    }
  };
}

// Constants for cache configuration
// Cache size and max age constants
const CACHE_SIZE = 20;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Factory function for cache creation
// Function to create cache with given cache key
function createCache(cacheKey: string) {
  return createOptimizedSessionStorageCache(
    CACHE_SIZE,
    CACHE_MAX_AGE,
    cacheKey,
  );
}

interface FetchOptions {
    type?: string;
    season?: string;
    format?: string;
    sort?: string[];
    genres?: string[];
    id?: string;
    year?: string;
    status?: string;
}

export async function fetchNavbarSearch(searchQuery = '') {
    if (!searchQuery) {
        throw new Error('Search query is required.');
    }

    try {
        const response = await Aniworld.search(searchQuery);

        // Wenn die Antwort ein gültiges Array ist, gebe es als Array zurück, ansonsten als leeres Array
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Fehler bei fetchNavbarSearch: ${error.message}`);
        } else {
            console.error('Fehler bei fetchNavbarSearch: Unbekannter Fehler', error);
        }
        throw new Error('Fehler beim Abrufen der Suchergebnisse.');
    }
}

export async function fetchPopularAnime(
    page = 1,
    perpage = 18,
): Promise<any> {
    const cacheKey = generateCacheKey('popular-anime', page.toString(), perpage.toString());
    const cache = createCache(cacheKey);

    // Überprüfen, ob die Daten im Cache vorhanden sind und nicht abgelaufen sind
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log('Daten aus dem Cache verwendet');
        return cachedData;
    }

    // Falls nicht im Cache, hole die Daten von der API
    try {
        const response = await Aniworld.getPopularAnimes(page, perpage);

        // Überprüfen der Antwortstruktur
        if (
            typeof response === 'object' &&
            'currentPage' in response &&
            'hasNextPage' in response &&
            'totalPages' in response &&
            'totalResults' in response &&
            Array.isArray(response.results)
        ) {
            // Daten im Cache speichern, damit sie später verwendet werden können
            cache.set(cacheKey, response);
            return response;
        } else {
            throw new Error('Unerwartete Antwortstruktur von der API');
        }
    } catch (error) {
        // Fehlerbehandlung
        if (error instanceof Error) {
            console.error(`Fehler bei fetchPopularAnime: ${error.message}`);
            console.error(error.stack);
        } else {
            console.error('Fehler bei fetchPopularAnime: Unbekannter Fehler', error);
        }
        throw new Error('Fehler beim Abrufen der Suchergebnisse.');
    }
}


export async function fetchPopularSeries(
    page = 1,
    perpage = 18,
): Promise<any> {
    try {
        const response = await Aniworld.getPopularAnimes(page, perpage);

        // Debugging: Logge die Antwort
        console.log('JSON Response: ', JSON.stringify(response.data));

        // Überprüfen, ob die Daten den Typ 'Paging' erfüllen
        if (
            typeof response.data === 'object' &&
            'currentPage' in response.data &&
            'hasNextPage' in response.data &&
            'totalPages' in response.data &&
            'totalResults' in response.data &&
            Array.isArray(response.data.results)
        ) {
            return response.data;
        } else {
            throw new Error('Unerwartete Antwortstruktur von der API');
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Fehler bei fetchPopularAnime: ${error.message}`);
        } else {
            console.error('Fehler bei fetchPopularAnime: Unbekannter Fehler', error);
        }
        throw new Error('Fehler beim Abrufen der Suchergebnisse.');
    }
}

// Function to fetch anime data
export async function fetchAdvancedSearch(
    searchQuery: string = '',
    page: number = 1,
    perPage: number = 20,
    options: FetchOptions = {},
) {
    const queryParams = new URLSearchParams({
        ...(searchQuery && {query: searchQuery}),
        page: page.toString(),
        perPage: perPage.toString(),
        type: options.type ?? 'ANIME',
        ...(options.season && {season: options.season}),
        ...(options.format && {format: options.format}),
        ...(options.id && {id: options.id}),
        ...(options.year && {year: options.year}),
        ...(options.status && {status: options.status}),
        ...(options.sort && {sort: JSON.stringify(options.sort)}),
    });

    if (options.genres && options.genres.length > 0) {
        // Correctly encode genres as a JSON array
        queryParams.set('genres', JSON.stringify(options.genres));
    }
    //const url = `${BASE_URL}meta/anilist/advanced-search?${queryParams.toString()}`;
    //const cacheKey = generateCacheKey('advancedSearch', queryParams.toString());

    //return fetchFromProxy(url, advancedSearchCache, cacheKey);
    return {};
}

// Fetch Anime DATA Function
export async function fetchAnimeData(
    animeId: string,
    provider: string = 'gogoanime',
) {
    //const params = new URLSearchParams({ provider });
    //const url = `${BASE_URL}meta/anilist/data/${animeId}?${params.toString()}`;
    //const cacheKey = generateCacheKey('animeData', animeId, provider);
    //
    //return fetchFromProxy(url, animeDataCache, cacheKey);
    console.log(animeId, provider);
    return {};
}

export async function fetchEpisodeLink(
    animeId: string,
    season: string,
    episode: string,
    sourceType: string, // Quelle (z.B. VOE, Doodstream, Vidoza, oder "default")
    language: string,   // Sprache (z.B. ger-dub, eng-sub)
): Promise<string> {
    try {
        // Wenn der sourceType "default" ist, setze ihn auf "VOE"
        if (sourceType === "default") {
            sourceType = "VOE";
        }

        const response = await fetchEpisodeLinksRaw(animeId, season, episode);
        console.log(response)

        // Prüfe, ob die Quellen (`sources`) vorhanden sind
        const sources = response.sources;
        console.log(sources)

        // Finde die Quelle mit der angegebenen Sprache und Quelle (sourceType)
        const matchingSource = sources.find(
            (source: { language: string; hoster: string; url: string }) =>
                source.language === language && source.hoster === sourceType
        );

        if (!matchingSource) {
            // Falls keine passende Quelle gefunden wurde, Fallback auf die erste Quelle
            console.warn('No matching source found. Falling back to the first available source.');
            return sources[0]?.url || '';
        }

        // Rückgabe der URL der gefundenen Quelle
        return matchingSource.url;
    } catch (error) {
        console.error('Error fetching episode link:', error);
        throw error; // Fehler erneut werfen, um den Aufrufer zu benachrichtigen
    }
}

export function fetchEpisodeLinksRaw(
    animeId: string,
    season: string,
    episode: string,
): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            // Entferne "season-" und "episode-" falls vorhanden
            const cleanSeason = season.startsWith('season-')
                ? season.replace('season-', '')
                : season;
            const cleanEpisode = episode.startsWith('episode-')
                ? episode.replace('episode-', '')
                : episode;

            const response = await Aniworld.fetchEpisodeLinks(animeId, cleanSeason, cleanEpisode)
            if (response.sources) {
                resolve(response); // Erfolgreiche Antwort wird zurückgegeben
            } else {
                console.error('Invalid response structure from API');
                resolve(''); // Wenn keine gültige Antwort vorhanden ist
            }
        } catch (error) {
            console.error('Error fetching episode links:', error);
            reject(error); // Fehler zurückgeben, falls der Abruf fehlschlägt
        }
    });
}


export async function fetchEpisodes(animeId: string): Promise<any> {
    if (!animeId) {
        throw new Error('Anime ID is required.');
    }

  return await Aniworld.fetchEpisodes(animeId);
}

export async function fetchAnimeInfo(animeId: string): Promise<Anime> {
    if (!animeId) {
        throw new Error('Anime ID is required.');
    }

    return await Aniworld.fetchAnimeData(animeId);
}

export async function fetchAnimeEmbeddedEpisodes(episodeId: string) {
    //const url = `${BASE_URL}meta/anilist/servers/${episodeId}`;
    //const cacheKey = generateCacheKey('animeEmbeddedServers', episodeId);
//
    //return fetchFromProxy(url, fetchAnimeEmbeddedEpisodesCache, cacheKey);
    console.log(episodeId);
    return {};
}

// Function to fetch skip times for an anime episode
//interface FetchSkipTimesParams {
//  malId: string;
//  episodeNumber: string;
//  episodeLength?: string;
//}

// Function to fetch skip times for an anime episode
//export async function fetchSkipTimes({
//  malId,
//  episodeNumber,
//  episodeLength = '0',
//}: FetchSkipTimesParams) {
//  // Constructing the URL with query parameters
//  const types = ['ed', 'mixed-ed', 'mixed-op', 'op', 'recap'];
//  const url = new URL(`${SKIP_TIMES}v2/skip-times/${malId}/${episodeNumber}`);
//  url.searchParams.append('episodeLength', episodeLength.toString());
//  types.forEach((type) => url.searchParams.append('types[]', type));
//
//  const cacheKey = generateCacheKey(
//    'skipTimes',
//    malId,
//    episodeNumber,
//    episodeLength || '',
//  );
//
//  // Use the fetchFromProxy function to make the request and handle caching
//  return fetchFromProxy(url.toString(), createCache('SkipTimes'), cacheKey);
//}
