import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { systemApi, camerasApi } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'

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
}

export function Dashboard(): JSX.Element {
  const [data, setData] = useState<DashboardData>({ cameras: [], systemStatus: null })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const [cameras, systemStatus] = await Promise.all([
          camerasApi.list(),
          systemApi.status(),
        ])
        setData({ cameras, systemStatus })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const { cameras, systemStatus } = data

  return (
    <div className="p-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm">Welcome to ParcelGuard</p>
      </header>

      {/* Camera stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-white">{systemStatus?.cameras.total ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Total</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {systemStatus?.cameras.online ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Online</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-400">
            {systemStatus?.cameras.offline ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">Offline</div>
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
