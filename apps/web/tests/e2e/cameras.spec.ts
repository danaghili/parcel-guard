import { test, expect } from '@playwright/test'

test.describe('Camera Management', () => {
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

  test('should navigate to cameras page from settings', async ({ page }) => {
    await page.goto('/settings')

    // Click on Cameras link
    await page.locator('a:has-text("Cameras")').click()

    // Should navigate to cameras page
    await expect(page).toHaveURL('/cameras')
    await expect(page.getByRole('heading', { name: 'Cameras' })).toBeVisible()
  })

  test('should show add camera button', async ({ page }) => {
    await page.goto('/cameras')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Cameras' })).toBeVisible({ timeout: 10000 })

    // Should show Add Camera button
    await expect(page.getByRole('button', { name: /add camera/i })).toBeVisible()
  })

  test('should have back navigation to settings', async ({ page }) => {
    await page.goto('/cameras')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Cameras' })).toBeVisible({ timeout: 10000 })

    // Click back button
    await page.locator('a[href="/settings"]').first().click()

    // Should go back to settings
    await expect(page).toHaveURL('/settings')
  })

  test('should show camera not found for invalid camera id', async ({ page }) => {
    await page.goto('/cameras/non-existent-camera')

    // Should show not found message
    await expect(page.getByText('Camera not found')).toBeVisible()
  })
})
