import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getAllCameras, getCameraById, updateCameraHealth } from '../services/cameras'
import { ApiError } from '../lib/errors'
import type { CameraHealth } from '@parcelguard/shared'

interface CameraParams {
  id: string
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
}
