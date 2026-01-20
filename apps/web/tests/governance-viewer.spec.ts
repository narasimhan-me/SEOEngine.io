import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed a project for governance viewer testing.
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

test.describe('GOV-AUDIT-VIEWER-1 – Governance Viewer UI (Playwright E2E)', () => {
  test('Governance page loads with three tabs', async ({ page, request }) => {
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

    // Three tabs should be visible
    await expect(
      page.getByRole('button', { name: /Approvals/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Audit Log/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sharing & Links/i })
    ).toBeVisible();
  });

  test('Approvals tab shows empty state initially', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=approvals`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show empty state
    await expect(page.getByText(/No pending approvals/i)).toBeVisible();
  });

  test('Approvals tab has status filter buttons', async ({ page, request }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=approvals`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Status filter buttons should be visible
    await expect(page.getByRole('button', { name: /Pending/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /History/i })).toBeVisible();
  });

  test('Audit Log tab shows allowlist info banner', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=audit`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Info banner about filtered events should be visible
    await expect(
      page.getByText(/approval and share link events only/i)
    ).toBeVisible();
  });

  test('Audit Log tab shows empty state initially', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=audit`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show empty state
    await expect(page.getByText(/No audit events/i)).toBeVisible();
  });

  test('Sharing tab shows empty state initially', async ({ page, request }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=sharing`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show empty state
    await expect(page.getByText(/No share links/i)).toBeVisible();
  });

  test('Sharing tab has status filter buttons', async ({ page, request }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/settings/governance?tab=sharing`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Status filter buttons should be visible
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Active/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Expired/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revoked/i })).toBeVisible();
  });

  test('Tab navigation via URL works correctly', async ({ page, request }) => {
    const { projectId, accessToken } = await seedProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to audit tab via URL
    await page.goto(`/projects/${projectId}/settings/governance?tab=audit`);

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /Governance/i })
    ).toBeVisible({ timeout: 10000 });

    // Audit tab should be active
    const auditTab = page.getByRole('button', { name: /Audit Log/i });
    await expect(auditTab).toHaveClass(/border-blue-500/);

    // Navigate to sharing tab via URL
    await page.goto(`/projects/${projectId}/settings/governance?tab=sharing`);

    // Sharing tab should be active
    const sharingTab = page.getByRole('button', { name: /Sharing & Links/i });
    await expect(sharingTab).toHaveClass(/border-blue-500/);
  });

  test('Clicking tabs updates URL', async ({ page, request }) => {
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

    // Click Audit Log tab
    await page.getByRole('button', { name: /Audit Log/i }).click();
    await expect(page).toHaveURL(/tab=audit/);

    // Click Sharing & Links tab
    await page.getByRole('button', { name: /Sharing & Links/i }).click();
    await expect(page).toHaveURL(/tab=sharing/);

    // Click Approvals tab
    await page.getByRole('button', { name: /Approvals/i }).click();
    await expect(page).toHaveURL(/tab=approvals/);
  });
});
