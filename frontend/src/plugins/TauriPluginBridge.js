/**
 * Tauri Plugin Bridge
 * Connects the frontend to the Rust backend for basic app functionality.
 * 
 * Note: Plugin management is now handled entirely in the frontend via JSPluginRuntime.
 * This bridge provides only basic Tauri integration like version info.
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * Get the current Ayoto version from the Rust backend
 * @returns {Promise<string>} Ayoto version string
 */
export async function getAyotoVersion() {
  return await invoke('get_ayoto_version')
}

// ============================================================================
// Unified Plugin Bridge Class
// ============================================================================

/**
 * TauriPluginBridge - Provides basic Tauri integration
 * 
 * Note: Most plugin functionality is now in JSPluginRuntime.
 * This class provides minimal Tauri integration.
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
   * Get the Ayoto version
   * @returns {string|null} Version string
   */
  getVersion() {
    return this.version
  }
}

// Export singleton instance
export const pluginBridge = new TauriPluginBridge()

export default TauriPluginBridge
