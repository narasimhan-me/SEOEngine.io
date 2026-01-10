import { test, expect } from '@playwright/test';

/**
 * [GEO-EXPORT-1] GEO Report Export Playwright Tests
 *
 * Tests for the GEO report export and share link features.
 */

test.describe('GEO-EXPORT-1: GEO Report Export', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data
    const seedResponse = await page.request.post(
      'http://localhost:3001/testkit/e2e/seed-geo-insights-2',
    );
    const seedData = await seedResponse.json();

    // Login with seeded user
    await page.goto('/login');
    await page.fill('input[name="email"]', seedData.user.email);
    await page.fill('input[name="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(/\/projects/);

    // Store project info for later use
    await page.evaluate((data) => {
      (window as any).__testData = data;
    }, seedData);
  });

  test('Export Report button appears on GEO Insights page', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("GEO Insights")');

    // Check for Export Report button
    const exportButton = page.getByRole('link', { name: /Export Report/i });
    await expect(exportButton).toBeVisible();
  });

  test('Export page loads with report data', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights/export`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    // Verify report sections are visible
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Intent Coverage')).toBeVisible();
    await expect(page.getByText(/Attribution Readiness/i)).toBeVisible();

    // Verify disclaimer is present
    await expect(
      page.getByText(/internal content readiness signals/i),
    ).toBeVisible();
  });

  test('Print/Save PDF button is visible', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights/export`);

    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    const printButton = page.getByRole('button', { name: /Print.*PDF/i });
    await expect(printButton).toBeVisible();
  });

  test('Create Share Link button creates a new share link', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights/export`);

    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    // Click create share link button
    const createButton = page.getByRole('button', { name: /Create Share Link/i });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for share link to appear
    await page.waitForSelector('text=Share Links');
    await expect(page.getByText(/ACTIVE/)).toBeVisible();
  });

  test('Share link can be copied and revoked', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights/export`);

    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    // Create a share link first
    const createButton = page.getByRole('button', { name: /Create Share Link/i });
    await createButton.click();

    // Wait for share link to appear
    await page.waitForSelector('text=Share Links');

    // Check copy button exists
    const copyButton = page.getByRole('button', { name: /Copy/i });
    await expect(copyButton).toBeVisible();

    // Check revoke button exists
    const revokeButton = page.getByRole('button', { name: /Revoke/i });
    await expect(revokeButton).toBeVisible();
  });

  test('Navigating to export page does not trigger mutations', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Track network requests
    const mutationRequests: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
        mutationRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Navigate to export page
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights/export`);
    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Verify no mutation requests were made (except for any analytics/logging)
    const unexpectedMutations = mutationRequests.filter(
      (req) =>
        !req.includes('/testkit/') &&
        !req.includes('/analytics/') &&
        !req.includes('/log/'),
    );
    expect(unexpectedMutations).toHaveLength(0);
  });
});

test.describe('GEO-EXPORT-1: Public Share View', () => {
  test('Public share view shows error for invalid token', async ({ page }) => {
    await page.goto('/share/geo-report/invalid-token-xyz');

    // Should show not found state
    await expect(page.getByText(/Report Not Found/i)).toBeVisible();
  });

  test('Public share view displays read-only badge and disclaimer', async ({ page }) => {
    // First create a share link
    const seedResponse = await page.request.post(
      'http://localhost:3001/testkit/e2e/seed-geo-insights-2',
    );
    const seedData = await seedResponse.json();

    // Login and create share link
    await page.goto('/login');
    await page.fill('input[name="email"]', seedData.user.email);
    await page.fill('input[name="password"]', 'test-password-123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/projects/);

    await page.goto(`/projects/${seedData.project.id}/insights/geo-insights/export`);
    await page.waitForSelector('h1:has-text("GEO Readiness Report")');

    // Create share link
    await page.getByRole('button', { name: /Create Share Link/i }).click();
    await page.waitForSelector('text=Share Links');

    // Get the share URL
    const shareUrlElement = await page.locator('.truncate').first();
    const shareUrl = await shareUrlElement.textContent();

    // Navigate to share view
    await page.goto(shareUrl!);

    // Should show read-only badge
    await expect(page.getByText(/Read-only/i)).toBeVisible();

    // Should show disclaimer
    await expect(
      page.getByText(/internal content readiness signals/i),
    ).toBeVisible();
  });
});
