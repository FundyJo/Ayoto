/**
 * Anime4K Shader Configuration
 * Provides shader presets for high-quality anime upscaling
 * 
 * Anime4K is a set of open-source, high-quality real-time anime upscaling/denoising
 * algorithms that can be implemented as WebGL shaders.
 * 
 * ## Integration with Vidstack
 * 
 * The video pipeline for Anime4K with Vidstack works as follows:
 * 
 *   Video Stream → Browser Decoder → Anime4K Processing → Vidstack Display
 *                                         ↓
 *                                   Audio (sync maintained)
 * 
 * ### Current CSS Approximation
 * Since full WebGL Anime4K shaders require complex integration,
 * we currently use CSS filters as an approximation:
 * - contrast: Enhances edge definition
 * - saturate: Improves color vibrancy (common in anime)
 * - brightness: Fine-tunes overall lighting
 * 
 * ### Audio Synchronization
 * Audio sync is maintained because:
 * 1. CSS filters are applied in real-time by the browser compositor
 * 2. The underlying video element's timing is not affected
 * 3. No video re-encoding or frame manipulation occurs
 * 
 * For WebGL-based implementations, audio sync is maintained by:
 * 1. Using requestVideoFrameCallback() for precise frame timing
 * 2. Processing video frames without modifying playback timing
 * 3. Audio continues from the original HTMLVideoElement
 * 
 * Note: Full Anime4K shader implementation requires WebGL support and is performance-intensive.
 * This module provides configuration and preset definitions for integration with video players.
 */

// Anime4K shader presets with quality/performance trade-offs
export const ANIME4K_PRESETS = {
  // No shaders - best performance
  NONE: {
    id: 'none',
    name: 'Off',
    description: 'No upscaling shaders',
    performance: 'none',
    shaders: []
  },
  
  // Mode A - Optimized for weak GPUs
  MODE_A: {
    id: 'mode-a',
    name: 'Mode A (Fast)',
    description: 'Optimized for weak GPUs, minimal quality improvement',
    performance: 'low',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Restore_CNN_S',
      'Anime4K_Upscale_CNN_x2_S'
    ]
  },
  
  // Mode B - Balanced
  MODE_B: {
    id: 'mode-b',
    name: 'Mode B (Balanced)',
    description: 'Balanced quality and performance',
    performance: 'medium',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Restore_CNN_Soft_M',
      'Anime4K_Upscale_CNN_x2_M'
    ]
  },
  
  // Mode C - High quality
  MODE_C: {
    id: 'mode-c',
    name: 'Mode C (High Quality)',
    description: 'High quality, requires powerful GPU',
    performance: 'high',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Upscale_Denoise_CNN_x2_VL',
      'Anime4K_AutoDownscalePre_x2',
      'Anime4K_AutoDownscalePre_x4',
      'Anime4K_Upscale_CNN_x2_L'
    ]
  },
  
  // Mode A+A - Fast with additional shaders
  MODE_A_A: {
    id: 'mode-a+a',
    name: 'Mode A+A',
    description: 'Fast mode with line art enhancement',
    performance: 'low-medium',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Restore_CNN_S',
      'Anime4K_Upscale_CNN_x2_S',
      'Anime4K_Restore_CNN_S',
      'Anime4K_AutoDownscalePre_x2',
      'Anime4K_Upscale_CNN_x2_S'
    ]
  },
  
  // Mode B+B - Balanced with additional shaders
  MODE_B_B: {
    id: 'mode-b+b',
    name: 'Mode B+B',
    description: 'Balanced mode with enhanced details',
    performance: 'medium-high',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Restore_CNN_Soft_M',
      'Anime4K_Upscale_CNN_x2_M',
      'Anime4K_AutoDownscalePre_x2',
      'Anime4K_Restore_CNN_Soft_M',
      'Anime4K_Upscale_CNN_x2_M'
    ]
  },
  
  // Mode C+A - High quality with fast secondary pass
  MODE_C_A: {
    id: 'mode-c+a',
    name: 'Mode C+A (Best)',
    description: 'Best quality, requires very powerful GPU',
    performance: 'very-high',
    shaders: [
      'Anime4K_Clamp_Highlights',
      'Anime4K_Upscale_Denoise_CNN_x2_VL',
      'Anime4K_AutoDownscalePre_x2',
      'Anime4K_AutoDownscalePre_x4',
      'Anime4K_Upscale_CNN_x2_L',
      'Anime4K_Restore_CNN_S',
      'Anime4K_AutoDownscalePre_x2',
      'Anime4K_Upscale_CNN_x2_S'
    ]
  }
}

