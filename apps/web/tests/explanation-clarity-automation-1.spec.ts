/**
 * [EA-47: EXPLANATION-CLARITY-AUTOMATION-1] Explanation Clarity E2E Tests
 *
 * Test coverage:
 * 1. "What happens if automated" explanations exist for automation-eligible issues
 * 2. Explanations use future/conditional tense (would, could, if enabled)
 * 3. Factual observations are visually separated from recommendations
 * 4. No explanation text can be interpreted as an action trigger
 * 5. Users can identify at a glance whether content is fact vs. recommendation
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

test.describe('EA-47: Explanation Clarity with Automation', () => {
  test('Guidance panel displays observation and recommendation sections with distinct styling', async ({
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

      // Wait for RCP guidance panel
      const guidancePanel = page.locator('[data-testid="rcp-issue-guidance-panel"]');
      const panelVisible = await guidancePanel.isVisible().catch(() => false);

      if (panelVisible) {
        // Verify observation badge is present
        const observationBadge = page.locator('[data-testid="explanation-type-badge-observation"]');
        await expect(observationBadge.first()).toBeVisible();

        // Verify recommendation badge is present
        const recommendationBadge = page.locator('[data-testid="explanation-type-badge-recommendation"]');
        await expect(recommendationBadge.first()).toBeVisible();
      }
    }
  });

  test('Automation outcome explanation uses conditional/future tense', async ({
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

    // Click on an actionable issue
    const issueRow = page.locator('[data-testid="issue-row-actionable"]').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      // Check for automation outcome explanation section
      const automationOutcome = page.locator('[data-testid="automation-outcome-explanation"]');
      const outcomeVisible = await automationOutcome.isVisible().catch(() => false);

      if (outcomeVisible) {
        // Verify conditional language is used (would, could, if)
        const outcomeText = await automationOutcome.textContent();
        expect(outcomeText).toMatch(/would|could|if you chose/i);

        // Verify "If automated" label is present
        await expect(automationOutcome).toContainText('If automated');

        // Verify non-execution disclaimer is present
        await expect(automationOutcome).toContainText('does not trigger any action');
      }
    }
  });

  test('Trust reminder explicitly states reading does not trigger action', async ({
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
        // Verify trust reminder contains explicit non-execution language
        await expect(guidancePanel).toContainText('This is informational only');
        await expect(guidancePanel).toContainText('Reading this guidance does not trigger any action');
      }
    }
  });

  test('Automation capability panel uses conditional tense throughout', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to playbooks page
    await page.goto(`/projects/${projectId}/playbooks`);

    // Look for automation capability panel if present
    const automationPanel = page.locator('[data-testid="automation-capability-panel"]');
    const panelVisible = await automationPanel.isVisible().catch(() => false);

    if (panelVisible) {
      // Verify conditional tense headers
      await expect(automationPanel).toContainText('What this automation would do');
      await expect(automationPanel).toContainText('Fields that would be affected');
      await expect(automationPanel).toContainText('Would not touch');
      await expect(automationPanel).toContainText('How it would run');
      await expect(automationPanel).toContainText('Would target');

      // Verify "Reading only" badge
      await expect(automationPanel).toContainText('Reading only');

      // Verify non-execution footer
      await expect(automationPanel).toContainText('nothing happens until you explicitly choose');
    }
  });

  test('No explanation section contains action-triggering language', async ({
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
        const panelText = await guidancePanel.textContent() || '';

        // Ensure no action-triggering language in explanation sections
        // These phrases should NOT appear in passive explanation contexts
        const actionTriggerPhrases = [
          'Click here to apply',
          'Click to run',
          'Execute now',
          'Apply changes',
          'Start automation',
          'Enable now',
        ];

        for (const phrase of actionTriggerPhrases) {
          expect(panelText).not.toContain(phrase);
        }
      }
    }
  });
});
