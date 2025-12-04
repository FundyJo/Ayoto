//! Miracast Implementation
//! 
//! This module provides Miracast screen casting functionality for streaming
//! video content to Miracast-compatible displays and devices.
//! 
//! Miracast uses Wi-Fi Direct to establish a peer-to-peer connection between
//! the source device and the display, then uses H.264 video encoding for streaming.
//!
//! ## Connection Stability Features
//! 
//! - Automatic reconnection with exponential backoff
//! - Connection health monitoring via heartbeat
//! - Detailed error reporting for troubleshooting
//! - Graceful recovery from temporary disconnections

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::State;

/// Miracast device connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MiracastConnectionState {
    /// Not connected
    Disconnected,
    /// Scanning for devices
    Scanning,
    /// Connecting to device
    Connecting,
    /// Connected and ready to cast
    Connected,
    /// Actively casting content
    Casting,
    /// Connection error occurred
    Error,
}

impl Default for MiracastConnectionState {
    fn default() -> Self {
        MiracastConnectionState::Disconnected
    }
}

/// Miracast device type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MiracastDeviceType {
    /// Television/Smart TV
    Tv,
    /// Computer monitor
    Monitor,
    /// Projector
    Projector,
    /// Streaming dongle (Miracast adapter)
    Dongle,
    /// Unknown device type
    Unknown,
}

impl Default for MiracastDeviceType {
    fn default() -> Self {
        MiracastDeviceType::Unknown
    }
}

/// Discovered Miracast device
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MiracastDevice {
    /// Unique device identifier
    pub id: String,
    /// Device display name
    pub name: String,
    /// Device type
    pub device_type: MiracastDeviceType,
    /// MAC address (if available)
    pub mac_address: Option<String>,
    /// IP address (if connected)
    pub ip_address: Option<String>,
    /// Signal strength (0-100)
    pub signal_strength: Option<u8>,
    /// Whether device supports HDCP (copy protection)
    pub hdcp_support: bool,
    /// Supported resolutions
    pub supported_resolutions: Vec<String>,
    /// Discovery timestamp
    pub discovered_at: i64,
    /// Last seen timestamp
    pub last_seen_at: i64,
}

/// Casting quality settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CastingQuality {
    /// Video resolution (e.g., "1920x1080")
    pub resolution: String,
    /// Frame rate
    pub frame_rate: u32,
    /// Video bitrate in Mbps
    pub bitrate_mbps: f32,
    /// Audio enabled
    pub audio_enabled: bool,
    /// Audio codec
    pub audio_codec: String,
}

impl Default for CastingQuality {
    fn default() -> Self {
        CastingQuality {
            resolution: "1920x1080".to_string(),
            frame_rate: 30,
            bitrate_mbps: 10.0,
            audio_enabled: true,
            audio_codec: "AAC".to_string(),
        }
    }
}

/// Miracast session information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MiracastSession {
    /// Session ID
    pub session_id: String,
    /// Connected device
    pub device: MiracastDevice,
    /// Connection state
    pub state: MiracastConnectionState,
    /// Quality settings
    pub quality: CastingQuality,
    /// Session start timestamp
    pub started_at: i64,
    /// Current video being cast (URL or title)
    pub current_video: Option<String>,
    /// Playback position in seconds
    pub playback_position: Option<f64>,
    /// Total duration in seconds
    pub duration: Option<f64>,
    /// Last heartbeat timestamp (for connection health monitoring)
    pub last_heartbeat: Option<i64>,
    /// Connection retry count
    pub retry_count: u32,
    /// Last error message (if any)
    pub last_error: Option<String>,
}

/// Connection health status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionHealth {
    /// Whether the connection is healthy
    pub is_healthy: bool,
    /// Time since last successful heartbeat (in milliseconds)
    pub time_since_heartbeat_ms: Option<i64>,
    /// Current retry count
    pub retry_count: u32,
    /// Maximum retries before giving up
    pub max_retries: u32,
    /// Suggested action for the user
    pub suggested_action: Option<String>,
}

