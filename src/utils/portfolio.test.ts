import { describe, expect, it } from '@jest/globals'
import type { Holding } from '../types'
import { computePortfolioMetrics, computePortfolioValue } from './portfolio'

const BTC: Holding = { coinId: 'BTC', quantity: 2, avgBuyPrice: 40_000 }
const ETH: Holding = { coinId: 'ETH', quantity: 10, avgBuyPrice: 2_500 }

describe('portfolio math', () => {
  it('computes total value, cost, gain and gain pct', () => {
    const result = computePortfolioMetrics([BTC, ETH], {
      BTC: { usd: 44_000, usd_24h_change: 2 },
      ETH: { usd: 3_000, usd_24h_change: -1 },
    })

    expect(result.totalValue).toBe(2 * 44_000 + 10 * 3_000)
    expect(result.totalCost).toBe(2 * 40_000 + 10 * 2_500)
    expect(result.totalGainLoss).toBe(118_000 - 105_000)
    expect(result.totalGainLossPct).toBeCloseTo((13_000 / 105_000) * 100, 6)
  })

  it('ignores holdings without a live price', () => {
    const metrics = computePortfolioMetrics([BTC, ETH], {
      BTC: { usd: 44_000, usd_24h_change: 0 },
    })
    expect(metrics.totalValue).toBe(88_000)
    expect(metrics.totalCost).toBe(80_000)

    const value = computePortfolioValue([BTC, ETH], {})
    expect(value).toBe(0)
  })

  it('returns zeros for an empty portfolio', () => {
    expect(computePortfolioMetrics([], {})).toEqual({
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPct: 0,
    })
  })
})