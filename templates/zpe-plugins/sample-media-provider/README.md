# Sample Media Provider ZPE Plugin

This is a sample ZPE (Zenshine Plugin Extension) media provider plugin for Ayoto.

## What is ZPE?

ZPE is Ayoto's universal plugin format that uses WebAssembly (WASM) to enable cross-platform plugins. Unlike native plugins (.dll, .so, .dylib), ZPE plugins can run on any platform without recompilation.

## Building

1. Install the WASM target:
```bash
rustup target add wasm32-unknown-unknown
```

2. Build the plugin:
```bash
cargo build --release --target wasm32-unknown-unknown
```

3. Create the ZPE package:
```bash
# Copy the WASM file
cp target/wasm32-unknown-unknown/release/sample_media_provider.wasm plugin.wasm

# Create the ZPE archive
zip sample-media-provider.zpe manifest.json plugin.wasm
```

## Installing in Ayoto

1. Open Ayoto
2. Go to Settings → Plugins
3. Click "Load Plugin" and select the `.zpe` file
4. The plugin will be automatically loaded and available

## Plugin Structure

- `manifest.json` - Plugin metadata and capabilities
- `src/lib.rs` - Plugin implementation in Rust
- `Cargo.toml` - Rust project configuration

## Customizing

To create your own media provider:

1. Copy this template
2. Update `manifest.json` with your plugin's information
3. Implement the plugin functions in `src/lib.rs`:
   - `zpe_search` - Search for anime
   - `zpe_get_popular` - Get popular anime
   - `zpe_get_latest` - Get latest releases
   - `zpe_get_episodes` - Get episode list
   - `zpe_get_streams` - Get stream URLs
   - `zpe_get_anime_details` - Get detailed info

## HTTP Requests

This sample uses hardcoded data. For real plugins, you'll need to make HTTP requests to your source website. The ZPE runtime provides host functions for HTTP requests.

## License

MIT
