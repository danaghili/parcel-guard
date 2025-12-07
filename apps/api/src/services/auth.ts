import { getDb } from '../db'
import { generateToken, generateId, verifyPin } from '../lib/crypto'
import { Errors } from '../lib/errors'
import { getUserByUsername, getUserById, type User, type UserPublic } from './users'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface Session {
  id: string
  token: string
  userId: string
  createdAt: number
  expiresAt: number
}

export interface SessionWithUser extends Session {
  user: UserPublic
}

export interface LoginResult {
  token: string
  expiresAt: number
  user: UserPublic
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

export async function login(username: string, pin: string): Promise<LoginResult> {
  const db = getDb()

  // Find user by username
  const user = getUserByUsername(username)

  if (!user) {
    throw Errors.invalidCredentials()
  }

  // Check if user is enabled
  if (!user.enabled) {
    throw Errors.invalidCredentials()
  }

  // Verify PIN
  const isValid = await verifyPin(pin, user.pinHash)
  if (!isValid) {
    throw Errors.invalidCredentials()
  }

  // Create session
  const session: Session = {
    id: generateId(),
    token: generateToken(),
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  db.prepare(
    'INSERT INTO sessions (id, token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)',
  ).run(session.id, session.token, session.userId, session.createdAt, session.expiresAt)

  // Clean up expired sessions
  db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(Date.now())

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: toPublicUser(user),
  }
}

export function logout(token: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function verifySession(token: string): SessionWithUser | null {
  const db = getDb()

  const row = db
    .prepare('SELECT id, token, userId, createdAt, expiresAt FROM sessions WHERE token = ?')
    .get(token) as { id: string; token: string; userId: string | null; createdAt: number; expiresAt: number } | undefined

  if (!row) {
    return null
  }

  // Check if expired
  if (row.expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id)
    return null
  }

  // Sessions without userId are from before multi-user migration - invalidate them
  if (!row.userId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id)
    return null
  }

  // Get user
  const user = getUserById(row.userId)
  if (!user || !user.enabled) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id)
    return null
  }

  return {
    id: row.id,
    token: row.token,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    user: toPublicUser(user),
  }
}

export function getSessionByToken(token: string): SessionWithUser | null {
  return verifySession(token)
}
