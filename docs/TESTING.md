# EngineO.ai Testing – TEST-0 Foundation

TEST-0 establishes a baseline, repeatable testing foundation across the monorepo:

- Backend unit + integration tests against a real, isolated Postgres test database.
- Frontend E2E readiness via a minimal Playwright smoke test.
- Deterministic test data factories and seed helpers.
- Hard guardrails to prevent tests from ever touching production databases.
- CI job skeleton that runs the TEST-0 suite on every PR.

This document explains how to run tests locally and how the pieces fit together.

---

## 1. Local Setup

1. Start a local Postgres instance (for example via Docker):
   - Database: `engineo_test`
   - User: `postgres`
   - Password: `postgres`
2. Copy the example test env file:
   - From: `.env.test.example`
   - To: `apps/api/.env.test`
3. Ensure the DB URL in `apps/api/.env.test` points to your local test DB:
   - `DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/engineo_test?schema=public"`
4. Install dependencies:
   - `pnpm install`

Before running any tests for the first time, run migrations against the test DB:

```bash
pnpm db:test:migrate
```

---

## 2. Commands

At the **repo root**:

- `pnpm test`  
  Runs the backend Jest test suite (unit + integration) via `apps/api`.

- `pnpm test:api`  
  Alias for `pnpm --filter api test:api` – useful when iterating on backend tests only.

- `pnpm test:web`  
  Runs the Playwright smoke suite in `apps/web/tests` (requires the web app to be reachable at `http://localhost:3000` or `PLAYWRIGHT_BASE_URL` set).

- `pnpm db:test:migrate`  
  Runs Prisma migrations against the test database using `apps/api/.env.test`, after asserting the environment is safe.

- `pnpm db:test:reset`  
  Drops and recreates the test schema and reapplies migrations, providing a clean database for test runs.

---

## 3. Test Environment Guardrails

The helper `apps/api/src/config/test-env-guard.ts` enforces that destructive test operations only run in a safe environment.

Key rules:

- `NODE_ENV` or `ENGINEO_ENV` **must** be `"test"`.
- The effective DB URL is resolved from `DATABASE_URL_TEST` (preferred) or `DATABASE_URL`.
- The DB URL must:
  - Point to `localhost` or `127.0.0.1`, **or**
  - Include a clearly test-specific DB name (e.g. `_test`, `-test`, `testdb`).
- The DB URL must **not** contain known managed/prod hosts (Neon, Render, RDS, etc).

If any check fails, tests and DB helper scripts throw a loud error and refuse to run.

Usage:

- API bootstrap (`apps/api/src/main.ts`) calls the guard when `NODE_ENV` or `ENGINEO_ENV` is `"test"`.
- Jest e2e setup (`apps/api/test/setup.ts`) calls the guard before any tests execute.
- `apps/api/test/utils/test-db.ts` uses the guard to resolve a safe test `DATABASE_URL` before connecting.
- `apps/api/scripts/db-test-migrate.ts` and `db-test-reset.ts` call the guard before running Prisma migrations.

---

## 4. Test Database Helpers

The shared Prisma test client lives in:

- `apps/api/test/utils/test-db.ts`

Exports:

- `testPrisma` – Prisma client connected to the test DB.
- `cleanupTestDb()` – deletes rows from all major tables in FK-safe order.
- `disconnectTestDb()` – closes the Prisma client and underlying connection pool.

Typical pattern in Jest e2e/integration tests:

```ts
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../apps/api/test/utils/test-db';

beforeEach(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await cleanupTestDb();
  await disconnectTestDb();
});
```

For full database resets outside Jest (e.g., before a large local run or in CI), use:

- `pnpm db:test:reset` – drop schema + migrate.
- `pnpm db:test:migrate` – migrate schema only.

---

## 5. Test Data Factories & Seed Helpers

Backend test data factories live under:

- `apps/api/src/testkit/`

Core helpers:

