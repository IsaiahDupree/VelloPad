import { test, expect } from '@playwright/test';

test.describe('Editor Layout Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a chapter editor
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(/\/dashboard/);

    // Create a test book or navigate to existing one
    await page.goto('/books/new');
    await page.fill('input[name="title"]', 'Layout Mode Test Book');
    await page.click('button:has-text("Create Book")');

    // Wait for book creation and navigate to first chapter
    await page.waitForURL(/\/books\/[^/]+/);
    await page.click('text=Add Chapter');
    await page.fill('input[placeholder="Chapter title"]', 'Test Chapter');
    await page.click('button:has-text("Add")');
  });

  test('should toggle between Write Mode and Layout Mode', async ({ page }) => {
    // Should start in Write Mode
    await expect(page.locator('button:has-text("Write Mode")')).toHaveClass(/default/);

    // Click Layout Mode button
    await page.click('button:has-text("Layout Mode")');

    // Should switch to Layout Mode
    await expect(page.locator('button:has-text("Layout Mode")')).toHaveClass(/default/);

    // Should show page canvas
    await expect(page.locator('.bg-white.shadow-lg')).toBeVisible();

    // Switch back to Write Mode
    await page.click('button:has-text("Write Mode")');
    await expect(page.locator('button:has-text("Write Mode")')).toHaveClass(/default/);
  });

  test('should display page with margin guides', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Should show guides by default
    await expect(page.locator('text=Safe Zone')).toBeVisible();

    // Should show margin guide lines (dashed borders)
    const guides = page.locator('.border-dashed.border-blue-400');
    await expect(guides).toHaveCount(4); // top, bottom, left, right

    // Toggle guides off
    await page.click('button:has-text("Hide Guides")');
    await expect(page.locator('text=Safe Zone')).not.toBeVisible();

    // Toggle guides back on
    await page.click('button:has-text("Show Guides")');
    await expect(page.locator('text=Safe Zone')).toBeVisible();
  });

  test('should adjust margins in settings panel', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Settings panel should be visible by default
    await expect(page.locator('text=Margins')).toBeVisible();

    // Change top margin
    const topMarginInput = page.locator('input#margin-top');
    await topMarginInput.fill('1.5');
    await topMarginInput.blur();

    // Wait for auto-save
    await page.waitForTimeout(2500);

    // Should show save indicator
    await expect(page.locator('text=Saved')).toBeVisible();

    // Verify margin was saved (refresh and check)
    await page.reload();
    await page.click('button:has-text("Layout Mode")');
    const savedValue = await page.locator('input#margin-top').inputValue();
    expect(savedValue).toBe('1.5');
  });

  test('should enable and configure header', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Enable header
    const headerSwitch = page
      .locator('text=Header')
      .locator('..')
      .locator('button[role="switch"]');
    await headerSwitch.click();

    // Header content input should appear
    await expect(page.locator('input#header-content')).toBeVisible();

    // Enter header text
    await page.fill('input#header-content', 'Chapter One');

    // Header should appear in preview
    await expect(page.locator('text=Chapter One').first()).toBeVisible();

    // Change header style
    await page.click('button#header-style');
    await page.click('text=Centered');

    // Wait for auto-save
    await page.waitForTimeout(2500);
    await expect(page.locator('text=Saved')).toBeVisible();
  });

  test('should enable and configure footer', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Enable footer
    const footerSwitch = page
      .locator('text=Footer')
      .locator('..')
      .locator('button[role="switch"]');
    await footerSwitch.click();

    // Footer content input should appear
    await expect(page.locator('input#footer-content')).toBeVisible();

    // Enter footer text
    await page.fill('input#footer-content', 'Layout Mode Test Book');

    // Footer should appear in preview
    await expect(page.locator('text=Layout Mode Test Book').first()).toBeVisible();
  });

  test('should configure page numbers', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Page numbers should be enabled by default
    await expect(page.locator('text=1').last()).toBeVisible();

    // Change page number position
    await page.click('button#page-number-position');
    await page.click('text=Top Right');

    // Change page number format
    await page.click('button#page-number-format');
    await page.click('text=I, II, III');

    // Wait for auto-save
    await page.waitForTimeout(2500);
    await expect(page.locator('text=Saved')).toBeVisible();

    // Disable page numbers
    const pageNumberSwitch = page
      .locator('text=Page Numbers')
      .locator('..')
      .locator('button[role="switch"]');
    await pageNumberSwitch.click();

    // Page number should disappear
    await expect(page.locator('text=1').last()).not.toBeVisible();
  });

  test('should adjust typography settings', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Change font size
    await page.fill('input#font-size', '14');
    await page.locator('input#font-size').blur();

    // Change line spacing
    await page.click('button#line-spacing');
    await page.click('text=Double (2.0)');

    // Wait for auto-save
    await page.waitForTimeout(2500);
    await expect(page.locator('text=Saved')).toBeVisible();

    // Verify values persist
    await page.reload();
    await page.click('button:has-text("Layout Mode")');
    const fontSize = await page.locator('input#font-size').inputValue();
    expect(fontSize).toBe('14');
  });

  test('should zoom in and out', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Should start at 70% zoom
    await expect(page.locator('text=70%')).toBeVisible();

    // Zoom in
    await page.click('button:has(svg.lucide-maximize-2)');
    await expect(page.locator('text=80%')).toBeVisible();

    // Zoom out
    await page.click('button:has(svg.lucide-minimize-2)');
    await expect(page.locator('text=70%')).toBeVisible();
  });

  test('should toggle settings panel', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Settings should be visible by default
    await expect(page.locator('text=Margins')).toBeVisible();

    // Hide settings
    await page.click('button:has-text("Hide Settings")');
    await expect(page.locator('text=Margins')).not.toBeVisible();

    // Show settings again
    await page.click('button:has-text("Show Settings")');
    await expect(page.locator('text=Margins')).toBeVisible();
  });

  test('should display correct trim size in preview', async ({ page }) => {
    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Should show trim size label
    await expect(page.locator('text=6x9')).toBeVisible();
  });

  test('should preserve content when switching modes', async ({ page }) => {
    // Add content in Write Mode
    const testContent = 'This is test content for layout mode.';
    await page.click('.ProseMirror');
    await page.keyboard.type(testContent);

    // Wait for auto-save
    await page.waitForTimeout(2500);

    // Switch to Layout Mode
    await page.click('button:has-text("Layout Mode")');

    // Content should be visible in layout preview
    await expect(page.locator(`text=${testContent}`)).toBeVisible();

    // Switch back to Write Mode
    await page.click('button:has-text("Write Mode")');

    // Content should still be there
    await expect(page.locator(`text=${testContent}`)).toBeVisible();
  });
});
