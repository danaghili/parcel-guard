import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../src/index'
import { FastifyInstance } from 'fastify'
import { initDb, closeDb } from '../src/db'
import { runMigrations } from '../src/db/migrate'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = './data/test.db'

describe('Health API', () => {
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

    // Build server without re-initializing db
    server = await buildServer({ logger: false, skipDbInit: true })
  })

  afterAll(async () => {
    await server.close()
    closeDb()
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  it('should return health status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.status).toBe('ok')
    expect(body.version).toBe('0.1.0')
    expect(typeof body.timestamp).toBe('number')
  })
})
