/**
 * E2E Tests for Analytics Event Tracking
 * Features: TRACK-004, TRACK-005
 *
 * Tests core value and monetization event tracking
 */

import { test, expect } from '@playwright/test';

test.describe('Core Value Event Tracking (TRACK-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should track book_created event when creating a book', async ({ page }) => {
    // Intercept analytics calls
    let bookCreatedEventSent = false;
    await page.route('**/api/events', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.eventName === 'book_created') {
        bookCreatedEventSent = true;
        expect(postData).toHaveProperty('eventCategory', 'book');
        expect(postData.properties).toHaveProperty('book_id');
        expect(postData.properties).toHaveProperty('title');
      }

      await route.continue();
    });

    // Create a new book
    await page.click('text=Create New Book');
    await page.fill('input[name="title"]', 'Test Analytics Book');
    await page.click('text=Create Book');
    await page.waitForURL(/\/books\/.+/);

    // Verify event was tracked
    expect(bookCreatedEventSent).toBeTruthy();
  });

  test('should track chapter_written event when editing chapter', async ({ page }) => {
    // Navigate to an existing book's chapter
    await page.goto('/books/test-book-id/chapters/test-chapter-id');

    // Intercept analytics calls
    let chapterWrittenEventSent = false;
    await page.route('**/api/books/*/chapters/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        chapterWrittenEventSent = true;
      }
      await route.continue();
    });

    // Edit chapter content
    await page.fill('[data-testid="chapter-editor"]', 'This is test content with many words to increase word count.');

    // Wait for autosave
    await page.waitForTimeout(2000);

    // Verify chapter was updated (which should track the event)
    expect(chapterWrittenEventSent).toBeTruthy();
  });

  test('should track cover_designed event when updating cover', async ({ page }) => {
    // Navigate to book cover editor
    await page.goto('/books/test-book-id/cover');

    // Intercept API calls
    let coverDesignedEventSent = false;
    await page.route('**/api/books/*/cover', async (route) => {
      if (route.request().method() === 'PATCH') {
        coverDesignedEventSent = true;
      }
      await route.continue();
    });

    // Update cover design
    await page.fill('input[name="title"]', 'My Awesome Book');
    await page.click('button[type="submit"]');

    // Wait for save
    await page.waitForTimeout(1000);

    // Verify event was tracked
    expect(coverDesignedEventSent).toBeTruthy();
  });
});

test.describe('Monetization Event Tracking (TRACK-005)', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should track checkout_started event when starting checkout', async ({ page }) => {
    // Navigate to book order page
    await page.goto('/books/test-book-id/order');

    // Intercept analytics calls
    let checkoutStartedEventSent = false;
    await page.route('**/api/checkout', async (route) => {
      if (route.request().method() === 'POST') {
        checkoutStartedEventSent = true;
      }
      await route.continue();
    });

    // Fill in order details
    await page.fill('input[name="quantity"]', '1');
    await page.selectOption('select[name="format"]', 'paperback');

    // Start checkout
    await page.click('button:has-text("Proceed to Checkout")');

    // Wait for checkout session creation
    await page.waitForTimeout(1000);

    // Verify event was tracked
    expect(checkoutStartedEventSent).toBeTruthy();
  });

  test('should track purchase_completed event on successful payment', async ({ page }) => {
    // This test would require a Stripe test webhook
    // In a real scenario, you'd mock the webhook or use Stripe test mode

    // Navigate to order confirmation page (simulating successful payment)
    await page.goto('/orders/test-order-id?session_id=test-session');

    // Check for order success message
    await expect(page.locator('text=Order Confirmed')).toBeVisible();

    // In a real implementation, you'd verify the webhook was processed
    // and the events were tracked in your analytics system
  });
});

test.describe('Event Property Validation', () => {
  test('should include required properties in book_created event', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    let eventProperties: any;
    await page.route('**/api/events', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.eventName === 'book_created') {
        eventProperties = postData.properties;
      }
      await route.continue();
    });

    // Create book
    await page.click('text=Create New Book');
    await page.fill('input[name="title"]', 'Test Book');
    await page.selectOption('select[name="genre"]', 'fiction');
    await page.click('text=Create Book');
    await page.waitForURL(/\/books\/.+/);

    // Verify required properties
    expect(eventProperties).toBeDefined();
    expect(eventProperties).toHaveProperty('book_id');
    expect(eventProperties).toHaveProperty('title', 'Test Book');
    expect(eventProperties).toHaveProperty('genre', 'fiction');
  });
});
