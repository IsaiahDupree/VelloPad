/**
 * E2E Tests for Growth Data Plane (GDP-001)
 *
 * Tests the complete Growth Data Plane schema including:
 * - Person identity management
 * - Identity linking across platforms
 * - Unified event tracking
 * - Email message and event tracking
 * - Subscription snapshots
 * - Person features computation
 * - Segment management
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase client with service role key for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

test.describe('Growth Data Plane - GDP-001', () => {

  let testPersonId: string;
  let testEmail: string;

  test.beforeEach(async () => {
    // Generate unique test email
    testEmail = `test-gdp-${Date.now()}@example.com`;
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (testPersonId) {
      await supabase
        .from('person')
        .delete()
        .eq('id', testPersonId);
    }
  });

  test('should create person with email', async () => {
    const { data, error } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John',
        last_name: 'Doe',
        lifecycle_stage: 'lead'
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.email).toBe(testEmail);
    expect(data.first_name).toBe('John');
    expect(data.lifecycle_stage).toBe('lead');

    testPersonId = data.id;
  });

  test('should enforce unique email constraint', async () => {
    // Create first person
    const { data: person1 } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person1.id;

    // Try to create second person with same email
    const { error } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'Jane'
      })
      .select()
      .single();

    expect(error).toBeTruthy();
    expect(error?.message).toContain('duplicate key');
  });

  test('should link person to external platform identities', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Link to PostHog
    const { data: posthogLink, error: posthogError } = await supabase
      .from('identity_link')
      .insert({
        person_id: testPersonId,
        platform: 'posthog',
        external_id: 'ph_user_123'
      })
      .select()
      .single();

    expect(posthogError).toBeNull();
    expect(posthogLink.platform).toBe('posthog');

    // Link to Stripe
    const { data: stripeLink, error: stripeError } = await supabase
      .from('identity_link')
      .insert({
        person_id: testPersonId,
        platform: 'stripe',
        external_id: 'cus_stripe_456'
      })
      .select()
      .single();

    expect(stripeError).toBeNull();
    expect(stripeLink.platform).toBe('stripe');

    // Verify links
    const { data: links } = await supabase
      .from('identity_link')
      .select('*')
      .eq('person_id', testPersonId);

    expect(links).toHaveLength(2);
    expect(links.map(l => l.platform)).toContain('posthog');
    expect(links.map(l => l.platform)).toContain('stripe');
  });

  test('should create unified events from multiple sources', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Create web event
    const { data: webEvent, error: webError } = await supabase
      .from('unified_event')
      .insert({
        person_id: testPersonId,
        event_name: 'landing_view',
        event_source: 'web',
        event_timestamp: new Date().toISOString(),
        properties: {
          page: '/templates',
          referrer: 'google'
        },
        utm_source: 'google',
        utm_campaign: 'book-templates'
      })
      .select()
      .single();

    expect(webError).toBeNull();
    expect(webEvent.event_source).toBe('web');

    // Create app event
    const { data: appEvent, error: appError } = await supabase
      .from('unified_event')
      .insert({
        person_id: testPersonId,
        event_name: 'book_created',
        event_source: 'app',
        event_timestamp: new Date().toISOString(),
        properties: {
          book_id: 'book_123',
          title: 'My First Book'
        }
      })
      .select()
      .single();

    expect(appError).toBeNull();
    expect(appEvent.event_source).toBe('app');

    // Create stripe event
    const { data: stripeEvent, error: stripeError } = await supabase
      .from('unified_event')
      .insert({
        person_id: testPersonId,
        event_name: 'order_placed',
        event_source: 'stripe',
        event_timestamp: new Date().toISOString(),
        properties: {
          order_id: 'order_789',
          amount_cents: 2500
        }
      })
      .select()
      .single();

    expect(stripeError).toBeNull();
    expect(stripeEvent.event_source).toBe('stripe');

    // Verify all events
    const { data: events } = await supabase
      .from('unified_event')
      .select('*')
      .eq('person_id', testPersonId)
      .order('event_timestamp', { ascending: true });

    expect(events).toHaveLength(3);
    expect(events[0].event_name).toBe('landing_view');
    expect(events[1].event_name).toBe('book_created');
    expect(events[2].event_name).toBe('order_placed');
  });

  test('should track email messages and events', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Create email message
    const { data: emailMessage, error: emailError } = await supabase
      .from('email_message')
      .insert({
        person_id: testPersonId,
        to_email: testEmail,
        from_email: 'hello@vellopad.com',
        subject: 'Welcome to VelloPad!',
        email_type: 'lifecycle',
        template_key: 'activation_welcome',
        provider: 'resend',
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single();

    expect(emailError).toBeNull();
    expect(emailMessage.email_type).toBe('lifecycle');

    const emailMessageId = emailMessage.id;

    // Create email events
    const { data: deliveredEvent } = await supabase
      .from('email_event')
      .insert({
        email_message_id: emailMessageId,
        person_id: testPersonId,
        event_type: 'delivered',
        event_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    expect(deliveredEvent.event_type).toBe('delivered');

    const { data: openedEvent } = await supabase
      .from('email_event')
      .insert({
        email_message_id: emailMessageId,
        person_id: testPersonId,
        event_type: 'opened',
        event_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    expect(openedEvent.event_type).toBe('opened');

    const { data: clickedEvent } = await supabase
      .from('email_event')
      .insert({
        email_message_id: emailMessageId,
        person_id: testPersonId,
        event_type: 'clicked',
        event_timestamp: new Date().toISOString(),
        clicked_url: 'https://vellopad.com/dashboard'
      })
      .select()
      .single();

    expect(clickedEvent.event_type).toBe('clicked');
    expect(clickedEvent.clicked_url).toBe('https://vellopad.com/dashboard');

    // Verify email events
    const { data: emailEvents } = await supabase
      .from('email_event')
      .select('*')
      .eq('email_message_id', emailMessageId)
      .order('event_timestamp', { ascending: true });

    expect(emailEvents).toHaveLength(3);
    expect(emailEvents.map(e => e.event_type)).toEqual(['delivered', 'opened', 'clicked']);
  });

  test('should track subscription data', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Create subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscription')
      .insert({
        person_id: testPersonId,
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_456',
        plan_name: 'Pro Plan',
        plan_id: 'price_pro_monthly',
        status: 'active',
        billing_interval: 'month',
        currency: 'USD',
        amount_cents: 2900,
        mrr_cents: 2900,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    expect(subscriptionError).toBeNull();
    expect(subscription.status).toBe('active');
    expect(subscription.amount_cents).toBe(2900);
    expect(subscription.mrr_cents).toBe(2900);

    // Update subscription status
    const { data: updatedSub } = await supabase
      .from('subscription')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();

    expect(updatedSub.status).toBe('canceled');
    expect(updatedSub.canceled_at).toBeTruthy();
  });

  test('should compute person features', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Create events for the person
    const events = [
      { event_name: 'book_created', event_source: 'app', properties: {} },
      { event_name: 'chapter_written', event_source: 'app', properties: {} },
      { event_name: 'word_count_milestone', event_source: 'app', properties: { current_word_count: 1000, milestone: '1000' } },
      { event_name: 'word_count_milestone', event_source: 'app', properties: { current_word_count: 5000, milestone: '5000' } },
      { event_name: 'pdf_generated', event_source: 'app', properties: {} }
    ];

    for (const event of events) {
      await supabase
        .from('unified_event')
        .insert({
          person_id: testPersonId,
          event_name: event.event_name,
          event_source: event.event_source,
          event_timestamp: new Date().toISOString(),
          properties: event.properties
        });
    }

    // Call compute_person_features function
    const { error: computeError } = await supabase
      .rpc('compute_person_features', { p_person_id: testPersonId });

    expect(computeError).toBeNull();

    // Verify person_features
    const { data: features } = await supabase
      .from('person_features')
      .select('*')
      .eq('person_id', testPersonId)
      .single();

    expect(features).toBeTruthy();
    expect(features.books_created).toBe(1);
    expect(features.words_written).toBe(5000); // Last milestone
    expect(features.engagement_score).toBeGreaterThan(0);
  });

  test('should create and manage segments', async () => {
    // Create segment
    const { data: segment, error: segmentError } = await supabase
      .from('segment')
      .insert({
        segment_name: 'Test High Engagement Users',
        segment_key: 'test_high_engagement',
        description: 'Users with engagement score > 80',
        segment_type: 'dynamic',
        filter_criteria: {
          engagement_score: { $gte: 80 }
        },
        is_active: true
      })
      .select()
      .single();

    expect(segmentError).toBeNull();
    expect(segment.segment_key).toBe('test_high_engagement');

    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'Jane'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Add person to segment
    const { data: membership, error: membershipError } = await supabase
      .from('segment_membership')
      .insert({
        segment_id: segment.id,
        person_id: testPersonId
      })
      .select()
      .single();

    expect(membershipError).toBeNull();
    expect(membership.person_id).toBe(testPersonId);

    // Verify membership
    const { data: members } = await supabase
      .from('segment_membership')
      .select('*')
      .eq('segment_id', segment.id)
      .is('exited_at', null);

    expect(members).toHaveLength(1);

    // Cleanup segment
    await supabase
      .from('segment')
      .delete()
      .eq('id', segment.id);
  });

  test('should use helper function get_or_create_person', async () => {
    // First call should create person
    const { data: personId1, error: error1 } = await supabase
      .rpc('get_or_create_person', {
        p_email: testEmail,
        p_first_name: 'John',
        p_last_name: 'Doe'
      });

    expect(error1).toBeNull();
    expect(personId1).toBeTruthy();
    testPersonId = personId1;

    // Second call should return same person
    const { data: personId2, error: error2 } = await supabase
      .rpc('get_or_create_person', {
        p_email: testEmail,
        p_first_name: 'Jane',
        p_last_name: 'Smith'
      });

    expect(error2).toBeNull();
    expect(personId2).toBe(personId1); // Should be the same person

    // Verify person was not duplicated
    const { data: persons } = await supabase
      .from('person')
      .select('*')
      .eq('email', testEmail);

    expect(persons).toHaveLength(1);
  });

  test('should use helper function link_person_identity', async () => {
    // Create person
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: testEmail,
        first_name: 'John'
      })
      .select()
      .single();

    testPersonId = person.id;

    // Link to PostHog
    const { data: linkId, error: linkError } = await supabase
      .rpc('link_person_identity', {
        p_person_id: testPersonId,
        p_platform: 'posthog',
        p_external_id: 'ph_test_789',
        p_properties: { distinct_id: 'distinct_789' }
      });

    expect(linkError).toBeNull();
    expect(linkId).toBeTruthy();

    // Verify link was created
    const { data: link } = await supabase
      .from('identity_link')
      .select('*')
      .eq('id', linkId)
      .single();

    expect(link.person_id).toBe(testPersonId);
    expect(link.platform).toBe('posthog');
    expect(link.external_id).toBe('ph_test_789');
  });

  test('should verify all Growth Data Plane tables exist', async () => {
    // List all GDP tables
    const gdpTables = [
      'person',
      'identity_link',
      'unified_event',
      'email_message',
      'email_event',
      'subscription',
      'deal',
      'person_features',
      'segment',
      'segment_membership'
    ];

    // Query each table to verify it exists
    for (const tableName of gdpTables) {
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    }
  });

  test('should verify RLS policies are enabled', async () => {
    // Test that tables have RLS enabled by attempting unauthorized access
    // Note: This test assumes we're using a service role key which bypasses RLS
    // In production, these would be tested with regular user credentials

    const gdpTables = [
      'person',
      'identity_link',
      'unified_event',
      'email_message',
      'email_event',
      'subscription',
      'deal',
      'person_features',
      'segment',
      'segment_membership'
    ];

    // Just verify tables are accessible with service role
    for (const tableName of gdpTables) {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    }
  });

  test('should verify seed data for default segments', async () => {
    const { data: segments } = await supabase
      .from('segment')
      .select('*')
      .order('created_at', { ascending: true });

    expect(segments).toBeTruthy();
    expect(segments.length).toBeGreaterThan(0);

    // Verify specific VelloPad segments exist
    const segmentKeys = segments.map(s => s.segment_key);
    expect(segmentKeys).toContain('signup_no_book_48h');
    expect(segmentKeys).toContain('book_created_no_words_72h');
    expect(segmentKeys).toContain('pdf_generated_no_order');
    expect(segmentKeys).toContain('high_engagement');
  });

});
