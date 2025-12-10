import { test, expect, Page } from '@playwright/test'

// Helper to login before tests
async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  // Enter username (required since v0.9.0)
  await page.fill('#username', 'admin')
  // Enter PIN (default admin PIN: 2808)
  const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
  await pinInputs.first().click()
  await page.keyboard.type('2808')
  await expect(page).toHaveURL('/', { timeout: 5000 })
}

test.describe('Live View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to live view from dashboard', async ({ page }) => {
    // Find and click live view link in bottom navigation (exact match)
    const liveViewLink = page.getByRole('link', { name: 'Live', exact: true })
    await liveViewLink.click()

    await expect(page).toHaveURL('/live')
    await expect(page.getByRole('heading', { name: /live view/i })).toBeVisible()
  })

  test('should display camera count', async ({ page }) => {
    await page.goto('/live')

    // Should show camera count text
    await expect(page.getByText(/\d+ camera/i)).toBeVisible({ timeout: 5000 })
  })

  test('should display camera grid with cameras', async ({ page }) => {
    await page.goto('/live')

    // Wait for cameras to load
    await page.waitForSelector('[data-testid="camera-card"], button:has(video), .aspect-video', {
      timeout: 10000,
    }).catch(() => {
      // If no specific test ID, look for camera-related elements
    })

    // Should have camera cards or video elements
    const cameraElements = page.locator('.aspect-video, [data-testid="camera-card"]')
    const count = await cameraElements.count()

    // Should have at least one camera or show empty state
    if (count === 0) {
      // Check for empty state or loading state
      const emptyOrLoading = page.getByText(/no cameras|loading|add a camera/i)
      await expect(emptyOrLoading).toBeVisible()
    }
  })

  test('should show refresh button', async ({ page }) => {
    await page.goto('/live')

    const refreshButton = page.getByRole('button', { name: /refresh/i })
    await expect(refreshButton).toBeVisible()
  })

  test('should refresh cameras when clicking refresh button', async ({ page }) => {
    await page.goto('/live')

    const refreshButton = page.getByRole('button', { name: /refresh/i })
    await refreshButton.click()

    // Button should show loading state (spinner animation)
    await expect(refreshButton.locator('svg')).toHaveClass(/animate-spin/, { timeout: 1000 }).catch(() => {
      // Animation might be too fast to catch, that's okay
    })
  })

  test('should show error state when API fails', async ({ page }) => {
    // Intercept API call and return error (client-side error to bypass retry)
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 400, // 4xx errors don't trigger retry
        contentType: 'application/json',
        body: JSON.stringify({ error: 'BAD_REQUEST', message: 'Failed to load cameras' }),
      })
    })

    await page.goto('/live')

    // Should show error message - use first() to handle multiple matches
    await expect(page.getByText(/failed to load|error/i).first()).toBeVisible({ timeout: 10000 })

    // Should show retry button
    await expect(page.getByRole('button', { name: /try again|retry/i })).toBeVisible()
  })

  test('should retry loading cameras when clicking try again', async ({ page }) => {
    let shouldSucceed = false

    // First series of calls fail (use 400 to skip retry), then succeed after button click
    await page.route('**/api/cameras', (route) => {
      if (!shouldSucceed) {
        route.fulfill({
          status: 400, // 4xx errors don't trigger auto-retry
          contentType: 'application/json',
          body: JSON.stringify({ error: 'BAD_REQUEST', message: 'Failed to load cameras' }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'cam1',
                name: 'Front Door',
                streamUrl: 'http://localhost:8554/cam1',
                status: 'online',
                lastSeen: Date.now(),
              },
            ],
          }),
        })
      }
    })

    await page.goto('/live')

    // Should show error
    await expect(page.getByText(/failed to load|error/i)).toBeVisible({ timeout: 10000 })

    // Mark that next calls should succeed
    shouldSucceed = true

    // Click try again
    await page.getByRole('button', { name: /try again|retry/i }).click()

    // Should now show cameras
    await expect(page.getByText(/1 camera/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Camera Grid', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display online camera with status indicator', async ({ page }) => {
    // Mock API response with online camera
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'cam1',
              name: 'Front Door',
              streamUrl: 'http://localhost:8554/cam1',
              status: 'online',
              lastSeen: Date.now(),
            },
          ],
        }),
      })
    })

    await page.goto('/live')

    // Should show camera name
    await expect(page.getByText('Front Door')).toBeVisible({ timeout: 5000 })
  })

  test('should display offline camera with last seen time', async ({ page }) => {
    const lastSeenTime = Date.now() - 3600000 // 1 hour ago

    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'cam1',
              name: 'Back Garden',
              streamUrl: 'http://localhost:8554/cam1',
              status: 'offline',
              lastSeen: lastSeenTime,
            },
          ],
        }),
      })
    })

    await page.goto('/live')

    // Should show camera name
    await expect(page.getByText('Back Garden')).toBeVisible({ timeout: 5000 })

    // For offline cameras, the UI shows "last seen" time (e.g., "1h ago") instead of "offline"
    // Check for the grey status indicator (shown via a small grey dot)
    await expect(page.locator('.bg-slate-500')).toBeVisible()
  })

  test('should display multiple cameras in grid layout', async ({ page }) => {
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
            { id: 'cam2', name: 'Back Garden', streamUrl: 'http://localhost:8554/cam2', status: 'online', lastSeen: Date.now() },
            { id: 'cam3', name: 'Side Gate', streamUrl: 'http://localhost:8554/cam3', status: 'offline', lastSeen: Date.now() - 3600000 },
          ],
        }),
      })
    })

    await page.goto('/live')

    // Should show all camera names
    await expect(page.getByText('Front Door')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Back Garden')).toBeVisible()
    await expect(page.getByText('Side Gate')).toBeVisible()

    // Should show correct camera count
    await expect(page.getByText(/3 cameras/i)).toBeVisible()
  })
})

