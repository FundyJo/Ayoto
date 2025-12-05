/**
 * Ayoto JavaScript/TypeScript Plugin Runtime
 * 
 * A sandboxed runtime for executing JavaScript/TypeScript plugins.
 * Plugins can perform web scraping and interact with anime provider APIs.
 * 
 * Features:
 * - Sandboxed execution environment
 * - Built-in HTTP client for web scraping (via Tauri's HTTP plugin)
 * - HTML parsing utilities
 * - Rate limiting support
 * - Plugin lifecycle management
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Plugin type enumeration
 */
export const PLUGIN_TYPE = {
  MEDIA_PROVIDER: 'mediaProvider',
  STREAM_PROVIDER: 'streamProvider'
}

/**
 * Stream format types
 */
export const STREAM_FORMAT = {
  M3U8: 'm3u8',
  MP4: 'mp4',
  MKV: 'mkv',
  WEBM: 'webm',
  TORRENT: 'torrent'
}

// ============================================================================
// HTTP Client for Web Scraping
// ============================================================================

/**
 * HTTP Client wrapper for plugin web scraping
 * Uses Tauri's HTTP plugin for making requests with full TLS support
 */
class PluginHttpClient {
  constructor(config = {}) {
    this.userAgent = config.userAgent || 'Ayoto/2.5.4'
    this.defaultTimeout = config.timeout || 30000
    this.rateLimitMs = config.rateLimitMs || 0
    this.lastRequestTime = 0
  }

  /**
   * Wait for rate limit if configured
   */
  async waitForRateLimit() {
    if (this.rateLimitMs > 0) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.rateLimitMs) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - timeSinceLastRequest))
      }
      this.lastRequestTime = Date.now()
    }
  }

  /**
   * Make an HTTP GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response with body, status, headers
   */
  async get(url, options = {}) {
    return this.request('GET', url, options)
  }

  /**
   * Make an HTTP POST request
   * @param {string} url - Request URL  
   * @param {string|Object} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async post(url, body, options = {}) {
    return this.request('POST', url, { ...options, body })
  }

  /**
   * Make a generic HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async request(method, url, options = {}) {
    await this.waitForRateLimit()

    const headers = {
      'User-Agent': this.userAgent,
      ...options.headers
    }

    try {
      const fetchOptions = {
        method,
        headers,
        connectTimeout: options.timeout || this.defaultTimeout
      }

      if (options.body) {
        if (typeof options.body === 'object') {
          fetchOptions.body = JSON.stringify(options.body)
          headers['Content-Type'] = 'application/json'
        } else {
          fetchOptions.body = options.body
        }
      }

      const response = await tauriFetch(url, fetchOptions)
      const responseText = await response.text()

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
        ok: response.ok,
        url: response.url
      }
    } catch (error) {
      return {
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: '',
        ok: false,
        error: error.message
      }
    }
  }

  /**
   * Fetch and parse JSON
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async getJson(url, options = {}) {
    const response = await this.get(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    try {
      return JSON.parse(response.body)
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`)
    }
  }

  /**
   * Make multiple HTTP requests in parallel for better performance
   * @param {Array<{url: string, options?: Object}>} requests - Array of request configurations
   * @returns {Promise<Object[]>} Array of responses in the same order as requests
   */
  async getAll(requests) {
    return Promise.all(requests.map(req => this.get(req.url, req.options || {})))
  }

  /**
   * Make multiple JSON requests in parallel for better performance
   * @param {Array<{url: string, options?: Object}>} requests - Array of request configurations
   * @returns {Promise<Object[]>} Array of parsed JSON responses in the same order as requests
   */
  async getAllJson(requests) {
    return Promise.all(requests.map(req => this.getJson(req.url, req.options || {})))
  }

  /**
   * Make multiple HTTP requests in parallel with settled promises (no rejection on failure)
   * Each result contains { status: 'fulfilled'|'rejected', value?, reason? }
   * @param {Array<{url: string, options?: Object}>} requests - Array of request configurations
   * @returns {Promise<PromiseSettledResult<Object>[]>} Array of settled promise results
   */
  async getAllSettled(requests) {
    return Promise.allSettled(requests.map(req => this.get(req.url, req.options || {})))
  }

  /**
   * Make multiple JSON requests in parallel with settled promises (no rejection on failure)
   * Each result contains { status: 'fulfilled'|'rejected', value?, reason? }
   * @param {Array<{url: string, options?: Object}>} requests - Array of request configurations
   * @returns {Promise<PromiseSettledResult<Object>[]>} Array of settled promise results
   */
  async getAllJsonSettled(requests) {
    return Promise.allSettled(requests.map(req => this.getJson(req.url, req.options || {})))
  }
}

