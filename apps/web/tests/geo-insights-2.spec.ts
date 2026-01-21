import { test, expect } from '@playwright/test';

/**
 * [GEO-INSIGHTS-2] GEO Insights Playwright Tests
 *
 * Tests for the GEO Insights tab in the Project Insights dashboard.
 */

test.describe('GEO-INSIGHTS-2: GEO Insights Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data
    const seedResponse = await page.request.post(
      'http://localhost:3001/testkit/e2e/seed-geo-insights-2'
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

  test('GEO Insights tab appears in subnav', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights`);

    // Check that GEO Insights tab is visible
    const geoTab = page.getByRole('link', { name: 'GEO Insights' });
    await expect(geoTab).toBeVisible();
  });

  test('GEO Insights page loads with overview cards', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("GEO Insights")');

    // Check overview cards are visible
    await expect(page.getByText('Answer Ready')).toBeVisible();
    await expect(page.getByText('Total Answers')).toBeVisible();
    await expect(page.getByText('Reuse Rate')).toBeVisible();
    await expect(page.getByText('Improved Products')).toBeVisible();
  });

  test('Confidence distribution displays correctly', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights`);

    // Wait for confidence distribution section
    await page.waitForSelector('h2:has-text("Confidence Distribution")');

    // Check that High/Medium/Low labels are visible
    await expect(page.getByText(/High:/)).toBeVisible();
    await expect(page.getByText(/Medium:/)).toBeVisible();
    await expect(page.getByText(/Low:/)).toBeVisible();
  });

  test('Intent coverage shows all 5 intent types', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights`);

    // Wait for intent coverage section
    await page.waitForSelector('h2:has-text("Intent Coverage")');

    // Verify all 5 intent types are displayed
    const intentLabels = [
      'Transactional',
      'Comparative',
      'Problem/Use Case',
      'Trust Validation',
      'Informational',
    ];

    for (const label of intentLabels) {
      await expect(page.getByText(label, { exact: false })).toBeVisible();
    }
  });

  test('Navigating to GEO Insights does not trigger mutations', async ({
    page,
  }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Track network requests
    const postRequests: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
        postRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Navigate to GEO Insights
    await page.goto(`/projects/${testData.project.id}/insights/geo-insights`);
    await page.waitForSelector('h1:has-text("GEO Insights")');

    // Wait a bit for any async operations
    await page.waitForTimeout(1000);

    // Verify no mutation requests were made (except for any analytics/logging)
    const mutationRequests = postRequests.filter(
      (req) =>
        !req.includes('/testkit/') &&
        !req.includes('/analytics/') &&
        !req.includes('/log/')
    );
    expect(mutationRequests).toHaveLength(0);
  });

  test('Product GEO panel shows readiness signals', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Navigate to a product page
    await page.goto(`/projects/${testData.project.id}/products`);
    await page.waitForSelector('table');

    // Click on first product
    const firstProductRow = page.locator('table tbody tr').first();
    await firstProductRow.click();

    // Wait for product page to load
    await page.waitForSelector('h2:has-text("GEO Readiness")');

    // Scroll to GEO section
    const geoSection = page.locator('#geo-section');
    await geoSection.scrollIntoViewIfNeeded();

    // Check that Citation Confidence badge is visible
    await expect(page.getByText('Citation Confidence')).toBeVisible();
  });
});
