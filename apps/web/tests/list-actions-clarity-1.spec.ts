/**
 * [LIST-ACTIONS-CLARITY-1] Row Chips & Actions E2E Tests
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Extended with Collections + Blocked state
 * [LIST-ACTIONS-CLARITY-1 FIXUP-2] Hardened with row-scoped assertions using seeded titles
 *
 * Playwright smoke tests for the unified row chips and actions across
 * Products, Pages, and Collections lists.
 *
 * Test coverage:
 * 1. Products list renders RowStatusChip with correct labels (row-scoped)
 * 2. Products list renders correct primary/secondary actions (row-scoped)
 * 3. Pages list renders RowStatusChip with correct labels (row-scoped)
 * 4. Pages list renders correct primary/secondary actions (row-scoped)
 * 5. "View issues" action navigates to Issues Engine with asset filter + banner
 * 6. "Review drafts" action links to Work Queue
 * 7. hasDraftPendingApply field triggers Draft saved chip
 * 8. [FIXUP-1] Collections list renders RowStatusChip with correct labels
 * 9. [FIXUP-1] EDITOR sees "Blocked" chip when draft pending but can't apply
 * 10. [FIXUP-1] "Fix next" action routes to issue fix destination
 * 11. [FIXUP-2] No "Apply" action appears on any list row
 *
 * Prerequisites:
 * - /testkit/e2e/seed-list-actions-clarity-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

// Seeded titles from e2e-testkit.controller.ts seed-list-actions-clarity-1
const SEEDED_TITLES = {
  products: {
    optimized: 'Optimized Product - Complete SEO',
    needsAttention: 'Product Missing SEO Description',
    draftPending: 'Product With Pending Draft',
  },
  pages: {
    optimized: 'Optimized Page - Everything You Need to Know',
    needsAttention: 'Page Needs Attention - Missing Description',
    draftPending: 'Short', // Short title triggers needs attention + has draft
  },
  collections: {
    optimized: 'Optimized Collection - Premium Products Selection',
    needsAttention: 'Collection Needs Attention - Missing Description',
    draftPending: 'Short', // Short title triggers needs attention + has draft
  },
};

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

/**
 * Helper: Get a row locator by title text (scoped to table rows containing the title)
 */
function getRowByTitle(page: any, title: string) {
  // Find the row that contains the title text
  return page.locator(`tr:has-text("${title}"), div[class*="row"]:has-text("${title}")`).first();
}

