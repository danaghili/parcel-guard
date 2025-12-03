import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getSettings, updateSettings, updatePin, Settings } from '../services/settings'
import { getNotificationStatus } from '../services/notifications'
import { sendTestNotification, getNtfyConfig } from '../services/ntfy'
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

  // Get notification status
  server.get('/notifications/status', { preHandler: requireAuth }, async (_request, reply) => {
    const status = getNotificationStatus()
    return reply.send({
      success: true,
      data: status,
    })
  })

  // Send test notification
  server.post('/notifications/test', { preHandler: requireAuth }, async (_request, reply) => {
    const config = getNtfyConfig()

    if (!config) {
      return reply.status(400).send({
        success: false,
        error: 'NOT_CONFIGURED',
        message: 'Notifications not configured. Set NTFY_TOPIC environment variable.',
      })
    }

    try {
      await sendTestNotification(config.topic)
      return reply.send({
        success: true,
        message: 'Test notification sent successfully',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({
        success: false,
        error: 'NOTIFICATION_FAILED',
        message: errorMessage,
      })
    }
  })
}
