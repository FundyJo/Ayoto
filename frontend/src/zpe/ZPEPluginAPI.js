/**
 * ZPE Plugin API
 * 
 * Comprehensive API for ZPE plugins providing direct access to all
 * Ayoto functionality through properly typed objects and methods.
 * 
 * This module serves as the bridge between plugins and the Ayoto application,
 * ensuring type safety and proper access control.
 * 
 * @module ZPEPluginAPI
 * @version 1.0.0
 */

import { zpePluginManager, ZPEPlugin } from './ZPERuntime.js'
import { ZPE_PLUGIN_TYPE, ZPE_STREAM_FORMAT, ZPE_PLUGIN_STATE } from './ZPEManifest.js'

// ============================================================================
// Type Definitions (JSDoc for better IDE support)
// ============================================================================

/**
 * @typedef {Object} Anime
 * @property {string} id - Unique identifier
 * @property {string} title - Anime title
 * @property {string[]} [altTitles] - Alternative titles
 * @property {string} [cover] - Cover image URL
 * @property {string} [banner] - Banner image URL
 * @property {string} [description] - Synopsis
 * @property {number} [anilistId] - AniList ID
 * @property {number} [malId] - MyAnimeList ID
 * @property {string} [status] - Status (AIRING, FINISHED, etc.)
 * @property {number} [episodeCount] - Total episodes
 * @property {string[]} [genres] - Genres
 * @property {number} [year] - Release year
 * @property {number} [rating] - Rating (0-100)
 * @property {string} [mediaType] - Media type (TV, MOVIE, OVA, etc.)
 * @property {boolean} [isAiring] - Currently airing
 */

/**
 * @typedef {Object} Episode
 * @property {string} id - Unique identifier
 * @property {number} number - Episode number
 * @property {string} [title] - Episode title
 * @property {string} [thumbnail] - Thumbnail URL
 * @property {string} [description] - Episode description
 * @property {number} [duration] - Duration in seconds
 * @property {string} [airDate] - Air date (ISO 8601)
 * @property {boolean} [isFiller] - Is filler episode
 * @property {Array<{name: string, id?: string}>} [hosters] - Available streaming hosters (e.g., VOE, Filemoon)
 * @property {Array<{name: string, code?: string}>} [languages] - Available languages/subtitles
 * @property {string} [link] - Direct link to the episode page (for fetching stream URLs)
 */

/**
 * @typedef {Object} StreamSource
 * @property {string} url - Stream URL
 * @property {string} format - Stream format (m3u8, mp4, mkv, webm, dash, torrent)
 * @property {string} quality - Quality (1080p, 720p, etc.)
 * @property {boolean} [anime4kSupport] - Supports Anime4K upscaling
 * @property {boolean} [isDefault] - Is default source
 * @property {string} [server] - Server name
 * @property {Object<string, string>} [headers] - Required headers
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} results - Result items
 * @property {boolean} hasNextPage - Has more pages
 * @property {number} currentPage - Current page number
 * @property {number} [totalPages] - Total pages
 * @property {number} [totalItems] - Total items
 */

/**
 * @typedef {Object} PluginInfo
 * @property {string} id - Plugin ID
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} [description] - Description
 * @property {Object} [author] - Author info
 * @property {string} pluginType - Plugin type
 * @property {Object} [capabilities] - Capabilities
 * @property {string[]} [permissions] - Permissions
 * @property {boolean} enabled - Is enabled
 * @property {string} state - Current state
 */

// ============================================================================
// Plugin API Class
// ============================================================================

/**
 * ZPE Plugin API
 * 
 * Main API class for interacting with ZPE plugins from the application.
 * Provides methods to manage plugins and invoke their functionality.
 */
class ZPEPluginAPI {
  constructor() {
    // Type constants for external use
    this.PLUGIN_TYPE = ZPE_PLUGIN_TYPE
    this.STREAM_FORMAT = ZPE_STREAM_FORMAT
    this.PLUGIN_STATE = ZPE_PLUGIN_STATE
  }

  // ==========================================================================
  // Plugin Management
  // ==========================================================================

  /**
   * Get all loaded plugins
   * @returns {PluginInfo[]} Array of plugin info objects
   */
  getAllPlugins() {
    return zpePluginManager.getAllPlugins()
  }

  /**
   * Get enabled plugins only
   * @returns {PluginInfo[]} Array of enabled plugin info
   */
  getEnabledPlugins() {
    return zpePluginManager.getEnabledPlugins()
  }

  /**
   * Get media provider plugins
   * @returns {PluginInfo[]} Array of media provider info
   */
  getMediaProviders() {
    return zpePluginManager.getMediaProviders()
  }

  /**
   * Get stream provider plugins
   * @returns {PluginInfo[]} Array of stream provider info
   */
  getStreamProviders() {
    return zpePluginManager.getStreamProviders()
  }

  /**
   * Get a specific plugin by ID
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<ZPEPlugin|null>} Plugin instance or null
   */
  async getPlugin(pluginId) {
    return zpePluginManager.getPlugin(pluginId)
  }

