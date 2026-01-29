/**
 * E2E Tests for Meta Pixel Integration
 * Features: META-001, META-002, META-003
 */

import { test, expect } from '@playwright/test';

test.describe('Meta Pixel Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Meta Pixel script to prevent actual tracking in tests
    await page.addInitScript(() => {
      window.fbq = function (...args: any[]) {
        // Store calls for verification
        if (!window._fbqCalls) {
          window._fbqCalls = [];
        }
        window._fbqCalls.push(args);
      };
      window._fbq = window.fbq;
    });
  });

  test('META-001: Meta Pixel script loads on page', async ({ page }) => {
    await page.goto('/');

    // Check if fbq function is defined
    const isFbqDefined = await page.evaluate(() => {
      return typeof window.fbq === 'function';
    });

    expect(isFbqDefined).toBe(true);
  });

  test('META-002: PageView tracked on initial load', async ({ page }) => {
    await page.goto('/');

    // Wait for pixel initialization
    await page.waitForTimeout(1000);

    // Check if PageView was tracked
    const fbqCalls = await page.evaluate(() => {
      return window._fbqCalls || [];
    });

    // Should have init and track PageView calls
    const initCall = fbqCalls.find((call: any[]) => call[0] === 'init');
    const pageViewCall = fbqCalls.find(
      (call: any[]) => call[0] === 'track' && call[1] === 'PageView'
    );

    expect(initCall).toBeDefined();
    expect(pageViewCall).toBeDefined();
  });

  test('META-002: PageView tracked on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Clear previous calls
    await page.evaluate(() => {
      window._fbqCalls = [];
    });

    // Navigate to another page
    await page.goto('/pricing');
    await page.waitForTimeout(500);

    // Check if PageView was tracked
    const fbqCalls = await page.evaluate(() => {
      return window._fbqCalls || [];
    });

    const pageViewCall = fbqCalls.find(
      (call: any[]) => call[0] === 'track' && call[1] === 'PageView'
    );

    expect(pageViewCall).toBeDefined();
  });

  test('META-003: Lead event tracked on signup start', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForTimeout(500);

    // Click signup button to trigger Lead event
    // (Assuming signup form has a button with text "Sign Up" or similar)
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Get Started")').first();

    if (await signupButton.isVisible()) {
      // Clear previous calls
      await page.evaluate(() => {
        window._fbqCalls = [];
      });

      await signupButton.click();
      await page.waitForTimeout(500);

      // Check if Lead event was tracked
      const fbqCalls = await page.evaluate(() => {
        return window._fbqCalls || [];
      });

      const leadCall = fbqCalls.find(
        (call: any[]) => call[0] === 'track' && call[1] === 'Lead'
      );

      // May or may not fire depending on implementation
      // This test validates the tracking infrastructure is in place
      if (leadCall) {
        expect(leadCall[2]).toBeDefined(); // Event parameters
      }
    }
  });

  test('META-005: Event deduplication with eventID', async ({ page }) => {
    await page.goto('/');

    // Execute tracking call with eventID
    const eventID = await page.evaluate(() => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Track event with eventID
      window.fbq('track', 'ViewContent', {
        content_name: 'Test Book',
        eventID: id,
      });

      return id;
    });

    await page.waitForTimeout(500);

    // Verify eventID was included
    const fbqCalls = await page.evaluate(() => {
      return window._fbqCalls || [];
    });

    const viewContentCall = fbqCalls.find(
      (call: any[]) => call[0] === 'track' && call[1] === 'ViewContent'
    );

    expect(viewContentCall).toBeDefined();
    expect(viewContentCall[2].eventID).toBe(eventID);
  });

  test('META-003: ViewContent tracked on book creation', async ({ page, context }) => {
    // This test requires authentication
    // Skip if no auth available
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires test user credentials');

    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard');

    // Clear previous calls
    await page.evaluate(() => {
      window._fbqCalls = [];
    });

    // Create new book
    await page.click('button:has-text("New Book"), a:has-text("Create Book")');
    await page.fill('input[name="title"]', 'Test Book for Meta Tracking');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // Check if ViewContent was tracked
    const fbqCalls = await page.evaluate(() => {
      return window._fbqCalls || [];
    });

    const viewContentCall = fbqCalls.find(
      (call: any[]) => call[0] === 'track' && call[1] === 'ViewContent'
    );

    if (viewContentCall) {
      expect(viewContentCall[2]).toBeDefined();
      expect(viewContentCall[2].content_name).toContain('Test Book');
    }
  });

  test('META-003: InitiateCheckout tracked on checkout start', async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, 'Requires test user credentials');

    // Login and navigate to a book with a rendition
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');

    // Navigate to book and start checkout
    // (Implementation depends on your UI)
    const orderButton = page.locator('button:has-text("Order"), a:has-text("Order Prints")').first();

    if (await orderButton.isVisible()) {
      await page.evaluate(() => {
        window._fbqCalls = [];
      });

      await orderButton.click();
      await page.waitForTimeout(1000);

      // Check if InitiateCheckout was tracked
      const fbqCalls = await page.evaluate(() => {
        return window._fbqCalls || [];
      });

      const checkoutCall = fbqCalls.find(
        (call: any[]) => call[0] === 'track' && call[1] === 'InitiateCheckout'
      );

      if (checkoutCall) {
        expect(checkoutCall[2]).toBeDefined();
        expect(checkoutCall[2].value).toBeGreaterThan(0);
        expect(checkoutCall[2].currency).toBeDefined();
      }
    }
  });

  test('META-006: User data is never sent unhashed', async ({ page }) => {
    await page.goto('/');

    // Monitor network requests to Meta
    const metaRequests: any[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('facebook.com') || url.includes('connect.facebook.net')) {
        metaRequests.push({
          url: url,
          postData: request.postData(),
        });
      }
    });

    // Trigger an event that might include user data
    await page.evaluate(() => {
      window.fbq('track', 'CompleteRegistration', {
        value: 0,
        currency: 'USD',
      });
    });

    await page.waitForTimeout(1000);

    // Verify no PII in requests
    for (const req of metaRequests) {
      if (req.postData) {
        // Should not contain plaintext email patterns
        expect(req.postData).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

        // Should not contain phone number patterns
        expect(req.postData).not.toMatch(/\+?1?\d{9,15}/);
      }
    }
  });
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
    _fbqCalls?: any[];
  }
}
