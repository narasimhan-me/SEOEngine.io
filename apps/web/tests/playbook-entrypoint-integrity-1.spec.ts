/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Playwright E2E Tests
 *
 * Tests for playbook entrypoint routing integrity.
 * Verifies that banner CTA routes to the correct playbook based on eligibility counts.
 *
 * Uses seed: POST /testkit/e2e/seed-playbook-entrypoint-integrity-1
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
const APP_BASE_URL = process.env.PLAYWRIGHT_APP_URL || 'http://localhost:3000';

interface SeedResponse {
  user: {
    id: string;
    email: string;
  };
  projectId: string;
  productIds: string[];
  accessToken: string;
  expectedTitlesEligible: number;
  expectedDescriptionsEligible: number;
}

/**
 * Seed test data and authenticate.
 */
async function seedAndAuth(page: Page): Promise<SeedResponse> {
  const res = await fetch(`${API_BASE_URL}/testkit/e2e/seed-playbook-entrypoint-integrity-1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

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

/**
 * Connect Shopify store (reuse pattern from automation-entry-1.spec.ts).
 */
async function connectShopify(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) {
    throw new Error(`Connect Shopify failed: ${res.status} ${await res.text()}`);
  }
}

test.describe('PLAYBOOK-ENTRYPOINT-INTEGRITY-1: Playbook Banner Routing', () => {
  /**
   * PEPI1-001: Playbook banner → preview integrity
   *
   * Given: Titles eligibleCount = 0, Descriptions eligibleCount > 0
   * When: User visits /playbooks and clicks the banner CTA
   * Then: URL should route to /playbooks/missing_seo_description with step=preview
   *       URL should NOT contain missing_seo_title
   *       Stepper should be visible
   *       Zero-eligible empty state should NOT be visible
   */
  test('PEPI1-001: Playbook banner routes to correct playbook based on eligibility', async ({ page }) => {
    const seed = await seedAndAuth(page);

    // Connect Shopify store
    await connectShopify(seed.projectId);

    // Navigate to playbooks page
    await page.goto(`${APP_BASE_URL}/projects/${seed.projectId}/playbooks`);

    // Wait for page to load and banner to appear
    // The banner should show "Preview missing SEO descriptions" since descriptions has eligible items
    await page.waitForSelector('text=Preview missing SEO descriptions', { timeout: 15000 });

    // Click the banner CTA
    const bannerCta = page.locator('button:has-text("Preview missing SEO descriptions")');
    await expect(bannerCta).toBeVisible();
    await bannerCta.click();

    // Wait for navigation
    await page.waitForURL(/\/playbooks\/missing_seo_description/);

    // Get the current URL
    const currentUrl = page.url();

    // Assert: URL contains /playbooks/missing_seo_description
    expect(currentUrl).toContain(`/projects/${seed.projectId}/playbooks/missing_seo_description`);

    // Assert: URL contains step=preview
    expect(currentUrl).toContain('step=preview');

    // Assert: URL contains source=banner
    expect(currentUrl).toContain('source=banner');

    // Assert: URL does NOT contain missing_seo_title (CRITICAL)
    expect(currentUrl).not.toContain('missing_seo_title');

    // Assert: Stepper is visible (indicates we're in a valid playbook run)
    await expect(page.locator('[data-testid="playbooks-stepper"]')).toBeVisible();

    // Assert: Zero-eligible empty state is NOT visible
    // (This would indicate a mismatch between what was clicked and what was shown)
    const zeroEligibleState = page.locator('[data-testid="playbook-zero-eligible-empty-state"]');
    await expect(zeroEligibleState).not.toBeVisible();
  });

  /**
   * PEPI1-002: Banner routing integrity with PRODUCT scope (scoped eligibility)
   *
   * Given: User enters Playbooks with assetType=PRODUCTS and scopeAssetRefs=<productIds>
   * When: User clicks the banner CTA "Preview missing SEO descriptions"
   * Then: URL routes to /playbooks/missing_seo_description with step=preview&source=banner
   *       URL preserves assetType=PRODUCTS and the same scopeAssetRefs values
   *       Stepper is visible and zero-eligible empty state is NOT visible
   */
  test('PEPI1-002: Playbook banner routing stays scope-consistent for scoped PRODUCTS entry', async ({ page }) => {
    const seed = await seedAndAuth(page);

    // Connect Shopify store
    await connectShopify(seed.projectId);

    const scopedProductIds = [seed.productIds[1], seed.productIds[2]];

    const scopedUrl = new URL(`${APP_BASE_URL}/projects/${seed.projectId}/playbooks`);
    scopedUrl.searchParams.set('source', 'asset_list');
    scopedUrl.searchParams.set('assetType', 'PRODUCTS');
    scopedUrl.searchParams.append('scopeAssetRefs', scopedProductIds[0]);
    scopedUrl.searchParams.append('scopeAssetRefs', scopedProductIds[1]);

    // Navigate to playbooks page with explicit PRODUCTS scope (repeated scopeAssetRefs params)
    await page.goto(scopedUrl.toString());

    // Wait for banner CTA to appear (descriptions playbook should be eligible in this scope)
    await page.waitForSelector('text=Preview missing SEO descriptions', { timeout: 15000 });

    // Click the banner CTA
    const bannerCta = page.locator('button:has-text("Preview missing SEO descriptions")');
    await expect(bannerCta).toBeVisible();
    await bannerCta.click();

    // Wait for navigation
    await page.waitForURL(/\/playbooks\/missing_seo_description/);

    const currentUrl = page.url();

    // Assert canonical target
    expect(currentUrl).toContain(`/projects/${seed.projectId}/playbooks/missing_seo_description`);
    expect(currentUrl).toContain('step=preview');
    expect(currentUrl).toContain('source=banner');

    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4] Assert scope via URLSearchParams for repeated params
    const url = new URL(currentUrl);
    expect(url.searchParams.get('assetType')).toBe('PRODUCTS');
    const scopeRefs = url.searchParams.getAll('scopeAssetRefs');
    expect(scopeRefs).toEqual(expect.arrayContaining(scopedProductIds));

    // Stepper visible → valid run surface
    await expect(page.locator('[data-testid="playbooks-stepper"]')).toBeVisible();

    // Zero-eligible empty state must not be visible
    const zeroEligibleState = page.locator('[data-testid="playbook-zero-eligible-empty-state"]');
    await expect(zeroEligibleState).not.toBeVisible();
  });
});
