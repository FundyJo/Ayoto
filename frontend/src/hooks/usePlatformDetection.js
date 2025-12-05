/**
 * Hook for detecting the current platform (OS type)
 * Uses Tauri's plugin-os for native detection with fallback to user agent
 * 
 * Returns: { platform, isAndroid, isIOS, isMobile, isDesktop, isLoading }
 */

import { useState, useEffect } from 'react'
import { type as osType } from '@tauri-apps/plugin-os'

export function usePlatformDetection() {
  const [platform, setPlatform] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const detectedType = await osType()
        setPlatform(detectedType)
      } catch (error) {
        // Fallback for development or when plugin is not available
        console.warn('Failed to detect OS type via Tauri plugin:', error)
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
        } else {
          setPlatform('unknown')
        }
      } finally {
        setIsLoading(false)
      }
    }

    detectPlatform()
  }, [])

  // Apply platform class to body for CSS targeting
  useEffect(() => {
    if (platform && !isLoading) {
      // Remove any existing platform classes
      document.body.classList.remove(
        'platform-android',
        'platform-ios',
        'platform-macos',
        'platform-linux',
        'platform-windows',
        'platform-unknown'
      )
      // Add the current platform class
      document.body.classList.add(`platform-${platform}`)
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove(
        'platform-android',
        'platform-ios',
        'platform-macos',
        'platform-linux',
        'platform-windows',
        'platform-unknown'
      )
    }
  }, [platform, isLoading])

  const isAndroid = platform === 'android'
  const isIOS = platform === 'ios'
  const isMobile = isAndroid || isIOS
  const isDesktop = platform === 'windows' || platform === 'macos' || platform === 'linux'

  return {
    platform,
    isAndroid,
    isIOS,
    isMobile,
    isDesktop,
    isLoading
  }
}

export default usePlatformDetection
