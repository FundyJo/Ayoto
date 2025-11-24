# Installation Guide for Ayoto

This guide will help you install Ayoto on different platforms.

## Prerequisites

### All Platforms

1. **Rust** (latest stable version)
   - Visit: https://rustup.rs/
   - Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. **Node.js** (v18 or higher)
   - Visit: https://nodejs.org/
   - Or use nvm: `nvm install 18`

3. **npm** or **yarn**
   - npm comes with Node.js
   - yarn: `npm install -g yarn`

### Linux

On Linux, you'll need to install additional dependencies for Tauri:

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Fedora:
```bash
sudo dnf install \
    webkit2gtk4.1-devel \
    openssl-devel \
    curl \
    wget \
    librsvg2-devel
sudo dnf group install "C Development Tools and Libraries"
```

#### Arch Linux:
```bash
sudo pacman -S --needed \
    webkit2gtk-4.1 \
    base-devel \
    curl \
    wget \
    openssl \
    libayatana-appindicator \
    librsvg
```

### macOS

On macOS, you need Xcode Command Line Tools:

```bash
xcode-select --install
```

### Windows

On Windows, you need:

1. **Microsoft Visual Studio C++ Build Tools**
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Or install Visual Studio 2022 with C++ development workload

2. **WebView2**
   - Usually pre-installed on Windows 10/11
   - If not, download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/FundyJo/Ayoto.git
cd Ayoto
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install Tauri CLI (Optional)

For easier development, install Tauri CLI globally:

```bash
npm install -g @tauri-apps/cli
```

## Running the Application

### Development Mode

From the `src-tauri` directory:

```bash
cd src-tauri
cargo tauri dev
```

Or from the root directory:

```bash
npx tauri dev
```

This will:
1. Start the Vite development server
2. Compile the Rust backend
3. Launch the Tauri application

The first run will take several minutes as Rust compiles all dependencies.

### Building for Production

#### Desktop Application

```bash
cd src-tauri
cargo tauri build
```

The built application will be in `src-tauri/target/release/bundle/` with platform-specific formats:

- **Windows**: `.exe` installer and `.msi`
- **macOS**: `.dmg` and `.app`
- **Linux**: `.deb`, `.AppImage`, and `.rpm`

#### Optimized Build

For a smaller, optimized build:

```bash
cargo tauri build --release
```

## Platform-Specific Instructions

### Linux

After building, you can install the package:

#### Debian/Ubuntu (.deb):
```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/ayoto_*.deb
```

#### Fedora (.rpm):
```bash
sudo rpm -i src-tauri/target/release/bundle/rpm/ayoto-*.rpm
```

#### AppImage:
```bash
chmod +x src-tauri/target/release/bundle/appimage/ayoto_*.AppImage
./src-tauri/target/release/bundle/appimage/ayoto_*.AppImage
```

### macOS

After building:

```bash
open src-tauri/target/release/bundle/dmg/Ayoto_*.dmg
```

Drag the app to your Applications folder.

**Note**: You may need to allow the app in System Preferences > Security & Privacy if it's blocked.

### Windows

After building, run the installer:

```bash
start src-tauri/target/release/bundle/msi/Ayoto_*.msi
```

Or use the standalone executable:

```bash
src-tauri/target/release/bundle/nsis/Ayoto_*_setup.exe
```

## Mobile Development

### Android

1. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK and NDK

2. **Set up Environment Variables**

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)
```

3. **Add Android Target**

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

4. **Initialize Android Project**

```bash
cd src-tauri
cargo tauri android init
```

5. **Build**

```bash
cargo tauri android build
```

6. **Run on Device/Emulator**

```bash
cargo tauri android dev
```

### iOS

**Requirements**: macOS with Xcode installed

1. **Install Xcode**
   - From Mac App Store
   - Or download from: https://developer.apple.com/xcode/

2. **Install iOS Targets**

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

3. **Initialize iOS Project**

```bash
cd src-tauri
cargo tauri ios init
```

4. **Build**

```bash
cargo tauri ios build
```

5. **Run on Simulator**

```bash
cargo tauri ios dev
```

## Troubleshooting

### Linux: WebKit2GTK Not Found

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel

# Arch
sudo pacman -S webkit2gtk-4.1
```

### Linux: Missing GLib/GTK

```bash
# Ubuntu/Debian
sudo apt install libgtk-3-dev

# Fedora
sudo dnf install gtk3-devel

# Arch
sudo pacman -S gtk3
```

### macOS: Command Line Tools Not Found

```bash
xcode-select --install
```

### Windows: MSVC Not Found

Install Visual Studio Build Tools with C++ workload:
https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Rust Compilation Errors

Update Rust to the latest version:

```bash
rustup update stable
```

### Node.js/npm Errors

Clear npm cache and reinstall:

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Not Loading

Check that Vite dev server is running:

```bash
cd frontend
npm run dev
```

Should show:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Port Already in Use

If port 5173 is in use, edit `tauri.conf.json`:

```json
{
  "build": {
    "devUrl": "http://localhost:YOUR_PORT"
  }
}
```

And update `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: YOUR_PORT
  }
})
```

## Performance Tips

### Development

- Use `--release` flag for faster runtime (slower compile):
  ```bash
  cargo tauri dev --release
  ```

### Production Build

- Enable all optimizations in `Cargo.toml`:
  ```toml
  [profile.release]
  opt-level = "z"
  lto = true
  codegen-units = 1
  panic = "abort"
  strip = true
  ```

## Uninstalling

### Linux

```bash
# If installed from .deb
sudo apt remove ayoto

# If installed from .rpm
sudo rpm -e ayoto

# If using AppImage
rm ~/Applications/Ayoto_*.AppImage
```

### macOS

```bash
rm -rf /Applications/Ayoto.app
```

### Windows

Use Windows "Add or Remove Programs" or:

```bash
msiexec /x {PRODUCT_CODE}
```

## Getting Help

If you encounter issues:

1. Check the [README.md](README.md) for general information
2. Review [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) for plugin development
3. Open an issue on GitHub: https://github.com/FundyJo/Ayoto/issues
4. Join our community (if available)

## Next Steps

After installation, check out:

- [README.md](README.md) - General documentation
- [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md) - Creating anime provider plugins
- [API Documentation](docs/API.md) - (if available)

## System Requirements

### Minimum

- **OS**: Windows 10+, macOS 10.15+, Ubuntu 20.04+ (or equivalent)
- **RAM**: 2 GB
- **Storage**: 500 MB
- **Network**: Internet connection for streaming

### Recommended

- **OS**: Windows 11, macOS 13+, Ubuntu 22.04+
- **RAM**: 4 GB+
- **Storage**: 1 GB+
- **Network**: Broadband connection (5+ Mbps)

## License

Ayoto is open-source software licensed under the MIT License.