  /**
   * Check if a plugin is loaded
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} True if loaded
   */
  isPluginLoaded(pluginId) {
    return zpePluginManager.plugins.has(pluginId)
  }

  /**
   * Enable a plugin
   * @param {string} pluginId - Plugin ID
   */
  enablePlugin(pluginId) {
    zpePluginManager.setPluginEnabled(pluginId, true)
  }

  /**
   * Disable a plugin
   * @param {string} pluginId - Plugin ID
   */
  disablePlugin(pluginId) {
    zpePluginManager.setPluginEnabled(pluginId, false)
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<void>}
   */
  async unloadPlugin(pluginId) {
    return zpePluginManager.unloadPlugin(pluginId)
  }

  // ==========================================================================
  // Search Operations
  // ==========================================================================

  /**
   * Search for anime across all enabled media providers
   * @param {string} query - Search query
   * @param {number} [page=1] - Page number
   * @returns {Promise<Object>} Combined search results from all providers
   */
  async searchAll(query, page = 1) {
    const providers = this.getMediaProviders().filter(p => p.enabled && p.capabilities?.search)
    const results = {}
    const errors = {}

    await Promise.all(providers.map(async (provider) => {
      try {
        const plugin = await this.getPlugin(provider.id)
        if (plugin) {
          results[provider.id] = await plugin.search(query, page)
        }
      } catch (error) {
        errors[provider.id] = error.message
      }
    }))

    return {
      results,
      errors,
      providers: providers.map(p => p.id)
    }
  }

