# Ayoto Architecture

This document describes the architecture and design decisions of the Ayoto anime streaming application.

## Overview

Ayoto is a cross-platform anime streaming application built with Tauri, combining a Rust backend with a React frontend. It features a plugin-based architecture for extensibility and Miracast support for casting content.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│                    (React + TypeScript)                      │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  - App.tsx (Main application)                               │
│  - Search UI                                                │
│  - Anime Detail View                                        │
│  - Episode List                                             │
│  - Cast Device Selector                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ Tauri IPC (invoke)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│                         (Rust/Tauri)                         │
├─────────────────────────────────────────────────────────────┤
│  Commands:                                                   │
│  - search_anime                                             │
│  - get_anime                                                │
│  - list_providers                                           │
│  - scan_miracast_devices                                    │
│  - start_cast / stop_cast                                   │
│  - get_cast_state                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│    Plugin    │          │   Miracast   │
│   Manager    │          │   Manager    │
└──────┬───────┘          └──────────────┘
       │
       │ manages
       ▼
┌──────────────────────────────────────┐
│          Provider Plugins             │
├──────────────────────────────────────┤
│  - ExampleProvider                   │
│  - CustomProvider1                   │
│  - CustomProvider2                   │
│  - ...                               │
└──────────────────────────────────────┘
       │
       │ fetches from
       ▼
┌──────────────────────────────────────┐
│      External Anime APIs             │
└──────────────────────────────────────┘
```

## Core Components

### 1. Frontend (React + TypeScript)

**Location**: `frontend/src/`

**Responsibilities**:
- User interface rendering
- User input handling
- State management
- Communication with backend via Tauri IPC

**Key Files**:
- `App.tsx` - Main application component
- `App.css` - Styling and responsive design
- `main.tsx` - Application entry point

**State Management**:
Uses React hooks (useState, useEffect) for local state management. No external state management library is used to keep the application lightweight.

**Communication**:
```typescript
import { invoke } from '@tauri-apps/api/core'

// Example: Search for anime
const results = await invoke<Anime[]>('search_anime', { query: 'naruto' })
```

### 2. Backend (Rust + Tauri)

**Location**: `src-tauri/src/`

**Responsibilities**:
- Command handling from frontend
- Plugin management
- Miracast device management
- Business logic
- External API communication

**Key Files**:
- `main.rs` - Application entry point, command definitions
- `plugin.rs` - Plugin system implementation
- `miracast.rs` - Miracast support
- `providers/` - Anime provider implementations

### 3. Plugin System

**Purpose**: Allow extensible support for multiple anime sources

**Components**:

#### AnimeProvider Trait
```rust
pub trait AnimeProvider: Send + Sync {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>>;
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>>;
    async fn get_stream_url(&self, anime_id: &str, episode: u32) -> Result<String, Box<dyn std::error::Error>>;
}
```

#### PluginManager
- Registers and manages providers
- Routes requests to appropriate providers
- Supports multiple providers simultaneously

**Benefits**:
- Easy to add new anime sources
- Providers are isolated and independent
- No need to modify core code for new sources

### 4. Miracast Support

**Purpose**: Enable casting content to external devices

**Components**:

#### MiracastManager
- Device discovery
- Connection management
- Stream control

**Current State**:
- Framework is in place
- Uses mock data in debug mode
- Requires platform-specific implementation

**Future Implementation**:
- Windows: DIAL protocol, Miracast APIs
- Android: MediaRouter APIs
- Linux: Network-based casting (RTSP/HTTP)

## Data Flow

### Search Flow
```
User Input
    ↓
Frontend (search input)
    ↓
Tauri IPC (search_anime command)
    ↓
Backend (Command Handler)
    ↓
PluginManager
    ↓
Selected Provider
    ↓
External API
    ↓
Provider (parse response)
    ↓
PluginManager
    ↓
Backend (serialize)
    ↓
Frontend (display results)
    ↓
User sees results
```

### Cast Flow
```
User clicks Cast
    ↓
Frontend (scan_miracast_devices)
    ↓
MiracastManager (scan_devices)
    ↓
Platform-specific device discovery
    ↓
