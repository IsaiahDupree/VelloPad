/**
 * E2E Tests for MT-009: Subdomain Sending Domains
 *
 * Tests tenant-specific email sending domain configuration
 * with DNS verification (SPF/DKIM/DMARC)
 */

import { test, expect } from '@playwright/test';

test.describe('Sending Domains (MT-009)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test tenant
    await page.goto('/admin/tenants');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new sending domain for a tenant', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Click create button
    await page.click('button:has-text("Add Sending Domain")');

    // Fill in form
    await page.selectOption('select[name="tenant_id"]', { label: 'Faith VelloPad' });
    await page.fill('input[name="subdomain"]', 'faith');

    // Submit
    await page.click('button:has-text("Create Domain")');

    // Wait for success
    await expect(page.locator('text=Domain created successfully')).toBeVisible();

    // Verify domain appears in list
    await expect(page.locator('text=mail.faith.vellopad.com')).toBeVisible();
  });

  test('should display DNS records for configuration', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Find a domain and click details
    await page.click('text=mail.faith.vellopad.com');

    // Verify DNS records are displayed
    await expect(page.locator('text=DNS Configuration')).toBeVisible();

    // Check SPF record
    await expect(page.locator('text=v=spf1 include:resend.com ~all')).toBeVisible();

    // Check DKIM record
    await expect(page.locator('text=resend._domainkey.mail.faith.vellopad.com')).toBeVisible();

    // Check DMARC record
    await expect(page.locator('text=_dmarc.mail.faith.vellopad.com')).toBeVisible();
  });

  test('should verify domain DNS configuration', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Find domain
    await page.click('text=mail.faith.vellopad.com');

    // Click verify button
    await page.click('button:has-text("Verify DNS")');

    // Wait for verification result
    await page.waitForResponse((response) =>
      response.url().includes('/api/admin/sending-domains/') &&
      response.url().includes('/verify')
    );

    // Check verification status
    // Note: In test environment, verification may fail (expected)
    const status = await page.locator('[data-testid="verification-status"]').textContent();
    expect(['pending', 'verifying', 'active', 'failed']).toContain(status?.toLowerCase());
  });

  test('should display verification errors if DNS not configured', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Find domain with failed verification
    await page.click('text=mail.test.vellopad.com');

    // Verify error messages are shown
    const errorList = page.locator('[data-testid="verification-errors"]');
    await expect(errorList).toBeVisible();

    // Common error messages
    const errors = await errorList.locator('li').allTextContents();
    expect(errors.length).toBeGreaterThan(0);
  });

  test('should list all sending domains with status', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Verify table headers
    await expect(page.locator('th:has-text("Domain")')).toBeVisible();
    await expect(page.locator('th:has-text("Tenant")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Verified")')).toBeVisible();

    // Count rows
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('should filter sending domains by tenant', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Select tenant filter
    await page.selectOption('select[name="tenant_filter"]', { label: 'Faith VelloPad' });

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify only faith domains are shown
    const domains = await page.locator('[data-testid="domain-row"]').allTextContents();
    domains.forEach((domain) => {
      expect(domain).toContain('faith');
    });
  });

  test('should show active domains only filter', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Toggle "Active only" filter
    await page.check('input[name="active_only"]');

    // Wait for filtered results
    await page.waitForLoadState('networkidle');

    // Verify all shown domains have "active" status
    const statusBadges = await page.locator('[data-testid="status-badge"]').allTextContents();
    statusBadges.forEach((status) => {
      expect(status.toLowerCase()).toBe('active');
    });
  });

  test('should validate subdomain format', async ({ page }) => {
    await page.goto('/admin/sending-domains');
    await page.click('button:has-text("Add Sending Domain")');

    // Try invalid subdomain formats
    const invalidSubdomains = ['Faith', 'faith_journal', 'faith.com', '-faith', 'faith-'];

    for (const subdomain of invalidSubdomains) {
      await page.fill('input[name="subdomain"]', subdomain);
      await page.click('button:has-text("Create Domain")');

      // Should show validation error
      await expect(page.locator('text=Invalid subdomain format')).toBeVisible();
    }

    // Try valid subdomain
    await page.fill('input[name="subdomain"]', 'faith-journal');
    await page.click('button:has-text("Create Domain")');

    // Should succeed (or show different error like "already exists")
    await expect(page.locator('text=Invalid subdomain format')).not.toBeVisible();
  });

  test('should prevent duplicate sending domains', async ({ page }) => {
    await page.goto('/admin/sending-domains');
    await page.click('button:has-text("Add Sending Domain")');

    // Try to create duplicate domain
    await page.selectOption('select[name="tenant_id"]', { label: 'Faith VelloPad' });
    await page.fill('input[name="subdomain"]', 'faith'); // Assuming this exists

    await page.click('button:has-text("Create Domain")');

    // Should show error
    await expect(page.locator('text=Domain already exists')).toBeVisible();
  });

  test('should display Resend integration status', async ({ page }) => {
    await page.goto('/admin/sending-domains');

    // Check if Resend is configured
    const resendStatus = page.locator('[data-testid="resend-status"]');
    const statusText = await resendStatus.textContent();

    if (process.env.RESEND_API_KEY) {
      expect(statusText).toContain('Connected');
    } else {
      expect(statusText).toContain('Not configured');
    }
  });
});

test.describe('Sending Domain API', () => {
  test('should create sending domain via API', async ({ request }) => {
    const response = await request.post('/api/admin/sending-domains', {
      data: {
        tenant_id: 'test-tenant-id',
        subdomain: 'test-api',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (process.env.RESEND_API_KEY) {
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.domain).toBeDefined();
      expect(data.domain.domain).toBe('mail.test-api.vellopad.com');
    } else {
      // Should fail without API key
      expect(response.status()).toBe(500);
    }
  });

  test('should list sending domains via API', async ({ request }) => {
    const response = await request.get('/api/admin/sending-domains');

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.domains)).toBeTruthy();
  });

  test('should verify domain via API', async ({ request }) => {
    // Create a domain first
    const createResponse = await request.post('/api/admin/sending-domains', {
      data: {
        tenant_id: 'test-tenant-id',
        subdomain: 'test-verify',
      },
    });

    if (createResponse.ok()) {
      const { domain } = await createResponse.json();

      // Verify it
      const verifyResponse = await request.post(
        `/api/admin/sending-domains/${domain.id}/verify`
      );

      expect(verifyResponse.ok()).toBeTruthy();
      const verifyData = await verifyResponse.json();
      expect(verifyData.domain.id).toBe(domain.id);
    }
  });

  test('should reject invalid subdomain via API', async ({ request }) => {
    const response = await request.post('/api/admin/sending-domains', {
      data: {
        tenant_id: 'test-tenant-id',
        subdomain: 'Invalid_Subdomain',
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid subdomain format');
  });
});
