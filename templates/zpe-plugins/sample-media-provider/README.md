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

- `manifest.json` - Plugin metadata and capabilities (including the `icon` field for display in UI)
- `src/lib.rs` - Plugin implementation in Rust
- `Cargo.toml` - Rust project configuration

## Customizing

To create your own media provider:

1. Copy this template
2. Update `manifest.json` with your plugin's information:
   - Set `id`, `name`, `version`, `author`, `description`
   - Set `icon` to a URL for your plugin's icon (displayed in the plugins UI)
   - Configure `capabilities` based on what your plugin supports
3. Implement the plugin functions in `src/lib.rs`:
   - `zpe_search` - Search for anime
   - `zpe_get_popular` - Get popular anime
   - `zpe_get_latest` - Get latest releases
   - `zpe_get_episodes` - Get episode list (supports multiple streaming links per episode via the `sources` field)
   - `zpe_get_streams` - Get stream URLs for a specific episode
   - `zpe_get_anime_details` - Get detailed info

## Episode Streaming Links

Each episode can have multiple streaming links (sources) directly attached to it. This allows users to choose from different servers, qualities, or formats:

```rust
Episode {
    id: "ep-1".to_string(),
    number: 1,
    title: Some("Episode 1".to_string()),
    sources: vec![
        StreamSource {
            url: "https://server1.example.com/ep1/1080p.m3u8".to_string(),
            quality: "1080p".to_string(),
            server: Some("Server 1".to_string()),
            format: "m3u8".to_string(),
            ..Default::default()
        },
        StreamSource {
            url: "https://server2.example.com/ep1/720p.mp4".to_string(),
            quality: "720p".to_string(),
            server: Some("Server 2".to_string()),
            format: "mp4".to_string(),
            ..Default::default()
        },
    ],
    ..Default::default()
}
```

## HTTP Requests

This sample uses hardcoded data. For real plugins, you'll need to make HTTP requests to your source website. The ZPE runtime provides host functions for HTTP requests.

## License

MIT
