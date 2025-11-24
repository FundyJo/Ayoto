# Migration Summary: Electron to Tauri + Rename to Zanshin

## Overview

This document summarizes the migration from an Electron-based "zenshin" project to a Tauri v2-based "zanshin" project completed on 2025-11-24.

## Changes Made

### 1. Project Structure
- **Before**: Files were nested in `Electron/zenshin-electron/`
- **After**: All files moved to root level with Tauri project structure
- Removed `Archive/` and `Electron/` directories containing old versions

### 2. Name Change
Changed all references from "zenshin" to "zanshin":
- `package.json`: Updated name, homepage, and description
- `Cargo.toml`: Updated package name and repository
- `tauri.conf.json`: Updated productName, identifier, and window title
- `README.md`: Complete rewrite for Tauri-based project

### 3. Dependencies
**Removed Electron dependencies:**
- `electron`
- `electron-builder`
- `electron-vite`
- `@electron-toolkit/preload`
- `@electron-toolkit/utils`
- `electron-deeplink`
- `electron-is-dev`
- `discord-rpc` (Electron version)

**Added Tauri dependencies:**
- `@tauri-apps/api` (^2.9.0)
- `@tauri-apps/plugin-deep-link`
- `@tauri-apps/plugin-dialog`
- `@tauri-apps/plugin-fs`
- `@tauri-apps/plugin-http`
- `@tauri-apps/plugin-process`
- `@tauri-apps/plugin-shell`
- `@tauri-apps/plugin-websocket`
- `@tauri-apps/plugin-window-state`

### 4. Build System
- **Before**: Used `electron-vite` for bundling
- **After**: Uses standard `vite` for frontend + Tauri CLI for packaging
- Created new `vite.config.js` with proper paths for Tauri
- Updated build scripts in `package.json`

### 5. Configuration Files

#### vite.config.js (New)
- Points to `./frontend` as root directory
- Outputs to `../dist`
- Includes aliases for common paths

#### tauri.conf.json
- Updated `frontendDist` from `../out/renderer` to `./dist`
- Changed `beforeDevCommand` and `beforeBuildCommand` to use Vite
- Removed nested path references

#### postcss.config.js
- Converted from CommonJS (`module.exports`) to ESM (`export default`)

#### tailwind.config.js
- Updated content paths to point to `./frontend/**/*`
- Converted to ESM format
- Fixed plugins array syntax

### 6. Frontend Code Updates

#### Import Path Fixes
- `frontend/src/utils/ContextProvider.jsx`: Fixed common/utils import path
- `frontend/src/utils/api.js`: Fixed common/utils import path

#### API Layer
- `frontend/src/utils/tauri-api.js`: Updated to use `@tauri-apps/api/core` imports
- `frontend/src/App.jsx`: Added import of tauri-api to initialize global window.api
- `frontend/src/components/Header.jsx`: Commented out Electron-specific deep link code

### 7. Backend (Rust)

All Rust code was already in place and properly configured:
- `src/main.rs`: Entry point
- `src/lib.rs`: App initialization with all Tauri plugins
- `src/commands.rs`: IPC command handlers

## Build Commands

### Development
```bash
npm run tauri:dev
```

### Production Builds
```bash
# General build
npm run tauri:build

# Platform-specific
npm run tauri:build:win      # Windows (x86_64-pc-windows-msvc)
npm run tauri:build:mac      # macOS (aarch64-apple-darwin)
npm run tauri:build:linux    # Linux (x86_64-unknown-linux-gnu)
```

### Frontend Only
```bash
npm run build        # Build frontend with Vite
npm run dev          # Dev server only (no Tauri window)
```

## Prerequisites

- **Node.js**: 20.x or later
- **Rust**: 1.77.2 or later
- **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`
- **Windows**: WebView2 (pre-installed on Windows 10/11)
- **macOS**: Xcode command line tools

## Benefits of Migration

- **Bundle Size**: ~5-15 MB vs ~120 MB (10x smaller)
- **Startup Time**: Faster, no Node.js runtime overhead
- **Memory Usage**: Lower, uses native OS webview
- **Security**: Rust backend with strict permission system

## Known Issues & TODOs

1. **Deep Links**: Electron deep link handling commented out, needs Tauri implementation
2. **Discord RPC**: Placeholder implementation in Rust, needs actual integration
3. **Folder Selection**: `change_downloads_folder` command needs dialog integration

## Testing Status

- ✅ Frontend builds successfully with Vite
- ✅ Rust code compiles with cargo check
- ⚠️ Full Tauri dev/build not tested (requires GUI environment)
- ⚠️ Runtime functionality not verified

## Files Structure

```
zanshin/
├── frontend/              # React frontend
│   ├── src/              # Components, hooks, utils
│   ├── public/           # Static assets
│   └── index.html        # Entry point
├── backend/              # Express backend server
├── src/                  # Tauri Rust backend
│   ├── main.rs
│   ├── lib.rs
│   └── commands.rs
├── common/               # Shared utilities
├── icons/                # Application icons
├── resources/            # Additional resources
├── capabilities/         # Tauri permissions
├── Cargo.toml           # Rust dependencies
├── tauri.conf.json      # Tauri configuration
├── vite.config.js       # Vite configuration
├── package.json         # Node dependencies
└── README.md            # Documentation
```

## Migration Checklist

- [x] Copy Tauri files to root
- [x] Move frontend source to frontend/
- [x] Update all "zenshin" to "zanshin"
- [x] Remove Electron dependencies
- [x] Update build configurations
- [x] Fix import paths
- [x] Update API layer
- [x] Remove Archive/Electron directories
- [x] Test builds (frontend + Rust)
- [x] Update documentation

## Notes

- Original Electron version preserved in git history
- WebTorrent functionality remains in frontend
- Express backend server runs alongside Tauri app
- Deep link scheme: `zanshin://` (configured but needs testing)
