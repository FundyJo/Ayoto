/**
 * Provider API - Interface for anime providers
 * Plugins implement these methods to provide search, streaming, etc.
 */

import { STREAM_FORMATS, pluginManager } from './PluginManager'

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
    this.config = plugin.config || {}
    this.baseUrl = this.config.baseUrl || ''
  }
  
  /**
   * Search for anime
   * @param {string} query - Search query
   * @returns {Promise<AnimeResult[]>} Search results
   */
  async search(query) {
    if (!this.plugin.capabilities.search) {
      throw new Error('Search capability not supported by this plugin')
    }
    
    const endpoint = this.plugin.endpoints?.search || '/search'
    const response = await fetch(`${this.baseUrl}${endpoint}?q=${encodeURIComponent(query)}`)
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }
    
    return response.json()
  }
  
  /**
   * Get popular anime
   * @param {number} page - Page number
   * @returns {Promise<AnimeResult[]>} Popular anime list
   */
  async getPopular(page = 1) {
    if (!this.plugin.capabilities.getPopular) {
      throw new Error('getPopular capability not supported by this plugin')
    }
    
    const endpoint = this.plugin.endpoints?.popular || '/popular'
    const response = await fetch(`${this.baseUrl}${endpoint}?page=${page}`)
    
    if (!response.ok) {
      throw new Error(`getPopular failed: ${response.status}`)
    }
    
    return response.json()
  }
  
  /**
   * Get latest anime/episodes
   * @param {number} page - Page number
   * @returns {Promise<AnimeResult[]>} Latest anime/episodes
   */
  async getLatest(page = 1) {
    if (!this.plugin.capabilities.getLatest) {
      throw new Error('getLatest capability not supported by this plugin')
    }
    
    const endpoint = this.plugin.endpoints?.latest || '/latest'
    const response = await fetch(`${this.baseUrl}${endpoint}?page=${page}`)
    
    if (!response.ok) {
      throw new Error(`getLatest failed: ${response.status}`)
    }
    
    return response.json()
  }
  
  /**
   * Get episodes for an anime
   * @param {string} animeId - Anime ID
   * @param {number} page - Page number
   * @returns {Promise<Episode[]>} Episode list
   */
  async getEpisodes(animeId, page = 1) {
    if (!this.plugin.capabilities.getEpisodes) {
      throw new Error('getEpisodes capability not supported by this plugin')
    }
    
    const endpoint = this.plugin.endpoints?.episodes || '/episodes'
    const response = await fetch(`${this.baseUrl}${endpoint}?id=${encodeURIComponent(animeId)}&page=${page}`)
    
    if (!response.ok) {
      throw new Error(`getEpisodes failed: ${response.status}`)
    }
    
    return response.json()
  }
  
  /**
   * Get stream sources for an episode
   * @param {string} animeId - Anime ID
   * @param {string} episodeId - Episode ID
   * @returns {Promise<StreamSource[]>} Stream sources
   */
  async getStreams(animeId, episodeId) {
    if (!this.plugin.capabilities.getStreams) {
      throw new Error('getStreams capability not supported by this plugin')
    }
    
    const endpoint = this.plugin.endpoints?.streams || '/streams'
    const response = await fetch(
      `${this.baseUrl}${endpoint}?animeId=${encodeURIComponent(animeId)}&episodeId=${encodeURIComponent(episodeId)}`
    )
    
    if (!response.ok) {
      throw new Error(`getStreams failed: ${response.status}`)
    }
    
    return response.json()
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
      providers: this.plugin.providers,
      formats: this.plugin.formats,
      anime4kSupport: this.plugin.anime4kSupport,
      capabilities: this.plugin.capabilities
    }
  }
  
  /**
   * Check if a specific format is supported
   * @param {string} format - Stream format
   * @returns {boolean}
   */
  supportsFormat(format) {
    return this.plugin.formats.includes(format)
  }
  
  /**
   * Check if Anime4K is supported
   * @returns {boolean}
   */
  supportsAnime4K() {
    return this.plugin.anime4kSupport === true
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
    const providers = this.getAllProviders().filter(p => p.plugin.capabilities.search)
    
    await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          const providerResults = await provider.search(query)
          results.push({
            providerId: provider.plugin.id,
            providerName: provider.plugin.name,
            formats: provider.plugin.formats,
            anime4kSupport: provider.plugin.anime4kSupport,
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
   * Get providers that support a specific format
   * @param {string} format - Stream format
   * @returns {ProviderAPI[]}
   */
  getProvidersByFormat(format) {
    return this.getAllProviders().filter(p => p.supportsFormat(format))
  }
  
  /**
   * Get providers that support Anime4K
   * @returns {ProviderAPI[]}
   */
  getAnime4KProviders() {
    return this.getAllProviders().filter(p => p.supportsAnime4K())
  }
  
  /**
   * Get provider capabilities summary
   * @returns {Object[]} List of provider capabilities
   */
  getProvidersSummary() {
    return this.getAllProviders().map(p => p.getProviderInfo())
  }
  
  /**
   * Initialize providers from plugin manager
   */
  initializeFromPluginManager() {
    const plugins = pluginManager.getEnabledPlugins()
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
    [STREAM_FORMATS.M3U8]: {
      type: 'hls',
      mimeType: 'application/x-mpegURL'
    },
    [STREAM_FORMATS.MP4]: {
      type: 'video/mp4',
      mimeType: 'video/mp4'
    },
    [STREAM_FORMATS.MKV]: {
      type: 'video/x-matroska',
      mimeType: 'video/x-matroska'
    },
    [STREAM_FORMATS.WEBM]: {
      type: 'video/webm',
      mimeType: 'video/webm'
    },
    [STREAM_FORMATS.TORRENT]: {
      type: 'torrent',
      mimeType: 'application/x-bittorrent'
    }
  }
  
  return formatMap[format] || { type: 'video/mp4', mimeType: 'video/mp4' }
}

export default ProviderAPI
