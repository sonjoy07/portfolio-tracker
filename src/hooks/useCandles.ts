import { useCallback, useEffect, useState } from 'react'
import {
  BINANCE_REST_BASE,
  klineStreamName,
  parseKlineEvent,
  parseKlines,
  upsertCandle,
} from '../services/binance'
import type { BinanceCandle, BinanceKlineInterval } from '../types/binance'
import { useRawStream } from './useRawStream'

const HISTORY_LIMIT = 300

interface CandlesResult {
  candles: BinanceCandle[]
  isReady: boolean
  hasError: boolean
}

export function useCandles(symbol: string, interval: BinanceKlineInterval): CandlesResult {
  const [candles, setCandles] = useState<BinanceCandle[]>([])
  const [loadedKey, setLoadedKey] = useState('')
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const key = `${symbol}:${interval}`
    const params = new URLSearchParams({ symbol, interval, limit: String(HISTORY_LIMIT) })
    fetch(`${BINANCE_REST_BASE}/klines?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error(`klines HTTP ${response.status}`)
        return response.json()
      })
      .then((rows) => {
        if (!cancelled) {
          setCandles(parseKlines(rows))
          setLoadedKey(key)
          setHasError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedKey(key)
          setHasError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [symbol, interval])

  const onKline = useCallback((raw: string) => {
    const candle = parseKlineEvent(raw)
    if (candle) setCandles((prev) => upsertCandle(prev, candle))
  }, [])

  useRawStream(klineStreamName(symbol, interval), onKline)

  const display = loadedKey === `${symbol}:${interval}` ? candles : []
  return { candles: display, isReady: loadedKey === `${symbol}:${interval}`, hasError }
}