// Performance requirements for each preset
export const PERFORMANCE_REQUIREMENTS = {
  none: {
    minVRAM: 0,
    minGPU: 'Any',
    estimatedFPS: '60+'
  },
  low: {
    minVRAM: 1,
    minGPU: 'Intel HD 4000 / GTX 750 / RX 550',
    estimatedFPS: '60'
  },
  'low-medium': {
    minVRAM: 2,
    minGPU: 'Intel UHD 620 / GTX 960 / RX 570',
    estimatedFPS: '50-60'
  },
  medium: {
    minVRAM: 2,
    minGPU: 'GTX 1050 / RX 580',
    estimatedFPS: '45-60'
  },
  'medium-high': {
    minVRAM: 4,
    minGPU: 'GTX 1060 / RX 5600',
    estimatedFPS: '40-60'
  },
  high: {
    minVRAM: 4,
    minGPU: 'GTX 1070 / RX 5700',
    estimatedFPS: '35-60'
  },
  'very-high': {
    minVRAM: 6,
    minGPU: 'RTX 2060 / RX 6700 XT',
    estimatedFPS: '30-60'
  }
}

/**
 * Get recommended preset based on device capabilities
 * @param {Object} deviceInfo - Device information
 * @returns {Object} Recommended preset
 */
export function getRecommendedPreset(deviceInfo = {}) {
  const { gpu, vram, isMobile } = deviceInfo
  
  // Mobile devices should use lower presets
  if (isMobile) {
    return ANIME4K_PRESETS.MODE_A
  }
  
  // If we have VRAM info, use that to determine preset
  if (vram) {
    if (vram >= 6) return ANIME4K_PRESETS.MODE_C_A
    if (vram >= 4) return ANIME4K_PRESETS.MODE_C
    if (vram >= 2) return ANIME4K_PRESETS.MODE_B
    return ANIME4K_PRESETS.MODE_A
  }
  
  // Default to balanced mode
  return ANIME4K_PRESETS.MODE_B
}

/**
 * Check if device supports WebGL (required for Anime4K)
 * @returns {boolean}
 */
export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

/**
 * Get device GPU information if available
 * @returns {Object|null} GPU info or null
 */
export function getGPUInfo() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    
    if (!gl) return null
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return null
    
    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    }
  } catch {
    return null
  }
}

/**
 * Anime4K configuration for video player integration
 */
export class Anime4KConfig {
  constructor() {
    this.enabled = false
    this.preset = ANIME4K_PRESETS.MODE_B
    this.customShaders = []
  }
  
  /**
   * Enable Anime4K with a specific preset
   * @param {string} presetId - Preset ID
   */
  setPreset(presetId) {
    const preset = Object.values(ANIME4K_PRESETS).find(p => p.id === presetId)
    if (preset) {
      this.preset = preset
      this.enabled = preset.id !== 'none'
    }
  }
  
  /**
   * Get current shader configuration
   * @returns {Object} Shader config
   */
  getShaderConfig() {
    return {
      enabled: this.enabled,
      preset: this.preset,
      shaders: this.preset.shaders,
      performance: this.preset.performance,
      requirements: PERFORMANCE_REQUIREMENTS[this.preset.performance]
    }
  }
  
  /**
   * Check if current device can handle the selected preset
   * @returns {boolean}
   */
  canHandle() {
    // Basic check - more sophisticated detection could be added
    return checkWebGLSupport()
  }
  
  /**
   * Get CSS filter approximation for Anime4K effect
   * This is a CSS-based alternative that simulates sharpening effects
   * Uses contrast enhancement and SVG filter URL for edge sharpening
   * @returns {string} CSS filter string
   */
  getCSSApproximation() {
    if (!this.enabled) return 'none'
    
    // Enhanced CSS approximation with sharpening simulation
    // Uses higher contrast and SVG sharpen filter URL
    switch (this.preset.id) {
      case 'mode-a':
        // Light sharpening for weak GPUs
        return 'contrast(1.08) saturate(1.12) url(#anime4k-sharpen-light)'
      case 'mode-b':
        // Medium sharpening - balanced
        return 'contrast(1.12) saturate(1.18) brightness(1.01) url(#anime4k-sharpen-medium)'
      case 'mode-a+a':
        // Light+ sharpening
        return 'contrast(1.1) saturate(1.15) url(#anime4k-sharpen-light)'
      case 'mode-b+b':
        // Medium+ sharpening with detail enhancement
        return 'contrast(1.15) saturate(1.2) brightness(1.01) url(#anime4k-sharpen-medium)'
      case 'mode-c':
        // High quality sharpening
        return 'contrast(1.15) saturate(1.22) brightness(1.01) url(#anime4k-sharpen-strong)'
      case 'mode-c+a':
        // Maximum sharpening
        return 'contrast(1.18) saturate(1.25) brightness(1.01) url(#anime4k-sharpen-strong)'
      default:
        return 'none'
    }
  }
  
