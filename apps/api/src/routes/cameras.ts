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
import { ApiError } from '../lib/errors'
import type { CameraHealth } from '@parcelguard/shared'

interface CameraParams {
  id: string
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
}
