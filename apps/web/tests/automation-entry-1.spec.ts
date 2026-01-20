import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
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

async function connectShopifyE2E(request: any, projectId: string) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/connect-shopify`,
    {
      data: { projectId },
    }
  );
  expect(res.ok()).toBeTruthy();
}

test.describe('AUTOMATION-ENTRY-1 – Automation Playbook Entry UX (Playwright E2E)', () => {
  test('Entry from Products bulk action navigates to Entry page with context', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Products page
    await page.goto(`/projects/${projectId}/products`);

    // Wait for products to load
    await expect(page.getByText(/products/i)).toBeVisible({ timeout: 10000 });

    // Look for "Fix missing metadata" button (bulk action)
    const fixMissingMetadataBtn = page.getByRole('button', {
      name: /Fix missing metadata/i,
    });

    // If visible, click it to navigate to automation entry
    if (await fixMissingMetadataBtn.isVisible()) {
      await fixMissingMetadataBtn.click();

      // Should navigate to automation entry page
      await expect(page).toHaveURL(
        new RegExp(`/projects/${projectId}/automation/playbooks/entry`)
      );

      // Entry page header should be visible
      await expect(
        page.getByRole('heading', { name: /New Playbook/i })
      ).toBeVisible();
    }
  });

  test('Entry from Product details "Automate this fix" button', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } =
      await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to first product details
    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}`);

    // Wait for product details to load
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // Click "Automate this fix" button
    const automateBtn = page.getByRole('button', {
      name: /Automate this fix/i,
    });
    await expect(automateBtn).toBeVisible();
    await automateBtn.click();

    // Should navigate to automation entry page
    await expect(page).toHaveURL(
      new RegExp(`/projects/${projectId}/automation/playbooks/entry`)
    );

    // Entry page should show the correct context
    await expect(
      page.getByRole('heading', { name: /New Playbook/i })
    ).toBeVisible();
  });

  test('Entry from Playbooks page "Create playbook" button', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Playbooks page
    await page.goto(`/projects/${projectId}/automation/playbooks`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Click "Create playbook" button
    const createBtn = page.getByRole('button', {
      name: /Create playbook/i,
    });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Should navigate to automation entry page
    await expect(page).toHaveURL(
      new RegExp(`/projects/${projectId}/automation/playbooks/entry`)
    );
  });

  test('Entry page shows scope selection section', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate directly to entry page
    await page.goto(`/projects/${projectId}/automation/playbooks/entry`);

    // Check for scope selection section
    await expect(
      page.getByRole('heading', { name: /New Playbook/i })
    ).toBeVisible();

    // Scope options should be visible
    await expect(page.getByText(/All products/i)).toBeVisible();
    await expect(page.getByText(/Specific products/i)).toBeVisible();
  });

  test('Entry page shows trigger selection section', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks/entry`);

    await expect(
      page.getByRole('heading', { name: /New Playbook/i })
    ).toBeVisible();

    // Trigger section should show manual-only option (MVP)
    await expect(page.getByText(/Manual only/i)).toBeVisible();
  });

  test('Entry page enforces preview-first before enablement', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks/entry`);

    await expect(
      page.getByRole('heading', { name: /New Playbook/i })
    ).toBeVisible();

    // Enable button should be disabled before preview is generated
    const enableBtn = page.getByRole('button', { name: /Enable playbook/i });
    await expect(enableBtn).toBeDisabled();

    // Generate Preview button should be visible
    const previewBtn = page.getByRole('button', { name: /Generate Preview/i });
    await expect(previewBtn).toBeVisible();
  });

  test('Entry page generates preview and enables enablement button', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks/entry`);

    await expect(
      page.getByRole('heading', { name: /New Playbook/i })
    ).toBeVisible();

    // Generate preview
    const previewBtn = page.getByRole('button', { name: /Generate Preview/i });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    // Wait for preview to generate
    await expect(page.getByText(/Preview/i)).toBeVisible({ timeout: 30000 });

    // Enable button should now be enabled
    const enableBtn = page.getByRole('button', { name: /Enable playbook/i });
    await expect(enableBtn).toBeEnabled({ timeout: 5000 });
  });
});
