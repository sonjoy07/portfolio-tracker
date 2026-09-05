import { describe, expect, it } from '@jest/globals'
import type { BinanceCandle } from '../types/binance'
import { computeSMA } from './indicators'

function candles(...closes: number[]): BinanceCandle[] {
  return closes.map((close, index) => ({
    time: index + 1,
    open: close,
    high: close,
    low: close,
    close,
  }))
}

describe('computeSMA', () => {
  it('computes a rolling window average', () => {
    const result = computeSMA(candles(1, 2, 3, 4, 5), 3)
    expect(result).toEqual([
      { time: 3, value: 2 },
      { time: 4, value: 3 },
      { time: 5, value: 4 },
    ])
  })

  it('returns an empty array when data is shorter than the period', () => {
    expect(computeSMA(candles(1, 2), 5)).toEqual([])
    expect(computeSMA(candles(1, 2), 0)).toEqual([])
  })
})