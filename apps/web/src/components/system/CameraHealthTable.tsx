import { Link } from 'react-router-dom'

import { type Camera } from '../../lib/api'

interface CameraHealthTableProps {
  cameras: Camera[]
}

export function CameraHealthTable({ cameras }: CameraHealthTableProps) {
  const formatLastSeen = (timestamp: number | null): string => {
    if (!timestamp) return 'Never'

    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  if (cameras.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-600 dark:text-gray-400">No cameras configured</p>
        <Link to="/cameras" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Add a camera
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cameras</h3>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{camera.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{camera.id}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  camera.status === 'online'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {camera.status === 'online' ? 'Online' : 'Offline'}
                </p>
                {camera.status === 'offline' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last seen {formatLastSeen(camera.lastSeen)}
                  </p>
                )}
              </div>

              <Link
                to={`/cameras/${camera.id}`}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {cameras.filter((c) => c.status === 'online').length} of {cameras.length} online
          </span>
          <Link to="/cameras" className="text-blue-600 hover:underline">
            Manage cameras
          </Link>
        </div>
      </div>
    </div>
  )
}
