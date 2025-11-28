/**
 * Ayoto Plugin Manager
 * Manages plugins with .ayoto file format support
 * 
 * Plugin Format (.ayoto):
 * - JSON file with special structure
 * - Defines provider capabilities (search, getPopular, getEpisodes, etc.)
 * - Specifies supported stream formats (m3u8, mp4, mkv, etc.)
 * - Optional Anime4K shader support flag for high-performance devices
 * 
 * Plugin Types:
 * 1. StreamProvider - Handles streaming analysis and video extraction from hosters
 *    like Voe, Vidoza, Filestream, etc.
 * 2. MediaProvider - Provides anime/media search and listings from sites
 *    like aniworld.to, s.to, etc.
 */

// Plugin types
export const PLUGIN_TYPES = {
  STREAM_PROVIDER: 'streamProvider',
  MEDIA_PROVIDER: 'mediaProvider'
}

// Supported stream formats
export const STREAM_FORMATS = {
  M3U8: 'm3u8',      // HLS format
  MP4: 'mp4',        // Direct MP4
  MKV: 'mkv',        // Matroska
  WEBM: 'webm',      // WebM
  TORRENT: 'torrent' // Torrent magnet links
}

// Anime4K shader presets
export const ANIME4K_PRESETS = {
  NONE: 'none',
  MODE_A: 'mode-a',           // Fast mode for weak GPUs
  MODE_B: 'mode-b',           // Balanced mode
  MODE_C: 'mode-c',           // High quality mode
  MODE_A_A: 'mode-a+a',       // Fast + additional shaders
  MODE_B_B: 'mode-b+b',       // Balanced + additional shaders
  MODE_C_A: 'mode-c+a'        // High quality + additional shaders
}

/**
 * Stream Provider Config structure
 * @typedef {Object} StreamProviderConfig
 * @property {string[]} supportedHosters - List of supported hosters (e.g., "voe", "vidoza")
 * @property {boolean} supportsEncrypted - Whether this provider can handle encrypted streams
 * @property {boolean} supportsDownload - Whether this provider supports direct download links
 * @property {string[]} urlPatterns - URL patterns that this provider can handle
 * @property {number} priority - Priority when multiple providers support same hoster
 */

/**
 * Media Provider Config structure
 * @typedef {Object} MediaProviderConfig
 * @property {string} baseUrl - Base URL of the media site
 * @property {string[]} languages - Languages supported by this provider
 * @property {string[]} contentTypes - Content types supported (anime, movie, series)
 * @property {boolean} requiresAuth - Whether the site requires authentication
 * @property {boolean} hasNsfw - Whether the provider has NSFW content
 */

/**
 * Episode object structure
 * @typedef {Object} Episode
 * @property {string} id - Episode ID
 * @property {number} number - Episode number
 * @property {string} title - Episode title
 * @property {string} [thumbnail] - Episode thumbnail URL
 * @property {string} [airDate] - Air date
 * @property {number} [duration] - Duration in seconds
 */

/**
 * PopulatedEpisode object structure with stream info
 * @typedef {Object} PopulatedEpisode
 * @property {string} id - Episode ID
 * @property {number} number - Episode number
 * @property {string} title - Episode title
 * @property {string} [thumbnail] - Episode thumbnail URL
 * @property {StreamSource[]} sources - Available stream sources
 */

/**
 * Stream source structure
 * @typedef {Object} StreamSource
 * @property {string} url - Stream URL
 * @property {string} format - Stream format (m3u8, mp4, etc.)
 * @property {string} quality - Quality label (1080p, 720p, etc.)
 * @property {boolean} [anime4kSupport] - Whether Anime4K shaders are recommended
 */

/**
 * Anime result structure
 * @typedef {Object} AnimeResult
 * @property {string} id - Anime ID
 * @property {string} title - Anime title
 * @property {string} [cover] - Cover image URL
 * @property {string} [description] - Description
 * @property {number} [anilistId] - AniList ID
 * @property {string} [status] - Airing status
 * @property {number} [episodeCount] - Total episodes
 */