- `createTestUser(prisma, { email?, plan? })`
- `createTestProject(prisma, { userId, name?, domain? })`
- `createTestShopifyStoreConnection(prisma, { projectId, shopDomain?, accessToken? })`
- `createTestProducts(prisma, { projectId, count, withSeo?, withIssues? })`
- `setTestUserPlan(prisma, { userId, plan })`
- `seedFirstDeoWinProjectReady(prisma, { userPlan })`

Determinism rules:

- IDs and external IDs use a stable prefix: `test_<label>_<timestamp>_<counter>`.
- Defaults are consistent unless explicitly overridden.

The `seedFirstDeoWinProjectReady` helper is the canonical way to create:

- A test user with a specified subscription plan.
- A project owned by that user.
- A Shopify integration connection for the project.
- A small set of products with missing SEO fields ready for optimization flows.

The TEST-0 golden-path backend integration test (`apps/api/test/e2e/shopify-update-product-seo.e2e-spec.ts`) uses this helper to seed data for the `/shopify/update-product-seo` flow.

---

## 6. Shopify Mocking Contract (TEST-0)

For TEST-0, Shopify calls are mocked at the **HTTP/GraphQL** layer in tests:

- Tests use Jest to override `global.fetch` and return deterministic responses for Shopify GraphQL operations.
- Existing unit and integration tests under `tests/` and `apps/api/test/e2e/` follow this pattern and never hit the live Shopify API.
- The TEST-0 golden-path integration test:
  - Stubs `global.fetch` for the `UpdateProductSeo` GraphQL operation.
  - Verifies that the `/shopify/update-product-seo` endpoint responds successfully.
  - Asserts that the local `Product` record is updated with the new SEO title/description.
  - Confirms that the mocked fetch is called exactly once with the expected operation name.

Future phases (TEST-1/2/3) can extend this into a more formal injectable `ShopifyClient` abstraction, but TEST-0 guarantees that:

- Backend tests do not make live network calls to Shopify.
- The update-product-SEO flow is fully testable in isolation.

---

## 7. Frontend Playwright Scaffold

Playwright is configured in:

- `apps/web/playwright.config.ts`

Key details:

- Test directory: `apps/web/tests`
- Default base URL: `http://localhost:3000` (overridable via `PLAYWRIGHT_BASE_URL`)
- Single Chromium project for now.

Sample smoke test:

- `apps/web/tests/smoke-homepage.spec.ts`
  - Navigates to `/`.
  - Asserts the marketing homepage hero heading is visible.

Run locally:

```bash
pnpm test:web
```

(Ensure the web app is running on the configured base URL first.)

---

## 8. CI Skeleton

GitHub Actions workflow:

- `.github/workflows/test.yml`

Behavior:

- Runs on pushes and PRs to `main` / `master`.
- Starts a Postgres service named `engineo_test`.
- Sets test-mode environment variables (including a local `DATABASE_URL`).
- Runs:
  - `pnpm db:test:migrate`
  - `pnpm test` (backend Jest suite)
  - `pnpm test:web` (Playwright smoke tests, allowed to be flaky/optional via `continue-on-error`)
- Fails fast if the test environment guard detects an unsafe DB URL (e.g., Neon/Render hosts).

---

## 9. Manual Verification (TEST-0)

See `docs/manual-testing/test-0-automated-testing-foundation.md` for a step-by-step manual checklist covering:

- Running `pnpm db:test:reset` before a fresh test run.
- Running `pnpm test:api` locally and observing safe DB behavior.
- Confirming the test guard blocks accidental connections to non-local / non-test databases.
- Running the Playwright smoke test (optional) against a running frontend.

---

## 10. TEST-1 – Backend Integration Coverage (Onboarding + DEO Win + Sync)

TEST-1 builds on the TEST-0 foundation and adds higher-level backend integration coverage for the First DEO Win journey, Issue Engine Lite, SEO apply persistence, and AEO-2 manual sync.

**Coverage:**

