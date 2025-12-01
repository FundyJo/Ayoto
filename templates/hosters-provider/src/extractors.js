/**
 * Video Hosters Provider - Extractors Module
 * 
 * Contains hoster-specific extraction logic for various video hosting services.
 * Converted from Python implementations to JavaScript.
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
  // Vidoza Extractor
  // ==========================================================================

  /**
   * Extract from Vidoza
   * Pattern: sourcesCode:.*?\[.*?\{.*?src:.*?['|"](?P<mp4>.*?)['|"],
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractVidoza(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Pattern to match: sourcesCode:.*?\[.*?\{.*?src:.*?['|"](?P<mp4>.*?)['|"],
      const pattern = /sourcesCode:\s*\[.*?\{.*?src:\s*['"]([^'"]+)['"]/s;
      const match = response.body.match(pattern);
      
      if (match && match[1]) {
        return {
          url: match[1],
          format: this._detectFormat(match[1]),
          quality: 'Auto',
          server: 'Vidoza'
        };
      }

      return null;
    } catch (error) {
      console.error('Vidoza extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // Vidmoly Extractor
  // ==========================================================================

  /**
   * Extract from Vidmoly
   * Pattern: sources: \[{file:"(?P<url>.*?)"}]
   * Requires headers with Referer
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractVidmoly(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Pattern to match: sources: [{file:"(?P<url>.*?)"}]
      const pattern = /sources:\s*\[\{file:\s*"([^"]+)"\}\]/;
      const match = response.body.match(pattern);
      
      if (match && match[1]) {
        return {
          url: match[1],
          format: this._detectFormat(match[1]),
          quality: 'Auto',
          server: 'Vidmoly',
          headers: {
            'Referer': 'https://vidmoly.to/'
          },
          requiresHeaders: true
        };
      }

      return null;
    } catch (error) {
      console.error('Vidmoly extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // VOE Extractor
  // ==========================================================================

  /**
   * ROT13 decoder (for VOE obfuscation)
   * @param {string} str - Input string
   * @returns {string} Decoded string
   * @private
   */
  _rot13(str) {
    let result = '';
    for (const char of str) {
      const code = char.charCodeAt(0);
      if (code >= 0x41 && code <= 0x5a) {
        // Uppercase
        result += String.fromCharCode(((code - 0x41 + 13) % 26) + 0x41);
      } else if (code >= 0x61 && code <= 0x7a) {
        // Lowercase
        result += String.fromCharCode(((code - 0x61 + 13) % 26) + 0x61);
      } else {
        result += char;
      }
    }
    return result;
  },

  /**
   * Replace obfuscation patterns with underscores
   * @param {string} str - Input string
   * @returns {string} Cleaned string
   * @private
   */
  _cleanObfuscation(str) {
    const patterns = ['@$', '^^', '~@', '%?', '*~', '!!', '#&'];
    let result = str;
    for (const pattern of patterns) {
      result = result.split(pattern).join('_');
    }
    return result;
  },

  /**
   * Shift characters by value
   * @param {string} str - Input string
   * @param {number} shift - Shift value
   * @returns {string} Shifted string
   * @private
   */
  _shiftChars(str, shift) {
    let result = '';
    for (const char of str) {
      result += String.fromCharCode(char.charCodeAt(0) - shift);
    }
    return result;
  },

  /**
   * Decode VOE obfuscated data
   * @param {string} inputVar - Obfuscated string
   * @returns {Object|null} Decoded JSON object
   * @private
   */
  _decodeVoe(inputVar) {
    try {
      // Step 1: ROT13
      const rot13Output = this._rot13(inputVar);
      
      // Step 2: Clean obfuscation patterns
      const cleanedString = this._cleanObfuscation(rot13Output);
      
      // Step 3: Remove underscores
      const noUnderscores = cleanedString.replace(/_/g, '');
      
      // Step 4: Base64 decode
      const b64String1 = atob(noUnderscores);
      
      // Step 5: Shift chars by 3
      const shiftedString = this._shiftChars(b64String1, 3);
      
      // Step 6: Reverse
      const reversedString = shiftedString.split('').reverse().join('');
      
      // Step 7: Base64 decode again
      const finalString = atob(reversedString);
      
      // Step 8: Parse JSON
      return JSON.parse(finalString);
    } catch (error) {
      console.error('VOE decode error:', error);
      return null;
    }
  },

  /**
   * Find and extract VOE source from script element
   * @param {string} html - HTML content
   * @returns {string|null} Video URL
   * @private
   */
  _findVoeSource(html) {
    // Look for script with type="application/json"
    const scriptPattern = /<script\s+type=["']application\/json["'][^>]*>([^<]+)<\/script>/i;
    const match = html.match(scriptPattern);
    
    if (match && match[1]) {
      // Remove surrounding characters (typically 2 chars from each end)
      const obfuscatedString = match[1].trim();
      if (obfuscatedString.length > 4) {
        const content = obfuscatedString.slice(2, -2);
        const decoded = this._decodeVoe(content);
        if (decoded && decoded.source) {
          return decoded.source;
        }
      }
    }
    
    return null;
  },

  /**
   * Extract from VOE
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractVoe(url) {
    try {
      // First request to get redirect URL
      const redirectResponse = await this.http.get(url);
      
      if (!redirectResponse.ok) {
        throw new Error(`Request failed: ${redirectResponse.status}`);
      }

      // Look for redirect URL
      const redirectPattern = /https?:\/\/[^'"<>]+/g;
      const redirectMatch = redirectResponse.body.match(redirectPattern);
      
      let finalUrl = url;
      if (redirectMatch) {
        // Find the VOE redirect URL
        for (const match of redirectMatch) {
          if (match.includes('voe') && !match.includes('.css') && !match.includes('.js')) {
            finalUrl = match;
            break;
          }
        }
      }

      // Second request to actual VOE page
      const response = await this.http.get(finalUrl);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const sourceUrl = this._findVoeSource(response.body);
      
      if (sourceUrl) {
        return {
          url: sourceUrl,
          format: this._detectFormat(sourceUrl),
          quality: 'Auto',
          server: 'VOE'
        };
      }

      return null;
    } catch (error) {
      console.error('VOE extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // Streamtape Extractor
  // ==========================================================================

  /**
   * Extract from Streamtape
   * Pattern: 'botlink.*innerHTML.*?'(?P<s1>.*)'.*?\+.*?'(?P<s2>.*)'
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractStreamtape(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Pattern: 'botlink.*innerHTML.*?'(?P<s1>.*)'.*?\+.*?'(?P<s2>.*)'
      const pattern = /'botlink.*?innerHTML\s*=\s*['"]([^'"]+)['"]\s*\+\s*\(['"]([^'"]+)/;
      const match = response.body.match(pattern);
      
      if (match && match[1] && match[2]) {
        // Construct URL: https:{s1}{s2[4:]}
        const s1 = match[1];
        const s2 = match[2].slice(4); // Skip first 4 characters
        const videoUrl = `https:${s1}${s2}`;
        
        return {
          url: videoUrl,
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
  // SpeedFiles Extractor
  // ==========================================================================

  /**
   * Decode SpeedFiles obfuscated URL
   * @param {string} stuff - Obfuscated string
   * @returns {string} Decoded URL
   * @private
   */
  _decodeSpeedFiles(stuff) {
    try {
      // Step 1: Base64 decode
      let decoded = atob(stuff);
      
      // Step 2: Swap case
      decoded = decoded.split('').map(c => {
        if (c >= 'a' && c <= 'z') return c.toUpperCase();
        if (c >= 'A' && c <= 'Z') return c.toLowerCase();
        return c;
      }).join('');
      
      // Step 3: Reverse
      decoded = decoded.split('').reverse().join('');
      
      // Step 4: Base64 decode again
      decoded = atob(decoded);
      
      // Step 5: Reverse again
      decoded = decoded.split('').reverse().join('');
      
      // Step 6: Convert hex to characters
      let result = '';
      for (let i = 0; i < decoded.length; i += 2) {
        result += String.fromCharCode(parseInt(decoded.slice(i, i + 2), 16));
      }
      
      // Step 7: Shift characters by -3
      let shifted = '';
      for (const char of result) {
        shifted += String.fromCharCode(char.charCodeAt(0) - 3);
      }
      
      // Step 8: Swap case again
      shifted = shifted.split('').map(c => {
        if (c >= 'a' && c <= 'z') return c.toUpperCase();
        if (c >= 'A' && c <= 'Z') return c.toLowerCase();
        return c;
      }).join('');
      
      // Step 9: Reverse
      shifted = shifted.split('').reverse().join('');
      
      // Step 10: Base64 decode
      return atob(shifted);
    } catch (error) {
      console.error('SpeedFiles decode error:', error);
      return null;
    }
  },

  /**
   * Extract from SpeedFiles
   * Pattern: var _0x5opu234 = "(?P<stuff>.*?)";
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractSpeedFiles(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Pattern: var _0x5opu234 = "(?P<stuff>.*?)";
      const pattern = /var _0x5opu234\s*=\s*"([^"]+)"/;
      const match = response.body.match(pattern);
      
      if (match && match[1]) {
        const decodedUrl = this._decodeSpeedFiles(match[1]);
        
        if (decodedUrl) {
          return {
            url: decodedUrl,
            format: this._detectFormat(decodedUrl),
            quality: 'Default',
            server: 'SpeedFiles'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('SpeedFiles extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // Luluvdo Extractor
  // ==========================================================================

  /**
   * Extract from Luluvdo
   * Pattern: file:\s*"([^"]+)"
   * Requires specific headers
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractLuluvdo(url) {
    try {
      const userAgent = 'Mozilla/5.0 (Android 15; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0';
      
      // First request to get redirect and ID
      const response = await this.http.get(url, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Extract ID from URL path
      const urlObj = new URL(response.url || url);
      const pathParts = urlObj.pathname.split('/');
      const luluvdoId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
      
      if (!luluvdoId) {
        return null;
      }

      // Second request to get the embed URL
      const embedUrl = `https://luluvdo.com/dl?op=embed&file_code=${luluvdoId}`;
      const embedResponse = await this.http.get(embedUrl, {
        headers: { 'User-Agent': userAgent }
      });
      
      if (!embedResponse.ok) {
        throw new Error(`Embed request failed: ${embedResponse.status}`);
      }

      // Pattern: file:\s*"([^"]+)"
      const pattern = /file:\s*"([^"]+)"/;
      const match = embedResponse.body.match(pattern);
      
      if (match && match[1]) {
        return {
          url: match[1],
          format: this._detectFormat(match[1]),
          quality: 'Default',
          server: 'Luluvdo',
          headers: {
            'User-Agent': userAgent
          },
          requiresHeaders: true
        };
      }

      return null;
    } catch (error) {
      console.error('Luluvdo extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // LoadX Extractor
  // ==========================================================================

  /**
   * Extract from LoadX
   * Uses HEAD request to get hash, then POST to get video source
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractLoadX(url) {
    try {
      // First, make a HEAD request to get the final URL
      const headResponse = await this.http.request('HEAD', url);
      
      // Extract ID hash from path (second segment after /)
      const finalUrl = headResponse.url || url;
      const urlObj = new URL(finalUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const idHash = pathParts[1] || pathParts[0];
      const host = urlObj.host;
      
      if (!idHash) {
        return null;
      }

      // POST request to get video source
      const apiUrl = `https://${host}/player/index.php?data=${idHash}&do=getVideo`;
      const response = await this.http.post(apiUrl, null, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = JSON.parse(response.body);
      
      if (data && data.videoSource) {
        return {
          url: data.videoSource,
          format: 'm3u8',
          quality: 'Auto',
          server: 'LoadX',
          forceHls: true
        };
      }

      return null;
    } catch (error) {
      console.error('LoadX extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // Filemoon Extractor
  // ==========================================================================

  /**
   * Simple P.A.C.K.E.R unpacker
   * @param {string} packed - Packed script
   * @returns {string} Unpacked script
   * @private
   */
  _unpack(packed) {
    try {
      // Match the eval(function(p,a,c,k,e,d) pattern
      const evalMatch = packed.match(/eval\(function\(p,a,c,k,e,d\).*?return p;\}?\('(.*?)',\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']+)'\.split\('\|'\)/s);
      
      if (!evalMatch) {
        return null;
      }

      let p = evalMatch[1];
      const a = parseInt(evalMatch[2], 10);
      const c = parseInt(evalMatch[3], 10);
      const k = evalMatch[4].split('|');

      // Replace all encoded values with their actual strings
      for (let i = c - 1; i >= 0; i--) {
        if (k[i]) {
          // Find what character/string represents this number in the base
          let encoded;
          if (a <= 36) {
            encoded = i.toString(a);
          } else {
            const alpha = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            encoded = '';
            let n = i;
            while (n >= a) {
              encoded = alpha[n % a] + encoded;
              n = Math.floor(n / a);
            }
            encoded = alpha[n] + encoded;
          }
          const wordRegex = new RegExp('\\b' + encoded + '\\b', 'g');
          p = p.replace(wordRegex, k[i]);
        }
      }
      
      return p;
    } catch (error) {
      console.error('Unpack error:', error);
      return null;
    }
  },

  /**
   * Extract from Filemoon
   * Uses iframe redirect and unpacking of obfuscated JS
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractFilemoon(url) {
    try {
      const response = await this.http.get(url);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      let source = response.body;

      // Check for iframe redirect
      const iframePattern = /<iframe\s*(?:[^>]+\s)?src=['"]([^'"]+)['"][^>]*>/i;
      const iframeMatch = source.match(iframePattern);
      
      if (iframeMatch && iframeMatch[1]) {
        const redirectUrl = iframeMatch[1];
        const redirectResponse = await this.http.get(redirectUrl, {
          headers: { 'Sec-Fetch-Dest': 'iframe' }
        });
        
        if (redirectResponse.ok) {
          source = redirectResponse.body;
        }
      }

      // Find and unpack script with data-cfasync="false"
      const scriptPattern = /<script\s+[^>]*?data-cfasync=["']?false["']?[^>]*>(.+?)<\/script>/gs;
      let match;
      
      while ((match = scriptPattern.exec(source)) !== null) {
        const scriptContent = match[1].trim();
        
        if (scriptContent.startsWith('eval(')) {
          const unpacked = this._unpack(scriptContent);
          
          if (unpacked) {
            // Look for m3u8 URL
            const videoMatch = unpacked.match(/file:\s*"([^"]+\.m3u8[^"]*)"/);
            
            if (videoMatch && videoMatch[1]) {
              return {
                url: videoMatch[1],
                format: 'm3u8',
                quality: 'Auto',
                server: 'Filemoon'
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Filemoon extraction error:', error);
      return null;
    }
  },

  // ==========================================================================
  // Doodstream Extractor
  // ==========================================================================

  /**
   * Generate random string
   * @param {number} length - String length
   * @returns {string} Random string
   * @private
   */
  _randomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Get current timestamp in milliseconds (like JS Date.now())
   * @returns {number} Timestamp
   * @private
   */
  _jsDateNow() {
    return Date.now();
  },

  /**
   * Extract from Doodstream
   * Pattern: /pass_md5/[\w-]+/(?P<token>[\w-]+)
   * Requires headers with Referer
   * @param {string} url - Hoster URL
   * @returns {Promise<Object|null>} Stream source or null
   */
  async extractDoodstream(url) {
    try {
      const response = await this.http.get(url, {
        headers: { 'Referer': url }
      });
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // Pattern: /pass_md5/[\w-]+/(?P<token>[\w-]+)
      const pattern = /\/pass_md5\/([\w-]+)\/([\w-]+)/;
      const match = response.body.match(pattern);
      
      if (!match) {
        return null;
      }

      const fullPath = match[0];
      const token = match[2];

      // Get the base URL for referer
      const urlObj = new URL(response.url || url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      // Make second request to get the actual URL
      const passResponse = await this.http.get(`${baseUrl}${fullPath}`, {
        headers: { 'Referer': response.url || url }
      });
      
      if (!passResponse.ok) {
        throw new Error(`Pass request failed: ${passResponse.status}`);
      }

      // Construct final URL
      const randomStr = this._randomString();
      const timestamp = this._jsDateNow();
      const videoUrl = `${passResponse.body}${randomStr}?token=${token}&expiry=${timestamp}`;
      
      return {
        url: videoUrl,
        format: 'mp4',
        quality: 'Default',
        server: 'Doodstream',
        headers: {
          'Referer': `${baseUrl}/`
        },
        requiresHeaders: true
      };
    } catch (error) {
      console.error('Doodstream extraction error:', error);
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
