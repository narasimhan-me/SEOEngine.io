/**
 * [ISSUE-FIX-KIND-CLARITY-1] Playwright Regression Tests
 * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Strict assertions, no no-op guards
 * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] Click chain + pillar assertion
 *
 * Validates the semantic distinction between DIAGNOSTIC vs EDIT/AI fix kinds:
 * 1. DIAGNOSTIC issues show "Review" CTA (not "Fix")
 * 2. DIAGNOSTIC issues show blue "diagnostic" arrival callout (not yellow "anchor not found")
 * 3. DIAGNOSTIC callout shows "View related issues" CTA (routes to Issues Engine)
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
   *
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] No no-op guard - test fails if no DIAGNOSTIC issues
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] Require ≥1 DIAGNOSTIC card (not exactly 1)
   */
  test('IFKC1-001: DIAGNOSTIC issue shows Review CTA in Issues Engine', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] STRICT: Expect at least 1 DIAGNOSTIC card (not exactly 1)
    const diagnosticCards = page.locator('[data-fix-kind="DIAGNOSTIC"]');
    const diagnosticCount = await diagnosticCards.count();
    expect(diagnosticCount).toBeGreaterThan(0);

    // First DIAGNOSTIC card should show "Review" CTA
    const firstCard = diagnosticCards.first();
    const ctaElement = firstCard.getByTestId('issue-card-cta');

    // CTA should contain "Review" (not "Fix")
    await expect(ctaElement).toBeVisible();
    const ctaText = await ctaElement.textContent();
    expect(ctaText).toContain('Review');
    expect(ctaText).not.toContain('Fix');
  });

  /**
   * IFKC1-002: Non-DIAGNOSTIC issues show "Fix" CTA in Issues Engine
   *
   * Given: An issue with fixKind=EDIT (e.g., missing_seo_title)
   * When: User views the issue in the Issues Engine
   * Then: CTA should show "Fix" or similar action label (not "Review")
   *
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] No no-op guard - test fails if no EDIT issues
   */
  test('IFKC1-002: Non-DIAGNOSTIC issue shows Fix CTA in Issues Engine', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to project-level Issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Expect at least 1 EDIT card
    // Look for cards with EDIT fixKind (seed data should have missing_seo_title)
    const editCards = page.locator('[data-fix-kind="EDIT"]');
    const editCount = await editCards.count();
    expect(editCount).toBeGreaterThan(0);

    // First EDIT card should show a non-Review CTA
    const firstCard = editCards.first();
    const ctaElement = firstCard.getByTestId('issue-card-cta');

    // CTA should be visible and NOT contain "Review"
    await expect(ctaElement).toBeVisible();
    const ctaText = await ctaElement.textContent();
    expect(ctaText).not.toContain('Review');
  });
});

