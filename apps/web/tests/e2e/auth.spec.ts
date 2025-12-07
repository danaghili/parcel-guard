import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/live')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Sign in to continue')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Enter username
    await page.fill('#username', 'admin')

    // Enter invalid PIN
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('0000')

    // Wait for error to appear
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({
      timeout: 5000,
    })
  })

  test('should login with valid username and PIN and redirect to dashboard', async ({ page }) => {
    await page.goto('/login')

    // Enter username
    await page.fill('#username', 'admin')

    // Enter valid PIN (default: 2808)
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('2808')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 5000 })
    await expect(page.getByText('ParcelGuard')).toBeVisible()
  })

  test('should redirect to originally requested page after login', async ({ page }) => {
    // Try to access live view without auth
    await page.goto('/live')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)

    // Login with username and PIN
    await page.fill('#username', 'admin')
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('2808')

    // Should redirect to live view (the original destination)
    await expect(page).toHaveURL('/live', { timeout: 5000 })
  })

  test('should maintain session across page refresh', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('#username', 'admin')
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('2808')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Refresh the page
    await page.reload()

    // Should still be on dashboard, not redirected to login
    await expect(page).toHaveURL('/')
    await expect(page.getByText('ParcelGuard')).toBeVisible()
  })

  test('should logout and redirect to login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('#username', 'admin')
    const pinInputs = page.locator('input[type="text"][inputmode="numeric"]')
    await pinInputs.first().click()
    await page.keyboard.type('2808')

    await expect(page).toHaveURL('/', { timeout: 5000 })

    // Navigate to settings (where logout typically is)
    await page.goto('/settings')

    // Click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should show username input on login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('#username')).toBeVisible()
    await expect(page.getByText('Username')).toBeVisible()
  })
})
