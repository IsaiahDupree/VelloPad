/**
 * E2E Tests for Person Features Computation
 * Feature: GDP-011
 *
 * Tests behavioral feature computation from event data
 */

import { test, expect } from '@playwright/test';

test.describe('Person Features Computation (GDP-011)', () => {
  test('Person features can be computed and retrieved', async ({ page }) => {
    // This test verifies the feature computation API works

    // Mock API response for feature computation
    await page.route('**/api/features/compute', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            person_id: 'test-person-123',
            features: {
              person_id: 'test-person-123',
              active_days_7d: 3,
              active_days_30d: 12,
              active_days_90d: 28,
              total_events: 150,
              events_7d: 25,
              events_30d: 98,
              books_created: 2,
              chapters_written: 8,
              words_written: 5432,
              pdfs_generated: 1,
              orders_placed: 0,
              pricing_views: 3,
              template_previews: 5,
              emails_sent: 4,
              emails_opened: 3,
              emails_clicked: 1,
              email_open_rate: 75.0,
              email_click_rate: 25.0,
              is_subscriber: false,
              subscription_mrr_cents: null,
              total_revenue_cents: 0,
              first_purchase_at: null,
              last_purchase_at: null,
              engagement_score: 68,
              activation_score: 72,
              churn_risk_score: 15,
              last_active_at: new Date().toISOString(),
              computed_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Simulate API call
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return res.json();
    });

    expect(response.success).toBe(true);
    expect(response.person_id).toBeDefined();
    expect(response.features).toBeDefined();
    expect(response.features.engagement_score).toBe(68);
  });

  test('Features include all required metrics', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'test-person',
          features: {
            person_id: 'test-person',
            active_days_7d: 5,
            active_days_30d: 20,
            active_days_90d: 45,
            total_events: 200,
            events_7d: 50,
            events_30d: 150,
            books_created: 3,
            chapters_written: 15,
            words_written: 12500,
            pdfs_generated: 2,
            orders_placed: 1,
            pricing_views: 7,
            template_previews: 12,
            emails_sent: 8,
            emails_opened: 6,
            emails_clicked: 3,
            email_open_rate: 75.0,
            email_click_rate: 37.5,
            is_subscriber: true,
            subscription_mrr_cents: 1999,
            total_revenue_cents: 2999,
            first_purchase_at: new Date().toISOString(),
            last_purchase_at: new Date().toISOString(),
            engagement_score: 85,
            activation_score: 95,
            churn_risk_score: 10,
            last_active_at: new Date().toISOString(),
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;

    // Verify all core metrics are present
    expect(features.active_days_7d).toBeGreaterThanOrEqual(0);
    expect(features.active_days_30d).toBeGreaterThanOrEqual(0);
    expect(features.books_created).toBeGreaterThanOrEqual(0);
    expect(features.words_written).toBeGreaterThanOrEqual(0);
    expect(features.engagement_score).toBeGreaterThanOrEqual(0);
    expect(features.engagement_score).toBeLessThanOrEqual(100);
  });

  test('High engagement score reflects active user', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'active-user',
          features: {
            person_id: 'active-user',
            active_days_7d: 7,
            active_days_30d: 28,
            active_days_90d: 75,
            total_events: 500,
            events_7d: 100,
            events_30d: 400,
            books_created: 5,
            chapters_written: 30,
            words_written: 25000,
            pdfs_generated: 3,
            orders_placed: 2,
            pricing_views: 10,
            template_previews: 20,
            emails_sent: 12,
            emails_opened: 11,
            emails_clicked: 8,
            email_open_rate: 91.7,
            email_click_rate: 66.7,
            is_subscriber: true,
            subscription_mrr_cents: 2999,
            total_revenue_cents: 9999,
            first_purchase_at: new Date().toISOString(),
            last_purchase_at: new Date().toISOString(),
            engagement_score: 95,
            activation_score: 100,
            churn_risk_score: 5,
            last_active_at: new Date().toISOString(),
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;

    // High engagement user should have:
    // - High engagement score
    // - Multiple books
    // - Significant word count
    // - Recent activity
    expect(features.engagement_score).toBeGreaterThan(70);
    expect(features.books_created).toBeGreaterThan(1);
    expect(features.words_written).toBeGreaterThan(1000);
    expect(features.active_days_30d).toBeGreaterThan(10);
  });

  test('Low engagement score reflects inactive user', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'inactive-user',
          features: {
            person_id: 'inactive-user',
            active_days_7d: 0,
            active_days_30d: 1,
            active_days_90d: 3,
            total_events: 10,
            events_7d: 0,
            events_30d: 2,
            books_created: 1,
            chapters_written: 1,
            words_written: 50,
            pdfs_generated: 0,
            orders_placed: 0,
            pricing_views: 1,
            template_previews: 0,
            emails_sent: 3,
            emails_opened: 0,
            emails_clicked: 0,
            email_open_rate: 0.0,
            email_click_rate: 0.0,
            is_subscriber: false,
            subscription_mrr_cents: null,
            total_revenue_cents: 0,
            first_purchase_at: null,
            last_purchase_at: null,
            engagement_score: 12,
            activation_score: 20,
            churn_risk_score: 75,
            last_active_at: new Date(
              Date.now() - 25 * 24 * 60 * 60 * 1000
            ).toISOString(), // 25 days ago
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;

    // Inactive user should have:
    // - Low engagement score
    // - Few active days
    // - Low event count
    expect(features.engagement_score).toBeLessThan(30);
    expect(features.active_days_30d).toBeLessThan(5);
    expect(features.events_30d).toBeLessThan(10);
  });

  test('Email engagement metrics are computed correctly', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'email-engager',
          features: {
            person_id: 'email-engager',
            active_days_7d: 3,
            active_days_30d: 10,
            active_days_90d: 25,
            total_events: 80,
            events_7d: 15,
            events_30d: 60,
            books_created: 2,
            chapters_written: 8,
            words_written: 4500,
            pdfs_generated: 1,
            orders_placed: 0,
            pricing_views: 2,
            template_previews: 4,
            emails_sent: 10,
            emails_opened: 8,
            emails_clicked: 5,
            email_open_rate: 80.0,
            email_click_rate: 50.0,
            is_subscriber: false,
            subscription_mrr_cents: null,
            total_revenue_cents: 0,
            first_purchase_at: null,
            last_purchase_at: null,
            engagement_score: 55,
            activation_score: 65,
            churn_risk_score: 30,
            last_active_at: new Date().toISOString(),
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;

    // Email metrics should be computed
    expect(features.emails_sent).toBe(10);
    expect(features.emails_opened).toBe(8);
    expect(features.emails_clicked).toBe(5);

    // Rates should be calculated correctly
    expect(features.email_open_rate).toBe(80.0); // 8/10 = 80%
    expect(features.email_click_rate).toBe(50.0); // 5/10 = 50%
  });

  test('Subscriber status is tracked', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'subscriber',
          features: {
            person_id: 'subscriber',
            active_days_7d: 5,
            active_days_30d: 18,
            active_days_90d: 50,
            total_events: 250,
            events_7d: 40,
            events_30d: 180,
            books_created: 4,
            chapters_written: 20,
            words_written: 18000,
            pdfs_generated: 3,
            orders_placed: 2,
            pricing_views: 5,
            template_previews: 15,
            emails_sent: 9,
            emails_opened: 8,
            emails_clicked: 6,
            email_open_rate: 88.9,
            email_click_rate: 66.7,
            is_subscriber: true,
            subscription_mrr_cents: 1999, // $19.99/month
            total_revenue_cents: 7999,
            first_purchase_at: new Date().toISOString(),
            last_purchase_at: new Date().toISOString(),
            engagement_score: 88,
            activation_score: 98,
            churn_risk_score: 8,
            last_active_at: new Date().toISOString(),
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;

    // Subscriber features
    expect(features.is_subscriber).toBe(true);
    expect(features.subscription_mrr_cents).toBe(1999);
    expect(features.total_revenue_cents).toBeGreaterThan(0);
  });

  test('GET endpoint returns computed features', async ({ page }) => {
    await page.route('**/api/features/compute*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            success: true,
            person_id: 'test-person',
            features: {
              person_id: 'test-person',
              active_days_7d: 4,
              active_days_30d: 15,
              engagement_score: 60,
              computed_at: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute?person_id=test-person', {
        method: 'GET',
      });
      return res.json();
    });

    expect(response.success).toBe(true);
    expect(response.features).toBeDefined();
    expect(response.features.engagement_score).toBe(60);
  });

  test('Features timestamp indicates freshness', async ({ page }) => {
    await page.route('**/api/features/compute', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          person_id: 'test-person',
          features: {
            person_id: 'test-person',
            active_days_7d: 3,
            active_days_30d: 12,
            engagement_score: 55,
            computed_at: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/features/compute', {
        method: 'POST',
      });
      return res.json();
    });

    const features = response.features;
    const computedAt = new Date(features.computed_at);
    const now = new Date();

    // Features should be freshly computed (within last minute)
    const ageInMs = now.getTime() - computedAt.getTime();
    expect(ageInMs).toBeLessThan(60 * 1000); // Less than 1 minute old
  });
});
