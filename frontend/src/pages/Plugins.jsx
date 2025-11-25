import { Button, Switch, TextField } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  RocketIcon,
  VideoIcon
} from '@radix-ui/react-icons'
import { parseAyotoPlugin, validatePlugin, createPluginTemplate, STREAM_FORMATS } from '../plugins'

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

export default function Plugins() {
  const { plugins, setPlugins, settings } = useZenshinContext()
  const [pluginUrl, setPluginUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Toggle plugin enabled state
  function togglePlugin(pluginId) {
    const updatedPlugins = plugins.map((plugin) => {
      if (plugin.id === pluginId) {
        const newEnabled = !plugin.enabled
        toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}: ${plugin.name}`)
        return { ...plugin, enabled: newEnabled }
      }
      return plugin
    })
    setPlugins(updatedPlugins)
    savePluginsToStorage(updatedPlugins)
  }

  // Remove a plugin
  function removePlugin(pluginId) {
    const plugin = plugins.find((p) => p.id === pluginId)
    const updatedPlugins = plugins.filter((p) => p.id !== pluginId)
    setPlugins(updatedPlugins)
    savePluginsToStorage(updatedPlugins)
    toast.success(`Plugin removed: ${plugin?.name}`)
  }

  // Save plugins to localStorage
  function savePluginsToStorage(pluginsData) {
    localStorage.setItem('zenshin_plugins', JSON.stringify(pluginsData))
  }

  // Add plugin from URL
  async function addPluginFromUrl() {
    if (!pluginUrl.trim()) {
      toast.error('Please enter a plugin URL')
      return
    }

    // Validate URL for security - only allow HTTPS
    if (!isValidPluginUrl(pluginUrl)) {
      toast.error('Invalid URL. Only HTTPS URLs are allowed for security.')
      return
    }

    setIsLoading(true)
    try {
      // Fetch the plugin manifest/config from URL
      const response = await fetch(pluginUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch plugin')
      }
      const pluginData = await response.json()

      // Validate plugin structure
      if (!pluginData.id || !pluginData.name) {
        throw new Error('Invalid plugin format: missing id or name')
      }

      // Validate plugin ID format (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(pluginData.id)) {
        throw new Error('Invalid plugin ID format')
      }

      // Check if plugin already exists
      if (plugins.some((p) => p.id === pluginData.id)) {
        toast.error('Plugin already installed')
        setIsLoading(false)
        return
      }

      // Validate icon URL if provided
      const validatedIcon = isValidIconUrl(pluginData.icon) ? pluginData.icon : null

      const newPlugin = {
        id: pluginData.id,
        name: pluginData.name,
        description: pluginData.description || 'No description provided',
        version: pluginData.version || '1.0.0',
        author: pluginData.author || 'Unknown',
        icon: validatedIcon,
        enabled: true,
        source: pluginUrl,
        providers: pluginData.providers || [],
        config: pluginData.config || {}
      }

      const updatedPlugins = [...plugins, newPlugin]
      setPlugins(updatedPlugins)
      savePluginsToStorage(updatedPlugins)
      setPluginUrl('')
      toast.success(`Plugin installed: ${newPlugin.name}`)
    } catch (error) {
      toast.error(`Failed to add plugin: ${error.message}`)
    }
    setIsLoading(false)
  }

  // Add plugin from file (.json or .ayoto)
  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const isAyotoFile = file.name.endsWith('.ayoto')
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result
        let newPlugin
        
        if (isAyotoFile) {
          // Parse .ayoto format with extended validation
          newPlugin = parseAyotoPlugin(content)
          if (!newPlugin) {
            throw new Error('Invalid .ayoto plugin format')
          }
        } else {
          // Legacy JSON format
          const pluginData = JSON.parse(content)

          // Validate plugin structure
          if (!pluginData.id || !pluginData.name) {
            throw new Error('Invalid plugin format: missing id or name')
          }

          // Validate plugin ID format (alphanumeric, hyphens, underscores only)
          if (!/^[a-zA-Z0-9_-]+$/.test(pluginData.id)) {
            throw new Error('Invalid plugin ID format')
          }

          // Check if plugin already exists
          if (plugins.some((p) => p.id === pluginData.id)) {
            toast.error('Plugin already installed')
            return
          }

          // Validate icon URL if provided
          const validatedIcon = isValidIconUrl(pluginData.icon) ? pluginData.icon : null

          newPlugin = {
            id: pluginData.id,
            name: pluginData.name,
            description: pluginData.description || 'No description provided',
            version: pluginData.version || '1.0.0',
            author: pluginData.author || 'Unknown',
            icon: validatedIcon,
            enabled: true,
            source: 'local',
            providers: pluginData.providers || [],
            formats: pluginData.formats || ['mp4'],
            anime4kSupport: pluginData.anime4kSupport || false,
            capabilities: pluginData.capabilities || {},
            endpoints: pluginData.endpoints || {},
            config: pluginData.config || {}
          }
        }

        // Check if plugin already exists
        if (plugins.some((p) => p.id === newPlugin.id)) {
          toast.error('Plugin already installed')
          return
        }

        const updatedPlugins = [...plugins, newPlugin]
        setPlugins(updatedPlugins)
        savePluginsToStorage(updatedPlugins)
        toast.success(`Plugin installed: ${newPlugin.name}`)
      } catch (error) {
        toast.error(`Failed to load plugin: ${error.message}`)
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Validate URL to prevent potential security issues
  function isValidPluginUrl(url) {
    try {
      const parsed = new URL(url)
      // Only allow https URLs for security
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Validate icon URL
  function isValidIconUrl(iconUrl) {
    if (!iconUrl) return false
    try {
      const parsed = new URL(iconUrl)
      return parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  return (
    <div className="w-full animate-fade select-none px-16 py-10 font-space-mono animate-duration-500">
      <div className="mb-8 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        Plugins
      </div>

      {/* Add Plugin Section */}
      <div className="mb-8 flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-3">
          <div className="flex-1">
            <p className="font-bold">Add Plugin from URL</p>
            <p className="text-xs">Enter a URL to a plugin manifest (JSON file)</p>
          </div>
          <div className="flex w-1/2 gap-2">
            <TextField.Root
              placeholder="https://example.com/plugin.json"
              value={pluginUrl}
              onChange={(e) => setPluginUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="soft"
              color="green"
              className="cursor-pointer"
              onClick={addPluginFromUrl}
              disabled={isLoading}
            >
              {isLoading ? <ReloadIcon className="animate-spin" /> : <PlusIcon />}
              Add
            </Button>
          </div>
        </div>

        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-3">
          <div className="flex-1">
            <p className="font-bold">Add Plugin from File</p>
            <p className="text-xs">Load a plugin from a local .ayoto or .json file</p>
          </div>
          <div>
            <input
              type="file"
              accept=".json,.ayoto"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
              id="plugin-file-input"
            />
            <Button
              variant="soft"
              color="blue"
              className="cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon />
              Load File
            </Button>
          </div>
        </div>
      </div>

      {/* Installed Plugins Section */}
      <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        Installed Plugins ({plugins.length})
      </div>

      {plugins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <DefaultPluginIcon className="mb-4 h-16 w-16 opacity-50" />
          <p className="text-lg">No plugins installed</p>
          <p className="text-sm">Add a plugin using the options above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`flex w-full items-center justify-between rounded-sm bg-[#202022] px-4 py-3 transition-opacity ${
                !plugin.enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Plugin Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#2a2a2d]">
                  {plugin.icon ? (
                    <img
                      src={plugin.icon}
                      alt={plugin.name}
                      className="h-8 w-8 rounded object-contain"
                    />
                  ) : (
                    <DefaultPluginIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                {/* Plugin Info */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{plugin.name}</p>
                    <span className="rounded bg-[#2a2a2d] px-2 py-0.5 text-xs text-gray-400">
                      v{plugin.version}
                    </span>
                    {plugin.anime4kSupport && (
                      <span className="flex items-center gap-1 rounded bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-300">
                        <RocketIcon className="h-3 w-3" />
                        Anime4K
                      </span>
                    )}
                    {plugin.enabled ? (
                      <CheckCircledIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CrossCircledIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{plugin.description}</p>
                  <p className="text-xs text-gray-500">by {plugin.author}</p>
                  
                  {/* Provider and Format Tags */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {plugin.providers && plugin.providers.length > 0 && 
                      plugin.providers.map((provider, idx) => (
                        <span
                          key={`provider-${idx}`}
                          className="rounded bg-[#3a3a3d] px-1.5 py-0.5 text-xs text-gray-300"
                        >
                          {provider}
                        </span>
                      ))
                    }
                    {plugin.formats && plugin.formats.length > 0 && 
                      plugin.formats.map((format, idx) => (
                        <span
                          key={`format-${idx}`}
                          className="flex items-center gap-1 rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-300"
                        >
                          <VideoIcon className="h-3 w-3" />
                          {format}
                        </span>
                      ))
                    }
                  </div>
                  
                  {/* Capabilities */}
                  {plugin.capabilities && Object.keys(plugin.capabilities).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(plugin.capabilities)
                        .filter(([, enabled]) => enabled)
                        .map(([capability]) => (
                          <span
                            key={capability}
                            className="rounded bg-green-900/30 px-1.5 py-0.5 text-xs text-green-300"
                          >
                            {capability}
                          </span>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Plugin Controls */}
              <div className="flex items-center gap-4">
                <Switch
                  checked={plugin.enabled}
                  onCheckedChange={() => togglePlugin(plugin.id)}
                  style={{ cursor: 'pointer' }}
                />
                <Button
                  variant="ghost"
                  color="red"
                  size="1"
                  className="cursor-pointer"
                  onClick={() => removePlugin(plugin.id)}
                >
                  <TrashIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plugin Format Documentation */}
      <div className="mt-8">
        <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
          Plugin Format (.ayoto)
        </div>
        <div className="rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {`{
  "id": "unique-plugin-id",
  "name": "Plugin Name",
  "description": "Description of what the plugin does",
  "version": "1.0.0",
  "author": "Author Name",
  "icon": "https://example.com/icon.png",
  "providers": ["provider1", "provider2"],
  "formats": ["m3u8", "mp4", "mkv", "webm", "torrent"],
  "anime4kSupport": true,
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getLatest": true,
    "getEpisodes": true,
    "getStreams": true
  },
  "endpoints": {
    "search": "/api/search",
    "popular": "/api/popular",
    "latest": "/api/latest",
    "episodes": "/api/episodes",
    "streams": "/api/streams"
  },
  "config": {
    "baseUrl": "https://api.example.com",
    "customSettings": {}
  }
}`}
          </pre>
        </div>
        
        {/* Stream Formats Documentation */}
        <div className="mt-4 rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <p className="mb-2 font-bold text-gray-300">Supported Stream Formats:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><code className="text-blue-300">m3u8</code> - HLS streaming format (recommended for Anime4K)</li>
            <li><code className="text-blue-300">mp4</code> - Direct MP4 video files</li>
            <li><code className="text-blue-300">mkv</code> - Matroska video format</li>
            <li><code className="text-blue-300">webm</code> - WebM video format</li>
            <li><code className="text-blue-300">torrent</code> - Torrent magnet links</li>
          </ul>
        </div>
        
        {/* Anime4K Info */}
        <div className="mt-4 rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <p className="mb-2 font-bold text-gray-300">Anime4K Support:</p>
          <p className="mb-2">
            Set <code className="text-purple-300">anime4kSupport: true</code> if your plugin provides 
            streams that work well with Anime4K upscaling shaders.
          </p>
          <p>
            Anime4K works best with high-quality source video (m3u8 1080p streams) on devices 
            with capable GPUs.
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs opacity-45">
        Plugins extend Zenshin&apos;s functionality by adding support for additional providers. Only
        install plugins from trusted sources.
      </p>
    </div>
  )
}
