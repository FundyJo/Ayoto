/**
 * ZPE (Zanshin Plugin Extension) Manifest System
 * 
 * Defines the manifest schema for ZPE plugins including:
 * - Plugin metadata (name, description, icon, version, author)
 * - Permissions and capabilities
 * - GitHub integration for version checking
 * - Security requirements
 */

// ============================================================================
// Constants & Enums
// ============================================================================

/**
 * Plugin types supported by ZPE
 */
export const ZPE_PLUGIN_TYPE = {
  MEDIA_PROVIDER: 'media-provider',
  STREAM_PROVIDER: 'stream-provider',
  UTILITY: 'utility',
  THEME: 'theme',
  INTEGRATION: 'integration'
}

/**
 * Permission levels for plugins
 */
export const ZPE_PERMISSION = {
  // Network permissions
  NETWORK_HTTP: 'network:http',           // Make HTTP requests
  NETWORK_WEBSOCKET: 'network:websocket', // WebSocket connections
  
  // Storage permissions
  STORAGE_LOCAL: 'storage:local',         // Local storage access
  STORAGE_CACHE: 'storage:cache',         // Cache access
  
  // UI permissions
  UI_NOTIFICATION: 'ui:notification',     // Show notifications
  UI_DIALOG: 'ui:dialog',                 // Show dialogs
  UI_SETTINGS: 'ui:settings',             // Add settings panel
  
  // System permissions
  SYSTEM_CLIPBOARD: 'system:clipboard',   // Clipboard access
  SYSTEM_PROCESS: 'system:process',       // Process info (read-only)
}

/**
 * Supported stream formats
 */
export const ZPE_STREAM_FORMAT = {
  M3U8: 'm3u8',
  MP4: 'mp4',
  MKV: 'mkv',
  WEBM: 'webm',
  DASH: 'dash',
  TORRENT: 'torrent'
}

/**
 * Plugin lifecycle states
 */
export const ZPE_PLUGIN_STATE = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  ERROR: 'error',
  UPDATE_AVAILABLE: 'update-available'
}

// ============================================================================
// Manifest Schema
// ============================================================================

/**
 * ZPE Manifest Schema Definition
 * @typedef {Object} ZPEManifest
 * @property {string} id - Unique plugin identifier (alphanumeric, hyphens, underscores)
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Semantic version (e.g., "1.0.0")
 * @property {string} description - Plugin description
 * @property {string} pluginType - Type from ZPE_PLUGIN_TYPE
 * @property {ZPEManifestAuthor} author - Author information
 * @property {string} [icon] - Base64 encoded icon or icon name
 * @property {string} [iconUrl] - URL to icon image
 * @property {string} [homepage] - Plugin homepage URL
 * @property {ZPEManifestRepository} [repository] - GitHub repository for version checking
 * @property {string} [license] - License identifier (e.g., "MIT")
 * @property {string[]} [supportedLanguages] - ISO 639-1 language codes supported by this plugin (e.g., ["de", "en"])
 * @property {string[]} [permissions] - Required permissions from ZPE_PERMISSION
 * @property {ZPEManifestCapabilities} [capabilities] - Plugin capabilities
 * @property {ZPEManifestConfig} [config] - Plugin configuration options
 * @property {ZPEManifestSecurity} [security] - Security settings
 * @property {string} [minAppVersion] - Minimum required Ayoto version
 * @property {string[]} [keywords] - Search keywords
 * @property {string} [updateUrl] - Custom update check URL
 */

/**
 * Author information
 * @typedef {Object} ZPEManifestAuthor
 * @property {string} name - Author name
 * @property {string} [email] - Author email
 * @property {string} [url] - Author website
 * @property {string} [github] - GitHub username
 */

/**
 * Repository information for version checking
 * @typedef {Object} ZPEManifestRepository
 * @property {string} type - Repository type (e.g., "github")
 * @property {string} owner - Repository owner/organization
 * @property {string} repo - Repository name
 * @property {string} [branch] - Default branch (default: "main")
 * @property {string} [manifestPath] - Path to manifest in repo (default: "manifest.json")
 */

/**
 * Plugin capabilities
 * @typedef {Object} ZPEManifestCapabilities
 * @property {boolean} [search] - Can search for content
 * @property {boolean} [getPopular] - Can fetch popular content
 * @property {boolean} [getLatest] - Can fetch latest content
 * @property {boolean} [getEpisodes] - Can fetch episode lists
 * @property {boolean} [getStreams] - Can extract stream URLs
 * @property {boolean} [getAnimeDetails] - Can fetch detailed info
 * @property {boolean} [extractStream] - Can extract from hosters
 * @property {boolean} [getHosterInfo] - Can provide hoster info
 */

/**
 * Plugin configuration options
 * @typedef {Object} ZPEManifestConfig
 * @property {string} [baseUrl] - Base URL for scraping
 * @property {string} [userAgent] - Custom user agent
 * @property {number} [rateLimitMs] - Rate limit in milliseconds
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {boolean} [requiresCookies] - Requires cookie authentication
 */