/**
 * Plugin definition structure
 * @typedef {Object} AyotoPlugin
 * @property {string} id - Unique plugin ID
 * @property {string} name - Display name
 * @property {string} version - Semver version
 * @property {string} pluginType - Type of plugin (streamProvider or mediaProvider)
 * @property {string} [description] - Plugin description
 * @property {string} [author] - Author name
 * @property {string} [icon] - Icon URL
 * @property {string[]} providers - Provider names
 * @property {string[]} formats - Supported stream formats
 * @property {boolean} anime4kSupport - Whether plugin supports Anime4K shaders
 * @property {Object} capabilities - Plugin capabilities
 * @property {boolean} capabilities.search - Has search function (Media Provider)
 * @property {boolean} capabilities.getPopular - Has getPopular function (Media Provider)
 * @property {boolean} capabilities.getLatest - Has getLatest function (Media Provider)
 * @property {boolean} capabilities.getEpisodes - Has getEpisodes function (Media Provider)
 * @property {boolean} capabilities.getStreams - Has getStreams function (Media Provider)
 * @property {boolean} capabilities.extractStream - Has extractStream function (Stream Provider)
 * @property {boolean} capabilities.getHosterInfo - Has getHosterInfo function (Stream Provider)
 * @property {boolean} capabilities.decryptStream - Has decryptStream function (Stream Provider)
 * @property {boolean} capabilities.getDownloadLink - Has getDownloadLink function (Stream Provider)
 * @property {Object} [endpoints] - API endpoints for capabilities
 * @property {StreamProviderConfig} [streamProviderConfig] - Stream provider specific config
 * @property {MediaProviderConfig} [mediaProviderConfig] - Media provider specific config
 */

// Plugin validation schema
const REQUIRED_FIELDS = ['id', 'name', 'version', 'providers', 'formats', 'capabilities']

/**
 * Validates plugin structure
 * @param {Object} pluginData - Raw plugin data
 * @returns {Object} Validation result with isValid and errors
 */
