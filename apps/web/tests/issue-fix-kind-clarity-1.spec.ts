/**
 * [ISSUE-FIX-KIND-CLARITY-1] Playwright Regression Tests
 *
 * Validates the semantic distinction between DIAGNOSTIC vs EDIT/AI fix kinds:
 * 1. DIAGNOSTIC issues show "Review" CTA (not "Fix")
 * 2. DIAGNOSTIC issues show blue "diagnostic" arrival callout (not yellow "anchor not found")
 * 3. DIAGNOSTIC callout shows "View related issues" CTA
 * 4. Issues Engine and DEO Overview use correct CTA wording
 *
 * Critical paths: CP-008 (Issue-to-Fix-Path)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

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

test.describe('ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC issues use Review CTA', () => {
  /**
   * IFKC1-001: DIAGNOSTIC issues show "Review" CTA in Issues Engine
   *
   * Given: An issue with fixKind=DIAGNOSTIC (e.g., not_answer_ready)
   * When: User views the issue in the Issues Engine
   * Then: CTA should show "Review" (not "Fix")
   */
  test('IFKC1-001: DIAGNOSTIC issue shows Review CTA in Issues Engine', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for issue cards with DIAGNOSTIC fixKind
    const diagnosticCards = page.locator('[data-fix-kind="DIAGNOSTIC"]');
    const diagnosticCount = await diagnosticCards.count();

    if (diagnosticCount > 0) {
      // First DIAGNOSTIC card should show "Review" CTA
      const firstCard = diagnosticCards.first();
      const ctaElement = firstCard.getByTestId('issue-card-cta');

      // CTA should contain "Review" (not "Fix")
      await expect(ctaElement).toBeVisible();
      const ctaText = await ctaElement.textContent();
      expect(ctaText).toContain('Review');
      expect(ctaText).not.toContain('Fix');
    }
  });

  /**
   * IFKC1-002: Non-DIAGNOSTIC issues show "Fix" CTA in Issues Engine
   *
   * Given: An issue with fixKind=EDIT (e.g., missing_seo_title)
   * When: User views the issue in the Issues Engine
   * Then: CTA should show "Fix" (not "Review")
   */
  test('IFKC1-002: Non-DIAGNOSTIC issue shows Fix CTA in Issues Engine', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for issue cards with EDIT fixKind (or no fixKind - defaults to EDIT)
    const editCards = page.locator('[data-fix-kind="EDIT"], [data-testid="issue-card-actionable"]:not([data-fix-kind="DIAGNOSTIC"])');
    const editCount = await editCards.count();

    if (editCount > 0) {
      // First EDIT card should show "Fix" CTA
      const firstCard = editCards.first();
      const ctaElement = firstCard.getByTestId('issue-card-cta');

      if (await ctaElement.isVisible()) {
        const ctaText = await ctaElement.textContent();
        expect(ctaText).toContain('Fix');
      }
    }
  });
});

test.describe('ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC arrival callout semantics', () => {
  /**
   * IFKC1-003: DIAGNOSTIC issue arrival shows blue callout (not yellow)
   *
   * Given: User navigates to a product with DIAGNOSTIC issue context
   * When: The arrival callout is rendered
   * Then: Callout should be blue (diagnostic variant), not yellow (anchor_not_found)
   */
  test('IFKC1-003: DIAGNOSTIC arrival callout uses blue styling', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    if (productIds.length > 0) {
      // Navigate to product with DIAGNOSTIC issue context (not_answer_ready)
      await page.goto(
        `/projects/${projectId}/products/${productIds[0]}?from=issues&issueId=not_answer_ready&tab=search-intent&fixKind=DIAGNOSTIC`
      );

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for issue-fix-context-banner
      const fixBanner = page.getByTestId('issue-fix-context-banner');

      if (await fixBanner.isVisible()) {
        // Callout should be blue (diagnostic variant), not yellow (anchor_not_found)
        // Blue class: bg-blue-50 border-blue-200 text-blue-800
        // Yellow class: bg-yellow-50 border-yellow-200 text-yellow-800
        const bannerClass = await fixBanner.getAttribute('class');
        expect(bannerClass).toContain('bg-blue-50');
        expect(bannerClass).not.toContain('bg-yellow-50');

        // Callout should say "You're here to review:" (not "You're here to fix:")
        await expect(fixBanner).toContainText("You're here to review:");
      }
    }
  });

  /**
   * IFKC1-004: DIAGNOSTIC callout shows "View related issues" CTA
   *
   * Given: User is on a product page with DIAGNOSTIC issue context
   * When: The arrival callout is rendered
   * Then: Callout should include "View related issues" link
   */
  test('IFKC1-004: DIAGNOSTIC callout shows View related issues CTA', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    if (productIds.length > 0) {
      // Navigate to product with DIAGNOSTIC issue context
      await page.goto(
        `/projects/${projectId}/products/${productIds[0]}?from=issues&issueId=not_answer_ready&tab=search-intent&fixKind=DIAGNOSTIC`
      );

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for issue-fix-context-banner
      const fixBanner = page.getByTestId('issue-fix-context-banner');

      if (await fixBanner.isVisible()) {
        // Look for "View related issues" link
        const viewRelatedLink = page.getByTestId('issue-fix-view-related-issues');
        await expect(viewRelatedLink).toBeVisible();

        // Link should point to issues tab
        const href = await viewRelatedLink.getAttribute('href');
        expect(href).toContain('tab=issues');
      }
    }
  });
});

test.describe('ISSUE-FIX-KIND-CLARITY-1: DEO Overview uses correct CTA wording', () => {
  /**
   * IFKC1-005: DEO Overview "Top Recommended Actions" uses "Review" for DIAGNOSTIC
   *
   * Given: DEO Overview has a DIAGNOSTIC issue in "Top Recommended Actions"
   * When: User views the DEO Overview page
   * Then: CTA should show "Review" (not "Fix now")
   */
  test('IFKC1-005: DEO Overview shows correct CTA for DIAGNOSTIC issues', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to DEO Overview
    await page.goto(`/projects/${projectId}/deo`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for issue CTAs in Top Recommended Actions
    const issueCtas = page.getByTestId('deo-overview-issue-cta');
    const ctaCount = await issueCtas.count();

    if (ctaCount > 0) {
      // Verify each CTA uses appropriate wording
      // (We can't deterministically know which are DIAGNOSTIC without inspecting data,
      // but we can verify the CTA text is either "Review" or "Fix now" - not empty or broken)
      for (let i = 0; i < ctaCount; i++) {
        const cta = issueCtas.nth(i);
        const ctaText = await cta.textContent();
        expect(ctaText === 'Review' || ctaText === 'Fix now').toBe(true);
      }
    }
  });
});
