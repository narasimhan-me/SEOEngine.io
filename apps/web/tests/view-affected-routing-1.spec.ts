/**
 * [ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1] Playwright Regression Tests
 * [MISSING-METADATA-FIX-SURFACE-INTEGRITY-1] Missing Metadata anchor integrity
 * [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] Secondary "View affected" link context preservation
 * [AUDIT-1] Test contract hardening: deterministic targeting, real-link assertions, back-navigation
 * [AUDIT-2] Fixed selector: use canonical issue-card-actionable/issue-card-informational testids
 *
 * Validates:
 * 1. "View affected" CTA routes to filtered Products list (not product detail)
 * 2. Products list shows issueType scope chip in ScopeBanner
 * 3. Server-authoritative issueType filtering works correctly
 * 4. Back navigation restores Issues Engine with original filters
 * 5. Missing Metadata issues no longer show "Fix surface not available"
 * 6. App-generated deep links include correct anchor mapping
 * 7. Secondary "View affected →" link in IssuesList preserves issueType + context
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
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    {
      data: {},
    }
  );
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

test.describe('ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1: View affected routes to filtered Products list', () => {
  /**
   * VAR1-001: "View affected" routes to Products list with issueType filter
   * [AUDIT-1] Hardened: No conditional skip; targets deterministic "Missing titles or descriptions" issue
   *
   * Given: Issues Engine with "Missing titles or descriptions" issue (missing_metadata)
   * When: User clicks the "View affected" CTA on that issue card
   * Then: Browser navigates to Products list (not product detail)
   * And: URL pathname matches /projects/:id/products exactly
   * And: issueType=missing_metadata in query params
   * And: from=issues_engine in query params
   * And: returnTo encodes original Issues Engine path with filters
   */
  test('VAR1-001: View affected routes to Products list with issueType filter', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine with explicit pillar filter
    const entryUrl = `/projects/${projectId}/issues?pillar=metadata_snippet_quality&mode=detected`;
    await page.goto(entryUrl);
    await page.waitForLoadState('networkidle');

    // [AUDIT-1] Target deterministic issue: "Missing titles or descriptions" (missing_metadata)
    // [AUDIT-2] Use canonical issue card testids (issue-card-actionable / issue-card-informational)
    // This issue card MUST exist in seed-first-deo-win and expose "View affected" CTA
    const missingMetadataCard = page
      .locator(
        '[data-testid="issue-card-actionable"], [data-testid="issue-card-informational"]'
      )
      .filter({ hasText: 'Missing titles or descriptions' })
      .first();
    await expect(missingMetadataCard).toBeVisible();

    // Find and click the "View affected" CTA within this specific card
    const viewAffectedCta = missingMetadataCard.locator(
      '[data-testid="issue-card-cta"]:has-text("View affected")'
    );
    await expect(viewAffectedCta).toBeVisible();
    await viewAffectedCta.click();
    await page.waitForLoadState('networkidle');

    // [AUDIT-1] Strict pathname assertion (not regex against full URL)
    const url = new URL(page.url());
    expect(url.pathname).toBe(`/projects/${projectId}/products`);

    // [AUDIT-1] Strict query param assertions
    expect(url.searchParams.get('issueType')).toBe('missing_metadata');
    expect(url.searchParams.get('from')).toBe('issues_engine');

    // [AUDIT-1] Verify returnTo encodes original entry path with filters
    const returnTo = url.searchParams.get('returnTo');
    expect(returnTo).toBeTruthy();
    const decodedReturnTo = decodeURIComponent(returnTo!);
    expect(decodedReturnTo).toContain(`/projects/${projectId}/issues`);
    expect(decodedReturnTo).toContain('pillar=metadata_snippet_quality');
    expect(decodedReturnTo).toContain('mode=detected');
  });

  /**
   * VAR1-002: Products list shows ScopeBanner with issueType chip
   *
   * Given: User navigated from Issues Engine via "View affected"
   * When: Products list loads
   * Then: ScopeBanner is visible with issueType scope chip
   */
  test('VAR1-002: Products list shows ScopeBanner with issueType chip', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate directly to Products list with issueType filter
    await page.goto(
      `/projects/${projectId}/products?issueType=missing_seo_title&from=issues_engine`
    );
    await page.waitForLoadState('networkidle');

    // Assert ScopeBanner is visible
    const scopeBanner = page.getByTestId('scope-banner');
    await expect(scopeBanner).toBeVisible();

    // Assert issueType chip is present
    const issueTypeChip = page.locator(
      '[data-testid="scope-chip"][data-scope-chip-type="issueType"]'
    );
    await expect(issueTypeChip).toBeVisible();
  });

  /**
   * VAR1-003: issueType filtering excludes non-affected products
   * [AUDIT-1] Hardened: Assert at least 1 product row visible before exclusion check
   *
   * Given: Products list filtered by issueType
   * When: Page loads
   * Then: At least one product row is visible (not empty list)
   * And: Product 4 (DIAGNOSTIC test product) is NOT in the list
   *      (since it doesn't have missing_seo_title issue)
   */
  test('VAR1-003: issueType filtering excludes non-affected products', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Products list filtered by missing_seo_title
    await page.goto(
      `/projects/${projectId}/products?issueType=missing_seo_title&from=issues_engine`
    );
    await page.waitForLoadState('networkidle');

    // Wait for products to load
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [AUDIT-1] Assert at least 1 product row is visible (avoid false positive on empty list)
    const productRows = page.locator('[data-testid="row-status-chip"]');
    const rowCount = await productRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Product 4 (DIAGNOSTIC test product) has complete SEO, so it should NOT appear
    const diagnosticProductRow = page.locator(
      'tr:has-text("Product 4 - DIAGNOSTIC Test"), div[class*="row"]:has-text("Product 4 - DIAGNOSTIC Test")'
    );
    await expect(diagnosticProductRow).toHaveCount(0);
  });

  /**
   * VAR1-004: Back returns to Issues Engine with same filters
   * [AUDIT-1] New test for back-navigation contract
   *
   * Given: User navigated from Issues Engine to filtered Products list via "View affected"
   * When: User clicks ScopeBanner Back button
   * Then: Browser returns to Issues Engine
   * And: URL contains original pillar + mode filters
   */
  test('VAR1-004: Back returns to Issues Engine with same filters', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine with explicit filters
    const entryUrl = `/projects/${projectId}/issues?pillar=metadata_snippet_quality&mode=detected`;
    await page.goto(entryUrl);
    await page.waitForLoadState('networkidle');

    // [AUDIT-2] Target "Missing titles or descriptions" issue using canonical card testids
    const missingMetadataCard = page
      .locator(
        '[data-testid="issue-card-actionable"], [data-testid="issue-card-informational"]'
      )
      .filter({ hasText: 'Missing titles or descriptions' })
      .first();
    await expect(missingMetadataCard).toBeVisible();

    const viewAffectedCta = missingMetadataCard.locator(
      '[data-testid="issue-card-cta"]:has-text("View affected")'
    );
    await viewAffectedCta.click();
    await page.waitForLoadState('networkidle');

    // Verify we're on Products list
    const productsUrl = new URL(page.url());
    expect(productsUrl.pathname).toBe(`/projects/${projectId}/products`);

    // Click ScopeBanner Back button
    const backButton = page.getByTestId('scope-banner-back');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await page.waitForLoadState('networkidle');

    // Assert browser returns to Issues Engine with original filters
    const returnUrl = new URL(page.url());
    expect(returnUrl.pathname).toBe(`/projects/${projectId}/issues`);
    expect(returnUrl.searchParams.get('pillar')).toBe(
      'metadata_snippet_quality'
    );
    expect(returnUrl.searchParams.get('mode')).toBe('detected');
  });
});

