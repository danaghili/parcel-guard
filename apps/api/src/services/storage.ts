import { getDb } from '../db'
import { deleteExpiredEvents, getExpiredEvents } from './events'
import { getSetting } from './settings'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Base paths for media files
const CLIPS_PATH = process.env.CLIPS_PATH ?? './data/clips'
const THUMBNAILS_PATH = process.env.THUMBNAILS_PATH ?? './data/thumbnails'
const DATA_PATH = process.env.DATA_PATH ?? './data'

export interface StorageStats {
  total: number // bytes
  used: number // bytes
  available: number // bytes
  percentage: number // 0-100
  clips: {
    count: number
    size: number // bytes
  }
  thumbnails: {
    count: number
    size: number // bytes
  }
  database: {
    size: number // bytes
  }
}

export interface CleanupResult {
  eventsDeleted: number
  filesDeleted: number
  bytesFreed: number
}

/**
 * Get storage statistics
 * Note: This is a simplified version that counts database records
 * In production, you'd scan the actual filesystem
 */
export function getStorageStats(): StorageStats {
  const db = getDb()

  // Count clips and thumbnails from database
  const eventStats = db
    .prepare(`
      SELECT
        COUNT(*) as totalEvents,
        COUNT(videoPath) as clipsCount,
        COUNT(thumbnailPath) as thumbnailsCount
      FROM motion_events
    `)
    .get() as { totalEvents: number; clipsCount: number; thumbnailsCount: number }

  // Estimate sizes (rough estimates without scanning filesystem)
  // Average clip: 5MB, Average thumbnail: 50KB
  const estimatedClipSize = eventStats.clipsCount * 5 * 1024 * 1024
  const estimatedThumbnailSize = eventStats.thumbnailsCount * 50 * 1024

  // Get database file size (if exists)
  let dbSize = 0
  try {
    const dbPath = process.env.DATABASE_PATH ?? path.join(DATA_PATH, 'parcelguard.db')
    if (existsSync(dbPath)) {
      const stats = require('fs').statSync(dbPath)
      dbSize = stats.size
    }
  } catch {
    // Ignore errors
  }

  const usedBytes = estimatedClipSize + estimatedThumbnailSize + dbSize

  // Assume 256GB total storage (from hardware spec)
  const totalBytes = 256 * 1024 * 1024 * 1024

  return {
    total: totalBytes,
    used: usedBytes,
    available: totalBytes - usedBytes,
    percentage: Math.round((usedBytes / totalBytes) * 100),
    clips: {
      count: eventStats.clipsCount,
      size: estimatedClipSize,
    },
    thumbnails: {
      count: eventStats.thumbnailsCount,
      size: estimatedThumbnailSize,
    },
    database: {
      size: dbSize,
    },
  }
}

/**
 * Clean up expired events and their associated files
 */
export async function cleanupExpiredEvents(): Promise<CleanupResult> {
  // Get retention days from settings (default 14)
  const retentionDays = parseInt(getSetting('retentionDays') ?? '14', 10)

  // Calculate cutoff timestamp
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000)

  // Get expired events before deleting (to clean up files)
  const expiredEvents = getExpiredEvents(cutoffTimestamp)

  let filesDeleted = 0
  let bytesFreed = 0

  // Delete associated files
  for (const event of expiredEvents) {
    // Delete video clip
    if (event.videoPath) {
      const clipPath = path.join(CLIPS_PATH, event.videoPath)
      try {
        if (existsSync(clipPath)) {
          const stats = require('fs').statSync(clipPath)
          bytesFreed += stats.size
          await unlink(clipPath)
          filesDeleted++
        }
      } catch (error) {
        console.error(`Failed to delete clip: ${clipPath}`, error)
      }
    }

    // Delete thumbnail
    if (event.thumbnailPath) {
      const thumbnailPath = path.join(THUMBNAILS_PATH, event.thumbnailPath)
      try {
        if (existsSync(thumbnailPath)) {
          const stats = require('fs').statSync(thumbnailPath)
          bytesFreed += stats.size
          await unlink(thumbnailPath)
          filesDeleted++
        }
      } catch (error) {
        console.error(`Failed to delete thumbnail: ${thumbnailPath}`, error)
      }
    }
  }

  // Delete events from database
  const eventsDeleted = deleteExpiredEvents(cutoffTimestamp)

  return {
    eventsDeleted,
    filesDeleted,
    bytesFreed,
  }
}

/**
 * Check if storage is above threshold
 */
export function isStorageWarning(thresholdPercent = 80): boolean {
  const stats = getStorageStats()
  return stats.percentage >= thresholdPercent
}

/**
 * Check if storage is critical
 */
export function isStorageCritical(thresholdPercent = 95): boolean {
  const stats = getStorageStats()
  return stats.percentage >= thresholdPercent
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
