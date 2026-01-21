/**
 * [NAV-IA-CONSISTENCY-1] Playwright Smoke Tests
 *
 * Validates:
 * - Marketing: Navbar contains "Sign in" and "Start free"; does NOT contain "Log in"
 * - Portal (authenticated): Top nav shows "Projects"; does NOT show top-level "Settings"
 * - Theme toggle control is present
 * - Account dropdown contains exactly the required labels
 * - Project sidebar: Group headings visible with exact labels
 * - Forbidden labels not present
 *
 * Critical paths: CP-001 (Auth terminology) + CP-008 (Design tokens & theme)
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

// Marketing page tests (unauthenticated)
test.describe('NAV-IA-CONSISTENCY-1: Marketing', () => {
  test('navbar contains "Sign in" and "Start free", does NOT contain "Log in"', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.locator('header');

    // Should contain "Sign in" link
    await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible();

    // Should contain "Start free" button/link
    await expect(
      header.getByRole('link', { name: 'Start free' })
    ).toBeVisible();

    // Should NOT contain "Log in" text
    const logInLink = header.getByRole('link', { name: 'Log in' });
    await expect(logInLink).not.toBeVisible();
  });

  test('navbar uses token-based styling (no hardcoded bg-white)', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Header should have bg-background class (token-based)
    await expect(header).toHaveClass(/bg-background/);
  });
});

// Portal tests (authenticated) - requires testkit seed flow
test.describe('NAV-IA-CONSISTENCY-1: Portal (Authenticated)', () => {
  test('top nav shows "Projects", does NOT show top-level "Settings"', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');

    const nav = page.locator('nav');

    // Should show "Projects" link
    await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();

    // Should NOT show top-level "Settings" link in main nav
    const settingsLinks = nav.locator('a:has-text("Settings")').filter({
      has: page.locator(':scope:not([href*="/settings/"])'),
    });
    const settingsCount = await settingsLinks.count();
    expect(settingsCount).toBe(0);
  });

  test('theme toggle control is present', async ({ page, request }) => {
    const { accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');

    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
  });

  test('account dropdown contains required labels', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');

    const accountButton = page.locator('[data-testid="account-menu-button"]');
    await accountButton.click();

    const dropdown = page.locator('[data-testid="account-dropdown"]');
    await expect(dropdown).toBeVisible();

    const requiredLabels = [
      'Profile',
      'Stores',
      'Plan & Billing',
      'AI Usage',
      'Security',
      'Preferences',
      'Help & Support',
      'Sign out',
    ];

    for (const label of requiredLabels) {
      if (label === 'Sign out') {
        await expect(
          dropdown.getByRole('button', { name: label })
        ).toBeVisible();
      } else {
        await expect(dropdown.getByRole('link', { name: label })).toBeVisible();
      }
    }

    // Should NOT contain "Admin Dashboard" in dropdown
    await expect(dropdown.getByText('Admin Dashboard')).not.toBeVisible();
  });
});

// Project sidebar tests
test.describe('NAV-IA-CONSISTENCY-1: Project Sidebar', () => {
  test('group headings visible: OPERATE, ASSETS, AUTOMATION, INSIGHTS, PROJECT', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/store-health`);

    const sidenav = page.locator('[data-testid="project-sidenav"]');
    await expect(sidenav).toBeVisible();

    const headings = ['OPERATE', 'ASSETS', 'AUTOMATION', 'INSIGHTS', 'PROJECT'];
    for (const heading of headings) {
      await expect(sidenav.getByText(heading, { exact: true })).toBeVisible();
    }
  });

  test('items visible with exact labels', async ({ page, request }) => {
    const { accessToken, projectId } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/store-health`);

    const sidenav = page.locator('[data-testid="project-sidenav"]');
    await expect(sidenav).toBeVisible();

    const requiredLabels = [
      'Store Health',
      'Work Queue',
      'Products',
      'Pages',
      'Collections',
      'Blog posts',
      'Playbooks',
      'Insights',
      'Project Settings',
    ];

    for (const label of requiredLabels) {
      await expect(sidenav.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('forbidden labels not present: Overview, Automation, Settings (old)', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/store-health`);

    const sidenav = page.locator('[data-testid="project-sidenav"]');
    await expect(sidenav).toBeVisible();

    const forbiddenLabels = [
      'Overview',
      'Automation',
      'DEO Overview',
      'Content',
      'Settings',
    ];

    for (const label of forbiddenLabels) {
      const link = sidenav.getByRole('link', { name: label, exact: true });
      await expect(link).not.toBeVisible();
    }
  });
});
