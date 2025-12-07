import { FastifyRequest, FastifyReply } from 'fastify'
import { verifySession, SessionWithUser } from '../services/auth'
import { UserPublic } from '../services/users'
import { Errors } from '../lib/errors'

declare module 'fastify' {
  interface FastifyRequest {
    session?: SessionWithUser
    user?: UserPublic
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = Errors.unauthorized()
    return reply.status(error.statusCode).send(error.toJSON())
  }

  const token = authHeader.slice(7) // Remove 'Bearer ' prefix
  const session = verifySession(token)

  if (!session) {
    const error = Errors.unauthorized('Invalid or expired session')
    return reply.status(error.statusCode).send(error.toJSON())
  }

  request.session = session
  request.user = session.user
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // First run requireAuth
  await requireAuth(request, reply)

  // If requireAuth already sent an error response, don't continue
  if (reply.sent) {
    return
  }

  // Check if user is admin
  if (!request.user?.isAdmin) {
    const error = Errors.forbidden('Admin access required')
    return reply.status(error.statusCode).send(error.toJSON())
  }
}
