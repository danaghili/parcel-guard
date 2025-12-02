import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { requireAuth } from '../middleware/auth'
import { getCameraCount } from '../services/cameras'
import os from 'os'
import fs from 'fs'

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
    const clipsPath = process.env.CLIPS_PATH ?? './data/clips'

    let used = 0
    let total = 0
    let available = 0

    try {
      // Try to get disk stats - this works on Linux/macOS
      const stats = fs.statfsSync(clipsPath)
      total = stats.blocks * stats.bsize
      available = stats.bavail * stats.bsize
      used = total - available
    } catch {
      // Fallback for when path doesn't exist or statfs fails
      used = 0
      total = 0
      available = 0
    }

    return reply.send({
      success: true,
      data: {
        used,
        total,
        available,
        percentage: total > 0 ? Math.round((used / total) * 100) : 0,
      },
    })
  })
}
