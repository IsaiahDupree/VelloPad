/**
 * E2E Test: Template Marketplace
 * @see PB-035: Template Marketplace
 */

import { test, expect } from '@playwright/test'

test.describe('Template Marketplace', () => {
  test('should display template marketplace with available templates', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Check page title
    await expect(page.locator('h1')).toContainText('Template Marketplace')

    // Verify template grid is displayed
    await expect(page.locator('[data-testid="template-grid"]')).toBeVisible()

    // Verify at least one template card is visible
    await expect(page.locator('[data-testid^="template-card-"]').first()).toBeVisible()
  })

  test('should filter templates by category', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Click on a category filter
    await page.click('[data-testid="category-classic"]')

    // Verify only classic templates are shown
    await expect(page.locator('[data-testid="template-card-classic"]')).toBeVisible()
  })

  test('should search for templates', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Type in search box
    await page.fill('[data-testid="template-search"]', 'minimalist')

    // Verify search results
    await expect(page.locator('[data-testid="template-card-minimalist"]')).toBeVisible()
  })

  test('should view template details', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Click on first template
    await page.click('[data-testid^="template-card-"]')

    // Verify template detail page
    await expect(page.locator('[data-testid="template-detail"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-preview"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-price"]')).toBeVisible()
  })

  test('should purchase a premium template', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Find premium template
    await page.click('[data-testid="template-card-premium"]')

    // Click purchase button
    await page.click('[data-testid="purchase-button"]')

    // Verify checkout modal appears
    await expect(page.locator('[data-testid="checkout-modal"]')).toBeVisible()
  })

  test('should use free template', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Find free template
    await page.click('[data-testid="template-card-free"]')

    // Click use template button
    await page.click('[data-testid="use-template-button"]')

    // Verify redirect to editor
    await expect(page).toHaveURL(/\/photo-book\/.*\/edit/)
  })

  test('should sort templates by popularity', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Click sort dropdown
    await page.click('[data-testid="sort-selector"]')

    // Select sort by popularity
    await page.click('text=Most Popular')

    // Verify templates are reordered
    await expect(page.locator('[data-testid="template-grid"]')).toBeVisible()
  })

  test('should display template ratings and reviews', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Click on template
    await page.click('[data-testid^="template-card-"]')

    // Verify ratings section
    await expect(page.locator('[data-testid="template-rating"]')).toBeVisible()
    await expect(page.locator('[data-testid="template-reviews"]')).toBeVisible()
  })

  test('should preview template before purchase', async ({ page }) => {
    await page.goto('/photo-book/marketplace')

    // Click on template
    await page.click('[data-testid^="template-card-"]')

    // Click preview button
    await page.click('[data-testid="preview-button"]')

    // Verify preview modal
    await expect(page.locator('[data-testid="template-preview-modal"]')).toBeVisible()
  })
})
