import { describe, expect, it } from '@jest/globals'
import type { PricesMap } from '../types'
import {
  applyTickerUpdate,
  depthStreamName,
  klineStreamName,
  parseCombinedMessage,
  parseDepthEvent,
  parseKlineEvent,
  parseKlines,
  parseTickerEvent,
  tickerStreamName,
  upsertCandle,
} from './binance'
import type { BinanceCandle } from '../types/binance'

describe('stream name builders', () => {
  it('builds lowercased stream names for ticker, depth and klines', () => {
    expect(tickerStreamName('BTCUSDT')).toBe('btcusdt@ticker')
    expect(depthStreamName('BTCUSDT')).toBe('btcusdt@depth20')
    expect(klineStreamName('BTCUSDT', '1m')).toBe('btcusdt@kline_1m')
  })
})

describe('parseCombinedMessage', () => {
  it('parses wrapped messages', () => {
    const raw = JSON.stringify({ stream: 'btcusdt@ticker', data: { e: '24hrTicker', s: 'BTCUSDT', c: '45000' } })
    expect(parseCombinedMessage(raw)?.stream).toBe('btcusdt@ticker')
  })

  it('returns null for malformed input', () => {
    expect(parseCombinedMessage('not json')).toBeNull()
    expect(parseCombinedMessage(JSON.stringify({ data: {} }))).toBeNull()
  })
})

describe('parseTickerEvent', () => {
  it('parses price and 24h change', () => {
    const result = parseTickerEvent({
      e: '24hrTicker',
      E: 0,
      s: 'BTCUSDT',
      p: '1000',
      P: '2.25',
      c: '45000.123',
      o: '0',
      h: '0',
      l: '0',
      v: '0',
      q: '0',
      n: 0,
    })
    expect(result).toEqual({ symbol: 'BTCUSDT', price: 45000.123, priceChangePercent: 2.25 })
  })

  it('returns null for invalid prices', () => {
    expect(parseTickerEvent(null)).toBeNull()
    expect(parseTickerEvent({ e: '24hrTicker', s: 'BTCUSDT', c: 'nope' } as never)).toBeNull()
  })
})

describe('applyTickerUpdate', () => {
  it('adds a new price', () => {
    const next = applyTickerUpdate({}, 'BTC', { price: 45000, priceChangePercent: 1 })
    expect(next.BTC).toEqual({ usd: 45000, usd_24h_change: 1 })
  })

  it('returns the same map when nothing changed', () => {
    const current: PricesMap = {
      BTC: { usd: 45000, usd_24h_change: 1 },
      ETH: { usd: 3000, usd_24h_change: -1 },
    }
    expect(applyTickerUpdate(current, 'BTC', { price: 45000, priceChangePercent: 1 })).toBe(current)
  })

  it('keeps untouched entries referentially stable', () => {
    const current: PricesMap = {
      BTC: { usd: 45000, usd_24h_change: 1 },
      ETH: { usd: 3000, usd_24h_change: -1 },
    }
    const next = applyTickerUpdate(current, 'BTC', { price: 45100, priceChangePercent: 1 })
    expect(next.BTC).toEqual({ usd: 45100, usd_24h_change: 1 })
    expect(next.ETH).toBe(current.ETH)
  })
})

