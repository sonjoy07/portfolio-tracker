import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, Trash2, X } from 'lucide-react'
import { COIN_BY_ID } from '../../data/coins'
import { useAlertStore } from '../../store/alertStore'
import { formatCurrency } from '../../utils/format'
import { notificationPermission, requestNotificationPermission } from '../../utils/notify'

/**
 * Dropdown listing active alerts with one-click removal, plus the browser
 * notification permission control. Rendered inside the header next to the
 * dark-mode toggle.
 */
export function AlertsPanel() {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const alerts = useAlertStore((state) => state.alerts)
  const removeAlert = useAlertStore((state) => state.removeAlert)
  const clearAlerts = useAlertStore((state) => state.clearAlerts)

  const permission = notificationPermission()

  const enableNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotice(
      result === 'granted'
        ? 'Browser notifications enabled.'
        : result === 'denied'
          ? 'Browser notifications blocked — allow them in your browser settings.'
          : 'Browser notifications are not supported here.',
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          setNotice(null)
        }}
        aria-label={alerts.length ? `Price alerts (${alerts.length} active)` : 'Price alerts'}
        aria-expanded={open}
        className="relative rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell size={16} />
        {alerts.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
            {alerts.length}
          </span>
        )}
      </button>

      <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close alerts panel"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
          />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Price alerts</h2>
              <div className="flex items-center gap-1">
                {alerts.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAlerts}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close alerts panel"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {alerts.length === 0 ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                No active alerts. Use the bell icon on any holdings row to set one.
              </p>
            ) : (
              <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">
                        {COIN_BY_ID[alert.coinId]?.symbol ?? alert.coinId}
                      </span>{' '}
                      <span className="text-slate-500 dark:text-slate-400">
                        {alert.direction === 'above' ? '≥' : '≤'}{' '}
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(alert.targetPrice)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      aria-label={`Remove alert for ${COIN_BY_ID[alert.coinId]?.symbol ?? alert.coinId}`}
                      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              {permission === 'granted' ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <Bell size={12} /> Browser notifications on
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void enableNotifications()}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <BellOff size={12} /> Enable browser notifications
                </button>
              )}
              {notice && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notice}</p>}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  )
}
