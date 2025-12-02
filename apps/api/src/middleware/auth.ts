import { FastifyRequest, FastifyReply } from 'fastify'
import { verifySession, Session } from '../services/auth'
import { Errors } from '../lib/errors'

declare module 'fastify' {
  interface FastifyRequest {
    session?: Session
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
}
