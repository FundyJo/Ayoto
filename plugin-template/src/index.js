/**
 * Template Plugin - Main Entry Point
 * 
 * This is the main plugin file that exports the plugin implementation.
 * It uses the modular structure with separate files for API, parser, and utils.
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

// Import modules from other source files
// These are loaded and bundled during the build process
const api = require('./api.js');
const parser = require('./parser.js');
const utils = require('./utils.js');

/**
 * Plugin implementation
 */
const plugin = {
  // Plugin context (set during init)
  http: null,
  html: null,
  storage: null,
  
  // Configuration
  config: {
    baseUrl: 'https://api.example.com',
    cacheTime: 3600000 // 1 hour
  },

  /**
   * Initialize the plugin
   * @param {Object} context - Plugin context with http, html, storage, and API
   */
  async init(context) {
    this.http = context.http;
    this.html = context.html;
    this.storage = context.storage;
    
    // Initialize sub-modules with context
    api.init(context);
    parser.init(context);
    utils.init(context);
    
    // Load saved configuration
    const savedConfig = this.storage.get('config', null);
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }
    
    console.log('Template Plugin initialized');
  },

  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated search results
   */
  async search(query, page = 1) {
    try {
      const cacheKey = utils.createCacheKey('search', query, page);
      const cached = utils.getCache(cacheKey);
      if (cached) return cached;

      const response = await api.search(query, page);
      const results = parser.parseSearchResults(response.body);
      
      const result = {
        results,
        hasNextPage: parser.hasNextPage(response.body),
        currentPage: page
      };
      
      utils.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Search error:', error);
      return { results: [], hasNextPage: false, currentPage: page, error: error.message };
    }
  },

  /**
   * Get popular anime
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated results
   */
  async getPopular(page = 1) {
    try {
      const cacheKey = utils.createCacheKey('popular', page);
      const cached = utils.getCache(cacheKey);
      if (cached) return cached;

      const response = await api.getPopular(page);
      const results = parser.parseAnimeList(response.body);
      
      const result = {
        results,
        hasNextPage: parser.hasNextPage(response.body),
        currentPage: page
      };
      
      utils.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get popular error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get latest anime/episodes
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated results
   */
  async getLatest(page = 1) {
    try {
      const cacheKey = utils.createCacheKey('latest', page);
      const cached = utils.getCache(cacheKey);
      if (cached) return cached;

      const response = await api.getLatest(page);
      const results = parser.parseAnimeList(response.body);
      
      const result = {
        results,
        hasNextPage: parser.hasNextPage(response.body),
        currentPage: page
      };
      
      utils.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get latest error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get episodes for an anime
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Object>} Paginated episode list
   */
  async getEpisodes(animeId, page = 1) {
    try {
      const cacheKey = utils.createCacheKey('episodes', animeId, page);
      const cached = utils.getCache(cacheKey);
      if (cached) return cached;

      const response = await api.getEpisodes(animeId, page);
      const results = parser.parseEpisodeList(response.body);
      
      const result = {
        results,
        hasNextPage: parser.hasNextPage(response.body),
        currentPage: page
      };
      
      utils.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get episodes error:', error);
      return { results: [], hasNextPage: false, currentPage: page };
    }
  },

  /**
   * Get stream sources for an episode
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<Array>} Array of stream sources
   */
  async getStreams(animeId, episodeId) {
    try {
      // Streams should not be cached for long
      const response = await api.getStreams(animeId, episodeId);
      const sources = parser.parseStreamSources(response.body);
      return sources;
    } catch (error) {
      console.error('Get streams error:', error);
      return [];
    }
  },

  /**
   * Get detailed anime information
   * @param {string} animeId - Anime ID
   * @returns {Promise<Object>} Anime details
   */
  async getAnimeDetails(animeId) {
    try {
      const cacheKey = utils.createCacheKey('details', animeId);
      const cached = utils.getCache(cacheKey);
      if (cached) return cached;

      const response = await api.getAnimeDetails(animeId);
      const details = parser.parseAnimeDetails(response.body, animeId);
      
      utils.setCache(cacheKey, details);
      return details;
    } catch (error) {
      console.error('Get anime details error:', error);
      return { id: animeId, title: 'Unknown', error: error.message };
    }
  },

  /**
   * Cleanup when plugin is unloaded
   */
  async shutdown() {
    // Save any pending data
    // Clear any intervals/timeouts
    console.log('Template Plugin shutdown');
  }
};

// Export the plugin
module.exports = plugin;
