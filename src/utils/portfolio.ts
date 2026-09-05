import type { Holding, PortfolioMetrics, PricesMap } from '../types'

export function computePortfolioMetrics(holdings: Holding[], prices: PricesMap): PortfolioMetrics {
  let totalValue = 0
  let totalCost = 0
  for (const holding of holdings) {
    const price = prices[holding.coinId]
    if (!price) continue
    totalValue += holding.quantity * price.usd
    totalCost += holding.quantity * holding.avgBuyPrice
  }
  const totalGainLoss = totalValue - totalCost
  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
  }
}

export function computePortfolioValue(holdings: Holding[], prices: PricesMap): number {
  let totalValue = 0
  for (const holding of holdings) {
    const price = prices[holding.coinId]
    if (!price) continue
    totalValue += holding.quantity * price.usd
  }
  return totalValue
}