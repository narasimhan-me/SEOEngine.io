/**
 * [DRAFT-LIST-PARITY-1] Playwright E2E Tests
 *
 * Tests for list-level draft review entrypoint parity.
 * Verifies that "Review drafts" on Pages and Collections lists routes
 * to the asset detail Drafts tab (NOT Work Queue or Playbooks).
 *
 * Uses seed: POST /testkit/e2e/seed-draft-field-coverage-1
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
const APP_BASE_URL = process.env.PLAYWRIGHT_APP_URL || 'http://localhost:3000';

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
  const res = await fetch(`${API_BASE_URL}/testkit/e2e/seed-draft-field-coverage-1`, {
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

test.describe('DRAFT-LIST-PARITY-1: List-Level Draft Review Routing', () => {
  /**
   * DLP1-001: Pages list "Review drafts" routes to asset detail Drafts tab
   *
   * MUST NOT route to Work Queue or Playbooks.
   * Routes to /projects/{projectId}/assets/pages/{pageId}?tab=drafts&from=asset_list
   */
  test('DLP1-001: Pages list Review drafts routes to asset detail Drafts tab', async ({ page }) => {
    const seed = await seedAndAuth(page);

    // Navigate to Pages list filtered by hasDraft=true
    await page.goto(`${APP_BASE_URL}/projects/${seed.projectId}/assets/pages?hasDraft=true`);

    // Wait for page list to load
    await page.waitForSelector('table');

    // Find the row containing /pages/dfc1-diff-page (the page with a diff draft)
    const row = page.locator('tr', { has: page.locator('code:has-text("/pages/dfc1-diff-page")') });
    await expect(row).toBeVisible();

    // Click "Review drafts" action
    const reviewDraftsLink = row.locator('a:has-text("Review drafts")');
    await expect(reviewDraftsLink).toBeVisible();
    await reviewDraftsLink.click();

    // Wait for navigation
    await page.waitForURL(/\/assets\/pages\//);

    // Get the current URL
    const currentUrl = page.url();

    // Assert: URL path contains the correct asset detail route
    expect(currentUrl).toContain(`/projects/${seed.projectId}/assets/pages/${seed.pageDiffId}`);

    // Assert: URL contains tab=drafts
    expect(currentUrl).toContain('tab=drafts');

    // Assert: URL contains from=asset_list
    expect(currentUrl).toContain('from=asset_list');

    // Assert: URL does NOT contain work-queue or playbooks (CRITICAL)
    expect(currentUrl).not.toContain('/work-queue');
    expect(currentUrl).not.toContain('/automation/playbooks');

    // Assert: Drafts tab is actually rendered
    await expect(page.locator('[data-testid="drafts-tab-panel"]')).toBeVisible();

    // Assert: Current vs Draft diff display is visible
    await expect(page.locator('text=Current (live)')).toBeVisible();
    await expect(page.locator('text=Draft (staged)')).toBeVisible();
  });

  /**
   * DLP1-002: Collections list "Review drafts" routes to asset detail Drafts tab
   *
   * MUST NOT route to Work Queue or Playbooks.
   * Routes to /projects/{projectId}/assets/collections/{collectionId}?tab=drafts&from=asset_list
   */
  test('DLP1-002: Collections list Review drafts routes to asset detail Drafts tab', async ({ page }) => {
    const seed = await seedAndAuth(page);

    // Navigate to Collections list filtered by hasDraft=true
    await page.goto(`${APP_BASE_URL}/projects/${seed.projectId}/assets/collections?hasDraft=true`);

    // Wait for collection list to load
    await page.waitForSelector('table');

    // Find the row containing /collections/dfc1-diff-collection (the collection with a diff draft)
    const row = page.locator('tr', { has: page.locator('code:has-text("/collections/dfc1-diff-collection")') });
    await expect(row).toBeVisible();

    // Click "Review drafts" action
    const reviewDraftsLink = row.locator('a:has-text("Review drafts")');
    await expect(reviewDraftsLink).toBeVisible();
    await reviewDraftsLink.click();

    // Wait for navigation
    await page.waitForURL(/\/assets\/collections\//);

    // Get the current URL
    const currentUrl = page.url();

    // Assert: URL path contains the correct asset detail route
    expect(currentUrl).toContain(`/projects/${seed.projectId}/assets/collections/${seed.collectionDiffId}`);

    // Assert: URL contains tab=drafts
    expect(currentUrl).toContain('tab=drafts');

    // Assert: URL contains from=asset_list
    expect(currentUrl).toContain('from=asset_list');

    // Assert: URL does NOT contain work-queue or playbooks (CRITICAL)
    expect(currentUrl).not.toContain('/work-queue');
    expect(currentUrl).not.toContain('/automation/playbooks');

    // Assert: Drafts tab is actually rendered
    await expect(page.locator('[data-testid="drafts-tab-panel"]')).toBeVisible();

    // Assert: Current vs Draft diff display is visible
    await expect(page.locator('text=Current (live)')).toBeVisible();
    await expect(page.locator('text=Draft (staged)')).toBeVisible();
  });
});
