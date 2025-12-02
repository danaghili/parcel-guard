export interface MotionEvent {
  id: string
  cameraId: string
  timestamp: number // Unix timestamp
  duration: number | null // seconds
  thumbnailPath: string | null
  videoPath: string | null
  isImportant: boolean
  isFalseAlarm: boolean
  createdAt: number
}

export interface EventFilters {
  cameraId?: string
  startDate?: number // Unix timestamp
  endDate?: number // Unix timestamp
  startTime?: string // "HH:mm" format - time of day filter
  endTime?: string // "HH:mm" format
  isImportant?: boolean
  isFalseAlarm?: boolean
}

export interface PaginatedEvents {
  events: MotionEvent[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
