/**
 * ZPE GitHub Version Checker
 * 
 * Provides functionality to check for plugin updates via GitHub:
 * - Fetch latest version from GitHub repository
 * - Compare versions to detect updates
 * - Download plugin updates
 * - Verify release integrity
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { compareVersions, isUpdateAvailable, parseVersion } from './ZPEManifest.js'
import { calculateHash, verifyIntegrityHash } from './ZPESecurity.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * GitHub API base URL
 */
const GITHUB_API_BASE = 'https://api.github.com'

/**
 * GitHub raw content base URL
 */
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'

/**
 * User agent for API requests
 */
const USER_AGENT = 'Ayoto-ZPE/1.0'

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000

// ============================================================================
// Version Check Result Types
// ============================================================================

/**
 * @typedef {Object} VersionCheckResult
 * @property {boolean} updateAvailable - Whether an update is available
 * @property {string} currentVersion - Current installed version
 * @property {string} latestVersion - Latest available version
 * @property {string} [releaseUrl] - URL to the release page
 * @property {string} [releaseNotes] - Release notes/changelog
 * @property {string} [downloadUrl] - Direct download URL
 * @property {string} [publishedAt] - Release publish date
 * @property {Object} [asset] - Release asset info
 */

/**
 * @typedef {Object} ReleaseInfo
 * @property {string} tagName - Release tag name
 * @property {string} name - Release name
 * @property {string} body - Release description/notes
 * @property {boolean} prerelease - Is prerelease
 * @property {boolean} draft - Is draft
 * @property {string} publishedAt - Publish timestamp
 * @property {string} htmlUrl - URL to release page
 * @property {Array} assets - Release assets
 */

// ============================================================================
// Version Check Cache
// ============================================================================

/**
 * Simple cache for version check results
 */
class VersionCheckCache {
  constructor() {
    this.cache = new Map()
  }

  /**
   * Get cached result
   * @param {string} key - Cache key (pluginId)
   * @returns {Object|null} Cached result or null
   */
  get(key) {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data
    }
    this.cache.delete(key)
    return null
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear cache entry
   * @param {string} key - Cache key to clear
   */
  clear(key) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

const versionCache = new VersionCheckCache()

// ============================================================================
// GitHub API Client
// ============================================================================

/**
 * Validate GitHub API response structure
 * @param {Object} data - Parsed response data
 * @param {string} type - Expected response type
 * @returns {boolean} True if valid
 */
function validateGitHubResponse(data, type) {
  if (!data || typeof data !== 'object') {
    return false
  }

  switch (type) {
    case 'release':
      // Validate release object has required fields
      return typeof data.tag_name === 'string' &&
             typeof data.html_url === 'string' &&
             (data.assets === undefined || Array.isArray(data.assets))
    case 'releases':
      // Validate releases array
      return Array.isArray(data) && data.every(r => 
        typeof r.tag_name === 'string' && typeof r.html_url === 'string'
      )
    default:
      return true
  }
}

/**
 * Make an authenticated GitHub API request
 * @param {string} endpoint - API endpoint (relative to base URL)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */
async function githubApiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': USER_AGENT,
    ...options.headers
  }

  try {
    const response = await tauriFetch(url, {
      method: options.method || 'GET',
      headers,
      connectTimeout: options.timeout || 30000
    })

    const body = await response.text()

    if (!response.ok) {
      let errorMessage = `GitHub API error: ${response.status}`
      try {
        const errorData = JSON.parse(body)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Ignore JSON parse error
      }
      throw new Error(errorMessage)
    }

    const data = JSON.parse(body)
    
    // Validate response structure based on endpoint
    const responseType = options.responseType || 'default'
    if (!validateGitHubResponse(data, responseType)) {
      throw new Error('Invalid GitHub API response structure')
    }
    
    return data
  } catch (error) {
    if (error.message.includes('GitHub API') || error.message.includes('Invalid GitHub')) {
      throw error
    }
    throw new Error(`Failed to fetch from GitHub: ${error.message}`)
  }
}

/**
 * Fetch raw content from GitHub repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} ref - Branch/tag/commit reference
 * @returns {Promise<string>} File content
 */