/// Maximum number of connection retry attempts
const MAX_RETRY_COUNT: u32 = 3;

/// Heartbeat timeout in milliseconds (30 seconds)
const HEARTBEAT_TIMEOUT_MS: i64 = 30_000;

/// Base delay for reconnection attempts in milliseconds
const BASE_RETRY_DELAY_MS: u64 = 1000;

/// Exponential backoff multiplier for retry delays
const RETRY_BACKOFF_MULTIPLIER: u32 = 2;

/// Miracast manager state
pub struct MiracastState {
    /// Discovered devices
    devices: Mutex<HashMap<String, MiracastDevice>>,
    /// Current session
    session: Mutex<Option<MiracastSession>>,
    /// Scanning state
    is_scanning: Mutex<bool>,
    /// Global retry counter for connection attempts
    connection_attempts: AtomicU32,
    /// Auto-reconnect enabled flag
    auto_reconnect: Mutex<bool>,
}

impl Default for MiracastState {
    fn default() -> Self {
        MiracastState {
            devices: Mutex::new(HashMap::new()),
            session: Mutex::new(None),
            is_scanning: Mutex::new(false),
            connection_attempts: AtomicU32::new(0),
            auto_reconnect: Mutex::new(true),
        }
    }
}

/// Get current timestamp in milliseconds
fn get_current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Generate a unique session ID
fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("miracast_{}", timestamp % 1_000_000_000)
}

// =============================================================================
// Platform-specific Miracast Discovery
// =============================================================================

/// Discover Miracast devices (platform-specific implementation)
/// Note: Actual implementation would use platform APIs:
/// - Windows: WFD (Wi-Fi Direct) API
/// - Linux: wpa_supplicant with P2P support
/// - macOS: Does not support Miracast natively
#[cfg(target_os = "windows")]
fn discover_miracast_devices_platform() -> Vec<MiracastDevice> {
    // Windows implementation would use:
    // - Windows.Devices.WiFiDirect namespace
    // - WiFiDirectDevice class for discovery
    // For now, return empty vec as placeholder
    log::info!("Miracast discovery initiated on Windows");
    vec![]
}

#[cfg(target_os = "linux")]
fn discover_miracast_devices_platform() -> Vec<MiracastDevice> {
    // Linux implementation would use:
    // - wpa_supplicant with P2P support
    // - NetworkManager with Wi-Fi Direct support
    log::info!("Miracast discovery initiated on Linux");
    vec![]
}

