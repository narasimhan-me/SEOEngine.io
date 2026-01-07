import { test, expect } from '@playwright/test';

/**
 * BILLING-GTM-1 Smoke Test
 *
 * Validates that the Billing page renders correctly with
 * plan details and billing action CTAs.
 */

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedBillingUser(request: any) {
  // Reuse seed-self-service-user which has billing context
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-self-service-user`, {
    data: {},
  });
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

test.describe('BILLING-GTM-1 – Billing Page Smoke Test', () => {
  test('Billing page renders with plan info and action CTA', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedBillingUser(request);

    await authenticatePage(page, accessToken);

    // Navigate to Billing page (global settings, not project-scoped)
    await page.goto('/settings/billing');

    // Assert: "Plan & Billing" heading visible
    await expect(
      page.getByRole('heading', { name: /Plan & Billing/i }),
    ).toBeVisible();

    // Assert: "Current Plan" section OR "Available Plans" section visible
    const hasCurrentPlan = await page.getByText(/Current Plan/i).isVisible().catch(() => false);
    const hasAvailablePlans = await page.getByText(/Available Plans/i).isVisible().catch(() => false);

    expect(hasCurrentPlan || hasAvailablePlans).toBeTruthy();

    // Assert: At least one billing action CTA present (Upgrade or Manage Billing)
    // CTA may be disabled, that's acceptable for smoke test
    const upgradeButton = page.getByRole('button', { name: /Upgrade/i });
    const upgradeLinkButton = page.getByRole('link', { name: /Upgrade/i });
    const manageBillingButton = page.getByRole('button', { name: /Manage Billing/i });
    const manageBillingLink = page.getByRole('link', { name: /Manage Billing/i });

    const hasUpgradeButton = await upgradeButton.count() > 0;
    const hasUpgradeLink = await upgradeLinkButton.count() > 0;
    const hasManageBillingButton = await manageBillingButton.count() > 0;
    const hasManageBillingLink = await manageBillingLink.count() > 0;

    expect(hasUpgradeButton || hasUpgradeLink || hasManageBillingButton || hasManageBillingLink).toBeTruthy();
  });
});
