/**
 * [SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1] Playwright E2E
 * Verifies connect/disconnect consistency and working entry points.
 */
import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-first-deo-win`, { data: {} });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { projectId: body.projectId as string, accessToken: body.accessToken as string };
}

async function connectShopifyE2E(request: any, projectId: string) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
    data: { projectId },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { shopDomain: body.shopDomain as string };
}

async function setProjectDomain(request: any, accessToken: string, projectId: string, domain: string) {
  const res = await request.put(`${API_BASE_URL}/projects/${projectId}`, {
    data: { domain },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
}

async function createProject(request: any, accessToken: string, domain: string) {
  const res = await request.post(`${API_BASE_URL}/projects`, {
    data: { name: `Test Project ${Date.now()}`, domain },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const projectId = (body?.id ?? body?.projectId) as string;
  expect(typeof projectId).toBe('string');
  return projectId;
}

async function login(page: any, token: string) {
  await page.goto('/login');
  await page.evaluate((t: string) => localStorage.setItem('engineo_token', t), token);
}

test.describe('SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1', () => {
  test('SILI1-001: Disconnect Shopify clears connected state across Settings and Store Health', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    const { shopDomain } = await connectShopifyE2E(request, projectId);
    await setProjectDomain(request, accessToken, projectId, shopDomain);
    await login(page, accessToken);

    await page.goto(`/projects/${projectId}/settings#integrations`);
    await expect(page.getByRole('heading', { name: 'Active Integrations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect Shopify' })).toBeVisible();
    await page.getByRole('button', { name: 'Disconnect Shopify' }).click();
    await expect(page.getByRole('button', { name: 'Connect Shopify' })).toBeVisible();

    await page.goto(`/projects/${projectId}/store-health`);
    await expect(page.getByText(/Shopify is not connected/i)).toBeVisible();
  });

  test('SILI1-002: Store Health shows connect CTA when Shopify-domain project is not connected', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);
    const projectId = await createProject(request, accessToken, `shop-${Date.now()}.myshopify.com`);
    await login(page, accessToken);

    await page.goto(`/projects/${projectId}/store-health`);
    await expect(page.getByText(/Shopify is not connected/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Shopify' })).toBeVisible();
  });

  test('SILI1-003: Products empty-state link routes to /settings#integrations', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);
    const projectId = await createProject(request, accessToken, `empty-${Date.now()}.myshopify.com`);
    await login(page, accessToken);

    await page.goto(`/projects/${projectId}/products`);
    const link = page.getByRole('link', { name: /Go to project settings to connect Shopify/i });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/settings#integrations`));
  });

  test('SILI1-004: Settings Connect Shopify uses connect-url and never fails silently when token missing', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);
    const projectId = await createProject(request, accessToken, `connect-${Date.now()}.myshopify.com`);
    await login(page, accessToken);

    await page.goto(`/projects/${projectId}/settings#integrations`);
    await expect(page.getByRole('button', { name: 'Connect Shopify' })).toBeVisible();

    // Missing token path: inline error + no navigation
    await page.evaluate(() => localStorage.removeItem('engineo_token'));
    await page.getByRole('button', { name: 'Connect Shopify' }).click();
    await expect(page.getByText(/session token is missing/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in again/i })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/settings`));

    // Happy path: connect-url request + OAuth navigation attempt
    await page.evaluate((t: string) => localStorage.setItem('engineo_token', t), accessToken);
    await page.route('**/admin/oauth/authorize**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>oauth</body></html>' });
    });

    const connectRequestPromise = page.waitForRequest((req) => {
      return req.method() === 'GET' && req.url().includes(`/projects/${projectId}/shopify/connect-url`);
    });
    const oauthNavPromise = page.waitForURL(/admin\/oauth\/authorize/);

    await page.getByRole('button', { name: 'Connect Shopify' }).click();
    const connectReq = await connectRequestPromise;
    const connectReqUrl = new URL(connectReq.url());
    expect(connectReqUrl.searchParams.get('returnTo')).toBe(`/projects/${projectId}/settings#integrations`);

    await oauthNavPromise;
    const oauthUrl = new URL(page.url());
    expect(oauthUrl.searchParams.get('redirect_uri') || '').toContain('/shopify/callback');
    expect((oauthUrl.searchParams.get('scope') || '').length).toBeGreaterThan(0);
  });
});
