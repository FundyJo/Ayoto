/**
 * ZPE Security Module
 * 
 * Provides security features for the ZPE plugin system:
 * - Plugin code signing and verification
 * - Integrity hash validation (SHA-256)
 * - Content Security Policy enforcement
 * - Sandboxed execution environment
 * - Permission-based access control
 * - Domain allowlist validation
 */

import { ZPE_PERMISSION } from './ZPEManifest.js'

// ============================================================================
// Security Constants
// ============================================================================

/**
 * ZPE file magic bytes for format identification
 */
export const ZPE_MAGIC_BYTES = [0x5A, 0x50, 0x45, 0x21] // "ZPE!"

/**
 * Current ZPE format version
 */
export const ZPE_FORMAT_VERSION = 1

/**
 * Encryption algorithm used
 */
export const ZPE_ENCRYPTION = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  TAG_LENGTH: 128
}

/**
 * Hash algorithm for integrity checks
 */
export const ZPE_HASH_ALGORITHM = 'SHA-256'

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * Calculate SHA-256 hash of data
 * @param {string|ArrayBuffer} data - Data to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function calculateHash(data) {
  const encoder = new TextEncoder()
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data
  const hashBuffer = await crypto.subtle.digest(ZPE_HASH_ALGORITHM, dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Calculate integrity hash with prefix
 * @param {string} code - Code to hash
 * @returns {Promise<string>} Integrity hash with sha256- prefix
 */
export async function calculateIntegrityHash(code) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest(ZPE_HASH_ALGORITHM, dataBuffer)
  const base64Hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
  return `sha256-${base64Hash}`
}

/**
 * Verify integrity hash
 * @param {string} code - Code to verify
 * @param {string} expectedHash - Expected hash with sha256- prefix
 * @returns {Promise<boolean>} True if hash matches
 */
export async function verifyIntegrityHash(code, expectedHash) {
  const actualHash = await calculateIntegrityHash(code)
  return actualHash === expectedHash
}

/**
 * Generate a random encryption key
 * @returns {Promise<CryptoKey>} Generated AES-GCM key
 */
export async function generateEncryptionKey() {
  return await crypto.subtle.generateKey(
    {
      name: ZPE_ENCRYPTION.ALGORITHM,
      length: ZPE_ENCRYPTION.KEY_LENGTH
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Export encryption key to raw bytes
 * @param {CryptoKey} key - Key to export
 * @returns {Promise<ArrayBuffer>} Raw key bytes
 */
export async function exportKey(key) {
  return await crypto.subtle.exportRaw('raw', key)
}

/**
 * Import encryption key from raw bytes
 * @param {ArrayBuffer} keyData - Raw key data
 * @returns {Promise<CryptoKey>} Imported key
 */
export async function importKey(keyData) {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ZPE_ENCRYPTION.ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with AES-GCM
 * @param {string} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Encrypted data with IV
 */
export async function encryptData(data, key) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const iv = crypto.getRandomValues(new Uint8Array(ZPE_ENCRYPTION.IV_LENGTH))
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ZPE_ENCRYPTION.ALGORITHM,
      iv: iv,
      tagLength: ZPE_ENCRYPTION.TAG_LENGTH
    },
    key,
    dataBuffer
  )

  return {
    encrypted: new Uint8Array(encryptedBuffer),
    iv: iv
  }
}

/**
 * Decrypt data with AES-GCM
 * @param {Uint8Array} encryptedData - Encrypted data
 * @param {Uint8Array} iv - Initialization vector
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted string
 */
export async function decryptData(encryptedData, iv, key) {
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ZPE_ENCRYPTION.ALGORITHM,
      iv: iv,
      tagLength: ZPE_ENCRYPTION.TAG_LENGTH
    },
    key,
    encryptedData
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

// ============================================================================
// Code Signing
// ============================================================================

/**
 * Generate ECDSA key pair for code signing
 * @returns {Promise<CryptoKeyPair>} Key pair for signing/verification
 */
export async function generateSigningKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-384'
    },
    true,
    ['sign', 'verify']
  )
}

/**
 * Sign plugin code
 * @param {string} code - Code to sign
 * @param {CryptoKey} privateKey - Private signing key
 * @returns {Promise<string>} Base64-encoded signature
 */
