/**
 * WindowControls Component
 * Provides native-looking window controls (minimize, maximize, close) for Tauri applications
 * Uses tauri-controls library for proper platform-specific styling
 * These replace the native window decorations when decorations: false is set in tauri.conf.json
 * 
 * Platform behavior:
 * - Android/iOS: Hidden (mobile platforms don't need window controls)
 * - Windows: Windows 11 style controls
 * - macOS: Native macOS traffic light controls
 * - Linux: GNOME style controls
 */

import { useState, useEffect } from 'react'
import { WindowControls as TauriWindowControls } from 'tauri-controls'
import { type as osType } from '@tauri-apps/plugin-os'

export default function WindowControls() {
  const [platform, setPlatform] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const detectedType = await osType()
        setPlatform(detectedType)
      } catch (error) {
        // Fallback for development or when plugin is not available
        console.warn('Failed to detect OS type:', error)
        // Try to detect from user agent as fallback
        const ua = navigator.userAgent.toLowerCase()
        if (ua.includes('android')) {
          setPlatform('android')
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
          setPlatform('ios')
        } else if (ua.includes('mac')) {
          setPlatform('macos')
        } else if (ua.includes('linux')) {
          setPlatform('linux')
        } else if (ua.includes('win')) {
          setPlatform('windows')
        }
      } finally {
        setIsLoading(false)
      }
    }

    detectPlatform()
  }, [])

  // Don't render on mobile platforms (Android/iOS) - they have their own system controls
  if (platform === 'android' || platform === 'ios') {
    return null
  }

  // Don't render while loading to prevent flash
  if (isLoading) {
    return null
  }

  // Map OS type to tauri-controls platform prop
  const getTauriControlsPlatform = () => {
    switch (platform) {
      case 'macos':
        return 'macos'
      case 'linux':
        return 'gnome'
      case 'windows':
      default:
        return 'windows'
    }
  }

  return (
    <div className={`window-controls-wrapper nodrag window-controls-${platform || 'default'}`}>
      <TauriWindowControls 
        className="window-controls-tauri" 
        platform={getTauriControlsPlatform()}
      />
    </div>
  )
}
