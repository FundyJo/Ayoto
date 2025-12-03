/**
 * WindowControls Component
 * Provides native-looking window controls (minimize, maximize, close) for Tauri applications
 * Uses tauri-controls library for proper platform-specific styling
 * These replace the native window decorations when decorations: false is set in tauri.conf.json
 */

import { WindowControls as TauriWindowControls } from 'tauri-controls'

export default function WindowControls() {
  return (
    <div className="window-controls-wrapper nodrag">
      {/* Platform is auto-detected if not specified */}
      <TauriWindowControls className="window-controls-tauri" />
    </div>
  )
}
