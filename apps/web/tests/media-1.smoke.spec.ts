import { test, expect } from '@playwright/test';

/**
 * MEDIA-1 Smoke Test
 *
 * Validates that the Media page renders correctly with
 * scorecard or empty state, and has a link to media issues.
 */

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedMediaProject(request: any) {
  // Reuse seed-first-deo-win which creates products with images
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

async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('MEDIA-1 – Media Page Smoke Test', () => {
  test('Media page renders with scorecard or empty state and issues link', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedMediaProject(request);

    await authenticatePage(page, accessToken);

    // Navigate to Media page
    await page.goto(`/projects/${projectId}/media`);

    // Assert: "Media & Accessibility" heading visible
    await expect(
      page.getByRole('heading', { name: /Media & Accessibility/i })
    ).toBeVisible();

    // Assert: Either scorecard section renders OR empty-state message renders
    // hasScorecard keys off the specific "Media Accessibility Score" section heading (not generic "Accessibility")
    const hasScorecard = await page
      .getByText(/Media Accessibility Score/i)
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/No Media Data Available/i)
      .isVisible()
      .catch(() => false);

    expect(hasScorecard || hasEmptyState).toBeTruthy();

    // Assert: "View Media Issues" link exists with valid internal href to issues page filtered by pillar
    const viewMediaIssuesLink = page.getByRole('link', {
      name: /View Media Issues/i,
    });
    await expect(viewMediaIssuesLink).toBeVisible();

    // Verify the href points to the project's issues page with media pillar filter
    const href = await viewMediaIssuesLink.getAttribute('href');
    expect(href).toContain(`/projects/${projectId}/issues`);
    expect(href).toContain('pillar=media_accessibility');
  });
});
