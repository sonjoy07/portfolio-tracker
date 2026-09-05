import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellPlus, Trash2, X } from 'lucide-react'
import { COIN_BY_ID } from '../../data/coins'
import type { AlertDirection } from '../../store/alertStore'
import { useAlertStore } from '../../store/alertStore'
import { useMarketStore } from '../../store/marketStore'
import { formatCurrency } from '../../utils/format'
import { requestNotificationPermission } from '../../utils/notify'

function roundForInput(value: number): string {
  if (value >= 1000) return String(Math.round(value))
  if (value >= 10) return String(Math.round(value * 100) / 100)
  return String(Math.round(value * 10000) / 10000)
}

/**
 * Modal for creating a price alert on one coin. The target prefills with
 * the live price and the direction defaults to "rises above"; the coin's
 * existing alerts are listed with one-click removal.
 *
 * The body is keyed by coin so opening the dialog always mounts fresh form
 * state — no reset effects needed.
 */
export function AlertDialog() {
  const dialogCoinId = useAlertStore((state) => state.dialogCoinId)
  return (
    <AnimatePresence>
      {dialogCoinId && <DialogBody key={dialogCoinId} coinId={dialogCoinId} />}
    </AnimatePresence>
  )
}

function DialogBody({ coinId }: { coinId: string }) {
  const closeDialog = useAlertStore((state) => state.closeDialog)
  const addAlert = useAlertStore((state) => state.addAlert)
  const removeAlert = useAlertStore((state) => state.removeAlert)
  const alerts = useAlertStore((state) => state.alerts)
  const livePrice = useMarketStore((state) => state.prices[coinId]?.usd)

  const [target, setTarget] = useState(() =>
    livePrice !== undefined ? roundForInput(livePrice) : '',
  )
  const [direction, setDirection] = useState<AlertDirection>('above')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDialog])

  const coin = COIN_BY_ID[coinId]
  const existing = alerts.filter((alert) => alert.coinId === coinId)

  const save = () => {
    const value = Number(target)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a target price greater than zero.')
      return
    }
    addAlert({ coinId, targetPrice: value, direction })
    void requestNotificationPermission()
    closeDialog()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={closeDialog}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Set price alert for ${coin?.symbol ?? coinId}`}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <BellPlus size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                Alert · {coin ? `${coin.name} (${coin.symbol})` : coinId}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {livePrice !== undefined
                  ? `Live price ${formatCurrency(livePrice)}`
                  : 'Waiting for live price…'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Close alert dialog"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        <label
          htmlFor="alert-target"
          className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Notify when price
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['above', 'below'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDirection(option)}
              aria-pressed={direction === option}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                direction === option
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {option === 'above' ? 'Rises above' : 'Falls below'}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            id="alert-target"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="0.00"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={save}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
        <p className="mt-2 text-xs text-slate-400">
          One-shot alert — it fires once, then is removed. Browser notifications need
          permission, granted when you save.
        </p>

        {existing.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Active for {coin?.symbol}
            </p>
            <ul className="mt-2 space-y-1.5">
              {existing.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
                >
                  <span className="tabular-nums">
                    {alert.direction === 'above' ? '≥' : '≤'} {formatCurrency(alert.targetPrice)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAlert(alert.id)}
                    aria-label={`Remove ${coin?.symbol} alert at ${formatCurrency(alert.targetPrice)}`}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
