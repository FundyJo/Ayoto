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

import { WindowControls as TauriWindowControls } from 'tauri-controls'
import usePlatformDetection from '../hooks/usePlatformDetection'

export default function WindowControls() {
  const { platform, isMobile, isLoading } = usePlatformDetection()

  // Don't render on mobile platforms (Android/iOS) - they have their own system controls
  if (isMobile) {
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
