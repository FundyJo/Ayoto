/**
 * Ayoto Plugin System
 * Exports all plugin-related modules
 * 
 * Plugin Types:
 * 1. StreamProvider - Handles streaming analysis and video extraction from hosters
 *    like Voe, Vidoza, Filestream, etc.
 * 2. MediaProvider - Provides anime/media search and listings from sites
 *    like aniworld.to, s.to, etc.
 * 
 * Plugins are written in JavaScript/TypeScript and run in a sandboxed environment.
 * They can perform web scraping using the built-in HTTP client.
 */

// JavaScript Plugin Runtime - the main plugin system
export {
  JSPluginManager,
  jsPluginManager,
  JSPlugin,
  PluginContext,
  HtmlParser,
  PLUGIN_TYPE,
  STREAM_FORMAT
} from './JSPluginRuntime'

export {
  ProviderAPI,
  providerRegistry,
  getVidstackFormatInfo
} from './ProviderAPI'

export {
  Anime4KConfig,
  anime4kConfig,
  getAllPresets,
  getPresetById,
  getRecommendedPreset,
  checkWebGLSupport,
  getGPUInfo,
  PERFORMANCE_REQUIREMENTS
} from './Anime4KConfig'

// Legacy support - re-export from JSPluginRuntime with old names
export { STREAM_FORMAT as STREAM_FORMATS } from './JSPluginRuntime'
export { PLUGIN_TYPE as PLUGIN_TYPES } from './JSPluginRuntime'

// Tauri Plugin Bridge - simplified for JS plugins
export {
  TauriPluginBridge,
  pluginBridge,
  getAyotoVersion
} from './TauriPluginBridge'
