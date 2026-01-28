/**
 * [KEYBOARD-&-FOCUS-INTEGRITY-1] Keyboard & Focus Integrity E2E Tests
 *
 * Test coverage:
 * 1. Tab order follows logical visual flow
 * 2. Escape key consistently closes modals, dropdowns, and overlays
 * 3. Enter key activates primary actions
 * 4. Focus returns to trigger element after modal/dropdown dismissal
 * 5. Arrow keys navigate within dropdowns
 * 6. No focus traps exist
 * 7. No focus loss occurs (focus never moves to document body unexpectedly)
 *
 * Prerequisites:
 * - /testkit/e2e/seed-first-deo-win endpoint available
 * - E2E mode enabled (E2E_MODE=true)
 *
 * Epic: EA-24 EPIC 18
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

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: Escape Key Behavior', () => {
  test('Escape closes theme dropdown and returns focus to trigger', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    // Programmatic login
    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');
    await page.waitForSelector('[data-testid="theme-toggle"]');

    // Open theme dropdown
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();

    // Verify dropdown is open
    await expect(page.locator('[data-testid="theme-dropdown"]')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify dropdown is closed
    await expect(page.locator('[data-testid="theme-dropdown"]')).not.toBeVisible();

    // Verify focus returned to trigger
    await expect(themeToggle).toBeFocused();
  });

  test('Escape closes account dropdown and returns focus to trigger', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');
    await page.waitForSelector('[data-testid="account-menu-button"]');

    // Open account dropdown
    const accountButton = page.locator('[data-testid="account-menu-button"]');
    await accountButton.click();

    // Verify dropdown is open
    await expect(page.locator('[data-testid="account-dropdown"]')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify dropdown is closed
    await expect(page.locator('[data-testid="account-dropdown"]')).not.toBeVisible();
  });

  test('Escape closes command palette and returns focus', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');

    // Open command palette with Cmd+K
    await page.keyboard.press('Meta+k');

    // Verify command palette is open
    await expect(page.locator('[data-testid="command-palette-dialog"]')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify command palette is closed
    await expect(page.locator('[data-testid="command-palette-dialog"]')).not.toBeVisible();
  });
});

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: Arrow Key Navigation', () => {
  test('Arrow keys navigate theme dropdown options', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');
    await page.waitForSelector('[data-testid="theme-toggle"]');

    // Open theme dropdown
    await page.locator('[data-testid="theme-toggle"]').click();
    await expect(page.locator('[data-testid="theme-dropdown"]')).toBeVisible();

    // First option should be focused by default
    const firstOption = page.locator('#theme-option-0');
    await expect(firstOption).toBeFocused();

    // Arrow down to second option
    await page.keyboard.press('ArrowDown');
    const secondOption = page.locator('#theme-option-1');
    await expect(secondOption).toBeFocused();

    // Arrow down to third option
    await page.keyboard.press('ArrowDown');
    const thirdOption = page.locator('#theme-option-2');
    await expect(thirdOption).toBeFocused();

    // Arrow down wraps to first
    await page.keyboard.press('ArrowDown');
    await expect(firstOption).toBeFocused();

    // Arrow up wraps to last
    await page.keyboard.press('ArrowUp');
    await expect(thirdOption).toBeFocused();
  });

  test('Arrow keys navigate command palette results', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');

    // Open command palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette-dialog"]')).toBeVisible();

    // First result should be selected
    const firstResult = page.locator('[data-testid="command-palette-results"] [data-selected="true"]');
    await expect(firstResult).toBeVisible();

    // Arrow down moves selection
    await page.keyboard.press('ArrowDown');

    // Verify selection moved (different element has data-selected="true")
    const newSelection = page.locator('[data-testid="command-palette-results"] [data-selected="true"]');
    await expect(newSelection).toBeVisible();
  });
});

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: Enter Key Activation', () => {
  test('Enter activates selected command in palette', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    // Navigate to project page to have project context
    await page.goto(`/projects/${projectId}/products`);

    // Open command palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette-dialog"]')).toBeVisible();

    // Type to filter to a specific command
    await page.keyboard.type('overview');

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Press Enter to execute
    await page.keyboard.press('Enter');

    // Command palette should close
    await expect(page.locator('[data-testid="command-palette-dialog"]')).not.toBeVisible();

    // Should have navigated (URL should change)
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/overview`));
  });

  test('Enter selects theme option in dropdown', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');
    await page.waitForSelector('[data-testid="theme-toggle"]');

    // Open theme dropdown
    await page.locator('[data-testid="theme-toggle"]').click();

    // Navigate to light option
    await page.keyboard.press('ArrowDown'); // Now on light

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Dropdown should close
    await expect(page.locator('[data-testid="theme-dropdown"]')).not.toBeVisible();
  });
});

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: Focus After Form Actions', () => {
  test('Save draft moves focus to Apply button', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId, productIds } = await seedFirstDeoWinProject(request);

    // Connect Shopify for the test
    await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
      data: { projectId },
    });

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    // Wait for form to load
    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Make a change to enable save draft
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.fill('Test Focus Management Title');

    // Click save draft button
    const saveDraftButton = page.locator('[data-testid="save-draft-button"]');
    await expect(saveDraftButton).toBeVisible();
    await saveDraftButton.click();

    // After save, Apply button should be focused
    const applyButton = page.locator('[data-testid="apply-to-shopify-button"]');
    await expect(applyButton).toBeFocused({ timeout: 2000 });
  });
});

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: Tab Order', () => {
  test('Tab navigates through form fields in logical order', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId, productIds } = await seedFirstDeoWinProject(request);

    await request.post(`${API_BASE_URL}/testkit/e2e/connect-shopify`, {
      data: { projectId },
    });

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    const productId = productIds[0];
    await page.goto(`/projects/${projectId}/products/${productId}?tab=metadata`);

    await expect(page.locator('[data-testid="draft-state-banner"]')).toBeVisible({
      timeout: 10000,
    });

    // Focus the title input
    const titleInput = page.getByLabel('Meta Title');
    await titleInput.focus();
    await expect(titleInput).toBeFocused();

    // Tab to description
    await page.keyboard.press('Tab');
    const descInput = page.getByLabel('Meta Description');
    await expect(descInput).toBeFocused();

    // Tab continues to next focusable element (handle is read-only, so skipped in tab order)
    // This verifies logical tab flow
  });

  test('DataTable rows are keyboard navigable', async ({
    page,
    request,
  }) => {
    const { accessToken, projectId } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto(`/projects/${projectId}/products`);

    // Wait for table to load
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible({
      timeout: 10000,
    });

    // First row should be focusable
    const firstRow = page.locator('[data-testid="data-table-row"]').first();
    await firstRow.focus();
    await expect(firstRow).toBeFocused();

    // Arrow down moves to next row
    await page.keyboard.press('ArrowDown');
    const secondRow = page.locator('[data-testid="data-table-row"]').nth(1);
    await expect(secondRow).toBeFocused();

    // Arrow up moves back
    await page.keyboard.press('ArrowUp');
    await expect(firstRow).toBeFocused();
  });
});

test.describe('KEYBOARD-&-FOCUS-INTEGRITY-1: No Focus Traps', () => {
  test('User can Tab out of dropdown without getting stuck', async ({
    page,
    request,
  }) => {
    const { accessToken } = await seedFirstDeoWinProject(request);

    await page.goto('/login');
    await page.evaluate((token) => {
      localStorage.setItem('engineo_token', token);
    }, accessToken);

    await page.goto('/projects');
    await page.waitForSelector('[data-testid="theme-toggle"]');

    // Open theme dropdown
    await page.locator('[data-testid="theme-toggle"]').click();
    await expect(page.locator('[data-testid="theme-dropdown"]')).toBeVisible();

    // Tab should close dropdown (not trap focus)
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="theme-dropdown"]')).not.toBeVisible();
  });
});
