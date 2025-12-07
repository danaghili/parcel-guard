import { test, expect, Page } from '@playwright/test'

// Helper to login before tests
async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
  // Fill in username
  await page.fill('#username', 'admin')
  // Fill in PIN
  const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
  await pinInputs.first().click()
  await page.keyboard.type('2808')
  await expect(page).toHaveURL('/', { timeout: 5000 })
}

test.describe('ParcelGuard App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first, then clear localStorage
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('ParcelGuard')).toBeVisible()
    await expect(page.getByText('Sign in to continue')).toBeVisible()
  })

  test('should display dashboard after login', async ({ page }) => {
    await login(page)

    await expect(page.getByText('ParcelGuard')).toBeVisible()
  })

  test('should have working bottom navigation', async ({ page }) => {
    await login(page)

    // Navigate to Live (use the bottom nav link, which has exact name "Live")
    await page.getByRole('link', { name: 'Live', exact: true }).click()
    await expect(page).toHaveURL('/live')

    // Navigate to Events
    await page.getByRole('link', { name: 'Events', exact: true }).click()
    await expect(page).toHaveURL('/events')

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL('/settings')

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    await expect(page).toHaveURL('/')
  })

  test('should show correct page titles', async ({ page }) => {
    await login(page)

    // Dashboard
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Live View
    await page.goto('/live')
    await expect(page.getByRole('heading', { name: /live view/i })).toBeVisible()

    // Events
    await page.goto('/events')
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible()

    // Settings
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display system status', async ({ page }) => {
    // Dashboard should show Cameras section with camera status
    await expect(
      page.getByRole('heading', { name: 'Cameras' })
    ).toBeVisible({ timeout: 5000 })
  })

  test('should have quick link to live view', async ({ page }) => {
    // Should have a Live View card on the dashboard
    const liveViewLink = page.getByRole('link', { name: 'Live View' })
    await expect(liveViewLink).toBeVisible()
  })
})
