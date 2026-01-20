# TEST-0 – Automated Testing Foundation (Backend + Frontend Ready)

> Manual verification checklist for the TEST-0 automated testing foundation: backend unit/integration tests against a real test DB, Playwright scaffold, deterministic factories, and hard safety guardrails.

---

## Overview

- **Purpose of the feature/patch:**
  - Establish a reliable, isolated testing foundation across the monorepo.
  - Ensure backend tests run against a safe local Postgres test database.
  - Provide a minimal Playwright scaffold for future frontend E2E flows.
  - Introduce deterministic test data factories and a golden-path backend integration test.

- **High-level user impact and what "success" looks like:**
  - `pnpm test` and `pnpm test:api` run consistently against a local test DB.
  - Test helpers refuse to run if pointed at a prod/managed database (Neon/Render/etc.).
  - A single “golden path” integration test verifies the Shopify update-product-SEO flow without hitting live Shopify.
  - CI runs the TEST-0 suite on every PR.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Test Track – `TEST-0 – Automated Testing Foundation (Backend + Frontend Ready)`
  - Testing Track – Phase T0/T1 (backend API coverage)

- **Related documentation:**
  - `docs/TESTING.md`
  - `apps/api/src/config/test-env-guard.ts`
  - `apps/api/src/testkit/index.ts`
  - `.github/workflows/test.yml`

---

## Preconditions

- **Environment requirements:**
  - [ ] Local Postgres instance running (e.g. via Docker) with:
    - DB: `engineo_test`
    - User: `postgres`
    - Password: `postgres`
  - [ ] Node 20+ and pnpm 8+ installed.
  - [ ] Dependencies installed: `pnpm install`.

- **Env files:**
  - [ ] `apps/api/.env.test` created from `.env.test.example` and pointing at the local test DB:
    - `DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/engineo_test?schema=public"`
  - [ ] No `.env.test` or other env files in use that point at a Neon/Render/other managed DB.

- **Codebase state:**
  - [ ] Repo builds successfully (`pnpm build`).
  - [ ] No pending schema migrations (local DB up to date after running `pnpm db:test:migrate`).

---

## Scenario 1 – DB Safety Guard Blocks Unsafe URLs

**ID:** T0-001

**Goal:** Verify that the test environment guard refuses to run against unsafe DB URLs.

**Setup:**

- [ ] Temporarily set `DATABASE_URL` in your shell to a clearly non-local URL (do **not** commit this change), e.g.:
  - `export DATABASE_URL="postgresql://user:pass@ep-some-neon-host.neon.tech/db"`

**Steps:**

1. From the repo root, run `pnpm db:test:migrate`.

**Expected Results:**

- [ ] Command fails fast with a clear error mentioning:
  - `[TEST ENV GUARD]`
  - That the DB URL appears to point to a managed/prod host.
  - The offending URL.
- [ ] No migrations are applied to the remote database.

**Cleanup:**

- [ ] Unset/restore `DATABASE_URL` in your shell before proceeding:
  - `unset DATABASE_URL`

---

## Scenario 2 – DB Migrate/Reset Work Against Local Test DB

**ID:** T0-002

**Goal:** Verify that DB helper scripts work correctly with a local test database.

**Preconditions:**

- [ ] `apps/api/.env.test` exists and uses the local `engineo_test` database.

**Steps:**

1. Run `pnpm db:test:reset` from the repo root.
2. After reset completes, run `pnpm db:test:migrate`.

**Expected Results:**

- [ ] `db:test:reset` completes without error and logs Prisma reset/migrate output.
- [ ] `db:test:migrate` reports migrations as up-to-date with no errors.
- [ ] No safety guard errors are thrown when using the local DB URL.

---

## Scenario 3 – Backend Jest Suite Runs Against Test DB

**ID:** T0-003

**Goal:** Confirm that `pnpm test` / `pnpm test:api` run backend tests successfully against the test DB.

**Preconditions:**

- [ ] Scenario T0-002 completed successfully.

