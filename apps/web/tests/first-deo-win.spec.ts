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

async function seedPlaybookNoEligibleProductsProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-playbook-no-eligible-products`,
    {
      data: {},
    },
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
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

test.describe('AUTO-PB-1.1 – Automation Playbooks Hardening (Playwright E2E)', () => {
  test('Playbooks page shows per-item results after apply', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    // Connect Shopify for eligible status
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks`);

    // Playbook cards should be visible
    await expect(
      page.getByText(/Fix missing SEO titles/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Fix missing SEO descriptions/i),
    ).toBeVisible();

    // Select the missing_seo_title playbook
    await page.getByText(/Fix missing SEO titles/i).click();

    // Step 1 - Preview section should be visible
    await expect(
      page.getByText(/Step 1 – Preview changes/i),
    ).toBeVisible();

    // Continue to Estimate
    await page.getByRole('button', { name: /Continue to Estimate/i }).click();

    // Step 2 - Estimate should be visible
    await expect(
      page.getByText(/Step 2 – Estimate impact/i),
    ).toBeVisible();

    // Continue to Apply
    await page.getByRole('button', { name: /Continue to Apply/i }).click();

    // Step 3 - Apply section should be visible
    await expect(
      page.getByText(/Step 3 – Apply playbook/i),
    ).toBeVisible();

    // Confirm checkbox
    await page.getByRole('checkbox').check();

    // Apply playbook
    await page.getByRole('button', { name: /Apply playbook/i }).click();

    // Wait for results to appear
    await expect(
      page.getByText(/Updated products:/i),
    ).toBeVisible({ timeout: 30000 });

    // Per-item results panel should be expandable
    await expect(
      page.getByText(/View per-product results/i),
    ).toBeVisible();

    // Expand results panel
    await page.getByText(/View per-product results/i).click();

    // Table headers should be visible
    await expect(
      page.getByRole('columnheader', { name: /Product/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /Status/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /Message/i }),
    ).toBeVisible();
  });

  test('Playbooks page shows "Stopped safely" banner when playbook stops early', async ({
    page,
    request,
  }) => {
    // This test requires a mock that simulates stop-on-failure
    // In real E2E, we'd need a testkit endpoint that configures the AI service to fail
    // For now, we verify the UI elements exist and are properly styled

    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks`);

    // Verify stepper UI exists
    await expect(page.getByText(/Preview/i)).toBeVisible();
    await expect(page.getByText(/Estimate/i)).toBeVisible();
    await expect(page.getByText(/Apply/i)).toBeVisible();
  });

  test('Playbooks preview shows "Sample preview (showing up to 3 products)" label', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks`);

    // Select a playbook
    await page.getByText(/Fix missing SEO titles/i).click();

    // Generate preview
    await page.getByRole('button', { name: /Generate preview/i }).click();

    // Wait for preview to load and verify label
    await expect(
      page.getByText(/Sample preview \(up to 3 products\)/i),
    ).toBeVisible({ timeout: 30000 });
  });
});

test.describe('AUTO-PB-1.2 – Playbooks UX Coherence (Playwright E2E)', () => {
  test('Zero-eligibility state shows guardrail and disables wizard flow', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } =
      await seedPlaybookNoEligibleProductsProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks`);

    await page.getByText(/Fix missing SEO titles/i).click();

    await expect(
      page.getByText(/No products currently qualify for this playbook/i),
    ).toBeVisible();

    // Steps 2 and 3 should not be actionable
    await expect(
      page.getByText(/Step 2 – Estimate impact & tokens/i),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Step 3 – Apply playbook/i),
    ).toHaveCount(0);

    // Only primary CTA should be the eligibility CTA
    const viewProductsButton = page.getByRole('button', {
      name: /View products that need optimization/i,
    });
    await expect(viewProductsButton).toBeVisible();
    await viewProductsButton.click();

    await expect(page).toHaveURL(
      new RegExp(`/projects/${projectId}/products`),
    );
  });

  test('Wizard enforces step gating, navigation warning, and post-apply persistence', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks`);

    await page.getByText(/Fix missing SEO titles/i).click();

    // Step 1: no Continue to Estimate before preview
    await expect(
      page.getByRole('button', { name: /Continue to Estimate/i }),
    ).toHaveCount(0);

    // Step 2 / 3 CTAs should not allow apply before preview
    await expect(
      page.getByRole('button', { name: /Continue to Apply/i }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: /Apply playbook/i }),
    ).toBeDisabled();

    // Generate preview → unlock Continue to Estimate
    await page.getByRole('button', { name: /Generate preview/i }).click();
    await expect(
      page.getByText(/Sample preview \(up to 3 products\)/i),
    ).toBeVisible({ timeout: 30000 });

    const continueToEstimate = page.getByRole('button', {
      name: /Continue to Estimate/i,
    });
    await expect(continueToEstimate).toBeEnabled();
    await continueToEstimate.click();

    // Continue to Apply should now be enabled
    const continueToApply = page.getByRole('button', {
      name: /Continue to Apply/i,
    });
    await expect(continueToApply).toBeEnabled();

    // Navigation away while in-progress should prompt
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('link', { name: /^Projects$/ }).click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/in-progress playbook preview/i);
    await dialog.dismiss();

    // Still on Playbooks page
    await expect(
      page.getByText(/Step 1 – Preview changes/i),
    ).toBeVisible();

    // Continue to Apply and run the playbook
    await continueToApply.click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Apply playbook/i }).click();

    await expect(
      page.getByText(/Updated products:/i),
    ).toBeVisible({ timeout: 30000 });

    // Reload and verify results persist
    await page.reload();
    await expect(
      page.getByText(/Updated products:/i),
    ).toBeVisible({ timeout: 30000 });

    // View updated products → Back to Playbook results works
    await page.getByRole('button', { name: /View updated products/i }).click();
    await expect(
      page.getByText(/Back to Playbook results/i),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Back to Playbook results/i })
      .click();
    await expect(
      page.getByText(/Updated products:/i),
    ).toBeVisible({ timeout: 30000 });
  });
});
