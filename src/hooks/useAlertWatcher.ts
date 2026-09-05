import { useEffect, useRef } from 'react'
import { COIN_BY_ID } from '../data/coins'
import { useAlertStore } from '../store/alertStore'
import { useMarketStore } from '../store/marketStore'
import type { PricesMap } from '../types'
import { checkAlertCrossed } from '../utils/alerts'
import { formatCurrency } from '../utils/format'
import { sendBrowserNotification } from '../utils/notify'

/**
 * Watches live prices and fires one-shot alerts: on the flush where a
 * price crosses its threshold we push an in-app toast, attempt a browser
 * Notification, and remove the alert so it cannot refire while the price
 * oscillates around the target.
 */
export function useAlertWatcher(): void {
  const prevRef = useRef<PricesMap>({})

  useEffect(() => {
    prevRef.current = useMarketStore.getState().prices
    return useMarketStore.subscribe((state) => {
      const prev = prevRef.current
      const curr = state.prices
      prevRef.current = curr

      const store = useAlertStore.getState()
      if (store.alerts.length === 0) return

      for (const alert of store.alerts) {
        const prevPrice = prev[alert.coinId]?.usd
        const currPrice = curr[alert.coinId]?.usd
        if (prevPrice === undefined || currPrice === undefined) continue
        if (!checkAlertCrossed(prevPrice, currPrice, alert)) continue

        store.removeAlert(alert.id)
        const symbol = COIN_BY_ID[alert.coinId]?.symbol ?? alert.coinId
        const verb = alert.direction === 'above' ? 'rose above' : 'fell below'
        const message = `${symbol} ${verb} ${formatCurrency(alert.targetPrice)} (now ${formatCurrency(currPrice)})`
        store.pushToast({ coinId: alert.coinId, title: `${symbol} price alert`, message })
        sendBrowserNotification(`${symbol} price alert`, message)
      }
    })
  }, [])
}
