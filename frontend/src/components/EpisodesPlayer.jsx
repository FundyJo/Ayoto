import { Button } from '@radix-ui/themes'
import { useState, useRef, useEffect } from 'react'
import { DownloadIcon } from '@radix-ui/react-icons'
import { addToDownloading, addOfflineEpisode, removeFromDownloading } from '../utils/offlineStorage'
import { toast } from 'sonner'
import { useZenshinContext } from '../utils/ContextProvider'

export default function EpisodesPlayer({
  file,
  handleStreamBrowser,
  handleStreamVlc,
  stopEpisodeDownload,
  setCurrentEpisode,
  animeId,
  animeTitle,
  animeCoverImage,
  bannerImage,
  episodeNumber,
  magnetUri
}) {
  const [isActive, setIsActive] = useState(false)
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false)
  const { backendPort } = useZenshinContext()
  const pollIntervalRef = useRef(null)
  const timeoutRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleDownloadForOffline = async (e) => {
    e.stopPropagation()
    
    // Add to downloading list
    const downloadInfo = {
      animeId: animeId || 'unknown',
      animeTitle: animeTitle || 'Unknown Anime',
      episodeNumber: episodeNumber || 1,
      fileName: file.name
    }
    
    addToDownloading(downloadInfo)
    setIsDownloadingOffline(true)
    
    toast.success('Download started', {
      description: `Downloading ${file.name} for offline viewing`
    })
    
    // Start the download by selecting the file
    setCurrentEpisode(file.name)
    
    // Clear any existing intervals
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Poll for completion
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:${backendPort}/detailsepisode/${encodeURIComponent(magnetUri)}/${encodeURIComponent(file.name)}`
        )
        if (response.ok) {
          const details = await response.json()
          
          // When download is complete (progress >= 1)
          if (details.progress >= 1) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            
            // Add to offline library
            addOfflineEpisode({
              animeId: animeId || 'unknown',
              animeTitle: animeTitle || 'Unknown Anime',
              animeCoverImage: animeCoverImage || '',
              bannerImage: bannerImage || '',
              episodeNumber: episodeNumber || 1,
              episodeTitle: file.name,
              fileName: file.name,
              filePath: file.name, // Will be updated with actual path
              fileSize: details.length || file.length,
              magnetUri: magnetUri || '',
              isCompressed: false
            })
            
            removeFromDownloading(animeId, episodeNumber)
            setIsDownloadingOffline(false)
            
            toast.success('Download complete!', {
              description: `${file.name} is now available offline`
            })
          }
        }
      } catch {
        // Ignore errors during polling
      }
    }, 3000)
    
    // Cleanup after 2 hours max
    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setIsDownloadingOffline(false)
    }, 2 * 60 * 60 * 1000)
  }

  return (
    <div
      onClick={() => setIsActive(!isActive)}
      className="relative m-2 animate-fade-down cursor-default border border-gray-700 p-2 font-space-mono transition-all duration-100 ease-in-out animate-duration-500 hover:bg-[#1e1e20]"
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-x-1 font-space-mono font-medium opacity-90">
          <div>
            <p className="flex gap-x-2 font-space-mono text-sm font-medium text-gray-400 opacity-90">
              <span className="flex items-center gap-2"></span>
              {file.name}
            </p>
            {isActive && (
              <div className="ml-2 mt-2 flex flex-wrap animate-fade-down gap-3 animate-duration-500">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentEpisode(file.name)
                    handleStreamBrowser(file.name)
                  }}
                  size="1"
                  color="violet"
                  variant="soft"
                  type="submit"
                >
                  Stream on App
                </Button>
                <Button
                  size="1"
                  color="mint"
                  variant="soft"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentEpisode(file.name)
                    handleStreamVlc(file.name)
                  }}
                >
                  Open in External Player
                </Button>
                <Button
                  size="1"
                  color="blue"
                  variant="soft"
                  disabled={isDownloadingOffline}
                  onClick={handleDownloadForOffline}
                >
                  <DownloadIcon />
                  {isDownloadingOffline ? 'Downloading...' : 'Download for Offline'}
                </Button>
                <Button
                  size="1"
                  color="red"
                  variant="soft"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentEpisode('')
                    stopEpisodeDownload(file.name)
                  }}
                >
                  Stop downloading the episode
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
