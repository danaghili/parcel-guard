import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getCameraCount } from '../services/cameras'
import { getEventStats } from '../services/events'
import {
  getStorageStats,
  cleanupExpiredEvents,
  isStorageWarning,
  formatBytes,
} from '../services/storage'
import os from 'os'

interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: number
  version: string
}

interface SystemStatus {
  version: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cameras: {
    total: number
    online: number
    offline: number
  }
}

export const systemRoutes: FastifyPluginAsync = async (
  server: FastifyInstance,
): Promise<void> => {
  // Basic health check (no auth)
  server.get<{ Reply: HealthResponse }>('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      version: '0.1.0',
    }
  })

  // Detailed system status (requires auth)
  server.get('/system/status', { preHandler: requireAuth }, async (_request, reply) => {
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory

    const cameraStats = getCameraCount()

    const status: SystemStatus = {
      version: '0.1.0',
      uptime: os.uptime(),
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      cameras: cameraStats,
    }

    return reply.send({
      success: true,
      data: status,
    })
  })

  // Get storage info (requires auth)
  server.get('/system/storage', { preHandler: requireAuth }, async (_request, reply) => {
    const stats = getStorageStats()
    const warning = isStorageWarning()

    return reply.send({
      success: true,
      data: {
        ...stats,
        usedFormatted: formatBytes(stats.used),
        totalFormatted: formatBytes(stats.total),
        availableFormatted: formatBytes(stats.available),
        warning,
      },
    })
  })

  // Trigger storage cleanup (requires auth)
  server.post('/system/storage/cleanup', { preHandler: requireAuth }, async (request, reply) => {
    request.server.log.info('Manual storage cleanup triggered')

    try {
      const result = await cleanupExpiredEvents()

      request.server.log.info(
        { ...result, bytesFreedFormatted: formatBytes(result.bytesFreed) },
        'Storage cleanup completed',
      )

      return reply.send({
        success: true,
        data: {
          ...result,
          bytesFreedFormatted: formatBytes(result.bytesFreed),
        },
      })
    } catch (error) {
      request.server.log.error({ error }, 'Storage cleanup failed')

      return reply.status(500).send({
        error: 'CLEANUP_FAILED',
        message: 'Failed to clean up storage',
      })
    }
  })

  // Get event statistics (requires auth)
  server.get('/system/events/stats', { preHandler: requireAuth }, async (_request, reply) => {
    const stats = getEventStats()

    return reply.send({
      success: true,
      data: stats,
    })
  })
}
