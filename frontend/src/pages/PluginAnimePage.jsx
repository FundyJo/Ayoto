import { useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CenteredLoader from '../ui/CenteredLoader'
import { Skeleton } from '@radix-ui/themes'
import { toast } from 'sonner'
import { ExclamationTriangleIcon, GlobeIcon } from '@radix-ui/react-icons'
import { autop } from '@wordpress/autop'
import parse from 'html-react-parser'
import { useZenshinContext } from '../utils/ContextProvider'
import { zpePluginManager } from '../zpe'

/**
 * Helper function to create anime data object from search result data
 * @param {string} animeId - The anime ID
 * @param {Object} searchData - The search result data
 * @returns {Object} Formatted anime data object
 */
function createAnimeDataFromSearchResult(animeId, searchData) {
  return {
    id: animeId,
    title: searchData.title || searchData.name,
    description: searchData.description,
    cover: searchData.cover,
    background_cover: searchData.background_cover,
    year: searchData.year || searchData.productionYear
  }
}

export default function PluginAnimePage() {
  const zenshinContext = useZenshinContext()
  const { glow } = zenshinContext

  const { pluginId, animeId } = useParams()
  const location = useLocation()
  const searchResultData = location.state // Data passed from search results

  const [isLoading, setIsLoading] = useState(true)
  const [animeData, setAnimeData] = useState(null)
  const [error, setError] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)

  useEffect(() => {
    async function fetchAnimeDetails() {
      setIsLoading(true)
      setError(null)

      try {
        const plugin = await zpePluginManager.getPlugin(pluginId)
        if (!plugin) {
          throw new Error(`Plugin '${pluginId}' not found or not enabled`)
        }

        // Try to get anime details if the plugin supports it
        if (plugin.hasCapability('getAnimeDetails')) {
          const details = await plugin.getAnimeDetails(animeId)
          setAnimeData(details)
        } else if (searchResultData) {
          // Use the data passed from search results
          setAnimeData(createAnimeDataFromSearchResult(animeId, searchResultData))
        } else {
          // Minimal data when no details available
          setAnimeData({
            id: animeId,
            title: animeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          })
        }

        // Try to fetch episodes if supported
        if (plugin.hasCapability('getEpisodes')) {
          setIsLoadingEpisodes(true)
          try {
            const episodesResult = await plugin.getEpisodes(animeId)
            setEpisodes(episodesResult?.results || [])
          } catch (epError) {
            console.error('Failed to fetch episodes:', epError)
          }
          setIsLoadingEpisodes(false)
        }
      } catch (err) {
        console.error('Failed to fetch anime details:', err)
        setError(err.message)
        
        // Fallback to search result data if available
        if (searchResultData) {
          setAnimeData(createAnimeDataFromSearchResult(animeId, searchResultData))
        }
      }

      setIsLoading(false)
    }

    fetchAnimeDetails()
  }, [pluginId, animeId, searchResultData])

  if (isLoading) return <CenteredLoader />

  if (error && !animeData) {
    toast.error('Error fetching anime', {
      icon: <ExclamationTriangleIcon height="16" width="16" color="#ffffff" />,
      description: error,
      classNames: {
        title: 'text-rose-500'
      }
    })
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Failed to load anime details: {error}</p>
      </div>
    )
  }

  const data = animeData
  const backgroundCover = data?.background_cover || data?.banner

  return (
    <div className="relative">
      {/* Background Cover / Backdrop */}
      {backgroundCover && (
        <div className="relative">
          {glow && (
            <div className="animate-fade-down">
              <img
                src={backgroundCover}
                className="absolute top-7 z-0 h-72 w-full object-cover opacity-70 blur-3xl brightness-75 saturate-150 2xl:h-96"
                alt=""
              />
            </div>
          )}
          <div
            className="backdrop absolute inset-0 z-0 h-72 w-full animate-fade-down bg-cover bg-center brightness-90 transition-all ease-in-out 2xl:h-96"
            style={{ backgroundImage: `url(${backgroundCover})` }}
          />
          <img
            src={backgroundCover}
            className="z-10 h-72 w-full animate-fade-down object-cover brightness-90 transition-all ease-in-out 2xl:h-96"
            alt=""
          />
        </div>
      )}

      <div className="z-30 mx-auto animate-fade px-6 py-4 lg:container">
        <div className="flex justify-between gap-x-7">
          {/* Cover Image */}
          {data?.cover ? (
            <img
              src={data.cover}
              alt=""
              className={`duration-400 relative ${backgroundCover ? 'bottom-[4rem]' : ''} h-[25rem] w-72 animate-fade-up rounded-md object-cover shadow-xl drop-shadow-2xl transition-all ease-in-out`}
            />
          ) : (
            <div
              className={`duration-400 relative ${backgroundCover ? 'bottom-[4rem]' : ''} flex h-[25rem] w-72 animate-fade-up items-center justify-center rounded-md bg-[#2a2a2d] shadow-xl drop-shadow-2xl transition-all ease-in-out`}
            >
              <GlobeIcon className="h-16 w-16 text-gray-400" />
            </div>
          )}

          <div className="flex-1 justify-start gap-y-0">
            <p className="font-space-mono text-xl font-medium tracking-wider">{data?.title}</p>
            {data?.altTitles && data.altTitles.length > 0 && (
              <p className="text mb-2 border-b border-[#545454] pb-2 font-space-mono font-medium tracking-wider opacity-80">
                {data.altTitles.join(' • ')}
              </p>
            )}

            <div className="mb-2 flex w-fit items-center gap-x-2 border-b border-[#545454] pb-2 text-xs text-gray-300">
              {data?.mediaType && (
                <>
                  <p className="">{data.mediaType}</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.episodeCount && (
                <>
                  <p>{`${data.episodeCount} episodes`}</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.status && (
                <>
                  <p>({data.status})</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.year && (
                <>
                  <p className="text-xs opacity-60">{data.year}</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.rating && (
                <div className="flex gap-x-1 tracking-wide opacity-90">★ {data.rating}</div>
              )}
            </div>

            {data?.genres && data.genres.length > 0 && (
              <div className="mb-2 flex w-fit gap-x-1 border-b border-[#545454] pb-2 font-space-mono text-xs tracking-wide opacity-90">
                {data.genres.join(', ')}
              </div>
            )}

            {data?.description && (
              <div className="relative flex max-h-[9.55rem] flex-col gap-y-2 overflow-hidden pb-6 font-space-mono text-sm opacity-55 transition-all">
                {parse(autop(data.description))}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111113] to-transparent" />
              </div>
            )}

            <div className="mt-6 flex items-center gap-x-5">
              <span className="rounded bg-blue-900/50 px-2 py-1 text-sm text-blue-300">
                {pluginId}
              </span>
            </div>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="mb-96 mt-12">
          <div className="flex items-center gap-x-3">
            <p className="font-space-mono text-lg font-medium opacity-90">Episodes</p>
          </div>

          {isLoadingEpisodes && <Skeleton className="mt-3 h-12" />}

          {!isLoadingEpisodes && episodes.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-y-3">
              {episodes.map((episode, ix) => (
                <div
                  key={episode.id || ix}
                  className="flex cursor-pointer items-center gap-x-4 rounded-md bg-[#1a1a1d] p-3 transition-all hover:bg-[#232326]"
                >
                  {episode.thumbnail && (
                    <img
                      src={episode.thumbnail}
                      alt=""
                      className="h-16 w-28 rounded object-cover"
                    />
                  )}
                  <div className="flex flex-col">
                    <p className="font-space-mono text-sm font-medium">
                      Episode {episode.number || ix + 1}
                      {episode.title && ` - ${episode.title}`}
                    </p>
                    {episode.description && (
                      <p className="line-clamp-2 text-xs opacity-50">{episode.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoadingEpisodes && episodes.length === 0 && (
            <p className="mt-3 text-sm opacity-50">
              No episodes available. This plugin may not support episode listing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
