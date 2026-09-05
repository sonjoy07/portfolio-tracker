import { beforeEach, describe, expect, it } from '@jest/globals'
import { renderHook } from '@testing-library/react'
import { useAlertWatcher } from './useAlertWatcher'
import { useAlertStore } from '../store/alertStore'
import { useMarketStore } from '../store/marketStore'

function setPrice(usd: number) {
  useMarketStore.setState({ prices: { BTC: { usd, usd_24h_change: 0 } } })
}

beforeEach(() => {
  localStorage.clear()
  useAlertStore.setState({ alerts: [], toasts: [], dialogCoinId: null })
  useMarketStore.setState({
    prices: {},
    history: [],
    connectionStatus: 'open',
    reconnectAttempt: 0,
    lastUpdated: Date.now(),
    retryNonce: 0,
    selectedCoinId: 'BTC',
  })
})

describe('useAlertWatcher', () => {
  it('fires a toast and removes the alert when price crosses above', () => {
    renderHook(() => useAlertWatcher())
    useAlertStore.getState().addAlert({ coinId: 'BTC', targetPrice: 80_000, direction: 'above' })

    setPrice(79_000)
    expect(useAlertStore.getState().alerts).toHaveLength(1)
    expect(useAlertStore.getState().toasts).toHaveLength(0)

    setPrice(80_100)
    expect(useAlertStore.getState().alerts).toHaveLength(0)
    const [toast] = useAlertStore.getState().toasts
    expect(toast.title).toBe('BTC price alert')
    expect(toast.message).toContain('rose above')
  })

  it('fires when price crosses below', () => {
    renderHook(() => useAlertWatcher())
    useAlertStore.getState().addAlert({ coinId: 'BTC', targetPrice: 80_000, direction: 'below' })

    setPrice(80_100)
    setPrice(79_900)
    expect(useAlertStore.getState().alerts).toHaveLength(0)
    expect(useAlertStore.getState().toasts[0].message).toContain('fell below')
  })

  it('ignores ticks for coins without alerts', () => {
    renderHook(() => useAlertWatcher())
    setPrice(80_100)
    setPrice(79_900)
    expect(useAlertStore.getState().toasts).toHaveLength(0)
  })
})
