import { ReactNode } from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { Spinner } from './Spinner'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
  disabled = false,
}: PullToRefreshProps): JSX.Element {
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  })

  const indicatorOpacity = Math.min(pullProgress / 80, 1)
  const indicatorScale = Math.min(0.5 + (pullProgress / 80) * 0.5, 1)

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 transition-transform"
        style={{
          top: -40,
          transform: `translateY(${pullProgress}px)`,
        }}
      >
        <div
          className="bg-slate-700 rounded-full p-2"
          style={{
            opacity: indicatorOpacity,
            transform: `scale(${indicatorScale})`,
          }}
        >
          {isRefreshing ? (
            <Spinner size="sm" />
          ) : (
            <svg
              className="w-5 h-5 text-slate-300 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                transform: `rotate(${Math.min(pullProgress * 2, 180)}deg)`,
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform"
        style={{
          transform: isRefreshing ? 'translateY(40px)' : `translateY(${pullProgress * 0.5}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
