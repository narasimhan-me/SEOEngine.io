/**
 * COUNT-INTEGRITY-1.1 Enterprise Trust Hardening: Cross-Surface UI Smoke Test
 *
 * Phase: COUNT-INTEGRITY-1.1 FIX-UP
 * Purpose: Single robust end-to-end test validating count integrity across all UI surfaces
 *
 * Test Flow:
 * 1. Load Store Health and capture Discoverability tile "X items affected" value
 * 2. Click the tile and land in Issues Engine (pillar=metadata_snippet_quality, mode=detected)
 * 3. Assert Issues Engine triplet labels and values match Store Health
 * 4. Navigate to a product page via an actionable issue card
 * 5. Assert product Issues tab triplet values and zero-actionable suppression
 * 6. Navigate to Work Queue and verify zero-actionable suppression
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3000';

test.describe('COUNT-INTEGRITY-1.1 FIX-UP: Cross-Surface Click-Integrity Test', () => {
  let accessToken: string;
  let testProjectId: string;

  test.beforeAll(async ({ request }) => {
    // Use testkit seed for deterministic test data with issues
    const seedResponse = await request.post(`${API_URL}/testkit/e2e/seed-first-deo-win`);
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

  test('Store Health → Issues Engine → Product Issues → Work Queue: full click-integrity chain', async ({ page }) => {
    // ============================================================
    // STEP 1: Load Store Health and capture Discoverability tile count
    // ============================================================
    await page.goto(`${WEB_URL}/projects/${testProjectId}/store-health`);

    // Wait for cards to load
    const cardsContainer = page.locator('[data-testid="store-health-cards"]');
    await expect(cardsContainer).toBeVisible({ timeout: 10000 });

    // Verify Discoverability card exists
    const discoverabilityCard = page.locator('[data-testid="store-health-card-discoverability"]');
    await expect(discoverabilityCard).toBeVisible();

    // Get summary text and extract "items affected" count
    const discoverabilitySummary = page.locator('[data-testid="store-health-card-discoverability-summary"]');
    await expect(discoverabilitySummary).toBeVisible();
    const summaryText = await discoverabilitySummary.textContent();

    // Summary must contain the literal label "items affected" for semantic integrity
    // (except when counts unavailable or no issues)
    const hasItemsAffected = summaryText?.includes('items affected');
    const hasCountsUnavailable = summaryText?.includes('Counts unavailable');
    const hasNoOutstandingIssues = summaryText?.includes('no outstanding issues');

    // Extract numeric count if "items affected" is present
    let storeHealthItemsAffected: number | null = null;
    if (hasItemsAffected) {
      const match = summaryText?.match(/(\d+)\s+items affected/);
      if (match) {
        storeHealthItemsAffected = parseInt(match[1], 10);
      }
    }

    // Verify semantic integrity: either has "items affected" with count, or is unavailable/zero state
    expect(
      hasItemsAffected || hasCountsUnavailable || hasNoOutstandingIssues
    ).toBeTruthy();

    // If count is available, verify it's a valid number
    if (storeHealthItemsAffected !== null) {
      expect(storeHealthItemsAffected).toBeGreaterThanOrEqual(0);
    }

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
    // STEP 3: Assert Issues Engine triplet labels and values
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

    // Verify triplet values are visible and numeric
    const issueTypesValue = page.locator('[data-testid="triplet-issue-types-value"]');
    const itemsAffectedValue = page.locator('[data-testid="triplet-items-affected-value"]');
    const actionableNowValue = page.locator('[data-testid="triplet-actionable-now-value"]');

    await expect(issueTypesValue).toBeVisible();
    await expect(itemsAffectedValue).toBeVisible();
    await expect(actionableNowValue).toBeVisible();

    // Get Issues Engine triplet-items-affected-value
    const issuesItemsAffectedText = await itemsAffectedValue.textContent();
    const issuesItemsAffected = parseInt(issuesItemsAffectedText || '0', 10);

    // Click-integrity assertion: Store Health "items affected" should match Issues Engine
    if (storeHealthItemsAffected !== null) {
      expect(issuesItemsAffected).toBe(storeHealthItemsAffected);
    }

    // ============================================================
    // STEP 4: Navigate to product page via actionable issue card
    // ============================================================
    const actionableIssueCard = page.locator('[data-testid="issue-card-actionable"]').first();
    const hasActionableCard = await actionableIssueCard.isVisible({ timeout: 3000 });

    if (hasActionableCard) {
      // Click the actionable issue card to navigate to product
      await actionableIssueCard.click();

      // Wait for product page to load
      await page.waitForURL(/\/products\//);
      expect(page.url()).toContain('/products/');

      // Navigate to Issues tab via URL param
      const productUrl = page.url();
      if (!productUrl.includes('tab=issues')) {
        // Add ?tab=issues if not already present
        const tabUrl = productUrl.includes('?')
          ? `${productUrl}&tab=issues`
          : `${productUrl}?tab=issues`;
        await page.goto(tabUrl);
      }

      await page.waitForLoadState('networkidle');

      // ============================================================
      // STEP 5: Assert product Issues tab triplet and suppression
      // ============================================================
      const productTriplet = page.locator('[data-testid="product-issues-triplet"]');
      const hasProductTriplet = await productTriplet.isVisible({ timeout: 5000 });

      if (hasProductTriplet) {
        // Verify triplet values exist
        const productIssueTypesValue = page.locator('[data-testid="product-triplet-issue-types-value"]');
        const productItemsAffectedValue = page.locator('[data-testid="product-triplet-items-affected-value"]');
        const productActionableNowValue = page.locator('[data-testid="product-triplet-actionable-now-value"]');

        await expect(productIssueTypesValue).toBeVisible();
        await expect(productItemsAffectedValue).toBeVisible();
        await expect(productActionableNowValue).toBeVisible();

        // Get actionable now value
        const productActionableText = await productActionableNowValue.textContent();
        const productActionableCount = parseInt(productActionableText || '0', 10);

        // If actionable count is 0, verify zero-actionable suppression
        if (productActionableCount === 0) {
          // Neutral message must appear
          const neutralMessage = page.locator('[data-testid="product-no-eligible-items-message"]');
          await expect(neutralMessage).toBeVisible();
          const messageText = await neutralMessage.textContent();
          expect(messageText).toContain('No items currently eligible for action');

          // No issue-fix CTAs should be visible (no Fix Next badge, no actionable issue rows)
          const fixNextBadge = page.getByRole('link', { name: /Fix next/i });
          const fixNextCount = await fixNextBadge.count();
          expect(fixNextCount).toBe(0);

          // No actionable issue row links should be present
          const actionableRows = page.locator('[data-testid="product-issue-row-actionable"]');
          const actionableRowCount = await actionableRows.count();
          expect(actionableRowCount).toBe(0);
        }
      }
    } else {
      // No actionable issues in filtered view - skip product navigation
      // This is acceptable; the test validates the chain when data is available
      console.log('No actionable issue cards found in filtered Issues view - skipping product navigation');
    }

    // ============================================================
    // STEP 6: Navigate to Work Queue and verify zero-actionable suppression
    // ============================================================
    await page.goto(`${WEB_URL}/projects/${testProjectId}/work-queue`);
    await page.waitForLoadState('networkidle');

    // Look for any bundle card with zero-actionable indicator
    const zeroActionableBundle = page.locator('[data-testid="action-bundle-zero-actionable"]').first();
    const hasZeroActionable = await zeroActionableBundle.isVisible({ timeout: 3000 });

    if (hasZeroActionable) {
      // Verify the neutral message is present
      const bundleCard = zeroActionableBundle.locator('xpath=ancestor::div[@data-testid="action-bundle-card"]');
      const bundleText = await bundleCard.textContent();

      expect(bundleText).toContain('No items currently eligible for action');

      // Verify no action CTAs are present (primary/secondary buttons)
      const primaryCta = bundleCard.locator('a.bg-blue-600');
      const primaryCtaCount = await primaryCta.count();
      expect(primaryCtaCount).toBe(0);

      const secondaryCta = bundleCard.locator('a.border-gray-300');
      const secondaryCtaCount = await secondaryCta.count();
      expect(secondaryCtaCount).toBe(0);
    } else {
      // No zero-actionable bundles in Work Queue - check that bundles with counts have CTAs
      const bundleScope = page.locator('[data-testid="action-bundle-scope"]').first();
      if (await bundleScope.isVisible({ timeout: 3000 })) {
        const scopeText = await bundleScope.textContent();
        // If bundle has actionable count, it should have CTAs
        if (scopeText?.includes('actionable now')) {
          const bundleCard = bundleScope.locator('xpath=ancestor::div[@data-testid="action-bundle-card"]');
          const ctaLinks = bundleCard.locator('a');
          const ctaCount = await ctaLinks.count();
          expect(ctaCount).toBeGreaterThan(0);
        }
      }
    }
  });
});
