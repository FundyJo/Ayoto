/**
 * Media Provider Plugin - API Module
 * 
 * Handles all HTTP requests to the data source.
 * Separating API calls makes the code more maintainable and testable.
 * 
 * @module api
 * @version 1.0.0
 */

"use strict";

/**
 * API module for handling HTTP requests
 */
const api = {
  // HTTP client from plugin context
  http: null,
  
  // Base URL for the provider
  baseUrl: 'https://api.example.com',

  /**
   * Initialize the API module
   * @param {Object} context - Plugin context
   */
  init(context) {
    this.http = context.http;
    
    // Load base URL from manifest config if available
    if (context.manifest?.config?.baseUrl) {
      this.baseUrl = context.manifest.config.baseUrl;
    }
  },

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} HTTP response
   */
  async get(endpoint, params = {}) {
    const url = this._buildUrl(endpoint, params);
    const response = await this.http.get(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} HTTP response
   */
  async post(endpoint, data = {}) {
    const url = this._buildUrl(endpoint);
    const response = await this.http.post(url, data);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  },

  /**
   * Build URL with query parameters
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {string} Full URL
   * @private
   */
  _buildUrl(endpoint, params = {}) {
    let url = `${this.baseUrl}${endpoint}`;
    
    const queryParts = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
    
    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }
    
    return url;
  },

  // ==========================================================================
  // API Endpoints
  // ==========================================================================

  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} HTTP response
   */
  async search(query, page = 1) {
    return this.get('/search', { q: query, page });
  },

  /**
   * Get popular anime
   * @param {number} page - Page number
   * @returns {Promise<Object>} HTTP response
   */
  async getPopular(page = 1) {
    return this.get('/popular', { page });
  },

  /**
   * Get latest anime/episodes
   * @param {number} page - Page number
   * @returns {Promise<Object>} HTTP response
   */
  async getLatest(page = 1) {
    return this.get('/latest', { page });
  },

  /**
   * Get episodes for an anime
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Object>} HTTP response
   */
  async getEpisodes(animeId, page = 1) {
    return this.get(`/anime/${animeId}/episodes`, { page });
  },

  /**
   * Get stream sources for an episode
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<Object>} HTTP response
   */
  async getStreams(animeId, episodeId) {
    return this.get(`/anime/${animeId}/episode/${episodeId}`);
  },

  /**
   * Get detailed anime information
   * @param {string} animeId - Anime ID
   * @returns {Promise<Object>} HTTP response
   */
  async getAnimeDetails(animeId) {
    return this.get(`/anime/${animeId}`);
  }
};

// Export the module
module.exports = api;
