/**
 * [DRAFT-DIFF-CLARITY-1] Current vs Draft Diff UI Tests
 * [DRAFT-DIFF-CLARITY-1-FIXUP-1] Extended with behavioral coverage for all scenarios
 *
 * Playwright E2E tests for verifying the Current (live) vs Draft (staged)
 * diff display and empty draft messaging at draft workflow surfaces.
 *
 * Test coverage:
 * DDC1-001: Product Drafts tab shows Current (live) vs Draft (staged) labels + non-destructive default
 * DDC1-002: Product Drafts tab shows "Draft will clear this field when applied" for explicitly cleared drafts
 * DDC1-003: Product Drafts tab has correct data attributes
 * DDC1-004: Playbooks Draft Review shows Current vs Draft diff labels
 * DDC1-005: Playbooks Draft Review has correct data attributes
 * DDC1-006: Product Drafts tab displays live value correctly
 * DDC1-007: Product Drafts tab displays draft value correctly
 * DDC1-008: Product Drafts tab shows "No draft generated yet" messaging
 * DDC1-009: Empty draft save confirmation dialog (dismiss path)
 * DDC1-010: Empty draft save confirmation accept saves empty draft
 *
 * Prerequisites:
 * - /testkit/e2e/seed-draft-diff-clarity-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

// [DRAFT-DIFF-CLARITY-1-FIXUP-2] Locked copy for empty draft confirmation dialog
const EMPTY_DRAFT_CONFIRM_MESSAGE =
  'Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  productWithDiffId: string;
  productWithClearedDraftId: string;
  productNoDraftId: string;
  pageWithDraftId: string;
  liveSeoTitle: string;
  liveSeoDescription: string;
  draftSeoTitle: string;
  draftSeoDescription: string;
}

/**
 * Seed test data via E2E testkit endpoint
 */
