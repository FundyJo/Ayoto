/**
 * Media Provider Plugin - Parser Module
 * 
 * Handles parsing of HTML/JSON responses into structured data.
 * Separating parsing logic makes the code more maintainable.
 * 
 * @module parser
 * @version 1.0.0
 */

"use strict";

/**
 * Parser module for extracting data from responses
 */
const parser = {
  // HTML parser utility from plugin context
  html: null,

  /**
   * Initialize the parser module
   * @param {Object} context - Plugin context
   */
  init(context) {
    this.html = context.html;
  },

  // ==========================================================================
  // Anime Parsing
  // ==========================================================================

  /**
   * Parse search results from HTML
   * @param {string} htmlContent - HTML content
   * @returns {Array<Object>} Array of anime objects
   */
  parseSearchResults(htmlContent) {
    try {
      const titles = this.html.extractText(htmlContent, '.anime-title');
      const covers = this.html.extractAttribute(htmlContent, 'img.anime-cover', 'data-src');
      const links = this.html.extractAttribute(htmlContent, 'a.anime-card', 'href');
      const descriptions = this.html.extractText(htmlContent, '.anime-description');
      
      return titles.map((title, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        title: this.html.decodeEntities(title),
        cover: covers[index] || null,
        description: descriptions[index] ? this.html.decodeEntities(descriptions[index]) : null
      }));
    } catch (error) {
      console.error('Parse search results error:', error);
      return [];
    }
  },

  /**
   * Parse anime list (popular/latest)
   * @param {string} htmlContent - HTML content
   * @returns {Array<Object>} Array of anime objects
   */
  parseAnimeList(htmlContent) {
    try {
      const titles = this.html.extractText(htmlContent, '.anime-title');
      const covers = this.html.extractAttribute(htmlContent, 'img.anime-cover', 'data-src');
      const links = this.html.extractAttribute(htmlContent, 'a.anime-card', 'href');
      const latestEps = this.html.extractText(htmlContent, '.latest-episode');
      
      return titles.map((title, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        title: this.html.decodeEntities(title),
        cover: covers[index] || null,
        latestEpisode: latestEps[index] || null
      }));
    } catch (error) {
      console.error('Parse anime list error:', error);
      return [];
    }
  },

  /**
   * Parse detailed anime information
   * @param {string} htmlContent - HTML content
   * @param {string} animeId - Anime ID
   * @returns {Object} Anime details object
   */
  parseAnimeDetails(htmlContent, animeId) {
    try {
      const title = this.html.extractText(htmlContent, 'h1.anime-title')[0] || 'Unknown';
      const altTitles = this.html.extractText(htmlContent, '.alt-title');
      const cover = this.html.extractAttribute(htmlContent, '.anime-cover img', 'src')[0];
      const banner = this._extractBannerUrl(this.html.extractAttribute(htmlContent, '.anime-banner', 'style')[0]);
      const description = this.html.extractText(htmlContent, '.anime-description')[0];
      const genres = this.html.extractText(htmlContent, '.genre-tag');
      const status = this.html.extractText(htmlContent, '.anime-status')[0];
      const year = this.html.extractText(htmlContent, '.anime-year')[0];
      const episodeCount = this.html.extractText(htmlContent, '.episode-count')[0];
      const rating = this.html.extractText(htmlContent, '.anime-rating')[0];
      
      // Extract external IDs
      const anilistId = this._extractExternalId(htmlContent, 'anilist');
      const malId = this._extractExternalId(htmlContent, 'myanimelist');

      return {
        id: animeId,
        title: this.html.decodeEntities(title),
        altTitles: altTitles.map(t => this.html.decodeEntities(t)),
        cover: cover || null,
        banner: banner || null,
        description: description ? this.html.decodeEntities(description) : null,
        genres: genres || [],
        status: status || null,
        year: year ? parseInt(year, 10) : null,
        episodeCount: episodeCount ? parseInt(episodeCount, 10) : null,
        rating: rating ? parseFloat(rating) : null,
        anilistId,
        malId
      };
    } catch (error) {
      console.error('Parse anime details error:', error);
      return { id: animeId, title: 'Unknown', error: error.message };
    }
  },

  // ==========================================================================
  // Episode Parsing
  // ==========================================================================

  /**
   * Parse episode list
   * @param {string} htmlContent - HTML content
   * @returns {Array<Object>} Array of episode objects
   */
  parseEpisodeList(htmlContent) {
    try {
      const numbers = this.html.extractText(htmlContent, '.episode-number');
      const titles = this.html.extractText(htmlContent, '.episode-title');
      const thumbnails = this.html.extractAttribute(htmlContent, '.episode-thumb img', 'src');
      const links = this.html.extractAttribute(htmlContent, 'a.episode-link', 'href');
      const durations = this.html.extractText(htmlContent, '.episode-duration');
      const airDates = this.html.extractText(htmlContent, '.episode-date');
      
      return numbers.map((num, index) => ({
        id: this._extractIdFromUrl(links[index] || ''),
        number: parseInt(num, 10) || index + 1,
        title: titles[index] ? this.html.decodeEntities(titles[index]) : `Episode ${num}`,
        thumbnail: thumbnails[index] || null,
        duration: durations[index] ? this._parseDuration(durations[index]) : null,
        airDate: airDates[index] || null
      }));
    } catch (error) {
      console.error('Parse episode list error:', error);
      return [];
    }
  },

  // ==========================================================================
  // Stream Parsing
  // ==========================================================================

  /**
   * Parse stream sources from response
   * @param {string} htmlContent - HTML content
   * @returns {Array<Object>} Array of stream source objects
   */
  parseStreamSources(htmlContent) {
    try {
      const sources = [];
      
      // Try to find embedded player data (JSON)
      const playerData = this.html.extractJsonFromScript(htmlContent, 'playerData');
      
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
      const iframes = this.html.extractAttribute(htmlContent, 'iframe', 'src');
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
      
      // Also look for direct video sources
      const videoSrcs = this.html.extractAttribute(htmlContent, 'source', 'src');
      for (const src of videoSrcs) {
        if (src && !sources.some(s => s.url === src)) {
          sources.push({
            url: src,
            format: this._detectFormat(src),
            quality: 'Default',
            server: 'Direct'
          });
        }
      }
      
      // Sort by quality
      sources.sort((a, b) => this._qualityScore(b.quality) - this._qualityScore(a.quality));
      
      // Mark first as default if none specified
      if (sources.length > 0 && !sources.some(s => s.isDefault)) {
        sources[0].isDefault = true;
      }
      
      return sources;
    } catch (error) {
      console.error('Parse stream sources error:', error);
      return [];
    }
  },

  // ==========================================================================
  // Pagination
  // ==========================================================================

  /**
   * Check if there are more pages
   * @param {string} htmlContent - HTML content
   * @returns {boolean} True if next page exists
   */
  hasNextPage(htmlContent) {
    const nextPageElements = this.html.extractByClass(htmlContent, 'pagination-next');
    return nextPageElements.length > 0;
  },

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Extract ID from URL
   * @param {string} url - URL string
   * @returns {string} Extracted ID
   * @private
   */
  _extractIdFromUrl(url) {
    const match = url.match(/\/(?:anime|episode)\/([^/]+)/);
    return match ? match[1] : url.split('/').pop() || '';
  },

  /**
   * Extract banner URL from style attribute
   * @param {string} style - Style attribute value
   * @returns {string|null} Banner URL
   * @private
   */
  _extractBannerUrl(style) {
    if (!style) return null;
    const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    return match ? match[1] : null;
  },

  /**
   * Extract external site ID (AniList, MAL)
   * @param {string} html - HTML content
   * @param {string} site - Site name
   * @returns {number|null} External ID
   * @private
   */
  _extractExternalId(html, site) {
    const patterns = {
      anilist: /anilist\.co\/anime\/(\d+)/i,
      myanimelist: /myanimelist\.net\/anime\/(\d+)/i
    };
    const match = html.match(patterns[site]);
    return match ? parseInt(match[1], 10) : null;
  },

  /**
   * Detect stream format from URL
   * @param {string} url - Stream URL
   * @returns {string} Format identifier
   * @private
   */
  _detectFormat(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('/hls/')) return 'm3u8';
    if (lower.includes('.mp4')) return 'mp4';
    if (lower.includes('.mkv')) return 'mkv';
    if (lower.includes('.webm')) return 'webm';
    if (lower.includes('.mpd') || lower.includes('/dash/')) return 'dash';
    if (lower.includes('magnet:')) return 'torrent';
    return 'mp4';
  },

  /**
   * Check if URL is a video embed
   * @param {string} url - URL to check
   * @returns {boolean} True if video embed
   * @private
   */
  _isVideoEmbed(url) {
    const videoHosts = ['vidstream', 'mp4upload', 'streamtape', 'doodstream', 'voe', 'vidcloud'];
    return videoHosts.some(host => url.toLowerCase().includes(host));
  },

  /**
   * Extract server name from embed URL
   * @param {string} url - Embed URL
   * @returns {string} Server name
   * @private
   */
  _extractServerName(url) {
    try {
      const hostname = new URL(url).hostname;
      const name = hostname.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return 'Unknown';
    }
  },

  /**
   * Get quality score for sorting
   * @param {string} quality - Quality string
   * @returns {number} Score value
   * @private
   */
  _qualityScore(quality) {
    const scores = { '4k': 5, '2160p': 5, '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
    const q = String(quality).toLowerCase();
    for (const [key, score] of Object.entries(scores)) {
      if (q.includes(key)) return score;
    }
    return 0;
  },

  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration string (e.g., "24:30" or "1:30:00")
   * @returns {number|null} Duration in seconds
   * @private
   */
  _parseDuration(duration) {
    if (!duration) return null;
    const parts = duration.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }
};

// Export the module
module.exports = parser;
