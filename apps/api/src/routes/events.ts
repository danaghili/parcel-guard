import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  deleteEvents,
  getEvents,
  getEventStats,
} from '../services/events'
import { getCameraById } from '../services/cameras'
import { sendMotionAlert } from '../services/notifications'
import { ApiError } from '../lib/errors'
import type { EventFilters } from '@parcelguard/shared'
import { createReadStream, existsSync, readdirSync, mkdirSync, createWriteStream } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'
import { pipeline } from 'stream/promises'
import { optimizeImage, getBestFormat } from '../services/images'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Base paths for media files
const CLIPS_PATH = process.env.CLIPS_PATH ?? './data/clips'
const THUMBNAILS_PATH = process.env.THUMBNAILS_PATH ?? './data/thumbnails'

/**
 * Get the duration of a video file using ffprobe
 * Returns duration in seconds, or null if unable to determine
 */
async function getVideoDuration(videoPath: string): Promise<number | null> {
  const fullPath = path.join(CLIPS_PATH, videoPath)

  if (!existsSync(fullPath)) {
    return null
  }

  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`
    )
    const duration = parseFloat(stdout.trim())
    return isNaN(duration) ? null : Math.round(duration)
  } catch {
    return null
  }
}

/**
 * Find actual video file for an event, accounting for timestamp drift
 * Motion daemon may create files with timestamps a few seconds off from what we expect
 * Returns the actual video path relative to CLIPS_PATH, or null if not found
 */
function findVideoFile(cameraId: string, timestamp: number, toleranceSeconds: number = 5): string | null {
  const cameraDir = path.join(CLIPS_PATH, cameraId)

  if (!existsSync(cameraDir)) {
    return null
  }

  // Generate expected filename pattern from timestamp
  const eventDate = new Date(timestamp * 1000)
  const expectedPrefix = eventDate.toISOString().slice(0, 10).replace(/-/g, '') + '_' +
    eventDate.toISOString().slice(11, 19).replace(/:/g, '')

  try {
    const files = readdirSync(cameraDir).filter(f => f.endsWith('.mp4'))

    // First try exact match
    const exactMatch = files.find(f => f === `${expectedPrefix}.mp4`)
    if (exactMatch) {
      return `${cameraId}/${exactMatch}`
    }

    // Otherwise find closest file within tolerance window
    let bestMatch: string | null = null
    let smallestDiff = Infinity

    for (const file of files) {
      // Parse timestamp from filename (format: YYYYMMDD_HHMMSS.mp4)
      const match = file.match(/^(\d{8}_\d{6})\.mp4$/)
      if (!match || !match[1]) continue

      const fileTimestamp = match[1]
      const year = parseInt(fileTimestamp.slice(0, 4))
      const month = parseInt(fileTimestamp.slice(4, 6)) - 1
      const day = parseInt(fileTimestamp.slice(6, 8))
      const hour = parseInt(fileTimestamp.slice(9, 11))
      const minute = parseInt(fileTimestamp.slice(11, 13))
      const second = parseInt(fileTimestamp.slice(13, 15))

      const fileDate = new Date(year, month, day, hour, minute, second)
      const fileUnixTime = Math.floor(fileDate.getTime() / 1000)
      const diff = Math.abs(fileUnixTime - timestamp)

      if (diff <= toleranceSeconds && diff < smallestDiff) {
        smallestDiff = diff
        bestMatch = `${cameraId}/${file}`
      }
    }

    return bestMatch
  } catch {
    return null
  }
}

interface EventParams {
  id: string
}

interface EventQuerystring {
  cameraId?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  isImportant?: string
  isFalseAlarm?: string
  page?: string
  pageSize?: string
}

interface UpdateEventBody {
  isImportant?: boolean
  isFalseAlarm?: boolean
}

interface BulkDeleteBody {
  ids: string[]
}

interface MotionEventBody {
  cameraId: string
  eventId: string
  type: 'start' | 'end'
  timestamp: number
}

export const eventsRoutes: FastifyPluginAsync = async (
  server: FastifyInstance,
): Promise<void> => {
  /**
   * Motion daemon webhook endpoint
   * Receives events from Motion when motion is detected
   * No auth required - Motion calls this internally
   */
  server.post<{ Body: MotionEventBody }>(
    '/motion/events',
    async (request, reply) => {
      const { cameraId, eventId, type, timestamp } = request.body

      if (!cameraId || !eventId || !type) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Missing required fields: cameraId, eventId, type',
        })
      }

      server.log.info(
        { eventId, type, camera: cameraId },
        'Received Motion event',
      )

      try {
        if (type === 'start') {
          // Create new event
          // Format timestamp to match Motion's filename format: YYYYMMDD_HHMMSS
          const eventDate = new Date(timestamp * 1000)
          const dateStr = eventDate.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
          const timeStr = eventDate.toISOString().slice(11, 19).replace(/:/g, '') // HHMMSS
          const motionTimestamp = `${dateStr}_${timeStr}`

          const event = createEvent({
            id: `motion-${cameraId}-${eventId}`,
            cameraId,
            timestamp: timestamp || Math.floor(Date.now() / 1000),
            duration: null,
            thumbnailPath: `${cameraId}_${motionTimestamp}.jpg`,
            videoPath: `${cameraId}/${motionTimestamp}.mp4`,
          })

          // Trigger notification (non-blocking)
          const camera = getCameraById(cameraId)
          if (camera) {
            sendMotionAlert(
              {
                id: event.id,
                cameraId: event.cameraId,
                timestamp: event.timestamp,
                thumbnailPath: event.thumbnailPath,
              },
              camera,
            )
              .then((result) => {
                if (result.sent) {
                  server.log.info({ eventId: event.id, camera: camera.name }, 'Notification sent')
                } else {
                  server.log.debug(
                    { eventId: event.id, reason: result.reason },
                    'Notification not sent',
                  )
                }
              })
              .catch((err) => {
                server.log.error({ eventId: event.id, error: err }, 'Notification failed')
              })
          }

          return reply.status(201).send({
            success: true,
            data: event,
          })
        } else if (type === 'end') {
          // Update existing event with duration from actual video file
          const id = `motion-${cameraId}-${eventId}`
          const existing = getEventById(id)

          if (existing) {
            // Try to get actual video duration from file
            // Fall back to timestamp-based calculation if file not available yet
            let duration: number | null = null

            if (existing.videoPath) {
              duration = await getVideoDuration(existing.videoPath)
              if (duration) {
                server.log.debug(
                  { eventId: id, duration, videoPath: existing.videoPath },
                  'Got duration from video file'
                )
              }
            }

            // Fall back to timestamp calculation if video not available
            if (duration === null) {
              duration = timestamp - existing.timestamp
              server.log.debug(
                { eventId: id, duration },
                'Using timestamp-based duration (video not available)'
              )
            }

            const event = updateEvent(id, {
              duration,
            })

            return reply.send({
              success: true,
              data: event,
            })
          } else {
            server.log.warn({ eventId: id }, 'End event for non-existent motion event')
            return reply.send({ success: true })
          }
        }

        return reply.send({ success: true })
      } catch (error) {
        server.log.error({ error, body: request.body }, 'Failed to process Motion event')

        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }

        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to process event',
        })
      }
    },
  )

  /**
   * Upload clip from camera
   * Called by camera after recording motion event locally
   */
  server.post('/clips/upload', async (request, reply) => {
    try {
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'No file uploaded',
        })
      }

      // Get form fields
      const fields = data.fields as Record<string, { value: string } | undefined>
      const cameraId = fields.cameraId?.value
      const eventId = fields.eventId?.value
      const timestamp = fields.timestamp?.value

      if (!cameraId || !eventId || !timestamp) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Missing required fields: cameraId, eventId, timestamp',
        })
      }

      // Ensure camera directory exists
      const cameraDir = path.join(CLIPS_PATH, cameraId)
      if (!existsSync(cameraDir)) {
        mkdirSync(cameraDir, { recursive: true })
      }

      // Generate filename from timestamp
      const eventDate = new Date(parseInt(timestamp) * 1000)
      const dateStr = eventDate.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStr = eventDate.toISOString().slice(11, 19).replace(/:/g, '')
      const filename = `${dateStr}_${timeStr}.mp4`
      const filePath = path.join(cameraDir, filename)

      // Save the file
      const writeStream = createWriteStream(filePath)
      await pipeline(data.file, writeStream)

      const stats = await stat(filePath)
      server.log.info(
        { cameraId, eventId, filename, size: stats.size },
        'Clip uploaded successfully'
      )

      // Update event with video path if it exists
      const fullEventId = `motion-${cameraId}-${eventId}`
      const event = getEventById(fullEventId)
      if (event) {
        // Get actual duration from video
        const duration = await getVideoDuration(`${cameraId}/${filename}`)
        updateEvent(fullEventId, {
          videoPath: `${cameraId}/${filename}`,
          duration: duration ?? undefined,
        })
      }

      // Generate thumbnail from video
      // Use -ss 00:00:00.5 to handle short clips, -update 1 for newer ffmpeg versions
      const thumbnailPath = path.join(THUMBNAILS_PATH, `${cameraId}_${dateStr}_${timeStr}.jpg`)
      try {
        await execAsync(
          `ffmpeg -i "${filePath}" -ss 00:00:00.5 -vframes 1 -update 1 -y "${thumbnailPath}" 2>/dev/null`
        )
        server.log.debug({ thumbnailPath }, 'Thumbnail generated')

        // Update event with thumbnail path
        if (event) {
          updateEvent(fullEventId, {
            thumbnailPath: `${cameraId}_${dateStr}_${timeStr}.jpg`,
          })
        }
      } catch (err) {
        server.log.warn({ err }, 'Failed to generate thumbnail')
      }

      return reply.send({
        success: true,
        data: {
          filename,
          size: stats.size,
        },
      })
    } catch (error) {
      server.log.error({ error }, 'Clip upload failed')
      return reply.status(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload clip',
      })
    }
  })

  /**
   * List events with filtering and pagination
   */
  server.get<{ Querystring: EventQuerystring }>(
    '/events',
    { preHandler: requireAuth },
    async (request, reply) => {
      const {
        cameraId,
        startDate,
        endDate,
        startTime,
        endTime,
        isImportant,
        isFalseAlarm,
        page = '1',
        pageSize = '20',
      } = request.query

      const filters: EventFilters = {}

      if (cameraId) filters.cameraId = cameraId
      if (startDate) filters.startDate = parseInt(startDate, 10)
      if (endDate) filters.endDate = parseInt(endDate, 10)
      if (startTime) filters.startTime = startTime
      if (endTime) filters.endTime = endTime
      if (isImportant !== undefined) filters.isImportant = isImportant === 'true'
      if (isFalseAlarm !== undefined) filters.isFalseAlarm = isFalseAlarm === 'true'

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      const result = getEvents(filters, pageNum, pageSizeNum)

      return reply.send({
        success: true,
        data: result,
      })
    },
  )

  /**
   * Get event statistics
   */
  server.get('/events/stats', { preHandler: requireAuth }, async (_request, reply) => {
    const stats = getEventStats()

    return reply.send({
      success: true,
      data: stats,
    })
  })

  /**
   * Get single event by ID
   * Also corrects duration from actual video file if it differs from stored value
   */
  server.get<{ Params: EventParams }>(
    '/events/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const event = getEventById(id)

      if (!event) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      // Try to get actual video duration and correct if needed
      if (event.videoPath) {
        let videoPath = event.videoPath
        let filePath = path.join(CLIPS_PATH, videoPath)

        // Find actual file if stored path doesn't exist
        if (!existsSync(filePath)) {
          const actualPath = findVideoFile(event.cameraId, event.timestamp)
          if (actualPath) {
            videoPath = actualPath
            filePath = path.join(CLIPS_PATH, actualPath)
          }
        }

        if (existsSync(filePath)) {
          const actualDuration = await getVideoDuration(videoPath)
          if (actualDuration !== null && actualDuration !== event.duration) {
            // Update database with correct duration
            updateEvent(id, { duration: actualDuration })
            event.duration = actualDuration
            server.log.debug(
              { eventId: id, oldDuration: event.duration, newDuration: actualDuration },
              'Corrected event duration from video file'
            )
          }
        }
      }

      return reply.send({
        success: true,
        data: event,
      })
    },
  )

  /**
   * Update event (mark important, false alarm)
   */
  server.put<{ Params: EventParams; Body: UpdateEventBody }>(
    '/events/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const { isImportant, isFalseAlarm } = request.body

      try {
        const event = updateEvent(id, { isImportant, isFalseAlarm })

        return reply.send({
          success: true,
          data: event,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  /**
   * Delete single event
   */
  server.delete<{ Params: EventParams }>(
    '/events/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      try {
        deleteEvent(id)

        return reply.send({
          success: true,
          message: 'Event deleted',
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  /**
   * Bulk delete events
   */
  server.post<{ Body: BulkDeleteBody }>(
    '/events/bulk-delete',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { ids } = request.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'ids must be a non-empty array',
        })
      }

      const deletedCount = deleteEvents(ids)

      return reply.send({
        success: true,
        data: { deletedCount },
      })
    },
  )

  /**
   * Get event thumbnail
   * Supports WebP format if client accepts it (via Accept header)
   * Falls back to JPEG for older browsers
   * Note: No auth required - event IDs are random UUIDs and thumbnails
   * need to be loadable via <img> tags which can't send auth headers
   */
  server.get<{ Params: EventParams }>('/events/:id/thumbnail', async (request, reply) => {
      const { id } = request.params
      const event = getEventById(id)

      if (!event) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      if (!event.thumbnailPath) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Thumbnail not available',
        })
      }

      const filePath = path.join(THUMBNAILS_PATH, event.thumbnailPath)

      if (!existsSync(filePath)) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Thumbnail file not found',
        })
      }

      // Determine best format based on Accept header
      const acceptHeader = request.headers.accept
      const format = getBestFormat(acceptHeader)

      try {
        // Optimize image (convert to WebP if supported, with caching)
        const { buffer, contentType } = await optimizeImage(filePath, {
          format,
          quality: 80,
        })

        reply.header('Content-Type', contentType)
        reply.header('Content-Length', buffer.length)
        reply.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        reply.header('Vary', 'Accept') // Vary by Accept header for correct caching

        return reply.send(buffer)
      } catch (error) {
        // Fallback to original file if optimization fails
        server.log.warn({ error, eventId: id }, 'Image optimization failed, serving original')
        const stats = await stat(filePath)
        reply.header('Content-Type', 'image/jpeg')
        reply.header('Content-Length', stats.size)
        reply.header('Cache-Control', 'public, max-age=31536000')

        return reply.send(createReadStream(filePath))
      }
    },
  )

  /**
   * Get event video clip
   * Note: No auth required - event IDs are random UUIDs and videos
   * need to be loadable via <video> tags which can't send auth headers
   */
  server.get<{ Params: EventParams }>(
    '/events/:id/video',
    async (request, reply) => {
      const { id } = request.params
      const event = getEventById(id)

      if (!event) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      if (!event.videoPath) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Video not available',
        })
      }

      let videoPath = event.videoPath
      let filePath = path.join(CLIPS_PATH, videoPath)

      // If stored path doesn't exist, try to find the actual file
      if (!existsSync(filePath)) {
        const actualPath = findVideoFile(event.cameraId, event.timestamp)
        if (actualPath) {
          videoPath = actualPath
          filePath = path.join(CLIPS_PATH, actualPath)
          server.log.debug(
            { eventId: id, storedPath: event.videoPath, actualPath },
            'Found video file with adjusted timestamp'
          )
        } else {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Video file not found',
          })
        }
      }

      const stats = await stat(filePath)
      reply.header('Content-Type', 'video/mp4')
      reply.header('Content-Length', stats.size)
      reply.header('Accept-Ranges', 'bytes')

      return reply.send(createReadStream(filePath))
    },
  )

  /**
   * Download event video clip
   */
  server.get<{ Params: EventParams }>(
    '/events/:id/download',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const event = getEventById(id)

      if (!event) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Event not found',
        })
      }

      if (!event.videoPath) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Video not available',
        })
      }

      let videoPath = event.videoPath
      let filePath = path.join(CLIPS_PATH, videoPath)

      // If stored path doesn't exist, try to find the actual file
      if (!existsSync(filePath)) {
        const actualPath = findVideoFile(event.cameraId, event.timestamp)
        if (actualPath) {
          videoPath = actualPath
          filePath = path.join(CLIPS_PATH, actualPath)
        } else {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Video file not found',
          })
        }
      }

      const stats = await stat(filePath)
      const filename = `parcelguard-${event.cameraId}-${new Date(event.timestamp * 1000).toISOString().replace(/[:.]/g, '-')}.mp4`

      reply.header('Content-Type', 'video/mp4')
      reply.header('Content-Length', stats.size)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      return reply.send(createReadStream(filePath))
    },
  )
}
