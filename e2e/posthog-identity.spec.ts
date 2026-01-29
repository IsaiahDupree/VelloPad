/**
 * E2E Tests for PostHog Identity Stitching (GDP-009)
 *
 * Tests that user identity is properly stitched between:
 * - VelloPad person records
 * - Supabase auth users
 * - PostHog distinct_id
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('PostHog Identity Stitching (GDP-009)', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEmail: string;
  let testUserId: string;

  test.beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test.beforeEach(() => {
    // Generate unique test email
    testEmail = `test-${Date.now()}@example.com`;
  });

  test.afterEach(async () => {
    // Cleanup test user
    if (testUserId) {
      try {
        // Delete from person table (cascade will delete identity_links)
        await supabase.from('person').delete().eq('email', testEmail);

        // Delete auth user
        await supabase.auth.admin.deleteUser(testUserId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  });

  test('should create person record on signup', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup');

    // Fill signup form (adjust selectors based on your actual form)
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (indicates successful signup)
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify person record was created
    const { data: person, error: personError } = await supabase
      .from('person')
      .select('id, email, lifecycle_stage')
      .eq('email', testEmail)
      .single();

    expect(personError).toBeNull();
    expect(person).toBeDefined();
    expect(person?.email).toBe(testEmail);
    expect(person?.lifecycle_stage).toBe('lead');

    testUserId = person?.id!;
  });

  test('should link auth user to person via identity_link', async ({ page }) => {
    // Create test user via API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    expect(authError).toBeNull();
    testUserId = authData.user!.id;

    // Sign in
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for auth callback to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Give the identity stitching a moment to complete
    await page.waitForTimeout(1000);

    // Verify person record exists
    const { data: person } = await supabase
      .from('person')
      .select('id')
      .eq('email', testEmail)
      .single();

    expect(person).toBeDefined();

    // Verify auth identity link exists
    const { data: authLink, error: authLinkError } = await supabase
      .from('identity_link')
      .select('*')
      .eq('person_id', person!.id)
      .eq('platform', 'auth')
      .eq('external_id', testUserId)
      .single();

    expect(authLinkError).toBeNull();
    expect(authLink).toBeDefined();
    expect(authLink?.platform).toBe('auth');
  });

  test('should link PostHog distinct_id to person', async ({ page }) => {
    // Create test user via API
    const { data: authData } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    // Sign in
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for auth callback to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Give identity stitching time to complete
    await page.waitForTimeout(1000);

    // Verify person record exists
    const { data: person } = await supabase
      .from('person')
      .select('id')
      .eq('email', testEmail)
      .single();

    expect(person).toBeDefined();

    // Verify PostHog identity link exists
    const { data: posthogLink, error: posthogLinkError } = await supabase
      .from('identity_link')
      .select('*')
      .eq('person_id', person!.id)
      .eq('platform', 'posthog')
      .single();

    expect(posthogLinkError).toBeNull();
    expect(posthogLink).toBeDefined();
    expect(posthogLink?.platform).toBe('posthog');
    expect(posthogLink?.external_id).toBeDefined();

    // The distinct_id should be the person_id for consistency
    expect(posthogLink?.external_id).toBe(person!.id);
  });

  test('should update last_seen_at on subsequent logins', async ({ page }) => {
    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    // First login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get person record and first last_seen_at
    const { data: person1 } = await supabase
      .from('person')
      .select('id, last_seen_at')
      .eq('email', testEmail)
      .single();

    expect(person1).toBeDefined();
    const firstSeenAt = new Date(person1!.last_seen_at);

    // Wait a bit
    await page.waitForTimeout(2000);

    // Logout
    await page.goto('/auth/logout');

    // Second login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get updated person record
    const { data: person2 } = await supabase
      .from('person')
      .select('last_seen_at')
      .eq('email', testEmail)
      .single();

    expect(person2).toBeDefined();
    const secondSeenAt = new Date(person2!.last_seen_at);

    // Verify last_seen_at was updated
    expect(secondSeenAt.getTime()).toBeGreaterThan(firstSeenAt.getTime());
  });

  test('should handle multiple identity platforms for same person', async ({ page }) => {
    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    // Login to trigger identity stitching
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get person
    const { data: person } = await supabase
      .from('person')
      .select('id')
      .eq('email', testEmail)
      .single();

    expect(person).toBeDefined();

    // Verify multiple identity links exist for the same person
    const { data: identityLinks, error: linksError } = await supabase
      .from('identity_link')
      .select('platform, external_id')
      .eq('person_id', person!.id);

    expect(linksError).toBeNull();
    expect(identityLinks).toBeDefined();
    expect(identityLinks!.length).toBeGreaterThanOrEqual(2);

    // Should have at least auth and posthog
    const platforms = identityLinks!.map((link) => link.platform);
    expect(platforms).toContain('auth');
    expect(platforms).toContain('posthog');
  });

  test('should bidirectionally resolve person_id and distinct_id', async ({ page }) => {
    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Get person
    const { data: person } = await supabase
      .from('person')
      .select('id')
      .eq('email', testEmail)
      .single();

    expect(person).toBeDefined();
    const personId = person!.id;

    // Get PostHog link
    const { data: posthogLink } = await supabase
      .from('identity_link')
      .select('external_id')
      .eq('person_id', personId)
      .eq('platform', 'posthog')
      .single();

    expect(posthogLink).toBeDefined();
    const distinctId = posthogLink!.external_id;

    // Test forward lookup: person_id -> distinct_id
    const { data: forwardLookup } = await supabase
      .from('identity_link')
      .select('external_id')
      .eq('person_id', personId)
      .eq('platform', 'posthog')
      .single();

    expect(forwardLookup?.external_id).toBe(distinctId);

    // Test reverse lookup: distinct_id -> person_id
    const { data: reverseLookup } = await supabase
      .from('identity_link')
      .select('person_id')
      .eq('platform', 'posthog')
      .eq('external_id', distinctId)
      .single();

    expect(reverseLookup?.person_id).toBe(personId);
  });
});
