/**
 * E2E Tests for MT-010: Tenant-Aware Email Sequences
 *
 * Tests tenant-specific email templates for lifecycle events
 */

import { test, expect } from '@playwright/test';

test.describe('Email Templates (MT-010)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/email-templates');
    await page.waitForLoadState('networkidle');
  });

  test('should list all email templates', async ({ page }) => {
    // Verify table exists
    await expect(page.locator('table')).toBeVisible();

    // Check headers
    await expect(page.locator('th:has-text("Event")')).toBeVisible();
    await expect(page.locator('th:has-text("Tenant")')).toBeVisible();
    await expect(page.locator('th:has-text("Subject")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    // Verify default templates exist
    const defaultEvents = [
      'signup_welcome',
      'activation_nudge',
      'proof_copy_push',
      'order_shipped',
    ];

    for (const event of defaultEvents) {
      await expect(page.locator(`text=${event}`)).toBeVisible();
    }
  });

  test('should filter templates by tenant', async ({ page }) => {
    // Select tenant filter
    await page.selectOption('select[name="tenant_filter"]', { label: 'Faith VelloPad' });
    await page.waitForLoadState('networkidle');

    // Verify only default + tenant templates are shown
    const tenantLabels = await page.locator('[data-testid="tenant-label"]').allTextContents();
    tenantLabels.forEach((label) => {
      expect(['Default', 'Faith VelloPad']).toContain(label);
    });
  });

  test('should filter templates by lifecycle event', async ({ page }) => {
    // Select event filter
    await page.selectOption('select[name="event_filter"]', 'signup_welcome');
    await page.waitForLoadState('networkidle');

    // Verify only welcome templates are shown
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);

    const events = await page.locator('[data-testid="lifecycle-event"]').allTextContents();
    events.forEach((event) => {
      expect(event).toContain('signup_welcome');
    });
  });

  test('should create a new tenant-specific template', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Create Template")');

    // Fill in form
    await page.selectOption('select[name="tenant_id"]', { label: 'Faith VelloPad' });
    await page.selectOption('select[name="lifecycle_event"]', 'activation_nudge');
    await page.fill(
      'input[name="subject_template"]',
      '{{user_name}}, let\\'s get started with your faith journal! 🙏'
    );
    await page.fill(
      'textarea[name="body_template"]',
      `<p>Hi {{user_name}},</p>
      <p>We're excited to help you create your faith journal!</p>
      <p>Start by writing about what's on your heart today.</p>`
    );

    // Add variables
    await page.click('button:has-text("Add Variable")');
    await page.fill('input[name="variable_0"]', 'user_name');

    // Submit
    await page.click('button:has-text("Create Template")');

    // Verify success
    await expect(page.locator('text=Template created successfully')).toBeVisible();
  });

  test('should edit an existing template', async ({ page }) => {
    // Find and click edit button for a template
    await page.click('tr:has-text("signup_welcome") button[aria-label="Edit"]');

    // Modify subject
    await page.fill('input[name="subject_template"]', 'Updated: Welcome to {{tenant_name}}! 🎉');

    // Save
    await page.click('button:has-text("Save Changes")');

    // Verify success
    await expect(page.locator('text=Template updated successfully')).toBeVisible();
  });

  test('should preview email template with sample data', async ({ page }) => {
    // Click preview button
    await page.click('tr:has-text("signup_welcome") button[aria-label="Preview"]');

    // Verify preview modal
    await expect(page.locator('dialog[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Email Preview')).toBeVisible();

    // Verify template variables are replaced
    await expect(page.locator('text=Hi John Doe')).toBeVisible(); // Sample user_name
    await expect(page.locator('text=Welcome to VelloPad')).toBeVisible(); // Sample tenant_name

    // Check that CTA button is rendered
    await expect(page.locator('a:has-text("Start Your Book")')).toBeVisible();
  });

  test('should validate required template variables', async ({ page }) => {
    await page.click('button:has-text("Create Template")');

    // Create template with missing variable
    await page.selectOption('select[name="lifecycle_event"]', 'signup_welcome');
    await page.fill('input[name="subject_template"]', 'Welcome {{user_name}} to {{missing_var}}!');
    await page.fill('textarea[name="body_template"]', '<p>Welcome!</p>');

    // Try to save
    await page.click('button:has-text("Create Template")');

    // Should show warning about missing variables
    await expect(page.locator('text=Undefined variable')).toBeVisible();
    await expect(page.locator('text=missing_var')).toBeVisible();
  });

  test('should toggle template active status', async ({ page }) => {
    // Find a template
    const templateRow = page.locator('tr:has-text("signup_welcome")').first();

    // Get current status
    const statusBadge = templateRow.locator('[data-testid="status-badge"]');
    const currentStatus = await statusBadge.textContent();

    // Click toggle button
    await templateRow.locator('button[aria-label="Toggle status"]').click();

    // Wait for update
    await page.waitForLoadState('networkidle');

    // Verify status changed
    const newStatus = await statusBadge.textContent();
    expect(newStatus).not.toBe(currentStatus);
  });

  test('should show available template variables for each event type', async ({ page }) => {
    await page.click('button:has-text("Create Template")');

    // Select different lifecycle events and check available variables
    const eventVariables = {
      signup_welcome: ['user_name', 'tenant_name', 'app_url', 'brand_color'],
      proof_copy_push: ['user_name', 'book_title', 'proof_cost', 'order_url'],
      order_shipped: ['order_number', 'carrier', 'tracking_number', 'estimated_delivery'],
    };

    for (const [event, expectedVars] of Object.entries(eventVariables)) {
      await page.selectOption('select[name="lifecycle_event"]', event);

      // Verify help text shows available variables
      const helpText = await page.locator('[data-testid="available-variables"]').textContent();

      expectedVars.forEach((variable) => {
        expect(helpText).toContain(variable);
      });
    }
  });

  test('should duplicate template to create tenant-specific version', async ({ page }) => {
    // Find default template
    const defaultTemplate = page.locator('tr:has-text("signup_welcome"):has-text("Default")');

    // Click duplicate button
    await defaultTemplate.locator('button[aria-label="Duplicate"]').click();

    // Modal should open with pre-filled data
    await expect(page.locator('dialog[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Duplicate Template')).toBeVisible();

    // Select tenant
    await page.selectOption('select[name="tenant_id"]', { label: 'Faith VelloPad' });

    // Modify for tenant
    await page.fill(
      'input[name="subject_template"]',
      'Welcome to Faith VelloPad - Your Sacred Space 🙏'
    );

    // Create
    await page.click('button:has-text("Create Duplicate")');

    // Verify success
    await expect(page.locator('text=Template duplicated successfully')).toBeVisible();
  });

  test('should delete a tenant-specific template', async ({ page }) => {
    // Find tenant-specific template (not default)
    const tenantTemplate = page
      .locator('tr')
      .filter({ hasText: 'Faith VelloPad' })
      .filter({ hasNotText: 'Default' })
      .first();

    // Click delete button
    await tenantTemplate.locator('button[aria-label="Delete"]').click();

    // Confirm deletion
    await page.click('button:has-text("Confirm Delete")');

    // Verify success
    await expect(page.locator('text=Template deleted successfully')).toBeVisible();
  });

  test('should prevent deletion of default templates', async ({ page }) => {
    // Find default template
    const defaultTemplate = page.locator('tr:has-text("Default")').first();

    // Delete button should be disabled or hidden
    const deleteButton = defaultTemplate.locator('button[aria-label="Delete"]');
    await expect(deleteButton).toBeDisabled();
  });
});

