import { useState, useEffect, useCallback, useRef } from 'react'
import { CameraGrid } from '@/components/cameras/CameraGrid'
import { CameraGridSkeleton } from '@/components/cameras/CameraCardSkeleton'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { camerasApi, Camera } from '@/lib/api'

export function Live(): JSX.Element {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const activeCameraIds = useRef<string[]>([])

  const fetchCameras = useCallback(async () => {
    try {
      setError(null)
      const cameraList = await camerasApi.list()
      setCameras(cameraList)
      return cameraList
    } catch (err) {
      setError('Failed to load cameras')
      console.error('Failed to fetch cameras:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Wait for a camera stream to be ready
  const waitForStreamReady = useCallback(async (cameraId: string, maxWaitMs = 10000): Promise<boolean> => {
    const startTime = Date.now()
    const pollInterval = 500

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const ready = await camerasApi.getStreamStatus(cameraId)
        if (ready) return true
      } catch {
        // Ignore errors, keep polling
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    return false
  }, [])

  // Start live view for all cameras when page loads
  const startAllLiveViews = useCallback(async (cameraList: Camera[]) => {
    setStreamStatus('connecting')

    // Send start commands to all cameras
    const startPromises = cameraList.map(async (camera) => {
      try {
        await camerasApi.startLiveView(camera.id)
        return camera.id
      } catch (err) {
        console.warn(`Failed to start live view for ${camera.id}:`, err)
        return null
      }
    })

    const startedIds = (await Promise.all(startPromises)).filter((id): id is string => id !== null)
    activeCameraIds.current = startedIds

    if (startedIds.length === 0) {
      if (cameraList.length > 0) {
        setStreamStatus('error')
      }
      return
    }

    // Wait for streams to be ready (poll each camera in parallel)
    const readyPromises = startedIds.map(id => waitForStreamReady(id))
    const readyResults = await Promise.all(readyPromises)

    if (readyResults.some(ready => ready)) {
      setStreamStatus('live')
    } else {
      // Streams didn't signal ready in time, but they may still work
      // Set to live anyway and let HLS retry handle any issues
      setStreamStatus('live')
    }
  }, [waitForStreamReady])

  // Stop live view for all cameras when page unloads
  const stopAllLiveViews = useCallback(async () => {
    const stopPromises = activeCameraIds.current.map(async (cameraId) => {
      try {
        await camerasApi.stopLiveView(cameraId)
      } catch (err) {
        console.warn(`Failed to stop live view for ${cameraId}:`, err)
      }
    })
    await Promise.all(stopPromises)
    activeCameraIds.current = []
  }, [])

  useEffect(() => {
    const init = async () => {
      const cameraList = await fetchCameras()
      if (cameraList.length > 0) {
        await startAllLiveViews(cameraList)
      }
    }
    init()

    // Cleanup: stop all live views when leaving the page
    return () => {
      stopAllLiveViews()
    }
  }, [fetchCameras, startAllLiveViews, stopAllLiveViews])

  const handleRefresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    await fetchCameras()
  }, [fetchCameras])

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live View</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-slate-400">
              {cameras.length} camera{cameras.length !== 1 ? 's' : ''}
            </span>
            {cameras.length > 0 && (
              <span className={`flex items-center gap-1 ${
                streamStatus === 'connecting' ? 'text-yellow-600 dark:text-yellow-400' :
                streamStatus === 'live' ? 'text-green-600 dark:text-green-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  streamStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  streamStatus === 'live' ? 'bg-green-500' :
                  'bg-red-500'
                }`} />
                {streamStatus === 'connecting' ? 'Connecting...' :
                 streamStatus === 'live' ? 'Live' :
                 'Connection failed'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
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
        <CameraGridSkeleton count={4} />
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
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
    </PullToRefresh>
  )
}
