import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flow
 * BS-101: Auth + Workspace Creation
 * TEST-002: Auth E2E Tests
 */

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');

    // Check page title
    await expect(page).toHaveTitle(/Login.*VelloPad/);

    // Check heading
    const heading = page.getByRole('heading', { name: /Welcome back/i });
    await expect(heading).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check signup link
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/auth/signup');

    // Check page title
    await expect(page).toHaveTitle(/Sign Up.*VelloPad/);

    // Check heading
    const heading = page.getByRole('heading', { name: /Create an account/i });
    await expect(heading).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Check login link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('navigation between login and signup pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');

    // Click signup link
    await page.getByRole('link', { name: /sign up/i }).click();

    // Should be on signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.getByRole('heading', { name: /Create an account/i })).toBeVisible();

    // Click login link
    await page.getByRole('link', { name: /sign in/i }).click();

    // Should be back on login page
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('login form validation - empty fields', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check that we're still on the login page (form validation prevented submission)
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('signup form validation - empty fields', async ({ page }) => {
    await page.goto('/auth/signup');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /create account/i }).click();

    // Check that we're still on the signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('signup form validation - password too short', async ({ page }) => {
    await page.goto('/auth/signup');

    // Fill in form with short password
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123'); // Too short

    // Browser validation should prevent submission
    await page.getByRole('button', { name: /create account/i }).click();

    // Should still be on signup page
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Visual Regression', () => {
  test('login page screenshot', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });

  test('signup page screenshot', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
    });
  });
});
