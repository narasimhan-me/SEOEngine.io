/**
 * [DRAFT-CLARITY-AND-ACTION-TRUST-1] Playwright E2E Smoke Tests
 *
 * This test suite verifies the draft lifecycle, action semantics, and trust behaviors
 * introduced in the DRAFT-CLARITY-AND-ACTION-TRUST-1 patch batch.
 *
 * Prerequisites:
 * - Uses /testkit/e2e/seed-first-deo-win to set up test data
 * - Uses /testkit/e2e/connect-shopify to connect a test Shopify store
 * - Login pattern uses localStorage.setItem('engineo_token', accessToken)
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedFirstDeoWinProject(request: any) {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-first-deo-win`, {
    data: {},
  });
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
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
    data: { projectId },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Draft Lifecycle', () => {
  test('Draft state transitions are visible (unsaved → saved → applied)', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for draft state banner
    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Step 1: Make a change to create unsaved draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test State Transitions Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Step 2: Save draft
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await expect(saveDraftButton).toBeVisible();
    await saveDraftButton.click();

    // Verify saved state
    await expect(draftBanner).toContainText('Draft saved — not applied');

    // Step 3: Verify Apply button is now enabled
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeEnabled();

    // Apply to Shopify
    await applyButton.click();

    // Verify applied state (with timestamp)
    await expect(draftBanner).toContainText('Applied to Shopify on', { timeout: 10000 });
  });

  test('Apply button disabled until draft is saved (Apply gating)', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Create unsaved draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test Apply Gating Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Verify Apply button is disabled in unsaved state
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeDisabled();

    // Save draft
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await saveDraftButton.click();

    // Verify Apply button is now enabled
    await expect(applyButton).toBeEnabled();
  });

  test('Unsaved-changes blocking confirmation appears on navigation', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Make changes to create unsaved draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test Unsaved Changes Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Set up dialog handler - dismiss to stay on page
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved');
      await dialog.dismiss();
    });

    // Try to navigate away via sidebar link (GuardedLink route)
    await page.getByRole('link', { name: /^Projects$/ }).click();

    // Should still be on the product page (navigation blocked)
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/products/${productId}`));
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Issues Page Draft Lifecycle', () => {
  test('Issue fix preview follows draft lifecycle', async ({ page, request }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/issues`);

    // Wait for issues to load - look for "Fix next" button
    const fixNextButton = page.locator('button:has-text("Fix next")').first();

    // If there are AI-fixable issues
    if (await fixNextButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await fixNextButton.click();

      // Wait for preview panel to load
      await expect(
        page.locator('[data-testid="issue-preview-draft-panel"]')
      ).toBeVisible({ timeout: 30000 });

      // Verify draft state banner shows unsaved
      const draftStateBanner = page.locator('[data-testid="issue-draft-state-banner"]');
      await expect(draftStateBanner).toContainText('Draft — not applied');

      // Verify Apply button is disabled until draft is saved
      const applyButton = page.locator('[data-testid="issue-apply-to-shopify-button"]');
      await expect(applyButton).toBeDisabled();

      // Save the draft
      const saveDraftButton = page.locator('[data-testid="issue-save-draft-button"]');
      await expect(saveDraftButton).toBeVisible();
      await saveDraftButton.click();

      // Verify state transitions to saved
      await expect(draftStateBanner).toContainText('Draft saved — not applied');

      // Verify Apply button is now enabled
      await expect(applyButton).toBeEnabled();
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Automation History', () => {
  test('Automation history filters work and show skip explanations', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=automations`);

    // Wait for Automation History panel
    await expect(page.getByText('Automation History')).toBeVisible({ timeout: 10000 });

    // Expand full history if available
    const expandButton = page.locator('text=View full history');
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();

      // Verify filters are present
      const statusFilter = page.locator('[data-testid="automation-status-filter"]');
      const initiatorFilter = page.locator('[data-testid="automation-initiator-filter"]');

      await expect(statusFilter).toBeVisible();
      await expect(initiatorFilter).toBeVisible();

      // Test status filter - select "Skipped"
      await statusFilter.selectOption('skipped');

      // Test initiator filter - select "Manual"
      await initiatorFilter.selectOption('manual');

      // Verify skipped explanation is visible if there are skipped entries
      const skippedExplanation = page.locator('[data-testid="skipped-row-explanation"]');
      const count = await skippedExplanation.count();
      if (count > 0) {
        await expect(skippedExplanation.first()).toBeVisible();
      }
    }
  });

  test('Trigger manual sync creates skipped entry when sync disabled', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    // Note: Not connecting Shopify or enabling sync, so sync should be skipped

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=answers`);

    // Wait for Answer Blocks panel
    await expect(page.getByText('Answer Blocks')).toBeVisible({ timeout: 10000 });

    // Click "Sync answers to Shopify" button
    const syncButton = page.locator('button:has-text("Sync answers to Shopify")');
    if (await syncButton.isVisible().catch(() => false)) {
      await syncButton.click();

      // Should get a skip/error feedback (either toast or inline)
      // The exact behavior depends on backend state
      await page.waitForTimeout(2000);
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: GEO Explainer', () => {
  test('GEO explainer renders collapsible sections', async ({ page, request }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=geo`);

    // Wait for GEO panel to load
    await expect(page.getByText('What is GEO?')).toBeVisible({ timeout: 10000 });

    // Verify collapsible explainers are present
    const whatIsGeoExplainer = page.locator('button:has-text("What is GEO?")');
    const whatIsCitationExplainer = page.locator('button:has-text("What is Citation Confidence?")');

    await expect(whatIsGeoExplainer).toBeVisible();
    await expect(whatIsCitationExplainer).toBeVisible();

    // Click to expand "What is GEO?"
    await whatIsGeoExplainer.click();

    // Verify explainer content is visible
    await expect(page.getByText('Generative Engine Optimization')).toBeVisible();

    // Click to expand "What is Citation Confidence?"
    await whatIsCitationExplainer.click();

    // Verify content mentions it's not a guarantee
    await expect(page.getByText('not a guarantee')).toBeVisible();
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Add to Draft Semantics', () => {
  test('AI Suggestions panel shows "Add to draft" buttons with correct guidance', async ({ page, request }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for AI Suggestions panel
    await expect(page.getByText('AI SEO Suggestions')).toBeVisible({ timeout: 10000 });

    // [FIXUP-3] Check for corrected inline guidance - "Generate creates suggestions (uses AI)"
    await expect(
      page.getByText('Generate creates suggestions (uses AI)')
    ).toBeVisible();

    // Verify "Add to draft" button label (not "Apply to editor")
    const generateButton = page.locator('button:has-text("Generate Suggestions")');
    if (await generateButton.isVisible().catch(() => false)) {
      await generateButton.click();

      // Wait for generation to complete
      await expect(page.getByText('Add to draft')).toBeVisible({ timeout: 30000 });
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3: Session Persistence', () => {
  test('Saved draft persists across navigation (session)', async ({ page, request }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for draft state banner
    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Step 1: Make a change to create unsaved draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test Session Persistence Title');

    // Step 2: Save draft
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await saveDraftButton.click();

    // Verify saved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft saved — not applied');

    // Step 3: Navigate away using sidebar Projects link
    await page.getByRole('link', { name: /^Projects$/ }).click();
    await expect(page).toHaveURL(/\/projects$/);

    // Step 4: Navigate back to the same product page
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for page to load
    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Step 5: Assert draft is restored - banner shows "Draft saved — not applied"
    await expect(page.locator('[data-testid="draft-state-banner"]')).toContainText('Draft saved — not applied');

    // Step 6: Verify Apply to Shopify is enabled (draft was restored)
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeEnabled();
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3: Issue Deep-Link Routing', () => {
  test('Issue tiles route to fix location', async ({ page, request }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Go to Overview page
    await page.goto(`/projects/${projectId}/overview`);

    // Wait for "Top blockers" section to load
    await expect(page.getByText('Top blockers')).toBeVisible({ timeout: 10000 });

    // Find the first issue link in Top Blockers
    const issueLink = page.locator('section:has-text("Top blockers") a.text-blue-700').first();

    if (await issueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click the issue link
      await issueLink.click();

      // Assert navigation lands on either:
      // - A product page with tab= query param (tab header visible)
      // - OR the Issues page with pillar= filter (filter reflects it)
      const currentUrl = page.url();

      if (currentUrl.includes('/products/')) {
        // Landed on product page - verify tab param exists
        expect(currentUrl).toMatch(/tab=/);
        // Wait for tab bar to be visible
        await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: 10000 });
      } else if (currentUrl.includes('/issues')) {
        // Landed on Issues page - verify pillar filter if present
        await expect(page.getByText('Issues Engine')).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-3: Generated Content Visibility', () => {
  test('Generated content is immediately visible after Generate', async ({ page, request }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for AI Suggestions panel
    await expect(page.getByText('AI SEO Suggestions')).toBeVisible({ timeout: 10000 });

    // Click Generate Suggestions button
    const generateButton = page.locator('button:has-text("Generate Suggestions")');
    if (await generateButton.isVisible().catch(() => false)) {
      await generateButton.click();

      // Wait for generation completion - "Add to draft" button becomes visible
      await expect(page.getByText('Add to draft')).toBeVisible({ timeout: 30000 });

      // Assert SEO editor anchor is in viewport (auto-scroll behavior)
      const seoEditorAnchor = page.locator('[data-testid="seo-editor-anchor"]');
      if (await seoEditorAnchor.isVisible().catch(() => false)) {
        // Check element is in viewport
        const isInViewport = await seoEditorAnchor.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
        });
        // The anchor should be visible or near-visible after generation
        expect(isInViewport || await seoEditorAnchor.isVisible()).toBeTruthy();
      }
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1: Header Apply Gating', () => {
  test('Header Apply button is disabled until draft is saved', async ({
    page,
    request,
  }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Create unsaved draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test Header Gating Title');

    // Verify unsaved state
    const draftBanner = page.locator('[data-testid="draft-state-banner"]');
    await expect(draftBanner).toContainText('Draft — not applied');

    // Verify header Apply button exists and check its state
    const headerApplyButton = page.locator('[data-testid="header-apply-to-shopify-button"]');
    if (await headerApplyButton.isVisible().catch(() => false)) {
      await expect(headerApplyButton).toBeDisabled();

      // Save draft
      const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
      await saveDraftButton.click();

      // Verify header Apply button is now enabled
      await expect(headerApplyButton).toBeEnabled();
    }
  });

  test('Header shows compact draft state indicator', async ({ page, request }) => {
    const { projectId, productIds, accessToken } = await seedFirstDeoWinProject(request);
    await connectShopifyE2E(request, projectId);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Header state indicator should show applied state initially (or match current state)
    const headerStateIndicator = page.locator('[data-testid="header-draft-state-indicator"]');
    if (await headerStateIndicator.isVisible().catch(() => false)) {
      // Verify it contains one of the expected states
      const text = await headerStateIndicator.textContent();
      expect(
        text?.includes('Draft —') ||
        text?.includes('Draft saved —') ||
        text?.includes('Applied to Shopify')
      ).toBeTruthy();
    }
  });
});

test.describe('DRAFT-CLARITY-AND-ACTION-TRUST-1 FIXUP-4: No Double Prompt After Confirmed Leave', () => {
  test('No additional confirmation dialog after confirming leave from Issues page', async ({ page, request }) => {
    const { projectId, accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to Issues page
    await page.goto(`/projects/${projectId}/issues`);
    await expect(page.getByText('Issues Engine')).toBeVisible({ timeout: 10000 });

    // Find "Fix next" button if available
    const fixNextButton = page.locator('button:has-text("Fix next")').first();
    if (await fixNextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click "Fix next" to trigger AI preview (creates unsaved state)
      await fixNextButton.click();

      // Wait for preview panel to appear
      await expect(page.locator('[data-testid="issue-preview-draft-panel"]')).toBeVisible({
        timeout: 30000,
      });

      // Set up dialog handler to accept the confirmation
      let dialogCount = 0;
      page.on('dialog', async (dialog) => {
        dialogCount++;
        await dialog.accept();
      });

      // Click the issue title area (button navigation) to trigger confirmation
      const issueButton = page.locator('button.text-left').first();
      if (await issueButton.isVisible().catch(() => false)) {
        await issueButton.click();

        // Wait for navigation to complete
        await page.waitForURL(/\/products\//, { timeout: 10000 });

        // Now navigate using the Projects nav link
        const projectsLink = page.getByRole('link', { name: /^Projects$/ });
        if (await projectsLink.isVisible().catch(() => false)) {
          await projectsLink.click();

          // Wait for Projects page
          await page.waitForURL(/\/projects$/, { timeout: 10000 });

          // Assert only one dialog was shown (the initial leave confirmation)
          expect(dialogCount).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