// ============================================================================
// HTML Parser Utilities
// ============================================================================

/**
 * Simple HTML parser utilities for web scraping
 * These utilities work with HTML strings without requiring a DOM
 */
export const HtmlParser = {
  /**
   * Extract text content between tags
   * @param {string} html - HTML string
   * @param {string} selector - CSS-like selector (basic support)
   * @returns {string[]} Matched text contents
   */
  extractText(html, selector) {
    const results = []
    const regex = this._selectorToRegex(selector)
    
    if (regex) {
      let match
      while ((match = regex.exec(html)) !== null) {
        const content = match[1] || match[0]
        // Remove nested tags and get text
        const text = content.replace(/<[^>]+>/g, '').trim()
        if (text) {
          results.push(text)
        }
      }
    }
    
    return results
  },

  /**
   * Extract attribute values
   * @param {string} html - HTML string
   * @param {string} tagName - Tag name to search
   * @param {string} attrName - Attribute name to extract
   * @returns {string[]} Attribute values
   */
  extractAttribute(html, tagName, attrName) {
    const regex = new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, 'gi')
    const results = []
    let match
    
    while ((match = regex.exec(html)) !== null) {
      results.push(match[1])
    }
    
    return results
  },

  /**
   * Extract all links (href attributes)
   * @param {string} html - HTML string
   * @returns {string[]} URLs
   */
  extractLinks(html) {
    return this.extractAttribute(html, 'a', 'href')
  },

  /**
   * Extract all image sources
   * @param {string} html - HTML string
   * @returns {string[]} Image URLs
   */
  extractImages(html) {
    const srcResults = this.extractAttribute(html, 'img', 'src')
    const dataSrcResults = this.extractAttribute(html, 'img', 'data-src')
    return [...srcResults, ...dataSrcResults]
  },

  /**
   * Extract elements by class
   * @param {string} html - HTML string
   * @param {string} className - CSS class name
   * @returns {string[]} Matched HTML elements
   */
  extractByClass(html, className) {
    const regex = new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'gi')
    const results = []
    let match
    
    while ((match = regex.exec(html)) !== null) {
      results.push(match[1])
    }
    
    return results
  },

  /**
   * Extract element by ID
   * @param {string} html - HTML string
   * @param {string} id - Element ID
   * @returns {string|null} Matched HTML content
   */
  extractById(html, id) {
    const regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'i')
    const match = html.match(regex)
    return match ? match[1] : null
  },

  /**
   * Convert basic CSS selector to regex
   * @param {string} selector - CSS selector
   * @returns {RegExp|null} Corresponding regex
   */
  _selectorToRegex(selector) {
    // Basic selector support: tag, .class, #id, tag.class, tag#id
    if (selector.startsWith('#')) {
      const id = selector.slice(1)
      return new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'gi')
    } else if (selector.startsWith('.')) {
      const className = selector.slice(1)
      return new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'gi')
    } else if (selector.includes('.')) {
      const [tag, className] = selector.split('.')
      return new RegExp(`<${tag}[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    } else if (selector.includes('#')) {
      const [tag, id] = selector.split('#')
      return new RegExp(`<${tag}[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    } else {
      // Simple tag selector
      return new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi')
    }
  },

  /**
   * Decode HTML entities
   * @param {string} html - HTML string with entities
   * @returns {string} Decoded string
   */
  decodeEntities(html) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&ndash;': '–',
      '&mdash;': '—'
    }
    
    let result = html
    for (const [entity, char] of Object.entries(entities)) {
      result = result.replace(new RegExp(entity, 'g'), char)
    }
    
    // Handle numeric entities
    result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    
    return result
  },

  /**
   * Extract JSON from script tag
   * @param {string} html - HTML string
   * @param {string} varName - JavaScript variable name (optional)
   * @returns {Object|null} Parsed JSON
   */
  extractJsonFromScript(html, varName = null) {
    let regex
    if (varName) {
      regex = new RegExp(`(?:var|let|const)\\s+${varName}\\s*=\\s*({[\\s\\S]*?});`, 'i')
    } else {
      regex = /<script[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\\s\\S]*?)<\/script>/i
    }
    
    const match = html.match(regex)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch (e) {
        return null
      }
    }
    return null
  }
}

