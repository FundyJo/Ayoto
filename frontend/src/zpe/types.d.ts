/**
 * ZPE (Zanshin Plugin Extension) TypeScript Type Definitions
 * 
 * @module zpe/types
 * @version 1.0.0
 */

// ============================================================================
// Plugin Type Enums
// ============================================================================

/**
 * Plugin types supported by ZPE
 */
export type ZPEPluginType = 
  | 'media-provider'
  | 'stream-provider'
  | 'utility'
  | 'theme'
  | 'integration';

/**
 * Plugin permissions
 */
export type ZPEPermission =
  | 'network:http'
  | 'network:websocket'
  | 'storage:local'
  | 'storage:cache'
  | 'ui:notification'
  | 'ui:dialog'
  | 'ui:settings'
  | 'system:clipboard'
  | 'system:process';

/**
 * Stream formats
 */
export type ZPEStreamFormat =
  | 'm3u8'
  | 'mp4'
  | 'mkv'
  | 'webm'
  | 'dash'
  | 'torrent';

/**
 * Plugin lifecycle states
 */
export type ZPEPluginState =
  | 'unloaded'
  | 'loading'
  | 'active'
  | 'disabled'
  | 'error'
  | 'update-available';

// ============================================================================
// Manifest Types
// ============================================================================

/**
 * Author information
 */
export interface ZPEAuthor {
  /** Author name */
  name: string;
  /** Author email (optional) */
  email?: string;
  /** Author website URL (optional) */
  url?: string;
  /** Author GitHub username (optional) */
  github?: string;
}

/**
 * Repository configuration for version checking
 */
export interface ZPERepository {
  /** Repository type (currently only 'github' is supported) */
  type: 'github';
  /** Repository owner/organization */
  owner: string;
  /** Repository name */
  repo: string;
  /** Default branch (default: 'main') */
  branch?: string;
  /** Path to manifest file in repo (default: 'manifest.json') */
  manifestPath?: string;
}

/**
 * Plugin capabilities
 */
export interface ZPECapabilities {
  /** Can search for content */
  search?: boolean;
  /** Can fetch popular content */
  getPopular?: boolean;
  /** Can fetch latest content */
  getLatest?: boolean;
  /** Can fetch episode lists */
  getEpisodes?: boolean;
  /** Can extract stream URLs */
  getStreams?: boolean;
  /** Can fetch detailed anime info */
  getAnimeDetails?: boolean;
  /** Can extract streams from hosters */
  extractStream?: boolean;
  /** Can provide hoster info */
  getHosterInfo?: boolean;
}

/**
 * Plugin configuration options
 */
export interface ZPEConfig {
  /** Base URL for scraping */
  baseUrl?: string;
  /** Custom user agent */
  userAgent?: string;
  /** Rate limit in milliseconds */
  rateLimitMs?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Requires cookie authentication */
  requiresCookies?: boolean;
}

/**
 * Security settings
 */
export interface ZPESecurity {
  /** Run in sandboxed environment (default: true) */
  sandboxed?: boolean;
  /** Allowed domains for network requests */
  allowedDomains?: string[];
  /** Enable Content Security Policy (default: true) */
  cspEnabled?: boolean;
  /** SHA-256 hash of plugin code */
  integrityHash?: string;
}

/**
 * Complete ZPE Plugin Manifest
 */
export interface ZPEManifest {
  /** Unique plugin identifier (alphanumeric, hyphens, underscores) */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin type */
  pluginType: ZPEPluginType;
  /** Author information */
  author: ZPEAuthor;
  /** Base64 encoded icon or icon name (optional) */
  icon?: string;
  /** URL to icon image (optional) */
  iconUrl?: string;
  /** Plugin homepage URL (optional) */
  homepage?: string;
  /** GitHub repository for version checking (optional) */
  repository?: ZPERepository;
  /** License identifier (e.g., "MIT") (optional) */
  license?: string;
  /** ISO 639-1 language codes supported by this plugin (e.g., ["de", "en"]) (optional) */
  supportedLanguages?: string[];
  /** Required permissions */
  permissions?: ZPEPermission[];
  /** Plugin capabilities */
  capabilities?: ZPECapabilities;
  /** Plugin configuration */
  config?: ZPEConfig;
  /** Security settings */
  security?: ZPESecurity;
  /** Minimum required Ayoto version (optional) */
  minAppVersion?: string;
  /** Search keywords (optional) */
  keywords?: string[];
  /** Custom update check URL (optional) */
  updateUrl?: string;
}

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * HTTP response from plugin HTTP client
 */
export interface ZPEHttpResponse {
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body */
  body: string;
  /** True if status is 2xx */
  ok: boolean;
  /** Final URL after redirects */
  url: string;
  /** Error message if request failed */
  error?: string;
}

/**
 * HTTP request options
 */
export interface ZPEHttpOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
  /** Request body (for POST, PUT, etc.) */
  body?: string | object;
}

/**
 * Plugin HTTP client interface
 */
