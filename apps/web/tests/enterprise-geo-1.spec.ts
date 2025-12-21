import { test, expect } from '@playwright/test';

/**
 * [ENTERPRISE-GEO-1] Enterprise Governance Playwright Tests
 *
 * Tests for:
 * - Governance settings UI
 * - Passcode-protected share links
 * - Approval workflow UI indicators
 */

test.describe('ENTERPRISE-GEO-1: Enterprise Governance', () => {
  test.beforeEach(async ({ page }) => {
    // Seed test data using existing geo-insights-2 seeder
    const seedResponse = await page.request.post(
      'http://localhost:3001/testkit/e2e/seed-geo-insights-2',
    );
    const seedData = await seedResponse.json();

    // Login with seeded user
    await page.goto('/login');
    await page.fill('input[name="email"]', seedData.user.email);
    await page.fill('input[name="password"]', 'test-password-123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(/\/projects/);

    // Store project info for later use
    await page.evaluate((data) => {
      (window as any).__testData = data;
    }, seedData);
  });

  test('Governance settings section appears on project settings page', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/settings`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Project Settings")');

    // Check for Governance section
    const governanceSection = page.getByText('Governance & Approvals');
    await expect(governanceSection).toBeVisible();
  });

  test('Can toggle approval requirement setting', async ({ page }) => {
    const testData = await page.evaluate(() => (window as any).__testData);
    await page.goto(`/projects/${testData.project.id}/settings`);

    // Wait for governance section to load
    await page.waitForSelector('text=Governance & Approvals');

    // Find and click the approval toggle
    const approvalToggle = page.getByRole('switch', { name: /Require Approval/i });
    await expect(approvalToggle).toBeVisible();

    // Toggle it on
    await approvalToggle.click();

    // Save button should be enabled now
    const saveButton = page.getByRole('button', { name: /Save Governance Settings/i });
    await expect(saveButton).not.toBeDisabled();
  });

  test('Passcode-protected link shows passcode entry on public view', async ({ page, request }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Create a passcode-protected share link via API
    const token = await page.evaluate(() => localStorage.getItem('engineo_token'));
    const createResponse = await request.post(
      `http://localhost:3001/projects/${testData.project.id}/geo-reports/share-links`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          audience: 'PASSCODE',
        },
      },
    );

    const linkData = await createResponse.json();
    const shareToken = linkData.shareLink.shareToken;
    const passcode = linkData.passcode;

    // Visit the public share page
    await page.goto(`/share/geo-report/${shareToken}`);

    // Should see passcode entry form
    await page.waitForSelector('text=Protected Report');
    const passcodeInput = page.getByPlaceholder(/passcode/i);
    await expect(passcodeInput).toBeVisible();

    // Enter correct passcode
    await passcodeInput.fill(passcode);
    await page.getByRole('button', { name: /View Report/i }).click();

    // Should now see the report
    await page.waitForSelector('text=GEO Readiness Report');
  });

  test('Wrong passcode shows error message', async ({ page, request }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Create a passcode-protected share link via API
    const token = await page.evaluate(() => localStorage.getItem('engineo_token'));
    const createResponse = await request.post(
      `http://localhost:3001/projects/${testData.project.id}/geo-reports/share-links`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          audience: 'PASSCODE',
        },
      },
    );

    const linkData = await createResponse.json();
    const shareToken = linkData.shareLink.shareToken;

    // Visit the public share page
    await page.goto(`/share/geo-report/${shareToken}`);

    // Enter wrong passcode
    await page.waitForSelector('text=Protected Report');
    const passcodeInput = page.getByPlaceholder(/passcode/i);
    await passcodeInput.fill('WRONGPWD');
    await page.getByRole('button', { name: /View Report/i }).click();

    // Should see error message
    await page.waitForSelector('text=Invalid passcode');
  });

  test('Share link expiry days respect governance policy', async ({ page, request }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // First update governance policy to set custom expiry
    const token = await page.evaluate(() => localStorage.getItem('engineo_token'));
    await request.put(
      `http://localhost:3001/projects/${testData.project.id}/governance/policy`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          shareLinkExpiryDays: 3,
        },
      },
    );

    // Create a share link
    const createResponse = await request.post(
      `http://localhost:3001/projects/${testData.project.id}/geo-reports/share-links`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {},
      },
    );

    const linkData = await createResponse.json();
    const expiresAt = new Date(linkData.shareLink.expiresAt);
    const createdAt = new Date(linkData.shareLink.createdAt);
    const diffDays = Math.round((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Should be 3 days per the policy we set
    expect(diffDays).toBe(3);
  });

  test('Restricted share links block unauthorized audience', async ({ page, request }) => {
    const testData = await page.evaluate(() => (window as any).__testData);

    // Enable restrictions with passcode requirement
    const token = await page.evaluate(() => localStorage.getItem('engineo_token'));
    await request.put(
      `http://localhost:3001/projects/${testData.project.id}/governance/policy`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          restrictShareLinks: true,
          allowedExportAudience: 'PASSCODE',
        },
      },
    );

    // Try to create a public link - should fail
    const createResponse = await request.post(
      `http://localhost:3001/projects/${testData.project.id}/geo-reports/share-links`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          audience: 'ANYONE_WITH_LINK',
        },
      },
    );

    expect(createResponse.status()).toBe(403);
    const errorData = await createResponse.json();
    expect(errorData.message).toContain('passcode');
  });
});
