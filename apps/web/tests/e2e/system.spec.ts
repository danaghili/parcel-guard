import { test, expect } from '@playwright/test'

test.describe('System Health Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())

    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('1234')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('should navigate to system page from settings', async ({ page }) => {
    await page.goto('/settings')

    // Click on System Health link
    await page.locator('a:has-text("System Health")').click()

    // Should navigate to system page
    await expect(page).toHaveURL('/system')
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible()
  })

  test('should display system stats', async ({ page }) => {
    await page.goto('/system')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({ timeout: 10000 })

    // Should show version section (version number like "0.1.0")
    await expect(page.getByText('Version')).toBeVisible()

    // Should show uptime
    await expect(page.getByText('Uptime')).toBeVisible()

    // Should show memory usage
    await expect(page.getByText('Memory')).toBeVisible()
  })

  test('should display storage information', async ({ page }) => {
    await page.goto('/system')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({ timeout: 10000 })

    // Should show storage section
    await expect(page.getByRole('heading', { name: 'Storage' })).toBeVisible()

    // Should show breakdown section
    await expect(page.getByText('Breakdown')).toBeVisible()
  })

  test('should display camera health table', async ({ page }) => {
    await page.goto('/system')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({ timeout: 10000 })

    // Should show cameras section
    await expect(page.getByRole('heading', { name: 'Cameras' })).toBeVisible()
  })

  test('should have back navigation to settings', async ({ page }) => {
    await page.goto('/system')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({ timeout: 10000 })

    // Click back button
    await page.locator('a[href="/settings"]').first().click()

    // Should go back to settings
    await expect(page).toHaveURL('/settings')
  })
})
