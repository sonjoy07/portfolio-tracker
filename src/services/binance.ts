import type { PriceData, PricesMap } from '../types'
import type {
  BinanceCandle,
  BinanceCombinedMessage,
  BinanceKlineEvent,
  BinanceTickerEvent,
  DepthLevel,
} from '../types/binance'

export const BINANCE_WS_BASE = 'wss://stream.binance.com:9443'
export const BINANCE_REST_BASE = 'https://api.binance.com/api/v3'

export const RECONNECT_BASE_DELAY_MS = 1_000
export const RECONNECT_MAX_DELAY_MS = 30_000
export const MAX_RECONNECT_ATTEMPTS = 30

export function binanceSymbol(coinSymbol: string): string {
  return `${coinSymbol.toUpperCase()}USDT`
}

export function tickerStreamName(symbol: string): string {
  return `${symbol.toLowerCase()}@ticker`
}

export function depthStreamName(symbol: string): string {
  return `${symbol.toLowerCase()}@depth20`
}

export function klineStreamName(symbol: string, interval: string): string {
  return `${symbol.toLowerCase()}@kline_${interval}`
}

export function buildMarketStreamUrl(streams: string[]): string {
  return `${BINANCE_WS_BASE}/stream?streams=${streams.join('/')}`
}

export function buildRawStreamUrl(streamName: string): string {
  return `${BINANCE_WS_BASE}/ws/${streamName}`
}

export function isTickerStream(streamName: string): boolean {
  return streamName.endsWith('@ticker')
}

export function parseCombinedMessage(raw: string): BinanceCombinedMessage | null {
  try {
    const message = JSON.parse(raw) as BinanceCombinedMessage
    return message && typeof message.stream === 'string' && message.data ? message : null
  } catch {
    return null
  }
}

export interface TickerApplyUpdate {
  price: number
  priceChangePercent: number
}

export interface TickerParseResult extends TickerApplyUpdate {
  symbol: string
}

export function parseTickerEvent(
  event: BinanceTickerEvent | null | undefined,
): TickerParseResult | null {
  if (!event || typeof event.s !== 'string') return null
  const price = Number(event.c)
  if (!Number.isFinite(price)) return null
  const priceChangePercent = Number(event.P)
  return {
    symbol: event.s.toUpperCase(),
    price,
    priceChangePercent: Number.isFinite(priceChangePercent) ? priceChangePercent : 0,
  }
}

export function applyTickerUpdate(
  current: PricesMap,
  coinId: string,
  update: TickerApplyUpdate,
): PricesMap {
  const existing = current[coinId]
  if (
    existing &&
    existing.usd === update.price &&
    existing.usd_24h_change === update.priceChangePercent
  ) {
    return current
  }
  const nextPrice: PriceData = {
    usd: update.price,
    usd_24h_change: update.priceChangePercent,
  }
  return { ...current, [coinId]: nextPrice }
}

interface DepthRows {
  bids: DepthLevel[]
  asks: DepthLevel[]
}

export function parseDepthEvent(raw: string): DepthRows | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const combined = parsed as { stream?: unknown; data?: BinanceDepthMessage }
  const payload: BinanceDepthMessage = combined.data && combined.stream ? combined.data : (parsed as BinanceDepthMessage)
  if (!payload || typeof payload !== 'object') return null

  const bids: DepthLevel[] = []
  const asks: DepthLevel[] = []
  for (const level of payload.b ?? payload.bids ?? []) {
    const price = Number(level[0])
    const quantity = Number(level[1])
    if (Number.isFinite(price) && Number.isFinite(quantity) && quantity > 0) {
      bids.push({ price, quantity })
    }
  }
  for (const level of payload.a ?? payload.asks ?? []) {
    const price = Number(level[0])
    const quantity = Number(level[1])
    if (Number.isFinite(price) && Number.isFinite(quantity) && quantity > 0) {
      asks.push({ price, quantity })
    }
  }
  bids.sort((x, y) => y.price - x.price)
  asks.sort((x, y) => x.price - y.price)
  return bids.length || asks.length ? { bids, asks } : null
}

interface BinanceDepthMessage {
  b?: Array<[string, string]>
  a?: Array<[string, string]>
  bids?: Array<[string, string]>
  asks?: Array<[string, string]>
}

export function parseKlines(rows: unknown): BinanceCandle[] {
  if (!Array.isArray(rows)) return []
  const candles: BinanceCandle[] = []
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    const openTime = Number(row[0])
    const open = Number(row[1])
    const high = Number(row[2])
    const low = Number(row[3])
    const close = Number(row[4])
    if (Number.isFinite(openTime) && Number.isFinite(open) && Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close)) {
      candles.push({ time: Math.floor(openTime / 1000), open, high, low, close })
    }
  }
  return candles
}

export function parseKlineEvent(raw: string): BinanceCandle | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const combined = parsed as { stream?: unknown; data?: BinanceKlineEvent }
  const event: BinanceKlineEvent = combined.data ?? (parsed as BinanceKlineEvent)
  const k = event?.k ?? null
  if (!k || typeof k !== 'object') return null

  const time = Number(k.t)
  const open = Number(k.o)
  const high = Number(k.h)
  const low = Number(k.l)
  const close = Number(k.c)
  if (![time, open, high, low, close].every(Number.isFinite)) return null
  return { time: Math.floor(time / 1000), open, high, low, close } as BinanceCandle
}

export function upsertCandle(candles: BinanceCandle[], update: BinanceCandle): BinanceCandle[] {
  const index = candles.findIndex((candle) => candle.time === update.time)
  if (index === -1) return [...candles, update]
  const existing = candles[index]
  if (
    existing.open === update.open &&
    existing.high === update.high &&
    existing.low === update.low &&
    existing.close === update.close
  ) {
    return candles
  }
  const next = candles.slice()
  next[index] = update
  return next
}