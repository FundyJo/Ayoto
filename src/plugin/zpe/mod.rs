//! Zenshine Plugin Extension (ZPE) - Universal Plugin System
//!
//! ZPE is a cross-platform plugin format that uses WebAssembly to enable
//! plugins to be compiled once and run on any platform (Windows, macOS, Linux,
//! Android, iOS) without recompilation.
//!
//! # Overview
//!
//! Unlike native plugins (.dll/.so/.dylib) which require separate compilation
//! for each target platform, ZPE plugins (.zpe) are compiled to WebAssembly
//! and can run anywhere Ayoto runs.
//!
//! # Plugin Development
//!
//! ZPE plugins can be written in any language that compiles to WebAssembly:
//! - Rust (recommended)
//! - C/C++
//! - AssemblyScript
//! - Go
//! - TinyGo
//! - Zig
//!
//! # File Format
//!
//! A `.zpe` file is a ZIP archive containing:
//! - `plugin.wasm` - The compiled WebAssembly module
//! - `manifest.json` - Plugin metadata and configuration
//! - `README.md` (optional) - Plugin documentation
//!
//! # Example Plugin Structure
//!
//! ```text
//! my-provider.zpe
//! ├── plugin.wasm      # Compiled WASM module
//! ├── manifest.json    # Plugin metadata
//! └── README.md        # Optional documentation
//! ```

pub mod types;
pub mod loader;
pub mod runtime;

pub use types::*;
pub use loader::*;
pub use runtime::*;

/// ZPE file extension
pub const ZPE_EXTENSION: &str = "zpe";

/// Current ZPE ABI version
pub const ZPE_ABI_VERSION: u32 = 1;
