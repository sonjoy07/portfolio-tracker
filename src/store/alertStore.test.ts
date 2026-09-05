import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { useAlertStore } from './alertStore'

beforeEach(() => {
  localStorage.clear()
  useAlertStore.setState({ alerts: [], toasts: [], dialogCoinId: null })
})

describe('alertStore', () => {
  it('adds alerts and persists them to localStorage', () => {
    const alert = useAlertStore
      .getState()
      .addAlert({ coinId: 'BTC', targetPrice: 80_000, direction: 'above' })
    expect(alert.id).toBeTruthy()
    expect(useAlertStore.getState().alerts).toHaveLength(1)

    const stored = JSON.parse(localStorage.getItem('portfolio-price-alerts') ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].coinId).toBe('BTC')
  })

  it('removes alerts and updates storage', () => {
    const first = useAlertStore
      .getState()
      .addAlert({ coinId: 'BTC', targetPrice: 80_000, direction: 'above' })
    useAlertStore.getState().addAlert({ coinId: 'ETH', targetPrice: 2000, direction: 'below' })

    useAlertStore.getState().removeAlert(first.id)
    const { alerts } = useAlertStore.getState()
    expect(alerts).toHaveLength(1)
    expect(alerts[0].coinId).toBe('ETH')
  })

  it('clears all alerts', () => {
    useAlertStore.getState().addAlert({ coinId: 'BTC', targetPrice: 80_000, direction: 'above' })
    useAlertStore.getState().clearAlerts()
    expect(useAlertStore.getState().alerts).toHaveLength(0)
  })

  it('loads only valid stored alerts on init', async () => {
    localStorage.setItem(
      'portfolio-price-alerts',
      JSON.stringify([
        { id: 'ok', coinId: 'BTC', targetPrice: 80_000, direction: 'above', createdAt: 0 },
        { id: 'bad-price', coinId: 'ETH', targetPrice: 'nope', direction: 'below' },
        { id: 'bad-dir', coinId: 'ETH', targetPrice: 2000, direction: 'sideways' },
        'not-an-object',
      ]),
    )
    jest.resetModules()
    const fresh = await import('./alertStore')
    expect(fresh.useAlertStore.getState().alerts.map((alert) => alert.id)).toEqual(['ok'])
  })

  it('pushes and dismisses toasts (capped at 3)', () => {
    const { pushToast, dismissToast } = useAlertStore.getState()
    pushToast({ coinId: 'BTC', title: 't1', message: 'm1' })
    pushToast({ coinId: 'BTC', title: 't2', message: 'm2' })
    pushToast({ coinId: 'BTC', title: 't3', message: 'm3' })
    pushToast({ coinId: 'BTC', title: 't4', message: 'm4' })
    let { toasts } = useAlertStore.getState()
    expect(toasts).toHaveLength(3)
    expect(toasts[2].title).toBe('t4')

    dismissToast(toasts[0].id)
    toasts = useAlertStore.getState().toasts
    expect(toasts).toHaveLength(2)
  })

  it('opens and closes the alert dialog', () => {
    useAlertStore.getState().openDialog('BTC')
    expect(useAlertStore.getState().dialogCoinId).toBe('BTC')
    useAlertStore.getState().closeDialog()
    expect(useAlertStore.getState().dialogCoinId).toBeNull()
  })
})
