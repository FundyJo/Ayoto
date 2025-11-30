/**
 * Stream Provider Plugin - Extractors Module
 * 
 * Contains hoster-specific extraction logic for different video hosting services.
 * Each extractor function knows how to extract video URLs from a specific hoster.
 * 
 * @module extractors
 * @version 1.0.0
 */

"use strict";

/**
 * Extractors module for hoster-specific video extraction
 */
const extractors = {
  // Plugin context references
  http: null,
  html: null,

  /**
   * Initialize the extractors module
   * @param {Object} context - Plugin context
   */
  init(context) {
    this.http = context.http;
    this.html = context.html;
  },

  // ==========================================================================
  // VidStream Extractor
  // ==========================================================================

  /**
   * Extract from VidStream-type hosters
   * @param {string} url - Hoster URL
   * @param {Object} http - HTTP client
   * @param {Object} html - HTML parser
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractVidStream(url, http, html) {
    try {
      const response = await http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // Look for encrypted player data
      const playerData = html.extractJsonFromScript(response.body, 'playerData');
      
      if (playerData && playerData.file) {
        return {
          url: playerData.file,
          format: this._detectFormat(playerData.file),
          quality: playerData.label || 'Auto',
          server: 'VidStream'
        };
      }
      
      // Try alternative: look for source in video tag
      const sources = html.extractAttribute(response.body, 'source', 'src');
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

  // ==========================================================================
  // MP4Upload Extractor
  // ==========================================================================

  /**
   * Extract from MP4Upload
   * @param {string} url - Hoster URL
   * @param {Object} http - HTTP client
   * @param {Object} html - HTML parser
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractMp4Upload(url, http, html) {
    try {
      const response = await http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // Look for video source - avoid eval for security
      const srcMatch = response.body.match(/player\.src\(["']([^"']+)/);
      if (srcMatch) {
        return {
          url: srcMatch[1],
          format: 'mp4',
          quality: 'Default',
          server: 'MP4Upload'
        };
      }
      
      // Fallback: look for video source tag
      const videoSrc = html.extractAttribute(response.body, 'video source', 'src');
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

  // ==========================================================================
  // Streamtape Extractor
  // ==========================================================================

  /**
   * Extract from Streamtape
   * @param {string} url - Hoster URL
   * @param {Object} http - HTTP client
   * @param {Object} html - HTML parser
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractStreamtape(url, http, html) {
    try {
      const response = await http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      
      // Streamtape uses a special URL construction
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

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

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
    return 'mp4';
  }
};

// Export the module
module.exports = extractors;
