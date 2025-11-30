import { Button, Switch } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import {
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  CodeIcon,
  DownloadIcon,
  MagnifyingGlassIcon,
  GlobeIcon,
  StarFilledIcon,
  ArchiveIcon
} from '@radix-ui/react-icons'
import { jsPluginManager, PLUGIN_TYPE } from '../plugins'
import { ZPEBuilder, zpePluginManager, ZPE_PLUGIN_TYPE } from '../zpe'

// ============================================================================
// Sample Marketplace Data (would normally come from an API)
// ============================================================================
const MARKETPLACE_PLUGINS = [
  {
    id: 'aniworld-provider',
    name: 'AniWorld Provider',
    version: '1.2.0',
    description: 'Stream anime from AniWorld.to with German subtitles and dubbing',
    author: { name: 'Community', github: 'ayoto-plugins' },
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    language: 'de',
    downloads: 1250,
    rating: 4.5,
    capabilities: { search: true, getPopular: true, getLatest: true, getEpisodes: true, getStreams: true },
    tags: ['anime', 'german', 'streaming'],
    downloadUrl: 'https://example.com/plugins/aniworld-provider.zpe'
  },
  {
    id: 'crunchyroll-unofficial',
    name: 'Crunchyroll Unofficial',
    version: '2.1.0',
    description: 'Access Crunchyroll content with multi-language support',
    author: { name: 'AnimeDevs', github: 'anime-devs' },
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    language: 'en',
    downloads: 3420,
    rating: 4.8,
    capabilities: { search: true, getPopular: true, getLatest: true, getEpisodes: true, getStreams: true, getAnimeDetails: true },
    tags: ['anime', 'english', 'multi-language'],
    downloadUrl: 'https://example.com/plugins/crunchyroll.zpe'
  },
  {
    id: 'voe-extractor',
    name: 'VOE Stream Extractor',
    version: '1.0.5',
    description: 'Extract video streams from VOE.sx hosting service',
    author: { name: 'StreamTools', github: 'stream-tools' },
    pluginType: ZPE_PLUGIN_TYPE.STREAM_PROVIDER,
    language: 'universal',
    downloads: 890,
    rating: 4.2,
    capabilities: { extractStream: true, getHosterInfo: true },
    tags: ['extractor', 'voe', 'hoster'],
    downloadUrl: 'https://example.com/plugins/voe-extractor.zpe'
  },
  {
    id: 'anime-fr-provider',
    name: 'Anime FR Provider',
    version: '1.1.0',
    description: 'French anime streaming provider with VOSTFR and VF options',
    author: { name: 'FrenchAnime', github: 'french-anime' },
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    language: 'fr',
    downloads: 650,
    rating: 4.0,
    capabilities: { search: true, getPopular: true, getEpisodes: true, getStreams: true },
    tags: ['anime', 'french', 'vostfr'],
    downloadUrl: 'https://example.com/plugins/anime-fr.zpe'
  },
  {
    id: 'anime-jp-provider',
    name: 'Anime JP Raw',
    version: '1.3.2',
    description: 'Japanese raw anime streams without subtitles',
    author: { name: 'JPAnime', github: 'jp-anime' },
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    language: 'ja',
    downloads: 420,
    rating: 3.9,
    capabilities: { search: true, getLatest: true, getEpisodes: true, getStreams: true },
    tags: ['anime', 'japanese', 'raw'],
    downloadUrl: 'https://example.com/plugins/anime-jp.zpe'
  },
  {
    id: 'streamtape-extractor',
    name: 'Streamtape Extractor',
    version: '1.0.2',
    description: 'Extract video streams from Streamtape hosting',
    author: { name: 'StreamTools', github: 'stream-tools' },
    pluginType: ZPE_PLUGIN_TYPE.STREAM_PROVIDER,
    language: 'universal',
    downloads: 1100,
    rating: 4.4,
    capabilities: { extractStream: true, getHosterInfo: true },
    tags: ['extractor', 'streamtape', 'hoster'],
    downloadUrl: 'https://example.com/plugins/streamtape.zpe'
  },
  {
    id: 'anime-es-provider',
    name: 'Anime Español',
    version: '1.0.8',
    description: 'Spanish anime streaming provider with Latino dubbing',
    author: { name: 'AnimeLatino', github: 'anime-latino' },
    pluginType: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER,
    language: 'es',
    downloads: 780,
    rating: 4.1,
    capabilities: { search: true, getPopular: true, getLatest: true, getEpisodes: true, getStreams: true },
    tags: ['anime', 'spanish', 'latino'],
    downloadUrl: 'https://example.com/plugins/anime-es.zpe'
  }
]

