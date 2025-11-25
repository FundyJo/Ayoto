/**
 * VidstackPlayer Component
 * A modern video player using Vidstack with HLS, Anime4K support, and mobile/desktop compatibility
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
  useMediaState,
  useMediaRemote
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons
} from '@vidstack/react/player/layouts/default'

// Import Vidstack styles
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'

import { anime4kConfig, getAllPresets, checkWebGLSupport, getGPUInfo } from '../plugins/Anime4KConfig'
import { STREAM_FORMATS } from '../plugins/PluginManager'

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
 * Anime4K Settings Panel Component
 */
function Anime4KSettings({ preset, onPresetChange, enabled, onToggle }) {
  const presets = getAllPresets()
  const gpuInfo = getGPUInfo()
  const hasWebGL = checkWebGLSupport()
  
  return (
    <div className="anime4k-settings bg-[#1a1a1d] p-3 rounded-md text-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white">Anime4K Upscaling</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
            disabled={!hasWebGL}
          />
          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>
      
      {!hasWebGL && (
        <div className="text-yellow-400 text-xs mb-2">
          ⚠️ WebGL not supported - Anime4K unavailable
        </div>
      )}
      
      {enabled && hasWebGL && (
        <>
          <div className="space-y-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => onPresetChange(p.id)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  preset.id === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2d] text-gray-300 hover:bg-[#3a3a3d]'
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs opacity-70">{p.description}</div>
              </button>
            ))}
          </div>
          
          {gpuInfo && (
            <div className="mt-3 text-xs text-gray-400">
              GPU: {gpuInfo.renderer}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * VidstackPlayer Component
 * Unified video player supporting multiple formats with Anime4K shaders
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
    showAnime4KControls = true
  },
  ref
) {
  const playerRef = useRef(null)
  const [isAnime4KEnabled, setIsAnime4KEnabled] = useState(anime4kEnabled)
  const [currentPreset, setCurrentPreset] = useState(
    getAllPresets().find(p => p.id === anime4kPreset) || getAllPresets()[2]
  )
  const [videoStyle, setVideoStyle] = useState({})
  
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
    setAnime4K: (enabled, preset) => {
      setIsAnime4KEnabled(enabled)
      if (preset) {
        const newPreset = getAllPresets().find(p => p.id === preset)
        if (newPreset) setCurrentPreset(newPreset)
      }
    }
  }))
  
  // Update Anime4K CSS filter when settings change
  useEffect(() => {
    if (isAnime4KEnabled && currentPreset.id !== 'none') {
      anime4kConfig.setPreset(currentPreset.id)
      setVideoStyle({
        filter: anime4kConfig.getCSSApproximation()
      })
    } else {
      setVideoStyle({})
    }
  }, [isAnime4KEnabled, currentPreset])
  
  // Handle preset change
  const handlePresetChange = (presetId) => {
    const preset = getAllPresets().find(p => p.id === presetId)
    if (preset) {
      setCurrentPreset(preset)
    }
  }
  
  // Handle Anime4K toggle
  const handleAnime4KToggle = (enabled) => {
    setIsAnime4KEnabled(enabled)
  }
  
  return (
    <div className={`vidstack-player-wrapper ${className}`}>
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
        className="w-full aspect-video bg-black"
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
        
        {/* Default video layout with controls */}
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails=""
          slots={{
            // Custom settings menu can be added here
          }}
        />
      </MediaPlayer>
      
      {/* Anime4K Settings Panel */}
      {showAnime4KControls && (
        <div className="mt-4">
          <Anime4KSettings
            preset={currentPreset}
            onPresetChange={handlePresetChange}
            enabled={isAnime4KEnabled}
            onToggle={handleAnime4KToggle}
          />
        </div>
      )}
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
