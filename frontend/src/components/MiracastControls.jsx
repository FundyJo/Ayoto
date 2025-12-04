/**
 * MiracastControls Component
 * UI for Miracast screen casting functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { Button, Select } from '@radix-ui/themes'
import {
  Cross2Icon,
  ReloadIcon,
  PlayIcon,
  StopIcon,
  DesktopIcon,
} from '@radix-ui/react-icons'
import { toast } from 'sonner'

// Custom Cast Icon component since @radix-ui doesn't have one
function CastIcon({ className = '' }) {
  return (
    <svg 
      className={className}
      width="15" 
      height="15" 
      viewBox="0 0 15 15" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M1 10.5V11.5C1 12.3284 1.67157 13 2.5 13H3M1 7.5C3.20914 7.5 5 9.29086 5 11.5V13M1 4.5C4.86599 4.5 8 7.63401 8 11.5V13M13.5 2H1.5C1.22386 2 1 2.22386 1 2.5V4M13.5 2C13.7761 2 14 2.22386 14 2.5V12.5C14 12.7761 13.7761 13 13.5 13H7M13.5 2H14" 
        stroke="currentColor" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Connection state labels
const CONNECTION_STATES = {
  disconnected: { label: 'Disconnected', color: 'gray' },
  scanning: { label: 'Scanning...', color: 'blue' },
  connecting: { label: 'Connecting...', color: 'yellow' },
  connected: { label: 'Connected', color: 'green' },
  casting: { label: 'Casting', color: 'purple' },
  error: { label: 'Error', color: 'red' },
}

// Device type icons/labels
const DEVICE_TYPES = {
  tv: '📺 TV',
  monitor: '🖥️ Monitor',
  projector: '📽️ Projector',
  dongle: '📡 Dongle',
  unknown: '❓ Device',
}

/**
 * Device list item component
 */
function DeviceItem({ device, onConnect, isConnecting }) {
  const signalBars = device.signalStrength 
    ? Math.ceil(device.signalStrength / 25) 
    : 0

  return (
    <div className="flex items-center justify-between p-3 bg-[#252528] rounded-md hover:bg-[#303033] transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-lg">
          {DEVICE_TYPES[device.deviceType] || DEVICE_TYPES.unknown}
        </span>
        <div>
          <div className="text-white font-medium">{device.name}</div>
          <div className="text-xs text-gray-400">
            {device.hdcpSupport && '🔒 HDCP'}
            {device.supportedResolutions?.length > 0 && 
              ` • ${device.supportedResolutions[0]}`}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Signal strength indicator */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-sm ${
                bar <= signalBars ? 'bg-green-500' : 'bg-gray-600'
              }`}
              style={{ height: `${bar * 4 + 4}px` }}
            />
          ))}
        </div>
        
        <Button
          size="1"
          color="blue"
          variant="soft"
          className="cursor-pointer"
          disabled={isConnecting}
          onClick={() => onConnect(device)}
        >
          {isConnecting ? <ReloadIcon className="animate-spin" /> : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Quality selector component
 */
function QualitySelector({ quality, presets, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Casting Quality</label>
      <Select.Root 
        value={`${quality.resolution}@${quality.frameRate}`}
        onValueChange={(value) => {
          const preset = presets.find(
            p => `${p.resolution}@${p.frameRate}` === value
          )
          if (preset) onChange(preset)
        }}
      >
        <Select.Trigger className="w-full" />
        <Select.Content>
          {presets.map((preset, idx) => (
            <Select.Item 
              key={idx} 
              value={`${preset.resolution}@${preset.frameRate}`}
            >
              {preset.resolution} @ {preset.frameRate}fps ({preset.bitrateMbps} Mbps)
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </div>
  )
}

/**
 * Active session display component
 */
function SessionDisplay({ session, onDisconnect, onStopCast }) {
  const stateInfo = CONNECTION_STATES[session.state] || CONNECTION_STATES.disconnected
  
  // Format playback time
  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-[#1a1a1d] rounded-lg p-4 space-y-4">
      {/* Device info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CastIcon className="w-6 h-6 text-purple-400" />
          <div>
            <div className="text-white font-medium">{session.device.name}</div>
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: stateInfo.color === 'green' ? '#22c55e' :
                    stateInfo.color === 'purple' ? '#a855f7' :
                    stateInfo.color === 'blue' ? '#3b82f6' :
                    stateInfo.color === 'yellow' ? '#eab308' :
                    stateInfo.color === 'red' ? '#ef4444' : '#6b7280'
                }}
              />
              <span className="text-xs text-gray-400">{stateInfo.label}</span>
            </div>
          </div>
        </div>
        
        <Button
          size="1"
          color="red"
          variant="soft"
          className="cursor-pointer"
          onClick={onDisconnect}
        >
          <Cross2Icon />
          Disconnect
        </Button>
      </div>

      {/* Currently casting */}
      {session.currentVideo && (
        <div className="bg-[#252528] rounded-md p-3">
          <div className="text-sm text-gray-400 mb-1">Now Casting</div>
          <div className="text-white">{session.currentVideo}</div>
          
          {/* Progress bar */}
          {session.duration && (
            <div className="mt-3">
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500"
                  style={{ 
                    width: `${(session.playbackPosition / session.duration) * 100}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(session.playbackPosition)}</span>
                <span>{formatTime(session.duration)}</span>
              </div>
            </div>
          )}
          
          <Button
            size="1"
            color="gray"
            variant="soft"
            className="mt-3 cursor-pointer"
            onClick={onStopCast}
          >
            <StopIcon />
            Stop Casting
          </Button>
        </div>
      )}

      {/* Quality info */}
      <div className="text-xs text-gray-500">
        Quality: {session.quality.resolution} @ {session.quality.frameRate}fps
        {session.quality.audioEnabled && ' • Audio enabled'}
      </div>
    </div>
  )
}

