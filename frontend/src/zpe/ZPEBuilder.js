/**
 * ZPE Builder
 * 
 * Build system for creating secure .zpe plugin packages:
 * - Compiles JavaScript/TypeScript plugins
 * - Validates manifest and code
 * - Signs and encrypts plugin packages
 * - Creates distributable .zpe files
 */

import {
  ZPE_MAGIC_BYTES,
  ZPE_FORMAT_VERSION,
  calculateHash,
  calculateIntegrityHash,
  encryptData,
  generateEncryptionKey,
  auditPluginCode
} from './ZPESecurity.js'

import {
  validateZPEManifest,
  ZPE_PLUGIN_TYPE,
  ZPE_PERMISSION
} from './ZPEManifest.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * ZPE file sections
 */
const ZPE_SECTION = {
  HEADER: 0x01,
  MANIFEST: 0x02,
  CODE: 0x03,
  ASSETS: 0x04,
  SIGNATURE: 0x05,
  METADATA: 0x06
}

/**
 * Compression types
 */
const ZPE_COMPRESSION = {
  NONE: 0x00,
  GZIP: 0x01,
  DEFLATE: 0x02
}

/**
 * Encryption types
 */
const ZPE_ENCRYPTION_TYPE = {
  NONE: 0x00,
  AES_GCM: 0x01
}

// ============================================================================
// Build Result Types
// ============================================================================

/**
 * @typedef {Object} ZPEBuildResult
 * @property {boolean} success - Build succeeded
 * @property {Uint8Array} [data] - Built ZPE file data
 * @property {string} [filename] - Suggested filename
 * @property {Object} [metadata] - Build metadata
 * @property {string[]} errors - Build errors
 * @property {string[]} warnings - Build warnings
 */

/**
 * @typedef {Object} ZPEBuildOptions
 * @property {boolean} [minify] - Minify plugin code
 * @property {boolean} [encrypt] - Encrypt plugin package
 * @property {boolean} [sign] - Sign plugin package
 * @property {CryptoKey} [signingKey] - Private key for signing
 * @property {boolean} [includeSourceMap] - Include source map
 * @property {Object} [assets] - Additional assets to include
 * @property {boolean} [strictMode] - Strict security validation
 */

// ============================================================================
// ZPE Builder Class
// ============================================================================

/**
 * ZPE Plugin Builder
 * Builds secure plugin packages from source
 */
export class ZPEBuilder {
  constructor(options = {}) {
    this.options = {
      minify: options.minify ?? true,
      encrypt: options.encrypt ?? false,
      sign: options.sign ?? false,
      includeSourceMap: options.includeSourceMap ?? false,
      strictMode: options.strictMode ?? true,
      ...options
    }
  }

  /**
   * Build a ZPE plugin package
   * @param {Object} manifest - Plugin manifest
   * @param {string} code - Plugin JavaScript code
   * @param {Object} options - Build options override
   * @returns {Promise<ZPEBuildResult>} Build result
   */
  async build(manifest, code, options = {}) {
    const opts = { ...this.options, ...options }
    const errors = []
    const warnings = []

    // Step 1: Validate manifest
    const manifestValidation = validateZPEManifest(manifest)
    if (!manifestValidation.valid) {
      return {
        success: false,
        errors: manifestValidation.errors,
        warnings: manifestValidation.warnings
      }
    }
    warnings.push(...manifestValidation.warnings)

    // Step 2: Security audit of code
    if (opts.strictMode) {
      const audit = auditPluginCode(code)
      if (!audit.passed) {
        errors.push(...audit.issues.map(i => i.message))
      }
      warnings.push(...audit.warnings.map(w => w.message))

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }
    }

    // Step 3: Process code
    let processedCode = code
    
    // Add strict mode if not present
    if (!processedCode.trim().startsWith('"use strict"') && !processedCode.trim().startsWith("'use strict'")) {
      processedCode = '"use strict";\n' + processedCode
    }

    // Step 4: Calculate integrity hash
    const integrityHash = await calculateIntegrityHash(processedCode)
    manifest.security = manifest.security || {}
    manifest.security.integrityHash = integrityHash

