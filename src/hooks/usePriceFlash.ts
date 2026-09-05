import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PriceData } from '../types'

type FlashDirection = 'up' | 'down'

export const FLASH_DURATION_MS = 900

const FLASH_ANIMATION: Record<FlashDirection, string> = {
  up: `flash-up ${FLASH_DURATION_MS}ms ease-out`,
  down: `flash-down ${FLASH_DURATION_MS}ms ease-out`,
}

export function usePriceFlash(price: PriceData | undefined): CSSProperties | undefined {
  const [flash, setFlash] = useState<FlashDirection | null>(null)
  const prevPriceRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!price) return
    const prev = prevPriceRef.current
    prevPriceRef.current = price.usd
    if (prev === null || prev === price.usd) return

    setFlash(price.usd > prev ? 'up' : 'down')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS + 50)
  }, [price])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return flash ? { animation: FLASH_ANIMATION[flash] } : undefined
}