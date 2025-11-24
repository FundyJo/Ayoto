# Quick Start Guide

Get Ayoto up and running in minutes!

## 🚀 Quick Install

### Prerequisites
- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- Platform-specific dependencies (see below)

### Platform Dependencies

#### Linux (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

#### macOS
```bash
xcode-select --install
```

#### Windows
Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/FundyJo/Ayoto.git
cd Ayoto

# Install frontend dependencies
cd frontend
npm install
cd ..

# Run the app
cd src-tauri
cargo tauri dev
```

**First time?** The initial build takes 5-10 minutes while Rust compiles dependencies. ☕

## 🎮 Using Ayoto

### Search for Anime
1. Type in the search bar
2. Press Enter or click "Search"
3. Browse results

### Watch Episodes
1. Click on an anime
2. Browse episodes
3. Click "Play" on an episode

### Cast to TV
1. Click the "Cast" button (📱)
2. Scan for devices
3. Select your device
4. Play an episode

## 🔌 Adding Providers

### Using Existing Providers
The app includes an example provider. More providers coming soon!

### Creating Your Own
See [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) for detailed instructions.

Quick template:
```rust
use crate::plugin::{Anime, AnimeProvider, Episode};
use async_trait::async_trait;

pub struct MyProvider;

#[async_trait]
impl AnimeProvider for MyProvider {
    fn name(&self) -> &str { "My Provider" }
    fn version(&self) -> &str { "1.0.0" }
    
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        // Your implementation
        Ok(vec![])
    }
    
    // Implement other required methods...
}
```

## 🏗️ Building for Production

```bash
cd src-tauri
cargo tauri build
```

Find your build in `src-tauri/target/release/bundle/`

## 🐛 Common Issues

### "WebKit not found" (Linux)
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### "Port 5173 already in use"
Change the port in `frontend/vite.config.ts` and `src-tauri/tauri.conf.json`

### Slow compilation
Normal on first build! Subsequent builds are much faster.

## 📚 Documentation

- [README.md](README.md) - Project overview
- [INSTALLATION.md](INSTALLATION.md) - Detailed installation
- [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) - Creating providers
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [FAQ.md](FAQ.md) - Frequently asked questions
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute

## 💡 Tips

- **First build**: Takes 5-10 minutes, get some coffee!
- **Development**: Changes auto-reload in dev mode
- **Production**: Use `cargo tauri build` for optimized builds
- **Debugging**: Check terminal output for errors

## 🤝 Get Help

- 📖 Check [FAQ.md](FAQ.md)
- 🐛 [Report bugs](https://github.com/FundyJo/Ayoto/issues)
- 💬 [Discussions](https://github.com/FundyJo/Ayoto/discussions)
- ⭐ [Star us on GitHub](https://github.com/FundyJo/Ayoto)

## 🎉 You're Ready!

Start searching for your favorite anime and enjoy! 🎌

---

**Next Steps:**
- Explore the UI
- Create your own provider
- Join the community
- Contribute to the project
