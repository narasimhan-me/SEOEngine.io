/**
 * [COUNT-INTEGRITY-1] Playwright Smoke Tests
 *
 * Validates count integrity trust contracts:
 * 1. Work Queue → Issues click integrity (card count matches filtered list count)
 * 2. Technical issues are informational (detected but not actionable, no dead clicks)
 * 3. Viewer role sees detected-only counts (no actionable issues)
 *
 * Critical paths: CP-008 (Work Queue → Issues integrity), CP-009 (Role-based actionability)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project for OWNER role tests.
 * [PATCH 9 FIXUP-2] Uses /testkit/e2e/seed-first-deo-win (correct endpoint from e2e-testkit.controller.ts).
 */
async function seedTestProjectOwner(request: any) {
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
 * Seed user and project for VIEWER role tests.
 * [PATCH 9 FIXUP-2] Uses /testkit/e2e/seed-self-service-viewer (correct endpoint from e2e-testkit.controller.ts).
 */
async function seedTestProjectViewer(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-self-service-viewer`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

/**
 * Helper to authenticate and set up the page.
 */
async function authenticatePage(page: any, request: any, seedFn: any) {
  const seedData = await seedFn(request);

  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, seedData.accessToken);

  return seedData;
}

test.describe('COUNT-INTEGRITY-1: Work Queue → Issues click integrity', () => {
  test('Card count matches filtered Issues list count (OWNER seed)', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request, seedTestProjectOwner);

    // Navigate to Work Queue
    await page.goto(`/projects/${projectId}/work-queue`);
    await page.waitForLoadState('networkidle');

    // [PATCH 9 FIXUP-2] Find first ASSET_OPTIMIZATION bundle with actionable issues
    const bundleCards = page.getByTestId('action-bundle-card');
    const bundleCount = await bundleCards.count();

    if (bundleCount === 0) {
      // No bundles - skip test (healthy project)
      test.skip();
      return;
    }

    // Find a card that contains "View Issues" link and has actionable count > 0
    let selectedCard = null;
    let expectedCount = 0;

    for (let i = 0; i < bundleCount; i++) {
      const card = bundleCards.nth(i);
      const cardText = await card.textContent();
      const viewIssuesLink = card.getByRole('link', { name: 'View Issues' });
      const hasViewIssues = await viewIssuesLink.count() > 0;
      // [COUNT-INTEGRITY-1.1 FIX-UP] Updated regex to match "actionable now" semantics
      const scopeCountMatch = cardText?.match(/(\d+)\s+actionable\s+now/);
      const scopeCount = scopeCountMatch ? parseInt(scopeCountMatch[1], 10) : 0;

      if (hasViewIssues && scopeCount > 0) {
        selectedCard = card;
        expectedCount = scopeCount;
        break;
      }
    }

    if (!selectedCard) {
      // No ASSET_OPTIMIZATION bundles with actionable issues - skip test
      test.skip();
      return;
    }

    // [PATCH 9 FIXUP-2] Click the "View Issues" link
    const viewIssuesLink = selectedCard.getByRole('link', { name: 'View Issues' });
    await viewIssuesLink.click();

    // Verify we landed on Issues page with click-integrity filters
    await expect(page.url()).toContain('/issues');
    await expect(page.url()).toContain('actionKey=');

    // Wait for Issues page to load
    await page.waitForLoadState('networkidle');

    // Count issue rows displayed (both actionable and informational)
    const issueCards = page.getByTestId('issue-card-actionable');
    const actualCount = await issueCards.count();

    // [COUNT-INTEGRITY-1] Click integrity: card count MUST match Issues list count
    expect(actualCount).toBe(expectedCount);

    // [PATCH 9 FIXUP-2] Verify click-integrity filter banner is present (use correct testid)
    const filterBanner = page.getByTestId('filter-context-banner');
    await expect(filterBanner).toBeVisible();
    await expect(filterBanner).toContainText('Filtered from Work Queue');
  });
});

test.describe('COUNT-INTEGRITY-1: Technical issues are informational', () => {
  test('Technical pillar issues show informational badge and are not clickable (OWNER seed)', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request, seedTestProjectOwner);

    // Navigate to Issues page
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // [PATCH 9 FIXUP] Switch to "Detected" mode FIRST (technical issues are informational, hidden in actionable mode)
    const detectedModeButton = page.getByTestId('mode-toggle-detected');
    await detectedModeButton.click();
    await page.waitForTimeout(500);

    // Click "Technical & Indexability" pillar filter
    const technicalPillarButton = page.getByRole('button', { name: /Technical & Indexability/i });
    await technicalPillarButton.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Look for informational issue cards
    const informationalCards = page.getByTestId('issue-card-informational');
    const informationalCount = await informationalCards.count();

    if (informationalCount === 0) {
      // No technical issues detected - skip test
      test.skip();
      return;
    }

    // Verify first informational card has "Informational" badge
    const firstCard = informationalCards.first();
    await expect(firstCard).toContainText('Informational');

    // [PATCH 9 FIXUP-2] Verify card contains no interactive CTA buttons/links (stronger check)
    const cardButtons = firstCard.locator('button');
    const cardLinks = firstCard.locator('a');
    const buttonCount = await cardButtons.count();
    const linkCount = await cardLinks.count();
    expect(buttonCount).toBe(0);
    expect(linkCount).toBe(0);

    // Verify informational cards remain visible in detected mode
    const detectedInformationalCards = page.getByTestId('issue-card-informational');
    const detectedInformationalCount = await detectedInformationalCards.count();
    expect(detectedInformationalCount).toBeGreaterThan(0);
  });
});

test.describe('COUNT-INTEGRITY-1: Viewer role sees detected-only counts', () => {
  test('VIEWER role has no actionable issues (scopeCount = 0, detected > 0)', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request, seedTestProjectViewer);

    // Navigate to Work Queue
    await page.goto(`/projects/${projectId}/work-queue`);
    await page.waitForLoadState('networkidle');

    // Find all ASSET_OPTIMIZATION bundles
    const bundleCards = page.getByTestId('action-bundle-card');
    const bundleCount = await bundleCards.count();

    if (bundleCount === 0) {
      // No bundles - skip test
      test.skip();
      return;
    }

    // [COUNT-INTEGRITY-1.1 FIX-UP] Check each bundle for zero-actionable neutral message
    for (let i = 0; i < Math.min(bundleCount, 3); i++) {
      const card = bundleCards.nth(i);
      const cardText = await card.textContent();

      // VIEWER bundles should show zero-actionable neutral message OR detected counts only
      const hasZeroActionableMessage = cardText?.includes('No items currently eligible for action');
      const hasDetectedCount = cardText?.match(/(\d+)\s+detected\s+issue/);

      // At least one of these conditions should be true for VIEWER
      expect(hasZeroActionableMessage || hasDetectedCount).toBe(true);

      // [COUNT-INTEGRITY-1.1 FIX-UP] Assert absence of action CTAs on zero-actionable bundles
      if (hasZeroActionableMessage) {
        const primaryCta = card.locator('a.bg-blue-600');
        const primaryCtaCount = await primaryCta.count();
        expect(primaryCtaCount).toBe(0);
      }
    }

    // Navigate to Issues page
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // [PATCH 9 FIXUP] Verify mode is forced to "detected" (use testid and check for active class)
    const detectedModeButton = page.getByTestId('mode-toggle-detected');
    await expect(detectedModeButton).toHaveClass(/bg-blue-600/); // Active state

    // Verify all issue cards are informational
    const allCards = page.locator('[data-testid^="issue-card-"]');
    const allCount = await allCards.count();

    if (allCount > 0) {
      const informationalCards = page.getByTestId('issue-card-informational');
      const informationalCount = await informationalCards.count();

      // [COUNT-INTEGRITY-1] VIEWER role: all issues are informational (detected but not actionable)
      expect(informationalCount).toBe(allCount);
    }

    // Verify no "Fix next" or actionable CTAs are present
    const fixNextButtons = page.getByRole('button', { name: /Fix next/i });
    const fixNextCount = await fixNextButtons.count();
    expect(fixNextCount).toBe(0);
  });
});
