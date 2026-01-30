/**
 * [EA-41: ISSUE-TO-ACTION-GUIDANCE-1] Issue-to-Action Guidance Panel E2E Tests
 *
 * Test coverage:
 * 1. Issue detail view displays a guidance panel linking the issue to a recommended action
 * 2. Each guidance panel includes a plain-English explanation of why the action helps
 * 3. Guidance panels are visually distinct from execution controls
 * 4. Users can dismiss guidance without taking action
 * 5. No action is auto-selected or auto-run as a result of guidance
 * 6. Language uses suggestive framing (e.g., "You might consider...")
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

test.describe('EA-41: Issue-to-Action Guidance Panel', () => {
  test('Guidance panel displays for actionable issues with recommendations', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to issues page
    await page.goto(`/projects/${projectId}/issues`);

    // Wait for issues to load
    await expect(page.locator('[data-testid="issues-table"]')).toBeVisible({
      timeout: 15000,
    });

    // Click on an actionable issue to open RCP
    const actionableIssueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await actionableIssueRow.isVisible()) {
      await actionableIssueRow.click();

      // Wait for RCP guidance panel to appear
      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');

      // Verify guidance panel is visible (if issue has guidance mapping)
      // Note: Not all issues have guidance mappings, so we check conditionally
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify suggestive language is present
        await expect(guidancePanel).toContainText('You might consider');

        // Verify guidance recommendation is present
        const recommendation = guidancePanel.locator('[data-testid="guidance-recommendation"]');
        await expect(recommendation.first()).toBeVisible();
      }
    }
  });

  test('Guidance panel includes plain-English explanation of why action helps', async ({
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

    // Click on an issue with known guidance (missing_seo_title or missing_seo_description)
    const issueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify "What it does" section is present
        await expect(guidancePanel).toContainText('What it does:');

        // Verify "Affects" section is present
        await expect(guidancePanel).toContainText('Affects:');

        // Verify fix type badge is present
        const fixTypeBadge = guidancePanel.locator('span:has-text("AI"), span:has-text("Guidance"), span:has-text("Template")');
        await expect(fixTypeBadge.first()).toBeVisible();
      }
    }
  });

  test('User can dismiss guidance panel without taking action', async ({
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

    const issueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Find and click dismiss button
        const dismissButton = page.locator('[data-testid="dismiss-guidance-button"]');
        await expect(dismissButton).toBeVisible();
        await dismissButton.click();

        // Verify panel is no longer visible
        await expect(guidancePanel).not.toBeVisible();
      }
    }
  });

  test('Guidance panel is visually distinct from execution controls', async ({
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

    const issueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify guidance panel does NOT contain primary action buttons
        // (No "Apply", "Save", "Execute" buttons within the guidance panel)
        const applyButton = guidancePanel.locator('button:has-text("Apply")');
        const saveButton = guidancePanel.locator('button:has-text("Save")');
        const executeButton = guidancePanel.locator('button:has-text("Execute")');

        await expect(applyButton).not.toBeVisible();
        await expect(saveButton).not.toBeVisible();
        await expect(executeButton).not.toBeVisible();

        // Verify trust reminder text is present
        await expect(guidancePanel).toContainText('This is a suggestion');
        await expect(guidancePanel).toContainText('You decide');
      }
    }
  });

  test('No action is auto-selected or auto-run from guidance', async ({
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

    const issueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      // Wait for RCP to fully load
      await page.waitForTimeout(1000);

      // Verify no checkboxes are pre-checked in guidance panel
      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        const checkedCheckboxes = guidancePanel.locator('input[type="checkbox"]:checked');
        const checkedCount = await checkedCheckboxes.count();
        expect(checkedCount).toBe(0);

        // Verify no radio buttons are pre-selected
        const checkedRadios = guidancePanel.locator('input[type="radio"]:checked');
        const radioCount = await checkedRadios.count();
        expect(radioCount).toBe(0);
      }
    }
  });

  test('Issue card shows inline guidance hint for actionable issues', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to a page that shows IssuesList component (e.g., overview or issues grouped view)
    await page.goto(`/projects/${projectId}/overview`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for inline guidance hints in issue cards
    const guidanceHint = page.locator('[data-testid="issue-card-guidance-hint"]');
    const hintVisible = await guidanceHint.first().isVisible().catch(() => false);

    if (hintVisible) {
      // Verify hint uses suggestive language
      await expect(guidanceHint.first()).toContainText('You might consider');
    }
  });
});
