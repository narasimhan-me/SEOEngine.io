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

