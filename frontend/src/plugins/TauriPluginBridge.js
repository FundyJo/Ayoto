/**
 * Tauri Plugin Bridge
 * Connects the frontend to the Rust plugin system via Tauri commands.
 * 
 * This module provides a JavaScript API that mirrors the Rust plugin system,
 * enabling the frontend to load, manage, and interact with .ayoto plugins.
 */

import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'

/**
 * Get the current Ayoto version from the Rust backend
 * @returns {Promise<string>} Ayoto version string
 */
export async function getAyotoVersion() {
  return await invoke('get_ayoto_version')
}

/**
 * Load a plugin from JSON content
 * @param {string} json - Plugin JSON content
 * @param {string} source - Source identifier (e.g., file path or URL)
 * @returns {Promise<Object>} Plugin load result with success status and errors
 */
export async function loadPluginFromJson(json, source) {
  return await invoke('load_plugin_from_json', { json, source })
}

/**
 * Load a plugin from a file path
 * @param {string} path - Path to the .ayoto file
 * @returns {Promise<Object>} Plugin load result
 */
export async function loadPluginFromFile(path) {
  return await invoke('load_plugin_from_file', { path })
}

/**
 * Get all loaded plugins
 * @returns {Promise<Object[]>} Array of loaded plugin objects
 */
export async function getAllPlugins() {
  return await invoke('get_all_plugins')
}

/**
 * Get enabled plugins only
 * @returns {Promise<Object[]>} Array of enabled plugin objects
 */
export async function getEnabledPlugins() {
  return await invoke('get_enabled_plugins')
}

/**
 * Get a specific plugin by ID
 * @param {string} pluginId - Plugin ID
 * @returns {Promise<Object|null>} Plugin object or null if not found
 */
export async function getPlugin(pluginId) {
  return await invoke('get_plugin', { pluginId })
}

/**
 * Get plugin summaries for UI display
 * @returns {Promise<Object[]>} Array of plugin summary objects
 */
export async function getPluginsSummary() {
  return await invoke('get_plugins_summary')
}

/**
 * Enable or disable a plugin
 * @param {string} pluginId - Plugin ID
 * @param {boolean} enabled - Whether to enable or disable the plugin
 * @returns {Promise<void>}
 */
export async function setPluginEnabled(pluginId, enabled) {
  return await invoke('set_plugin_enabled', { pluginId, enabled })
}

/**
 * Unload a plugin
 * @param {string} pluginId - Plugin ID to unload
 * @returns {Promise<void>}
 */
export async function unloadPlugin(pluginId) {
  return await invoke('unload_plugin', { pluginId })
}

/**
 * Get plugins with a specific capability
 * @param {string} capability - Capability name (search, getPopular, etc.)
 * @returns {Promise<Object[]>} Array of plugins with the capability
 */
export async function getPluginsWithCapability(capability) {
  return await invoke('get_plugins_with_capability', { capability })
}

/**
 * Get plugins that support a specific stream format
 * @param {string} format - Stream format (m3u8, mp4, etc.)
 * @returns {Promise<Object[]>} Array of plugins supporting the format
 */
export async function getPluginsByFormat(format) {
  return await invoke('get_plugins_by_format', { format })
}

/**
 * Get plugins that support Anime4K
 * @returns {Promise<Object[]>} Array of plugins supporting Anime4K
 */
export async function getAnime4kPlugins() {
  return await invoke('get_anime4k_plugins')
}

/**
 * Validate a plugin manifest without loading it
 * @param {string} json - Plugin manifest JSON
 * @returns {Promise<Object>} Validation result with isValid and errors
 */
export async function validatePluginManifest(json) {
  return await invoke('validate_plugin_manifest', { json })
}

/**
 * Get a sample plugin manifest for reference
 * @returns {Promise<string>} Sample plugin JSON string
 */
export async function getSamplePluginManifest() {
  return await invoke('get_sample_plugin_manifest')
}

/**
 * Check plugin compatibility with current Ayoto version
 * @param {string} pluginId - Plugin ID
 * @returns {Promise<Object>} Compatibility information
 */
export async function checkPluginCompatibility(pluginId) {
  return await invoke('check_plugin_compatibility', { pluginId })
}

// ============================================================================
// Plugin API Functions
// ============================================================================

