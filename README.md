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
- **ZPE Plugin System** - Secure JavaScript/TypeScript plugin extensions

## ZPE Plugin System

Ayoto features the ZPE (Zanshin Plugin Extension) system - a secure, extensible plugin framework for JavaScript/TypeScript plugins:

- **Secure Execution**: Sandboxed JavaScript runtime with permission-based access control
- **Encrypted Packages**: AES-GCM encrypted `.zpe` plugin files with code signing
- **GitHub Integration**: Automatic version checking and update notifications
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Web Scraping**: Built-in HTTP client and HTML parsing utilities
- **Rate Limiting**: Automatic request throttling and domain allowlists

### Plugin Types

1. **Media Provider Plugins** - Search, browse, and stream anime from various sources
2. **Stream Provider Plugins** - Extract video URLs from hosting services
3. **Utility Plugins** - General purpose extensions
4. **Theme Plugins** - Custom UI themes
5. **Integration Plugins** - Third-party service integrations

### Plugin Development

See [docs/ZPE_PLUGIN_SYSTEM.md](docs/ZPE_PLUGIN_SYSTEM.md) for a complete guide on creating ZPE plugins.

### Quick Start

```javascript
// manifest.json
{
  "id": "my-provider",
  "name": "My Provider",
  "version": "1.0.0",
  "pluginType": "media-provider",
  "permissions": ["network:http", "storage:local"],
  "capabilities": { "search": true }
}

// plugin.js
module.exports = {
  async init(ctx) { this.http = ctx.http; },
  async search(query) {
    const res = await this.http.get(`https://api.example.com/search?q=${query}`);
    return { results: [], hasNextPage: false, currentPage: 1 };
  }
};
```

Example templates are available in the `templates/` directory.

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