async function fetchRawContent(owner, repo, path, ref = 'main') {
  const url = `${GITHUB_RAW_BASE}/${owner}/${repo}/${ref}/${path}`
  
  const response = await tauriFetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    },
    connectTimeout: 30000
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`)
  }

  return await response.text()
}

// ============================================================================
// Version Checking
// ============================================================================

/**
 * Check for updates from GitHub releases
 * @param {Object} repository - Repository configuration from manifest
 * @param {string} currentVersion - Current installed version
 * @returns {Promise<VersionCheckResult>} Version check result
 */
export async function checkForUpdates(repository, currentVersion) {
  if (!repository || repository.type !== 'github') {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      error: 'Only GitHub repositories are supported'
    }
  }

  const { owner, repo } = repository
  const cacheKey = `${owner}/${repo}`

  // Check cache first
  const cached = versionCache.get(cacheKey)
  if (cached) {
    return {
      ...cached,
      currentVersion,
      updateAvailable: isUpdateAvailable(currentVersion, cached.latestVersion)
    }
  }

  try {
    // Fetch latest release from GitHub
    const release = await githubApiRequest(`/repos/${owner}/${repo}/releases/latest`, {
      responseType: 'release'
    })
    
    // Extract version from tag (remove 'v' prefix if present)
    const latestVersion = release.tag_name.replace(/^v/, '')
    
    // Find ZPE asset in release
    const zpeAsset = release.assets?.find(asset => 
      asset.name.endsWith('.zpe') || asset.name.endsWith('.zip')
    )

    const result = {
      updateAvailable: isUpdateAvailable(currentVersion, latestVersion),
      currentVersion,
      latestVersion,
      releaseUrl: release.html_url,
      releaseNotes: release.body || '',
      publishedAt: release.published_at,
      prerelease: release.prerelease,
      asset: zpeAsset ? {
        name: zpeAsset.name,
        downloadUrl: zpeAsset.browser_download_url,
        size: zpeAsset.size,
        downloadCount: zpeAsset.download_count
      } : null
    }

    // Cache the result
    versionCache.set(cacheKey, result)

    return result
  } catch (error) {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      error: error.message
    }
  }
}

/**
 * Check for updates using manifest file in repository
 * @param {Object} repository - Repository configuration
 * @param {string} currentVersion - Current installed version
 * @returns {Promise<VersionCheckResult>} Version check result
 */
export async function checkForUpdatesFromManifest(repository, currentVersion) {
  if (!repository || repository.type !== 'github') {
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      error: 'Only GitHub repositories are supported'
    }
  }

  const { owner, repo, branch = 'main', manifestPath = 'manifest.json' } = repository

  try {
    // Fetch manifest from repository
    const manifestContent = await fetchRawContent(owner, repo, manifestPath, branch)
    const manifest = JSON.parse(manifestContent)
    
    const latestVersion = manifest.version
    
    return {
      updateAvailable: isUpdateAvailable(currentVersion, latestVersion),
      currentVersion,
      latestVersion,
      releaseUrl: `https://github.com/${owner}/${repo}`,
      releaseNotes: manifest.changelog || ''
    }
  } catch (error) {
    // Fall back to releases API
    return checkForUpdates(repository, currentVersion)
  }
}

/**
 * Get all releases for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Options
 * @returns {Promise<ReleaseInfo[]>} List of releases
 */
export async function getReleases(owner, repo, options = {}) {
  const perPage = options.perPage || 10
  const page = options.page || 1
  const includePrerelease = options.includePrerelease ?? false

  const releases = await githubApiRequest(
    `/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`,
    { responseType: 'releases' }
  )

  return releases
    .filter(r => includePrerelease || !r.prerelease)
    .map(r => ({
      tagName: r.tag_name,
      version: r.tag_name.replace(/^v/, ''),
      name: r.name,
      body: r.body,
      prerelease: r.prerelease,
      draft: r.draft,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      assets: r.assets.map(a => ({
        name: a.name,
        downloadUrl: a.browser_download_url,
        size: a.size,
        contentType: a.content_type,
        downloadCount: a.download_count
      }))
    }))
}

/**
 * Get release by tag
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} tag - Release tag
 * @returns {Promise<ReleaseInfo>} Release info
 */
export async function getReleaseByTag(owner, repo, tag) {
  const release = await githubApiRequest(`/repos/${owner}/${repo}/releases/tags/${tag}`, {
    responseType: 'release'
  })
  
  return {
    tagName: release.tag_name,
    version: release.tag_name.replace(/^v/, ''),
    name: release.name,
    body: release.body,
    prerelease: release.prerelease,
    draft: release.draft,
    publishedAt: release.published_at,
    htmlUrl: release.html_url,
    assets: release.assets.map(a => ({
      name: a.name,
      downloadUrl: a.browser_download_url,
      size: a.size,
      contentType: a.content_type,
      downloadCount: a.download_count
    }))
  }
}

// ============================================================================
// Plugin Download
// ============================================================================

/**
 * Download a plugin release asset
 * @param {string} downloadUrl - Asset download URL
 * @param {Object} options - Download options
 * @returns {Promise<ArrayBuffer>} Downloaded content
 */