- Onboarding checklist signals:
  - `GET /projects/:id/integration-status` for connected source.
  - `GET /projects/:id/overview` for crawl counts and productsWithAppliedSeo.
  - `GET /projects/:id/deo-score` for DEO score presence.
- Project overview metrics:
  - `productsWithAppliedSeo` increments as products gain SEO metadata.
- Issue Engine Lite:
  - `GET /projects/:id/deo-issues` returns `missing_seo_title` and `missing_seo_description` issues with stable severity.
- SEO apply persistence:
  - `POST /shopify/update-product-seo` updates the Product row and calls the Shopify mock exactly once.
- AEO-2 manual sync:
  - `POST /products/:id/answer-blocks/sync-to-shopify` syncs Answer Blocks via mocked Shopify GraphQL and logs manual_sync automation entries.
- Auth + entitlements:
  - 401 for unauthenticated access to protected endpoints.
  - 403 with `ENTITLEMENTS_LIMIT_REACHED` for Free-plan access to paid-only Issue Engine Lite fix endpoint.

**New suites (Jest, backend):**

- `apps/api/test/integration/onboarding-checklist.test.ts`
- `apps/api/test/integration/project-overview.test.ts`
- `apps/api/test/integration/issue-engine-lite.test.ts`
- `apps/api/test/integration/seo-apply-persistence.test.ts`
- `apps/api/test/integration/aeo2-manual-sync.test.ts`
- `apps/api/test/integration/auth-entitlements.test.ts`

**How to run TEST-1 suites:**

- Full backend suite (includes TEST-0 + TEST-1):

  ```bash
  pnpm test:api
  ```

- Single suite (examples):

  ```bash
  # Onboarding checklist
  pnpm --filter api test:api -- onboarding-checklist.test.ts

  # Project overview metrics
  pnpm --filter api test:api -- project-overview.test.ts

  # AEO-2 manual sync
  pnpm --filter api test:api -- aeo2-manual-sync.test.ts
  ```

**Shopify mocking (TEST-1):**

- As in TEST-0, Shopify Admin API calls are never made over the network.
- Integration tests override `global.fetch` to:
  - Respond to `UpdateProductSeo` in SEO apply tests.
  - Respond to `GetEngineoMetafieldDefinitions`, `CreateEngineoMetafieldDefinition`, and `SetEngineoMetafields` in AEO-2 manual sync tests.
- Tests assert that:
  - `global.fetch` is called the expected number of times.
  - Metafield payloads reference the correct `ownerId` (`gid://shopify/Product/<externalId>`).
- No live Shopify store or network connectivity is required.

---

## 11. TEST-2 – Frontend Playwright E2E (First DEO Win, Mock Shopify)

TEST-2 adds stable, deterministic Playwright E2E coverage for the **First DEO Win** happy path:

- Connect store ✅ (mocked)
- Run first crawl ✅ (stubbed SEO scan, no network)
- Review DEO score ✅
- Optimize 3 products ✅ (single-item, preview → apply flow)

All E2E tests run against the local test DB, use mocked Shopify calls, and require no external network.

**Architecture:**

- E2E mode is enabled via:
  - `ENGINEO_E2E=1`
  - `ENGINEO_ENV=test`
  - `NODE_ENV=test`
- In E2E mode:
  - The API uses the test DB (guarded by `assertTestEnv()` / `getTestDatabaseUrl()`).
  - Shopify Admin API calls are stubbed in `apps/api/src/shopify/shopify.service.ts` via `isE2EMode()`.
  - SEO crawl uses deterministic, non-network stubs in `apps/api/src/seo-scan/seo-scan.service.ts`.

**E2E testkit endpoints (API):**

- `POST /testkit/e2e/seed-first-deo-win`
  - Seeds:
    - Pro-plan user
    - Project (no integrations, no crawl results, no DEO snapshots)
    - 3 products with missing SEO metadata
  - Returns: `{ user, projectId, productIds, accessToken }`
  - Only available when `ENGINEO_E2E=1`.

