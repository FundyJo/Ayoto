//! Anime4K Shader Support via Rust
//! 
//! This module provides high-performance Anime4K shader configuration and management
//! through the Rust backend. It handles shader preset definitions, GPU capability detection,
//! and configuration persistence.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Performance level for Anime4K presets
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PerformanceLevel {
    None,
    Low,
    LowMedium,
    Medium,
    MediumHigh,
    High,
    VeryHigh,
}

impl Default for PerformanceLevel {
    fn default() -> Self {
        PerformanceLevel::None
    }
}

/// Anime4K shader preset
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Anime4KPreset {
    /// Unique preset identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// Description of the preset
    pub description: String,
    /// Performance requirement level
    pub performance: PerformanceLevel,
    /// List of shaders in this preset
    pub shaders: Vec<String>,
}

/// Performance requirements for running Anime4K
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceRequirements {
    /// Minimum VRAM in GB
    pub min_vram_gb: u32,
    /// Minimum GPU description
    pub min_gpu: String,
    /// Estimated FPS
    pub estimated_fps: String,
}

/// Anime4K configuration state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Anime4KConfig {
    /// Whether Anime4K is enabled
    pub enabled: bool,
    /// Currently selected preset ID
    pub preset_id: String,
    /// Custom CSS filter approximation for WebGL fallback
    pub css_filter: Option<String>,
}

impl Default for Anime4KConfig {
    fn default() -> Self {
        Anime4KConfig {
            enabled: false,
            preset_id: "none".to_string(),
            css_filter: None,
        }
    }
}

/// GPU information detected from the system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    /// GPU vendor
    pub vendor: String,
    /// GPU renderer/model
    pub renderer: String,
    /// Estimated VRAM in GB (may not be accurate)
    pub estimated_vram_gb: Option<u32>,
    /// Whether WebGL 2 is supported
    pub webgl2_support: bool,
}

/// Application state for Anime4K
pub struct Anime4KState {
    pub config: Mutex<Anime4KConfig>,
}

impl Default for Anime4KState {
    fn default() -> Self {
        Anime4KState {
            config: Mutex::new(Anime4KConfig::default()),
        }
    }
}

/// Get all available Anime4K presets
pub fn get_all_presets() -> Vec<Anime4KPreset> {
    vec![
        Anime4KPreset {
            id: "none".to_string(),
            name: "Off".to_string(),
            description: "No upscaling shaders".to_string(),
            performance: PerformanceLevel::None,
            shaders: vec![],
        },
        Anime4KPreset {
            id: "mode-a".to_string(),
            name: "Mode A (Fast)".to_string(),
            description: "Optimized for weak GPUs, minimal quality improvement".to_string(),
            performance: PerformanceLevel::Low,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Restore_CNN_S".to_string(),
                "Anime4K_Upscale_CNN_x2_S".to_string(),
            ],
        },
        Anime4KPreset {
            id: "mode-b".to_string(),
            name: "Mode B (Balanced)".to_string(),
            description: "Balanced quality and performance".to_string(),
            performance: PerformanceLevel::Medium,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Restore_CNN_Soft_M".to_string(),
                "Anime4K_Upscale_CNN_x2_M".to_string(),
            ],
        },
        Anime4KPreset {
            id: "mode-c".to_string(),
            name: "Mode C (High Quality)".to_string(),
            description: "High quality, requires powerful GPU".to_string(),
            performance: PerformanceLevel::High,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Upscale_Denoise_CNN_x2_VL".to_string(),
                "Anime4K_AutoDownscalePre_x2".to_string(),
                "Anime4K_AutoDownscalePre_x4".to_string(),
                "Anime4K_Upscale_CNN_x2_L".to_string(),
            ],
        },
        Anime4KPreset {
            id: "mode-a+a".to_string(),
            name: "Mode A+A".to_string(),
            description: "Fast mode with line art enhancement".to_string(),
            performance: PerformanceLevel::LowMedium,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Restore_CNN_S".to_string(),
                "Anime4K_Upscale_CNN_x2_S".to_string(),
                "Anime4K_Restore_CNN_S".to_string(),
                "Anime4K_AutoDownscalePre_x2".to_string(),
                "Anime4K_Upscale_CNN_x2_S".to_string(),
            ],
        },
        Anime4KPreset {
            id: "mode-b+b".to_string(),
            name: "Mode B+B".to_string(),
            description: "Balanced mode with enhanced details".to_string(),
            performance: PerformanceLevel::MediumHigh,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Restore_CNN_Soft_M".to_string(),
                "Anime4K_Upscale_CNN_x2_M".to_string(),
                "Anime4K_AutoDownscalePre_x2".to_string(),
                "Anime4K_Restore_CNN_Soft_M".to_string(),
                "Anime4K_Upscale_CNN_x2_M".to_string(),
            ],
        },
        Anime4KPreset {
            id: "mode-c+a".to_string(),
            name: "Mode C+A (Best)".to_string(),
            description: "Best quality, requires very powerful GPU".to_string(),
            performance: PerformanceLevel::VeryHigh,
            shaders: vec![
                "Anime4K_Clamp_Highlights".to_string(),
                "Anime4K_Upscale_Denoise_CNN_x2_VL".to_string(),
                "Anime4K_AutoDownscalePre_x2".to_string(),
                "Anime4K_AutoDownscalePre_x4".to_string(),
                "Anime4K_Upscale_CNN_x2_L".to_string(),
                "Anime4K_Restore_CNN_S".to_string(),
                "Anime4K_AutoDownscalePre_x2".to_string(),
                "Anime4K_Upscale_CNN_x2_S".to_string(),
            ],
        },
    ]
}

