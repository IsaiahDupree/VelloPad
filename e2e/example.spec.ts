import { test, expect } from '@playwright/test';

/**
 * Example E2E test for VelloPad
 * This ensures Playwright is working correctly
 */
test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the page loaded
  await expect(page).toHaveTitle(/VelloPad/);

  // Basic smoke test
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
});

test('has proper meta tags', async ({ page }) => {
  await page.goto('/');

  // Check meta description
  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute('content', /.+/);
});
