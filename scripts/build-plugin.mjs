#!/usr/bin/env node
/**
 * ZPE Plugin Build Script
 * 
 * Cross-platform build script for creating .zpe plugin packages.
 * Supports Windows, Linux, and macOS.
 * 
 * Usage:
 *   node build-plugin.mjs <plugin-folder> [options]
 * 
 * Options:
 *   --output, -o     Output directory (default: current directory)
 *   --minify, -m     Minify the plugin code
 *   --encrypt, -e    Encrypt the plugin (experimental)
 *   --strict, -s     Enable strict security validation
 *   --verbose, -v    Verbose output
 *   --help, -h       Show help
 * 
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, basename, dirname, extname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes, createCipheriv } from 'crypto';

// Get __filename equivalent in ES modules (for potential future use)
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-unused-vars
const scriptDir = dirname(__filename);

// ============================================================================
// Constants
// ============================================================================

const ZPE_MAGIC_BYTES = Buffer.from([0x5A, 0x50, 0x45, 0x21]); // "ZPE!"
const ZPE_FORMAT_VERSION = 1;

const ZPE_SECTION = {
  HEADER: 0x01,
  MANIFEST: 0x02,
  CODE: 0x03,
  ASSETS: 0x04,
  SIGNATURE: 0x05,
  METADATA: 0x06
};

const ZPE_COMPRESSION = {
  NONE: 0x00,
  GZIP: 0x01,
  DEFLATE: 0x02
};

const ZPE_ENCRYPTION_TYPE = {
  NONE: 0x00,
  AES_GCM: 0x01
};

// Dangerous patterns for security audit
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/g, reason: 'eval() is not allowed' },
  { pattern: /\bnew\s+Function\s*\(/g, reason: 'new Function() is not allowed' },
  { pattern: /\bdocument\./g, reason: 'Direct DOM access is not allowed' },
  { pattern: /\bwindow\./g, reason: 'window object access is not allowed' },
  { pattern: /\bglobalThis\./g, reason: 'globalThis access is not allowed' },
  { pattern: /\brequire\s*\(\s*['"][^'"]*['"]\s*\)/g, reason: 'Dynamic require() is not allowed (use relative imports)', isWarning: true },
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
];

// ============================================================================
// Utility Functions
// ============================================================================

function log(message, level = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const prefix = {
    info: 'ℹ',
    success: '✓',
    warn: '⚠',
    error: '✗'
  };
  
  console.log(`${colors[level]}${prefix[level]}${colors.reset} ${message}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    pluginFolder: null,
    output: process.cwd(),
    minify: false,
    encrypt: false,
    strict: true,
    verbose: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--minify' || arg === '-m') {
      options.minify = true;
    } else if (arg === '--encrypt' || arg === '-e') {
      options.encrypt = true;
    } else if (arg === '--strict' || arg === '-s') {
      options.strict = true;
    } else if (arg === '--no-strict') {
      options.strict = false;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('-') && !options.pluginFolder) {
      options.pluginFolder = arg;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
ZPE Plugin Build Script
=======================

Build ZPE plugin packages from source folders.

Usage:
  node build-plugin.mjs <plugin-folder> [options]

Arguments:
  plugin-folder    Path to the plugin folder containing manifest.json

Options:
  --output, -o     Output directory for the .zpe file (default: current directory)
  --minify, -m     Minify the plugin code
  --encrypt, -e    Encrypt the plugin package (experimental)
  --strict, -s     Enable strict security validation (default: enabled)
  --no-strict      Disable strict security validation
  --verbose, -v    Verbose output
  --help, -h       Show this help message

Examples:
  node build-plugin.mjs ./my-plugin
  node build-plugin.mjs ./my-plugin -o ./dist
  node build-plugin.mjs ./my-plugin --minify --verbose

Plugin Structure:
  plugin-folder/
  ├── manifest.json    Required: Plugin metadata
  ├── icon.png         Optional: Plugin icon
  └── src/
      ├── index.js     Required: Main entry point
      ├── api.js       Optional: API module
      ├── parser.js    Optional: Parser module
      └── utils.js     Optional: Utility module
`);
}

// ============================================================================
// Manifest Validation
// ============================================================================

const VALID_PLUGIN_TYPES = ['media-provider', 'stream-provider', 'utility', 'theme', 'integration'];
const VALID_PERMISSIONS = [
  'network:http', 'network:websocket',
  'storage:local', 'storage:cache',
  'ui:notification', 'ui:dialog', 'ui:settings',
  'system:clipboard', 'system:process'
];

function validateManifest(manifest) {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Plugin ID (id) is required');
  } else if (!/^[a-z0-9][a-z0-9_-]{2,48}[a-z0-9]$/.test(manifest.id)) {
    errors.push('Plugin ID must be 4-50 characters (lowercase alphanumeric, hyphens, underscores)');
  }
  
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Plugin name (name) is required');
  }
  
  if (!manifest.version) {
    errors.push('Plugin version (version) is required');
  } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/.test(manifest.version)) {
    errors.push('Plugin version must be in semver format (e.g., 1.0.0)');
  }
  
  if (!manifest.description) {
    warnings.push('Plugin description is recommended');
  }
  
  if (!manifest.pluginType) {
    errors.push('Plugin type (pluginType) is required');
  } else if (!VALID_PLUGIN_TYPES.includes(manifest.pluginType)) {
    errors.push(`Invalid plugin type. Must be one of: ${VALID_PLUGIN_TYPES.join(', ')}`);
  }
  
  if (!manifest.author) {
    warnings.push('Author information is recommended');
  } else if (!manifest.author.name) {
    errors.push('Author name is required when author is specified');
  }
  
  // Permissions validation
  if (manifest.permissions) {
    for (const perm of manifest.permissions) {
      if (!VALID_PERMISSIONS.includes(perm)) {
        warnings.push(`Unknown permission: ${perm}`);
      }
    }
  }
  
  // Security validation
  if (manifest.security?.allowedDomains) {
    for (const domain of manifest.security.allowedDomains) {
      if (!/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(domain)) {
        errors.push(`Invalid domain pattern: ${domain}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Security Audit
// ============================================================================

function auditCode(code) {
  const issues = [];
  const warnings = [];
  
  for (const { pattern, reason, isWarning } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      if (isWarning) {
        warnings.push({ severity: 'medium', message: reason });
      } else {
        issues.push({ severity: 'high', message: reason });
      }
    }
    pattern.lastIndex = 0;
  }
  
  // Check for obfuscation
  if (/\\x[0-9a-f]{2}/gi.test(code) || /\\u[0-9a-f]{4}/gi.test(code)) {
    warnings.push({ severity: 'medium', message: 'Code contains escape sequences that may indicate obfuscation' });
  }
  
  // Check for very long lines
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 1000) {
      warnings.push({ severity: 'low', message: `Line ${i + 1} is very long (${lines[i].length} chars)` });
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    warnings
  };
}

// ============================================================================
// Code Bundling
// ============================================================================

function bundleScripts(pluginFolder, manifest, verbose) {
  const srcFolder = join(pluginFolder, 'src');
  const mainFile = manifest.main || 'src/index.js';
  const mainPath = join(pluginFolder, mainFile);
  
  if (!existsSync(mainPath)) {
    throw new Error(`Main entry point not found: ${mainFile}`);
  }
  
  // Read all script files
  const scripts = {};
  
  // Read main file
  scripts['index.js'] = readFileSync(mainPath, 'utf-8');
  if (verbose) log(`  Loaded: ${mainFile}`);
  
  // Read additional scripts defined in manifest
  if (manifest.scripts) {
    for (const [name, path] of Object.entries(manifest.scripts)) {
      const scriptPath = join(pluginFolder, path);
      if (existsSync(scriptPath)) {
        scripts[`${name}.js`] = readFileSync(scriptPath, 'utf-8');
        if (verbose) log(`  Loaded: ${path}`);
      } else {
        log(`Warning: Script file not found: ${path}`, 'warn');
      }
    }
  }
  
  // Also auto-discover scripts in src/ folder
  if (existsSync(srcFolder)) {
    const files = readdirSync(srcFolder);
    for (const file of files) {
      if (file.endsWith('.js') && !scripts[file]) {
        const filePath = join(srcFolder, file);
        if (statSync(filePath).isFile()) {
          scripts[file] = readFileSync(filePath, 'utf-8');
          if (verbose) log(`  Discovered: src/${file}`);
        }
      }
    }
  }
  
  // Bundle all scripts into a single code block
  // Using a simple module system compatible with the runtime
  const bundledCode = createBundle(scripts);
  
  return bundledCode;
}

function createBundle(scripts) {
  // Create a simple CommonJS-like module system for the bundled code
  const moduleCode = [];
  
  moduleCode.push(`"use strict";`);
  moduleCode.push(``);
  moduleCode.push(`// ZPE Plugin Bundle`);
  moduleCode.push(`// Generated: ${new Date().toISOString()}`);
  moduleCode.push(``);
  
  // Module registry
  moduleCode.push(`const __zpe_modules__ = {};`);
  moduleCode.push(`const __zpe_cache__ = {};`);
  moduleCode.push(``);
  
  // Module loader (simple require implementation)
  moduleCode.push(`function require(name) {`);
  moduleCode.push(`  // Handle relative paths`);
  moduleCode.push(`  let moduleName = name;`);
  moduleCode.push(`  if (name.startsWith('./')) {`);
  moduleCode.push(`    moduleName = name.slice(2);`);
  moduleCode.push(`  }`);
  moduleCode.push(`  if (!moduleName.endsWith('.js')) {`);
  moduleCode.push(`    moduleName += '.js';`);
  moduleCode.push(`  }`);
  moduleCode.push(``);
  moduleCode.push(`  // Return cached module`);
  moduleCode.push(`  if (__zpe_cache__[moduleName]) {`);
  moduleCode.push(`    return __zpe_cache__[moduleName].exports;`);
  moduleCode.push(`  }`);
  moduleCode.push(``);
  moduleCode.push(`  // Load module`);
  moduleCode.push(`  const moduleFactory = __zpe_modules__[moduleName];`);
  moduleCode.push(`  if (!moduleFactory) {`);
  moduleCode.push(`    throw new Error('Module not found: ' + name);`);
  moduleCode.push(`  }`);
  moduleCode.push(``);
  moduleCode.push(`  const moduleObj = { exports: {} };`);
  moduleCode.push(`  __zpe_cache__[moduleName] = moduleObj;`);
  moduleCode.push(`  moduleFactory(moduleObj, moduleObj.exports, require);`);
  moduleCode.push(`  return moduleObj.exports;`);
  moduleCode.push(`}`);
  moduleCode.push(``);
  
  // Register all modules
  moduleCode.push(`// Module definitions`);
  for (const [name, code] of Object.entries(scripts)) {
    moduleCode.push(``);
    moduleCode.push(`__zpe_modules__['${name}'] = function(module, exports, require) {`);
    // Indent the module code
    moduleCode.push(code.split('\n').map(line => '  ' + line).join('\n'));
    moduleCode.push(`};`);
  }
  
  moduleCode.push(``);
  moduleCode.push(`// Export main module`);
  moduleCode.push(`module.exports = require('./index.js');`);
  
  return moduleCode.join('\n');
}

// ============================================================================
// Asset Processing
// ============================================================================

function loadAssets(pluginFolder, manifest, verbose) {
  const assets = {};
  
  // Load icon if specified
  const iconExtensions = ['.png', '.jpg', '.jpeg', '.ico'];
  let iconPath = null;
  
  if (manifest.icon) {
    // Icon specified in manifest
    const possiblePath = join(pluginFolder, manifest.icon);
    if (existsSync(possiblePath)) {
      iconPath = possiblePath;
    }
  } else {
    // Auto-detect icon
    for (const ext of iconExtensions) {
      const possiblePath = join(pluginFolder, `icon${ext}`);
      if (existsSync(possiblePath)) {
        iconPath = possiblePath;
        break;
      }
    }
  }
  
  if (iconPath) {
    const iconData = readFileSync(iconPath);
    const ext = extname(iconPath).toLowerCase();
    const mimeType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';
    
    assets['icon'] = {
      data: iconData.toString('base64'),
      mimeType,
      filename: basename(iconPath)
    };
    
    if (verbose) log(`  Loaded icon: ${basename(iconPath)}`);
  }
  
  return Object.keys(assets).length > 0 ? assets : null;
}

// ============================================================================
// ZPE Building
// ============================================================================

function calculateHash(data) {
  return createHash('sha256').update(data).digest('hex');
}

function calculateIntegrityHash(code) {
  const hash = createHash('sha256').update(code).digest('base64');
  return `sha256-${hash}`;
}

function buildHeader(options) {
  const header = Buffer.alloc(16);
  
  // Magic bytes
  ZPE_MAGIC_BYTES.copy(header, 0);
  
  // Version
  header[4] = ZPE_FORMAT_VERSION;
  header[5] = 0;
  
  // Flags
  let flags = 0;
  if (options.encrypt) flags |= 0x01;
  // if (options.sign) flags |= 0x02;
  header[6] = flags & 0xFF;
  header[7] = (flags >> 8) & 0xFF;
  
  // Compression type
  header[8] = ZPE_COMPRESSION.NONE;
  
  // Encryption type
  header[9] = options.encrypt ? ZPE_ENCRYPTION_TYPE.AES_GCM : ZPE_ENCRYPTION_TYPE.NONE;
  
  // Reserved
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  header[13] = 0;
  header[14] = 0;
  header[15] = 0;
  
  return header;
}

function wrapSection(sectionType, data) {
  const section = Buffer.alloc(5 + data.length);
  
  // Section type
  section[0] = sectionType;
  
  // Data length (little-endian 32-bit)
  section.writeUInt32LE(data.length, 1);
  
  // Data
  data.copy(section, 5);
  
  return section;
}

function encryptCode(code, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(code, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, encrypted]);
}

function buildZPE(manifest, code, assets, options) {
  const sections = [];
  
  // Section 1: Header
  const header = buildHeader(options);
  sections.push(wrapSection(ZPE_SECTION.HEADER, header));
  
  // Section 2: Manifest
  const manifestData = Buffer.from(JSON.stringify(manifest), 'utf8');
  sections.push(wrapSection(ZPE_SECTION.MANIFEST, manifestData));
  
  // Section 3: Code
  let codeData = Buffer.from(code, 'utf8');
  if (options.encrypt) {
    const encryptionKey = randomBytes(32);
    codeData = encryptCode(code, encryptionKey);
    // Note: In production, the key should be handled securely
    console.log('  Warning: Encryption key generated but not stored. Plugin will not be loadable.');
  }
  sections.push(wrapSection(ZPE_SECTION.CODE, codeData));
  
  // Section 4: Assets (optional)
  if (assets) {
    const assetsData = Buffer.from(JSON.stringify(assets), 'utf8');
    sections.push(wrapSection(ZPE_SECTION.ASSETS, assetsData));
  }
  
  // Section 5: Metadata
  const metadata = {
    buildTime: new Date().toISOString(),
    builder: 'ZPE Build Script 1.0',
    compressed: false,
    encrypted: options.encrypt || false
  };
  const metadataData = Buffer.from(JSON.stringify(metadata), 'utf8');
  sections.push(wrapSection(ZPE_SECTION.METADATA, metadataData));
  
  // Combine all sections
  return Buffer.concat(sections);
}

// ============================================================================
// Main Build Function
// ============================================================================

async function buildPlugin(options) {
  const { pluginFolder, output, minify, encrypt, strict, verbose } = options;
  
  log(`Building plugin from: ${pluginFolder}`);
  
  // Check if plugin folder exists
  if (!existsSync(pluginFolder)) {
    throw new Error(`Plugin folder not found: ${pluginFolder}`);
  }
  
  // Load manifest
  const manifestPath = join(pluginFolder, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${pluginFolder}`);
  }
  
  if (verbose) log('Loading manifest...');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  
  // Validate manifest
  if (verbose) log('Validating manifest...');
  const validation = validateManifest(manifest);
  
  for (const warning of validation.warnings) {
    log(`Warning: ${warning}`, 'warn');
  }
  
  if (!validation.valid) {
    for (const error of validation.errors) {
      log(`Error: ${error}`, 'error');
    }
    throw new Error('Manifest validation failed');
  }
  log('Manifest validation passed', 'success');
  
  // Bundle scripts
  if (verbose) log('Bundling scripts...');
  const code = bundleScripts(pluginFolder, manifest, verbose);
  log(`Bundled code size: ${(code.length / 1024).toFixed(2)} KB`);
  
  // Security audit
  if (strict) {
    if (verbose) log('Running security audit...');
    const audit = auditCode(code);
    
    for (const warning of audit.warnings) {
      log(`Audit warning: ${warning.message}`, 'warn');
    }
    
    if (!audit.passed) {
      for (const issue of audit.issues) {
        log(`Security issue: ${issue.message}`, 'error');
      }
      throw new Error('Security audit failed');
    }
    log('Security audit passed', 'success');
  }
  
  // Calculate integrity hash
  const integrityHash = calculateIntegrityHash(code);
  manifest.security = manifest.security || {};
  manifest.security.integrityHash = integrityHash;
  if (verbose) log(`Integrity hash: ${integrityHash}`);
  
  // Load assets
  if (verbose) log('Loading assets...');
  const assets = loadAssets(pluginFolder, manifest, verbose);
  
  // Build ZPE file
  if (verbose) log('Building ZPE package...');
  const zpeData = buildZPE(manifest, code, assets, { encrypt, minify });
  
  // Calculate file hash
  const fileHash = calculateHash(zpeData);
  
  // Generate output filename
  const filename = `${manifest.id}-${manifest.version}.zpe`;
  const outputPath = join(output, filename);
  
  // Create output directory if needed
  if (!existsSync(output)) {
    mkdirSync(output, { recursive: true });
  }
  
  // Write ZPE file
  writeFileSync(outputPath, zpeData);
  
  log(`Successfully built: ${filename}`, 'success');
  log(`  Output: ${outputPath}`);
  log(`  Size: ${(zpeData.length / 1024).toFixed(2)} KB`);
  log(`  Hash: ${fileHash}`);
  
  return {
    success: true,
    filename,
    path: outputPath,
    size: zpeData.length,
    hash: fileHash,
    integrityHash
  };
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (!options.pluginFolder) {
    log('Error: Plugin folder is required', 'error');
    showHelp();
    process.exit(1);
  }
  
  // Resolve paths
  options.pluginFolder = resolve(options.pluginFolder);
  options.output = resolve(options.output);
  
  try {
    await buildPlugin(options);
    process.exit(0);
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
