/**
 * Anime4K WebGPU Processor
 * 
 * Real implementation of Anime4K upscaling using WebGPU compute shaders.
 * This provides actual sharpening, upscaling, and restoration effects
 * instead of just CSS filter approximations.
 * 
 * Based on anime4k-webgpu npm package
 * See: https://github.com/Anime4KWebBoost/Anime4K-WebGPU
 */

import { useEffect, useRef, useState } from 'react'

// Import preset modes from anime4k-webgpu
// These are dynamically imported to handle WebGPU not being available
let anime4kWebGPU = null

/**
 * Check if WebGPU is supported in the current browser
 * @returns {Promise<boolean>}
 */
export async function isWebGPUSupported() {
  if (!navigator.gpu) {
    return false
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

/**
 * Load the anime4k-webgpu module dynamically
 * @returns {Promise<object|null>}
 */
async function loadAnime4KModule() {
  if (anime4kWebGPU) return anime4kWebGPU
  
  try {
    // Dynamic import for WebGPU module
    anime4kWebGPU = await import('anime4k-webgpu')
    return anime4kWebGPU
  } catch (error) {
    console.error('Failed to load anime4k-webgpu module:', error)
    return null
  }
}

/**
 * Get the preset class based on preset ID
 * @param {object} module - The anime4k-webgpu module
 * @param {string} presetId - The preset ID (e.g., 'mode-a', 'mode-b')
 * @returns {Function|null} The preset class constructor
 */
function getPresetClass(module, presetId) {
  if (!module) return null
  
  switch (presetId) {
    case 'mode-a':
      return module.ModeA
    case 'mode-b':
      return module.ModeB
    case 'mode-c':
      return module.ModeC
    case 'mode-a+a':
      return module.ModeAA
    case 'mode-b+b':
      return module.ModeBB
    case 'mode-c+a':
      return module.ModeCA
    default:
      return module.ModeB // Default to balanced mode
  }
}

/**
 * Anime4K WebGPU Processor Hook
 * 
 * This hook manages the WebGPU rendering pipeline for Anime4K processing.
 * It takes a video element, processes each frame through WebGPU shaders,
 * and renders the result to a canvas overlay.
 * 
 * @param {Object} options
 * @param {HTMLVideoElement} options.video - Source video element
 * @param {string} options.presetId - Anime4K preset mode
 * @param {boolean} options.enabled - Whether processing is enabled
 * @param {number} options.upscaleFactor - Upscale factor (default 2)
 * @returns {Object} Processor state and controls
 */
export function useAnime4KWebGPU({ video, presetId = 'mode-b', enabled = false, upscaleFactor = 2 }) {
  const canvasRef = useRef(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const renderingRef = useRef(false)
  const cleanupRef = useRef(null)

  // Check WebGPU support on mount
  useEffect(() => {
    isWebGPUSupported().then(setIsSupported)
  }, [])

  // Initialize or cleanup rendering
  useEffect(() => {
    if (!enabled || !video || !isSupported) {
      // Cleanup existing renderer
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      setIsActive(false)
      return
    }

    let cancelled = false
    
    const initRenderer = async () => {
      try {
        const module = await loadAnime4KModule()
        if (!module || cancelled) return
        
        const PresetClass = getPresetClass(module, presetId)
        if (!PresetClass || cancelled) return

        // Create canvas for rendering
        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        // Set canvas size based on upscale factor
        const nativeWidth = video.videoWidth || 1920
        const nativeHeight = video.videoHeight || 1080
        canvas.width = nativeWidth * upscaleFactor
        canvas.height = nativeHeight * upscaleFactor

        // Start WebGPU rendering
        await module.render({
          video,
          canvas,
          pipelineBuilder: (device, inputTexture) => {
            const preset = new PresetClass({
              device,
              inputTexture,
              nativeDimensions: {
                width: nativeWidth,
                height: nativeHeight,
              },
              targetDimensions: {
                width: canvas.width,
                height: canvas.height,
              }
            })
            return [preset]
          },
        })

        if (!cancelled) {
          setIsActive(true)
          setError(null)
          renderingRef.current = true
        }

        // Store cleanup function
        cleanupRef.current = () => {
          renderingRef.current = false
          // Canvas will be hidden/removed by parent component
        }
      } catch (err) {
        console.error('Anime4K WebGPU initialization failed:', err)
        if (!cancelled) {
          setError(err.message || 'WebGPU initialization failed')
          setIsActive(false)
        }
      }
    }

    initRenderer()

    return () => {
      cancelled = true
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [enabled, video, presetId, isSupported, upscaleFactor])

  return {
    canvasRef,
    isSupported,
    isActive,
    error
  }
}

/**
 * Anime4K Canvas Overlay Component
 * 
 * This component renders a canvas overlay on top of the video element
 * that displays the WebGPU-processed frames.
 * 
 * @param {Object} props
 * @param {HTMLVideoElement} props.video - Source video element
 * @param {string} props.presetId - Anime4K preset mode
 * @param {boolean} props.enabled - Whether processing is enabled
 * @param {string} props.className - Additional CSS classes
 */
export function Anime4KCanvas({ video, presetId, enabled, className = '' }) {
  const { canvasRef, isSupported, isActive, error } = useAnime4KWebGPU({
    video,
    presetId,
    enabled
  })

  if (!enabled || !isSupported || error) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className={`anime4k-canvas ${className} ${isActive ? 'active' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    />
  )
}

/**
 * Get WebGPU capability information
 * @returns {Promise<Object>} Capability info
 */
export async function getWebGPUInfo() {
  if (!navigator.gpu) {
    return {
      supported: false,
      reason: 'WebGPU not available in this browser'
    }
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        reason: 'No GPU adapter available'
      }
    }

    // requestAdapterInfo may not exist in older implementations
    // Use a safe call pattern with fallback
    let info = null
    if (typeof adapter.requestAdapterInfo === 'function') {
      try {
        info = await adapter.requestAdapterInfo()
      } catch {
        // Ignore errors from requestAdapterInfo as it's optional
        info = null
      }
    }
    
    const limits = adapter.limits

    return {
      supported: true,
      adapter: {
        vendor: info?.vendor || 'Unknown',
        architecture: info?.architecture || 'Unknown',
        device: info?.device || 'Unknown',
        description: info?.description || 'Unknown GPU'
      },
      limits: {
        maxTextureDimension2D: limits?.maxTextureDimension2D || 8192,
        maxComputeWorkgroupsPerDimension: limits?.maxComputeWorkgroupsPerDimension || 65535
      }
    }
  } catch (error) {
    return {
      supported: false,
      reason: error.message || 'Failed to query WebGPU adapter'
    }
  }
}

export default {
  isWebGPUSupported,
  useAnime4KWebGPU,
  Anime4KCanvas,
  getWebGPUInfo
}