/**
 * Security settings
 * @typedef {Object} ZPEManifestSecurity
 * @property {boolean} [sandboxed] - Run in sandboxed environment (default: true)
 * @property {string[]} [allowedDomains] - Required domains for network requests. Plugins MUST declare all domains they need to access (e.g., ["aniworld.to", "*.voe.sx"]). These domains will be displayed to users and enforced at runtime. Supports wildcard subdomains (*.domain.com).
 * @property {boolean} [cspEnabled] - Enable Content Security Policy (default: true)
 * @property {string} [integrityHash] - SHA-256 hash of plugin code
 */

// ============================================================================
// Manifest Validation
// ============================================================================

/**
 * Validate a ZPE manifest
 * @param {ZPEManifest} manifest - Manifest to validate
 * @returns {Object} Validation result with valid, errors, and warnings
 */
export function validateZPEManifest(manifest) {
  const errors = []
  const warnings = []

  // Required fields validation
  if (!manifest) {
    return { valid: false, errors: ['Manifest is required'], warnings: [] }
  }

  // ID validation
  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Plugin ID (id) is required and must be a string')
  } else if (!/^[a-z0-9][a-z0-9_-]{2,48}[a-z0-9]$/.test(manifest.id)) {
    errors.push('Plugin ID must be 4-50 characters total (start and end with lowercase alphanumeric, may contain lowercase letters, numbers, hyphens, and underscores)')
  }

  // Name validation
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Plugin name (name) is required and must be a string')
  } else if (manifest.name.length < 2 || manifest.name.length > 100) {
    errors.push('Plugin name must be 2-100 characters')
  }

  // Version validation (semver)
  if (!manifest.version) {
    errors.push('Plugin version (version) is required')
  } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(manifest.version)) {
    errors.push('Plugin version must be in semantic versioning format (e.g., 1.0.0, 1.0.0-beta.1)')
  }

  // Description validation
  if (!manifest.description || typeof manifest.description !== 'string') {
    warnings.push('Plugin description is recommended')
  } else if (manifest.description.length > 500) {
    errors.push('Plugin description must be 500 characters or less')
  }

  // Plugin type validation
  if (!manifest.pluginType) {
    errors.push('Plugin type (pluginType) is required')
  } else if (!Object.values(ZPE_PLUGIN_TYPE).includes(manifest.pluginType)) {
    errors.push(`Plugin type must be one of: ${Object.values(ZPE_PLUGIN_TYPE).join(', ')}`)
  }

  // Author validation
  if (!manifest.author) {
    warnings.push('Author information is recommended')
  } else {
    if (!manifest.author.name || typeof manifest.author.name !== 'string') {
      errors.push('Author name is required when author is specified')
    }
    if (manifest.author.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manifest.author.email)) {
      errors.push('Author email must be a valid email address')
    }
    if (manifest.author.url && !isValidUrl(manifest.author.url)) {
      errors.push('Author URL must be a valid URL')
    }
    if (manifest.author.github && !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(manifest.author.github)) {
      errors.push('Author GitHub username must be valid')
    }
  }

  // Repository validation (for version checking)
  if (manifest.repository) {
    if (manifest.repository.type !== 'github') {
      warnings.push('Only GitHub repositories are supported for version checking')
    }
    if (!manifest.repository.owner || typeof manifest.repository.owner !== 'string') {
      errors.push('Repository owner is required when repository is specified')
    }
    if (!manifest.repository.repo || typeof manifest.repository.repo !== 'string') {
      errors.push('Repository name is required when repository is specified')
    }
  }

  // Permissions validation
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push('Permissions must be an array')
    } else {
      const validPermissions = Object.values(ZPE_PERMISSION)
      for (const perm of manifest.permissions) {
        if (!validPermissions.includes(perm)) {
          warnings.push(`Unknown permission: ${perm}`)
        }
      }
    }
  }

  // Capabilities validation
  if (manifest.capabilities && typeof manifest.capabilities !== 'object') {
    errors.push('Capabilities must be an object')
  }

  // Security validation
  if (manifest.security) {
    if (manifest.security.allowedDomains) {
      if (!Array.isArray(manifest.security.allowedDomains)) {
        errors.push('Allowed domains must be an array')
      } else {
        for (const domain of manifest.security.allowedDomains) {
          if (!/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(domain)) {
            errors.push(`Invalid domain pattern: ${domain}`)
          }
        }
      }
    }
    if (manifest.security.integrityHash && !/^sha256-[A-Za-z0-9+/=]{43,}$/.test(manifest.security.integrityHash)) {
      errors.push('Integrity hash must be a valid SHA-256 hash with sha256- prefix')
    }
  }

  // Homepage/updateUrl URL validation
  if (manifest.homepage && !isValidUrl(manifest.homepage)) {
    errors.push('Homepage must be a valid URL')
  }
  if (manifest.updateUrl && !isValidUrl(manifest.updateUrl)) {
    errors.push('Update URL must be a valid URL')
  }
  if (manifest.iconUrl && !isValidUrl(manifest.iconUrl)) {
    errors.push('Icon URL must be a valid URL')
  }

  // Minimum app version validation
  if (manifest.minAppVersion && !/^\d+\.\d+\.\d+$/.test(manifest.minAppVersion)) {
    errors.push('Minimum app version must be in format X.Y.Z')
  }

  // Keywords validation
  if (manifest.keywords) {
    if (!Array.isArray(manifest.keywords)) {
      errors.push('Keywords must be an array')
    } else if (manifest.keywords.length > 10) {
      warnings.push('Maximum 10 keywords are recommended')
    }
  }

  // Supported languages validation (ISO 639-1 codes)
  if (manifest.supportedLanguages) {
    if (!Array.isArray(manifest.supportedLanguages)) {
      errors.push('Supported languages must be an array')
    } else {
      for (const lang of manifest.supportedLanguages) {
        if (typeof lang !== 'string' || !/^[a-z]{2}(-[a-z]{2})?$/i.test(lang)) {
          errors.push(`Invalid language code: ${lang}. Must be ISO 639-1 format (e.g., "de", "en", "en-US")`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Check if a string is a valid URL
 * @param {string} str - String to check
 * @returns {boolean} True if valid URL
 */
function isValidUrl(str) {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Manifest Creation Helper
// ============================================================================

/**
 * Create a default ZPE manifest
 * @param {Object} options - Options to override defaults
 * @returns {ZPEManifest} New manifest object
 */
export function createZPEManifest(options = {}) {
  const manifest = {
    id: options.id || 'my-plugin',
    name: options.name || 'My Plugin',
    version: options.version || '1.0.0',
    description: options.description || 'A ZPE plugin for Ayoto',
    pluginType: options.pluginType || ZPE_PLUGIN_TYPE.UTILITY,
    author: options.author || {
      name: 'Unknown Author'
    },
    permissions: options.permissions || [
      ZPE_PERMISSION.STORAGE_LOCAL
    ],
    capabilities: options.capabilities || {},
    config: {
      rateLimitMs: 1000,
      timeout: 30000,
      ...options.config
    },
    security: {
      sandboxed: true,
      cspEnabled: true,
      allowedDomains: [],
      ...options.security
    },
    keywords: options.keywords || [],
    ...options
  }

  return manifest
}

/**
 * Create a media provider manifest template
 * @param {Object} options - Options to customize
 * @returns {ZPEManifest} Media provider manifest
 */
export function createMediaProviderManifest(options = {}) {
  return createZPEManifest({
    ...options,
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    permissions: [
      ZPE_PERMISSION.NETWORK_HTTP,
      ZPE_PERMISSION.STORAGE_LOCAL,
      ZPE_PERMISSION.STORAGE_CACHE,
      ...(options.permissions || [])
    ],
    capabilities: {
      search: true,
      getPopular: true,
      getLatest: true,
      getEpisodes: true,
      getStreams: true,
      getAnimeDetails: true,
      ...options.capabilities
    }
  })
}

/**
 * Create a stream provider manifest template
 * @param {Object} options - Options to customize
 * @returns {ZPEManifest} Stream provider manifest
 */
export function createStreamProviderManifest(options = {}) {
  return createZPEManifest({
    ...options,
    pluginType: ZPE_PLUGIN_TYPE.STREAM_PROVIDER,
    permissions: [
      ZPE_PERMISSION.NETWORK_HTTP,
      ZPE_PERMISSION.STORAGE_CACHE,
      ...(options.permissions || [])
    ],
    capabilities: {
      extractStream: true,
      getHosterInfo: true,
      ...options.capabilities
    }
  })
}

// ============================================================================
// Version Comparison Utilities
// ============================================================================

/**
 * Parse a semantic version string
 * @param {string} version - Version string (e.g., "1.2.3" or "1.2.3-beta.1")
 * @returns {Object} Parsed version object
 */
export function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/)
  if (!match) {
    return null
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null
  }
}

/**
 * Compare two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
  const p1 = parseVersion(v1)
  const p2 = parseVersion(v2)

  if (!p1 || !p2) {
    throw new Error('Invalid version format')
  }

  // Compare major.minor.patch
  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1

  // Handle prerelease comparison
  if (p1.prerelease && !p2.prerelease) return -1
  if (!p1.prerelease && p2.prerelease) return 1
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease)
  }

  return 0
}

/**
 * Check if an update is available
 * @param {string} current - Current version
 * @param {string} latest - Latest version
 * @returns {boolean} True if update is available
 */
export function isUpdateAvailable(current, latest) {
  return compareVersions(current, latest) < 0
}

export default {
  ZPE_PLUGIN_TYPE,
  ZPE_PERMISSION,
  ZPE_STREAM_FORMAT,
  ZPE_PLUGIN_STATE,
  validateZPEManifest,
  createZPEManifest,
  createMediaProviderManifest,
  createStreamProviderManifest,
  parseVersion,
  compareVersions,
  isUpdateAvailable
}
