import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
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

async function connectShopifyE2E(request: any, projectId: string) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
    data: { projectId },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe('TEST-2 – First DEO Win (Playwright E2E)', () => {
  test('First DEO Win happy path completes (connect → crawl → review → optimize 3)', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(
      request,
    );

    // Programmatic login: set token in localStorage.
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    // Navigate to Project Overview.
    await page.goto(`/projects/${projectId}/overview`);

    // Checklist initially shows all steps incomplete.
    await expect(
      page.getByRole('heading', { name: /First DEO win/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/0 of 4 steps complete/i),
    ).toBeVisible();

    // Step 1: Connect store via E2E testkit, then refresh UI.
    await connectShopifyE2E(request, projectId);
    await page.reload();
    await expect(
      page.getByText(/Connect your store/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Connect your store/i).locator('..').getByText(/Completed/i),
    ).toBeVisible();

    // Step 2: Run first crawl (uses SEO scan stub in E2E mode).
    await page.getByRole('button', { name: /Run crawl/i }).click();
    await expect(
      page.getByText(/Run your first crawl/i).locator('..').getByText(/Completed/i),
    ).toBeVisible();

    // Step 3: Review DEO Score.
    await page.getByRole('button', { name: /View DEO Score/i }).click();
    await expect(
      page.getByText(/Review your DEO Score/i).locator('..').getByText(/Completed/i),
    ).toBeVisible();

    // Step 4: Optimize 3 products via product workspace (single-item flow).
    for (let i = 0; i < Math.min(productIds.length, 3); i += 1) {
      const productId = productIds[i];

      await page.goto(
        `/projects/${projectId}/products/${productId}?focus=metadata`,
      );

      // Metadata section visible and focused.
      await expect(
        page.getByRole('heading', { name: /Metadata/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: /SEO Metadata/i }),
      ).toBeVisible();

      // Apply manual optimization: edit fields and apply to Shopify.
      const newTitle = `E2E Optimized Title ${i + 1}`;
      const newDescription = `E2E Optimized Description ${i + 1} – deterministic test metadata.`;

      await page.getByLabel('Meta Title').fill(newTitle);
      await page.getByLabel('Meta Description').fill(newDescription);
      await page.getByRole('button', { name: /Apply to Shopify/i }).click();

      await expect(
        page.getByText(/Applied to Shopify and saved in EngineO/i),
      ).toBeVisible();
    }

    // Return to overview and verify optimization progress is reflected.
    await page.goto(`/projects/${projectId}/overview`);

    // First DEO Win checklist should be fully complete (all steps).
    await expect(
      page.getByText(/First DEO win/i),
    ).not.toBeVisible();

    // "Next DEO Win" card should be visible once First DEO Win is complete.
    await expect(
      page.getByText(/Next DEO Win/i),
    ).toBeVisible();
  });

  test('Optimize workspace exposes only single-item apply (no bulk apply)', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(
      request,
    );

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(
      `/projects/${projectId}/products/${productId}?focus=metadata`,
    );

    // Metadata editor is present.
    await expect(
      page.getByRole('heading', { name: /SEO Metadata/i }),
    ).toBeVisible();

    // Ensure the page does NOT expose bulk apply CTAs like "Apply to all".
    await expect(
      page.getByText(/Apply to all/i),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Bulk apply/i),
    ).toHaveCount(0);
  });
});
