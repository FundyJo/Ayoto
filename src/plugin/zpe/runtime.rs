//! ZPE Plugin Runtime
//!
//! Provides the WebAssembly runtime environment for ZPE plugins using wasmtime.
//! This module handles executing plugin code in a sandboxed environment with
//! controlled access to host functions.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use wasmtime::*;

use super::types::*;

/// WASM memory configuration - maximum pages (256 * 64KB = 16MB max)
const WASM_MEMORY_MAX_PAGES: u32 = 256;

/// ZPE Plugin runtime that executes WASM code
pub struct ZpeRuntime {
    engine: Engine,
    config: ZpeRuntimeConfig,
}

/// Runtime configuration
#[derive(Debug, Clone)]
pub struct ZpeRuntimeConfig {
    /// User agent for HTTP requests
    pub user_agent: String,
    /// Default HTTP timeout
    pub http_timeout: u32,
    /// Maximum memory pages
    pub max_memory_pages: u32,
}

impl Default for ZpeRuntimeConfig {
    fn default() -> Self {
        ZpeRuntimeConfig {
            user_agent: format!("Ayoto/{}", env!("CARGO_PKG_VERSION")),
            http_timeout: 30,
            max_memory_pages: WASM_MEMORY_MAX_PAGES,
        }
    }
}

impl Default for ZpeRuntime {
    fn default() -> Self {
        Self::new(ZpeRuntimeConfig::default())
    }
}

impl ZpeRuntime {
    /// Create a new ZPE runtime
    /// 
    /// # Panics
    /// 
    /// Panics if the WASM engine cannot be created. This is a critical error
    /// that indicates a fundamental configuration problem with wasmtime.
    pub fn new(config: ZpeRuntimeConfig) -> Self {
        let mut engine_config = Config::new();
        engine_config.wasm_backtrace_details(WasmBacktraceDetails::Enable);
        engine_config.cranelift_opt_level(OptLevel::Speed);
        
        let engine = Engine::new(&engine_config)
            .expect("Failed to create WASM engine - this indicates a critical configuration error");
        
        ZpeRuntime { engine, config }
    }

    /// Create a new plugin instance from WASM bytes
    pub fn create_instance(&self, wasm_bytes: &[u8]) -> Result<ZpePluginInstance, String> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|e| format!("Failed to compile WASM module: {}", e))?;
        
        ZpePluginInstance::new(&self.engine, &module, &self.config)
    }

    /// Get the engine reference
    pub fn engine(&self) -> &Engine {
        &self.engine
    }
}

/// A running instance of a ZPE plugin
pub struct ZpePluginInstance {
    store: Store<HostState>,
    instance: Instance,
    memory: Memory,
}

/// Host state passed to WASM functions
struct HostState {
    /// HTTP responses for async operations
    _http_responses: Arc<Mutex<HashMap<u32, ZpeHttpResponse>>>,
    /// Next request ID
    _next_request_id: u32,
    /// Runtime config
    _config: ZpeRuntimeConfig,
}

impl ZpePluginInstance {
    /// Create a new plugin instance
    fn new(engine: &Engine, module: &Module, config: &ZpeRuntimeConfig) -> Result<Self, String> {
        let mut store = Store::new(engine, HostState {
            _http_responses: Arc::new(Mutex::new(HashMap::new())),
            _next_request_id: 1,
            _config: config.clone(),
        });

        // Create linker with host functions
        let mut linker = Linker::new(engine);
        
        // Add host functions
        Self::add_host_functions(&mut linker)?;

        // Instantiate the module
        let instance = linker
            .instantiate(&mut store, module)
            .map_err(|e| format!("Failed to instantiate module: {}", e))?;

        // Get the memory export
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| "Module must export 'memory'".to_string())?;

