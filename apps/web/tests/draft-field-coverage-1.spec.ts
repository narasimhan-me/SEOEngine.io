/**
 * [DRAFT-FIELD-COVERAGE-1] Playwright E2E Tests
 * [DRAFT-FIELD-COVERAGE-1-FIXUP-1] Updated to use canonical routes
 *
 * Tests for Draft Review parity across Products, Pages, and Collections.
 * Verifies consistent behavior for:
 * - Current vs Draft diff display
 * - "No draft generated yet" messaging
 * - Destructive-clear confirmation dialog (dismiss + accept paths)
 * - Cross-asset parity (testids + labels)
 *
 * Uses seed: POST /testkit/e2e/seed-draft-field-coverage-1
 *
 * Route usage:
 * - Products: /projects/{id}/products/{productId}
 * - Pages: /projects/{id}/pages/{pageId} (canonical, redirects to /assets/pages/...)
 * - Collections: /projects/{id}/collections/{collectionId} (canonical, redirects to /assets/collections/...)
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
const APP_BASE_URL = process.env.PLAYWRIGHT_APP_URL || 'http://localhost:3000';

/**
 * Locked constant: exact dialog message for empty draft confirmation.
 * MUST match the confirmation dialog in AssetDraftsTab.tsx.
 */
const EMPTY_DRAFT_CONFIRM_MESSAGE =
  'Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  productDiffId: string;
  productClearId: string;
  productNoDraftId: string;
  pageDiffId: string;
  pageClearId: string;
  pageNoDraftId: string;
  collectionDiffId: string;
  collectionClearId: string;
  collectionNoDraftId: string;
  liveSeoTitle: string;
  liveSeoDescription: string;
  draftSeoTitle: string;
  draftSeoDescription: string;
  counts: {
    affectedTotal: number;
    draftGenerated: number;
    noSuggestionCount: number;
  };
}

/**
 * Seed test data and authenticate.
 */
async function seedAndAuth(page: Page): Promise<SeedResponse> {
  const res = await fetch(
    `${API_BASE_URL}/testkit/e2e/seed-draft-field-coverage-1`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!res.ok) {
    throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
  }

  const data: SeedResponse = await res.json();

  // Set auth token in localStorage
  await page.goto(APP_BASE_URL);
  await page.evaluate((token) => {
    localStorage.setItem('engineo_token', token);
  }, data.accessToken);

  return data;
}

// ==========================================================================
// PAGES DRAFTS TAB TESTS (using canonical route /projects/{id}/pages/{pageId})
// ==========================================================================

