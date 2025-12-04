import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { login, logout, verifySession } from '../services/auth'
import { ApiError } from '../lib/errors'

interface LoginBody {
  pin: string
}

// Rate limit config for login endpoint (brute force protection)
const loginRateLimit = {
  config: {
    rateLimit: {
      max: 5, // 5 attempts
      timeWindow: '1 minute', // per minute
      errorResponseBuilder: () => ({
        error: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again in 1 minute.',
      }),
    },
  },
}

export const authRoutes: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {
  // Login with rate limiting to prevent brute force attacks
  server.post<{ Body: LoginBody }>('/auth/login', loginRateLimit, async (request, reply) => {
    const { pin } = request.body

    if (!pin || typeof pin !== 'string') {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'PIN is required',
      })
    }

    try {
      const session = await login(pin)
      return reply.send({
        success: true,
        data: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return reply.status(error.statusCode).send(error.toJSON())
      }
      throw error
    }
  })

  // Logout
  server.post('/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      logout(token)
    }

    return reply.send({ success: true })
  })

  // Verify session
  server.get('/auth/verify', async (request, reply) => {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'No token provided',
      })
    }

    const token = authHeader.slice(7)
    const session = verifySession(token)

    if (!session) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired session',
      })
    }

    return reply.send({
      success: true,
      data: {
        valid: true,
        expiresAt: session.expiresAt,
      },
    })
  })
}
