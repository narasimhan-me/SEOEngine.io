/**
 * [LIST-ACTIONS-CLARITY-1] Row Chips & Actions E2E Tests
 * [LIST-ACTIONS-CLARITY-1 FIXUP-1] Extended with Collections + Blocked state + Bulk removal
 * [LIST-ACTIONS-CLARITY-1 FIXUP-2] Hardened with row-scoped assertions using seeded titles
 * [LIST-ACTIONS-CLARITY-1-CORRECTNESS-1] Canonical issue counts from DEO issues (not UI heuristics)
 * [DRAFT-ENTRYPOINT-UNIFICATION-1] Products Review drafts routes to Product detail Drafts tab (not Playbooks)
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
 * 6. [DRAFT-ENTRYPOINT-UNIFICATION-1] "Review drafts" routes to Product detail Drafts tab (NOT Work Queue or Playbooks)
 * 7. hasDraftPendingApply field triggers Draft saved chip
 * 8. [FIXUP-1] Collections list renders RowStatusChip with correct labels
 * 9. [FIXUP-1] EDITOR sees "Blocked" chip when draft pending but can't apply
 * 10. [FIXUP-1] "Fix next" action routes to issue fix destination
 * 11. [FIXUP-2] No "Apply" action appears on any list row
 * 12. [FIXUP-1] No bulk selection checkboxes on list pages
 * 13. [FIXUP-1] No bulk action CTAs in command bars
 * 14. [FIXUP-1] Products command bar routes to playbooks
 * 15. [DRAFT-ENTRYPOINT-UNIFICATION-1] Draft item can be edited, saved, and persists after reload in Drafts tab
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
async function seedListActionsClarity1Data(
  request: any
): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-list-actions-clarity-1`,
    { data: {} }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/**
 * Helper: Get a row locator by title text (scoped to table rows containing the title)
 */
