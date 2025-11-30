/**
 * Media Provider Plugin - Utilities Module
 * 
 * Provides utility functions for caching, formatting, and other common operations.
 * 
 * @module utils
 * @version 1.0.0
 */

"use strict";

/**
 * Utility functions for the plugin
 */
const utils = {
  // Storage from plugin context
  storage: null,
  
  // Default cache duration (1 hour)
  defaultCacheTime: 3600000,

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
    return 'cache_' + parts.map(p => String(p)).join('_');
  },

  /**
   * Get cached value if not expired
   * @param {string} key - Cache key
   * @param {number} maxAge - Maximum age in ms (default: 1 hour)
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

  /**
   * Clear all cached data
   */
  clearAllCache() {
    const keys = this.storage.keys();
    for (const key of keys) {
      if (key.startsWith('cache_') || key.endsWith('_ts')) {
        this.storage.remove(key);
      }
    }
  },

  // ==========================================================================
  // String Utilities
  // ==========================================================================

  /**
   * Truncate string to max length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix to add if truncated
   * @returns {string} Truncated string
   */
  truncate(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Sanitize string for use in URLs
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Extract numbers from string
   * @param {string} str - String containing numbers
   * @returns {number|null} Extracted number or null
   */
  extractNumber(str) {
    if (!str) return null;
    const match = str.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  },

  // ==========================================================================
  // Date Utilities
  // ==========================================================================

  /**
   * Parse various date formats to ISO string
   * @param {string} dateStr - Date string
   * @returns {string|null} ISO date string or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // Try standard formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // Try common patterns like "Jan 15, 2024"
      const patterns = [
        /(\w+)\s+(\d+),?\s+(\d{4})/,  // Month Day, Year
        /(\d+)[/-](\d+)[/-](\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4})[/-](\d+)[/-](\d+)/  // YYYY/MM/DD
      ];
      
      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
    
    return null;
  },

  /**
   * Format duration in seconds to readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  },

  // ==========================================================================
  // URL Utilities
  // ==========================================================================

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
      // Fallback for invalid URLs
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

  // ==========================================================================
  // Array Utilities
  // ==========================================================================

  /**
   * Remove duplicates from array by key
   * @param {Array} array - Array to deduplicate
   * @param {string} key - Key to compare
   * @returns {Array} Deduplicated array
   */
  uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
