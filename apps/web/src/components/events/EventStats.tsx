import type { EventStats as EventStatsType } from '../../lib/api'

interface EventStatsProps {
  stats: EventStatsType | null
  loading?: boolean
  className?: string
}

export function EventStats({ stats, loading, className = '' }: EventStatsProps): JSX.Element {
  if (loading || !stats) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-lg p-3 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded w-16 mb-2" />
            <div className="h-6 bg-slate-700 rounded w-10" />
          </div>
        ))}
      </div>
    )
  }

  const statItems = [
    { label: 'Total', value: stats.total, color: 'text-slate-100' },
    { label: 'Today', value: stats.today, color: 'text-blue-400' },
    { label: 'Important', value: stats.important, color: 'text-yellow-400' },
    { label: 'False Alarms', value: stats.falseAlarms, color: 'text-slate-400' },
  ]

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-slate-800 rounded-lg p-3"
        >
          <p className="text-xs text-slate-400 mb-1">{item.label}</p>
          <p className={`text-xl font-semibold ${item.color}`}>
            {item.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}
