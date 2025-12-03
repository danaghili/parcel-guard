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

export function getAllCameras(): Camera[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM cameras ORDER BY name').all() as CameraRow[]
  return rows.map(rowToCamera)
}

export function getCameraById(id: string): Camera | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id) as CameraRow | undefined

  if (!row) {
    return null
  }

  return rowToCamera(row)
}

export function updateCameraHealth(id: string, health: CameraHealth): Camera {
  const db = getDb()

  // Check camera exists
  const existing = db.prepare('SELECT id FROM cameras WHERE id = ?').get(id)
  if (!existing) {
    throw Errors.notFound('Camera')
  }

  // Update camera status and lastSeen
  db.prepare(`
    UPDATE cameras
    SET status = 'online', lastSeen = ?, updatedAt = unixepoch()
    WHERE id = ?
  `).run(health.timestamp, id)

  const camera = getCameraById(id)
  if (!camera) {
    throw Errors.internal('Camera not found after update')
  }

  return camera
}

export function getCameraCount(): { total: number; online: number; offline: number } {
  const db = getDb()

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
