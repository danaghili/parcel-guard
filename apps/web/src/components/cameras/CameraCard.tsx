import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraPlayer } from './CameraPlayer'
import { CameraOverlay } from './CameraOverlay'
import { StreamStatus } from '@/hooks/useHlsStream'
import type { Camera } from '@/lib/api'

interface CameraCardProps {
  camera: Camera
}

export function CameraCard({ camera }: CameraCardProps): JSX.Element {
  const navigate = useNavigate()
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')

  const handleClick = () => {
    navigate(`/live/${camera.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="relative aspect-video bg-gray-200 dark:bg-slate-800 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 group shadow-sm"
    >
      <CameraPlayer
        streamUrl={camera.status === 'online' ? camera.streamUrl : null}
        onStatusChange={setStreamStatus}
        className="w-full h-full"
      />
      <CameraOverlay
        name={camera.name}
        status={camera.status}
        streamStatus={streamStatus}
        lastSeen={camera.lastSeen}
      />
      {/* Hover effect */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
