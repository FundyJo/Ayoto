/**
 * Provider API - Interface for anime providers
 * Plugins implement these methods to provide search, streaming, etc.
 */

import { jsPluginManager, STREAM_FORMAT } from './JSPluginRuntime'

/**
 * Provider API interface
 * This defines the standard methods that providers should implement
 */
export class ProviderAPI {
  /**
   * @param {Object} plugin - Plugin configuration
   */
  constructor(plugin) {
    this.plugin = plugin
    this.pluginId = plugin.id
  }
  
  /**
   * Get the plugin instance
   * @returns {Promise<Object>} Plugin instance
   */
  async getPluginInstance() {
    return await jsPluginManager.getPlugin(this.pluginId)
  }
  
  /**
   * Search for anime
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Search results
   */
  async search(query, page = 1) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.search(query, page)
  }
  
  /**
   * Get popular anime
   * @param {number} page - Page number
   * @returns {Promise<Object>} Popular anime list
   */
  async getPopular(page = 1) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.getPopular(page)
  }
  
  /**
   * Get latest anime/episodes
   * @param {number} page - Page number
   * @returns {Promise<Object>} Latest anime/episodes
   */
  async getLatest(page = 1) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.getLatest(page)
  }
  
  /**
   * Get episodes for an anime
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Object>} Episode list
   */
  async getEpisodes(animeId, page = 1) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.getEpisodes(animeId, page)
  }
  
  /**
   * Get stream sources for an episode
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<Object>} Stream sources
   */
  async getStreams(animeId, episodeId) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.getStreams(animeId, episodeId)
  }
  
  /**
   * Get anime details
   * @param {string} animeId - Anime ID
   * @returns {Promise<Object>} Anime details
   */
  async getAnimeDetails(animeId) {
    const plugin = await this.getPluginInstance()
    if (!plugin) {
      throw new Error(`Plugin '${this.pluginId}' not found`)
    }
    return plugin.getAnimeDetails(animeId)
  }
  
  /**
   * Get provider info
   * @returns {Object} Provider information
   */
  getProviderInfo() {
    return {
      id: this.plugin.id,
      name: this.plugin.name,
      version: this.plugin.version,
      pluginType: this.plugin.pluginType,
      capabilities: this.plugin.capabilities
    }
  }
  
  /**
   * Check if a specific capability is supported
   * @param {string} capability - Capability name
   * @returns {boolean}
   */
  hasCapability(capability) {
    return this.plugin.capabilities?.[capability] === true
  }
}

/**
 * Provider Registry - Manages all loaded providers
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map()
  }
  
  /**
   * Register a provider from a plugin
   * @param {Object} plugin - Plugin configuration
   */
  registerProvider(plugin) {
    const provider = new ProviderAPI(plugin)
    this.providers.set(plugin.id, provider)
  }
  
  /**
   * Unregister a provider
   * @param {string} pluginId - Plugin ID
   */
  unregisterProvider(pluginId) {
    this.providers.delete(pluginId)
  }
  
  /**
   * Get a provider by ID
   * @param {string} pluginId - Plugin ID
   * @returns {ProviderAPI|undefined}
   */
  getProvider(pluginId) {
    return this.providers.get(pluginId)
  }
  
  /**
   * Get all registered providers
   * @returns {ProviderAPI[]}
   */
  getAllProviders() {
    return Array.from(this.providers.values())
  }
  
  /**
   * Search across all providers
   * @param {string} query - Search query
   * @returns {Promise<Object[]>} Results with provider info
   */
  async searchAll(query) {
    const results = []
    const providers = this.getAllProviders().filter(p => p.hasCapability('search'))
    
    await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          const providerResults = await provider.search(query)
          results.push({
            providerId: provider.plugin.id,
            providerName: provider.plugin.name,
            results: providerResults
          })
        } catch (error) {
          console.error(`Search failed for provider ${provider.plugin.id}:`, error)
        }
      })
    )
    
    return results
  }
  
  /**
   * Get providers that have a specific capability
   * @param {string} capability - Capability name
   * @returns {ProviderAPI[]}
   */
  getProvidersWithCapability(capability) {
    return this.getAllProviders().filter(p => p.hasCapability(capability))
  }
  
  /**
   * Get provider capabilities summary
   * @returns {Object[]} List of provider capabilities
   */
  getProvidersSummary() {
    return this.getAllProviders().map(p => p.getProviderInfo())
  }
  
  /**
   * Initialize providers from JS plugin manager
   */
  initializeFromPluginManager() {
    const plugins = jsPluginManager.getEnabledPlugins()
    plugins.forEach(plugin => {
      this.registerProvider(plugin)
    })
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry()

/**
 * Helper function to get stream format info for Vidstack
 * @param {string} format - Stream format
 * @returns {Object} Format info for Vidstack
 */
export function getVidstackFormatInfo(format) {
  const formatMap = {
    [STREAM_FORMAT.M3U8]: {
      type: 'hls',
      mimeType: 'application/x-mpegURL'
    },
    [STREAM_FORMAT.MP4]: {
      type: 'video/mp4',
      mimeType: 'video/mp4'
    },
    [STREAM_FORMAT.MKV]: {
      type: 'video/x-matroska',
      mimeType: 'video/x-matroska'
    },
    [STREAM_FORMAT.WEBM]: {
      type: 'video/webm',
      mimeType: 'video/webm'
    },
    [STREAM_FORMAT.TORRENT]: {
      type: 'torrent',
      mimeType: 'application/x-bittorrent'
    }
  }
  
  return formatMap[format] || { type: 'video/mp4', mimeType: 'video/mp4' }
}

export default ProviderAPI
