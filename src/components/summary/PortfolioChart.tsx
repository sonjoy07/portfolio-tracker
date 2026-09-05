import { memo, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMarketStore } from '../../store/marketStore'
import { formatCurrency, formatTime } from '../../utils/format'

export const PortfolioChart = memo(function PortfolioChart() {
  const history = useMarketStore((state) => state.history)
  const data = useMemo(
    () =>
      history.map((point) => ({
        time: formatTime(point.timestamp),
        value: point.value,
      })),
    [history],
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Portfolio Value Over Time</h2>
        <span className="text-xs text-slate-400">Live session · Binance WS stream</span>
      </div>
      <div className="relative h-72">
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Collecting live session data…
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              className="text-slate-400"
            />
            <YAxis
              width={88}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
              className="text-slate-400"
            />
            <Tooltip
              cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
              formatter={(value) => [formatCurrency(Number(value)), 'Value']}
              labelFormatter={(label) => `Time: ${label}`}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#portfolioValueFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
})