test.describe('LIST-ACTIONS-CLARITY-1: Row Chips & Actions', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedListActionsClarity1Data(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
  });

  // ==========================================================================
  // [FIXUP-2] Products List Tests - Row-Scoped Assertions
  // ==========================================================================

  test('LAC1-001: Optimized product row shows correct chip and help text', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for optimized product
    const optimizedRow = getRowByTitle(page, SEEDED_TITLES.products.optimized);
    await expect(optimizedRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = optimizedRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('✅ Optimized');

    // Assert help text instead of primary action
    const helpText = optimizedRow.locator('[data-testid="row-help-text"]');
    await expect(helpText).toHaveText('No action needed');

    // Assert NO primary action in this row
    const primaryAction = optimizedRow.locator('[data-testid="row-primary-action"]');
    await expect(primaryAction).toHaveCount(0);
  });

  test('LAC1-002: Needs attention product row shows correct chip and Fix next action', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for needs-attention product
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.products.needsAttention);
    await expect(needsAttentionRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = needsAttentionRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('⚠ Needs attention');

    // Assert primary action is "Fix next" (not "Apply")
    const primaryAction = needsAttentionRow.locator('[data-testid="row-primary-action"]');
    await expect(primaryAction).toHaveText('Fix next');

    // Assert NO "Apply" text anywhere in row actions
    await expect(needsAttentionRow.locator('[data-testid="row-primary-action"]:has-text("Apply")')).toHaveCount(0);
    await expect(needsAttentionRow.locator('[data-testid="row-secondary-action"]:has-text("Apply")')).toHaveCount(0);
  });

  test('LAC1-003: Draft pending product row (OWNER) shows Draft saved chip and Review drafts action', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for draft-pending product
    const draftPendingRow = getRowByTitle(page, SEEDED_TITLES.products.draftPending);
    await expect(draftPendingRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = draftPendingRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('🟡 Draft saved (not applied)');

    // Assert primary action is "Review drafts"
    const primaryAction = draftPendingRow.locator('[data-testid="row-primary-action"]');
    await expect(primaryAction).toHaveText('Review drafts');
  });

  // ==========================================================================
  // [FIXUP-2] Pages List Tests - Row-Scoped Assertions
  // ==========================================================================

  test('LAC1-004: Optimized page row shows correct chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for optimized page
    const optimizedRow = getRowByTitle(page, SEEDED_TITLES.pages.optimized);
    await expect(optimizedRow).toBeVisible();

    const chip = optimizedRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('✅ Optimized');
  });

  test('LAC1-005: Needs attention page row shows correct chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for needs-attention page
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.pages.needsAttention);
    await expect(needsAttentionRow).toBeVisible();

    const chip = needsAttentionRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('⚠ Needs attention');
  });

  test('LAC1-006: Draft pending page row shows Draft saved chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Find the draft-pending page row (title is "Short" for /pages/draft-pending)
    // We need to find the row that contains both "Short" title AND the draft-pending URL path
    const draftPendingRow = page.locator('tr:has-text("Short"), div[class*="row"]:has-text("Short")').first();
    await expect(draftPendingRow).toBeVisible();

    const chip = draftPendingRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('🟡 Draft saved (not applied)');
  });

  // ==========================================================================
  // [FIXUP-2] View Issues Navigation Test - Click-through with Banner
  // ==========================================================================

  test('LAC1-007: View issues action navigates to Issues Engine with filter banner', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Find the needs-attention page row and click View issues
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.pages.needsAttention);
    await expect(needsAttentionRow).toBeVisible();

    const viewIssuesLink = needsAttentionRow.locator('[data-testid="row-primary-action"]:has-text("View issues")');
    await expect(viewIssuesLink).toBeVisible();

    // Click and navigate
    await viewIssuesLink.click();

    // [FIXUP-2] Assert URL contains correct params
    await page.waitForURL(/\/issues/);
    const url = page.url();
    expect(url).toContain('assetType=pages');
    expect(url).toContain(`assetId=${seedData.needsAttentionPageId}`);

    // [FIXUP-2] Assert filter context banner is visible
    const filterBanner = page.locator('[data-testid="filter-context-banner"]');
    await expect(filterBanner).toBeVisible();
    await expect(filterBanner).toContainText('Filtered by Asset');
  });

  test('LAC1-008: Review drafts action links to Work Queue', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for draft-pending product
    const draftPendingRow = getRowByTitle(page, SEEDED_TITLES.products.draftPending);
    const reviewDraftsLink = draftPendingRow.locator('[data-testid="row-primary-action"]:has-text("Review drafts")');

    await expect(reviewDraftsLink).toBeVisible();
    const href = await reviewDraftsLink.getAttribute('href');
    expect(href).toContain('/work-queue');
  });

  // ==========================================================================
  // [FIXUP-2] Collections List Tests - Row-Scoped Assertions
  // ==========================================================================

  test('LAC1-010: Optimized collection row shows correct chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for optimized collection
    const optimizedRow = getRowByTitle(page, SEEDED_TITLES.collections.optimized);
    await expect(optimizedRow).toBeVisible();

    const chip = optimizedRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('✅ Optimized');
  });

  test('LAC1-011: Needs attention collection row shows correct chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for needs-attention collection
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.collections.needsAttention);
    await expect(needsAttentionRow).toBeVisible();

    const chip = needsAttentionRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('⚠ Needs attention');
  });

  test('LAC1-012: Draft pending collection row shows Draft saved chip', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Find the draft-pending collection row (title is "Short" for /collections/draft-pending)
    const draftPendingRow = page.locator('tr:has-text("Short"), div[class*="row"]:has-text("Short")').first();
    await expect(draftPendingRow).toBeVisible();

    const chip = draftPendingRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('🟡 Draft saved (not applied)');
  });

  // ==========================================================================
  // [FIXUP-2] Blocked State Tests - Strict EDITOR Assertions
  // ==========================================================================

  test('LAC1-013: EDITOR sees Blocked chip for draft-pending product', async ({
    page,
  }) => {
    await page.goto('/login');
    // Use EDITOR token instead of OWNER
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.editorAccessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for draft-pending product as EDITOR
    const draftPendingRow = getRowByTitle(page, SEEDED_TITLES.products.draftPending);
    await expect(draftPendingRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = draftPendingRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('⛔ Blocked');
  });

  test('LAC1-014: EDITOR sees approval action (NOT Review drafts) for blocked items', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.editorAccessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for draft-pending product as EDITOR
    const draftPendingRow = getRowByTitle(page, SEEDED_TITLES.products.draftPending);
    await expect(draftPendingRow).toBeVisible();

    const primaryAction = draftPendingRow.locator('[data-testid="row-primary-action"]');
    await expect(primaryAction).toBeVisible();

    // [FIXUP-2] Strict: must be "Request approval" OR "View approval status", NOT "Review drafts"
    const actionText = await primaryAction.textContent();
    expect(actionText).toMatch(/Request approval|View approval status/);
    expect(actionText).not.toBe('Review drafts');
  });

  // ==========================================================================
  // [FIXUP-2] Fix Next Routing Tests
  // ==========================================================================

  test('LAC1-015: Fix next action routes to product workspace (not Issues list)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for needs-attention product
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.products.needsAttention);
    const fixNextLink = needsAttentionRow.locator('[data-testid="row-primary-action"]:has-text("Fix next")');

    await expect(fixNextLink).toBeVisible();
    const href = await fixNextLink.getAttribute('href');

    // Assert routes to product workspace (issue fix surface), not Issues list
    expect(href).toContain('/products/');
    expect(href).not.toContain('/issues');
    // Should contain returnTo for navigation back
    expect(href).toContain('returnTo');
  });

  test('LAC1-016: View issues action in Collections includes returnTo context', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [FIXUP-2] Row-scoped assertion for needs-attention collection
    const needsAttentionRow = getRowByTitle(page, SEEDED_TITLES.collections.needsAttention);
    const viewIssuesLink = needsAttentionRow.locator('[data-testid="row-primary-action"]:has-text("View issues")');

    await expect(viewIssuesLink).toBeVisible();
    const href = await viewIssuesLink.getAttribute('href');

    expect(href).toContain('/issues');
    expect(href).toContain('assetType=collections');
    expect(href).toContain('returnTo');
  });

  // ==========================================================================
  // [FIXUP-2] Regression: No "Apply" Action on List Rows
  // ==========================================================================

  test('LAC1-017: No Apply action appears on any list row (Products/Pages/Collections)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Check Products list
    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="row-primary-action"]:has-text("Apply")')).toHaveCount(0);
    await expect(page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')).toHaveCount(0);

    // Check Pages list
    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="row-primary-action"]:has-text("Apply")')).toHaveCount(0);
    await expect(page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')).toHaveCount(0);

    // Check Collections list
    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="row-primary-action"]:has-text("Apply")')).toHaveCount(0);
    await expect(page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')).toHaveCount(0);
  });
});
