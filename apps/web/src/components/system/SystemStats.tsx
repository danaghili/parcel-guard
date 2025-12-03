interface SystemStatsProps {
  version: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
}

export function SystemStats({ version, uptime, memory }: SystemStatsProps) {
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {/* Version */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Version</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{version}</p>
      </div>

      {/* Uptime */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Uptime</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatUptime(uptime)}</p>
      </div>

      {/* Memory */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 col-span-2 md:col-span-1">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Memory</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{memory.percentage}%</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatBytes(memory.used)} / {formatBytes(memory.total)}
        </p>
        <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              memory.percentage > 80
                ? 'bg-red-500'
                : memory.percentage > 60
                  ? 'bg-orange-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(memory.percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
