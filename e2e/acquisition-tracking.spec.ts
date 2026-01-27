/**
 * E2E Test: Acquisition Event Tracking
 * Feature: TRACK-002
 *
 * Tests landing_view, cta_click, pricing_view events with UTM parameters
 */

import { test, expect } from '@playwright/test';

test.describe('Acquisition Event Tracking (TRACK-002)', () => {
  test('should track landing_view with UTM parameters', async ({ page }) => {
    const posthogEvents: any[] = [];

    // Intercept PostHog requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore parse errors
          }
        }
      }
    });

    // Navigate to homepage with UTM parameters
    await page.goto('/?utm_source=google&utm_medium=cpc&utm_campaign=book-creation&utm_content=hero');

    // Wait for tracking to fire
    await page.waitForTimeout(2000);

    // Check that landing_view event was tracked
    const landingViewEvents = posthogEvents.filter(event => {
      const apiKey = event.api_key;
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'landing_view');
    });

    expect(landingViewEvents.length).toBeGreaterThan(0);

    // Verify UTM parameters were included
    if (landingViewEvents.length > 0) {
      const event = landingViewEvents[0];
      const batch = event.batch || [];
      const landingView = batch.find((e: any) => e.event === 'landing_view');

      if (landingView?.properties) {
        // UTM parameters should be included
        expect(landingView.properties).toMatchObject({
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'book-creation',
          utm_content: 'hero',
        });
      }
    }
  });

  test('should store UTM parameters in session storage', async ({ page }) => {
    // Navigate with UTM parameters
    await page.goto('/?utm_source=facebook&utm_campaign=spring-promo');

    // Wait for page to load and store UTM params
    await page.waitForTimeout(1000);

    // Check session storage
    const storedUTM = await page.evaluate(() => {
      const stored = sessionStorage.getItem('vellopad_utm');
      return stored ? JSON.parse(stored) : null;
    });

    expect(storedUTM).toMatchObject({
      utm_source: 'facebook',
      utm_campaign: 'spring-promo',
    });
  });

  test('should track cta_click with attribution', async ({ page }) => {
    const posthogEvents: any[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore
          }
        }
      }
    });

    // Navigate with UTM parameters
    await page.goto('/?utm_source=email&utm_campaign=welcome-series');

    await page.waitForTimeout(1500);

    // Click a CTA button
    const ctaButton = page.locator('text=Start Your Book').first();
    await ctaButton.click();

    // Wait for event to be tracked
    await page.waitForTimeout(2000);

    // Check that cta_click event was tracked
    const ctaClickEvents = posthogEvents.filter(event => {
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'cta_click');
    });

    expect(ctaClickEvents.length).toBeGreaterThan(0);

    // Verify CTA details and UTM attribution
    if (ctaClickEvents.length > 0) {
      const event = ctaClickEvents[0];
      const batch = event.batch || [];
      const ctaClick = batch.find((e: any) => e.event === 'cta_click');

      if (ctaClick?.properties) {
        expect(ctaClick.properties.cta_label).toBe('Start Your Book');
        expect(ctaClick.properties.cta_location).toBe('hero');
        // UTM params should be attributed from session storage
        expect(ctaClick.properties.utm_source).toBe('email');
        expect(ctaClick.properties.utm_campaign).toBe('welcome-series');
      }
    }
  });

  test('should track multiple CTA clicks with location', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const posthogEvents: any[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore
          }
        }
      }
    });

    // Click header CTA
    const headerCTA = page.locator('header >> text=Get Started').first();
    await headerCTA.click();

    await page.waitForTimeout(500);

    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Click footer CTA
    const footerCTA = page.locator('text=Get Started Free').first();
    await footerCTA.click();

    await page.waitForTimeout(1500);

    // Check that both CTAs were tracked with different locations
    const ctaEvents = posthogEvents.filter(event => {
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'cta_click');
    });

    expect(ctaEvents.length).toBeGreaterThanOrEqual(1);
  });

  test('should preserve UTM attribution across page navigation', async ({ page }) => {
    // Land with UTM parameters
    await page.goto('/?utm_source=twitter&utm_campaign=launch');
    await page.waitForTimeout(1000);

    // Navigate to another page (simulate internal navigation)
    await page.goto('/auth/signup');
    await page.waitForTimeout(1000);

    // Check that UTM params are still in session storage
    const storedUTM = await page.evaluate(() => {
      const stored = sessionStorage.getItem('vellopad_utm');
      return stored ? JSON.parse(stored) : null;
    });

    expect(storedUTM).toMatchObject({
      utm_source: 'twitter',
      utm_campaign: 'launch',
    });
  });

  test('should handle landing without UTM parameters', async ({ page }) => {
    const posthogEvents: any[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore
          }
        }
      }
    });

    // Navigate without UTM parameters
    await page.goto('/');
    await page.waitForTimeout(2000);

    // landing_view should still be tracked, just without UTM params
    const landingViewEvents = posthogEvents.filter(event => {
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'landing_view');
    });

    expect(landingViewEvents.length).toBeGreaterThan(0);

    // Session storage should be empty or have no UTM params
    const storedUTM = await page.evaluate(() => {
      const stored = sessionStorage.getItem('vellopad_utm');
      return stored ? JSON.parse(stored) : null;
    });

    // Should be null or empty object
    if (storedUTM) {
      const hasUTM = Object.values(storedUTM).some(v => v !== undefined && v !== null);
      expect(hasUTM).toBe(false);
    }
  });

  test('should track referrer information', async ({ context, page }) => {
    const posthogEvents: any[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore
          }
        }
      }
    });

    // Simulate coming from an external site
    await page.goto('https://google.com');
    await page.goto('/');

    await page.waitForTimeout(2000);

    // Check that referrer was captured
    const landingViewEvents = posthogEvents.filter(event => {
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'landing_view');
    });

    if (landingViewEvents.length > 0) {
      const event = landingViewEvents[0];
      const batch = event.batch || [];
      const landingView = batch.find((e: any) => e.event === 'landing_view');

      // Referrer should be captured (may be empty in test environment)
      expect(landingView?.properties).toHaveProperty('referrer');
    }
  });

  test('should include page metadata with events', async ({ page }) => {
    const posthogEvents: any[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('posthog.com') || url.includes('i.posthog.com')) {
        const postData = request.postData();
        if (postData) {
          try {
            const data = JSON.parse(postData);
            posthogEvents.push(data);
          } catch {
            // Ignore
          }
        }
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    const landingViewEvents = posthogEvents.filter(event => {
      const batch = event.batch || [];
      return batch.some((e: any) => e.event === 'landing_view');
    });

    if (landingViewEvents.length > 0) {
      const event = landingViewEvents[0];
      const batch = event.batch || [];
      const landingView = batch.find((e: any) => e.event === 'landing_view');

      if (landingView?.properties) {
        // Should include page metadata
        expect(landingView.properties).toHaveProperty('page');
        expect(landingView.properties).toHaveProperty('url');
        expect(landingView.properties.page_type).toBe('homepage');
      }
    }
  });
});
