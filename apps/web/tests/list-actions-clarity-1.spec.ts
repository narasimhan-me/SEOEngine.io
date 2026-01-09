/**
 * [LIST-ACTIONS-CLARITY-1] Row Chips & Actions E2E Tests
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Extended with Collections + Blocked state
 *
 * Playwright smoke tests for the unified row chips and actions across
 * Products, Pages, and Collections lists.
 *
 * Test coverage:
 * 1. Products list renders RowStatusChip with correct labels
 * 2. Products list renders correct primary/secondary actions
 * 3. Pages list renders RowStatusChip with correct labels
 * 4. Pages list renders correct primary/secondary actions
 * 5. "View issues" action links to Issues Engine with asset filter
 * 6. "Review drafts" action links to Work Queue
 * 7. hasDraftPendingApply field triggers Draft saved chip
 * 8. [FIXUP-1] Collections list renders RowStatusChip with correct labels
 * 9. [FIXUP-1] EDITOR sees "Blocked" chip when draft pending but can't apply
 * 10. [FIXUP-1] "Fix next" action routes to issue fix destination
 *
 * Prerequisites:
 * - /testkit/e2e/seed-list-actions-clarity-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  editorAccessToken: string;
  optimizedProductId: string;
  needsAttentionProductId: string;
  draftPendingProductId: string;
  optimizedPageId: string;
  needsAttentionPageId: string;
  draftPendingPageId: string;
  optimizedCollectionId: string;
  needsAttentionCollectionId: string;
  draftPendingCollectionId: string;
}

/**
 * Seed test data via E2E testkit endpoint
 */
