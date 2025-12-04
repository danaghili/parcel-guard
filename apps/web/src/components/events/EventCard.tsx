import { Link } from 'react-router-dom'
import { eventsApi, type MotionEvent, type Camera } from '../../lib/api'

interface EventCardProps {
  event: MotionEvent
  camera?: Camera
  className?: string
}

/**
 * Formats a Unix timestamp to a human-readable date/time string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    return `Today at ${time}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${time}`
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats duration in seconds to a human-readable string
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '--'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function EventCard({ event, camera, className = '' }: EventCardProps): JSX.Element {
  const thumbnailUrl = event.thumbnailPath ? eventsApi.getThumbnailUrl(event.id) : null

  return (
    <Link
      to={`/events/${event.id}`}
      className={`
        block bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm
        hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${className}
      `}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-200 dark:bg-slate-900 relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Event from ${camera?.name ?? event.cameraId}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-slate-600"
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
          </div>
        )}

        {/* Duration badge */}
        {event.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
            {formatDuration(event.duration)}
          </span>
        )}

        {/* Important/False alarm badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {event.isImportant && (
            <span className="px-1.5 py-0.5 bg-yellow-500/90 text-yellow-900 text-xs font-medium rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Important
            </span>
          )}
          {event.isFalseAlarm && (
            <span className="px-1.5 py-0.5 bg-gray-500/90 dark:bg-slate-500/90 text-white dark:text-slate-100 text-xs font-medium rounded">
              False Alarm
            </span>
          )}
        </div>
      </div>

      {/* Event info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">
            {camera?.name ?? event.cameraId}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap ml-2">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
      </div>
    </Link>
  )
}
