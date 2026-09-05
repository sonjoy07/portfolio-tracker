import { create } from 'zustand'

export type AlertDirection = 'above' | 'below'

export interface PriceAlert {
  id: string
  coinId: string
  targetPrice: number
  direction: AlertDirection
  createdAt: number
}

export interface AlertToast {
  id: string
  coinId: string
  title: string
  message: string
}

interface AddAlertInput {
  coinId: string
  targetPrice: number
  direction: AlertDirection
}

interface AlertState {
  alerts: PriceAlert[]
  toasts: AlertToast[]
  dialogCoinId: string | null
  addAlert: (input: AddAlertInput) => PriceAlert
  removeAlert: (id: string) => void
  clearAlerts: () => void
  openDialog: (coinId: string) => void
  closeDialog: () => void
  pushToast: (input: Omit<AlertToast, 'id'>) => void
  dismissToast: (id: string) => void
}

const STORAGE_KEY = 'portfolio-price-alerts'

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is PriceAlert =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as PriceAlert).id === 'string' &&
        typeof (item as PriceAlert).coinId === 'string' &&
        Number.isFinite((item as PriceAlert).targetPrice) &&
        ((item as PriceAlert).direction === 'above' ||
          (item as PriceAlert).direction === 'below'),
    )
  } catch {
    return []
  }
}

function saveAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
  } catch {
    // Storage may be unavailable (private mode, SSR) — alerts still work in memory.
  }
}

/**
 * Price alerts live in their own store so the hot market-data path stays
 * untouched. Alerts persist to localStorage; toasts and dialog state are
 * intentionally session-only.
 */
export const useAlertStore = create<AlertState>((set) => ({
  alerts: loadAlerts(),
  toasts: [],
  dialogCoinId: null,

  addAlert: (input) => {
    const alert: PriceAlert = { ...input, id: createId(), createdAt: Date.now() }
    set((state) => {
      const alerts = [...state.alerts, alert]
      saveAlerts(alerts)
      return { alerts }
    })
    return alert
  },
  removeAlert: (id) =>
    set((state) => {
      const alerts = state.alerts.filter((alert) => alert.id !== id)
      saveAlerts(alerts)
      return { alerts }
    }),
  clearAlerts: () => {
    saveAlerts([])
    set({ alerts: [] })
  },
  openDialog: (dialogCoinId) => set({ dialogCoinId }),
  closeDialog: () => set({ dialogCoinId: null }),
  pushToast: (input) =>
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { ...input, id: createId() }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
