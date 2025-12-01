/**
 * Image Proxy Utilities
 *
 * Provides utilities for proxying external images through the backend
 * to bypass CORS restrictions.
 *
 * Usage:
 *   import { getProxiedImageUrl, needsProxy, ProxiedImage } from '../utils/imageProxy'
 *
 *   // Check if URL needs proxying
 *   if (needsProxy(imageUrl)) {
 *     imageUrl = getProxiedImageUrl(imageUrl, backendPort)
 *   }
 *
 *   // Or use the component
 *   <ProxiedImage src={imageUrl} alt="Cover" />
 */

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
 * Get a proxied URL for an external image
 * @param {string} url - Original image URL
 * @param {number} [backendPort=64621] - Backend server port
 * @returns {string} Proxied URL that goes through the backend
 */
export function getProxiedImageUrl(url, backendPort = 64621) {
  if (!url) return url

  // Check if already proxied
  if (url.includes('/proxy/image')) return url

  // Don't proxy URLs that don't need it
  if (!needsProxy(url)) return url

  // Encode the URL and create the proxy URL
  const encodedUrl = encodeURIComponent(url)
  return `http://localhost:${backendPort}/proxy/image?url=${encodedUrl}`
}

/**
 * Get a proxied URL if needed, otherwise return the original
 * @param {string} url - Image URL
 * @param {number} [backendPort=64621] - Backend server port
 * @returns {string} URL (proxied if needed)
 */
export function maybeProxyUrl(url, backendPort = 64621) {
  if (needsProxy(url)) {
    return getProxiedImageUrl(url, backendPort)
  }
  return url
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

export default {
  needsProxy,
  getProxiedImageUrl,
  maybeProxyUrl,
  addCorsRestrictedDomain,
  getCorsRestrictedDomains
}