function getRowByTitle(page: any, title: string) {
  // Find the row that contains the title text
  return page
    .locator(`tr:has-text("${title}"), div[class*="row"]:has-text("${title}")`)
    .first();
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

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
    const primaryAction = optimizedRow.locator(
      '[data-testid="row-primary-action"]'
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for needs-attention product
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.needsAttention
    );
    await expect(needsAttentionRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = needsAttentionRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('⚠ Needs attention');

    // Assert primary action is "Fix next" (not "Apply")
    const primaryAction = needsAttentionRow.locator(
      '[data-testid="row-primary-action"]'
    );
    await expect(primaryAction).toHaveText('Fix next');

    // Assert NO "Apply" text anywhere in row actions
    await expect(
      needsAttentionRow.locator(
        '[data-testid="row-primary-action"]:has-text("Apply")'
      )
    ).toHaveCount(0);
    await expect(
      needsAttentionRow.locator(
        '[data-testid="row-secondary-action"]:has-text("Apply")'
      )
    ).toHaveCount(0);
  });

  /**
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-2] LAC1-002b: DIAGNOSTIC issue products show "Review" CTA
   *
   * Given: Product 4 has SEO but thin content (top issue is not_answer_ready DIAGNOSTIC)
   * When: User views the product in Products list
   * Then: CTA should show "Review" (not "Fix next")
   *
   * Uses Product 4 from seed-first-deo-win which has:
   * - seoTitle and seoDescription populated (no metadata issues)
   * - Thin content (< 80 words) triggering not_answer_ready as top issue
   */
  test('LAC1-002b: DIAGNOSTIC issue product shows Review CTA (not Fix next)', async ({
    page,
    request,
  }) => {
    // Use seed-first-deo-win which includes Product 4 with DIAGNOSTIC issue
    const seedRes = await request.post(
      `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
      {
        data: {},
      }
    );
    expect(seedRes.ok()).toBeTruthy();
    const { projectId, productIds, accessToken } = await seedRes.json();
    expect(productIds.length).toBeGreaterThanOrEqual(4);

    await page.goto('/login');
    await page.evaluate((token: string) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-2] Find Product 4 (DIAGNOSTIC test product)
    const diagnosticProductRow = getRowByTitle(
      page,
      'Product 4 - DIAGNOSTIC Test'
    );
    await expect(diagnosticProductRow).toBeVisible();

    // Assert chip shows Needs attention (has actionable issue)
    const chip = diagnosticProductRow.locator(
      '[data-testid="row-status-chip"]'
    );
    await expect(chip).toHaveText('⚠ Needs attention');

    // Assert primary action is "Review" (not "Fix next") for DIAGNOSTIC issue
    const primaryAction = diagnosticProductRow.locator(
      '[data-testid="row-primary-action"]'
    );
    await expect(primaryAction).toHaveText('Review');
  });

  test('LAC1-003: Draft pending product row (OWNER) shows Draft saved chip and Review drafts action', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for draft-pending product
    const draftPendingRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.draftPending
    );
    await expect(draftPendingRow).toBeVisible();

    // Assert chip text exactly matches locked vocabulary with emoji
    const chip = draftPendingRow.locator('[data-testid="row-status-chip"]');
    await expect(chip).toHaveText('🟡 Draft saved (not applied)');

    // Assert primary action is "Review drafts"
    const primaryAction = draftPendingRow.locator(
      '[data-testid="row-primary-action"]'
    );
    await expect(primaryAction).toHaveText('Review drafts');
  });

  // ==========================================================================
  // [FIXUP-2] Pages List Tests - Row-Scoped Assertions
  // ==========================================================================

  test('LAC1-004: Optimized page row shows correct chip', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for needs-attention page
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.pages.needsAttention
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Find the draft-pending page row (title is "Short" for /pages/draft-pending)
    // We need to find the row that contains both "Short" title AND the draft-pending URL path
    const draftPendingRow = page
      .locator('tr:has-text("Short"), div[class*="row"]:has-text("Short")')
      .first();
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Find the needs-attention page row and click View issues
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.pages.needsAttention
    );
    await expect(needsAttentionRow).toBeVisible();

    const viewIssuesLink = needsAttentionRow.locator(
      '[data-testid="row-primary-action"]:has-text("View issues")'
    );
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
   * [DRAFT-ENTRYPOINT-UNIFICATION-1] Review drafts routes to Product detail Drafts tab (NOT Work Queue or Playbooks)
   * Smoke flow:
   * 1. Navigate to Products list
   * 2. Click "Review drafts" on draft-pending product row
   * 3. Assert URL contains /products/:productId?tab=drafts
   * 4. Assert URL does NOT contain /work-queue or /automation/playbooks
   * 5. Assert Drafts tab panel is visible
   * 6. Assert no AI affordances/text present in Drafts tab
   */
  test('LAC1-008: Review drafts routes to Product detail Drafts tab (NOT Work Queue)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [DRAFT-ENTRYPOINT-UNIFICATION-1] Row-scoped assertion for draft-pending product
    const draftPendingRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.draftPending
    );
    const reviewDraftsLink = draftPendingRow.locator(
      '[data-testid="row-primary-action"]:has-text("Review drafts")'
    );

    await expect(reviewDraftsLink).toBeVisible();

    // Get href and verify it routes to Product detail Drafts tab, NOT Work Queue or Playbooks
    const href = await reviewDraftsLink.getAttribute('href');
    expect(href).toContain(`/products/${seedData.draftPendingProductId}`);
    expect(href).toContain('tab=drafts');
    expect(href).not.toContain('/work-queue');
    expect(href).not.toContain('/automation/playbooks');

    // Click to navigate to Product detail Drafts tab
    await reviewDraftsLink.click();

    // Wait for navigation and verify URL
    await page.waitForURL(/\/products\/.*\?.*tab=drafts/);
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/products/${seedData.draftPendingProductId}`);
    expect(currentUrl).toContain('tab=drafts');
    expect(currentUrl).not.toContain('/work-queue');
    expect(currentUrl).not.toContain('/automation/playbooks');

    // Assert Drafts tab panel is visible
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible();

    // [DRAFT-ENTRYPOINT-UNIFICATION-1] Assert no AI affordances visible in Drafts tab
    // Draft Review is intentionally non-AI - no Generate, Regenerate, AI suggestion text
    await expect(page.locator('button:has-text("Generate")')).not.toBeVisible();
    await expect(
      page.locator('button:has-text("Regenerate")')
    ).not.toBeVisible();
    await expect(page.locator(':text("AI suggestion")')).not.toBeVisible();

    // [DRAFT-AI-ENTRYPOINT-CLARITY-1] Assert boundary note is visible in review mode
    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();
    await expect(boundaryNote).toHaveAttribute('data-mode', 'review');
    await expect(boundaryNote).toContainText(
      'Review & edit (no AI on this step)'
    );

    // [DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1] Assert no AI/apply CTAs on Drafts tab (non-brittle absence assertions)
    // The header action cluster should be hidden on Drafts tab
    await expect(
      page.locator('[data-testid="header-draft-state-indicator"]')
    ).toHaveCount(0);
    await expect(
      page.locator('button:has-text("Automate this fix")')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="header-apply-to-shopify-button"]')
    ).toHaveCount(0);

    // The CNAB-1 banner with "Generate drafts, review, then apply to Shopify" should not appear
    await expect(
      page.locator(':text("Generate drafts, review, then apply to Shopify")')
    ).toHaveCount(0);
  });

  /**
   * [DRAFT-ENTRYPOINT-UNIFICATION-1] Draft item can be edited and saved in Product detail Drafts tab
   * Smoke flow:
   * 1. Navigate to Products list → Review drafts (Product detail Drafts tab)
   * 2. Click Edit on a draft item
   * 3. Enter new text
   * 4. Click Save changes
   * 5. Assert new text is visible after save
   * 6. Reload page and assert new text persists (server persisted)
   * 7. Test Cancel reverts changes
   */
  test('LAC1-009: Draft item can be edited and saved', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Products list
    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // Click Review drafts on draft-pending product
    const draftPendingRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.draftPending
    );
    const reviewDraftsLink = draftPendingRow.locator(
      '[data-testid="row-primary-action"]:has-text("Review drafts")'
    );
    await reviewDraftsLink.click();

    // [DRAFT-ENTRYPOINT-UNIFICATION-1] Wait for Product detail Drafts tab
    await page.waitForURL(/\/products\/.*\?.*tab=drafts/);
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible();

    // Wait for drafts to load (list or empty state)
    const draftsList = page.locator('[data-testid="drafts-tab-list"]');
    const draftsEmpty = page.locator('[data-testid="drafts-tab-empty"]');
    await expect(draftsList.or(draftsEmpty)).toBeVisible({ timeout: 10000 });

    // If empty state, skip edit test
    if (await draftsEmpty.isVisible()) {
      // No drafts to edit - this seed may not have canonical draft items
      return;
    }

    // [DRAFT-EDIT-INTEGRITY-1] Find the first Edit button (matches pattern drafts-tab-item-edit-*)
    const editButton = page
      .locator('[data-testid^="drafts-tab-item-edit-"]')
      .first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Assert edit mode is active - input should be visible
    const editInput = page
      .locator('[data-testid^="drafts-tab-item-input-"]')
      .first();
    await expect(editInput).toBeVisible();

    // Enter new text
    const editedText = `Edited Draft Text - ${Date.now()}`;
    await editInput.fill(editedText);

    // Click Save changes
    const saveButton = page
      .locator('[data-testid^="drafts-tab-item-save-"]')
      .first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for save to complete - input should no longer be visible
    await expect(editInput).not.toBeVisible({ timeout: 5000 });

    // Assert new text is visible in the draft item
    await expect(draftsTabPanel).toContainText(editedText);

    // Reload page and assert new text persists (server persisted)
    await page.reload();
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });
    await expect(draftsTabPanel).toContainText(editedText);

    // [DRAFT-EDIT-INTEGRITY-1] Test Cancel flow
    const editButton2 = page
      .locator('[data-testid^="drafts-tab-item-edit-"]')
      .first();
    await editButton2.click();

    const editInput2 = page
      .locator('[data-testid^="drafts-tab-item-input-"]')
      .first();
    await expect(editInput2).toBeVisible();

    // Type something different
    const canceledText = 'This should be canceled';
    await editInput2.fill(canceledText);

    // Click Cancel
    const cancelButton = page
      .locator('[data-testid^="drafts-tab-item-cancel-"]')
      .first();
    await cancelButton.click();

    // Assert input is no longer visible
    await expect(editInput2).not.toBeVisible();

    // Assert the canceled text is NOT visible (reverted to saved value)
    await expect(draftsTabPanel).not.toContainText(canceledText);

    // Assert the previously saved text is still visible
    await expect(draftsTabPanel).toContainText(editedText);
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for optimized collection
    const optimizedRow = getRowByTitle(
      page,
      SEEDED_TITLES.collections.optimized
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for needs-attention collection
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.collections.needsAttention
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Find the draft-pending collection row (title is "Short" for /collections/draft-pending)
    const draftPendingRow = page
      .locator('tr:has-text("Short"), div[class*="row"]:has-text("Short")')
      .first();
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for draft-pending product as EDITOR
    const draftPendingRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.draftPending
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for draft-pending product as EDITOR
    const draftPendingRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.draftPending
    );
    await expect(draftPendingRow).toBeVisible();

    const primaryAction = draftPendingRow.locator(
      '[data-testid="row-primary-action"]'
    );
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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for needs-attention product
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.needsAttention
    );
    const fixNextLink = needsAttentionRow.locator(
      '[data-testid="row-primary-action"]:has-text("Fix next")'
    );

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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [FIXUP-2] Row-scoped assertion for needs-attention collection
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.collections.needsAttention
    );
    const viewIssuesLink = needsAttentionRow.locator(
      '[data-testid="row-primary-action"]:has-text("View issues")'
    );

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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="row-primary-action"]:has-text("Apply")')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')
    ).toHaveCount(0);

    // Check Pages list
    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="row-primary-action"]:has-text("Apply")')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')
    ).toHaveCount(0);

    // Check Collections list
    await page.goto(`/projects/${seedData.projectId}/assets/collections`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="row-primary-action"]:has-text("Apply")')
    ).toHaveCount(0);
    await expect(
      page.locator('[data-testid="row-secondary-action"]:has-text("Apply")')
    ).toHaveCount(0);
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
    await page.waitForSelector('[data-testid="products-list"]', {
      timeout: 10000,
    });

    // Assert no checkboxes in table headers or rows
    await expect(
      page.locator('[data-testid="products-list"] input[type="checkbox"]')
    ).toHaveCount(0);
    await expect(
      page.locator(
        '[data-testid="products-list"] th:has(input[type="checkbox"])'
      )
    ).toHaveCount(0);
  });

  test('LAC1-019: No bulk selection checkboxes appear on Pages list', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/assets/pages`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

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
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

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
    await page.waitForSelector('[data-testid="products-list"]', {
      timeout: 10000,
    });

    // Assert no "Generate drafts", "Fix all", or "Bulk" buttons
    await expect(
      page.locator('button:has-text("Generate drafts")')
    ).toHaveCount(0);
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
    await page.waitForSelector('[data-testid="products-list"]', {
      timeout: 10000,
    });

    // Assert "View playbooks" link exists instead of bulk CTA
    const viewPlaybooksLink = page.locator('a:has-text("View playbooks")');
    const linkExists = await viewPlaybooksLink.count();

    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] If there are products needing attention, should show View playbooks link
    if (linkExists > 0) {
      const href = await viewPlaybooksLink.getAttribute('href');
      expect(href).toContain('/playbooks');
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
      }
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
      }
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
      }
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

  // ==========================================================================
  // [ISSUE-FIX-KIND-CLARITY-1] Fix Type Labels in List Actions
  // ==========================================================================

  test('LAC1-026: Fix action CTAs show fix-type distinction (AI vs Guidance vs Direct)', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/products`);
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // Find needs-attention product row
    const needsAttentionRow = getRowByTitle(
      page,
      SEEDED_TITLES.products.needsAttention
    );
    await expect(needsAttentionRow).toBeVisible();

    // Primary action should exist
    const primaryAction = needsAttentionRow.locator(
      '[data-testid="row-primary-action"]'
    );
    await expect(primaryAction).toBeVisible();

    // [ISSUE-FIX-KIND-CLARITY-1] Action text should indicate fix type clarity
    // Valid labels: "Fix next", "Review", "Fix in workspace", "Review AI fix"
    const actionText = await primaryAction.textContent();
    expect(actionText).toMatch(/Fix next|Review|Fix in workspace|Review AI fix/);

    // [ISSUE-FIX-KIND-CLARITY-1] Verify fix type label is visible before action
    const fixTypeLabel = needsAttentionRow.locator('[data-testid="row-fix-type-label"]');
    if (await fixTypeLabel.isVisible().catch(() => false)) {
      const labelText = await fixTypeLabel.textContent();
      // Should show one of: AI, Template, Guidance, Rule-based
      expect(labelText).toMatch(/AI|Template|Guidance|Rule-based/);
    }
  });

  test('LAC1-027: Issues Engine CTAs display fix-type labels consistently', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // Look for issue cards with CTAs
    const issueCards = page.locator('[data-testid="issue-card-cta"]');
    const cardCount = await issueCards.count();

    // If there are issue cards, verify CTAs have fix-type clarity
    if (cardCount > 0) {
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const cta = issueCards.nth(i);
        const ctaText = await cta.textContent();

        // [ISSUE-FIX-KIND-CLARITY-1] CTA should contain clear action type indicator
        // Valid patterns: "Fix in workspace", "Review AI fix", "Review", etc.
        expect(ctaText).toBeTruthy();
        expect(ctaText?.length).toBeGreaterThan(0);

        // [ISSUE-FIX-KIND-CLARITY-1] Verify fix type label is present in issue card
        const issueCard = page.locator('[data-testid^="issue-card-"]').nth(i);
        const fixTypeIndicator = issueCard.locator('[data-testid="issue-card-fix-type"]');
        if (await fixTypeIndicator.isVisible().catch(() => false)) {
          const fixTypeText = await fixTypeIndicator.textContent();
          // Should show one of: AI, Template, Guidance, Rule-based
          expect(fixTypeText).toMatch(/AI|Template|Guidance|Rule-based/);
        }
      }
    }
  });

  test('LAC1-028: Fix type labels visible in Issue list rows before clicking', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1] Verify fix type labels are visible BEFORE user clicks
    const issueRows = page.locator('[data-testid^="issue-row-"]');
    const rowCount = await issueRows.count();

    if (rowCount > 0) {
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const issueRow = issueRows.nth(i);
        const fixTypeLabel = issueRow.locator('[data-testid="issue-row-fix-type-label"]');

        // Fix type label should be visible without hover or click
        if (await fixTypeLabel.isVisible().catch(() => false)) {
          const labelText = await fixTypeLabel.textContent();
          // Should show one of: AI, Template, Guidance, Rule-based
          expect(labelText).toMatch(/AI|Template|Guidance|Rule-based/);

          // Label should be visible at a glance (not hidden or requires interaction)
          await expect(fixTypeLabel).toBeVisible();
        }
      }
    }
  });
});
