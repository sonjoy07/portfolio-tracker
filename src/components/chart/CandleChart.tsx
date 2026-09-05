import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickSeries, ColorType, LineSeries, createChart } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import { COIN_BY_ID } from '../../data/coins'
import { Skeleton } from '../common/Skeleton'
import { useCandles } from '../../hooks/useCandles'
import { useMarketStore } from '../../store/marketStore'
import { binanceSymbol } from '../../services/binance'
import type { BinanceKlineInterval } from '../../types/binance'
import { formatNumber } from '../../utils/format'
import { computeSMA } from '../../utils/indicators'

interface CandleChartProps {
  dark: boolean
}

const INTERVALS: Array<{ value: BinanceKlineInterval; label: string }> = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
]

const SMA_PERIOD = 20

function themeOptions(dark: boolean) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: dark ? '#94a3b8' : '#64748b',
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.12)' },
      horzLines: { color: dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.12)' },
    },
  } as const
}

export const CandleChart = memo(function CandleChart({ dark }: CandleChartProps) {
  const [interval, setInterval] = useState<BinanceKlineInterval>('1m')
  const coinId = useMarketStore((state) => state.selectedCoinId)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const coin = COIN_BY_ID[coinId]
  const symbol = coin ? binanceSymbol(coin.symbol) : 'BTCUSDT'
  const { candles, isReady, hasError } = useCandles(symbol, interval)

  const smaPoints = useMemo(() => computeSMA(candles, SMA_PERIOD), [candles])
  const lastClose = candles.length ? candles[candles.length - 1].close : null

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      ...themeOptions(dark),
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 8 },
    })
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    })
    const smaSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    smaSeriesRef.current = smaSeries
    return () => {
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      smaSeriesRef.current = null
    }
  }, [dark])

  useEffect(() => {
    const needle = candleSeriesRef.current
    if (!needle) return
    needle.setData(
      candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    )
    smaSeriesRef.current?.setData(
      smaPoints.map((point) => ({
        time: point.time as UTCTimestamp,
        value: point.value,
      })),
    )
    chartRef.current?.timeScale().fitContent()
  }, [candles, smaPoints])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            {coin ? `${coin.symbol} / USDT` : 'Chart'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Candlestick{lastClose !== null && ` · Last ${formatNumber(lastClose)}`}
            <span className="ml-1 text-slate-400">· SMA {SMA_PERIOD}</span>
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {INTERVALS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setInterval(option.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                interval === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-80">
        <div ref={containerRef} className="absolute inset-0" />
        {candles.length === 0 && !isReady && !hasError && (
          <div className="absolute inset-0 flex flex-col justify-end gap-2 p-4">
            <Skeleton className="h-40 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        )}
        {candles.length === 0 && (hasError || isReady) && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            {hasError ? 'Could not load chart data' : 'No data available yet'}
          </div>
        )}
      </div>
    </section>
  )
})