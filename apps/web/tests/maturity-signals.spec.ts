import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed a project for maturity signals testing.
 */
async function seedProject(request: any) {
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
    accessToken: body.accessToken as string,
  };
}

test.describe('EA-39 – Maturity Signals (Read-Only)', () => {
  test('Governance page shows maturity signals panel', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Governance page
    await page.goto(`/projects/${projectId}/settings/governance`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Maturity signals panel should be visible
    await expect(
      page.locator('[data-testid="maturity-signals-panel"]')
    ).toBeVisible();
  });

  test('Maturity signals are read-only with no action buttons', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance`);

    await expect(
      page.locator('[data-testid="maturity-signals-panel"]')
    ).toBeVisible({ timeout: 10000 });

    // Verify no configuration buttons exist within the panel
    const panel = page.locator('[data-testid="maturity-signals-panel"]');
    const configButtons = panel.locator(
      'button:has-text("Configure"), button:has-text("Enable"), button:has-text("Edit")'
    );
    await expect(configButtons).toHaveCount(0);
  });

  test('Stability indicator shows operational status', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Stability indicator should be visible
    const indicator = page.locator('[data-testid="stability-indicator"]');
    await expect(indicator).toBeVisible();

    // Should show operational status
    const status = await indicator.getAttribute('data-status');
    expect(status).toBe('operational');
  });

  test('Governance readiness card displays active capability count', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Governance readiness card should be visible
    const card = page.locator('[data-testid="governance-readiness-card"]');
    await expect(card).toBeVisible();

    // Should show capabilities count
    await expect(card).toContainText(/capabilities active/i);
  });

  test('Individual maturity signals show correct status badges', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance`);

    await expect(
      page.locator('[data-testid="maturity-signals-panel"]')
    ).toBeVisible({ timeout: 10000 });

    // Check for specific signals
    await expect(
      page.locator('[data-testid="maturity-signal-role-based-access"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="maturity-signal-approval-workflows"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="maturity-signal-audit-logging"]')
    ).toBeVisible();
  });

  test('SMB users see non-intimidating messaging', async ({ page, request }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance`);

    await expect(
      page.locator('[data-testid="maturity-signals-panel"]')
    ).toBeVisible({ timeout: 10000 });

    // Check for SMB-friendly messaging
    await expect(
      page.getByText(/no setup required|no action required|automatically/i)
    ).toBeVisible();
  });
});
