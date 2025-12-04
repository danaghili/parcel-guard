import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { initDb } from './db'
import { runMigrations } from './db/migrate'
import { authRoutes } from './routes/auth'
import { settingsRoutes } from './routes/settings'
import { camerasRoutes } from './routes/cameras'
import { systemRoutes } from './routes/system'
import { eventsRoutes } from './routes/events'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

interface BuildServerOptions {
  logger?: boolean
  skipDbInit?: boolean
}

async function buildServer(
  options: BuildServerOptions = {},
): Promise<ReturnType<typeof Fastify>> {
  const { logger = true, skipDbInit = false } = options

  // Initialize database
  if (!skipDbInit) {
    initDb()
    runMigrations()
  }

  const server = Fastify({
    logger: logger
      ? {
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          transport:
            process.env.NODE_ENV !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                  },
                }
              : undefined,
        }
      : false,
  })

  // Security plugins
  await server.register(helmet)
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? false : true,
  })

  // Rate limiting for brute force protection
  await server.register(rateLimit, {
    global: false, // Only apply to specific routes
  })

  // Register routes
  await server.register(systemRoutes, { prefix: '/api' })
  await server.register(authRoutes, { prefix: '/api' })
  await server.register(settingsRoutes, { prefix: '/api' })
  await server.register(camerasRoutes, { prefix: '/api' })
  await server.register(eventsRoutes, { prefix: '/api' })

  return server
}

async function start(): Promise<void> {
  const server = await buildServer()

  try {
    await server.listen({ port: PORT, host: HOST })
    server.log.info(`Server running at http://${HOST}:${PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

// Only start server when run directly (not when imported for testing)
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  start()
}

export { buildServer }
