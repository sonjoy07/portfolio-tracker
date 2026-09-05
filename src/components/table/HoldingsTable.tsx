import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react'
import { COIN_BY_ID } from '../../data/coins'
import { HOLDING_BY_COIN, HOLDINGS } from '../../data/holdings'
import { useMarketStore } from '../../store/marketStore'
import { filterHoldings, sortHoldingIds } from '../../utils/holdingsSort'
import type { HoldingsSortDir, HoldingsSortKey } from '../../utils/holdingsSort'
import { HoldingsTableRow } from './HoldingsTableRow'

type SortKey = HoldingsSortKey
type SortDir = HoldingsSortDir

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; width: string }[] = [
  { key: 'name', label: 'Coin', align: 'left', width: '22%' },
  { key: 'price', label: 'Current Price', align: 'right', width: '15%' },
  { key: 'change24h', label: '24h Change', align: 'right', width: '12%' },
  { key: 'holdings', label: 'Holdings', align: 'right', width: '12%' },
  { key: 'value', label: 'Current Value', align: 'right', width: '16%' },
  { key: 'gainLoss', label: 'Total Gain / Loss', align: 'right', width: '23%' },
]

const ROW_HEIGHT = 56
const TABLE_MIN_WIDTH = 760

interface VirtualRowProps {
  coinId: string
  start: number
}

const VirtualRow = memo(function VirtualRow({ coinId, start }: VirtualRowProps) {
  return (
    <HoldingsTableRow
      coin={COIN_BY_ID[coinId]}
      holding={HOLDING_BY_COIN[coinId]}
      virtualY={start}
    />
  )
})

export function HoldingsTable() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const parentRef = useRef<HTMLDivElement | null>(null)
const prices = useMarketStore((state) => state.prices)
  const holdings = HOLDINGS

  const filteredHoldings = useMemo(
    () => filterHoldings(holdings, query, COIN_BY_ID),
    [query, holdings],
  )

  const sortedCoinIds = useMemo(
    () => sortHoldingIds(filteredHoldings, prices, sortKey, sortDir, COIN_BY_ID),
    [filteredHoldings, sortKey, sortDir, prices],
  )

  // oxlint-disable-next-line react/incompatible-library -- useVirtualizer is intentionally not React-Compiler-memoized; we memoize rows ourselves.
  const virtualizer = useVirtualizer({
    count: sortedCoinIds.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    getItemKey: useCallback((index: number) => sortedCoinIds[index], [sortedCoinIds]),
  })

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 })
  }, [query])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold">Holdings</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {sortedCoinIds.length.toLocaleString()} assets · virtualized rows · live prices
          </p>
        </div>
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by coin name…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:w-64 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <div ref={parentRef} className="max-h-[560px] overflow-auto">
        <table
          className="w-full border-separate border-spacing-0 text-left text-sm"
          style={{ minWidth: TABLE_MIN_WIDTH, tableLayout: 'fixed' }}
        >
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/95 dark:text-slate-400">
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`group inline-flex items-center gap-1 transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
                      column.align === 'right' ? 'w-full flex-row-reverse justify-end' : ''
                    }`}
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown
                        size={12}
                        className="text-slate-300 group-hover:text-slate-400 dark:text-slate-600"
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ position: 'relative', height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <VirtualRow
                key={virtualItem.key}
                coinId={sortedCoinIds[virtualItem.index]}
                start={virtualItem.start}
              />
            ))}
            {sortedCoinIds.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No holdings match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}