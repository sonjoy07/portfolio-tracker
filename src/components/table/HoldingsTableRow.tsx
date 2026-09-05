import { memo } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellRing } from 'lucide-react'
import { NoData } from '../common/NoData'
import { PricePulse } from '../common/motion'
import { useAlertStore } from '../../store/alertStore'
import { usePriceFlash } from '../../hooks/usePriceFlash'
import { useMarketStore } from '../../store/marketStore'
import type { CoinInfo, Holding } from '../../types'
import { formatCurrency, formatNumber, formatPercent } from '../../utils/format'

interface HoldingsTableRowProps {
  coin: CoinInfo
  holding: Holding
  /** Absolute-list offset for virtualized rows; animates on sort/reorder. */
  virtualY?: number
}

export const HoldingsTableRow = memo(function HoldingsTableRow({
  coin,
  holding,
  virtualY,
}: HoldingsTableRowProps) {
  const price = useMarketStore((state) => state.prices[coin.id])
  const alertCount = useAlertStore(
    (state) => state.alerts.filter((alert) => alert.coinId === coin.id).length,
  )
  const openDialog = useAlertStore((state) => state.openDialog)
  const flashStyle = usePriceFlash(price)

  const currentValue = price ? holding.quantity * price.usd : null
  const gainLoss = price ? (price.usd - holding.avgBuyPrice) * holding.quantity : null
  const gainLossPct = price ? ((price.usd - holding.avgBuyPrice) / holding.avgBuyPrice) * 100 : null

  return (
    <motion.tr
      initial={false}
      animate={virtualY === undefined ? undefined : { y: virtualY }}
      transition={{ type: 'spring', stiffness: 550, damping: 42 }}
      className="border-b border-slate-100 bg-white transition-colors last:border-b-0 dark:border-slate-800 dark:bg-slate-900"
      style={{
        ...(virtualY === undefined
          ? undefined
          : { position: 'absolute', top: 0, left: 0, width: '100%' }),
        ...flashStyle,
      }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
            {coin.symbol.slice(0, 1)}
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">{coin.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{coin.symbol}</div>
          </div>
          <button
            type="button"
            onClick={() => openDialog(coin.id)}
            aria-label={
              alertCount > 0
                ? `Manage ${coin.symbol} price alerts (${alertCount} active)`
                : `Set price alert for ${coin.symbol}`
            }
            title={alertCount > 0 ? `${alertCount} active alert${alertCount > 1 ? 's' : ''}` : 'Set price alert'}
            className={`relative ml-auto shrink-0 rounded-lg p-1.5 transition-colors ${
              alertCount > 0
                ? 'text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
                : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {alertCount > 0 ? <BellRing size={15} /> : <Bell size={15} />}
            {alertCount > 1 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">
        {price ? (
          <PricePulse tickKey={price.usd}>
            <span className="font-medium">{formatCurrency(price.usd)}</span>
          </PricePulse>
        ) : (
          <NoData />
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">
        {price ? (
          <span
            className={`font-medium ${
              price.usd_24h_change >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {price.usd_24h_change >= 0 ? '▲' : '▼'} {formatPercent(price.usd_24h_change, true)}
          </span>
        ) : (
          <NoData />
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
        {formatNumber(holding.quantity)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">
        {currentValue !== null ? (
          formatCurrency(currentValue)
        ) : (
          <NoData />
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">
        {gainLoss !== null ? (
          <span
            className={`font-semibold ${
              gainLoss >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {gainLoss >= 0 ? '+' : ''}
            {formatCurrency(gainLoss)}
            <span className="ml-1 text-xs font-normal opacity-80">
              ({gainLossPct !== null ? formatPercent(gainLossPct, true) : '—'})
            </span>
          </span>
        ) : (
          <NoData />
        )}
      </td>
    </motion.tr>
  )
})