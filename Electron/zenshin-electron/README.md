# zenshin-electron

An Electron application with React

> **Note**: This project is being migrated to Tauri. See [TAURI_MIGRATION.md](TAURI_MIGRATION.md) for details.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

#### Electron Version (Current)
```bash
$ npm run dev
```

#### Tauri Version (New)
```bash
$ npm run tauri:dev
```

### Build

#### Electron Version
```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

#### Tauri Version
```bash
# For windows
$ npm run tauri:build:win

# For macOS
$ npm run tauri:build:mac

# For Linux
$ npm run tauri:build:linux
```

## Tauri Migration

The project is being migrated from Electron to Tauri for better performance and smaller bundle sizes. See [TAURI_MIGRATION.md](TAURI_MIGRATION.md) for full details on:

- Migration progress
- Key differences between Electron and Tauri
- How to contribute to the migration
- Known issues and limitations

### Why Tauri?

- **~10x smaller bundle size**: Tauri apps are 5-15 MB vs Electron's 120+ MB
- **Lower memory usage**: Uses native OS webview instead of bundled Chromium
- **Better security**: Rust backend with strict permission system
- **Faster startup**: No Node.js runtime overhead
