import { Button, Switch } from '@radix-ui/themes'
import { useZenshinContext } from '../utils/ContextProvider'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  ReloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  RocketIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons'
import { loadZpePlugin, getAllZpePlugins, setZpePluginEnabled, unloadZpePlugin, getZpePluginInfo } from '../plugins'

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
  const [zpeInfo, setZpeInfo] = useState(null)
  const fileInputRef = useRef(null)

  // Load ZPE plugins on mount
  useEffect(() => {
    loadZpePlugins()
    loadZpeInfo()
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

  // Load ZPE system info
  async function loadZpeInfo() {
    try {
      const info = await getZpePluginInfo()
      setZpeInfo(info)
    } catch (error) {
      console.error('Failed to load ZPE info:', error)
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

  // Handle ZPE file upload
  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    // Only accept .zpe files
    if (!file.name.endsWith('.zpe')) {
      toast.error('Invalid file format. Only .zpe files are supported.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setIsLoading(true)
    try {
      // In Tauri, file.path contains the full file system path
      // This is a Tauri-specific property not available in web browsers
      const filePath = file.path
      
      if (!filePath) {
        toast.error('Unable to get file path. Please make sure you are running in the desktop app.')
        setIsLoading(false)
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
      toast.error(`Failed to load plugin: ${error}`)
    }
    setIsLoading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
            <input
              type="file"
              accept=".zpe"
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

      {/* ZPE Plugin Format Documentation */}
      <div className="mt-8">
        <div className="mb-4 border-b border-gray-700 pb-2 font-semibold tracking-wider text-[#b5b5b5ff]">
          ZPE Plugin Format (.zpe)
        </div>
        <div className="rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <p className="mb-3 text-gray-300">
            ZPE (Zenshine Plugin Extension) is a cross-platform plugin format using WebAssembly.
            Plugins are compiled once and run on all platforms (Windows, macOS, Linux, Android, iOS).
          </p>
          <p className="mb-2 font-bold text-gray-300">ZPE Archive Structure:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap mb-4 bg-[#1a1a1c] p-3 rounded">
            {`my-plugin.zpe
├── plugin.wasm      # Compiled WebAssembly module
├── manifest.json    # Plugin metadata
└── README.md        # Optional documentation`}
          </pre>
          <p className="mb-2 font-bold text-gray-300">manifest.json Example:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap bg-[#1a1a1c] p-3 rounded">
            {`{
  "id": "my-provider",
  "name": "My Provider",
  "version": "1.0.0",
  "targetAyotoVersion": "0.1.0",
  "author": "Your Name",
  "description": "A ZPE plugin for anime streaming",
  "pluginType": "mediaProvider",
  "capabilities": {
    "search": true,
    "getPopular": true,
    "getLatest": true,
    "getEpisodes": true,
    "getStreams": true
  },
  "abiVersion": 1
}`}
          </pre>
        </div>
        
        {/* Supported Languages */}
        <div className="mt-4 rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <p className="mb-2 font-bold text-gray-300">Supported Development Languages:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><code className="text-cyan-300">Rust</code> - Recommended, best performance</li>
            <li><code className="text-cyan-300">C/C++</code> - Via Emscripten or wasi-sdk</li>
            <li><code className="text-cyan-300">AssemblyScript</code> - TypeScript-like syntax</li>
            <li><code className="text-cyan-300">Go/TinyGo</code> - Go support via TinyGo</li>
            <li><code className="text-cyan-300">Zig</code> - Systems programming language</li>
          </ul>
        </div>
        
        {/* ZPE Benefits */}
        <div className="mt-4 rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
          <p className="mb-2 font-bold text-gray-300">ZPE Benefits:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><span className="text-green-300">Cross-platform:</span> Compile once, run anywhere</li>
            <li><span className="text-green-300">Sandboxed:</span> Secure execution environment</li>
            <li><span className="text-green-300">No recompilation:</span> Same plugin works on all platforms</li>
            <li><span className="text-green-300">High performance:</span> Near-native execution speed</li>
          </ul>
        </div>

        {/* ZPE System Info */}
        {zpeInfo && (
          <div className="mt-4 rounded-sm bg-[#202022] p-4 text-xs text-gray-400">
            <p className="mb-2 font-bold text-gray-300">ZPE System Info:</p>
            <ul className="space-y-1">
              <li>Version: <code className="text-cyan-300">{zpeInfo.version}</code></li>
              <li>ABI Version: <code className="text-cyan-300">{zpeInfo.abiVersion}</code></li>
              <li>Extension: <code className="text-cyan-300">.{zpeInfo.extension}</code></li>
            </ul>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs opacity-45">
        ZPE plugins extend Zenshin&apos;s functionality by adding support for additional providers.
        Only install plugins from trusted sources. ZPE plugins run in a sandboxed environment for security.
      </p>
    </div>
  )
}
