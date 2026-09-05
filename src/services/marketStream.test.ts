import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { HOLDING_BY_COIN } from '../data/holdings'
import { useMarketStore } from '../store/marketStore'
import type { PricesMap } from '../types'
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
} from './binance'
import { startMarketStream, stopMarketStream } from './marketStream'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 0
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3
    this.onclose?.({ code, reason })
  }

  open(): void {
    this.readyState = 1
    this.onopen?.({})
  }

  message(data: string): void {
    this.onmessage?.({ data })
  }
}

const initialState = () => ({
  prices: {} as PricesMap,
  history: [],
  connectionStatus: 'connecting' as const,
  reconnectAttempt: 0,
  lastUpdated: null,
  retryNonce: 0,
  selectedCoinId: 'BTC',
})

function tickerMessage(symbol: string, last: string, changePct: string): string {
  return JSON.stringify({
    stream: `${symbol.toLowerCase()}@ticker`,
    data: {
      e: '24hrTicker',
      E: 0,
      s: symbol.toUpperCase(),
      p: '0',
      P: changePct,
      c: last,
      o: '0',
      h: '0',
      l: '0',
      v: '0',
      q: '0',
      n: 0,
    },
  })
}

function lastInstance(): MockWebSocket {
  const instance = MockWebSocket.instances.at(-1)
  if (!instance) throw new Error('No WebSocket instance was created')
  return instance
}

beforeEach(() => {
  jest.useFakeTimers()
  MockWebSocket.instances = []
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
  useMarketStore.setState(initialState())
})

afterEach(() => {
  stopMarketStream()
  jest.useRealTimers()
})

describe('marketStream', () => {
  it('batches ticks and publishes them to the store on the flush interval', () => {
    startMarketStream()
    lastInstance().open()

    lastInstance().message(tickerMessage('BTCUSDT', '45000.123', '0.25'))
    lastInstance().message(tickerMessage('ETHUSDT', '3000', '-1.1'))

    expect(useMarketStore.getState().prices.BTC).toBeUndefined()

    jest.advanceTimersByTime(100)

    expect(useMarketStore.getState().prices.BTC).toEqual({ usd: 45000.123, usd_24h_change: 0.25 })
    expect(useMarketStore.getState().prices.ETH).toEqual({ usd: 3000, usd_24h_change: -1.1 })
    expect(useMarketStore.getState().lastUpdated).not.toBeNull()
  })

  it('keeps history snapshots at the throttled cadence', () => {
    startMarketStream()
    lastInstance().open()

    lastInstance().message(tickerMessage('BTCUSDT', '45000', '0'))
    jest.advanceTimersByTime(100)
    expect(useMarketStore.getState().history).toHaveLength(1)

    jest.advanceTimersByTime(5_000)
    lastInstance().message(tickerMessage('BTCUSDT', '46000', '2'))
    jest.advanceTimersByTime(100)

    const history = useMarketStore.getState().history
    expect(history).toHaveLength(2)
    const quantity = HOLDING_BY_COIN.BTC.quantity
    expect(history[0].value).toBeCloseTo(quantity * 45000, 4)
    expect(history[1].value).toBeCloseTo(quantity * 46000, 4)
  })

  it('reconnects with exponential backoff after a drop', () => {
    startMarketStream()
    lastInstance().open()
    expect(useMarketStore.getState().connectionStatus).toBe('open')

    lastInstance().close(4000, 'test drop')
    expect(useMarketStore.getState().connectionStatus).toBe('reconnecting')
    expect(useMarketStore.getState().reconnectAttempt).toBe(1)

    const first = MockWebSocket.instances.length
    jest.advanceTimersByTime(RECONNECT_BASE_DELAY_MS)
    expect(MockWebSocket.instances.length).toBe(first + 1)
    expect(useMarketStore.getState().connectionStatus).toBe('connecting')

    lastInstance().open()
    expect(useMarketStore.getState().connectionStatus).toBe('open')
    expect(useMarketStore.getState().reconnectAttempt).toBe(0)
  })

  it('enters the error state after exhausting reconnect attempts', () => {
    startMarketStream()
    lastInstance().open()

    let delay = RECONNECT_BASE_DELAY_MS
    let guard = 0
    while (useMarketStore.getState().connectionStatus !== 'error' && guard < MAX_RECONNECT_ATTEMPTS + 5) {
      guard += 1
      lastInstance().close()
      jest.advanceTimersByTime(delay)
      delay = Math.min(delay * 2, RECONNECT_MAX_DELAY_MS)
    }

    expect(useMarketStore.getState().connectionStatus).toBe('error')
  })

  it('retrying after an error reconnects immediately', () => {
    startMarketStream()
    lastInstance().open()

    let delay = RECONNECT_BASE_DELAY_MS
    let guard = 0
    while (useMarketStore.getState().connectionStatus !== 'error' && guard < MAX_RECONNECT_ATTEMPTS + 5) {
      guard += 1
      lastInstance().close()
      jest.advanceTimersByTime(delay)
      delay = Math.min(delay * 2, RECONNECT_MAX_DELAY_MS)
    }
    expect(useMarketStore.getState().connectionStatus).toBe('error')

    const before = MockWebSocket.instances.length
    useMarketStore.getState().retryNow()
    expect(MockWebSocket.instances.length).toBe(before + 1)
    expect(useMarketStore.getState().connectionStatus).toBe('connecting')
    lastInstance().open()
    expect(useMarketStore.getState().connectionStatus).toBe('open')
  })
})