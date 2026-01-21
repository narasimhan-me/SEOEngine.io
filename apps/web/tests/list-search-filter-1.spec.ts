/**
 * [LIST-SEARCH-FILTER-1] Products List Search & Filter E2E Tests
 *
 * Playwright smoke tests for the Products list page search and filtering.
 *
 * Test coverage:
 * 1. Products list renders search + filter controls (by data-testid)
 * 2. Searching by product title narrows results (deterministic seeded title)
 * 3. Filtering by "Has draft pending apply" works (seeded draft product)
 * 4. URL query params update and restore state on reload
 * 5. Clearing filters restores full list
 * 6. Status filter shows only optimized vs needs_attention products
 *
 * Prerequisites:
 * - /testkit/e2e/seed-list-search-filter-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  productIds: string[];
  titles: string[];
  handles: string[];
  optimizedProductId: string;
  needsAttentionProductId: string;
  draftProductId: string;
}

/**
 * Seed test data via E2E testkit endpoint
 */
async function seedListSearchFilterData(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-list-search-filter-1`,
    { data: {} }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('LIST-SEARCH-FILTER-1: Products List Search & Filter', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedListSearchFilterData(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
    expect(seedData.titles.length).toBeGreaterThanOrEqual(3);
  });

  test('LSF-001: Products list renders search + filter controls', async ({
    page,
  }) => {
    // Programmatic login: set token in localStorage
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);

    // Assert search input by data-testid
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // Assert status filter by data-testid
    await expect(
      page.locator('[data-testid="list-controls-status"]')
    ).toBeVisible();

    // Assert has-draft filter by data-testid
    await expect(
      page.locator('[data-testid="list-controls-has-draft"]')
    ).toBeVisible();
  });

  test('LSF-002: Searching by product title narrows results', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for controls to be visible
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // All 3 seeded products should be visible initially
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).toBeVisible();
    await expect(page.getByText('Summit Backpack')).toBeVisible();

    // Enter search term and submit
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('Alpine');
    await searchInput.press('Enter');

    // Wait for URL to update with search param
    await expect(page).toHaveURL(/q=Alpine/);

    // Verify only matching product is visible
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).not.toBeVisible();
    await expect(page.getByText('Summit Backpack')).not.toBeVisible();
  });

  test('LSF-003: Filtering by "Has draft pending" works', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for controls
    await expect(
      page.locator('[data-testid="list-controls-has-draft"]')
    ).toBeVisible();

    // Select "Has draft pending" filter
    const hasDraftSelect = page.locator(
      '[data-testid="list-controls-has-draft"]'
    );
    await hasDraftSelect.selectOption('true');

    // Wait for URL to update
    await expect(page).toHaveURL(/hasDraft=true/);

    // Only the product with a pending draft should be visible (Coastal Kayak Pro)
    await expect(page.getByText('Coastal Kayak Pro')).toBeVisible();
    await expect(page.getByText('Alpine Mountain Boots')).not.toBeVisible();
    await expect(page.getByText('Summit Backpack')).not.toBeVisible();
  });

  test('LSF-004: URL query params persist across reload', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Apply search filter
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('Alpine');
    await searchInput.press('Enter');

    // Wait for URL to have search param
    await expect(page).toHaveURL(/q=Alpine/);

    // Verify filtered result
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).not.toBeVisible();

    // Reload the page
    await page.reload();

    // Wait for controls to load
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // Verify URL still has param
    await expect(page).toHaveURL(/q=Alpine/);

    // Verify filtered results are still shown
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).not.toBeVisible();
  });

  test('LSF-005: Clearing filters restores full list', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Apply search filter
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('Alpine');
    await searchInput.press('Enter');

    // Wait for filter to apply
    await expect(page).toHaveURL(/q=Alpine/);
    await expect(page.getByText('Coastal Kayak Pro')).not.toBeVisible();

    // Clear button should be visible
    const clearButton = page.locator('[data-testid="list-controls-clear"]');
    await expect(clearButton).toBeVisible();

    // Click clear
    await clearButton.click();

    // Wait for URL to clear filter params
    await expect(page).not.toHaveURL(/q=/);

    // All products should be visible again
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).toBeVisible();
    await expect(page.getByText('Summit Backpack')).toBeVisible();

    // Clear button should be hidden (no active filters)
    await expect(clearButton).not.toBeVisible();
  });

  test('LSF-006: Status filter shows only optimized vs needs attention', async ({
    page,
  }) => {
    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for controls
    await expect(
      page.locator('[data-testid="list-controls-status"]')
    ).toBeVisible();

    // Baseline: all 3 seeded products visible
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).toBeVisible();
    await expect(page.getByText('Summit Backpack')).toBeVisible();

    // Select Status dropdown → optimized
    const statusSelect = page.locator('[data-testid="list-controls-status"]');
    await statusSelect.selectOption('optimized');

    // Assert URL contains status=optimized
    await expect(page).toHaveURL(/status=optimized/);

    // Assert only optimized product visible
    await expect(page.getByText('Alpine Mountain Boots')).toBeVisible();
    await expect(page.getByText('Coastal Kayak Pro')).not.toBeVisible();
    await expect(page.getByText('Summit Backpack')).not.toBeVisible();

    // Switch Status dropdown → needs_attention
    await statusSelect.selectOption('needs_attention');

    // Assert URL contains status=needs_attention
    await expect(page).toHaveURL(/status=needs_attention/);

    // Assert only needs-attention products visible
    await expect(page.getByText('Coastal Kayak Pro')).toBeVisible();
    await expect(page.getByText('Summit Backpack')).toBeVisible();
    await expect(page.getByText('Alpine Mountain Boots')).not.toBeVisible();
  });
});
