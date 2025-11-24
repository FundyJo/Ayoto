# Tauri Migration Guide

## Overview

This document describes the migration of the Zenshin project from Electron to Tauri v2.

## What is Tauri?

Tauri is a framework for building tiny, blazingly fast binaries for all major desktop platforms. Unlike Electron which bundles Chromium and Node.js, Tauri uses the OS's native webview and has a Rust backend, resulting in much smaller bundle sizes and better performance.

## Migration Status

### ✅ Completed

1. **Tauri Infrastructure Setup**
   - Initialized Tauri v2 project in `src-tauri/` directory
   - Configured `tauri.conf.json` with app settings
   - Set up Rust backend with Cargo.toml dependencies

2. **Tauri Plugins Installed**
   - `tauri-plugin-shell` - For opening URLs and running commands
   - `tauri-plugin-dialog` - For file dialogs
   - `tauri-plugin-fs` - For file system operations
   - `tauri-plugin-process` - For process management
   - `tauri-plugin-http` - For HTTP requests
   - `tauri-plugin-websocket` - For WebSocket connections
   - `tauri-plugin-single-instance` - Prevent multiple app instances
   - `tauri-plugin-deep-link` - Deep linking support (zenshin://)
   - `tauri-plugin-window-state` - Remember window state

3. **Backend Command Handlers (Rust)**
   - Window management (minimize, maximize, close, reload)
   - File/folder operations
   - External application launching (VLC, browsers)
   - Settings management (get/save settings)
   - Discord RPC placeholders

4. **Build Scripts**
   - Added npm scripts for Tauri development and building
   - `npm run tauri:dev` - Run in development mode
   - `npm run tauri:build` - Build production app
   - Platform-specific build scripts for Windows, macOS, Linux

### 🚧 In Progress / TODO

1. **Frontend Integration**
   - Update all frontend code to use Tauri's `invoke()` API instead of Electron's IPC
   - Replace Electron's `window.electron` with Tauri's `window.__TAURI__`
   - Update the tauri-api.js wrapper to work properly

2. **Complex Functionality Migration**
   - **WebTorrent**: May need to run in the frontend or use a different approach
   - **Express Backend Server**: Needs to be integrated or replaced with Tauri's http plugin
   - **Discord RPC**: Implement actual Discord RPC in Rust or use a plugin
   - **Puppeteer/Web Scraping**: Needs alternative solution (possibly backend HTTP client)

3. **Testing**
   - Test all IPC communication paths
   - Verify WebTorrent functionality
   - Test backend server endpoints
   - Verify Discord RPC integration
   - Test deep linking
   - Test on all platforms (Windows, macOS, Linux)

## Key Differences: Electron vs Tauri

| Feature | Electron | Tauri |
|---------|----------|-------|
| **Backend Language** | Node.js (JavaScript) | Rust |
| **Bundle Size** | ~120 MB+ | ~5-15 MB |
| **Memory Usage** | ~150+ MB | ~50-100 MB |
| **Webview** | Bundled Chromium | OS native (WebView2, WebKit) |
| **IPC** | `ipcRenderer/ipcMain` | `invoke()` commands |
| **Security** | Context isolation | Rust type safety + permissions |
| **Node.js APIs** | Full access | Not available (use Rust) |

## Migration Challenges

### 1. WebTorrent Integration

**Challenge**: WebTorrent relies heavily on Node.js APIs and won't work directly in Tauri's frontend.

**Options**:
- Keep WebTorrent in the frontend (it can work in browsers)
- Implement torrent handling in Rust using a library like `transmission-rs`
- Use a sidecar process with Node.js for torrent handling

### 2. Express Backend Server

**Challenge**: The app runs an Express server for anime scraping and API endpoints.

**Options**:
- Move to Tauri's HTTP plugin for serving endpoints
- Implement a lightweight HTTP server in Rust (e.g., using Axum or Actix)
- Keep Express as a sidecar process

### 3. Discord RPC

**Challenge**: Current implementation uses Node.js Discord RPC library.

**Solution**:
- Use Rust Discord RPC library: `discord-rich-presence`
- Implement in `commands.rs`

### 4. Puppeteer for Web Scraping

**Challenge**: Puppeteer is Node.js-based for anime data scraping.

**Options**:
- Use Rust HTTP client (reqwest) with HTML parsing (scraper crate)
- Use headless browser in Rust (fantoccini)
- Keep as sidecar process

## How to Run

### Development Mode

```bash
cd Electron/zenshin-electron
npm run tauri:dev
```

### Build for Production

```bash
# Windows
npm run tauri:build:win

# macOS
npm run tauri:build:mac

# Linux
npm run tauri:build:linux
```

## System Requirements

### Development

- **Rust**: 1.77.2 or later
- **Node.js**: 20.x or later
- **Platform-specific**:
  - **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`
  - **Windows**: WebView2 (usually pre-installed on Windows 10/11)
  - **macOS**: Xcode command line tools

## Configuration Files

- **`src-tauri/tauri.conf.json`**: Main Tauri configuration
- **`src-tauri/Cargo.toml`**: Rust dependencies
- **`src-tauri/capabilities/default.json`**: Permission configuration
- **`package.json`**: Updated with Tauri scripts

## API Usage Example

### Before (Electron)

```javascript
// In renderer
window.api.minimize()
window.api.openVlc(command)
```

### After (Tauri)

```javascript
// In renderer
import { invoke } from '@tauri-apps/api/core'

await invoke('minimize_window')
await invoke('open_vlc', { command })
```

Or using the compatibility wrapper:

```javascript
import api from './utils/tauri-api'

await api.minimize()
await api.openVlc(command)
```

## Next Steps

1. **Phase 1**: Complete frontend API migration
2. **Phase 2**: Migrate complex backend functionality (WebTorrent, Express, Discord RPC)
3. **Phase 3**: Testing and bug fixes
4. **Phase 4**: Documentation and build optimization
5. **Phase 5**: Release and distribution

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri v1 to v2 Migration Guide](https://v2.tauri.app/start/migrate/from-tauri-1/)
- [Tauri Plugin Development](https://v2.tauri.app/develop/plugins/)
- [Rust Book](https://doc.rust-lang.org/book/)

## Notes

- The Electron build system remains in place during migration for backward compatibility
- Both Electron and Tauri builds can coexist
- The migration is designed to be incremental and testable at each step
