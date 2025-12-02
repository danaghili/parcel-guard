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
