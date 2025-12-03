import { useEffect, useRef, useCallback } from 'react'
import { EventCard } from './EventCard'
import { Spinner } from '../ui/Spinner'
import type { MotionEvent, Camera } from '../../lib/api'

interface EventListProps {
  events: MotionEvent[]
  cameras: Camera[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  className?: string
}

export function EventList({
  events,
  cameras,
  loading,
  hasMore,
  onLoadMore,
  className = '',
}: EventListProps): JSX.Element {
  const observerTarget = useRef<HTMLDivElement>(null)

  // Create a map of cameras by ID for quick lookup
  const cameraMap = useCallback(() => {
    const map = new Map<string, Camera>()
    cameras.forEach((camera) => map.set(camera.id, camera))
    return map
  }, [cameras])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const target = observerTarget.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loading, onLoadMore])

  const camerasById = cameraMap()

  if (events.length === 0 && !loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <svg
          className="w-16 h-16 text-slate-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-slate-300 mb-1">No events found</h3>
        <p className="text-sm text-slate-500">
          Motion events will appear here when detected
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Event grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            camera={camerasById.get(event.cameraId)}
          />
        ))}
      </div>

      {/* Load more trigger & loading indicator */}
      <div ref={observerTarget} className="mt-6 flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400">
            <Spinner size="sm" />
            <span>Loading events...</span>
          </div>
        )}
        {!hasMore && events.length > 0 && (
          <p className="text-sm text-slate-500">No more events</p>
        )}
      </div>
    </div>
  )
}
