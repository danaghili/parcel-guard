import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  createUser,
  getUserById,
  listUsers,
  updateUser,
  updateUserPin,
  deleteUser,
} from '../services/users'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { ApiError } from '../lib/errors'

interface CreateUserBody {
  username: string
  pin: string
  displayName?: string
  isAdmin?: boolean
}

interface UpdateUserBody {
  displayName?: string
  isAdmin?: boolean
  enabled?: boolean
}

interface UpdatePinBody {
  currentPin?: string
  newPin: string
}

interface UserIdParams {
  id: string
}

export const usersRoutes: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {
  // List all users (admin only)
  server.get('/users', { preHandler: requireAdmin }, async (_request, reply) => {
    const users = listUsers()
    return reply.send({
      success: true,
      data: users,
    })
  })

  // Create a new user (admin only)
  server.post<{ Body: CreateUserBody }>(
    '/users',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { username, pin, displayName, isAdmin } = request.body

      if (!username || typeof username !== 'string') {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Username is required',
        })
      }

      if (!pin || typeof pin !== 'string') {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'PIN is required',
        })
      }

      try {
        const user = await createUser({
          username,
          pin,
          displayName,
          isAdmin,
        })
        return reply.status(201).send({
          success: true,
          data: user,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Get user by ID
  server.get<{ Params: UserIdParams }>(
    '/users/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const currentUser = request.user!

      // Users can only view their own details unless they're admin
      if (!currentUser.isAdmin && currentUser.id !== id) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      const user = getUserById(id)

      if (!user) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Return public user info (without pinHash)
      return reply.send({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
          enabled: user.enabled,
          createdAt: user.createdAt,
        },
      })
    },
  )

  // Update user (admin or self)
  server.put<{ Params: UserIdParams; Body: UpdateUserBody }>(
    '/users/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const { displayName, isAdmin, enabled } = request.body
      const currentUser = request.user!

      // Non-admins can only update their own display name
      if (!currentUser.isAdmin) {
        if (currentUser.id !== id) {
          return reply.status(403).send({
            error: 'FORBIDDEN',
            message: 'Access denied',
          })
        }
        // Non-admins can't change admin status or enabled status
        if (isAdmin !== undefined || enabled !== undefined) {
          return reply.status(403).send({
            error: 'FORBIDDEN',
            message: 'Only admins can change admin or enabled status',
          })
        }
      }

      try {
        const user = updateUser(id, { displayName, isAdmin, enabled })
        return reply.send({
          success: true,
          data: user,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send(error.toJSON())
        }
        throw error
      }
    },
  )

  // Change PIN (admin or self with current PIN)
  server.put<{ Params: UserIdParams; Body: UpdatePinBody }>(
    '/users/:id/pin',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { id } = request.params
      const { currentPin, newPin } = request.body
      const currentUser = request.user!

      // Non-admins can only change their own PIN
      if (!currentUser.isAdmin && currentUser.id !== id) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Access denied',
        })
      }

      if (!newPin || typeof newPin !== 'string') {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'New PIN is required',
        })
      }

      try {
        // Admin can change anyone's PIN without current PIN
        // Non-admin must provide current PIN
        await updateUserPin(id, currentPin || null, newPin, currentUser.isAdmin)
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

  // Delete user (admin only)
  server.delete<{ Params: UserIdParams }>(
    '/users/:id',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params
      const currentUser = request.user!

      // Prevent admin from deleting themselves
      if (currentUser.id === id) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Cannot delete your own account',
        })
      }

      try {
        deleteUser(id)
        return reply.send({
          success: true,
          message: 'User deleted successfully',
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
