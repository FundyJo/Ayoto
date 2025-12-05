import { ArrowDownIcon, BarChartIcon } from '@radix-ui/react-icons'
import { useEffect, useState, useRef } from 'react'
import formatBytes from '../utils/formatBytes'
import { Button, Tooltip } from '@radix-ui/themes'

function DownloadMeter() {
  const [message, setMessage] = useState([])
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectDelayRef = useRef(5000) // Start with 5 seconds

  useEffect(() => {
    let isUnmounted = false
    
    const connectWebSocket = () => {
      if (isUnmounted) return
      
      try {
        const socket = new WebSocket('ws://localhost:64621/ws')
        socketRef.current = socket

        socket.onopen = () => {
          if (!isUnmounted) {
            // Reset reconnect delay on successful connection
            reconnectDelayRef.current = 5000
          }
        }

        socket.onmessage = (event) => {
          if (!isUnmounted) {
            try {
              const data = JSON.parse(event.data)
              setMessage(data)
            } catch {
              // Ignore parse errors
            }
          }
        }

        socket.onerror = () => {
          // Silently handle errors - WebSocket not available is expected when backend isn't running
        }

        socket.onclose = () => {
          if (!isUnmounted) {
            // Exponential backoff for reconnection (max 60 seconds)
            const delay = Math.min(reconnectDelayRef.current, 60000)
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay)
            reconnectDelayRef.current = delay * 1.5
          }
        }
      } catch {
        // Failed to create WebSocket, try again later with exponential backoff
        if (!isUnmounted) {
          const delay = Math.min(reconnectDelayRef.current, 60000)
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay)
          reconnectDelayRef.current = delay * 1.5
        }
      }
    }

    connectWebSocket()

    return () => {
      isUnmounted = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  let clientDownloadSpeed = message[0]?.clientDownloadSpeed || 0
  const [showFullSpeed, setShowFullSpeed] = useState(false)
  const [alwaysShow, setAlwaysShow] = useState(false)
  
  // Check if there's an active download
  const isDownloading = clientDownloadSpeed > 0

  return (
    <div className="relative">
      <Tooltip content="Torrent Download Speed" side="right">
        <Button
          size={'1'}
          color={isDownloading ? 'blue' : 'gray'}
          variant="soft"
          onMouseOver={() => setShowFullSpeed(true)}
          onMouseLeave={() => setShowFullSpeed(false)}
          onClick={() => setAlwaysShow(!alwaysShow)}
        >
          <BarChartIcon />
        </Button>
      </Tooltip>
      {(showFullSpeed || alwaysShow || isDownloading) && (
        <div className="absolute -left-[5rem] top-10 z-50 rounded-sm bg-[#111113]">
          <div className="flex w-48 select-none items-center justify-center gap-x-2 text-nowrap px-2 py-2 font-space-mono text-xs">
            <ArrowDownIcon className={isDownloading ? 'animate-pulse text-blue-400' : ''} />
            <span className={isDownloading ? 'text-blue-400' : ''}>
              {formatBytes(clientDownloadSpeed)}/s
            </span>
            {isDownloading && (
              <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadMeter
