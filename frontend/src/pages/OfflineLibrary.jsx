import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tooltip } from '@radix-ui/themes'
import {
  ArrowDownIcon,
  DownloadIcon,
  PlayIcon,
  TrashIcon,
  DiscIcon
} from '@radix-ui/react-icons'
import formatBytes from '../utils/formatBytes'
import {
  getOfflineEpisodesByAnime,
  removeOfflineEpisode,
  getTotalStorageUsed,
  getDownloadingEpisodes
} from '../utils/offlineStorage'

function OfflineLibrary() {
  const [animeLibrary, setAnimeLibrary] = useState({})
  const [downloadingEpisodes, setDownloadingEpisodes] = useState([])
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [totalStorage, setTotalStorage] = useState(0)
  const navigate = useNavigate()

  // Load offline library and connect to WebSocket for download speed
  useEffect(() => {
    loadLibrary()
    const socket = new WebSocket('ws://localhost:64621/ws')
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data && data[0]) {
          setDownloadSpeed(data[0].clientDownloadSpeed || 0)
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Refresh library periodically to update download progress
    const interval = setInterval(loadLibrary, 2000)

    return () => {
      socket.close()
      clearInterval(interval)
    }
  }, [])

  const loadLibrary = () => {
    const library = getOfflineEpisodesByAnime()
    setAnimeLibrary(library)
    setDownloadingEpisodes(getDownloadingEpisodes())
    setTotalStorage(getTotalStorageUsed())
  }

  const handleRemoveEpisode = (episodeId) => {
    if (window.confirm('Are you sure you want to remove this episode from your offline library?')) {
      removeOfflineEpisode(episodeId)
      loadLibrary()
    }
  }

  const handlePlayEpisode = (episode) => {
    // Navigate to player with the offline file
    navigate(`/player/${encodeURIComponent(episode.magnetUri)}/${episode.animeId}/0/${episode.episodeNumber}`, {
      state: {
        state: {
          animeId: episode.animeId,
          magnetUri: episode.magnetUri,
          episodeTitle: episode.episodeTitle,
          episodeNumber: episode.episodeNumber,
          animeTitle: episode.animeTitle,
          bannerImage: episode.bannerImage,
          animeCoverImage: episode.animeCoverImage,
          isOffline: true,
          offlineEpisodeId: episode.id
        }
      }
    })
  }

  const getProgressColor = (progress) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress > 0) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const animeList = Object.values(animeLibrary)

  return (
    <div className="mx-9 mt-8 font-space-mono tracking-wide">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-wider">Offline Library</h1>
          {downloadSpeed > 0 && (
            <div className="flex items-center gap-2 rounded bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
              <ArrowDownIcon />
              <span>{formatBytes(downloadSpeed)}/s</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm opacity-60">
          <DiscIcon />
          <span>{formatBytes(totalStorage)} used</span>
        </div>
      </div>

      {/* Downloading Section */}
      {downloadingEpisodes.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-400">
            <DownloadIcon />
            Downloading ({downloadingEpisodes.length})
          </h2>
          <div className="space-y-2">
            {downloadingEpisodes.map((ep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded bg-[#21242650] p-3 animate-pulse"
              >
                <div>
                  <p className="text-sm">{ep.animeTitle}</p>
                  <p className="text-xs opacity-60">Episode {ep.episodeNumber}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <ArrowDownIcon className="animate-bounce" />
                  <span>Downloading...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {animeList.length === 0 && downloadingEpisodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 opacity-60">
          <DownloadIcon className="mb-4 h-12 w-12" />
          <p className="text-lg">No offline episodes yet</p>
          <p className="mt-2 text-sm">Download episodes to watch them offline!</p>
        </div>
      )}

      {/* Anime List */}
      <div className="space-y-6">
        {animeList.map((anime) => (
          <div
            key={anime.animeId}
            className="relative overflow-hidden rounded-lg bg-[#21242650]"
          >
            {/* Anime Header with Banner */}
            {anime.bannerImage && (
              <div className="absolute left-0 top-0 -z-10 h-full w-full overflow-hidden">
                <img
                  src={anime.bannerImage}
                  alt=""
                  className="h-full w-full object-cover opacity-10 blur-sm"
                />
              </div>
            )}
            
            <div className="flex gap-4 p-4">
              {/* Cover Image */}
              <Tooltip content="Go to anime page">
                <div
                  className="h-32 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded"
                  onClick={() => navigate(`/anime/${anime.animeId}`)}
                >
                  <img
                    src={anime.animeCoverImage}
                    alt={anime.animeTitle}
                    className="h-full w-full object-cover transition-transform hover:scale-110"
                  />
                </div>
              </Tooltip>

              {/* Anime Info and Episodes */}
              <div className="flex-1">
                <h3
                  className="mb-2 cursor-pointer text-lg font-semibold hover:text-purple-400"
                  onClick={() => navigate(`/anime/${anime.animeId}`)}
                >
                  {anime.animeTitle}
                </h3>
                <p className="mb-3 text-sm opacity-60">
                  {anime.episodes.length} episode{anime.episodes.length !== 1 ? 's' : ''} downloaded
                </p>

                {/* Episode List */}
                <div className="space-y-2">
                  {anime.episodes
                    .sort((a, b) => a.episodeNumber - b.episodeNumber)
                    .map((episode) => (
                      <div
                        key={episode.id}
                        className="flex items-center justify-between rounded bg-black/20 p-3 transition-colors hover:bg-black/40"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              Ep. {episode.episodeNumber}
                            </span>
                            {episode.episodeTitle && (
                              <span className="text-sm opacity-60">
                                {episode.episodeTitle}
                              </span>
                            )}
                            {episode.isCompressed && (
                              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                Compressed
                              </span>
                            )}
                          </div>
                          
                          {/* Watch Progress Bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded bg-gray-700">
                              <div
                                className={`h-full transition-all ${getProgressColor(episode.watchProgress)}`}
                                style={{ width: `${episode.watchProgress}%` }}
                              />
                            </div>
                            <span className="text-xs opacity-40">
                              {Math.round(episode.watchProgress)}%
                            </span>
                          </div>
                          
                          {/* File Info */}
                          <div className="mt-1 flex items-center gap-4 text-xs opacity-40">
                            <span>{formatBytes(episode.fileSize)}</span>
                            {episode.isCompleted && (
                              <span className="text-green-400">✓ Watched</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Tooltip content="Play episode">
                            <Button
                              size="1"
                              color="blue"
                              variant="soft"
                              onClick={() => handlePlayEpisode(episode)}
                            >
                              <PlayIcon />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Remove from library">
                            <Button
                              size="1"
                              color="red"
                              variant="soft"
                              onClick={() => handleRemoveEpisode(episode.id)}
                            >
                              <TrashIcon />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OfflineLibrary
