import { Link } from 'react-router-dom'
import { systemApi, camerasApi, eventsApi, type MotionEvent, type EventStats } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'
import { CachedDataBadge } from '@/components/ui/CachedDataBadge'
import { useOfflineData } from '@/hooks/useOfflineData'

interface Camera {
  id: string
  name: string
  status: 'online' | 'offline'
}

interface DashboardData {
  cameras: Camera[]
  systemStatus: {
    version: string
    uptime: number
    cameras: {
      total: number
      online: number
      offline: number
    }
  } | null
  recentEvents: MotionEvent[]
  eventStats: EventStats | null
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [cameras, systemStatus, eventsData, eventStats] = await Promise.all([
    camerasApi.list(),
    systemApi.status(),
    eventsApi.list({}, 1, 5),
    eventsApi.getStats(),
  ])
  return {
    cameras,
    systemStatus,
    recentEvents: eventsData.events,
    eventStats,
  }
}

/**
 * Format timestamp for recent events display
 */
function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function Dashboard(): JSX.Element {
  const {
    data,
    loading: isLoading,
    isFromCache,
    lastFetched,
  } = useOfflineData<DashboardData>({
    fetcher: fetchDashboardData,
    cacheKey: 'dashboard',
    ttl: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const cameras = data?.cameras ?? []
  const systemStatus = data?.systemStatus ?? null
  const recentEvents = data?.recentEvents ?? []
  const eventStats = data?.eventStats ?? null

  return (
    <div className="p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome to ParcelGuard</p>
          </div>
          <CachedDataBadge isFromCache={isFromCache} lastFetched={lastFetched} />
        </div>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Camera stats */}
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {systemStatus?.cameras.online ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Cameras Online</div>
        </div>

        {/* Event stats */}
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{eventStats?.today ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Events Today</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{eventStats?.important ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Important</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-slate-300">{eventStats?.total ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Total Events</div>
        </div>
      </div>

      {/* Camera list */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Cameras</h2>
          <Link to="/live" className="text-primary-400 text-sm hover:text-primary-300">
            View all
          </Link>
        </div>

        {cameras.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400">No cameras configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cameras.map((camera) => (
              <Link
                key={camera.id}
                to={`/live/${camera.id}`}
                className="bg-slate-800 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      camera.status === 'online' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-medium">{camera.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      camera.status === 'online' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {camera.status}
                  </span>
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent events */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Link to="/events" className="text-primary-400 text-sm hover:text-primary-300">
            View all
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400">No events recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => {
              const eventCamera = cameras.find((c) => c.id === event.cameraId)
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 bg-slate-700 rounded overflow-hidden flex-shrink-0">
                    {event.thumbnailPath ? (
                      <img
                        src={eventsApi.getThumbnailUrl(event.id)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-slate-500"
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
                  </div>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {eventCamera?.name ?? event.cameraId}
                      </span>
                      {event.isImportant && (
                        <svg
                          className="w-4 h-4 text-yellow-400 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{formatEventTime(event.timestamp)}</p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-4 h-4 text-slate-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/live"
            className="bg-slate-800 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-8 h-8 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">Live View</span>
          </Link>
          <Link
            to="/events"
            className="bg-slate-800 rounded-lg p-4 flex flex-col items-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-8 h-8 text-primary-400"
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
            <span className="text-sm">Events</span>
          </Link>
        </div>
      </section>

      {/* System info */}
      {systemStatus && (
        <section className="mt-6">
          <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="text-slate-300">{systemStatus.version}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
