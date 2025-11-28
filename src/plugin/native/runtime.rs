//! Plugin Runtime and HTTP Context
//! 
//! Provides the runtime environment for plugins, including HTTP client
//! functionality for web scraping operations.

use std::collections::HashMap;
use super::ffi_types::*;
use super::plugin_trait::HttpContext;

// ============================================================================
// Plugin Runtime
// ============================================================================

/// Runtime environment for plugins
/// 
/// Provides services that plugins can use, such as HTTP requests,
/// caching, and logging.
pub struct PluginRuntime {
    /// User agent for HTTP requests
    user_agent: String,
    /// Default request timeout
    timeout: u32,
    /// Plugin data directory
    data_dir: Option<String>,
    /// Plugin cache directory
    cache_dir: Option<String>,
}

impl Default for PluginRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl PluginRuntime {
    /// Create a new plugin runtime
    pub fn new() -> Self {
        PluginRuntime {
            user_agent: format!("Ayoto/{}", env!("CARGO_PKG_VERSION")),
            timeout: 30,
            data_dir: None,
            cache_dir: None,
        }
    }

    /// Set the user agent
    pub fn with_user_agent(mut self, user_agent: String) -> Self {
        self.user_agent = user_agent;
        self
    }

    /// Set the default timeout
    pub fn with_timeout(mut self, timeout: u32) -> Self {
        self.timeout = timeout;
        self
    }

    /// Set the data directory
    pub fn with_data_dir(mut self, data_dir: String) -> Self {
        self.data_dir = Some(data_dir);
        self
    }

    /// Set the cache directory
    pub fn with_cache_dir(mut self, cache_dir: String) -> Self {
        self.cache_dir = Some(cache_dir);
        self
    }

    /// Create an HTTP context for plugins
    pub fn create_http_context(&self) -> HttpContext {
        HttpContext {
            request_fn: Some(execute_http_request),
            user_agent: self.user_agent.clone(),
            default_timeout: self.timeout,
        }
    }

