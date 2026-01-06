import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * [SELF-SERVICE-1] Playwright E2E Tests
 *
 * Tests for Customer Self-Service Control Plane:
 * - Profile management
 * - Organization / Stores management
 * - Plan & Billing with role-safe UI
 * - AI Usage visibility
 * - Preferences
 * - Security (sessions, sign-out-all)
 * - Role-based access control (OWNER vs EDITOR vs VIEWER)
 */

interface SeedResponse {
  user: { id: string; email: string };
  accessToken: string;
}

async function seedSelfServiceOwner(request: any): Promise<SeedResponse> {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-self-service-user`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function seedSelfServiceEditor(request: any): Promise<SeedResponse> {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-self-service-editor`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function seedSelfServiceViewer(request: any): Promise<SeedResponse> {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-self-service-viewer`, {
    data: {},
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function loginWithToken(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('SELF-SERVICE-1 – Profile Management (D1)', () => {
  test('Profile page loads and displays user data', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/profile');

    // Page title
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible();

    // Email field (read-only)
    await expect(page.getByLabel('Email')).toBeDisabled();

    // Editable fields
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Timezone')).toBeVisible();
    await expect(page.getByLabel('Locale')).toBeVisible();

    // Account role (read-only)
    await expect(page.getByLabel('Account Role')).toBeDisabled();
  });

  test('Profile can be updated successfully', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/profile');

    // Update name
    await page.getByLabel('Name').fill('E2E Updated Name');

    // Select timezone
    await page.getByLabel('Timezone').selectOption('America/Los_Angeles');

    // Select locale
    await page.getByLabel('Locale').selectOption('en-US');

    // Save
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Success message
    await expect(page.getByText(/Profile updated successfully/i)).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Organization / Stores (D2)', () => {
  test('Organization page loads for OWNER', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/organization');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Organization \/ Stores/i }),
    ).toBeVisible();

    // Organization name input should be enabled for OWNER
    const orgInput = page.getByPlaceholder('Your organization name');
    await expect(orgInput).toBeEnabled();

    // Connected stores section
    await expect(
      page.getByRole('heading', { name: /Connected Stores/i }),
    ).toBeVisible();
  });

  test('Organization name can be updated by OWNER', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/organization');

    // Update organization name
    await page.getByPlaceholder('Your organization name').fill('E2E Test Org');
    await page.getByRole('button', { name: /Save/i }).click();

    // Success message
    await expect(page.getByText(/Organization name updated/i)).toBeVisible();
  });

  test('VIEWER cannot edit organization name', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceViewer(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/organization');

    // Organization name input should be disabled for VIEWER
    const orgInput = page.getByPlaceholder('Your organization name');
    await expect(orgInput).toBeDisabled();

    // Read-only notice
    await expect(page.getByText(/read-only access/i)).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Plan & Billing (D3)', () => {
  test('Billing page shows current plan and AI usage for OWNER', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/billing');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Plan & Billing/i }),
    ).toBeVisible();

    // Stripe portal notice
    await expect(
      page.getByText(/Billing is handled securely via Stripe portal/i),
    ).toBeVisible();

    // Current plan section
    await expect(
      page.getByRole('heading', { name: /Current Plan/i }),
    ).toBeVisible();

    // AI Usage section
    await expect(page.getByText(/AI Usage/i)).toBeVisible();
  });

  /**
   * [BILLING-GTM-1] Validate trust messaging and correct AI runs display
   */
  test('Billing page shows runs avoided and APPLY trust message', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/billing');

    // [BILLING-GTM-1] Should show "Runs avoided via reuse" (not totalRuns as numerator)
    await expect(page.getByText(/Runs avoided via reuse/i)).toBeVisible();

    // [BILLING-GTM-1] Should show the APPLY trust invariant message
    await expect(page.getByText(/APPLY never uses AI/i)).toBeVisible();

    // [BILLING-GTM-1] Should show "AI runs used" (the corrected numerator, not totalRuns)
    await expect(page.getByText(/AI runs used/i)).toBeVisible();
  });

  test('OWNER can access billing actions', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/billing');

    // Available plans section
    await expect(
      page.getByRole('heading', { name: /Available Plans/i }),
    ).toBeVisible();

    // Plan buttons should not show "Owner Only" for OWNER
    await expect(page.getByText(/Owner Only/i)).toHaveCount(0);
  });

  test('EDITOR sees read-only billing notice', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceEditor(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/billing');

    // Read-only notice should be visible
    await expect(
      page.getByText(/Only account owners can manage billing/i),
    ).toBeVisible();

    // Plan buttons should show "Owner Only"
    await expect(page.getByText(/Owner Only/i).first()).toBeVisible();
  });

  test('VIEWER sees read-only billing notice', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceViewer(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/billing');

    // Read-only notice
    await expect(
      page.getByText(/Only account owners can manage billing/i),
    ).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – AI Usage (D4)', () => {
  test('AI Usage page shows usage data', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/ai-usage');

    // Page title
    await expect(
      page.getByRole('heading', { name: /AI Usage/i }),
    ).toBeVisible();

    // APPLY invariant message
    await expect(
      page.getByText(/APPLY never uses AI/i),
    ).toBeVisible();

    // Usage summary section
    await expect(page.getByText(/This Month's Usage/i)).toBeVisible();
    await expect(page.getByText(/AI Runs/i)).toBeVisible();
  });

  test('AI Usage page shows reuse metrics', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/ai-usage');

    // Reuse section
    await expect(page.getByText(/Reuse Effectiveness/i)).toBeVisible();
    await expect(page.getByText(/Reused Outputs/i)).toBeVisible();
    await expect(page.getByText(/New AI Generations/i)).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Preferences (D5)', () => {
  test('Preferences page loads with notification toggles', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/preferences');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Preferences/i }),
    ).toBeVisible();

    // Notification toggles
    await expect(page.getByText(/Quota Warning Notifications/i)).toBeVisible();
    await expect(page.getByText(/Run Failure Notifications/i)).toBeVisible();
    await expect(page.getByText(/Weekly DEO Summary/i)).toBeVisible();
  });

  test('Preferences can be updated by OWNER', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/preferences');

    // Toggle a preference
    await page.getByRole('checkbox', { name: /Quota Warning Notifications/i }).click();

    // Save
    await page.getByRole('button', { name: /Save Preferences/i }).click();

    // Success message
    await expect(page.getByText(/Preferences saved successfully/i)).toBeVisible();
  });

  test('VIEWER cannot modify preferences', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceViewer(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/preferences');

    // Read-only notice
    await expect(page.getByText(/read-only access/i)).toBeVisible();

    // Checkboxes should be disabled
    const checkbox = page.getByRole('checkbox').first();
    await expect(checkbox).toBeDisabled();
  });
});

test.describe('SELF-SERVICE-1 – Security (D6)', () => {
  test('Security page loads with sessions section', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/security');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Security/i }),
    ).toBeVisible();

    // Sessions section
    await expect(page.getByText(/Active Sessions/i)).toBeVisible();

    // Sign out all button
    await expect(
      page.getByRole('button', { name: /Sign Out All Other Sessions/i }),
    ).toBeVisible();
  });

  test('Sign out all sessions works', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/security');

    // Click sign out all
    await page.getByRole('button', { name: /Sign Out All Other Sessions/i }).click();

    // Success message
    await expect(
      page.getByText(/All other sessions have been signed out/i),
    ).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Help & Support (D7)', () => {
  test('Help page loads with support options', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings/help');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Help & Support/i }),
    ).toBeVisible();

    // Help sections
    await expect(page.getByText(/Help Center/i)).toBeVisible();
    await expect(page.getByText(/Contact Support/i)).toBeVisible();
    await expect(page.getByText(/Report an Issue/i)).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Account Menu Navigation', () => {
  test('Account menu dropdown shows all settings links', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/projects');

    // Open account menu
    await page.getByText('Account').click();

    // All menu items should be visible
    await expect(page.getByRole('link', { name: /Profile/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Organization \/ Stores/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Plan & Billing/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /AI Usage/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Preferences/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Security/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Help & Support/i }),
    ).toBeVisible();
    await expect(page.getByText(/Sign out/i)).toBeVisible();
  });

  test('Account menu navigates to profile page', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/projects');

    // Open account menu and click Profile
    await page.getByText('Account').click();
    await page.getByRole('link', { name: /^Profile$/i }).click();

    // Should be on profile page
    await expect(page).toHaveURL(/\/settings\/profile/);
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible();
  });
});

test.describe('SELF-SERVICE-1 – Settings Hub Navigation', () => {
  test('Settings hub shows all settings cards', async ({ page, request }) => {
    const { accessToken } = await seedSelfServiceOwner(request);
    await loginWithToken(page, accessToken);

    await page.goto('/settings');

    // Page title
    await expect(
      page.getByRole('heading', { name: /Settings/i }),
    ).toBeVisible();

    // All settings cards
    await expect(page.getByText(/Profile/i)).toBeVisible();
    await expect(page.getByText(/Organization \/ Stores/i)).toBeVisible();
    await expect(page.getByText(/Plan & Billing/i)).toBeVisible();
    await expect(page.getByText(/AI Usage/i)).toBeVisible();
    await expect(page.getByText(/Preferences/i)).toBeVisible();
    await expect(page.getByText(/Security/i)).toBeVisible();
    await expect(page.getByText(/Help & Support/i)).toBeVisible();
  });
});
