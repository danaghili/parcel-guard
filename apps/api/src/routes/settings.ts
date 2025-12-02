import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getSettings, updateSettings, updatePin, Settings } from '../services/settings'
import { ApiError } from '../lib/errors'

interface UpdatePinBody {
  currentPin: string
  newPin: string
}

export const settingsRoutes: FastifyPluginAsync = async (
  server: FastifyInstance,
): Promise<void> => {
  // Get all settings
  server.get('/settings', { preHandler: requireAuth }, async (_request, reply) => {
    const settings = getSettings()
    return reply.send({
      success: true,
      data: settings,
    })
  })

  // Update settings
  server.put<{ Body: Partial<Settings> }>(
    '/settings',
    { preHandler: requireAuth },
    async (request, reply) => {
      const updates = request.body
      const settings = updateSettings(updates)
      return reply.send({
        success: true,
        data: settings,
      })
    },
  )

  // Update PIN
  server.put<{ Body: UpdatePinBody }>(
    '/settings/pin',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { currentPin, newPin } = request.body

      if (!currentPin || !newPin) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Current PIN and new PIN are required',
        })
      }

      try {
        await updatePin(currentPin, newPin)
        return reply.send({
          success: true,
          message: 'PIN updated successfully',
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