export function validatePlugin(pluginData) {
  const errors = []
  
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!pluginData[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }
  
  // Validate ID format (alphanumeric, hyphens, underscores)
  if (pluginData.id && !/^[a-zA-Z0-9_-]+$/.test(pluginData.id)) {
    errors.push('Invalid plugin ID format. Use alphanumeric characters, hyphens, and underscores only.')
  }
  
  // Validate version format (semver)
  if (pluginData.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(pluginData.version)) {
    errors.push('Invalid version format. Use semantic versioning (e.g., 1.0.0)')
  }
  
  // Validate plugin type if specified
  if (pluginData.pluginType) {
    const validTypes = Object.values(PLUGIN_TYPES)
    if (!validTypes.includes(pluginData.pluginType)) {
      errors.push(`Invalid plugin type: ${pluginData.pluginType}. Valid types: ${validTypes.join(', ')}`)
    }
  }
  
  // Validate formats array
  if (pluginData.formats && Array.isArray(pluginData.formats)) {
    const validFormats = Object.values(STREAM_FORMATS)
    const invalidFormats = pluginData.formats.filter(f => !validFormats.includes(f))
    if (invalidFormats.length > 0) {
      errors.push(`Invalid formats: ${invalidFormats.join(', ')}. Valid formats: ${validFormats.join(', ')}`)
    }
  }
  
  // Validate capabilities
  if (pluginData.capabilities) {
    // Valid capabilities for both Media Provider and Stream Provider
    const validCapabilities = [
      // Media Provider capabilities
      'search', 'getPopular', 'getLatest', 'getEpisodes', 'getStreams', 'getAnimeDetails', 'scraping',
      // Stream Provider capabilities
      'extractStream', 'getHosterInfo', 'decryptStream', 'getDownloadLink'
    ]
    const invalidCaps = Object.keys(pluginData.capabilities).filter(c => !validCapabilities.includes(c))
    if (invalidCaps.length > 0) {
      errors.push(`Invalid capabilities: ${invalidCaps.join(', ')}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Parses an .ayoto plugin file
 * @param {string} content - File content (JSON string)
 * @returns {AyotoPlugin|null} Parsed plugin or null if invalid
 */
export function parseAyotoPlugin(content) {
  try {
    const data = JSON.parse(content)
    const validation = validatePlugin(data)
    
    if (!validation.isValid) {
      console.error('Plugin validation failed:', validation.errors)
      return null
    }
    
    // Normalize plugin structure
    return {
      id: data.id,
      name: data.name,
      version: data.version,
      pluginType: data.pluginType || PLUGIN_TYPES.MEDIA_PROVIDER,
      description: data.description || 'No description provided',
      author: data.author || 'Unknown',
      icon: data.icon || null,
      providers: Array.isArray(data.providers) ? data.providers : [data.providers],
      formats: data.formats,
      anime4kSupport: data.anime4kSupport || false,
      capabilities: {
        // Media Provider capabilities
        search: data.capabilities.search || false,
        getPopular: data.capabilities.getPopular || false,
        getLatest: data.capabilities.getLatest || false,
        getEpisodes: data.capabilities.getEpisodes || false,
        getStreams: data.capabilities.getStreams || false,
        getAnimeDetails: data.capabilities.getAnimeDetails || false,
        scraping: data.capabilities.scraping || false,
        // Stream Provider capabilities
        extractStream: data.capabilities.extractStream || false,
        getHosterInfo: data.capabilities.getHosterInfo || false,
        decryptStream: data.capabilities.decryptStream || false,
        getDownloadLink: data.capabilities.getDownloadLink || false
      },
      endpoints: data.endpoints || {},
      streamProviderConfig: data.streamProviderConfig || null,
      mediaProviderConfig: data.mediaProviderConfig || null,
      config: data.config || {},
      enabled: true,
      source: 'local'
    }
  } catch (error) {
    console.error('Failed to parse .ayoto plugin:', error)
    return null
  }
}

/**
 * Creates a Media Provider .ayoto plugin template
 * @returns {Object} Template plugin structure
 */
export function createPluginTemplate() {
  return createMediaProviderTemplate()
}

/**
 * Creates a Media Provider .ayoto plugin template
 * @returns {Object} Template Media Provider plugin structure
 */
export function createMediaProviderTemplate() {
  return {
    id: 'my-media-provider',
    name: 'My Media Provider',
    version: '1.0.0',
    pluginType: PLUGIN_TYPES.MEDIA_PROVIDER,
    description: 'A media provider plugin for anime/media listings',
    author: 'Your Name',
    icon: 'https://example.com/icon.png',
    providers: ['Provider Name'],
    formats: ['m3u8', 'mp4'],
    anime4kSupport: true,
    capabilities: {
      search: true,
      getPopular: true,
      getLatest: true,
      getEpisodes: true,
      getStreams: true,
      getAnimeDetails: true,
      scraping: true
    },
    endpoints: {
      search: '/api/search',
      popular: '/api/popular',
      latest: '/api/latest',
      episodes: '/api/episodes',
      streams: '/api/streams'
    },
    mediaProviderConfig: {
      baseUrl: 'https://aniworld.to',
      languages: ['de', 'en'],
      contentTypes: ['anime', 'series'],
      requiresAuth: false,
      hasNsfw: false
    },
    config: {
      baseUrl: 'https://api.example.com'
    }
  }
}

/**
 * Creates a Stream Provider .ayoto plugin template
 * @returns {Object} Template Stream Provider plugin structure
 */
export function createStreamProviderTemplate() {
  return {
    id: 'my-stream-provider',
    name: 'My Stream Extractor',
    version: '1.0.0',
    pluginType: PLUGIN_TYPES.STREAM_PROVIDER,
    description: 'A stream provider plugin for extracting videos from hosters',
    author: 'Your Name',
    icon: 'https://example.com/icon.png',
    providers: ['Voe', 'Vidoza'],
    formats: ['m3u8', 'mp4'],
    anime4kSupport: false,
    capabilities: {
      extractStream: true,
      getHosterInfo: true,
      decryptStream: true,
      getDownloadLink: true
    },
    streamProviderConfig: {
      supportedHosters: ['voe', 'vidoza', 'streamtape'],
      supportsEncrypted: true,
      supportsDownload: true,
      urlPatterns: [
        'https?://voe\\.sx/.*',
        'https?://vidoza\\.[a-z]+/.*',
        'https?://streamtape\\.com/.*'
      ],
      priority: 10
    },
    config: {
      timeout: 30,
      retries: 3
    }
  }
}

/**
 * Plugin Manager class for managing loaded plugins
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map()
    this.loadFromStorage()
  }
  
  /**
   * Load plugins from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('zenshin_plugins')
      if (stored) {
        const plugins = JSON.parse(stored)
        plugins.forEach(plugin => {
          this.plugins.set(plugin.id, plugin)
        })
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
      const plugins = Array.from(this.plugins.values())
      localStorage.setItem('zenshin_plugins', JSON.stringify(plugins))
    } catch (error) {
      console.error('Failed to save plugins to storage:', error)
    }
  }
  
  /**
   * Add a new plugin
   * @param {AyotoPlugin} plugin - Plugin to add
   * @returns {boolean} Success status
   */
  addPlugin(plugin) {
    if (this.plugins.has(plugin.id)) {
      return false
    }
    this.plugins.set(plugin.id, plugin)
    this.saveToStorage()
    return true
  }
  
  /**
   * Remove a plugin
   * @param {string} pluginId - Plugin ID to remove
   * @returns {boolean} Success status
   */
  removePlugin(pluginId) {
    const result = this.plugins.delete(pluginId)
    if (result) {
      this.saveToStorage()
    }
    return result
  }
  
  /**
   * Get a plugin by ID
   * @param {string} pluginId - Plugin ID
   * @returns {AyotoPlugin|undefined}
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId)
  }
  
  /**
   * Get all plugins
   * @returns {AyotoPlugin[]}
   */
  getAllPlugins() {
    return Array.from(this.plugins.values())
  }
  
  /**
   * Get enabled plugins only
   * @returns {AyotoPlugin[]}
   */
  getEnabledPlugins() {
    return this.getAllPlugins().filter(p => p.enabled)
  }
  
  /**
   * Get plugins with specific capability
   * @param {string} capability - Capability name (search, getPopular, etc.)
   * @returns {AyotoPlugin[]}
   */
  getPluginsWithCapability(capability) {
    return this.getEnabledPlugins().filter(p => p.capabilities[capability])
  }
  
  /**
   * Get plugins that support a specific format
   * @param {string} format - Stream format
   * @returns {AyotoPlugin[]}
   */
  getPluginsByFormat(format) {
    return this.getEnabledPlugins().filter(p => p.formats.includes(format))
  }
  
  /**
   * Get plugins that support Anime4K
   * @returns {AyotoPlugin[]}
   */
  getAnime4KPlugins() {
    return this.getEnabledPlugins().filter(p => p.anime4kSupport)
  }
  
  /**
   * Get plugins by type (StreamProvider or MediaProvider)
   * @param {string} pluginType - Plugin type
   * @returns {AyotoPlugin[]}
   */
  getPluginsByType(pluginType) {
    return this.getEnabledPlugins().filter(p => p.pluginType === pluginType)
  }
  
  /**
   * Get all Stream Provider plugins
   * @returns {AyotoPlugin[]}
   */
  getStreamProviders() {
    return this.getPluginsByType(PLUGIN_TYPES.STREAM_PROVIDER)
  }
  
  /**
   * Get all Media Provider plugins
   * @returns {AyotoPlugin[]}
   */
  getMediaProviders() {
    return this.getPluginsByType(PLUGIN_TYPES.MEDIA_PROVIDER)
  }
  
  /**
   * Get stream provider plugins that support a specific hoster
   * @param {string} hoster - Hoster name (e.g., "voe", "vidoza")
   * @returns {AyotoPlugin[]}
   */
  getStreamProvidersForHoster(hoster) {
    const hosterLower = hoster.toLowerCase()
    return this.getStreamProviders().filter(p => {
      if (p.streamProviderConfig && p.streamProviderConfig.supportedHosters) {
        return p.streamProviderConfig.supportedHosters.some(
          h => h.toLowerCase() === hosterLower
        )
      }
      return false
    })
  }
  
  /**
   * Get media provider plugins that support a specific language
   * @param {string} language - Language code (e.g., "de", "en")
   * @returns {AyotoPlugin[]}
   */
  getMediaProvidersForLanguage(language) {
    const langLower = language.toLowerCase()
    return this.getMediaProviders().filter(p => {
      if (p.mediaProviderConfig && p.mediaProviderConfig.languages) {
        return p.mediaProviderConfig.languages.some(
          l => l.toLowerCase() === langLower
        )
      }
      return true // If no languages specified, assume all languages
    })
  }
  
  /**
   * Toggle plugin enabled state
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} New enabled state
   */
  togglePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (plugin) {
      plugin.enabled = !plugin.enabled
      this.saveToStorage()
      return plugin.enabled
    }
    return false
  }
  
  /**
   * Update plugin configuration
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - New configuration
   */
  updateConfig(pluginId, config) {
    const plugin = this.plugins.get(pluginId)
    if (plugin) {
      plugin.config = { ...plugin.config, ...config }
      this.saveToStorage()
    }
  }
}

// Export singleton instance
export const pluginManager = new PluginManager()

export default PluginManager
