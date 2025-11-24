import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Theme, Button, TextField } from '@radix-ui/themes'
import { MagnifyingGlassIcon, VideoIcon, ArrowLeftIcon } from '@radix-ui/react-icons'
import '@radix-ui/themes/styles.css'
import './App.css'

interface Episode {
  number: number;
  title: string;
  stream_url: string;
  thumbnail_url?: string;
}

interface Anime {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  episodes: Episode[];
}

interface MiracastDevice {
  id: string;
  name: string;
  ip_address: string;
  is_available: boolean;
}

interface CastState {
  is_casting: boolean;
  device_id?: string;
  media_url?: string;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Anime[]>([])
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [providers, setProviders] = useState<string[]>([])
  const [miracastDevices, setMiracastDevices] = useState<MiracastDevice[]>([])
  const [castState, setCastState] = useState<CastState | null>(null)
  const [showCastMenu, setShowCastMenu] = useState(false)
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>('')

  useEffect(() => {
    loadProviders()
    loadCastState()
  }, [])

  const loadProviders = async () => {
    try {
      const providerList = await invoke<string[]>('list_providers')
      setProviders(providerList)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const loadCastState = async () => {
    try {
      const state = await invoke<CastState>('get_cast_state')
      setCastState(state)
    } catch (error) {
      console.error('Failed to load cast state:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const results = await invoke<Anime[]>('search_anime', { query: searchQuery })
      setSearchResults(results)
      setSelectedAnime(null)
    } catch (error) {
      console.error('Search failed:', error)
      alert('Search failed: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnimeSelect = async (anime: Anime) => {
    setIsLoading(true)
    try {
      const fullAnime = await invoke<Anime>('get_anime', { id: anime.id })
      setSelectedAnime(fullAnime)
    } catch (error) {
      console.error('Failed to load anime:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scanCastDevices = async () => {
    try {
      const devices = await invoke<MiracastDevice[]>('scan_miracast_devices')
      setMiracastDevices(devices)
      setShowCastMenu(true)
    } catch (error) {
      console.error('Failed to scan devices:', error)
      alert('Failed to scan for cast devices: ' + error)
    }
  }

  const handleCast = async (deviceId: string) => {
    if (!currentStreamUrl) {
      alert('Please select an episode first')
      return
    }

    try {
      await invoke('start_cast', { deviceId, mediaUrl: currentStreamUrl })
      await loadCastState()
      setShowCastMenu(false)
      alert('Casting started!')
    } catch (error) {
      console.error('Failed to start cast:', error)
      alert('Failed to start cast: ' + error)
    }
  }

  const handleStopCast = async () => {
    try {
      await invoke('stop_cast')
      await loadCastState()
      alert('Casting stopped')
    } catch (error) {
      console.error('Failed to stop cast:', error)
    }
  }

  const handlePlayEpisode = (episode: Episode) => {
    setCurrentStreamUrl(episode.stream_url)
    alert(`Playing: ${episode.title}\nStream URL: ${episode.stream_url}\n\nNote: This is a demo. In a production app, this would open a video player.`)
  }

  return (
    <Theme appearance="dark" accentColor="purple">
      <div className="min-h-screen bg-[#0f0f0f] text-white font-inter">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#1a1a1d] border-b border-[#2a2a2d]">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">🎌 Ayoto</h1>
                {providers.length > 0 && (
                  <span className="text-sm text-gray-400">Provider: {providers.join(', ')}</span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <TextField.Root
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    size="2"
                    style={{ width: '300px' }}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                  
                  <Button onClick={handleSearch} disabled={isLoading} size="2">
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Cast Button */}
                <Button
                  onClick={castState?.is_casting ? handleStopCast : scanCastDevices}
                  variant="soft"
                  size="2"
                >
                  <VideoIcon />
                  {castState?.is_casting ? 'Stop Cast' : 'Cast'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Cast Menu Modal */}
        {showCastMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="bg-[#1a1a1d] rounded-lg p-6 w-96 border border-[#2a2a2d]">
              <h3 className="text-xl font-bold mb-4">Select Cast Device</h3>
              {miracastDevices.length === 0 ? (
                <p className="text-gray-400 mb-4">No devices found. Make sure your casting device is on the same network.</p>
              ) : (
                <div className="flex flex-col gap-2 mb-4">
                  {miracastDevices.map((device) => (
                    <button
                      key={device.id}
                      className="text-left p-3 bg-[#2a2a2d] hover:bg-[#3a3a3d] rounded transition-colors disabled:opacity-50"
                      onClick={() => handleCast(device.id)}
                      disabled={!device.is_available}
                    >
                      <strong className="block">{device.name}</strong>
                      <small className="text-gray-400">{device.ip_address}</small>
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={() => setShowCastMenu(false)} variant="soft" className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          {selectedAnime ? (
            /* Anime Detail View */
            <div className="animate-fade">
              <Button
                onClick={() => setSelectedAnime(null)}
                variant="soft"
                size="2"
                className="mb-6"
              >
                <ArrowLeftIcon />
                Back to Results
              </Button>

              <div className="grid md:grid-cols-[300px_1fr] gap-6 mb-8">
                <img
                  src={selectedAnime.thumbnail_url}
                  alt={selectedAnime.title}
                  className="w-full h-[400px] object-cover rounded-lg"
                />
                <div>
                  <h2 className="text-3xl font-bold mb-4">{selectedAnime.title}</h2>
                  <p className="text-gray-300 leading-relaxed">{selectedAnime.description}</p>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4">Episodes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {selectedAnime.episodes.map((episode) => (
                    <div
                      key={episode.number}
                      className="bg-[#1a1a1d] rounded-lg overflow-hidden hover:bg-[#2a2a2d] transition-all hover:scale-105"
                    >
                      {episode.thumbnail_url && (
                        <img
                          src={episode.thumbnail_url}
                          alt={episode.title}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h4 className="font-semibold mb-2">Episode {episode.number}</h4>
                        <p className="text-sm text-gray-400 mb-3">{episode.title}</p>
                        <Button
                          onClick={() => handlePlayEpisode(episode)}
                          size="2"
                          className="w-full"
                        >
                          ▶ Play
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            /* Search Results Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade">
              {searchResults.map((anime) => (
                <div
                  key={anime.id}
                  onClick={() => handleAnimeSelect(anime)}
                  className="group cursor-pointer animate-fade"
                >
                  <div className="relative overflow-hidden rounded-lg transition-transform hover:scale-110">
                    <img
                      src={anime.thumbnail_url}
                      alt={anime.title}
                      className="w-full h-60 object-cover"
                    />
                    {/* Glow effect on hover */}
                    <img
                      src={anime.thumbnail_url}
                      alt=""
                      className="absolute top-0 w-full h-60 object-cover opacity-0 blur-2xl contrast-200 saturate-200 transition-opacity duration-500 group-hover:opacity-70 -z-10"
                    />
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium line-clamp-2 h-11" title={anime.title}>
                      {anime.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-3xl font-bold mb-4">Search for your favorite anime</h2>
              <p className="text-gray-400 text-lg">Use the search bar above to find anime to watch</p>
            </div>
          )}
        </main>
      </div>
    </Theme>
  )
}

export default App
