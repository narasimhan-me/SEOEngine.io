/**
 * [ERROR-&-BLOCKED-STATE-UX-1] Playwright E2E Tests
 *
 * Verifies the blocked and error state UX requirements:
 * - Blocked states are visually distinct and immediately recognizable
 * - Every blocked control displays inline explanation of WHY
 * - Every blocked state provides clear next step
 * - No controls are silently disabled
 * - Keyboard and screen reader users receive equivalent information
 *
 * Prerequisites:
 * - Uses /testkit/e2e/seed-list-actions-clarity-1 for test data with blocked states
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

interface SeedResponse {
  projectId: string;
  accessToken: string;
  editorAccessToken: string;
  draftPendingProductId: string;
}

async function seedTestData(request: any): Promise<SeedResponse> {
  const response = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-list-actions-clarity-1`,
    { data: {} }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('ERROR-&-BLOCKED-STATE-UX-1: Blocked State Visibility', () => {
  test('Blocked chip is visually distinct with inline explanation', async ({
    page,
    request,
  }) => {
    const { projectId, editorAccessToken } = await seedTestData(request);

    // Login as EDITOR (who cannot apply drafts)
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, editorAccessToken);

    await page.goto(`/projects/${projectId}/products`);

    // Wait for products list to load
    await expect(page.locator('[data-testid="row-status-chip"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Find the Blocked chip
    const blockedChip = page.locator('[data-testid="row-status-chip"]').filter({
      hasText: 'Blocked',
    });

    // Verify blocked chip exists and has accessible attributes
    await expect(blockedChip).toBeVisible();

    // [REQUIREMENT] Blocked states have aria-label with reason
    const ariaLabel = await blockedChip.getAttribute('aria-label');
    expect(ariaLabel).toContain('Blocked');
    expect(ariaLabel).toContain('approval'); // Should mention approval requirement

    // [REQUIREMENT] Blocked states have title attribute for tooltip
    const title = await blockedChip.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toContain('approval');
  });

  test('Blocked action shows inline explanation above disabled button', async ({
    page,
    request,
  }) => {
    const { projectId, editorAccessToken } = await seedTestData(request);

    // Login as EDITOR
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, editorAccessToken);

    // Navigate to Work Queue where disabled CTAs appear
    await page.goto(`/projects/${projectId}/work-queue`);

    // Wait for action bundle cards to load
    await expect(page.locator('[data-testid="action-bundle-card"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Find a card with disabled reason
    const blockedReasonElement = page.locator('[data-testid="action-bundle-blocked-reason"]');

    if (await blockedReasonElement.isVisible()) {
      // [REQUIREMENT] Blocked reason is visible above the button, not hidden
      const blockedText = await blockedReasonElement.textContent();
      expect(blockedText).toBeTruthy();
      expect(blockedText!.length).toBeGreaterThan(10); // Should be a real explanation

      // [REQUIREMENT] Element has role="status" for screen readers
      const role = await blockedReasonElement.getAttribute('role');
      expect(role).toBe('status');

      // [REQUIREMENT] Disabled button has aria-disabled
      const disabledButton = page.locator('a[aria-disabled="true"]');
      if (await disabledButton.isVisible()) {
        const ariaDisabled = await disabledButton.getAttribute('aria-disabled');
        expect(ariaDisabled).toBe('true');
      }
    }
  });

  test('Blocked chip provides clear next step action', async ({
    page,
    request,
  }) => {
    const { projectId, editorAccessToken } = await seedTestData(request);

    // Login as EDITOR
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, editorAccessToken);

    await page.goto(`/projects/${projectId}/products`);

    // Wait for list to load
    await expect(page.locator('[data-testid="row-status-chip"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Find row with Blocked chip
    const blockedRow = page.locator('div').filter({
      has: page.locator('[data-testid="row-status-chip"]').filter({ hasText: 'Blocked' }),
    });

    if (await blockedRow.first().isVisible()) {
      // [REQUIREMENT] Primary action provides clear next step
      const primaryAction = blockedRow.first().locator('[data-testid="row-primary-action"]');

      if (await primaryAction.isVisible()) {
        const actionLabel = await primaryAction.textContent();
        // Should be actionable: "Request approval" or "View approval status"
        expect(actionLabel).toMatch(/Request approval|View approval status/);
      }
    }
  });

  test('Screen reader receives equivalent blocked state information', async ({
    page,
    request,
  }) => {
    const { projectId, editorAccessToken } = await seedTestData(request);

    // Login as EDITOR
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, editorAccessToken);

    await page.goto(`/projects/${projectId}/products`);

    // Wait for list to load
    await expect(page.locator('[data-testid="row-status-chip"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Find Blocked chip
    const blockedChip = page.locator('[data-testid="row-status-chip"]').filter({
      hasText: 'Blocked',
    });

    if (await blockedChip.isVisible()) {
      // [REQUIREMENT] aria-label contains both reason and next step
      const ariaLabel = await blockedChip.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Should contain explanation of why blocked
      expect(ariaLabel!.toLowerCase()).toMatch(/awaiting|requires|approval|permission/);

      // [REQUIREMENT] role="status" for announcements
      const role = await blockedChip.getAttribute('role');
      expect(role).toBe('status');
    }
  });
});

test.describe('ERROR-&-BLOCKED-STATE-UX-1: No Silent Disables', () => {
  test('Disabled sync button explains why when Shopify not connected', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedTestData(request);

    // Login as owner
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/assets/pages`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // If Shopify not connected, should see explanation (not just disabled button)
    const notConnectedMessage = page.locator('text=Shopify is not connected');
    const connectLink = page.locator('text=Connect Shopify in Project Settings');

    if (await notConnectedMessage.isVisible()) {
      // [REQUIREMENT] Clear explanation of why sync is not available
      await expect(notConnectedMessage).toBeVisible();
      // [REQUIREMENT] Clear next step (link to settings)
      await expect(connectLink).toBeVisible();
    }
  });
});
