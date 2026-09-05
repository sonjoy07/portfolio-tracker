const currencyFull = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return currencyFull.format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) return currencyCompact.format(value)
  return currencyFull.format(value)
}

export function formatNumber(value: number): string {
  const maxFractionDigits = Math.abs(value) < 1 ? 6 : 2
  return value.toLocaleString('en-US', { maximumFractionDigits: maxFractionDigits })
}

export function formatPercent(value: number, withSign = false): string {
  const sign = withSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false })
}