/// Get performance requirements for each level
pub fn get_performance_requirements(level: PerformanceLevel) -> PerformanceRequirements {
    match level {
        PerformanceLevel::None => PerformanceRequirements {
            min_vram_gb: 0,
            min_gpu: "Any".to_string(),
            estimated_fps: "60+".to_string(),
        },
        PerformanceLevel::Low => PerformanceRequirements {
            min_vram_gb: 1,
            min_gpu: "Intel HD 4000 / GTX 750 / RX 550".to_string(),
            estimated_fps: "60".to_string(),
        },
        PerformanceLevel::LowMedium => PerformanceRequirements {
            min_vram_gb: 2,
            min_gpu: "Intel UHD 620 / GTX 960 / RX 570".to_string(),
            estimated_fps: "50-60".to_string(),
        },
        PerformanceLevel::Medium => PerformanceRequirements {
            min_vram_gb: 2,
            min_gpu: "GTX 1050 / RX 580".to_string(),
            estimated_fps: "45-60".to_string(),
        },
        PerformanceLevel::MediumHigh => PerformanceRequirements {
            min_vram_gb: 4,
            min_gpu: "GTX 1060 / RX 5600".to_string(),
            estimated_fps: "40-60".to_string(),
        },
        PerformanceLevel::High => PerformanceRequirements {
            min_vram_gb: 4,
            min_gpu: "GTX 1070 / RX 5700".to_string(),
            estimated_fps: "35-60".to_string(),
        },
        PerformanceLevel::VeryHigh => PerformanceRequirements {
            min_vram_gb: 6,
            min_gpu: "RTX 2060 / RX 6700 XT".to_string(),
            estimated_fps: "30-60".to_string(),
        },
    }
}

/// Get CSS filter approximation for a preset
pub fn get_css_filter(preset_id: &str) -> String {
    match preset_id {
        "mode-a" => "contrast(1.05) saturate(1.1)".to_string(),
        "mode-b" => "contrast(1.08) saturate(1.15) brightness(1.02)".to_string(),
        "mode-c" | "mode-c+a" => "contrast(1.1) saturate(1.2) brightness(1.02)".to_string(),
        "mode-a+a" => "contrast(1.06) saturate(1.12)".to_string(),
        "mode-b+b" => "contrast(1.09) saturate(1.18) brightness(1.02)".to_string(),
        _ => "none".to_string(),
    }
}

/// Get a preset by ID
pub fn get_preset_by_id(preset_id: &str) -> Option<Anime4KPreset> {
    get_all_presets()
        .into_iter()
        .find(|p| p.id == preset_id)
}

/// Recommend a preset based on GPU capabilities
pub fn recommend_preset(gpu_info: Option<&GpuInfo>) -> String {
    match gpu_info {
        Some(info) => {
            // Check for high-end GPUs
            let renderer_lower = info.renderer.to_lowercase();
            
            if renderer_lower.contains("rtx 30") || 
               renderer_lower.contains("rtx 40") ||
               renderer_lower.contains("rx 6800") ||
               renderer_lower.contains("rx 6900") ||
               renderer_lower.contains("rx 7") {
                return "mode-c+a".to_string();
            }
            
            if renderer_lower.contains("rtx 20") ||
               renderer_lower.contains("gtx 1080") ||
               renderer_lower.contains("rx 5700") ||
               renderer_lower.contains("rx 6700") {
                return "mode-c".to_string();
            }
            
            if renderer_lower.contains("gtx 1060") ||
               renderer_lower.contains("gtx 1070") ||
               renderer_lower.contains("rx 580") ||
               renderer_lower.contains("rx 5600") {
                return "mode-b".to_string();
            }
            
            // Default for other GPUs
            "mode-a".to_string()
        }
        None => "mode-b".to_string(),
    }
}

// =============================================================================
// Tauri Commands
// =============================================================================

