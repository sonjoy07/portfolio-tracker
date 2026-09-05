import { describe, expect, it } from '@jest/globals'
import type { PriceAlert } from '../store/alertStore'
import { checkAlertCrossed } from './alerts'

function alert(direction: 'above' | 'below', targetPrice: number): PriceAlert {
  return { id: 'a1', coinId: 'BTC', targetPrice, direction, createdAt: 0 }
}

describe('checkAlertCrossed', () => {
  it('fires when price crosses above the target', () => {
    expect(checkAlertCrossed(79_000, 80_100, alert('above', 80_000))).toBe(true)
  })

  it('fires when price lands exactly on the target from the triggering side', () => {
    expect(checkAlertCrossed(79_000, 80_000, alert('above', 80_000))).toBe(true)
    expect(checkAlertCrossed(81_000, 80_000, alert('below', 80_000))).toBe(true)
  })

  it('does not fire when already beyond the target', () => {
    expect(checkAlertCrossed(80_100, 80_200, alert('above', 80_000))).toBe(false)
    expect(checkAlertCrossed(79_900, 79_800, alert('below', 80_000))).toBe(false)
  })

  it('does not fire when resting exactly on the target', () => {
    expect(checkAlertCrossed(80_000, 80_000, alert('above', 80_000))).toBe(false)
  })

  it('does not fire when moving away from the target', () => {
    expect(checkAlertCrossed(80_100, 79_900, alert('above', 80_000))).toBe(false)
    expect(checkAlertCrossed(79_900, 80_100, alert('below', 80_000))).toBe(false)
  })

  it('fires when price crosses below the target', () => {
    expect(checkAlertCrossed(80_100, 79_900, alert('below', 80_000))).toBe(true)
  })

  it('ignores non-finite prices', () => {
    expect(checkAlertCrossed(Number.NaN, 80_100, alert('above', 80_000))).toBe(false)
    expect(checkAlertCrossed(79_000, Number.NaN, alert('above', 80_000))).toBe(false)
  })
})
