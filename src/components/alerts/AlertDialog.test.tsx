import { beforeEach, describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertDialog } from './AlertDialog'
import { useAlertStore } from '../../store/alertStore'
import { useMarketStore } from '../../store/marketStore'

beforeEach(() => {
  localStorage.clear()
  useAlertStore.setState({ alerts: [], toasts: [], dialogCoinId: null })
  useMarketStore.setState({
    prices: { BTC: { usd: 79_000, usd_24h_change: 1 } },
    history: [],
    connectionStatus: 'open',
    reconnectAttempt: 0,
    lastUpdated: Date.now(),
    retryNonce: 0,
    selectedCoinId: 'BTC',
  })
})

describe('AlertDialog', () => {
  it('renders nothing when closed', () => {
    render(<AlertDialog />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('prefills the live price and saves an alert', async () => {
    const user = userEvent.setup()
    useAlertStore.getState().openDialog('BTC')
    render(<AlertDialog />)

    const input = screen.getByLabelText(/notify when price/i)
    expect(input).toHaveValue(79_000)

    await user.clear(input)
    await user.type(input, '80000')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const { alerts, dialogCoinId } = useAlertStore.getState()
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ coinId: 'BTC', targetPrice: 80_000, direction: 'above' })
    expect(dialogCoinId).toBeNull()
  })

  it('rejects non-positive targets', async () => {
    const user = userEvent.setup()
    useAlertStore.getState().openDialog('BTC')
    render(<AlertDialog />)

    const input = screen.getByLabelText(/notify when price/i)
    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText(/greater than zero/i)).toBeInTheDocument()
    expect(useAlertStore.getState().alerts).toHaveLength(0)
  })
})