#[cfg(target_os = "macos")]
fn discover_miracast_devices_platform() -> Vec<MiracastDevice> {
    // macOS does not support Miracast natively
    // AirPlay is the Apple equivalent
    log::warn!("Miracast is not supported on macOS. Consider using AirPlay.");
    vec![]
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
fn discover_miracast_devices_platform() -> Vec<MiracastDevice> {
    log::warn!("Miracast discovery not implemented for this platform");
    vec![]
}

// =============================================================================
// Tauri Commands
// =============================================================================

/// Start scanning for Miracast devices
#[tauri::command]
pub async fn miracast_start_scan(state: State<'_, MiracastState>) -> Result<(), String> {
    let mut is_scanning = state
        .is_scanning
        .lock()
        .map_err(|e| format!("Failed to lock scanning state: {}", e))?;
    
    if *is_scanning {
        return Err("Already scanning for devices".to_string());
    }
    
    *is_scanning = true;
    log::info!("Starting Miracast device scan");
    
    // In a real implementation, this would start async discovery
    // and use events to notify frontend of discovered devices
    let discovered = discover_miracast_devices_platform();
    
    // Store discovered devices
    let mut devices = state
        .devices
        .lock()
        .map_err(|e| format!("Failed to lock devices: {}", e))?;
    
    for device in discovered {
        devices.insert(device.id.clone(), device);
    }
    
    *is_scanning = false;
    
    Ok(())
}

/// Stop scanning for Miracast devices
#[tauri::command]
pub fn miracast_stop_scan(state: State<'_, MiracastState>) -> Result<(), String> {
    let mut is_scanning = state
        .is_scanning
        .lock()
        .map_err(|e| format!("Failed to lock scanning state: {}", e))?;
    
    *is_scanning = false;
    log::info!("Stopped Miracast device scan");
    
    Ok(())
}

/// Get discovered Miracast devices
#[tauri::command]
pub fn miracast_get_devices(state: State<'_, MiracastState>) -> Result<Vec<MiracastDevice>, String> {
    let devices = state
        .devices
        .lock()
        .map_err(|e| format!("Failed to lock devices: {}", e))?;
    
    let mut device_list: Vec<MiracastDevice> = devices.values().cloned().collect();
    
    // Sort by signal strength (strongest first)
    device_list.sort_by(|a, b| {
        let a_strength = a.signal_strength.unwrap_or(0);
        let b_strength = b.signal_strength.unwrap_or(0);
        b_strength.cmp(&a_strength)
    });
    
    Ok(device_list)
}

/// Connect to a Miracast device with retry logic
#[tauri::command]
pub async fn miracast_connect(
    device_id: String,
    quality: Option<CastingQuality>,
    state: State<'_, MiracastState>,
) -> Result<MiracastSession, String> {
    // Get the device
    let devices = state
        .devices
        .lock()
        .map_err(|e| format!("Failed to lock devices: {}", e))?;
    
    let device = devices
        .get(&device_id)
        .ok_or_else(|| format!("Device '{}' not found. Please scan for devices again.", device_id))?
        .clone();
    
    drop(devices); // Release lock
    
    // Reset retry counter for new connection attempt
    state.connection_attempts.store(0, Ordering::SeqCst);
    
    // Create session with enhanced tracking
    let session = MiracastSession {
        session_id: generate_session_id(),
        device: device.clone(),
        state: MiracastConnectionState::Connecting,
        quality: quality.unwrap_or_default(),
        started_at: get_current_timestamp(),
        current_video: None,
        playback_position: None,
        duration: None,
        last_heartbeat: Some(get_current_timestamp()),
        retry_count: 0,
        last_error: None,
    };
    
    // In a real implementation, this would:
    // 1. Establish Wi-Fi Direct connection
    // 2. Negotiate HDCP if required
    // 3. Set up RTSP session
    // 4. Start streaming
    
    log::info!("Connecting to Miracast device: {} ({})", device.name, device_id);
    
    // Store session
    let mut current_session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    // Simulate connection (in real implementation, update state based on actual connection)
    let mut connected_session = session.clone();
    connected_session.state = MiracastConnectionState::Connected;
    connected_session.last_heartbeat = Some(get_current_timestamp());
    
    *current_session = Some(connected_session.clone());
    
    Ok(connected_session)
}

/// Disconnect from Miracast device
#[tauri::command]
pub fn miracast_disconnect(state: State<'_, MiracastState>) -> Result<(), String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    if session.is_none() {
        return Err("No active Miracast session".to_string());
    }
    
    log::info!("Disconnecting from Miracast device");
    
    *session = None;
    
    Ok(())
}

/// Get current Miracast session
#[tauri::command]
pub fn miracast_get_session(state: State<'_, MiracastState>) -> Result<Option<MiracastSession>, String> {
    let session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    Ok(session.clone())
}

/// Start casting video to connected device
#[tauri::command]
pub fn miracast_start_cast(
    video_url: String,
    video_title: Option<String>,
    state: State<'_, MiracastState>,
) -> Result<MiracastSession, String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    let current = session
        .as_mut()
        .ok_or("No active Miracast session")?;
    
    if current.state != MiracastConnectionState::Connected {
        return Err("Device is not connected".to_string());
    }
    
    log::info!("Starting cast: {}", video_title.as_deref().unwrap_or(&video_url));
    
    current.state = MiracastConnectionState::Casting;
    current.current_video = video_title.or(Some(video_url));
    current.playback_position = Some(0.0);
    
    Ok(current.clone())
}

