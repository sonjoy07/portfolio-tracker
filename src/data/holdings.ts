import type { Holding } from '../types'

/**
 * Mock portfolio: 20 positions sized like a believable real portfolio
 * (~$69k total). Average buy prices were calibrated against live Binance
 * prices (Sep 2026) so the mix is realistic — 10 winners, 10 losers,
 * overall gain ≈ +3–4%, comfortably inside the −10%…+20% band even as
 * live prices drift a few percent either way.
 *
 * Per-coin unrealized gain at calibration time is noted for reference:
 *   BTC +12% · ETH −8% · SOL +22% · BNB +5% · XRP −15% · DOGE +30%
 *   ADA −25% · TRX +18% · AVAX −18% · LINK +9% · DOT −22% · LTC +3%
 *   BCH −6% · NEAR +14% · ARB −30% · OP −12% · SUI +26% · ATOM −10%
 *   ETC +6% · XLM +11%
 */
export const HOLDINGS: Holding[] = [
  { coinId: 'BTC', quantity: 0.35, avgBuyPrice: 71168 },
  { coinId: 'ETH', quantity: 4.2, avgBuyPrice: 2670.24 },
  { coinId: 'SOL', quantity: 28, avgBuyPrice: 84 },
  { coinId: 'BNB', quantity: 6, avgBuyPrice: 698.51 },
  { coinId: 'XRP', quantity: 3200, avgBuyPrice: 1.6527 },
  { coinId: 'DOGE', quantity: 22000, avgBuyPrice: 0.06591 },
  { coinId: 'ADA', quantity: 6500, avgBuyPrice: 0.2853 },
  { coinId: 'TRX', quantity: 8000, avgBuyPrice: 0.2818 },
  { coinId: 'AVAX', quantity: 120, avgBuyPrice: 9.183 },
  { coinId: 'LINK', quantity: 150, avgBuyPrice: 10.78 },
  { coinId: 'DOT', quantity: 900, avgBuyPrice: 1.164 },
  { coinId: 'LTC', quantity: 22, avgBuyPrice: 52.75 },
  { coinId: 'BCH', quantity: 3.5, avgBuyPrice: 268.94 },
  { coinId: 'NEAR', quantity: 700, avgBuyPrice: 1.966 },
  { coinId: 'ARB', quantity: 4500, avgBuyPrice: 0.1909 },
  { coinId: 'OP', quantity: 3800, avgBuyPrice: 0.1151 },
  { coinId: 'SUI', quantity: 1800, avgBuyPrice: 0.624 },
  { coinId: 'ATOM', quantity: 600, avgBuyPrice: 1.728 },
  { coinId: 'ETC', quantity: 90, avgBuyPrice: 7.292 },
  { coinId: 'XLM', quantity: 9000, avgBuyPrice: 0.165 },
]

export const HOLDING_BY_COIN: Record<string, Holding> = Object.fromEntries(
  HOLDINGS.map((holding) => [holding.coinId, holding]),
)
