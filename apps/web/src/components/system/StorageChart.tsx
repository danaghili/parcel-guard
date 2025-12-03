import { type StorageStats } from '../../lib/api'

interface StorageChartProps {
  stats: StorageStats
}

export function StorageChart({ stats }: StorageChartProps) {
  // Calculate percentages for each category
  const totalUsed = stats.breakdown.clips.size + stats.breakdown.thumbnails.size + stats.breakdown.database.size
  const clipsPercent = totalUsed > 0 ? (stats.breakdown.clips.size / totalUsed) * 100 : 0
  const thumbsPercent = totalUsed > 0 ? (stats.breakdown.thumbnails.size / totalUsed) * 100 : 0
  const dbPercent = totalUsed > 0 ? (stats.breakdown.database.size / totalUsed) * 100 : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storage</h3>

      {/* Usage bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">
            {stats.formatted.used} of {stats.formatted.total}
          </span>
          <span className={`font-medium ${stats.warning ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}>
            {stats.percentage}%
          </span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              stats.warning
                ? 'bg-orange-500'
                : stats.percentage > 50
                  ? 'bg-blue-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(stats.percentage, 100)}%` }}
          />
        </div>
        {stats.warning && (
          <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Storage running low. Consider cleaning up old recordings.
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Breakdown</h4>

        {/* Stacked bar */}
        {totalUsed > 0 && (
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full" style={{ width: `${clipsPercent}%` }} />
            <div className="bg-purple-500 h-full" style={{ width: `${thumbsPercent}%` }} />
            <div className="bg-green-500 h-full" style={{ width: `${dbPercent}%` }} />
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <div>
              <p className="text-gray-900 dark:text-white font-medium">{stats.breakdown.clips.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Clips ({stats.breakdown.clips.formatted})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <div>
              <p className="text-gray-900 dark:text-white font-medium">{stats.breakdown.thumbnails.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Thumbs ({stats.breakdown.thumbnails.formatted})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <div>
              <p className="text-gray-900 dark:text-white font-medium">DB</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.breakdown.database.formatted}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