export interface ZPEHttpClient {
  /** Make GET request */
  get(url: string, options?: ZPEHttpOptions): Promise<ZPEHttpResponse>;
  /** Make POST request */
  post(url: string, body: string | object, options?: ZPEHttpOptions): Promise<ZPEHttpResponse>;
  /** Make generic request */
  request(method: string, url: string, options?: ZPEHttpOptions): Promise<ZPEHttpResponse>;
  /** Get and parse JSON */
  getJson<T = unknown>(url: string, options?: ZPEHttpOptions): Promise<T>;
}

/**
 * Plugin storage interface
 */
export interface ZPEStorage {
  /** Get value from storage */
  get<T = unknown>(key: string, defaultValue?: T): T;
  /** Set value in storage */
  set(key: string, value: unknown): void;
  /** Remove value from storage */
  remove(key: string): void;
  /** Clear all plugin storage */
  clear(): void;
  /** Get all keys */
  keys(): string[];
  /** Get storage usage */
  getUsage(): { used: number; max: number; percentage: number };
}

/**
 * HTML parser utilities interface
 */
export interface ZPEHtmlParser {
  /** Extract text by CSS selector */
  extractText(html: string, selector: string): string[];
  /** Extract attribute values */
  extractAttribute(html: string, tagName: string, attrName: string): string[];
  /** Extract all links */
  extractLinks(html: string): string[];
  /** Extract all images */
  extractImages(html: string): string[];
  /** Extract by class name */
  extractByClass(html: string, className: string): string[];
  /** Extract by ID */
  extractById(html: string, id: string): string | null;
  /** Decode HTML entities */
  decodeEntities(html: string): string;
  /** Extract JSON from script tag */
  extractJsonFromScript<T = unknown>(html: string, varName?: string): T | null;
}

/**
 * Plugin context provided during initialization
 */
export interface ZPEContext {
  /** Plugin ID */
  pluginId: string;
  /** Plugin manifest */
  manifest: ZPEManifest;
  /** HTTP client for making requests */
  http: ZPEHttpClient;
  /** Plugin storage */
  storage: ZPEStorage;
  /** HTML parsing utilities */
  html: ZPEHtmlParser;
  /** Stream format constants */
  STREAM_FORMAT: Record<string, ZPEStreamFormat>;
  /** Plugin type constants */
  PLUGIN_TYPE: Record<string, ZPEPluginType>;
  /** Log a message */
  log(level: 'info' | 'warn' | 'error', message: string): void;
  /** Get app version */
  getAppVersion(): string;
  /** Get plugin version */
  getPluginVersion(): string;
}

// ============================================================================
// Data Types
// ============================================================================

/**
 * Anime/Media item
 */
export interface ZPEAnime {
  /** Unique identifier */
  id: string;
  /** Anime title */
  title: string;
  /** Alternative titles */
  altTitles?: string[];
  /** Cover image URL */
  cover?: string;
  /** Banner image URL */
  banner?: string;
  /** Synopsis/description */
  description?: string;
  /** AniList ID */
  anilistId?: number;
  /** MyAnimeList ID */
  malId?: number;
  /** Status (AIRING, FINISHED, etc.) */
  status?: string;
  /** Total episodes */
  episodeCount?: number;
  /** Genres */
  genres?: string[];
  /** Release year */
  year?: number;
  /** Rating (0-100) */
  rating?: number;
  /** Media type (TV, MOVIE, OVA, etc.) */
  mediaType?: string;
  /** Currently airing */
  isAiring?: boolean;
}

/**
 * Episode item
 */
export interface ZPEEpisode {
  /** Unique identifier */
  id: string;
  /** Episode number */
  number: number;
  /** Episode title */
  title?: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Episode description */
  description?: string;
  /** Duration in seconds */
  duration?: number;
  /** Air date (ISO 8601) */
  airDate?: string;
  /** Is filler episode */
  isFiller?: boolean;
}

/**
 * Stream source
 */
export interface ZPEStreamSource {
  /** Stream URL */
  url: string;
  /** Stream format */
  format: ZPEStreamFormat;
  /** Quality (1080p, 720p, etc.) */
  quality: string;
  /** Supports Anime4K upscaling */
  anime4kSupport?: boolean;
  /** Is default source */
  isDefault?: boolean;
  /** Server name */
  server?: string;
  /** Required headers */
  headers?: Record<string, string>;
}

/**
 * Paginated result
 */
export interface ZPEPaginatedResult<T> {
  /** Result items */
  results: T[];
  /** Has more pages */
  hasNextPage: boolean;
  /** Current page number */
  currentPage: number;
  /** Total pages (if known) */
  totalPages?: number;
  /** Total items (if known) */
  totalItems?: number;
}

// ============================================================================
// Plugin Interface
// ============================================================================

/**
 * Base plugin implementation interface
 */
export interface ZPEPluginImplementation {
  /**
   * Initialize the plugin
   * @param context - Plugin context with http, storage, etc.
   */
  init?(context: ZPEContext): Promise<void>;
  
