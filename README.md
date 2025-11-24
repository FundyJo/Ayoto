# Ayoto - Anime Streaming Application

A cross-platform anime streaming application built with Tauri, featuring Miracast support and an extensible plugin system for multiple anime providers.

## Features

- 🎌 **Cross-Platform**: Desktop (Windows, macOS, Linux) and Mobile (Android, iOS)
- 📱 **Miracast Support**: Cast anime to compatible devices
- 🔌 **Plugin System**: Extensible architecture for adding new anime providers
- ⚡ **Fast & Lightweight**: Built with Rust and Tauri
- 🎨 **Modern UI**: Beautiful React-based interface
- 🔍 **Search**: Find your favorite anime across multiple providers

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Styling**: Custom CSS with responsive design
- **API**: Tauri IPC for frontend-backend communication

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/FundyJo/Ayoto.git
cd Ayoto
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

3. Install Tauri CLI:
```bash
npm install -g @tauri-apps/cli
```

## Development

To run the application in development mode:

```bash
cd src-tauri
cargo tauri dev
```

Or from the root directory:
```bash
npm run tauri:dev
```

This will start the Vite dev server and launch the Tauri application.

## Building for Production

### Desktop

```bash
cd src-tauri
cargo tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

### Mobile (Android)

1. Set up Android development environment (Android Studio, SDK, etc.)
2. Add Android target:
```bash
cargo tauri android init
```

3. Build:
```bash
cargo tauri android build
```

### Mobile (iOS)

1. Set up Xcode and iOS development environment (macOS only)
2. Add iOS target:
```bash
cargo tauri ios init
```

3. Build:
```bash
cargo tauri ios build
```

## Plugin System

Ayoto features an extensible plugin system that allows you to add support for different anime providers.

### Creating a Plugin

1. Create a new file in `src-tauri/src/providers/`:

```rust
use crate::plugin::{Anime, AnimeProvider, Episode};
use async_trait::async_trait;

pub struct MyProvider {
    name: String,
    version: String,
}

impl MyProvider {
    pub fn new() -> Self {
        Self {
            name: "My Provider".to_string(),
            version: "1.0.0".to_string(),
        }
    }
}

#[async_trait]
impl AnimeProvider for MyProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        // Implement search logic
        todo!()
    }
    
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>> {
        // Implement anime details fetching
        todo!()
    }
    
    async fn get_stream_url(&self, anime_id: &str, episode: u32) -> Result<String, Box<dyn std::error::Error>> {
        // Implement stream URL retrieval
        todo!()
    }
}
```

2. Add your provider to `src-tauri/src/providers/mod.rs`:

```rust
pub mod my_provider;
pub use my_provider::MyProvider;
```

3. Register your provider in `src-tauri/src/main.rs`:

```rust
plugin_manager.register_provider(Box::new(MyProvider::new()));
```

### Provider Interface

All providers must implement the `AnimeProvider` trait:

- `name()`: Returns the provider name
- `version()`: Returns the provider version
- `search(query)`: Search for anime by title
- `get_anime(id)`: Get detailed information about a specific anime
- `get_stream_url(anime_id, episode)`: Get the streaming URL for a specific episode

## Miracast Support

Ayoto includes support for casting anime to Miracast-enabled devices.

### Features

- Device discovery on local network
- Start/stop casting
- Stream management

### Usage

1. Click the "Cast" button in the UI
2. Scan for available devices
3. Select a device from the list
4. Play an episode to start casting

### Implementation Notes

The current implementation provides a framework for Miracast support. For production use, you'll need to:

- Implement platform-specific Miracast APIs (Windows: DIAL, Android: MediaRouter)
- Handle device authentication and pairing
- Implement streaming protocols (RTSP, HTTP Live Streaming)

## Project Structure

```
Ayoto/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.tsx       # Main application component
│   │   ├── App.css       # Application styles
│   │   └── main.tsx      # Entry point
│   ├── package.json
│   └── vite.config.ts
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs       # Main application
│   │   ├── plugin.rs     # Plugin system
│   │   ├── miracast.rs   # Miracast support
│   │   └── providers/    # Anime providers
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── package.json          # Root package config
└── README.md
```

## API Reference

### Frontend API (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core'

// Search for anime
const results = await invoke<Anime[]>('search_anime', { query: 'naruto' })

// Get anime details
const anime = await invoke<Anime>('get_anime', { id: 'anime-id' })

// List providers
const providers = await invoke<string[]>('list_providers')

// Scan for Miracast devices
const devices = await invoke<MiracastDevice[]>('scan_miracast_devices')

// Start casting
await invoke('start_cast', { deviceId: 'device-id', mediaUrl: 'stream-url' })

// Stop casting
await invoke('stop_cast')

// Get cast state
const state = await invoke<CastState>('get_cast_state')
```

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## Roadmap

- [ ] Add more anime provider plugins
- [ ] Implement actual Miracast protocol support
- [ ] Add download functionality
- [ ] Implement user library/watchlist
- [ ] Add subtitle support
- [ ] Implement video player controls
- [ ] Add user authentication
- [ ] Support for MAL/AniList integration

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/FundyJo/Ayoto).

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [React](https://react.dev/)
- Icons from placeholder services

## Security Notes

⚠️ **Important**: This application is for educational purposes. Please ensure you:
- Respect copyright laws in your jurisdiction
- Only stream content you have rights to access
- Implement proper content verification in production providers
- Use HTTPS for all external API calls
- Sanitize all user inputs
- Implement proper error handling