test.describe('DRAFT-FIELD-COVERAGE-1: Pages Drafts Tab', () => {
  test('DFC1-001: Pages Drafts tab shows Current vs Draft blocks with correct labels', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route (redirects to /assets/pages/...)
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/pages/${seed.pageDiffId}?tab=drafts`
    );

    // Wait for drafts tab panel
    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Verify Current (live) and Draft (staged) labels
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toBeVisible();

    // Verify label text
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toContainText('Current (live)');
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toContainText('Draft (staged)');
  });

  test('DFC1-002: Pages Drafts tab shows "No draft generated yet" for empty-suggestion scenario', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/pages/${seed.pageNoDraftId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Verify "No draft generated yet" message
    await expect(page.locator('text=No draft generated yet')).toBeVisible();
  });

  test('DFC1-003: Pages destructive-clear confirmation dialog - dismiss path', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/pages/${seed.pageClearId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Find the draft item with "Draft will clear this field" and edit it
    // Wait for the draft list to render
    const draftItem = page.locator('[data-testid="draft-diff-draft"]').first();
    await expect(draftItem).toBeVisible();

    // Click Edit on first item
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Clear the textarea to trigger confirmation
    const textarea = page.locator('textarea').first();
    await textarea.fill('');

    // Setup dialog handler BEFORE clicking save
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Dismiss path
    });

    // Click save
    const saveButton = page.locator('button:has-text("Save changes")').first();
    await saveButton.click();

    // Wait a moment for dialog to be handled
    await page.waitForTimeout(500);

    // Verify exact dialog message (locked copy)
    expect(dialogMessage).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);
  });

  test('DFC1-004: Pages destructive-clear confirmation dialog - accept path', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/pages/${seed.pageDiffId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Click Edit on first item
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Clear the textarea to trigger confirmation
    const textarea = page.locator('textarea').first();
    await textarea.fill('');

    // [FIXUP-1] Setup dialog handler - assert locked copy BEFORE accepting
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click save
    const saveButton = page.locator('button:has-text("Save changes")').first();
    await saveButton.click();

    // Wait for save to complete and UI to update
    await page.waitForTimeout(500);

    // [FIXUP-1] Verify exact dialog message was shown (locked copy assertion on accept path)
    expect(dialogMessage).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);

    // After accepting, the "Draft will clear this field when applied" should appear
    await expect(
      page.locator('text=Draft will clear this field when applied')
    ).toBeVisible();
  });
});

// ==========================================================================
// COLLECTIONS DRAFTS TAB TESTS (using canonical route /projects/{id}/collections/{collectionId})
// ==========================================================================

test.describe('DRAFT-FIELD-COVERAGE-1: Collections Drafts Tab', () => {
  test('DFC1-005: Collections Drafts tab shows Current vs Draft blocks with correct labels', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route (redirects to /assets/collections/...)
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/collections/${seed.collectionDiffId}?tab=drafts`
    );

    // Wait for drafts tab panel
    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Verify Current (live) and Draft (staged) labels
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toBeVisible();

    // Verify label text
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toContainText('Current (live)');
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toContainText('Draft (staged)');
  });

  test('DFC1-006: Collections Drafts tab shows "No draft generated yet" for empty-suggestion scenario', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/collections/${seed.collectionNoDraftId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Verify "No draft generated yet" message
    await expect(page.locator('text=No draft generated yet')).toBeVisible();
  });

  test('DFC1-007: Collections destructive-clear confirmation dialog - dismiss path', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/collections/${seed.collectionClearId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    const draftItem = page.locator('[data-testid="draft-diff-draft"]').first();
    await expect(draftItem).toBeVisible();

    // Click Edit
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Clear textarea
    const textarea = page.locator('textarea').first();
    await textarea.fill('');

    // Setup dialog handler - dismiss
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // Save
    await page.locator('button:has-text("Save changes")').first().click();

    await page.waitForTimeout(500);
    expect(dialogMessage).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);
  });

  test('DFC1-008: Collections destructive-clear confirmation dialog - accept path', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/collections/${seed.collectionDiffId}?tab=drafts`
    );

    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();

    // Click Edit
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // Clear textarea
    const textarea = page.locator('textarea').first();
    await textarea.fill('');

    // [FIXUP-1] Setup dialog handler - assert locked copy BEFORE accepting
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Save
    await page.locator('button:has-text("Save changes")').first().click();

    await page.waitForTimeout(500);

    // [FIXUP-1] Verify exact dialog message was shown (locked copy assertion on accept path)
    expect(dialogMessage).toBe(EMPTY_DRAFT_CONFIRM_MESSAGE);

    // Verify clear message appears
    await expect(
      page.locator('text=Draft will clear this field when applied')
    ).toBeVisible();
  });
});

// ==========================================================================
// CROSS-ASSET PARITY TESTS
// ==========================================================================

test.describe('DRAFT-FIELD-COVERAGE-1: Cross-Asset Parity', () => {
  test('DFC1-009: Products Drafts tab has consistent testids and AI boundary note', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // Navigate to product with diff - Drafts tab
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/products/${seed.productDiffId}?tab=drafts`
    );

    // Verify required testids
    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toBeVisible();

    // Verify AI boundary note contains expected text
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toContainText('Review & edit');

    // Verify diff blocks
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toBeVisible();
  });

  test('DFC1-010: Pages Drafts tab has consistent testids and AI boundary note', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/pages/${seed.pageDiffId}?tab=drafts`
    );

    // Verify required testids
    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toBeVisible();

    // Verify AI boundary note contains expected text
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toContainText('Review & edit');

    // Verify diff blocks
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toBeVisible();

    // Verify Pages-specific field labels
    await expect(page.locator('text=Page Title')).toBeVisible();
  });

  test('DFC1-011: Collections Drafts tab has consistent testids and AI boundary note', async ({
    page,
  }) => {
    const seed = await seedAndAuth(page);

    // [FIXUP-1] Navigate via canonical route
    await page.goto(
      `${APP_BASE_URL}/projects/${seed.projectId}/collections/${seed.collectionDiffId}?tab=drafts`
    );

    // Verify required testids
    await expect(
      page.locator('[data-testid="drafts-tab-panel"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toBeVisible();

    // Verify AI boundary note contains expected text
    await expect(
      page.locator('[data-testid="draft-ai-boundary-note"]')
    ).toContainText('Review & edit');

    // Verify diff blocks
    await expect(
      page.locator('[data-testid="draft-diff-current"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="draft-diff-draft"]')
    ).toBeVisible();

    // Verify Collections-specific field labels
    await expect(page.locator('text=Collection Title')).toBeVisible();
  });
});
