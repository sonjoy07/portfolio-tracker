import { beforeEach, describe, expect, it } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { useOrderBook } from '../hooks/useOrderBook'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 0
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close(code?: number, reason?: string): void {
    this.readyState = 3
    this.onclose?.({ code, reason })
  }

  open(): void {
    this.readyState = 1
    this.onopen?.({})
  }

  message(data: string): void {
    this.onmessage?.({ data })
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
})

describe('useOrderBook', () => {
  it('tracks connection status', async () => {
    const { result, unmount } = renderHook(() => useOrderBook('BTCUSDT'))
    expect(result.current.connectionStatus).toBe('connecting')

    await act(async () => {
      MockWebSocket.instances[0].open()
    })
    expect(result.current.connectionStatus).toBe('open')

    await act(async () => {
      MockWebSocket.instances[0].close()
    })
    expect(result.current.connectionStatus).toBe('reconnecting')

    unmount()
  })

  it('parses depth updates into sorted bids and asks', async () => {
    const { result } = renderHook(() => useOrderBook('BTCUSDT'))

    await act(async () => {
      MockWebSocket.instances[0].open()
      MockWebSocket.instances[0].message(
        JSON.stringify({
          lastUpdateId: 99725278729,
          bids: [
            ['79691.97000000', '3.20483000'],
            ['79691.96000000', '0.01706000'],
          ],
          asks: [
            ['79693.00000000', '1.10000000'],
            ['79694.05000000', '0.50000000'],
          ],
        }),
      )
    })

    expect(result.current.bids).toEqual([
      { price: 79691.97, quantity: 3.20483 },
      { price: 79691.96, quantity: 0.01706 },
    ])
    expect(result.current.asks.map((level) => level.price)).toEqual([79693, 79694.05])
  })
})