Return device list
    ↓
User selects device
    ↓
Frontend (start_cast with device_id and stream_url)
    ↓
MiracastManager (start_cast)
    ↓
Establish connection to device
    ↓
Start streaming
    ↓
Return success
```

## Data Models

### Anime
```rust
pub struct Anime {
    pub id: String,
    pub title: String,
    pub description: String,
    pub thumbnail_url: String,
    pub episodes: Vec<Episode>,
}
```

### Episode
```rust
pub struct Episode {
    pub number: u32,
    pub title: String,
    pub stream_url: String,
    pub thumbnail_url: Option<String>,
}
```

### MiracastDevice
```rust
pub struct MiracastDevice {
    pub id: String,
    pub name: String,
    pub ip_address: String,
    pub is_available: bool,
}
```

### CastState
```rust
pub struct CastState {
    pub is_casting: bool,
    pub device_id: Option<String>,
    pub media_url: Option<String>,
}
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS** - Styling (no framework for simplicity)

### Backend
- **Rust** - Systems programming language
- **Tauri 2** - Framework for building desktop/mobile apps
- **Tokio** - Async runtime
- **Reqwest** - HTTP client
- **Serde** - Serialization/deserialization

### Build & Dev Tools
- **Cargo** - Rust package manager
- **npm** - Node package manager
- **Tauri CLI** - Build and dev commands

## Security Considerations

### Input Validation
- All user inputs are validated before processing
- SQL injection prevention (if databases are used)
- Path traversal prevention

### Network Security
- HTTPS for all external API calls
- Validate streaming URLs before casting
- Sanitize API responses

### Error Handling
- Errors don't expose sensitive information
- Graceful degradation on failures
- User-friendly error messages

### Plugin Security
- Plugins run in the same process (trust-based)
- Future: Consider sandboxing for third-party plugins
- Validate plugin responses

## Performance Optimizations

### Frontend
- Lazy loading for images
- Debounced search input
- Virtual scrolling for large lists (future)
- Code splitting (future)

### Backend
- Async/await for non-blocking I/O
- Connection pooling for HTTP requests
- Caching frequently accessed data (future)
- Rate limiting for external APIs (future)

### Build
- Rust release builds with optimizations
- Tree shaking in frontend bundle
- Asset optimization

## Cross-Platform Support

### Desktop
- **Windows**: NSIS installer, MSI package
- **macOS**: DMG, .app bundle
- **Linux**: AppImage, .deb, .rpm

### Mobile
- **Android**: APK (API level 24+)
- **iOS**: IPA (iOS 13+)

### Platform-Specific Code
```rust
#[cfg(target_os = "windows")]
fn platform_specific_function() {
    // Windows implementation
}

#[cfg(target_os = "macos")]
fn platform_specific_function() {
    // macOS implementation
}

#[cfg(target_os = "linux")]
fn platform_specific_function() {
    // Linux implementation
}
```

## Extensibility Points

### Adding New Providers
1. Implement `AnimeProvider` trait
2. Add to `providers/` directory
3. Register in `main.rs`
4. No core code changes needed

### Adding New Commands
1. Define command function in `main.rs`
2. Add to `invoke_handler!` macro
3. Call from frontend with `invoke()`

### Custom UI Themes
- Modify CSS variables
- Add theme switcher
- Persist user preference

## Testing Strategy

### Unit Tests
- Rust: `cargo test`
- Provider implementations
- Data model validation

### Integration Tests
- Full workflow testing
- API mocking for providers
- UI component testing (future)

### Manual Testing
- Cross-platform testing
- Device compatibility
- Performance testing

## Deployment

### Development
```bash
npm run tauri:dev
```

### Production Build
```bash
npm run tauri:build
```

### Distribution
- GitHub Releases
- Auto-updates (future)
- Package managers (future)

## Future Enhancements

### Short Term
- Proper icon generation
- Video player integration
- Multiple provider selection
- User library/watchlist

### Medium Term
- Subtitle support
- Download functionality
- User authentication
- MAL/AniList integration

### Long Term
- P2P streaming
- Community features
- Recommendation engine
- TV mode interface

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on extending the architecture.

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
