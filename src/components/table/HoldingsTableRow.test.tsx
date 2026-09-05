import { beforeEach, describe, expect, it } from '@jest/globals'
import { act, render, screen } from '@testing-library/react'
import { useMarketStore } from '../../store/marketStore'
import type { CoinInfo, Holding } from '../../types'
import { HoldingsTableRow } from './HoldingsTableRow'

const COIN: CoinInfo = { id: 'BTC', symbol: 'BTC', name: 'Bitcoin' }
const HOLDING: Holding = { coinId: 'BTC', quantity: 2, avgBuyPrice: 40_000 }

function renderRow() {
  return render(
    <table>
      <tbody>
        <HoldingsTableRow coin={COIN} holding={HOLDING} />
      </tbody>
    </table>,
  )
}

beforeEach(() => {
  useMarketStore.setState({
    prices: {},
    history: [],
    connectionStatus: 'connecting',
    reconnectAttempt: 0,
    lastUpdated: null,
    retryNonce: 0,
    selectedCoinId: 'BTC',
  })
})

describe('HoldingsTableRow', () => {
  it('renders placeholders when no price is available', () => {
    renderRow()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.getAllByText('No data')).toHaveLength(4)
  })

  it('renders live price, 24h change and gain/loss', () => {
    useMarketStore.setState({
      prices: { BTC: { usd: 45_000, usd_24h_change: 1.25 } },
    })
    renderRow()

    expect(screen.getByText('$45,000.00')).toBeInTheDocument()
    expect(screen.getByText('▲ +1.25%')).toBeInTheDocument()
    expect(screen.getByText('$90,000.00')).toBeInTheDocument()
    expect(screen.getByText('(+12.50%)')).toBeInTheDocument()
  })

  it('flashes the row after its own price changes', async () => {
    renderRow()
    await act(async () => {
      useMarketStore.setState({
        prices: { BTC: { usd: 45_000, usd_24h_change: 1 } },
      })
    })
    await act(async () => {
      useMarketStore.setState({
        prices: { BTC: { usd: 45_100, usd_24h_change: 1 } },
      })
    })
    const row = screen.getByRole('row')
    expect(row).toHaveAttribute('style', expect.stringMatching(/flash-up/))
  })
})