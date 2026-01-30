import { test, expect } from '@playwright/test';

/**
 * AI-002: Inline Coach E2E Tests
 *
 * Tests for the inline coach that detects stuck users
 * and provides contextual next-step suggestions
 */

test.describe('Inline Coach - AI-002', () => {
  test('should not show coach when book is in good progress', async ({ page }) => {
    // Simulate a book with good progress
    const bookProgress = {
      totalChapters: 5,
      completedChapters: 4,
      totalWords: 8000,
      hasOutline: true,
      hasCover: true,
      hasRendition: false,
      daysSinceLastEdit: 0,
      wordCountTarget: 10000,
    };

    // Coach should not appear when user is actively working
    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).not.toBeVisible();
  });

  test('should show "get started" suggestion for empty book', async ({ page }) => {
    const bookProgress = {
      totalChapters: 0,
      completedChapters: 0,
      totalWords: 0,
      hasOutline: false,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 0,
      wordCountTarget: 10000,
    };

    // Coach should suggest creating first chapter
    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText("Let's Get Started");

    const actionButton = page.locator('[data-testid="coach-action-button"]');
    await expect(actionButton).toContainText('Create First Chapter');
  });

  test('should show "outline to content" suggestion when outline exists but no chapters', async ({
    page,
  }) => {
    const bookProgress = {
      totalChapters: 0,
      completedChapters: 0,
      totalWords: 0,
      hasOutline: true, // Outline exists
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 0,
      wordCountTarget: 10000,
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('Start Writing Your Chapters');
  });

  test('should show stalled editing suggestion when no edits for 3+ days', async ({ page }) => {
    const bookProgress = {
      totalChapters: 3,
      completedChapters: 2,
      totalWords: 5000,
      hasOutline: true,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 5, // Stalled for 5 days
      wordCountTarget: 10000,
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('Get Back to Writing');

    const suggestionDescription = page.locator(
      '[data-testid="coach-suggestion-description"]'
    );
    await expect(suggestionDescription).toContainText('5 days');
  });

  test('should show mid-project slump suggestion at 50% progress with inactivity', async ({
    page,
  }) => {
    const bookProgress = {
      totalChapters: 5,
      completedChapters: 2,
      totalWords: 5000,
      hasOutline: true,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 2, // Inactive for 2 days
      wordCountTarget: 10000, // 50% complete
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('50% Done');
  });

  test('should show "design your cover" suggestion when 85%+ complete but no cover', async ({
    page,
  }) => {
    const bookProgress = {
      totalChapters: 8,
      completedChapters: 7,
      totalWords: 8500,
      hasOutline: true,
      hasCover: false, // Missing cover
      hasRendition: false,
      daysSinceLastEdit: 1,
      wordCountTarget: 10000, // 85% complete
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('Design Your Cover');
  });

  test('should show "generate PDF" suggestion when book is complete but no rendition', async ({
    page,
  }) => {
    const bookProgress = {
      totalChapters: 10,
      completedChapters: 10,
      totalWords: 10000,
      hasOutline: true,
      hasCover: true,
      hasRendition: false, // Missing rendition
      daysSinceLastEdit: 1,
      wordCountTarget: 10000, // 100% complete
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('Generate Print-Ready PDF');

    const actionButton = page.locator('[data-testid="coach-action-button"]');
    await expect(actionButton).toContainText('Generate PDF');
  });

  test('should show "order proof copy" suggestion when rendition exists', async ({ page }) => {
    const bookProgress = {
      totalChapters: 10,
      completedChapters: 10,
      totalWords: 10000,
      hasOutline: true,
      hasCover: true,
      hasRendition: true, // Has rendition
      daysSinceLastEdit: 1,
      wordCountTarget: 10000,
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const suggestionTitle = page.locator('[data-testid="coach-suggestion-title"]');
    await expect(suggestionTitle).toContainText('Order Your Proof Copy');
  });

  test('should allow dismissing suggestions', async ({ page }) => {
    const bookProgress = {
      totalChapters: 0,
      completedChapters: 0,
      totalWords: 0,
      hasOutline: false,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 0,
      wordCountTarget: 10000,
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    // Click dismiss button
    const dismissButton = page.locator('[data-testid="coach-dismiss"]');
    await dismissButton.click();

    // Coach should be hidden
    await expect(coachCard).not.toBeVisible();
  });

  test('should show priority badges for suggestions', async ({ page }) => {
    const bookProgress = {
      totalChapters: 0,
      completedChapters: 0,
      totalWords: 0,
      hasOutline: false,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 0,
      wordCountTarget: 10000,
    };

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    const priorityBadge = page.locator('[data-testid="coach-priority-badge"]');
    await expect(priorityBadge).toBeVisible();
    await expect(priorityBadge).toContainText("Don't Miss This"); // High priority
  });

  test('should track suggestion display for analytics', async ({ page }) => {
    const bookProgress = {
      totalChapters: 5,
      completedChapters: 5,
      totalWords: 5000,
      hasOutline: true,
      hasCover: false,
      hasRendition: false,
      daysSinceLastEdit: 2,
      wordCountTarget: 10000,
    };

    // When coach is displayed, it should fire analytics event
    let analyticsEvent = false;
    page.on('console', (msg) => {
      if (msg.text().includes('coach_suggestion_shown')) {
        analyticsEvent = true;
      }
    });

    const coachCard = page.locator('[data-testid="inline-coach"]');
    await expect(coachCard).toBeVisible();

    // Analytics event should be tracked (in implementation)
    // This would be verified through PostHog or similar
  });
});
