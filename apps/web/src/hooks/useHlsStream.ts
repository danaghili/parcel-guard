import { useRef, useState, useEffect, useCallback } from 'react'
import type Hls from 'hls.js'

export type StreamStatus = 'idle' | 'loading' | 'playing' | 'error' | 'offline'

// Lazy load HLS.js to reduce initial bundle size
let HlsModule: typeof import('hls.js') | null = null
const loadHls = async (): Promise<typeof import('hls.js')> => {
  if (!HlsModule) {
    HlsModule = await import('hls.js')
  }
  return HlsModule
}

export interface UseHlsStreamOptions {
  autoPlay?: boolean
  muted?: boolean
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
}

export interface UseHlsStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  status: StreamStatus
  error: string | null
  isNativeHls: boolean
  retryCount: number
  retry: () => void
  disconnect: () => void
}

const DEFAULT_OPTIONS: Required<UseHlsStreamOptions> = {
  autoPlay: true,
  muted: true, // Required for autoplay
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
}

const HLS_CONFIG: Partial<Hls['config']> = {
  // Minimal config - let HLS.js use its defaults
}

function calculateRetryDelay(
  retryCount: number,
  initialDelay: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(2, retryCount)
  const jitter = delay * 0.25 * Math.random()
  return Math.min(delay + jitter, maxDelay)
}

export function useHlsStream(
  streamUrl: string | null,
  options: UseHlsStreamOptions = {}
): UseHlsStreamReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isNativeHls, setIsNativeHls] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    if (retryCount >= opts.maxRetries) {
      setStatus('offline')
      setError('Max retry attempts reached')
      return
    }

    const delay = calculateRetryDelay(
      retryCount,
      opts.initialRetryDelay,
      opts.maxRetryDelay
    )

    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount((c) => c + 1)
      setStatus('loading')
    }, delay)
  }, [retryCount, opts.maxRetries, opts.initialRetryDelay, opts.maxRetryDelay])

  const connect = useCallback(async () => {
    const video = videoRef.current
    if (!video || !streamUrl) {
      setStatus('idle')
      return
    }

    cleanup()
    setStatus('loading')
    setError(null)

    // Load HLS.js dynamically
    const HlsLib = await loadHls()
    const Hls = HlsLib.default

    // Check HLS.js support (most browsers)
    if (Hls.isSupported()) {
      const hls = new Hls(HLS_CONFIG)
      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (opts.autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked - user needs to interact
            setStatus('playing')
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // For manifest loading errors (404), schedule a full retry
              // This handles the case where stream isn't ready yet
              if (data.details === 'manifestLoadError' || data.details === 'manifestParsingError') {
                setStatus('loading')
                scheduleRetry()
              } else {
                // Try to recover other network errors first
                hls.startLoad()
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              // Unrecoverable, schedule retry
              setStatus('error')
              setError(data.details || 'Stream error')
              scheduleRetry()
              break
          }
        }
      })

      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      setIsNativeHls(false)
    }
    // Fallback to native HLS (Safari/iOS)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl
      setIsNativeHls(true)

      if (opts.autoPlay) {
        video.play().catch(() => {
          // Autoplay blocked
        })
      }
    }
    // No HLS support
    else {
      setStatus('error')
      setError('Your browser does not support HLS video playback')
    }
  }, [streamUrl, opts.autoPlay, cleanup, scheduleRetry])

  const disconnect = useCallback(() => {
    cleanup()
    setStatus('idle')
    setError(null)
    setRetryCount(0)
  }, [cleanup])

  const retry = useCallback(() => {
    setRetryCount(0)
    connect()
  }, [connect])

  // Video element event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let waitingTimeout: NodeJS.Timeout | null = null

    const handlePlaying = () => {
      // Clear any pending waiting timeout
      if (waitingTimeout) {
        clearTimeout(waitingTimeout)
        waitingTimeout = null
      }
      setStatus('playing')
    }

    const handleWaiting = () => {
      // Only show loading if buffering lasts more than 2 seconds
      // Brief buffering is normal for HLS
      if (waitingTimeout) return
      waitingTimeout = setTimeout(() => {
        setStatus('loading')
        waitingTimeout = null
      }, 2000)
    }

    const handleError = () => {
      if (isNativeHls) {
        setStatus('error')
        setError('Stream playback error')
        scheduleRetry()
      }
    }

    video.addEventListener('playing', handlePlaying)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('error', handleError)

    return () => {
      if (waitingTimeout) clearTimeout(waitingTimeout)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('error', handleError)
    }
  }, [isNativeHls, scheduleRetry])

  // Connect when URL changes or retry count changes
  useEffect(() => {
    if (streamUrl) {
      connect()
    } else {
      disconnect()
    }

    return cleanup
  }, [streamUrl, retryCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply muted attribute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = opts.muted
    }
  }, [opts.muted])

  return {
    videoRef,
    status,
    error,
    isNativeHls,
    retryCount,
    retry,
    disconnect,
  }
}
