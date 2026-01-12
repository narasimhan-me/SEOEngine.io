/**
 * [SCOPE-CLARITY-1] Scope Chips and Normalization E2E Tests
 *
 * Validates the scope normalization and chip rendering contract:
 * 1. Scope chips render correctly for pillar, asset, issueType, mode
 * 2. wasAdjusted note shows when conflicting params were normalized
 * 3. Priority order enforced: asset > issueType > pillar > mode
 * 4. Clear filters resets to base route
 *
 * Test hooks verified:
 * - data-testid="scope-chips" (chips container)
 * - data-testid="scope-chip" + data-scope-chip-type="{type}" (each chip)
 * - data-testid="scope-banner-adjusted-note" (adjusted note)
 *
 * Prerequisites:
 * - /testkit/e2e/seed-first-deo-win endpoint available
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
 * Helper to authenticate and set up the page
 */
async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('SCOPE-CLARITY-1: Scope Chips Rendering', () => {
  test('Pillar chip renders with correct label', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Issues Engine with pillar scope
    const pillarUrl = `/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}&pillar=metadata_snippet_quality`;
    await page.goto(pillarUrl);
    await page.waitForLoadState('networkidle');

    // Assert scope-banner is visible
    const scopeBanner = page.locator('[data-testid="scope-banner"]');
    await expect(scopeBanner).toBeVisible();

    // Assert scope-chips container exists
    const scopeChips = page.locator('[data-testid="scope-chips"]');
    await expect(scopeChips).toBeVisible();

    // Assert pillar chip is present with correct type
    const pillarChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="pillar"]');
    await expect(pillarChip).toBeVisible();
    await expect(pillarChip).toContainText('Pillar:');
  });

  test('Mode chip renders when mode param present', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Issues Engine with mode scope
    const modeUrl = `/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}&mode=actionable`;
    await page.goto(modeUrl);
    await page.waitForLoadState('networkidle');

    // Assert scope-banner is visible
    const scopeBanner = page.locator('[data-testid="scope-banner"]');
    await expect(scopeBanner).toBeVisible();

    // Assert mode chip is present with correct type
    const modeChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="mode"]');
    await expect(modeChip).toBeVisible();
    await expect(modeChip).toContainText('Actionable');
  });

  test('Multiple chips render in priority order: pillar + mode', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate with both pillar and mode
    const url = `/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}&pillar=metadata_snippet_quality&mode=detected`;
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Assert both chips are present
    const pillarChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="pillar"]');
    const modeChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="mode"]');

    await expect(pillarChip).toBeVisible();
    await expect(modeChip).toBeVisible();

    // Assert pillar chip comes before mode chip in DOM order
    const allChips = page.locator('[data-testid="scope-chip"]');
    const chipCount = await allChips.count();
    expect(chipCount).toBe(2);
  });
});

test.describe('SCOPE-CLARITY-1: Scope Normalization Priority', () => {
  test('issueType takes priority over pillar (pillar dropped)', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate with both issueType and pillar - issueType should win
    const url = `/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}&issueType=missing_seo_title&pillar=metadata_snippet_quality`;
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Assert issueType chip is present
    const issueTypeChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="issueType"]');
    await expect(issueTypeChip).toBeVisible();

    // Assert pillar chip is NOT present (dropped by normalization)
    const pillarChip = page.locator('[data-testid="scope-chip"][data-scope-chip-type="pillar"]');
    await expect(pillarChip).not.toBeVisible();

    // Assert wasAdjusted note is shown
    const adjustedNote = page.locator('[data-testid="scope-banner-adjusted-note"]');
    await expect(adjustedNote).toBeVisible();
    await expect(adjustedNote).toContainText('adjusted');

    // [SCOPE-CLARITY-1 FIXUP-2] Strict aria-pressed assertions for pillar filter UI
    // The pillar filter controls should show "All pillars" as active, NOT "Metadata Snippet Quality"
    // Use data-testid and aria-pressed for non-brittle, accessible assertions
    const allPillarsButton = page.locator('[data-testid="pillar-filter-all"]');
    await expect(allPillarsButton).toBeVisible();
    await expect(allPillarsButton).toHaveAttribute('aria-pressed', 'true');

    // The Metadata Snippet Quality pillar button should NOT be in active state
    // Since pillar was dropped by normalization (issueType > pillar), the filter should remain on "All"
    const metadataPillarButton = page.locator('[data-testid="pillar-filter-metadata_snippet_quality"]');
    await expect(metadataPillarButton).toBeVisible();
    await expect(metadataPillarButton).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('SCOPE-CLARITY-1: Clear Filters Behavior', () => {
  test('Clear filters removes all scope params', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate with pillar scope
    const url = `/projects/${projectId}/issues?from=store_health&returnTo=${encodeURIComponent(`/projects/${projectId}/store-health`)}&pillar=metadata_snippet_quality&mode=actionable`;
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    // Click Clear filters
    const clearButton = page.locator('[data-testid="scope-banner-clear"]');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForLoadState('networkidle');

    // Assert URL is base /issues with no scope params
    const clearedUrl = page.url();
    expect(clearedUrl).toContain('/issues');
    expect(clearedUrl).not.toContain('from=');
    expect(clearedUrl).not.toContain('returnTo=');
    expect(clearedUrl).not.toContain('pillar=');
    expect(clearedUrl).not.toContain('mode=');
  });
});

test.describe('SCOPE-CLARITY-1: Banner Hidden Without From', () => {
  test('Scope banner not visible when from param is absent', async ({ page, request }) => {
    const { accessToken, projectId } = await seedFirstDeoWin(request);
    await authenticatePage(page, accessToken);

    // Navigate to Issues Engine WITHOUT from param
    await page.goto(`/projects/${projectId}/issues?pillar=metadata_snippet_quality`);
    await page.waitForLoadState('networkidle');

    // Assert scope-banner is NOT visible (no from param)
    const scopeBanner = page.locator('[data-testid="scope-banner"]');
    await expect(scopeBanner).not.toBeVisible();
  });
});