    // Step 5: Build ZPE binary format
    try {
      const zpeData = await this._buildZPEBinary(manifest, processedCode, opts)
      
      // Generate filename
      const filename = `${manifest.id}-${manifest.version}.zpe`

      // Calculate file hash
      const fileHash = await calculateHash(zpeData)

      return {
        success: true,
        data: zpeData,
        filename,
        metadata: {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          size: zpeData.byteLength,
          hash: fileHash,
          integrityHash,
          builtAt: new Date().toISOString(),
          encrypted: opts.encrypt,
          signed: opts.sign
        },
        errors: [],
        warnings
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Build failed: ${error.message}`],
        warnings
      }
    }
  }

  /**
   * Build the ZPE binary format
   * @param {Object} manifest - Plugin manifest
   * @param {string} code - Processed plugin code
   * @param {Object} opts - Build options
   * @returns {Promise<Uint8Array>} ZPE binary data
   */
  async _buildZPEBinary(manifest, code, opts) {
    const encoder = new TextEncoder()
    const sections = []

    // Header (raw, not wrapped - magic bytes must be at position 0)
    const header = this._buildHeader(opts)
    sections.push(header)

    // Section 1: Manifest
    const manifestJson = JSON.stringify(manifest)
    let manifestData = encoder.encode(manifestJson)
    sections.push(this._wrapSection(ZPE_SECTION.MANIFEST, manifestData))

    // Section 2: Code
    let codeData = encoder.encode(code)
    
    if (opts.encrypt) {
      const key = await generateEncryptionKey()
      const encrypted = await encryptData(code, key)
      
      // Store encrypted data with IV prepended
      const encryptedWithIv = new Uint8Array(encrypted.iv.length + encrypted.encrypted.length)
      encryptedWithIv.set(encrypted.iv, 0)
      encryptedWithIv.set(encrypted.encrypted, encrypted.iv.length)
      codeData = encryptedWithIv
      
      // Note: In a real implementation, the key would be stored securely
      // or derived from a user-provided password
    }
    
    sections.push(this._wrapSection(ZPE_SECTION.CODE, codeData))

    // Section 3: Assets (if any)
    if (opts.assets && Object.keys(opts.assets).length > 0) {
      const assetsData = encoder.encode(JSON.stringify(opts.assets))
      sections.push(this._wrapSection(ZPE_SECTION.ASSETS, assetsData))
    }

    // Section 4: Metadata
    const metadata = {
      buildTime: new Date().toISOString(),
      builder: 'ZPE Builder 1.0',
      compressed: false,
      encrypted: opts.encrypt || false
    }
    const metadataData = encoder.encode(JSON.stringify(metadata))
    sections.push(this._wrapSection(ZPE_SECTION.METADATA, metadataData))

    // Combine all sections
    const totalSize = sections.reduce((sum, s) => sum + s.length, 0)
    const result = new Uint8Array(totalSize)
    let offset = 0
    
    for (const section of sections) {
      result.set(section, offset)
      offset += section.length
    }

    return result
  }

  /**
   * Build the ZPE header
   * @param {Object} opts - Build options
   * @returns {Uint8Array} Header data
   */
  _buildHeader(opts) {
    const header = new Uint8Array(16)
    
    // Magic bytes (4 bytes): "ZPE!"
    header.set(ZPE_MAGIC_BYTES, 0)
    
    // Version (2 bytes)
    header[4] = ZPE_FORMAT_VERSION
    header[5] = 0
    
    // Flags (2 bytes)
    let flags = 0
    if (opts.encrypt) flags |= 0x01
    if (opts.sign) flags |= 0x02
    header[6] = flags & 0xFF
    header[7] = (flags >> 8) & 0xFF
    
    // Compression type (1 byte)
    header[8] = ZPE_COMPRESSION.NONE
    
    // Encryption type (1 byte)
    header[9] = opts.encrypt ? ZPE_ENCRYPTION_TYPE.AES_GCM : ZPE_ENCRYPTION_TYPE.NONE
    
    // Reserved (6 bytes)
    // header[10-15] = 0
    
    return header
  }

  /**
   * Wrap data in a section format
   * @param {number} sectionType - Section type identifier
   * @param {Uint8Array} data - Section data
   * @returns {Uint8Array} Wrapped section
   */
  _wrapSection(sectionType, data) {
    // Section format: [type(1)] [length(4)] [data(n)]
    const section = new Uint8Array(5 + data.length)
    
    // Section type
    section[0] = sectionType
    
    // Data length (little-endian 32-bit)
    const length = data.length
    section[1] = length & 0xFF
    section[2] = (length >> 8) & 0xFF
    section[3] = (length >> 16) & 0xFF
    section[4] = (length >> 24) & 0xFF
    
    // Data
    section.set(data, 5)
    
    return section
  }

  /**
   * Validate plugin code syntax
   * Uses a safe approach that doesn't execute the code
   * @param {string} code - Code to validate
   * @returns {Object} Validation result
   */
  validateSyntax(code) {
    try {
      // Basic syntax checks without executing the code
      const errors = []
      
      // Check for balanced braces, brackets, and parentheses
      const balanceCheck = this._checkBracketBalance(code)
      if (!balanceCheck.balanced) {
        errors.push({
          message: `Unbalanced ${balanceCheck.type}: expected ${balanceCheck.expected}, found ${balanceCheck.found}`,
          line: balanceCheck.line || null
        })
      }
      
      // Check for common syntax issues
      const syntaxIssues = this._checkCommonSyntaxIssues(code)
      errors.push(...syntaxIssues)
      
      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      return {
        valid: false,
        errors: [{
          message: error.message,
          line: this._extractLineFromError(error)
        }]
      }
    }
  }

  /**
   * Check for balanced brackets, braces, and parentheses
   * @param {string} code - Code to check
   * @returns {Object} Balance check result
   * @private
   */
  _checkBracketBalance(code) {
    const pairs = { '{': '}', '[': ']', '(': ')' }
    const stack = []
    let inString = false
    let stringChar = null
    let inComment = false
    let inMultiComment = false
    let lineNumber = 1
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i]
      const prev = i > 0 ? code[i - 1] : ''
      const next = i < code.length - 1 ? code[i + 1] : ''
      
      if (char === '\n') lineNumber++
      
      // Track string state
      if (!inComment && !inMultiComment) {
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true
          stringChar = char
        } else if (inString && char === stringChar && prev !== '\\') {
          inString = false
          stringChar = null
        }
      }
      
      // Track comment state
      if (!inString) {
        if (!inComment && !inMultiComment && char === '/' && next === '/') {
          inComment = true
        } else if (!inComment && !inMultiComment && char === '/' && next === '*') {
          inMultiComment = true
        } else if (inComment && char === '\n') {
          inComment = false
        } else if (inMultiComment && char === '*' && next === '/') {
          inMultiComment = false
        }
      }
      
      // Check brackets outside strings and comments
      if (!inString && !inComment && !inMultiComment) {
        if (pairs[char]) {
          stack.push({ char, line: lineNumber })
        } else if (Object.values(pairs).includes(char)) {
          if (stack.length === 0) {
            return { balanced: false, type: 'bracket', expected: 'opening', found: char, line: lineNumber }
          }
          const last = stack.pop()
          if (pairs[last.char] !== char) {
            return { balanced: false, type: 'bracket', expected: pairs[last.char], found: char, line: lineNumber }
          }
        }
      }
    }
    
    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1]
      return { balanced: false, type: 'bracket', expected: pairs[unclosed.char], found: 'EOF', line: unclosed.line }
    }
    
    return { balanced: true }
  }

  /**
   * Check for common syntax issues
   * @param {string} code - Code to check
   * @returns {Array} Array of syntax issues
   * @private
   */
  _checkCommonSyntaxIssues(code) {
    const issues = []
    const lines = code.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1
      
      // Check for multiple consecutive assignment operators
      if (/===\s*===|!==\s*!==|==\s*==/.test(line)) {
        issues.push({ message: 'Suspicious consecutive comparison operators', line: lineNum })
      }
      
      // Check for missing semicolons before certain keywords (heuristic)
      if (/[a-zA-Z0-9_)}\]]\s*(function|class|const|let|var|if|for|while)\s+/.test(line)) {
        // This is a heuristic and may have false positives
      }
    }
    
    return issues
  }

  /**
   * Extract line number from syntax error
   * @param {Error} error - Syntax error
   * @returns {number|null} Line number or null
   */
  _extractLineFromError(error) {
    const match = error.message.match(/line (\d+)/i)
    return match ? parseInt(match[1], 10) : null
  }
}

// ============================================================================
// ZPE Parser (for reading .zpe files)
// ============================================================================

/**
 * Parse a ZPE plugin package
 */
export class ZPEParser {
  /**
   * Parse ZPE binary data
   * @param {ArrayBuffer|Uint8Array} data - ZPE file data
   * @returns {Object} Parsed plugin data
   */
  static parse(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const decoder = new TextDecoder()
    
    // Validate file has minimum size
    if (bytes.length < 16) {
      const errorDetails = this._createDetailedError(
        'File too small',
        bytes,
        `File size: ${bytes.length} bytes (minimum required: 16 bytes)`
      )
      throw new Error(errorDetails)
    }
    
    // Verify magic bytes with detailed error
    const actualMagic = Array.from(bytes.slice(0, 4))
    const expectedMagic = ZPE_MAGIC_BYTES
    let magicMismatch = false
    
    for (let i = 0; i < 4; i++) {
      if (bytes[i] !== ZPE_MAGIC_BYTES[i]) {
        magicMismatch = true
        break
      }
    }
    
    if (magicMismatch) {
      const errorDetails = this._createDetailedError(
        'Invalid magic bytes',
        bytes,
        this._formatMagicBytesError(actualMagic, expectedMagic)
      )
      throw new Error(errorDetails)
    }

    // Parse header
    const header = this._parseHeader(bytes)
    
    // Parse sections
    const sections = this._parseSections(bytes, 16)
    
    // Extract manifest
    const manifestSection = sections.find(s => s.type === ZPE_SECTION.MANIFEST)
    if (!manifestSection) {
      throw new Error('Invalid ZPE file: missing manifest')
    }
    const manifest = JSON.parse(decoder.decode(manifestSection.data))
    
    // Extract code
    const codeSection = sections.find(s => s.type === ZPE_SECTION.CODE)
    if (!codeSection) {
      throw new Error('Invalid ZPE file: missing code')
    }
    
    let code
    if (header.encrypted) {
      // Code is encrypted - will need to be decrypted separately
      code = null
    } else {
      code = decoder.decode(codeSection.data)
    }
    
    // Extract metadata
    const metadataSection = sections.find(s => s.type === ZPE_SECTION.METADATA)
    let metadata = {}
    if (metadataSection) {
      metadata = JSON.parse(decoder.decode(metadataSection.data))
    }
    
    // Extract assets
    const assetsSection = sections.find(s => s.type === ZPE_SECTION.ASSETS)
    let assets = {}
    if (assetsSection) {
      assets = JSON.parse(decoder.decode(assetsSection.data))
    }

    return {
      header,
      manifest,
      code,
      metadata,
      assets,
      encrypted: header.encrypted,
      signed: header.signed,
      encryptedCodeData: header.encrypted ? codeSection.data : null
    }
  }

  /**
   * Parse the ZPE header
   * @param {Uint8Array} bytes - File bytes
   * @returns {Object} Parsed header
   */
  static _parseHeader(bytes) {
    const version = bytes[4]
    const flags = bytes[6] | (bytes[7] << 8)
    
    return {
      version,
      encrypted: (flags & 0x01) !== 0,
      signed: (flags & 0x02) !== 0,
      compressionType: bytes[8],
      encryptionType: bytes[9]
    }
  }

  /**
   * Parse sections from ZPE data
   * @param {Uint8Array} bytes - File bytes
   * @param {number} offset - Starting offset (after header)
   * @returns {Object[]} Parsed sections
   */
  static _parseSections(bytes, offset) {
    const sections = []
    
    while (offset < bytes.length) {
      // Read section type
      const type = bytes[offset]
      
      // Read section length (little-endian 32-bit)
      const length = bytes[offset + 1] |
                     (bytes[offset + 2] << 8) |
                     (bytes[offset + 3] << 16) |
                     (bytes[offset + 4] << 24)
      
      // Extract section data
      const data = bytes.slice(offset + 5, offset + 5 + length)
      
      sections.push({ type, length, data })
      
      offset += 5 + length
    }
    
    return sections
  }

  /**
   * Verify ZPE file integrity
   * @param {ArrayBuffer|Uint8Array} data - ZPE file data
   * @returns {Promise<Object>} Verification result
   */
  static async verify(data) {
    try {
      const parsed = this.parse(data)
      const result = {
        valid: true,
        errors: [],
        warnings: []
      }

      // Validate manifest
      const manifestValidation = validateZPEManifest(parsed.manifest)
      if (!manifestValidation.valid) {
        result.valid = false
        result.errors.push(...manifestValidation.errors)
      }
      result.warnings.push(...manifestValidation.warnings)

      // Verify code integrity if not encrypted
      if (!parsed.encrypted && parsed.code) {
        const expectedHash = parsed.manifest.security?.integrityHash
        if (expectedHash) {
          const actualHash = await calculateIntegrityHash(parsed.code)
          if (actualHash !== expectedHash) {
            result.valid = false
            result.errors.push('Code integrity verification failed')
          }
        }
      }

      // Security audit if not encrypted
      if (!parsed.encrypted && parsed.code) {
        const audit = auditPluginCode(parsed.code)
        if (!audit.passed) {
          result.warnings.push('Code contains potentially dangerous patterns')
        }
      }

      return result
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: []
      }
    }
  }

  /**
   * Create a detailed error message for debugging
   * @param {string} errorType - Type of error
   * @param {Uint8Array} bytes - File bytes
   * @param {string} details - Additional details
   * @returns {string} Formatted error message
   * @private
   */
  static _createDetailedError(errorType, bytes, details) {
    const fileSize = bytes.length
    const firstBytes = Array.from(bytes.slice(0, Math.min(16, bytes.length)))
    const hexDump = firstBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    const asciiDump = firstBytes.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('')
    
    // Try to detect file type from magic bytes
    const detectedType = this._detectFileType(firstBytes)
    
    let message = `Invalid ZPE file: ${errorType}\n`
    message += `\n[Debug Info]\n`
    message += `  File size: ${fileSize} bytes\n`
    message += `  First ${firstBytes.length} bytes (hex): ${hexDump}\n`
    message += `  First ${firstBytes.length} bytes (ascii): ${asciiDump}\n`
    
    if (detectedType) {
      message += `  Detected file type: ${detectedType}\n`
    }
    
    if (details) {
      message += `\n[Details]\n  ${details}\n`
    }
    
    message += `\n[Expected]\n`
    message += `  ZPE files must start with magic bytes: 5A 50 45 21 ("ZPE!")\n`
    message += `\n[Possible causes]\n`
    message += `  - File is corrupted or incomplete\n`
    message += `  - File is not a valid ZPE plugin file\n`
    message += `  - File was modified after creation\n`
    message += `  - Wrong file was selected\n`
    
    return message
  }

  /**
   * Format magic bytes error message
   * @param {number[]} actual - Actual magic bytes
   * @param {number[]} expected - Expected magic bytes
   * @returns {string} Formatted comparison
   * @private
   */
  static _formatMagicBytesError(actual, expected) {
    const actualHex = actual.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    const expectedHex = expected.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
    const actualAscii = actual.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('')
    const expectedAscii = expected.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('')
    
    return `Expected: ${expectedHex} ("${expectedAscii}"), Found: ${actualHex} ("${actualAscii}")`
  }

  /**
   * Detect common file types from magic bytes
   * @param {number[]} bytes - First bytes of file
   * @returns {string|null} Detected file type or null
   * @private
   */
  static _detectFileType(bytes) {
    if (bytes.length < 4) return null
    
    // Common file signatures
    const signatures = [
      { bytes: [0x50, 0x4B, 0x03, 0x04], type: 'ZIP archive (or JAR/DOCX/etc.)' },
      { bytes: [0x50, 0x4B, 0x05, 0x06], type: 'ZIP archive (empty)' },
      { bytes: [0x1F, 0x8B], type: 'GZIP compressed file' },
      { bytes: [0x7B], type: 'JSON file (starts with "{")' },
      { bytes: [0x5B], type: 'JSON array file (starts with "[")' },
      { bytes: [0x3C, 0x3F, 0x78, 0x6D], type: 'XML file' },
      { bytes: [0x3C, 0x21, 0x44, 0x4F], type: 'HTML file' },
      { bytes: [0x3C, 0x68, 0x74, 0x6D], type: 'HTML file' },
      { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'PNG image' },
      { bytes: [0xFF, 0xD8, 0xFF], type: 'JPEG image' },
      { bytes: [0x47, 0x49, 0x46, 0x38], type: 'GIF image' },
      { bytes: [0x25, 0x50, 0x44, 0x46], type: 'PDF document' },
      { bytes: [0xEF, 0xBB, 0xBF], type: 'UTF-8 text file with BOM' },
      { bytes: [0x2F, 0x2F], type: 'JavaScript/text file (starts with "//")' },
      { bytes: [0x2F, 0x2A], type: 'JavaScript/text file (starts with "/*")' },
      { bytes: [0x27, 0x75, 0x73, 0x65], type: 'JavaScript file (starts with \'use\')' },
      { bytes: [0x22, 0x75, 0x73, 0x65], type: 'JavaScript file (starts with "use")' },
      { bytes: [0x63, 0x6F, 0x6E, 0x73], type: 'JavaScript file (starts with "cons[t]")' },
      { bytes: [0x76, 0x61, 0x72, 0x20], type: 'JavaScript file (starts with "var ")' },
      { bytes: [0x6C, 0x65, 0x74, 0x20], type: 'JavaScript file (starts with "let ")' },
    ]
    
    for (const sig of signatures) {
      let match = true
      for (let i = 0; i < sig.bytes.length && i < bytes.length; i++) {
        if (bytes[i] !== sig.bytes[i]) {
          match = false
          break
        }
      }
      if (match) return sig.type
    }
    
    // Check if it looks like plain text
    const isPlainText = bytes.every(b => (b >= 32 && b < 127) || b === 10 || b === 13 || b === 9)
    if (isPlainText) {
      return 'Plain text file (not a binary ZPE file)'
    }
    
    return null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a basic plugin template
 * @param {Object} options - Template options
 * @returns {Object} Template with manifest and code
 */
export function createPluginTemplate(options = {}) {
  const manifest = {
    id: options.id || 'my-plugin',
    name: options.name || 'My Plugin',
    version: options.version || '1.0.0',
    description: options.description || 'A ZPE plugin',
    pluginType: options.pluginType || ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    author: {
      name: options.authorName || 'Unknown',
      email: options.authorEmail || '',
      github: options.authorGithub || ''
    },
    permissions: options.permissions || [
      ZPE_PERMISSION.NETWORK_HTTP,
      ZPE_PERMISSION.STORAGE_LOCAL
    ],
    capabilities: options.capabilities || {
      search: true,
      getPopular: true
    },
    repository: options.repository || null,
    security: {
      sandboxed: true,
      cspEnabled: true,
      allowedDomains: options.allowedDomains || []
    }
  }

  const code = `/**
 * ${manifest.name} - ZPE Plugin
 * Version: ${manifest.version}
 * Author: ${manifest.author.name}
 * 
 * ${manifest.description}
 */

// Plugin implementation
const plugin = {
  // Called when the plugin is loaded
  async init(ctx) {
    this.http = ctx.http;
    this.html = ctx.html;
    this.storage = ctx.storage;
    console.log('${manifest.name} initialized');
  },

  // Search for content
  async search(query, page = 1) {
    // TODO: Implement search
    return {
      results: [],
      hasNextPage: false,
      currentPage: page
    };
  },

  // Get popular content
  async getPopular(page = 1) {
    // TODO: Implement getPopular
    return {
      results: [],
      hasNextPage: false,
      currentPage: page
    };
  },

  // Called when the plugin is unloaded
  async shutdown() {
    console.log('${manifest.name} shutdown');
  }
};

module.exports = plugin;
`

  return { manifest, code }
}

/**
 * Build a plugin from template options
 * @param {Object} options - Template options
 * @param {Object} buildOptions - Build options
 * @returns {Promise<ZPEBuildResult>} Build result
 */
export async function buildFromTemplate(options, buildOptions = {}) {
  const template = createPluginTemplate(options)
  const builder = new ZPEBuilder(buildOptions)
  return builder.build(template.manifest, template.code)
}

// ============================================================================
// Export
// ============================================================================

export { ZPE_SECTION, ZPE_COMPRESSION, ZPE_ENCRYPTION_TYPE }

export default {
  ZPEBuilder,
  ZPEParser,
  ZPE_SECTION,
  ZPE_COMPRESSION,
  ZPE_ENCRYPTION_TYPE,
  createPluginTemplate,
  buildFromTemplate
}
