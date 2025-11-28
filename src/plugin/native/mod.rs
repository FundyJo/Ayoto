//! Ayoto Native Plugin System
//! 
//! A universal Rust-based plugin system for loading native dynamic libraries (.so/.dll/.dylib)
//! that work across desktop and mobile platforms (Linux, Windows, macOS, Android, iOS).
//! 
//! Plugins are written in Rust and compiled as dynamic libraries. They can perform
//! web scraping, HTTP requests, and other operations on provider websites.
//! 
//! # Plugin Development
//! 
//! Plugins implement the `AyotoPlugin` trait and expose a `create_plugin` function.
//! The plugin system handles loading, initialization, and lifecycle management.
//! 
//! # Cross-Platform Support
//! 
//! - **Linux**: `.so` files
//! - **Windows**: `.dll` files  
//! - **macOS**: `.dylib` files
//! - **Android**: `.so` files (ARM/ARM64)
//! - **iOS**: Static linking or `.dylib` (simulator)

pub mod ffi_types;
pub mod plugin_trait;
pub mod runtime;
pub mod native_loader;

pub use ffi_types::*;
pub use plugin_trait::*;
pub use runtime::*;
pub use native_loader::*;
