# TEST-2 – Playwright E2E for First DEO Win (Mock Shopify)

> Manual verification checklist for the TEST-2 Playwright E2E suite covering the First DEO Win happy path: Connect store, Run first crawl, Review DEO Score, Optimize 3 products.

---

## Overview

- **Purpose:**
  Validate that the First DEO Win journey is protected end-to-end by a deterministic Playwright E2E suite running against the local test DB and mocked Shopify.

- **What success looks like:**
  - `pnpm test:e2e` passes locally without external network calls.
  - The E2E flow completes:
    - Connect store ✅
    - Run first crawl ✅
    - Review DEO Score ✅
    - Optimize 3 products ✅
  - CI runs the same E2E suite successfully and captures traces on failure.

---

## Preconditions

- [ ] Local Postgres test DB running (same as TEST-0/TEST-1, e.g. `engineo_test` on localhost:5432).
- [ ] `apps/api/.env.test` configured with:
  - `DATABASE_URL_TEST` pointing to the local test DB.
- [ ] TEST-0 / TEST-1 pass or only fail for known, unrelated reasons.

---

## Scenario 1 – Run Playwright E2E locally

**ID:** T2-001

**Goal:** Ensure the First DEO Win E2E suite runs successfully end-to-end.

**Steps:**

1. Reset the test DB:

   ```bash
   pnpm db:test:reset
   ```

2. From repo root, run the E2E suite:
   ```bash
   pnpm test:e2e
   ```

**Expected Results:**

- [ ] Playwright starts a dev server (`pnpm dev`) with E2E env:
  - `NODE_ENV=test`, `ENGINEO_ENV=test`, `ENGINEO_E2E=1`.
- [ ] Tests complete without hitting live Shopify or external sites.
- [ ] The "TEST-2 – First DEO Win (Playwright E2E)" suite passes.

---

## Scenario 2 – Inspect First DEO Win flow

**ID:** T2-002

**Goal:** Validate the high-level steps of the First DEO Win flow as exercised by E2E.

**Steps:**

1. Run the E2E UI mode:

   ```bash
   cd apps/web
   pnpm test:e2e:ui
   ```

2. From the Playwright UI, run the "First DEO Win happy path completes" test only.

3. Watch the browser session as it runs.

**Expected Results:**

- [ ] The browser:
  - Calls `/testkit/e2e/seed-first-deo-win` (invisibly) to create a test user/project/products.
  - Writes the test JWT into localStorage and navigates to `/projects/{projectId}/overview`.

- [ ] On the Overview page:
  - The First DEO win checklist initially shows "0 of 4 steps complete".
  - After the testkit connect call, the "Connect your store" step shows "Completed".
  - After clicking "Run crawl", the "Run your first crawl" step shows "Completed".
  - After clicking "View DEO Score", the "Review your DEO Score" step shows "Completed".

- [ ] For each of 3 products:
  - The test navigates to `/projects/{projectId}/products/{productId}?focus=metadata`.
  - The "SEO Metadata" panel is visible and the metadata section is focused.
  - The test edits metadata fields and clicks "Apply to Shopify".
  - A success toast appears: "Applied to Shopify and saved in EngineO." (or equivalent).

- [ ] Returning to Overview:
  - The First DEO win checklist is no longer visible.
  - The "Next DEO Win" card appears.

---

## Scenario 3 – Verify Shopify + crawl stubbing (no network)

**ID:** T2-003

**Goal:** Confirm that no E2E step requires live Shopify or external HTTP calls.

**Steps:**

1. Temporarily disable internet access (or monitor outbound HTTP) while running:

   ```bash
   pnpm test:e2e
   ```

2. Observe logs for:
   - `SeoScanService`
   - `ShopifyService`

**Expected Results:**

- [ ] SEO crawl uses the E2E stub in `SeoScanService.scanPage`:
  - Logs indicate a synthetic scan (or at least no network error).
- [ ] `ShopifyService` uses its E2E mock:
  - No HTTP errors for Shopify Admin API.
  - No outbound calls to `*.myshopify.com` are made.
- [ ] Tests still pass without network connectivity.

---

## Scenario 4 – Single-item optimization only (no bulk apply)

**ID:** T2-004

**Goal:** Ensure the product workspace does not expose bulk apply controls.

**Steps:**

1. Re-run the "Optimize workspace exposes only single-item apply (no bulk apply)" test from the Playwright UI (or via CLI with a `--grep` filter).

2. Inspect the product workspace UI when the test reaches `/projects/{projectId}/products/{productId}?focus=metadata`.

**Expected Results:**

- [ ] "Apply to Shopify" button is visible in the metadata editor.
- [ ] No buttons or links with labels such as:
  - "Apply to all"
  - "Bulk apply"
  - "Apply to all products"
- [ ] The E2E assertion that these texts are absent passes.

---

## Scenario 5 – CI E2E run

**ID:** T2-005

**Goal:** Validate that CI runs the E2E suite using the same configuration.

**Steps:**

1. Push a branch that includes TEST-2 implementation.
2. Open a PR against `main` / `master`.
3. Observe the "TEST-0 - Automated Testing Foundation" (or equivalent) workflow in GitHub Actions.

**Expected Results:**

- [ ] The workflow:
  - Starts Postgres.
  - Runs `pnpm db:test:migrate`.
  - Runs backend tests (`pnpm test`).
  - Runs Playwright smoke tests (`pnpm test:web`).
  - Runs Playwright E2E (`pnpm test:e2e`).
- [ ] E2E tests pass in CI without live Shopify or external network.
- [ ] On failure, Playwright artifacts (traces/screenshots) are available for inspection.

---

## Regression Guardrails

- [ ] Changing `ENGINEO_E2E` or related env vars should not break TEST-0/TEST-1 when E2E mode is off.
- [ ] Any future changes to Shopify or SEO crawl behavior must keep the E2E stubs working when `ENGINEO_E2E=1`.
- [ ] New First DEO Win changes should update this manual doc and the Playwright suite as part of their PATCH BATCH.

---

## Post-Conditions

### Data cleanup steps:

- [ ] E2E tests seed their own data; no manual cleanup required.
- [ ] `cleanupTestDb()` in test setup handles isolation.

### Follow-up verification:

- [ ] No lingering test data in production (E2E only runs against test DB).
- [ ] Playwright traces available for debugging on failure.

---

## Known Issues

- **Intentionally accepted issues:**
  - E2E tests require both web and API servers; `webServer` config handles this.
  - Scroll timing may vary; tests use Playwright's auto-waiting.

- **Out-of-scope items:**
  - Real Shopify OAuth flow testing.
  - Production deployment E2E.
  - Mobile browser testing.

- **TODOs:**
  - [ ] Add visual regression testing for key UI states.
  - [ ] Add E2E coverage for edge cases (network errors, partial failures).

---

## Approval

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| **Tester Name**    | [Name]                                  |
| **Date**           | [YYYY-MM-DD]                            |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed   |
| **Notes**          | TEST-2 Playwright E2E for First DEO Win |
