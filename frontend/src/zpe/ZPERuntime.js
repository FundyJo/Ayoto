/**
 * ZPE Runtime
 * 
 * Secure runtime environment for executing ZPE plugins:
 * - Sandboxed JavaScript execution
 * - Permission-controlled API access
 * - Rate limiting and resource management
 * - Plugin lifecycle management
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

import {
  ZPE_PLUGIN_STATE,
  ZPE_PLUGIN_TYPE,
  ZPE_STREAM_FORMAT,
  ZPE_PERMISSION,
  validateZPEManifest
} from './ZPEManifest.js'

import {
  permissionManager,
  verifyIntegrityHash,
  auditPluginCode,
  isUrlAllowed,
  executeSandboxed
} from './ZPESecurity.js'

import { ZPEParser } from './ZPEBuilder.js'
import { updateManager } from './ZPEVersionChecker.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default rate limit (requests per second)
 */
const DEFAULT_RATE_LIMIT = 1000

/**
 * Default request timeout (ms)
 */
const DEFAULT_TIMEOUT = 30000

/**
 * Maximum plugins that can be loaded
 */
const MAX_PLUGINS = 50

// ============================================================================
// Plugin HTTP Client (Secure)
// ============================================================================

/**
 * Secure HTTP client for plugin use
 * Enforces domain allowlists and rate limiting
 */
class ZPEHttpClient {
  constructor(pluginId, config = {}) {
    this.pluginId = pluginId
    this.userAgent = config.userAgent || 'Ayoto-ZPE/1.0'
    this.defaultTimeout = config.timeout || DEFAULT_TIMEOUT
    this.rateLimitMs = config.rateLimitMs || DEFAULT_RATE_LIMIT
    this.allowedDomains = config.allowedDomains || []
    this.lastRequestTime = 0
    this.requestCount = 0
  }

  /**
   * Check if plugin has HTTP permission
   * @throws {Error} If permission denied
   */
  _checkPermission() {
    if (!permissionManager.canUseHttp(this.pluginId)) {
      throw new Error('HTTP permission denied')
    }
  }

  /**
   * Check if URL is allowed
   * @param {string} url - URL to check
   * @throws {Error} If URL not allowed
   */
  _checkUrl(url) {
    if (this.allowedDomains.length > 0 && !isUrlAllowed(url, this.allowedDomains)) {
      throw new Error(`Domain not allowed: ${new URL(url).hostname}`)
    }
  }

  /**
   * Wait for rate limit
   */
  async _waitForRateLimit() {
    if (this.rateLimitMs > 0) {
      const now = Date.now()
      const elapsed = now - this.lastRequestTime
      if (elapsed < this.rateLimitMs) {
        await new Promise(r => setTimeout(r, this.rateLimitMs - elapsed))
      }
      this.lastRequestTime = Date.now()
    }
    this.requestCount++
  }

  /**
   * Make an HTTP GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async get(url, options = {}) {
    return this.request('GET', url, options)
  }

  /**
   * Make an HTTP POST request
   * @param {string} url - Request URL
   * @param {*} body - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async post(url, body, options = {}) {
    return this.request('POST', url, { ...options, body })
  }

  /**
   * Make an HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async request(method, url, options = {}) {
    this._checkPermission()
    this._checkUrl(url)
    await this._waitForRateLimit()

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
      const body = await response.text()

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        ok: response.ok,
        url: response.url
      }
    } catch (error) {
      console.error(`[ZPE:${this.pluginId}] HTTP error:`, error)
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
   * Get JSON response
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Parsed JSON
   */
  async getJson(url, options = {}) {
    const response = await this.get(url, {
      ...options,
      headers: { 'Accept': 'application/json', ...options.headers }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return JSON.parse(response.body)
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

  /**
   * Get request statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    }
  }
}

// ============================================================================
// Plugin Storage (Secure)
// ============================================================================

/**
 * Secure storage for plugins
 * Isolated per plugin with size limits
 */
class ZPEStorage {
  constructor(pluginId, maxSize = 5 * 1024 * 1024) { // 5MB default
    this.pluginId = pluginId
    this.prefix = `zpe_${pluginId}_`
    this.maxSize = maxSize
  }

  /**
   * Check storage permission
   * @throws {Error} If permission denied
   */
  _checkPermission() {
    if (!permissionManager.canUseStorage(this.pluginId)) {
      throw new Error('Storage permission denied')
    }
  }

  /**
   * Get current storage size
   * @returns {number} Size in bytes
   */
  _getCurrentSize() {
    let size = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key)
        if (value) {
          size += key.length + value.length
        }
      }
    }
    return size * 2 // UTF-16 = 2 bytes per char
  }

  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default if not found
   * @returns {*} Stored value
   */
  get(key, defaultValue = null) {
    this._checkPermission()
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
    this._checkPermission()
    
    const serialized = JSON.stringify(value)
    const newSize = (this.prefix + key).length * 2 + serialized.length * 2
    
    if (this._getCurrentSize() + newSize > this.maxSize) {
      throw new Error('Storage quota exceeded')
    }
    
    localStorage.setItem(this.prefix + key, serialized)
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   */
  remove(key) {
    this._checkPermission()
    localStorage.removeItem(this.prefix + key)
  }

  /**
   * Clear all plugin storage
   */
  clear() {
    this._checkPermission()
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  }

  /**
   * Get all keys for this plugin
   * @returns {string[]} Array of keys
   */
  keys() {
    this._checkPermission()
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length))
      }
    }
    return keys
  }

  /**
   * Get storage usage info
   * @returns {Object} Usage info
   */
  getUsage() {
    return {
      used: this._getCurrentSize(),
      max: this.maxSize,
      percentage: (this._getCurrentSize() / this.maxSize) * 100
    }
  }
}

