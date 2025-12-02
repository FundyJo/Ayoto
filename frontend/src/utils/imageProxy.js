/**
 * Image Proxy Utilities
 *
 * Provides utilities for fetching external images that have CORS restrictions
 * using Tauri's HTTP plugin which bypasses browser CORS restrictions.
 *
 * Usage:
 *   import { needsProxy, fetchProxiedImage, maybeProxyUrl } from '../utils/imageProxy'
 *
 *   // Check if URL needs proxying
 *   if (needsProxy(imageUrl)) {
 *     const dataUrl = await fetchProxiedImage(imageUrl)
 *   }
 *
 *   // Or use maybeProxyUrl for synchronous cases (returns original URL if no proxy needed)
 *   <img src={maybeProxyUrl(imageUrl)} />
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

/**
 * Domains that are known to have CORS restrictions and need proxying
 */
const CORS_RESTRICTED_DOMAINS = [
  'aniworld.to',
  's.to',
  'serienstream.to',
  'bs.to',
  'burningseries.co',
  // Add more domains as needed
]

/**
 * Cache for proxied image data URLs
 * Key: original URL, Value: data URL or Promise
 */
const imageCache = new Map()

/**
 * Maximum cache size (number of images)
 */
const MAX_CACHE_SIZE = 100

/**
 * Check if an image URL needs to be proxied
 * @param {string} url - Image URL to check
 * @returns {boolean} True if the URL needs proxying
 */
export function needsProxy(url) {
  if (!url) return false

  // Don't proxy data URLs or local URLs
  if (url.startsWith('data:')) return false
  if (url.startsWith('blob:')) return false
  if (url.startsWith('/')) return false
  if (url.includes('localhost')) return false
  if (url.includes('127.0.0.1')) return false

  // Check if the URL is from a known CORS-restricted domain
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    for (const domain of CORS_RESTRICTED_DOMAINS) {
      if (hostname.includes(domain)) {
        return true
      }
    }
  } catch {
    // Invalid URL, don't proxy
    return false
  }

  return false
}

/**
 * Check if Tauri API is available
 * @returns {boolean} True if running in Tauri context
 */
function isTauriAvailable() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__
}

/**
 * Fetch an image using Tauri's HTTP plugin and return as data URL
 * This bypasses CORS restrictions because the request is made from Rust, not the browser
 * @param {string} url - Image URL to fetch
 * @returns {Promise<string>} Data URL of the image
 */
export async function fetchProxiedImage(url) {
  if (!url) return url

  // Check cache first
  if (imageCache.has(url)) {
    const cached = imageCache.get(url)
    // If it's a promise, wait for it
    if (cached instanceof Promise) {
      return cached
    }
    return cached
  }

  // If not in Tauri context or doesn't need proxy, return original URL
  if (!isTauriAvailable() || !needsProxy(url)) {
    return url
  }

  // Create and cache the fetch promise
  const fetchPromise = (async () => {
    try {
      // Parse URL to get referer
      const urlObj = new URL(url)
      const refererOrigin = `${urlObj.protocol}//${urlObj.host}`

      // Fetch using Tauri's HTTP plugin (bypasses CORS)
      // Using a generic modern browser user agent for compatibility
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ZenshinApp/1.0)',
          'Referer': refererOrigin,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      })

      if (!response.ok) {
        console.warn(`Failed to fetch image: ${url} - HTTP ${response.status}`)
        // Return original URL as fallback
        imageCache.set(url, url)
        return url
      }

      // Get content type and binary data
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await response.arrayBuffer()
      
      // Convert to base64 data URL using efficient array join
      const uint8Array = new Uint8Array(arrayBuffer)
      const chunkSize = 8192
      const chunks = []
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length))
        chunks.push(String.fromCharCode.apply(null, chunk))
      }
      const base64 = btoa(chunks.join(''))
      const dataUrl = `data:${contentType};base64,${base64}`

      // Cache the result
      imageCache.set(url, dataUrl)

      // Prune cache if too large
      if (imageCache.size > MAX_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value
        imageCache.delete(firstKey)
      }

      return dataUrl
    } catch (error) {
      console.warn(`Image proxy error for ${url}:`, error.message)
      // Cache original URL as fallback
      imageCache.set(url, url)
      return url
    }
  })()

  // Cache the promise while fetching
  imageCache.set(url, fetchPromise)
  return fetchPromise
}

/**
 * Get a proxied URL if needed, otherwise return the original
 * Note: This is synchronous and returns the original URL immediately.
 * For CORS-restricted URLs, use fetchProxiedImage() for async fetching,
 * or use the ProxiedImage React component.
 * @param {string} url - Image URL
 * @param {number} [_backendPort] - Deprecated, kept for backward compatibility
 * @returns {string} URL (original URL, or cached data URL if available)
 */
export function maybeProxyUrl(url, _backendPort) {
  if (!url) return url
  
  // Return cached data URL if available
  if (imageCache.has(url)) {
    const cached = imageCache.get(url)
    if (!(cached instanceof Promise)) {
      return cached
    }
  }
  
  // For URLs that need proxy, trigger async fetch in background
  // and return original URL for now (React will re-render when cache is populated)
  if (needsProxy(url) && isTauriAvailable()) {
    // Start fetching in background (don't await)
    fetchProxiedImage(url).catch(() => {
      // Silently ignore errors - original URL will be used
    })
  }
  
  // Return original URL (may fail due to CORS, but cached version will work on re-render)
  return url
}

/**
 * Get a proxied URL for an external image (deprecated - use fetchProxiedImage)
 * @deprecated Use fetchProxiedImage() for async fetching or maybeProxyUrl() for sync access
 * @param {string} url - Original image URL
 * @param {number} [_backendPort] - Deprecated, no longer used
 * @returns {string} Original URL (proxy endpoint no longer used)
 */
export function getProxiedImageUrl(url, _backendPort) {
  return maybeProxyUrl(url)
}

/**
 * Add a domain to the list of CORS-restricted domains
 * @param {string} domain - Domain to add
 */
export function addCorsRestrictedDomain(domain) {
  if (domain && !CORS_RESTRICTED_DOMAINS.includes(domain.toLowerCase())) {
    CORS_RESTRICTED_DOMAINS.push(domain.toLowerCase())
  }
}

/**
 * Get the list of CORS-restricted domains
 * @returns {string[]} List of domains
 */
export function getCorsRestrictedDomains() {
  return [...CORS_RESTRICTED_DOMAINS]
}

/**
 * Clear the image cache
 */
export function clearImageCache() {
  imageCache.clear()
}

export default {
  needsProxy,
  fetchProxiedImage,
  getProxiedImageUrl,
  maybeProxyUrl,
  addCorsRestrictedDomain,
  getCorsRestrictedDomains,
  clearImageCache
}