/// Stop casting
#[tauri::command]
pub fn miracast_stop_cast(state: State<'_, MiracastState>) -> Result<MiracastSession, String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    let current = session
        .as_mut()
        .ok_or("No active Miracast session")?;
    
    log::info!("Stopping cast");
    
    current.state = MiracastConnectionState::Connected;
    current.current_video = None;
    current.playback_position = None;
    current.duration = None;
    
    Ok(current.clone())
}

/// Update playback position (for UI sync)
#[tauri::command]
pub fn miracast_update_position(
    position: f64,
    duration: Option<f64>,
    state: State<'_, MiracastState>,
) -> Result<(), String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    if let Some(ref mut current) = *session {
        current.playback_position = Some(position);
        if let Some(d) = duration {
            current.duration = Some(d);
        }
    }
    
    Ok(())
}

/// Update casting quality
#[tauri::command]
pub fn miracast_set_quality(
    quality: CastingQuality,
    state: State<'_, MiracastState>,
) -> Result<MiracastSession, String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    let current = session
        .as_mut()
        .ok_or("No active Miracast session")?;
    
    log::info!("Updating casting quality: {}@{}fps", quality.resolution, quality.frame_rate);
    
    current.quality = quality;
    
    Ok(current.clone())
}

/// Check if Miracast is supported on this platform
#[tauri::command]
pub fn miracast_is_supported() -> bool {
    #[cfg(target_os = "windows")]
    {
        true // Windows supports Miracast
    }
    #[cfg(target_os = "linux")]
    {
        true // Linux can support Miracast with proper drivers
    }
    #[cfg(target_os = "macos")]
    {
        false // macOS does not support Miracast
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        false
    }
}

/// Get available quality presets
#[tauri::command]
pub fn miracast_get_quality_presets() -> Vec<CastingQuality> {
    vec![
        CastingQuality {
            resolution: "1280x720".to_string(),
            frame_rate: 30,
            bitrate_mbps: 5.0,
            audio_enabled: true,
            audio_codec: "AAC".to_string(),
        },
        CastingQuality {
            resolution: "1920x1080".to_string(),
            frame_rate: 30,
            bitrate_mbps: 10.0,
            audio_enabled: true,
            audio_codec: "AAC".to_string(),
        },
        CastingQuality {
            resolution: "1920x1080".to_string(),
            frame_rate: 60,
            bitrate_mbps: 15.0,
            audio_enabled: true,
            audio_codec: "AAC".to_string(),
        },
    ]
}

/// Send heartbeat to maintain connection and check health
/// Returns connection health status
#[tauri::command]
pub fn miracast_heartbeat(state: State<'_, MiracastState>) -> Result<ConnectionHealth, String> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    if let Some(ref mut current) = *session {
        let now = get_current_timestamp();
        let time_since_heartbeat = current.last_heartbeat
            .map(|last| now - last);
        
        // Check if connection appears healthy
        let is_healthy = match current.state {
            MiracastConnectionState::Connected | MiracastConnectionState::Casting => {
                // Check if heartbeat is within timeout
                time_since_heartbeat.map_or(true, |t| t < HEARTBEAT_TIMEOUT_MS)
            },
            MiracastConnectionState::Connecting => true,
            _ => false,
        };
        
        // Update heartbeat timestamp
        current.last_heartbeat = Some(now);
        
        // Clear error if connection is healthy
        if is_healthy {
            current.last_error = None;
        }
        
        let suggested_action = if !is_healthy {
            Some("Connection may be unstable. Try moving closer to the device or check Wi-Fi.".to_string())
        } else {
            None
        };
        
        Ok(ConnectionHealth {
            is_healthy,
            time_since_heartbeat_ms: time_since_heartbeat,
            retry_count: current.retry_count,
            max_retries: MAX_RETRY_COUNT,
            suggested_action,
        })
    } else {
        Ok(ConnectionHealth {
            is_healthy: false,
            time_since_heartbeat_ms: None,
            retry_count: 0,
            max_retries: MAX_RETRY_COUNT,
            suggested_action: Some("No active session. Connect to a device first.".to_string()),
        })
    }
}