// ============================================================================
// HTML Parser (Safe)
// ============================================================================

/**
 * Safe HTML parser utilities
 */
const ZPEHtmlParser = {
  /**
   * Extract text by CSS selector (basic support)
   */
  extractText(html, selector) {
    const results = []
    const regex = this._selectorToRegex(selector)
    
    if (regex) {
      let match
      while ((match = regex.exec(html)) !== null) {
        const content = match[1] || match[0]
        // Safely strip HTML tags using iterative replacement to handle nested tags
        const text = this._stripHtmlTags(content).trim()
        if (text) results.push(text)
      }
    }
    
    return results
  },

  /**
   * Safely strip HTML tags from content
   * Uses iterative replacement to handle nested and incomplete tags
   * @private
   */
  _stripHtmlTags(html) {
    if (!html) return ''
    let result = html
    let previous
    // Iteratively remove tags until no more changes occur
    // This handles cases like <<script>script> attack vectors
    do {
      previous = result
      result = result.replace(/<[^>]*>/g, '')
    } while (result !== previous && result.includes('<'))
    // Also remove any remaining angle brackets
    return result.replace(/[<>]/g, '')
  },

  /**
   * Extract attribute values
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
   * Extract links
   */
  extractLinks(html) {
    return this.extractAttribute(html, 'a', 'href')
  },

  /**
   * Extract images
   */
  extractImages(html) {
    return [
      ...this.extractAttribute(html, 'img', 'src'),
      ...this.extractAttribute(html, 'img', 'data-src')
    ]
  },

  /**
   * Extract by class name
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
   * Extract by ID
   */
  extractById(html, id) {
    const regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'i')
    const match = html.match(regex)
    return match ? match[1] : null
  },

  /**
   * Decode HTML entities
   */
  decodeEntities(html) {
    const entities = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>',
      '&quot;': '"', '&#39;': "'", '&nbsp;': ' '
    }
    
    let result = html
    for (const [entity, char] of Object.entries(entities)) {
      result = result.replace(new RegExp(entity, 'g'), char)
    }
    
    result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    
    return result
  },

  /**
   * Extract JSON from script
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
      } catch {
        return null
      }
    }
    return null
  },

  /**
   * Convert selector to regex
   * @private
   */
  _selectorToRegex(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1)
      return new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'gi')
    } else if (selector.startsWith('.')) {
      const className = selector.slice(1)
      return new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'gi')
    } else if (selector.includes('.')) {
      const [tag, className] = selector.split('.')
      return new RegExp(`<${tag}[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    } else {
      return new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi')
    }
  }
}

// ============================================================================
// Plugin Context
// ============================================================================

/**
 * Context provided to plugins
 */
class ZPEContext {
  constructor(pluginId, manifest) {
    this.pluginId = pluginId
    this.manifest = manifest
    
    // Create secure HTTP client
    this.http = new ZPEHttpClient(pluginId, {
      userAgent: manifest.config?.userAgent,
      timeout: manifest.config?.timeout,
      rateLimitMs: manifest.config?.rateLimitMs,
      allowedDomains: manifest.security?.allowedDomains
    })
    
    // Create secure storage
    this.storage = new ZPEStorage(pluginId)
    
    // HTML parser
    this.html = ZPEHtmlParser
    
    // Constants
    this.STREAM_FORMAT = ZPE_STREAM_FORMAT
    this.PLUGIN_TYPE = ZPE_PLUGIN_TYPE
  }

  /**
   * Log a message
   */
  log(level, message) {
    const prefix = `[ZPE:${this.pluginId}]`
    switch (level) {
      case 'error': console.error(prefix, message); break
      case 'warn': console.warn(prefix, message); break
      default: console.log(prefix, message)
    }
  }

  /**
   * Get Ayoto version
   */
  getAppVersion() {
    return '2.5.4' // Should be dynamically fetched
  }

  /**
   * Get plugin version
   */
  getPluginVersion() {
    return this.manifest.version
  }
}

// ============================================================================
// Plugin Instance
// ============================================================================

/**
 * Represents a loaded ZPE plugin
 */
export class ZPEPlugin {
  constructor(manifest, code) {
    this.manifest = manifest
    this.code = code
    this.id = manifest.id
    this.state = ZPE_PLUGIN_STATE.UNLOADED
    this.context = null
    this.instance = null
    this.loadedAt = null
    this.errorMessage = null
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    if (this.state === ZPE_PLUGIN_STATE.ACTIVE) {
      return
    }

    this.state = ZPE_PLUGIN_STATE.LOADING

    try {
      // Create context
      this.context = new ZPEContext(this.id, this.manifest)

      // Execute plugin code in sandbox
      this.instance = executeSandboxed(this.code, this.id, this.context)

      // Call init if exists
      if (typeof this.instance.init === 'function') {
        await this.instance.init(this.context)
      }

      this.state = ZPE_PLUGIN_STATE.ACTIVE
      this.loadedAt = new Date()
      this.errorMessage = null

      console.log(`[ZPE] Plugin '${this.id}' initialized`)
    } catch (error) {
      this.state = ZPE_PLUGIN_STATE.ERROR
      this.errorMessage = error.message
      console.error(`[ZPE] Failed to initialize plugin '${this.id}':`, error)
      throw error
    }
  }

  /**
   * Shutdown the plugin
   */
  async shutdown() {
    if (this.state !== ZPE_PLUGIN_STATE.ACTIVE) {
      return
    }

    try {
      if (this.instance && typeof this.instance.shutdown === 'function') {
        await this.instance.shutdown()
      }
    } catch (error) {
      console.error(`[ZPE] Error during shutdown of '${this.id}':`, error)
    }

    this.state = ZPE_PLUGIN_STATE.UNLOADED
    this.instance = null
    this.context = null
  }

  /**
   * Check if plugin has capability
   */
  hasCapability(capability) {
    return this.manifest.capabilities?.[capability] === true
  }

  /**
   * Call a plugin method
   * @private
   */
  async _callMethod(method, ...args) {
    if (this.state !== ZPE_PLUGIN_STATE.ACTIVE) {
      throw new Error(`Plugin '${this.id}' is not active`)
    }

    if (!this.instance?.[method]) {
      throw new Error(`Plugin '${this.id}' does not implement '${method}'`)
    }

    return this.instance[method](...args)
  }

  // Plugin API methods
  async search(query, page = 1) {
    if (!this.hasCapability('search')) throw new Error('search not supported')
    return this._callMethod('search', query, page)
  }

  async getPopular(page = 1) {
    if (!this.hasCapability('getPopular')) throw new Error('getPopular not supported')
    return this._callMethod('getPopular', page)
  }

  async getLatest(page = 1) {
    if (!this.hasCapability('getLatest')) throw new Error('getLatest not supported')
    return this._callMethod('getLatest', page)
  }

  async getEpisodes(animeId, page = 1) {
    if (!this.hasCapability('getEpisodes')) throw new Error('getEpisodes not supported')
    return this._callMethod('getEpisodes', animeId, page)
  }

  async getStreams(animeId, episodeId) {
    if (!this.hasCapability('getStreams')) throw new Error('getStreams not supported')
    return this._callMethod('getStreams', animeId, episodeId)
  }

  async getAnimeDetails(animeId) {
    if (!this.hasCapability('getAnimeDetails')) throw new Error('getAnimeDetails not supported')
    return this._callMethod('getAnimeDetails', animeId)
  }

  async extractStream(url) {
    if (!this.hasCapability('extractStream')) throw new Error('extractStream not supported')
    return this._callMethod('extractStream', url)
  }

  async getHosterInfo(url) {
    if (!this.hasCapability('getHosterInfo')) throw new Error('getHosterInfo not supported')
    return this._callMethod('getHosterInfo', url)
  }

  /**
   * Get plugin info
   */
  getInfo() {
    return {
      id: this.id,
      name: this.manifest.name,
      version: this.manifest.version,
      description: this.manifest.description,
      author: this.manifest.author,
      pluginType: this.manifest.pluginType,
      capabilities: this.manifest.capabilities,
      permissions: this.manifest.permissions,
      state: this.state,
      loadedAt: this.loadedAt,
      errorMessage: this.errorMessage
    }
  }
}

// ============================================================================
// Plugin Manager
// ============================================================================

/**
 * ZPE Plugin Manager
 * Manages plugin loading, lifecycle, and access
 */
export class ZPEPluginManager {
  constructor() {
    this.plugins = new Map()
    this.loadOrder = []
  }

  /**
   * Load plugins from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('zpe_plugins')
      if (stored) {
        const data = JSON.parse(stored)
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
      console.error('[ZPE] Failed to load plugins from storage:', error)
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
      localStorage.setItem('zpe_plugins', JSON.stringify(data))
    } catch (error) {
      console.error('[ZPE] Failed to save plugins to storage:', error)
    }
  }

  /**
   * Load a plugin from ZPE file data
   * @param {ArrayBuffer|Uint8Array} data - ZPE file data
   * @returns {Promise<Object>} Load result
   */
  async loadFromZPE(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    
    // Log file info for debugging
    console.log('[ZPE] Loading plugin file...')
    console.log('[ZPE] File size:', bytes.length, 'bytes')
    
    // Log first few bytes for debugging
    if (bytes.length >= 4) {
      const firstBytes = Array.from(bytes.slice(0, Math.min(16, bytes.length)))
      const hexDump = firstBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      console.log('[ZPE] First bytes (hex):', hexDump)
    }
    
    try {
      // Parse ZPE file
      const parsed = ZPEParser.parse(data)
      console.log('[ZPE] File parsed successfully')
      console.log('[ZPE] Plugin ID:', parsed.manifest?.id)
      console.log('[ZPE] Plugin name:', parsed.manifest?.name)
      console.log('[ZPE] Plugin version:', parsed.manifest?.version)

      if (parsed.encrypted) {
        console.warn('[ZPE] Plugin is encrypted')
        return {
          success: false,
          errors: ['Encrypted plugins require decryption key'],
          pluginId: parsed.manifest?.id
        }
      }

      // Verify integrity
      console.log('[ZPE] Verifying plugin integrity...')
      const verification = await ZPEParser.verify(data)
      if (!verification.valid) {
        console.error('[ZPE] Integrity verification failed:', verification.errors)
        return {
          success: false,
          errors: verification.errors,
          warnings: verification.warnings,
          pluginId: parsed.manifest?.id
        }
      }
      console.log('[ZPE] Integrity verification passed')

      // Extract icon from assets if present
      if (parsed.assets?.icon?.data && parsed.assets?.icon?.mimeType) {
        // Update manifest with the base64 icon data URL
        parsed.manifest.icon = `data:${parsed.assets.icon.mimeType};base64,${parsed.assets.icon.data}`
        console.log('[ZPE] Icon loaded from assets')
      }

      // Load the plugin
      console.log('[ZPE] Loading plugin into runtime...')
      return this.loadPlugin(parsed.manifest, parsed.code)
    } catch (error) {
      console.error('[ZPE] Failed to load plugin:', error.message)
      if (error.stack) {
        console.error('[ZPE] Stack trace:', error.stack)
      }
      return {
        success: false,
        errors: [error.message]
      }
    }
  }

  /**
   * Load a plugin from manifest and code
   * @param {Object} manifest - Plugin manifest
   * @param {string} code - Plugin code
   * @returns {Promise<Object>} Load result
   */
  async loadPlugin(manifest, code) {
    const errors = []
    const warnings = []

    // Check max plugins limit
    if (this.plugins.size >= MAX_PLUGINS) {
      return {
        success: false,
        errors: [`Maximum plugin limit (${MAX_PLUGINS}) reached`],
        pluginId: manifest?.id
      }
    }

    // Validate manifest
    const validation = validateZPEManifest(manifest)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
        pluginId: manifest?.id
      }
    }
    warnings.push(...validation.warnings)

    // Security audit
    const audit = auditPluginCode(code)
    if (!audit.passed) {
      return {
        success: false,
        errors: audit.issues.map(i => i.message),
        warnings: audit.warnings.map(w => w.message),
        pluginId: manifest.id
      }
    }

    // Verify integrity if provided
    if (manifest.security?.integrityHash) {
      const valid = await verifyIntegrityHash(code, manifest.security.integrityHash)
      if (!valid) {
        return {
          success: false,
          errors: ['Plugin integrity verification failed'],
          pluginId: manifest.id
        }
      }
    }

    // Unload existing plugin with same ID
    if (this.plugins.has(manifest.id)) {
      await this.unloadPlugin(manifest.id)
    }

    try {
      // Grant permissions
      permissionManager.grantPermissions(manifest.id, manifest.permissions || [])

      // Create plugin instance
      const plugin = new ZPEPlugin(manifest, code)
      await plugin.initialize()

      // Store plugin
      this.plugins.set(manifest.id, {
        manifest,
        code,
        instance: plugin,
        enabled: true
      })

      this.loadOrder.push(manifest.id)
      this.saveToStorage()

      // Register for updates
      if (manifest.repository) {
        updateManager.registerPlugin(manifest.id, manifest)
      }

      return {
        success: true,
        pluginId: manifest.id,
        warnings
      }
    } catch (error) {
      // Revoke permissions on failure
      permissionManager.revokePermissions(manifest.id)

      return {
        success: false,
        errors: [error.message],
        warnings,
        pluginId: manifest.id
      }
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin ID
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    if (plugin.instance) {
      await plugin.instance.shutdown()
    }

    permissionManager.revokePermissions(pluginId)
    updateManager.unregisterPlugin(pluginId)

    this.plugins.delete(pluginId)
    this.loadOrder = this.loadOrder.filter(id => id !== pluginId)
    this.saveToStorage()

    console.log(`[ZPE] Plugin '${pluginId}' unloaded`)
  }

  /**
   * Get a plugin instance
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<ZPEPlugin|null>} Plugin instance
   */
  async getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return null

    // Lazy initialization
    if (!plugin.instance) {
      plugin.instance = new ZPEPlugin(plugin.manifest, plugin.code)
      permissionManager.grantPermissions(pluginId, plugin.manifest.permissions || [])
      await plugin.instance.initialize()
    }

    return plugin.enabled ? plugin.instance : null
  }

  /**
   * Get all plugins
   */
  getAllPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      author: p.manifest.author,
      pluginType: p.manifest.pluginType,
      capabilities: p.manifest.capabilities,
      icon: p.manifest.icon,
      iconUrl: p.manifest.iconUrl,
      supportedLanguages: p.manifest.supportedLanguages,
      requiredDomains: p.manifest.security?.allowedDomains || [],
      enabled: p.enabled,
      state: p.instance?.state || ZPE_PLUGIN_STATE.UNLOADED
    }))
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins() {
    return this.getAllPlugins().filter(p => p.enabled)
  }

  /**
   * Set plugin enabled state
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
   */
  getPluginsByType(type) {
    return this.getAllPlugins().filter(p => p.pluginType === type)
  }

  /**
   * Get media providers
   */
  getMediaProviders() {
    return this.getPluginsByType(ZPE_PLUGIN_TYPE.MEDIA_PROVIDER)
  }

  /**
   * Get stream providers
   */
  getStreamProviders() {
    return this.getPluginsByType(ZPE_PLUGIN_TYPE.STREAM_PROVIDER)
  }

  /**
   * Get plugins with capability
   */
  getPluginsWithCapability(capability) {
    return this.getEnabledPlugins().filter(p => p.capabilities?.[capability])
  }

  /**
   * Shutdown all plugins
   */
  async shutdownAll() {
    for (const [pluginId, plugin] of this.plugins) {
      if (plugin.instance) {
        try {
          await plugin.instance.shutdown()
        } catch (error) {
          console.error(`[ZPE] Error shutting down '${pluginId}':`, error)
        }
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const zpePluginManager = new ZPEPluginManager()

// Named exports for classes and utilities
export { ZPEContext, ZPEHttpClient, ZPEStorage, ZPEHtmlParser }

export default {
  ZPEPlugin,
  ZPEPluginManager,
  zpePluginManager,
  ZPEContext,
  ZPEHttpClient,
  ZPEStorage,
  ZPEHtmlParser
}
