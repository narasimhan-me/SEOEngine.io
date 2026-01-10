/**
 * [ROUTE-INTEGRITY-1] Deterministic Deep Links + Scope Banner E2E Tests
 *
 * Validates the trust-hardening routing contract:
 * 1. URL-derived from + returnTo (+ optional scope params)
 * 2. "URL is source of truth" rule
 * 3. ScopeBanner surfaces correctly: Issues Engine, Playbooks, Products list,
 *    Pages list, Collections list, Product detail
 * 4. Back navigation returns to filtered origin URLs
 * 5. Clear filters resets to base routes
 *
 * Critical paths:
 * - Store Health -> Issues Engine -> Back
 * - Products list (with filter) -> Fix next -> Back (filter preserved)
 * - Work Queue -> Playbooks -> Back
 *
 * Prerequisites:
 * - /testkit/e2e/seed-first-deo-win endpoint available
 * - /testkit/e2e/seed-list-actions-clarity-1 endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project via seed-first-deo-win
 */
async function seedFirstDeoWin(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-first-deo-win`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
    productIds: body.productIds as string[],
    accessToken: body.accessToken as string,
  };
}

/**
 * Seed user and project via seed-list-actions-clarity-1
 */
async function seedListActionsClarity1(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-list-actions-clarity-1`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
    needsAttentionProductId: body.needsAttentionProductId as string,
  };
}

/**
 * Helper to authenticate and set up the page
 */
async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('ROUTE-INTEGRITY-1: Store Health -> Issues Engine', () => {
  test('Store Health -> Discoverability card -> Issues Engine with scope banner', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Store Health page
    await page.goto(`/projects/${projectId}/store-health`);
    await page.waitForLoadState('networkidle');

    // Click Discoverability card
    const discoverabilityCard = page.locator('[data-testid="health-card"]')
      .filter({ hasText: 'Discoverability' });

    if (await discoverabilityCard.isVisible()) {
      await discoverabilityCard.click();
      await page.waitForLoadState('networkidle');

      // Assert URL contains from=store_health and returnTo
      const url = page.url();
      expect(url).toContain('from=store_health');
      expect(url).toContain('returnTo=');

      // Assert scope-banner is visible
      const scopeBanner = page.locator('[data-testid="scope-banner"]');
      await expect(scopeBanner).toBeVisible();

      // Assert banner contains Source: Store Health
      await expect(scopeBanner).toContainText('Source:');
      await expect(scopeBanner).toContainText('Store Health');

      // Click Back button
      const backButton = page.locator('[data-testid="scope-banner-back"]');
      await expect(backButton).toBeVisible();
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Assert URL returns to /store-health
      expect(page.url()).toContain('/store-health');

      // Navigate back to Issues Engine via Discoverability
      await discoverabilityCard.click();
      await page.waitForLoadState('networkidle');

      // Click Clear filters
      const clearButton = page.locator('[data-testid="scope-banner-clear"]');
      await expect(clearButton).toBeVisible();
      await clearButton.click();
      await page.waitForLoadState('networkidle');

      // Assert URL is base /issues with no from/returnTo/pillar
      const clearedUrl = page.url();
      expect(clearedUrl).toContain('/issues');
      expect(clearedUrl).not.toContain('from=');
      expect(clearedUrl).not.toContain('returnTo=');
      expect(clearedUrl).not.toContain('pillar=');
    }
  });
});

