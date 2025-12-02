import { useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import VidstackPlayer from '../../../components/VidstackPlayer'

export default function AnimePahePlayer() {
  const { videoSrc } = useParams()
  const location = useLocation()
  const playerRef = useRef(null)

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
          showAnime4KControls={true}
          anime4kEnabled={false}
          anime4kPreset="mode-b"
          className="rounded-lg overflow-hidden"
        />
        
        <p className="mt-4 text-sm text-gray-400">{title}</p>
      </div>
    </div>
  )
}

