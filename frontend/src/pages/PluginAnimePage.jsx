import { useParams, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import CenteredLoader from '../ui/CenteredLoader'
import { Button, Skeleton, TextField, Spinner, Tooltip, DropdownMenu } from '@radix-ui/themes'
import { toast } from 'sonner'
import { ExclamationTriangleIcon, GlobeIcon, StarIcon, PersonIcon, LockClosedIcon, InfoCircledIcon, MagnifyingGlassIcon, EyeClosedIcon, EyeOpenIcon, PlayIcon } from '@radix-ui/react-icons'
import { autop } from '@wordpress/autop'
import parse from 'html-react-parser'
import { useZenshinContext } from '../utils/ContextProvider'
import { zpePluginManager } from '../zpe'
import PluginAuthModal from '../components/PluginAuthModal'
import Pagination from '../components/Pagination'

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
    popularity: searchData.popularity,
    episodeCount: searchData.episodeCount
  }
}

/**
 * Merge anime data, preferring non-null values from the newer data
 * @param {Object} existingData - Current anime data
 * @param {Object} newData - New data to merge
 * @returns {Object} Merged anime data
 */
function mergeAnimeData(existingData, newData) {
  if (!existingData) return newData
  if (!newData) return existingData
  
  const merged = { ...existingData }
  for (const [key, newVal] of Object.entries(newData)) {
    const existingVal = existingData[key]
    
    // Only update if new value is not null/undefined
    if (newVal !== null && newVal !== undefined) {
      if (existingVal === null || existingVal === undefined) {
        // Fill in missing data
        merged[key] = newVal
      } else if (Array.isArray(newVal) && Array.isArray(existingVal)) {
        // Prefer longer arrays
        if (newVal.length > existingVal.length) {
          merged[key] = newVal
        }
      } else if (typeof newVal === 'string' && typeof existingVal === 'string') {
        // Prefer longer strings (more detailed descriptions)
        if (newVal.length > existingVal.length) {
          merged[key] = newVal
        }
      }
    }
  }
  return merged
}

/**
 * Normalize a hoster/language item to get its display name
 * Items can be strings or objects with a name property
 * @param {string|{name: string}} item - The item to normalize
 * @returns {string} The display name
 */
