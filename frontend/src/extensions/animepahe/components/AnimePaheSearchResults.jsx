import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageIcon } from '@radix-ui/react-icons'
import { parseAnimepaheImage } from '../utils/parseAnimepaheImage'

export default function AnimePaheSearchResults({ data, setIsActive }) {
  const { title, type, episodes, status, season, year, poster, session } = data
  const [imageError, setImageError] = useState(false)

  const navigate = useNavigate()
  function handleClick() {
    navigate(`/animepahe/anime/${session}`)
    setIsActive(false)
  }

  const coverUrl = parseAnimepaheImage(poster)

  return (
    <div
      onClick={() => handleClick()}
      className="hover:drop-shadow-xl flex animate-fade cursor-pointer gap-x-5 bg-[#111113] px-2 py-1 font-inter transition-all duration-200 ease-in-out hover:z-10 hover:scale-105 hover:rounded-md hover:bg-[#232326]"
    >
      {coverUrl && !imageError ? (
        <img
          className="duration-400 h-12 w-12 animate-fade rounded-lg object-cover transition-all ease-in-out hover:scale-150"
          src={coverUrl}
          alt="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2a2a2d]">
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="flex w-[85%] flex-col">
        <div className="w-full truncate text-sm font-medium opacity-80">{title}</div>

        <div>
          <p className="text-xs opacity-45">
            {type} - {`${episodes ? episodes : '?'} episodes`} ({status})
          </p>
          {year && <p className="text-xs opacity-45">{`${season} ${year}`}</p>}
        </div>
      </div>
    </div>
  )
}
