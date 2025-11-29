# zanshin

A Tauri-based anime list manager with media streaming capabilities.

![zanshin banner](https://github.com/user-attachments/assets/54a37351-b064-4749-a4b5-7fb19ce86ceb)

## Overview

Zanshin is a desktop application built with Tauri v2 that allows you to manage your anime list and stream content. The project features:

- **Lightweight**: 5-15 MB bundle size thanks to Tauri
- **Fast**: Uses native OS webview and Rust backend
- **Secure**: Strict permission system and Rust type safety
- **Cross-platform**: Windows, macOS, and Linux support

> [!NOTE]  
> If you can't access pahe even after refreshing cookies, try using [Cloudflare DNS](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/download-warp/).

## Prerequisites

- **Node.js** 20.x or later
- **Rust** 1.77.2 or later
- **Platform-specific requirements**:
  - **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`
  - **Windows**: WebView2 (usually pre-installed on Windows 10/11)
  - **macOS**: Xcode command line tools

## Project Setup

### Install Dependencies

```bash
npm install
```

### Development

**Linux/macOS:**
```bash
npm run tauri:dev
```

**Windows (PowerShell/cmd):**
```powershell
npm run tauri:dev
```

This will start the development server and launch the Tauri application window.

### Build

**Linux/macOS:**
```bash
# Build for your current platform
npm run tauri:build

# Or build for a specific platform:
npm run tauri:build:win      # Windows
npm run tauri:build:mac      # macOS
npm run tauri:build:linux    # Linux
```

**Windows (PowerShell/cmd):**
```powershell
# Build for your current platform
npm run tauri:build

# Or build for Windows specifically:
npm run tauri:build:win
```

The built application will be in the `src-tauri/target/release/bundle/` directory.

## Project Structure

```
zanshin/
├── frontend/          # React frontend application
│   ├── src/          # React components and logic
│   ├── public/       # Static assets
│   └── index.html    # Entry HTML file
├── backend/          # Backend server (Express)
├── src/              # Tauri Rust backend
│   ├── main.rs       # Entry point
│   ├── lib.rs        # Main app setup with plugins
│   └── commands.rs   # IPC command handlers
├── capabilities/     # Tauri permission configurations
├── icons/           # Application icons
├── resources/       # Additional resources
├── Cargo.toml       # Rust dependencies
├── tauri.conf.json  # Tauri configuration
├── vite.config.js   # Vite build configuration
└── package.json     # Node dependencies and scripts
```

## Tech Stack

### Frontend
- ReactJS
- TanStack React Query
- Radix UI and Radix Icons
- Video.js / Plyr
- TailwindCSS
- React Router

### Backend/Desktop Framework
- **Tauri v2** (Rust) - Desktop framework
- ExpressJS - Backend server
- WebTorrent - Torrent streaming
- Puppeteer - Web scraping (optional)

## Features

- Anime list management with AniList integration
- Media streaming with torrent support
- Discord Rich Presence
- VLC external player integration
- Deep linking support (zanshin://)
- Persistent window state
- **Native Plugin System** - Extend functionality with Rust plugins

## Native Plugin System

Ayoto features a universal native plugin system that allows extending functionality through Rust plugins compiled as dynamic libraries. This enables:

- **Cross-Platform Compatibility**: Plugins work on Linux, Windows, macOS, Android, and iOS
- **Web Scraping**: Plugins can perform scraping on provider websites using the built-in HTTP context
- **Media Providers**: Add new anime sources (aniworld.to, s.to, etc.)
- **Stream Providers**: Add support for new video hosters (Voe, Vidoza, etc.)

### Plugin Development

See [docs/NATIVE_PLUGIN_DEVELOPMENT.md](docs/NATIVE_PLUGIN_DEVELOPMENT.md) for a complete guide on creating native plugins.

### Plugin Types

1. **Media Provider Plugins** - Provide anime search, episode listings, and stream sources
2. **Stream Provider Plugins** - Extract video URLs from hosting services

## Development

### Linting and Formatting

**Linux/macOS:**
```bash
npm run lint      # Run ESLint
npm run format    # Run Prettier
```

**Windows (PowerShell/cmd):**
```powershell
npm run lint      # Run ESLint
npm run format    # Run Prettier
```

### Building Frontend Only

**Linux/macOS:**
```bash
npm run build
```

**Windows (PowerShell/cmd):**
```powershell
npm run build
```

This builds the frontend to the `dist/` directory.

## Contributing

Contributions are welcome! Please open an issue for feature requests, bug reports, or any inquiries.

## Disclaimer

See [disclaimer.md](disclaimer.md) for important information about this project.

## License

See [LICENSE](LICENSE) for details.

