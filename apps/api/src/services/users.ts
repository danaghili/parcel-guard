import { getDb } from '../db'
import { hashPin, verifyPin, generateId } from '../lib/crypto'
import { Errors } from '../lib/errors'

export interface User {
  id: string
  username: string
  pinHash: string
  displayName: string | null
  isAdmin: boolean
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface UserPublic {
  id: string
  username: string
  displayName: string | null
  isAdmin: boolean
  enabled: boolean
  createdAt: number
}

interface CreateUserParams {
  username: string
  pin: string
  displayName?: string
  isAdmin?: boolean
}

interface UpdateUserParams {
  displayName?: string
  isAdmin?: boolean
  enabled?: boolean
}

function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    enabled: user.enabled,
    createdAt: user.createdAt,
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    pinHash: row.pinHash as string,
    displayName: row.displayName as string | null,
    isAdmin: Boolean(row.isAdmin),
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  }
}

export async function createUser(params: CreateUserParams): Promise<UserPublic> {
  const { username, pin, displayName, isAdmin = false } = params
  const db = getDb()

  // Validate username
  if (!username || username.length < 2 || username.length > 32) {
    throw Errors.badRequest('Username must be between 2 and 32 characters')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw Errors.badRequest('Username can only contain letters, numbers, underscores, and hyphens')
  }

  // Validate PIN
  if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
    throw Errors.badRequest('PIN must be 4-8 digits')
  }

  // Check if username already exists
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(username.toLowerCase())

  if (existing) {
    throw Errors.conflict('Username already exists')
  }

  const id = generateId()
  const pinHash = await hashPin(pin)
  const now = Math.floor(Date.now() / 1000)

  db.prepare(`
    INSERT INTO users (id, username, pinHash, displayName, isAdmin, enabled, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, username.toLowerCase(), pinHash, displayName || null, isAdmin ? 1 : 0, now, now)

  const user = getUserById(id)
  if (!user) {
    throw Errors.internal('Failed to create user')
  }

  return toPublicUser(user)
}

export function getUserById(id: string): User | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined

  if (!row) {
    return null
  }

  return rowToUser(row)
}

export function getUserByUsername(username: string): User | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username.toLowerCase()) as Record<string, unknown> | undefined

  if (!row) {
    return null
  }

  return rowToUser(row)
}

export function listUsers(): UserPublic[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all() as Record<string, unknown>[]

  return rows.map((row) => toPublicUser(rowToUser(row)))
}

export function updateUser(id: string, updates: UpdateUserParams): UserPublic {
  const db = getDb()

  const user = getUserById(id)
  if (!user) {
    throw Errors.notFound('User')
  }

  const fields: string[] = []
  const values: unknown[] = []

  if (updates.displayName !== undefined) {
    fields.push('displayName = ?')
    values.push(updates.displayName || null)
  }

  if (updates.isAdmin !== undefined) {
    fields.push('isAdmin = ?')
    values.push(updates.isAdmin ? 1 : 0)
  }

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?')
    values.push(updates.enabled ? 1 : 0)
  }

  if (fields.length === 0) {
    return toPublicUser(user)
  }

  fields.push('updatedAt = ?')
  values.push(Math.floor(Date.now() / 1000))
  values.push(id)

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  const updated = getUserById(id)
  if (!updated) {
    throw Errors.internal('Failed to update user')
  }

  return toPublicUser(updated)
}

export async function updateUserPin(
  id: string,
  currentPin: string | null,
  newPin: string,
  isAdmin: boolean = false,
): Promise<void> {
  const db = getDb()

  const user = getUserById(id)
  if (!user) {
    throw Errors.notFound('User')
  }

  // Validate new PIN
  if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
    throw Errors.badRequest('PIN must be 4-8 digits')
  }

  // If not admin, verify current PIN
  if (!isAdmin) {
    if (!currentPin) {
      throw Errors.badRequest('Current PIN is required')
    }

    const isValid = await verifyPin(currentPin, user.pinHash)
    if (!isValid) {
      throw Errors.invalidCredentials()
    }
  }

  const pinHash = await hashPin(newPin)
  const now = Math.floor(Date.now() / 1000)

  db.prepare('UPDATE users SET pinHash = ?, updatedAt = ? WHERE id = ?').run(pinHash, now, id)
}

export function deleteUser(id: string): void {
  const db = getDb()

  const user = getUserById(id)
  if (!user) {
    throw Errors.notFound('User')
  }

  // Don't allow deleting the last admin
  if (user.isAdmin) {
    const adminCount = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE isAdmin = 1 AND enabled = 1')
      .get() as { count: number }

    if (adminCount.count <= 1) {
      throw Errors.badRequest('Cannot delete the last admin user')
    }
  }

  // Soft delete - disable the user
  const now = Math.floor(Date.now() / 1000)
  db.prepare('UPDATE users SET enabled = 0, updatedAt = ? WHERE id = ?').run(now, id)

  // Invalidate all sessions for this user
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(id)
}

export function hardDeleteUser(id: string): void {
  const db = getDb()

  // Delete sessions first
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(id)

  // Delete user
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
}