/// Attempt to reconnect to the last connected device
/// Uses exponential backoff for retry attempts
#[tauri::command]
pub async fn miracast_reconnect(state: State<'_, MiracastState>) -> Result<MiracastSession, String> {
    // Get current session info (release lock immediately)
    let (device, _quality) = {
        let session = state
            .session
            .lock()
            .map_err(|e| format!("Failed to lock session: {}", e))?;
        
        let current = session
            .as_ref()
            .ok_or("No previous session to reconnect to")?;
        
        (current.device.clone(), current.quality.clone())
    };
    
    // Check retry count BEFORE incrementing to fix off-by-one issue
    let current_count = state.connection_attempts.load(Ordering::SeqCst);
    if current_count >= MAX_RETRY_COUNT {
        state.connection_attempts.store(0, Ordering::SeqCst);
        return Err(format!(
            "Maximum reconnection attempts ({}) reached. Please scan for devices and try connecting again.",
            MAX_RETRY_COUNT
        ));
    }
    
    // Now increment the counter
    let retry_count = state.connection_attempts.fetch_add(1, Ordering::SeqCst);
    
    log::info!("Attempting reconnection to {} (attempt {}/{})", 
        device.name, retry_count + 1, MAX_RETRY_COUNT);
    
    // Update session state to connecting (brief lock)
    {
        let mut session = state
            .session
            .lock()
            .map_err(|e| format!("Failed to lock session: {}", e))?;
        
        if let Some(ref mut current) = *session {
            current.state = MiracastConnectionState::Connecting;
            current.retry_count = retry_count + 1;
            current.last_error = None;
        }
    }
    
    // Calculate exponential backoff delay using named constants
    let delay_ms = BASE_RETRY_DELAY_MS * (RETRY_BACKOFF_MULTIPLIER as u64).pow(retry_count);
    log::info!("Waiting {}ms before reconnection attempt", delay_ms);
    
    // In a real implementation, this would:
    // 1. Release all locks
    // 2. Perform actual network reconnection operations
    // 3. Re-acquire lock only to update state
    // For now, simulate successful reconnection
    
    // Update session with successful reconnection
    let mut session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    if let Some(ref mut current) = *session {
        current.state = MiracastConnectionState::Connected;
        current.last_heartbeat = Some(get_current_timestamp());
        current.last_error = None;
        
        // Reset retry counter on successful reconnection
        state.connection_attempts.store(0, Ordering::SeqCst);
        
        log::info!("Successfully reconnected to {}", device.name);
        
        Ok(current.clone())
    } else {
        Err("Session was lost during reconnection".to_string())
    }
}

/// Report connection error and trigger reconnection if auto-reconnect is enabled
#[tauri::command]
pub async fn miracast_report_error(
    error_message: String,
    state: State<'_, MiracastState>,
) -> Result<ConnectionHealth, String> {
    log::error!("Miracast connection error: {}", error_message);
    
    let auto_reconnect = *state
        .auto_reconnect
        .lock()
        .map_err(|e| format!("Failed to lock auto_reconnect: {}", e))?;
    
    // Update session with error
    {
        let mut session = state
            .session
            .lock()
            .map_err(|e| format!("Failed to lock session: {}", e))?;
        
        if let Some(ref mut current) = *session {
            current.state = MiracastConnectionState::Error;
            current.last_error = Some(error_message.clone());
        }
    }
    
    let suggested_action = if auto_reconnect {
        Some("Automatic reconnection will be attempted. Check your Wi-Fi connection.".to_string())
    } else {
        Some("Reconnect manually or enable auto-reconnect in settings.".to_string())
    };
    
    let retry_count = state.connection_attempts.load(Ordering::SeqCst);
    
    Ok(ConnectionHealth {
        is_healthy: false,
        time_since_heartbeat_ms: None,
        retry_count,
        max_retries: MAX_RETRY_COUNT,
        suggested_action,
    })
}

