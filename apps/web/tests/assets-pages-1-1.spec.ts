import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed a project with Pages/Collections for ASSETS-PAGES-1.1 testing.
 * Uses the existing first-deo-win seeder and adds page/collection data.
 */
async function seedAssetsProject(request: any) {
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

test.describe('ASSETS-PAGES-1.1-UI-HARDEN – Playbooks UI for Pages/Collections (Playwright E2E)', () => {
  test('Playbooks page shows asset type badge when assetType=PAGES', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Playbooks page with PAGES assetType and scope
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title&assetType=PAGES&scopeAssetRefs=page_handle:about-us`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Asset type badge should render ("Pages")
    await expect(page.getByText('pages', { exact: false })).toBeVisible();
  });

  test('Playbooks page shows scope summary with handle refs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate with scope refs
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title&assetType=PAGES&scopeAssetRefs=page_handle:about-us,page_handle:contact`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Scope summary should render with handle names
    await expect(page.getByText(/Scope summary/i)).toBeVisible();
    await expect(page.getByText('about-us', { exact: false })).toBeVisible();
    await expect(page.getByText('contact', { exact: false })).toBeVisible();
  });

  test('Playbooks page shows missing scope block when PAGES without scopeAssetRefs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate with PAGES but NO scopeAssetRefs
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title&assetType=PAGES`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Missing scope block should be visible
    await expect(page.getByText(/Missing scope for pages/i)).toBeVisible();

    // Return to Work Queue link should be visible
    await expect(
      page.getByRole('link', { name: /Return to Work Queue/i })
    ).toBeVisible();
  });

  test('Playbooks page shows missing scope block when COLLECTIONS without scopeAssetRefs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate with COLLECTIONS but NO scopeAssetRefs
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title&assetType=COLLECTIONS`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Missing scope block should be visible
    await expect(
      page.getByText(/Missing scope for collections/i)
    ).toBeVisible();
  });

  test('PRODUCTS assetType works without scopeAssetRefs (backwards compatibility)', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate with PRODUCTS (or no assetType) - should work without scope
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // NO missing scope block should appear
    await expect(page.getByText(/Missing scope for/i)).not.toBeVisible();

    // Generate Preview button should be visible (actions not blocked)
    const previewBtn = page.getByRole('button', { name: /Generate Preview/i });
    await expect(previewBtn).toBeVisible();
  });

  test('Deep link from Work Queue preserves all params including scopeAssetRefs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Simulate a deep link that would come from Work Queue
    const deepLinkUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_description&assetType=PAGES&scopeAssetRefs=page_handle:shipping-policy`;
    await page.goto(deepLinkUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Verify URL params are preserved
    expect(page.url()).toContain('playbookId=missing_seo_description');
    expect(page.url()).toContain('assetType=PAGES');
    expect(page.url()).toContain('scopeAssetRefs=page_handle:shipping-policy');

    // Scope summary should show the handle
    await expect(page.getByText(/Scope summary/i)).toBeVisible();
    await expect(
      page.getByText('shipping-policy', { exact: false })
    ).toBeVisible();
  });

  test('Scope summary shows "+N more" for multiple refs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedAssetsProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate with more than 3 scope refs
    const scopeRefs = [
      'page_handle:about',
      'page_handle:contact',
      'page_handle:shipping',
      'page_handle:returns',
      'page_handle:privacy',
    ].join(',');
    const playbookUrl = `/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title&assetType=PAGES&scopeAssetRefs=${scopeRefs}`;
    await page.goto(playbookUrl);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /Playbooks/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Scope summary should show first 3 handles and "+N more"
    await expect(page.getByText(/Scope summary/i)).toBeVisible();
    await expect(page.getByText(/\+2 more/i)).toBeVisible();
  });
});
