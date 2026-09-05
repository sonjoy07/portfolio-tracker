import { memo, useMemo } from 'react'
import { COIN_BY_ID, PORTFOLIO_COINS } from '../../data/coins'
import { SkeletonRows } from '../common/Skeleton'
import { useOrderBook } from '../../hooks/useOrderBook'
import { useMarketStore } from '../../store/marketStore'
import { binanceSymbol } from '../../services/binance'
import type { DepthLevel } from '../../types/binance'
import { formatNumber } from '../../utils/format'

function ColumnRow({ level, maxQty, tone }: { level: DepthLevel; maxQty: number; tone: 'bid' | 'ask' }) {
  const widthPct = maxQty > 0 ? Math.max(8, (level.quantity / maxQty) * 100) : 8
  return (
    <div className="relative flex items-center justify-between px-3 py-1 text-sm tabular-nums">
      <span
        className="absolute inset-y-0 right-0 rounded-sm"
        style={{
          width: `${widthPct}%`,
          backgroundColor: tone === 'bid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
        }}
      />
      <span
        className={
          tone === 'bid'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }
      >
        {level.price.toLocaleString('en-US', { maximumFractionDigits: 4 })}
      </span>
      <span className="text-slate-600 dark:text-slate-300">{formatNumber(level.quantity)}</span>
    </div>
  )
}

export const OrderBook = memo(function OrderBook() {
  const selectedCoinId = useMarketStore((state) => state.selectedCoinId)
  const setSelectedCoinId = useMarketStore((state) => state.setSelectedCoinId)
  const selectedCoin = COIN_BY_ID[selectedCoinId]
  const { bids, asks, connectionStatus } = useOrderBook(
    selectedCoin ? binanceSymbol(selectedCoin.symbol) : 'BTCUSDT',
  )

  const maxBidQty = useMemo(
    () => (bids.length ? Math.max(...bids.map((level) => level.quantity)) : 1),
    [bids],
  )
  const maxAskQty = useMemo(
    () => (asks.length ? Math.max(...asks.map((level) => level.quantity)) : 1),
    [asks],
  )

  const bestBid = bids.length ? bids[0].price : null
  const bestAsk = asks.length ? asks[0].price : null
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null
  const mid = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold">Order Book</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {selectedCoin ? `${binanceSymbol(selectedCoin.symbol)} · depth 20` : 'Select a pair'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {spread !== null && mid !== null && (
            <div className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              <span className="font-semibold">Mid {formatNumber(mid)}</span>
              <span className="ml-2">Spread {formatNumber(spread)}</span>
            </div>
          )}
          <span
            className={`h-2 w-2 rounded-full ${
              connectionStatus === 'open'
                ? 'bg-emerald-500'
                : connectionStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
            }`}
            aria-label={`Connection ${connectionStatus}`}
          />
          <select
            value={selectedCoinId}
            onChange={(event) => setSelectedCoinId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
          >
            {PORTFOLIO_COINS.map((coin) => (
              <option key={coin.id} value={coin.id}>
                {coin.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
            <span>Bids</span>
            <span>Qty</span>
          </div>
          <div className="py-1">
            {bids.length === 0 ? (
              <SkeletonRows rows={8} />
            ) : (
              bids.map((level) => (
                <ColumnRow key={level.price} level={level} maxQty={maxBidQty} tone="bid" />
              ))
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 dark:border-slate-800 dark:text-rose-400">
            <span>Asks</span>
            <span>Qty</span>
          </div>
          <div className="py-1">
            {asks.length === 0 ? (
              <SkeletonRows rows={8} />
            ) : (
              asks.map((level) => (
                <ColumnRow key={level.price} level={level} maxQty={maxAskQty} tone="ask" />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
})