// ============================================================================
// Plugin Context
// ============================================================================

/**
 * Context provided to plugins for accessing host functionality
 */
export class PluginContext {
  constructor(pluginId, config = {}) {
    this.pluginId = pluginId
    this.http = new PluginHttpClient(config)
    this.html = HtmlParser
    this.storage = new PluginStorage(pluginId)
  }

  /**
   * Log a message (visible in developer tools)
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   */
  log(level, message) {
    const prefix = `[Plugin:${this.pluginId}]`
    switch (level) {
      case 'error':
        console.error(prefix, message)
        break
      case 'warn':
        console.warn(prefix, message)
        break
      default:
        console.log(prefix, message)
    }
  }

  /**
   * Get the current Ayoto version
   * @returns {string} Version string
   */
  getAyotoVersion() {
    return '2.5.4'
  }
}

// ============================================================================
// Plugin Storage
// ============================================================================

/**
 * Simple key-value storage for plugins
 */
class PluginStorage {
  constructor(pluginId) {
    this.prefix = `ayoto_plugin_${pluginId}_`
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Stored value or default
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(this.prefix + key)
      return value ? JSON.parse(value) : defaultValue
    } catch {
      return defaultValue
    }
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (e) {
      console.error('Plugin storage error:', e)
    }
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   */
  remove(key) {
    localStorage.removeItem(this.prefix + key)
  }

