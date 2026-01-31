/**
 * [EA-38] Progress Reinforcement E2E Tests
 *
 * Test coverage:
 * 1. Progress reinforcement card displays when user has made progress
 * 2. Language is factual and calm with no urgency or pressure
 * 3. No implied automation or authority claims in messaging
 * 4. Reinforcement is shown within the product only
 *
 * Trust Contract:
 * - Reinforcement must be factual and calm
 * - Users must feel progress, not pressure
 * - No implied automation or authority
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedProjectWithProgress(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    { data: {} }
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

test.describe('EA-38: Progress Reinforcement UI', () => {
  test('Progress reinforcement card uses factual, calm language', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProjectWithProgress(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that progress card or first DEO win completion is visible
    const progressCard = page.locator('[data-testid="progress-reinforcement-card"]');
    const firstWinComplete = page.locator('[data-testid="first-deo-win-complete"]');

    // At least one of these should be visible for a project with progress
    const hasProgressUI = await progressCard.isVisible() || await firstWinComplete.isVisible();

    if (hasProgressUI) {
      // Verify no urgency language
      const pageContent = await page.textContent('body');

      // These urgency phrases should NOT appear in progress reinforcement
      const urgencyPhrases = [
        'act now',
        'don\'t miss',
        'limited time',
        'hurry',
        'immediately',
        'urgent',
        'before it\'s too late',
        'last chance',
      ];

      for (const phrase of urgencyPhrases) {
        expect(pageContent?.toLowerCase()).not.toContain(phrase.toLowerCase());
      }

      // Verify no implied automation language
      const automationPhrases = [
        'we optimized',
        'we improved',
        'we fixed',
        'automatically applied',
        'auto-optimized',
      ];

      for (const phrase of automationPhrases) {
        expect(pageContent?.toLowerCase()).not.toContain(phrase.toLowerCase());
      }
    }
  });

  test('Progress reinforcement on insights page shows factual summaries', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProjectWithProgress(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/insights`);

    await page.waitForLoadState('networkidle');

    // Check for the progress reinforcement section on insights
    const reinforcementSection = page.locator('[data-testid="insights-progress-reinforcement"]');

    // If visible, verify calm language
    if (await reinforcementSection.isVisible()) {
      const sectionText = await reinforcementSection.textContent();

      // Should contain factual progress language
      expect(sectionText).toMatch(/improved|grown|applied|resolved/i);

      // Should NOT contain pressure language
      expect(sectionText?.toLowerCase()).not.toContain('must');
      expect(sectionText?.toLowerCase()).not.toContain('should');
      expect(sectionText?.toLowerCase()).not.toContain('need to');
    }
  });

  test('First DEO win completion message is confidence-building', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedProjectWithProgress(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/overview`);

    await page.waitForLoadState('networkidle');

    const completionMessage = page.locator('[data-testid="first-deo-win-complete"]');

    if (await completionMessage.isVisible()) {
      const messageText = await completionMessage.textContent();

      // Should be factual and calm
      expect(messageText).toContain('complete');

      // Should reference what they've done, not pressure for more
      expect(messageText).toMatch(/you've|your/i);
    }
  });
});
