/**
 * [ISSUE-FIX-ROUTE-INTEGRITY-1] Playwright Regression Tests
 *
 * Validates:
 * 1. Actionable issues show valid Fix CTA (navigation or inline preview)
 * 2. Blocked issues show "Blocked" chip (no fake Fix CTAs)
 * 3. Informational issues have no Fix action
 * 4. Action buttons do NOT open RCP (row click does)
 * 5. External "Open" links have correct attributes (target="_blank", rel="noopener noreferrer")
 * 6. All action CTAs lead to valid, implemented destinations (no 404s)
 *
 * Critical paths: CP-009 (Issue Engine Lite)
 *
 * [FIXUP-3] All tests are deterministic with no conditional skips.
 * Seed data (seed-first-deo-win) MUST provide all required issue types.
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project for authenticated tests.
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

test.describe('ISSUE-FIX-ROUTE-INTEGRITY-1: No dead clicks in Issues Engine', () => {
  /**
   * IFRI-001: Actionable issue with AI preview shows Fix button
   *
   * Given: Issues Engine with AI-fixable issues (seed-first-deo-win guarantees these exist)
   * When: User locates an AI preview Fix button via data-testid
   * Then: Button is visible and clicking opens inline preview (no navigation)
   */
  test('IFRI-001: AI preview Fix button opens inline preview', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // Find AI preview Fix button (deterministic: seed-first-deo-win has missing SEO issues)
    const fixPreviewButton = page
      .locator('[data-testid="issue-fix-next-button"]')
      .first();

    // Assert button exists (fail loudly if seed data doesn't provide it)
    await expect(fixPreviewButton).toBeVisible();

    const initialUrl = page.url();

    // Click the Fix button
    await fixPreviewButton.click();
    await page.waitForTimeout(500); // Wait for preview panel animation

    // Assert: URL should not change (inline preview, not navigation)
    const currentUrl = page.url();
    expect(currentUrl).toBe(initialUrl);

    // Assert: Preview panel is visible via deterministic data-testid
    const previewPanel = page.locator(
      '[data-testid="issue-preview-draft-panel"]'
    );
    await expect(previewPanel).toBeVisible();
  });

  /**
   * IFRI-002: Direct fix link navigates to valid destination
   *
   * Given: Issues Engine with actionable issues that use direct fix links
   * When: User clicks a fix link via data-testid
   * Then: Navigation occurs to valid product workspace (no 404)
   */
  test('IFRI-002: Direct fix link navigates successfully', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine in "All detected" mode to see more issue types
    await page.goto(`/projects/${projectId}/issues?mode=detected`);
    await page.waitForLoadState('networkidle');

    // Find direct fix link (non-preview fix button)
    // seed-first-deo-win MUST provide at least one direct fix link
    const fixLink = page.locator('[data-testid="issue-fix-button"]').first();

    // Assert: Direct fix link exists (fail loudly if seed data doesn't provide it)
    await expect(fixLink).toBeVisible();

    // Click the fix link
    await fixLink.click();
    await page.waitForLoadState('networkidle');

    // Assert: Navigation occurred (URL changed)
    const currentUrl = new URL(page.url());

    // Assert: Navigated to a product workspace or valid fix destination
    expect(currentUrl.pathname).toMatch(/\/projects\/.*\/products\/.*/);

    // Assert: No 404 page
    const notFoundHeading = page.locator(
      'h1:has-text("404"), h1:has-text("Not Found")'
    );
    await expect(notFoundHeading).toHaveCount(0);
  });

  /**
   * IFRI-003: View affected routes to Products list
   *
   * Given: Issues Engine with issues that have affected products
   * When: User clicks "View affected" button via data-testid
   * Then: Browser navigates to /projects/:id/products with issueType filter
   * And: No 404 errors
   */
  test('IFRI-003: View affected button routes to filtered Products list', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // Find "View affected" button (deterministic selector)
    // seed-first-deo-win MUST provide issues with affected products
    const viewAffectedButton = page
      .locator('[data-testid="issue-view-affected-button"]')
      .first();

    // Assert button exists (fail loudly if seed data doesn't provide it)
    await expect(viewAffectedButton).toBeVisible();

    // Click the button
    await viewAffectedButton.click();
    await page.waitForLoadState('networkidle');

    // Assert: Navigated to Products list
    const url = new URL(page.url());
    expect(url.pathname).toBe(`/projects/${projectId}/products`);

    // Assert: issueType param is present
    const issueType = url.searchParams.get('issueType');
    expect(issueType).toBeTruthy();

    // Assert: No 404 page
    const notFoundHeading = page.locator(
      'h1:has-text("404"), h1:has-text("Not Found")'
    );
    await expect(notFoundHeading).toHaveCount(0);
  });

  /**
   * IFRI-004: Blocked issue shows Blocked chip (no fake Fix CTAs)
   *
   * Given: Issues Engine in "All detected" mode showing blocked issues
   * When: User locates a blocked issue via data-testid
   * Then: "Blocked" chip is visible with tooltip
   * And: No Fix buttons are present in that row
   */
  test('IFRI-004: Blocked issue shows Blocked chip with no Fix CTA', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine in "All detected" mode
    await page.goto(`/projects/${projectId}/issues?mode=detected`);
    await page.waitForLoadState('networkidle');

    // Find blocked chip (deterministic selector)
    // seed-first-deo-win MUST provide at least one blocked issue
    const blockedChip = page
      .locator('[data-testid="issue-blocked-chip"]')
      .first();

    // Assert blocked chip exists (fail loudly if seed data doesn't provide it)
    await expect(blockedChip).toBeVisible();

    // Assert blocked chip has title attribute (tooltip)
    const title = await blockedChip.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toMatch(/blocked|actionable|control/i);

    // Find the parent row containing this blocked chip
    const parentRow = blockedChip
      .locator('xpath=ancestor::tr | ancestor::div[contains(@class, "row")]')
      .first();

    // Assert no Fix buttons in the same row
    const fixButtonsInRow = parentRow.locator(
      '[data-testid="issue-fix-next-button"], [data-testid="issue-fix-button"]'
    );
    await expect(fixButtonsInRow).toHaveCount(0);
  });

  /**
   * IFRI-005: Row click opens RCP; action button click does not
   *
   * Given: Issues Engine with actionable issues
   * When: User clicks on a row (not on action button)
   * Then: RCP opens with issue details
   * When: User clicks an action button
   * Then: Action executes without opening RCP
   */
  test('IFRI-005: Action buttons prevent RCP open via stopPropagation', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine
    await page.goto(`/projects/${projectId}/issues`);
    await page.waitForLoadState('networkidle');

    // Find the first issue row with a Fix button
    const firstRow = page
      .locator('tr')
      .filter({ has: page.locator('[data-testid="issue-fix-next-button"]') })
      .first();
    await expect(firstRow).toBeVisible();

    // Click on the row (not on the button) to open RCP
    // Use bounding box to click on a safe area (left side of row)
    const rowBox = await firstRow.boundingBox();

    // Assert rowBox is non-null (fail loudly if row not measurable)
    expect(rowBox).not.toBeNull();
    await page.mouse.click(rowBox!.x + 50, rowBox!.y + rowBox!.height / 2);
    await page.waitForTimeout(500); // Wait for RCP animation

    // Assert: RCP opens after row click (explicit UI assertion, not URL heuristic)
    const rightContextPanel = page.getByTestId('right-context-panel');
    await expect(rightContextPanel).toBeVisible();

    // Close RCP deterministically via close button
    const rcpCloseButton = page.getByTestId('right-context-panel-close');
    await rcpCloseButton.click();
    await page.waitForTimeout(300);

    // Assert: RCP is not present after closing
    await expect(rightContextPanel).toHaveCount(0);

    // Now find and click an action button
    const actionButton = page
      .locator('[data-testid="issue-fix-next-button"]')
      .first();
    await expect(actionButton).toBeVisible();

    // Verify action button has data-no-row-click attribute
    const hasNoRowClick = await actionButton.getAttribute('data-no-row-click');
    expect(hasNoRowClick).not.toBeNull();

    // Click the action button
    await actionButton.click();
    await page.waitForTimeout(500);

    // Assert BOTH: preview opens AND RCP remains closed
    // Action should execute (preview opens inline), not open RCP via row click
    const previewPanel = page.locator(
      '[data-testid="issue-preview-draft-panel"]'
    );
    await expect(previewPanel).toBeVisible();

    // Assert: RCP remains not present after action click (action did not trigger row click)
    await expect(rightContextPanel).toHaveCount(0);
  });

  /**
   * IFRI-006: External Open link has correct security attributes
   *
   * Given: Issues Engine with issues that have external Open links
   * When: User locates an external Open link via data-testid
   * Then: Link has target="_blank" and rel="noopener noreferrer"
   * And: External link icon is visible
   */
  test('IFRI-006: External Open link has correct attributes', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Issues Engine
    await page.goto(`/projects/${projectId}/issues?mode=detected`);
    await page.waitForLoadState('networkidle');

    // Find external "Open" links (identified by target="_blank")
    // seed-first-deo-win MUST provide at least one external open link
    const externalOpenLinks = page.locator(
      '[data-testid="issue-open-button"][target="_blank"]'
    );

    // Assert: At least one external open link exists (fail loudly if not)
    await expect(externalOpenLinks.first()).toBeVisible();

    const firstExternalLink = externalOpenLinks.first();

    // Assert target="_blank"
    const target = await firstExternalLink.getAttribute('target');
    expect(target).toBe('_blank');

    // Assert rel="noopener noreferrer"
    const rel = await firstExternalLink.getAttribute('rel');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');

    // Assert external link icon is visible (svg element inside the link)
    const externalIcon = firstExternalLink.locator('svg');
    await expect(externalIcon).toBeVisible();
  });
});