/// Get all Anime4K presets
#[tauri::command]
pub fn anime4k_get_presets() -> Vec<Anime4KPreset> {
    get_all_presets()
}

/// Get a specific Anime4K preset by ID
#[tauri::command]
pub fn anime4k_get_preset(preset_id: String) -> Option<Anime4KPreset> {
    get_preset_by_id(&preset_id)
}

/// Get performance requirements for a preset
#[tauri::command]
pub fn anime4k_get_requirements(preset_id: String) -> Option<PerformanceRequirements> {
    get_preset_by_id(&preset_id)
        .map(|p| get_performance_requirements(p.performance))
}

/// Get the current Anime4K configuration
#[tauri::command]
pub fn anime4k_get_config(state: State<'_, Anime4KState>) -> Result<Anime4KConfig, String> {
    state
        .config
        .lock()
        .map(|config| config.clone())
        .map_err(|e| format!("Failed to lock config: {}", e))
}

/// Set the Anime4K configuration
#[tauri::command]
pub fn anime4k_set_config(
    enabled: bool,
    preset_id: String,
    state: State<'_, Anime4KState>,
) -> Result<Anime4KConfig, String> {
    let mut config = state
        .config
        .lock()
        .map_err(|e| format!("Failed to lock config: {}", e))?;
    
    config.enabled = enabled;
    config.preset_id = preset_id.clone();
    config.css_filter = if enabled {
        Some(get_css_filter(&preset_id))
    } else {
        None
    };
    
    log::info!("Anime4K config updated: enabled={}, preset={}", enabled, preset_id);
    
    Ok(config.clone())
}

/// Enable or disable Anime4K
#[tauri::command]
pub fn anime4k_toggle(
    enabled: bool,
    state: State<'_, Anime4KState>,
) -> Result<Anime4KConfig, String> {
    let mut config = state
        .config
        .lock()
        .map_err(|e| format!("Failed to lock config: {}", e))?;
    
    config.enabled = enabled;
    if enabled && config.preset_id == "none" {
        config.preset_id = "mode-b".to_string();
    }
    config.css_filter = if enabled {
        Some(get_css_filter(&config.preset_id))
    } else {
        None
    };
    
    log::info!("Anime4K toggled: enabled={}", enabled);
    
    Ok(config.clone())
}

/// Get CSS filter for current config
#[tauri::command]
pub fn anime4k_get_css_filter(state: State<'_, Anime4KState>) -> Result<String, String> {
    let config = state
        .config
        .lock()
        .map_err(|e| format!("Failed to lock config: {}", e))?;
    
    if config.enabled {
        Ok(get_css_filter(&config.preset_id))
    } else {
        Ok("none".to_string())
    }
}

/// Get recommended preset based on provided GPU info
#[tauri::command]
pub fn anime4k_recommend_preset(gpu_info: Option<GpuInfo>) -> String {
    recommend_preset(gpu_info.as_ref())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_all_presets() {
        let presets = get_all_presets();
        assert!(!presets.is_empty());
        
        // Verify we have all expected presets
        let preset_ids: Vec<&str> = presets.iter().map(|p| p.id.as_str()).collect();
        assert!(preset_ids.contains(&"none"));
        assert!(preset_ids.contains(&"mode-a"));
        assert!(preset_ids.contains(&"mode-b"));
        assert!(preset_ids.contains(&"mode-c"));
        assert!(preset_ids.contains(&"mode-c+a"));
    }

    #[test]
    fn test_get_preset_by_id() {
        let preset = get_preset_by_id("mode-b");
        assert!(preset.is_some());
        assert_eq!(preset.unwrap().name, "Mode B (Balanced)");
        
        let none = get_preset_by_id("invalid");
        assert!(none.is_none());
    }

    #[test]
    fn test_css_filter() {
        assert_eq!(get_css_filter("none"), "none");
        assert!(get_css_filter("mode-a").contains("contrast"));
        assert!(get_css_filter("mode-b").contains("saturate"));
    }

    #[test]
    fn test_recommend_preset() {
        // No GPU info should return default
        assert_eq!(recommend_preset(None), "mode-b");
        
        // High-end GPU should return high quality preset
        let high_end_gpu = GpuInfo {
            vendor: "NVIDIA".to_string(),
            renderer: "RTX 3080".to_string(),
            estimated_vram_gb: Some(10),
            webgl2_support: true,
        };
        assert_eq!(recommend_preset(Some(&high_end_gpu)), "mode-c+a");
    }

    #[test]
    fn test_performance_requirements() {
        let reqs = get_performance_requirements(PerformanceLevel::VeryHigh);
        assert_eq!(reqs.min_vram_gb, 6);
        
        let low_reqs = get_performance_requirements(PerformanceLevel::Low);
        assert_eq!(low_reqs.min_vram_gb, 1);
    }
}