  /**
   * Clear all plugin storage
   */
  clear() {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

// ============================================================================
// JavaScript Plugin Instance
// ============================================================================

/**
 * Represents a loaded JavaScript plugin instance
 */
export class JSPlugin {
  constructor(manifest, code) {
    this.manifest = manifest
    this.code = code
    this.context = new PluginContext(manifest.id, manifest.scrapingConfig)
    this.instance = null
    this.initialized = false
  }

  /**
   * Initialize the plugin by evaluating its code
   */
  async initialize() {
    if (this.initialized) return

    try {
      // Create a sandboxed function from the plugin code
      // The plugin code should export a class or object with the provider methods
      const pluginModule = this._createPluginModule()
      
      if (pluginModule) {
        this.instance = pluginModule
        
        // Call plugin's init method if it exists
        if (typeof this.instance.init === 'function') {
          await this.instance.init(this.context)
        }
        
        this.initialized = true
      }
    } catch (error) {
      console.error(`Failed to initialize plugin ${this.manifest.id}:`, error)
      throw error
    }
  }

  /**
   * Create the plugin module from code
   * @returns {Object} Plugin module instance
   */
  _createPluginModule() {
    try {
      // Create a function that returns the plugin module
      // The plugin code should use module.exports or return an object
      const moduleWrapper = new Function(
        'context', 
        'http', 
        'html', 
        'storage',
        'STREAM_FORMAT',
        'PLUGIN_TYPE',
        `
        const module = { exports: {} };
        const exports = module.exports;
        ${this.code}
        return module.exports;
        `
      )

      return moduleWrapper(
        this.context,
        this.context.http,
        this.context.html,
        this.context.storage,
        STREAM_FORMAT,
        PLUGIN_TYPE
      )
    } catch (error) {
      console.error('Plugin code evaluation error:', error)
      throw error
    }
  }

  /**
   * Shutdown the plugin
   */
  async shutdown() {
    if (this.instance && typeof this.instance.shutdown === 'function') {
      await this.instance.shutdown()
    }
    this.initialized = false
    this.instance = null
  }

  /**
   * Check if plugin has a capability
   * @param {string} capability - Capability name
   * @returns {boolean}
   */
  hasCapability(capability) {
    return this.manifest.capabilities?.[capability] === true
  }

  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Search results
   */
  async search(query, page = 1) {
    if (!this.hasCapability('search')) {
      throw new Error('Plugin does not support search')
    }
    if (!this.instance?.search) {
      throw new Error('Plugin does not implement search method')
    }
    return this.instance.search(query, page)
  }

  /**
   * Get popular anime
   * @param {number} page - Page number
   * @returns {Promise<Object>} Popular anime list
   */
  async getPopular(page = 1) {
    if (!this.hasCapability('getPopular')) {
      throw new Error('Plugin does not support getPopular')
    }
    if (!this.instance?.getPopular) {
      throw new Error('Plugin does not implement getPopular method')
    }
    return this.instance.getPopular(page)
  }

  /**
   * Get latest anime/episodes
   * @param {number} page - Page number
   * @returns {Promise<Object>} Latest anime list
   */
  async getLatest(page = 1) {
    if (!this.hasCapability('getLatest')) {
      throw new Error('Plugin does not support getLatest')
    }
    if (!this.instance?.getLatest) {
      throw new Error('Plugin does not implement getLatest method')
    }
    return this.instance.getLatest(page)
  }

  /**
   * Get episodes for an anime
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Object>} Episode list
   */
  async getEpisodes(animeId, page = 1) {
    if (!this.hasCapability('getEpisodes')) {
      throw new Error('Plugin does not support getEpisodes')
    }
    if (!this.instance?.getEpisodes) {
      throw new Error('Plugin does not implement getEpisodes method')
    }
    return this.instance.getEpisodes(animeId, page)
  }

  /**
   * Get stream sources for an episode
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<Object>} Stream sources
   */
  async getStreams(animeId, episodeId) {
    if (!this.hasCapability('getStreams')) {
      throw new Error('Plugin does not support getStreams')
    }
    if (!this.instance?.getStreams) {
      throw new Error('Plugin does not implement getStreams method')
    }
    return this.instance.getStreams(animeId, episodeId)
  }

  /**
   * Get anime details
   * @param {string} animeId - Anime ID
   * @returns {Promise<Object>} Anime details
   */
  async getAnimeDetails(animeId) {
    if (!this.hasCapability('getAnimeDetails')) {
      throw new Error('Plugin does not support getAnimeDetails')
    }
    if (!this.instance?.getAnimeDetails) {
      throw new Error('Plugin does not implement getAnimeDetails method')
    }
    return this.instance.getAnimeDetails(animeId)
  }

  /**
   * Extract stream from URL (for stream providers)
   * @param {string} url - Hoster URL
   * @returns {Promise<Object>} Extracted stream source
   */
  async extractStream(url) {
    if (!this.hasCapability('extractStream')) {
      throw new Error('Plugin does not support extractStream')
    }
    if (!this.instance?.extractStream) {
      throw new Error('Plugin does not implement extractStream method')
    }
    return this.instance.extractStream(url)
  }

  /**
   * Get hoster info (for stream providers)
   * @param {string} url - Hoster URL
   * @returns {Promise<Object>} Hoster information
   */
  async getHosterInfo(url) {
    if (!this.hasCapability('getHosterInfo')) {
      throw new Error('Plugin does not support getHosterInfo')
    }
    if (!this.instance?.getHosterInfo) {
      throw new Error('Plugin does not implement getHosterInfo method')
    }
    return this.instance.getHosterInfo(url)
  }
}

// ============================================================================
// Plugin Manager
// ============================================================================

/**
 * Manages JavaScript plugins
 */
export class JSPluginManager {
  constructor() {
    this.plugins = new Map()
    this.loadFromStorage()
  }

  /**
   * Load plugins from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('ayoto_js_plugins')
      if (stored) {
        const data = JSON.parse(stored)
        // Store manifests and code, but don't initialize until needed
        for (const item of data) {
          this.plugins.set(item.manifest.id, {
            manifest: item.manifest,
            code: item.code,
            instance: null,
            enabled: item.enabled ?? true
          })
        }
      }
    } catch (error) {
      console.error('Failed to load plugins from storage:', error)
    }
  }

  /**
   * Save plugins to localStorage
   */
  saveToStorage() {
    try {
      const data = Array.from(this.plugins.values()).map(p => ({
        manifest: p.manifest,
        code: p.code,
        enabled: p.enabled
      }))
      localStorage.setItem('ayoto_js_plugins', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save plugins to storage:', error)
    }
  }

  /**
   * Validate a plugin manifest
   * @param {Object} manifest - Plugin manifest
   * @returns {Object} Validation result
   */
  validateManifest(manifest) {
    const errors = []
    const warnings = []

    if (!manifest.id || typeof manifest.id !== 'string') {
      errors.push('Plugin ID is required and must be a string')
    } else if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
      errors.push('Plugin ID must contain only alphanumeric characters, hyphens, and underscores')
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Plugin name is required')
    }

    if (!manifest.version || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(manifest.version)) {
      errors.push('Plugin version must be in semver format (e.g., 1.0.0)')
    }

    if (!manifest.pluginType || !Object.values(PLUGIN_TYPE).includes(manifest.pluginType)) {
      warnings.push(`Plugin type should be one of: ${Object.values(PLUGIN_TYPE).join(', ')}`)
      manifest.pluginType = PLUGIN_TYPE.MEDIA_PROVIDER
    }

    if (!manifest.capabilities || typeof manifest.capabilities !== 'object') {
      warnings.push('Plugin capabilities not specified')
      manifest.capabilities = {}
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Load a plugin from code string
   * @param {Object} manifest - Plugin manifest
   * @param {string} code - Plugin JavaScript code
   * @returns {Object} Load result
   */
  async loadPlugin(manifest, code) {
    const validation = this.validateManifest(manifest)
    
    if (!validation.valid) {
      return {
        success: false,
        pluginId: manifest?.id,
        errors: validation.errors,
        warnings: validation.warnings
      }
    }

    // Check if plugin is already loaded
    if (this.plugins.has(manifest.id)) {
      await this.unloadPlugin(manifest.id)
    }

    try {
      // Create plugin instance
      const jsPlugin = new JSPlugin(manifest, code)
      await jsPlugin.initialize()

      // Store the plugin
      this.plugins.set(manifest.id, {
        manifest,
        code,
        instance: jsPlugin,
        enabled: true
      })

      this.saveToStorage()

      return {
        success: true,
        pluginId: manifest.id,
        errors: [],
        warnings: validation.warnings
      }
    } catch (error) {
      return {
        success: false,
        pluginId: manifest.id,
        errors: [error.message],
        warnings: validation.warnings
      }
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin ID
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (plugin?.instance) {
      await plugin.instance.shutdown()
    }
    this.plugins.delete(pluginId)
    this.saveToStorage()
  }

  /**
   * Get plugin instance (initializing if needed)
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<JSPlugin|null>} Plugin instance or null if disabled
   */
  async getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return null

    // Return null for disabled plugins without initializing
    if (!plugin.enabled) return null

    if (!plugin.instance) {
      // Lazy initialize
      const jsPlugin = new JSPlugin(plugin.manifest, plugin.code)
      await jsPlugin.initialize()
      plugin.instance = jsPlugin
    }

    return plugin.instance
  }

  /**
   * Get all plugin info
   * @returns {Object[]} Plugin info array
   */
  getAllPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      pluginType: p.manifest.pluginType,
      description: p.manifest.description,
      author: p.manifest.author,
      capabilities: p.manifest.capabilities,
      icon: p.manifest.icon,
      iconUrl: p.manifest.iconUrl,
      supportedLanguages: p.manifest.supportedLanguages,
      requiredDomains: p.manifest.security?.allowedDomains || [],
      enabled: p.enabled
    }))
  }

