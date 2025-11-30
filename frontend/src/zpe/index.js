/**
 * ZPE (Zanshin Plugin Extension) System
 * 
 * A secure, extensible plugin system for Ayoto that enables:
 * - JavaScript/TypeScript plugin development
 * - Secure sandboxed execution
 * - GitHub-based version checking
 * - Encrypted .zpe plugin packages
 * 
 * @module zpe
 * @version 1.0.0
 */

// ============================================================================
// Core Exports
// ============================================================================

// Manifest system
export {
  ZPE_PLUGIN_TYPE,
  ZPE_PERMISSION,
  ZPE_STREAM_FORMAT,
  ZPE_PLUGIN_STATE,
  validateZPEManifest,
  createZPEManifest,
  createMediaProviderManifest,
  createStreamProviderManifest,
  parseVersion,
  compareVersions,
  isUpdateAvailable
} from './ZPEManifest.js'

// Security system
export {
  ZPE_MAGIC_BYTES,
  ZPE_FORMAT_VERSION,
  ZPE_ENCRYPTION,
  ZPE_HASH_ALGORITHM,
  calculateHash,
  calculateIntegrityHash,
  verifyIntegrityHash,
  generateEncryptionKey,
  encryptData,
  decryptData,
  generateSigningKeyPair,
  signCode,
  verifySignature,
  exportPublicKey,
  importPublicKey,
  ZPEPermissionManager,
  permissionManager,
  isUrlAllowed,
  createSandboxContext,
  executeSandboxed,
  auditPluginCode
} from './ZPESecurity.js'

// Builder system
export {
  ZPEBuilder,
  ZPEParser,
  ZPE_SECTION,
  ZPE_COMPRESSION,
  ZPE_ENCRYPTION_TYPE,
  createPluginTemplate,
  buildFromTemplate
} from './ZPEBuilder.js'

// Version checking
export {
  checkForUpdates,
  checkForUpdatesFromManifest,
  getReleases,
  getReleaseByTag,
  downloadRelease,
  downloadAndVerifyUpdate,
  ZPEUpdateManager,
  updateManager
} from './ZPEVersionChecker.js'

// Runtime system
export {
  ZPEPlugin,
  ZPEPluginManager,
  zpePluginManager,
  ZPEContext,
  ZPEHttpClient,
  ZPEStorage,
  ZPEHtmlParser
} from './ZPERuntime.js'

// ============================================================================
// Convenience Functions
// ============================================================================

import { zpePluginManager } from './ZPERuntime.js'
import { ZPEBuilder, ZPEParser, createPluginTemplate } from './ZPEBuilder.js'
import { updateManager } from './ZPEVersionChecker.js'

/**
 * Initialize the ZPE plugin system
 * Loads plugins from storage and starts update checking
 * @returns {Promise<void>}
 */
export async function initializeZPE() {
  console.log('[ZPE] Initializing plugin system...')
  
  // Load plugins from storage
  zpePluginManager.loadFromStorage()
  
  // Start periodic update checking (hourly)
  updateManager.startPeriodicCheck(60 * 60 * 1000)
  
  console.log('[ZPE] Plugin system initialized')
}

/**
 * Shutdown the ZPE plugin system
 * @returns {Promise<void>}
 */
export async function shutdownZPE() {
  console.log('[ZPE] Shutting down plugin system...')
  
  updateManager.stopPeriodicCheck()
  await zpePluginManager.shutdownAll()
  
  console.log('[ZPE] Plugin system shutdown complete')
}

/**
 * Quick build a plugin from source
 * @param {Object} manifest - Plugin manifest
 * @param {string} code - Plugin code
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Build result with .zpe data
 */
export async function buildPlugin(manifest, code, options = {}) {
  const builder = new ZPEBuilder(options)
  return builder.build(manifest, code)
}

/**
 * Load a plugin from .zpe file data
 * @param {ArrayBuffer|Uint8Array} data - ZPE file data
 * @returns {Promise<Object>} Load result
 */
export async function loadPluginFromZPE(data) {
  return zpePluginManager.loadFromZPE(data)
}

/**
 * Load a plugin from manifest and code directly
 * @param {Object} manifest - Plugin manifest
 * @param {string} code - Plugin code
 * @returns {Promise<Object>} Load result
 */
export async function loadPlugin(manifest, code) {
  return zpePluginManager.loadPlugin(manifest, code)
}

/**
 * Unload a plugin
 * @param {string} pluginId - Plugin ID to unload
 * @returns {Promise<void>}
 */
export async function unloadPlugin(pluginId) {
  return zpePluginManager.unloadPlugin(pluginId)
}

/**
 * Get a loaded plugin by ID
 * @param {string} pluginId - Plugin ID
 * @returns {Promise<Object|null>} Plugin instance or null
 */
export async function getPlugin(pluginId) {
  return zpePluginManager.getPlugin(pluginId)
}

/**
 * Get all loaded plugins
 * @returns {Object[]} Array of plugin info
 */
export function getAllPlugins() {
  return zpePluginManager.getAllPlugins()
}

/**
 * Check for updates for all plugins
 * @returns {Promise<Object>} Update check results
 */
export async function checkAllForUpdates() {
  return updateManager.checkAllPlugins()
}

/**
 * Get available updates
 * @returns {Object[]} Plugins with available updates
 */
export function getAvailableUpdates() {
  return updateManager.getAvailableUpdates()
}

/**
 * Parse a .zpe file without loading
 * @param {ArrayBuffer|Uint8Array} data - ZPE file data
 * @returns {Object} Parsed plugin data
 */
export function parseZPE(data) {
  return ZPEParser.parse(data)
}

/**
 * Verify a .zpe file integrity
 * @param {ArrayBuffer|Uint8Array} data - ZPE file data
 * @returns {Promise<Object>} Verification result
 */
export async function verifyZPE(data) {
  return ZPEParser.verify(data)
}

/**
 * Create a new plugin from template
 * @param {Object} options - Template options
 * @returns {Object} Template manifest and code
 */
export function createNewPlugin(options) {
  return createPluginTemplate(options)
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Initialization
  initializeZPE,
  shutdownZPE,
  
  // Plugin management
  buildPlugin,
  loadPluginFromZPE,
  loadPlugin,
  unloadPlugin,
  getPlugin,
  getAllPlugins,
  
  // Updates
  checkAllForUpdates,
  getAvailableUpdates,
  
  // Utilities
  parseZPE,
  verifyZPE,
  createNewPlugin,
  
  // Manager instances
  pluginManager: zpePluginManager,
  updateManager
}
