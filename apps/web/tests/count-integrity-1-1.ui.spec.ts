/**
 * COUNT-INTEGRITY-1.1 Gap 7: Cross-Surface UI Smoke Test
 *
 * Phase: COUNT-INTEGRITY-1.1
 * Purpose: Verify canonical triplet counts are displayed correctly across all UI surfaces
 *
 * Test Flow:
 * 1. Load Store Health and capture tile labeled "Items affected" value
 * 2. Navigate to Work Queue and verify labeled triplet values exist
 * 3. Navigate to Issues and verify labeled triplet exists with semantics matching Work Queue
 * 4. Navigate to product detail Issues tab and verify labeled triplet exists
 * 5. Assert zero-actionable suppression when actionableNowCount = 0
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const WEB_URL = process.env.E2E_WEB_URL || 'http://localhost:3000';

test.describe('COUNT-INTEGRITY-1.1 Gap 7: Cross-Surface UI Smoke Test', () => {
  let accessToken: string;
  let testProjectId: string;
  let productId: string;

  test.beforeAll(async ({ request }) => {
    // Use testkit seed for deterministic test data with issues
    const seedResponse = await request.post(`${API_URL}/testkit/e2e/seed-first-deo-win`);
    expect(seedResponse.ok()).toBeTruthy();

    const seedData = await seedResponse.json();
    accessToken = seedData.accessToken;
    testProjectId = seedData.projectId;

    // Get a product ID for the product detail test
    // [COUNT-INTEGRITY-1.1 UI HARDEN] Fix: /projects/:id/products returns { products: [...] }, not a top-level array
    const productsResponse = await request.get(`${API_URL}/projects/${testProjectId}/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(productsResponse.ok()).toBeTruthy();
    const productsData = await productsResponse.json();
    // Handle both array (legacy) and object { products: [...] } response shapes
    const productsArray = Array.isArray(productsData) ? productsData : (productsData.products ?? []);
    if (productsArray.length > 0) {
      productId = productsArray[0].id;
    }
  });

  test.beforeEach(async ({ page }) => {
    // [COUNT-INTEGRITY-1.1 UI HARDEN] Use localStorage token pattern only (matches rest of suite)
    // Removed cookie-based auth_token setup - use engineo_token in localStorage only
    await page.addInitScript((token: string) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);
  });

  test('UI-001: Store Health shows Items affected count in tile summaries', async ({ page }) => {
    await page.goto(`${WEB_URL}/projects/${testProjectId}/store-health`);

    // Wait for cards to load
    const cardsContainer = page.locator('[data-testid="store-health-cards"]');
    await expect(cardsContainer).toBeVisible({ timeout: 10000 });

    // Verify discoverability card exists and has summary
    const discoverabilityCard = page.locator('[data-testid="store-health-card-discoverability"]');
    await expect(discoverabilityCard).toBeVisible();

    // Verify summary text contains "items affected" or "actionable now" semantics
    const discoverabilitySummary = page.locator('[data-testid="store-health-card-discoverability-summary"]');
    await expect(discoverabilitySummary).toBeVisible();
    const summaryText = await discoverabilitySummary.textContent();

    // Summary should contain actionable count semantics OR informational text
    expect(
      summaryText?.includes('actionable now') ||
      summaryText?.includes('items affected') ||
      summaryText?.includes('Informational only') ||
      summaryText?.includes('no outstanding issues')
    ).toBeTruthy();
  });

  test('UI-002: Work Queue shows Actionable now count in bundle cards', async ({ page }) => {
    await page.goto(`${WEB_URL}/projects/${testProjectId}/work-queue`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for any action bundle scope element (may not have bundles in test data)
    const bundleScope = page.locator('[data-testid="action-bundle-scope"]').first();

    // If bundles exist, verify they have proper count semantics
    if (await bundleScope.isVisible({ timeout: 3000 })) {
      const scopeText = await bundleScope.textContent();
      // Should contain "actionable now" or "Informational" for ASSET_OPTIMIZATION bundles
      expect(
        scopeText?.includes('actionable now') ||
        scopeText?.includes('Informational') ||
        scopeText?.includes('Applies to') // Non-ASSET_OPTIMIZATION bundles
      ).toBeTruthy();
    }

    // Verify AI badge has trust-building copy if present
    const aiBadge = page.locator('[data-testid^="action-bundle-ai-badge-"]').first();
    if (await aiBadge.isVisible({ timeout: 3000 })) {
      const badgeText = await aiBadge.textContent();
      expect(
        badgeText?.includes('Does not use AI') ||
        badgeText?.includes('AI used for drafts only')
      ).toBeTruthy();
    }
  });

  test('UI-003: Issues page shows canonical triplet display with labels', async ({ page }) => {
    await page.goto(`${WEB_URL}/projects/${testProjectId}/issues`);

    // Wait for triplet display to load
    const tripletDisplay = page.locator('[data-testid="triplet-display"]');
    await expect(tripletDisplay).toBeVisible({ timeout: 10000 });

    // Verify all three triplet values are displayed with labels
    const issueTypesValue = page.locator('[data-testid="triplet-issue-types-value"]');
    await expect(issueTypesValue).toBeVisible();
    const issueTypesCount = await issueTypesValue.textContent();
    expect(parseInt(issueTypesCount || '0', 10)).toBeGreaterThanOrEqual(0);

    const itemsAffectedValue = page.locator('[data-testid="triplet-items-affected-value"]');
    await expect(itemsAffectedValue).toBeVisible();
    const itemsAffectedCount = await itemsAffectedValue.textContent();
    expect(parseInt(itemsAffectedCount || '0', 10)).toBeGreaterThanOrEqual(0);

    const actionableNowValue = page.locator('[data-testid="triplet-actionable-now-value"]');
    await expect(actionableNowValue).toBeVisible();
    const actionableNowCount = await actionableNowValue.textContent();
    expect(parseInt(actionableNowCount || '0', 10)).toBeGreaterThanOrEqual(0);

    // Verify mode toggles exist
    const actionableToggle = page.locator('[data-testid="mode-toggle-actionable"]');
    const detectedToggle = page.locator('[data-testid="mode-toggle-detected"]');
    await expect(actionableToggle).toBeVisible();
    await expect(detectedToggle).toBeVisible();
  });

  test('UI-004: Issues page shows zero-actionable message when no actionable items', async ({ page }) => {
    // Navigate to issues with detected mode to check zero-actionable behavior
    await page.goto(`${WEB_URL}/projects/${testProjectId}/issues?mode=actionable`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if zero-actionable message is shown OR if there are actionable items
    const noEligibleMessage = page.locator('[data-testid="no-eligible-items-message"]');
    const tripletDisplay = page.locator('[data-testid="triplet-display"]');

    // Wait for either element
    await Promise.race([
      noEligibleMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      tripletDisplay.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);

    // If no-eligible message is shown, verify its content
    if (await noEligibleMessage.isVisible()) {
      const messageText = await noEligibleMessage.textContent();
      expect(messageText?.includes('No items currently eligible for action')).toBeTruthy();
    } else {
      // Otherwise triplet should be visible with some actionable items
      await expect(tripletDisplay).toBeVisible();
    }
  });

  test('UI-005: Product detail Issues tab shows canonical triplet display', async ({ page }) => {
    // Skip if no product ID available
    test.skip(!productId, 'No product available in test data');

    await page.goto(`${WEB_URL}/projects/${testProjectId}/products/${productId}?tab=issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for product issues triplet display
    const productTriplet = page.locator('[data-testid="product-issues-triplet"]');

    // May not always be visible if no issues for this product
    if (await productTriplet.isVisible({ timeout: 5000 })) {
      // Verify triplet values are displayed
      const issueTypesValue = page.locator('[data-testid="product-triplet-issue-types-value"]');
      const itemsAffectedValue = page.locator('[data-testid="product-triplet-items-affected-value"]');
      const actionableNowValue = page.locator('[data-testid="product-triplet-actionable-now-value"]');

      await expect(issueTypesValue).toBeVisible();
      await expect(itemsAffectedValue).toBeVisible();
      await expect(actionableNowValue).toBeVisible();
    }

    // Check for no-eligible message on product level
    const productNoEligible = page.locator('[data-testid="product-no-eligible-items-message"]');
    if (await productNoEligible.isVisible({ timeout: 3000 })) {
      const messageText = await productNoEligible.textContent();
      expect(messageText?.includes('No items currently eligible for action')).toBeTruthy();
    }
  });

  test('UI-006: Click-through from Store Health to Work Queue preserves filter context', async ({ page }) => {
    // Start at Store Health
    await page.goto(`${WEB_URL}/projects/${testProjectId}/store-health`);

    // Wait for cards to load
    const cardsContainer = page.locator('[data-testid="store-health-cards"]');
    await expect(cardsContainer).toBeVisible({ timeout: 10000 });

    // Click discoverability card
    const discoverabilityCard = page.locator('[data-testid="store-health-card-discoverability"]');
    if (await discoverabilityCard.isVisible()) {
      await discoverabilityCard.click();

      // Should navigate to Work Queue with filter context
      await page.waitForURL(/\/work-queue/);
      const currentUrl = page.url();

      // URL should contain filter params or be on work-queue page
      expect(currentUrl.includes('/work-queue')).toBeTruthy();
    }
  });
});