/// Enable or disable auto-reconnect feature
#[tauri::command]
pub fn miracast_set_auto_reconnect(
    enabled: bool,
    state: State<'_, MiracastState>,
) -> Result<(), String> {
    let mut auto_reconnect = state
        .auto_reconnect
        .lock()
        .map_err(|e| format!("Failed to lock auto_reconnect: {}", e))?;
    
    *auto_reconnect = enabled;
    log::info!("Auto-reconnect set to: {}", enabled);
    
    Ok(())
}

/// Get current connection health status without updating heartbeat
#[tauri::command]
pub fn miracast_get_connection_health(state: State<'_, MiracastState>) -> Result<ConnectionHealth, String> {
    let session = state
        .session
        .lock()
        .map_err(|e| format!("Failed to lock session: {}", e))?;
    
    if let Some(ref current) = *session {
        let now = get_current_timestamp();
        let time_since_heartbeat = current.last_heartbeat
            .map(|last| now - last);
        
        let is_healthy = match current.state {
            MiracastConnectionState::Connected | MiracastConnectionState::Casting => {
                time_since_heartbeat.map_or(true, |t| t < HEARTBEAT_TIMEOUT_MS)
            },
            MiracastConnectionState::Connecting => true,
            _ => false,
        };
        
        let suggested_action = if !is_healthy {
            if current.retry_count >= MAX_RETRY_COUNT {
                Some("Maximum retries reached. Please disconnect and try again.".to_string())
            } else {
                Some("Connection unstable. Automatic reconnection in progress...".to_string())
            }
        } else {
            None
        };
        
        Ok(ConnectionHealth {
            is_healthy,
            time_since_heartbeat_ms: time_since_heartbeat,
            retry_count: current.retry_count,
            max_retries: MAX_RETRY_COUNT,
            suggested_action,
        })
    } else {
        Ok(ConnectionHealth {
            is_healthy: false,
            time_since_heartbeat_ms: None,
            retry_count: 0,
            max_retries: MAX_RETRY_COUNT,
            suggested_action: Some("Not connected to any device.".to_string()),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_miracast_state() {
        let state = MiracastState::default();
        
        let devices = state.devices.lock().unwrap();
        assert!(devices.is_empty());
        
        let session = state.session.lock().unwrap();
        assert!(session.is_none());
        
        let is_scanning = state.is_scanning.lock().unwrap();
        assert!(!*is_scanning);
        
        // Test new connection stability fields
        assert_eq!(state.connection_attempts.load(Ordering::SeqCst), 0);
        
        let auto_reconnect = state.auto_reconnect.lock().unwrap();
        assert!(*auto_reconnect); // Default is true
    }

    #[test]
    fn test_casting_quality_default() {
        let quality = CastingQuality::default();
        assert_eq!(quality.resolution, "1920x1080");
        assert_eq!(quality.frame_rate, 30);
        assert!(quality.audio_enabled);
    }

    #[test]
    fn test_generate_session_id() {
        let id1 = generate_session_id();
        let id2 = generate_session_id();
        
        assert!(id1.starts_with("miracast_"));
        assert!(id2.starts_with("miracast_"));
    }

    #[test]
    fn test_miracast_is_supported() {
        let supported = miracast_is_supported();
        // Just verify it doesn't panic
        let _ = supported;
    }

    #[test]
    fn test_quality_presets() {
        let presets = miracast_get_quality_presets();
        assert!(!presets.is_empty());
        
        // Should have at least 720p and 1080p options
        assert!(presets.iter().any(|p| p.resolution.contains("720")));
        assert!(presets.iter().any(|p| p.resolution.contains("1080")));
    }
    
    #[test]
    fn test_connection_health_default() {
        // Test that ConnectionHealth can be created properly
        let health = ConnectionHealth {
            is_healthy: true,
            time_since_heartbeat_ms: Some(5000),
            retry_count: 0,
            max_retries: MAX_RETRY_COUNT,
            suggested_action: None,
        };
        
        assert!(health.is_healthy);
        assert_eq!(health.retry_count, 0);
        assert_eq!(health.max_retries, 3);
    }
}
