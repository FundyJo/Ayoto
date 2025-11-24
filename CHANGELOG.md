# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Tauri-based anime streaming application
- Plugin system for extensible anime providers
- Example anime provider implementation
- Miracast support for casting to devices
- React-based UI with TypeScript
- Search functionality across providers
- Episode browsing and playback (demo)
- Device discovery for Miracast
- Responsive design for desktop and mobile
- Comprehensive documentation (README, INSTALLATION, PLUGIN_GUIDE, CONTRIBUTING)
- Cross-platform support (Windows, macOS, Linux, Android, iOS)

### Features

#### Core Functionality
- Search anime across registered providers
- View anime details and episode lists
- Browse episodes with thumbnails
- Cast content to Miracast-enabled devices
- Multi-provider support

#### Technical Features
- Rust backend with async support
- TypeScript frontend with React
- Plugin-based architecture
- Tauri IPC for frontend-backend communication
- Modern, gradient-based UI design

#### Documentation
- Installation guide with platform-specific instructions
- Plugin development guide with examples
- Contributing guidelines
- API reference
- Security notes and best practices

## [0.1.0] - 2025-11-24

### Added
- Initial project setup
- Basic project structure
- Core architecture implementation

### Notes
- This is the first development version
- Features are functional but may require additional setup
- Icon assets are placeholders and need proper generation
- Miracast implementation provides framework but needs platform-specific APIs
- Example provider uses mock data for demonstration

### Known Limitations
- Icons are placeholder files
- Miracast requires platform-specific implementation
- Video player is not integrated (URLs are shown as alerts)
- Limited to one provider by default (example provider)
- No user authentication or library features yet
- No download functionality
- No subtitle support

### System Requirements
- Rust 1.70+
- Node.js 18+
- Platform-specific dependencies (see INSTALLATION.md)

### Roadmap
See README.md for future feature plans

---

## Version History Format

### [Version] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security improvements

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to suggest changes or report issues.

## Links

- [Repository](https://github.com/FundyJo/Ayoto)
- [Issues](https://github.com/FundyJo/Ayoto/issues)
- [Releases](https://github.com/FundyJo/Ayoto/releases)
