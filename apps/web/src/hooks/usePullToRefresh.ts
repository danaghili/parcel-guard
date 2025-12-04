import { useRef, useEffect, useCallback, useState } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLDivElement>
  isRefreshing: boolean
  pullProgress: number
}

/**
 * Hook to implement pull-to-refresh functionality
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)

  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return

      const container = containerRef.current
      if (!container) return

      // Only trigger if scrolled to top
      if (container.scrollTop > 0) return

      startY.current = e.touches[0]?.clientY ?? 0
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return

      const container = containerRef.current
      if (!container) return

      // Only if scrolled to top
      if (container.scrollTop > 0) {
        startY.current = 0
        setPullProgress(0)
        return
      }

      currentY.current = e.touches[0]?.clientY ?? 0
      const pullDistance = currentY.current - startY.current

      if (pullDistance > 0) {
        // Prevent default scrolling when pulling down at top
        e.preventDefault()
        // Apply resistance factor for more natural feel
        const progress = Math.min(pullDistance * 0.5, threshold * 1.5)
        setPullProgress(progress)
      }
    },
    [disabled, isRefreshing, threshold]
  )

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    const pullDistance = pullProgress

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    startY.current = 0
    currentY.current = 0
    setPullProgress(0)
  }, [disabled, isRefreshing, pullProgress, threshold, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    isRefreshing,
    pullProgress,
  }
}
