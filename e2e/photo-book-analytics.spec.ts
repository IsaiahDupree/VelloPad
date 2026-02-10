/**
 * E2E Test: Photo Book Analytics Dashboard
 * @see PB-045: Photo Book Analytics
 */

import { test, expect } from '@playwright/test'

test.describe('Photo Book Analytics Dashboard', () => {
  test('should display photo book analytics metrics', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/photo-book/analytics')

    // Check page title
    await expect(page.locator('h1')).toContainText('Photo Book Analytics')

    // Verify key metric cards are displayed
    await expect(page.locator('text=Total Projects')).toBeVisible()
    await expect(page.locator('text=Total Orders')).toBeVisible()
    await expect(page.locator('text=Revenue')).toBeVisible()
    await expect(page.locator('text=Conversion Rate')).toBeVisible()

    // Verify metrics have values
    const totalProjects = page.locator('[data-testid="metric-total-projects"]')
    await expect(totalProjects).toBeVisible()
    await expect(totalProjects).not.toContainText('0')
  })

  test('should display popular templates chart', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Check for popular templates section
    await expect(page.locator('text=Popular Templates')).toBeVisible()

    // Verify template data is displayed
    await expect(page.locator('[data-testid="template-classic"]')).toBeVisible()
  })

  test('should display order metrics over time', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Check for orders over time chart
    await expect(page.locator('text=Orders Over Time')).toBeVisible()

    // Verify time period selector
    await expect(page.locator('[data-testid="period-selector"]')).toBeVisible()
  })

  test('should filter analytics by date range', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Click date range selector
    await page.click('[data-testid="date-range-selector"]')

    // Select last 30 days
    await page.click('text=Last 30 Days')

    // Verify metrics update
    await expect(page.locator('[data-testid="metric-total-orders"]')).toBeVisible()
  })

  test('should display conversion funnel', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Check for conversion funnel
    await expect(page.locator('text=Conversion Funnel')).toBeVisible()

    // Verify funnel stages
    await expect(page.locator('text=Projects Created')).toBeVisible()
    await expect(page.locator('text=Covers Designed')).toBeVisible()
    await expect(page.locator('text=PDFs Generated')).toBeVisible()
    await expect(page.locator('text=Orders Placed')).toBeVisible()
  })

  test('should display revenue breakdown', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Navigate to revenue tab
    await page.click('[data-testid="tab-revenue"]')

    // Verify revenue metrics
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Average Order Value')).toBeVisible()
    await expect(page.locator('text=Revenue by Product')).toBeVisible()
  })

  test('should export analytics data', async ({ page }) => {
    await page.goto('/photo-book/analytics')

    // Click export button
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-button"]')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toContain('photo-book-analytics')
  })
})
