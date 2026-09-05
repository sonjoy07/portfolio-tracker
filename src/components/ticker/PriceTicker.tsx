import { memo } from 'react'
import { PricePulse } from '../common/motion'
import { usePriceFlash } from '../../hooks/usePriceFlash'
import { useMarketStore } from '../../store/marketStore'
import type { CoinInfo } from '../../types'
import { formatCurrency, formatPercent } from '../../utils/format'

interface TickerItemProps {
  coin: CoinInfo
}

const TickerItem = memo(function TickerItem({ coin }: TickerItemProps) {
  const price = useMarketStore((state) => state.prices[coin.id])
  const flashStyle = usePriceFlash(price)

  if (!price) {
    return (
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-3"
        title="No data available"
      >
        <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="text-sm font-semibold">{coin.symbol}</span>
        <span className="text-xs text-slate-400">No data</span>
      </div>
    )
  }

  const up = price.usd_24h_change >= 0

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-r border-slate-100 px-4 py-3 last:border-r-0 dark:border-slate-800"
      style={flashStyle}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[9px] font-bold text-white">
        {coin.symbol.slice(0, 1)}
      </span>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {coin.symbol}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        <PricePulse tickKey={price.usd}>{formatCurrency(price.usd)}</PricePulse>
      </span>
      <span
        className={`text-xs font-medium tabular-nums ${up ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        {up ? '▲' : '▼'} {formatPercent(price.usd_24h_change, true)}
      </span>
    </div>
  )
})

interface PriceTickerProps {
  coins: CoinInfo[]
}

export const PriceTicker = memo(function PriceTicker({ coins }: PriceTickerProps) {
  return (
    <section className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {coins.map((coin) => (
        <TickerItem key={coin.id} coin={coin} />
      ))}
    </section>
  )
})