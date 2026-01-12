/**
 * [DRAFT-AI-ENTRYPOINT-CLARITY-1] AI Boundary Note Visibility Tests
 * [DRAFT-AI-ENTRYPOINT-CLARITY-1-FIXUP-1] Extended with Work Queue + no AI creep coverage
 *
 * Playwright E2E tests for verifying AI boundary notes are visible
 * at draft workflow surfaces (review and generation entrypoints).
 *
 * Test coverage:
 * 1. Product Drafts tab shows review boundary note
 * 2. Playbooks Draft Review shows review boundary note
 * 3. Playbooks generation step shows generate boundary note
 * 4. Boundary notes have correct text and data attributes
 * 5. Work Queue generation CTA shows generate boundary note
 * 6. Draft Review surfaces have no AI creep (no "Improve with AI", "Use AI", Generate, Regenerate)
 *
 * Prerequisites:
 * - /testkit/e2e/seed-draft-ai-entrypoint-clarity-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  productWithDraftId: string;
  productWithoutDraftId: string;
}

/**
 * Seed test data via E2E testkit endpoint
 */
async function seedDraftAiEntrypointClarity1Data(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-draft-ai-entrypoint-clarity-1`,
    { data: {} },
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('DRAFT-AI-ENTRYPOINT-CLARITY-1: AI Boundary Notes', () => {
  let seedData: SeedResponse;

  test.beforeAll(async ({ request }) => {
    seedData = await seedDraftAiEntrypointClarity1Data(request);
    expect(seedData.projectId).toBeTruthy();
    expect(seedData.accessToken).toBeTruthy();
  });

  // ==========================================================================
  // Review Mode Boundary Note Tests
  // ==========================================================================

  /**
   * DAEPC1-001: Product Drafts tab shows review boundary note
   *
   * Verifies that the DraftAiBoundaryNote component is visible in review mode
   * on the Product detail Drafts tab with correct text and data attributes.
   * [FIXUP-1] Also verifies no AI creep (no AI action buttons in the review panel).
   */
  test('DAEPC1-001: Product Drafts tab shows review boundary note', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Product detail Drafts tab
    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDraftId}?tab=drafts`,
    );

    // Wait for Drafts tab panel
    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    // Assert boundary note is visible
    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Assert data-mode attribute
    await expect(boundaryNote).toHaveAttribute('data-mode', 'review');

    // Assert locked copy text (review mode)
    await expect(boundaryNote).toContainText('Review & edit (no AI on this step)');

    // [FIXUP-1] Assert no AI creep in the Drafts tab panel
    await expect(draftsTabPanel.locator('button:has-text("Improve with AI")')).toHaveCount(0);
    await expect(draftsTabPanel.locator('button:has-text("Use AI")')).toHaveCount(0);
    await expect(draftsTabPanel.locator('button:has-text("Generate")')).toHaveCount(0);
    await expect(draftsTabPanel.locator('button:has-text("Regenerate")')).toHaveCount(0);
  });

  /**
   * DAEPC1-002: Playbooks Draft Review shows review boundary note
   *
   * Verifies that the DraftAiBoundaryNote component is visible in review mode
   * on the Playbooks Draft Review panel.
   * [FIXUP-1] Also verifies no AI creep (no AI action buttons in the review panel).
   */
  test('DAEPC1-002: Playbooks Draft Review shows review boundary note', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Playbooks Draft Review mode
    // Need to pass mode=drafts and assetId for the product with draft
    await page.goto(
      `/projects/${seedData.projectId}/automation/playbooks?mode=drafts&assetType=products&assetId=${seedData.productWithDraftId}`,
    );

    // Wait for Draft Review panel
    const draftReviewPanel = page.locator('[data-testid="draft-review-panel"]');
    await expect(draftReviewPanel).toBeVisible({ timeout: 10000 });

    // Assert boundary note is visible
    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Assert data-mode attribute
    await expect(boundaryNote).toHaveAttribute('data-mode', 'review');

    // Assert locked copy text (review mode)
    await expect(boundaryNote).toContainText('Review & edit (no AI on this step)');

    // [FIXUP-1] Assert no AI creep in the Draft Review panel
    await expect(draftReviewPanel.locator('button:has-text("Improve with AI")')).toHaveCount(0);
    await expect(draftReviewPanel.locator('button:has-text("Use AI")')).toHaveCount(0);
    await expect(draftReviewPanel.locator('button:has-text("Generate")')).toHaveCount(0);
    await expect(draftReviewPanel.locator('button:has-text("Regenerate")')).toHaveCount(0);
  });

  // ==========================================================================
  // Generate Mode Boundary Note Tests
  // ==========================================================================

  /**
   * DAEPC1-003: Playbooks generation step shows generate boundary note
   *
   * Verifies that the DraftAiBoundaryNote component is visible in generate mode
   * on the Playbooks page generation step with correct text and data attributes.
   */
  test('DAEPC1-003: Playbooks generation step shows generate boundary note', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Playbooks page (default mode is generation)
    await page.goto(
      `/projects/${seedData.projectId}/automation/playbooks`,
    );

    // Wait for Playbooks page to load (playbook selector or step 1)
    await page.waitForSelector('text=Step 1', { timeout: 10000 });

    // Assert boundary note is visible in generate mode
    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Assert data-mode attribute
    await expect(boundaryNote).toHaveAttribute('data-mode', 'generate');

    // Assert locked copy text (generate mode)
    await expect(boundaryNote).toContainText('AI used for drafts only');
    await expect(boundaryNote).toContainText('AI is not used at Apply');
  });

  // ==========================================================================
  // Boundary Note Integrity Tests
  // ==========================================================================

  /**
   * DAEPC1-004: Review boundary note has correct data attributes
   *
   * Verifies that the boundary note in review mode has the expected
   * data-testid and data-mode attributes for testing and verification.
   */
  test('DAEPC1-004: Review boundary note has correct data attributes', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(
      `/projects/${seedData.projectId}/products/${seedData.productWithDraftId}?tab=drafts`,
    );

    const draftsTabPanel = page.locator('[data-testid="drafts-tab-panel"]');
    await expect(draftsTabPanel).toBeVisible({ timeout: 10000 });

    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Verify expected attributes
    const testId = await boundaryNote.getAttribute('data-testid');
    const mode = await boundaryNote.getAttribute('data-mode');

    expect(testId).toBe('draft-ai-boundary-note');
    expect(mode).toBe('review');
  });

  /**
   * DAEPC1-005: Generate boundary note has correct data attributes
   *
   * Verifies that the boundary note in generate mode has the expected
   * data-testid and data-mode attributes for testing and verification.
   */
  test('DAEPC1-005: Generate boundary note has correct data attributes', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    await page.goto(`/projects/${seedData.projectId}/automation/playbooks`);
    await page.waitForSelector('text=Step 1', { timeout: 10000 });

    const boundaryNote = page.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Verify expected attributes
    const testId = await boundaryNote.getAttribute('data-testid');
    const mode = await boundaryNote.getAttribute('data-mode');

    expect(testId).toBe('draft-ai-boundary-note');
    expect(mode).toBe('generate');
  });

  // ==========================================================================
  // [FIXUP-1] Work Queue Generation CTA Tests
  // ==========================================================================

  /**
   * DAEPC1-006: Work Queue generation CTA shows generate boundary note
   *
   * Verifies that the DraftAiBoundaryNote component is visible in generate mode
   * on Work Queue action bundle cards with "Generate Full Drafts" CTA.
   */
  test('DAEPC1-006: Work Queue generation CTA shows generate boundary note', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, seedData.accessToken);

    // Navigate to Work Queue
    await page.goto(`/projects/${seedData.projectId}/work-queue`);

    // Wait for action bundle cards to load
    await page.waitForSelector('[data-testid="action-bundle-card"]', { timeout: 10000 });

    // Find the card with "Generate Full Drafts" CTA
    // The seed creates a PARTIAL draft which triggers this CTA
    const generateCard = page.locator('[data-testid="action-bundle-card"]:has-text("Generate Full Drafts")');
    await expect(generateCard).toBeVisible();

    // Assert boundary note is visible within the card
    const boundaryNote = generateCard.locator('[data-testid="draft-ai-boundary-note"]');
    await expect(boundaryNote).toBeVisible();

    // Assert data-mode attribute
    await expect(boundaryNote).toHaveAttribute('data-mode', 'generate');

    // Assert locked copy text (generate mode)
    await expect(boundaryNote).toContainText('AI used for drafts only');
    await expect(boundaryNote).toContainText('AI is not used at Apply');
  });
});