export async function signCode(code, privateKey) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(code)
  
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: ZPE_HASH_ALGORITHM }
    },
    privateKey,
    dataBuffer
  )

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/**
 * Verify code signature
 * @param {string} code - Code that was signed
 * @param {string} signature - Base64-encoded signature
 * @param {CryptoKey} publicKey - Public verification key
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifySignature(code, signature, publicKey) {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(code)
  const sigBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0))

  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: ZPE_HASH_ALGORITHM }
    },
    publicKey,
    sigBuffer,
    dataBuffer
  )
}

/**
 * Export public key to JWK format
 * @param {CryptoKey} publicKey - Public key to export
 * @returns {Promise<Object>} JWK representation
 */
export async function exportPublicKey(publicKey) {
  return await crypto.subtle.exportKey('jwk', publicKey)
}

/**
 * Import public key from JWK format
 * @param {Object} jwk - JWK representation
 * @returns {Promise<CryptoKey>} Imported public key
 */
export async function importPublicKey(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-384'
    },
    true,
    ['verify']
  )
}

// ============================================================================
// Permission System
// ============================================================================

/**
 * Permission manager for plugins
 */
export class ZPEPermissionManager {
  constructor() {
    this.grantedPermissions = new Map()
  }

  /**
   * Check if a plugin has a specific permission
   * @param {string} pluginId - Plugin ID
   * @param {string} permission - Permission to check
   * @returns {boolean} True if permission is granted
   */
  hasPermission(pluginId, permission) {
    const permissions = this.grantedPermissions.get(pluginId)
    return permissions?.has(permission) ?? false
  }

  /**
   * Grant permissions to a plugin
   * @param {string} pluginId - Plugin ID
   * @param {string[]} permissions - Permissions to grant
   */
  grantPermissions(pluginId, permissions) {
    let pluginPerms = this.grantedPermissions.get(pluginId)
    if (!pluginPerms) {
      pluginPerms = new Set()
      this.grantedPermissions.set(pluginId, pluginPerms)
    }
    
    for (const perm of permissions) {
      if (Object.values(ZPE_PERMISSION).includes(perm)) {
        pluginPerms.add(perm)
      }
    }
  }

  /**
   * Revoke permissions from a plugin
   * @param {string} pluginId - Plugin ID
   * @param {string[]} permissions - Permissions to revoke (or all if empty)
   */
  revokePermissions(pluginId, permissions = []) {
    if (permissions.length === 0) {
      this.grantedPermissions.delete(pluginId)
    } else {
      const pluginPerms = this.grantedPermissions.get(pluginId)
      if (pluginPerms) {
        for (const perm of permissions) {
          pluginPerms.delete(perm)
        }
      }
    }
  }

  /**
   * Get all permissions for a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {string[]} Array of granted permissions
   */
  getPermissions(pluginId) {
    const permissions = this.grantedPermissions.get(pluginId)
    return permissions ? Array.from(permissions) : []
  }

  /**
   * Check if plugin can make HTTP requests
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  canUseHttp(pluginId) {
    return this.hasPermission(pluginId, ZPE_PERMISSION.NETWORK_HTTP)
  }

  /**
   * Check if plugin can use local storage
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  canUseStorage(pluginId) {
    return this.hasPermission(pluginId, ZPE_PERMISSION.STORAGE_LOCAL)
  }

  /**
   * Check if plugin can show notifications
   * @param {string} pluginId - Plugin ID
   * @returns {boolean}
   */
  canShowNotifications(pluginId) {
    return this.hasPermission(pluginId, ZPE_PERMISSION.UI_NOTIFICATION)
  }
}

// ============================================================================
// Domain Allowlist
// ============================================================================

/**
 * Validate if a URL is allowed by the plugin's domain allowlist
 * @param {string} url - URL to validate
 * @param {string[]} allowedDomains - Array of allowed domain patterns
 * @returns {boolean} True if URL is allowed
 */
export function isUrlAllowed(url, allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true // No restrictions
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    for (const pattern of allowedDomains) {
      if (matchDomainPattern(hostname, pattern.toLowerCase())) {
        return true
      }
    }

    return false
  } catch {
    return false // Invalid URL
  }
}

