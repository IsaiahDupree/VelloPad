/**
 * E2E Tests for Click Redirect Tracker (GDP-006)
 *
 * Tests the complete attribution flow:
 * 1. Email link click → tracking redirect
 * 2. Attribution cookie setting
 * 3. Event recording
 * 4. Session tracking
 * 5. Conversion attribution
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe('Click Redirect Tracker', () => {
  let supabase: ReturnType<typeof createClient>;
  let testPersonId: string;
  let testEmailMessageId: string;

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create test person
    const { data: person, error: personError } = await supabase
      .from('person')
      .insert({
        email: `test-click-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
      })
      .select()
      .single();

    expect(personError).toBeNull();
    expect(person).toBeTruthy();
    testPersonId = person!.id;

    // Create test email message
    const { data: emailMessage, error: emailError } = await supabase
      .from('email_message')
      .insert({
        person_id: testPersonId,
        to_email: person!.email,
        from_email: 'noreply@vellopad.com',
        subject: 'Test Email',
        email_type: 'lifecycle',
        template_key: 'test_template',
        provider: 'resend',
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    expect(emailError).toBeNull();
    expect(emailMessage).toBeTruthy();
    testEmailMessageId = emailMessage!.id;
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (testPersonId) {
      await supabase.from('person').delete().eq('id', testPersonId);
    }
  });

  test('should redirect to destination URL with tracking', async ({ page }) => {
    const destinationUrl = '/books/new';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    // Navigate to tracking URL
    const response = await page.goto(trackingUrl);

    // Should redirect to destination
    expect(page.url()).toContain(destinationUrl);
    expect(response?.status()).toBe(200);
  });

  test('should set attribution cookie on click', async ({ page, context }) => {
    const destinationUrl = 'https://vellopad.com/books/new';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    // Navigate to tracking URL
    await page.goto(trackingUrl);

    // Check attribution cookie was set
    const cookies = await context.cookies();
    const attributionCookie = cookies.find((c) => c.name === '_vp_attr');

    expect(attributionCookie).toBeTruthy();
    expect(attributionCookie?.httpOnly).toBe(true);
    expect(attributionCookie?.secure).toBe(true);
    expect(attributionCookie?.sameSite).toBe('Lax');

    // Cookie should contain session ID, email ID, person ID
    if (attributionCookie) {
      const cookieValue = Buffer.from(attributionCookie.value, 'base64url').toString('utf-8');
      const cookieData = JSON.parse(cookieValue);

      expect(cookieData.sid).toBeTruthy(); // session ID
      expect(cookieData.eid).toBe(testEmailMessageId); // email ID
      expect(cookieData.pid).toBe(testPersonId); // person ID
      expect(cookieData.ts).toBeTruthy(); // timestamp
    }
  });

  test('should record email_event on click', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/pricing';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    // Navigate to tracking URL
    await page.goto(trackingUrl);

    // Wait for event to be recorded
    await page.waitForTimeout(1000);

    // Check email_event was recorded
    const { data: emailEvents, error } = await supabase
      .from('email_event')
      .select('*')
      .eq('email_message_id', testEmailMessageId)
      .eq('event_type', 'clicked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(emailEvents).toHaveLength(1);

    const clickEvent = emailEvents![0];
    expect(clickEvent.person_id).toBe(testPersonId);
    expect(clickEvent.clicked_url).toBe(destinationUrl);
    expect(clickEvent.user_agent).toBeTruthy();
  });

  test('should record unified_event on click', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/dashboard';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    // Navigate to tracking URL
    await page.goto(trackingUrl);

    // Wait for event to be recorded
    await page.waitForTimeout(1000);

    // Check unified_event was recorded
    const { data: unifiedEvents, error } = await supabase
      .from('unified_event')
      .select('*')
      .eq('person_id', testPersonId)
      .eq('event_name', 'email.clicked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(unifiedEvents).toHaveLength(1);

    const clickEvent = unifiedEvents![0];
    expect(clickEvent.event_source).toBe('email');
    expect(clickEvent.session_id).toBeTruthy();
    expect(clickEvent.properties.email_message_id).toBe(testEmailMessageId);
    expect(clickEvent.properties.destination_url).toBe(destinationUrl);
  });

  test('should update email_message click count', async ({ page }) => {
    // Get initial click count
    const { data: initialEmail } = await supabase
      .from('email_message')
      .select('click_count, first_clicked_at, status')
      .eq('id', testEmailMessageId)
      .single();

    const initialClickCount = initialEmail?.click_count || 0;

    // Click link
    const destinationUrl = 'https://vellopad.com/books';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}`;

    await page.goto(trackingUrl);
    await page.waitForTimeout(1000);

    // Check click count was incremented
    const { data: updatedEmail } = await supabase
      .from('email_message')
      .select('click_count, first_clicked_at, status')
      .eq('id', testEmailMessageId)
      .single();

    expect(updatedEmail?.click_count).toBe(initialClickCount + 1);
    expect(updatedEmail?.first_clicked_at).toBeTruthy();
    expect(updatedEmail?.status).toBe('clicked');
  });

  test('should track custom properties', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/';
    const properties = {
      buttonName: 'cta-hero',
      placement: 'top',
      variant: 'blue',
    };

    const propsB64 = Buffer.from(JSON.stringify(properties)).toString('base64url');
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&props=${propsB64}`;

    await page.goto(trackingUrl);
    await page.waitForTimeout(1000);

    // Check properties were recorded
    const { data: unifiedEvents } = await supabase
      .from('unified_event')
      .select('properties')
      .eq('person_id', testPersonId)
      .eq('event_name', 'email.clicked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(unifiedEvents).toHaveLength(1);
    expect(unifiedEvents![0].properties.buttonName).toBe('cta-hero');
    expect(unifiedEvents![0].properties.placement).toBe('top');
    expect(unifiedEvents![0].properties.variant).toBe('blue');
  });

  test('should handle missing email ID gracefully', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/help';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}`;

    // Should still redirect even without email ID
    const response = await page.goto(trackingUrl);

    expect(page.url()).toContain('/help');
    expect(response?.status()).toBe(200);
  });

  test('should handle invalid destination URL', async ({ page }) => {
    const trackingUrl = '/api/track/click'; // No URL parameter

    const response = await page.goto(trackingUrl, { waitUntil: 'domcontentloaded' });

    // Should return 400 error or redirect to homepage
    expect([302, 400]).toContain(response?.status() || 0);
  });

  test('should preserve session ID across events', async ({ page, context }) => {
    const destinationUrl1 = 'https://vellopad.com/pricing';
    const trackingUrl1 = `/api/track/click?url=${encodeURIComponent(destinationUrl1)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    // First click
    await page.goto(trackingUrl1);
    await page.waitForTimeout(500);

    // Get session ID from cookie
    const cookies = await context.cookies();
    const attributionCookie = cookies.find((c) => c.name === '_vp_attr');
    expect(attributionCookie).toBeTruthy();

    const cookieValue = Buffer.from(attributionCookie!.value, 'base64url').toString('utf-8');
    const cookieData = JSON.parse(cookieValue);
    const sessionId = cookieData.sid;

    // Second navigation (same session)
    const destinationUrl2 = 'https://vellopad.com/dashboard';
    await page.goto(destinationUrl2);
    await page.waitForTimeout(500);

    // Session ID should be preserved in subsequent page views
    const cookiesAfter = await context.cookies();
    const attributionCookieAfter = cookiesAfter.find((c) => c.name === '_vp_attr');
    expect(attributionCookieAfter).toBeTruthy();

    const cookieValueAfter = Buffer.from(attributionCookieAfter!.value, 'base64url').toString('utf-8');
    const cookieDataAfter = JSON.parse(cookieValueAfter);

    expect(cookieDataAfter.sid).toBe(sessionId);
  });

  test('should create attribution session', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/books/new';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    await page.goto(trackingUrl);
    await page.waitForTimeout(1000);

    // Get the session from unified_event
    const { data: events } = await supabase
      .from('unified_event')
      .select('session_id')
      .eq('person_id', testPersonId)
      .eq('event_name', 'email.clicked')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(events).toHaveLength(1);
    const sessionId = events![0].session_id;
    expect(sessionId).toBeTruthy();

    // Query attribution session using RPC
    const { data: sessionData } = await supabase.rpc('get_attribution_session', {
      session_id_param: sessionId,
    });

    expect(sessionData).toHaveLength(1);
    expect(sessionData![0].person_id).toBe(testPersonId);
    expect(sessionData![0].email_message_id).toBe(testEmailMessageId);
  });

  test('should track conversion from session', async ({ page }) => {
    const destinationUrl = 'https://vellopad.com/books/new';
    const trackingUrl = `/api/track/click?url=${encodeURIComponent(destinationUrl)}&eid=${testEmailMessageId}&pid=${testPersonId}`;

    await page.goto(trackingUrl);
    await page.waitForTimeout(1000);

    // Get session ID
    const { data: events } = await supabase
      .from('unified_event')
      .select('session_id')
      .eq('person_id', testPersonId)
      .eq('event_name', 'email.clicked')
      .order('created_at', { ascending: false })
      .limit(1);

    const sessionId = events![0].session_id;

    // Track conversion
    const { data: conversionEventId } = await supabase.rpc('track_conversion_from_session', {
      session_id_param: sessionId,
      conversion_event_name: 'order_placed',
      conversion_value_cents: 2999,
      conversion_properties: {
        order_id: 'test-order-123',
        book_id: 'test-book-456',
      },
    });

    expect(conversionEventId).toBeTruthy();

    // Verify conversion event was recorded
    const { data: conversionEvent } = await supabase
      .from('unified_event')
      .select('*')
      .eq('id', conversionEventId)
      .single();

    expect(conversionEvent).toBeTruthy();
    expect(conversionEvent?.person_id).toBe(testPersonId);
    expect(conversionEvent?.event_name).toBe('order_placed');
    expect(conversionEvent?.session_id).toBe(sessionId);
    expect(conversionEvent?.properties.conversion_value_cents).toBe(2999);
    expect(conversionEvent?.properties.order_id).toBe('test-order-123');
  });
});

test.describe('Link Rewriting', () => {
  test('should rewrite links in email HTML', async () => {
    const { rewriteEmailLinksWithTracking } = await import('@/lib/tracking/click-redirect');

    const originalHtml = `
      <html>
        <body>
          <a href="https://vellopad.com/pricing">View Pricing</a>
          <a href="https://vellopad.com/books/new">Start Writing</a>
          <a href="mailto:support@vellopad.com">Contact Us</a>
          <a href="#section">Jump to Section</a>
        </body>
      </html>
    `;

    const trackedHtml = rewriteEmailLinksWithTracking(
      originalHtml,
      'test-email-id',
      'test-person-id',
      'test-campaign-id'
    );

    // Check that regular links are rewritten
    expect(trackedHtml).toContain('/api/track/click?url=');
    expect(trackedHtml).toContain('eid=test-email-id');
    expect(trackedHtml).toContain('pid=test-person-id');
    expect(trackedHtml).toContain('cid=test-campaign-id');

    // Check that mailto and anchor links are NOT rewritten
    expect(trackedHtml).toContain('href="mailto:support@vellopad.com"');
    expect(trackedHtml).toContain('href="#section"');
  });

  test('should skip unsubscribe links', async () => {
    const { rewriteEmailLinksWithTracking } = await import('@/lib/tracking/click-redirect');

    const originalHtml = `
      <a href="https://vellopad.com/unsubscribe?token=abc">Unsubscribe</a>
    `;

    const trackedHtml = rewriteEmailLinksWithTracking(originalHtml, 'test-email-id');

    // Unsubscribe link should NOT be tracked
    expect(trackedHtml).not.toContain('/api/track/click');
    expect(trackedHtml).toContain('href="https://vellopad.com/unsubscribe?token=abc"');
  });
});