export async function downloadRelease(downloadUrl, options = {}) {
  const response = await tauriFetch(downloadUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/octet-stream'
    },
    connectTimeout: options.timeout || 60000
  })

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`)
  }

  return await response.arrayBuffer()
}

/**
 * Download and verify a plugin update
 * @param {Object} updateInfo - Update information from checkForUpdates
 * @param {string} expectedHash - Expected SHA-256 hash (optional)
 * @returns {Promise<Object>} Downloaded plugin data and verification result
 */
export async function downloadAndVerifyUpdate(updateInfo, expectedHash = null) {
  if (!updateInfo.asset?.downloadUrl) {
    throw new Error('No download URL available')
  }

  // Download the release
  const data = await downloadRelease(updateInfo.asset.downloadUrl)
  
  // Verify integrity if hash provided
  let verified = true
  let actualHash = null
  
  if (expectedHash) {
    actualHash = await calculateHash(data)
    verified = actualHash === expectedHash
  }

  return {
    data,
    size: data.byteLength,
    verified,
    actualHash,
    expectedHash,
    version: updateInfo.latestVersion
  }
}

// ============================================================================
// Update Notification Manager
// ============================================================================

/**
 * Manages update notifications for plugins
 */
export class ZPEUpdateManager {
  constructor() {
    this.checkInterval = null
    this.plugins = new Map()
    this.updateCallbacks = new Set()
    this.lastCheck = null
  }

  /**
   * Register a plugin for update checking
   * @param {string} pluginId - Plugin ID
   * @param {Object} pluginInfo - Plugin manifest info
   */
  registerPlugin(pluginId, pluginInfo) {
    if (pluginInfo.repository) {
      this.plugins.set(pluginId, {
        version: pluginInfo.version,
        repository: pluginInfo.repository,
        lastCheck: null,
        updateInfo: null
      })
    }
  }

  /**
   * Unregister a plugin from update checking
   * @param {string} pluginId - Plugin ID
   */
  unregisterPlugin(pluginId) {
    this.plugins.delete(pluginId)
  }

  /**
   * Add a callback for update notifications
   * @param {Function} callback - Callback function(pluginId, updateInfo)
   */
  onUpdateAvailable(callback) {
    this.updateCallbacks.add(callback)
  }

  /**
   * Remove an update callback
   * @param {Function} callback - Callback to remove
   */
  offUpdateAvailable(callback) {
    this.updateCallbacks.delete(callback)
  }

  /**
   * Check for updates for a specific plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<VersionCheckResult>} Check result
   */
  async checkPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not registered for updates`)
    }

    const result = await checkForUpdates(plugin.repository, plugin.version)
    plugin.lastCheck = new Date()
    plugin.updateInfo = result

    if (result.updateAvailable) {
      for (const callback of this.updateCallbacks) {
        try {
          callback(pluginId, result)
        } catch (e) {
          console.error('Update callback error:', e)
        }
      }
    }

    return result
  }

  /**
   * Check all registered plugins for updates
   * @returns {Promise<Object>} Results keyed by plugin ID
   */
  async checkAllPlugins() {
    const results = {}
    
    for (const [pluginId] of this.plugins) {
      try {
        results[pluginId] = await this.checkPlugin(pluginId)
      } catch (error) {
        results[pluginId] = {
          updateAvailable: false,
          error: error.message
        }
      }
    }

    this.lastCheck = new Date()
    return results
  }

  /**
   * Start periodic update checking
   * @param {number} intervalMs - Check interval in milliseconds (default: 1 hour)
   */
  startPeriodicCheck(intervalMs = 60 * 60 * 1000) {
    this.stopPeriodicCheck()
    
    // Initial check
    this.checkAllPlugins().catch(e => console.error('Initial update check failed:', e))
    
    // Periodic check
    this.checkInterval = setInterval(() => {
      this.checkAllPlugins().catch(e => console.error('Periodic update check failed:', e))
    }, intervalMs)
  }

  /**
   * Stop periodic update checking
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Get update info for a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null} Update info or null
   */
  getUpdateInfo(pluginId) {
    return this.plugins.get(pluginId)?.updateInfo || null
  }

  /**
   * Get all plugins with available updates
   * @returns {Object[]} Array of plugins with updates
   */
  getAvailableUpdates() {
    const updates = []
    
    for (const [pluginId, plugin] of this.plugins) {
      if (plugin.updateInfo?.updateAvailable) {
        updates.push({
          pluginId,
          currentVersion: plugin.version,
          ...plugin.updateInfo
        })
      }
    }

    return updates
  }

  /**
   * Clear the version cache
   */
  clearCache() {
    versionCache.clear()
    for (const plugin of this.plugins.values()) {
      plugin.updateInfo = null
    }
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const updateManager = new ZPEUpdateManager()

export default {
  checkForUpdates,
  checkForUpdatesFromManifest,
  getReleases,
  getReleaseByTag,
  downloadRelease,
  downloadAndVerifyUpdate,
  ZPEUpdateManager,
  updateManager
}
