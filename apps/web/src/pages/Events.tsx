import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EventList } from '../components/events/EventList'
import { EventFilters } from '../components/events/EventFilters'
import { EventStats } from '../components/events/EventStats'
import { PullToRefresh } from '../components/ui/PullToRefresh'
import {
  eventsApi,
  camerasApi,
  type MotionEvent,
  type EventFilters as EventFiltersType,
  type EventStats as EventStatsType,
  type Camera,
} from '../lib/api'

/**
 * Parse URL search params into EventFilters object
 */
function parseFiltersFromUrl(params: URLSearchParams): EventFiltersType {
  const filters: EventFiltersType = {}

  const cameraId = params.get('camera')
  if (cameraId) filters.cameraId = cameraId

  const startDate = params.get('startDate')
  if (startDate) filters.startDate = parseInt(startDate, 10)

  const endDate = params.get('endDate')
  if (endDate) filters.endDate = parseInt(endDate, 10)

  const isImportant = params.get('important')
  if (isImportant === 'true') filters.isImportant = true
  else if (isImportant === 'false') filters.isImportant = false

  const isFalseAlarm = params.get('falseAlarm')
  if (isFalseAlarm === 'true') filters.isFalseAlarm = true
  else if (isFalseAlarm === 'false') filters.isFalseAlarm = false

  return filters
}

/**
 * Convert EventFilters object to URL search params
 */
function filtersToSearchParams(filters: EventFiltersType): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.cameraId) params.set('camera', filters.cameraId)
  if (filters.startDate) params.set('startDate', filters.startDate.toString())
  if (filters.endDate) params.set('endDate', filters.endDate.toString())
  if (filters.isImportant !== undefined) params.set('important', filters.isImportant.toString())
  if (filters.isFalseAlarm !== undefined) params.set('falseAlarm', filters.isFalseAlarm.toString())

  return params
}

export function Events(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [events, setEvents] = useState<MotionEvent[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [stats, setStats] = useState<EventStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Parse filters from URL
  const filters = parseFiltersFromUrl(searchParams)

  // Fetch cameras for filter dropdown
  useEffect(() => {
    async function fetchCameras(): Promise<void> {
      try {
        const data = await camerasApi.list()
        setCameras(data)
      } catch (err) {
        console.error('Failed to fetch cameras:', err)
      }
    }
    fetchCameras()
  }, [])

  // Fetch stats
  useEffect(() => {
    async function fetchStats(): Promise<void> {
      setStatsLoading(true)
      try {
        const data = await eventsApi.getStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Fetch events when filters change or initial load
  const fetchEvents = useCallback(
    async (pageNum: number, append = false): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        const data = await eventsApi.list(filters, pageNum, 20)

        if (append) {
          setEvents((prev) => [...prev, ...data.events])
        } else {
          setEvents(data.events)
        }

        setHasMore(data.hasMore)
        setPage(pageNum)
      } catch (err) {
        console.error('Failed to fetch events:', err)
        setError('Failed to load events. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [filters],
  )

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(1)
    setEvents([])
    setHasMore(true)
    fetchEvents(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: EventFiltersType) => {
      const params = filtersToSearchParams(newFilters)
      setSearchParams(params)
    },
    [setSearchParams],
  )

  // Handle load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchEvents(page + 1, true)
    }
  }, [loading, hasMore, page, fetchEvents])

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async (): Promise<void> => {
    setPage(1)
    setEvents([])
    setHasMore(true)
    await fetchEvents(1, false)
    // Also refresh stats
    try {
      const statsData = await eventsApi.getStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to refresh stats:', err)
    }
  }, [fetchEvents])

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Motion events captured by your cameras</p>
      </header>

      {/* Stats */}
      <EventStats stats={stats} loading={statsLoading} className="mb-6" />

      {/* Filters */}
      <EventFilters
        filters={filters}
        cameras={cameras}
        onFiltersChange={handleFiltersChange}
        className="mb-6"
      />

      {/* Error state */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-200">{error}</p>
          <button
            onClick={() => fetchEvents(1, false)}
            className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Event list */}
      <EventList
        events={events}
        cameras={cameras}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </div>
    </PullToRefresh>
  )
}
