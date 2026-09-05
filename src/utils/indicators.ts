import type { BinanceCandle } from '../types/binance'

export interface SmaPoint {
  time: number
  value: number
}

export function computeSMA(
  candles: readonly BinanceCandle[],
  period: number,
): SmaPoint[] {
  if (period <= 0 || candles.length < period) return []
  const result: SmaPoint[] = []
  let sum = 0
  for (let i = 0; i < period - 1; i += 1) sum += candles[i].close
  for (let i = period - 1; i < candles.length; i += 1) {
    sum += candles[i].close
    result.push({ time: candles[i].time, value: sum / period })
    sum -= candles[i - (period - 1)].close
  }
  return result
}