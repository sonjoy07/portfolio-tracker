import { PORTFOLIO_COINS } from '../data/coins'
import { HOLDINGS } from '../data/holdings'
import { useMarketStore } from '../store/marketStore'
import type { PricesMap } from '../types'
import { computePortfolioValue } from '../utils/portfolio'
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  applyTickerUpdate,
  binanceSymbol,
  buildMarketStreamUrl,
  isTickerStream,
  parseCombinedMessage,
  parseTickerEvent,
  tickerStreamName,
} from './binance'

const STALE_CONNECTION_TIMEOUT_MS = 45_000
const STALE_CHECK_INTERVAL_MS = 15_000
const HISTORY_THROTTLE_MS = 5_000
const FLUSH_INTERVAL_MS = 100

const symbolToCoinId: Record<string, string> = {}
for (const coin of PORTFOLIO_COINS) symbolToCoinId[binanceSymbol(coin.symbol)] = coin.id

const streamUrl = buildMarketStreamUrl(
  PORTFOLIO_COINS.map((coin) => tickerStreamName(binanceSymbol(coin.symbol))),
)

let socket: WebSocket | null = null
let started = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let staleTimer: ReturnType<typeof setInterval> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pendingTicks: Array<{ coinId: string; price: number; change: number }> = []
let attempts = 0
let lastMessageAt = Date.now()
let lastSnapshotAt = 0
let retryUnsubscribe: (() => void) | null = null

const clearTimers = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (staleTimer) {
    clearInterval(staleTimer)
    staleTimer = null
  }
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

const recordSnapshot = (prices: PricesMap) => {
  const now = Date.now()
  if (now - lastSnapshotAt < HISTORY_THROTTLE_MS) return
  lastSnapshotAt = now
  useMarketStore
    .getState()
    .appendHistoryPoint({ timestamp: now, value: computePortfolioValue(HOLDINGS, prices) })
}

const flushTicks = () => {
  flushTimer = null
  if (pendingTicks.length === 0) return
  const ticks = pendingTicks
  pendingTicks = []
  const store = useMarketStore.getState()
  let next = store.prices
  let changed = false
  for (const tick of ticks) {
    const merged = applyTickerUpdate(next, tick.coinId, {
      price: tick.price,
      priceChangePercent: tick.change,
    })
    if (merged !== next) {
      next = merged
      changed = true
    }
  }
  if (!changed) return
  store.setPrices(next, Date.now())
  recordSnapshot(next)
}

const enqueueTick = (raw: string) => {
  const message = parseCombinedMessage(raw)
  if (!message || !isTickerStream(message.stream)) return
  const ticker = parseTickerEvent(message.data)
  if (!ticker) return
  const coinId = symbolToCoinId[ticker.symbol]
  if (!coinId) return
  pendingTicks.push({ coinId, price: ticker.price, change: ticker.priceChangePercent })
  if (!flushTimer) flushTimer = setTimeout(flushTicks, FLUSH_INTERVAL_MS)
}

const handleStaleCheck = () => {
  if (socket && Date.now() - lastMessageAt > STALE_CONNECTION_TIMEOUT_MS) {
    socket.close(4000, 'stale connection')
  }
}

const scheduleReconnect = () => {
  if (!started) return
  clearTimers()
  socket = null
  attempts += 1
  if (attempts > MAX_RECONNECT_ATTEMPTS) {
    useMarketStore.getState().setConnectionStatus('error')
    return
  }
  const delay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** (attempts - 1),
    RECONNECT_MAX_DELAY_MS,
  )
  useMarketStore.getState().setConnectionStatus('reconnecting')
  useMarketStore.getState().setReconnectAttempt(attempts)
  reconnectTimer = setTimeout(connect, delay)
}

const connect = () => {
  if (!started) return
  useMarketStore.getState().setConnectionStatus('connecting')
  let created: WebSocket | null = null
  try {
    created = new WebSocket(streamUrl)
  } catch {
    scheduleReconnect()
    return
  }
  socket = created
  socket.onopen = () => {
    if (!started) return
    lastMessageAt = Date.now()
    attempts = 0
    useMarketStore.getState().setReconnectAttempt(0)
    useMarketStore.getState().setConnectionStatus('open')
    if (!staleTimer) {
      staleTimer = setInterval(handleStaleCheck, STALE_CHECK_INTERVAL_MS)
    }
  }
  socket.onmessage = (event) => {
    if (!started) return
    lastMessageAt = Date.now()
    enqueueTick(String(event.data))
  }
  socket.onclose = () => {
    if (!started) return
    scheduleReconnect()
  }
  socket.onerror = () => undefined
}

export function startMarketStream() {
  if (started) return
  started = true
  retryUnsubscribe = useMarketStore.subscribe((state, prev) => {
    if (state.retryNonce !== prev.retryNonce) {
      attempts = 0
      clearTimers()
      if (socket) {
        socket.close(4000, 'manual retry')
        socket = null
      }
      connect()
    }
  })
  connect()
}

export function stopMarketStream() {
  started = false
  retryUnsubscribe?.()
  retryUnsubscribe = null
  clearTimers()
  if (socket) {
    socket.close(1000, 'stream stopped')
    socket = null
  }
  pendingTicks = []
  attempts = 0
  lastMessageAt = Date.now()
  lastSnapshotAt = 0
}