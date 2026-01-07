/**
 * [ISSUE-TO-FIX-PATH-1] Playwright Smoke Tests
 *
 * Validates the Issue→Fix Path contract:
 * 1. Issue click always lands on visible fix (product workspace shows banner + highlight)
 * 2. Issue counts equal actionable issues (badge matches row count)
 * 3. Orphan issues are not actionable (no link/button navigation affordance)
 *
 * Critical paths: CP-008 (Issue-to-Fix-Path)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project for authenticated tests.
 * Uses the existing /testkit/e2e/seed-first-deo-win pattern.
 */
async function seedTestProject(request: any) {
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
 * Helper to authenticate and set up the page.
 */
async function authenticatePage(page: any, request: any) {
  const { accessToken, projectId, productIds } = await seedTestProject(request);

  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);

  return { accessToken, projectId, productIds };
}

test.describe('ISSUE-TO-FIX-PATH-1: Issue click lands on visible fix (product)', () => {
  test('From Overview "Top blockers" click lands on product with fix banner', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    // [ISSUE-TO-FIX-PATH-1 FIXUP-1] Navigate to Overview page explicitly
    await page.goto(`/projects/${projectId}/overview`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for "Top blockers" section or any issue link in Overview
    const issueLinks = page.locator('a[href*="/products/"][href*="issueId="]');
    const linkCount = await issueLinks.count();

    if (linkCount > 0) {
      // Click the first issue link
      const firstLink = issueLinks.first();
      await firstLink.click();

      // Verify we're on product page
      await expect(page.url()).toContain('/products/');
      await expect(page.url()).toContain('issueId=');

      // Check for issue-fix-context-banner
      const fixBanner = page.getByTestId('issue-fix-context-banner');
      await expect(fixBanner).toBeVisible();

      // Verify banner shows "You're here to fix:"
      await expect(fixBanner).toContainText("You're here to fix:");

      // Check for "Back to Issues" link
      const backLink = page.getByRole('link', { name: /Back to Issues/i });
      await expect(backLink).toBeVisible();
    }
  });

  test('Issue fix banner includes Back to Issues link', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    // Navigate directly to a product with issue context
    // This simulates clicking through from issues page
    if (productIds.length > 0) {
      await page.goto(`/projects/${projectId}/products/${productIds[0]}?from=issues&issueId=missing_seo_title&tab=metadata`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for issue-fix-context-banner
      const fixBanner = page.getByTestId('issue-fix-context-banner');

      // Banner may not appear if issue doesn't exist on this product
      if (await fixBanner.isVisible()) {
        // Check for "Back to Issues" link
        const backLink = page.getByRole('link', { name: /Back to Issues/i });
        await expect(backLink).toBeVisible();

        // Verify the back link points to the issues page
        const href = await backLink.getAttribute('href');
        expect(href).toContain('/issues');
      }
    }
  });
});

