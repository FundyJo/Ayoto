import { useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import VidstackPlayer from '../../../components/VidstackPlayer'

export default function AnimePahePlayer() {
  const { videoSrc } = useParams()
  const location = useLocation()
  const playerRef = useRef(null)
  const [showAnime4K, setShowAnime4K] = useState(true)

  // Get additional info from navigation state if available
  const { title = 'Playing Video', poster = '' } = location.state || {}

  // Decode the video source URL
  const decodedSrc = decodeURIComponent(videoSrc)

  return (
    <div className="mt-10 flex h-full w-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-5xl">
        <VidstackPlayer
          ref={playerRef}
          src={decodedSrc}
          format="m3u8"
          title={title}
          poster={poster}
          autoPlay={true}
          showAnime4KControls={showAnime4K}
          anime4kEnabled={false}
          anime4kPreset="mode-b"
          className="rounded-lg overflow-hidden"
        />
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
          <span>{title}</span>
          <button
            onClick={() => setShowAnime4K(!showAnime4K)}
            className="px-3 py-1 rounded bg-[#2a2a2d] hover:bg-[#3a3a3d] transition-colors"
          >
            {showAnime4K ? 'Hide' : 'Show'} Anime4K Settings
          </button>
        </div>
      </div>
    </div>
  )
}

