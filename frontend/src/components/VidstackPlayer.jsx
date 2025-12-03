/**
 * VidstackPlayer Component
 * A modern video player using Vidstack with HLS, Anime4K support, and mobile/desktop compatibility
 * 
 * ## Video Pipeline Architecture
 * 
 * The ideal Anime4K pipeline should work as follows:
 * 
 *   1. Video Stream Source (HLS/MP4/MKV)
 *       ↓
 *   2. Video Decoder (browser native)
 *       ↓
 *   3. WebGL Canvas (Anime4K shader processing)
 *       - Applies upscaling/enhancement shaders
 *       - Maintains original framerate and timing
 *       ↓
 *   4. Vidstack Display
 *       - Audio remains synchronized via HTMLVideoElement
 *       - Video frames are rendered from WebGL canvas
 * 
 * ## Current Implementation
 * 
 * Due to browser limitations and complexity, we use a CSS filter approximation:
 *   - CSS filters (contrast, saturation, brightness) are applied to the video element
 *   - This provides a visual enhancement without true Anime4K upscaling
 *   - Audio sync is maintained as video is not re-encoded
 * 
 * ## Future WebGL Implementation Notes
 * 
 * For true Anime4K with WebGL shaders:
 *   1. Create an offscreen canvas with WebGL2 context
 *   2. Load Anime4K GLSL shaders (Clamp_Highlights, Restore_CNN, Upscale_CNN)
 *   3. On each video frame (requestVideoFrameCallback):
 *      - Draw video frame to WebGL canvas as texture
 *      - Apply shader pipeline
 *      - Display result
 *   4. Audio continues from original video element (maintains sync)
 * 
 * Libraries like @aspect-analytics/anime4k or custom WebGL implementations
 * can be integrated for true shader-based upscaling.
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  Track
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
  DefaultMenuItem,
  DefaultMenuRadioGroup
} from '@vidstack/react/player/layouts/default'

// Import Vidstack styles
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { anime4kConfig, getAllPresets as getLegacyPresets, checkWebGLSupport, getGPUInfo } from '../plugins/Anime4KConfig'
import { STREAM_FORMATS } from '../plugins'
import MiracastControls from './MiracastControls'

/**
 * Device detection utilities for iOS, Android, and desktop
 */
function getDeviceInfo() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
  
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
  const isAndroid = /Android/i.test(userAgent)
  const isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(userAgent)
  const isWindows = /Win32|Win64|Windows|WinCE/i.test(userAgent)
  const isLinux = /Linux/i.test(userAgent) && !isAndroid
  
  // Determine casting support based on device
  const supportsAirPlay = isIOS || isMac
  const supportsChromecast = !isIOS // Chromecast works on Android, Windows, Linux
  const supportsMiracast = isWindows || isLinux
  
  return {
    isIOS,
    isAndroid,
    isMobile,
    isMac,
    isWindows,
    isLinux,
    supportsAirPlay,
    supportsChromecast,
    supportsMiracast,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : isMac ? 'mac' : isWindows ? 'windows' : isLinux ? 'linux' : 'unknown'
  }
}

// Hook for device info
function useDeviceInfo() {
  return useMemo(() => getDeviceInfo(), [])
}

/**
 * Get source type for Vidstack based on format
 * @param {string} format - Stream format
 * @returns {string} Source type for Vidstack
 */
function getSourceType(format) {
  switch (format) {
    case STREAM_FORMATS.M3U8:
    case 'm3u8':
      return 'application/x-mpegURL'
    case STREAM_FORMATS.MP4:
    case 'mp4':
      return 'video/mp4'
    case STREAM_FORMATS.MKV:
    case 'mkv':
      return 'video/x-matroska'
    case STREAM_FORMATS.WEBM:
    case 'webm':
      return 'video/webm'
    default:
      return 'video/mp4'
  }
}

/**
 * Detect stream format from URL
 * @param {string} url - Stream URL
 * @returns {string} Detected format
 */
function detectFormat(url) {
  if (!url) return 'mp4'
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8')) return 'm3u8'
  if (lowerUrl.includes('.webm')) return 'webm'
  if (lowerUrl.includes('.mkv')) return 'mkv'
  return 'mp4'
}

/**
 * Hook to use Rust Anime4K backend with fallback to JavaScript config
 */
