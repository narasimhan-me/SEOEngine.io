import { test, expect } from '@playwright/test';

const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

async function seedWorkQueueZeroEligibleDraft(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-work-queue-zero-eligible-draft`,
    { data: {} },
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

async function seedPlaybookNoEligibleProductsProject(request: any) {
  const res = await request.post(
    `${API_BASE_URL}/testkit/e2e/seed-playbook-no-eligible-products`,
    { data: {} },
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return {
    projectId: body.projectId as string,
    accessToken: body.accessToken as string,
  };
}

async function authenticatePage(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}

test.describe('ZERO-AFFECTED-SUPPRESSION-1 – Zero-eligible trust hardening', () => {
  test('Work Queue suppresses 0-eligible automation bundles (no actionable tiles, no CTAs)', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedWorkQueueZeroEligibleDraft(request);
    await authenticatePage(page, accessToken);
    await page.goto(`/projects/${projectId}/work-queue?tab=NeedsAttention`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('action-bundle-card')).toHaveCount(0);
    await expect(page.getByText(/Fix missing product SEO titles/i)).toHaveCount(0);
    await expect(
      page.getByRole('link', {
        name: /Generate Full Drafts|Generate Drafts|Apply Changes|Request Approval|Approve & Apply/i,
      }),
    ).toHaveCount(0);
  });

  test('Playbooks shows calm empty state at 0 eligible (no stepper, no apply semantics)', async ({
    page,
    request,
  }) => {
    const { projectId, accessToken } = await seedPlaybookNoEligibleProductsProject(request);
    await authenticatePage(page, accessToken);
    await page.goto(`/projects/${projectId}/automation/playbooks?playbookId=missing_seo_title`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('playbook-zero-eligible-empty-state')).toBeVisible();
    await expect(page.getByTestId('playbooks-stepper')).toHaveCount(0);
    await expect(page.getByText(/Step 3 – Apply playbook/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Continue to Apply/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Apply playbook/i })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /View products that need optimization/i }),
    ).toBeVisible();
  });
});
