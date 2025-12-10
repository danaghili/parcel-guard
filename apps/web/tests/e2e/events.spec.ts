import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

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
 * - Motion daemon webhook integration
 */

const API_BASE_URL = 'http://localhost:3000'

// Helper to login via UI
async function loginWithPin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())

  // Enter username (required since v0.9.0)
  await page.fill('#username', 'admin')

  // Enter valid PIN (default admin PIN: 2808)
  // PIN inputs use type="text" with inputMode="numeric"
  const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')

  await pinInputs.first().click()
  await page.keyboard.type('2808')

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/', { timeout: 5000 })
}

// Helper to get auth token via API
async function getAuthToken(request: APIRequestContext): Promise<string | undefined> {
  const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: 'admin', pin: '2808' },
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

test.describe('Motion Webhook API', () => {
  test('should accept valid Motion event payload', async ({ request }) => {
    // Motion webhooks don't require auth
    const timestamp = Math.floor(Date.now() / 1000)
    const webhookResponse = await request.post(`${API_BASE_URL}/api/motion/events`, {
      data: {
        cameraId: 'cam1',
        eventId: `e2e-test-${Date.now()}`,
        type: 'start',
        timestamp,
      },
    })

    // May return 201 (created) or 400 (if camera doesn't exist in test env)
    expect([201, 400]).toContain(webhookResponse.status())
  })

  test('should reject invalid Motion payload', async ({ request }) => {
    const webhookResponse = await request.post(`${API_BASE_URL}/api/motion/events`, {
      data: { invalid: 'payload' },
    })

    expect(webhookResponse.status()).toBe(400)
  })

  test('should reject empty payload', async ({ request }) => {
    const webhookResponse = await request.post(`${API_BASE_URL}/api/motion/events`, {
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
    expect(data).toHaveProperty('percentage')
    expect(data).toHaveProperty('warning')
    expect(data).toHaveProperty('formatted')
    expect(data.formatted).toHaveProperty('total')
    expect(data.formatted).toHaveProperty('used')
    expect(data.formatted).toHaveProperty('available')
    expect(data).toHaveProperty('breakdown')
    expect(data.breakdown).toHaveProperty('clips')
    expect(data.breakdown).toHaveProperty('thumbnails')
    expect(data.breakdown).toHaveProperty('database')
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

test.describe('Events Page (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithPin(page)
    await page.goto('/events')
  })

  test('should display events page header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
    await expect(page.getByText('Motion events captured by your cameras')).toBeVisible()
  })

  test('should display event stats', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(500)

    // Check for stat labels (use exact match to avoid matching timestamps)
    await expect(page.locator('p.text-xs:has-text("Total")')).toBeVisible()
    await expect(page.locator('p.text-xs:has-text("Today")')).toBeVisible()
    await expect(page.locator('p.text-xs:has-text("Important")')).toBeVisible()
    await expect(page.locator('p.text-xs:has-text("False Alarms")')).toBeVisible()
  })

  test('should display filter controls', async ({ page }) => {
    // Camera filter dropdown
    await expect(page.getByRole('combobox').first()).toBeVisible()

    // Date preset buttons
    await expect(page.getByRole('button', { name: 'All Time' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: '7 Days' })).toBeVisible()
    await expect(page.getByRole('button', { name: '30 Days' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Custom' })).toBeVisible()
  })

  test('should show custom date inputs when Custom is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Custom' }).click()

    await expect(page.getByText('From:')).toBeVisible()
    await expect(page.getByText('To:')).toBeVisible()
  })

  test('should apply date filter via preset', async ({ page }) => {
    // Click Today preset
    await page.getByRole('button', { name: 'Today' }).click()

    // URL should update with startDate parameter
    await expect(page).toHaveURL(/startDate=/)
  })

  test('should persist camera filter in URL', async ({ page }) => {
    const cameraSelect = page.locator('select').first()

    // Get camera options
    const options = await cameraSelect.locator('option').all()

    // Select first camera if available (skip "All Cameras" option)
    if (options.length > 1) {
      const optionValue = await options[1]?.getAttribute('value')
      if (optionValue) {
        await cameraSelect.selectOption(optionValue)
        await expect(page).toHaveURL(/camera=/)
      }
    }
  })

  test('should display empty state or event list', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(1000)

    // Should show either events or empty state
    const eventCards = page.locator('a[href^="/events/"]')
    const emptyState = page.getByText('No events found')

    // Either events are present or empty state is shown
    const hasEvents = (await eventCards.count()) > 0
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    expect(hasEvents || hasEmptyState).toBe(true)
  })

  test('should navigate to event detail when clicking event card', async ({ page }) => {
    // Wait for events to load
    await page.waitForTimeout(1000)

    const eventCards = page.locator('a[href^="/events/"]').filter({ hasNot: page.locator('text=Back') })

    if ((await eventCards.count()) > 0) {
      await eventCards.first().click()
      await expect(page).toHaveURL(/\/events\/[a-zA-Z0-9-]+/)
    }
  })
})

