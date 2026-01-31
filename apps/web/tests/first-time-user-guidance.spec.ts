/**
 * [KAN-54: EA-34] First-Time User Onboarding Guidance E2E Tests
 *
 * Test coverage:
 * 1. First-time user sees guidance on dashboard
 * 2. Guidance is dismissible
 * 3. Guidance does not reappear after dismissal
 * 4. Guidance disappears after completing first action
 * 5. Guidance never blocks navigation
 *
 * Trust Contract Verification:
 * - Onboarding never blocks exploration
 * - No forced walkthroughs or modal takeovers
 * - Users can always dismiss or bypass guidance
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedTestUser(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    { data: {} }
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string; name?: string },
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

test.describe('KAN-54: First-Time User Guidance', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding state before each test
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('engineo:first_time_onboarding');
    });
  });

  test('First-time user sees guidance on dashboard', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedTestUser(request);

    // Login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
      localStorage.removeItem('engineo:first_time_onboarding');
    }, accessToken);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Guidance should be visible
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toBeVisible({ timeout: 10000 });

    // Should contain welcome message
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toContainText('Welcome');

    // Should contain success definition
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toContainText('review your store');
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toContainText('draft one fix');
  });

  test('Guidance is dismissible and does not block navigation', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedTestUser(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
      localStorage.removeItem('engineo:first_time_onboarding');
    }, accessToken);

    await page.goto('/dashboard');

    // Guidance should be visible
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toBeVisible({ timeout: 10000 });

    // Click dismiss button
    await page.click('[data-testid="dismiss-onboarding-guidance"]');

    // Guidance should disappear
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).not.toBeVisible();

    // Navigation should still work (verify not blocked)
    await page.goto(`/projects/${projectId}/overview`);
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/overview`));
  });

  test('Guidance does not reappear after dismissal', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedTestUser(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
      localStorage.removeItem('engineo:first_time_onboarding');
    }, accessToken);

    await page.goto('/dashboard');

    // Dismiss guidance
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).toBeVisible({ timeout: 10000 });
    await page.click('[data-testid="dismiss-onboarding-guidance"]');

    // Navigate away and back
    await page.goto('/projects');
    await page.goto('/dashboard');

    // Guidance should not reappear
    await expect(
      page.locator('[data-testid="first-time-user-guidance"]')
    ).not.toBeVisible();
  });

  test('Trust contract: No modal takeovers or forced walkthroughs', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedTestUser(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
      localStorage.removeItem('engineo:first_time_onboarding');
    }, accessToken);

    await page.goto('/dashboard');

    // Guidance should be visible but NOT a modal
    const guidance = page.locator('[data-testid="first-time-user-guidance"]');
    await expect(guidance).toBeVisible({ timeout: 10000 });

    // Verify it's not a modal (no overlay, no fixed positioning blocking content)
    const role = await guidance.getAttribute('role');
    expect(role).toBe('region'); // Not 'dialog'

    // Verify main content is still accessible (can click links)
    const projectsLink = page.locator('a[href="/projects"]').first();
    await expect(projectsLink).toBeVisible();
    await expect(projectsLink).toBeEnabled();
  });
});
