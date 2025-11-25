//! Ayoto Plugin Manifest and Version Handling
//! 
//! Defines the plugin manifest structure and version compatibility checking.
//! Plugins must declare their version and the target Ayoto version they support.

use serde::{Deserialize, Serialize};

/// Semantic version following semver (major.minor.patch)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SemVer {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    /// Pre-release tag (e.g., "alpha", "beta.1")
    pub prerelease: Option<String>,
}

impl SemVer {
    /// Parse a version string like "1.2.3" or "1.2.3-beta.1"
    pub fn parse(version: &str) -> Result<Self, String> {
        let (version_part, prerelease) = if let Some(idx) = version.find('-') {
            (&version[..idx], Some(version[idx + 1..].to_string()))
        } else {
            (version, None)
        };

        let parts: Vec<&str> = version_part.split('.').collect();
        if parts.len() != 3 {
            return Err(format!("Invalid version format: {}. Expected: major.minor.patch", version));
        }

        Ok(SemVer {
            major: parts[0].parse().map_err(|_| format!("Invalid major version: {}", parts[0]))?,
            minor: parts[1].parse().map_err(|_| format!("Invalid minor version: {}", parts[1]))?,
            patch: parts[2].parse().map_err(|_| format!("Invalid patch version: {}", parts[2]))?,
            prerelease,
        })
    }

    /// Check if this version is compatible with a target version
    /// Compatible means same major version (semver compatibility)
    pub fn is_compatible_with(&self, target: &SemVer) -> bool {
        // Major version must match for compatibility
        // This follows semver: 1.x.x is compatible with 1.y.z but not 2.x.x
        self.major == target.major
    }

    /// Check if this version is greater than or equal to target
    pub fn is_at_least(&self, target: &SemVer) -> bool {
        if self.major != target.major {
            return self.major > target.major;
        }
        if self.minor != target.minor {
            return self.minor > target.minor;
        }
        self.patch >= target.patch
    }
}

impl std::fmt::Display for SemVer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)?;
        if let Some(ref pre) = self.prerelease {
            write!(f, "-{}", pre)?;
        }
        Ok(())
    }
}

impl Default for SemVer {
    fn default() -> Self {
        SemVer {
            major: 1,
            minor: 0,
            patch: 0,
            prerelease: None,
        }
    }
}

/// Plugin capabilities - what features the plugin supports
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PluginCapabilities {
    /// Supports search(query) -> List<PopulatedAnime>
    #[serde(default)]
    pub search: bool,
    /// Supports getPopular(page) -> List<PopulatedAnime>
    #[serde(default)]
    pub get_popular: bool,
    /// Supports getLatest(page) -> List<PopulatedAnime>
    #[serde(default)]
    pub get_latest: bool,
    /// Supports getEpisodes(animeId, page) -> List<Episode>
    #[serde(default)]
    pub get_episodes: bool,
    /// Supports getStreams(animeId, episodeId) -> List<StreamSource>
    #[serde(default)]
    pub get_streams: bool,
    /// Supports getAnimeDetails(animeId) -> PopulatedAnime
    #[serde(default)]
    pub get_anime_details: bool,
    /// Supports web scraping for data extraction
    #[serde(default)]
    pub scraping: bool,
}

/// Plugin target platform
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TargetPlatform {
    /// Universal plugin - works on all platforms
    Universal,
    /// Desktop only (Windows, macOS, Linux)
    Desktop,
    /// Mobile only (iOS, Android)
    Mobile,
    /// Windows specific
    Windows,
    /// macOS specific
    Macos,
    /// Linux specific
    Linux,
    /// iOS specific
    Ios,
    /// Android specific
    Android,
}

impl Default for TargetPlatform {
    fn default() -> Self {
        TargetPlatform::Universal
    }
}

/// The .ayoto plugin manifest
/// This is the main configuration for a plugin
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    /// Unique plugin identifier (e.g., "animepahe", "gogoanime")
    pub id: String,
    /// Display name of the plugin
    pub name: String,
    /// Plugin version (semver format: major.minor.patch)
    pub version: String,
    /// Minimum Ayoto version this plugin is compatible with
    pub target_ayoto_version: String,
    /// Maximum Ayoto version this plugin supports (optional)
    pub max_ayoto_version: Option<String>,
    /// Plugin description
    pub description: Option<String>,
    /// Plugin author
    pub author: Option<String>,
    /// Author's website or repository
    pub homepage: Option<String>,
    /// Plugin icon URL
    pub icon: Option<String>,
    /// Provider names this plugin implements
    #[serde(default)]
    pub providers: Vec<String>,
    /// Supported stream formats
    #[serde(default)]
    pub formats: Vec<String>,
    /// Whether the plugin supports Anime4K upscaling
    #[serde(default)]
    pub anime4k_support: bool,
    /// Plugin capabilities
    #[serde(default)]
    pub capabilities: PluginCapabilities,
    /// Target platforms for this plugin
    #[serde(default)]
    pub platforms: Vec<TargetPlatform>,
    /// Scraping configuration (if capabilities.scraping is true)
    pub scraping_config: Option<ScrapingConfig>,
    /// Plugin-specific configuration
    #[serde(default)]
    pub config: serde_json::Value,
}

/// Scraping configuration for plugins that use web scraping
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrapingConfig {
    /// Base URL for the source website
    pub base_url: String,
    /// User agent to use for requests
    pub user_agent: Option<String>,
    /// Rate limiting - minimum delay between requests in milliseconds
    pub rate_limit_ms: Option<u64>,
    /// Whether to use a headless browser for JavaScript rendering
    pub requires_javascript: bool,
    /// CSS selectors for data extraction
    pub selectors: Option<serde_json::Value>,
}

