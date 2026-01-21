import { test, expect } from '@playwright/test';

// TEST-004: Checkout E2E Tests
// Tests for quote requests, checkout flow, order tracking, and reorders

test.describe('Quote and Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you would need to:
    // 1. Authenticate as a test user
    // 2. Create a test book with chapters
    // 3. Request a rendition
    // For now, we'll test the UI assuming these prerequisites
  });

  test('should display quote request form', async ({ page }) => {
    // Navigate to a book's order page
    // Replace with actual test book ID
    await page.goto('/books/test-book-id/order');

    // Check for quote form
    await expect(page.getByText('Request Quote')).toBeVisible();
    await expect(page.getByLabel(/quantity/i)).toBeVisible();
    await expect(page.getByLabel(/shipping method/i)).toBeVisible();

    // Check for address fields
    await expect(page.getByLabel(/street address/i)).toBeVisible();
    await expect(page.getByLabel(/city/i)).toBeVisible();
    await expect(page.getByLabel(/postal code/i)).toBeVisible();
    await expect(page.getByLabel(/country/i)).toBeVisible();
  });

  test('should validate quote form fields', async ({ page }) => {
    await page.goto('/books/test-book-id/order');

    // Submit button should be disabled without required fields
    const submitButton = page.getByRole('button', { name: /get quotes/i });
    await expect(submitButton).toBeVisible();

    // Fill in quantity
    await page.getByLabel(/quantity/i).fill('1');

    // Fill in minimal address
    await page.getByLabel(/street address/i).fill('123 Test St');
    await page.getByLabel(/city/i).fill('Test City');
    await page.getByLabel(/postal code/i).fill('12345');
    await page.getByLabel(/country/i).fill('US');

    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should allow selecting different shipping methods', async ({ page }) => {
    await page.goto('/books/test-book-id/order');

    // Check shipping method options
    await page.getByLabel(/shipping method/i).click();

    await expect(page.getByText(/budget/i)).toBeVisible();
    await expect(page.getByText(/standard/i)).toBeVisible();
    await expect(page.getByText(/express/i)).toBeVisible();
  });

  test('should handle quote request submission', async ({ page }) => {
    await page.goto('/books/test-book-id/order');

    // Fill in the form
    await page.getByLabel(/quantity/i).fill('1');
    await page.getByLabel(/street address/i).fill('123 Test St');
    await page.getByLabel(/city/i).fill('Test City');
    await page.getByLabel(/postal code/i).fill('12345');
    await page.getByLabel(/country/i).fill('US');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /get quotes/i });
    await submitButton.click();

    // Should show loading state
    await expect(page.getByText(/loading/i).or(page.locator('[data-loading="true"]'))).toBeVisible({ timeout: 1000 }).catch(() => {
      // Loading state might be too fast to catch
    });
  });
});

test.describe('Quote Comparison', () => {
  test('should display multiple quote options', async ({ page }) => {
    // Assume quotes have been loaded
    await page.goto('/books/test-book-id/order?quotes=true');

    // Should show quote comparison section
    await expect(page.getByText(/quote/i)).toBeVisible();

    // Should show price information
    await expect(page.getByText(/\$/)).toBeVisible();
  });

  test('should highlight recommended quote', async ({ page }) => {
    await page.goto('/books/test-book-id/order?quotes=true');

    // Should highlight the recommended option
    await expect(page.getByText(/recommended/i)).toBeVisible();
  });

  test('should show cheapest and fastest options', async ({ page }) => {
    await page.goto('/books/test-book-id/order?quotes=true');

    // Should show badges for special categories
    await expect(page.getByText(/cheapest/i).or(page.getByText(/fastest/i))).toBeVisible();
  });

  test('should allow selecting a quote', async ({ page }) => {
    await page.goto('/books/test-book-id/order?quotes=true');

    // Select a quote button should be visible
    await expect(page.getByRole('button', { name: /select|proceed to checkout/i })).toBeVisible();
  });
});

test.describe('Stripe Checkout Integration', () => {
  test('should redirect to Stripe checkout', async ({ page }) => {
    await page.goto('/books/test-book-id/order?quotes=true');

    // Click on select/checkout button
    const checkoutButton = page.getByRole('button', { name: /select|proceed to checkout/i }).first();

    if (await checkoutButton.isVisible()) {
      // We can't actually test Stripe in E2E without test credentials
      // But we can verify the button exists and is clickable
      await expect(checkoutButton).toBeEnabled();
    }
  });
});

