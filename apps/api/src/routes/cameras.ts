import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import {
  getAllCameras,
  getCameraById,
  updateCameraHealth,
  updateCamera,
  createCamera,
  deleteCamera,
  UpdateCameraInput,
} from '../services/cameras'
import { mqttService } from '../services/mqtt'
import { ApiError } from '../lib/errors'
import type { CameraHealth } from '@parcelguard/shared'

interface CameraParams {
  id: string
}

interface TestStreamBody {
  streamUrl: string
}

interface TestStreamResult {
  accessible: boolean
  latency?: number
  error?: string
}

interface CreateCameraBody {
  id: string
  name: string
  streamUrl: string
  motionSensitivity?: number
  notificationsEnabled?: boolean
}

export const camerasRoutes: FastifyPluginAsync = async (
  server: FastifyInstance,
): Promise<void> => {
  // List all cameras
  server.get('/cameras', { preHandler: requireAuth }, async (_request, reply) => {
    const cameras = getAllCameras()
    return reply.send({
      success: true,
      data: cameras,
    })
  })

  // Get single camera
  server.get<{ Params: CameraParams }>(
    '/cameras/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const camera = getCameraById(id)

      if (!camera) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Camera not found',
        })
      }

      return reply.send({
        success: true,
        data: camera,
      })
    },
  )

  // Receive health check from camera (no auth - Pi Zero calls this)
  server.post<{ Params: CameraParams; Body: Omit<CameraHealth, 'cameraId'> }>(
    '/cameras/:id/health',
    async (request, reply) => {
      const { id } = request.params
      const { temperature, uptime, ip } = request.body

      const health: CameraHealth = {
        cameraId: id,
        temperature: temperature ?? 0,
        uptime: uptime ?? 'unknown',
        ip: ip ?? 'unknown',
        timestamp: Date.now(),
      }

      try {
        const camera = updateCameraHealth(id, health)
        return reply.send({
          success: true,
          data: camera,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Test stream URL accessibility
  server.post<{ Body: TestStreamBody }>(
    '/cameras/test-stream',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { streamUrl } = request.body

      if (!streamUrl) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'streamUrl is required',
        })
      }

      const result: TestStreamResult = {
        accessible: false,
      }

      const startTime = Date.now()

      try {
        // Parse the URL to determine protocol
        const url = new URL(streamUrl)

        if (url.protocol === 'rtsp:') {
          // For RTSP URLs, we can only do a basic validation
          // Real connectivity would require an RTSP client
          result.accessible = true
          result.latency = Date.now() - startTime
        } else if (url.protocol === 'http:' || url.protocol === 'https:') {
          // For HTTP/HTTPS URLs (HLS streams), do a HEAD request
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10000)

          try {
            const response = await fetch(streamUrl, {
              method: 'HEAD',
              signal: controller.signal,
            })

            clearTimeout(timeout)
            result.latency = Date.now() - startTime

            if (response.ok) {
              result.accessible = true
            } else {
              result.accessible = false
              result.error = `HTTP ${response.status}: ${response.statusText}`
            }
          } catch (fetchError) {
            clearTimeout(timeout)
            if (fetchError instanceof Error) {
              if (fetchError.name === 'AbortError') {
                result.error = 'Connection timeout (10s)'
              } else {
                result.error = fetchError.message
              }
            } else {
              result.error = 'Connection failed'
            }
          }
        } else {
          result.error = `Unsupported protocol: ${url.protocol}`
        }
      } catch (urlError) {
        result.error = 'Invalid URL format'
      }

      return reply.send({
        success: true,
        data: result,
      })
    },
  )

  // Create new camera
  server.post<{ Body: CreateCameraBody }>(
    '/cameras',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id, name, streamUrl, motionSensitivity, notificationsEnabled } = request.body

      if (!id || !name || !streamUrl) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'id, name, and streamUrl are required',
        })
      }

      try {
        const camera = createCamera({
          id,
          name,
          streamUrl,
          motionSensitivity,
          notificationsEnabled,
        })

        return reply.status(201).send({
          success: true,
          data: camera,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Update camera settings
  server.put<{ Params: CameraParams; Body: UpdateCameraInput }>(
    '/cameras/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const { name, streamUrl, motionSensitivity, motionZones, notificationsEnabled } = request.body

      try {
        const camera = updateCamera(id, {
          name,
          streamUrl,
          motionSensitivity,
          motionZones,
          notificationsEnabled,
        })

        return reply.send({
          success: true,
          data: camera,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Delete camera
  server.delete<{ Params: CameraParams }>(
    '/cameras/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      try {
        deleteCamera(id)

        return reply.send({
          success: true,
          message: 'Camera deleted',
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Start live view - sends MQTT command to camera
  server.post<{ Params: CameraParams }>(
    '/cameras/:id/live/start',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      // Verify camera exists
      const camera = getCameraById(id)
      if (!camera) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Camera not found',
        })
      }

      // Check MQTT connection
      if (!mqttService.isConnected()) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'MQTT service not connected',
        })
      }

      const sent = mqttService.startLiveView(id)

      if (!sent) {
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to send live view command',
        })
      }

      return reply.send({
        success: true,
        message: 'Live view start command sent',
      })
    },
  )

  // Stop live view - sends MQTT command to camera
  server.post<{ Params: CameraParams }>(
    '/cameras/:id/live/stop',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      // Verify camera exists
      const camera = getCameraById(id)
      if (!camera) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Camera not found',
        })
      }

      // Check MQTT connection
      if (!mqttService.isConnected()) {
        return reply.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'MQTT service not connected',
        })
      }

      const sent = mqttService.stopLiveView(id)

      if (!sent) {
        return reply.status(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to send stop live view command',
        })
      }

      return reply.send({
        success: true,
        message: 'Live view stop command sent',
      })
    },
  )

  // Get stream status - check if camera stream is ready
  server.get<{ Params: CameraParams }>(
    '/cameras/:id/stream-status',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params

      // Verify camera exists
      const camera = getCameraById(id)
      if (!camera) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Camera not found',
        })
      }

      const ready = mqttService.getStreamStatus(id)

      return reply.send({
        success: true,
        data: { ready },
      })
    },
  )
}
