import { Suspense, lazy, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { AlertDialog } from './components/alerts/AlertDialog'
import { Toaster } from './components/alerts/Toaster'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Skeleton } from './components/common/Skeleton'
import { CoinTransition } from './components/common/motion'
import { Header } from './components/layout/Header'
import { SummaryCards } from './components/summary/SummaryCards'
import { HoldingsTable } from './components/table/HoldingsTable'
import { PriceTicker } from './components/ticker/PriceTicker'
import { FOCUSED_COINS } from './data/coins'
import { useAlertWatcher } from './hooks/useAlertWatcher'
import { useTheme } from './hooks/useTheme'
import { startMarketStream, stopMarketStream } from './services/marketStream'
import { useMarketStore } from './store/marketStore'

// Heavy, non-critical panels are split into separate chunks so the initial
// bundle (header, ticker, summary, table) paints and hydrates first. The
// chart libraries (lightweight-charts, recharts) only download when these
// Suspense boundaries render — after first paint, while sockets connect.
const CandleChart = lazy(() =>
  import('./components/chart/CandleChart').then((module) => ({ default: module.CandleChart })),
)
const OrderBook = lazy(() =>
  import('./components/orderbook/OrderBook').then((module) => ({ default: module.OrderBook })),
)
const PortfolioChart = lazy(() =>
  import('./components/summary/PortfolioChart').then((module) => ({
    default: module.PortfolioChart,
  })),
)

function ChartPanelSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
        <Skeleton className="h-7 w-36" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

function OrderBookSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="mb-1.5 h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </div>
  )
}

function PortfolioChartSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
        />
      ))}
    </div>
  )
}

interface StatusBannerProps {
  reconnectAttempt: number
  onRetry: () => void
}

function ReconnectingBanner({ reconnectAttempt, onRetry }: StatusBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-200">
      <RefreshCw size={18} className="shrink-0 animate-spin" />
      <span>
        WebSocket disconnected — reconnecting (attempt {reconnectAttempt})…
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto shrink-0 rounded-lg border border-sky-300 px-3 py-1 text-xs font-semibold transition-colors hover:bg-sky-100 dark:border-sky-700 dark:hover:bg-sky-900"
      >
        Retry now
      </button>
    </div>
  )
}

function ConnectionErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
      <TriangleAlert size={18} className="shrink-0" />
      <span>
        Could not reach Binance after multiple attempts. Check your network connection.
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold transition-colors hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
      >
        Retry
      </button>
    </div>
  )
}

export default function App() {
  const { dark, toggleDark } = useTheme()
  const connectionStatus = useMarketStore((state) => state.connectionStatus)
  const lastUpdated = useMarketStore((state) => state.lastUpdated)
  const reconnectAttempt = useMarketStore((state) => state.reconnectAttempt)
  const selectedCoinId = useMarketStore((state) => state.selectedCoinId)
  const retryNow = useMarketStore((state) => state.retryNow)

  useEffect(() => {
    startMarketStream()
    return () => stopMarketStream()
  }, [])

  useAlertWatcher()

  const isInitialLoading = connectionStatus === 'connecting' && lastUpdated === null

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen">
      <Header dark={dark} onToggleDark={toggleDark} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {isInitialLoading && <LoadingState />}
        {connectionStatus === 'reconnecting' && (
          <ReconnectingBanner reconnectAttempt={reconnectAttempt} onRetry={retryNow} />
        )}
        {connectionStatus === 'error' && <ConnectionErrorBanner onRetry={retryNow} />}
        <ErrorBoundary label="price ticker">
          <PriceTicker coins={FOCUSED_COINS} />
        </ErrorBoundary>
        <ErrorBoundary label="summary">
          <SummaryCards />
        </ErrorBoundary>
        <div className="grid gap-6 xl:grid-cols-3">
          <CoinTransition watchKey={selectedCoinId} className="xl:col-span-2">
            <ErrorBoundary label="chart panel">
              <Suspense fallback={<ChartPanelSkeleton />}>
                <CandleChart dark={dark} />
              </Suspense>
            </ErrorBoundary>
          </CoinTransition>
          <CoinTransition watchKey={selectedCoinId}>
            <ErrorBoundary label="order book">
              <Suspense fallback={<OrderBookSkeleton />}>
                <OrderBook />
              </Suspense>
            </ErrorBoundary>
          </CoinTransition>
        </div>
        <ErrorBoundary label="portfolio chart">
          <Suspense fallback={<PortfolioChartSkeleton />}>
            <PortfolioChart />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary label="holdings table">
          <HoldingsTable />
        </ErrorBoundary>
      </main>
      <Toaster />
      <AlertDialog />
    </div>
    </MotionConfig>
  )
}