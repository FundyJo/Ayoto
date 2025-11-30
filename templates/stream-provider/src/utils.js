/**
 * Stream Provider Plugin - Utilities Module
 * 
 * Provides utility functions for caching, URL handling, and other common operations.
 * 
 * @module utils
 * @version 1.0.0
 */

"use strict";

/**
 * Utility functions for the stream provider plugin
 */
const utils = {
  // Storage from plugin context
  storage: null,
  
  // Default cache duration (10 minutes for streams)
  defaultCacheTime: 600000,

  /**
   * Initialize the utils module
   * @param {Object} context - Plugin context
   */
  init(context) {
    this.storage = context.storage;
    
    // Load cache settings from config if available
    if (context.manifest?.config?.cacheTime) {
      this.defaultCacheTime = context.manifest.config.cacheTime;
    }
  },

  // ==========================================================================
  // Caching
  // ==========================================================================

  /**
   * Create a cache key from components
   * @param {...*} parts - Key components
   * @returns {string} Cache key
   */
  createCacheKey(...parts) {
    return 'cache_' + this.simpleHash(parts.map(p => String(p)).join('_'));
  },

  /**
   * Get cached value if not expired
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in ms (default: 10 minutes)
   * @returns {*} Cached value or null
   */
  getCache(key, maxAge = null) {
    const cacheTime = maxAge || this.defaultCacheTime;
    const cached = this.storage.get(key, null);
    const timestamp = this.storage.get(`${key}_ts`, 0);
    
    if (cached && (Date.now() - timestamp) < cacheTime) {
      return cached;
    }
    
    // Clear expired cache
    if (cached) {
      this.storage.remove(key);
      this.storage.remove(`${key}_ts`);
    }
    
    return null;
  },

  /**
   * Set cached value with timestamp
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  setCache(key, value) {
    this.storage.set(key, value);
    this.storage.set(`${key}_ts`, Date.now());
  },

  /**
   * Clear specific cache key
   * @param {string} key - Cache key
   */
  clearCache(key) {
    this.storage.remove(key);
    this.storage.remove(`${key}_ts`);
  },

  // ==========================================================================
  // URL Utilities
  // ==========================================================================

  /**
   * Extract domain from URL
   * @param {string} url - URL string
   * @returns {string|null} Domain or null
   */
  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  },

  /**
   * Get base URL from full URL
   * @param {string} url - Full URL
   * @returns {string} Base URL
   */
  getBaseUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return '';
    }
  },

  /**
   * Resolve relative URL to absolute
   * @param {string} base - Base URL
   * @param {string} relative - Relative URL
   * @returns {string} Absolute URL
   */
  resolveUrl(base, relative) {
    if (!relative) return base;
    if (relative.startsWith('http://') || relative.startsWith('https://')) {
      return relative;
    }
    
    try {
      return new URL(relative, base).href;
    } catch {
      if (relative.startsWith('//')) {
        return 'https:' + relative;
      }
      if (relative.startsWith('/')) {
        const baseUrl = new URL(base);
        return `${baseUrl.protocol}//${baseUrl.host}${relative}`;
      }
      return base + '/' + relative;
    }
  },

  /**
   * Extract query parameter from URL
   * @param {string} url - URL string
   * @param {string} param - Parameter name
   * @returns {string|null} Parameter value or null
   */
  getQueryParam(url, param) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get(param);
    } catch {
      return null;
    }
  },

  // ==========================================================================
  // String Utilities
  // ==========================================================================

  /**
   * Decode base64 string
   * @param {string} str - Base64 encoded string
   * @returns {string} Decoded string
   */
  decodeBase64(str) {
    try {
      return atob(str);
    } catch {
      return str;
    }
  },

  /**
   * Decode URL-encoded string
   * @param {string} str - URL-encoded string
   * @returns {string} Decoded string
   */
  decodeUri(str) {
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  },

  /**
   * Extract string between two markers
   * @param {string} text - Source text
   * @param {string} start - Start marker
   * @param {string} end - End marker
   * @returns {string|null} Extracted string or null
   */
  extractBetween(text, start, end) {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) return null;
    
    const contentStart = startIdx + start.length;
    const endIdx = text.indexOf(end, contentStart);
    if (endIdx === -1) return null;
    
    return text.substring(contentStart, endIdx);
  },

  // ==========================================================================
  // Hash Utilities
  // ==========================================================================

  /**
   * Simple hash function for strings (for cache keys)
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
};

// Export the module
module.exports = utils;
