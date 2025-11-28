import { Button, Switch } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons'
import { loadZpePlugin, getAllZpePlugins, setZpePluginEnabled, unloadZpePlugin } from '../plugins'
import { open as openDialog } from '@tauri-apps/plugin-dialog'

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
  const { settings } = useZenshinContext()
  const [zpePlugins, setZpePlugins] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Load ZPE plugins on mount
  useEffect(() => {
    loadZpePlugins()
  }, [])

  // Load all ZPE plugins from backend
  async function loadZpePlugins() {
    try {
      const plugins = await getAllZpePlugins()
      setZpePlugins(plugins || [])
    } catch (error) {
      console.error('Failed to load ZPE plugins:', error)
      // ZPE system might not be available in web mode
    }
  }

  // Toggle ZPE plugin enabled state
  async function togglePlugin(pluginId) {
    const plugin = zpePlugins.find((p) => p.id === pluginId)
    if (!plugin) return

    const newEnabled = !plugin.enabled
    try {
      await setZpePluginEnabled(pluginId, newEnabled)
      toast.success(`Plugin ${newEnabled ? 'enabled' : 'disabled'}: ${plugin.name}`)
      await loadZpePlugins() // Reload plugins to get updated state
    } catch (error) {
      toast.error(`Failed to ${newEnabled ? 'enable' : 'disable'} plugin: ${error}`)
    }
  }

  // Remove a ZPE plugin
  async function removePlugin(pluginId) {
    const plugin = zpePlugins.find((p) => p.id === pluginId)
    if (!plugin) return

    try {
      await unloadZpePlugin(pluginId)
      toast.success(`Plugin removed: ${plugin.name}`)
      await loadZpePlugins() // Reload plugins
    } catch (error) {
      toast.error(`Failed to remove plugin: ${error}`)
    }
  }

  // Handle ZPE file selection using Tauri dialog
  async function handleLoadPlugin() {
    setIsLoading(true)
    try {
      // Use Tauri's dialog API to get the file path
      const filePath = await openDialog({
        title: 'Select ZPE Plugin',
        filters: [{
          name: 'ZPE Plugin',
          extensions: ['zpe']
        }],
        multiple: false
      })
      
      if (!filePath) {
        // User cancelled the dialog
        return
      }
      
      const result = await loadZpePlugin(filePath)
      
      if (result.success) {
        toast.success(`Plugin installed: ${result.pluginId}`)
        await loadZpePlugins() // Reload plugins list
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

  return (
    <div className="w-full animate-fade select-none px-16 py-10 font-space-mono animate-duration-500">
      <div className="mb-8 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        ZPE Plugins
      </div>

      {/* Add Plugin Section */}
      <div className="mb-8 flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
        <div className="flex w-full items-center justify-between bg-[#202022] px-4 py-3">
          <div className="flex-1">
            <p className="font-bold">Load ZPE Plugin</p>
            <p className="text-xs">Load a plugin from a local .zpe file (Zenshine Plugin Extension)</p>
          </div>
          <div>
            <Button
              variant="soft"
              color="blue"
              className="cursor-pointer"
              onClick={handleLoadPlugin}
              disabled={isLoading}
            >
              {isLoading ? <ReloadIcon className="animate-spin" /> : <PlusIcon />}
              Load .zpe File
            </Button>
          </div>
        </div>
      </div>

      {/* Installed Plugins Section */}
      <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
        Installed ZPE Plugins ({zpePlugins.length})
      </div>

      {zpePlugins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <DefaultPluginIcon className="mb-4 h-16 w-16 opacity-50" />
          <p className="text-lg">No ZPE plugins installed</p>
          <p className="text-sm">Load a .zpe plugin file to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 tracking-wide text-[#b5b5b5ff]">
          {zpePlugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`flex w-full items-center justify-between rounded-sm bg-[#202022] px-4 py-3 transition-opacity ${
                !plugin.enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Plugin Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#2a2a2d]">
                  <DefaultPluginIcon className="h-6 w-6 text-gray-400" />
                </div>

                {/* Plugin Info */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{plugin.name}</p>
                    <span className="rounded bg-[#2a2a2d] px-2 py-0.5 text-xs text-gray-400">
                      v{plugin.version}
                    </span>
                    <span className="rounded bg-cyan-900/50 px-1.5 py-0.5 text-xs text-cyan-300">
                      ZPE
                    </span>
                    {!plugin.isCompatible && (
                      <span className="flex items-center gap-1 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Incompatible
                      </span>
                    )}
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
                      {plugin.pluginType === 'streamProvider' ? 'Stream Provider' : 'Media Provider'}
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
        ZPE plugins extend Zenshin&apos;s functionality by adding support for additional providers.
        Only install plugins from trusted sources. ZPE plugins run in a sandboxed environment for security.
      </p>
    </div>
  )
}
