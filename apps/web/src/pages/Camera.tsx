import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CameraPlayer } from '@/components/cameras/CameraPlayer'
import { Spinner } from '@/components/ui/Spinner'
import { useFullscreen } from '@/hooks/useFullscreen'
import { camerasApi, Camera as CameraType } from '@/lib/api'
import type { StreamStatus } from '@/hooks/useHlsStream'

export function Camera(): JSX.Element {
  const { cameraId } = useParams<{ cameraId: string }>()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef)

  const [camera, setCamera] = useState<CameraType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')

  // Wait for stream to be ready
  const waitForStreamReady = useCallback(async (id: string, maxWaitMs = 10000): Promise<boolean> => {
    const startTime = Date.now()
    const pollInterval = 500

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const ready = await camerasApi.getStreamStatus(id)
        if (ready) return true
      } catch {
        // Ignore errors, keep polling
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    return false
  }, [])

  // Start live view for this camera
  const startLiveView = useCallback(async (id: string) => {
    try {
      await camerasApi.startLiveView(id)
      // Wait for stream to be ready before showing player
      await waitForStreamReady(id)
    } catch (err) {
      console.warn(`Failed to start live view for ${id}:`, err)
    }
  }, [waitForStreamReady])

  // Stop live view when leaving
  const stopLiveView = useCallback(async (id: string) => {
    try {
      await camerasApi.stopLiveView(id)
    } catch (err) {
      console.warn(`Failed to stop live view for ${id}:`, err)
    }
  }, [])

  useEffect(() => {
    async function fetchCamera() {
      if (!cameraId) return

      try {
        setError(null)
        const cameraData = await camerasApi.get(cameraId)
        setCamera(cameraData)
        // Start live view after fetching camera
        await startLiveView(cameraId)
      } catch (err) {
        setError('Camera not found')
        console.error('Failed to fetch camera:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCamera()

    // Cleanup: stop live view when leaving
    return () => {
      if (cameraId) {
        stopLiveView(cameraId)
      }
    }
  }, [cameraId, startLiveView, stopLiveView])

  const handleBack = () => {
    navigate('/live')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !camera) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
        <p className="text-red-400 mb-4">{error || 'Camera not found'}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Back to Live View
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-black flex flex-col">
      {/* Header - hidden in fullscreen */}
      {!isFullscreen && (
        <header className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-sm">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>

          <div className="text-center">
            <h1 className="text-white font-medium">{camera.name}</h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              {streamStatus === 'playing' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs">LIVE</span>
                </>
              ) : streamStatus === 'loading' ? (
                <span className="text-yellow-400 text-xs">Connecting...</span>
              ) : (
                <span className="text-slate-400 text-xs">
                  {camera.status === 'offline' ? 'Offline' : 'Disconnected'}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-300 hover:text-white transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>
        </header>
      )}

      {/* Video player */}
      <div className="flex-1 flex items-center justify-center">
        <CameraPlayer
          streamUrl={camera.status === 'online' ? camera.streamUrl : null}
          onStatusChange={setStreamStatus}
          className="w-full h-full max-h-screen"
          showControls={true}
          rotation={camera.settings?.rotation ?? 0}
        />
      </div>

      {/* Fullscreen tap to exit hint */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg text-white opacity-0 hover:opacity-100 transition-opacity"
          aria-label="Exit fullscreen"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
