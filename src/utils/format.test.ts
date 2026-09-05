import { describe, expect, it } from '@jest/globals'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatTime,
} from './format'

describe('format utils', () => {
  it('formats full currency', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats compact currency only for large values', () => {
    expect(formatCurrencyCompact(1200000)).toBe('$1,200,000')
    expect(formatCurrencyCompact(999)).toBe('$999.00')
  })

  it('formats numbers with adaptive precision', () => {
    expect(formatNumber(0.123456789)).toBe('0.123457')
    expect(formatNumber(1234.5)).toBe('1,234.5')
    expect(formatNumber(1_000_000)).toBe('1,000,000')
  })

  it('formats percents with optional sign', () => {
    expect(formatPercent(1.234, true)).toBe('+1.23%')
    expect(formatPercent(-0.5, true)).toBe('-0.50%')
    expect(formatPercent(2)).toBe('2.00%')
  })

  it('formats timestamps as locale time strings', () => {
    const timestamp = 123_456_789
    expect(formatTime(timestamp)).toBe(
      new Date(timestamp).toLocaleTimeString('en-US', { hour12: false }),
    )
  })
})