test.describe('ISSUESLIST-VIEW-AFFECTED-CONTEXT-1: Secondary View affected link preserves context', () => {
  /**
   * ILVAC1-001: IssuesList secondary "View affected →" preserves issueType + returnTo
   * [ISSUESLIST-VIEW-AFFECTED-CONTEXT-1] New test for secondary link in expanded issue details
   *
   * Given: Overview page with DEO Score modal open ("Issues identified in your project")
   * When: User expands an issue card and clicks "View affected →" in the Products section
   * Then: Browser navigates to Products list with:
   *   - issueType=missing_metadata
   *   - from=overview (origin is Overview modal)
   *   - returnTo decodes to /projects/:id/overview
   * And: Back button returns to Overview
   */
  test('ILVAC1-001: IssuesList secondary "View affected →" preserves issueType + returnTo', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Overview page
    await page.goto(`/projects/${projectId}/overview`);
    await page.waitForLoadState('networkidle');

    // Click the checklist button "View DEO Score" to open the issues modal
    const viewDeoScoreButton = page
      .locator(
        'button:has-text("View DEO Score"), a:has-text("View DEO Score")'
      )
      .first();
    await expect(viewDeoScoreButton).toBeVisible();
    await viewDeoScoreButton.click();

    // Wait for the modal to appear with issues
    await page.waitForSelector(
      '[data-testid="issue-card-actionable"], [data-testid="issue-card-informational"]',
      {
        timeout: 10000,
      }
    );

    // Find the "Missing titles or descriptions" issue card
    const missingMetadataCard = page
      .locator(
        '[data-testid="issue-card-actionable"], [data-testid="issue-card-informational"]'
      )
      .filter({ hasText: 'Missing titles or descriptions' })
      .first();
    await expect(missingMetadataCard).toBeVisible();

    // Click "Show affected items" to expand the card
    const showAffectedButton = missingMetadataCard.locator(
      'button:has-text("Show affected items")'
    );
    await expect(showAffectedButton).toBeVisible();
    await showAffectedButton.click();

    // Click the secondary "View affected →" link in the expanded Products section
    const viewAffectedSecondary = missingMetadataCard.locator(
      '[data-testid="issue-card-view-affected-secondary"]'
    );
    await expect(viewAffectedSecondary).toBeVisible();
    await viewAffectedSecondary.click();
    await page.waitForLoadState('networkidle');

    // Assert destination is Products list
    const url = new URL(page.url());
    expect(url.pathname).toBe(`/projects/${projectId}/products`);

    // Assert issueType is preserved
    expect(url.searchParams.get('issueType')).toBe('missing_metadata');

    // Assert from=overview (origin is Overview modal)
    expect(url.searchParams.get('from')).toBe('overview');

    // Assert returnTo decodes to Overview page
    const returnTo = url.searchParams.get('returnTo');
    expect(returnTo).toBeTruthy();
    const decodedReturnTo = decodeURIComponent(returnTo!);
    expect(decodedReturnTo).toContain(`/projects/${projectId}/overview`);

    // Click ScopeBanner Back and assert return to Overview
    const backButton = page.getByTestId('scope-banner-back');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await page.waitForLoadState('networkidle');

    // Assert browser returns to Overview
    const returnUrl = new URL(page.url());
    expect(returnUrl.pathname).toBe(`/projects/${projectId}/overview`);
  });
});

