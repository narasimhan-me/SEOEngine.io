/**
 * [SHOPIFY-ASSET-SYNC-COVERAGE-1] Playwright E2E Smoke Test
 *
 * This test verifies Shopify Pages + Collections sync functionality:
 * 1. Seeds seed-first-deo-win, connects Shopify
 * 2. Seeds Shopify mock Pages + Collections via POST /testkit/e2e/mock-shopify-assets
 * 3. Navigates to Pages list and verifies sync behavior
 * 4. Navigates to Collections list and verifies sync behavior
 *
 * Prerequisites:
 * - Uses /testkit/e2e/seed-first-deo-win to set up test data
 * - Uses /testkit/e2e/connect-shopify to connect a test Shopify store
 * - Uses /testkit/e2e/mock-shopify-assets to seed mock Shopify data
 *
 * Fully deterministic (no live Shopify dependency).
 */

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

async function connectShopifyE2EWithScope(request: any, projectId: string, scope: string) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
    data: { projectId, scope },
  });
  expect(res.ok()).toBeTruthy();
}

async function setShopifyScopeE2E(request: any, projectId: string, scope: string) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/set-shopify-scope`, {
    data: { projectId, scope },
  });
  expect(res.ok()).toBeTruthy();
}

async function seedMockShopifyAssets(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/mock-shopify-assets`, {
    data: {
      pages: [
        {
          id: '101',
          title: 'About Us',
          handle: 'about-us',
          updatedAt: '2025-01-01T00:00:00Z',
          seo: { title: 'About Us - SEO Title', description: 'About us page description' },
        },
        {
          id: '102',
          title: 'Contact',
          handle: 'contact',
          updatedAt: '2025-01-02T00:00:00Z',
          seo: { title: null, description: null },
        },
      ],
      collections: [
        {
          id: '201',
          title: 'Summer Collection',
          handle: 'summer-collection',
          updatedAt: '2025-01-03T00:00:00Z',
          seo: { title: 'Summer Collection SEO', description: 'Summer deals' },
        },
        {
          id: '202',
          title: 'New Arrivals',
          handle: 'new-arrivals',
          updatedAt: '2025-01-04T00:00:00Z',
          seo: { title: null, description: null },
        },
      ],
    },
  });
  expect(res.ok()).toBeTruthy();
  return await res.json();
}