/**
 * Match a hostname against a domain pattern
 * @param {string} hostname - Hostname to check
 * @param {string} pattern - Domain pattern (supports *.domain.com)
 * @returns {boolean} True if matches
 */
function matchDomainPattern(hostname, pattern) {
  if (pattern.startsWith('*.')) {
    // Wildcard subdomain match
    const baseDomain = pattern.slice(2)
    return hostname === baseDomain || hostname.endsWith('.' + baseDomain)
  }
  return hostname === pattern
}

// ============================================================================
// Sandboxed Execution
// ============================================================================

/**
 * Create a sandboxed execution context for plugin code
 * @param {string} pluginId - Plugin ID
 * @param {Object} allowedGlobals - Allowed global objects
 * @returns {Object} Sandboxed context
 */
export function createSandboxContext(pluginId, allowedGlobals = {}) {
  // Create a proxy that restricts access to globals
  const restrictedGlobals = new Proxy({}, {
    get(target, prop) {
      // Allow certain safe globals
      const safeGlobals = [
        'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
        'Math', 'JSON', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
        'Promise', 'Symbol', 'Proxy', 'Reflect',
        'Error', 'TypeError', 'RangeError', 'SyntaxError',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite',
        'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
        'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'atob', 'btoa', 'TextEncoder', 'TextDecoder',
        'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array', 'Int32Array',
        'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView'
      ]

      if (safeGlobals.includes(prop)) {
        return globalThis[prop]
      }

      // Allow explicitly provided globals
      if (prop in allowedGlobals) {
        return allowedGlobals[prop]
      }

      // Block access to dangerous globals
      const blockedGlobals = [
        'eval', 'Function', 'window', 'document', 'globalThis',
        'process', 'require', 'module', 'exports', '__dirname', '__filename',
        'fetch', 'XMLHttpRequest', 'WebSocket', // Use plugin's HTTP client instead
        'localStorage', 'sessionStorage', 'indexedDB', // Use plugin's storage
        'navigator', 'location', 'history'
      ]

      if (blockedGlobals.includes(prop)) {
        console.warn(`[ZPE Security] Plugin '${pluginId}' attempted to access blocked global: ${prop}`)
        return undefined
      }

      return undefined
    },
    has(target, prop) {
      return true // Prevent 'prop in window' checks
    },
    set() {
      return false // Prevent setting globals
    }
  })

  return restrictedGlobals
}

/**
 * Execute plugin code in a sandboxed environment
 * @param {string} code - Plugin code
 * @param {string} pluginId - Plugin ID
 * @param {Object} context - Plugin context (http, storage, etc.)
 * @returns {Object} Plugin module exports
 */
export function executeSandboxed(code, pluginId, context) {
  // Create sandbox with allowed context
  const sandbox = createSandboxContext(pluginId, {
    console: createSecureConsole(pluginId),
    ...context
  })

  // Wrap code in strict mode and module pattern
  const wrappedCode = `
    "use strict";
    const module = { exports: {} };
    const exports = module.exports;
    
    // Inject plugin context
    const context = arguments[0];
    const http = context.http;
    const html = context.html;
    const storage = context.storage;
    const STREAM_FORMAT = context.STREAM_FORMAT;
    const PLUGIN_TYPE = context.PLUGIN_TYPE;
    
    ${code}
    
    return module.exports;
  `

  try {
    // Create function in sandbox context
    // Using Function constructor but with restricted scope
    const sandboxedFunc = new Function('sandbox', `
      with (sandbox) {
        return (function(context) {
          ${wrappedCode}
        });
      }
    `)(sandbox)

    return sandboxedFunc(context)
  } catch (error) {
    console.error(`[ZPE Security] Plugin '${pluginId}' execution error:`, error)
    throw new Error(`Plugin execution failed: ${error.message}`)
  }
}

/**
 * Create a secure console logger for plugins
 * @param {string} pluginId - Plugin ID for prefixing
 * @returns {Object} Secure console object
 */
function createSecureConsole(pluginId) {
  const prefix = `[ZPE:${pluginId}]`
  return {
    log: (...args) => console.log(prefix, ...args),
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    debug: (...args) => console.debug(prefix, ...args),
    trace: () => {}, // Disabled for security
    dir: () => {},   // Disabled for security
    table: () => {}  // Disabled for security
  }
}

