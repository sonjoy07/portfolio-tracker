import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { PORTFOLIO_COINS } from '../../data/coins'
import { HOLDINGS } from '../../data/holdings'
import { useMarketStore } from '../../store/marketStore'
import type { CoinInfo } from '../../types'
import { computePortfolioMetrics } from '../../utils/portfolio'
import { formatCurrency, formatPercent } from '../../utils/format'

function Card({
  label,
  icon,
  main,
  sub,
}: {
  label: string
  icon: ReactNode
  main: ReactNode
  sub: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{main}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  )
}

export function SummaryCards() {
  const prices = useMarketStore((state) => state.prices)

  const metrics = useMemo(() => computePortfolioMetrics(HOLDINGS, prices), [prices])

  const performer = useMemo(() => {
    let best: { coin: CoinInfo; change: number } | null = null
    let worst: { coin: CoinInfo; change: number } | null = null
    for (const coin of PORTFOLIO_COINS) {
      const change = prices[coin.id]?.usd_24h_change
      if (change === undefined) continue
      if (!best || change > best.change) best = { coin, change }
      if (!worst || change < worst.change) worst = { coin, change }
    }
    return { best, worst }
  }, [prices])

  const positive = metrics.totalGainLoss >= 0

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Total Portfolio Value"
        icon={<Wallet size={14} />}
        main={formatCurrency(metrics.totalValue)}
        sub="Sum of all holdings at current price"
      />
      <Card
        label="Total Gain / Loss"
        icon={<TrendingUp size={14} />}
        main={
          <span
            className={
              positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }
          >
            {positive ? '+' : ''}
            {formatCurrency(metrics.totalGainLoss)}
          </span>
        }
        sub={`${formatPercent(metrics.totalGainLossPct, true)} vs. average buy price`}
      />
      <Card
        label="Best 24h Performer"
        icon={<ArrowUpRight size={14} />}
        main={
          <span className="text-emerald-600 dark:text-emerald-400">
            {performer.best ? performer.best.coin.symbol : 'No data'}
          </span>
        }
        sub={performer.best ? formatPercent(performer.best.change, true) : 'No data yet'}
      />
      <Card
        label="Worst 24h Performer"
        icon={<ArrowDownRight size={14} />}
        main={performer.worst ? performer.worst.coin.symbol : 'No data'}
        sub={performer.worst ? formatPercent(performer.worst.change, true) : 'No data yet'}
      />
    </section>
  )
}