interface SkeletonProps {
  className?: string
}

/** Shimmer placeholder block for loading states. Pass sizing via className. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700/60 ${className}`}
    />
  )
}

interface SkeletonRowsProps {
  rows?: number
  className?: string
}

/** Convenience stack of skeleton bars (e.g. order-book depth rows). */
export function SkeletonRows({ rows = 8, className = 'mx-3 my-1.5 h-5' }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </>
  )
}
