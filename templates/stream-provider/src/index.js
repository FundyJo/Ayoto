/**
 * Stream Provider Plugin - Main Entry Point
 * 
 * This is the main plugin file that exports the stream provider implementation.
 * Stream providers extract direct video URLs from video hosting services.
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

// Import modules from other source files
const extractors = require('./extractors.js');
const utils = require('./utils.js');

/**
 * Stream provider plugin implementation
 */
const plugin = {
  // HTTP client
  http: null,
  // HTML parser
  html: null,
  // Cache storage
  storage: null,
  
  // Supported hosters configuration
  supportedHosters: {
    'vidstream': {
      pattern: /vidstream\.pro|vizcloud|vidcloud/i,
      name: 'VidStream'
    },
    'mp4upload': {
      pattern: /mp4upload\.com/i,
      name: 'MP4Upload'
    },
    'streamtape': {
      pattern: /streamtape\.(com|net)/i,
      name: 'Streamtape'
    }
  },

  /**
   * Initialize the stream provider
   * @param {Object} context - Plugin context
   */
  async init(context) {
    this.http = context.http;
    this.html = context.html;
    this.storage = context.storage;
    
    // Initialize sub-modules with context
    extractors.init(context);
    utils.init(context);
    
    console.log('Stream Provider Plugin initialized');
  },

  /**
   * Extract stream URL from a hoster page
   * @param {string} url - Hoster page URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractStream(url) {
    try {
      // Check cache first (cache for 10 minutes)
      const cacheKey = utils.createCacheKey('stream', url);
      const cached = utils.getCache(cacheKey, 600000);
      
      if (cached) {
        return cached;
      }
      
      // Identify the hoster
      const hoster = this._identifyHoster(url);
      if (!hoster) {
        console.warn('Unsupported hoster:', url);
        return null;
      }
      
      // Extract based on hoster type
      let result = null;
      switch (hoster.key) {
        case 'vidstream':
          result = await extractors.extractVidStream(url, this.http, this.html);
          break;
        case 'mp4upload':
          result = await extractors.extractMp4Upload(url, this.http, this.html);
          break;
        case 'streamtape':
          result = await extractors.extractStreamtape(url, this.http, this.html);
          break;
        default:
          return null;
      }
      
      if (result) {
        // Cache the result
        utils.setCache(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error('Extract stream error:', error);
      return null;
    }
  },

  /**
   * Get information about a hoster
   * @param {string} url - Hoster URL
   * @returns {Promise<Object>} Hoster info
   */
  async getHosterInfo(url) {
    const hoster = this._identifyHoster(url);
    
    if (!hoster) {
      return {
        name: 'Unknown',
        supported: false
      };
    }
    
    return {
      name: hoster.config.name,
      supported: true,
      key: hoster.key
    };
  },

  /**
   * Cleanup
   */
  async shutdown() {
    console.log('Stream Provider Plugin shutdown');
  },

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Identify which hoster the URL belongs to
   * @param {string} url - URL to identify
   * @returns {Object|null} Hoster info or null
   * @private
   */
  _identifyHoster(url) {
    for (const [key, config] of Object.entries(this.supportedHosters)) {
      if (config.pattern.test(url)) {
        return { key, config };
      }
    }
    return null;
  }
};

// Export the plugin
module.exports = plugin;
