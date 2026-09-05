import type { PriceAlert } from '../store/alertStore'

/**
 * True on the flush where the price crosses the alert threshold.
 * Strict on the previous side (`<` / `>`) and inclusive on the new side
 * (`>=` / `<=`) so a threshold landing exactly on the target still fires,
 * but a price resting exactly on it does not refire.
 */
export function checkAlertCrossed(
  prevPrice: number,
  currPrice: number,
  alert: PriceAlert,
): boolean {
  if (!Number.isFinite(prevPrice) || !Number.isFinite(currPrice)) return false
  if (prevPrice === currPrice) return false
  if (alert.direction === 'above') {
    return prevPrice < alert.targetPrice && currPrice >= alert.targetPrice
  }
  return prevPrice > alert.targetPrice && currPrice <= alert.targetPrice
}
