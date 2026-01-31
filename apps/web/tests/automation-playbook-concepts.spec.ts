/**
 * [EA-42] Automation Playbook Concepts E2E Tests
 *
 * Validates that automation playbooks are exposed as concepts only, not actions.
 *
 * Acceptance Criteria verified:
 * - Users can view automation-capable playbooks without run/execute UI
 * - Each playbook displays clear explanation of what it would do
 * - Each playbook displays explicit scope boundaries
 * - No buttons, links, or affordances exist that could trigger automation
 * - Automation is framed as optional and controlled in UI copy
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

/**
 * Seed user and project for authenticated tests.
 */
async function seedTestProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-first-deo-win`,
    {
      data: {},
    }
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    user: body.user as { id: string; email: string },
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

test.describe('EA-42: Automation Playbook Concepts Only', () => {
  /**
   * EA42-001: Playbooks list shows automation-capable indicator
   *
   * Given: User navigates to Playbooks page
   * When: Viewing the playbooks list
   * Then: Automation-capable playbooks show an "Automation" badge
   * And: No execute/run buttons are visible
   */
  test('EA42-001: Playbooks list shows automation indicator without execute buttons', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/playbooks`);
    await page.waitForLoadState('networkidle');

    // Verify playbooks page loads
    await expect(
      page.getByRole('heading', { name: /Playbooks/i })
    ).toBeVisible();

    // Verify educational notice is present and mentions automation is optional
    const educationalNotice = page.getByText(/Playbooks are for reference only/i);
    await expect(educationalNotice).toBeVisible();
    await expect(
      page.getByText(/Automation is always optional and user-controlled/i)
    ).toBeVisible();

    // Verify NO execute, run, apply, or schedule buttons exist
    await expect(page.getByRole('button', { name: /Execute/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Run/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Apply/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Schedule/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Enable/i })).not.toBeVisible();
  });

  /**
   * EA42-002: Automation capability panel displays scope boundaries
   *
   * Given: User selects an automation-capable playbook
   * When: Viewing the playbook detail panel
   * Then: "Automation Available" section is visible
   * And: "What this automation does" is displayed
   * And: "Fields affected" list is displayed
   * And: "Does not touch" list is displayed
   * And: No execution affordances are present
   */
  test('EA42-002: Automation detail panel shows scope boundaries without execution affordances', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/playbooks`);
    await page.waitForLoadState('networkidle');

    // Click on Metadata Standardization playbook (has automation)
    const playbookCard = page.getByText('Metadata Standardization').first();
    await playbookCard.click();

    // Wait for detail panel to appear
    const automationPanel = page.locator('[data-testid="automation-capability-panel"]');
    await expect(automationPanel).toBeVisible({ timeout: 5000 });

    // Verify automation capability header
    await expect(page.getByText('Automation Available')).toBeVisible();
    await expect(
      page.getByText(/This playbook can be automated/i)
    ).toBeVisible();

    // Verify "What this automation does" section
    await expect(page.getByText('What this automation does')).toBeVisible();

    // Verify "Fields affected" section
    await expect(page.getByText('Fields affected')).toBeVisible();
    await expect(page.getByText('SEO Title')).toBeVisible();
    await expect(page.getByText('Meta Description')).toBeVisible();

    // Verify "Does not touch" section
    await expect(page.getByText('Does not touch')).toBeVisible();
    await expect(page.getByText('Product prices')).toBeVisible();
    await expect(page.getByText('Inventory levels')).toBeVisible();

    // Verify reversibility info
    await expect(page.getByText('Reversible')).toBeVisible();

    // Verify trigger description
    await expect(page.getByText('How it runs')).toBeVisible();
    await expect(page.getByText(/User-initiated only/i)).toBeVisible();

    // Verify scope description
    await expect(page.getByText(/Scope:/i)).toBeVisible();

    // Verify NO execution affordances in the panel
    await expect(
      automationPanel.getByRole('button', { name: /Execute/i })
    ).not.toBeVisible();
    await expect(
      automationPanel.getByRole('button', { name: /Run/i })
    ).not.toBeVisible();
    await expect(
      automationPanel.getByRole('button', { name: /Apply/i })
    ).not.toBeVisible();
    await expect(
      automationPanel.getByRole('button', { name: /Enable/i })
    ).not.toBeVisible();
    await expect(
      automationPanel.getByRole('button', { name: /Schedule/i })
    ).not.toBeVisible();
  });

  /**
   * EA42-003: Non-automation playbooks do not show automation panel
   *
   * Given: User selects a playbook without automation capability
   * When: Viewing the playbook detail panel
   * Then: No "Automation Available" section is displayed
   */
  test('EA42-003: Non-automation playbooks do not show automation panel', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/playbooks`);
    await page.waitForLoadState('networkidle');

    // Click on Content Depth Improvement playbook (no automation)
    const playbookCard = page.getByText('Content Depth Improvement').first();
    await playbookCard.click();

    // Wait for detail panel to load
    await expect(page.getByText('Conceptual Steps')).toBeVisible();

    // Verify NO automation panel is present
    const automationPanel = page.locator('[data-testid="automation-capability-panel"]');
    await expect(automationPanel).not.toBeVisible();
  });

  /**
   * EA42-004: Educational framing emphasizes user control
   *
   * Given: User views automation capability information
   * When: Reading the automation description
   * Then: Text emphasizes optional and user-controlled nature
   */
  test('EA42-004: Automation framed as optional and user-controlled', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedTestProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/playbooks`);
    await page.waitForLoadState('networkidle');

    // Click on Metadata Standardization playbook
    const playbookCard = page.getByText('Metadata Standardization').first();
    await playbookCard.click();

    // Wait for detail panel
    const automationPanel = page.locator('[data-testid="automation-capability-panel"]');
    await expect(automationPanel).toBeVisible({ timeout: 5000 });

    // Verify user-control language is present
    await expect(
      page.getByText(/optional and always under your control/i)
    ).toBeVisible();
    await expect(page.getByText(/User-initiated only/i)).toBeVisible();
    await expect(page.getByText(/You choose when/i)).toBeVisible();
  });
});