/**
 * Search for anime using a specific plugin
 * @param {string} pluginId - Plugin ID to use
 * @param {string} query - Search query
 * @param {number} [page] - Page number
 * @returns {Promise<Object>} Search results with List<PopulatedAnime>
 */
export async function pluginSearch(pluginId, query, page = 1) {
  return await invoke('plugin_search', { pluginId, query, page })
}

/**
 * Get popular anime from a specific plugin
 * @param {string} pluginId - Plugin ID
 * @param {number} [page] - Page number
 * @returns {Promise<Object>} Popular anime list
 */
export async function pluginGetPopular(pluginId, page = 1) {
  return await invoke('plugin_get_popular', { pluginId, page })
}

/**
 * Get latest anime from a specific plugin
 * @param {string} pluginId - Plugin ID
 * @param {number} [page] - Page number
 * @returns {Promise<Object>} Latest anime list
 */
export async function pluginGetLatest(pluginId, page = 1) {
  return await invoke('plugin_get_latest', { pluginId, page })
}

/**
 * Get episodes for an anime from a specific plugin
 * @param {string} pluginId - Plugin ID
 * @param {string} animeId - Anime ID
 * @param {number} [page] - Page number
 * @returns {Promise<Object>} Episodes list
 */
export async function pluginGetEpisodes(pluginId, animeId, page = 1) {
  return await invoke('plugin_get_episodes', { pluginId, animeId, page })
}

/**
 * Get stream sources for an episode from a specific plugin
 * @param {string} pluginId - Plugin ID
 * @param {string} animeId - Anime ID
 * @param {string} episodeId - Episode ID
 * @returns {Promise<Object>} PopulatedEpisode with stream sources
 */
export async function pluginGetStreams(pluginId, animeId, episodeId) {
  return await invoke('plugin_get_streams', { pluginId, animeId, episodeId })
}

/**
 * Get anime details from a specific plugin
 * @param {string} pluginId - Plugin ID
 * @param {string} animeId - Anime ID
 * @returns {Promise<Object>} PopulatedAnime with full details
 */
export async function pluginGetAnimeDetails(pluginId, animeId) {
  return await invoke('plugin_get_anime_details', { pluginId, animeId })
}

/**
 * Search across all enabled plugins
 * @param {string} query - Search query
 * @returns {Promise<Array>} Results grouped by plugin
 */
export async function searchAllPlugins(query) {
  return await invoke('search_all_plugins', { query })
}

// ============================================================================
// Unified Plugin Bridge Class
// ============================================================================

/**
 * TauriPluginBridge - A unified class for interacting with the Rust plugin system
 */
export class TauriPluginBridge {
  constructor() {
    this.initialized = false
    this.version = null
  }

  /**
   * Initialize the bridge and get version info
   */
  async init() {
    if (this.initialized) return
    
    try {
      this.version = await getAyotoVersion()
      this.initialized = true
      console.log(`Ayoto Plugin Bridge initialized (v${this.version})`)
    } catch (error) {
      console.error('Failed to initialize plugin bridge:', error)
      throw error
    }
  }

  /**
   * Load a plugin from a file dialog selection
   */
  async loadPluginFromDialog() {
    const file = await openDialog({
      title: 'Select Ayoto Plugin',
      filters: [{
        name: 'Ayoto Plugin',
        extensions: ['ayoto']
      }],
      multiple: false
    })

    if (file) {
      return await loadPluginFromFile(file)
    }
    
    return null
  }

  /**
   * Get all plugins with full details
   */
  async getPlugins() {
    return await getAllPlugins()
  }

  /**
   * Search using a specific plugin
   */
  async search(pluginId, query) {
    return await pluginSearch(pluginId, query)
  }

  /**
   * Search across all plugins
   */
  async searchAll(query) {
    return await searchAllPlugins(query)
  }

  /**
   * Get episodes using a specific plugin
   */
  async getEpisodes(pluginId, animeId) {
    return await pluginGetEpisodes(pluginId, animeId)
  }

  /**
   * Get stream sources using a specific plugin
   */
  async getStreams(pluginId, animeId, episodeId) {
    return await pluginGetStreams(pluginId, animeId, episodeId)
  }
}

// Export singleton instance
export const pluginBridge = new TauriPluginBridge()

export default TauriPluginBridge
