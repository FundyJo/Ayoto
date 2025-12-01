import { useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import CenteredLoader from '../ui/CenteredLoader'
import { Button, Skeleton } from '@radix-ui/themes'
import { toast } from 'sonner'
import { ExclamationTriangleIcon, GlobeIcon, StarIcon, PersonIcon, LockClosedIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { autop } from '@wordpress/autop'
import parse from 'html-react-parser'
import { useZenshinContext } from '../utils/ContextProvider'
import { zpePluginManager } from '../zpe'
import PluginAuthModal from '../components/PluginAuthModal'

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
    altTitles: searchData.altTitles || [],
    description: searchData.description,
    cover: searchData.cover,
    background_cover: searchData.background_cover,
    year: searchData.year || searchData.productionYear,
    startYear: searchData.startYear || searchData.year || searchData.productionYear,
    endYear: searchData.endYear,
    status: searchData.status,
    mediaType: searchData.mediaType || searchData.type,
    genres: searchData.genres || [],
    rating: searchData.rating,
    popularity: searchData.popularity
  }
}

/**
 * Format year range for display
 * @param {number|string} startYear - Start year
 * @param {number|string} endYear - End year (optional)
 * @param {string} status - Anime status (optional)
 * @returns {string} Formatted year range
 */
function formatYearRange(startYear, endYear, status) {
  if (!startYear) return ''
  
  let yearText = String(startYear)
  
  if (endYear && endYear !== startYear) {
    yearText += ` - ${endYear}`
  } else if (!endYear && status === 'RELEASING') {
    yearText += ' - Present'
  }
  
  return yearText
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
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [pluginInfo, setPluginInfo] = useState(null)
  const [pluginCapabilities, setPluginCapabilities] = useState({})
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)
  const [showAllTitles, setShowAllTitles] = useState(false)

  useEffect(() => {
    async function fetchAnimeDetails() {
      setIsLoading(true)
      setError(null)

      try {
        const plugin = await zpePluginManager.getPlugin(pluginId)
        if (!plugin) {
          throw new Error(`Plugin '${pluginId}' not found or not enabled`)
        }

        // Store plugin info and capabilities
        const allPlugins = zpePluginManager.getAllPlugins()
        const currentPluginInfo = allPlugins.find(p => p.id === pluginId)
        setPluginInfo(currentPluginInfo)
        setPluginCapabilities(currentPluginInfo?.capabilities || {})

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
            const episodesList = episodesResult?.results || []
            setEpisodes(episodesList)
            
            // Update anime data with calculated episode count if not already set
            setAnimeData(prev => ({
              ...prev,
              episodeCount: prev?.episodeCount || episodesList.length || undefined
            }))
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
  }, [pluginId, animeId, searchResultData, refetchKey])

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
  const bannerImage = data?.background_cover || data?.banner

  return (
    <div className="relative">
      {/* Background Cover / Backdrop - matches AnimePage.jsx exactly */}
      {bannerImage && (
        <div className="relative">
          {glow && (
            <div className="animate-fade-down">
              <img
                src={bannerImage}
                className="absolute top-7 z-0 h-72 w-full object-cover opacity-70 blur-3xl brightness-75 saturate-150 2xl:h-96"
                alt=""
              />
            </div>
          )}
          <img
            src={bannerImage}
            className="z-10 h-72 w-full animate-fade-down object-cover brightness-90 transition-all ease-in-out 2xl:h-96"
            alt=""
          />
        </div>
      )}

      <div className="z-30 mx-auto animate-fade px-6 py-4 lg:container">
        <div className="flex justify-between gap-x-7">
          {/* Cover Image - matches AnimePage.jsx exactly */}
          {data?.cover ? (
            <img
              src={data.cover}
              alt=""
              className={`duration-400 relative ${bannerImage ? 'bottom-[4rem]' : ''} shadow-xl drop-shadow-2xl h-[25rem] w-72 animate-fade-up rounded-md object-cover transition-all ease-in-out`}
            />
          ) : (
            <div
              className={`duration-400 relative ${bannerImage ? 'bottom-[4rem]' : ''} shadow-xl drop-shadow-2xl flex h-[25rem] w-72 animate-fade-up items-center justify-center rounded-md bg-[#2a2a2d] transition-all ease-in-out`}
            >
              <GlobeIcon className="h-16 w-16 text-gray-400" />
            </div>
          )}

          <div className="flex-1 justify-start gap-y-0">
            {/* Title - matches AnimePage.jsx exactly */}
            <p className="font-space-mono text-xl font-medium tracking-wider">{data?.title}</p>
            {data?.altTitles && data.altTitles.length > 0 && (() => {
              const hasMoreTitles = data.altTitles.length > 3
              return (
                <div className="mb-2 border-b border-[#545454] pb-2">
                  <div 
                    className="flex cursor-pointer items-start gap-x-2 font-space-mono font-medium tracking-wider opacity-80"
                    onClick={() => hasMoreTitles && setShowAllTitles(!showAllTitles)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        hasMoreTitles && setShowAllTitles(!showAllTitles)
                      }
                    }}
                    role={hasMoreTitles ? "button" : undefined}
                    tabIndex={hasMoreTitles ? 0 : undefined}
                    aria-expanded={hasMoreTitles ? showAllTitles : undefined}
                  >
                    <p className="text-sm">
                      {showAllTitles 
                        ? data.altTitles.join(' • ')
                        : data.altTitles.slice(0, 3).join(' • ')}
                      {!showAllTitles && hasMoreTitles && (
                        <span className="ml-2 text-xs text-blue-400 hover:text-blue-300">
                          +{data.altTitles.length - 3} more
                        </span>
                      )}
                      {showAllTitles && hasMoreTitles && (
                        <span className="ml-2 text-xs text-blue-400 hover:text-blue-300">
                          show less
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Info section - shows year range, episode count, status */}
            <div className="mb-2 flex w-fit items-center gap-x-2 border-b border-[#545454] pb-2 text-xs text-gray-300">
              {data?.mediaType && (
                <>
                  <p className="">{data.mediaType}</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {(data?.episodeCount || episodes.length > 0) && (
                <>
                  <p>{`${data.episodeCount || episodes.length} episodes`}</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.status && (
                <>
                  <p>({data.status})</p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {/* Year display - shows start year and end year if available */}
              {(data?.startYear || data?.year) && (
                <>
                  <p className="text-xs opacity-60">
                    {formatYearRange(data.startYear || data.year, data.endYear, data.status)}
                  </p>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.rating && (
                <>
                  <div className="flex gap-x-1 tracking-wide opacity-90">
                    <StarIcon /> {data.rating}
                  </div>
                  <div className="h-5 w-[1px] bg-[#333]"></div>
                </>
              )}
              {data?.popularity && (
                <div className="flex gap-x-1 tracking-wide opacity-90">
                  <PersonIcon />
                  {typeof data.popularity === 'number' ? data.popularity.toLocaleString() : data.popularity}
                </div>
              )}
            </div>

            {/* Genres - matches AnimePage.jsx exactly */}
            {data?.genres && data.genres.length > 0 && (
              <div className="mb-2 flex w-fit gap-x-1 border-b border-[#545454] pb-2 font-space-mono text-xs tracking-wide opacity-90">
                {data.genres.join(', ')}
              </div>
            )}

            {/* Description - matches AnimePage.jsx exactly with toggle */}
            {data?.description && (
              <div
                className={`relative flex ${showFullDescription ? '' : 'max-h-[9.55rem]'} flex-col gap-y-2 overflow-hidden pb-6 font-space-mono text-sm opacity-55 transition-all cursor-pointer`}
                onClick={() => setShowFullDescription(!showFullDescription)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowFullDescription(!showFullDescription)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={showFullDescription}
              >
                {parse(autop(data.description))}
                {!showFullDescription && (
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#111113] to-transparent" />
                )}
              </div>
            )}

            {/* Plugin Info Section - shows plugin name and capabilities */}
            <div className="mt-6 flex flex-col gap-y-3">
              {/* Plugin badge with name */}
              <div className="flex items-center gap-x-3">
                <span className="rounded bg-blue-900/50 px-2 py-1 text-sm text-blue-300">
                  {pluginInfo?.name || pluginId}
                </span>
                {pluginInfo?.version && (
                  <span className="text-xs opacity-50">v{pluginInfo.version}</span>
                )}
              </div>

              {/* Plugin capabilities info */}
              <div className="flex flex-wrap items-center gap-2">
                <InfoCircledIcon className="h-4 w-4 opacity-50" />
                <span className="text-xs opacity-50">Plugin provides:</span>
                {pluginCapabilities.search && (
                  <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">Search</span>
                )}
                {pluginCapabilities.getEpisodes && (
                  <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">Episodes</span>
                )}
                {pluginCapabilities.getStreams && (
                  <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">Streaming</span>
                )}
                {pluginCapabilities.getAnimeDetails && (
                  <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">Details</span>
                )}
                {pluginCapabilities.authentication && (
                  <span className="rounded bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400">Auth</span>
                )}
                {pluginCapabilities.watchlist && (
                  <span className="rounded bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-400">Watchlist</span>
                )}
              </div>

              {/* Authentication button for plugins that support login */}
              {pluginCapabilities.authentication && (
                <div className="mt-2">
                  <Button
                    variant="soft"
                    color="purple"
                    size="1"
                    onClick={() => setShowAuthModal(true)}
                  >
                    <LockClosedIcon />
                    Login to {pluginInfo?.name || pluginId}
                  </Button>
                </div>
              )}
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

      {/* Authentication Modal */}
      <PluginAuthModal
        pluginId={pluginId}
        pluginInfo={pluginInfo}
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={() => {
          // Trigger re-fetch of anime details after successful authentication
          // This may show new data like watchlist status
          setRefetchKey(prev => prev + 1)
        }}
      />
    </div>
  )
}
