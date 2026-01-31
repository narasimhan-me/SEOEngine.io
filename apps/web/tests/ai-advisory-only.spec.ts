/**
 * [EA-49: AI-ADVISORY-ONLY-1] AI Advisory-Only E2E Tests
 *
 * Test coverage:
 * 1. AI can explain what a playbook does when user requests explanation
 * 2. AI can provide "Is this right for me?" guidance when user asks
 * 3. AI never initiates execution of any playbook or action
 * 4. AI never makes autonomous decisions on user's behalf
 * 5. All AI outputs are clearly framed as advisory/explanatory
 * 6. User must take explicit action to execute any playbook after receiving AI guidance
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

test.describe('EA-49: AI Advisory-Only Behavior', () => {
  test('AI explanation is available when user requests it for a playbook', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to issues page where guidance panels appear
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for issues to load
    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    // Click on an actionable issue to open RCP
    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      // Look for AI guidance panel
      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Find and click "Explain this playbook" button
        const explainButton = page.locator('[data-testid="explain-playbook-button"]').first();
        if (await explainButton.isVisible()) {
          await explainButton.click();

          // Verify explanation panel appears
          const explanationPanel = page.locator('[data-testid="playbook-explanation-panel"]');
          await expect(explanationPanel).toBeVisible({ timeout: 5000 });

          // Verify AI advisory badge is present
          await expect(page.locator('[data-testid="ai-advisory-badge"]').first()).toBeVisible();

          // Verify explanation content is shown
          await expect(page.locator('[data-testid="ai-explanation-content"]').first()).toBeVisible();
        }
      }
    }
  });

  test('Is this right for me guidance is available when user asks', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/issues`);

    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Find and click "Is this right for me?" button
        const suitabilityButton = page.locator('[data-testid="is-this-right-for-me-button"]').first();
        if (await suitabilityButton.isVisible()) {
          await suitabilityButton.click();

          // Verify suitability guidance panel appears
          const suitabilityPanel = page.locator('[data-testid="suitability-guidance-panel"]');
          await expect(suitabilityPanel).toBeVisible({ timeout: 5000 });

          // Verify AI advisory badge is present
          await expect(page.locator('[data-testid="ai-advisory-badge"]').first()).toBeVisible();
        }
      }
    }
  });

  test('AI guidance can be dismissed without taking action', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/issues`);

    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Open suitability guidance
        const suitabilityButton = page.locator('[data-testid="is-this-right-for-me-button"]').first();
        if (await suitabilityButton.isVisible()) {
          await suitabilityButton.click();

          const suitabilityPanel = page.locator('[data-testid="suitability-guidance-panel"]');
          await expect(suitabilityPanel).toBeVisible({ timeout: 5000 });

          // Dismiss the guidance
          const dismissButton = page.locator('[data-testid="dismiss-suitability-guidance"]');
          await dismissButton.click();

          // Verify guidance panel is no longer visible
          await expect(suitabilityPanel).not.toBeVisible();

          // Verify "Is this right for me?" button is visible again
          await expect(suitabilityButton).toBeVisible();
        }
      }
    }
  });

  test('AI advisory badge is present on all AI-generated content', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/issues`);

    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify the AI guidance panel has advisory badge in header
        await expect(
          guidancePanel.locator('[data-testid="ai-advisory-badge"]')
        ).toBeVisible();

        // Verify suggestive language "You might consider" is present
        await expect(guidancePanel).toContainText('You might consider');

        // Verify advisory disclaimer is present
        await expect(guidancePanel).toContainText('guidance');
      }
    }
  });

  test('No auto-execution occurs when viewing AI guidance', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Set up network monitoring to ensure no execution calls are made
    const executionCalls: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Monitor for any playbook execution or apply endpoints
      if (
        url.includes('/execute') ||
        url.includes('/apply') ||
        url.includes('/run-playbook') ||
        url.includes('/trigger')
      ) {
        executionCalls.push(url);
      }
    });

    await page.goto(`/projects/${projectId}/issues`);

    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Interact with all AI guidance features
        const explainButton = page.locator('[data-testid="explain-playbook-button"]').first();
        if (await explainButton.isVisible()) {
          await explainButton.click();
          await page.waitForTimeout(500);
        }

        const suitabilityButton = page.locator('[data-testid="is-this-right-for-me-button"]').first();
        if (await suitabilityButton.isVisible()) {
          await suitabilityButton.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Verify no execution calls were made
    expect(executionCalls).toHaveLength(0);
  });

  test('User must take explicit action to execute playbook after AI guidance', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/issues`);

    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-ai-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify "View playbook" action is navigation, not execution
        const viewPlaybookButton = page.locator('[data-testid^="view-playbook-"]').first();
        if (await viewPlaybookButton.isVisible()) {
          // The button text should indicate navigation, not execution
          const buttonText = await viewPlaybookButton.textContent();
          expect(buttonText).toContain('View');
          expect(buttonText).not.toContain('Run');
          expect(buttonText).not.toContain('Execute');
          expect(buttonText).not.toContain('Apply');
        }
      }
    }
  });
});
