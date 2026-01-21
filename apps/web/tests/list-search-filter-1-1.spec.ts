/**
 * [LIST-SEARCH-FILTER-1.1] Pages & Collections List Search & Filter E2E Tests
 *
 * Playwright smoke tests for the Pages and Collections list pages search and filtering.
 *
 * Test coverage:
 * 1. Pages list renders search + filter controls (by data-testid)
 * 2. Collections list renders search + filter controls (by data-testid)
 * 3. Searching by page title narrows results (deterministic seeded title)
 * 4. Searching by collection title narrows results (deterministic seeded title)
 * 5. Status filter shows only optimized vs needs_attention pages
 * 6. Status filter shows only optimized vs needs_attention collections
 * 7. Clearing filters restores full list
 * 8. URL query params update and restore state on reload
 *
 * Prerequisites:
 * - /testkit/e2e/seed-list-search-filter-1-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  pageIds: string[];
  collectionIds: string[];
  pageTitles: string[];
  collectionTitles: string[];
  optimizedPageId: string;
  needsAttentionPageId: string;
  optimizedCollectionId: string;
  needsAttentionCollectionId: string;
  draftPageId: string;
  draftCollectionId: string;
}

/**
 * Seed test data via E2E testkit endpoint
 */
async function seedListSearchFilter11Data(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-list-search-filter-1-1`,
    { data: {} }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('LIST-SEARCH-FILTER-1.1: Pages & Collections List Search & Filter', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedListSearchFilter11Data(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
    expect(seedData.pageTitles.length).toBeGreaterThanOrEqual(3);
    expect(seedData.collectionTitles.length).toBeGreaterThanOrEqual(3);
  });

  // ==========================================================================
  // Pages List Tests
  // ==========================================================================

  test('LSF11-001: Pages list renders search + filter controls', async ({
    page,
  }) => {
    // Programmatic login: set token in localStorage
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Pages list
    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

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

  test('LSF11-002: Searching by page title narrows results', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for controls to be visible
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // All 3 seeded pages should be visible initially (by path)
    await expect(page.getByText('/pages/about-us')).toBeVisible();
    await expect(page.getByText('/pages/contact')).toBeVisible();
    await expect(page.getByText('/pages/faq')).toBeVisible();

    // Enter search term and submit
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('About');
    await searchInput.press('Enter');

    // Wait for URL to update with search param
    await expect(page).toHaveURL(/q=About/);

    // Verify only matching page is visible
    await expect(page.getByText('/pages/about-us')).toBeVisible();
    await expect(page.getByText('/pages/contact')).not.toBeVisible();
    await expect(page.getByText('/pages/faq')).not.toBeVisible();
  });

  test('LSF11-003: Status filter shows only optimized vs needs_attention pages', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for controls
    await expect(
      page.locator('[data-testid="list-controls-status"]')
    ).toBeVisible();

    // Baseline: all 3 seeded pages visible
    await expect(page.getByText('/pages/about-us')).toBeVisible();
    await expect(page.getByText('/pages/contact')).toBeVisible();
    await expect(page.getByText('/pages/faq')).toBeVisible();

    // Select Status dropdown → optimized
    const statusSelect = page.locator('[data-testid="list-controls-status"]');
    await statusSelect.selectOption('optimized');

    // Assert URL contains status=optimized
    await expect(page).toHaveURL(/status=optimized/);

    // Assert only optimized page visible (about-us has complete SEO)
    await expect(page.getByText('/pages/about-us')).toBeVisible();
    await expect(page.getByText('/pages/contact')).not.toBeVisible();
    await expect(page.getByText('/pages/faq')).not.toBeVisible();

    // Switch Status dropdown → needs_attention
    await statusSelect.selectOption('needs_attention');

    // Assert URL contains status=needs_attention
    await expect(page).toHaveURL(/status=needs_attention/);

    // Assert only needs-attention pages visible
    await expect(page.getByText('/pages/contact')).toBeVisible();
    await expect(page.getByText('/pages/faq')).toBeVisible();
    await expect(page.getByText('/pages/about-us')).not.toBeVisible();
  });

  // ==========================================================================
  // Collections List Tests
  // ==========================================================================

  test('LSF11-004: Collections list renders search + filter controls', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Collections list
    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

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

  test('LSF11-005: Searching by collection title narrows results', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for controls to be visible
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // All 3 seeded collections should be visible initially (by handle in code tag)
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).toBeVisible();
    await expect(page.getByText('footwear')).toBeVisible();

    // Enter search term and submit
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('summer');
    await searchInput.press('Enter');

    // Wait for URL to update with search param
    await expect(page).toHaveURL(/q=summer/);

    // Verify only matching collection is visible
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).not.toBeVisible();
    await expect(page.getByText('footwear')).not.toBeVisible();
  });

  test('LSF11-006: Status filter shows only optimized vs needs_attention collections', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for controls
    await expect(
      page.locator('[data-testid="list-controls-status"]')
    ).toBeVisible();

    // Baseline: all 3 seeded collections visible
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).toBeVisible();
    await expect(page.getByText('footwear')).toBeVisible();

    // Select Status dropdown → optimized
    const statusSelect = page.locator('[data-testid="list-controls-status"]');
    await statusSelect.selectOption('optimized');

    // Assert URL contains status=optimized
    await expect(page).toHaveURL(/status=optimized/);

    // Assert only optimized collection visible (summer-sale has complete SEO)
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).not.toBeVisible();
    await expect(page.getByText('footwear')).not.toBeVisible();

    // Switch Status dropdown → needs_attention
    await statusSelect.selectOption('needs_attention');

    // Assert URL contains status=needs_attention
    await expect(page).toHaveURL(/status=needs_attention/);

    // Assert only needs-attention collections visible
    await expect(page.getByText('new-arrivals')).toBeVisible();
    await expect(page.getByText('footwear')).toBeVisible();
    await expect(page.getByText('summer-sale')).not.toBeVisible();
  });

  // ==========================================================================
  // Shared Behavior Tests
  // ==========================================================================

  test('LSF11-007: Clearing filters restores full Pages list', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Apply search filter
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('About');
    await searchInput.press('Enter');

    // Wait for filter to apply
    await expect(page).toHaveURL(/q=About/);
    await expect(page.getByText('/pages/contact')).not.toBeVisible();

    // Clear button should be visible
    const clearButton = page.locator('[data-testid="list-controls-clear"]');
    await expect(clearButton).toBeVisible();

    // Click clear
    await clearButton.click();

    // Wait for URL to clear filter params
    await expect(page).not.toHaveURL(/q=/);

    // All pages should be visible again
    await expect(page.getByText('/pages/about-us')).toBeVisible();
    await expect(page.getByText('/pages/contact')).toBeVisible();
    await expect(page.getByText('/pages/faq')).toBeVisible();

    // Clear button should be hidden (no active filters)
    await expect(clearButton).not.toBeVisible();
  });

  test('LSF11-008: URL query params persist across reload for Collections', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Apply search filter
    const searchInput = page.locator('[data-testid="list-controls-search"]');
    await searchInput.fill('summer');
    await searchInput.press('Enter');

    // Wait for URL to have search param
    await expect(page).toHaveURL(/q=summer/);

    // Verify filtered result
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).not.toBeVisible();

    // Reload the page
    await page.reload();

    // Wait for controls to load
    await expect(
      page.locator('[data-testid="list-controls-search"]')
    ).toBeVisible();

    // Verify URL still has param
    await expect(page).toHaveURL(/q=summer/);

    // Verify filtered results are still shown
    await expect(page.getByText('summer-sale')).toBeVisible();
    await expect(page.getByText('new-arrivals')).not.toBeVisible();
  });
});
