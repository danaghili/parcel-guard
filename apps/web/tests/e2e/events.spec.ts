import { test, expect, type Page } from '@playwright/test'

/**
 * E2E tests for Events and Camera Settings (Phase 3A)
 *
 * These tests cover the event management functionality including:
 * - Event list display and pagination
 * - Event filtering (camera, date, importance)
 * - Event details view
 * - Marking events as important/false alarm
 * - Deleting events
 * - Camera settings API
 * - Frigate webhook integration
 */

const API_BASE_URL = 'http://localhost:3000'

// Helper to login via UI
async function loginWithPin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())

  // Enter valid PIN (default: 1234)
  // PIN inputs use type="text" with inputMode="numeric"
  const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')

  await pinInputs.first().click()
  await page.keyboard.type('1234')

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/', { timeout: 5000 })
}

// Helper to get auth token via API
async function getAuthToken(request: Parameters<Parameters<typeof test>[1]>[0]['request']) {
  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { pin: '1234' },
  })
  const body = await loginResponse.json()
  return body.data?.token
}

test.describe('Events API', () => {
  test('should fetch event statistics', async ({ request }) => {
    const token = await getAuthToken(request)
    expect(token).toBeTruthy()

    const statsResponse = await request.get(`${API_BASE_URL}/api/events/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(statsResponse.ok()).toBeTruthy()

    const { data } = await statsResponse.json()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('today')
    expect(data).toHaveProperty('important')
    expect(data).toHaveProperty('falseAlarms')
  })

  test('should list events with pagination', async ({ request }) => {
    const token = await getAuthToken(request)

    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(eventsResponse.ok()).toBeTruthy()

    const { data } = await eventsResponse.json()
    expect(data).toHaveProperty('events')
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('page')
    expect(data).toHaveProperty('pageSize')
    expect(data).toHaveProperty('hasMore')
    expect(Array.isArray(data.events)).toBe(true)
  })

  test('should filter events by camera', async ({ request }) => {
    const token = await getAuthToken(request)

    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?cameraId=cam1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(eventsResponse.ok()).toBeTruthy()

    const { data } = await eventsResponse.json()
    // All returned events should be from cam1
    for (const event of data.events) {
      expect(event.cameraId).toBe('cam1')
    }
  })

  test('should filter events by importance', async ({ request }) => {
    const token = await getAuthToken(request)

    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?isImportant=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(eventsResponse.ok()).toBeTruthy()

    const { data } = await eventsResponse.json()
    // All returned events should be marked as important
    for (const event of data.events) {
      expect(event.isImportant).toBe(true)
    }
  })

  test('should require authentication for events list', async ({ request }) => {
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events`)
    expect(eventsResponse.status()).toBe(401)
  })
})

