# E2E Test Suite

End-to-end tests using Playwright for critical user journeys.

## Prerequisites

1. **API running in E2E mode**:
   ```bash
   cd apps/api
   ENGINEO_E2E=1 pnpm dev
   ```

2. **Web app running in E2E mode**:
   ```bash
   cd apps/web
   pnpm e2e:dev
   ```

3. **Database seeded** (the E2E testkit endpoints handle this automatically)

## Running Tests Locally

### Smoke Tests (Required Before Merging to develop)

Run the smoke test suite before merging to develop:

```bash
# From apps/web directory
pnpm test:e2e:smoke

# Or from root
pnpm --filter web test:e2e:smoke
```

### All E2E Tests

```bash
# From apps/web directory
pnpm test:e2e

# With UI mode (interactive debugging)
pnpm test:e2e:ui
```

### Specific Test File

```bash
pnpm test:e2e tests/e2e/smoke.spec.ts
pnpm test:e2e tests/e2e/first-deo-win.spec.ts
```

## Test Files

| File | Description |
|------|-------------|
| `smoke.spec.ts` | Critical user journeys - **run before every merge** |
| `first-deo-win.spec.ts` | Full "First DEO Win" onboarding flow tests |

## Smoke Test Journeys (10 Critical Workflows)

| # | Journey | What It Tests |
|---|---------|---------------|
| 1 | Login → Dashboard | Auth flow, CAPTCHA bypass in E2E mode |
| 2 | 2FA Verification | 2FA page renders, back to login works |
| 3 | Create Project → Onboarding | Empty state, project creation, First DEO Win checklist |
| 4 | Connect Shopify | Integration connection, "Connected" state visible |
| 5 | Missing Scope → Rescope | Scope truth, reconnect prompt when missing permissions |
| 6 | Crawl → DEO/Issues/Insights | DEO score, issues page, insights populated |
| 7 | Products List + Filter | Product counts, search/filter, "view affected" routing |
| 8 | Preview → Apply | Diffs visible, persisted outcome, AI quota check |
| 9 | Plan Gating | Free plan project limit enforced |
| 10 | Single-Item Apply | Product workspace apply to Shopify |

### Billing Journey (Skipped - Requires Staging Infrastructure)

Journey 11 (Billing upgrade → entitlements change) is skipped until Stripe test mode and webhook simulation are available in E2E environment.

## Testkit Seeding Endpoints

The smoke tests use these `/testkit/e2e/` endpoints:

| Endpoint | Purpose |
|----------|---------|
| `seed-bare-user` | User with no projects (for project creation tests) |
| `seed-user-at-project-limit` | Free user at 1 project limit |
| `seed-user-with-2fa` | User with 2FA enabled + temp token |
| `seed-first-deo-win` | Pro user + project + 4 products with issues |
| `seed-project-missing-scope` | Project with Shopify missing `read_content` |
| `seed-full-project-with-data` | Complete project: products, crawl, DEO score |
| `connect-shopify` | Mock Shopify connection for a project |

### Usage Example

```typescript
async function seedBareUser(request: any, plan = 'free') {
  const res = await request.post(`${API_BASE_URL}/testkit/e2e/seed-bare-user`, {
    data: { plan },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}
```

## Writing New Tests

### Programmatic Login

Use localStorage token injection instead of UI login:

```typescript
async function programmaticLogin(page: any, accessToken: string) {
  await page.goto('/login');
  await page.evaluate((token: string) => {
    localStorage.setItem('engineo_token', token);
  }, accessToken);
}
```

### Stable Selectors

Prefer role-based selectors for stability:

```typescript
// Good
await page.getByRole('button', { name: /Create Project/i });
await page.getByLabel(/Project Name/i);
await page.getByText(/Connect your store/i);

// Avoid
await page.locator('.btn-primary');
await page.locator('#project-name-input');
```

### Handling Optional Elements

```typescript
const searchInput = page.getByPlaceholder(/Search/i);
if (await searchInput.isVisible()) {
  await searchInput.fill('query');
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | Web app URL |
| `PLAYWRIGHT_API_URL` | `http://localhost:3001` | API URL |
| `ENGINEO_E2E` | - | Must be `1` for testkit endpoints |

## Troubleshooting

### "E2E testkit endpoints are disabled"

Ensure both API and web are running with `ENGINEO_E2E=1`:

```bash
# Terminal 1 - API
cd apps/api && ENGINEO_E2E=1 pnpm dev

# Terminal 2 - Web
cd apps/web && pnpm e2e:dev

# Terminal 3 - Tests
cd apps/web && pnpm test:e2e:smoke
```

### Tests timeout waiting for elements

- Verify API is responding: `curl http://localhost:3001/health`
- Check database connectivity
- Increase timeout for slower machines

### Flaky tests

- Use `await expect(...).toBeVisible({ timeout: ... })`
- Avoid race conditions by waiting for specific UI states
- Tests run in serial mode to prevent interference

## Test Suite Status

| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| **Smoke Tests** | 10/10 ✓ | 0 | Merge gate - must pass |
| **Full Suite** | 112 | 271 | See TODO for improvement plan |

### Improving Test Coverage

See [TODO-FULL-E2E-GREEN.md](./TODO-FULL-E2E-GREEN.md) for:
- Missing testkit seeding endpoints to add
- Timeout issues to investigate
- Selector mismatches to fix
- Feature-specific test fixes
- Implementation phases and priorities
