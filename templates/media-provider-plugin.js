/**
 * Example ZPE Media Provider Plugin
 * 
 * This template demonstrates how to create a media provider plugin
 * that can search for anime, fetch episodes, and provide stream sources.
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

/**
 * Plugin implementation
 * All methods receive the plugin context during initialization
 */
const plugin = {
  // HTTP client for making requests
  http: null,
  // HTML parser utilities
  html: null,
  // Plugin storage
  storage: null,
  // Base URL for the provider
  baseUrl: 'https://api.example.com',

  /**
   * Initialize the plugin
   * Called when the plugin is first loaded
   * 
   * @param {Object} context - Plugin context with http, html, storage
   */
  async init(context) {
    this.http = context.http;
    this.html = context.html;
    this.storage = context.storage;
    
    // Load configuration from storage if available
    const savedConfig = this.storage.get('config', null);
    if (savedConfig && savedConfig.baseUrl) {
      this.baseUrl = savedConfig.baseUrl;
    }
    
    console.log('Example Media Provider initialized');
  },

  /**
   * Search for anime by query
   * 
   * @param {string} query - Search query
   * @param {number} page - Page number (1-based)
   * @returns {Promise<Object>} Paginated search results
   */
  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      // Parse HTML response
      // This is an example - adapt to your actual provider's HTML structure
      const titles = this.html.extractText(response.body, '.anime-title');
      const covers = this.html.extractAttribute(response.body, 'img', 'data-src');
      const links = this.html.extractAttribute(response.body, 'a.anime-card', 'href');
      const descriptions = this.html.extractText(response.body, '.anime-description');
      
      const results = titles.map((title, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        title: title,
        cover: covers[index] || null,
        description: descriptions[index] || null
      }));
      
      // Check if there's a next page
      const hasNextPage = this.html.extractByClass(response.body, 'pagination-next').length > 0;
      
      return {
        results,
        hasNextPage,
        currentPage: page
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        hasNextPage: false,
        currentPage: page,
        error: error.message
      };
    }
  },

  /**
   * Get popular anime
   * 
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated results
   */
  async getPopular(page = 1) {
    try {
      // Check cache first (cache for 1 hour)
      const cacheKey = `popular_${page}`;
      const cached = this.storage.get(cacheKey, null);
      const cacheTime = this.storage.get(`${cacheKey}_time`, 0);
      
      if (cached && (Date.now() - cacheTime) < 3600000) {
        return cached;
      }
      
      const url = `${this.baseUrl}/popular?page=${page}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch popular: ${response.status}`);
      }
      
      // Parse and build results (similar to search)
      const titles = this.html.extractText(response.body, '.anime-title');
      const covers = this.html.extractAttribute(response.body, 'img', 'data-src');
      const links = this.html.extractAttribute(response.body, 'a.anime-card', 'href');
      
      const results = titles.map((title, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        title: title,
        cover: covers[index] || null
      }));
      
      const hasNextPage = this.html.extractByClass(response.body, 'pagination-next').length > 0;
      
      const result = {
        results,
        hasNextPage,
        currentPage: page
      };
      
      // Cache the result
      this.storage.set(cacheKey, result);
      this.storage.set(`${cacheKey}_time`, Date.now());
      
      return result;
    } catch (error) {
      console.error('Get popular error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get latest anime/episodes
   * 
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated results
   */
  async getLatest(page = 1) {
    try {
      const url = `${this.baseUrl}/latest?page=${page}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch latest: ${response.status}`);
      }
      
      const titles = this.html.extractText(response.body, '.anime-title');
      const covers = this.html.extractAttribute(response.body, 'img', 'data-src');
      const links = this.html.extractAttribute(response.body, 'a.anime-card', 'href');
      const episodes = this.html.extractText(response.body, '.episode-number');
      
      const results = titles.map((title, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        title: title,
        cover: covers[index] || null,
        latestEpisode: episodes[index] || null
      }));
      
      const hasNextPage = this.html.extractByClass(response.body, 'pagination-next').length > 0;
      
      return {
        results,
        hasNextPage,
        currentPage: page
      };
    } catch (error) {
      console.error('Get latest error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get episodes for an anime
   * 
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated episode list
   */
  async getEpisodes(animeId, page = 1) {
    try {
      const url = `${this.baseUrl}/anime/${animeId}/episodes?page=${page}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch episodes: ${response.status}`);
      }
      
      // Extract episode data
      const numbers = this.html.extractText(response.body, '.episode-number');
      const titles = this.html.extractText(response.body, '.episode-title');
      const thumbnails = this.html.extractAttribute(response.body, '.episode-thumb img', 'src');
      const links = this.html.extractAttribute(response.body, 'a.episode-link', 'href');
      
      const results = numbers.map((num, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        number: parseInt(num, 10) || index + 1,
        title: titles[index] || `Episode ${num}`,
        thumbnail: thumbnails[index] || null
      }));
      
      const hasNextPage = this.html.extractByClass(response.body, 'pagination-next').length > 0;
      
      return {
        results,
        hasNextPage,
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
   * @param {string} episodeId - Episode ID
   * @returns {Promise<Array>} Array of stream sources
   */
  async getStreams(animeId, episodeId) {
    try {
      const url = `${this.baseUrl}/anime/${animeId}/episode/${episodeId}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch streams: ${response.status}`);
      }
      
      // Extract stream sources from the page
      // This varies greatly by provider - adapt as needed
      const sources = [];
      
      // Try to find embedded player data
      const playerData = this.html.extractJsonFromScript(response.body, 'playerData');
      
      if (playerData && playerData.sources) {
        for (const source of playerData.sources) {
          sources.push({
            url: source.file || source.url,
            format: this._detectFormat(source.file || source.url),
            quality: source.label || source.quality || 'Default',
            server: source.server || 'Main',
            isDefault: source.default || false
          });
        }
      }
      
      // Also check for iframe embeds
      const iframes = this.html.extractAttribute(response.body, 'iframe', 'src');
      for (const iframe of iframes) {
        if (this._isVideoEmbed(iframe)) {
          sources.push({
            url: iframe,
            format: 'embed',
            quality: 'Unknown',
            server: this._extractServerName(iframe)
          });
        }
      }
      
      // Sort by quality (1080p > 720p > etc)
      sources.sort((a, b) => this._qualityScore(b.quality) - this._qualityScore(a.quality));
      
      // Mark first as default if none specified
      if (sources.length > 0 && !sources.some(s => s.isDefault)) {
        sources[0].isDefault = true;
      }
      
      return sources;
    } catch (error) {
      console.error('Get streams error:', error);
      return [];
    }
  },

  /**
   * Get detailed anime information
   * 
   * @param {string} animeId - Anime ID
   * @returns {Promise<Object>} Anime details
   */
  async getAnimeDetails(animeId) {
    try {
      const url = `${this.baseUrl}/anime/${animeId}`;
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch anime details: ${response.status}`);
      }
      
      // Extract detailed information
      const title = this.html.extractText(response.body, 'h1.anime-title')[0];
      const altTitles = this.html.extractText(response.body, '.alt-title');
      const cover = this.html.extractAttribute(response.body, '.anime-cover img', 'src')[0];
      const banner = this.html.extractAttribute(response.body, '.anime-banner', 'style')[0];
      const description = this.html.extractText(response.body, '.anime-description')[0];
      const genres = this.html.extractText(response.body, '.genre-tag');
      const status = this.html.extractText(response.body, '.anime-status')[0];
      const year = this.html.extractText(response.body, '.anime-year')[0];
      const episodeCount = this.html.extractText(response.body, '.episode-count')[0];
      const rating = this.html.extractText(response.body, '.anime-rating')[0];
      
      // Try to extract AniList/MAL IDs if available
      const anilistId = this._extractExternalId(response.body, 'anilist');
      const malId = this._extractExternalId(response.body, 'myanimelist');
      
      return {
        id: animeId,
        title: title || 'Unknown',
        altTitles: altTitles || [],
        cover: cover || null,
        banner: this._extractBannerUrl(banner),
        description: description ? this.html.decodeEntities(description) : null,
        genres: genres || [],
        status: status || null,
        year: year ? parseInt(year, 10) : null,
        episodeCount: episodeCount ? parseInt(episodeCount, 10) : null,
        rating: rating ? parseFloat(rating) : null,
        anilistId: anilistId,
        malId: malId
      };
    } catch (error) {
      console.error('Get anime details error:', error);
      return { id: animeId, title: 'Unknown', error: error.message };
    }
  },

  /**
   * Cleanup when plugin is unloaded
   */
  async shutdown() {
    // Clear any intervals/timeouts
    // Save any pending data
    console.log('Example Media Provider shutdown');
  },

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract ID from URL
   * @private
   */
  _extractIdFromUrl(url) {
    // Adapt this regex to match your provider's URL structure
    const match = url.match(/\/anime\/([^/]+)/);
    return match ? match[1] : url.split('/').pop() || '';
  },

  /**
   * Detect stream format from URL
   * @private
   */
  _detectFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('/hls/')) return 'm3u8';
    if (lower.includes('.mp4')) return 'mp4';
    if (lower.includes('.mkv')) return 'mkv';
    if (lower.includes('.webm')) return 'webm';
    if (lower.includes('magnet:')) return 'torrent';
    return 'mp4';
  },

  /**
   * Check if URL is a video embed
   * @private
   */
  _isVideoEmbed(url) {
    const videoHosts = ['vidstream', 'mp4upload', 'streamtape', 'doodstream', 'voe'];
    return videoHosts.some(host => url.toLowerCase().includes(host));
  },

  /**
   * Extract server name from embed URL
   * @private
   */
  _extractServerName(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
      return 'Unknown';
    }
  },

  /**
   * Get quality score for sorting
   * @private
   */
  _qualityScore(quality) {
    const scores = { '4k': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
    const q = String(quality).toLowerCase();
    for (const [key, score] of Object.entries(scores)) {
      if (q.includes(key)) return score;
    }
    return -1;
  },

  /**
   * Extract banner URL from style attribute
   * @private
   */
  _extractBannerUrl(style) {
    if (!style) return null;
    const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
    return match ? match[1] : null;
  },

  /**
   * Extract external site ID
   * @private
   */
  _extractExternalId(html, site) {
    const patterns = {
      anilist: /anilist\.co\/anime\/(\d+)/i,
      myanimelist: /myanimelist\.net\/anime\/(\d+)/i
    };
    const match = html.match(patterns[site]);
    return match ? parseInt(match[1], 10) : null;
  }
};

// Export the plugin
module.exports = plugin;
