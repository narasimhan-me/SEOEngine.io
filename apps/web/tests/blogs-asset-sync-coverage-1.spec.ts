/**
 * [BLOGS-ASSET-SYNC-COVERAGE-1] Playwright E2E Smoke Test
 *
 * This test verifies Shopify Blog Posts (Articles) sync functionality:
 * 1. Seeds seed-first-deo-win, connects Shopify
 * 2. Seeds Shopify mock Articles via POST /testkit/e2e/mock-shopify-assets
 * 3. Navigates to Blog posts list and verifies sync behavior
 * 4. Verifies Published/Draft status badges based on shopifyPublishedAt
 *
 * Prerequisites:
 * - Uses /testkit/e2e/seed-first-deo-win to set up test data
 * - Uses /testkit/e2e/connect-shopify to connect a test Shopify store
 * - Uses /testkit/e2e/mock-shopify-assets to seed mock Shopify data (articles)
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

async function seedMockShopifyAssetsWithArticles(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/mock-shopify-assets`, {
    data: {
      pages: [],
      collections: [],
      articles: [
        {
          id: '301',
          title: 'Welcome to Our Blog',
          handle: 'welcome-to-our-blog',
          url: 'https://test-store.myshopify.com/blogs/news/welcome-to-our-blog',
          blogHandle: 'news',
          publishedAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-01-15T12:00:00Z',
        },
        {
          id: '302',
          title: 'Product Launch Announcement',
          handle: 'product-launch-announcement',
          url: 'https://test-store.myshopify.com/blogs/news/product-launch-announcement',
          blogHandle: 'news',
          publishedAt: '2025-01-14T09:00:00Z',
          updatedAt: '2025-01-14T11:00:00Z',
        },
        {
          id: '303',
          title: 'Draft Blog Post',
          handle: 'draft-blog-post',
          url: 'https://test-store.myshopify.com/blogs/news/draft-blog-post',
          blogHandle: 'news',
          publishedAt: null, // Draft - not published
          updatedAt: '2025-01-13T08:00:00Z',
        },
      ],
    },
  });
  expect(res.ok()).toBeTruthy();
  return await res.json();
}

test.describe('BLOGS-ASSET-SYNC-COVERAGE-1: Shopify Blog Posts (Articles) Sync', () => {
  test('BASC1-001: Blog posts list shows sync status and articles after sync with Published/Draft badges', async ({
    page,
    request,
  }) => {
    // Seed project and Shopify connection
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssetsWithArticles(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Blog posts list
    await page.goto(`/projects/${projectId}/assets/blogs`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Blog posts' })).toBeVisible({ timeout: 10000 });

    // Verify "Shopify Blog posts" label is visible
    await expect(page.getByText('Shopify Blog posts')).toBeVisible();

    // Initially, should show "Not yet synced" message
    await expect(page.getByText(/Not yet synced/i)).toBeVisible();

    // Click Sync Blog posts button
    const syncButton = page.getByRole('button', { name: /Sync Blog posts/i });
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Wait for sync to complete and verify last synced timestamp appears
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });

    // Verify blog posts appear in the list with blog/handle format
    await expect(page.getByText('news/welcome-to-our-blog')).toBeVisible();
    await expect(page.getByText('news/product-launch-announcement')).toBeVisible();
    await expect(page.getByText('news/draft-blog-post')).toBeVisible();

    // Verify Published badges appear for published posts
    const publishedBadges = page.locator('span:text("Published")');
    await expect(publishedBadges).toHaveCount(2);

    // Verify Draft badge appears for draft post
    const draftBadges = page.locator('span:text("Draft")');
    await expect(draftBadges).toHaveCount(1);
  });

  test('BASC1-002: Missing read_content scope shows permission notice with Reconnect CTA', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    // Connect with scopes missing read_content
    await connectShopifyE2EWithScope(request, projectId, 'read_products,write_products');
    await seedMockShopifyAssetsWithArticles(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Blog posts list
    await page.goto(`/projects/${projectId}/assets/blogs`);

    // Verify permission notice appears
    await expect(page.getByRole('heading', { name: 'Additional Shopify permission required' })).toBeVisible({ timeout: 10000 });

    // Verify Sync button is disabled
    const syncButton = page.getByRole('button', { name: /Sync Blog posts/i });
    await expect(syncButton).toBeDisabled();

    // Verify Reconnect Shopify button is visible
    await expect(page.getByRole('button', { name: 'Reconnect Shopify' })).toBeVisible();

    // Verify missing scope is displayed
    await expect(page.getByText('read_content')).toBeVisible();
  });

  test('BASC1-003: Reconnect flow requests read_content scope and auto-syncs after return', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2EWithScope(request, projectId, 'read_products,write_products');
    await seedMockShopifyAssetsWithArticles(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Check missing-scopes API returns correct missing scope
    const missing = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/missing-scopes?capability=blogs_sync`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(missing.ok()).toBeTruthy();
    const missingBody = await missing.json();
    expect(missingBody.missingScopes).toContain('read_content');

    // Check reconnect-url requests read_content
    const reconnectUrlRes = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/reconnect-url?capability=blogs_sync&returnTo=${encodeURIComponent(
        `/projects/${projectId}/assets/blogs`,
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(reconnectUrlRes.ok()).toBeTruthy();
    const reconnectUrlBody = await reconnectUrlRes.json();
    const redirectUrl = new URL(reconnectUrlBody.url);
    const scopesCsv = redirectUrl.searchParams.get('scope') || '';
    const scopes = scopesCsv.split(',').map((s) => s.trim()).filter(Boolean);
    expect(scopes).toContain('read_content');

    // Simulate successful re-consent by updating stored scope
    await setShopifyScopeE2E(request, projectId, 'read_products,write_products,read_content');

    // Navigate with reconnect params to trigger auto-sync
    await page.goto(`/projects/${projectId}/assets/blogs?shopify=reconnected&reconnect=blogs_sync`);

    // Verify auto-sync occurred
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('news/welcome-to-our-blog')).toBeVisible();
  });

  test('BASC1-004: Sync status API includes lastBlogsSyncAt timestamp', async ({ request }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssetsWithArticles(request);

    // Check initial sync status (lastBlogsSyncAt is null)
    const statusBefore = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(statusBefore.ok()).toBeTruthy();
    const bodyBefore = await statusBefore.json();
    expect(bodyBefore.lastBlogsSyncAt).toBeNull();

    // Sync blogs
    const syncBlogsRes = await request.post(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-blogs`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(syncBlogsRes.ok()).toBeTruthy();
    const syncBlogsBody = await syncBlogsRes.json();
    expect(syncBlogsBody.fetched).toBe(3);
    expect(syncBlogsBody.upserted).toBe(3);

    // Check sync status after blogs sync
    const statusAfter = await request.get(
      `${API_BASE_URL}/projects/${projectId}/shopify/sync-status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    expect(statusAfter.ok()).toBeTruthy();
    const bodyAfter = await statusAfter.json();
    expect(bodyAfter.lastBlogsSyncAt).not.toBeNull();
  });

  test('BASC1-005: Blog posts list shows "Open" links to external Shopify URLs', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);
    await seedMockShopifyAssetsWithArticles(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/assets/blogs`);

    // Sync blogs
    const syncButton = page.getByRole('button', { name: /Sync Blog posts/i });
    await syncButton.click();
    await expect(page.getByText(/Last synced:/i)).toBeVisible({ timeout: 15000 });

    // Verify Open links exist with correct href
    const openLinks = page.locator('a[data-testid="blog-post-open"]');
    await expect(openLinks).toHaveCount(3);

    // Verify first Open link points to the article path and opens in a new tab
    const firstOpenLink = openLinks.first();
    await expect(firstOpenLink).toHaveAttribute('href', /\/blogs\/news\/welcome-to-our-blog/);
    await expect(firstOpenLink).toHaveAttribute('target', '_blank');
  });
});
