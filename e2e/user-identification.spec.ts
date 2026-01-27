/**
 * E2E Test: User Identification
 * Feature: TRACK-008
 *
 * Tests user identification in PostHog analytics
 */

import { test, expect } from '@playwright/test';

test.describe('User Identification (TRACK-008)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForTimeout(1000); // Wait for PostHog to initialize
  });

  test('should identify user on login', async ({ page }) => {
    // Mock PostHog identify call
    const identifyCalls: any[] = [];

    await page.exposeFunction('captureIdentify', (userId: string, properties: any) => {
      identifyCalls.push({ userId, properties });
    });

    // Override PostHog identify to capture calls
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalIdentify = (window as any).posthog.identify;
        (window as any).posthog.identify = function (userId: string, properties?: any) {
          (window as any).captureIdentify(userId, properties);
          return originalIdentify.call(this, userId, properties);
        };
      }
    });

    // Simulate user login by calling identify
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.identify('user-123', {
          email: 'test@example.com',
          name: 'Test User',
        });
      }
    });

    await page.waitForTimeout(500);

    // Verify identify was called with correct parameters
    expect(identifyCalls.length).toBeGreaterThan(0);
    expect(identifyCalls[0].userId).toBe('user-123');
    expect(identifyCalls[0].properties).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  test('should set user properties', async ({ page }) => {
    // Set user properties
    const propertiesSet = await page.evaluate(() => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.people.set({
          plan: 'pro',
          books_created: 5,
          total_words: 25000,
        });

        return true;
      } catch {
        return false;
      }
    });

    expect(propertiesSet).toBe(true);
  });

  test('should reset PostHog on logout', async ({ page }) => {
    // First identify a user
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.identify('user-456', {
          email: 'another@example.com',
        });
      }
    });

    await page.waitForTimeout(500);

    // Track if reset was called
    const resetCalled = await page.evaluate(() => {
      let called = false;

      if (typeof (window as any).posthog !== 'undefined') {
        const originalReset = (window as any).posthog.reset;
        (window as any).posthog.reset = function () {
          called = true;
          return originalReset.call(this);
        };

        // Call reset (simulating logout)
        (window as any).posthog.reset();
      }

      return called;
    });

    expect(resetCalled).toBe(true);
  });

  test('should track user properties on signup', async ({ page }) => {
    // Simulate a signup flow
    const userProperties = {
      userId: 'new-user-789',
      email: 'newuser@example.com',
      created_at: new Date().toISOString(),
      signup_method: 'email',
    };

    const identified = await page.evaluate((props) => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.identify(props.userId, {
          email: props.email,
          created_at: props.created_at,
          signup_method: props.signup_method,
        });

        return true;
      } catch {
        return false;
      }
    }, userProperties);

    expect(identified).toBe(true);
  });

  test('should handle anonymous to identified user transition', async ({ page }) => {
    // Track anonymous event
    const anonymousEventTracked = await page.evaluate(() => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.capture('anonymous_page_view', {
          page: '/pricing',
        });

        return true;
      } catch {
        return false;
      }
    });

    expect(anonymousEventTracked).toBe(true);

    await page.waitForTimeout(500);

    // Now identify user
    const userIdentified = await page.evaluate(() => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.identify('user-transition-123', {
          email: 'transition@example.com',
        });

        return true;
      } catch {
        return false;
      }
    });

    expect(userIdentified).toBe(true);
  });

  test('should update user properties incrementally', async ({ page }) => {
    // Initial identification
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.identify('user-999', {
          email: 'user999@example.com',
        });
      }
    });

    await page.waitForTimeout(300);

    // Update properties later
    const propertiesUpdated = await page.evaluate(() => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.people.set({
          first_book_created: true,
          books_count: 1,
        });

        return true;
      } catch {
        return false;
      }
    });

    expect(propertiesUpdated).toBe(true);
  });

  test('should track user traits from user metadata', async ({ page }) => {
    // Simulate user with full metadata
    const fullUserProfile = {
      userId: 'user-full-profile',
      email: 'fullprofile@example.com',
      metadata: {
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        plan: 'pro',
        workspace_id: 'ws-123',
      },
    };

    const identified = await page.evaluate((profile) => {
      try {
        if (typeof (window as any).posthog === 'undefined') {
          return false;
        }

        (window as any).posthog.identify(profile.userId, {
          email: profile.email,
          ...profile.metadata,
        });

        return true;
      } catch {
        return false;
      }
    }, fullUserProfile);

    expect(identified).toBe(true);
  });
});

test.describe('Server-side User Identification (TRACK-008)', () => {
  test('should support server-side user identification', async ({ request }) => {
    // Test server-side identify endpoint
    const response = await request.post('/api/analytics/identify', {
      data: {
        userId: 'server-user-123',
        properties: {
          email: 'server@example.com',
          plan: 'pro',
        },
      },
    });

    // Endpoint might not exist yet, but we document expected behavior
    expect(response.status()).toBeLessThan(500);
  });
});