function useAnime4KRust() {
  const [presets, setPresets] = useState([])
  const [config, setConfig] = useState(null)
  const [isRustAvailable, setIsRustAvailable] = useState(false)

  useEffect(() => {
    const initAnime4K = async () => {
      try {
        if (window.api?.anime4k) {
          // Try to use Rust backend
          const rustPresets = await window.api.anime4k.getPresets()
          const rustConfig = await window.api.anime4k.getConfig()
          setPresets(rustPresets)
          setConfig(rustConfig)
          setIsRustAvailable(true)
        } else {
          // Fallback to JavaScript config with enhanced CSS-only sharpening
          setPresets(getLegacyPresets())
          setConfig({
            enabled: anime4kConfig.enabled,
            presetId: anime4kConfig.preset?.id || 'none',
            cssFilter: anime4kConfig.getCSSOnlyApproximation()
          })
          setIsRustAvailable(false)
        }
      } catch (error) {
        console.error('Failed to initialize Anime4K:', error)
        // Fallback to JavaScript config
        setPresets(getLegacyPresets())
        setIsRustAvailable(false)
      }
    }
    initAnime4K()
  }, [])

  const setAnime4KConfig = useCallback(async (enabled, presetId) => {
    try {
      if (isRustAvailable && window.api?.anime4k) {
        const newConfig = await window.api.anime4k.setConfig(enabled, presetId)
        setConfig(newConfig)
        return newConfig
      } else {
        // Fallback to JavaScript with enhanced CSS-only sharpening
        anime4kConfig.setPreset(presetId)
        anime4kConfig.enabled = enabled
        const cssFilter = anime4kConfig.getCSSOnlyApproximation()
        setConfig({
          enabled,
          presetId,
          cssFilter
        })
        return { enabled, presetId, cssFilter }
      }
    } catch (error) {
      console.error('Failed to set Anime4K config:', error)
      return null
    }
  }, [isRustAvailable])

  const recommendPreset = useCallback(async () => {
    try {
      if (isRustAvailable && window.api?.anime4k) {
        const gpuInfo = getGPUInfo()
        return await window.api.anime4k.recommendPreset(gpuInfo)
      }
      return 'mode-b' // Default fallback
    } catch {
      return 'mode-b'
    }
  }, [isRustAvailable])

  return { presets, config, setAnime4KConfig, recommendPreset, isRustAvailable }
}

/**
 * Anime4K Menu Item for Vidstack Settings Menu
 * Uses submenu style: "Anime4K >" → "Deaktiviert", "Mode A", "Mode B", etc.
 * Enhanced with friendly labels and performance indicators
 */
function Anime4KMenuItems({ preset, onPresetChange, enabled, onToggle, presets }) {
  const hasWebGL = checkWebGLSupport()
  
  // Create all options including "Deaktiviert" (disabled)
  const allOptions = [
    {
      label: 'Deaktiviert',
      value: 'none'
    },
    ...presets
      .filter(p => p.id !== 'none')
      .map(p => {
        // Add performance emoji indicators
        let performanceIcon = ''
        switch (p.performance) {
          case 'low':
            performanceIcon = '⚡'
            break
          case 'low-medium':
            performanceIcon = '⚡'
            break
          case 'medium':
            performanceIcon = '⚖️'
            break
          case 'medium-high':
            performanceIcon = '🔥'
            break
          case 'high':
            performanceIcon = '🔥'
            break
          case 'very-high':
            performanceIcon = '💎'
            break
          default:
            performanceIcon = ''
        }
        
        return {
          label: `${performanceIcon} ${p.name}`,
          value: p.id
        }
      })
  ]
  
  // Handle selection change - toggles enabled state and changes preset
  const handleChange = (value) => {
    if (value === 'none') {
      onToggle(false)
    } else {
      if (!enabled) {
        onToggle(true)
      }
      onPresetChange(value)
    }
  }
  
  // Get current value for the radio group
  const currentValue = enabled ? (preset?.id || 'mode-b') : 'none'
  
  if (!hasWebGL) {
    return null
  }
  
  return (
    <DefaultMenuItem label="Anime4K">
      <DefaultMenuRadioGroup
        value={currentValue}
        options={allOptions}
        onChange={handleChange}
      />
    </DefaultMenuItem>
  )
}

/**
 * SVG Filter Definitions for Anime4K Sharpening Effect
 * These filters simulate the sharpening effect of Anime4K using SVG convolution matrices
 */
