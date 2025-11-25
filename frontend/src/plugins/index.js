/**
 * Ayoto Plugin System
 * Exports all plugin-related modules
 */

export {
  PluginManager,
  pluginManager,
  parseAyotoPlugin,
  validatePlugin,
  createPluginTemplate,
  STREAM_FORMATS,
  ANIME4K_PRESETS
} from './PluginManager'

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

// Tauri Plugin Bridge - connects to Rust backend
export {
  TauriPluginBridge,
  pluginBridge,
  getAyotoVersion,
  loadPluginFromJson,
  loadPluginFromFile,
  getAllPlugins,
  getEnabledPlugins,
  getPlugin,
  getPluginsSummary,
  setPluginEnabled,
  unloadPlugin,
  getPluginsWithCapability,
  getPluginsByFormat,
  getAnime4kPlugins,
  validatePluginManifest,
  getSamplePluginManifest,
  checkPluginCompatibility,
  pluginSearch,
  pluginGetPopular,
  pluginGetLatest,
  pluginGetEpisodes,
  pluginGetStreams,
  pluginGetAnimeDetails,
  searchAllPlugins
} from './TauriPluginBridge'
