export interface CoinInfo {
  id: string
  symbol: string
  name: string
}

export interface PriceData {
  usd: number
  usd_24h_change: number
}

export type PricesMap = Record<string, PriceData | undefined>

export interface Holding {
  coinId: string
  quantity: number
  avgBuyPrice: number
}

export interface PortfolioPoint {
  timestamp: number
  value: number
}

export interface PortfolioMetrics {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPct: number
}