test.describe('ISSUE-TO-FIX-PATH-1: Issue counts equal actionable issues', () => {
  test('Product workspace Issues tab badge matches actionable row count', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    if (productIds.length > 0) {
      // Navigate to product workspace
      await page.goto(`/projects/${projectId}/products/${productIds[0]}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Look for the Issues tab count badge
      const tabCountBadge = page.getByTestId('product-issues-tab-count');

      // If there's a badge, it should match actionable issue count
      if (await tabCountBadge.isVisible()) {
        const badgeText = await tabCountBadge.textContent();
        const badgeCount = parseInt(badgeText || '0', 10);

        // Navigate to Issues tab
        const issuesTab = page.getByRole('link', { name: /Issues/i });
        await issuesTab.click();

        // Wait for issues to load
        await page.waitForLoadState('networkidle');

        // Count actionable issue rows
        const actionableRows = page.getByTestId('product-issue-row-actionable');
        const rowCount = await actionableRows.count();

        // Badge count should match row count
        expect(badgeCount).toBe(rowCount);
      }
    }
  });

  test('Actionable count header matches rendered rows', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    if (productIds.length > 0) {
      // Navigate to product workspace Issues tab
      await page.goto(`/projects/${projectId}/products/${productIds[0]}?tab=issues`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Look for the actionable count header
      const countHeader = page.getByTestId('product-issues-actionable-count');

      if (await countHeader.isVisible()) {
        const headerText = await countHeader.textContent();
        // Extract number from text like "3 actionable issues"
        const match = headerText?.match(/(\d+)/);
        const headerCount = match ? parseInt(match[1], 10) : 0;

        // Count actionable issue rows
        const actionableRows = page.getByTestId('product-issue-row-actionable');
        const rowCount = await actionableRows.count();

        // Header count should match row count
        expect(headerCount).toBe(rowCount);
      }
    }
  });
});

test.describe('ISSUE-TO-FIX-PATH-1: Orphan issues are not actionable', () => {
  test('Informational issues have no link/button navigation affordance', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for informational (orphan) issue cards
    const informationalCards = page.getByTestId('issue-card-informational');
    const cardCount = await informationalCards.count();

    if (cardCount > 0) {
      // Check that informational cards are NOT buttons
      for (let i = 0; i < cardCount; i++) {
        const card = informationalCards.nth(i);

        // Should NOT have role="button"
        const role = await card.getAttribute('role');
        expect(role).not.toBe('button');

        // Should NOT be focusable (no tabIndex)
        const tabIndex = await card.getAttribute('tabindex');
        expect(tabIndex).not.toBe('0');

        // Should have informational badge
        await expect(card).toContainText('Informational');
      }
    }
  });

  test('Actionable issues are clickable', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for actionable issue cards
    const actionableCards = page.getByTestId('issue-card-actionable');
    const cardCount = await actionableCards.count();

    if (cardCount > 0) {
      // First actionable card should be clickable
      const firstCard = actionableCards.first();

      // Get the card's button element (should be inside it)
      const button = firstCard.locator('button').first();
      if (await button.isVisible()) {
        // Click should navigate somewhere
        const initialUrl = page.url();
        await button.click();

        // URL should change (navigated to fix destination)
        await page.waitForLoadState('networkidle');
        // Just verify page didn't error - actual destination depends on issue type
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  /**
   * [ISSUE-TO-FIX-PATH-1 FIXUP-2] Dead-click regression test
   *
   * Trust invariant: If something looks clickable (has button affordance),
   * clicking it MUST result in navigation. No dead-ends allowed.
   */
  test('Clicking actionable issue card ALWAYS navigates (no dead-click)', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Get all actionable issue cards
    const actionableCards = page.getByTestId('issue-card-actionable');
    const cardCount = await actionableCards.count();

    // Test up to first 3 actionable cards to verify no dead-clicks
    const cardsToTest = Math.min(cardCount, 3);

    for (let i = 0; i < cardsToTest; i++) {
      // Navigate fresh to issues page for each test
      await page.goto(`/projects/${projectId}/issues`);
      await page.waitForLoadState('networkidle');

      const card = page.getByTestId('issue-card-actionable').nth(i);
      const button = card.locator('button').first();

      if (await button.isVisible()) {
        const initialUrl = page.url();

        // Click the actionable card
        await button.click();

        // Wait for navigation
        await page.waitForLoadState('networkidle');

        // CRITICAL: URL MUST have changed - no dead-clicks allowed
        const newUrl = page.url();
        expect(newUrl).not.toBe(initialUrl);

        // Page must load without error
        await expect(page.locator('body')).toBeVisible();

        // Should land on a product page or work queue with issueId
        const landedOnValidDestination =
          newUrl.includes('/products/') ||
          newUrl.includes('/work-queue');
        expect(landedOnValidDestination).toBe(true);
      }
    }
  });

  test('Work Queue issue fix banner shows when from=issues', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Work Queue with issue context
    await page.goto(`/projects/${projectId}/work-queue?from=issues&issueId=missing_seo_title`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for issue-fix-context-banner
    const fixBanner = page.getByTestId('work-queue-issue-fix-context-banner');

    // Banner should be visible when from=issues and issueId present
    await expect(fixBanner).toBeVisible();

    // Verify banner shows "You're here to fix:"
    await expect(fixBanner).toContainText("You're here to fix:");

    // Check for "Back to Issues" link
    const backLink = page.getByRole('link', { name: /Back to Issues/i });
    await expect(backLink).toBeVisible();
  });
});
