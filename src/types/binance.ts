export interface BinanceTickerEvent {
  e: '24hrTicker'
  E: number
  s: string
  p: string
  P: string
  c: string
  o: string
  h: string
  l: string
  v: string
  q: string
  n: number
}

export interface BinanceCombinedMessage {
  stream: string
  data: BinanceTickerEvent
}

export interface DepthLevel {
  price: number
  quantity: number
}

export type BinanceConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'error'

export type BinanceKlineInterval = '1m' | '5m' | '15m' | '1h'

export interface BinanceCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface BinanceKlineEvent {
  e: 'kline'
  E: number
  s: string
  k: {
    t: number
    o: string
    h: string
    l: string
    c: string
    x: boolean
  }
}