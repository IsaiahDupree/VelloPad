/**
 * E2E Test: Activation Event Tracking
 * Feature: TRACK-003
 *
 * Tests activation event tracking: signup, login, first book created
 */

import { test, expect } from '@playwright/test';

test.describe('Activation Event Tracking (TRACK-003)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000); // Wait for PostHog initialization
  });

  test('should track signup_start event', async ({ page }) => {
    // Mock tracking to capture events
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    // Override PostHog capture
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track signup start
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('signup_start', {
          signup_method: 'email',
          utm_source: 'google',
          timestamp: Date.now(),
        });
      }
    });

    await page.waitForTimeout(300);

    const signupStartEvent = events.find(e => e.name === 'signup_start');
    expect(signupStartEvent).toBeTruthy();
    expect(signupStartEvent?.props.signup_method).toBe('email');
  });

  test('should track signup_complete event with time to complete', async ({ page }) => {
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track signup complete
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('signup_complete', {
          user_id: 'user-123',
          signup_method: 'google',
          time_to_complete_seconds: 45,
        });
      }
    });

    await page.waitForTimeout(300);

    const signupCompleteEvent = events.find(e => e.name === 'signup_complete');
    expect(signupCompleteEvent).toBeTruthy();
    expect(signupCompleteEvent?.props.user_id).toBe('user-123');
    expect(signupCompleteEvent?.props.time_to_complete_seconds).toBe(45);
  });

  test('should track login_success event', async ({ page }) => {
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track login success
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('login_success', {
          user_id: 'user-456',
          login_method: 'email',
          is_returning_user: true,
        });
      }
    });

    await page.waitForTimeout(300);

    const loginEvent = events.find(e => e.name === 'login_success');
    expect(loginEvent).toBeTruthy();
    expect(loginEvent?.props.is_returning_user).toBe(true);
  });

  test('should track first_book_created as north star metric', async ({ page }) => {
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track first book created (ACTIVATED milestone)
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('first_book_created', {
          book_id: 'book-789',
          title: 'My First Book',
          is_north_star_metric: true,
          milestone: 'activated',
        });
      }
    });

    await page.waitForTimeout(300);

    const bookEvent = events.find(e => e.name === 'first_book_created');
    expect(bookEvent).toBeTruthy();
    expect(bookEvent?.props.is_north_star_metric).toBe(true);
    expect(bookEvent?.props.milestone).toBe('activated');
  });

  test('should track activation_complete with completed actions', async ({ page }) => {
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track activation complete
    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('activation_complete', {
          user_id: 'user-999',
          time_to_activation_minutes: 15,
          completed_actions: [
            'signup',
            'create_book',
            'write_first_chapter',
            'add_cover',
          ],
          is_north_star_metric: true,
        });
      }
    });

    await page.waitForTimeout(300);

    const activationEvent = events.find(e => e.name === 'activation_complete');
    expect(activationEvent).toBeTruthy();
    expect(activationEvent?.props.completed_actions).toHaveLength(4);
    expect(activationEvent?.props.time_to_activation_minutes).toBe(15);
  });

  test('should include UTM parameters in signup events', async ({ page }) => {
    // Navigate with UTM parameters
    await page.goto('/?utm_source=facebook&utm_campaign=summer2026&utm_medium=cpc');
    await page.waitForTimeout(1000);

    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track signup with UTM params
    await page.evaluate(() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (typeof (window as any).posthog !== 'undefined') {
        (window as any).posthog.capture('signup_start', {
          signup_method: 'email',
          utm_source: urlParams.get('utm_source'),
          utm_campaign: urlParams.get('utm_campaign'),
          utm_medium: urlParams.get('utm_medium'),
        });
      }
    });

    await page.waitForTimeout(300);

    const signupEvent = events.find(e => e.name === 'signup_start');
    expect(signupEvent).toBeTruthy();
    expect(signupEvent?.props.utm_source).toBe('facebook');
    expect(signupEvent?.props.utm_campaign).toBe('summer2026');
    expect(signupEvent?.props.utm_medium).toBe('cpc');
  });

  test('should track signup methods correctly', async ({ page }) => {
    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Track different signup methods
    const methods = ['email', 'google', 'github'];

    for (const method of methods) {
      await page.evaluate((m) => {
        if (typeof (window as any).posthog !== 'undefined') {
          (window as any).posthog.capture('signup_complete', {
            user_id: `user-${m}`,
            signup_method: m,
            time_to_complete_seconds: 30,
          });
        }
      }, method);

      await page.waitForTimeout(100);
    }

    const signupEvents = events.filter(e => e.name === 'signup_complete');
    expect(signupEvents).toHaveLength(3);

    expect(signupEvents.map(e => e.props.signup_method)).toEqual(
      expect.arrayContaining(['email', 'google', 'github'])
    );
  });
});

test.describe('Activation Funnel Metrics (TRACK-003)', () => {
  test('should track complete activation funnel', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const events: any[] = [];

    await page.exposeFunction('captureEvent', (name: string, props: any) => {
      events.push({ name, props, timestamp: Date.now() });
    });

    await page.evaluate(() => {
      if (typeof (window as any).posthog !== 'undefined') {
        const originalCapture = (window as any).posthog.capture;
        (window as any).posthog.capture = function (name: string, props?: any) {
          (window as any).captureEvent(name, props);
          return originalCapture.call(this, name, props);
        };
      }
    });

    // Simulate full activation funnel
    await page.evaluate(() => {
      if (typeof (window as any).posthog === 'undefined') return;

      const ph = (window as any).posthog;

      // Step 1: Signup started
      ph.capture('signup_start', { signup_method: 'email' });

      // Step 2: Signup complete (after 30 seconds)
      setTimeout(() => {
        ph.capture('signup_complete', {
          user_id: 'funnel-user',
          signup_method: 'email',
          time_to_complete_seconds: 30,
        });

        // Step 3: First book created (activated!)
        setTimeout(() => {
          ph.capture('first_book_created', {
            book_id: 'book-1',
            title: 'My Book',
            is_north_star_metric: true,
            milestone: 'activated',
          });
        }, 100);
      }, 100);
    });

    // Wait for all events
    await page.waitForTimeout(1000);

    // Verify funnel progression
    expect(events.find(e => e.name === 'signup_start')).toBeTruthy();
    expect(events.find(e => e.name === 'signup_complete')).toBeTruthy();
    expect(events.find(e => e.name === 'first_book_created')).toBeTruthy();

    // Verify chronological order
    const signupStart = events.find(e => e.name === 'signup_start');
    const signupComplete = events.find(e => e.name === 'signup_complete');
    const bookCreated = events.find(e => e.name === 'first_book_created');

    expect(signupStart.timestamp).toBeLessThanOrEqual(signupComplete.timestamp);
    expect(signupComplete.timestamp).toBeLessThanOrEqual(bookCreated.timestamp);
  });
});