    /// Create plugin configuration
    pub fn create_plugin_config(&self) -> FfiPluginConfig {
        FfiPluginConfig {
            data_dir: self.data_dir.clone(),
            cache_dir: self.cache_dir.clone(),
            capabilities: CAPABILITY_HTTP | CAPABILITY_LOGGING,
            user_agent: self.user_agent.clone(),
            ayoto_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

// ============================================================================
// HTTP Request Execution
// ============================================================================

/// Execute an HTTP request (sync version for FFI)
/// 
/// This is a blocking function that executes HTTP requests.
/// For async contexts, use the async version.
fn execute_http_request(req: &FfiHttpRequest) -> FfiHttpResponse {
    // Note: This is a synchronous implementation using std library
    // In production, you might want to use reqwest with tokio runtime
    
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::Duration;

    if req.url.is_empty() {
        return FfiHttpResponse {
            status_code: 0,
            body: "Empty URL".to_string(),
            ..Default::default()
        };
    }

    // Parse URL
    let url_result = parse_url(&req.url);
    let (host, port, path) = match url_result {
        Ok(parts) => parts,
        Err(e) => {
            return FfiHttpResponse {
                status_code: 0,
                body: format!("Invalid URL: {}", e),
                ..Default::default()
            };
        }
    };

    // Build request
    let method = match req.method {
        HTTP_METHOD_GET => "GET",
        HTTP_METHOD_POST => "POST",
        HTTP_METHOD_PUT => "PUT",
        HTTP_METHOD_DELETE => "DELETE",
        HTTP_METHOD_HEAD => "HEAD",
        _ => "GET",
    };

    let body_str = req.body.as_deref().unwrap_or("");
    
    let mut request = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n",
        method, path, host
    );

    // Add headers
    for (key, value) in &req.headers {
        request.push_str(&format!("{}: {}\r\n", key, value));
    }

    // Add body if present
    if !body_str.is_empty() {
        request.push_str(&format!("Content-Length: {}\r\n", body_str.len()));
    }

    request.push_str("\r\n");
    
    if !body_str.is_empty() {
        request.push_str(body_str);
    }

    // Connect and send request
    let timeout = if req.timeout_secs > 0 { req.timeout_secs } else { 30 };
    let addr = format!("{}:{}", host, port);
    
    match TcpStream::connect(&addr) {
        Ok(mut stream) => {
            stream.set_read_timeout(Some(Duration::from_secs(timeout as u64))).ok();
            stream.set_write_timeout(Some(Duration::from_secs(timeout as u64))).ok();

            if stream.write_all(request.as_bytes()).is_err() {
                return FfiHttpResponse {
                    status_code: 0,
                    body: "Failed to send request".to_string(),
                    ..Default::default()
                };
            }

            let mut response = Vec::new();
            if stream.read_to_end(&mut response).is_err() {
                return FfiHttpResponse {
                    status_code: 0,
                    body: "Failed to read response".to_string(),
                    ..Default::default()
                };
            }

            parse_http_response(&response)
        }
        Err(e) => {
            FfiHttpResponse {
                status_code: 0,
                body: format!("Connection failed: {}", e),
                ..Default::default()
            }
        }
    }
}

/// Parse a URL into host, port, and path components
fn parse_url(url: &str) -> Result<(String, u16, String), String> {
    let url = url.trim();
    
    // Check for protocol
    let (host_and_path, default_port) = if url.starts_with("https://") {
        (&url[8..], 443u16)
    } else if url.starts_with("http://") {
        (&url[7..], 80u16)
    } else {
        (url, 80u16)
    };

    // Split host and path
    let (host_port, path) = match host_and_path.find('/') {
        Some(idx) => (&host_and_path[..idx], &host_and_path[idx..]),
        None => (host_and_path, "/"),
    };

    // Parse port
    let (host, port) = match host_port.find(':') {
        Some(idx) => {
            let host = &host_port[..idx];
            let port_str = &host_port[idx + 1..];
            let port = port_str.parse().map_err(|_| format!("Invalid port: {}", port_str))?;
            (host.to_string(), port)
        }
        None => (host_port.to_string(), default_port),
    };

    Ok((host, port, path.to_string()))
}

/// Parse an HTTP response
fn parse_http_response(data: &[u8]) -> FfiHttpResponse {
    let response_str = String::from_utf8_lossy(data);
    
    // Find header/body separator
    let (header_part, body_part) = match response_str.find("\r\n\r\n") {
        Some(idx) => (&response_str[..idx], &response_str[idx + 4..]),
        None => (response_str.as_ref(), ""),
    };

    // Parse status code from first line
    let mut lines = header_part.lines();
    let status_line = lines.next().unwrap_or("");
    let status_code = parse_status_code(status_line);

    // Parse headers
    let mut headers = HashMap::new();
    for line in lines {
        if let Some(idx) = line.find(':') {
            let key = line[..idx].trim().to_lowercase();
            let value = line[idx + 1..].trim().to_string();
            headers.insert(key, value);
        }
    }

    FfiHttpResponse {
        status_code,
        body: body_part.to_string(),
        headers,
        final_url: None,
    }
}

/// Parse status code from HTTP status line
fn parse_status_code(status_line: &str) -> u16 {
    // Format: "HTTP/1.1 200 OK"
    let parts: Vec<&str> = status_line.split_whitespace().collect();
    if parts.len() >= 2 {
        parts[1].parse().unwrap_or(0)
    } else {
        0
    }
}

// ============================================================================
// Async HTTP Client (for Tauri integration)
// ============================================================================

/// Async HTTP request helper for use within Tauri commands
pub struct AsyncHttpClient {
    user_agent: String,
    timeout: u32,
}

impl Default for AsyncHttpClient {
    fn default() -> Self {
        Self::new()
    }
}

impl AsyncHttpClient {
    pub fn new() -> Self {
        AsyncHttpClient {
            user_agent: format!("Ayoto/{}", env!("CARGO_PKG_VERSION")),
            timeout: 30,
        }
    }

    /// Convert FFI request to async response
    /// This is used when integrating with Tauri's HTTP plugin
    pub async fn execute(&self, req: &FfiHttpRequest) -> FfiHttpResponse {
        // For now, delegate to sync implementation
        // In production, this would use reqwest or similar
        execute_http_request(req)
    }
}

// ============================================================================
// Logging Bridge
// ============================================================================

/// Log levels for plugin logging
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub enum PluginLogLevel {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Warn = 3,
    Error = 4,
}

/// Log a message from a plugin
pub fn plugin_log(level: PluginLogLevel, plugin_id: &str, message: &str) {
    match level {
        PluginLogLevel::Trace => log::trace!("[{}] {}", plugin_id, message),
        PluginLogLevel::Debug => log::debug!("[{}] {}", plugin_id, message),
        PluginLogLevel::Info => log::info!("[{}] {}", plugin_id, message),
        PluginLogLevel::Warn => log::warn!("[{}] {}", plugin_id, message),
        PluginLogLevel::Error => log::error!("[{}] {}", plugin_id, message),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_parsing() {
        let (host, port, path) = parse_url("http://example.com/path").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 80);
        assert_eq!(path, "/path");

        let (host, port, path) = parse_url("https://example.com:8080/api/v1").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 8080);
        assert_eq!(path, "/api/v1");

        let (host, port, path) = parse_url("https://example.com").unwrap();
        assert_eq!(host, "example.com");
        assert_eq!(port, 443);
        assert_eq!(path, "/");
    }

    #[test]
    fn test_status_code_parsing() {
        assert_eq!(parse_status_code("HTTP/1.1 200 OK"), 200);
        assert_eq!(parse_status_code("HTTP/1.1 404 Not Found"), 404);
        assert_eq!(parse_status_code("HTTP/1.0 500 Internal Server Error"), 500);
        assert_eq!(parse_status_code("Invalid"), 0);
    }

    #[test]
    fn test_plugin_runtime_creation() {
        let runtime = PluginRuntime::new()
            .with_user_agent("TestAgent/1.0".to_string())
            .with_timeout(60);

        let http_context = runtime.create_http_context();
        assert_eq!(http_context.user_agent, "TestAgent/1.0");
        assert_eq!(http_context.default_timeout, 60);
    }
}
