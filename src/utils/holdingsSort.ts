import type { CoinInfo, Holding, PricesMap } from '../types'

export type HoldingsSortKey = 'name' | 'price' | 'change24h' | 'holdings' | 'value' | 'gainLoss'
export type HoldingsSortDir = 'asc' | 'desc'

export function filterHoldings(
  holdings: readonly Holding[],
  query: string,
  coinById: Record<string, CoinInfo>,
): Holding[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...holdings]
  return holdings.filter((holding) => {
    const coin = coinById[holding.coinId]
    return coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q)
  })
}

export function sortHoldingIds(
  holdings: readonly Holding[],
  prices: PricesMap,
  sortKey: HoldingsSortKey,
  sortDir: HoldingsSortDir,
  coinById: Record<string, CoinInfo>,
): string[] {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...holdings]
    .sort((a, b) => {
      const pa = prices[a.coinId]
      const pb = prices[b.coinId]
      const aName = coinById[a.coinId].symbol
      const bName = coinById[b.coinId].symbol
      let diff = 0
      switch (sortKey) {
        case 'name':
          diff = aName.localeCompare(bName)
          break
        case 'price':
          diff = (pa ? pa.usd : -1) - (pb ? pb.usd : -1)
          break
        case 'change24h':
          diff = (pa ? pa.usd_24h_change : -Infinity) - (pb ? pb.usd_24h_change : -Infinity)
          break
        case 'holdings':
          diff = a.quantity - b.quantity
          break
        case 'value':
          diff = (pa ? a.quantity * pa.usd : 0) - (pb ? b.quantity * pb.usd : 0)
          break
        case 'gainLoss':
          diff =
            (pa ? (pa.usd - a.avgBuyPrice) * a.quantity : 0) -
            (pb ? (pb.usd - b.avgBuyPrice) * b.quantity : 0)
          break
      }
      return diff !== 0 ? dir * diff : a.coinId.localeCompare(b.coinId)
    })
    .map((holding) => holding.coinId)
}