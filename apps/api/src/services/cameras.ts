import { getDb } from '../db'
import { Errors } from '../lib/errors'
import type { Camera, CameraHealth } from '@parcelguard/shared'

interface CameraRow {
  id: string
  name: string
  streamUrl: string
  status: string
  lastSeen: number | null
  motionSensitivity: number
  motionZones: string
  notificationsEnabled: number
  createdAt: number
  updatedAt: number
}

function rowToCamera(row: CameraRow): Camera {
  return {
    id: row.id,
    name: row.name,
    streamUrl: row.streamUrl,
    status: row.status as 'online' | 'offline',
    lastSeen: row.lastSeen,
    settings: {
      motionSensitivity: row.motionSensitivity,
      motionZones: JSON.parse(row.motionZones || '[]'),
      recordingSchedule: null,
      notificationsEnabled: row.notificationsEnabled === 1,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// Consider a camera offline if no status received in 3 minutes
const OFFLINE_THRESHOLD_SECONDS = 180

export function getAllCameras(): Camera[] {
  const db = getDb()

  // First, mark cameras as offline if they haven't been seen recently
  markStaleOffline()

  const rows = db.prepare('SELECT * FROM cameras ORDER BY name').all() as CameraRow[]
  return rows.map(rowToCamera)
}

/**
 * Mark cameras as offline if they haven't sent a status update recently
 */
export function markStaleOffline(): void {
  const db = getDb()
  const cutoff = Math.floor(Date.now() / 1000) - OFFLINE_THRESHOLD_SECONDS

  // Handle various lastSeen formats:
  // - NULL: mark offline
  // - Unix seconds (10 digits): compare directly
  // - Unix milliseconds (13 digits): divide by 1000
  // - ISO string: parse and compare
  db.prepare(`
    UPDATE cameras
    SET status = 'offline', updatedAt = unixepoch()
    WHERE status = 'online' AND (
      lastSeen IS NULL
      OR (typeof(lastSeen) = 'integer' AND lastSeen > 1000000000000 AND lastSeen / 1000 < ?)
      OR (typeof(lastSeen) = 'integer' AND lastSeen <= 1000000000000 AND lastSeen < ?)
      OR (typeof(lastSeen) = 'text' AND lastSeen != '' AND strftime('%s', lastSeen) < ?)
    )
  `).run(cutoff, cutoff, cutoff)
}

export function getCameraById(id: string): Camera | null {
  const db = getDb()

  // First, mark cameras as offline if they haven't been seen recently
  markStaleOffline()

  const row = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as CameraRow | undefined

  if (!row) {
    return null
  }

  return rowToCamera(row)
}

/**
 * Normalize a timestamp to unix seconds
 */
function normalizeTimestamp(timestamp: unknown): number {
  if (typeof timestamp === 'string') {
    // ISO string like "2025-12-09T13:44:53.827708Z"
    const parsed = Date.parse(timestamp)
    if (!isNaN(parsed)) {
      return Math.floor(parsed / 1000)
    }
  }
  if (typeof timestamp === 'number') {
    // If it's in milliseconds (> year 2001 in seconds), convert to seconds
    if (timestamp > 1_000_000_000_000) {
      return Math.floor(timestamp / 1000)
    }
    return Math.floor(timestamp)
  }
  // Fallback to now
  return Math.floor(Date.now() / 1000)
}

export function updateCameraHealth(id: string, health: CameraHealth): Camera {
  const db = getDb()

  // Check camera exists
  const existing = db.prepare('SELECT id FROM cameras WHERE id = ?').get(id)
  if (!existing) {
    throw Errors.notFound('Camera')
  }

  // Normalize timestamp to unix seconds
  const lastSeenSeconds = normalizeTimestamp(health.timestamp)

  // Update camera status and lastSeen
  db.prepare(`
    UPDATE cameras
    SET status = 'online', lastSeen = ?, updatedAt = unixepoch()
    WHERE id = ?
  `).run(lastSeenSeconds, id)

  const camera = getCameraById(id)
  if (!camera) {
    throw Errors.internal('Camera not found after update')
  }

  return camera
}

export function getCameraCount(): { total: number; online: number; offline: number } {
  const db = getDb()

  // First, mark cameras as offline if they haven't been seen recently
  markStaleOffline()

  const total = (
    db.prepare('SELECT COUNT(*) as count FROM cameras').get() as { count: number }
  ).count

  const online = (
    db.prepare("SELECT COUNT(*) as count FROM cameras WHERE status = 'online'").get() as {
      count: number
    }
  ).count

  return {
    total,
    online,
    offline: total - online,
  }
}

export interface UpdateCameraInput {
  name?: string
  streamUrl?: string
  motionSensitivity?: number
  motionZones?: unknown[]
  notificationsEnabled?: boolean
}

export function updateCamera(id: string, input: UpdateCameraInput): Camera {
  const db = getDb()

  // Check camera exists
  const existing = getCameraById(id)
  if (!existing) {
    throw Errors.notFound('Camera')
  }

  const updates: string[] = []
  const values: unknown[] = []

  if (input.name !== undefined) {
    updates.push('name = ?')
    values.push(input.name)
  }
  if (input.streamUrl !== undefined) {
    updates.push('streamUrl = ?')
    values.push(input.streamUrl)
  }
  if (input.motionSensitivity !== undefined) {
    // Validate range 0-100
    const sensitivity = Math.max(0, Math.min(100, input.motionSensitivity))
    updates.push('motionSensitivity = ?')
    values.push(sensitivity)
  }
  if (input.motionZones !== undefined) {
    updates.push('motionZones = ?')
    values.push(JSON.stringify(input.motionZones))
  }
  if (input.notificationsEnabled !== undefined) {
    updates.push('notificationsEnabled = ?')
    values.push(input.notificationsEnabled ? 1 : 0)
  }

  if (updates.length > 0) {
    updates.push('updatedAt = unixepoch()')
    values.push(id)
    db.prepare(`UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  const camera = getCameraById(id)
  if (!camera) {
    throw Errors.internal('Camera not found after update')
  }

  return camera
}

export interface CreateCameraInput {
  id: string
  name: string
  streamUrl: string
  motionSensitivity?: number
  notificationsEnabled?: boolean
}

export function createCamera(input: CreateCameraInput): Camera {
  const db = getDb()

  // Check if camera with this ID already exists
  const existing = getCameraById(input.id)
  if (existing) {
    throw Errors.badRequest(`Camera with ID ${input.id} already exists`)
  }

  db.prepare(`
    INSERT INTO cameras (id, name, streamUrl, motionSensitivity, notificationsEnabled, status)
    VALUES (?, ?, ?, ?, ?, 'offline')
  `).run(
    input.id,
    input.name,
    input.streamUrl,
    input.motionSensitivity ?? 50,
    input.notificationsEnabled !== false ? 1 : 0,
  )

  const camera = getCameraById(input.id)
  if (!camera) {
    throw Errors.internal('Camera not found after creation')
  }

  return camera
}

export function deleteCamera(id: string): void {
  const db = getDb()

  const result = db.prepare('DELETE FROM cameras WHERE id = ?').run(id)

  if (result.changes === 0) {
    throw Errors.notFound('Camera')
  }
}