test.describe('ISSUE-FIX-KIND-CLARITY-1: DIAGNOSTIC arrival callout semantics', () => {
  /**
   * IFKC1-003: DIAGNOSTIC issue arrival shows blue callout (not yellow)
   *
   * Given: User navigates to a product with DIAGNOSTIC issue context
   * When: The arrival callout is rendered
   * Then: Callout should be blue (diagnostic variant), not yellow (anchor_not_found)
   *
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] fixKind is NOT passed via URL (derived from config)
   */
  test('IFKC1-003: DIAGNOSTIC arrival callout uses blue styling', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Expect at least 1 product
    expect(productIds.length).toBeGreaterThan(0);

    // Navigate to product with DIAGNOSTIC issue context (not_answer_ready)
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] No fixKind in URL - it's derived from config
    await page.goto(
      `/projects/${projectId}/products/${productIds[0]}?from=issues&issueId=not_answer_ready&tab=search-intent`
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Banner must be visible
    const fixBanner = page.getByTestId('issue-fix-context-banner');
    await expect(fixBanner).toBeVisible();

    // Callout should be blue (diagnostic variant), not yellow (anchor_not_found)
    // Blue class: bg-blue-50 border-blue-200 text-blue-800
    // Yellow class: bg-yellow-50 border-yellow-200 text-yellow-800
    const bannerClass = await fixBanner.getAttribute('class');
    expect(bannerClass).toContain('bg-blue-50');
    expect(bannerClass).not.toContain('bg-yellow-50');

    // Callout should say "You're here to review:" (not "You're here to fix:")
    await expect(fixBanner).toContainText("You're here to review:");
  });

  /**
   * IFKC1-004: DIAGNOSTIC callout shows "View related issues" CTA and navigates correctly
   *
   * Given: User is on a product page with DIAGNOSTIC issue context
   * When: The arrival callout is rendered and user clicks "View related issues"
   * Then: Browser navigates to Issues Engine with pillar=search_intent_fit preserved
   *
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Link routes to Issues Engine, not product tab=issues
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] Full click chain + pillar assertion
   */
  test('IFKC1-004: DIAGNOSTIC callout shows View related issues CTA', async ({ page, request }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Expect at least 1 product
    expect(productIds.length).toBeGreaterThan(0);

    // Navigate to product with DIAGNOSTIC issue context
    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] No fixKind in URL - it's derived from config
    await page.goto(
      `/projects/${projectId}/products/${productIds[0]}?from=issues&issueId=not_answer_ready&tab=search-intent`
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Banner must be visible
    const fixBanner = page.getByTestId('issue-fix-context-banner');
    await expect(fixBanner).toBeVisible();

    // Look for "View related issues" link
    const viewRelatedLink = page.getByTestId('issue-fix-view-related-issues');
    await expect(viewRelatedLink).toBeVisible();

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] Assert href contains exact pillar value
    const href = await viewRelatedLink.getAttribute('href');
    expect(href).toContain('/issues');
    expect(href).toContain('mode=detected');
    expect(href).toContain('pillar=search_intent_fit');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2] Click and assert navigation
    await viewRelatedLink.click();
    await page.waitForLoadState('networkidle');

    // Assert browser is on Issues Engine with correct query params
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/projects/${projectId}/issues`);

    // Parse query params to verify preservation
    const url = new URL(currentUrl);
    expect(url.searchParams.get('mode')).toBe('detected');
    expect(url.searchParams.get('from')).toBe('product_details');
    expect(url.searchParams.get('pillar')).toBe('search_intent_fit');
  });
});

test.describe('ISSUE-FIX-KIND-CLARITY-1: DEO Overview uses correct CTA wording', () => {
  /**
   * IFKC1-005: DEO Overview "Top Recommended Actions" uses "Review" for DIAGNOSTIC
   *
   * Given: DEO Overview has a DIAGNOSTIC issue in "Top Recommended Actions"
   * When: User views the DEO Overview page
   * Then: CTA should show "Review" (not "Fix now")
   *
   * [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] Strict assertion - at least 1 CTA must exist
   */
  test('IFKC1-005: DEO Overview shows correct CTA for DIAGNOSTIC issues', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to DEO Overview
    await page.goto(`/projects/${projectId}/deo`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // [ISSUE-FIX-KIND-CLARITY-1-FIXUP-1] STRICT: Expect at least 1 CTA
    const issueCtas = page.getByTestId('deo-overview-issue-cta');
    const ctaCount = await issueCtas.count();
    expect(ctaCount).toBeGreaterThan(0);

    // Verify each CTA uses appropriate wording
    // (We can't deterministically know which are DIAGNOSTIC without inspecting data,
    // but we can verify the CTA text is either "Review" or "Fix now" - not empty or broken)
    for (let i = 0; i < ctaCount; i++) {
      const cta = issueCtas.nth(i);
      const ctaText = await cta.textContent();
      expect(ctaText === 'Review' || ctaText === 'Fix now').toBe(true);
    }
  });
});
