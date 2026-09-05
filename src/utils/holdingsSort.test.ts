import { describe, expect, it } from '@jest/globals'
import type { CoinInfo, Holding } from '../types'
import { filterHoldings, sortHoldingIds } from './holdingsSort'
import type { PricesMap } from '../types'

const COINS: Record<string, CoinInfo> = {
  BTC: { id: 'BTC', symbol: 'BTC', name: 'Bitcoin' },
  ETH: { id: 'ETH', symbol: 'ETH', name: 'Ethereum' },
  SOL: { id: 'SOL', symbol: 'SOL', name: 'Solana' },
}

const HOLDINGS: Holding[] = [
  { coinId: 'BTC', quantity: 1, avgBuyPrice: 40_000 },
  { coinId: 'ETH', quantity: 20, avgBuyPrice: 2_500 },
  { coinId: 'SOL', quantity: 100, avgBuyPrice: 50 },
]

const PRICES: PricesMap = {
  BTC: { usd: 45_000, usd_24h_change: 1 },
  ETH: { usd: 3_000, usd_24h_change: 5 },
  SOL: { usd: 60, usd_24h_change: -2 },
}

describe('filterHoldings', () => {
  it('returns all holdings for an empty query', () => {
    expect(filterHoldings(HOLDINGS, '  ', COINS)).toHaveLength(3)
  })

  it('matches by coin name case-insensitively', () => {
    expect(filterHoldings(HOLDINGS, 'bitcoin', COINS).map((h) => h.coinId)).toEqual(['BTC'])
  })

  it('matches by symbol', () => {
    expect(filterHoldings(HOLDINGS, 'sol', COINS).map((h) => h.coinId)).toEqual(['SOL'])
  })
})

describe('sortHoldingIds', () => {
  it('sorts by current value descending', () => {
    expect(sortHoldingIds(HOLDINGS, PRICES, 'value', 'desc', COINS)).toEqual([
      'ETH',
      'BTC',
      'SOL',
    ])
  })

  it('sorts by name ascending', () => {
    expect(sortHoldingIds(HOLDINGS, PRICES, 'name', 'asc', COINS)).toEqual([
      'BTC',
      'ETH',
      'SOL',
    ])
    expect(sortHoldingIds(HOLDINGS, PRICES, 'name', 'desc', COINS)).toEqual([
      'SOL',
      'ETH',
      'BTC',
    ])
  })

  it('sort by gain/loss uses average buy price', () => {
    expect(sortHoldingIds(HOLDINGS, PRICES, 'gainLoss', 'desc', COINS)).toEqual([
      'ETH',
      'BTC',
      'SOL',
    ])
  })

  it('ranks missing prices last', () => {
    const partial: PricesMap = { ETH: PRICES.ETH }
    expect(sortHoldingIds(HOLDINGS, partial, 'price', 'desc', COINS)).toEqual([
      'ETH',
      'BTC',
      'SOL',
    ])
  })
})