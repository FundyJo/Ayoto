import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { Code, Skeleton, Spinner, TextField } from '@radix-ui/themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import SearchResults from './SearchResults'
import PluginSearchResults from './PluginSearchResults'
import { searchAnime } from '../utils/helper'
import { zpePluginManager } from '../zpe'

export default function SearchBar() {
  const [searchText, setSearchText] = useState('')
  const [searchData, setSearchData] = useState([])
  const [pluginSearchData, setPluginSearchData] = useState([])
  const [isActive, setIsActive] = useState(false)

  const inputRef = useRef(null)
  const searchBarRef = useRef(null)

  // console.log(searchText)

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setIsActive(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchBarRef])

  const handleSearchChange = (event) => {
    setSearchData([])
    setPluginSearchData([])
    setSearchText(event.target.value)
    // console.log(event.target.value);
  }

  const [searching, setSearching] = useState(false)
  const handleSearchText = useCallback(async function handleSearchText(searchText) {
    if (searchText) {
      setSearching(true)
      
      // Run Anilist search and plugin search in parallel
      const anilistPromise = searchAnime(searchText).catch(err => {
        console.error('Anilist search error:', err)
        return []
      })
      
      const pluginsPromise = (async () => {
        try {
          const pluginResults = []
          const enabledPlugins = zpePluginManager.getPluginsWithCapability('search')
          
          // Run plugin searches in parallel
          const pluginSearchPromises = enabledPlugins.map(async (pluginInfo) => {
            try {
              const plugin = await zpePluginManager.getPlugin(pluginInfo.id)
              if (plugin && typeof plugin.search === 'function') {
                const result = await plugin.search(searchText)
                if (result && result.results && result.results.length > 0) {
                  return {
                    providerId: pluginInfo.id,
                    providerName: pluginInfo.name,
                    results: result.results
                  }
                }
              }
            } catch (pluginError) {
              console.error(`Plugin search error for ${pluginInfo.id}:`, pluginError)
            }
            return null
          })
          
          const searchResults = await Promise.all(pluginSearchPromises)
          return searchResults.filter(Boolean)
        } catch (error) {
          console.error('Error searching plugins:', error)
          return []
        }
      })()
      
      // Wait for both to complete
      const [data, pluginResults] = await Promise.all([anilistPromise, pluginsPromise])
      
      setSearchData(data)
      setPluginSearchData(pluginResults)
      setSearching(false)
    } else {
      toast.error('Invalid search query', {
        icon: <MagnifyingGlassIcon height="16" width="16" color="#ffffff" />,
        description: 'Please enter a valid search query',
        classNames: {
          title: 'text-rose-500'
        }
      })
      return
    }
  }, [])

  // console.log(searchData)

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Enter' && inputRef.current === document.activeElement) {
        handleSearchText(searchText)
      }
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault()
        inputRef.current.select()
        inputRef.current.focus()
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleSearchText, searchText])

  return (
    <div ref={searchBarRef} className="relative">
      <div className="draggable px-3">
        <TextField.Root
          placeholder={'Search'}
          className="nodrag"
          onInput={handleSearchChange}
          ref={inputRef}
          type="text"
          value={searchText}
          onFocus={() => setIsActive(true)}
          // onBlur={() => setIsActive(false)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
          <TextField.Slot
            className="transition-all duration-100 ease-in-out hover:cursor-pointer hover:bg-[#5a5e6750]"
            onClick={() => handleSearchText(searchText)}
          >
            <Code size={'1'} color="gray" variant="outline">
              ctrl
            </Code>
            <Code size={'1'} color="gray" variant="outline">
              k
            </Code>
          </TextField.Slot>
        </TextField.Root>
      </div>

      {isActive && (
        <div className="absolute mt-1 flex w-full animate-fade-down flex-col justify-center rounded-sm animate-duration-[400ms]">
          {/* {true && ( */}
          {searching && (
            <div className="flex flex-col items-center justify-center gap-y-5 bg-[#111113] p-2 backdrop-blur-sm">
              <div className="flex w-full items-start gap-x-4">
                <Skeleton className="h-12 w-12" />
                <div className="flex flex-col gap-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-48" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
              {/* <Spinner /> */}
            </div>
          )}

          {searchData?.map((x) => (
            <SearchResults key={x.id} data={x} setIsActive={setIsActive} />
          ))}

          {/* Plugin search results */}
          {pluginSearchData?.map((provider) => (
            provider.results?.slice(0, 5).map((result) => (
              <PluginSearchResults
                key={`${provider.providerId}-${result.id}`}
                data={result}
                providerName={provider.providerName}
                providerId={provider.providerId}
                setIsActive={setIsActive}
              />
            ))
          ))}
        </div>
      )}
    </div>
  )
}
