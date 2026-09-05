import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Scale/glow pulse for a price reading. Remount on every `tickKey` change
 * so the pop replays per tick (complements the row background flash).
 */
export function PricePulse({
  tickKey,
  children,
}: {
  tickKey: string | number
  children: ReactNode
}) {
  return (
    <motion.span
      key={tickKey}
      initial={{ scale: 1.12, filter: 'brightness(1.5)' }}
      animate={{ scale: 1, filter: 'brightness(1)' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="inline-block"
    >
      {children}
    </motion.span>
  )
}

interface CoinTransitionProps {
  watchKey: string
  className?: string
  children: ReactNode
}

/**
 * Fade/slide wrapper that replays whenever the selected coin changes —
 * without unmounting its children (chart state is preserved).
 */
export function CoinTransition({ watchKey, className, children }: CoinTransitionProps) {
  const controls = useAnimationControls()
  const firstRef = useRef(true)

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    void controls.start({
      opacity: [0, 1],
      x: [24, 0],
      transition: { duration: 0.3, ease: 'easeOut' },
    })
  }, [watchKey, controls])

  return (
    <motion.div animate={controls} initial={false} className={className}>
      {children}
    </motion.div>
  )
}
