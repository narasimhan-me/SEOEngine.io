import { test, expect } from '@playwright/test';

test('marketing homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: /optimize any website for search & ai discovery\./i,
    }),
  ).toBeVisible();
});

