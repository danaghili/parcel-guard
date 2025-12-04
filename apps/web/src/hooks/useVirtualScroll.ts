import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface UseVirtualScrollOptions {
  /** Total number of items */
  itemCount: number
  /** Estimated height of each row in pixels (for single column view) */
  estimatedItemHeight?: number
  /** Number of items to render outside visible area (buffer) */
  overscan?: number
  /** Threshold for enabling virtualization */
  threshold?: number
}

interface VirtualScrollResult {
  /** Indices of items that should be rendered */
  visibleRange: { start: number; end: number }
  /** Whether an item at the given index is visible */
  isItemVisible: (index: number) => boolean
  /** Whether virtual scrolling is active */
  isVirtualized: boolean
  /** Register a ref for an item to track its visibility */
  setItemRef: (index: number) => (el: HTMLElement | null) => void
}

/**
 * Hook for optimizing rendering of large lists.
 * Uses IntersectionObserver to track which items are visible and allows
 * components to conditionally render content based on visibility.
 *
 * This is a lightweight alternative to full virtual scrolling that works
 * better with responsive grids and variable height items.
 */
export function useVirtualScroll({
  itemCount,
  estimatedItemHeight = 250,
  overscan = 5,
  threshold = 50,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Determine if we should virtualize based on item count
  const isVirtualized = itemCount > threshold

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    if (!isVirtualized || visibleIndices.size === 0) {
      return { start: 0, end: itemCount - 1 }
    }

    const indices = Array.from(visibleIndices).sort((a, b) => a - b)
    const minVisible = indices[0] ?? 0
    const maxVisible = indices[indices.length - 1] ?? 0

    return {
      start: Math.max(0, minVisible - overscan),
      end: Math.min(itemCount - 1, maxVisible + overscan),
    }
  }, [visibleIndices, itemCount, overscan, isVirtualized])

  // Check if an item is visible
  const isItemVisible = useCallback(
    (index: number): boolean => {
      if (!isVirtualized) return true
      return index >= visibleRange.start && index <= visibleRange.end
    },
    [isVirtualized, visibleRange]
  )

  // Create ref callback for items
  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      if (!isVirtualized) return

      if (el) {
        itemRefs.current.set(index, el)
        observerRef.current?.observe(el)
      } else {
        const prevEl = itemRefs.current.get(index)
        if (prevEl) {
          observerRef.current?.unobserve(prevEl)
        }
        itemRefs.current.delete(index)
      }
    },
    [isVirtualized]
  )

  // Set up IntersectionObserver
  useEffect(() => {
    if (!isVirtualized) return

    // Calculate root margin based on estimated item height
    const rootMargin = `${estimatedItemHeight * overscan}px 0px`

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIndices((prev) => {
          const next = new Set(prev)
          let changed = false

          entries.forEach((entry) => {
            const el = entry.target as HTMLElement
            const index = parseInt(el.dataset.virtualIndex ?? '-1', 10)
            if (index === -1) return

            if (entry.isIntersecting) {
              if (!next.has(index)) {
                next.add(index)
                changed = true
              }
            } else {
              if (next.has(index)) {
                next.delete(index)
                changed = true
              }
            }
          })

          return changed ? next : prev
        })
      },
      {
        rootMargin,
        threshold: 0,
      }
    )

    // Observe all current items
    itemRefs.current.forEach((el) => {
      observerRef.current?.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [isVirtualized, estimatedItemHeight, overscan])

  return {
    visibleRange,
    isItemVisible,
    isVirtualized,
    setItemRef,
  }
}
