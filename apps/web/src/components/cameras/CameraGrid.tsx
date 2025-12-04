import { CameraCard } from './CameraCard'
import type { Camera } from '@/lib/api'

interface CameraGridProps {
  cameras: Camera[]
}

export function CameraGrid({ cameras }: CameraGridProps): JSX.Element {
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="w-16 h-16 text-gray-400 dark:text-slate-600 mb-4"
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
        <h3 className="text-lg font-medium text-gray-700 dark:text-slate-300 mb-1">No cameras</h3>
        <p className="text-gray-500 dark:text-slate-500 text-sm">
          Add a camera in Settings to get started
        </p>
      </div>
    )
  }

  // Dynamic grid columns based on camera count
  const gridCols =
    cameras.length === 1
      ? 'grid-cols-1'
      : cameras.length <= 4
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {cameras.map((camera) => (
        <CameraCard key={camera.id} camera={camera} />
      ))}
    </div>
  )
}