function Anime4KSVGFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Light sharpening filter - Mode A */}
        <filter id="anime4k-sharpen-light" colorInterpolationFilters="sRGB">
          <feConvolveMatrix
            order="3 3"
            kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0"
            divisor="1"
            bias="0"
            preserveAlpha="true"
          />
        </filter>
        
        {/* Medium sharpening filter - Mode B */}
        <filter id="anime4k-sharpen-medium" colorInterpolationFilters="sRGB">
          <feConvolveMatrix
            order="3 3"
            kernelMatrix="0 -0.75 0 -0.75 4 -0.75 0 -0.75 0"
            divisor="1"
            bias="0"
            preserveAlpha="true"
          />
        </filter>
        
        {/* Strong sharpening filter - Mode C */}
        <filter id="anime4k-sharpen-strong" colorInterpolationFilters="sRGB">
          <feConvolveMatrix
            order="3 3"
            kernelMatrix="-0.25 -0.75 -0.25 -0.75 5 -0.75 -0.25 -0.75 -0.25"
            divisor="1"
            bias="0"
            preserveAlpha="true"
          />
        </filter>
        
        {/* Edge enhancement filter with unsharp mask effect */}
        <filter id="anime4k-unsharp" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feComponentTransfer in="blur" result="blur-dark">
            <feFuncR type="linear" slope="0.5" />
            <feFuncG type="linear" slope="0.5" />
            <feFuncB type="linear" slope="0.5" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="blur-dark" operator="arithmetic" k1="0" k2="1.5" k3="-0.5" k4="0" />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * VidstackPlayer Component
 * Unified video player supporting multiple formats with Anime4K shaders
 * Supports iOS AirPlay, Android/desktop Chromecast, and Windows/Linux Miracast
 */