// Language options for filtering
const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All Languages' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'universal', label: 'Universal' }
]

// Plugin type options for filtering
const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: ZPE_PLUGIN_TYPE.MEDIA_PROVIDER, label: 'Media Provider' },
  { value: ZPE_PLUGIN_TYPE.STREAM_PROVIDER, label: 'Stream Provider' }
]

// ============================================================================
// Helper Components
// ============================================================================

// Default plugin icon component
function DefaultPluginIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

// Star rating display
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      <StarFilledIcon className="h-3 w-3 text-yellow-400" />
      <span className="text-xs text-gray-400">{rating.toFixed(1)}</span>
    </div>
  )
}

// Language badge component
function LanguageBadge({ language }) {
  const languageMap = {
    de: { label: 'DE', color: 'bg-red-900/50 text-red-300' },
    en: { label: 'EN', color: 'bg-blue-900/50 text-blue-300' },
    fr: { label: 'FR', color: 'bg-indigo-900/50 text-indigo-300' },
    ja: { label: 'JP', color: 'bg-pink-900/50 text-pink-300' },
    es: { label: 'ES', color: 'bg-orange-900/50 text-orange-300' },
    universal: { label: '🌐', color: 'bg-gray-700/50 text-gray-300' }
  }
  
  const lang = languageMap[language] || { label: language.toUpperCase(), color: 'bg-gray-700/50 text-gray-300' }
  
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${lang.color}`}>
      {lang.label}
    </span>
  )
}

// ============================================================================
// Main Plugin Page Component
// ============================================================================

export default function Plugins() {
  const { settings } = useZenshinContext()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('installed')
  
  // Installed plugins state
  const [plugins, setPlugins] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConverting, setIsConverting] = useState(null)
  const zpeFileInputRef = useRef(null)
  
  // Marketplace state
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isInstalling, setIsInstalling] = useState(null)

  // Load plugins on mount
  useEffect(() => {
    loadPlugins()
  }, [])

  // Load all plugins (both JS and ZPE)
  function loadPlugins() {
    try {
      const jsPlugins = jsPluginManager.getAllPlugins().map(p => ({ ...p, format: 'js' }))
      const zpePlugins = zpePluginManager.getAllPlugins().map(p => ({ ...p, format: 'zpe' }))
      setPlugins([...jsPlugins, ...zpePlugins])
    } catch (error) {
      console.error('Failed to load plugins:', error)
    }
  }

  // Toggle plugin enabled state
  function togglePlugin(pluginId, format) {
    const plugin = plugins.find((p) => p.id === pluginId)
    if (!plugin) return

    const newEnabled = !plugin.enabled
    try {
      if (format === 'zpe') {
        zpePluginManager.setPluginEnabled(pluginId, newEnabled)
      } else {
        jsPluginManager.setPluginEnabled(pluginId, newEnabled)
      }
      toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}: ${plugin.name}`)
      loadPlugins()
    } catch (error) {
      toast.error(`Failed to ${newEnabled ? 'enable' : 'disable'} plugin: ${error}`)
    }
  }

  // Remove a plugin
  async function removePlugin(pluginId, format) {
    const plugin = plugins.find((p) => p.id === pluginId)
    if (!plugin) return

    try {
      if (format === 'zpe') {
        await zpePluginManager.unloadPlugin(pluginId)
      } else {
        await jsPluginManager.unloadPlugin(pluginId)
      }
      toast.success(`Plugin removed: ${plugin.name}`)
      loadPlugins()
    } catch (error) {
      toast.error(`Failed to remove plugin: ${error}`)
    }
  }

  // Convert JS plugin to ZPE format
  async function convertToZPE(pluginId) {
    const stored = localStorage.getItem('ayoto_js_plugins')
    if (!stored) {
      toast.error('Could not find plugin data')
      return
    }

    const pluginsData = JSON.parse(stored)
    const pluginData = pluginsData.find(p => p.manifest.id === pluginId)
    
    if (!pluginData) {
      toast.error('Plugin data not found')
      return
    }

    setIsConverting(pluginId)
    try {
      // Convert manifest to ZPE format
      const zpeManifest = {
        ...pluginData.manifest,
        pluginType: pluginData.manifest.pluginType === PLUGIN_TYPE.MEDIA_PROVIDER 
          ? ZPE_PLUGIN_TYPE.MEDIA_PROVIDER 
          : ZPE_PLUGIN_TYPE.STREAM_PROVIDER,
        author: typeof pluginData.manifest.author === 'string' 
          ? { name: pluginData.manifest.author }
          : pluginData.manifest.author || { name: 'Unknown' },
        permissions: ['network:http', 'storage:local'],
        security: {
          sandboxed: true,
          allowedDomains: []
        }
      }

      const builder = new ZPEBuilder({ minify: false, strictMode: false })
      const result = await builder.build(zpeManifest, pluginData.code)

      if (result.success) {
        // Create download link for the ZPE file
        const blob = new Blob([result.data], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`Plugin converted to ZPE: ${result.filename}`)
      } else {
        toast.error(`Failed to convert: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      toast.error(`Conversion failed: ${error.message}`)
    } finally {
      setIsConverting(null)
    }
  }

  // Handle ZPE file selection
  async function handleLoadZPEPlugin(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const result = await zpePluginManager.loadFromZPE(buffer)
      
      if (result.success) {
        toast.success(`ZPE Plugin installed: ${result.pluginId}`)
        loadPlugins()
      } else {
        toast.error(`Failed to load ZPE plugin: ${result.errors?.join(', ') || 'Unknown error'}`)
      }
    } catch (error) {
      toast.error(`Failed to load ZPE plugin: ${error.message || error}`)
    } finally {
      setIsLoading(false)
      if (zpeFileInputRef.current) {
        zpeFileInputRef.current.value = ''
      }
    }
  }

  // Get capability display name
  function getCapabilityName(key) {
    const names = {
      search: 'Search',
      getPopular: 'Popular',
      getLatest: 'Latest',
      getEpisodes: 'Episodes',
      getStreams: 'Streams',
      getAnimeDetails: 'Details',
      extractStream: 'Extract',
      getHosterInfo: 'Hoster Info'
    }
    return names[key] || key
  }

  // Filter marketplace plugins
  const filteredMarketplacePlugins = useMemo(() => {
    return MARKETPLACE_PLUGINS.filter(plugin => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.tags.some(tag => tag.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }
      
      // Language filter
      if (languageFilter !== 'all' && plugin.language !== languageFilter) {
        return false
      }
      
      // Type filter
      if (typeFilter !== 'all' && plugin.pluginType !== typeFilter) {
        return false
      }
      
      return true
    })
  }, [searchQuery, languageFilter, typeFilter])

  // Check if a marketplace plugin is already installed
  function isPluginInstalled(pluginId) {
    return plugins.some(p => p.id === pluginId)
  }

  // Install a plugin from the marketplace (mock implementation)
  async function installMarketplacePlugin(plugin) {
    setIsInstalling(plugin.id)
    try {
      // In a real implementation, this would download the plugin from the URL
      // For now, we show a toast indicating the feature
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast.info(`Marketplace download coming soon! Plugin: ${plugin.name}`)
    } catch (error) {
      toast.error(`Failed to install plugin: ${error.message}`)
    } finally {
      setIsInstalling(null)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="w-full animate-fade select-none px-16 py-10 font-space-mono animate-duration-500">
      {/* Header with Tabs */}
      <div className="mb-8 flex items-center justify-between border-b border-gray-700 pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('installed')}
            className={`pb-2 text-sm font-semibold tracking-wider transition-colors ${
              activeTab === 'installed'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <CodeIcon className="mr-2 inline-block h-4 w-4" />
            Installed Plugins
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`pb-2 text-sm font-semibold tracking-wider transition-colors ${
              activeTab === 'marketplace'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <GlobeIcon className="mr-2 inline-block h-4 w-4" />
            Marketplace
          </button>
        </div>
        
        {/* Refresh button */}
        <Button
          variant="ghost"
          size="1"
          className="cursor-pointer"
          onClick={loadPlugins}
        >
          <ReloadIcon />
        </Button>
      </div>

      {/* Installed Plugins Tab */}
      {activeTab === 'installed' && (
        <>
          {/* Add Plugin Section */}
          <div className="mb-8 flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
            <div className="flex w-full items-center justify-between gap-4 rounded-sm bg-[#202022] px-4 py-3">
              <div className="flex-1">
                <p className="font-bold">Load Plugin File</p>
                <p className="text-xs text-gray-400">Load a plugin from a local .zpe file</p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={zpeFileInputRef}
                  type="file"
                  accept=".zpe"
                  onChange={handleLoadZPEPlugin}
                  className="hidden"
                />
                <Button
                  variant="soft"
                  color="blue"
                  className="cursor-pointer"
                  onClick={() => zpeFileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  {isLoading ? <ReloadIcon className="animate-spin" /> : <ArchiveIcon />}
                  Load ZPE
                </Button>
              </div>
            </div>
          </div>

          {/* Installed Plugins List */}
          <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
            Installed Plugins ({plugins.length})
          </div>

          {plugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <DefaultPluginIcon className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-lg">No plugins installed</p>
              <p className="text-sm">Load a .zpe plugin file or browse the marketplace to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
              {plugins.map((plugin) => (
                <div
                  key={`${plugin.id}-${plugin.format}`}
                  className={`flex w-full items-center justify-between rounded-sm bg-[#202022] px-4 py-3 transition-opacity ${
                    !plugin.enabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Plugin Icon */}
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-[#2a2a2d]">
                      {plugin.format === 'zpe' ? (
                        <ArchiveIcon className="h-6 w-6 text-blue-400" />
                      ) : (
                        <CodeIcon className="h-6 w-6 text-yellow-400" />
                      )}
                    </div>

                    {/* Plugin Info */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{plugin.name}</p>
                        <span className="rounded bg-[#2a2a2d] px-2 py-0.5 text-xs text-gray-400">
                          v{plugin.version}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs ${
                          plugin.format === 'zpe' 
                            ? 'bg-blue-900/50 text-blue-300' 
                            : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {plugin.format === 'zpe' ? 'ZPE' : 'JS'}
                        </span>
                        {plugin.enabled ? (
                          <CheckCircledIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <CrossCircledIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{plugin.description || 'No description'}</p>
                      <p className="text-xs text-gray-500">
                        by {typeof plugin.author === 'object' ? plugin.author?.name : plugin.author || 'Unknown'}
                      </p>
                      
                      {/* Plugin Type Tag */}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-[#3a3a3d] px-1.5 py-0.5 text-xs text-gray-300">
                          {plugin.pluginType === PLUGIN_TYPE.STREAM_PROVIDER || 
                           plugin.pluginType === ZPE_PLUGIN_TYPE.STREAM_PROVIDER
                            ? 'Stream Provider' 
                            : 'Media Provider'}
                        </span>
                      </div>
                      
                      {/* Capabilities */}
                      {plugin.capabilities && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(plugin.capabilities)
                            .filter(([, enabled]) => enabled)
                            .map(([capability]) => (
                              <span
                                key={capability}
                                className="rounded bg-green-900/30 px-1.5 py-0.5 text-xs text-green-300"
                              >
                                {getCapabilityName(capability)}
                              </span>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plugin Controls */}
                  <div className="flex items-center gap-3">
                    {/* Convert to ZPE button (only for JS plugins) */}
                    {plugin.format === 'js' && (
                      <Button
                        variant="ghost"
                        color="blue"
                        size="1"
                        className="cursor-pointer"
                        onClick={() => convertToZPE(plugin.id)}
                        disabled={isConverting === plugin.id}
                        title="Convert to ZPE format"
                      >
                        {isConverting === plugin.id ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <DownloadIcon />
                        )}
                      </Button>
                    )}
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={() => togglePlugin(plugin.id, plugin.format)}
                      style={{ cursor: 'pointer' }}
                    />
                    <Button
                      variant="ghost"
                      color="red"
                      size="1"
                      className="cursor-pointer"
                      onClick={() => removePlugin(plugin.id, plugin.format)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs opacity-45">
            ZPE plugins extend Zenshin&apos;s functionality by adding support for additional providers.
            Only secure .zpe plugin packages can be loaded. Use &apos;npm run build-plugin&apos; to build plugins from source.
          </p>
        </>
      )}

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2 rounded-sm bg-[#202022] px-4 py-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="rounded-sm bg-[#202022] px-3 py-1.5 text-sm text-white outline-none"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <CodeIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-sm bg-[#202022] px-3 py-1.5 text-sm text-white outline-none"
                >
                  {TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Marketplace Grid */}
          <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
            Available Plugins ({filteredMarketplacePlugins.length})
          </div>

          {filteredMarketplacePlugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MagnifyingGlassIcon className="mb-4 h-16 w-16 opacity-50" />
              <p className="text-lg">No plugins found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarketplacePlugins.map((plugin) => {
                const installed = isPluginInstalled(plugin.id)
                return (
                  <div
                    key={plugin.id}
                    className="flex flex-col rounded-sm bg-[#202022] p-4 transition-all hover:bg-[#252527]"
                  >
                    {/* Header */}
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#2a2a2d]">
                          {plugin.pluginType === ZPE_PLUGIN_TYPE.STREAM_PROVIDER ? (
                            <ArchiveIcon className="h-5 w-5 text-purple-400" />
                          ) : (
                            <GlobeIcon className="h-5 w-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{plugin.name}</p>
                          <p className="text-xs text-gray-500">v{plugin.version}</p>
                        </div>
                      </div>
                      <LanguageBadge language={plugin.language} />
                    </div>

                    {/* Description */}
                    <p className="mb-3 flex-1 text-xs text-gray-400">{plugin.description}</p>

                    {/* Tags */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {plugin.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="rounded bg-[#3a3a3d] px-1.5 py-0.5 text-xs text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats and Actions */}
                    <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                      <div className="flex items-center gap-3">
                        <StarRating rating={plugin.rating} />
                        <span className="text-xs text-gray-500">
                          <DownloadIcon className="mr-1 inline-block h-3 w-3" />
                          {plugin.downloads.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        variant={installed ? 'ghost' : 'soft'}
                        color={installed ? 'gray' : 'blue'}
                        size="1"
                        className="cursor-pointer"
                        disabled={installed || isInstalling === plugin.id}
                        onClick={() => installMarketplacePlugin(plugin)}
                      >
                        {isInstalling === plugin.id ? (
                          <ReloadIcon className="animate-spin" />
                        ) : installed ? (
                          <>
                            <CheckCircledIcon />
                            Installed
                          </>
                        ) : (
                          <>
                            <DownloadIcon />
                            Install
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="mt-8 text-xs opacity-45">
            The Plugin Marketplace is a community-driven collection of plugins.
            Always verify plugin sources before installation. Plugins marked with a language tag support that specific language content.
          </p>
        </>
      )}
    </div>
  )
}