        Ok(ZpePluginInstance {
            store,
            instance,
            memory,
        })
    }

    /// Add host functions to the linker
    fn add_host_functions(linker: &mut Linker<HostState>) -> Result<(), String> {
        // Log function: log_message(ptr: i32, len: i32)
        linker
            .func_wrap("env", "log_message", |mut caller: Caller<'_, HostState>, ptr: i32, len: i32| {
                if let Some(memory) = caller.get_export("memory").and_then(|e| e.into_memory()) {
                    let data = memory.data(&caller);
                    if let Ok(message) = std::str::from_utf8(&data[ptr as usize..(ptr + len) as usize]) {
                        log::info!("[ZPE Plugin] {}", message);
                    }
                }
            })
            .map_err(|e| format!("Failed to add log_message: {}", e))?;

        // Get current timestamp
        linker
            .func_wrap("env", "get_timestamp", || -> i64 {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0)
            })
            .map_err(|e| format!("Failed to add get_timestamp: {}", e))?;

        // Allocate memory for response (plugin should implement this)
        // The plugin needs to export: allocate(size: i32) -> i32

        Ok(())
    }

    /// Call a function that returns JSON
    pub fn call_json_function(&mut self, name: &str, input_json: &str) -> Result<String, String> {
        // Write input to memory
        let input_ptr = self.write_string(input_json)?;
        let input_len = input_json.len() as i32;

        // Get the function
        let func = self.instance
            .get_typed_func::<(i32, i32), i64>(&mut self.store, name)
            .map_err(|e| format!("Function '{}' not found or wrong signature: {}", name, e))?;

        // Call the function - returns ptr and len packed in i64
        let result = func.call(&mut self.store, (input_ptr, input_len))
            .map_err(|e| format!("Function '{}' failed: {}", name, e))?;

        // Unpack result (high 32 bits = ptr, low 32 bits = len)
        let result_ptr = (result >> 32) as i32;
        let result_len = (result & 0xFFFFFFFF) as i32;

        if result_ptr == 0 {
            return Err("Function returned null".to_string());
        }

        // Read result from memory
        self.read_string(result_ptr, result_len)
    }

    /// Write a string to WASM memory
    fn write_string(&mut self, s: &str) -> Result<i32, String> {
        let bytes = s.as_bytes();
        let len = bytes.len() as i32;

        // Call the plugin's allocate function
        let allocate = self.instance
            .get_typed_func::<i32, i32>(&mut self.store, "allocate")
            .map_err(|_| "Plugin must export 'allocate(size: i32) -> i32' function".to_string())?;

        let ptr = allocate.call(&mut self.store, len)
            .map_err(|e| format!("allocate failed: {}", e))?;

        // Write the bytes
        self.memory
            .write(&mut self.store, ptr as usize, bytes)
            .map_err(|e| format!("Failed to write to memory: {}", e))?;

        Ok(ptr)
    }

    /// Read a string from WASM memory
    fn read_string(&self, ptr: i32, len: i32) -> Result<String, String> {
        let mut buffer = vec![0u8; len as usize];
        self.memory
            .read(&self.store, ptr as usize, &mut buffer)
            .map_err(|e| format!("Failed to read from memory: {}", e))?;
        
        String::from_utf8(buffer)
            .map_err(|e| format!("Invalid UTF-8: {}", e))
    }

    /// Call the initialize function
    pub fn initialize(&mut self) -> Result<(), String> {
        // Check if initialize exists
        if let Ok(func) = self.instance.get_typed_func::<(), ()>(&mut self.store, "initialize") {
            func.call(&mut self.store, ())
                .map_err(|e| format!("initialize failed: {}", e))?;
        }
        Ok(())
    }

    /// Call the shutdown function
    pub fn shutdown(&mut self) {
        if let Ok(func) = self.instance.get_typed_func::<(), ()>(&mut self.store, "shutdown") {
            let _ = func.call(&mut self.store, ());
        }
    }

    /// Search for anime
    pub fn search(&mut self, query: &str, page: u32) -> Result<ZpeAnimeList, String> {
        let input = serde_json::json!({
            "query": query,
            "page": page
        });
        
        let result_json = self.call_json_function("zpe_search", &input.to_string())?;
        
        let result: ZpeResult<ZpeAnimeList> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid search result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Get popular anime
    pub fn get_popular(&mut self, page: u32) -> Result<ZpeAnimeList, String> {
        let input = serde_json::json!({ "page": page });
        
        let result_json = self.call_json_function("zpe_get_popular", &input.to_string())?;
        
        let result: ZpeResult<ZpeAnimeList> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Get latest anime
    pub fn get_latest(&mut self, page: u32) -> Result<ZpeAnimeList, String> {
        let input = serde_json::json!({ "page": page });
        
        let result_json = self.call_json_function("zpe_get_latest", &input.to_string())?;
        
        let result: ZpeResult<ZpeAnimeList> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Get episodes for an anime
    pub fn get_episodes(&mut self, anime_id: &str, page: u32) -> Result<ZpeEpisodeList, String> {
        let input = serde_json::json!({
            "animeId": anime_id,
            "page": page
        });
        
        let result_json = self.call_json_function("zpe_get_episodes", &input.to_string())?;
        
        let result: ZpeResult<ZpeEpisodeList> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Get streams for an episode
    pub fn get_streams(&mut self, anime_id: &str, episode_id: &str) -> Result<ZpeStreamSourceList, String> {
        let input = serde_json::json!({
            "animeId": anime_id,
            "episodeId": episode_id
        });
        
        let result_json = self.call_json_function("zpe_get_streams", &input.to_string())?;
        
        let result: ZpeResult<ZpeStreamSourceList> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Get anime details
    pub fn get_anime_details(&mut self, anime_id: &str) -> Result<ZpeAnime, String> {
        let input = serde_json::json!({ "animeId": anime_id });
        
        let result_json = self.call_json_function("zpe_get_anime_details", &input.to_string())?;
        
        let result: ZpeResult<ZpeAnime> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }

    /// Extract stream from URL (for stream providers)
    pub fn extract_stream(&mut self, url: &str) -> Result<ZpeStreamSource, String> {
        let input = serde_json::json!({ "url": url });
        
        let result_json = self.call_json_function("zpe_extract_stream", &input.to_string())?;
        
        let result: ZpeResult<ZpeStreamSource> = serde_json::from_str(&result_json)
            .map_err(|e| format!("Invalid result: {}", e))?;
        
        if result.success {
            result.value.ok_or_else(|| "No value in success result".to_string())
        } else {
            Err(result.error.unwrap_or_else(|| "Unknown error".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_creation() {
        let runtime = ZpeRuntime::default();
        // Verify the engine is created
        let _ = runtime.engine();
    }

    #[test]
    fn test_config_defaults() {
        let config = ZpeRuntimeConfig::default();
        assert_eq!(config.http_timeout, 30);
        assert_eq!(config.max_memory_pages, WASM_MEMORY_MAX_PAGES);
    }
}