test.describe('Event Detail Page (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithPin(page)
  })

  test('should display back link on event detail', async ({ page, request }) => {
    // First get an event ID via API
    const token = await getAuthToken(request)
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (eventsResponse.ok()) {
      const { data } = await eventsResponse.json()
      if (data.events && data.events.length > 0) {
        const eventId = data.events[0].id
        await page.goto(`/events/${eventId}`)

        await expect(page.getByText('Back to events')).toBeVisible()
      }
    }
  })

  test('should display event action buttons', async ({ page, request }) => {
    const token = await getAuthToken(request)
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (eventsResponse.ok()) {
      const { data } = await eventsResponse.json()
      if (data.events && data.events.length > 0) {
        const eventId = data.events[0].id
        await page.goto(`/events/${eventId}`)

        // Check for action buttons
        const importantBtn = page.getByRole('button', { name: /important/i })
        const falseAlarmBtn = page.getByRole('button', { name: /false alarm/i })
        const deleteBtn = page.getByRole('button', { name: /delete/i })

        await expect(importantBtn).toBeVisible()
        await expect(falseAlarmBtn).toBeVisible()
        await expect(deleteBtn).toBeVisible()
      }
    }
  })

  test('should toggle important status', async ({ page, request }) => {
    const token = await getAuthToken(request)
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (eventsResponse.ok()) {
      const { data } = await eventsResponse.json()
      if (data.events && data.events.length > 0) {
        const event = data.events[0]
        await page.goto(`/events/${event.id}`)

        const importantBtn = page.getByRole('button', { name: /important/i })
        const initialText = await importantBtn.textContent()

        await importantBtn.click()
        await page.waitForTimeout(500)

        const newText = await importantBtn.textContent()
        // Button text should change between "Mark Important" and "Remove Important"
        expect(newText).not.toBe(initialText)
      }
    }
  })

  test('should show delete confirmation modal', async ({ page, request }) => {
    const token = await getAuthToken(request)
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (eventsResponse.ok()) {
      const { data } = await eventsResponse.json()
      if (data.events && data.events.length > 0) {
        const eventId = data.events[0].id
        await page.goto(`/events/${eventId}`)

        // Click delete button
        await page.getByRole('button', { name: /delete/i }).click()

        // Confirmation modal should appear
        await expect(page.getByText('Delete Event?')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Delete Event' })).toBeVisible()
      }
    }
  })

  test('should cancel delete confirmation', async ({ page, request }) => {
    const token = await getAuthToken(request)
    const eventsResponse = await request.get(`${API_BASE_URL}/api/events?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (eventsResponse.ok()) {
      const { data } = await eventsResponse.json()
      if (data.events && data.events.length > 0) {
        const eventId = data.events[0].id
        await page.goto(`/events/${eventId}`)

        // Click delete button
        await page.getByRole('button', { name: /delete/i }).click()

        // Click cancel
        await page.getByRole('button', { name: 'Cancel' }).click()

        // Modal should close
        await expect(page.getByText('Delete Event?')).not.toBeVisible()
      }
    }
  })

  test('should show error for non-existent event', async ({ page }) => {
    await page.goto('/events/non-existent-event-id-12345')

    // Should show error or "not found" message
    await expect(page.getByText(/not found|error|failed/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard Events Integration (Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithPin(page)
  })

  test('should display event stats on dashboard', async ({ page }) => {
    // Dashboard should show event-related stats
    await expect(page.getByText('Events Today')).toBeVisible()
    await expect(page.getByText('Important')).toBeVisible()
    await expect(page.getByText('Total Events')).toBeVisible()
  })

  test('should display recent events section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Recent Events' })).toBeVisible()
    // Find View all link within the Recent Events section (there are multiple View all links on the page)
    const recentEventsSection = page.locator('section', { has: page.getByText('Recent Events') })
    await expect(recentEventsSection.getByRole('link', { name: 'View all' })).toBeVisible()
  })

  test('should navigate to events page from View all link', async ({ page }) => {
    // Find the "View all" link in the Recent Events section
    const recentEventsSection = page.locator('section', { has: page.getByText('Recent Events') })
    const viewAllLink = recentEventsSection.getByRole('link', { name: 'View all' })

    await viewAllLink.click()
    await expect(page).toHaveURL('/events')
  })
})
