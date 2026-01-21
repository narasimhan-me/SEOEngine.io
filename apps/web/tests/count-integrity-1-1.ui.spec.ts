/**
 * COUNT-INTEGRITY-1.1 Enterprise Trust Hardening: Cross-Surface UI Smoke Test
 *
 * Phase: COUNT-INTEGRITY-1.1 FIXUP-2
 * Purpose: Single STRICT end-to-end test validating count integrity across UI surfaces
 *
 * Test Flow (REQUIRED - no optional branches):
 * 1. Load Store Health and capture Discoverability tile "X items affected" value (MUST parse)
 * 2. Click the tile and land in Issues Engine (pillar=metadata_snippet_quality, mode=detected)
 * 3. Assert Issues Engine triplet "Items affected" equals X (STRICT equality)
 * 4. Click first actionable issue card and navigate to asset detail (REQUIRED)
 * 5. Assert product Issues tab triplet values
 * 6. If actionable now = 0, assert neutral message and no CTAs
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3000';

test.describe('COUNT-INTEGRITY-1.1 FIXUP-2: Strict Cross-Surface Click-Integrity Test', () => {
  let accessToken: string;
  let testProjectId: string;

  test.beforeAll(async ({ request }) => {
    // Use testkit seed for deterministic test data with issues
    const seedResponse = await request.post(
      `${API_URL}/testkit/e2e/seed-first-deo-win`
    );
    expect(seedResponse.ok()).toBeTruthy();

    const seedData = await seedResponse.json();
    accessToken = seedData.accessToken;
    testProjectId = seedData.projectId;
  });

  test.beforeEach(async ({ page }) => {
    // Authenticate via localStorage token only (no cookie-based auth)
    await page.addInitScript((token: string) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);
  });

  test('Store Health → Issues Engine → Asset Detail: strict click-integrity chain', async ({
    page,
  }) => {
    // ============================================================
    // STEP 1: Load Store Health and STRICTLY capture Discoverability tile count
    // ============================================================
    await page.goto(`${WEB_URL}/projects/${testProjectId}/store-health`);

    // Wait for cards to load
    const cardsContainer = page.locator('[data-testid="store-health-cards"]');
    await expect(cardsContainer).toBeVisible({ timeout: 10000 });

    // Verify Discoverability card exists
    const discoverabilityCard = page.locator(
      '[data-testid="store-health-card-discoverability"]'
    );
    await expect(discoverabilityCard).toBeVisible();

    // Get summary text - MUST contain "items affected" (no fallbacks)
    const discoverabilitySummary = page.locator(
      '[data-testid="store-health-card-discoverability-summary"]'
    );
    await expect(discoverabilitySummary).toBeVisible();
    const summaryText = await discoverabilitySummary.textContent();

    // STRICT: Summary MUST contain "items affected" - fail if not
    expect(summaryText).toContain('items affected');

    // STRICT: Parse X from "X items affected" - fail if parsing fails
    const match = summaryText?.match(/(\d+)\s+items affected/);
    expect(match).not.toBeNull();
    const storeHealthItemsAffected = parseInt(match![1], 10);
    expect(Number.isNaN(storeHealthItemsAffected)).toBe(false);

    // ============================================================
    // STEP 2: Click tile and land in Issues Engine
    // ============================================================
    await discoverabilityCard.click();

    // Verify we landed in Issues Engine (not Work Queue)
    await page.waitForURL(/\/issues/);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/issues');

    // Verify URL contains expected pillar filter AND mode=detected
    expect(currentUrl).toContain('pillar=metadata_snippet_quality');
    expect(currentUrl).toContain('mode=detected');

    // Verify from=store_health for coherent back link
    expect(currentUrl).toContain('from=store_health');

    // ============================================================
    // STEP 3: Assert Issues Engine triplet labels and STRICT value equality
    // ============================================================
    await page.waitForLoadState('networkidle');

    // Verify triplet display is visible
    const tripletDisplay = page.locator('[data-testid="triplet-display"]');
    await expect(tripletDisplay).toBeVisible({ timeout: 10000 });

    // Verify all three triplet labels are present
    const tripletLabels = await tripletDisplay.textContent();
    expect(tripletLabels).toContain('Issue types');
    expect(tripletLabels).toContain('Items affected');
    expect(tripletLabels).toContain('Actionable now');

    // Verify triplet values are visible
    const itemsAffectedValue = page.locator(
      '[data-testid="triplet-items-affected-value"]'
    );
    await expect(itemsAffectedValue).toBeVisible();

    // STRICT: Issues Engine "Items affected" MUST equal Store Health count
    const issuesItemsAffectedText = await itemsAffectedValue.textContent();
    const issuesItemsAffected = parseInt(issuesItemsAffectedText || '', 10);
    expect(issuesItemsAffected).toBe(storeHealthItemsAffected);

    // ============================================================
    // STEP 4: Navigate to asset detail via actionable issue card (REQUIRED)
    // ============================================================
    const actionableIssueCard = page
      .locator('[data-testid="issue-card-actionable"]')
      .first();

    // STRICT: At least one actionable issue card MUST exist
    await expect(actionableIssueCard).toBeVisible({ timeout: 5000 });

    // Click the actionable issue card to navigate to product
    await actionableIssueCard.click();

    // Wait for product page to load
    await page.waitForURL(/\/products\//);
    expect(page.url()).toContain('/products/');

    // Navigate to Issues tab via URL param
    const productUrl = page.url();
    if (!productUrl.includes('tab=issues')) {
      const tabUrl = productUrl.includes('?')
        ? `${productUrl}&tab=issues`
        : `${productUrl}?tab=issues`;
      await page.goto(tabUrl);
    }

    await page.waitForLoadState('networkidle');

    // ============================================================
    // STEP 5: Assert product Issues tab triplet
    // ============================================================
    const productTriplet = page.locator(
      '[data-testid="product-issues-triplet"]'
    );
    await expect(productTriplet).toBeVisible({ timeout: 5000 });

    // Verify triplet values exist
    const productIssueTypesValue = page.locator(
      '[data-testid="product-triplet-issue-types-value"]'
    );
    const productItemsAffectedValue = page.locator(
      '[data-testid="product-triplet-items-affected-value"]'
    );
    const productActionableNowValue = page.locator(
      '[data-testid="product-triplet-actionable-now-value"]'
    );

    await expect(productIssueTypesValue).toBeVisible();
    await expect(productItemsAffectedValue).toBeVisible();
    await expect(productActionableNowValue).toBeVisible();

    // ============================================================
    // STEP 6: If actionable now = 0, assert zero-actionable suppression
    // ============================================================
    const productActionableText = await productActionableNowValue.textContent();
    const productActionableCount = parseInt(productActionableText || '0', 10);

    if (productActionableCount === 0) {
      // Neutral message MUST appear
      const neutralMessage = page.locator(
        '[data-testid="product-no-eligible-items-message"]'
      );
      await expect(neutralMessage).toBeVisible();
      const messageText = await neutralMessage.textContent();
      expect(messageText).toContain('No items currently eligible for action');

      // No issue-fix CTAs should be visible (no Fix Next badge)
      const fixNextBadge = page.getByRole('link', { name: /Fix next/i });
      const fixNextCount = await fixNextBadge.count();
      expect(fixNextCount).toBe(0);

      // No actionable issue row links should be present
      const actionableRows = page.locator(
        '[data-testid="product-issue-row-actionable"]'
      );
      const actionableRowCount = await actionableRows.count();
      expect(actionableRowCount).toBe(0);
    }
  });
});
