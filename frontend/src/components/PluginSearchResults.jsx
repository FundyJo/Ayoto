import { GlobeIcon } from '@radix-ui/react-icons'
import { useNavigate } from 'react-router-dom'
import { useZenshinContext } from '../utils/ContextProvider'
import { maybeProxyUrl } from '../utils/imageProxy'

/**
 * Component to display search results from plugin providers
 * @param {Object} props - Component props
 * @param {Object} props.data - Search result data from plugin
 * @param {string} props.providerName - Name of the plugin provider
 * @param {string} props.providerId - ID of the plugin provider
 * @param {Function} props.setIsActive - Function to toggle search bar active state
 */
export default function PluginSearchResults({ data, providerName, providerId, setIsActive }) {
  const navigate = useNavigate()
  const { backendPort } = useZenshinContext()

  // Handle click - navigate to plugin anime page
  function handleClick() {
    // Get the anime ID from the data - use id first, then link, or fallback to a slug of the title
    // Note: data.id should be the actual identifier for API calls, while data.link may be a full path
    const titleSlug = (data.title || data.name || 'unknown')?.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const animeId = data.id || data.link || titleSlug
    
    // Navigate to the plugin anime page with all available search result data
    // This allows the page to render faster by using cached data
    navigate(`/plugin-anime/${providerId}/${encodeURIComponent(animeId)}`, {
      state: {
        // Basic info
        title: data.title || data.name,
        description: data.description,
        cover: data.cover,
        background_cover: data.background_cover,
        year: data.year || data.productionYear,
        // Extended info that plugins may provide
        altTitles: data.altTitles,
        genres: data.genres,
        status: data.status,
        rating: data.rating,
        popularity: data.popularity,
        mediaType: data.mediaType || data.type,
        startYear: data.startYear,
        endYear: data.endYear,
        episodeCount: data.episodeCount,
        // Pre-fetched episodes if available (for faster loading)
        episodes: data.episodes,
        // Pre-fetched hosters/streams info if available
        hosters: data.hosters
      }
    })
    setIsActive(false)
  }

  // Proxy the cover image URL if needed (for CORS-restricted sources like aniworld.to)
  const proxiedCover = maybeProxyUrl(data.cover, backendPort)

  return (
    <div
      onClick={() => handleClick()}
      className="hover:drop-shadow-xl flex animate-fade cursor-pointer gap-x-5 bg-[#111113] px-2 py-1 font-inter transition-all duration-200 ease-in-out hover:z-10 hover:scale-105 hover:rounded-md hover:bg-[#232326]"
    >
      {data.cover ? (
        <img
          className="duration-400 h-12 w-12 animate-fade rounded-lg object-cover transition-all ease-in-out hover:scale-150"
          src={proxiedCover}
          alt="cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2a2a2d]">
          <GlobeIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="flex w-[85%] flex-col">
        <div className="w-full truncate text-sm font-medium opacity-80">{data.title}</div>

        <div>
          {data.description && (
            <p className="line-clamp-1 text-xs opacity-45">{data.description}</p>
          )}
          <div className="flex items-center gap-2">
            {data.year && <p className="text-xs opacity-45">{data.year}</p>}
            <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-300">
              {providerName}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
