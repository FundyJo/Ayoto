# ZPE (Zanshin Plugin Extension) System

## Overview

ZPE is a secure, extensible plugin system for Ayoto that enables JavaScript/TypeScript plugin development with comprehensive security features, GitHub-based version checking, and encrypted `.zpe` plugin packages.

## Features

- **Secure Execution**: Sandboxed JavaScript runtime with permission-based access control
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Encrypted Packages**: AES-GCM encrypted `.zpe` plugin files
- **Code Signing**: ECDSA code signing for authenticity verification
- **Version Checking**: GitHub integration for automatic update detection
- **Rate Limiting**: Built-in rate limiting for HTTP requests
- **Domain Allowlists**: Restrict plugin network access to specific domains

## Plugin Types

| Type | Description |
|------|-------------|
| `media-provider` | Provides anime search, listings, and stream sources |
| `stream-provider` | Extracts video URLs from hoster websites |
| `utility` | General utility plugins |
| `theme` | Custom themes |
| `integration` | Third-party service integrations |

## Quick Start

### Creating a Plugin

```javascript
// manifest.json
{
  "id": "my-anime-provider",
  "name": "My Anime Provider",
  "version": "1.0.0",
  "description": "A custom anime provider plugin",
  "pluginType": "media-provider",
  "author": {
    "name": "Your Name",
    "github": "yourusername"
  },
  "permissions": [
    "network:http",
    "storage:local"
  ],
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getEpisodes": true,
    "getStreams": true
  },
  "repository": {
    "type": "github",
    "owner": "yourusername",
    "repo": "my-anime-provider"
  },
  "security": {
    "allowedDomains": ["example.com", "*.example.com"]
  }
}

// plugin.js
const plugin = {
  async init(context) {
    this.http = context.http;
    this.html = context.html;
    this.storage = context.storage;
    console.log('Plugin initialized');
  },

  async search(query, page = 1) {
    const response = await this.http.get(
      `https://example.com/search?q=${encodeURIComponent(query)}&page=${page}`
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const titles = this.html.extractText(response.body, '.anime-title');
    const covers = this.html.extractImages(response.body);
    
    return {
      results: titles.map((title, i) => ({
        id: `anime-${i}`,
        title,
        cover: covers[i]
      })),
      hasNextPage: page < 10,
      currentPage: page
    };
  },

  async getPopular(page = 1) {
    // Implementation
    return { results: [], hasNextPage: false, currentPage: page };
  },

  async getEpisodes(animeId, page = 1) {
    // Implementation
    return { results: [], hasNextPage: false, currentPage: page };
  },

  async getStreams(animeId, episodeId) {
    return [{
      url: 'https://example.com/video.m3u8',
      format: 'm3u8',
      quality: '1080p',
      server: 'Main'
    }];
  },

  async shutdown() {
    console.log('Plugin shutdown');
  }
};

module.exports = plugin;
```

### Plugin Folder Structure

For easier development, plugins can be organized in a folder structure:

```
my-plugin/
├── manifest.json      # Plugin metadata and configuration
├── icon.png           # Plugin icon (PNG, JPG, or ICO)
└── src/
    ├── index.js       # Main plugin entry point
    ├── api.js         # API/HTTP request handling (optional)
    ├── parser.js      # HTML/JSON parsing logic (optional)
    └── utils.js       # Utility functions (optional)
```

The `src/` directory can contain multiple script files that will be bundled together during the build process. This allows for better code organization and maintainability.

### Building a Plugin (CLI)

Use the cross-platform build scripts to create `.zpe` packages:

```bash
# Linux/macOS
./scripts/build-plugin.sh ./my-plugin

# Windows
scripts\build-plugin.bat .\my-plugin

# Node.js (all platforms)
node scripts/build-plugin.mjs ./my-plugin

# With options
node scripts/build-plugin.mjs ./my-plugin -o ./dist --verbose
```

Build options:
- `-o, --output` - Output directory (default: current directory)
- `-m, --minify` - Minify the plugin code
- `-v, --verbose` - Verbose output
- `--no-strict` - Disable strict security validation

### Building Programmatically

```javascript
import { buildPlugin } from './zpe';

const manifest = { /* ... */ };
const code = `/* ... */`;

const result = await buildPlugin(manifest, code, {
  minify: true,
  encrypt: false,
  strictMode: true
});

if (result.success) {
  // result.data contains the .zpe file as Uint8Array
  // result.filename is the suggested filename
  console.log(`Built: ${result.filename} (${result.metadata.size} bytes)`);
}
```

### Loading a Plugin

```javascript
import { loadPluginFromZPE, loadPlugin } from './zpe';

// Load from .zpe file
const zpeData = /* Uint8Array from file */;
const result = await loadPluginFromZPE(zpeData);

// Or load directly from code
const result = await loadPlugin(manifest, code);

if (result.success) {
  console.log(`Plugin ${result.pluginId} loaded`);
}
```

### Using a Plugin

```javascript
import { getPlugin } from './zpe';

const plugin = await getPlugin('my-anime-provider');

