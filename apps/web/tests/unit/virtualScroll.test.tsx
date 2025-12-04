import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVirtualScroll } from '../../src/hooks/useVirtualScroll'

describe('useVirtualScroll', () => {
  let mockIntersectionObserver: {
    observe: ReturnType<typeof vi.fn>
    unobserve: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    callback: IntersectionObserverCallback | null
  }

  beforeEach(() => {
    mockIntersectionObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      callback: null,
    }

    global.IntersectionObserver = vi.fn((callback) => {
      mockIntersectionObserver.callback = callback
      return mockIntersectionObserver as unknown as IntersectionObserver
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not virtualize when item count is below threshold', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 10,
        threshold: 50,
      })
    )

    expect(result.current.isVirtualized).toBe(false)
    expect(result.current.isItemVisible(0)).toBe(true)
    expect(result.current.isItemVisible(9)).toBe(true)
  })

  it('should enable virtualization when item count exceeds threshold', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
      })
    )

    expect(result.current.isVirtualized).toBe(true)
  })

  it('should return all items as visible initially when virtualized', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
        overscan: 5,
      })
    )

    // Initially all items are visible until intersection observer reports
    expect(result.current.visibleRange.start).toBe(0)
    expect(result.current.visibleRange.end).toBe(99)
  })

  it('should create setItemRef callbacks', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
      })
    )

    const refCallback = result.current.setItemRef(5)
    expect(typeof refCallback).toBe('function')
  })

  it('should update visible range when observer reports intersections', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
        overscan: 5,
      })
    )

    // Create mock elements and register them
    const mockElements: HTMLDivElement[] = []
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('div')
      el.dataset.virtualIndex = String(i)
      mockElements.push(el)

      act(() => {
        result.current.setItemRef(i)(el)
      })
    }

    // Simulate intersection observer callback reporting items 0-5 as visible
    act(() => {
      const entries = mockElements.slice(0, 6).map((el) => ({
        target: el,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      }))
      mockIntersectionObserver.callback?.(entries, mockIntersectionObserver as unknown as IntersectionObserver)
    })

    // With overscan of 5 and items 0-5 visible, range should expand
    expect(result.current.visibleRange.start).toBe(0)
    expect(result.current.visibleRange.end).toBe(10) // 5 (max visible) + 5 (overscan)
  })

  it('should handle element cleanup when ref is set to null', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
      })
    )

    const el = document.createElement('div')
    el.dataset.virtualIndex = '0'

    // Register element
    act(() => {
      result.current.setItemRef(0)(el)
    })
    expect(mockIntersectionObserver.observe).toHaveBeenCalledWith(el)

    // Unregister element
    act(() => {
      result.current.setItemRef(0)(null)
    })
    expect(mockIntersectionObserver.unobserve).toHaveBeenCalledWith(el)
  })

  it('should not register refs when not virtualized', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 10,
        threshold: 50,
      })
    )

    const el = document.createElement('div')
    act(() => {
      result.current.setItemRef(0)(el)
    })

    // Observer should not be used when not virtualized
    expect(mockIntersectionObserver.observe).not.toHaveBeenCalled()
  })

  it('should use custom overscan value', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        threshold: 50,
        overscan: 10,
      })
    )

    // Create mock elements
    const mockElements: HTMLDivElement[] = []
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('div')
      el.dataset.virtualIndex = String(i)
      mockElements.push(el)
      act(() => {
        result.current.setItemRef(i)(el)
      })
    }

    // Report items 0-4 as visible
    act(() => {
      const entries = mockElements.map((el) => ({
        target: el,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      }))
      mockIntersectionObserver.callback?.(entries, mockIntersectionObserver as unknown as IntersectionObserver)
    })

    // With overscan of 10, range should expand by 10 on each side
    expect(result.current.visibleRange.start).toBe(0)
    expect(result.current.visibleRange.end).toBe(14) // 4 (max visible) + 10 (overscan)
  })

  it('should clamp visible range to valid indices', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 20,
        threshold: 10,
        overscan: 100, // Very large overscan
      })
    )

    // Create mock elements at the end
    const mockElements: HTMLDivElement[] = []
    for (let i = 15; i < 20; i++) {
      const el = document.createElement('div')
      el.dataset.virtualIndex = String(i)
      mockElements.push(el)
      act(() => {
        result.current.setItemRef(i)(el)
      })
    }

    // Report items 15-19 as visible
    act(() => {
      const entries = mockElements.map((el) => ({
        target: el,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      }))
      mockIntersectionObserver.callback?.(entries, mockIntersectionObserver as unknown as IntersectionObserver)
    })

    // Range should be clamped to valid indices
    expect(result.current.visibleRange.start).toBe(0) // Clamped to 0 (15 - 100 would be negative)
    expect(result.current.visibleRange.end).toBe(19) // Clamped to last index
  })
})
