/**
 * Video Hosters Provider Plugin - Main Entry Point
 * 
 * This is the main plugin file that exports the stream provider implementation.
 * Stream providers extract direct video URLs from video hosting services.
 * 
 * Supported Hosters:
 * - Vidoza
 * - Vidmoly
 * - VOE
 * - Streamtape
 * - SpeedFiles
 * - Luluvdo
 * - LoadX
 * - Filemoon
 * - Doodstream
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

// Import modules from other source files
const extractors = require('./extractors.js');
const utils = require('./utils.js');

/**
 * Video hosters provider plugin implementation
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
    'vidoza': {
      pattern: /vidoza\.(net|org|co)/i,
      name: 'Vidoza',
      extractor: 'extractVidoza'
    },
    'vidmoly': {
      pattern: /vidmoly\.(to|me|com|net)/i,
      name: 'Vidmoly',
      extractor: 'extractVidmoly'
    },
    'voe': {
      pattern: /voe\.(sx|bar)|voe-network\.(net|com)/i,
      name: 'VOE',
      extractor: 'extractVoe'
    },
    'streamtape': {
      pattern: /streamtape\.(com|net|to|xyz)/i,
      name: 'Streamtape',
      extractor: 'extractStreamtape'
    },
    'speedfiles': {
      pattern: /speedfiles\.(net|com)/i,
      name: 'SpeedFiles',
      extractor: 'extractSpeedFiles'
    },
    'luluvdo': {
      pattern: /luluvdo\.(com|net)/i,
      name: 'Luluvdo',
      extractor: 'extractLuluvdo'
    },
    'loadx': {
      pattern: /loadx\.(ws|to|net)/i,
      name: 'LoadX',
      extractor: 'extractLoadX'
    },
    'filemoon': {
      pattern: /filemoon\.(sx|to|in|wf)/i,
      name: 'Filemoon',
      extractor: 'extractFilemoon'
    },
    'doodstream': {
      pattern: /doodstream\.(com|co)|dood\.(re|watch|wf|to|la|pm|sh)/i,
      name: 'Doodstream',
      extractor: 'extractDoodstream'
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
    
    console.log('Video Hosters Provider initialized');
    console.log('Supported hosters:', Object.keys(this.supportedHosters).join(', '));
  },

  /**
   * Extract stream URL from a hoster page
   * @param {string} url - Hoster page URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractStream(url) {
    try {
      // Check cache first (cache for 10 minutes)
      const cacheKey = utils.createCacheKey('stream', utils.simpleHash(url));
      const cached = utils.getCache(cacheKey, 600000);
      
      if (cached) {
        console.log('Returning cached stream for:', url);
        return cached;
      }
      
      // Identify the hoster
      const hoster = this._identifyHoster(url);
      if (!hoster) {
        console.warn('Unsupported hoster:', url);
        return null;
      }
      
      console.log('Extracting from:', hoster.config.name);
      
      // Extract based on hoster type
      const extractorMethod = extractors[hoster.config.extractor];
      if (!extractorMethod) {
        console.error('Extractor not found:', hoster.config.extractor);
        return null;
      }
      
      const result = await extractorMethod.call(extractors, url);
      
      if (result) {
        // Cache the result
        utils.setCache(cacheKey, result);
        console.log('Extracted stream from:', hoster.config.name);
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
   * Get list of all supported hosters
   * @returns {Array<Object>} List of hoster info
   */
  getSupportedHosters() {
    return Object.entries(this.supportedHosters).map(([key, config]) => ({
      key,
      name: config.name,
      pattern: config.pattern.toString()
    }));
  },

  /**
   * Check if a URL is from a supported hoster
   * @param {string} url - URL to check
   * @returns {boolean} True if supported
   */
  isSupported(url) {
    return this._identifyHoster(url) !== null;
  },

  /**
   * Cleanup
   */
  async shutdown() {
    console.log('Video Hosters Provider shutdown');
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
