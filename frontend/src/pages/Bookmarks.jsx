import { TrashIcon, PlayIcon, ReloadIcon } from '@radix-ui/react-icons'
import { Button, DropdownMenu, Spinner } from '@radix-ui/themes'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useZenshinContext } from '../utils/ContextProvider'
import { useQuery } from '@tanstack/react-query'
import AnimeCard from '../components/AnimeCard'
import SkeletonAnimeCard from '../skeletons/SkeletonAnimeCard'
import ErrorElement from '../ui/ErrorElement'

// Fetch user's AniList watchlist
async function fetchAnilistWatchlist(userId, status) {
  const token = localStorage.getItem('anilist_token')
  if (!token || !userId) return []

  const query = `
    query ($userId: Int, $status: MediaListStatus) {
      MediaListCollection(userId: $userId, type: ANIME, status: $status, sort: UPDATED_TIME_DESC) {
        lists {
          status
          entries {
            id
            progress
            updatedAt
            media {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
                medium
              }
              bannerImage
              episodes
              status
              format
              genres
              averageScore
              popularity
              season
              seasonYear
              description
              nextAiringEpisode {
                episode
                airingAt
              }
            }
          }
        }
      }
    }
  `

  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: { userId, status }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to fetch watchlist')
  }

  const data = await response.json()
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'AniList API error')
  }

  // Flatten and transform the response
  const entries = data.data?.MediaListCollection?.lists?.[0]?.entries || []
  return entries.map(entry => ({
    ...entry.media,
    listEntry: {
      id: entry.id,
      progress: entry.progress,
      updatedAt: entry.updatedAt
    }
  }))
}

function Bookmarks() {
  const { userId } = useZenshinContext()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('CURRENT')
  
  // Local bookmarks state
  const [bookmarks, setBookmarks] = useState(
    JSON.parse(localStorage.getItem('bookmarks')) || {
      torrents: {},
      animepahe: {}
    }
  )

  // Fetch AniList watchlist
  const {
    data: anilistWatchlist,
    isLoading: isLoadingAnilist,
    error: anilistError,
    refetch: refetchAnilist
  } = useQuery({
    queryKey: ['anilist_watchlist', userId, activeTab],
    queryFn: () => fetchAnilistWatchlist(userId, activeTab),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30 // 30 minutes
  })

  function removeBookmark(url, type = 'animepahe') {
    const currentBookmarks = JSON.parse(localStorage.getItem('bookmarks')) || {
      torrents: {},
      animepahe: {}
    }
    if (type === 'animepahe') {
      delete currentBookmarks.animepahe[url]
    } else {
      delete currentBookmarks.torrents[url]
    }
    localStorage.setItem('bookmarks', JSON.stringify(currentBookmarks))
    setBookmarks(JSON.parse(localStorage.getItem('bookmarks')))
  }

  const BookmarkCardComponent = ({ data, type = 'animepahe' }) => {
    return (
      <div
        onClick={() => navigate(data.url)}
        className="group relative mt-6 flex w-48 cursor-pointer flex-col items-center justify-center gap-y-2 font-space-mono transition-all ease-in-out hover:scale-105"
      >
        <img
          src={data?.image}
          alt=""
          className="duration-400 z-10 h-60 w-40 animate-fade rounded-sm object-cover transition-all ease-in-out"
        />

        <div className="flex w-[85%] flex-col gap-y-1">
          <div className="z-10 line-clamp-2 h-11 w-full text-sm font-medium opacity-90">
            {data?.title}
          </div>

          <div className="flex items-center justify-between text-xs opacity-70">
            Episode: {data?.episodesWatched}
            <div className="">
              <Button
                color="gray"
                size={'1'}
                variant="soft"
                onClick={(e) => {
                  e.stopPropagation()
                  removeBookmark(data.url, type)
                }}
              >
                <TrashIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'CURRENT', label: 'Watching' },
    { id: 'PLANNING', label: 'Plan to Watch' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'PAUSED', label: 'Paused' },
    { id: 'DROPPED', label: 'Dropped' }
  ]

  const hasLocalBookmarks = 
    Object.keys(bookmarks?.animepahe || {}).length > 0 || 
    Object.keys(bookmarks?.torrents || {}).length > 0

  return (
    <div className="mx-5 mt-8 font-space-mono">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold tracking-wider">Watchlist</h1>
        {userId && (
          <Button
            variant="soft"
            color="gray"
            size="1"
            onClick={() => refetchAnilist()}
          >
            <ReloadIcon />
            Refresh
          </Button>
        )}
      </div>

      {/* AniList Watchlist Section */}
      {userId && (
        <div className="mb-10">
          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'solid' : 'soft'}
                color={activeTab === tab.id ? 'blue' : 'gray'}
                size="1"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Loading State */}
          {isLoadingAnilist && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg2:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
              {[...Array(7)].map((_, i) => (
                <SkeletonAnimeCard key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {anilistError && (
            <div className="flex justify-center py-10">
              <ErrorElement 
                title="Failed to load watchlist" 
                text={anilistError.message}
                type="error"
              />
            </div>
          )}

          {/* Watchlist Items */}
          {!isLoadingAnilist && !anilistError && anilistWatchlist && (
            <>
              {anilistWatchlist.length === 0 ? (
                <div className="flex justify-center py-10">
                  <ErrorElement 
                    title="No anime found" 
                    text={`Your ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} list is empty`}
                    type="info"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg2:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
                  {anilistWatchlist.map((anime) => (
                    <div key={anime.id} className="relative">
                      <AnimeCard data={anime} />
                      {anime.listEntry?.progress > 0 && (
                        <div className="absolute bottom-20 left-4 right-4 bg-black/70 px-2 py-1 text-xs rounded">
                          <div className="flex items-center justify-between">
                            <span>Progress: {anime.listEntry.progress}/{anime.episodes || '?'}</span>
                            <PlayIcon className="w-3 h-3" />
                          </div>
                          {anime.episodes && (
                            <div className="mt-1 h-1 w-full bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${(anime.listEntry.progress / anime.episodes) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Not logged in message */}
      {!userId && (
        <div className="mb-10 flex justify-center py-10">
          <ErrorElement 
            title="Login Required" 
            text="Please login with AniList to see your watchlist and sync your progress"
            type="info"
          />
        </div>
      )}

      {/* Local Bookmarks Section */}
      {hasLocalBookmarks && (
        <div className="mt-8">
          <div className="mb-4 border-b border-gray-700 pb-2 text-lg font-bold tracking-wider">
            Local Bookmarks
          </div>

          {/* AnimePahe Bookmarks */}
          {Object.keys(bookmarks?.animepahe || {}).length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold opacity-70">AnimePahe</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg2:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
                {Object.entries(bookmarks.animepahe).map(([key, value]) => (
                  <BookmarkCardComponent key={value.url} data={value} type="animepahe" />
                ))}
              </div>
            </div>
          )}

          {/* Torrent Bookmarks */}
          {Object.keys(bookmarks?.torrents || {}).length > 0 && (
            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold opacity-70">Torrents</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg2:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9">
                {Object.entries(bookmarks.torrents).map(([key, value]) => (
                  <BookmarkCardComponent key={value.url || key} data={value} type="torrents" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Bookmarks