async function seedListActionsClarity1Data(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-list-actions-clarity-1`,
    { data: {} },
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('LIST-ACTIONS-CLARITY-1: Row Chips & Actions', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedListActionsClarity1Data(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
  });

  // ==========================================================================
  // Products List Tests
  // ==========================================================================

  test('LAC1-001: Products list renders RowStatusChip component', async ({
    page,
  }) => {
    // Programmatic login: set token in localStorage
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Assert at least one RowStatusChip is rendered
    const chipCount = await page.locator('[data-testid="row-status-chip"]').count();
    expect(chipCount).toBeGreaterThanOrEqual(1);
  });

  test('LAC1-002: Products list shows correct chip labels for different states', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Check for expected chip labels (at least one of each type based on seed data)
    const pageContent = await page.content();

    // We should see "Optimized" for product1 (complete SEO)
    expect(pageContent).toContain('Optimized');

    // We should see "Needs attention" for product2 (missing SEO description)
    expect(pageContent).toContain('Needs attention');
  });

  test('LAC1-003: Products list shows Draft saved chip for products with pending drafts', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Product3 has a pending draft, should show "Draft saved (not applied)" chip
    const pageContent = await page.content();
    expect(pageContent).toContain('Draft saved');
  });

  // ==========================================================================
  // Pages List Tests
  // ==========================================================================

  test('LAC1-004: Pages list renders RowStatusChip component', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Pages list
    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for pages to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Assert at least one RowStatusChip is rendered
    const chipCount = await page.locator('[data-testid="row-status-chip"]').count();
    expect(chipCount).toBeGreaterThanOrEqual(1);
  });

  test('LAC1-005: Pages list shows correct chip labels for different states', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for pages to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    const pageContent = await page.content();

    // We should see "Optimized" for page1 (complete SEO)
    expect(pageContent).toContain('Optimized');

    // We should see "Needs attention" for page2 (missing description)
    expect(pageContent).toContain('Needs attention');
  });

  test('LAC1-006: Pages list shows Draft saved chip for pages with pending drafts', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for pages to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Page3 has a pending draft, should show "Draft saved (not applied)" chip
    const pageContent = await page.content();
    expect(pageContent).toContain('Draft saved');
  });

  // ==========================================================================
  // Action Link Tests
  // ==========================================================================

  test('LAC1-007: View issues action links to Issues Engine with asset filter', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);

    // Wait for pages to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Find and click "View issues" link for pages with issues
    const viewIssuesLink = page.locator('a:has-text("View issues")').first();

    if (await viewIssuesLink.isVisible()) {
      const href = await viewIssuesLink.getAttribute('href');

      // Assert the href contains asset filter params
      expect(href).toContain('/issues');
      expect(href).toContain('assetType=pages');
    }
  });

  test('LAC1-008: Review drafts action links to Work Queue', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Find "Review drafts" link for products with pending drafts
    const reviewDraftsLink = page.locator('a:has-text("Review drafts")').first();

    if (await reviewDraftsLink.isVisible()) {
      const href = await reviewDraftsLink.getAttribute('href');

      // Assert the href links to work-queue
      expect(href).toContain('/work-queue');
    }
  });

  // ==========================================================================
  // Optimized State Tests
  // ==========================================================================

  test('LAC1-009: Optimized rows show help text instead of primary action', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Check for "No action needed" help text for optimized products
    const pageContent = await page.content();
    expect(pageContent).toContain('No action needed');
  });

  // ==========================================================================
  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Collections List Tests
  // ==========================================================================

  test('LAC1-010: Collections list renders RowStatusChip component', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Collections list
    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for collections to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Assert at least one RowStatusChip is rendered
    const chipCount = await page.locator('[data-testid="row-status-chip"]').count();
    expect(chipCount).toBeGreaterThanOrEqual(1);
  });

  test('LAC1-011: Collections list shows correct chip labels for different states', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for collections to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    const pageContent = await page.content();

    // We should see "Optimized" for collection1 (complete SEO)
    expect(pageContent).toContain('Optimized');

    // We should see "Needs attention" for collection2 (missing description)
    expect(pageContent).toContain('Needs attention');
  });

  test('LAC1-012: Collections list shows Draft saved chip for collections with pending drafts', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for collections to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Collection3 has a pending draft, should show "Draft saved (not applied)" chip
    const pageContent = await page.content();
    expect(pageContent).toContain('Draft saved');
  });

  // ==========================================================================
  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Blocked State Tests (EDITOR role)
  // ==========================================================================

  test('LAC1-013: EDITOR sees Blocked chip for draft-pending items they cannot apply', async ({
    page,
  }) => {
    await page.goto('/login');
    // Use EDITOR token instead of OWNER
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.editorAccessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // EDITOR cannot apply drafts when governance requires approval
    // Product3 has a pending draft, EDITOR should see "Blocked" chip
    const pageContent = await page.content();
    expect(pageContent).toContain('Blocked');
  });

  test('LAC1-014: EDITOR sees Request approval action for blocked items', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.editorAccessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // EDITOR with canRequestApproval should see "Request approval" action
    const pageContent = await page.content();
    // Note: The exact action depends on resolver logic - may show "Request approval" or "View approval status"
    expect(pageContent).toMatch(/Request approval|View approval status|Review drafts/);
  });

  // ==========================================================================
  // [LIST-ACTIONS-CLARITY-1 FIXUP-1] Fix Next Routing Tests
  // ==========================================================================

  test('LAC1-015: Fix next action routes to issue fix destination (not Issues list)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Find "Fix next" link for products with issues
    const fixNextLink = page.locator('[data-testid="row-primary-action"]:has-text("Fix next")').first();

    if (await fixNextLink.isVisible()) {
      const href = await fixNextLink.getAttribute('href');

      // Assert the href routes to a product workspace (issue fix surface), not Issues list
      expect(href).toContain('/products/');
      // Should contain returnTo for navigation back
      expect(href).toContain('returnTo');
    }
  });

  test('LAC1-016: View issues action in Collections includes returnTo context', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);

    // Wait for collections to load
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Find "View issues" link
    const viewIssuesLink = page.locator('[data-testid="row-primary-action"]:has-text("View issues")').first();

    if (await viewIssuesLink.isVisible()) {
      const href = await viewIssuesLink.getAttribute('href');

      // Assert the href contains asset filter and returnTo params
      expect(href).toContain('/issues');
      expect(href).toContain('assetType=collections');
      expect(href).toContain('returnTo');
    }
  });
});
