import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'

interface UseOfflineDataOptions<T> {
  /** Function to fetch data from the network */
  fetcher: () => Promise<T>
  /** Key for localStorage cache */
  cacheKey: string
  /** Time-to-live for cached data in milliseconds (default: 1 hour) */
  ttl?: number
  /** Whether to fetch immediately on mount */
  immediate?: boolean
}

interface UseOfflineDataResult<T> {
  /** The data (from network or cache) */
  data: T | null
  /** Whether data is currently loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether the current data is from cache */
  isFromCache: boolean
  /** Timestamp when data was last fetched */
  lastFetched: number | null
  /** Manually refresh data */
  refresh: () => Promise<void>
}

interface CachedData<T> {
  data: T
  timestamp: number
}

/**
 * Hook for fetching data with offline support.
 * Uses localStorage to cache data for offline access.
 */
export function useOfflineData<T>({
  fetcher,
  cacheKey,
  ttl = 60 * 60 * 1000, // 1 hour default
  immediate = true,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const isOnline = useOnlineStatus()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [lastFetched, setLastFetched] = useState<number | null>(null)

  // Load cached data from localStorage
  const loadFromCache = useCallback((): CachedData<T> | null => {
    try {
      const cached = localStorage.getItem(`offline_${cacheKey}`)
      if (cached) {
        const parsed = JSON.parse(cached) as CachedData<T>
        return parsed
      }
    } catch (err) {
      console.error('Failed to load from cache:', err)
    }
    return null
  }, [cacheKey])

  // Save data to localStorage cache
  const saveToCache = useCallback(
    (newData: T) => {
      try {
        const cacheEntry: CachedData<T> = {
          data: newData,
          timestamp: Date.now(),
        }
        localStorage.setItem(`offline_${cacheKey}`, JSON.stringify(cacheEntry))
      } catch (err) {
        console.error('Failed to save to cache:', err)
      }
    },
    [cacheKey]
  )

  // Fetch data from network
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setIsFromCache(false)
      setLastFetched(Date.now())
      saveToCache(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)

      // If network failed, try to use cached data
      const cached = loadFromCache()
      if (cached) {
        setData(cached.data)
        setIsFromCache(true)
        setLastFetched(cached.timestamp)
        // Clear error if we have cached data
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [fetcher, saveToCache, loadFromCache])

  // Refresh data manually
  const refresh = useCallback(async () => {
    if (isOnline) {
      await fetchData()
    } else {
      // When offline, just load from cache
      const cached = loadFromCache()
      if (cached) {
        setData(cached.data)
        setIsFromCache(true)
        setLastFetched(cached.timestamp)
      }
    }
  }, [isOnline, fetchData, loadFromCache])

  // Initial load
  useEffect(() => {
    if (!immediate) return

    // First, try to load cached data for instant display
    const cached = loadFromCache()
    if (cached) {
      setData(cached.data)
      setIsFromCache(true)
      setLastFetched(cached.timestamp)

      // Check if cache is still fresh
      const isFresh = Date.now() - cached.timestamp < ttl
      if (isFresh && !isOnline) {
        // Cache is fresh and we're offline, don't fetch
        setLoading(false)
        return
      }
    }

    // Fetch fresh data if online
    if (isOnline) {
      fetchData()
    } else if (!cached) {
      // Offline and no cache
      setLoading(false)
      setError('No cached data available')
    } else {
      setLoading(false)
    }
  }, [immediate, isOnline, loadFromCache, ttl, fetchData])

  // Re-fetch when coming back online
  useEffect(() => {
    if (isOnline && isFromCache) {
      fetchData()
    }
  }, [isOnline, isFromCache, fetchData])

  return {
    data,
    loading,
    error,
    isFromCache,
    lastFetched,
    refresh,
  }
}

/**
 * Format a timestamp to a relative time string (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}
