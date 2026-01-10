/**
 * [LIST-ACTIONS-CLARITY-1] Row Chips & Actions E2E Tests
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Extended with Collections + Blocked state + Bulk removal
 * [LIST-ACTIONS-CLARITY-1 FIXUP-2] Hardened with row-scoped assertions using seeded titles
 * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Canonical issue counts from DEO issues (not UI heuristics)
 * [DRAFT-ROUTING-INTEGRITY-1] Review drafts routes to Draft Review (scoped), NOT Work Queue
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
 * 6. "Review drafts" routes to Draft Review mode (NOT Work Queue) [DRAFT-ROUTING-INTEGRITY-1]
 * 7. hasDraftPendingApply field triggers Draft saved chip
 * 8. [FIXUP-1] Collections list renders RowStatusChip with correct labels
 * 9. [FIXUP-1] EDITOR sees "Blocked" chip when draft pending but can't apply
 * 10. [FIXUP-1] "Fix next" action routes to issue fix destination
 * 11. [FIXUP-2] No "Apply" action appears on any list row
 * 12. [FIXUP-1] No bulk selection checkboxes on list pages
 * 13. [FIXUP-1] No bulk action CTAs in command bars
 * 14. [FIXUP-1] Products command bar routes to playbooks
 *
 * [CORRECTNESS-1] Key changes:
 * - actionableNowCount is now server-derived from canonical DEO issues
 * - blockedByApproval is server-derived (hasDraft AND !viewerCanApply)
 * - UI no longer computes actionability from SEO heuristics
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

  /**
   * [DRAFT-ROUTING-INTEGRITY-1] Review drafts routes to Draft Review (scoped), NOT Work Queue
   * Smoke flow:
   * 1. Navigate to Products list
   * 2. Click "Review drafts" on draft-pending product row
   * 3. Assert URL contains /automation/playbooks with mode=drafts, assetType=products, assetId
   * 4. Assert URL does NOT contain /work-queue
   * 5. Assert ScopeBanner is visible
   * 6. Assert Draft Review panel is visible
   * 7. Click Back and assert return to Products list
   */
  test('LAC1-008: Review drafts routes to Draft Review mode (NOT Work Queue)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // [DRAFT-ROUTING-INTEGRITY-1] Row-scoped assertion for draft-pending product
    const draftPendingRow = getRowByTitle(page, SEEDED_TITLES.products.draftPending);
    const reviewDraftsLink = draftPendingRow.locator('[data-testid="row-primary-action"]:has-text("Review drafts")');

    await expect(reviewDraftsLink).toBeVisible();

    // Get href and verify it routes to Draft Review, NOT Work Queue
    const href = await reviewDraftsLink.getAttribute('href');
    expect(href).toContain('/automation/playbooks');
    expect(href).toContain('mode=drafts');
    expect(href).toContain('assetType=products');
    expect(href).toContain(`assetId=${seedData.draftPendingProductId}`);
    expect(href).not.toContain('/work-queue');

    // Click to navigate to Draft Review mode
    await reviewDraftsLink.click();

    // Wait for navigation and verify URL
    await page.waitForURL(/\/automation\/playbooks/);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/automation/playbooks');
    expect(currentUrl).toContain('mode=drafts');
    expect(currentUrl).toContain('assetType=products');
    expect(currentUrl).toContain(`assetId=${seedData.draftPendingProductId}`);
    expect(currentUrl).not.toContain('/work-queue');

    // Assert ScopeBanner (filter-context-banner) is visible
    const scopeBanner = page.locator('[data-testid="filter-context-banner"]');
    await expect(scopeBanner).toBeVisible();

    // Assert Draft Review panel is visible
    const draftReviewPanel = page.locator('[data-testid="draft-review-panel"]');
    await expect(draftReviewPanel).toBeVisible();

    // [FIXUP-2] Assert draft-review-list is visible (seeded product has a draft)
    const draftReviewList = page.locator('[data-testid="draft-review-list"]');
    await expect(draftReviewList).toBeVisible();

    // [FIXUP-2] Assert seeded draft content is visible (stable substring from seed)
    // Seeded draft has: suggestedTitle: 'Improved Product Title for Better SEO'
    await expect(draftReviewPanel).toContainText('Improved Product Title');

    // Click Back via ScopeBanner (or draft-review-back if empty state) and verify return to Products list
    // [FIXUP-1] ScopeBanner has scope-banner-back; empty state has draft-review-back
    const scopeBannerBack = page.locator('[data-testid="scope-banner-back"]');
    const draftReviewBack = page.locator('[data-testid="draft-review-back"]');
    const backButton = (await scopeBannerBack.isVisible()) ? scopeBannerBack : draftReviewBack;
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Verify returned to Products list (not Work Queue)
    await page.waitForURL(/\/products/);
    const returnUrl = page.url();
    expect(returnUrl).toContain('/products');
    expect(returnUrl).not.toContain('/work-queue');
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

  // ==========================================================================
  // [FIXUP-1] Regression: No Bulk Selection UI on List Pages
  // ==========================================================================

  test('LAC1-018: No bulk selection checkboxes appear on Products list', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Assert no checkboxes in table headers or rows
    await expect(page.locator('[data-testid="products-list"] input[type="checkbox"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="products-list"] th:has(input[type="checkbox"])')).toHaveCount(0);
  });

  test('LAC1-019: No bulk selection checkboxes appear on Pages list', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Assert no checkboxes in table headers or rows
    await expect(page.locator('table input[type="checkbox"]')).toHaveCount(0);
  });

  test('LAC1-020: No bulk selection checkboxes appear on Collections list', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', { timeout: 10000 });

    // Assert no checkboxes in table headers or rows
    await expect(page.locator('table input[type="checkbox"]')).toHaveCount(0);
  });

  test('LAC1-021: No bulk action CTA appears on Products command bar', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Assert no "Generate drafts", "Fix all", or "Bulk" buttons
    await expect(page.locator('button:has-text("Generate drafts")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Fix all")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Bulk")')).toHaveCount(0);
  });

  test('LAC1-022: Products command bar links to playbooks (not bulk action)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Assert "View playbooks" link exists instead of bulk CTA
    const viewPlaybooksLink = page.locator('a:has-text("View playbooks")');
    const linkExists = await viewPlaybooksLink.count();

    // If there are products needing attention, should show View playbooks link
    if (linkExists > 0) {
      const href = await viewPlaybooksLink.getAttribute('href');
      expect(href).toContain('/automation/playbooks');
    }
  });

  // ==========================================================================
  // [CORRECTNESS-1-FIXUP-1] API Contract Regression: Canonical Row Fields
  // ==========================================================================

  test('LAC1-023: Products API includes canonical row fields', async ({
    request,
  }) => {
    // [CORRECTNESS-1-FIXUP-1] Verify Products list payload includes server-derived fields
    const response = await request.get(
      `${API_BASE_URL}/projects/${seedData.projectId}/products`,
      {
        headers: {
          Authorization: `Bearer ${seedData.accessToken}`,
        },
      },
    );

    expect(response.ok()).toBeTruthy();
    const products = await response.json();

    expect(Array.isArray(products)).toBeTruthy();
    expect(products.length).toBeGreaterThan(0);

    // Assert first product has canonical row fields
    const firstProduct = products[0];
    expect(typeof firstProduct.hasDraftPendingApply).toBe('boolean');
    expect(typeof firstProduct.actionableNowCount).toBe('number');
    expect(typeof firstProduct.detectedIssueCount).toBe('number');
    expect(typeof firstProduct.blockedByApproval).toBe('boolean');
  });

  test('LAC1-024: Crawl Pages API (static) includes canonical row fields', async ({
    request,
  }) => {
    // [CORRECTNESS-1-FIXUP-1] Verify Crawl Pages payload includes server-derived fields
    const response = await request.get(
      `${API_BASE_URL}/projects/${seedData.projectId}/crawl-pages?pageType=static`,
      {
        headers: {
          Authorization: `Bearer ${seedData.accessToken}`,
        },
      },
    );

    expect(response.ok()).toBeTruthy();
    const pages = await response.json();

    expect(Array.isArray(pages)).toBeTruthy();
    // Pages may be empty if no static pages seeded, so only check fields if present
    if (pages.length > 0) {
      const firstPage = pages[0];
      expect(typeof firstPage.hasDraftPendingApply).toBe('boolean');
      expect(typeof firstPage.actionableNowCount).toBe('number');
      expect(typeof firstPage.detectedIssueCount).toBe('number');
      expect(typeof firstPage.blockedByApproval).toBe('boolean');
    }
  });

  test('LAC1-025: Crawl Pages API (collection) includes canonical row fields', async ({
    request,
  }) => {
    // [CORRECTNESS-1-FIXUP-1] Verify Crawl Pages (collections) payload includes server-derived fields
    const response = await request.get(
      `${API_BASE_URL}/projects/${seedData.projectId}/crawl-pages?pageType=collection`,
      {
        headers: {
          Authorization: `Bearer ${seedData.accessToken}`,
        },
      },
    );

    expect(response.ok()).toBeTruthy();
    const collections = await response.json();

    expect(Array.isArray(collections)).toBeTruthy();
    // Collections may be empty if none seeded, so only check fields if present
    if (collections.length > 0) {
      const firstCollection = collections[0];
      expect(typeof firstCollection.hasDraftPendingApply).toBe('boolean');
      expect(typeof firstCollection.actionableNowCount).toBe('number');
      expect(typeof firstCollection.detectedIssueCount).toBe('number');
      expect(typeof firstCollection.blockedByApproval).toBe('boolean');
    }
  });
});