async function seedDraftDiffClarity1Data(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-draft-diff-clarity-1`,
    { data: {} },
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('DRAFT-DIFF-CLARITY-1: Current vs Draft Diff UI', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedDraftDiffClarity1Data(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
  });

  // ==========================================================================
  // Product Drafts Tab Tests
  // ==========================================================================

  /**
   * DDC1-001: Product Drafts tab shows Current (live) vs Draft (staged) labels
   *
   * Verifies that the diff UI displays both the current live value and the
   * staged draft value with correct labels and test hooks.
   * [FIXUP-1] Also verifies non-destructive default (no "Draft will clear" on normal diff).
   */
  test('DDC1-001: Product Drafts tab shows Current vs Draft diff labels', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Product detail Drafts tab for product with diff values
    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDiffId}?tab=drafts`,
    );

    // Wait for Drafts tab panel
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Assert "Current (live)" label is visible
    await expect(draftsTabPanel.locator('text=Current (live)')).toBeVisible();

    // Assert "Draft (staged)" label is visible
    await expect(draftsTabPanel.locator('text=Draft (staged)')).toBeVisible();

    // Assert test hooks are present
    const currentBlock = draftsTabPanel.locator('[data-testid="draft-diff-current"]');
    const draftBlock = draftsTabPanel.locator('[data-testid="draft-diff-draft"]');
    await expect(currentBlock.first()).toBeVisible();
    await expect(draftBlock.first()).toBeVisible();

    // Assert live value is displayed in current block
    await expect(currentBlock.first()).toContainText(seedData.liveSeoTitle);

    // Assert draft value is displayed in draft block
    await expect(draftBlock.first()).toContainText(seedData.draftSeoTitle);

    // [FIXUP-1] Regression: Non-destructive default - "Draft will clear" should NOT appear
    // on productWithDiffId (which has valid draft content, not a cleared draft)
    await expect(
      draftsTabPanel.locator('text=Draft will clear this field when applied'),
    ).toHaveCount(0);
  });

  /**
   * DDC1-002: Product Drafts tab shows "Draft will clear this field when applied"
   *
   * Verifies that when a draft is explicitly cleared (rawSuggestion exists but
   * finalSuggestion is empty), the appropriate warning message is shown.
   */
  test('DDC1-002: Product Drafts tab shows cleared draft warning', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Product detail Drafts tab for product with cleared draft
    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithClearedDraftId}?tab=drafts`,
    );

    // Wait for Drafts tab panel
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Assert "Draft will clear this field when applied" message is visible
    await expect(
      draftsTabPanel.locator('text=Draft will clear this field when applied'),
    ).toBeVisible();
  });

  /**
   * DDC1-003: Data attributes for diff blocks
   *
   * Verifies that the diff blocks have correct data-testid attributes.
   */
  test('DDC1-003: Product Drafts tab has correct data attributes', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDiffId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Verify test hooks exist
    const currentBlock = draftsTabPanel.locator('[data-testid="draft-diff-current"]');
    const draftBlock = draftsTabPanel.locator('[data-testid="draft-diff-draft"]');

    await expect(currentBlock.first()).toBeVisible();
    await expect(draftBlock.first()).toBeVisible();

    // Verify the testid attribute values
    const currentTestId = await currentBlock.first().getAttribute('data-testid');
    const draftTestId = await draftBlock.first().getAttribute('data-testid');

    expect(currentTestId).toBe('draft-diff-current');
    expect(draftTestId).toBe('draft-diff-draft');
  });

  // ==========================================================================
  // Playbooks Draft Review Tests
  // ==========================================================================

  /**
   * DDC1-004: Playbooks Draft Review shows Current vs Draft diff labels
   *
   * Verifies that the diff UI is displayed in Playbooks Draft Review mode
   * with both labels and test hooks.
   */
  test('DDC1-004: Playbooks Draft Review shows Current vs Draft diff labels', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Playbooks Draft Review mode for the page with draft
    await page.goto(
      `/projects/${seedData.projectId}/automation/playbooks?mode=drafts&assetType=pages&assetId=${seedData.pageWithDraftId}`,
    );

    // Wait for Draft Review panel
    const draftReviewPanel = page.locator('[data-testid="draft-review-panel"]');
    await expect(draftReviewPanel).toBeVisible({ timeout: 10000 });

    // Assert "Current (live)" label is visible
    await expect(draftReviewPanel.locator('text=Current (live)')).toBeVisible();

    // Assert "Draft (staged)" label is visible
    await expect(draftReviewPanel.locator('text=Draft (staged)')).toBeVisible();

    // Assert test hooks are present
    const currentBlock = draftReviewPanel.locator('[data-testid="draft-diff-current"]');
    const draftBlock = draftReviewPanel.locator('[data-testid="draft-diff-draft"]');
    await expect(currentBlock.first()).toBeVisible();
    await expect(draftBlock.first()).toBeVisible();
  });

  /**
   * DDC1-005: Playbooks Draft Review has correct data attributes
   *
   * Verifies that the diff blocks in Playbooks Draft Review have correct
   * data-testid attributes.
   */
  test('DDC1-005: Playbooks Draft Review has correct data attributes', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(
      `/projects/${seedData.projectId}/automation/playbooks?mode=drafts&assetType=pages&assetId=${seedData.pageWithDraftId}`,
    );

    const draftReviewPanel = page.locator('[data-testid="draft-review-panel"]');
    await expect(draftReviewPanel).toBeVisible({ timeout: 10000 });

    // Verify test hooks exist
    const currentBlock = draftReviewPanel.locator('[data-testid="draft-diff-current"]');
    const draftBlock = draftReviewPanel.locator('[data-testid="draft-diff-draft"]');

    await expect(currentBlock.first()).toBeVisible();
    await expect(draftBlock.first()).toBeVisible();

    // Verify the testid attribute values
    const currentTestId = await currentBlock.first().getAttribute('data-testid');
    const draftTestId = await draftBlock.first().getAttribute('data-testid');

    expect(currentTestId).toBe('draft-diff-current');
    expect(draftTestId).toBe('draft-diff-draft');
  });

  // ==========================================================================
  // Empty Draft Messaging Tests
  // ==========================================================================

  /**
   * DDC1-006: Product Drafts tab displays live value correctly
   *
   * Verifies that the current live value is displayed correctly in the
   * "Current (live)" section.
   */
  test('DDC1-006: Product Drafts tab displays live value in Current section', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDiffId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Find the "Current (live)" blocks and verify content
    const currentBlocks = draftsTabPanel.locator('[data-testid="draft-diff-current"]');

    // At least one block should contain the live SEO title
    const allText = await currentBlocks.allTextContents();
    const hasLiveTitle = allText.some((text) =>
      text.includes(seedData.liveSeoTitle),
    );
    expect(hasLiveTitle).toBeTruthy();
  });

  /**
   * DDC1-007: Product Drafts tab displays draft value correctly
   *
   * Verifies that the staged draft value is displayed correctly in the
   * "Draft (staged)" section.
   */
  test('DDC1-007: Product Drafts tab displays draft value in Draft section', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDiffId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Find the "Draft (staged)" blocks and verify content
    const draftBlocks = draftsTabPanel.locator('[data-testid="draft-diff-draft"]');

    // At least one block should contain the draft SEO title
    const allText = await draftBlocks.allTextContents();
    const hasDraftTitle = allText.some((text) =>
      text.includes(seedData.draftSeoTitle),
    );
    expect(hasDraftTitle).toBeTruthy();
  });

  // ==========================================================================
  // [FIXUP-1] Additional Behavioral Coverage Tests
  // ==========================================================================

  /**
   * DDC1-008: "No draft generated yet" messaging
   *
   * [FIXUP-1] Verifies that when a draft item has field present but both
   * rawSuggestion and finalSuggestion are empty, the "No draft generated yet"
   * message is displayed.
   */
  test('DDC1-008: Product Drafts tab shows "No draft generated yet" messaging', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Product detail Drafts tab for product with no draft generated
    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productNoDraftId}?tab=drafts`,
    );

    // Wait for Drafts tab panel
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Assert "No draft generated yet" message is visible
    await expect(
      draftsTabPanel.locator('text=No draft generated yet'),
    ).toBeVisible();

    // Assert Current block shows the live value (non-empty current + empty draft)
    const currentBlock = draftsTabPanel.locator('[data-testid="draft-diff-current"]');
    await expect(currentBlock.first()).toBeVisible();
    // The live seoTitle for productNoDraft is "Live Title With No Draft"
    await expect(currentBlock.first()).toContainText('Live Title With No Draft');
  });

  /**
   * DDC1-009: Empty draft save confirmation dialog (dismiss path)
   *
   * [FIXUP-1] Verifies that when editing a draft with a non-empty live value
   * and clearing the textarea, clicking "Save changes" shows a confirmation
   * dialog. Dismissing the dialog should NOT save and should keep edit mode open.
   */
  test('DDC1-009: Empty draft save confirmation dialog dismiss keeps edit mode', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to product with diff values (has non-empty live and draft values)
    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDiffId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Find and click the Edit button for the first draft item
    const editButton = draftsTabPanel.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Find the textarea and clear it
    const textarea = draftsTabPanel.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('');

    // [FIXUP-2] Set up dialog handler to dismiss (cancel) - use once() to avoid listener accumulation
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);
      await dialog.dismiss();
    });

    // Click Save changes
    const saveButton = draftsTabPanel.locator('button:has-text("Save changes")').first();
    await saveButton.click();

    // After dismissing, edit mode should still be active (Save/Cancel buttons visible)
    await expect(saveButton).toBeVisible();
    await expect(draftsTabPanel.locator('button:has-text("Cancel")').first()).toBeVisible();

    // "Draft will clear" message should NOT appear (we dismissed the save)
    await expect(
      draftsTabPanel.locator('text=Draft will clear this field when applied'),
    ).toHaveCount(0);
  });

  /**
   * DDC1-010: Empty draft save confirmation accept saves empty draft
   *
   * [FIXUP-1] Uses a fresh seed to avoid interfering with other tests.
   * Verifies that accepting the confirmation dialog saves the empty draft
   * and shows "Draft will clear this field when applied" message.
   */
  test('DDC1-010: Empty draft save confirmation accept saves empty draft', async ({
    page,
    request,
  }) => {
    // Re-seed to get fresh data and avoid shared-state mutation
    const seedData2 = await seedDraftDiffClarity1Data(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData2.accessToken);

    // Navigate to product with diff values
    await page.goto(
      `/projects/${seedData2.projectId}/products/${seedData2.productWithDiffId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Find and click the Edit button for the first draft item
    const editButton = draftsTabPanel.locator('button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Find the textarea and clear it
    const textarea = draftsTabPanel.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('');

    // [FIXUP-2] Set up dialog handler to accept - use once() to avoid listener accumulation
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);
      await dialog.accept();
    });

    // Click Save changes
    const saveButton = draftsTabPanel.locator('button:has-text("Save changes")').first();
    await saveButton.click();

    // After accepting, edit mode should exit (no Save button visible)
    await expect(saveButton).not.toBeVisible({ timeout: 5000 });

    // "Draft will clear this field when applied" message should now appear
    await expect(
      draftsTabPanel.locator('text=Draft will clear this field when applied'),
    ).toBeVisible({ timeout: 5000 });
  });
});