- `POST /testkit/e2e/connect-shopify`
  - Body: `{ projectId }`
  - Creates a Shopify integration record for the project (mocked store/domain).
  - Only available when `ENGINEO_E2E=1`.

**Playwright configuration:**

- Config: `apps/web/playwright.config.ts`
  - `webServer` starts both web and API via `pnpm dev`.
  - `env` includes:
    - `NODE_ENV=test`, `ENGINEO_ENV=test`, `ENGINEO_E2E=1`
    - `NEXT_PUBLIC_API_URL` and `PLAYWRIGHT_API_URL` pointing to the test API (`http://localhost:3001` by default).
  - `use.baseURL` defaults to `http://localhost:3000`.

**Commands:**

- From repo root:

  ```bash
  # Run backend tests (TEST-0 + TEST-1)
  pnpm test:api

  # Run Playwright E2E (TEST-2)
  pnpm test:e2e
  ```

- From apps/web:

  ```bash
  # E2E tests (same as root alias)
  pnpm test:e2e

  # Optional UI mode
  pnpm test:e2e:ui
  ```

**What the E2E tests do:**

`apps/web/tests/first-deo-win.spec.ts`:

- Seeds an E2E project via `POST /testkit/e2e/seed-first-deo-win`.
- Programmatically "logs in" by writing the seed JWT into localStorage (same key used by lib/auth).
- Navigates to `/projects/{projectId}/overview` and verifies:
  - Checklist initially shows "0 of 4 steps complete".
  - Connects store via `POST /testkit/e2e/connect-shopify` and checks the checklist updates.
  - Clicks "Run crawl" and waits for the "Run your first crawl" step to show "Completed".
  - Clicks "View DEO Score" and waits for the "Review your DEO Score" step to show "Completed".
  - Navigates to the product workspace for three seeded products, edits metadata, and clicks "Apply to Shopify".
  - Verifies success toasts include "Applied to Shopify and saved in EngineO".
  - Returns to the overview and asserts that First DEO Win is complete and the "Next DEO Win" card is visible.

- The second test asserts:
  - The product workspace does not expose bulk apply CTAs like "Apply to all" or "Bulk apply"; only single-item apply is available.

**CI:**

- `.github/workflows/test.yml`:
  - Runs:
    - `pnpm db:test:migrate`
    - `pnpm test` (backend)
    - `pnpm test:web` (smoke)
    - `pnpm test:e2e` (TEST-2 E2E suite)
  - All Shopify and crawl-related calls are stubbed; no external network is required.

---

## 12. TEST-3 – Nightly / On-Demand Live Shopify Smoke Tests

TEST-3 adds a separate, non-blocking live Shopify smoke lane that runs against an isolated live-test environment (dedicated DB + allowlisted dev stores) to validate real OAuth, real product SEO updates, and cleanup behavior under production-like conditions.

**Key constraints:**

- Uses real Shopify OAuth and GraphQL Admin API against Partner dev stores **only**.
- Never touches the production DB or non-allowlisted stores.
- Runs on a nightly schedule and via manual `workflow_dispatch`, but **not on every PR**.
- Includes best-effort test data cleanup and an audit trail for each run.

### Live-Test Database vs Regular Test Database

| Aspect            | Regular Test DB (`DATABASE_URL_TEST`) | Live-Test DB (`DATABASE_URL_LIVE_TEST`) |
| ----------------- | ------------------------------------- | --------------------------------------- |
| Purpose           | Unit/integration tests, E2E (mocked)  | Live Shopify smoke tests                |
| Shopify calls     | Mocked / stubbed                      | Real GraphQL Admin API                  |
| Store connections | Fake / stubbed                        | Real allowlisted dev stores             |
| CI trigger        | Every PR, push to main                | Nightly schedule, manual dispatch       |
| Guard             | `assertTestEnv()`                     | `assertLiveShopifyTestEnv()`            |

