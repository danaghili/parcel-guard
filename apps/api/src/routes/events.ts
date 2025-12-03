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
import { parseFrigateEvent } from '@parcelguard/shared'
import type { FrigateEventPayload, EventFilters } from '@parcelguard/shared'
import { createReadStream, existsSync } from 'fs'
import { stat } from 'fs/promises'
import path from 'path'

// Base paths for media files
const CLIPS_PATH = process.env.CLIPS_PATH ?? './data/clips'
const THUMBNAILS_PATH = process.env.THUMBNAILS_PATH ?? './data/thumbnails'

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

export const eventsRoutes: FastifyPluginAsync = async (
  server: FastifyInstance,
): Promise<void> => {
  /**
   * Frigate webhook endpoint
   * Receives events from Frigate when motion is detected
   * No auth required - Frigate calls this internally
   */
  server.post<{ Body: FrigateEventPayload }>(
    '/frigate/events',
    async (request, reply) => {
      const payload = request.body

      // Validate payload structure
      if (!payload.type || !payload.after) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Invalid Frigate event payload',
        })
      }

      try {
        const frigateEvent = parseFrigateEvent(payload)

        server.log.info(
          { eventId: frigateEvent.eventId, type: frigateEvent.type, camera: frigateEvent.cameraId },
          'Received Frigate event',
        )

        if (frigateEvent.type === 'new') {
          // Create new event
          const event = createEvent({
            id: frigateEvent.eventId,
            cameraId: frigateEvent.cameraId,
            timestamp: frigateEvent.startTime,
            duration: frigateEvent.duration,
            thumbnailPath: frigateEvent.hasSnapshot
              ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.jpg`
              : null,
            videoPath: frigateEvent.hasClip
              ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.mp4`
              : null,
          })

          // Trigger notification (non-blocking)
          const camera = getCameraById(frigateEvent.cameraId)
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
        } else if (frigateEvent.type === 'update' || frigateEvent.type === 'end') {
          // Update existing event
          const existing = getEventById(frigateEvent.eventId)

          if (!existing) {
            // Event doesn't exist yet - might be a late 'new' event, create it
            server.log.warn(
              { eventId: frigateEvent.eventId },
              'Received update for non-existent event, creating it',
            )

            const event = createEvent({
              id: frigateEvent.eventId,
              cameraId: frigateEvent.cameraId,
              timestamp: frigateEvent.startTime,
              duration: frigateEvent.duration,
              thumbnailPath: frigateEvent.hasSnapshot
                ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.jpg`
                : null,
              videoPath: frigateEvent.hasClip
                ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.mp4`
                : null,
            })

            return reply.status(201).send({
              success: true,
              data: event,
            })
          }

          // Update duration and paths if available
          const event = updateEvent(frigateEvent.eventId, {
            duration: frigateEvent.duration ?? existing.duration,
            thumbnailPath: frigateEvent.hasSnapshot
              ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.jpg`
              : existing.thumbnailPath,
            videoPath: frigateEvent.hasClip
              ? `${frigateEvent.cameraId}/${frigateEvent.eventId}.mp4`
              : existing.videoPath,
          })

          return reply.send({
            success: true,
            data: event,
          })
        }

        return reply.send({ success: true })
      } catch (error) {
        server.log.error({ error, payload }, 'Failed to process Frigate event')

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
   */
  server.get<{ Params: EventParams }>(
    '/events/:id/thumbnail',
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

      const stats = await stat(filePath)
      reply.header('Content-Type', 'image/jpeg')
      reply.header('Content-Length', stats.size)
      reply.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

      return reply.send(createReadStream(filePath))
    },
  )

  /**
   * Get event video clip
   */
  server.get<{ Params: EventParams }>(
    '/events/:id/video',
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

      const filePath = path.join(CLIPS_PATH, event.videoPath)

      if (!existsSync(filePath)) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Video file not found',
        })
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

      const filePath = path.join(CLIPS_PATH, event.videoPath)

      if (!existsSync(filePath)) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Video file not found',
        })
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
