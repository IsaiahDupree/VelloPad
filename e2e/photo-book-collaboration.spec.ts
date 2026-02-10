/**
 * E2E Test: Photo Book Collaboration
 * Feature: PB-029
 *
 * Tests collaborative editing features for photo books
 */

import { test, expect } from '@playwright/test';

test.describe('Photo Book Collaboration', () => {
  const testProject = {
    title: 'Collaborative Photo Book Test',
    description: 'Testing multi-user collaboration',
  };

  let projectId: string;
  let user1Email: string;
  let user2Email: string;

  test.beforeAll(async () => {
    // Generate unique emails for test users
    const timestamp = Date.now();
    user1Email = `testuser1-${timestamp}@example.com`;
    user2Email = `testuser2-${timestamp}@example.com`;
  });

  test('should create a photo book project', async ({ page }) => {
    await page.goto('/photo-book/upload');

    // Create new project
    await page.fill('[name="title"]', testProject.title);
    await page.fill('[name="description"]', testProject.description);
    await page.click('button[type="submit"]');

    // Wait for project creation
    await page.waitForURL(/\/photo-book\/projects\/[^/]+/);

    // Extract project ID from URL
    const url = page.url();
    const match = url.match(/\/photo-book\/projects\/([^/]+)/);
    expect(match).toBeTruthy();
    projectId = match![1];
  });

  test('should show owner as initial collaborator', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open collaborators panel
    await page.click('button:has-text("Collaborators")');

    // Should see 1 collaborator (owner)
    const collaboratorCount = await page.locator('[data-testid="collaborator-item"]').count();
    expect(collaboratorCount).toBe(1);

    // Owner badge should be visible
    await expect(page.locator('text=owner')).toBeVisible();
  });

  test('should invite a collaborator', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open collaborators panel
    await page.click('button:has-text("Collaborators")');

    // Click invite button
    await page.click('button:has-text("Invite")');

    // Fill invite form
    await page.fill('[name="email"]', user2Email);
    await page.selectOption('[name="role"]', 'editor');

    // Send invitation
    await page.click('button:has-text("Send Invitation")');

    // Should see success message or new collaborator
    await page.waitForTimeout(1000);
    const collaboratorCount = await page.locator('[data-testid="collaborator-item"]').count();
    expect(collaboratorCount).toBe(2);
  });

  test('should update collaborator role', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open collaborators panel
    await page.click('button:has-text("Collaborators")');

    // Find invited collaborator (not the owner)
    const collaboratorItem = page.locator('[data-testid="collaborator-item"]').filter({
      hasNot: page.locator('text=owner'),
    }).first();

    // Change role to viewer
    await collaboratorItem.locator('select[name="role"]').selectOption('viewer');

    // Wait for update
    await page.waitForTimeout(500);

    // Verify role change
    const role = await collaboratorItem.locator('select[name="role"]').inputValue();
    expect(role).toBe('viewer');
  });

  test('should remove a collaborator', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open collaborators panel
    await page.click('button:has-text("Collaborators")');

    // Get initial count
    const initialCount = await page.locator('[data-testid="collaborator-item"]').count();

    // Find and click remove button for invited collaborator
    const collaboratorItem = page.locator('[data-testid="collaborator-item"]').filter({
      hasNot: page.locator('text=owner'),
    }).first();

    await collaboratorItem.locator('button[aria-label="Remove"]').click();

    // Confirm removal
    await page.click('button:has-text("Confirm")');

    // Wait for removal
    await page.waitForTimeout(500);

    // Verify count decreased
    const newCount = await page.locator('[data-testid="collaborator-item"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should log activities when making changes', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open activity feed
    await page.click('button:has-text("Activity")');

    // Make a change (e.g., update title)
    await page.fill('[name="projectTitle"]', 'Updated Title');
    await page.click('button:has-text("Save")');

    // Wait for activity log
    await page.waitForTimeout(1000);

    // Should see activity items
    const activityItems = await page.locator('[data-testid="activity-item"]').count();
    expect(activityItems).toBeGreaterThan(0);

    // Should include "edited" or similar text
    await expect(page.locator('text=/edited|updated/i')).toBeVisible();
  });

  test('should show presence indicators for active collaborators', async ({ page, context }) => {
    // Open project in first tab (user 1)
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open project in second tab (simulate user 2)
    const page2 = await context.newPage();
    await page2.goto(`/photo-book/projects/${projectId}`);

    // Wait for presence sync
    await page.waitForTimeout(2000);

    // First page should show presence indicator for second user
    const presenceIndicators = await page.locator('[data-testid="presence-indicator"]').count();
    expect(presenceIndicators).toBeGreaterThan(0);

    // Close second page
    await page2.close();

    // Wait for presence update
    await page.waitForTimeout(5000);

    // Presence indicator should be gone
    const remainingIndicators = await page.locator('[data-testid="presence-indicator"]').count();
    expect(remainingIndicators).toBe(0);
  });

  test('should enforce role-based permissions', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Invite user as viewer
    await page.click('button:has-text("Collaborators")');
    await page.click('button:has-text("Invite")');
    await page.fill('[name="email"]', user2Email);
    await page.selectOption('[name="role"]', 'viewer');
    await page.click('button:has-text("Send Invitation")');

    // TODO: Log in as viewer user and verify they can't edit
    // This would require multi-user authentication setup in tests

    // For now, verify UI shows proper role badges
    await expect(page.locator('text=viewer')).toBeVisible();
  });

  test('should display activity timeline correctly', async ({ page }) => {
    await page.goto(`/photo-book/projects/${projectId}`);

    // Open activity feed
    await page.click('button:has-text("Activity")');

    // Get all activity items
    const activities = page.locator('[data-testid="activity-item"]');
    const count = await activities.count();

    expect(count).toBeGreaterThan(0);

    // Verify activities are sorted by time (most recent first)
    if (count > 1) {
      const firstTimestamp = await activities.first().getAttribute('data-timestamp');
      const lastTimestamp = await activities.last().getAttribute('data-timestamp');

      if (firstTimestamp && lastTimestamp) {
        const first = new Date(firstTimestamp).getTime();
        const last = new Date(lastTimestamp).getTime();
        expect(first).toBeGreaterThanOrEqual(last);
      }
    }
  });

  test('should handle real-time updates', async ({ page, context }) => {
    // Open project in first tab
    await page.goto(`/photo-book/projects/${projectId}`);
    await page.click('button:has-text("Activity")');

    // Open project in second tab
    const page2 = await context.newPage();
    await page2.goto(`/photo-book/projects/${projectId}`);

    // Make a change in second tab
    await page2.fill('[name="projectTitle"]', 'Real-time Test');
    await page2.click('button:has-text("Save")');

    // Wait for real-time update
    await page.waitForTimeout(2000);

    // First tab should show the new activity
    await expect(page.locator('text=Real-time Test')).toBeVisible();

    await page2.close();
  });
});

test.describe('Collaboration API', () => {
  test('should return 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/photo-book/projects/test-id/collaborators');
    expect(response.status()).toBe(401);
  });

  test('should return 403 for unauthorized project access', async ({ request }) => {
    // This would require authentication setup
    // Placeholder for future implementation
  });

  test('should validate email format when inviting', async ({ request }) => {
    // This would require authentication setup
    // Placeholder for future implementation
  });
});