  /**
   * Search for anime
   * @param query - Search query
   * @param page - Page number
   */
  search?(query: string, page?: number): Promise<ZPEPaginatedResult<ZPEAnime>>;
  
  /**
   * Get popular anime
   * @param page - Page number
   */
  getPopular?(page?: number): Promise<ZPEPaginatedResult<ZPEAnime>>;
  
  /**
   * Get latest anime/episodes
   * @param page - Page number
   */
  getLatest?(page?: number): Promise<ZPEPaginatedResult<ZPEAnime>>;
  
  /**
   * Get episodes for an anime
   * @param animeId - Anime ID
   * @param page - Page number
   */
  getEpisodes?(animeId: string, page?: number): Promise<ZPEPaginatedResult<ZPEEpisode>>;
  
  /**
   * Get stream sources for an episode
   * @param animeId - Anime ID
   * @param episodeId - Episode ID
   */
  getStreams?(animeId: string, episodeId: string): Promise<ZPEStreamSource[]>;
  
  /**
   * Get detailed anime information
   * @param animeId - Anime ID
   */
  getAnimeDetails?(animeId: string): Promise<ZPEAnime>;
  
  /**
   * Extract stream from hoster URL (for stream providers)
   * @param url - Hoster URL
   */
  extractStream?(url: string): Promise<ZPEStreamSource | null>;
  
  /**
   * Get hoster info (for stream providers)
   * @param url - Hoster URL
   */
  getHosterInfo?(url: string): Promise<{ name: string; supported: boolean }>;
  
  /**
   * Cleanup when plugin is unloaded
   */
  shutdown?(): Promise<void>;
}

// ============================================================================
// Build Types
// ============================================================================

/**
 * Build options
 */
export interface ZPEBuildOptions {
  /** Minify plugin code */
  minify?: boolean;
  /** Encrypt plugin package */
  encrypt?: boolean;
  /** Sign plugin package */
  sign?: boolean;
  /** Private key for signing */
  signingKey?: CryptoKey;
  /** Include source map */
  includeSourceMap?: boolean;
  /** Additional assets */
  assets?: Record<string, string>;
  /** Strict security validation */
  strictMode?: boolean;
}

/**
 * Build result
 */
export interface ZPEBuildResult {
  /** Build succeeded */
  success: boolean;
  /** Built ZPE file data */
  data?: Uint8Array;
  /** Suggested filename */
  filename?: string;
  /** Build metadata */
  metadata?: {
    id: string;
    name: string;
    version: string;
    size: number;
    hash: string;
    integrityHash: string;
    builtAt: string;
    encrypted: boolean;
    signed: boolean;
  };
  /** Build errors */
  errors: string[];
  /** Build warnings */
  warnings: string[];
}

/**
 * Validation result
 */
export interface ZPEValidationResult {
  /** Validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// Version Check Types
// ============================================================================

/**
 * Version check result
 */
export interface ZPEVersionCheckResult {
  /** Update is available */
  updateAvailable: boolean;
  /** Current installed version */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** URL to release page */
  releaseUrl?: string;
  /** Release notes/changelog */
  releaseNotes?: string;
  /** Direct download URL */
  downloadUrl?: string;
  /** Release publish date */
  publishedAt?: string;
  /** Is prerelease */
  prerelease?: boolean;
  /** Release asset info */
  asset?: {
    name: string;
    downloadUrl: string;
    size: number;
    downloadCount: number;
  };
  /** Error message if check failed */
  error?: string;
}

/**
 * Release info
 */
export interface ZPEReleaseInfo {
  /** Release tag name */
  tagName: string;
  /** Version string */
  version: string;
  /** Release name */
  name: string;
  /** Release description */
  body: string;
  /** Is prerelease */
  prerelease: boolean;
  /** Is draft */
  draft: boolean;
  /** Publish timestamp */
  publishedAt: string;
  /** URL to release page */
  htmlUrl: string;
  /** Release assets */
  assets: {
    name: string;
    downloadUrl: string;
    size: number;
    contentType: string;
    downloadCount: number;
  }[];
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Security audit result
 */
export interface ZPESecurityAudit {
  /** Audit passed */
  passed: boolean;
  /** Security issues */
  issues: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    pattern?: string;
  }[];
  /** Warnings */
  warnings: {
    type: string;
    severity: 'medium' | 'low';
    message: string;
    position?: number;
    line?: number;
  }[];
  /** Summary */
  summary: {
    totalIssues: number;
    totalWarnings: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
}

// ============================================================================
// Plugin Info Type
// ============================================================================

/**
 * Plugin runtime info
 */
export interface ZPEPluginInfo {
  /** Plugin ID */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Author info */
  author?: ZPEAuthor;
  /** Plugin type */
  pluginType: ZPEPluginType;
  /** Capabilities */
  capabilities?: ZPECapabilities;
  /** Permissions */
  permissions?: ZPEPermission[];
  /** Is enabled */
  enabled: boolean;
  /** Current state */
  state: ZPEPluginState;
  /** When loaded */
  loadedAt?: Date;
  /** Error message if in error state */
  errorMessage?: string;
}