  /**
   * Search for anime using a specific provider
   * @param {string} pluginId - Plugin ID
   * @param {string} query - Search query
   * @param {number} [page=1] - Page number
   * @returns {Promise<PaginatedResult<Anime>>} Search results
   */
  async search(pluginId, query, page = 1) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.search(query, page)
  }

  // ==========================================================================
  // Content Retrieval
  // ==========================================================================

  /**
   * Get popular anime from a provider
   * @param {string} pluginId - Plugin ID
   * @param {number} [page=1] - Page number
   * @returns {Promise<PaginatedResult<Anime>>} Popular anime
   */
  async getPopular(pluginId, page = 1) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.getPopular(page)
  }

  /**
   * Get latest anime/episodes from a provider
   * @param {string} pluginId - Plugin ID
   * @param {number} [page=1] - Page number
   * @returns {Promise<PaginatedResult<Anime>>} Latest anime
   */
  async getLatest(pluginId, page = 1) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.getLatest(page)
  }

  /**
   * Get episodes for an anime
   * @param {string} pluginId - Plugin ID
   * @param {string} animeId - Anime ID
   * @param {number} [page=1] - Page number
   * @returns {Promise<PaginatedResult<Episode>>} Episodes
   */
  async getEpisodes(pluginId, animeId, page = 1) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.getEpisodes(animeId, page)
  }

  /**
   * Get anime details
   * @param {string} pluginId - Plugin ID
   * @param {string} animeId - Anime ID
   * @returns {Promise<Anime>} Anime details
   */
  async getAnimeDetails(pluginId, animeId) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.getAnimeDetails(animeId)
  }

  // ==========================================================================
  // Stream Operations
  // ==========================================================================

  /**
   * Get stream sources for an episode
   * @param {string} pluginId - Plugin ID
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<StreamSource[]>} Stream sources
   */
  async getStreams(pluginId, animeId, episodeId) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.getStreams(animeId, episodeId)
  }

  /**
   * Extract stream from a hoster URL using stream providers
   * @param {string} url - Hoster URL
   * @returns {Promise<StreamSource|null>} Extracted stream or null
   */
  async extractStream(url) {
    const providers = this.getStreamProviders().filter(p => p.enabled && p.capabilities?.extractStream)
    
    for (const provider of providers) {
      try {
        const plugin = await this.getPlugin(provider.id)
        if (plugin) {
          const result = await plugin.extractStream(url)
          if (result) {
            return { ...result, provider: provider.id }
          }
        }
      } catch (error) {
        console.warn(`[ZPE API] Stream extraction failed for ${provider.id}:`, error.message)
      }
    }
    
    return null
  }

  /**
   * Extract stream using a specific provider
   * @param {string} pluginId - Plugin ID
   * @param {string} url - Hoster URL
   * @returns {Promise<StreamSource|null>} Extracted stream or null
   */
  async extractStreamWith(pluginId, url) {
    const plugin = await this.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    return plugin.extractStream(url)
  }

  /**
   * Get hoster information
   * @param {string} url - Hoster URL
   * @returns {Promise<Object>} Hoster info with supported provider
   */
  async getHosterInfo(url) {
    const providers = this.getStreamProviders().filter(p => p.enabled && p.capabilities?.getHosterInfo)
    
    for (const provider of providers) {
      try {
        const plugin = await this.getPlugin(provider.id)
        if (plugin) {
          const info = await plugin.getHosterInfo(url)
          if (info && info.supported) {
            return { ...info, provider: provider.id }
          }
        }
      } catch (error) {
        // Continue to next provider
      }
    }
    
    return { name: 'Unknown', supported: false, provider: null }
  }

  // ==========================================================================
  // Capability Queries
  // ==========================================================================

  /**
   * Get plugins with a specific capability
   * @param {string} capability - Capability name
   * @returns {PluginInfo[]} Plugins with the capability
   */
  getPluginsWithCapability(capability) {
    return zpePluginManager.getPluginsWithCapability(capability)
  }

  /**
   * Check if a plugin has a capability
   * @param {string} pluginId - Plugin ID
   * @param {string} capability - Capability name
   * @returns {boolean} True if plugin has capability
   */
  hasCapability(pluginId, capability) {
    const plugins = this.getAllPlugins()
    const plugin = plugins.find(p => p.id === pluginId)
    return plugin?.capabilities?.[capability] === true
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Get popular anime from all providers
   * @param {number} [page=1] - Page number
   * @returns {Promise<Object>} Combined results from all providers
   */
  async getPopularAll(page = 1) {
    const providers = this.getMediaProviders().filter(p => p.enabled && p.capabilities?.getPopular)
    const results = {}
    const errors = {}

    await Promise.all(providers.map(async (provider) => {
      try {
        const plugin = await this.getPlugin(provider.id)
        if (plugin) {
          results[provider.id] = await plugin.getPopular(page)
        }
      } catch (error) {
        errors[provider.id] = error.message
      }
    }))

    return {
      results,
      errors,
      providers: providers.map(p => p.id)
    }
  }

  /**
   * Get latest anime from all providers
   * @param {number} [page=1] - Page number
   * @returns {Promise<Object>} Combined results from all providers
   */
  async getLatestAll(page = 1) {
    const providers = this.getMediaProviders().filter(p => p.enabled && p.capabilities?.getLatest)
    const results = {}
    const errors = {}

    await Promise.all(providers.map(async (provider) => {
      try {
        const plugin = await this.getPlugin(provider.id)
        if (plugin) {
          results[provider.id] = await plugin.getLatest(page)
        }
      } catch (error) {
        errors[provider.id] = error.message
      }
    }))

    return {
      results,
      errors,
      providers: providers.map(p => p.id)
    }
  }

  // ==========================================================================
  // Plugin Statistics
  // ==========================================================================

  /**
   * Get statistics about loaded plugins
   * @returns {Object} Plugin statistics
   */
  getStats() {
    const all = this.getAllPlugins()
    const enabled = all.filter(p => p.enabled)
    const byType = {}

    for (const plugin of all) {
      byType[plugin.pluginType] = (byType[plugin.pluginType] || 0) + 1
    }

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: all.length - enabled.length,
      byType,
      mediaProviders: this.getMediaProviders().length,
      streamProviders: this.getStreamProviders().length
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of the Plugin API
 */
export const pluginAPI = new ZPEPluginAPI()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an Anime object with defaults
 * @param {Object} data - Partial anime data
 * @returns {Anime} Complete anime object
 */
export function createAnime(data) {
  return {
    id: data.id || '',
    title: data.title || 'Unknown',
    altTitles: data.altTitles || [],
    cover: data.cover || null,
    banner: data.banner || null,
    description: data.description || null,
    anilistId: data.anilistId || null,
    malId: data.malId || null,
    status: data.status || null,
    episodeCount: data.episodeCount || null,
    genres: data.genres || [],
    year: data.year || null,
    rating: data.rating || null,
    mediaType: data.mediaType || null,
    isAiring: data.isAiring || false
  }
}

/**
 * Create an Episode object with defaults
 * @param {Object} data - Partial episode data
 * @returns {Episode} Complete episode object
 */
export function createEpisode(data) {
  return {
    id: data.id || '',
    number: data.number || 0,
    title: data.title || null,
    thumbnail: data.thumbnail || null,
    description: data.description || null,
    duration: data.duration || null,
    airDate: data.airDate || null,
    isFiller: data.isFiller || false,
    hosters: data.hosters || null,
    languages: data.languages || null,
    link: data.link || null
  }
}

/**
 * Create a StreamSource object with defaults
 * @param {Object} data - Partial stream data
 * @returns {StreamSource} Complete stream source object
 */
export function createStreamSource(data) {
  return {
    url: data.url || '',
    format: data.format || 'mp4',
    quality: data.quality || 'Default',
    anime4kSupport: data.anime4kSupport || false,
    isDefault: data.isDefault || false,
    server: data.server || 'Unknown',
    headers: data.headers || null
  }
}

/**
 * Create a PaginatedResult object
 * @param {Array} results - Result items
 * @param {Object} options - Pagination options
 * @returns {PaginatedResult} Complete paginated result
 */
export function createPaginatedResult(results, options = {}) {
  return {
    results: results || [],
    hasNextPage: options.hasNextPage || false,
    currentPage: options.currentPage || 1,
    totalPages: options.totalPages || null,
    totalItems: options.totalItems || null
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  pluginAPI,
  createAnime,
  createEpisode,
  createStreamSource,
  createPaginatedResult,
  PLUGIN_TYPE: ZPE_PLUGIN_TYPE,
  STREAM_FORMAT: ZPE_STREAM_FORMAT,
  PLUGIN_STATE: ZPE_PLUGIN_STATE
}