// ============================================================================
// Security Audit
// ============================================================================

/**
 * Dangerous patterns to detect in plugin code
 */
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/g, reason: 'eval() is not allowed' },
  { pattern: /\bnew\s+Function\s*\(/g, reason: 'new Function() is not allowed' },
  { pattern: /\bdocument\./g, reason: 'Direct DOM access is not allowed' },
  { pattern: /\bwindow\./g, reason: 'window object access is not allowed' },
  { pattern: /\bglobalThis\./g, reason: 'globalThis access is not allowed' },
  { pattern: /\brequire\s*\(/g, reason: 'require() is not allowed in browser' },
  { pattern: /\bprocess\./g, reason: 'process object is not allowed' },
  { pattern: /\b__dirname\b/g, reason: '__dirname is not allowed' },
  { pattern: /\b__filename\b/g, reason: '__filename is not allowed' },
  { pattern: /\bimport\s*\(/g, reason: 'Dynamic imports are not allowed' },
  { pattern: /\bfetch\s*\(/g, reason: 'Use context.http instead of fetch()' },
  { pattern: /\bXMLHttpRequest\b/g, reason: 'Use context.http instead of XMLHttpRequest' },
  { pattern: /\blocalStorage\b/g, reason: 'Use context.storage instead of localStorage' },
  { pattern: /\bsessionStorage\b/g, reason: 'sessionStorage is not allowed' },
  { pattern: /\bindexedDB\b/g, reason: 'indexedDB is not allowed' },
  { pattern: /<script/gi, reason: 'Script tags are not allowed' },
  { pattern: /javascript:/gi, reason: 'javascript: URLs are not allowed' },
  { pattern: /\bWebSocket\s*\(/g, reason: 'Direct WebSocket is not allowed' }
]

/**
 * Audit plugin code for security issues
 * @param {string} code - Plugin code to audit
 * @returns {Object} Audit result with issues and warnings
 */
export function auditPluginCode(code) {
  const issues = []
  const warnings = []

  // Check for dangerous patterns
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      issues.push({
        type: 'security',
        severity: 'high',
        message: reason,
        pattern: pattern.source
      })
    }
    // Reset regex state
    pattern.lastIndex = 0
  }

  // Check for obfuscated code patterns
  if (/\\x[0-9a-f]{2}/gi.test(code) || /\\u[0-9a-f]{4}/gi.test(code)) {
    warnings.push({
      type: 'obfuscation',
      severity: 'medium',
      message: 'Code contains hex/unicode escape sequences that may indicate obfuscation'
    })
  }

  // Check for base64 encoded strings (potential hidden code)
  const base64Pattern = /['"]((?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)['"]/g
  let match
  while ((match = base64Pattern.exec(code)) !== null) {
    warnings.push({
      type: 'encoding',
      severity: 'low',
      message: 'Code contains long base64-encoded strings',
      position: match.index
    })
  }

  // Check code complexity (very long single lines might indicate minification/obfuscation)
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 1000) {
      warnings.push({
        type: 'complexity',
        severity: 'low',
        message: `Line ${i + 1} is very long (${lines[i].length} chars), may indicate obfuscation`,
        line: i + 1
      })
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    summary: {
      totalIssues: issues.length,
      totalWarnings: warnings.length,
      highSeverity: issues.filter(i => i.severity === 'high').length,
      mediumSeverity: [...issues, ...warnings].filter(i => i.severity === 'medium').length,
      lowSeverity: [...issues, ...warnings].filter(i => i.severity === 'low').length
    }
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const permissionManager = new ZPEPermissionManager()

export default {
  ZPE_MAGIC_BYTES,
  ZPE_FORMAT_VERSION,
  ZPE_ENCRYPTION,
  ZPE_HASH_ALGORITHM,
  calculateHash,
  calculateIntegrityHash,
  verifyIntegrityHash,
  generateEncryptionKey,
  encryptData,
  decryptData,
  generateSigningKeyPair,
  signCode,
  verifySignature,
  exportPublicKey,
  importPublicKey,
  ZPEPermissionManager,
  permissionManager,
  isUrlAllowed,
  createSandboxContext,
  executeSandboxed,
  auditPluginCode
}
