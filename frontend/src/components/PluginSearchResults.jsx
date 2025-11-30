import { GlobeIcon } from '@radix-ui/react-icons'

/**
 * Component to display search results from plugin providers
 * @param {Object} props - Component props
 * @param {Object} props.data - Search result data from plugin
 * @param {string} props.providerName - Name of the plugin provider
 * @param {Function} props.setIsActive - Function to toggle search bar active state
 */
export default function PluginSearchResults({ data, providerName, setIsActive }) {
  // Handle click - for now, show the link since plugins don't integrate with main app navigation
  function handleClick() {
    // Plugin results may have their own navigation or link
    if (data.link) {
      // Could open in a modal or new tab depending on implementation
      console.log('Plugin result clicked:', data)
    }
    setIsActive(false)
  }

  return (
    <div
      onClick={() => handleClick()}
      className="hover:drop-shadow-xl flex animate-fade cursor-pointer gap-x-5 bg-[#111113] px-2 py-1 font-inter transition-all duration-200 ease-in-out hover:z-10 hover:scale-105 hover:rounded-md hover:bg-[#232326]"
    >
      {data.cover ? (
        <img
          className="duration-400 h-12 w-12 animate-fade rounded-lg object-cover transition-all ease-in-out hover:scale-150"
          src={data.cover}
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