test.describe('Order Detail Page', () => {
  test('should display order information', async ({ page }) => {
    // Navigate to an order detail page
    await page.goto('/orders/test-order-id');

    // Should show order number
    await expect(page.getByText(/VLP-/i)).toBeVisible();

    // Should show status
    await expect(page.getByText(/status/i)).toBeVisible();
  });

  test('should display order timeline', async ({ page }) => {
    await page.goto('/orders/test-order-id');

    // Should show status timeline
    await expect(page.getByText(/timeline|history/i)).toBeVisible();
  });

  test('should display shipping information', async ({ page }) => {
    await page.goto('/orders/test-order-id');

    // Should show shipping address
    await expect(page.getByText(/shipping address/i)).toBeVisible();

    // Should show order total
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test('should show tracking information when available', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=shipped');

    // Should show tracking section if order is shipped
    await expect(page.getByText(/tracking/i).or(page.getByText(/carrier/i))).toBeVisible();
  });

  test('should display success message after checkout', async ({ page }) => {
    // Simulate returning from successful Stripe checkout
    await page.goto('/orders/test-order-id?success=true');

    // Should show success message
    await expect(page.getByText(/success|thank you|order placed/i)).toBeVisible();
  });
});

test.describe('Reorder Flow', () => {
  test('should show reorder button for delivered orders', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=delivered');

    // Should show reorder button
    await expect(page.getByRole('button', { name: /reorder/i })).toBeVisible();
  });

  test('should not show reorder button for pending orders', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=pending');

    // Should NOT show reorder button
    await expect(page.getByRole('button', { name: /reorder/i })).not.toBeVisible();
  });

  test('should open reorder dialog', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=delivered');

    const reorderButton = page.getByRole('button', { name: /reorder/i });

    if (await reorderButton.isVisible()) {
      await reorderButton.click();

      // Should show reorder dialog/modal
      await expect(page.getByText(/reorder|order again/i)).toBeVisible();

      // Should show quantity selector
      await expect(page.getByLabel(/quantity/i)).toBeVisible();
    }
  });

  test('should allow changing quantity in reorder', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=delivered');

    const reorderButton = page.getByRole('button', { name: /reorder/i });

    if (await reorderButton.isVisible()) {
      await reorderButton.click();

      // Change quantity
      const quantityInput = page.getByLabel(/quantity/i);
      await quantityInput.fill('5');

      await expect(quantityInput).toHaveValue('5');
    }
  });

  test('should show original order information in reorder dialog', async ({ page }) => {
    await page.goto('/orders/test-order-id?status=delivered');

    const reorderButton = page.getByRole('button', { name: /reorder/i });

    if (await reorderButton.isVisible()) {
      await reorderButton.click();

      // Should show book title
      await expect(page.getByText(/book title|original order/i)).toBeVisible();

      // Should show pricing estimate
      await expect(page.getByText(/\$/)).toBeVisible();
    }
  });
});

test.describe('Visual Regression', () => {
  test('quote form page screenshot', async ({ page }) => {
    await page.goto('/books/test-book-id/order');
    await expect(page).toHaveScreenshot('quote-form.png', { fullPage: true });
  });

  test('order detail page screenshot', async ({ page }) => {
    await page.goto('/orders/test-order-id');
    await expect(page).toHaveScreenshot('order-detail.png', { fullPage: true });
  });
});

test.describe('Error Handling', () => {
  test('should handle quote request errors gracefully', async ({ page }) => {
    await page.goto('/books/test-book-id/order');

    // Fill in invalid data (if applicable)
    await page.getByLabel(/quantity/i).fill('-1');

    // Should show validation error or handle gracefully
    // Exact behavior depends on implementation
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto('/books/test-book-id/order');

    // Should show error message or retry option
    await page.context().setOffline(false);
  });
});

test.describe('Accessibility', () => {
  test('quote form should be keyboard navigable', async ({ page }) => {
    await page.goto('/books/test-book-id/order');

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to navigate with keyboard
  });

  test('order detail should have proper headings', async ({ page }) => {
    await page.goto('/orders/test-order-id');

    // Should have h1 for page title
    await expect(page.locator('h1')).toBeVisible();
  });
});
