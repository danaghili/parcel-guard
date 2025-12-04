interface SyncStatusProps {
  pendingCount: number
  isSyncing: boolean
  className?: string
}

/**
 * Displays sync status indicator when there are pending offline actions
 */
export function SyncStatus({ pendingCount, isSyncing, className = '' }: SyncStatusProps): JSX.Element | null {
  if (pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${className}`}
      role="status"
      aria-live="polite"
    >
      {isSyncing ? (
        <>
          <svg
            className="w-3 h-3 animate-spin text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-blue-400">Syncing...</span>
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-yellow-400">
            {pendingCount} pending {pendingCount === 1 ? 'action' : 'actions'}
          </span>
        </>
      )}
    </div>
  )
}
