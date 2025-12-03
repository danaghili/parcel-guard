import { useState, useEffect } from 'react'

import { systemApi, settingsApi, type StorageStats, type Settings } from '../../lib/api'

interface StorageSettingsProps {
  settings: Settings | null
  onSettingsChange: (settings: Settings) => void
}

export function StorageSettings({ settings, onSettingsChange }: StorageSettingsProps) {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [isLoadingStorage, setIsLoadingStorage] = useState(true)
  const [isCleaning, setIsCleaning] = useState(false)
  const [retentionDays, setRetentionDays] = useState(settings?.retentionDays ?? 30)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStorageStats()
  }, [])

  useEffect(() => {
    if (settings) {
      setRetentionDays(settings.retentionDays)
    }
  }, [settings])

  const loadStorageStats = async () => {
    try {
      setError(null)
      const stats = await systemApi.storage()
      setStorageStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage stats')
    } finally {
      setIsLoadingStorage(false)
    }
  }

  const handleRetentionChange = async (days: number) => {
    setRetentionDays(days)
    try {
      const updated = await settingsApi.update({ retentionDays: days })
      onSettingsChange(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update retention')
    }
  }

  const handleCleanup = async () => {
    setIsCleaning(true)
    setCleanupResult(null)
    setError(null)

    try {
      const result = await systemApi.cleanup()
      setCleanupResult(
        `Cleaned up ${result.eventsDeleted} events, ${result.filesDeleted} files (${formatBytes(result.bytesFreed)} freed)`
      )
      // Reload storage stats
      await loadStorageStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run cleanup')
    } finally {
      setIsCleaning(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {cleanupResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
          {cleanupResult}
        </div>
      )}

      {/* Storage Usage */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Storage Usage</h3>

        {isLoadingStorage ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : storageStats ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {storageStats.formatted.used} of {storageStats.formatted.total}
                </span>
                <span className={`font-medium ${storageStats.warning ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {storageStats.percentage}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storageStats.warning
                      ? 'bg-orange-500'
                      : storageStats.percentage > 50
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                />
              </div>
              {storageStats.warning && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Storage is running low. Consider cleaning up old recordings.
                </p>
              )}
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storageStats.breakdown.clips.count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clips ({storageStats.breakdown.clips.formatted})
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storageStats.breakdown.thumbnails.count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Thumbs ({storageStats.breakdown.thumbnails.formatted})
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storageStats.breakdown.database.formatted}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Database</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Retention Settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Retention Period</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Keep recordings for
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {retentionDays} days
          </span>
        </div>
        <input
          type="range"
          min="7"
          max="90"
          step="1"
          value={retentionDays}
          onChange={(e) => handleRetentionChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>7 days</span>
          <span>30 days</span>
          <span>90 days</span>
        </div>
      </div>

      {/* Cleanup Button */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Manual Cleanup</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Delete recordings older than the retention period.
        </p>
        <button
          onClick={handleCleanup}
          disabled={isCleaning}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCleaning ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Cleaning...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Run Cleanup Now
            </>
          )}
        </button>
      </div>
    </div>
  )
}
