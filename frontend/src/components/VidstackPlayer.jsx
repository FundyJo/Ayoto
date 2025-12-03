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
  Track,
  Menu
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons
} from '@vidstack/react/player/layouts/default'

// Import Vidstack styles
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { anime4kConfig, getAllPresets as getLegacyPresets, checkWebGLSupport, getGPUInfo, getUpscaleDisplayInfo, DEFAULT_ANIME4K_PRESET_ID } from '../plugins/Anime4KConfig'
import { STREAM_FORMATS } from '../plugins'

/**
 * Custom SVG Icons for Anime4K Menu
 * These avoid the dependency on @vidstack/react/icons which requires media-icons
 */
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/**
 * Cast Icon for Miracast Menu
 */
function CastIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
      <line x1="2" y1="20" x2="2.01" y2="20" />
    </svg>
  )
}

/**
 * Stop Icon for Miracast Menu
 */
function StopIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

/**
 * Play Icon for Miracast Menu
 */
function PlayIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

/**
 * X/Close Icon for Miracast Menu
 */
function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/**
 * Search/Scan Icon for Miracast Menu
 */
function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/**
 * Refresh/Loading Icon for Miracast Menu
 */
function RefreshIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

/**
 * TV/Monitor Icon for Miracast Menu
 */
function TvIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  )
}

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
      return DEFAULT_ANIME4K_PRESET_ID // Default fallback
    } catch {
      return DEFAULT_ANIME4K_PRESET_ID
    }
  }, [isRustAvailable])

  return { presets, config, setAnime4KConfig, recommendPreset, isRustAvailable }
}

/**
 * Anime4K Upscale Icon Component
 * Custom SVG icon representing upscaling/enhancement
 */
function Anime4KIcon(props) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      {/* A4K text representation */}
      <text x="2" y="18" fontSize="10" fontWeight="bold" fill="currentColor" stroke="none">4K</text>
      {/* Upscale arrow */}
      <path d="M16 3 L21 3 L21 8" />
      <path d="M14 10 L21 3" />
    </svg>
  )
}

/**
 * Custom hook to manage Anime4K options similar to useAudioOptions from Vidstack
 * This follows the pattern from vidstack.io documentation
 */
function useAnime4KOptions(presets, preset, enabled, onPresetChange, onToggle) {
  // Build options array from presets
  const options = useMemo(() => {
    // Add disabled option first
    const disabledOption = {
      label: 'Deaktiviert',
      value: 'none',
      // Vidstack's onSelect passes a trigger event - we don't need it but must accept it
      select(_trigger) {
        onToggle(false)
      }
    }
    
    // Map presets to options format
    const presetOptions = presets
      .filter(p => p.id !== 'none')
      .map(p => {
        // Add performance emoji indicators
        let performanceIcon = ''
        switch (p.performance) {
          case 'low':
          case 'low-medium':
            performanceIcon = '⚡'
            break
          case 'medium':
            performanceIcon = '⚖️'
            break
          case 'medium-high':
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
          value: p.id,
          description: p.description,
          // Vidstack's onSelect passes a trigger event - we don't need it but must accept it
          select(_trigger) {
            if (!enabled) {
              onToggle(true)
            }
            onPresetChange(p.id)
          }
        }
      })
    
    return [disabledOption, ...presetOptions]
  }, [presets, enabled, onPresetChange, onToggle])
  
  // Get selected value and track
  const selectedValue = enabled ? (preset?.id || DEFAULT_ANIME4K_PRESET_ID) : 'none'
  const selectedTrack = preset ? { label: preset.name } : null
  const disabled = !checkWebGLSupport()
  const hint = selectedTrack?.label ?? 'Deaktiviert'
  
  return {
    options,
    selectedValue,
    selectedTrack,
    disabled,
    hint
  }
}

/**
 * Submenu Button Component
 * Following the pattern from vidstack.io documentation
 */
function SubmenuButton({ label, hint, Icon, disabled }) {
  return (
    <Menu.Button className="vds-menu-item" disabled={disabled}>
      <ChevronLeftIcon className="vds-menu-close-icon vds-icon" />
      <Icon className="vds-icon" />
      <span className="vds-menu-item-label">{label}</span>
      <span className="vds-menu-item-hint">{hint}</span>
      <ChevronRightIcon className="vds-menu-open-icon vds-icon" />
    </Menu.Button>
  )
}

