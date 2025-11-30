/**
 * Example ZPE Stream Provider Plugin
 * 
 * This template demonstrates how to create a stream provider plugin
 * that extracts direct video URLs from video hosting services.
 * 
 * @version 1.0.0
 * @license MIT
 */

"use strict";

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
   * 
   * @param {Object} context - Plugin context
   */
  async init(context) {
    this.http = context.http;
    this.html = context.html;
    this.storage = context.storage;
    
    console.log('Example Stream Provider initialized');
  },

  /**
   * Extract stream URL from a hoster page
   * 
   * @param {string} url - Hoster page URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractStream(url) {
    try {
      // Check cache first (cache for 10 minutes)
      const cacheKey = `stream_${this._hashUrl(url)}`;
      const cached = this.storage.get(cacheKey, null);
      const cacheTime = this.storage.get(`${cacheKey}_time`, 0);
      
      if (cached && (Date.now() - cacheTime) < 600000) {
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
          result = await this._extractVidStream(url);
          break;
        case 'mp4upload':
          result = await this._extractMp4Upload(url);
          break;
        case 'streamtape':
          result = await this._extractStreamtape(url);
          break;
        default:
          return null;
      }
      
      if (result) {
        // Cache the result
        this.storage.set(cacheKey, result);
        this.storage.set(`${cacheKey}_time`, Date.now());
      }
      
      return result;
    } catch (error) {
      console.error('Extract stream error:', error);
      return null;
    }
  },

  /**
   * Get information about a hoster
   * 
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
    console.log('Example Stream Provider shutdown');
  },

  // ============================================================================
  // Private Extraction Methods
  // ============================================================================

  /**
   * Extract from VidStream-type hosters
   * @private
   */
  async _extractVidStream(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // Look for encrypted player data
      const playerData = this.html.extractJsonFromScript(response.body, 'playerData');
      
      if (playerData && playerData.file) {
        return {
          url: playerData.file,
          format: this._detectFormat(playerData.file),
          quality: playerData.label || 'Auto',
          server: 'VidStream'
        };
      }
      
      // Try alternative: look for source in video tag
      const sources = this.html.extractAttribute(response.body, 'source', 'src');
      if (sources.length > 0) {
        return {
          url: sources[0],
          format: this._detectFormat(sources[0]),
          quality: 'Default',
          server: 'VidStream'
        };
      }
      
      // Try to find m3u8 in script
      const m3u8Match = response.body.match(/"?file"?\s*:\s*["']([^"']+\.m3u8[^"']*)/);
      if (m3u8Match) {
        return {
          url: m3u8Match[1],
          format: 'm3u8',
          quality: 'Auto',
          server: 'VidStream'
        };
      }
      
      return null;
    } catch (error) {
      console.error('VidStream extraction error:', error);
      return null;
    }
  },

  /**
   * Extract from MP4Upload
   * @private
   */
  async _extractMp4Upload(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // MP4Upload usually has player_code or eval code
      // Look for the video source
      const evalMatch = response.body.match(/eval\(function\(p,a,c,k,e,d\).*?\)\)/);
      
      if (evalMatch) {
        // In a real implementation, you'd need to safely decode the packed JS
        // For security, we avoid using eval() directly
        // Instead, look for common patterns in the encoded data
        const srcMatch = response.body.match(/player\.src\(["']([^"']+)/);
        if (srcMatch) {
          return {
            url: srcMatch[1],
            format: 'mp4',
            quality: 'Default',
            server: 'MP4Upload'
          };
        }
      }
      
      // Fallback: look for video source tag
      const videoSrc = this.html.extractAttribute(response.body, 'video source', 'src');
      if (videoSrc.length > 0) {
        return {
          url: videoSrc[0],
          format: 'mp4',
          quality: 'Default',
          server: 'MP4Upload'
        };
      }
      
      // Another fallback: look for direct mp4 link
      const mp4Match = response.body.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/);
      if (mp4Match) {
        return {
          url: mp4Match[1],
          format: 'mp4',
          quality: 'Default',
          server: 'MP4Upload'
        };
      }
      
      return null;
    } catch (error) {
      console.error('MP4Upload extraction error:', error);
      return null;
    }
  },

  /**
   * Extract from Streamtape
   * @private
   */
  async _extractStreamtape(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // Streamtape uses a special URL construction
      // Look for the token and construct the URL
      const tokenMatch = response.body.match(/getElementById\('robotlink'\)\.innerHTML\s*=\s*['"]([^'"]+)['"]\s*\+\s*\(['"]([^'"]+)/);
      
      if (tokenMatch) {
        const baseUrl = tokenMatch[1];
        const token = tokenMatch[2];
        const videoUrl = `https:${baseUrl}${token}&stream=1`;
        
        return {
          url: videoUrl,
          format: 'mp4',
          quality: 'Default',
          server: 'Streamtape'
        };
      }
      
      // Alternative pattern
      const linkMatch = response.body.match(/document\.getElementById\('norobotlink'\)\.innerHTML\s*=\s*['"]([^'"]+)/);
      if (linkMatch) {
        return {
          url: `https:${linkMatch[1]}`,
          format: 'mp4',
          quality: 'Default',
          server: 'Streamtape'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Streamtape extraction error:', error);
      return null;
    }
  },

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Identify which hoster the URL belongs to
   * @private
   */
  _identifyHoster(url) {
    for (const [key, config] of Object.entries(this.supportedHosters)) {
      if (config.pattern.test(url)) {
        return { key, config };
      }
    }
    return null;
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
    return 'mp4';
  },

  /**
   * Simple hash function for cache keys
   * @private
   */
  _hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
};

// Export the plugin
module.exports = plugin;
