import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    // Enter username (required since v0.9.0)
    await page.fill('#username', 'admin')

    // Enter PIN (default admin PIN: 2808)
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('2808')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('should display settings page with all sections', async ({ page }) => {
    await page.goto('/settings')

    // Should show main sections
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.locator('h2:has-text("Manage")')).toBeVisible()
    await expect(page.locator('h2:has-text("Account")')).toBeVisible()
    await expect(page.locator('h2:has-text("System")')).toBeVisible()
  })

  test('should display theme toggle options', async ({ page }) => {
    await page.goto('/settings')

    // Wait for settings to load
    await expect(page.getByText('Appearance')).toBeVisible()

    // Should show theme options as buttons
    await expect(page.getByRole('button', { name: 'Light' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'System' })).toBeVisible()
  })

  test('should navigate to cameras page', async ({ page }) => {
    await page.goto('/settings')

    // Click on Cameras link
    await page.locator('a:has-text("Cameras")').click()

    // Should navigate to cameras page
    await expect(page).toHaveURL('/cameras')
  })

  test('should navigate to system health page', async ({ page }) => {
    await page.goto('/settings')

    // Click on System Health link
    await page.locator('a:has-text("System Health")').click()

    // Should navigate to system page
    await expect(page).toHaveURL('/system')
  })

  test('should show Change PIN button', async ({ page }) => {
    await page.goto('/settings')

    // Should show Change PIN button in account section
    const changePinButton = page.locator('button:has-text("Change PIN")')
    await expect(changePinButton).toBeVisible()
  })

  test('should show Storage button', async ({ page }) => {
    await page.goto('/settings')

    // Should show Storage button in system section
    const storageButton = page.locator('button:has-text("Storage")')
    await expect(storageButton).toBeVisible()
  })

  test('should show Notifications button', async ({ page }) => {
    await page.goto('/settings')

    // Should show Notifications button
    const notificationsButton = page.locator('button:has-text("Notifications")')
    await expect(notificationsButton).toBeVisible()
  })

  test('should show app version', async ({ page }) => {
    await page.goto('/settings')

    // Should show version
    await expect(page.getByText(/ParcelGuard v/)).toBeVisible()
    await expect(page.getByText(/Phase 6A/)).toBeVisible()
  })

  test('should have logout button', async ({ page }) => {
    await page.goto('/settings')

    // Should show logout button
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  })
})
