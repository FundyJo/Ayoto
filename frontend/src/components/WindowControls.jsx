/**
 * WindowControls Component
 * Provides custom window controls (minimize, maximize, close) for Tauri applications
 * These replace the native window decorations when decorations: false is set in tauri.conf.json
 */

import { useState, useEffect } from 'react'

/**
 * Minimize Icon
 */
function MinimizeIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" {...props}>
      <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
    </svg>
  )
}

/**
 * Maximize Icon (empty square)
 */
function MaximizeIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" {...props}>
      <rect x="2" y="2" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

/**
 * Restore Icon (overlapping squares)
 */
function RestoreIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" {...props}>
      <rect x="3.5" y="1" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M1.5 4.5H2V9.5C2 9.77614 2.22386 10 2.5 10H7.5V10.5H2.5C1.94772 10.5 1.5 10.0523 1.5 9.5V4.5Z" fill="currentColor" />
      <rect x="1.5" y="4" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

/**
 * Close Icon (X)
 */
function CloseIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" {...props}>
      <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  // Check if window is maximized on mount and listen for changes
  useEffect(() => {
    let unlistenResize = null
    
    const initWindowState = async () => {
      try {
        // Use Tauri API to check if window is maximized
        if (window.__TAURI__) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const currentWindow = getCurrentWindow()
          const maximized = await currentWindow.isMaximized()
          setIsMaximized(maximized)
          
          // Listen for resize events to update maximized state
          unlistenResize = await currentWindow.onResized(async () => {
            const newMaximized = await currentWindow.isMaximized()
            setIsMaximized(newMaximized)
          })
        }
      } catch (error) {
        console.error('Failed to check window state:', error)
      }
    }
    
    initWindowState()
    
    // Cleanup function
    return () => {
      if (unlistenResize) {
        unlistenResize()
      }
    }
  }, [])

  const handleMinimize = async () => {
    try {
      if (window.api?.minimize) {
        await window.api.minimize()
      } else if (window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        await getCurrentWindow().minimize()
      }
    } catch (error) {
      console.error('Failed to minimize:', error)
    }
  }

  const handleMaximize = async () => {
    try {
      if (window.api?.maximize) {
        await window.api.maximize()
        // State will be updated by the resize listener
      } else if (window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrentWindow()
        if (isMaximized) {
          await currentWindow.unmaximize()
        } else {
          await currentWindow.maximize()
        }
        // State will be updated by the resize listener
      }
    } catch (error) {
      console.error('Failed to maximize:', error)
    }
  }

  const handleClose = async () => {
    try {
      if (window.api?.close) {
        await window.api.close()
      } else if (window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        await getCurrentWindow().close()
      }
    } catch (error) {
      console.error('Failed to close:', error)
    }
  }

  return (
    <div className="window-controls nodrag">
      <button
        className="window-control-button window-minimize"
        onClick={handleMinimize}
        title="Minimize"
        aria-label="Minimize window"
      >
        <MinimizeIcon className="w-3 h-3" />
      </button>
      <button
        className="window-control-button window-maximize"
        onClick={handleMaximize}
        title={isMaximized ? "Restore" : "Maximize"}
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
      >
        {isMaximized ? (
          <RestoreIcon className="w-3 h-3" />
        ) : (
          <MaximizeIcon className="w-3 h-3" />
        )}
      </button>
      <button
        className="window-control-button window-close"
        onClick={handleClose}
        title="Close"
        aria-label="Close window"
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </div>
  )
}