test.describe('SHOPIFY-ASSET-SYNC-COVERAGE-1: Shopify Pages + Collections Sync', () => {
  test('SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1: Reconnect CTA never fails silently when token missing', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2EWithScope(request, projectId, 'read_products,write_products');
    await seedMockShopifyAssets(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/assets/pages`);
    await expect(page.getByRole('heading', { name: 'Additional Shopify permission required' })).toBeVisible();

    // Remove the token to simulate missing session
    await page.evaluate(() => {
      localStorage.removeItem('engineo_token');
    });

    await page.getByRole('button', { name: 'Reconnect Shopify' }).click();

    // Verify inline error is shown (not a silent failure)
    await expect(
      page.getByText(/session token is missing\. Please sign in again, then retry\./i),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in again/i })).toBeVisible();

    // Verify we stayed on the same page (no redirect)
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/assets/pages`));
  });

  test('SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1: Reconnect CTA calls reconnect-url and navigates to Shopify OAuth', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2EWithScope(request, projectId, 'read_products,write_products');
    await seedMockShopifyAssets(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/assets/pages`);
    await expect(page.getByRole('heading', { name: 'Additional Shopify permission required' })).toBeVisible();

    // Mock the OAuth redirect destination
    await page.route('**/admin/oauth/authorize**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>oauth</body></html>',
      });
    });

    const reconnectRequestPromise = page.waitForRequest((req) => {
      return (
        req.method() === 'GET' &&
        req.url().includes(`/projects/${projectId}/shopify/reconnect-url`)
      );
    });

    const oauthNavPromise = page.waitForURL(/\/admin\/oauth\/authorize/);

    await page.getByRole('button', { name: 'Reconnect Shopify' }).click();

    // Verify reconnect-url was called with correct params
    const reconnectReq = await reconnectRequestPromise;
    const reconnectReqUrl = new URL(reconnectReq.url());
    expect(reconnectReqUrl.searchParams.get('capability')).toBe('pages_sync');
    expect(reconnectReqUrl.searchParams.get('returnTo')).toBe(`/projects/${projectId}/assets/pages`);

    // Verify OAuth redirect happened
    await oauthNavPromise;
    const oauthUrl = new URL(page.url());
    const scopesCsv = oauthUrl.searchParams.get('scope') || '';
    const scopes = scopesCsv.split(',').map((s) => s.trim()).filter(Boolean);
    expect(scopes).toContain('read_content');
  });

  test('SHOPIFY-SCOPE-RECONSENT-UX-1: Missing scope shows permission notice and auto-syncs after reconnect return', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2EWithScope(request, projectId, 'read_products,write_products');
    await seedMockShopifyAssets(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Collections should NOT be blocked by missing read_content (read_products is sufficient)
    await page.goto(`/projects/${projectId}/assets/collections`);
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Additional Shopify permission required' })).not.toBeVisible();

    const syncCollections = page.getByRole('button', { name: /Sync Collections/i });
    await expect(syncCollections).toBeVisible();
    await syncCollections.click();
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });

    // Pages should show the permission notice (read_content missing)
    await page.goto(`/projects/${projectId}/assets/pages`);
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Additional Shopify permission required' })).toBeVisible();

    const syncPages = page.getByRole('button', { name: /Sync Pages/i });
    await expect(syncPages).toBeDisabled();

    // Server-authoritative missing scopes signal
    const missing = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/missing-scopes?capability=pages_sync`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(missing.ok()).toBeTruthy();
    const missingBody = await missing.json();
    expect(missingBody.missingScopes).toContain('read_content');

    // Reconnect URL requests minimal union (existing + missing)
    const reconnectUrlRes = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/reconnect-url?capability=pages_sync&returnTo=${encodeURIComponent(
        `/projects/${projectId}/assets/pages`,
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(reconnectUrlRes.ok()).toBeTruthy();
    const reconnectUrlBody = await reconnectUrlRes.json();
    const redirectUrl = new URL(reconnectUrlBody.url);
    const scopesCsv = redirectUrl.searchParams.get('scope') || '';
    const scopes = scopesCsv.split(',').map((s) => s.trim()).filter(Boolean);
    expect(scopes).toContain('read_content');
    expect(scopes).not.toContain('read_themes');

    // Simulate successful re-consent by updating stored scope, then verify auto-sync on return params
    await setShopifyScopeE2E(request, projectId, 'read_products,write_products,read_content');
    await page.goto(`/projects/${projectId}/assets/pages?shopify=reconnected&reconnect=pages_sync`);
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('about-us')).toBeVisible();
    await expect(page.getByText('contact')).toBeVisible();
  });

  test('Pages list shows sync status and pages after sync', async ({
    page,
    request,
  }) => {
    // Seed project and Shopify connection
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssets(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Pages list
    await page.goto(`/projects/${projectId}/assets/pages`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible({ timeout: 10000 });

    // Verify "Shopify Pages" label is visible
    await expect(page.getByText('Shopify Pages')).toBeVisible();

    // Initially, should show "Not yet synced" message
    await expect(page.getByText(/Not yet synced/i)).toBeVisible();

    // Click Sync Pages button
    const syncButton = page.getByRole('button', { name: /Sync Pages/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Wait for sync to complete and verify pages appear
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });

    // Verify About Us page appears in the list
    await expect(page.getByText('about-us')).toBeVisible();

    // Verify Contact page appears in the list
    await expect(page.getByText('contact')).toBeVisible();
  });

  test('Collections list shows sync status and collections after sync', async ({
    page,
    request,
  }) => {
    // Seed project and Shopify connection
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssets(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Collections list
    await page.goto(`/projects/${projectId}/assets/collections`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible({ timeout: 10000 });

    // Verify "Shopify Collections" label is visible
    await expect(page.getByText('Shopify Collections')).toBeVisible();

    // Initially, should show "Not yet synced" message
    await expect(page.getByText(/Not yet synced/i)).toBeVisible();

    // Click Sync Collections button
    const syncButton = page.getByRole('button', { name: /Sync Collections/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Wait for sync to complete and verify collections appear
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });

    // Verify Summer Collection appears in the list
    await expect(page.getByText('summer-collection')).toBeVisible();

    // Verify New Arrivals appears in the list
    await expect(page.getByText('new-arrivals')).toBeVisible();
  });

  test('Sync status API returns correct timestamps', async ({ request }) => {
    // Seed project and Shopify connection
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssets(request);

    // Check initial sync status (all null)
    const statusBefore = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(statusBefore.ok()).toBeTruthy();
    const bodyBefore = await statusBefore.json();
    expect(bodyBefore.lastPagesSyncAt).toBeNull();
    expect(bodyBefore.lastCollectionsSyncAt).toBeNull();

    // Sync pages
    const syncPagesRes = await request.post(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-pages`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(syncPagesRes.ok()).toBeTruthy();
    const syncPagesBody = await syncPagesRes.json();
    expect(syncPagesBody.fetched).toBeGreaterThan(0);
    expect(syncPagesBody.upserted).toBeGreaterThan(0);

    // Check sync status after pages sync
    const statusAfterPages = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(statusAfterPages.ok()).toBeTruthy();
    const bodyAfterPages = await statusAfterPages.json();
    expect(bodyAfterPages.lastPagesSyncAt).not.toBeNull();
    expect(bodyAfterPages.lastCollectionsSyncAt).toBeNull(); // Not yet synced

    // Sync collections
    const syncCollectionsRes = await request.post(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-collections`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(syncCollectionsRes.ok()).toBeTruthy();
    const syncCollBody = await syncCollectionsRes.json();
    expect(syncCollBody.fetched).toBeGreaterThan(0);

    // Check sync status after collections sync
    const statusAfterAll = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(statusAfterAll.ok()).toBeTruthy();
    const bodyAfterAll = await statusAfterAll.json();
    expect(bodyAfterAll.lastPagesSyncAt).not.toBeNull();
    expect(bodyAfterAll.lastCollectionsSyncAt).not.toBeNull();
  });
});