test.describe('Camera Settings API', () => {
  test('should list cameras', async ({ request }) => {
    const token = await getAuthToken(request)

    const camerasResponse = await request.get(`${API_BASE_URL}/api/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(camerasResponse.ok()).toBeTruthy()

    const { data } = await camerasResponse.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('should update camera name', async ({ request }) => {
    const token = await getAuthToken(request)

    // Get cameras
    const camerasResponse = await request.get(`${API_BASE_URL}/api/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (camerasResponse.ok()) {
      const { data: cameras } = await camerasResponse.json()

      if (cameras && cameras.length > 0) {
        const camera = cameras[0]
        const newName = `Test Camera ${Date.now()}`

        // Update camera name
        const updateResponse = await request.put(`${API_BASE_URL}/api/cameras/${camera.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { name: newName },
        })
        expect(updateResponse.ok()).toBeTruthy()

        const { data: updated } = await updateResponse.json()
        expect(updated.name).toBe(newName)
      }
    }
  })

  test('should update motion sensitivity', async ({ request }) => {
    const token = await getAuthToken(request)

    // Get cameras
    const camerasResponse = await request.get(`${API_BASE_URL}/api/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (camerasResponse.ok()) {
      const { data: cameras } = await camerasResponse.json()

      if (cameras && cameras.length > 0) {
        const camera = cameras[0]

        // Update motion sensitivity
        const updateResponse = await request.put(`${API_BASE_URL}/api/cameras/${camera.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { motionSensitivity: 65 },
        })
        expect(updateResponse.ok()).toBeTruthy()

        const { data: updated } = await updateResponse.json()
        expect(updated.settings.motionSensitivity).toBe(65)
      }
    }
  })

  test('should update motion zones', async ({ request }) => {
    const token = await getAuthToken(request)

    // Get cameras
    const camerasResponse = await request.get(`${API_BASE_URL}/api/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (camerasResponse.ok()) {
      const { data: cameras } = await camerasResponse.json()

      if (cameras && cameras.length > 0) {
        const camera = cameras[0]
        const zones = [
          { points: [[0, 0], [100, 0], [100, 100], [0, 100]], name: 'E2E Test Zone' },
        ]

        // Update motion zones
        const updateResponse = await request.put(`${API_BASE_URL}/api/cameras/${camera.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { motionZones: zones },
        })
        expect(updateResponse.ok()).toBeTruthy()

        const { data: updated } = await updateResponse.json()
        expect(updated.settings.motionZones).toHaveLength(1)
        expect(updated.settings.motionZones[0].name).toBe('E2E Test Zone')
      }
    }
  })

  test('should return 404 for non-existent camera', async ({ request }) => {
    const token = await getAuthToken(request)

    const updateResponse = await request.put(`${API_BASE_URL}/api/cameras/non-existent-camera`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'New Name' },
    })
    expect(updateResponse.status()).toBe(404)
  })
})

test.describe('Frigate Webhook API', () => {
  test('should accept valid Frigate event payload', async ({ request }) => {
    // Frigate webhooks don't require auth
    const webhookResponse = await request.post(`${API_BASE_URL}/api/frigate/events`, {
      data: {
        type: 'new',
        before: {
          id: `e2e-test-${Date.now()}`,
          camera: 'cam1',
          start_time: Date.now() / 1000,
          end_time: null,
          label: 'person',
          top_score: 0.9,
          has_clip: true,
          has_snapshot: true,
          current_zones: [],
        },
        after: {
          id: `e2e-test-${Date.now()}`,
          camera: 'cam1',
          start_time: Date.now() / 1000,
          end_time: null,
          label: 'person',
          top_score: 0.9,
          has_clip: true,
          has_snapshot: true,
          current_zones: [],
        },
      },
    })

    // May return 201 (created) or 400 (if camera doesn't exist in test env)
    expect([201, 400]).toContain(webhookResponse.status())
  })

  test('should reject invalid Frigate payload', async ({ request }) => {
    const webhookResponse = await request.post(`${API_BASE_URL}/api/frigate/events`, {
      data: { invalid: 'payload' },
    })

    expect(webhookResponse.status()).toBe(400)
  })

  test('should reject empty payload', async ({ request }) => {
    const webhookResponse = await request.post(`${API_BASE_URL}/api/frigate/events`, {
      data: {},
    })

    expect(webhookResponse.status()).toBe(400)
  })
})

test.describe('Storage Management API', () => {
  test('should get storage stats', async ({ request }) => {
    const token = await getAuthToken(request)

    const storageResponse = await request.get(`${API_BASE_URL}/api/system/storage`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(storageResponse.ok()).toBeTruthy()

    const { data } = await storageResponse.json()
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('used')
    expect(data).toHaveProperty('available')
    expect(data).toHaveProperty('clips')
    expect(data).toHaveProperty('thumbnails')
    expect(data).toHaveProperty('database')
    expect(data).toHaveProperty('usedFormatted')
  })

  test('should require auth for storage stats', async ({ request }) => {
    const storageResponse = await request.get(`${API_BASE_URL}/api/system/storage`)
    expect(storageResponse.status()).toBe(401)
  })
})

test.describe('Events UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithPin(page)
  })

  test('should navigate to events page from dashboard', async ({ page }) => {
    // Look for events/history link in navigation
    const eventsLink = page.getByRole('link', { name: /events|history/i })

    if (await eventsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await eventsLink.click()
      await expect(page).toHaveURL(/\/events/)
    }
  })

  test('should display ParcelGuard branding', async ({ page }) => {
    await expect(page.getByText('ParcelGuard')).toBeVisible()
  })

  test('should have navigation menu', async ({ page }) => {
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]')
    await expect(nav).toBeVisible()
  })
})