if (plugin) {
  const results = await plugin.search('naruto');
  console.log(results);
}
```

### Using the Plugin API

The Plugin API provides a high-level interface for working with plugins:

```javascript
import { pluginAPI } from './zpe';

// Get all media providers
const providers = pluginAPI.getMediaProviders();

// Search across all providers
const results = await pluginAPI.searchAll('naruto');

// Search with a specific provider
const searchResults = await pluginAPI.search('my-provider', 'naruto', 1);

// Get popular anime from a provider
const popular = await pluginAPI.getPopular('my-provider', 1);

// Get episodes
const episodes = await pluginAPI.getEpisodes('my-provider', 'anime-id', 1);

// Get stream sources
const streams = await pluginAPI.getStreams('my-provider', 'anime-id', 'episode-id');

// Extract stream from hoster URL (uses all stream providers)
const stream = await pluginAPI.extractStream('https://hoster.com/video/123');

// Get plugin statistics
const stats = pluginAPI.getStats();
console.log(`Loaded: ${stats.total} plugins, ${stats.enabled} enabled`);
```

## Manifest Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (4-50 chars, alphanumeric/hyphens/underscores) |
| `name` | string | Human-readable name (2-100 chars) |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `description` | string | Plugin description (max 500 chars) |
| `pluginType` | string | Plugin type |
| `author` | object | Author information |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `icon` | string | Base64 icon or icon name |
| `iconUrl` | string | URL to icon image |
| `homepage` | string | Plugin homepage URL |
| `repository` | object | GitHub repository for updates |
| `license` | string | License identifier |
| `permissions` | string[] | Required permissions |
| `capabilities` | object | Plugin capabilities |
| `config` | object | Plugin configuration |
| `security` | object | Security settings |
| `minAppVersion` | string | Minimum Ayoto version |
| `keywords` | string[] | Search keywords |
| `main` | string | Main entry point file (default: "src/index.js") |
| `scripts` | object | Additional script files to bundle |

### Multi-File Plugin Structure

Plugins can use multiple source files by specifying them in the manifest:

```json
{
  "main": "src/index.js",
  "scripts": {
    "api": "src/api.js",
    "parser": "src/parser.js",
    "utils": "src/utils.js"
  }
}
```

In your code, use `require()` to import other modules:

```javascript
// In src/index.js
const api = require('./api.js');
const parser = require('./parser.js');
const utils = require('./utils.js');
```

The build script will automatically bundle all files into a single `.zpe` package.

## Permissions

Plugins must declare required permissions in the manifest:

| Permission | Description |
|------------|-------------|
| `network:http` | Make HTTP/HTTPS requests |
| `network:websocket` | Use WebSocket connections |
| `storage:local` | Access local storage |
| `storage:cache` | Access cache storage |
| `ui:notification` | Show notifications |
| `ui:dialog` | Show dialogs |
| `ui:settings` | Add settings panel |
| `system:clipboard` | Clipboard access |
| `system:process` | Process info (read-only) |

## Plugin Context API

### HTTP Client

```javascript
// GET request
const response = await context.http.get('https://example.com/api');

// POST request
const response = await context.http.post('https://example.com/api', {
  data: 'value'
});

// With options
const response = await context.http.get('https://example.com/api', {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 60000
});

// Get JSON directly
const data = await context.http.getJson('https://example.com/api');
```

### HTML Parser

```javascript
// Extract text by selector
const titles = context.html.extractText(html, '.title');

// Extract attribute values
const links = context.html.extractAttribute(html, 'a', 'href');
const images = context.html.extractImages(html);

// Extract by class
const cards = context.html.extractByClass(html, 'anime-card');

// Extract by ID
const content = context.html.extractById(html, 'main-content');

// Decode entities
const text = context.html.decodeEntities('&amp;lt;text&amp;gt;');

// Extract JSON from script
const data = context.html.extractJsonFromScript(html, '__INITIAL_DATA__');
```

### Storage

```javascript
// Get value
const value = context.storage.get('key', defaultValue);

// Set value
context.storage.set('key', { data: 'value' });

// Remove value
context.storage.remove('key');

// Clear all
context.storage.clear();

// Get all keys
const keys = context.storage.keys();

// Check usage
const usage = context.storage.getUsage();
// { used: 1024, max: 5242880, percentage: 0.02 }
```

## Security Features

### Code Audit

Plugins are automatically audited for dangerous patterns:
- `eval()` and `new Function()`
- Direct DOM access
- Direct network APIs (use context.http instead)
- Direct storage APIs (use context.storage instead)
- Obfuscated code detection

### Domain Allowlist

Restrict network access:

```json
{
  "security": {
    "allowedDomains": [
      "api.example.com",
      "*.cdn.example.com"
    ]
  }
}
```

### Integrity Verification

Plugin code is hashed (SHA-256) and verified on load:

```json
{
  "security": {
    "integrityHash": "sha256-base64hash..."
  }
}
```

## Version Checking

### GitHub Integration

Configure GitHub repository in manifest:

```json
{
  "repository": {
    "type": "github",
    "owner": "username",
    "repo": "plugin-repo",
    "branch": "main"
  }
}
```

### Checking for Updates

```javascript
import { checkAllForUpdates, getAvailableUpdates } from './zpe';

