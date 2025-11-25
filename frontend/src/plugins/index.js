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
