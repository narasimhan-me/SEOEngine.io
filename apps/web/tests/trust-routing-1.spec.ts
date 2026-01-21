/**
 * [TRUST-ROUTING-1] Playwright Smoke Tests
 *
 * Validates:
 * 1. Playbooks preview survives navigation to Product and back
 * 2. Store Health CTA lands on Work Queue with visible filter context
 * 3. "View Issues" never routes to placeholder/empty pages
 * 4. Insights renders with only one primary navigation strip
 *
 * Critical paths: CP-019 (Trust Routing), CP-003 (Products List), CP-016 (Insights)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project for authenticated tests.
 * Uses the same pattern as nav-ia-consistency-1.spec.ts.
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

test.describe('TRUST-ROUTING-1: Playbooks Preview Context', () => {
  test('Playbooks preview survives navigation to Product and back', async ({
    page,
    request,
  }) => {
    const { projectId, productIds } = await authenticatePage(page, request);

    // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1] Navigate to canonical playbooks route
    await page.goto(`/projects/${projectId}/playbooks`);

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Playbooks'
    );

    // Select a playbook (if available)
    const playbookCard = page
      .locator('button')
      .filter({ hasText: 'Missing SEO Title' })
      .first();
    if (await playbookCard.isVisible()) {
      await playbookCard.click();

      // Generate preview (if button is available and not disabled)
      const previewButton = page.getByRole('button', {
        name: /Generate preview/i,
      });
      if (
        (await previewButton.isVisible()) &&
        !(await previewButton.isDisabled())
      ) {
        await previewButton.click();

        // Wait for preview to generate
        await page.waitForTimeout(2000);

        // Look for "Open product" link with preview context
        const openProductLink = page
          .getByRole('link', { name: /Open product/i })
          .first();
        if (await openProductLink.isVisible()) {
          const href = await openProductLink.getAttribute('href');
          expect(href).toContain('from=playbook_preview');
          expect(href).toContain('playbookId=');
          expect(href).toContain('returnTo=');

          // Click to navigate to product page
          await openProductLink.click();

          // Verify we're on product page
          await expect(page.url()).toContain('/products/');

          // Check for preview banner
          const previewBanner = page.getByText(
            'Previewing draft (not applied)'
          );
          await expect(previewBanner).toBeVisible();

          // Check for back to preview link
          const backLink = page.getByRole('link', { name: /Back to preview/i });
          await expect(backLink).toBeVisible();

          // [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Click back and verify we return to playbooks (canonical route)
          await backLink.click();
          await expect(page.url()).toContain('/playbooks');
        }
      }
    }
  });
});

test.describe('TRUST-ROUTING-1: Store Health → Work Queue', () => {
  // [COUNT-INTEGRITY-1.1 FIX-UP] Updated to click Content Quality card (not Discoverability)
  // Discoverability and Technical Readiness now route to Issues Engine, not Work Queue
  test('Store Health CTA lands on Work Queue with visible filter context', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Store Health page
    await page.goto(`/projects/${projectId}/store-health`);

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Store Health'
    );

    // [COUNT-INTEGRITY-1.1 FIX-UP] Click on Content Quality card (still routes to Work Queue)
    // Note: Discoverability/Technical Readiness now route to Issues Engine with pillar filter
    const contentQualityCard = page
      .locator('button')
      .filter({ hasText: 'Content Quality' })
      .first();
    if (await contentQualityCard.isVisible()) {
      await contentQualityCard.click();

      // Verify URL contains actionKey and from=store_health
      await expect(page.url()).toContain('work-queue');
      await expect(page.url()).toContain('from=store_health');

      // Wait for Work Queue to load
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'Work Queue'
      );

      // Check for filter context banner
      const filterContext = page.getByTestId('work-queue-filter-context');
      await expect(filterContext).toBeVisible();

      // Check for "Store Health → Work Queue" indicator
      await expect(filterContext).toContainText('Store Health');

      // Check for Clear filters button
      const clearFiltersButton = page.getByTestId('work-queue-clear-filters');
      await expect(clearFiltersButton).toBeVisible();
    }
  });

  test('Clear filters removes filter context', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate directly to Work Queue with filter params
    await page.goto(
      `/projects/${projectId}/work-queue?from=store_health&actionKeys=FIX_MISSING_METADATA,RESOLVE_TECHNICAL_ISSUES`
    );

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Work Queue'
    );

    // Verify filter context is visible
    const filterContext = page.getByTestId('work-queue-filter-context');
    await expect(filterContext).toBeVisible();

    // Click Clear filters
    const clearFiltersButton = page.getByTestId('work-queue-clear-filters');
    await clearFiltersButton.click();

    // Verify URL no longer contains filter params
    await expect(page.url()).not.toContain('from=store_health');
    await expect(page.url()).not.toContain('actionKeys=');

    // Verify filter context banner is gone
    await expect(filterContext).not.toBeVisible();
  });
});

test.describe('TRUST-ROUTING-1: CTA Safety - View Issues', () => {
  test('"View Issues" never routes to placeholder/empty pages', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Work Queue
    await page.goto(`/projects/${projectId}/work-queue`);

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Work Queue'
    );

    // Find any "View Issues" CTA
    const viewIssuesLinks = page.getByRole('link', { name: /View Issues/i });
    const linkCount = await viewIssuesLinks.count();

    if (linkCount > 0) {
      // Check the first View Issues link
      const firstLink = viewIssuesLinks.first();
      const href = await firstLink.getAttribute('href');

      // Verify it routes to issues page, NOT to placeholder pages
      expect(href).toContain('/issues');
      expect(href).not.toBe(`/projects/${projectId}/metadata`);
      expect(href).not.toBe(`/projects/${projectId}/performance`);
      expect(href).not.toBe(`/projects/${projectId}/keywords`);
      expect(href).not.toBe(`/projects/${projectId}/content`);

      // Click the link
      await firstLink.click();

      // Verify we land on issues page
      await expect(page.url()).toContain('/issues');
    }
  });
});

test.describe('TRUST-ROUTING-1: Insights Navigation', () => {
  test('Insights renders with only one primary navigation strip', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to Insights page
    await page.goto(`/projects/${projectId}/insights`);

    // Wait for page to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Insights'
    );

    // Check that primary Insights subnav exists
    const insightsSubnav = page.getByTestId('insights-subnav');
    await expect(insightsSubnav).toBeVisible();

    // Check that the old pillar strip test id is NOT present
    const oldPillarStrip = page.getByTestId('insights-pillars-subnav');
    await expect(oldPillarStrip).not.toBeVisible();

    // Check that pillar filter (dropdown) exists
    const pillarFilter = page.getByTestId('insights-pillar-filter');
    await expect(pillarFilter).toBeVisible();
  });

  test('Insights DEO Progress page has subnav and pillar filter', async ({
    page,
    request,
  }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to DEO Progress subpage
    await page.goto(`/projects/${projectId}/insights/deo-progress`);

    // Check that primary Insights subnav exists
    const insightsSubnav = page.getByTestId('insights-subnav');
    await expect(insightsSubnav).toBeVisible();

    // Check for pillar filter dropdown
    const pillarFilter = page.getByTestId('insights-pillar-filter');
    await expect(pillarFilter).toBeVisible();
  });

  test('GEO Insights page is accessible', async ({ page, request }) => {
    const { projectId } = await authenticatePage(page, request);

    // Navigate to GEO Insights page
    await page.goto(`/projects/${projectId}/insights/geo-insights`);

    // Wait for page to load
    await expect(page.getByTestId('insights-subnav')).toBeVisible();

    // Verify we're on the GEO insights page
    await expect(page.url()).toContain('/insights/geo-insights');
  });
});
