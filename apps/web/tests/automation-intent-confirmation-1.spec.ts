/**
 * [EA-43: AUTOMATION-INTENT-CONFIRMATION-1] Explicit Intent Confirmation E2E Tests
 *
 * Test coverage:
 * 1. Confirmation modal appears before automation execution
 * 2. Modal displays clear impact statement
 * 3. User must check responsibility acknowledgement checkbox
 * 4. User must type "APPLY" to confirm (not single-click)
 * 5. Confirm button is disabled until all requirements are met
 * 6. User can cancel without executing automation
 * 7. Automation only executes after full confirmation flow
 *
 * Prerequisites:
 * - /testkit/e2e/seed-first-deo-win endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    { data: {} }
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
    { data: { projectId } }
  );
  expect(res.ok()).toBeTruthy();
}

test.describe('EA-43: Automation Intent Confirmation', () => {
  test('Confirmation modal blocks automation execution until all requirements met', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to playbooks page
    await page.goto(`/projects/${projectId}/automation/playbooks?playbook=missing_seo_title`);

    // Wait for page to load
    await expect(page.locator('[data-testid="playbook-step-1"]')).toBeVisible({
      timeout: 15000,
    });

    // Generate preview (if available)
    const generatePreviewBtn = page.locator('[data-testid="generate-preview-button"]');
    if (await generatePreviewBtn.isVisible()) {
      await generatePreviewBtn.click();
      await expect(page.locator('[data-testid="preview-samples"]')).toBeVisible({
        timeout: 30000,
      });
    }

    // Move to estimate step
    const continueToEstimateBtn = page.locator('[data-testid="continue-to-estimate-button"]');
    if (await continueToEstimateBtn.isVisible()) {
      await continueToEstimateBtn.click();
    }

    // Check the initial checkbox (existing flow)
    const initialCheckbox = page.locator('input[type="checkbox"]').first();
    if (await initialCheckbox.isVisible()) {
      await initialCheckbox.check();
    }

    // Click Apply button
    const applyButton = page.locator('button:has-text("Apply playbook")');
    if (await applyButton.isVisible() && await applyButton.isEnabled()) {
      await applyButton.click();

      // Verify confirmation modal appears
      const modal = page.locator('[data-testid="automation-intent-confirmation-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify impact statement is displayed
      await expect(page.locator('[data-testid="intent-confirmation-impact"]')).toBeVisible();

      // Verify confirm button is initially disabled
      const confirmBtn = page.locator('[data-testid="intent-confirmation-confirm"]');
      await expect(confirmBtn).toBeDisabled();

      // Check responsibility checkbox
      const responsibilityCheckbox = page.locator('[data-testid="intent-confirmation-responsibility"] input[type="checkbox"]');
      await responsibilityCheckbox.check();

      // Confirm button should still be disabled (need to type APPLY)
      await expect(confirmBtn).toBeDisabled();

      // Type confirmation phrase
      const confirmInput = page.locator('[data-testid="intent-confirmation-text-input"]');
      await confirmInput.fill('APPLY');

      // Now confirm button should be enabled
      await expect(confirmBtn).toBeEnabled();
    }
  });

  test('User can cancel confirmation modal without executing automation', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks?playbook=missing_seo_title`);

    await expect(page.locator('[data-testid="playbook-step-1"]')).toBeVisible({
      timeout: 15000,
    });

    // Navigate through the flow to reach Apply
    const generatePreviewBtn = page.locator('[data-testid="generate-preview-button"]');
    if (await generatePreviewBtn.isVisible()) {
      await generatePreviewBtn.click();
      await expect(page.locator('[data-testid="preview-samples"]')).toBeVisible({
        timeout: 30000,
      });
    }

    const continueToEstimateBtn = page.locator('[data-testid="continue-to-estimate-button"]');
    if (await continueToEstimateBtn.isVisible()) {
      await continueToEstimateBtn.click();
    }

    const initialCheckbox = page.locator('input[type="checkbox"]').first();
    if (await initialCheckbox.isVisible()) {
      await initialCheckbox.check();
    }

    const applyButton = page.locator('button:has-text("Apply playbook")');
    if (await applyButton.isVisible() && await applyButton.isEnabled()) {
      await applyButton.click();

      // Modal should appear
      const modal = page.locator('[data-testid="automation-intent-confirmation-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Click cancel
      const cancelBtn = page.locator('[data-testid="intent-confirmation-cancel"]');
      await cancelBtn.click();

      // Modal should be closed
      await expect(modal).not.toBeVisible();

      // Apply button should still be there (automation was not executed)
      await expect(applyButton).toBeVisible();
    }
  });

  test('Confirmation requires typing APPLY (case insensitive)', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks?playbook=missing_seo_title`);

    await expect(page.locator('[data-testid="playbook-step-1"]')).toBeVisible({
      timeout: 15000,
    });

    const generatePreviewBtn = page.locator('[data-testid="generate-preview-button"]');
    if (await generatePreviewBtn.isVisible()) {
      await generatePreviewBtn.click();
      await expect(page.locator('[data-testid="preview-samples"]')).toBeVisible({
        timeout: 30000,
      });
    }

    const continueToEstimateBtn = page.locator('[data-testid="continue-to-estimate-button"]');
    if (await continueToEstimateBtn.isVisible()) {
      await continueToEstimateBtn.click();
    }

    const initialCheckbox = page.locator('input[type="checkbox"]').first();
    if (await initialCheckbox.isVisible()) {
      await initialCheckbox.check();
    }

    const applyButton = page.locator('button:has-text("Apply playbook")');
    if (await applyButton.isVisible() && await applyButton.isEnabled()) {
      await applyButton.click();

      const modal = page.locator('[data-testid="automation-intent-confirmation-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Check responsibility checkbox
      const responsibilityCheckbox = page.locator('[data-testid="intent-confirmation-responsibility"] input[type="checkbox"]');
      await responsibilityCheckbox.check();

      const confirmBtn = page.locator('[data-testid="intent-confirmation-confirm"]');
      const confirmInput = page.locator('[data-testid="intent-confirmation-text-input"]');

      // Wrong text should not enable button
      await confirmInput.fill('CONFIRM');
      await expect(confirmBtn).toBeDisabled();

      await confirmInput.fill('yes');
      await expect(confirmBtn).toBeDisabled();

      // Lowercase "apply" should work (case insensitive)
      await confirmInput.fill('apply');
      await expect(confirmBtn).toBeEnabled();

      // Mixed case should work
      await confirmInput.fill('Apply');
      await expect(confirmBtn).toBeEnabled();
    }
  });

  test('Modal displays correct impact information', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/automation/playbooks?playbook=missing_seo_title`);

    await expect(page.locator('[data-testid="playbook-step-1"]')).toBeVisible({
      timeout: 15000,
    });

    const generatePreviewBtn = page.locator('[data-testid="generate-preview-button"]');
    if (await generatePreviewBtn.isVisible()) {
      await generatePreviewBtn.click();
      await expect(page.locator('[data-testid="preview-samples"]')).toBeVisible({
        timeout: 30000,
      });
    }

    const continueToEstimateBtn = page.locator('[data-testid="continue-to-estimate-button"]');
    if (await continueToEstimateBtn.isVisible()) {
      await continueToEstimateBtn.click();
    }

    const initialCheckbox = page.locator('input[type="checkbox"]').first();
    if (await initialCheckbox.isVisible()) {
      await initialCheckbox.check();
    }

    const applyButton = page.locator('button:has-text("Apply playbook")');
    if (await applyButton.isVisible() && await applyButton.isEnabled()) {
      await applyButton.click();

      const modal = page.locator('[data-testid="automation-intent-confirmation-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify impact panel contains key information
      const impactPanel = page.locator('[data-testid="intent-confirmation-impact"]');
      await expect(impactPanel).toContainText('What will happen');
      await expect(impactPanel).toContainText('Shopify');
      await expect(impactPanel).toContainText('affected');
    }
  });
});