test.describe('MISSING-METADATA-FIX-SURFACE-INTEGRITY-1: Metadata anchor integrity', () => {
  /**
   * MMFSI1-001: App-generated metadata issue link includes correct anchor
   * [AUDIT-1] Hardened: Verify anchor via real app-generated link, not direct URL navigation
   *
   * Given: Products list with products that have missing SEO issues
   * When: User clicks "Fix next" on a product with missing_seo_title or missing_seo_description
   * Then: URL contains fixAnchor=seo-editor-anchor
   * And: SEO editor anchor is visible
   * And: "Fix surface not available" message is NOT shown
   */
  test('MMFSI1-001: App-generated metadata issue link includes correct anchor', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Products list
    await page.goto(`/projects/${projectId}/products`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="row-status-chip"]', {
      timeout: 10000,
    });

    // [AUDIT-1] Find a row with "Fix next" action whose href contains a metadata issue
    // Products 1-3 in seed-first-deo-win have missing SEO, so their Fix next links target metadata issues
    const fixNextLinks = page.locator(
      '[data-testid="row-primary-action"]:has-text("Fix next")'
    );
    const linkCount = await fixNextLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // Find a link that targets a metadata issue (missing_seo_title or missing_seo_description)
    let targetLink = null;
    for (let i = 0; i < linkCount; i++) {
      const link = fixNextLinks.nth(i);
      const href = await link.getAttribute('href');
      if (
        href &&
        (href.includes('issueId=missing_seo_title') ||
          href.includes('issueId=missing_seo_description'))
      ) {
        targetLink = link;
        break;
      }
    }
    expect(targetLink).not.toBeNull();

    // Click the app-generated link
    await targetLink!.click();
    await page.waitForLoadState('networkidle');

    // [AUDIT-1] Verify URL contains correct anchor mapping
    const url = new URL(page.url());
    expect(url.searchParams.get('fixAnchor')).toBe('seo-editor-anchor');

    // Assert SEO editor anchor is visible
    const seoEditorAnchor = page.getByTestId('seo-editor-anchor');
    await expect(seoEditorAnchor).toBeVisible();

    // Assert "Fix surface not available" message is NOT present
    const fixSurfaceNotAvailable = page.locator(
      'text="Fix surface not available"'
    );
    await expect(fixSurfaceNotAvailable).toHaveCount(0);
  });

  /**
   * MMFSI1-002: missing_metadata issue uses seo-editor-anchor
   * [AUDIT-1] Hardened: Added explicit fixAnchor URL assertion
   *
   * Given: Product with missing_metadata issue
   * When: User navigates with fixAnchor=seo-editor-anchor
   * Then: URL contains fixAnchor=seo-editor-anchor (contract enforcement)
   * And: Page loads successfully with SEO editor visible
   * And: Fix context banner shows correct messaging
   */
  test('MMFSI1-002: missing_metadata issue uses seo-editor-anchor', async ({
    page,
    request,
  }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    const productWithMissingMetadata = productIds[0];

    // Navigate to product with missing_metadata issue context
    await page.goto(
      `/projects/${projectId}/products/${productWithMissingMetadata}?tab=metadata&from=issues_engine&issueId=missing_metadata&fixAnchor=seo-editor-anchor`
    );
    await page.waitForLoadState('networkidle');

    // [AUDIT-1] Explicit assertion that fixAnchor=seo-editor-anchor is in URL
    const url = new URL(page.url());
    expect(url.searchParams.get('fixAnchor')).toBe('seo-editor-anchor');

    // Assert SEO editor anchor is visible
    const seoEditorAnchor = page.getByTestId('seo-editor-anchor');
    await expect(seoEditorAnchor).toBeVisible();

    // Assert fix context banner is visible and shows correct content
    const fixBanner = page.getByTestId('issue-fix-context-banner');
    await expect(fixBanner).toBeVisible();

    // Banner should show "You're here to fix:" (not "review" since it's EDIT not DIAGNOSTIC)
    await expect(fixBanner).toContainText("You're here to fix:");

    // Assert "Fix surface not available" message is NOT present
    const fixSurfaceNotAvailable = page.locator(
      'text="Fix surface not available"'
    );
    await expect(fixSurfaceNotAvailable).toHaveCount(0);
  });
});