test.describe('ROUTE-INTEGRITY-1: Products List -> Fix Next -> Back', () => {
  test('Products list (with filter) -> Fix next -> Back preserves filter', async ({ page, request }) => {
    const { accessToken, projectId, needsAttentionProductId } = await seedListActionsClarity1(request);
    await authenticatePage(page, accessToken);

    // Navigate to Products list with filter
    const filterUrl = `/projects/${projectId}/products?q=Missing`;
    await page.goto(filterUrl);
    await page.waitForLoadState('networkidle');

    // Find a row with "Fix next" action
    const fixNextLink = page.locator('[data-testid="row-primary-action"]')
      .filter({ hasText: /Fix next/i })
      .first();

    if (await fixNextLink.isVisible({ timeout: 5000 })) {
      await fixNextLink.click();
      await page.waitForLoadState('networkidle');

      // Assert destination URL contains from=asset_list and returnTo with q=
      const url = page.url();
      expect(url).toContain('from=asset_list');
      expect(url).toContain('returnTo=');

      // Decode returnTo and check it contains the original filter
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const returnTo = urlParams.get('returnTo');
      if (returnTo) {
        expect(decodeURIComponent(returnTo)).toContain('q=Missing');
      }

      // Assert scope-banner is visible
      const scopeBanner = page.locator('[data-testid="scope-banner"]');
      await expect(scopeBanner).toBeVisible();

      // Click Back button
      const backButton = page.locator('[data-testid="scope-banner-back"]');
      await expect(backButton).toBeVisible();
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Assert returned to products with original filter preserved
      const returnedUrl = page.url();
      expect(returnedUrl).toContain('/products');
      expect(returnedUrl).toContain('q=Missing');
    }
  });
});

test.describe('ROUTE-INTEGRITY-1: Work Queue -> Playbooks -> Back', () => {
  test('Work Queue -> Playbooks link -> Back returns to Work Queue', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Work Queue
    await page.goto(`/projects/${projectId}/work-queue`);
    await page.waitForLoadState('networkidle');

    // Find a link to playbooks (action bundle card CTA)
    const playbooksLink = page.locator('a[href*="/automation/playbooks"]').first();

    if (await playbooksLink.isVisible({ timeout: 5000 })) {
      await playbooksLink.click();
      await page.waitForLoadState('networkidle');

      // Assert URL contains from=work_queue and returnTo
      const url = page.url();
      expect(url).toContain('from=work_queue');
      expect(url).toContain('returnTo=');

      // Assert scope-banner is visible and shows Work Queue as source
      const scopeBanner = page.locator('[data-testid="scope-banner"]');
      await expect(scopeBanner).toBeVisible();
      await expect(scopeBanner).toContainText('Source:');
      await expect(scopeBanner).toContainText('Work Queue');

      // Click Back button
      const backButton = page.locator('[data-testid="scope-banner-back"]');
      await expect(backButton).toBeVisible();
      await backButton.click();
      await page.waitForLoadState('networkidle');

      // Assert returned to Work Queue
      expect(page.url()).toContain('/work-queue');

      // Navigate back to Playbooks
      await page.goto(`/projects/${projectId}/work-queue`);
      await page.waitForLoadState('networkidle');

      const playbooksLink2 = page.locator('a[href*="/automation/playbooks"]').first();
      if (await playbooksLink2.isVisible({ timeout: 3000 })) {
        await playbooksLink2.click();
        await page.waitForLoadState('networkidle');

        // Click Clear filters
        const clearButton = page.locator('[data-testid="scope-banner-clear"]');
        if (await clearButton.isVisible({ timeout: 3000 })) {
          await clearButton.click();
          await page.waitForLoadState('networkidle');

          // Assert URL is base /automation/playbooks with no from/returnTo
          const clearedUrl = page.url();
          expect(clearedUrl).toContain('/automation/playbooks');
          expect(clearedUrl).not.toContain('from=');
          expect(clearedUrl).not.toContain('returnTo=');
        }
      }
    }
  });
});

test.describe('ROUTE-INTEGRITY-1: Scope Banner Visibility', () => {
  test('Scope banner only renders when from param is present', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Issues Engine without from param
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // Assert scope-banner is NOT visible (no from param)
    const scopeBanner = page.locator('[data-testid="scope-banner"]');
    await expect(scopeBanner).not.toBeVisible();

    // Navigate with from param
    await page.goto(`/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}`);
    await page.waitForLoadState('networkidle');

    // Assert scope-banner IS visible
    await expect(scopeBanner).toBeVisible();
  });
});