/**
 * Main MiracastControls Component
 * Features connection health monitoring and automatic reconnection
 */
export default function MiracastControls({ 
  onCastStart, 
  videoUrl, 
  videoTitle,
  className = '' 
}) {
  const [isSupported, setIsSupported] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState([])
  const [session, setSession] = useState(null)
  const [qualityPresets, setQualityPresets] = useState([])
  const [selectedQuality, setSelectedQuality] = useState(null)
  const [connectingDeviceId, setConnectingDeviceId] = useState(null)
  const [connectionHealth, setConnectionHealth] = useState(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [autoReconnect, setAutoReconnect] = useState(true)

  // Check if Miracast is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (window.api?.miracast) {
          const supported = await window.api.miracast.isSupported()
          setIsSupported(supported)
          
          if (supported) {
            const presets = await window.api.miracast.getQualityPresets()
            setQualityPresets(presets)
            if (presets.length > 0) {
              setSelectedQuality(presets[1] || presets[0]) // Default to 1080p if available
            }
          }
        } else {
          setIsSupported(false)
        }
      } catch (error) {
        console.error('Failed to check Miracast support:', error)
        setIsSupported(false)
      }
    }
    checkSupport()
  }, [])

  // Load current session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        if (window.api?.miracast) {
          const currentSession = await window.api.miracast.getSession()
          setSession(currentSession)
        }
      } catch (error) {
        console.error('Failed to load session:', error)
      }
    }
    loadSession()
  }, [])

  // Connection health monitoring with heartbeat
  useEffect(() => {
    if (!session || (session.state !== 'connected' && session.state !== 'casting')) {
      return
    }

    const heartbeatInterval = setInterval(async () => {
      try {
        if (window.api?.miracast) {
          const health = await window.api.miracast.heartbeat()
          setConnectionHealth(health)
          
          // Auto-reconnect if connection is unhealthy
          if (!health.isHealthy && autoReconnect && !isReconnecting) {
            console.log('Connection unhealthy, attempting reconnection...')
            handleReconnect()
          }
        }
      } catch (error) {
        console.error('Heartbeat failed:', error)
        // Report error and potentially trigger reconnect
        if (window.api?.miracast) {
          await window.api.miracast.reportError(error.message || 'Heartbeat failed')
          if (autoReconnect && !isReconnecting) {
            handleReconnect()
          }
        }
      }
    }, 10000) // Send heartbeat every 10 seconds

    return () => clearInterval(heartbeatInterval)
  }, [session, autoReconnect, isReconnecting])

  // Scan for devices
  const handleScan = useCallback(async () => {
    setIsScanning(true)
    try {
      if (window.api?.miracast) {
        await window.api.miracast.startScan()
        const foundDevices = await window.api.miracast.getDevices()
        setDevices(foundDevices)
        
        if (foundDevices.length === 0) {
          toast.info('No Miracast devices found nearby')
        } else {
          toast.success(`Found ${foundDevices.length} device(s)`)
        }
      }
    } catch (error) {
      console.error('Failed to scan:', error)
      toast.error('Failed to scan for devices')
    }
    setIsScanning(false)
  }, [])

  // Connect to device
  const handleConnect = async (device) => {
    setConnectingDeviceId(device.id)
    try {
      if (window.api?.miracast) {
        const newSession = await window.api.miracast.connect(
          device.id,
          selectedQuality
        )
        setSession(newSession)
        setConnectionHealth({ isHealthy: true, retryCount: 0, maxRetries: 3 })
        toast.success(`Connected to ${device.name}`)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      toast.error(error.message || 'Failed to connect to device')
    }
    setConnectingDeviceId(null)
  }

  // Reconnect to device
  const handleReconnect = async () => {
    if (isReconnecting) return
    
    setIsReconnecting(true)
    toast.info('Attempting to reconnect...')
    
    try {
      if (window.api?.miracast) {
        const newSession = await window.api.miracast.reconnect()
        setSession(newSession)
        setConnectionHealth({ isHealthy: true, retryCount: 0, maxRetries: 3 })
        toast.success('Reconnected successfully')
      }
    } catch (error) {
      console.error('Failed to reconnect:', error)
      setSession(prev => prev ? { ...prev, state: 'error', lastError: error.message } : null)
      setConnectionHealth({
        isHealthy: false,
        suggestedAction: error.message || 'Reconnection failed',
        retryCount: 3,
        maxRetries: 3
      })
      toast.error(error.message || 'Reconnection failed')
    }
    setIsReconnecting(false)
  }

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (window.api?.miracast) {
        await window.api.miracast.disconnect()
        setSession(null)
        setConnectionHealth(null)
        toast.info('Disconnected')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect')
    }
  }

  // Start casting
  const handleStartCast = async () => {
    if (!videoUrl) {
      toast.error('No video to cast')
      return
    }
    
    try {
      if (window.api?.miracast) {
        const updatedSession = await window.api.miracast.startCast(
          videoUrl,
          videoTitle
        )
        setSession(updatedSession)
        onCastStart?.()
        toast.success('Started casting')
      }
    } catch (error) {
      console.error('Failed to start cast:', error)
      toast.error('Failed to start casting')
    }
  }

  // Stop casting
  const handleStopCast = async () => {
    try {
      if (window.api?.miracast) {
        const updatedSession = await window.api.miracast.stopCast()
        setSession(updatedSession)
        toast.info('Stopped casting')
      }
    } catch (error) {
      console.error('Failed to stop cast:', error)
      toast.error('Failed to stop casting')
    }
  }

  // Toggle auto-reconnect
  const handleToggleAutoReconnect = async () => {
    const newValue = !autoReconnect
    setAutoReconnect(newValue)
    try {
      if (window.api?.miracast) {
        await window.api.miracast.setAutoReconnect(newValue)
        toast.info(`Auto-reconnect ${newValue ? 'enabled' : 'disabled'}`)
      }
    } catch (error) {
      console.error('Failed to set auto-reconnect:', error)
    }
  }

  // Don't render if not supported
  if (isSupported === false) {
    return null
  }

  // Loading state
  if (isSupported === null) {
    return (
      <Button 
        size="2" 
        color="gray" 
        variant="soft" 
        className={`cursor-not-allowed ${className}`}
        disabled
      >
        <CastIcon className="w-4 h-4" />
      </Button>
    )
  }

  // Get status indicator color
  const getStatusColor = () => {
    if (isReconnecting) return 'yellow'
    if (session?.state === 'error') return 'red'
    if (session?.state === 'casting') return 'green'
    if (session?.state === 'connected') return 'blue'
    return 'gray'
  }

  return (
    <div className={`relative ${className}`}>
      {/* Cast button */}
      <Button
        size="2"
        color={session ? 'purple' : 'gray'}
        variant="soft"
        className="cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CastIcon className="w-4 h-4" />
        {session && <span className="ml-1 text-xs">
          {session.state === 'casting' ? 'Casting' : 
           session.state === 'error' ? 'Error' :
           isReconnecting ? 'Reconnecting...' : 'Connected'}
        </span>}
      </Button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1d] rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Miracast</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <Cross2Icon className="w-4 h-4" />
              </button>
            </div>

            {/* Active session */}
            {session && (session.state === 'connected' || session.state === 'casting') && (
              <>
                {/* Connection health warning */}
                {connectionHealth && !connectionHealth.isHealthy && (
                  <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded-md">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <span>⚠️</span>
                      <span>{connectionHealth.suggestedAction || 'Connection unstable'}</span>
                    </div>
                  </div>
                )}
                <SessionDisplay
                  session={session}
                  onDisconnect={handleDisconnect}
                  onStopCast={handleStopCast}
                />
              </>
            )}

            {/* Error state with reconnect option */}
            {session?.state === 'error' && (
              <div className="space-y-3">
                <div className="p-3 bg-red-900/30 border border-red-600/50 rounded-md">
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                    <span>❌</span>
                    <span>{session.lastError || 'Connection lost'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="1"
                      color="blue"
                      variant="soft"
                      className="cursor-pointer flex-1"
                      onClick={handleReconnect}
                      disabled={isReconnecting}
                    >
                      {isReconnecting ? (
                        <>
                          <ReloadIcon className="animate-spin" />
                          Reconnecting...
                        </>
                      ) : (
                        <>
                          <ReloadIcon />
                          Reconnect
                        </>
                      )}
                    </Button>
                    <Button
                      size="1"
                      color="red"
                      variant="soft"
                      className="cursor-pointer"
                      onClick={handleDisconnect}
                    >
                      <Cross2Icon />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Device discovery */}
            {(!session || (session.state !== 'connected' && session.state !== 'casting' && session.state !== 'error')) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Available Devices ({devices.length})
                  </span>
                  <Button
                    size="1"
                    color="blue"
                    variant="soft"
                    className="cursor-pointer"
                    onClick={handleScan}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <ReloadIcon className="animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <ReloadIcon />
                        Scan
                      </>
                    )}
                  </Button>
                </div>

                {/* Device list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {devices.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      {isScanning 
                        ? 'Searching for devices...' 
                        : 'Click Scan to find devices'}
                    </div>
                  ) : (
                    devices.map((device) => (
                      <DeviceItem
                        key={device.id}
                        device={device}
                        onConnect={handleConnect}
                        isConnecting={connectingDeviceId === device.id}
                      />
                    ))
                  )}
                </div>

                {/* Quality selector */}
                {qualityPresets.length > 0 && (
                  <QualitySelector
                    quality={selectedQuality || qualityPresets[0]}
                    presets={qualityPresets}
                    onChange={setSelectedQuality}
                  />
                )}
              </div>
            )}

            {/* Cast current video button */}
            {session && session.state === 'connected' && videoUrl && (
              <Button
                className="w-full mt-4 cursor-pointer"
                color="purple"
                onClick={handleStartCast}
              >
                <PlayIcon />
                Cast Current Video
              </Button>
            )}

            {/* Auto-reconnect toggle - show when there's an active session or error */}
            {session && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Auto-Reconnect</span>
                  <Button
                    size="1"
                    color={autoReconnect ? 'green' : 'gray'}
                    variant="soft"
                    className="cursor-pointer"
                    onClick={handleToggleAutoReconnect}
                  >
                    {autoReconnect ? 'On' : 'Off'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically try to reconnect when connection is lost
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Export a simpler cast button for use in video players
export function SimpleCastButton({ onClick, isCasting, className = '' }) {
  return (
    <button
      className={`p-2 rounded hover:bg-white/10 transition-colors ${className}`}
      onClick={onClick}
      title={isCasting ? 'Stop Casting' : 'Cast to Device'}
    >
      <CastIcon 
        className={`w-5 h-5 ${isCasting ? 'text-purple-400' : 'text-white'}`} 
      />
    </button>
  )
}
