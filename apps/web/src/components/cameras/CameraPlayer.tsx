import { useEffect } from 'react'
import { useHlsStream, StreamStatus } from '@/hooks/useHlsStream'
import { Spinner } from '@/components/ui/Spinner'

interface CameraPlayerProps {
  streamUrl: string | null
  onStatusChange?: (status: StreamStatus) => void
  className?: string
  showControls?: boolean
  rotation?: number
}

export function CameraPlayer({
  streamUrl,
  onStatusChange,
  className = '',
  showControls = false,
  rotation = 0,
}: CameraPlayerProps): JSX.Element {
  const { videoRef, status, error, retry } = useHlsStream(streamUrl, {
    autoPlay: true,
    muted: true,
  })

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  // Calculate video style with rotation
  // For 90° and 270° rotations, aspect ratio changes from 16:9 to 9:16
  // Scale down to fit within the container bounds
  const isPortraitRotation = rotation === 90 || rotation === 270
  const videoStyle = rotation
    ? {
        transform: isPortraitRotation
          ? `rotate(${rotation}deg) scale(0.5625)` // 9/16 = 0.5625 to fit portrait in landscape container
          : `rotate(${rotation}deg)`,
      }
    : undefined

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={videoStyle}
        playsInline
        controls={showControls}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error overlay */}
      {(status === 'error' || status === 'offline') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4">
          <svg
            className="w-12 h-12 text-slate-500 mb-3"
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3l18 18"
            />
          </svg>
          <p className="text-slate-400 text-sm text-center mb-3">
            {status === 'offline' ? 'Camera offline' : error || 'Connection error'}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Idle state (no URL) */}
      {status === 'idle' && !streamUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <p className="text-slate-500 text-sm">No stream configured</p>
        </div>
      )}
    </div>
  )
}
