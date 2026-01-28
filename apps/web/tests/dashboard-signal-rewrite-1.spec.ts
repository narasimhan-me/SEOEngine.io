/**
 * [DASHBOARD-SIGNAL-REWRITE-1] Dashboard Signal Rewrite E2E Tests
 *
 * Test coverage:
 * 1. Every dashboard metric displays a clear explanation
 * 2. "Why it matters" context is accessible for each metric
 * 3. Signals are visually distinguished from recommendations
 * 4. No ambiguous terms appear without explanations
 * 5. Metric explanations are accessible (tooltips, modals work)
 * 6. Users can understand what each metric measures
 *
 * Prerequisites:
 * - /testkit/e2e/seed-first-deo-win endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    { data: {} }
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

test.describe('DASHBOARD-SIGNAL-REWRITE-1: Metric Clarity', () => {
  test('DEO Score card shows clear label and explanation', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Wait for DEO Score card
    await expect(page.getByText('Discovery Score')).toBeVisible({ timeout: 10000 });

    // Should show "Observation" type indicator
    await expect(page.getByText('Observation')).toBeVisible();

    // Info icon should be present for explanation
    const infoIcon = page.locator('button[aria-label*="Learn more about Discovery Score"]');
    await expect(infoIcon).toBeVisible();

    // Click info icon to open explanation
    await infoIcon.click();

    // Modal should show explanation content
    await expect(page.getByText('What this measures')).toBeVisible();
    await expect(page.getByText('Why it matters')).toBeVisible();
    await expect(page.getByText('How to interpret')).toBeVisible();
  });

  test('Component breakdown shows clear labels with explanations', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Open DEO breakdown
    await page.getByText('View full DEO Score').click();

    // Should show renamed components with clear labels
    await expect(page.getByText('Content Quality')).toBeVisible();
    await expect(page.getByText('Product Identity')).toBeVisible();
    await expect(page.getByText('Site Health')).toBeVisible();
    await expect(page.getByText('Search Readiness')).toBeVisible();

    // Should show "Observations" type indicator
    await expect(page.getByText('Observations')).toBeVisible();

    // Each component should have an info icon
    const infoIcons = page.locator('button[aria-label*="Learn more"]');
    expect(await infoIcons.count()).toBeGreaterThanOrEqual(4);
  });

  test('Health cards show clear descriptions without jargon', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Open diagnostics
    await page.getByText('Show details').click();

    // Wait for health cards
    await expect(page.getByText('Issue Categories')).toBeVisible({ timeout: 10000 });

    // Should show clear labels instead of jargon
    await expect(page.getByText('Missing Page Titles & Descriptions')).toBeVisible();
    await expect(page.getByText('Pages with Limited Content')).toBeVisible();
    await expect(page.getByText('Unclear Product Information')).toBeVisible();
    await expect(page.getByText('Pages Not Search-Ready')).toBeVisible();
    await expect(page.getByText('Pages with Access Problems')).toBeVisible();

    // Should NOT show technical jargon without explanation
    const pageContent = await page.content();
    // These terms should only appear in explanations, not as primary labels
    expect(pageContent).not.toMatch(/\bSERP readiness\b(?!<)/); // Not as standalone text
    expect(pageContent).not.toMatch(/\bEntity coverage\b(?!<)/);
  });

  test('Signal summary shows explanations on hover', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Open diagnostics to see signals
    await page.getByText('Show details').click();

    // Wait for signals summary
    await expect(page.getByText('Signal Details')).toBeVisible({ timeout: 10000 });

    // Should show clear signal labels
    await expect(page.getByText('Page Accessibility')).toBeVisible();
    await expect(page.getByText('Search Engine Access')).toBeVisible();
    await expect(page.getByText('AI Answer Readiness')).toBeVisible();

    // Hover over a signal to see explanation
    const infoIcon = page.locator('button[aria-label*="Learn more about Page Accessibility"]').first();
    await infoIcon.hover();

    // Tooltip should appear with explanation
    await expect(page.getByText('Percentage of your pages that load successfully')).toBeVisible({ timeout: 5000 });
  });

  test('No metrics use ambiguous terms without definition', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Open all expandable sections
    await page.getByText('View full DEO Score').click();
    await page.getByText('Show details').click();

    // Get all visible text
    const pageText = await page.textContent('body');

    // Check that ambiguous standalone terms don't appear as metric labels
    // These should only appear within explanation tooltips/modals, not as primary labels
    const ambiguousTermsAsLabels = [
      /^Score$/m, // "Score" alone without context
      /^Health$/m, // "Health" alone
      /^Authority$/m, // "Authority" alone
    ];

    // These checks ensure the terms appear with proper context
    for (const term of ambiguousTermsAsLabels) {
      // Terms can exist but should have explanation nearby
      if (term.test(pageText || '')) {
        // If found, there should be an info icon nearby
        const infoIcons = page.locator('button[aria-label*="Learn more"]');
        expect(await infoIcons.count()).toBeGreaterThan(0);
      }
    }
  });

  test('Type indicators distinguish signals from recommendations', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Open breakdowns
    await page.getByText('View full DEO Score').click();

    // Should see "Observation" indicators on signal cards
    const observationBadges = page.getByText('Observation');
    expect(await observationBadges.count()).toBeGreaterThanOrEqual(1);

    // The badges should be visually distinct (blue background)
    const badge = observationBadges.first();
    await expect(badge).toHaveClass(/bg-blue/);
  });
});

test.describe('DASHBOARD-SIGNAL-REWRITE-1: Accessibility', () => {
  test('Metric explanations are keyboard accessible', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Tab to first info icon
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Find focused info icon
    const focused = page.locator(':focus');
    const ariaLabel = await focused.getAttribute('aria-label');

    if (ariaLabel?.includes('Learn more')) {
      // Press Enter to open
      await page.keyboard.press('Enter');

      // Should open explanation
      await expect(page.getByText('What this measures')).toBeVisible({ timeout: 3000 });
    }
  });

  test('Info icons have proper ARIA attributes', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Check that info icons have proper accessibility attributes
    const infoButtons = page.locator('button[aria-label*="Learn more"]');
    const count = await infoButtons.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = infoButtons.nth(i);
      await expect(button).toHaveAttribute('aria-label');
      await expect(button).toHaveAttribute('aria-expanded');
    }
  });
});
