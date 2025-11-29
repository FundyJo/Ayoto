import { Button, Switch } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  CodeIcon
} from '@radix-ui/react-icons'
import { jsPluginManager, PLUGIN_TYPE } from '../plugins'

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

// Plugin icon component with fallback
function PluginIcon({ icon, name }) {
  const [hasError, setHasError] = useState(false)
  
  if (!icon || hasError) {
    return <DefaultPluginIcon className="h-6 w-6 text-gray-400" />
  }
  
  return (
    <img 
      src={icon} 
      alt={`${name} icon`}
      className="h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  )
}

export default function Plugins() {
  const { settings } = useZenshinContext()
  const [plugins, setPlugins] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Load plugins on mount
  useEffect(() => {
    loadPlugins()
  }, [])

  // Load all plugins
  function loadPlugins() {
    try {
      const allPlugins = jsPluginManager.getAllPlugins()
      setPlugins(allPlugins || [])
    } catch (error) {
      console.error('Failed to load plugins:', error)
    }
  }

  // Toggle plugin enabled state
  function togglePlugin(pluginId) {
    const plugin = plugins.find((p) => p.id === pluginId)
    if (!plugin) return

    const newEnabled = !plugin.enabled
    try {
      jsPluginManager.setPluginEnabled(pluginId, newEnabled)
      toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}: ${plugin.name}`)
      loadPlugins() // Reload plugins to get updated state
    } catch (error) {
      toast.error(`Failed to ${newEnabled ? 'enable' : 'disable'} plugin: ${error}`)
    }
  }

  // Remove a plugin
  async function removePlugin(pluginId) {
    const plugin = plugins.find((p) => p.id === pluginId)
    if (!plugin) return

    try {
      await jsPluginManager.unloadPlugin(pluginId)
      toast.success(`Plugin removed: ${plugin.name}`)
      loadPlugins() // Reload plugins
    } catch (error) {
      toast.error(`Failed to remove plugin: ${error}`)
    }
  }

  // Handle JavaScript file selection
  async function handleLoadPlugin(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const code = await file.text()
      
      // Try to extract manifest from the code
      // The manifest should be defined as a `manifest` const/var/let at the start
      let manifest = null
      
      // Try to parse manifest from comment or variable
      const manifestMatch = code.match(/(?:const|let|var)\s+manifest\s*=\s*({[\s\S]*?});/)
      if (manifestMatch) {
        try {
          // eslint-disable-next-line no-eval
          manifest = eval(`(${manifestMatch[1]})`)
        } catch (e) {
          // Try JSON parse as fallback
          try {
            manifest = JSON.parse(manifestMatch[1])
          } catch (e2) {
            console.error('Failed to parse manifest:', e2)
          }
        }
      }
      
      // If no manifest found in code, create a basic one from filename
      if (!manifest) {
        const fileName = file.name.replace(/\.(js|ts)$/, '')
        manifest = {
          id: fileName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          name: fileName,
          version: '1.0.0',
          pluginType: PLUGIN_TYPE.MEDIA_PROVIDER,
          description: `Plugin loaded from ${file.name}`,
          capabilities: {
            search: true,
            getPopular: true,
            getLatest: true,
            getEpisodes: true,
            getStreams: true
          }
        }
        toast.warning('No manifest found in plugin, using defaults')
      }

      const result = await jsPluginManager.loadPlugin(manifest, code)
      
      if (result.success) {
        toast.success(`Plugin installed: ${result.pluginId}`)
        loadPlugins() // Reload plugins list
      } else {
        const errorMsg = result.errors?.join(', ') || 'Unknown error'
        toast.error(`Failed to load plugin: ${errorMsg}`)
        if (result.warnings?.length > 0) {
          result.warnings.forEach(warning => toast.warning(warning))
        }
      }
    } catch (error) {
      toast.error(`Failed to load plugin: ${error.message || error}`)
    } finally {
      setIsLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Trigger file input click
  function handleLoadClick() {
    fileInputRef.current?.click()
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

  return (
    <div className="w-full animate-fade select-none px-16 py-10 font-space-mono animate-duration-500">
      <div className="mb-8 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        JavaScript Plugins
      </div>

      {/* Add Plugin Section */}
      <div className="mb-8 flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-3">
          <div className="flex-1">
            <p className="font-bold">Load JavaScript Plugin</p>
            <p className="text-xs">Load a plugin from a local .js or .ts file</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.ts,.mjs"
              onChange={handleLoadPlugin}
              className="hidden"
            />
            <Button
              variant="soft"
              color="blue"
              className="cursor-pointer"
              onClick={handleLoadClick}
              disabled={isLoading}
            >
              {isLoading ? <ReloadIcon className="animate-spin" /> : <PlusIcon />}
              Load Plugin
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
          <p className="text-sm">Load a JavaScript plugin file to get started</p>
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
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-[#2a2a2d]">
                  <CodeIcon className="h-6 w-6 text-yellow-400" />
                </div>

                {/* Plugin Info */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{plugin.name}</p>
                    <span className="rounded bg-[#2a2a2d] px-2 py-0.5 text-xs text-gray-400">
                      v{plugin.version}
                    </span>
                    <span className="rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                      JS
                    </span>
                    {plugin.enabled ? (
                      <CheckCircledIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CrossCircledIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{plugin.description || 'No description'}</p>
                  <p className="text-xs text-gray-500">by {plugin.author || 'Unknown'}</p>
                  
                  {/* Plugin Type Tag */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-[#3a3a3d] px-1.5 py-0.5 text-xs text-gray-300">
                      {plugin.pluginType === PLUGIN_TYPE.STREAM_PROVIDER ? 'Stream Provider' : 'Media Provider'}
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

      <p className="mt-8 text-xs opacity-45">
        JavaScript plugins extend Zenshin&apos;s functionality by adding support for additional providers.
        Only install plugins from trusted sources. Plugins can perform web scraping to fetch anime data.
      </p>
    </div>
  )
}
