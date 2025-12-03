import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { EventPlayer } from '../components/events/EventPlayer'
import { Spinner } from '../components/ui/Spinner'
import { eventsApi, camerasApi, type MotionEvent, type Camera } from '../lib/api'

/**
 * Format Unix timestamp to detailed date string
 */
function formatDetailedTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format duration in seconds
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return 'Unknown'
  if (seconds < 60) return `${seconds} seconds`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs > 0) return `${mins} min ${secs} sec`
  return `${mins} minute${mins > 1 ? 's' : ''}`
}

export function EventDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [event, setEvent] = useState<MotionEvent | null>(null)
  const [camera, setCamera] = useState<Camera | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch event data
  useEffect(() => {
    async function fetchEvent(): Promise<void> {
      if (!id) return

      setLoading(true)
      setError(null)

      try {
        const eventData = await eventsApi.get(id)
        setEvent(eventData)

        // Fetch camera info
        const cameras = await camerasApi.list()
        const eventCamera = cameras.find((c) => c.id === eventData.cameraId)
        setCamera(eventCamera ?? null)
      } catch (err) {
        console.error('Failed to fetch event:', err)
        setError('Failed to load event details')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  // Toggle important status
  const handleToggleImportant = useCallback(async () => {
    if (!event || updating) return

    setUpdating(true)
    try {
      const updated = await eventsApi.update(event.id, {
        isImportant: !event.isImportant,
      })
      setEvent(updated)
    } catch (err) {
      console.error('Failed to update event:', err)
    } finally {
      setUpdating(false)
    }
  }, [event, updating])

  // Toggle false alarm status
  const handleToggleFalseAlarm = useCallback(async () => {
    if (!event || updating) return

    setUpdating(true)
    try {
      const updated = await eventsApi.update(event.id, {
        isFalseAlarm: !event.isFalseAlarm,
      })
      setEvent(updated)
    } catch (err) {
      console.error('Failed to update event:', err)
    } finally {
      setUpdating(false)
    }
  }, [event, updating])

  // Delete event
  const handleDelete = useCallback(async () => {
    if (!event) return

    try {
      await eventsApi.delete(event.id)
      navigate('/events')
    } catch (err) {
      console.error('Failed to delete event:', err)
      setShowDeleteConfirm(false)
    }
  }, [event, navigate])

  // Download video
  const handleDownload = useCallback(() => {
    if (!event) return
    window.open(eventsApi.getDownloadUrl(event.id), '_blank')
  }, [event])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-red-200 mb-4">{error ?? 'Event not found'}</p>
          <Link
            to="/events"
            className="inline-flex items-center text-red-300 hover:text-red-100"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/events"
        className="inline-flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to events
      </Link>

      {/* Video player */}
      {event.videoPath ? (
        <EventPlayer
          videoUrl={eventsApi.getVideoUrl(event.id)}
          posterUrl={event.thumbnailPath ? eventsApi.getThumbnailUrl(event.id) : undefined}
          onDownload={handleDownload}
          className="mb-6"
        />
      ) : (
        <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center mb-6">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-slate-600 mx-auto mb-2"
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
            <p className="text-slate-400">No video available</p>
          </div>
        </div>
      )}

      {/* Event info */}
      <div className="bg-slate-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white mb-1">
              {camera?.name ?? event.cameraId}
            </h1>
            <p className="text-slate-400 text-sm">{formatDetailedTimestamp(event.timestamp)}</p>
          </div>

          {/* Badges */}
          <div className="flex gap-2">
            {event.isImportant && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Important
              </span>
            )}
            {event.isFalseAlarm && (
              <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs font-medium rounded">
                False Alarm
              </span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-500 mb-1">Duration</p>
            <p className="text-sm text-slate-200">{formatDuration(event.duration)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Camera</p>
            <p className="text-sm text-slate-200">{camera?.name ?? event.cameraId}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Event ID</p>
            <p className="text-sm text-slate-200 font-mono truncate">{event.id}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Mark Important */}
        <button
          onClick={handleToggleImportant}
          disabled={updating}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-colors disabled:opacity-50
            ${
              event.isImportant
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {event.isImportant ? 'Remove Important' : 'Mark Important'}
        </button>

        {/* Mark False Alarm */}
        <button
          onClick={handleToggleFalseAlarm}
          disabled={updating}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            transition-colors disabled:opacity-50
            ${
              event.isFalseAlarm
                ? 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          {event.isFalseAlarm ? 'Remove False Alarm' : 'Mark False Alarm'}
        </button>

        {/* Download */}
        {event.videoPath && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
            bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Event?</h2>
            <p className="text-slate-400 mb-6">
              This will permanently delete this event and its associated video clip. This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg font-medium text-sm
                  bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg font-medium text-sm
                  bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
