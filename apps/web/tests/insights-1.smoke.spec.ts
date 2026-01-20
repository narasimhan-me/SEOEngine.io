import { test, expect } from '@playwright/test';

/**
 * INSIGHTS-1 Smoke Test
 *
 * Validates that the Insights dashboard renders correctly with
 * real seeded data. This is a smoke test, not a full E2E test.
 */

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedInsightsProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-insights-1`,
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

async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('INSIGHTS-1 – Insights Dashboard Smoke Test', () => {
  test('Insights page renders with heading, subnav, and overview cards', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedInsightsProject(request);

    await authenticatePage(page, accessToken);

    // Navigate to Insights page
    await page.goto(`/projects/${projectId}/insights`);

    // Assert: Main heading visible
    await expect(
      page.getByRole('heading', { name: /Insights/i, level: 1 })
    ).toBeVisible();

    // Assert: Insights subnav visible (keyed to existing test id)
    await expect(page.locator('[data-testid="insights-subnav"]')).toBeVisible();

    // Assert: At least one overview card label visible (Improved, Saved, Resolved, or Next)
    const hasImprovedCard = await page
      .getByText(/Improved/i)
      .isVisible()
      .catch(() => false);
    const hasSavedCard = await page
      .getByText(/Saved/i)
      .isVisible()
      .catch(() => false);
    const hasResolvedCard = await page
      .getByText(/Resolved/i)
      .isVisible()
      .catch(() => false);
    const hasNextCard = await page
      .getByText(/Next/i)
      .isVisible()
      .catch(() => false);

    expect(
      hasImprovedCard || hasSavedCard || hasResolvedCard || hasNextCard
    ).toBeTruthy();
  });
});
