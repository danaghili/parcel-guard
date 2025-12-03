import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

import { systemApi, camerasApi, type Camera, type StorageStats } from '../lib/api'
import { SystemStats } from '../components/system/SystemStats'
import { StorageChart } from '../components/system/StorageChart'
import { CameraHealthTable } from '../components/system/CameraHealthTable'

interface SystemStatus {
  version: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cameras: {
    total: number
    online: number
    offline: number
  }
}

export function System() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setError(null)
      const [statusData, storageData, camerasData] = await Promise.all([
        systemApi.status(),
        systemApi.storage(),
        camerasApi.list(),
      ])
      setStatus(statusData)
      setStorage(storageData)
      setCameras(camerasData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/settings"
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monitor system performance</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
            <button onClick={loadData} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* System Stats */}
          {status && (
            <SystemStats
              version={status.version}
              uptime={status.uptime}
              memory={status.memory}
            />
          )}

          {/* Storage Chart */}
          {storage && <StorageChart stats={storage} />}

          {/* Camera Health Table */}
          <CameraHealthTable cameras={cameras} />

          {/* Refresh button */}
          <div className="text-center">
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Auto-refreshes every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
