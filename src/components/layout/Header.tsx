import { memo } from 'react'
import type { ReactNode } from 'react'
import { Loader2, Moon, Sun, Wallet } from 'lucide-react'
import { AlertsPanel } from '../alerts/AlertsPanel'
import { useMarketStore } from '../../store/marketStore'
import { formatTime } from '../../utils/format'

interface HeaderProps {
  dark: boolean
  onToggleDark: () => void
}

const STATUS_STYLE: Record<string, string> = {
  error: 'bg-rose-500',
  open: 'bg-emerald-500',
  reconnecting: 'bg-amber-400',
  connecting: 'bg-slate-400',
}

export const Header = memo(function Header({ dark, onToggleDark }: HeaderProps) {
  const connectionStatus = useMarketStore((state) => state.connectionStatus)
  const reconnectAttempt = useMarketStore((state) => state.reconnectAttempt)
  const lastUpdated = useMarketStore((state) => state.lastUpdated)

  let stateLabel: ReactNode
  if (connectionStatus === 'open' && lastUpdated) {
    stateLabel = `Live · last update ${formatTime(lastUpdated)}`
  } else if (connectionStatus === 'reconnecting') {
    stateLabel = (
      <>
        <Loader2 size={12} className="shrink-0 animate-spin" aria-hidden />
        Reconnecting… (attempt {reconnectAttempt})
      </>
    )
  } else if (connectionStatus === 'error') {
    stateLabel = 'Offline — check connection'
  } else {
    stateLabel = (
      <>
        <Loader2 size={12} className="shrink-0 animate-spin" aria-hidden />
        Connecting to Binance…
      </>
    )
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              Real-Time Portfolio Tracker
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[connectionStatus]}`}
                aria-hidden
              />
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                {stateLabel}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AlertsPanel />
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  )
})