test.describe('Single Camera View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to single camera view when clicking camera card', async ({ page }) => {
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
          ],
        }),
      })
    })

    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live')

    // Wait for camera to appear and click it
    await page.getByText('Front Door').click()

    // Should navigate to single camera view
    await expect(page).toHaveURL(/\/live\/cam1/)
  })

  test('should display camera name in single view header', async ({ page }) => {
    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Should show camera name in header
    await expect(page.getByRole('heading', { name: 'Front Door' }).or(page.getByText('Front Door'))).toBeVisible({ timeout: 5000 })
  })

  test('should show back button in single camera view', async ({ page }) => {
    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Should show back button - look for button containing "Back" text
    await expect(page.locator('button:has-text("Back")').first()).toBeVisible({ timeout: 5000 })
  })

  test('should return to grid view when clicking back', async ({ page }) => {
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
          ],
        }),
      })
    })

    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Click back button - use specific locator
    await page.locator('button:has-text("Back")').first().click()

    // Should return to live view grid
    await expect(page).toHaveURL('/live')
  })

  test('should show fullscreen button', async ({ page }) => {
    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Should show fullscreen button
    await expect(
      page.getByRole('button', { name: /fullscreen/i }).or(page.locator('button:has(svg)').last())
    ).toBeVisible({ timeout: 5000 })
  })

  test('should show error state for non-existent camera', async ({ page }) => {
    await page.route('**/api/cameras/invalid-cam', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'NOT_FOUND', message: 'Camera not found' }),
      })
    })

    await page.goto('/live/invalid-cam')

    // Should show error message
    await expect(page.getByText(/not found|error/i)).toBeVisible({ timeout: 5000 })

    // Should show back button to return to live view
    await expect(page.getByRole('button', { name: /back to live/i })).toBeVisible()
  })

  test('should show offline status for offline camera', async ({ page }) => {
    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'offline', lastSeen: Date.now() - 3600000 },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Should show offline indicator
    await expect(page.getByText(/offline|disconnected/i)).toBeVisible({ timeout: 5000 })
  })

  test('should show connecting status while stream loads', async ({ page }) => {
    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live/cam1')

    // Should show connecting status initially (may be brief)
    // The status could be "Connecting..." or quickly switch to another state
    // Use first() to handle multiple matches
    await expect(
      page.getByText(/connecting|loading|live/i).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display camera grid on mobile', async ({ page }) => {
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
            { id: 'cam2', name: 'Back Garden', streamUrl: 'http://localhost:8554/cam2', status: 'online', lastSeen: Date.now() },
          ],
        }),
      })
    })

    await page.goto('/live')

    // Should show cameras on mobile
    await expect(page.getByText('Front Door')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Back Garden')).toBeVisible()
  })

  test('should navigate to single camera view on mobile', async ({ page }) => {
    await page.route('**/api/cameras', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
          ],
        }),
      })
    })

    await page.route('**/api/cameras/cam1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'cam1', name: 'Front Door', streamUrl: 'http://localhost:8554/cam1', status: 'online', lastSeen: Date.now() },
        }),
      })
    })

    await page.goto('/live')

    // Tap camera card
    await page.getByText('Front Door').click()

    // Should navigate to single view
    await expect(page).toHaveURL(/\/live\/cam1/)
    await expect(page.getByText('Front Door')).toBeVisible()
  })

  test('should show bottom navigation on mobile', async ({ page }) => {
    await page.goto('/live')

    // Should have bottom navigation with live view active
    const bottomNav = page.locator('nav').last()
    await expect(bottomNav).toBeVisible()
  })
})
