import { useCallback, useState } from 'react'
import { depthStreamName, parseDepthEvent } from '../services/binance'
import type { BinanceConnectionStatus, DepthLevel } from '../types/binance'
import { useRawStream } from './useRawStream'

interface OrderBookResult {
  bids: DepthLevel[]
  asks: DepthLevel[]
  connectionStatus: BinanceConnectionStatus
}

export function useOrderBook(symbol: string): OrderBookResult {
  const [bids, setBids] = useState<DepthLevel[]>([])
  const [asks, setAsks] = useState<DepthLevel[]>([])

  const onDepth = useCallback((raw: string) => {
    const depth = parseDepthEvent(raw)
    if (!depth) return
    setBids(depth.bids)
    setAsks(depth.asks)
  }, [])

  const { connectionStatus } = useRawStream(depthStreamName(symbol), onDepth)

  return { bids, asks, connectionStatus }
}