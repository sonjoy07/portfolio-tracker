import { create } from 'zustand'
import type { PortfolioPoint, PricesMap } from '../types'
import type { BinanceConnectionStatus } from '../types/binance'

const MAX_HISTORY_POINTS = 240

interface SelectionSlice {
  selectedCoinId: string
  setSelectedCoinId: (coinId: string) => void
}

interface MarketSlice {
  prices: PricesMap
  history: PortfolioPoint[]
  connectionStatus: BinanceConnectionStatus
  reconnectAttempt: number
  lastUpdated: number | null
  retryNonce: number
  setPrices: (prices: PricesMap, timestamp: number) => void
  appendHistoryPoint: (point: PortfolioPoint) => void
  setConnectionStatus: (status: BinanceConnectionStatus) => void
  setReconnectAttempt: (attempt: number) => void
  retryNow: () => void
}

type MarketState = MarketSlice & SelectionSlice

export const useMarketStore = create<MarketState>((set) => ({
  prices: {},
  history: [],
  connectionStatus: 'connecting',
  reconnectAttempt: 0,
  lastUpdated: null,
  retryNonce: 0,
  selectedCoinId: 'BTC',

  setPrices: (prices, timestamp) => set({ prices, lastUpdated: timestamp }),
  appendHistoryPoint: (point) =>
    set((state) => {
      const next = [...state.history, point]
      return {
        history: next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next,
      }
    }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  retryNow: () => set((state) => ({ retryNonce: state.retryNonce + 1 })),
  setSelectedCoinId: (selectedCoinId) => set({ selectedCoinId }),
}))

export const selectPrices = (state: MarketState) => state.prices
export const selectHistory = (state: MarketState) => state.history
export const selectConnectionStatus = (state: MarketState) => state.connectionStatus
export const selectSelectedCoinId = (state: MarketState) => state.selectedCoinId