  /**
   * Get enabled plugins
   * @returns {Object[]} Enabled plugin info array
   */
  getEnabledPlugins() {
    return this.getAllPlugins().filter(p => p.enabled)
  }

  /**
   * Set plugin enabled state
   * @param {string} pluginId - Plugin ID
   * @param {boolean} enabled - Enabled state
   */
  setPluginEnabled(pluginId, enabled) {
    const plugin = this.plugins.get(pluginId)
    if (plugin) {
      plugin.enabled = enabled
      this.saveToStorage()
    }
  }

  /**
   * Get plugins by type
   * @param {string} pluginType - Plugin type
   * @returns {Object[]} Matching plugins
   */
  getPluginsByType(pluginType) {
    return this.getEnabledPlugins().filter(p => p.pluginType === pluginType)
  }

  /**
   * Get media provider plugins
   * @returns {Object[]} Media provider plugins
   */
  getMediaProviders() {
    return this.getPluginsByType(PLUGIN_TYPE.MEDIA_PROVIDER)
  }

  /**
   * Get stream provider plugins
   * @returns {Object[]} Stream provider plugins
   */
  getStreamProviders() {
    return this.getPluginsByType(PLUGIN_TYPE.STREAM_PROVIDER)
  }

  /**
   * Get plugins with a specific capability
   * @param {string} capability - Capability name
   * @returns {Object[]} Plugins with the capability
   */
  getPluginsWithCapability(capability) {
    return this.getEnabledPlugins().filter(p => p.capabilities?.[capability] === true)
  }
}

// Export singleton instance
export const jsPluginManager = new JSPluginManager()

export default JSPluginManager
