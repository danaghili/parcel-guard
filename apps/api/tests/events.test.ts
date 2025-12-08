import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { buildServer } from '../src/index'
import { getDb, closeDb, initDb } from '../src/db'
import { runMigrations } from '../src/db/migrate'
import { hashPin } from '../src/lib/crypto'
import type { FastifyInstance } from 'fastify'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = './data/test-events.db'
const TEST_USERNAME = 'testuser'
const TEST_PIN = '1234'

describe('Events API', () => {
  let server: FastifyInstance
  let authToken: string

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

    // Seed test data
    const hashedPin = await hashPin(TEST_PIN)
    const db = getDb()
    db.prepare(
      'INSERT INTO users (id, username, pinHash, displayName, isAdmin, enabled) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('test-user-1', TEST_USERNAME, hashedPin, 'Test User', 1, 1)
    db.exec(`
      INSERT INTO cameras (id, name, streamUrl, status) VALUES ('cam1', 'Test Camera 1', 'rtsp://test:8554/stream1', 'online');
      INSERT INTO cameras (id, name, streamUrl, status) VALUES ('cam2', 'Test Camera 2', 'rtsp://test:8554/stream2', 'offline');
    `)

    server = await buildServer({ logger: false, skipDbInit: true })

    // Get auth token
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USERNAME, pin: TEST_PIN },
    })
    authToken = JSON.parse(loginResponse.body).data.token
  })

  afterAll(async () => {
    if (server) await server.close()
    closeDb()
  })

  beforeEach(() => {
    // Clear events before each test
    const db = getDb()
    db.exec('DELETE FROM motion_events')
  })

  describe('POST /api/motion/events', () => {
    it('should create new event on motion webhook', async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const response = await server.inject({
        method: 'POST',
        url: '/api/motion/events',
        payload: {
          cameraId: 'cam1',
          eventId: 'test-event-1',
          type: 'start',
          timestamp,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('motion-cam1-test-event-1')
      expect(body.data.cameraId).toBe('cam1')
    })

    it('should update event on motion end webhook', async () => {
      const startTime = Math.floor(Date.now() / 1000)
      const endTime = startTime + 30

      // Create event first
      await server.inject({
        method: 'POST',
        url: '/api/motion/events',
        payload: {
          cameraId: 'cam1',
          eventId: 'test-event-2',
          type: 'start',
          timestamp: startTime,
        },
      })

      // End event
      const response = await server.inject({
        method: 'POST',
        url: '/api/motion/events',
        payload: {
          cameraId: 'cam1',
          eventId: 'test-event-2',
          type: 'end',
          timestamp: endTime,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.duration).toBe(30)
    })

    it('should reject invalid payload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/motion/events',
        payload: { invalid: 'payload' },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/events', () => {
    beforeEach(() => {
      // Seed some test events
      const db = getDb()
      const now = Math.floor(Date.now() / 1000)
      db.exec(`
        INSERT INTO motion_events (id, cameraId, timestamp, duration, isImportant, isFalseAlarm)
        VALUES
          ('event-1', 'cam1', ${now - 3600}, 15, 0, 0),
          ('event-2', 'cam1', ${now - 7200}, 30, 1, 0),
          ('event-3', 'cam2', ${now - 1800}, 10, 0, 1),
          ('event-4', 'cam1', ${now}, 20, 0, 0);
      `)
    })

    it('should list events with pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events?pageSize=2',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.events).toHaveLength(2)
      expect(body.data.total).toBe(4)
      expect(body.data.hasMore).toBe(true)
    })

    it('should filter events by camera', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events?cameraId=cam1',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.events).toHaveLength(3)
      expect(body.data.events.every((e: { cameraId: string }) => e.cameraId === 'cam1')).toBe(true)
    })

    it('should filter events by importance', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events?isImportant=true',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.events).toHaveLength(1)
      expect(body.data.events[0].isImportant).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/events/:id', () => {
    beforeEach(() => {
      const db = getDb()
      const now = Math.floor(Date.now() / 1000)
      db.exec(`
        INSERT INTO motion_events (id, cameraId, timestamp, duration)
        VALUES ('single-event', 'cam1', ${now}, 25);
      `)
    })

    it('should get single event', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events/single-event',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.id).toBe('single-event')
      expect(body.data.duration).toBe(25)
    })

    it('should return 404 for non-existent event', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/events/non-existent',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /api/events/:id', () => {
    beforeEach(() => {
      const db = getDb()
      const now = Math.floor(Date.now() / 1000)
      db.exec(`
        INSERT INTO motion_events (id, cameraId, timestamp, duration)
        VALUES ('update-event', 'cam1', ${now}, 25);
      `)
    })

    it('should mark event as important', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/events/update-event',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { isImportant: true },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.isImportant).toBe(true)
    })

    it('should mark event as false alarm', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/events/update-event',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { isFalseAlarm: true },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.isFalseAlarm).toBe(true)
    })
  })

  describe('DELETE /api/events/:id', () => {
    beforeEach(() => {
      const db = getDb()
      const now = Math.floor(Date.now() / 1000)
      db.exec(`
        INSERT INTO motion_events (id, cameraId, timestamp, duration)
        VALUES ('delete-event', 'cam1', ${now}, 25);
      `)
    })

    it('should delete event', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/events/delete-event',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)

      // Verify event is deleted
      const getResponse = await server.inject({
        method: 'GET',
        url: '/api/events/delete-event',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(getResponse.statusCode).toBe(404)
    })
  })

  describe('POST /api/events/bulk-delete', () => {
    beforeEach(() => {
      const db = getDb()
      const now = Math.floor(Date.now() / 1000)
      db.exec(`
        INSERT INTO motion_events (id, cameraId, timestamp)
        VALUES ('bulk-1', 'cam1', ${now}), ('bulk-2', 'cam1', ${now}), ('bulk-3', 'cam1', ${now});
      `)
    })

    it('should bulk delete events', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/events/bulk-delete',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { ids: ['bulk-1', 'bulk-2'] },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.deletedCount).toBe(2)

      // Verify remaining event
      const listResponse = await server.inject({
        method: 'GET',
        url: '/api/events',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const listBody = JSON.parse(listResponse.body)
      expect(listBody.data.total).toBe(1)
    })
  })
})

describe('Cameras API - Settings', () => {
  let server: FastifyInstance
  let authToken: string
  const TEST_DB_PATH_CAMERAS = './data/test-cameras.db'

  beforeAll(async () => {
    // Clean up any existing test database
    const dbDir = path.dirname(TEST_DB_PATH_CAMERAS)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    if (fs.existsSync(TEST_DB_PATH_CAMERAS)) {
      fs.unlinkSync(TEST_DB_PATH_CAMERAS)
    }

    // Initialize test database
    process.env.DATABASE_PATH = TEST_DB_PATH_CAMERAS
    closeDb() // Close any existing connection
    initDb(TEST_DB_PATH_CAMERAS)
    runMigrations()

    // Seed test data with properly hashed PIN
    const hashedPin = await hashPin(TEST_PIN)
    const db = getDb()
    db.prepare(
      'INSERT INTO users (id, username, pinHash, displayName, isAdmin, enabled) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('test-user-2', TEST_USERNAME, hashedPin, 'Test User', 1, 1)
    db.exec(`
      INSERT INTO cameras (id, name, streamUrl, status, motionSensitivity, notificationsEnabled)
      VALUES ('cam1', 'Test Camera', 'rtsp://test:8554/stream', 'online', 50, 1);
    `)

    server = await buildServer({ logger: false, skipDbInit: true })

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USERNAME, pin: TEST_PIN },
    })
    authToken = JSON.parse(loginResponse.body).data.token
  })

  afterAll(async () => {
    if (server) await server.close()
    closeDb()
  })

  describe('PUT /api/cameras/:id', () => {
    it('should update camera name', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/cam1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { name: 'Updated Camera Name' },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.name).toBe('Updated Camera Name')
    })

    it('should update motion sensitivity', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/cam1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { motionSensitivity: 75 },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.settings.motionSensitivity).toBe(75)
    })

    it('should clamp motion sensitivity to 0-100', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/cam1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { motionSensitivity: 150 },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.settings.motionSensitivity).toBe(100)
    })

    it('should update notifications enabled', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/cam1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { notificationsEnabled: false },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.settings.notificationsEnabled).toBe(false)
    })

    it('should update motion zones', async () => {
      const zones = [
        { points: [[0, 0], [100, 0], [100, 100], [0, 100]], name: 'Zone 1' },
      ]

      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/cam1',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { motionZones: zones },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.settings.motionZones).toHaveLength(1)
      expect(body.data.settings.motionZones[0].name).toBe('Zone 1')
    })

    it('should return 404 for non-existent camera', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/cameras/non-existent',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: { name: 'New Name' },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /api/cameras', () => {
    it('should create new camera', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/cameras',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          id: 'new-cam',
          name: 'New Camera',
          streamUrl: 'rtsp://test:8554/new',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.data.id).toBe('new-cam')
      expect(body.data.name).toBe('New Camera')
      expect(body.data.status).toBe('offline')
    })

    it('should reject duplicate camera ID', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/cameras',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          id: 'cam1',
          name: 'Duplicate',
          streamUrl: 'rtsp://test:8554/dup',
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('DELETE /api/cameras/:id', () => {
    beforeEach(() => {
      const db = getDb()
      db.exec(`
        INSERT OR IGNORE INTO cameras (id, name, streamUrl, status)
        VALUES ('delete-cam', 'To Delete', 'rtsp://test:8554/delete', 'offline');
      `)
    })

    it('should delete camera', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/cameras/delete-cam',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)

      // Verify camera is deleted
      const getResponse = await server.inject({
        method: 'GET',
        url: '/api/cameras/delete-cam',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      expect(getResponse.statusCode).toBe(404)
    })
  })
})
