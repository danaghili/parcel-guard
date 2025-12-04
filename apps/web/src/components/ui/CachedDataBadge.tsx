import { formatRelativeTime } from '@/hooks/useOfflineData'

interface CachedDataBadgeProps {
  /** Whether the data is from cache */
  isFromCache: boolean
  /** Timestamp when data was last fetched */
  lastFetched: number | null
  /** Additional CSS classes */
  className?: string
}

/**
 * Badge component to indicate when data is being displayed from cache
 */
export function CachedDataBadge({
  isFromCache,
  lastFetched,
  className = '',
}: CachedDataBadgeProps): JSX.Element | null {
  if (!isFromCache || !lastFetched) {
    return null
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Cached {formatRelativeTime(lastFetched)}</span>
    </div>
  )
}
