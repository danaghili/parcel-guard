import { useState } from 'react'
import type { EventFilters as EventFiltersType, Camera } from '../../lib/api'

interface EventFiltersProps {
  filters: EventFiltersType
  cameras: Camera[]
  onFiltersChange: (filters: EventFiltersType) => void
  className?: string
}

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom'

interface TimePreset {
  id: string
  label: string
  startTime: string
  endTime: string
  isOvernight?: boolean
}

const TIME_PRESETS: TimePreset[] = [
  { id: 'business', label: 'Business Hours', startTime: '09:00', endTime: '17:00' },
  { id: 'evening', label: 'Evening', startTime: '17:00', endTime: '22:00' },
  { id: 'night', label: 'Night', startTime: '22:00', endTime: '06:00', isOvernight: true },
]

/**
 * Check if a time range is overnight (startTime > endTime)
 */
function isOvernightRange(startTime: string, endTime: string): boolean {
  return startTime > endTime
}

/**
 * Get the start of today in Unix timestamp (seconds)
 */
function getStartOfToday(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

/**
 * Get timestamp for N days ago
 */
function getDaysAgo(days: number): number {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

/**
 * Convert Unix timestamp to date input value (YYYY-MM-DD)
 */
function timestampToDateInput(timestamp: number | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toISOString().split('T')[0] ?? ''
}

/**
 * Convert date input value to Unix timestamp
 */
function dateInputToTimestamp(value: string, isEndOfDay = false): number | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999)
  } else {
    date.setHours(0, 0, 0, 0)
  }
  return Math.floor(date.getTime() / 1000)
}

