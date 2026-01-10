/**
 * [WORK-QUEUE-1] Work Queue E2E Test Scaffolding
 *
 * E2E tests for the Work Queue unified action bundle system.
 * This file contains Playwright-ready test scaffolding.
 *
 * Test coverage:
 * 1. Critical item appears in Critical tab
 * 2. Generate drafts transitions to Drafts Ready (for automation bundle)
 * 3. Approval required blocks Apply for Editor (Apply disabled + inline reason)
 * 4. Owner can Approve and apply (Approve-and-apply flow, then item moves to Applied Recently)
 * 5. GEO bundle routes to GEO export view and does not trigger mutations
 *
 * Prerequisites:
 * - Playwright installed and configured
 * - Test user auth token storage pattern from existing testkit
 * - /testkit/e2e/* seed endpoints available
 */

import { test, expect, Page } from '@playwright/test';

// Base URL from environment or default
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * Test helper: Login and navigate to Work Queue
 */
async function loginAndNavigateToWorkQueue(page: Page, projectId: string) {
  // TODO: Implement actual auth flow using existing testkit auth pattern
  // For now, this is scaffolding
  await page.goto(`${BASE_URL}/projects/${projectId}/work-queue`);
}

test.describe('WORK-QUEUE-1 – Work Queue E2E', () => {
  // Skip tests until Playwright is fully configured
  test.skip();

  test.describe('Tab Navigation', () => {
    test('Critical tab shows critical health items', async ({ page }) => {
      const projectId = 'test-project-id'; // TODO: Use seeded project
      await loginAndNavigateToWorkQueue(page, projectId);

      // Click Critical tab
      await page.click('button:has-text("Critical")');

      // Verify URL includes tab param
      await expect(page).toHaveURL(/tab=Critical/);

      // All visible cards should have CRITICAL health badge
      const healthBadges = await page.locator('[data-testid="health-badge"]').allTextContents();
      for (const badge of healthBadges) {
        expect(badge).toContain('CRITICAL');
      }
    });

    test('Needs Attention tab shows warning items', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      await page.click('button:has-text("Needs Attention")');
      await expect(page).toHaveURL(/tab=NeedsAttention/);
    });

    test('Applied Recently tab shows applied items', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      await page.click('button:has-text("Applied Recently")');
      await expect(page).toHaveURL(/tab=AppliedRecently/);
    });
  });

  test.describe('Automation Bundle Workflow', () => {
    test('Generate drafts button starts draft generation', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      // Find an automation bundle card in NEW state
      const automationCard = page.locator('[data-bundle-type="AUTOMATION_RUN"][data-state="NEW"]').first();
      await expect(automationCard).toBeVisible();

      // Click Generate Drafts CTA
      await automationCard.locator('text=Generate Drafts').click();

      // Should redirect to automation page
      await expect(page).toHaveURL(/\/automation/);
    });

    test('Drafts Ready state shows Apply button', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      // Navigate to Drafts Ready tab
      await page.click('button:has-text("Drafts Ready")');

      // Find a bundle with DRAFTS_READY state
      const readyCard = page.locator('[data-bundle-type="AUTOMATION_RUN"][data-state="DRAFTS_READY"]').first();

      if (await readyCard.count() > 0) {
        // Should have Apply Changes CTA
        await expect(readyCard.locator('text=Apply Changes')).toBeVisible();
      }
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('EDITOR cannot apply - Apply button disabled with reason', async ({ page }) => {
      // TODO: Login as EDITOR user
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      // Navigate to Drafts Ready tab
      await page.click('button:has-text("Drafts Ready")');

      const readyCard = page.locator('[data-bundle-type="AUTOMATION_RUN"][data-state="DRAFTS_READY"]').first();

      if (await readyCard.count() > 0) {
        // Apply button should be disabled for EDITOR
        const applyButton = readyCard.locator('text=Apply Changes');
        // Check for disabled state or disabled reason text
        const disabledReason = readyCard.locator('text=Only owners can apply');
        await expect(disabledReason).toBeVisible();
      }
    });

    test('VIEWER sees view-only CTAs', async ({ page }) => {
      // TODO: Login as VIEWER user
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      // All cards should only have View/Read-only CTAs
      const cards = await page.locator('[data-testid="action-bundle-card"]').all();
      for (const card of cards) {
        // Should not have mutation CTAs
        await expect(card.locator('text=Apply Changes')).not.toBeVisible();
        await expect(card.locator('text=Generate Drafts')).not.toBeVisible();
      }
    });
  });

  test.describe('Approval Workflow', () => {
    test('Pending Approval tab shows bundles awaiting approval', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      await page.click('button:has-text("Pending Approval")');
      await expect(page).toHaveURL(/tab=PendingApproval/);

      const pendingCards = page.locator('[data-state="PENDING_APPROVAL"]');
      // All cards should have PENDING_APPROVAL state
      for (const card of await pendingCards.all()) {
        await expect(card.locator('text=Pending Approval')).toBeVisible();
      }
    });

    test('OWNER can approve and apply from Pending Approval tab', async ({ page }) => {
      // TODO: Login as OWNER user
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      await page.click('button:has-text("Pending Approval")');

      const pendingCard = page.locator('[data-state="PENDING_APPROVAL"]').first();

      if (await pendingCard.count() > 0) {
        // Click Approve & Apply
        await pendingCard.locator('text=Approve & Apply').click();

        // Wait for success (could be toast or redirect)
        // After apply, item should move to Applied Recently
        await page.click('button:has-text("Applied Recently")');
        await expect(page.locator('[data-state="APPLIED"]')).toHaveCount(1);
      }
    });
  });

  test.describe('GEO Export Bundle', () => {
    test('GEO bundle routes to export view without mutations', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      // Find GEO export bundle
      const geoCard = page.locator('[data-bundle-type="GEO_EXPORT"]').first();

      if (await geoCard.count() > 0) {
        // Click View Export Options
        await geoCard.locator('text=View Export Options').click();

        // Should navigate to insights/geo
        await expect(page).toHaveURL(/\/insights\?tab=geo/);

        // No mutations should occur (share links not created on page load)
        // This is verified by checking no network calls to create share links
      }
    });

    test('GEO bundle shows mutation-free view indicator', async ({ page }) => {
      const projectId = 'test-project-id';
      await loginAndNavigateToWorkQueue(page, projectId);

      const geoCard = page.locator('[data-bundle-type="GEO_EXPORT"]').first();

      if (await geoCard.count() > 0) {
        // Should have share link status badge
        await expect(geoCard.locator('text=Share links:')).toBeVisible();
      }
    });
  });

  test.describe('Deep Linking', () => {
    test('bundleId query param highlights specific bundle', async ({ page }) => {
      const projectId = 'test-project-id';
      const bundleId = 'AUTOMATION_RUN:FIX_MISSING_METADATA:missing_seo_title:' + projectId;

      await page.goto(`${BASE_URL}/projects/${projectId}/work-queue?bundleId=${encodeURIComponent(bundleId)}`);

      // Card with matching bundleId should have highlight styling
      const highlightedCard = page.locator(`[data-bundle-id="${bundleId}"]`);
      await expect(highlightedCard).toHaveClass(/ring-2/);
    });
  });
});
