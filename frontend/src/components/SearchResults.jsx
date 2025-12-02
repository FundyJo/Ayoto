import { format } from 'date-fns'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageIcon } from '@radix-ui/react-icons'

export default function SearchResults({ data, setIsActive }) {
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)

  function handleClick() {
    navigate(`/anime/${data.id}`)
    setIsActive(false)
  }
  const date = data?.startDate
    ? new Date(data.startDate.year, data.startDate.month - 1, data.startDate.day)
    : null

  const coverUrl = data?.coverImage?.large || data?.coverImage?.medium

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
        <div className="w-full truncate text-sm font-medium opacity-80">{data.title.romaji}</div>

        <div>
          <p className="text-xs opacity-45">
            {data.format} - {`${data.episodes ? data.episodes : '?'} episodes`} ({data.status})
          </p>
          {date && <p className="text-xs opacity-45">{format(new Date(date), 'MMMM yyyy')}</p>}
        </div>
      </div>
    </div>
  )
}
