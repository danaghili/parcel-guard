import { getDb } from '../db'
import { Errors } from '../lib/errors'
import type { MotionEvent, EventFilters, PaginatedEvents } from '@parcelguard/shared'

interface EventRow {
  id: string
  cameraId: string
  timestamp: number
  duration: number | null
  thumbnailPath: string | null
  videoPath: string | null
  isImportant: number
  isFalseAlarm: number
  createdAt: number
}

function rowToEvent(row: EventRow): MotionEvent {
  return {
    id: row.id,
    cameraId: row.cameraId,
    timestamp: row.timestamp,
    duration: row.duration,
    thumbnailPath: row.thumbnailPath,
    videoPath: row.videoPath,
    isImportant: row.isImportant === 1,
    isFalseAlarm: row.isFalseAlarm === 1,
    createdAt: row.createdAt,
  }
}

export interface CreateEventInput {
  id: string
  cameraId: string
  timestamp: number
  duration?: number | null
  thumbnailPath?: string | null
  videoPath?: string | null
}

export interface UpdateEventInput {
  duration?: number | null
  thumbnailPath?: string | null
  videoPath?: string | null
  isImportant?: boolean
  isFalseAlarm?: boolean
}

/**
 * Create a new motion event
 */
export function createEvent(input: CreateEventInput): MotionEvent {
  const db = getDb()

  // Verify camera exists
  const camera = db.prepare('SELECT id FROM cameras WHERE id = ?').get(input.cameraId)
  if (!camera) {
    throw Errors.badRequest(`Camera ${input.cameraId} not found`)
  }

  db.prepare(`
    INSERT INTO motion_events (id, cameraId, timestamp, duration, thumbnailPath, videoPath)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.cameraId,
    input.timestamp,
    input.duration ?? null,
    input.thumbnailPath ?? null,
    input.videoPath ?? null,
  )

  const event = getEventById(input.id)
  if (!event) {
    throw Errors.internal('Event not found after creation')
  }

  return event
}

/**
 * Get a single event by ID
 */
export function getEventById(id: string): MotionEvent | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM motion_events WHERE id = ?').get(id) as
    | EventRow
    | undefined

  if (!row) {
    return null
  }

  return rowToEvent(row)
}

/**
 * Update an existing event
 */
export function updateEvent(id: string, input: UpdateEventInput): MotionEvent {
  const db = getDb()

  // Check event exists
  const existing = getEventById(id)
  if (!existing) {
    throw Errors.notFound('Event')
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (input.duration !== undefined) {
    updates.push('duration = ?')
    values.push(input.duration)
  }
  if (input.thumbnailPath !== undefined) {
    updates.push('thumbnailPath = ?')
    values.push(input.thumbnailPath)
  }
  if (input.videoPath !== undefined) {
    updates.push('videoPath = ?')
    values.push(input.videoPath)
  }
  if (input.isImportant !== undefined) {
    updates.push('isImportant = ?')
    values.push(input.isImportant ? 1 : 0)
  }
  if (input.isFalseAlarm !== undefined) {
    updates.push('isFalseAlarm = ?')
    values.push(input.isFalseAlarm ? 1 : 0)
  }

  if (updates.length > 0) {
    values.push(id)
    db.prepare(`UPDATE motion_events SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  const event = getEventById(id)
  if (!event) {
    throw Errors.internal('Event not found after update')
  }

  return event
}

/**
 * Delete an event by ID
 */
export function deleteEvent(id: string): void {
  const db = getDb()

  const result = db.prepare('DELETE FROM motion_events WHERE id = ?').run(id)

  if (result.changes === 0) {
    throw Errors.notFound('Event')
  }
}

/**
 * Delete multiple events by IDs
 */
export function deleteEvents(ids: string[]): number {
  if (ids.length === 0) return 0

  const db = getDb()
  const placeholders = ids.map(() => '?').join(', ')
  const result = db.prepare(`DELETE FROM motion_events WHERE id IN (${placeholders})`).run(...ids)

  return result.changes
}

/**
 * Get paginated events with filters
 */
export function getEvents(
  filters: EventFilters = {},
  page = 1,
  pageSize = 20,
): PaginatedEvents {
  const db = getDb()

  const conditions: string[] = []
  const values: unknown[] = []

  // Camera filter
  if (filters.cameraId) {
    conditions.push('cameraId = ?')
    values.push(filters.cameraId)
  }

  // Date range filters
  if (filters.startDate) {
    conditions.push('timestamp >= ?')
    values.push(filters.startDate)
  }
  if (filters.endDate) {
    conditions.push('timestamp <= ?')
    values.push(filters.endDate)
  }

  // Time of day filter (filter by hour/minute regardless of date)
  if (filters.startTime && filters.endTime) {
    // Convert HH:mm to minutes since midnight for comparison
    const startParts = filters.startTime.split(':').map(Number)
    const endParts = filters.endTime.split(':').map(Number)
    const startHour = startParts[0] ?? 0
    const startMin = startParts[1] ?? 0
    const endHour = endParts[0] ?? 23
    const endMin = endParts[1] ?? 59
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Use SQLite time functions to extract hour and minute from timestamp
    // timestamp is Unix epoch (seconds), convert to local time for comparison
    // Use 'localtime' modifier so time filtering matches user's local timezone
    const timeExpr = `(strftime('%H', timestamp, 'unixepoch', 'localtime') * 60 + strftime('%M', timestamp, 'unixepoch', 'localtime'))`

    if (startMinutes > endMinutes) {
      // Overnight range (e.g., 22:00-06:00): use OR to match times >= start OR <= end
      conditions.push(`(${timeExpr} >= ? OR ${timeExpr} <= ?)`)
      values.push(startMinutes, endMinutes)
    } else {
      // Normal range (e.g., 09:00-17:00): use BETWEEN
      conditions.push(`(${timeExpr} BETWEEN ? AND ?)`)
      values.push(startMinutes, endMinutes)
    }
  }

  // Importance filter
  if (filters.isImportant !== undefined) {
    conditions.push('isImportant = ?')
    values.push(filters.isImportant ? 1 : 0)
  }

  // False alarm filter
  if (filters.isFalseAlarm !== undefined) {
    conditions.push('isFalseAlarm = ?')
    values.push(filters.isFalseAlarm ? 1 : 0)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM motion_events ${whereClause}`
  const { count: total } = db.prepare(countQuery).get(...values) as { count: number }

  // Get paginated results
  const offset = (page - 1) * pageSize
  const dataQuery = `
    SELECT * FROM motion_events
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(dataQuery).all(...values, pageSize, offset) as EventRow[]

  return {
    events: rows.map(rowToEvent),
    total,
    page,
    pageSize,
    hasMore: offset + rows.length < total,
  }
}

/**
 * Get events older than a certain date that are not marked as important
 */
export function getExpiredEvents(beforeTimestamp: number): MotionEvent[] {
  const db = getDb()

  const rows = db
    .prepare(`
      SELECT * FROM motion_events
      WHERE timestamp < ? AND isImportant = 0
      ORDER BY timestamp ASC
    `)
    .all(beforeTimestamp) as EventRow[]

  return rows.map(rowToEvent)
}

/**
 * Delete events older than a certain date (respects important flag)
 */
export function deleteExpiredEvents(beforeTimestamp: number): number {
  const db = getDb()

  const result = db
    .prepare(`
      DELETE FROM motion_events
      WHERE timestamp < ? AND isImportant = 0
    `)
    .run(beforeTimestamp)

  return result.changes
}

/**
 * Get event count statistics
 */
export function getEventStats(): {
  total: number
  today: number
  important: number
  falseAlarms: number
} {
  const db = getDb()

  const total = (
    db.prepare('SELECT COUNT(*) as count FROM motion_events').get() as { count: number }
  ).count

  // Today's events (since midnight)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTimestamp = Math.floor(todayStart.getTime() / 1000)

  const today = (
    db.prepare('SELECT COUNT(*) as count FROM motion_events WHERE timestamp >= ?').get(
      todayTimestamp,
    ) as { count: number }
  ).count

  const important = (
    db.prepare('SELECT COUNT(*) as count FROM motion_events WHERE isImportant = 1').get() as {
      count: number
    }
  ).count

  const falseAlarms = (
    db.prepare('SELECT COUNT(*) as count FROM motion_events WHERE isFalseAlarm = 1').get() as {
      count: number
    }
  ).count

  return { total, today, important, falseAlarms }
}