/**
 * Anime4K Submenu Component
 * Integrated into the settings menu via Vidstack slots
 * Features 2x upscaling display and mode selection
 * Follows the pattern from vidstack.io/docs/player/components/menus/menu
 */
function Anime4KSubmenu({ preset, onPresetChange, enabled, onToggle, presets, videoHeight }) {
  const anime4kOptions = useAnime4KOptions(presets, preset, enabled, onPresetChange, onToggle)
  const upscaleInfo = getUpscaleDisplayInfo(videoHeight, enabled)
  
  if (anime4kOptions.disabled) {
    return null
  }
  
  return (
    <Menu.Root className="vds-anime4k-menu vds-menu anime4k-settings-submenu">
      <SubmenuButton label="Anime4K" hint={anime4kOptions.hint} disabled={anime4kOptions.disabled} Icon={Anime4KIcon} />
      <Menu.Content className="vds-menu-items anime4k-menu-content">
        {/* Upscale resolution info section */}
        {enabled && (
          <div className="anime4k-upscale-info">
            <span className="anime4k-upscale-label">Auflösung:</span>
            <span className="anime4k-upscale-value">{upscaleInfo.label}</span>
          </div>
        )}
        
        <Menu.RadioGroup className="vds-anime4k-radio-group vds-radio-group" value={anime4kOptions.selectedValue}>
          {anime4kOptions.options.map(({ label, value, description, select }) => (
            <Menu.Radio className="vds-anime4k-radio vds-radio" value={value} onSelect={select} key={value}>
              <CheckIcon className="vds-icon" />
              <span className="vds-radio-label">{label}</span>
              {description && <span className="vds-radio-hint anime4k-preset-hint">{description}</span>}
            </Menu.Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  )
}

/**
 * Miracast Submenu Component
 * Integrated into the settings menu for casting to Miracast devices
 */
function MiracastSubmenu({ videoUrl, videoTitle, isSupported, onCastStart }) {
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState([])
  const [session, setSession] = useState(null)
  const [qualityPresets, setQualityPresets] = useState([])
  const [selectedQuality, setSelectedQuality] = useState(null)
  const [connectingDeviceId, setConnectingDeviceId] = useState(null)

  // Load quality presets and session on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (window.api?.miracast) {
          const presets = await window.api.miracast.getQualityPresets()
          setQualityPresets(presets)
          if (presets.length > 0) {
            // Find 1080p preset as default, fallback to first preset
            const defaultPreset = presets.find(p => p.resolution === '1080p') || presets[0]
            setSelectedQuality(defaultPreset)
          }
          const currentSession = await window.api.miracast.getSession()
          setSession(currentSession)
        }
      } catch (error) {
        console.error('Failed to initialize Miracast:', error)
      }
    }
    init()
  }, [])

  // Scan for devices
  const handleScan = useCallback(async () => {
    setIsScanning(true)
    try {
      if (window.api?.miracast) {
        await window.api.miracast.startScan()
        const foundDevices = await window.api.miracast.getDevices()
        setDevices(foundDevices)
      }
    } catch (error) {
      console.error('Failed to scan:', error)
    }
    setIsScanning(false)
  }, [])

  // Connect to device
  const handleConnect = async (device) => {
    setConnectingDeviceId(device.id)
    try {
      if (window.api?.miracast) {
        const newSession = await window.api.miracast.connect(device.id, selectedQuality)
        setSession(newSession)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    }
    setConnectingDeviceId(null)
  }

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (window.api?.miracast) {
        await window.api.miracast.disconnect()
        setSession(null)
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  // Start casting
  const handleStartCast = async () => {
    if (!videoUrl) return
    try {
      if (window.api?.miracast) {
        const updatedSession = await window.api.miracast.startCast(videoUrl, videoTitle)
        setSession(updatedSession)
        onCastStart?.()
      }
    } catch (error) {
      console.error('Failed to start cast:', error)
    }
  }

  // Stop casting
  const handleStopCast = async () => {
    try {
      if (window.api?.miracast) {
        const updatedSession = await window.api.miracast.stopCast()
        setSession(updatedSession)
      }
    } catch (error) {
      console.error('Failed to stop cast:', error)
    }
  }

  // Get hint text showing current status
  const hint = session?.state === 'casting' ? 'Aktiv' 
    : session?.state === 'connected' ? 'Verbunden' 
    : 'Getrennt'

  if (!isSupported) {
    return null
  }

  return (
    <Menu.Root className="vds-menu miracast-settings-submenu">
      <SubmenuButton label="Miracast" hint={hint} disabled={false} Icon={CastIcon} />
      <Menu.Content className="vds-menu-items miracast-menu-content">
        {/* Active session display */}
        {session && (session.state === 'connected' || session.state === 'casting') && (
          <div className="miracast-session-info">
            <div className="miracast-device-name">
              <CastIcon className="vds-icon miracast-device-icon" />
              <span>{session.device?.name || 'Connected Device'}</span>
            </div>
            {session.state === 'casting' && (
              <Menu.Item 
                className="vds-menu-item miracast-action-item"
                onSelect={handleStopCast}
              >
                <StopIcon className="vds-icon miracast-action-icon" />
                <span className="vds-menu-item-label">Stop Casting</span>
              </Menu.Item>
            )}
            {session.state === 'connected' && videoUrl && (
              <Menu.Item 
                className="vds-menu-item miracast-action-item"
                onSelect={handleStartCast}
              >
                <PlayIcon className="vds-icon miracast-action-icon" />
                <span className="vds-menu-item-label">Cast Current Video</span>
              </Menu.Item>
            )}
            <Menu.Item 
              className="vds-menu-item miracast-action-item"
              onSelect={handleDisconnect}
            >
              <XIcon className="vds-icon miracast-action-icon" />
              <span className="vds-menu-item-label">Disconnect</span>
            </Menu.Item>
          </div>
        )}

        {/* Device discovery - only show when not connected */}
        {(!session || (session.state !== 'connected' && session.state !== 'casting')) && (
          <>
            <Menu.Item 
              className="vds-menu-item miracast-scan-item"
              onSelect={handleScan}
            >
              {isScanning ? (
                <RefreshIcon className="vds-icon miracast-action-icon miracast-spinning" />
              ) : (
                <SearchIcon className="vds-icon miracast-action-icon" />
              )}
              <span className="vds-menu-item-label">
                {isScanning ? 'Scanning...' : 'Scan for Devices'}
              </span>
            </Menu.Item>
            
            {/* Device list */}
            {devices.length > 0 && (
              <div className="miracast-device-list">
                {devices.map((device) => (
                  <Menu.Item 
                    key={device.id}
                    className="vds-menu-item miracast-device-item"
                    onSelect={() => handleConnect(device)}
                    disabled={connectingDeviceId === device.id}
                  >
                    {connectingDeviceId === device.id ? (
                      <RefreshIcon className="vds-icon miracast-action-icon miracast-spinning" />
                    ) : (
                      <TvIcon className="vds-icon miracast-action-icon" />
                    )}
                    <span className="vds-menu-item-label">{device.name}</span>
                    {device.supportedResolutions?.length > 0 && (
                      <span className="vds-menu-item-hint">{device.supportedResolutions[0]}</span>
                    )}
                  </Menu.Item>
                ))}
              </div>
            )}

            {devices.length === 0 && !isScanning && (
              <div className="miracast-no-devices">
                <span className="vds-menu-item-label miracast-no-devices-text">
                  Click Scan to find devices
                </span>
              </div>
            )}

            {/* Quality selector */}
            {qualityPresets.length > 0 && (
              <Menu.Root className="vds-menu miracast-quality-submenu">
                <Menu.Button className="vds-menu-item">
                  <ChevronLeftIcon className="vds-menu-close-icon vds-icon" />
                  <span className="vds-menu-item-label">Quality</span>
                  <span className="vds-menu-item-hint">
                    {selectedQuality ? `${selectedQuality.resolution}` : 'Auto'}
                  </span>
                  <ChevronRightIcon className="vds-menu-open-icon vds-icon" />
                </Menu.Button>
                <Menu.Content className="vds-menu-items">
                  <Menu.RadioGroup 
                    className="vds-radio-group" 
                    value={selectedQuality ? `${selectedQuality.resolution}@${selectedQuality.frameRate}` : ''}
                  >
                    {qualityPresets.map((preset, idx) => (
                      <Menu.Radio 
                        className="vds-radio" 
                        value={`${preset.resolution}@${preset.frameRate}`}
                        key={idx}
                        onSelect={() => setSelectedQuality(preset)}
                      >
                        <CheckIcon className="vds-icon" />
                        <span className="vds-radio-label">
                          {preset.resolution} @ {preset.frameRate}fps
                        </span>
                        <span className="vds-radio-hint">{preset.bitrateMbps} Mbps</span>
                      </Menu.Radio>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            )}
          </>
        )}
      </Menu.Content>
    </Menu.Root>
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
    anime4kPreset = DEFAULT_ANIME4K_PRESET_ID,
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
  const [videoHeight, setVideoHeight] = useState(null)
  const [isMiracastSupported, setIsMiracastSupported] = useState(false)
  
  // Check Miracast support on mount
  useEffect(() => {
    const checkMiracastSupport = async () => {
      try {
        if (window.api?.miracast) {
          const supported = await window.api.miracast.isSupported()
          setIsMiracastSupported(supported)
        }
      } catch (error) {
        console.error('Failed to check Miracast support:', error)
        setIsMiracastSupported(false)
      }
    }
    checkMiracastSupport()
  }, [])
  
  // Initialize preset when presets are loaded
  useEffect(() => {
    if (presets.length > 0) {
      const preset = presets.find(p => p.id === anime4kPreset) || presets.find(p => p.id === DEFAULT_ANIME4K_PRESET_ID) || presets[0]
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
    const presetId = currentPreset?.id || DEFAULT_ANIME4K_PRESET_ID
    const newConfig = await setAnime4KConfig(enabled, presetId)
    if (newConfig?.cssFilter && enabled) {
      setVideoStyle({ filter: newConfig.cssFilter })
    } else {
      setVideoStyle({})
    }
  }
  
  // Determine which casting controls to show based on device
  const showMiracast = showMiracastControls && deviceInfo.supportsMiracast && isMiracastSupported
  
  // Mobile-specific class adjustments
  const mobileClass = deviceInfo.isMobile ? 'vidstack-mobile' : ''
  
  return (
    <div className={`vidstack-player-wrapper ${className} ${mobileClass}`}>
      {/* SVG Filters for Anime4K sharpening effect */}
      <Anime4KSVGFilters />
      
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
        onLoadedMetadata={(e) => {
          // Get video height - try multiple approaches for compatibility
          let height = null
          
          // Try direct access on e.target (if it's the video element)
          if (e.target?.videoHeight) {
            height = e.target.videoHeight
          }
          // Try querySelector if available (if e.target is the player)
          else if (typeof e.target?.querySelector === 'function') {
            const videoEl = e.target.querySelector('video')
            if (videoEl?.videoHeight) {
              height = videoEl.videoHeight
            }
          }
          
          if (height) {
            setVideoHeight(height)
          }
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
        
        {/* Default video layout with Anime4K and Miracast integrated via settings menu slot */}
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails=""
          smallLayoutWhen={({ width, height }) => width < 768 || height < 480}
          slots={{
            // Add Anime4K and Miracast submenus at the end of settings menu items
            settingsMenuItemsEnd: (
              <>
                {showAnime4KControls && presets.length > 0 && (
                  <Anime4KSubmenu
                    preset={currentPreset}
                    onPresetChange={handlePresetChange}
                    enabled={isAnime4KEnabled}
                    onToggle={handleAnime4KToggle}
                    presets={presets}
                    videoHeight={videoHeight}
                  />
                )}
                {showMiracast && (
                  <MiracastSubmenu
                    videoUrl={src}
                    videoTitle={title}
                    isSupported={isMiracastSupported}
                  />
                )}
              </>
            )
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
