/**
 * Ayoto Plugin System
 * Exports all plugin-related modules
 * 
 * Plugin Types:
 * 1. StreamProvider - Handles streaming analysis and video extraction from hosters
 *    like Voe, Vidoza, Filestream, etc.
 * 2. MediaProvider - Provides anime/media search and listings from sites
 *    like aniworld.to, s.to, etc.
 */

export {
  PluginManager,
  pluginManager,
  parseAyotoPlugin,
  validatePlugin,
  createPluginTemplate,
  createMediaProviderTemplate,
  createStreamProviderTemplate,
  STREAM_FORMATS,
  ANIME4K_PRESETS,
  PLUGIN_TYPES
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
  getStreamProviders,
  getMediaProviders,
  getStreamProvidersForHoster,
  getMediaProvidersForLanguage,
  validatePluginManifest,
  getSamplePluginManifest,
  getSampleStreamProviderManifest,
  checkPluginCompatibility,
  pluginSearch,
  pluginGetPopular,
  pluginGetLatest,
  pluginGetEpisodes,
  pluginGetStreams,
  pluginGetAnimeDetails,
  searchAllPlugins,
  // ZPE Plugin Functions
  getZpeExtension,
  getZpeAbiVersion,
  loadZpePlugin,
  getAllZpePlugins,
  getZpePlugin,
  unloadZpePlugin,
  setZpePluginEnabled,
  zpePluginSearch,
  zpePluginGetPopular,
  zpePluginGetLatest,
  zpePluginGetEpisodes,
  zpePluginGetStreams,
  zpePluginGetAnimeDetails,
  getZpePluginInfo,
  // ZPE Plugin Persistence Functions
  saveZpePluginPaths,
  getSavedZpePluginPaths,
  reloadSavedZpePlugins
} from './TauriPluginBridge'