test.describe('Email Template API', () => {
  test('should create template via API', async ({ request }) => {
    const response = await request.post('/api/admin/email-templates', {
      data: {
        tenant_id: null, // Default template
        lifecycle_event: 'activation_nudge',
        subject_template: 'Time to write your first chapter, {{user_name}}!',
        body_template: '<p>Hi {{user_name}},</p><p>Let\\'s get started!</p>',
        variables: ['user_name', 'tenant_name'],
        is_active: true,
      },
    });

    // May conflict with existing template
    if (response.status() !== 409) {
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.template).toBeDefined();
      expect(data.template.lifecycle_event).toBe('activation_nudge');
    }
  });

  test('should list templates via API', async ({ request }) => {
    const response = await request.get('/api/admin/email-templates');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.templates)).toBeTruthy();
    expect(data.templates.length).toBeGreaterThan(0);
  });

  test('should filter templates by tenant via API', async ({ request }) => {
    const response = await request.get('/api/admin/email-templates?tenant_id=test-tenant-id');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Should return default + tenant-specific templates
    data.templates.forEach((template: any) => {
      expect([null, 'test-tenant-id']).toContain(template.tenant_id);
    });
  });

  test('should update template via API', async ({ request }) => {
    // First, get a template
    const listResponse = await request.get('/api/admin/email-templates');
    const { templates } = await listResponse.json();
    const templateId = templates[0]?.id;

    if (templateId) {
      const response = await request.patch(`/api/admin/email-templates/${templateId}`, {
        data: {
          subject_template: 'Updated subject: {{user_name}}!',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.template.subject_template).toContain('Updated subject');
    }
  });

  test('should validate required fields via API', async ({ request }) => {
    const response = await request.post('/api/admin/email-templates', {
      data: {
        // Missing required fields
        subject_template: 'Test',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

test.describe('Email Template Rendering', () => {
  test('should render template with variables', async ({ page }) => {
    // Test the template rendering function
    await page.goto('/admin/email-templates/test-render');

    // Input template
    await page.fill(
      'textarea[name="template"]',
      'Hi {{user_name}}, welcome to {{tenant_name}}!'
    );

    // Input context
    await page.fill(
      'textarea[name="context"]',
      JSON.stringify({
        user_name: 'John Doe',
        tenant_name: 'VelloPad',
      })
    );

    // Click render
    await page.click('button:has-text("Render")');

    // Verify output
    const output = await page.locator('[data-testid="rendered-output"]').textContent();
    expect(output).toBe('Hi John Doe, welcome to VelloPad!');
  });

  test('should apply tenant branding to email wrapper', async ({ page }) => {
    await page.goto('/admin/email-templates/test-render');

    // Enable email wrapper
    await page.check('input[name="apply_wrapper"]');

    // Select tenant
    await page.selectOption('select[name="tenant_id"]', { label: 'Faith VelloPad' });

    // Render
    await page.click('button:has-text("Render")');

    // Verify branding is applied
    const html = await page.locator('[data-testid="rendered-html"]').innerHTML();
    expect(html).toContain('Faith VelloPad'); // Tenant name in header
    expect(html).toContain('#'); // Brand color
  });
});
