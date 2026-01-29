import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * E2E Test for BS-703: Admin Broadcast Tool
 *
 * Tests the admin's ability to create and send broadcast email campaigns to user segments.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

test.describe('BS-703: Admin Broadcast Tool', () => {
  let adminUserId: string;
  let workspaceId: string;
  let segmentId: string;
  let testPersonId: string;

  test.beforeAll(async () => {
    // Create test admin user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `admin-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
    });
    adminUserId = authData.user!.id;

    // Create test workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .insert({
        name: 'Test Campaign Workspace',
        slug: `test-campaign-${Date.now()}`,
      })
      .select()
      .single();
    workspaceId = workspace.id;

    // Add admin as owner
    await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: adminUserId,
      role: 'owner',
    });

    // Create test person for targeting
    const { data: person } = await supabase
      .from('person')
      .insert({
        email: `test-recipient-${Date.now()}@test.com`,
        first_name: 'Test',
        last_name: 'Recipient',
        workspace_id: workspaceId,
      })
      .select()
      .single();
    testPersonId = person.id;

    // Create test segment
    const { data: segment } = await supabase
      .from('segment')
      .insert({
        workspace_id: workspaceId,
        name: 'Test Segment',
        description: 'Test segment for campaign targeting',
        filter_criteria: {
          conditions: [
            {
              field: 'active_days',
              operator: '>=',
              value: 0,
            },
          ],
        },
      })
      .select()
      .single();
    segmentId = segment.id;

    // Add person to segment
    await supabase.from('segment_membership').insert({
      segment_id: segmentId,
      person_id: testPersonId,
      entered_at: new Date().toISOString(),
    });
  });

  test.afterAll(async () => {
    // Cleanup: Delete test data
    if (segmentId) {
      await supabase.from('segment_membership').delete().eq('segment_id', segmentId);
      await supabase.from('segment').delete().eq('id', segmentId);
    }
    if (testPersonId) {
      await supabase.from('person').delete().eq('id', testPersonId);
    }
    if (workspaceId) {
      await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
      await supabase.from('workspaces').delete().eq('id', workspaceId);
    }
    if (adminUserId) {
      await supabase.auth.admin.deleteUser(adminUserId);
    }
  });

  test('admin can access campaigns page', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Navigate to admin campaigns
    await page.goto('/admin/campaigns');
    await expect(page).toHaveURL('/admin/campaigns');
    await expect(page.locator('h1')).toContainText('Campaigns');
  });

  test('admin can create a broadcast campaign', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Go to create campaign page
    await page.goto('/admin/campaigns/new');
    await expect(page).toHaveURL('/admin/campaigns/new');

    // Step 1: Campaign Details
    await page.fill('input[name="name"]', 'Test Broadcast Campaign');
    await page.fill('textarea[name="description"]', 'Testing the broadcast campaign feature');
    await page.click('button:has-text("Next")');

    // Step 2: Select Segments
    await page.click('button:has-text("Select Segments")');
    await page.click(`text=Test Segment`);
    await expect(page.locator('text=1 recipient')).toBeVisible();
    await page.click('button:has-text("Next")');

    // Step 3: Compose Email
    await page.fill('input[name="subject"]', 'Test Email Subject');
    await page.fill('textarea[name="preview_text"]', 'This is a test preview');
    await page.fill('textarea[name="email_content"]', 'Hi {{first_name}},\n\nThis is a test email.\n\nBest,\nVelloPad Team');
    await page.click('button:has-text("Review")');

    // Step 4: Review & Create
    await expect(page.locator('text=Test Broadcast Campaign')).toBeVisible();
    await expect(page.locator('text=1 recipient')).toBeVisible();
    await expect(page.locator('text=Test Email Subject')).toBeVisible();
    await page.click('button:has-text("Create Campaign")');

    // Verify campaign created
    await expect(page).toHaveURL(/\/admin\/campaigns\/[a-z0-9-]+/);
    await expect(page.locator('text=Draft')).toBeVisible();
  });

  test('admin can preview campaign audience', async ({ page }) => {
    // Create campaign first
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: workspaceId,
        name: 'Audience Preview Test',
        description: 'Testing audience preview',
        campaign_type: 'one_time',
        status: 'draft',
        email_subject: 'Test Subject',
        email_content: 'Test content',
        segment_ids: [segmentId],
      })
      .select()
      .single();

    // Login and navigate to campaign
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    await page.goto(`/admin/campaigns/${campaign.id}`);

    // Check audience preview
    await expect(page.locator('text=1 recipient')).toBeVisible();
    await expect(page.locator('text=Test Segment')).toBeVisible();

    // Click preview audience button
    await page.click('button:has-text("Preview Audience")');
    await expect(page.locator(`text=${testPersonId}`)).toBeVisible();
  });

  test('admin can send a campaign', async ({ page, request }) => {
    // Create draft campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: workspaceId,
        name: 'Send Test Campaign',
        description: 'Testing campaign send',
        campaign_type: 'one_time',
        status: 'draft',
        email_subject: 'Test Send Subject',
        email_content: 'Hello {{first_name}}, this is a test.',
        segment_ids: [segmentId],
      })
      .select()
      .single();

    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Navigate to campaign and send
    await page.goto(`/admin/campaigns/${campaign.id}`);
    await page.click('button:has-text("Send Campaign")');

    // Confirm send
    await page.click('button:has-text("Confirm Send")');

    // Wait for send to complete
    await page.waitForTimeout(2000);

    // Verify campaign status changed to sent
    const { data: sentCampaign } = await supabase
      .from('campaigns')
      .select('status, sent_at, send_count')
      .eq('id', campaign.id)
      .single();

    expect(sentCampaign!.status).toBe('sent');
    expect(sentCampaign!.sent_at).not.toBeNull();
    expect(sentCampaign!.send_count).toBe(1);

    // Verify email_sends record created
    const { data: emailSends } = await supabase
      .from('email_sends')
      .select('*')
      .eq('campaign_id', campaign.id);

    expect(emailSends).toHaveLength(1);
    expect(emailSends![0].person_id).toBe(testPersonId);
  });

  test('admin can view campaign statistics', async ({ page }) => {
    // Create sent campaign with stats
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: workspaceId,
        name: 'Stats Test Campaign',
        description: 'Testing stats',
        campaign_type: 'one_time',
        status: 'sent',
        email_subject: 'Stats Test',
        email_content: 'Content',
        segment_ids: [segmentId],
        sent_at: new Date().toISOString(),
        send_count: 10,
      })
      .select()
      .single();

    // Create mock email sends with stats
    await supabase.from('email_sends').insert([
      {
        campaign_id: campaign.id,
        person_id: testPersonId,
        status: 'delivered',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        opened_at: new Date().toISOString(),
      },
    ]);

    // Login and view campaign stats
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    await page.goto(`/admin/campaigns/${campaign.id}`);

    // Check stats are displayed
    await expect(page.locator('text=10')).toBeVisible(); // send_count
    await expect(page.locator('text=1')).toBeVisible(); // delivered
    await expect(page.locator('text=1')).toBeVisible(); // opened
  });

  test('non-admin cannot access campaigns page', async ({ page }) => {
    // Create non-admin user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `user-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
    });
    const userId = authData.user!.id;

    // Add as member (not admin)
    await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'member',
    });

    // Try to access campaigns page
    await page.goto('/login');
    await page.fill('input[type="email"]', `user-${userId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    await page.goto('/admin/campaigns');

    // Should be redirected or see unauthorized message
    await expect(
      page.locator('text=Unauthorized').or(page.locator('text=403'))
    ).toBeVisible();

    // Cleanup
    await supabase.from('workspace_members').delete().eq('user_id', userId);
    await supabase.auth.admin.deleteUser(userId);
  });

  test('campaign cannot be sent twice', async ({ page }) => {
    // Create already-sent campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        workspace_id: workspaceId,
        name: 'Already Sent Campaign',
        description: 'Testing duplicate send prevention',
        campaign_type: 'one_time',
        status: 'sent',
        email_subject: 'Already Sent',
        email_content: 'Content',
        segment_ids: [segmentId],
        sent_at: new Date().toISOString(),
        send_count: 1,
      })
      .select()
      .single();

    // Login and try to send again
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    await page.goto(`/admin/campaigns/${campaign.id}`);

    // Send button should be disabled or not visible
    await expect(page.locator('button:has-text("Send Campaign")')).toBeDisabled();
  });

  test('campaign with empty segment shows warning', async ({ page }) => {
    // Create empty segment
    const { data: emptySegment } = await supabase
      .from('segment')
      .insert({
        workspace_id: workspaceId,
        name: 'Empty Segment',
        description: 'Empty test segment',
        filter_criteria: {
          conditions: [
            {
              field: 'active_days',
              operator: '>=',
              value: 999999, // Impossible condition
            },
          ],
        },
      })
      .select()
      .single();

    // Login and create campaign with empty segment
    await page.goto('/login');
    await page.fill('input[type="email"]', `admin-${adminUserId}@test.com`);
    await page.fill('input[type="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    await page.goto('/admin/campaigns/new');

    // Fill in campaign details
    await page.fill('input[name="name"]', 'Empty Segment Campaign');
    await page.fill('textarea[name="description"]', 'Testing empty segment');
    await page.click('button:has-text("Next")');

    // Select empty segment
    await page.click('button:has-text("Select Segments")');
    await page.click(`text=Empty Segment`);

    // Should show warning
    await expect(page.locator('text=0 recipients')).toBeVisible();
    await expect(page.locator('text=warning').or(page.locator('text=no members'))).toBeVisible();

    // Cleanup
    await supabase.from('segment').delete().eq('id', emptySegment.id);
  });
});
