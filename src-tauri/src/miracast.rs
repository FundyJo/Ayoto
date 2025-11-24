use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

/// Represents a Miracast device that can be cast to
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiracastDevice {
    pub id: String,
    pub name: String,
    pub ip_address: String,
    pub is_available: bool,
}

/// Represents the current casting state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CastState {
    pub is_casting: bool,
    pub device_id: Option<String>,
    pub media_url: Option<String>,
}

/// Miracast manager for handling device discovery and casting
pub struct MiracastManager {
    devices: Arc<Mutex<Vec<MiracastDevice>>>,
    cast_state: Arc<Mutex<CastState>>,
}

impl MiracastManager {
    pub fn new() -> Self {
        Self {
            devices: Arc::new(Mutex::new(Vec::new())),
            cast_state: Arc::new(Mutex::new(CastState {
                is_casting: false,
                device_id: None,
                media_url: None,
            })),
        }
    }
    
    /// Scan for available Miracast devices
    pub async fn scan_devices(&self) -> Result<Vec<MiracastDevice>, Box<dyn std::error::Error>> {
        // In a real implementation, this would use platform-specific APIs
        // For now, we'll return a mock device for demonstration
        let mut devices = self.devices.lock().await;
        devices.clear();
        
        // Mock device for demonstration
        #[cfg(debug_assertions)]
        {
            devices.push(MiracastDevice {
                id: "demo-device-1".to_string(),
                name: "Demo TV".to_string(),
                ip_address: "192.168.1.100".to_string(),
                is_available: true,
            });
        }
        
        Ok(devices.clone())
    }
    
    /// Start casting to a specific device
    pub async fn start_cast(&self, device_id: &str, media_url: &str) -> Result<(), Box<dyn std::error::Error>> {
        let devices = self.devices.lock().await;
        
        if !devices.iter().any(|d| d.id == device_id) {
            return Err("Device not found".into());
        }
        
        let mut state = self.cast_state.lock().await;
        state.is_casting = true;
        state.device_id = Some(device_id.to_string());
        state.media_url = Some(media_url.to_string());
        
        // In a real implementation, this would initiate the casting protocol
        Ok(())
    }
    
    /// Stop current casting session
    pub async fn stop_cast(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.cast_state.lock().await;
        state.is_casting = false;
        state.device_id = None;
        state.media_url = None;
        
        Ok(())
    }
    
    /// Get current cast state
    pub async fn get_cast_state(&self) -> CastState {
        self.cast_state.lock().await.clone()
    }
}

impl Default for MiracastManager {
    fn default() -> Self {
        Self::new()
    }
}