  /**
   * Get CSS-only filter approximation (without SVG dependency)
   * Uses only CSS filters for maximum compatibility
   * Enhanced with upscaling simulation via image-rendering and sharpening
   * @returns {string} CSS filter string
   */
  getCSSOnlyApproximation() {
    if (!this.enabled) return 'none'
    
    // CSS-only approximation using contrast/brightness to simulate sharpness
    // Higher contrast enhances edges, which creates a sharpening-like effect
    // Combined with upscaling, this provides a noticeable quality improvement
    switch (this.preset.id) {
      case 'mode-a':
        // Light enhancement - 2x upscale simulation
        // Gentle sharpening suitable for weak GPUs
        return 'contrast(1.12) saturate(1.15) brightness(1.02)'
      case 'mode-b':
        // Medium enhancement with edge boost - 2x upscale simulation
        // Balanced quality and performance
        return 'contrast(1.18) saturate(1.2) brightness(1.02)'
      case 'mode-a+a':
        // Light+ enhancement with line art boost
        return 'contrast(1.15) saturate(1.18) brightness(1.02)'
      case 'mode-b+b':
        // Medium+ enhancement with enhanced details
        return 'contrast(1.22) saturate(1.25) brightness(1.02)'
      case 'mode-c':
        // High enhancement - aggressive 2x upscale
        return 'contrast(1.25) saturate(1.28) brightness(1.02)'
      case 'mode-c+a':
        // Maximum enhancement - best quality 2x upscale
        return 'contrast(1.3) saturate(1.32) brightness(1.02)'
      default:
        return 'none'
    }
  }
  
  /**
   * Get upscale factor based on preset
   * All Anime4K presets use 2x upscaling
   * @returns {number} Upscale factor (2 for all presets, 1 for none)
   */
  getUpscaleFactor() {
    if (!this.enabled || this.preset.id === 'none') return 1
    // Anime4K uses 2x upscaling by default
    return 2
  }
  
  /**
   * Calculate upscaled resolution
   * @param {number} originalWidth - Original video width
   * @param {number} originalHeight - Original video height
   * @returns {Object} Upscaled resolution info
   */
  getUpscaledResolution(originalWidth, originalHeight) {
    const factor = this.getUpscaleFactor()
    return {
      width: originalWidth * factor,
      height: originalHeight * factor,
      factor,
      label: factor > 1 ? `${originalHeight}p → ${originalHeight * factor}p (${factor}x)` : `${originalHeight}p`
    }
  }
}

// Export singleton instance
export const anime4kConfig = new Anime4KConfig()

/**
 * Get all available presets as array
 * @returns {Object[]}
 */
export function getAllPresets() {
  return Object.values(ANIME4K_PRESETS)
}

/**
 * Get preset by ID
 * @param {string} presetId - Preset ID
 * @returns {Object|undefined}
 */
export function getPresetById(presetId) {
  return Object.values(ANIME4K_PRESETS).find(p => p.id === presetId)
}

/**
 * Get upscale information for display
 * @param {number} videoHeight - Original video height
 * @param {boolean} enabled - Whether Anime4K is enabled
 * @returns {Object} Upscale info object
 */
export function getUpscaleDisplayInfo(videoHeight, enabled) {
  if (!enabled || !videoHeight) {
    return {
      original: videoHeight ? `${videoHeight}p` : 'Auto',
      upscaled: null,
      factor: 1,
      label: videoHeight ? `${videoHeight}p` : 'Auto'
    }
  }
  
  const upscaledHeight = videoHeight * 2
  
  // Common resolution names
  const getResolutionName = (h) => {
    if (h <= 480) return '480p (SD)'
    if (h <= 720) return '720p (HD)'
    if (h <= 1080) return '1080p (Full HD)'
    if (h <= 1440) return '1440p (2K)'
    if (h <= 2160) return '2160p (4K UHD)'
    return `${h}p`
  }
  
  return {
    original: getResolutionName(videoHeight),
    upscaled: getResolutionName(upscaledHeight),
    factor: 2,
    label: `${getResolutionName(videoHeight)} → ${getResolutionName(upscaledHeight)}`
  }
}

export default Anime4KConfig
