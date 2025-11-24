import { ArrowDownIcon, ArrowUpIcon, BarChartIcon } from '@radix-ui/react-icons'
import { useEffect, useState, useRef } from 'react'
import formatBytes from '../utils/formatBytes'
import { Button, Tooltip } from '@radix-ui/themes'

function DownloadMeter() {
  const [message, setMessage] = useState([])
  const [statusWs, setStatus] = useState('Disconnected')
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
            setStatus('Connected')
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
            setStatus('Disconnected')
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
  let clientUploadSpeed = message[0]?.clientUploadSpeed || 0
  const [showFullSpeed, setShowFullSpeed] = useState(false)
  const [alwaysShow, setAlwaysShow] = useState(false)
  return (
    <div className="relative">
      <Tooltip content="Toggle Torrent Speeds" side="right">
        <Button
          size={'1'}
          color="gray"
          variant="soft"
          onMouseOver={() => setShowFullSpeed(true)}
          onMouseLeave={() => setShowFullSpeed(false)}
          onClick={() => setAlwaysShow(!alwaysShow)}
        >
          <BarChartIcon />
        </Button>
      </Tooltip>
      {(showFullSpeed || alwaysShow) && (
        <div className="absolute -left-[6rem] top-10 z-50 rounded-sm bg-[#111113]">
          <div className="flex w-64 select-none justify-center gap-x-2 text-nowrap px-1 py-2 font-space-mono text-xs">
            <div className="flex items-center gap-x-1">
              {formatBytes(clientDownloadSpeed)}/{/* asddasddas */}
              <ArrowDownIcon />
            </div>

            <div className="flex items-center gap-x-1">
              {formatBytes(clientUploadSpeed)}/s
              <ArrowUpIcon />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DownloadMeter
