import { test, expect } from '@playwright/test'

test.describe('ParcelGuard App', () => {
  test('should display dashboard', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('ParcelGuard')).toBeVisible()
    await expect(page.getByText('Multi-camera security system')).toBeVisible()
  })

  test('should navigate to live view', async ({ page }) => {
    await page.goto('/live')

    await expect(page.getByText('Live View - Phase 2')).toBeVisible()
  })
})