describe('parseDepthEvent', () => {
  it('parses and sorts raw depth payloads', () => {
    const result = parseDepthEvent(
      JSON.stringify({
        e: 'depthUpdate',
        E: 0,
        s: 'BTCUSDT',
        b: [
          ['60000', '1.5'],
          ['59980', '0.25'],
        ],
        a: [
          ['60050', '2'],
          ['60020', '0.4'],
        ],
      }),
    )
    expect(result?.bids).toEqual([
      { price: 60000, quantity: 1.5 },
      { price: 59980, quantity: 0.25 },
    ])
    expect(result?.asks).toEqual([
      { price: 60020, quantity: 0.4 },
      { price: 60050, quantity: 2 },
    ])
  })

  it('parses wrapped combined messages too', () => {
    const combined = JSON.stringify({
      stream: 'btcusdt@depth20@100ms',
      data: { b: [['60000', '1']], a: [['60010', '1']] },
    })
    expect(parseDepthEvent(combined)?.bids[0].price).toBe(60000)
  })

  it('parses partial book snapshot payloads using bids/asks keys', () => {
    // Binance recent partial-book streams (@depth20) send bids/asks, not b/a.
    const snapshot = JSON.stringify({
      lastUpdateId: 99725278729,
      bids: [
        ['79691.97000000', '3.20483000'],
        ['79691.96000000', '0.01706000'],
      ],
      asks: [
        ['79693.00000000', '1.10000000'],
        ['79694.05000000', '0.50000000'],
      ],
    })
    const result = parseDepthEvent(snapshot)
    expect(result?.bids).toEqual([
      { price: 79691.97, quantity: 3.20483 },
      { price: 79691.96, quantity: 0.01706 },
    ])
    expect(result?.asks).toEqual([
      { price: 79693, quantity: 1.1 },
      { price: 79694.05, quantity: 0.5 },
    ])
  })

  it('returns null for empty or invalid payloads', () => {
    expect(parseDepthEvent('garbage')).toBeNull()
    expect(parseDepthEvent(JSON.stringify({ b: [], a: [] }))).toBeNull()
  })
})

describe('kline parsing', () => {
  const KLINE_ROWS = [
    [1710000000000, '100', '110', '99', '105', '1000'],
    [1710000060000, '105', '115', '104', '110', '2000'],
  ]

  it('parses REST kline rows into candles in seconds', () => {
    const candles = parseKlines(KLINE_ROWS)
    expect(candles).toEqual([
      { time: 1710000000, open: 100, high: 110, low: 99, close: 105 },
      { time: 1710000060, open: 105, high: 115, low: 104, close: 110 },
    ])
  })

  it('skips malformed rows', () => {
    expect(parseKlines([[1710000000000, 'x', '110', '99', '105']])).toEqual([])
    expect(parseKlines('nope')).toEqual([])
  })

  it('parses live kline events in both raw and wrapped form', () => {
    const rawCandle = { k: { t: 1710000000000, o: '100', h: '110', l: '99', c: '105', x: false } }
    expect(parseKlineEvent(JSON.stringify(rawCandle))).toMatchObject({
      time: 1710000000,
      close: 105,
    })
    expect(
      parseKlineEvent(JSON.stringify({ stream: 'btcusdt@kline_1m', data: rawCandle })),
    ).toMatchObject({ time: 1710000000, open: 100 })
  })

  it('returns null for invalid kline events', () => {
    expect(parseKlineEvent('garbage')).toBeNull()
    expect(parseKlineEvent(JSON.stringify({ k: null }))).toBeNull()
  })
})

describe('upsertCandle', () => {
  const base: BinanceCandle[] = [
    { time: 1, open: 10, high: 12, low: 9, close: 11 },
    { time: 2, open: 11, high: 13, low: 10, close: 12 },
  ]

  it('appends a candle for a new open time', () => {
    const next = upsertCandle(base, { time: 3, open: 12, high: 14, low: 11, close: 13 })
    expect(next).toHaveLength(3)
    expect(next[2].close).toBe(13)
    expect(next[0]).toBe(base[0])
  })

  it('replaces in place when an existing candle changes', () => {
    const next = upsertCandle(base, { time: 2, open: 11, high: 13, low: 10, close: 14 })
    expect(next).toHaveLength(2)
    expect(next[1].close).toBe(14)
    expect(next[0]).toBe(base[0])
  })

  it('returns the same array when nothing changed', () => {
    expect(upsertCandle(base, base[0])).toBe(base)
  })
})