### Required Environment Variables

```bash
# Required for live Shopify smoke tests
ENGINEO_LIVE_SHOPIFY_TEST=1
DATABASE_URL_LIVE_TEST=postgresql://user:pass@host:5432/engineo_live_test
SHOPIFY_API_KEY_TEST=your_test_app_key
SHOPIFY_API_SECRET_TEST=your_test_app_secret
SHOPIFY_TEST_STORE_ALLOWLIST=store1.myshopify.com,store2.myshopify.com
SHOPIFY_TEST_STORE_PRIMARY=store1.myshopify.com  # optional, defaults to first
SHOPIFY_TEST_ACCESS_TOKEN=shpat_xxx  # pre-issued offline token
```

### Allowlist + Guardrails Behavior

The `assertLiveShopifyTestEnv()` guard enforces:

1. `ENGINEO_LIVE_SHOPIFY_TEST=1` must be set.
2. `NODE_ENV` must NOT be `"production"`.
3. `DATABASE_URL_LIVE_TEST` must be set and include a safe pattern (e.g., `live_test`, `live-test`) if pointing to a cloud host.
4. `SHOPIFY_API_KEY_TEST` and `SHOPIFY_API_SECRET_TEST` must be set (not prod keys).
5. `SHOPIFY_TEST_STORE_ALLOWLIST` must be a non-empty comma-separated list of valid Shopify domains.
6. If `SHOPIFY_TEST_STORE_PRIMARY` is set, it must be in the allowlist.

If any check fails, the runner exits immediately with a loud error **before** any Shopify or DB calls.

### Running Locally

**Dry run (validate config only):**

```bash
pnpm test:shopify:live:dry
```

**Full live smoke test (requires valid secrets):**

```bash
# Create .env.live-test with required vars
pnpm test:shopify:live
```

**With store override:**

```bash
pnpm test:shopify:live --store=my-dev-store.myshopify.com
```

### CI Workflow

- **Workflow file:** `.github/workflows/shopify-live-smoke.yml`
- **Schedule:** Nightly at 3:00 AM UTC
- **Manual trigger:** `workflow_dispatch` with optional inputs:
  - `storeDomain` – override target store (must be in allowlist)
  - `runManualSync` – run manual sync step if implemented
  - `dryRun` – validate config without Shopify calls

**Never runs on PRs** – only on schedule and manual dispatch.

### Cleanup Behavior

After each smoke test run:

1. The runner attempts to delete all created test products.
2. If deletion fails, products are tagged with `engineo_live_test_cleanup_pending`.
3. Cleanup status is recorded in the audit record: `success`, `partial`, `failed`, or `skipped`.

### Audit Records and Artifacts

Each run generates:

- **Audit record:** `apps/api/artifacts/audit-<runId>.json`
- **JSON report:** `apps/api/artifacts/report-<runId>.json`

CI uploads these as artifacts on both success and failure. Audit records include:

- `runId`, `storeDomain`, `startedAt`, `finishedAt`
- `status`: `running`, `success`, `failure`, `cleanup_pending`
- `createdProductIds`, `seoUpdateVerified`, `cleanupStatus`
- `errorSummary` (if any)

### Troubleshooting

1. **Check audit records:** Download artifacts from the GitHub Actions run.
2. **Check Shopify dev store:** Look for products tagged `engineo_live_test` or `engineo_live_test_cleanup_pending`.
3. **Verify secrets:** Ensure all required secrets are configured in GitHub repository settings.
4. **Store not in allowlist:** The runner refuses to run against stores not in `SHOPIFY_TEST_STORE_ALLOWLIST`.

### Test Suites

Unit tests for the guard and runner are in:

- `apps/api/test/integration/live-shopify-test-guard.test.ts`
- `apps/api/test/integration/live-shopify-smoke-runner.test.ts`

Run with:

```bash
pnpm test:api -- live-shopify
```
