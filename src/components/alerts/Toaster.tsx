import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, X } from 'lucide-react'
import type { AlertToast } from '../../store/alertStore'
import { useAlertStore } from '../../store/alertStore'
import { useMarketStore } from '../../store/marketStore'

const TOAST_LIFETIME_MS = 6000

function ToastItem({ toast }: { toast: AlertToast }) {
  const dismissToast = useAlertStore((state) => state.dismissToast)
  const setSelectedCoinId = useMarketStore((state) => state.setSelectedCoinId)

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_LIFETIME_MS)
    return () => clearTimeout(timer)
  }, [toast.id, dismissToast])

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-white p-3 shadow-lg dark:border-amber-700/50 dark:bg-slate-900"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <BellRing size={16} />
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => {
          setSelectedCoinId(toast.coinId)
          dismissToast(toast.id)
        }}
        title="Jump to this coin's chart"
      >
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>
      </button>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useAlertStore((state) => state.toasts)
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
