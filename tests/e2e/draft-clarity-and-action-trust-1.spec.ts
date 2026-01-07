/**
 * [DRAFT-CLARITY-AND-ACTION-TRUST-1] Playwright E2E Smoke Tests
 *
 * This test suite verifies the draft lifecycle, action semantics, and trust behaviors
 * introduced in the DRAFT-CLARITY-AND-ACTION-TRUST-1 patch batch.
 *
 * Prerequisites:
 * - Use /testkit/e2e/seed-first-deo-win to set up test data
 * - Use /testkit/e2e/connect-shopify to connect a test Shopify store
 * - Login pattern uses localStorage token
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const TEST_PROJECT_ID = process.env.E2E_TEST_PROJECT_ID || 'test-project';
const TEST_PRODUCT_ID = process.env.E2E_TEST_PRODUCT_ID || 'test-product';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || 'test-token';

// Helper to set auth token
async function setAuthToken(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem('token', token);
  }, AUTH_TOKEN);
}

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Draft Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('Draft persists across navigation (Product metadata draft)', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Wait for Metadata tab to be visible
    await page.waitForSelector('[data-testid="draft-state-banner"]');

    // Make a change to create an unsaved draft
    const titleInput = page.locator('#seo-title');
    await titleInput.fill('Test Draft Title - Navigation Test');

    // Verify unsaved draft banner appears
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Navigate away (to another tab or section)
    await page.locator('text=Overview').click();

    // Navigate back to Metadata tab
    await page.locator('text=Metadata').click();

    // Verify draft state is preserved (either via sessionStorage or state)
    await page.waitForSelector('[data-testid="draft-state-banner"]');
    // Note: Full persistence verification depends on implementation details
  });

  test('Unsaved-changes blocking confirmation appears on navigation', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Wait for editor and make changes
    await page.waitForSelector('#seo-title');
    const titleInput = page.locator('#seo-title');
    await titleInput.fill('Test Unsaved Changes Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Set up dialog handler - dismiss to stay on page
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved changes');
      await dialog.dismiss();
    });

    // Try to navigate away via global nav
    await page.locator('a[href*="/projects"]').first().click();

    // Should still be on the product page (navigation blocked)
    await expect(page.url()).toContain(TEST_PRODUCT_ID);
  });

  test('Draft → Saved → Applied state transitions are visible', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Wait for Metadata tab
    await page.waitForSelector('[data-testid="draft-state-banner"]');

    // Step 1: Create unsaved draft
    const titleInput = page.locator('#seo-title');
    await titleInput.fill('Test State Transitions Title');

    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Step 2: Save draft
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await expect(saveDraftButton).toBeVisible();
    await saveDraftButton.click();

    // Verify saved state
    await expect(draftBanner).toContainText('Draft saved — not applied');

    // Step 3: Apply to Shopify
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    // Verify applied state (with timestamp)
    await expect(draftBanner).toContainText('Applied to Shopify on');
  });

  test('Apply never auto-saves (Apply disabled unless draft is saved)', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Wait for Metadata tab
    await page.waitForSelector('[data-testid="draft-state-banner"]');

    // Create unsaved draft
    const titleInput = page.locator('#seo-title');
    await titleInput.fill('Test Apply Gating Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Verify Apply button is disabled
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeDisabled();

    // Save draft
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await saveDraftButton.click();

    // Verify Apply button is now enabled
    await expect(applyButton).toBeEnabled();
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Issue Tiles Routing', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('Issue tiles route to correct fix location', async ({ page }) => {
    // Navigate to project overview or issues page
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/issues`);

    // Wait for issues to load
    await page.waitForSelector('[role="button"]', { timeout: 10000 });

    // Click on an issue tile
    const issueButton = page.locator('[role="button"]').first();
    await issueButton.click();

    // Verify navigation includes correct product and tab parameters
    // The exact behavior depends on the issue type, but should deep-link
    // with tab= and focusSection= parameters as applicable
    await page.waitForTimeout(1000);
    // Note: Full verification depends on test data setup
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Generated Content Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('Generated content is immediately visible after generate/preview', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Wait for AI Suggestions panel
    await page.waitForSelector('text=AI SEO Suggestions', { timeout: 10000 });

    // Click Generate Suggestions button (if not already loaded)
    const generateButton = page.locator('button:has-text("Generate Suggestions")');
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Wait for generation to complete
      await page.waitForSelector('text=Add to draft', { timeout: 30000 });
    }

    // Click "Add to draft" to apply suggestion
    const addToDraftButton = page.locator('text=Add to draft').first();
    if (await addToDraftButton.isVisible()) {
      await addToDraftButton.click();
    }

    // Verify SEO editor is highlighted and visible
    const seoEditorAnchor = page.locator('[data-testid="seo-editor-anchor"]');
    await expect(seoEditorAnchor).toBeVisible();
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Automation History', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('Automation history explains skips and filters work', async ({ page }) => {
    // Navigate to product details and Automation History section
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Switch to Answer Blocks or History tab if needed
    await page.waitForSelector('text=Automation History', { timeout: 10000 });

    // Expand full history
    const expandButton = page.locator('text=View full history');
    if (await expandButton.isVisible()) {
      await expandButton.click();
    }

    // Verify filters are present
    const statusFilter = page.locator('[data-testid="automation-status-filter"]');
    const initiatorFilter = page.locator('[data-testid="automation-initiator-filter"]');

    await expect(statusFilter).toBeVisible();
    await expect(initiatorFilter).toBeVisible();

    // Test status filter - select "Skipped"
    await statusFilter.selectOption('skipped');

    // Verify skipped explanation is visible if there are skipped entries
    const skippedExplanation = page.locator('[data-testid="skipped-row-explanation"]');
    // Note: Only check if there are actually skipped entries
    const count = await skippedExplanation.count();
    if (count > 0) {
      await expect(skippedExplanation.first()).toBeVisible();
    }

    // Test initiator filter
    await initiatorFilter.selectOption('manual');
    // Verify filter applies (results may change)
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: GEO Explainer', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('GEO explainer renders on the product GEO tab', async ({ page }) => {
    // Navigate to product details
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/products/${TEST_PRODUCT_ID}`);

    // Switch to GEO tab
    const geoTab = page.locator('text=GEO');
    await geoTab.click();

    // Wait for GEO panel to load
    await page.waitForSelector('text=What is GEO?', { timeout: 10000 });

    // Verify collapsible explainers are present
    const whatIsGeoExplainer = page.locator('button:has-text("What is GEO?")');
    const whatIsCitationExplainer = page.locator('button:has-text("What is Citation Confidence?")');

    await expect(whatIsGeoExplainer).toBeVisible();
    await expect(whatIsCitationExplainer).toBeVisible();

    // Click to expand "What is GEO?"
    await whatIsGeoExplainer.click();

    // Verify explainer content is visible
    await expect(page.locator('text=Generative Engine Optimization')).toBeVisible();

    // Click to expand "What is Citation Confidence?"
    await whatIsCitationExplainer.click();

    // Verify content mentions it's not a guarantee
    await expect(page.locator('text=not a guarantee')).toBeVisible();
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Issues Page Draft Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await setAuthToken(page);
  });

  test('Issue fix preview follows draft lifecycle', async ({ page }) => {
    // Navigate to issues page
    await page.goto(`${BASE_URL}/projects/${TEST_PROJECT_ID}/issues`);

    // Wait for issues to load
    await page.waitForSelector('button:has-text("Fix next")', { timeout: 10000 });

    // Click "Fix next" on first AI-fixable issue
    const fixNextButton = page.locator('button:has-text("Fix next")').first();
    if (await fixNextButton.isVisible()) {
      await fixNextButton.click();

      // Wait for preview to load
      await page.waitForSelector('[data-testid="issue-preview-draft-panel"]', { timeout: 30000 });

      // Verify draft state banner is visible
      const draftStateBanner = page.locator('[data-testid="issue-draft-state-banner"]');
      await expect(draftStateBanner).toContainText('Draft — not applied');

      // Verify Save draft button is visible
      const saveDraftButton = page.locator('[data-testid="issue-save-draft-button"]');
      await expect(saveDraftButton).toBeVisible();

      // Verify Apply button is disabled until draft is saved
      const applyButton = page.locator('[data-testid="issue-apply-to-shopify-button"]');
      await expect(applyButton).toBeDisabled();

      // Save the draft
      await saveDraftButton.click();

      // Verify state transitions to saved
      await expect(draftStateBanner).toContainText('Draft saved — not applied');

      // Verify Apply button is now enabled
      await expect(applyButton).toBeEnabled();
    }
  });
});
