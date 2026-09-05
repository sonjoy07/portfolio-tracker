import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { AlertDialog } from './components/alerts/AlertDialog'
import { Toaster } from './components/alerts/Toaster'
import { CandleChart } from './components/chart/CandleChart'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { CoinTransition } from './components/common/motion'
import { Header } from './components/layout/Header'
import { OrderBook } from './components/orderbook/OrderBook'
import { SummaryCards } from './components/summary/SummaryCards'
import { PortfolioChart } from './components/summary/PortfolioChart'
import { HoldingsTable } from './components/table/HoldingsTable'
import { PriceTicker } from './components/ticker/PriceTicker'
import { FOCUSED_COINS } from './data/coins'
import { useAlertWatcher } from './hooks/useAlertWatcher'
import { useTheme } from './hooks/useTheme'
import { startMarketStream, stopMarketStream } from './services/marketStream'
import { useMarketStore } from './store/marketStore'

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
              <CandleChart dark={dark} />
            </ErrorBoundary>
          </CoinTransition>
          <CoinTransition watchKey={selectedCoinId}>
            <ErrorBoundary label="order book">
              <OrderBook />
            </ErrorBoundary>
          </CoinTransition>
        </div>
        <ErrorBoundary label="portfolio chart">
          <PortfolioChart />
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