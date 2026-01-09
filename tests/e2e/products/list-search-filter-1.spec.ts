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
 *
 * Prerequisites:
 * - Playwright installed and configured
 * - /testkit/e2e/seed-list-search-filter-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect, Page } from '@playwright/test';

// Base URLs from environment or defaults
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

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
 * Test helper: Seed test data via E2E testkit endpoint
 */
async function seedListSearchFilterData(): Promise<SeedResponse> {
  const response = await fetch(`${API_URL}/testkit/e2e/seed-list-search-filter-1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to seed test data: ${response.status}`);
  }

  return response.json();
}

/**
 * Test helper: Login and store auth token in localStorage
 */
async function loginWithToken(page: Page, accessToken: string) {
  // Navigate to app first
  await page.goto(BASE_URL);

  // Set auth token in localStorage (matches existing auth pattern)
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, accessToken);
}

/**
 * Test helper: Navigate to Products list page
 */
async function navigateToProductsList(page: Page, projectId: string) {
  await page.goto(`${BASE_URL}/projects/${projectId}/products`);
  // Wait for the page to load
  await page.waitForSelector('[data-testid="list-controls-search"]', { timeout: 10000 });
}

test.describe('LIST-SEARCH-FILTER-1 – Products List Search & Filter', () => {
  let seedData: SeedResponse;

  test.beforeAll(async () => {
    // Seed test data once for all tests in this suite
    seedData = await seedListSearchFilterData();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginWithToken(page, seedData.accessToken);
  });

  test.describe('Controls Rendering', () => {
    test('Products list renders search + filter controls', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Assert search input by data-testid
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await expect(searchInput).toBeVisible();

      // Assert status filter by data-testid
      const statusFilter = page.locator('[data-testid="list-controls-status"]');
      await expect(statusFilter).toBeVisible();

      // Assert has-draft filter by data-testid
      const hasDraftFilter = page.locator('[data-testid="list-controls-has-draft"]');
      await expect(hasDraftFilter).toBeVisible();
    });
  });

  test.describe('Search Functionality', () => {
    test('Searching by product title narrows results', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Get seeded title for search (first product: "Alpine Mountain Boots")
      const searchTerm = 'Alpine';

      // Enter search term
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill(searchTerm);
      await searchInput.press('Enter');

      // Wait for results to update
      await page.waitForTimeout(500);

      // Verify URL contains search param
      await expect(page).toHaveURL(new RegExp(`q=${searchTerm}`));

      // Verify only matching product is visible
      await expect(page.locator('text=Alpine Mountain Boots')).toBeVisible();
      // Other products should not be visible
      await expect(page.locator('text=Coastal Kayak Pro')).not.toBeVisible();
      await expect(page.locator('text=Summit Backpack')).not.toBeVisible();
    });

    test('Searching by product handle works', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Search by handle (second product: "coastal-kayak-pro")
      const searchTerm = 'coastal-kayak';

      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill(searchTerm);
      await searchInput.press('Enter');

      await page.waitForTimeout(500);

      // Verify matching product is visible
      await expect(page.locator('text=Coastal Kayak Pro')).toBeVisible();
      // Other products should not be visible
      await expect(page.locator('text=Alpine Mountain Boots')).not.toBeVisible();
    });
  });

  test.describe('Status Filter', () => {
    test('Filtering by status=optimized shows only optimized products', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Click status filter and select "Optimized"
      const statusFilter = page.locator('[data-testid="list-controls-status"]');
      await statusFilter.click();
      await page.locator('text=Optimized').click();

      await page.waitForTimeout(500);

      // Verify URL contains status param
      await expect(page).toHaveURL(/status=optimized/);

      // Only Alpine Mountain Boots should be visible (the optimized product)
      await expect(page.locator('text=Alpine Mountain Boots')).toBeVisible();
      // Needs attention products should not be visible
      await expect(page.locator('text=Coastal Kayak Pro')).not.toBeVisible();
      await expect(page.locator('text=Summit Backpack')).not.toBeVisible();
    });

    test('Filtering by status=needs_attention shows only products needing attention', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      const statusFilter = page.locator('[data-testid="list-controls-status"]');
      await statusFilter.click();
      await page.locator('text=Needs attention').click();

      await page.waitForTimeout(500);

      await expect(page).toHaveURL(/status=needs_attention/);

      // Products with incomplete SEO should be visible
      await expect(page.locator('text=Coastal Kayak Pro')).toBeVisible();
      await expect(page.locator('text=Summit Backpack')).toBeVisible();
      // Optimized product should not be visible
      await expect(page.locator('text=Alpine Mountain Boots')).not.toBeVisible();
    });
  });

  test.describe('Has Draft Filter', () => {
    test('Filtering by "Has draft pending apply" works', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Click has-draft filter and select "Has draft pending"
      const hasDraftFilter = page.locator('[data-testid="list-controls-has-draft"]');
      await hasDraftFilter.click();
      await page.locator('text=Has draft pending').click();

      await page.waitForTimeout(500);

      // Verify URL contains hasDraft param
      await expect(page).toHaveURL(/hasDraft=true/);

      // Only the product with a pending draft should be visible (Coastal Kayak Pro)
      await expect(page.locator('text=Coastal Kayak Pro')).toBeVisible();
      // Other products should not be visible
      await expect(page.locator('text=Alpine Mountain Boots')).not.toBeVisible();
      await expect(page.locator('text=Summit Backpack')).not.toBeVisible();
    });
  });

  test.describe('URL State Persistence', () => {
    test('URL query params update and restore state on reload', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Apply a search filter
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill('Alpine');
      await searchInput.press('Enter');

      await page.waitForTimeout(500);

      // Verify URL has the search param
      const currentUrl = page.url();
      expect(currentUrl).toContain('q=Alpine');

      // Reload the page
      await page.reload();

      // Wait for controls to load
      await page.waitForSelector('[data-testid="list-controls-search"]', { timeout: 10000 });

      // Verify search input still has the value
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('Alpine');

      // Verify filtered results are still shown
      await expect(page.locator('text=Alpine Mountain Boots')).toBeVisible();
      await expect(page.locator('text=Coastal Kayak Pro')).not.toBeVisible();
    });

    test('Multiple filters persist in URL', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Apply search filter
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill('Kayak');
      await searchInput.press('Enter');

      await page.waitForTimeout(300);

      // Apply status filter
      const statusFilter = page.locator('[data-testid="list-controls-status"]');
      await statusFilter.click();
      await page.locator('text=Needs attention').click();

      await page.waitForTimeout(300);

      // Verify URL has both params
      const currentUrl = page.url();
      expect(currentUrl).toContain('q=Kayak');
      expect(currentUrl).toContain('status=needs_attention');
    });
  });

  test.describe('Clear Filters', () => {
    test('Clearing filters restores full list', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Apply a filter first
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill('Alpine');
      await searchInput.press('Enter');

      await page.waitForTimeout(500);

      // Verify only one product visible
      await expect(page.locator('text=Alpine Mountain Boots')).toBeVisible();
      await expect(page.locator('text=Coastal Kayak Pro')).not.toBeVisible();

      // Clear filters using the clear button
      const clearButton = page.locator('[data-testid="list-controls-clear"]');
      await expect(clearButton).toBeVisible();
      await clearButton.click();

      await page.waitForTimeout(500);

      // Verify all products are visible again
      await expect(page.locator('text=Alpine Mountain Boots')).toBeVisible();
      await expect(page.locator('text=Coastal Kayak Pro')).toBeVisible();
      await expect(page.locator('text=Summit Backpack')).toBeVisible();

      // Verify URL no longer has filter params
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('q=');
      expect(currentUrl).not.toContain('status=');
      expect(currentUrl).not.toContain('hasDraft=');
    });
  });

  test.describe('Empty State', () => {
    test('Filtered empty state shows appropriate message', async ({ page }) => {
      await navigateToProductsList(page, seedData.projectId);

      // Search for something that doesn't exist
      const searchInput = page.locator('[data-testid="list-controls-search"]');
      await searchInput.fill('NonexistentProductXYZ');
      await searchInput.press('Enter');

      await page.waitForTimeout(500);

      // Verify empty state message
      await expect(page.locator('text=No products match your filters.')).toBeVisible();

      // Verify clear filters link is shown
      await expect(page.locator('text=Clear filters')).toBeVisible();
    });
  });
});
