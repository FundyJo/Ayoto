# Frequently Asked Questions (FAQ)

## General Questions

### What is Ayoto?

Ayoto is a cross-platform anime streaming application built with Tauri. It features a plugin system for adding support for different anime sources and includes Miracast support for casting content to other devices.

### Is Ayoto free?

Yes, Ayoto is free and open-source software licensed under the MIT License.

### What platforms does Ayoto support?

- **Desktop**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+, Fedora, Arch)
- **Mobile**: Android (API 24+), iOS (13+)

### Is Ayoto legal?

Ayoto is a player/framework. The legality depends on the content sources you access through provider plugins. Users are responsible for ensuring they have the right to access content through their chosen providers.

## Installation & Setup

### How do I install Ayoto?

See [INSTALLATION.md](INSTALLATION.md) for detailed platform-specific instructions.

Quick start:
1. Install Rust and Node.js
2. Clone the repository
3. Install dependencies: `cd frontend && npm install`
4. Run: `cd ../src-tauri && cargo tauri dev`

### Why is the first build taking so long?

The first build compiles all Rust dependencies, which can take 5-10 minutes. Subsequent builds will be much faster as dependencies are cached.

### I'm getting a WebKit/GTK error on Linux. What do I do?

Install the required system dependencies:

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel

# Arch
sudo pacman -S webkit2gtk-4.1
```

See [INSTALLATION.md](INSTALLATION.md) for complete dependency lists.

### The application won't start. What should I check?

1. Check all dependencies are installed
2. Try rebuilding: `cargo clean && cargo tauri build`
3. Check console/terminal for error messages
4. Ensure port 5173 is not in use
5. Check firewall settings

## Features & Usage

### How do I search for anime?

1. Launch the application
2. Use the search bar at the top
3. Enter your search query
4. Press Enter or click "Search"
5. Click on any result to view details and episodes

### How do I play an episode?

Currently, clicking "Play" shows the stream URL. In future versions, this will integrate a video player. You can copy the URL and play it in your preferred video player.

### How do I cast to my TV?

1. Click the "Cast" button (📱 icon)
2. Click "Scan for devices"
3. Select your Miracast-enabled device
4. Play an episode to start casting

**Note**: Miracast support is a framework in the current version. Full implementation requires platform-specific APIs.

### Can I download anime for offline viewing?

Not yet. This feature is planned for a future release.

### Does Ayoto support subtitles?

Subtitle support is planned but not yet implemented.

### Can I create a watchlist?

Watchlist/library features are planned for a future release.

## Plugin System

### What are provider plugins?

Provider plugins are modules that add support for specific anime sources. They implement a standard interface to search, fetch details, and get streaming URLs.

### How do I add a new provider?

See [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) for a complete guide on creating provider plugins.

Quick overview:
1. Create a new file in `src-tauri/src/providers/`
2. Implement the `AnimeProvider` trait
3. Register your provider in `main.rs`
4. Rebuild the application

### Can I use multiple providers at once?

Yes, you can register multiple providers. Future versions will allow switching between them in the UI.

### Where can I find existing provider plugins?

Currently, only an example provider is included. Community providers will be available as the project grows.

### Can I share my provider plugin?

Yes! Consider:
1. Creating a separate repository for your plugin
2. Submitting a PR to add it to a plugins directory
3. Documenting installation and usage

## Technical Questions

### What technologies does Ayoto use?

- **Frontend**: React, TypeScript, Vite
- **Backend**: Rust, Tauri, Tokio
- **Build**: Cargo, npm

### Why Tauri instead of Electron?

Tauri offers:
- Smaller binary size (5-15 MB vs 100+ MB)
- Lower memory usage
- Native system webview (no bundled Chromium)
- Rust backend for security and performance

### Can I modify the source code?

Yes! Ayoto is open-source under the MIT License. You're free to modify, distribute, and even sell modified versions.

### How do I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing code, documentation, or bug reports.

### Why is the app so large on first install?

The development build includes debug symbols. Production builds are much smaller:
- Windows: ~15-20 MB
- macOS: ~10-15 MB
- Linux: ~20-25 MB

### Can I build from source on mobile?

Yes, but it requires additional setup:
- **Android**: Android Studio, SDK, NDK
- **iOS**: Xcode (macOS only), iOS SDK

See [INSTALLATION.md](INSTALLATION.md) for mobile build instructions.

## Miracast & Casting

### What is Miracast?

Miracast is a wireless display standard that allows you to mirror or cast content from your device to a compatible display (TV, monitor, projector).

### Do I need special hardware?

You need a Miracast-compatible receiving device, such as:
- Smart TVs with Miracast support
- Miracast dongles/adapters
- Some streaming devices

### Why isn't my device showing up?

Possible reasons:
1. Device doesn't support Miracast
2. Device is on a different network
3. Firewall is blocking discovery
4. Device is not in pairing mode

### What's the difference between Miracast and Chromecast?

- **Miracast**: Direct Wi-Fi connection, open standard
- **Chromecast**: Requires internet, Google ecosystem

Ayoto focuses on Miracast for its open, decentralized nature.

### Does casting work on all platforms?

The casting framework is implemented, but full functionality requires:
- **Windows**: DIAL protocol, native Miracast APIs
- **Android**: MediaRouter APIs
- **iOS**: AirPlay integration
- **Linux**: Network-based casting protocols

## Troubleshooting

### The app crashes on startup

1. Check system requirements
2. Update graphics drivers
3. Try running from terminal to see error messages
4. Disable hardware acceleration (if available)

### Search isn't returning results

1. Check internet connection
2. Verify provider is registered
3. Check provider API status
4. Look for errors in console

### The UI is not responsive

1. Clear browser cache (if applicable)
2. Restart the application
3. Update to latest version
4. Check for conflicting CSS

### High CPU/Memory usage

1. Close unused tabs/windows
2. Limit concurrent streams
3. Update to latest version
4. Report issue with system specs

### "Permission Denied" errors

1. Run with appropriate permissions
2. Check file ownership
3. Verify installation path is writable

## Privacy & Security

### Does Ayoto collect my data?

No. Ayoto does not collect, store, or transmit user data to any servers. All activity is local to your device.

### How are streaming URLs obtained?

Provider plugins fetch URLs from their respective sources. Ayoto doesn't host or store any content.

### Is it safe to install third-party plugins?

Exercise caution with third-party plugins as they run within the app's context. Only install plugins from trusted sources.

### Can I use Ayoto anonymously?

Yes, the app doesn't require accounts or track users.

## Future Features

### What features are planned?

See the roadmap in [README.md](README.md) and [CHANGELOG.md](CHANGELOG.md) for planned features.

Highlights:
- Integrated video player
- Subtitle support
- Download functionality
- User library/watchlist
- MAL/AniList integration
- More provider plugins

### When will feature X be available?

Check the project's GitHub issues and milestones for feature timelines. You can also contribute or sponsor development!

### Can I request a feature?

Yes! Open an issue on GitHub with the "enhancement" label. Include:
- Description of the feature
- Use case
- Mockups (if applicable)

## Support & Community

### Where can I get help?

1. Check this FAQ
2. Read the documentation
3. Search [GitHub Issues](https://github.com/FundyJo/Ayoto/issues)
4. Open a new issue
5. Join community discussions

### How do I report a bug?

Open an issue on GitHub with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- System information
- Screenshots/logs

### Is there a Discord/Reddit community?

Community channels may be established as the project grows. Check the README for current community links.

### How can I support the project?

- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Contribute code
- 📖 Improve documentation
- 🎨 Design assets
- 💰 Sponsor development (if available)

## Legal & Compliance

### What's the license?

MIT License - see [LICENSE](LICENSE) file.

### Can I use Ayoto commercially?

Yes, the MIT License allows commercial use.

### Does Ayoto respect copyright?

Ayoto is a player framework. Users are responsible for ensuring they have rights to access content through their chosen providers.

### Is streaming anime legal in my country?

This varies by jurisdiction. Check your local laws regarding streaming copyrighted content.

### What content can I access?

Only content available through registered provider plugins. Ayoto doesn't host or provide content itself.

---

## Still have questions?

- Check the [README](README.md)
- Read the [documentation](INSTALLATION.md)
- Search [GitHub Issues](https://github.com/FundyJo/Ayoto/issues)
- Ask in [Discussions](https://github.com/FundyJo/Ayoto/discussions)

Can't find an answer? [Open an issue](https://github.com/FundyJo/Ayoto/issues/new)!