const VidstackPlayer = forwardRef(function VidstackPlayer(
  {
    src,
    format,
    title = '',
    poster = '',
    autoPlay = false,
    onTimeUpdate,
    onEnded,
    onError,
    subtitles = [],
    anime4kEnabled = false,
    anime4kPreset = 'mode-b',
    className = '',
    showAnime4KControls = true,
    showMiracastControls = true,
    showCastControls = true
  },
  ref
) {
  const playerRef = useRef(null)
  
  // Device detection for casting support
  const deviceInfo = useDeviceInfo()
  
  // Use Rust Anime4K backend
  const { 
    presets, 
    config, 
    setAnime4KConfig
  } = useAnime4KRust()
  
  const [isAnime4KEnabled, setIsAnime4KEnabled] = useState(anime4kEnabled)
  const [currentPreset, setCurrentPreset] = useState(null)
  const [videoStyle, setVideoStyle] = useState({})
  
  // Initialize preset when presets are loaded
  useEffect(() => {
    if (presets.length > 0) {
      const preset = presets.find(p => p.id === anime4kPreset) || presets.find(p => p.id === 'mode-b') || presets[0]
      setCurrentPreset(preset)
    }
  }, [presets, anime4kPreset])
  
  // Sync with Rust config when available
  useEffect(() => {
    if (config) {
      setIsAnime4KEnabled(config.enabled)
      if (config.cssFilter && config.cssFilter !== 'none') {
        setVideoStyle({ filter: config.cssFilter })
      } else {
        setVideoStyle({})
      }
    }
  }, [config])
  
  // Detect format if not provided
  const detectedFormat = format || detectFormat(src)
  const sourceType = getSourceType(detectedFormat)
  
  // Expose player methods via ref
  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    seek: (time) => {
      if (playerRef.current) {
        playerRef.current.currentTime = time
      }
    },
    getCurrentTime: () => playerRef.current?.currentTime || 0,
    getDuration: () => playerRef.current?.duration || 0,
    setVolume: (volume) => {
      if (playerRef.current) {
        playerRef.current.volume = volume
      }
    },
    toggleFullscreen: () => playerRef.current?.requestFullscreen?.(),
    setAnime4K: async (enabled, preset) => {
      await handleAnime4KToggle(enabled)
      if (preset) {
        await handlePresetChange(preset)
      }
    },
    getDeviceInfo: () => deviceInfo
  }))
  
  // Handle preset change
  const handlePresetChange = async (presetId) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setCurrentPreset(preset)
      const newConfig = await setAnime4KConfig(isAnime4KEnabled, presetId)
      if (newConfig?.cssFilter) {
        setVideoStyle({ filter: newConfig.cssFilter })
      }
    }
  }
  
  // Handle Anime4K toggle
  const handleAnime4KToggle = async (enabled) => {
    setIsAnime4KEnabled(enabled)
    const presetId = currentPreset?.id || 'mode-b'
    const newConfig = await setAnime4KConfig(enabled, presetId)
    if (newConfig?.cssFilter && enabled) {
      setVideoStyle({ filter: newConfig.cssFilter })
    } else {
      setVideoStyle({})
    }
  }
  
  // Determine which casting controls to show based on device
  const showMiracast = showMiracastControls && deviceInfo.supportsMiracast
  
  // Mobile-specific class adjustments
  const mobileClass = deviceInfo.isMobile ? 'vidstack-mobile' : ''
  
  return (
    <div className={`vidstack-player-wrapper ${className} ${mobileClass}`}>
      {/* SVG Filters for Anime4K sharpening effect */}
      <Anime4KSVGFilters />
      
      {/* Miracast controls bar - Miracast needs to be outside MediaPlayer as it doesn't require media context */}
      {showMiracast && (
        <div className={`flex justify-end mb-2 gap-2 ${deviceInfo.isMobile ? 'flex-wrap' : ''}`}>
          <MiracastControls 
            videoUrl={src}
            videoTitle={title}
          />
        </div>
      )}
      
      <MediaPlayer
        ref={playerRef}
        title={title}
        src={{ src, type: sourceType }}
        autoPlay={autoPlay}
        crossOrigin="anonymous"
        playsInline
        onTimeUpdate={(e) => {
          onTimeUpdate?.({
            currentTime: e.target.currentTime,
            duration: e.target.duration
          })
        }}
        onEnded={onEnded}
        onError={(e) => {
          console.error('Video error:', e)
          onError?.(e)
        }}
        className={`w-full aspect-video bg-black ${deviceInfo.isMobile ? 'touch-action-manipulation' : ''}`}
        style={videoStyle}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt={title} />}
          
          {/* Subtitle tracks */}
          {subtitles.map((sub, index) => (
            <Track
              key={index}
              src={sub.src}
              kind="subtitles"
              label={sub.label || `Subtitles ${index + 1}`}
              lang={sub.lang || 'en'}
              default={sub.default || index === 0}
            />
          ))}
        </MediaProvider>
        
        {/* Default video layout with Anime4K integrated in settings menu */}
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails=""
          smallLayoutWhen={({ width, height }) => width < 768 || height < 480}
          slots={{
            // Add Anime4K settings to the settings menu
            settingsMenuItemsEnd: showAnime4KControls && presets.length > 0 ? (
              <Anime4KMenuItems
                preset={currentPreset}
                onPresetChange={handlePresetChange}
                enabled={isAnime4KEnabled}
                onToggle={handleAnime4KToggle}
                presets={presets}
              />
            ) : null
          }}
        />
      </MediaPlayer>
    </div>
  )
})

/**
 * Simple Vidstack Player without Anime4K controls
 * For simpler use cases
 */
export function SimpleVidstackPlayer({
  src,
  format,
  title = '',
  poster = '',
  autoPlay = false,
  className = ''
}) {
  const detectedFormat = format || detectFormat(src)
  const sourceType = getSourceType(detectedFormat)
  
  return (
    <MediaPlayer
      title={title}
      src={{ src, type: sourceType }}
      autoPlay={autoPlay}
      crossOrigin="anonymous"
      playsInline
      className={`w-full aspect-video bg-black ${className}`}
    >
      <MediaProvider>
        {poster && <Poster className="vds-poster" src={poster} alt={title} />}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  )
}

/**
 * HLS Player specifically for m3u8 streams
 * Uses Vidstack's built-in HLS support
 */
export function HLSVidstackPlayer({
  src,
  title = '',
  poster = '',
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  className = ''
}) {
  return (
    <MediaPlayer
      title={title}
      src={{ src, type: 'application/x-mpegURL' }}
      autoPlay={autoPlay}
      crossOrigin="anonymous"
      playsInline
      onTimeUpdate={(e) => {
        onTimeUpdate?.({
          currentTime: e.target.currentTime,
          duration: e.target.duration
        })
      }}
      onEnded={onEnded}
      className={`w-full aspect-video bg-black ${className}`}
    >
      <MediaProvider>
        {poster && <Poster className="vds-poster" src={poster} alt={title} />}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  )
}

export default VidstackPlayer
