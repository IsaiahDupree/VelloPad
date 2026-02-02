import { test, expect } from '@playwright/test';

test.describe('AI Sidekick Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a chapter editor
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(/\/dashboard/);

    // Navigate to an existing book or create one
    await page.goto('/books/new');
    await page.fill('input[name="title"]', 'AI Sidekick Test Book');
    await page.click('button:has-text("Create Book")');

    // Wait for book creation and navigate to first chapter
    await page.waitForURL(/\/books\/[^/]+/);
    await page.click('text=Add Chapter');
    await page.fill('input[placeholder="Chapter title"]', 'Test Chapter');
    await page.click('button:has-text("Add")');

    // Add some test content
    await page.click('.ProseMirror');
    await page.keyboard.type('This is a test paragraph for AI assistance features.');

    // Wait for auto-save
    await page.waitForTimeout(2500);
  });

  test('should toggle AI Assistant panel', async ({ page }) => {
    // AI panel should be hidden by default
    await expect(page.locator('text=AI Writing Assistant')).not.toBeVisible();

    // Click Show AI Assistant button
    await page.click('button:has-text("Show AI Assistant")');

    // AI panel should be visible
    await expect(page.locator('text=AI Writing Assistant')).toBeVisible();

    // Should show quick actions tab by default
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=Rewrite & Improve')).toBeVisible();

    // Hide AI Assistant
    await page.click('button:has-text("Hide AI Assistant")');
    await expect(page.locator('text=AI Writing Assistant')).not.toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Verify all quick action buttons are present
    await expect(page.locator('button:has-text("Rewrite")')).toBeVisible();
    await expect(page.locator('button:has-text("Improve Writing")')).toBeVisible();
    await expect(page.locator('button:has-text("Make Shorter")')).toBeVisible();
    await expect(page.locator('button:has-text("Make Longer")')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Outline")')).toBeVisible();
    await expect(page.locator('button:has-text("Suggest Titles")')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Click Custom Prompt tab
    await page.click('button[role="tab"]:has-text("Custom Prompt")');

    // Should show custom prompt interface
    await expect(page.locator('textarea[placeholder*="what you want"]')).toBeVisible();
    await expect(page.locator('button:has-text("Generate")')).toBeVisible();

    // Switch back to Quick Actions
    await page.click('button[role="tab"]:has-text("Quick Actions")');
    await expect(page.locator('text=Rewrite & Improve')).toBeVisible();
  });

  test('should handle rewrite action', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Click Rewrite button
    await page.click('button:has-text("Rewrite")');

    // Should show loading state
    await expect(page.locator('text=Generating AI suggestion...')).toBeVisible();

    // Wait for AI response (mock or real)
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Result panel should be visible
    await expect(page.locator('text=AI Suggestion')).toBeVisible();
    await expect(page.locator('button:has-text("Apply")')).toBeVisible();
    await expect(page.locator('button:has-text("Discard")')).toBeVisible();
  });

  test('should apply AI suggestion to content', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Click Improve Writing button
    await page.click('button:has-text("Improve Writing")');

    // Wait for AI response
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Click Apply button
    await page.click('button:has-text("Apply")');

    // Should show success toast
    await expect(page.locator('text=Applied')).toBeVisible();

    // Result panel should disappear
    await expect(page.locator('text=AI Suggestion')).not.toBeVisible();
  });

  test('should discard AI suggestion', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Generate suggestion
    await page.click('button:has-text("Make Shorter")');

    // Wait for result
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Click Discard
    await page.click('button:has-text("Discard")');

    // Result panel should disappear
    await expect(page.locator('text=AI Suggestion')).not.toBeVisible();
  });

  test('should copy AI suggestion to clipboard', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Generate suggestion
    await page.click('button:has-text("Rewrite")');

    // Wait for result
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Click copy button
    await page.click('button:has(svg.lucide-copy)');

    // Should show success toast
    await expect(page.locator('text=Copied')).toBeVisible();
  });

  test('should handle custom prompt', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Switch to Custom Prompt tab
    await page.click('button[role="tab"]:has-text("Custom Prompt")');

    // Enter custom prompt
    await page.fill('textarea[placeholder*="what you want"]', 'Make this more dramatic');

    // Generate button should be enabled
    await expect(page.locator('button:has-text("Generate")')).toBeEnabled();

    // Click Generate
    await page.click('button:has-text("Generate")');

    // Should show loading
    await expect(page.locator('text=Processing...')).toBeVisible();

    // Wait for result
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Should show result
    await expect(page.locator('text=AI Suggestion')).toBeVisible();
  });

  test('should disable generate button when prompt is empty', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Switch to Custom Prompt tab
    await page.click('button[role="tab"]:has-text("Custom Prompt")');

    // Generate button should be disabled with empty prompt
    await expect(page.locator('button:has-text("Generate")')).toBeDisabled();

    // Type something
    await page.fill('textarea[placeholder*="what you want"]', 'test');

    // Should be enabled now
    await expect(page.locator('button:has-text("Generate")')).toBeEnabled();
  });

  test('should show context message based on selection', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // No selection - should show "use actions on full content"
    await expect(
      page.locator('text=Select text or use actions on full content')
    ).toBeVisible();

    // Select some text
    await page.click('.ProseMirror');
    await page.keyboard.press('Control+A');

    // Should show "Actions will apply to selected text"
    await expect(page.locator('text=Actions will apply to selected text')).toBeVisible();
  });

  test('should generate outline from content', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Click Generate Outline
    await page.click('button:has-text("Generate Outline")');

    // Wait for result
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Result should contain outline structure
    await expect(page.locator('text=AI Suggestion')).toBeVisible();
  });

  test('should generate title suggestions', async ({ page }) => {
    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Click Suggest Titles
    await page.click('button:has-text("Suggest Titles")');

    // Wait for result
    await page.waitForSelector('text=AI Suggestion', { timeout: 10000 });

    // Result should contain title suggestions
    await expect(page.locator('text=AI Suggestion')).toBeVisible();
  });

  test('should show error when no content is present', async ({ page }) => {
    // Create a new chapter without content
    await page.goto('/books/new');
    await page.fill('input[name="title"]', 'Empty Chapter Test');
    await page.click('button:has-text("Create Book")');
    await page.waitForURL(/\/books\/[^/]+/);
    await page.click('text=Add Chapter');
    await page.fill('input[placeholder="Chapter title"]', 'Empty Chapter');
    await page.click('button:has-text("Add")');

    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Try to use AI action with no content
    await page.click('button:has-text("Rewrite")');

    // Should show error toast
    await expect(page.locator('text=No content')).toBeVisible();
    await expect(page.locator('text=Please write some content first')).toBeVisible();
  });

  test('should preserve sidebar when AI panel is hidden', async ({ page }) => {
    // Sidebar should be visible by default
    await expect(page.locator('text=Word Count')).toBeVisible();

    // Show AI Assistant
    await page.click('button:has-text("Show AI Assistant")');

    // Sidebar should be hidden when AI is shown
    await expect(page.locator('text=Word Count')).not.toBeVisible();
    await expect(page.locator('text=AI Writing Assistant')).toBeVisible();

    // Hide AI Assistant
    await page.click('button:has-text("Hide AI Assistant")');

    // Sidebar should be visible again
    await expect(page.locator('text=Word Count')).toBeVisible();
  });
});
