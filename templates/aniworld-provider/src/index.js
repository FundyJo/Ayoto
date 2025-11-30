/**
 * Aniworld.to Media Provider Plugin
 * 
 * A media provider plugin for aniworld.to that allows searching
 * for anime series and retrieving episode information.
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

/**
 * Plugin implementation for Aniworld.to
 */
const plugin = {
  // HTTP client for making requests
  http: null,
  // HTML parser utilities
  html: null,
  // Plugin storage
  storage: null,
  // Base URL for aniworld.to
  baseUrl: 'https://aniworld.to',

  /**
   * Initialize the plugin
   * Called when the plugin is first loaded
   * 
   * @param {Object} context - Plugin context with http, html, storage
   */
  async init(context) {
    this.http = context.http;
    // Note: We use custom HTML parsing methods (_parseEpisodeList, _parseAnimeDetails)
    // instead of context.html because aniworld.to's structure requires specific patterns
    // and we need German-specific HTML entity support (ü, ö, ä, etc.)
    this.html = context.html;
    this.storage = context.storage;
    
    console.log('Aniworld.to Media Provider initialized');
  },

  /**
   * Search for anime by query using aniworld.to AJAX search API
   * 
   * API Endpoint: https://aniworld.to/ajax/seriesSearch?keyword={query}
   * 
   * Returns JSON array with results:
   * {
   *   "name": "The Misfit of Demon King Academy",
   *   "link": "the-misfit-of-demon-king-academy",
   *   "description": "Anos, der Dämonenkönig...",
   *   "cover": "/public/img/cover/..._150x225.jpg",
   *   "productionYear": "(2020 - 2024)"
   * }
   * 
   * @param {string} query - Search query
   * @param {number} page - Page number (1-based), not used by aniworld API
   * @returns {Promise<Object>} Paginated search results
   */
  async search(query, page = 1) {
    try {
      if (!query || query.trim().length === 0) {
        return {
          results: [],
          hasNextPage: false,
          currentPage: page
        };
      }

      const url = `${this.baseUrl}/ajax/seriesSearch?keyword=${encodeURIComponent(query)}`;
      
      const response = await this.http.get(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Check for network error (status 0 indicates connection failure)
        if (response.status === 0) {
          throw new Error(`Network error: ${response.error || 'Unable to connect to aniworld.to'}`);
        }
        throw new Error(`Search failed: HTTP ${response.status} ${response.statusText || ''}`);
      }
      
      // Parse JSON response from aniworld API
      let searchData;
      try {
        searchData = JSON.parse(response.body);
      } catch (e) {
        throw new Error('Failed to parse search response as JSON');
      }
      
      // Handle case where API returns empty or invalid response
      if (!Array.isArray(searchData)) {
        return {
          results: [],
          hasNextPage: false,
          currentPage: page
        };
      }
      
      // Transform aniworld API response to standard plugin format
      const results = searchData.map((item) => ({
        // Use the link slug as the unique ID
        id: item.link || '',
        // Anime title
        title: this._decodeHtmlEntities(item.name || 'Unknown'),
        // Full cover image URL
        cover: item.cover ? `${this.baseUrl}${item.cover}` : null,
        // Description with HTML entities decoded
        description: item.description ? this._decodeHtmlEntities(item.description) : null,
        // Production year info
        year: item.productionYear || null,
        // Store the original link for navigation
        link: item.link ? `/anime/stream/${item.link}` : null
      }));
      
      // Aniworld API returns all results at once, no pagination
      return {
        results,
        hasNextPage: false,
        currentPage: page,
        totalResults: results.length
      };
    } catch (error) {
      console.error('Aniworld search error:', error);
      return {
        results: [],
        hasNextPage: false,
        currentPage: page,
        error: error.message
      };
    }
  },

  /**
   * Get episodes for an anime
   * 
   * @param {string} animeId - Anime ID (the link slug from search)
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated episode list
   */
  async getEpisodes(animeId, page = 1) {
    try {
      const url = `${this.baseUrl}/anime/stream/${animeId}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        // Check for network error (status 0 indicates connection failure)
        if (response.status === 0) {
          throw new Error(`Network error: ${response.error || 'Unable to connect to aniworld.to'}`);
        }
        throw new Error(`Failed to fetch episodes: HTTP ${response.status} ${response.statusText || ''}`);
      }
      
      // Parse episode list from HTML
      // Aniworld typically has seasons with episodes listed
      const episodes = this._parseEpisodeList(response.body);
      
      return {
        results: episodes,
        hasNextPage: false,
        currentPage: page
      };
    } catch (error) {
      console.error('Get episodes error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get stream sources for an episode
   * 
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID (format: season-episode, e.g., "1-1")
   * @returns {Promise<Array>} Array of stream sources
   */
  async getStreams(animeId, episodeId) {
    try {
      // Parse season and episode from episodeId
      const [season, episode] = episodeId.split('-');
      const url = `${this.baseUrl}/anime/stream/${animeId}/staffel-${season}/episode-${episode}`;
      
      const response = await this.http.get(url);
      
      if (!response.ok) {
        // Check for network error (status 0 indicates connection failure)
        if (response.status === 0) {
          throw new Error(`Network error: ${response.error || 'Unable to connect to aniworld.to'}`);
        }
        throw new Error(`Failed to fetch streams: HTTP ${response.status} ${response.statusText || ''}`);
      }
      
      // Parse stream sources from the episode page
      const sources = this._parseStreamSources(response.body);
      
      return sources;
    } catch (error) {
      console.error('Get streams error:', error);
      return [];
    }
  },

  /**
   * Get detailed anime information
   * 
   * @param {string} animeId - Anime ID (the link slug)
   * @returns {Promise<Object>} Anime details
   */
  async getAnimeDetails(animeId) {
    try {
      const url = `${this.baseUrl}/anime/stream/${animeId}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        // Check for network error (status 0 indicates connection failure)
        if (response.status === 0) {
          throw new Error(`Network error: ${response.error || 'Unable to connect to aniworld.to'}`);
        }
        throw new Error(`Failed to fetch anime details: HTTP ${response.status} ${response.statusText || ''}`);
      }
      
      // Parse anime details from the page
      return this._parseAnimeDetails(response.body, animeId);
    } catch (error) {
      console.error('Get anime details error:', error);
      return { id: animeId, title: 'Unknown', error: error.message };
    }
  },

  /**
   * Cleanup when plugin is unloaded
   */
  async shutdown() {
    console.log('Aniworld.to Media Provider shutdown');
  },

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Decode HTML entities in text
   * @param {string} text - Text with HTML entities
   * @returns {string} Decoded text
   * @private
   */
  _decodeHtmlEntities(text) {
    if (!text) return '';
    
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#039;': "'",
      '&nbsp;': ' ',
      '&ndash;': '–',
      '&mdash;': '—',
      '&hellip;': '…',
      '&#8230;': '…',
      '&uuml;': 'ü',
      '&ouml;': 'ö',
      '&auml;': 'ä',
      '&Uuml;': 'Ü',
      '&Ouml;': 'Ö',
      '&Auml;': 'Ä',
      '&szlig;': 'ß'
    };
    
    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
      result = result.replace(new RegExp(entity, 'g'), char);
    }
    
    // Handle numeric entities
    result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
    
    return result;
  },

  /**
   * Parse episode list from aniworld HTML page
   * @param {string} html - HTML content
   * @returns {Array} Episode list
   * @private
   */
  _parseEpisodeList(html) {
    const episodes = [];
    
    // Look for season and episode links
    // Aniworld uses structure like: /anime/stream/{animeId}/staffel-{season}/episode-{episode}
    const episodeRegex = /staffel-(\d+)\/episode-(\d+)/gi;
    const matches = new Set();
    let match;
    
    while ((match = episodeRegex.exec(html)) !== null) {
      const key = `${match[1]}-${match[2]}`;
      if (!matches.has(key)) {
        matches.add(key);
        episodes.push({
          id: key,
          number: parseInt(match[2], 10),
          season: parseInt(match[1], 10),
          title: `Staffel ${match[1]} - Episode ${match[2]}`,
          thumbnail: null
        });
      }
    }
    
    // Sort by season then episode number
    episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.number - b.number;
    });
    
    return episodes;
  },

  /**
   * Parse stream sources from episode page
   * @param {string} html - HTML content
   * @returns {Array} Stream sources
   * @private
   */
  _parseStreamSources(html) {
    const sources = [];
    const addedUrls = new Set();
    
    // Look for hoster links in the page
    // Aniworld typically embeds video players from various hosters
    const hosterPatterns = [
      { name: 'VOE', pattern: /data-link-target="([^"]*voe[^"]*)"/gi },
      { name: 'Vidoza', pattern: /data-link-target="([^"]*vidoza[^"]*)"/gi },
      { name: 'Streamtape', pattern: /data-link-target="([^"]*streamtape[^"]*)"/gi },
      { name: 'Doodstream', pattern: /data-link-target="([^"]*dood[^"]*)"/gi }
    ];
    
    for (const hoster of hosterPatterns) {
      // Use matchAll to capture all sources from the same hoster
      const matches = html.matchAll(hoster.pattern);
      for (const match of matches) {
        if (match[1] && !addedUrls.has(match[1])) {
          addedUrls.add(match[1]);
          sources.push({
            url: match[1],
            format: 'embed',
            quality: 'HD',
            server: hoster.name,
            isDefault: sources.length === 0
          });
        }
      }
    }
    
    // Also look for generic redirect links
    const redirectRegex = /redirect\/(\d+)/gi;
    const redirectMatches = html.matchAll(redirectRegex);
    for (const redirectMatch of redirectMatches) {
      const redirectUrl = `${this.baseUrl}/redirect/${redirectMatch[1]}`;
      if (!addedUrls.has(redirectUrl)) {
        addedUrls.add(redirectUrl);
        sources.push({
          url: redirectUrl,
          format: 'redirect',
          quality: 'Unknown',
          server: 'Redirect',
          isDefault: sources.length === 0
        });
      }
    }
    
    return sources;
  },

  /**
   * Parse anime details from page HTML
   * @param {string} html - HTML content
   * @param {string} animeId - Anime ID
   * @returns {Object} Anime details
   * @private
   */
  _parseAnimeDetails(html, animeId) {
    // Extract title
    let title = 'Unknown';
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (titleMatch) {
      title = this._decodeHtmlEntities(titleMatch[1].trim());
    }
    
    // Extract description
    let description = null;
    const descMatch = html.match(/<p[^>]*class="[^"]*seri_des[^"]*"[^>]*>([^<]+)/i);
    if (descMatch) {
      description = this._decodeHtmlEntities(descMatch[1].trim());
    }
    
    // Extract cover image
    let cover = null;
    const coverMatch = html.match(/<img[^>]*src="([^"]*cover[^"]*)"[^>]*>/i);
    if (coverMatch) {
      cover = coverMatch[1].startsWith('http') ? coverMatch[1] : `${this.baseUrl}${coverMatch[1]}`;
    }
    
    // Extract genres
    const genres = [];
    const genreMatches = html.matchAll(/genre\/[^"]*">([^<]+)<\/a>/gi);
    for (const gMatch of genreMatches) {
      genres.push(this._decodeHtmlEntities(gMatch[1].trim()));
    }
    
    // Count seasons
    const seasonMatches = html.match(/staffel-(\d+)/gi) || [];
    const seasons = [...new Set(seasonMatches.map(s => parseInt(s.replace('staffel-', ''), 10)))];
    const seasonCount = seasons.length > 0 ? Math.max(...seasons) : 0;
    
    return {
      id: animeId,
      title,
      altTitles: [],
      cover,
      banner: null,
      description,
      genres,
      status: null,
      year: null,
      seasonCount,
      episodeCount: null,
      rating: null,
      anilistId: null,
      malId: null
    };
  }
};

// Export the plugin
module.exports = plugin;
