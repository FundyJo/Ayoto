import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
    <div className="app">
      <header className="header">
        <h1>🎌 Ayoto - Anime Streaming</h1>
        <div className="provider-info">
          {providers.length > 0 && (
            <span>Provider: {providers.join(', ')}</span>
          )}
        </div>
      </header>

      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search for anime..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-button" onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        
        <button 
          className="cast-button" 
          onClick={castState?.is_casting ? handleStopCast : scanCastDevices}
          title="Cast to device"
        >
          {castState?.is_casting ? '📡 Stop Cast' : '📱 Cast'}
        </button>
      </div>

      {showCastMenu && (
        <div className="cast-menu">
          <h3>Select Cast Device</h3>
          {miracastDevices.length === 0 ? (
            <p>No devices found. Make sure your casting device is on the same network.</p>
          ) : (
            <div className="device-list">
              {miracastDevices.map((device) => (
                <button
                  key={device.id}
                  className="device-item"
                  onClick={() => handleCast(device.id)}
                  disabled={!device.is_available}
                >
                  <strong>{device.name}</strong>
                  <small>{device.ip_address}</small>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowCastMenu(false)}>Close</button>
        </div>
      )}

      <div className="content">
        {selectedAnime ? (
          <div className="anime-detail">
            <button className="back-button" onClick={() => setSelectedAnime(null)}>
              ← Back to Results
            </button>
            <div className="anime-info">
              <img src={selectedAnime.thumbnail_url} alt={selectedAnime.title} />
              <div>
                <h2>{selectedAnime.title}</h2>
                <p>{selectedAnime.description}</p>
              </div>
            </div>
            <div className="episodes">
              <h3>Episodes</h3>
              <div className="episode-list">
                {selectedAnime.episodes.map((episode) => (
                  <div key={episode.number} className="episode-card">
                    {episode.thumbnail_url && (
                      <img src={episode.thumbnail_url} alt={episode.title} />
                    )}
                    <div className="episode-info">
                      <h4>Episode {episode.number}</h4>
                      <p>{episode.title}</p>
                      <button onClick={() => handlePlayEpisode(episode)}>
                        ▶ Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="search-results">
            {searchResults.length > 0 ? (
              <div className="anime-grid">
                {searchResults.map((anime) => (
                  <div
                    key={anime.id}
                    className="anime-card"
                    onClick={() => handleAnimeSelect(anime)}
                  >
                    <img src={anime.thumbnail_url} alt={anime.title} />
                    <h3>{anime.title}</h3>
                    <p>{anime.description.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>Search for your favorite anime</h2>
                <p>Use the search bar above to find anime to watch</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
