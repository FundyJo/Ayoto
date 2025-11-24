# Zenshin Tauri Backend

This directory contains the Rust backend for the Tauri version of Zenshin.

## Structure

```
src-tauri/
├── src/
│   ├── main.rs         # Entry point
│   ├── lib.rs          # Main app setup with plugins
│   └── commands.rs     # IPC command handlers
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
├── capabilities/       # Permission configurations
└── icons/              # Application icons
```

## Building

```bash
# Check code (fast)
cargo check

# Build debug version
cargo build

# Build release version
cargo build --release

# Run via npm
cd ..
npm run tauri:dev
```

## Commands

The following commands are available to the frontend via `invoke()`:

### Window Management
- `minimize_window()` - Minimize the window
- `maximize_window()` - Maximize/unmaximize the window
- `close_window()` - Close the window
- `window_reload()` - Reload the window

### File Operations
- `open_folder(path: String)` - Open a folder in the file manager

### External Applications
- `oauth_login(url: String)` - Open OAuth URL in browser
- `open_vlc(command: String)` - Launch VLC with a command
- `open_animepahe(url: String)` - Open AnimePahe URL in browser

### Settings
- `save_to_settings(key: String, value: Value)` - Save a setting
- `get_settings_json()` - Get all settings
- `change_downloads_folder()` - Change downloads folder (WIP)
- `change_backend_port(port: u16)` - Change backend port

### Discord RPC (WIP)
- `set_discord_rpc(activity_details: Value)` - Set Discord activity
- `broadcast_discord_rpc(value: bool)` - Toggle Discord RPC

## Plugins Used

- **tauri-plugin-shell** - Shell operations
- **tauri-plugin-dialog** - File dialogs
- **tauri-plugin-fs** - File system access
- **tauri-plugin-process** - Process management
- **tauri-plugin-http** - HTTP client
- **tauri-plugin-websocket** - WebSocket support
- **tauri-plugin-single-instance** - Single instance enforcement
- **tauri-plugin-deep-link** - Deep link support (zenshin://)
- **tauri-plugin-window-state** - Persistent window state
