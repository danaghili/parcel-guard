import { getDb } from '../db'
import { generateToken, generateId, verifyPin } from '../lib/crypto'
import { Errors } from '../lib/errors'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface Session {
  id: string
  token: string
  createdAt: number
  expiresAt: number
}

export async function login(pin: string): Promise<Session> {
  const db = getDb()

  // Get stored PIN hash
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin') as
    | { value: string }
    | undefined

  if (!setting) {
    throw Errors.internal('PIN not configured')
  }

  // Verify PIN
  const isValid = await verifyPin(pin, setting.value)
  if (!isValid) {
    throw Errors.invalidCredentials()
  }

  // Create session
  const session: Session = {
    id: generateId(),
    token: generateToken(),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  db.prepare(
    'INSERT INTO sessions (id, token, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
  ).run(session.id, session.token, session.createdAt, session.expiresAt)

  // Clean up expired sessions
  db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(Date.now())

  return session
}

export function logout(token: string): void {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function verifySession(token: string): Session | null {
  const db = getDb()

  const session = db
    .prepare('SELECT id, token, createdAt, expiresAt FROM sessions WHERE token = ?')
    .get(token) as Session | undefined

  if (!session) {
    return null
  }

  // Check if expired
  if (session.expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id)
    return null
  }

  return session
}

export function getSessionByToken(token: string): Session | null {
  return verifySession(token)
}
