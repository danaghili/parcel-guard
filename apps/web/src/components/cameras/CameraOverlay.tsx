import { StreamStatus } from '@/hooks/useHlsStream'

interface CameraOverlayProps {
  name: string
  status: 'online' | 'offline'
  streamStatus?: StreamStatus
  lastSeen?: number | null
}

function formatLastSeen(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Unknown'

  const now = Date.now()
  const diff = now - timestamp * 1000 // Convert from unix seconds to ms

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function CameraOverlay({
  name,
  status,
  streamStatus,
  lastSeen,
}: CameraOverlayProps): JSX.Element {
  const isLive = status === 'online' && streamStatus === 'playing'

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
      <div className="flex items-center justify-between">
        <span className="text-white font-medium text-sm truncate">{name}</span>
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">LIVE</span>
            </>
          ) : status === 'offline' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 text-xs">
                {formatLastSeen(lastSeen)}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-yellow-400 text-xs">Connecting</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