/// Plugin validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl PluginManifest {
    /// Parse a plugin manifest from JSON string
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("Failed to parse plugin manifest: {}", e))
    }

    /// Convert manifest to JSON string
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize manifest: {}", e))
    }

    /// Get parsed plugin version
    pub fn parsed_version(&self) -> Result<SemVer, String> {
        SemVer::parse(&self.version)
    }

    /// Get parsed target Ayoto version
    pub fn parsed_target_version(&self) -> Result<SemVer, String> {
        SemVer::parse(&self.target_ayoto_version)
    }

    /// Check if this plugin is compatible with the given Ayoto version
    pub fn is_compatible_with_ayoto(&self, ayoto_version: &str) -> Result<bool, String> {
        let ayoto_ver = SemVer::parse(ayoto_version)?;
        let target_ver = self.parsed_target_version()?;

        // Check minimum version compatibility
        if !ayoto_ver.is_compatible_with(&target_ver) {
            return Ok(false);
        }

        if !ayoto_ver.is_at_least(&target_ver) {
            return Ok(false);
        }

        // Check maximum version if specified
        if let Some(ref max_version) = self.max_ayoto_version {
            let max_ver = SemVer::parse(max_version)?;
            if !ayoto_ver.is_compatible_with(&max_ver) {
                return Ok(false);
            }
        }

        Ok(true)
    }

    /// Check if this plugin supports the current platform
    pub fn supports_platform(&self, platform: &TargetPlatform) -> bool {
        if self.platforms.is_empty() {
            return true; // No platform restrictions = universal
        }

        self.platforms.contains(&TargetPlatform::Universal) || self.platforms.contains(platform)
    }

    /// Validate the plugin manifest
    pub fn validate(&self) -> ValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Check required fields
        if self.id.is_empty() {
            errors.push("Plugin ID is required".to_string());
        } else if !self.id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            errors.push("Plugin ID must contain only alphanumeric characters, hyphens, and underscores".to_string());
        }

        if self.name.is_empty() {
            errors.push("Plugin name is required".to_string());
        }

        // Validate version format
        if let Err(e) = SemVer::parse(&self.version) {
            errors.push(format!("Invalid plugin version: {}", e));
        }

        if let Err(e) = SemVer::parse(&self.target_ayoto_version) {
            errors.push(format!("Invalid target Ayoto version: {}", e));
        }

        if let Some(ref max_ver) = self.max_ayoto_version {
            if let Err(e) = SemVer::parse(max_ver) {
                errors.push(format!("Invalid max Ayoto version: {}", e));
            }
        }

        // Validate formats
        let valid_formats = ["m3u8", "mp4", "mkv", "webm", "torrent"];
        for format in &self.formats {
            if !valid_formats.contains(&format.as_str()) {
                warnings.push(format!("Unknown stream format: {}. Valid formats: {:?}", format, valid_formats));
            }
        }

        // Check capabilities
        let has_any_capability = self.capabilities.search
            || self.capabilities.get_popular
            || self.capabilities.get_latest
            || self.capabilities.get_episodes
            || self.capabilities.get_streams
            || self.capabilities.get_anime_details;

        if !has_any_capability {
            warnings.push("Plugin has no capabilities enabled".to_string());
        }

        // Check scraping config if scraping is enabled
        if self.capabilities.scraping {
            if self.scraping_config.is_none() {
                warnings.push("Scraping capability is enabled but no scraping config provided".to_string());
            } else if let Some(ref config) = self.scraping_config {
                if config.base_url.is_empty() {
                    errors.push("Scraping config requires a base_url".to_string());
                }
            }
        }

        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semver_parse() {
        let ver = SemVer::parse("1.2.3").unwrap();
        assert_eq!(ver.major, 1);
        assert_eq!(ver.minor, 2);
        assert_eq!(ver.patch, 3);
        assert_eq!(ver.prerelease, None);

        let ver_pre = SemVer::parse("2.0.0-beta.1").unwrap();
        assert_eq!(ver_pre.major, 2);
        assert_eq!(ver_pre.prerelease, Some("beta.1".to_string()));
    }

    #[test]
    fn test_version_compatibility() {
        let v1 = SemVer::parse("1.5.0").unwrap();
        let v1_old = SemVer::parse("1.0.0").unwrap();
        let v2 = SemVer::parse("2.0.0").unwrap();

        assert!(v1.is_compatible_with(&v1_old)); // Same major version
        assert!(!v2.is_compatible_with(&v1)); // Different major version
    }

    #[test]
    fn test_plugin_manifest_validation() {
        let manifest = PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            target_ayoto_version: "2.5.0".to_string(),
            max_ayoto_version: None,
            description: Some("A test plugin".to_string()),
            author: Some("Test Author".to_string()),
            homepage: None,
            icon: None,
            providers: vec!["TestProvider".to_string()],
            formats: vec!["m3u8".to_string(), "mp4".to_string()],
            anime4k_support: true,
            capabilities: PluginCapabilities {
                search: true,
                get_episodes: true,
                get_streams: true,
                ..Default::default()
            },
            platforms: vec![TargetPlatform::Universal],
            scraping_config: None,
            config: serde_json::Value::Null,
        };

        let result = manifest.validate();
        assert!(result.is_valid);
    }
}
