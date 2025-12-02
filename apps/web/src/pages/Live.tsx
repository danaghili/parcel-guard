import { useState, useEffect, useCallback } from 'react'
import { CameraGrid } from '@/components/cameras/CameraGrid'
import { Spinner } from '@/components/ui/Spinner'
import { camerasApi, Camera } from '@/lib/api'

export function Live(): JSX.Element {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCameras = useCallback(async () => {
    try {
      setError(null)
      const cameras = await camerasApi.list()
      setCameras(cameras)
    } catch (err) {
      setError('Failed to load cameras')
      console.error('Failed to fetch cameras:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCameras()
  }, [fetchCameras])

  const handleRefresh = () => {
    setLoading(true)
    fetchCameras()
  }

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live View</h1>
          <p className="text-slate-400 text-sm">
            {cameras.length} camera{cameras.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Refresh cameras"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </header>

      {loading && cameras.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <CameraGrid cameras={cameras} />
      )}
    </div>
  )
}