export function EventFilters({
  filters,
  cameras,
  onFiltersChange,
  className = '',
}: EventFiltersProps): JSX.Element {
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [showTimeFilter, setShowTimeFilter] = useState(
    Boolean(filters.startTime && filters.endTime),
  )

  // Determine current date preset based on filters
  const getDatePreset = (): DatePreset => {
    if (!filters.startDate && !filters.endDate) return 'all'
    if (filters.startDate === getStartOfToday()) return 'today'
    if (filters.startDate === getDaysAgo(7)) return 'week'
    if (filters.startDate === getDaysAgo(30)) return 'month'
    return 'custom'
  }

  const handleCameraChange = (cameraId: string) => {
    onFiltersChange({
      ...filters,
      cameraId: cameraId || undefined,
    })
  }

  const handleDatePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustomDates(true)
      return
    }

    setShowCustomDates(false)
    let startDate: number | undefined
    const endDate: number | undefined = undefined

    switch (preset) {
      case 'today':
        startDate = getStartOfToday()
        break
      case 'week':
        startDate = getDaysAgo(7)
        break
      case 'month':
        startDate = getDaysAgo(30)
        break
      case 'all':
      default:
        startDate = undefined
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate,
    })
  }

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const timestamp = dateInputToTimestamp(value, field === 'endDate')
    onFiltersChange({
      ...filters,
      [field]: timestamp,
    })
  }

  const handleImportantChange = (value: string) => {
    let isImportant: boolean | undefined
    if (value === 'true') isImportant = true
    else if (value === 'false') isImportant = false

    onFiltersChange({
      ...filters,
      isImportant,
      // Clear false alarm filter if filtering by important
      isFalseAlarm: isImportant ? undefined : filters.isFalseAlarm,
    })
  }

  const handleFalseAlarmChange = (value: string) => {
    let isFalseAlarm: boolean | undefined
    if (value === 'true') isFalseAlarm = true
    else if (value === 'false') isFalseAlarm = false

    onFiltersChange({
      ...filters,
      isFalseAlarm,
      // Clear important filter if filtering by false alarm
      isImportant: isFalseAlarm ? undefined : filters.isImportant,
    })
  }

  const handleTimeFilterToggle = (enabled: boolean) => {
    setShowTimeFilter(enabled)
    if (!enabled) {
      // Clear time filters when disabling
      onFiltersChange({
        ...filters,
        startTime: undefined,
        endTime: undefined,
      })
    }
  }

  const handleTimePresetChange = (preset: TimePreset) => {
    onFiltersChange({
      ...filters,
      startTime: preset.startTime,
      endTime: preset.endTime,
    })
  }

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newFilters = { ...filters, [field]: value }
    // Only apply if both times are set
    if (newFilters.startTime && newFilters.endTime) {
      onFiltersChange(newFilters)
    } else {
      // Update local state but don't trigger filter change until both are set
      onFiltersChange(newFilters)
    }
  }

  const getActiveTimePreset = (): string | null => {
    if (!filters.startTime || !filters.endTime) return null
    const match = TIME_PRESETS.find(
      (p) => p.startTime === filters.startTime && p.endTime === filters.endTime,
    )
    return match?.id ?? null
  }

  const clearFilters = () => {
    setShowCustomDates(false)
    setShowTimeFilter(false)
    onFiltersChange({})
  }

  const hasActiveFilters =
    filters.cameraId ||
    filters.startDate ||
    filters.endDate ||
    (filters.startTime && filters.endTime) ||
    filters.isImportant !== undefined ||
    filters.isFalseAlarm !== undefined

  const activeTimePreset = getActiveTimePreset()
  const hasOvernightRange =
    filters.startTime && filters.endTime && isOvernightRange(filters.startTime, filters.endTime)

  const currentPreset = getDatePreset()

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-3">
        {/* Camera filter */}
        <select
          value={filters.cameraId ?? ''}
          onChange={(e) => handleCameraChange(e.target.value)}
          className="
            bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2
            text-sm text-gray-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          "
        >
          <option value="">All Cameras</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name}
            </option>
          ))}
        </select>

        {/* Date preset buttons */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-slate-700">
          {(['all', 'today', 'week', 'month'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => handleDatePresetChange(preset)}
              className={`
                px-3 py-2 text-sm font-medium transition-colors
                ${
                  currentPreset === preset && !showCustomDates
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }
              `}
            >
              {preset === 'all' && 'All Time'}
              {preset === 'today' && 'Today'}
              {preset === 'week' && '7 Days'}
              {preset === 'month' && '30 Days'}
            </button>
          ))}
          <button
            onClick={() => handleDatePresetChange('custom')}
            className={`
              px-3 py-2 text-sm font-medium transition-colors
              ${
                showCustomDates || currentPreset === 'custom'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }
            `}
          >
            Custom
          </button>
        </div>

        {/* Importance filter */}
        <select
          value={
            filters.isImportant === true
              ? 'true'
              : filters.isFalseAlarm === true
                ? 'false-alarm'
                : ''
          }
          onChange={(e) => {
            if (e.target.value === 'true') {
              handleImportantChange('true')
            } else if (e.target.value === 'false-alarm') {
              handleFalseAlarmChange('true')
            } else {
              onFiltersChange({
                ...filters,
                isImportant: undefined,
                isFalseAlarm: undefined,
              })
            }
          }}
          className="
            bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2
            text-sm text-gray-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          "
        >
          <option value="">All Events</option>
          <option value="true">Important Only</option>
          <option value="false-alarm">False Alarms</option>
        </select>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="
              px-3 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200
              transition-colors
            "
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Custom date inputs */}
      {showCustomDates && (
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            From:
            <input
              type="date"
              value={timestampToDateInput(filters.startDate)}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="
                bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5
                text-sm text-gray-900 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              "
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            To:
            <input
              type="date"
              value={timestampToDateInput(filters.endDate)}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="
                bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5
                text-sm text-gray-900 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              "
            />
          </label>
        </div>
      )}

      {/* Time of day filter */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showTimeFilter}
            onChange={(e) => handleTimeFilterToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-gray-700 dark:text-slate-300">Filter by time of day</span>
          {hasOvernightRange && (
            <span className="text-xs text-amber-600 dark:text-amber-400">(overnight)</span>
          )}
        </label>

        {showTimeFilter && (
          <div className="pl-6 space-y-3">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleTimePresetChange(preset)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                    ${
                      activeTimePreset === preset.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Time inputs */}
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                From:
                <input
                  type="time"
                  value={filters.startTime ?? ''}
                  onChange={(e) => handleTimeChange('startTime', e.target.value)}
                  className="
                    bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5
                    text-sm text-gray-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  "
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                To:
                <input
                  type="time"
                  value={filters.endTime ?? ''}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  className="
                    bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5
                    text-sm text-gray-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  "
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