**Steps:**

1. Run `pnpm test:api` from the repo root.
2. Observe Jest output and ensure tests complete.
3. Optionally, run `pnpm test` (alias for the backend Jest suite).

**Expected Results:**

- [ ] Jest starts with `NODE_ENV=test`.
- [ ] No errors from the test env guard (DB URL is accepted).
- [ ] Existing unit/integration/e2e tests (including automation and DEO flows) pass or clearly fail due to known, unrelated issues.
- [ ] The new golden-path e2e test file `apps/api/test/e2e/shopify-update-product-seo.e2e-spec.ts` runs as part of the suite:
  - Asserts success on `POST /shopify/update-product-seo`.
  - Confirms the Product row gets updated `seoTitle` and `seoDescription`.
  - Verifies the mocked Shopify call was used (no real network).

---

## Scenario 4 – Golden Path Shopify SEO Update End-to-End

**ID:** T0-004

**Goal:** Explicitly validate the “golden path” backend integration test behavior using seeded data and mocks.

**Preconditions:**

- [ ] Scenario T0-003 completed (Jest suite runs).

**Steps:**

1. Run only the golden-path test from the `apps/api` directory:
   - `cd apps/api`
   - `pnpm test:api:e2e -- shopify-update-product-seo.e2e-spec.ts`
2. Watch test output for the `Shopify Update Product SEO (golden path e2e)` suite.

**Expected Results:**

- [ ] Test passes.
- [ ] Logs (if any) indicate that:
  - A test user/project/integration/products are created via the `seedFirstDeoWinProjectReady` testkit helper.
  - The `/shopify/update-product-seo` endpoint responds with the expected payload.
  - Prisma shows the updated product SEO fields in the test DB.
- [ ] No real network calls to Shopify are made (fetch is mocked; errors would surface if a real call was attempted).

---

## Scenario 5 – Playwright Smoke Test (Optional)

**ID:** T0-005

**Goal:** Verify that the Playwright scaffold is wired and can execute a simple smoke test.

**Preconditions:**

- [ ] Frontend app running locally at `http://localhost:3000`:
  - From repo root: `pnpm dev:web`

**Steps:**

1. In a separate terminal, from the repo root, run:
   - `pnpm test:web`
2. Observe Playwright output.

**Expected Results:**

- [ ] Playwright starts, using the config in `apps/web/playwright.config.ts`.
- [ ] The `smoke-homepage.spec.ts` test:
  - Navigates to `/`.
  - Asserts the marketing homepage hero heading is visible.
- [ ] Test passes; if it fails, the error clearly indicates a missing/changed hero heading or base URL issue.

---

## Scenario 6 – CI Workflow Sanity Check

**ID:** T0-006

**Goal:** Confirm that the CI workflow is correctly wired to run TEST-0 on PRs.

**Preconditions:**

- [ ] GitHub Actions enabled for the repository.

**Steps:**

1. Push a branch with a small, safe change (e.g., comment or docs update).
2. Open a PR targeting `main`/`master`.
3. Observe the `TEST-0 - Automated Testing Foundation` workflow run.

**Expected Results:**

- [ ] Workflow starts automatically on the PR.
- [ ] Postgres service is started in CI.
- [ ] Steps:
  - `pnpm db:test:migrate`
  - `pnpm test`
  - `pnpm test:web` (allowed to be non-blocking via `continue-on-error`)
    run in sequence.
- [ ] If the test env guard detects an unsafe DB URL, the workflow fails with a clear error.

---

## Regression / Edge Cases

- [ ] Changing `DATABASE_URL` to a managed host (Neon/Render/etc.) always triggers the guard and blocks tests.
- [ ] Running `pnpm db:test:reset` or `pnpm db:test:migrate` without a reachable Postgres instance fails with a clear connection error (not silent).
- [ ] New tests that use `testPrisma` or the `testkit` helpers behave deterministically across runs (no random ID collisions, no reliance on external services).