function getDisplayName(item) {
  if (typeof item === 'string') return item
  return item?.name || 'Unknown'
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

  // If we have search result data, use it immediately - no loading state needed
  const hasInitialData = searchResultData && (searchResultData.title || searchResultData.cover)
  const [isLoading, setIsLoading] = useState(!hasInitialData)
  const [animeData, setAnimeData] = useState(
    hasInitialData ? createAnimeDataFromSearchResult(animeId, searchResultData) : null
  )
  const [error, setError] = useState(null)
  // Use pre-fetched episodes from search results if available
  const initialEpisodes = Array.isArray(searchResultData?.episodes) ? searchResultData.episodes : []
  const [episodes, setEpisodes] = useState(initialEpisodes)
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [pluginInfo, setPluginInfo] = useState(null)
  const [pluginCapabilities, setPluginCapabilities] = useState({})
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)
  const [showAllTitles, setShowAllTitles] = useState(false)
  
  // Episode filtering and pagination state
  const [hideWatchedEpisodes, setHideWatchedEpisodes] = useState(false)
  const [watchedEpisodes, setWatchedEpisodes] = useState(() => {
    // Load watched episodes from localStorage for this anime
    try {
      const stored = localStorage.getItem(`plugin_watched_${pluginId}_${animeId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [pageSize, setPageSize] = useState(100)
  const [pageNo, setPageNo] = useState(0)
  
  // Manual search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // Stream loading state
  const [loadingStreamsForEpisode, setLoadingStreamsForEpisode] = useState(null)
  const [expandedEpisode, setExpandedEpisode] = useState(null)
  const [episodeStreams, setEpisodeStreams] = useState({})
  
  // Season selection state
  const [selectedSeason, setSelectedSeason] = useState(null)

  useEffect(() => {
    // Capture searchResultData in a local variable to avoid stale closure issues
    const currentSearchData = searchResultData
    const hasPreFetchedEpisodes = Array.isArray(currentSearchData?.episodes) && currentSearchData.episodes.length > 0
    
    async function fetchAnimeDetails() {
      // Only show loading spinner if we don't have any initial data
      const hasCurrentInitialData = currentSearchData && (currentSearchData.title || currentSearchData.cover)
      if (!hasCurrentInitialData) {
        setIsLoading(true)
      }
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

        // Start fetching details and episodes in parallel for faster loading
        let detailsPromise
        if (plugin.hasCapability('getAnimeDetails')) {
          setIsFetchingDetails(true)
          detailsPromise = plugin.getAnimeDetails(animeId).finally(() => setIsFetchingDetails(false))
        } else {
          detailsPromise = Promise.resolve(null)
        }
        
        // Only fetch episodes if we don't have them from search results
        let episodesPromise
        if (plugin.hasCapability('getEpisodes') && !hasPreFetchedEpisodes) {
          setIsLoadingEpisodes(true)
          episodesPromise = plugin.getEpisodes(animeId).finally(() => setIsLoadingEpisodes(false))
        } else {
          episodesPromise = Promise.resolve(null)
        }

        // Wait for both to complete in parallel
        const [details, episodesResult] = await Promise.all([detailsPromise, episodesPromise])

        // Update anime data - always update if we got details
        if (details) {
          // Merge with existing data, preferring newer details
          setAnimeData(prev => mergeAnimeData(prev, details))
        }
        
        // Set initial anime data if not already set and we have search data
        setAnimeData(prev => {
          if (prev) return prev // Already have data
          if (currentSearchData) {
            return createAnimeDataFromSearchResult(animeId, currentSearchData)
          }
          // Minimal data when nothing available
          return {
            id: animeId,
            title: animeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          }
        })

        // Update episodes if we fetched them
        if (episodesResult?.results?.length > 0) {
          setEpisodes(episodesResult.results)
          // Update episode count
          setAnimeData(prev => ({
            ...prev,
            episodeCount: prev?.episodeCount || episodesResult.results.length || undefined
          }))
        }
      } catch (err) {
        console.error('Failed to fetch anime details:', err)
        setError(err.message)
        
        // Fallback to search result data if available
        setAnimeData(prev => {
          if (prev) return prev // Already have data, keep it
          if (currentSearchData) {
            return createAnimeDataFromSearchResult(animeId, currentSearchData)
          }
          return null
        })
      }

      setIsLoading(false)
    }

    fetchAnimeDetails()
  }, [pluginId, animeId, searchResultData, refetchKey]) // Include searchResultData for proper re-fetching on navigation

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Perform search when debounced query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }
      
      setIsSearching(true)
      try {
        const plugin = await zpePluginManager.getPlugin(pluginId)
        if (plugin && typeof plugin.search === 'function') {
          const result = await plugin.search(debouncedQuery)
          if (result && result.results) {
            setSearchResults(result.results)
            setShowSearchResults(true)
          }
        }
      } catch (err) {
        console.error('Plugin search error:', err)
        setSearchResults([])
      }
      setIsSearching(false)
    }
    
    performSearch()
  }, [debouncedQuery, pluginId])

  // Save watched episodes to localStorage whenever they change
  useEffect(() => {
    if (watchedEpisodes.length > 0) {
      localStorage.setItem(`plugin_watched_${pluginId}_${animeId}`, JSON.stringify(watchedEpisodes))
    }
  }, [watchedEpisodes, pluginId, animeId])

  // Mark episode as watched
  const markEpisodeWatched = useCallback((episodeId) => {
    setWatchedEpisodes(prev => {
      if (prev.includes(episodeId)) return prev
      return [...prev, episodeId]
    })
  }, [])

  // Check if episode is watched
  const isEpisodeWatched = useCallback((episodeId) => {
    return watchedEpisodes.includes(episodeId)
  }, [watchedEpisodes])

  // Get unique seasons from episodes
  const availableSeasons = [...new Set(episodes.map(ep => ep.season).filter(s => s !== undefined && s !== null))].sort((a, b) => a - b)

  // Filter episodes based on hideWatchedEpisodes and selectedSeason
  const filteredEpisodes = episodes.filter(episode => {
    if (hideWatchedEpisodes && isEpisodeWatched(episode.id)) return false
    if (selectedSeason !== null && episode.season !== selectedSeason) return false
    return true
  })

  // Paginate filtered episodes
  const paginatedEpisodes = filteredEpisodes.slice(pageNo * pageSize, pageNo * pageSize + pageSize)

  // Fetch streams for an episode
  const handleEpisodeClick = async (episode) => {
    if (expandedEpisode === episode.id) {
      // Collapse if clicking the same episode
      setExpandedEpisode(null)
      return
    }
    
    setExpandedEpisode(episode.id)
    
    // Check if we already have streams for this episode
    if (episodeStreams[episode.id]) {
      return
    }
    
    // Check if plugin supports getStreams
    if (!pluginCapabilities.getStreams) {
      return
    }
    
    setLoadingStreamsForEpisode(episode.id)
    try {
      const plugin = await zpePluginManager.getPlugin(pluginId)
      if (plugin && typeof plugin.getStreams === 'function') {
        const streams = await plugin.getStreams(animeId, episode.id)
        setEpisodeStreams(prev => ({
          ...prev,
          [episode.id]: streams || []
        }))
        // Mark episode as watched when streams are fetched
        markEpisodeWatched(episode.id)
      }
    } catch (err) {
      console.error('Failed to fetch streams:', err)
      toast.error('Failed to load streams', {
        description: err.message
      })
      setEpisodeStreams(prev => ({
        ...prev,
        [episode.id]: []
      }))
    }
    setLoadingStreamsForEpisode(null)
  }

  // Handle search result selection
  const handleSearchResultClick = (result) => {
    // Navigate to the selected anime
    const newAnimeId = result.id || result.link
    if (newAnimeId && newAnimeId !== animeId) {
      // Clear current state and navigate
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      // Use navigate from react-router-dom
      window.location.hash = `#/plugin-anime/${pluginId}/${encodeURIComponent(newAnimeId)}`
    }
  }

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
            <div className="flex items-center gap-x-2">
              <p className="font-space-mono text-xl font-medium tracking-wider">{data?.title}</p>
              {isFetchingDetails && (
                <span className="animate-pulse text-xs text-blue-400">Updating...</span>
              )}
            </div>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="font-space-mono text-lg font-medium opacity-90">Episodes</p>
            {isLoadingEpisodes && (
              <span className="text-xs text-blue-400 opacity-70">Loading...</span>
            )}
            
            {/* Hide Watched Episodes Toggle */}
            <Button
              variant="soft"
              size="1"
              onClick={() => setHideWatchedEpisodes(!hideWatchedEpisodes)}
              color={hideWatchedEpisodes ? 'blue' : 'gray'}
            >
              {hideWatchedEpisodes ? <EyeClosedIcon /> : <EyeOpenIcon />}
              Hide Watched
            </Button>
            
            {/* Season Selector */}
            {availableSeasons.length > 1 && (
              <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger>
                  <Button variant="soft" color="gray" size="1">
                    <div className="flex items-center gap-x-2">
                      Season: {selectedSeason === null ? 'All' : selectedSeason}
                    </div>
                    <DropdownMenu.TriggerIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item
                    color={selectedSeason === null ? 'indigo' : 'gray'}
                    onClick={() => { setSelectedSeason(null); setPageNo(0); }}
                  >
                    All Seasons
                  </DropdownMenu.Item>
                  {availableSeasons.map((season) => (
                    <DropdownMenu.Item
                      key={season}
                      color={selectedSeason === season ? 'indigo' : 'gray'}
                      onClick={() => { setSelectedSeason(season); setPageNo(0); }}
                    >
                      Season {season}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
            
            {/* Pagination */}
            {filteredEpisodes.length > pageSize && (
              <Pagination
                arraySize={filteredEpisodes.length}
                pageSize={pageSize}
                setPageSize={setPageSize}
                pageNo={pageNo}
                setPageNo={setPageNo}
                position="relative"
                progress={watchedEpisodes.length}
              />
            )}
            
            {/* Manual Search */}
            <div className="relative ml-auto">
              <TextField.Root
                placeholder="Manually search for anime..."
                className="nodrag w-64"
                style={{
                  backgroundColor: '#212225',
                  height: '25px',
                  boxShadow: 'none',
                  borderRadius: '3px',
                  border: '0px',
                  fontSize: '13px'
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                value={searchQuery}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              >
                <TextField.Slot style={{ paddingLeft: '12px' }}>
                  {isSearching ? (
                    <Spinner size="1" />
                  ) : (
                    <MagnifyingGlassIcon height="16" width="16" color="#9ca3af" />
                  )}
                </TextField.Slot>
              </TextField.Root>
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full right-0 z-50 mt-2 max-h-80 w-80 overflow-y-auto rounded-md border border-[#545454] bg-[#111113] shadow-xl">
                  {searchResults.slice(0, 10).map((result, idx) => (
                    <div
                      key={result.id || idx}
                      className="flex cursor-pointer items-center gap-x-3 border-b border-[#3a3b3f] px-3 py-2 transition-colors last:border-b-0 hover:bg-[#1e1e20]"
                      onMouseDown={() => handleSearchResultClick(result)}
                    >
                      {result.cover ? (
                        <img
                          src={result.cover}
                          alt=""
                          className="h-12 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-10 items-center justify-center rounded bg-[#2a2a2d]">
                          <GlobeIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{result.title}</p>
                        {result.year && (
                          <p className="text-xs opacity-50">{result.year}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Episode count summary */}
          {episodes.length > 0 && (
            <div className="mt-2 text-xs opacity-50">
              Showing {paginatedEpisodes.length} of {filteredEpisodes.length} episodes
              {hideWatchedEpisodes && watchedEpisodes.length > 0 && (
                <span> ({watchedEpisodes.length} watched hidden)</span>
              )}
            </div>
          )}

          {isLoadingEpisodes && episodes.length === 0 && <Skeleton className="mt-3 h-12" />}

          {paginatedEpisodes.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-y-3">
              {paginatedEpisodes.map((episode, ix) => {
                const isWatched = isEpisodeWatched(episode.id)
                const isExpanded = expandedEpisode === episode.id
                const streams = episodeStreams[episode.id]
                const isLoadingThisEpisode = loadingStreamsForEpisode === episode.id
                
                return (
                  <div
                    key={episode.id || ix}
                    className={`flex flex-col rounded-md bg-[#1a1a1d] transition-all ${isExpanded ? 'ring-1 ring-purple-500/50' : ''}`}
                  >
                    {/* Episode Header Row */}
                    <div
                      onClick={() => handleEpisodeClick(episode)}
                      className={`flex cursor-pointer items-center gap-x-4 p-3 transition-all hover:bg-[#232326] ${isWatched ? 'opacity-60' : ''}`}
                    >
                      {/* Watched indicator */}
                      {isWatched && (
                        <Tooltip content="Watched">
                          <div className="h-2 w-2 min-w-2 rounded-full bg-green-500" />
                        </Tooltip>
                      )}
                      
                      {episode.thumbnail && (
                        <img
                          src={episode.thumbnail}
                          alt=""
                          className="h-16 w-28 rounded object-cover"
                        />
                      )}
                      <div className="flex flex-1 flex-col">
                        <p className="font-space-mono text-sm font-medium">
                          {episode.fullTitle || (
                            <>
                              {episode.season !== undefined && episode.season !== null && `S${episode.season}`}
                              E{episode.number || ix + 1}
                              {episode.title && ` - ${episode.title}`}
                            </>
                          )}
                        </p>
                        {episode.description && (
                          <p className="line-clamp-2 text-xs opacity-50">{episode.description}</p>
                        )}
                        
                        {/* Hosters and Languages Row */}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {/* Display available hosters/streaming providers */}
                          {episode.hosters && episode.hosters.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {episode.hosters.map((hoster, hosterIdx) => (
                                <span
                                  key={hosterIdx}
                                  className="rounded bg-[#2a2a2d] px-1.5 py-0.5 text-xs text-gray-400"
                                  title={getDisplayName(hoster)}
                                >
                                  {getDisplayName(hoster)}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Also show providers from episode.providers if available (aniworld format) */}
                          {episode.providers && episode.providers.length > 0 && !episode.hosters && (
                            <div className="flex flex-wrap gap-1">
                              {episode.providers.map((provider, provIdx) => (
                                <span
                                  key={provIdx}
                                  className="rounded bg-[#2a2a2d] px-1.5 py-0.5 text-xs text-gray-400"
                                >
                                  {provider}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Display language info */}
                          {episode.languages && episode.languages.length > 0 && (
                            <div className="flex gap-1">
                              {episode.languages.map((lang, langIdx) => (
                                <span
                                  key={langIdx}
                                  className="rounded bg-blue-900/30 px-1.5 py-0.5 text-xs text-blue-300"
                                  title={lang.label || getDisplayName(lang)}
                                >
                                  {lang.code || getDisplayName(lang)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Play/Expand indicator */}
                      <div className="flex items-center gap-2">
                        {isLoadingThisEpisode ? (
                          <Spinner size="2" />
                        ) : pluginCapabilities.getStreams ? (
                          <PlayIcon className={`h-5 w-5 transition-transform ${isExpanded ? 'text-purple-400' : 'opacity-50'}`} />
                        ) : null}
                      </div>
                    </div>
                    
                    {/* Expanded Streams Section */}
                    {isExpanded && (
                      <div className="border-t border-[#2a2a2d] p-3">
                        {isLoadingThisEpisode && (
                          <div className="flex items-center gap-2 text-sm opacity-50">
                            <Spinner size="1" /> Loading streams...
                          </div>
                        )}
                        
                        {!isLoadingThisEpisode && streams && streams.length > 0 && (
                          <div className="grid gap-2">
                            <p className="text-xs font-medium opacity-70">Available Streams:</p>
                            {streams.map((stream, streamIdx) => (
                              <a
                                key={streamIdx}
                                href={stream.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between rounded bg-[#232326] px-3 py-2 transition-colors hover:bg-[#2a2a2d]"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{stream.server || 'Unknown'}</span>
                                  {stream.quality && (
                                    <span className="rounded bg-purple-900/30 px-1.5 py-0.5 text-xs text-purple-300">
                                      {stream.quality}
                                    </span>
                                  )}
                                  {stream.format && (
                                    <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs opacity-60">
                                      {stream.format}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs opacity-50">Open →</span>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {!isLoadingThisEpisode && streams && streams.length === 0 && (
                          <p className="text-sm opacity-50">No streams found for this episode.</p>
                        )}
                        
                        {!isLoadingThisEpisode && !streams && !pluginCapabilities.getStreams && (
                          <p className="text-sm opacity-50">This plugin does not support stream fetching.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!isLoadingEpisodes && episodes.length === 0 && (
            <p className="mt-3 text-sm opacity-50">
              No episodes available. This plugin may not support episode listing.
            </p>
          )}
          
          {!isLoadingEpisodes && episodes.length > 0 && filteredEpisodes.length === 0 && (
            <p className="mt-3 text-sm opacity-50">
              All episodes are hidden. Click &quot;Hide Watched&quot; to show them.
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
