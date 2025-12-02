import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildServer } from '../src/index'
import { FastifyInstance } from 'fastify'
import { initDb, closeDb, getDb } from '../src/db'
import { runMigrations } from '../src/db/migrate'
import { hashPin } from '../src/lib/crypto'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = './data/test-auth.db'
const TEST_PIN = '1234'

describe('Auth API', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    // Clean up any existing test database
    const dbDir = path.dirname(TEST_DB_PATH)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }

    // Initialize test database
    process.env.DATABASE_PATH = TEST_DB_PATH
    initDb(TEST_DB_PATH)
    runMigrations()

    // Seed test PIN
    const hashedPin = await hashPin(TEST_PIN)
    const db = getDb()
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('pin', hashedPin)

    // Build server
    server = await buildServer({ logger: false, skipDbInit: true })
  })

  afterAll(async () => {
    await server.close()
    closeDb()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  beforeEach(() => {
    // Clear sessions between tests
    const db = getDb()
    db.prepare('DELETE FROM sessions').run()
  })

  describe('POST /api/auth/login', () => {
    it('should return token for valid PIN', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { pin: TEST_PIN },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.token).toBeDefined()
      expect(typeof body.data.token).toBe('string')
      expect(body.data.expiresAt).toBeDefined()
    })

    it('should reject invalid PIN', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { pin: '0000' },
      })

      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error).toBe('INVALID_CREDENTIALS')
    })

    it('should reject missing PIN', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {},
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/auth/verify', () => {
    it('should verify valid token', async () => {
      // First login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { pin: TEST_PIN },
      })
      const { token } = JSON.parse(loginResponse.body).data

      // Then verify
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.valid).toBe(true)
    })

    it('should reject invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject missing token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should invalidate session', async () => {
      // First login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { pin: TEST_PIN },
      })
      const { token } = JSON.parse(loginResponse.body).data

      // Logout
      const logoutResponse = await server.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(logoutResponse.statusCode).toBe(200)

      // Verify token is now invalid
      const verifyResponse = await server.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      expect(verifyResponse.statusCode).toBe(401)
    })
  })
})