// Check all plugins
const results = await checkAllForUpdates();

// Get plugins with updates
const updates = getAvailableUpdates();
for (const update of updates) {
  console.log(`${update.pluginId}: ${update.currentVersion} -> ${update.latestVersion}`);
}
```

## .ZPE File Format

The `.zpe` format is a binary package containing:

| Section | Description |
|---------|-------------|
| Header | Magic bytes, version, flags |
| Manifest | JSON manifest data |
| Code | Plugin JavaScript code (optionally encrypted) |
| Assets | Additional assets (optional) |
| Metadata | Build metadata |
| Signature | Code signature (optional) |

### Building .ZPE Files

```javascript
import { ZPEBuilder } from './zpe';

const builder = new ZPEBuilder({
  minify: true,
  encrypt: true,
  strictMode: true
});

const result = await builder.build(manifest, code);

if (result.success) {
  // Save result.data as .zpe file
  const blob = new Blob([result.data], { type: 'application/octet-stream' });
  // Download or save the blob
}
```

### Parsing .ZPE Files

```javascript
import { parseZPE, verifyZPE } from './zpe';

// Parse without loading
const parsed = parseZPE(zpeData);
console.log(parsed.manifest);

// Verify integrity
const verification = await verifyZPE(zpeData);
if (verification.valid) {
  console.log('Plugin verified');
}
```

## Return Types

### Anime Object

```typescript
interface Anime {
  id: string;
  title: string;
  altTitles?: string[];
  cover?: string;
  banner?: string;
  description?: string;
  anilistId?: number;
  malId?: number;
  status?: string;
  episodeCount?: number;
  genres?: string[];
  year?: number;
  rating?: number;
  mediaType?: string;
  isAiring?: boolean;
}
```

### Episode Object

```typescript
interface Episode {
  id: string;
  number: number;
  title?: string;
  thumbnail?: string;
  description?: string;
  duration?: number;
  airDate?: string;
  isFiller?: boolean;
}
```

### Stream Source Object

```typescript
interface StreamSource {
  url: string;
  format: 'm3u8' | 'mp4' | 'mkv' | 'webm' | 'dash' | 'torrent';
  quality: string;
  anime4kSupport?: boolean;
  isDefault?: boolean;
  server?: string;
  headers?: Record<string, string>;
}
```

### Paginated Result

```typescript
interface PaginatedResult<T> {
  results: T[];
  hasNextPage: boolean;
  currentPage: number;
  totalPages?: number;
  totalItems?: number;
}
```

## Best Practices

1. **Declare minimal permissions**: Only request permissions your plugin actually needs
2. **Use domain allowlists**: Restrict network access to necessary domains
3. **Handle errors gracefully**: Always wrap API calls in try/catch
4. **Implement rate limiting**: Respect the rate limit config in your manifest
5. **Cache appropriately**: Use context.storage for caching to reduce requests
6. **Keep code readable**: Obfuscated code may be flagged during security audit
7. **Version properly**: Use semantic versioning for updates

## TypeScript Support

Import types from `./zpe/types`:

```typescript
import type {
  ZPEManifest,
  ZPEContext,
  ZPEPluginImplementation,
  ZPEAnime,
  ZPEEpisode,
  ZPEStreamSource,
  ZPEPaginatedResult
} from './zpe/types';

const plugin: ZPEPluginImplementation = {
  async init(context: ZPEContext) {
    // TypeScript knows all the types!
  },
  
  async search(query: string, page?: number): Promise<ZPEPaginatedResult<ZPEAnime>> {
    // Full type safety
  }
};
```

## Migration from JSPluginRuntime

If you have existing plugins using JSPluginRuntime:

1. Update manifest to ZPE format (add `pluginType`, `permissions`, `security`)
2. No code changes needed - the API is compatible
3. Build with ZPEBuilder to create `.zpe` packages
4. Use ZPE loader instead of JSPluginManager

```javascript
// Old
import { jsPluginManager } from './plugins';
await jsPluginManager.loadPlugin(manifest, code);

// New
import { loadPlugin } from './zpe';
await loadPlugin(manifest, code);
```

## Template Plugin

A complete template plugin is available at `plugin-template/` with:

- **Modular structure**: Separate files for API, parsing, and utilities
- **Full documentation**: JSDoc comments and README
- **Best practices**: Error handling, caching, and clean code

To use the template:

```bash
# Copy the template
cp -r plugin-template my-plugin

# Edit manifest.json and source files
# Then build
node scripts/build-plugin.mjs my-plugin -o ./dist
```

## Examples

See the following for example plugins:
- `plugin-template/` - Complete plugin template with modular structure
- `templates/media-provider-*.js` - Basic media provider
- `templates/stream-provider-*.js` - Stream extractor

## License

See [LICENSE](../LICENSE) for details.
