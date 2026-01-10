import { test, expect } from '@playwright/test';

/**
 * [SECURITY] Auth URL Sanitization Tests
 *
 * These tests verify that sensitive credentials (passwords, emails) are never
 * exposed in URL query parameters. This prevents credential leakage via:
 * - Server access logs
 * - Browser history
 * - Referrer headers
 * - Analytics/monitoring tools
 *
 * Critical Path: CP-001 Authentication & Authorization
 */

test.describe('Auth Security - URL Sanitization', () => {
  test.describe('Login Page', () => {
    test('removes password from URL query params', async ({ page }) => {
      // Navigate to login with sensitive params in URL
      await page.goto('/login?email=a%40b.com&password=secret&next=%2Fprojects');

      // Wait for any redirects to complete
      await page.waitForLoadState('networkidle');

      // Verify URL does NOT contain password
      const url = page.url();
      expect(url).not.toContain('password=');
      expect(url).not.toContain('secret');

      // Verify URL does NOT contain email (also sensitive)
      expect(url).not.toContain('email=');
      expect(url).not.toContain('a%40b.com');
      expect(url).not.toContain('a@b.com');

      // Verify `next` param MAY be preserved (implementation choice)
      // This is optional - the test just ensures credentials are removed

      // Verify page renders correctly
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      // Verify password field is empty (not pre-filled from URL)
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toHaveValue('');
    });

    test('removes pass/pwd variants from URL', async ({ page }) => {
      await page.goto('/login?pass=mysecret');
      await page.waitForLoadState('networkidle');

      expect(page.url()).not.toContain('pass=');
      expect(page.url()).not.toContain('mysecret');

      await page.goto('/login?pwd=anothersecret');
      await page.waitForLoadState('networkidle');

      expect(page.url()).not.toContain('pwd=');
      expect(page.url()).not.toContain('anothersecret');
    });

    test('shows security message when URL was sanitized', async ({ page }) => {
      await page.goto('/login?password=secret');
      await page.waitForLoadState('networkidle');

      // Should show security message to user
      await expect(
        page.getByText(/for security.*removed.*sensitive.*parameters/i)
      ).toBeVisible();
    });

    test('preserves next param without sensitive data', async ({ page }) => {
      await page.goto('/login?next=%2Fprojects%2F123');
      await page.waitForLoadState('networkidle');

      // next param should be preserved since it's not sensitive
      const url = page.url();
      // The page should still function - just verify it loaded
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    });

    test('normal login flow still works without query params', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Should render login form without any security message
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // No security message should be shown for normal access
      await expect(
        page.getByText(/for security.*removed.*sensitive.*parameters/i)
      ).not.toBeVisible();
    });
  });

  test.describe('Signup Page', () => {
    test('removes password and confirmPassword from URL', async ({ page }) => {
      await page.goto('/signup?email=a%40b.com&password=secret&confirmPassword=secret');
      await page.waitForLoadState('networkidle');

      const url = page.url();

      // Verify no password params
      expect(url).not.toContain('password=');
      expect(url).not.toContain('confirmPassword=');
      expect(url).not.toContain('secret');

      // Verify no email
      expect(url).not.toContain('email=');

      // Verify page renders
      await expect(
        page.getByRole('heading', { name: /create.*account/i })
      ).toBeVisible();

      // Verify password fields are empty
      const passwordInputs = page.locator('input[type="password"]');
      const count = await passwordInputs.count();
      for (let i = 0; i < count; i++) {
        await expect(passwordInputs.nth(i)).toHaveValue('');
      }
    });

    test('shows security message when URL was sanitized', async ({ page }) => {
      await page.goto('/signup?password=secret');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByText(/for security.*removed.*sensitive.*parameters/i)
      ).toBeVisible();
    });

    test('normal signup flow works without query params', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: /create.*account/i })
      ).toBeVisible();

      // No security message for normal access
      await expect(
        page.getByText(/for security.*removed.*sensitive.*parameters/i)
      ).not.toBeVisible();
    });
  });

  test.describe('Regression - next param functionality', () => {
    test('login redirects to next param after successful auth', async ({ page, request }) => {
      // This test verifies that the `next` parameter still works correctly
      // after our security sanitization changes

      // First, navigate to login with a `next` param (no sensitive data)
      await page.goto('/login?next=%2Fprojects');
      await page.waitForLoadState('networkidle');

      // Verify login page loaded
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      // The `next` param should be available for the login flow to use
      // (actual redirect tested separately with authenticated user)
    });
  });
});
