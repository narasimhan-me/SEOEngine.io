import { test, expect } from '@playwright/test';

/**
 * PRODUCTS-LIST-2.0 Smoke Test
 *
 * Validates that the Products List page renders correctly and
 * supports navigation to product workspace.
 */

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedProductsProject(request: any) {
  // Reuse seed-first-deo-win which creates products
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

async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('PRODUCTS-LIST-2.0 – Products List Smoke Test', () => {
  test('Products list renders and navigates to product detail', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProductsProject(request);

    await authenticatePage(page, accessToken);

    // Navigate to Products List page
    await page.goto(`/projects/${projectId}/products`);

    // Assert: Products page heading visible
    await expect(
      page.getByRole('heading', { name: /Products/i }),
    ).toBeVisible();

    // Assert: At least one "View details" product link is visible
    const viewDetailsLink = page.getByRole('link', { name: /View details/i }).first();
    await expect(viewDetailsLink).toBeVisible();

    // Click the first "View details" link
    await viewDetailsLink.click();

    // Assert: Navigation to product detail URL
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/products/`));
  });
});
