import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from 'vitest'
import { buildServer } from '../src/index'
import { getDb, closeDb, initDb } from '../src/db'
import { runMigrations } from '../src/db/migrate'
import { hashPin } from '../src/lib/crypto'
import {
  isQuietHours,
  canSendNotification,
  resetCooldown,
  sendMotionAlert,
  getNotificationStatus,
} from '../src/services/notifications'
import { updateSettings, getSettings } from '../src/services/settings'
import type { FastifyInstance } from 'fastify'
import type { Camera } from '@parcelguard/shared'
import fs from 'fs'
import path from 'path'

const TEST_DB_PATH = './data/test-notifications.db'
const TEST_USERNAME = 'testuser'
const TEST_PIN = '1234'

describe('Notification Service', () => {
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
      INSERT INTO cameras (id, name, streamUrl, status, notificationsEnabled)
      VALUES ('cam1', 'Test Camera', 'rtsp://test:8554/stream', 'online', 1);
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
    // Reset cooldown tracking between tests
    resetCooldown()
    // Reset settings to defaults
    updateSettings({
      notificationsEnabled: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      notificationCooldown: 60,
    })
  })

  describe('isQuietHours', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return false when quiet hours disabled', () => {
      updateSettings({ quietHoursEnabled: false })
      expect(isQuietHours()).toBe(false)
    })

    it('should return true during quiet hours (normal range)', () => {
      vi.useFakeTimers()
      // Set time to 03:00 AM
      vi.setSystemTime(new Date(2024, 0, 1, 3, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '01:00',
        quietHoursEnd: '06:00',
      })

      expect(isQuietHours()).toBe(true)
    })

    it('should return false outside quiet hours (normal range)', () => {
      vi.useFakeTimers()
      // Set time to 10:00 AM
      vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '01:00',
        quietHoursEnd: '06:00',
      })

      expect(isQuietHours()).toBe(false)
    })

    it('should handle overnight quiet hours (before midnight)', () => {
      vi.useFakeTimers()
      // Set time to 23:00 (11 PM)
      vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      expect(isQuietHours()).toBe(true)
    })

    it('should handle overnight quiet hours (after midnight)', () => {
      vi.useFakeTimers()
      // Set time to 05:00 AM
      vi.setSystemTime(new Date(2024, 0, 1, 5, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      expect(isQuietHours()).toBe(true)
    })

    it('should return false outside overnight quiet hours', () => {
      vi.useFakeTimers()
      // Set time to 12:00 PM (noon)
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      expect(isQuietHours()).toBe(false)
    })

    it('should handle edge case at start time', () => {
      vi.useFakeTimers()
      // Set time to exactly 22:00
      vi.setSystemTime(new Date(2024, 0, 1, 22, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      expect(isQuietHours()).toBe(true)
    })

    it('should handle edge case at end time', () => {
      vi.useFakeTimers()
      // Set time to exactly 07:00
      vi.setSystemTime(new Date(2024, 0, 1, 7, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      // End time is exclusive
      expect(isQuietHours()).toBe(false)
    })
  })

  describe('canSendNotification (cooldown)', () => {
    it('should allow first notification', () => {
      expect(canSendNotification('cam1')).toBe(true)
    })

    it('should block notification within cooldown period', () => {
      updateSettings({ notificationCooldown: 60 })

      // First notification should be allowed
      expect(canSendNotification('cam1')).toBe(true)

      // Second notification within cooldown should be blocked
      expect(canSendNotification('cam1')).toBe(false)
    })

    it('should allow notification after cooldown expires', async () => {
      updateSettings({ notificationCooldown: 1 }) // 1 second cooldown

      expect(canSendNotification('cam1')).toBe(true)

      // Wait for cooldown to expire
      await new Promise((resolve) => setTimeout(resolve, 1100))

      expect(canSendNotification('cam1')).toBe(true)
    })

    it('should track cooldown per camera independently', () => {
      updateSettings({ notificationCooldown: 60 })

      expect(canSendNotification('cam1')).toBe(true)
      expect(canSendNotification('cam2')).toBe(true)

      // cam1 should be blocked, cam2 still blocked
      expect(canSendNotification('cam1')).toBe(false)
      expect(canSendNotification('cam2')).toBe(false)
    })

    it('should reset cooldown for specific camera', () => {
      updateSettings({ notificationCooldown: 60 })

      canSendNotification('cam1')
      canSendNotification('cam2')

      resetCooldown('cam1')

      expect(canSendNotification('cam1')).toBe(true)
      expect(canSendNotification('cam2')).toBe(false)
    })

    it('should reset all cooldowns', () => {
      updateSettings({ notificationCooldown: 60 })

      canSendNotification('cam1')
      canSendNotification('cam2')

      resetCooldown()

      expect(canSendNotification('cam1')).toBe(true)
      expect(canSendNotification('cam2')).toBe(true)
    })
  })

  describe('sendMotionAlert', () => {
    const mockCamera: Camera = {
      id: 'cam1',
      name: 'Test Camera',
      streamUrl: 'rtsp://test:8554/stream',
      status: 'online',
      lastSeen: Date.now(),
      settings: {
        motionSensitivity: 50,
        motionZones: [],
        recordingSchedule: null,
        notificationsEnabled: true,
      },
    }

    const mockEvent = {
      id: 'event-1',
      cameraId: 'cam1',
      timestamp: Math.floor(Date.now() / 1000),
      thumbnailPath: 'cam1/event-1.jpg',
    }

    it('should return not sent when ntfy not configured', async () => {
      // Remove NTFY_TOPIC env var
      const originalTopic = process.env.NTFY_TOPIC
      delete process.env.NTFY_TOPIC

      const result = await sendMotionAlert(mockEvent, mockCamera)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('ntfy not configured')

      // Restore
      if (originalTopic) process.env.NTFY_TOPIC = originalTopic
    })

    it('should return not sent when notifications disabled globally', async () => {
      process.env.NTFY_TOPIC = 'test-topic'
      updateSettings({ notificationsEnabled: false })

      const result = await sendMotionAlert(mockEvent, mockCamera)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('notifications disabled globally')
    })

    it('should return not sent when camera notifications disabled', async () => {
      process.env.NTFY_TOPIC = 'test-topic'
      updateSettings({ notificationsEnabled: true })

      const cameraWithDisabledNotifications: Camera = {
        ...mockCamera,
        settings: { ...mockCamera.settings!, notificationsEnabled: false },
      }

      const result = await sendMotionAlert(mockEvent, cameraWithDisabledNotifications)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('notifications disabled for camera')
    })

    it('should return not sent during quiet hours', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0))

      process.env.NTFY_TOPIC = 'test-topic'
      updateSettings({
        notificationsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      const result = await sendMotionAlert(mockEvent, mockCamera)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('quiet hours active')

      vi.useRealTimers()
    })

    it('should return not sent during cooldown', async () => {
      process.env.NTFY_TOPIC = 'test-topic'
      updateSettings({
        notificationsEnabled: true,
        quietHoursEnabled: false,
        notificationCooldown: 60,
      })

      // Trigger cooldown
      canSendNotification('cam1')

      const result = await sendMotionAlert(mockEvent, mockCamera)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('cooldown active')
    })
  })

  describe('getNotificationStatus', () => {
    it('should return configured false when no NTFY_TOPIC', () => {
      const originalTopic = process.env.NTFY_TOPIC
      delete process.env.NTFY_TOPIC

      const status = getNotificationStatus()

      expect(status.configured).toBe(false)
      expect(status.topic).toBeNull()

      if (originalTopic) process.env.NTFY_TOPIC = originalTopic
    })

    it('should return configured true when NTFY_TOPIC set', () => {
      process.env.NTFY_TOPIC = 'test-topic'

      const status = getNotificationStatus()

      expect(status.configured).toBe(true)
      expect(status.topic).toBe('test-topic')
    })

    it('should reflect notifications enabled setting', () => {
      process.env.NTFY_TOPIC = 'test-topic'

      updateSettings({ notificationsEnabled: true })
      expect(getNotificationStatus().enabled).toBe(true)

      updateSettings({ notificationsEnabled: false })
      expect(getNotificationStatus().enabled).toBe(false)
    })

    it('should reflect quiet hours status', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0))

      updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      })

      expect(getNotificationStatus().quietHoursActive).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('Notification Settings API', () => {
    it('GET /api/notifications/status should return status', async () => {
      process.env.NTFY_TOPIC = 'test-topic'
      updateSettings({ notificationsEnabled: true, quietHoursEnabled: false })

      const response = await server.inject({
        method: 'GET',
        url: '/api/notifications/status',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.configured).toBe(true)
      expect(body.data.enabled).toBe(true)
      expect(body.data.topic).toBe('test-topic')
    })

    it('GET /api/notifications/status should require auth', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/notifications/status',
      })

      expect(response.statusCode).toBe(401)
    })

    it('POST /api/notifications/test should require auth', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/notifications/test',
      })

      expect(response.statusCode).toBe(401)
    })

    it('POST /api/notifications/test should fail when not configured', async () => {
      const originalTopic = process.env.NTFY_TOPIC
      delete process.env.NTFY_TOPIC

      const response = await server.inject({
        method: 'POST',
        url: '/api/notifications/test',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('NOT_CONFIGURED')

      if (originalTopic) process.env.NTFY_TOPIC = originalTopic
    })
  })

  describe('Settings API - Notification Fields', () => {
    it('should update notification settings', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/settings',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          notificationsEnabled: false,
          quietHoursEnabled: true,
          quietHoursStart: '23:00',
          quietHoursEnd: '08:00',
          notificationCooldown: 120,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.notificationsEnabled).toBe(false)
      expect(body.data.quietHoursEnabled).toBe(true)
      expect(body.data.quietHoursStart).toBe('23:00')
      expect(body.data.quietHoursEnd).toBe('08:00')
      expect(body.data.notificationCooldown).toBe(120)
    })

    it('should get notification settings', async () => {
      updateSettings({
        notificationsEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '06:00',
        notificationCooldown: 90,
      })

      const response = await server.inject({
        method: 'GET',
        url: '/api/settings',
        headers: { Authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.data.notificationsEnabled).toBe(true)
      expect(body.data.quietHoursEnabled).toBe(true)
      expect(body.data.quietHoursStart).toBe('21:00')
      expect(body.data.quietHoursEnd).toBe('06:00')
      expect(body.data.notificationCooldown).toBe(90)
    })
  })
})
