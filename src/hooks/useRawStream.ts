import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  buildRawStreamUrl,
} from '../services/binance'
import type { BinanceConnectionStatus } from '../types/binance'

interface RawStreamResult {
  connectionStatus: BinanceConnectionStatus
}

export function useRawStream(
  streamName: string,
  onMessage: (raw: string) => void,
): RawStreamResult {
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const streamUrl = useMemo(() => buildRawStreamUrl(streamName), [streamName])
  const [connectionStatus, setConnectionStatus] = useState<BinanceConnectionStatus>('connecting')

  useEffect(() => {
    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const scheduleReconnect = () => {
      if (disposed) return
      attempts += 1
      if (attempts > MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('error')
        return
      }
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** (attempts - 1),
        RECONNECT_MAX_DELAY_MS,
      )
      setConnectionStatus('reconnecting')
      reconnectTimer = setTimeout(connect, delay)
    }

    const connect = () => {
      if (disposed) return
      setConnectionStatus('connecting')
      let created: WebSocket | null = null
      try {
        created = new WebSocket(streamUrl)
      } catch {
        scheduleReconnect()
        return
      }
      socket = created
      socket.onopen = () => {
        if (disposed) return
        attempts = 0
        setConnectionStatus('open')
      }
      socket.onmessage = (event) => {
        if (disposed) return
        onMessageRef.current(String(event.data))
      }
      socket.onclose = () => {
        if (disposed) return
        socket = null
        scheduleReconnect()
      }
      socket.onerror = () => undefined
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (socket) socket.close(1000, 'component unmount')
    }
  }, [streamUrl])

  return { connectionStatus }
}