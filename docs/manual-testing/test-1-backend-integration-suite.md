# TEST-1 – Backend Integration Suite

> Manual testing checklist for verifying the TEST-1 backend integration test suite runs correctly and covers key platform features.

---

## Overview

- **Purpose of the feature/patch:**
  - Provide comprehensive backend integration test coverage for core EngineO.ai platform features including onboarding, project overview, Issue Engine Lite, SEO persistence, AEO-2 sync, and auth/entitlements.

- **High-level user impact and what "success" looks like:**
  - All integration tests pass against a clean local test database.
  - Tests provide regression confidence for key user journeys.
  - CI pipeline can run the full suite to catch regressions early.

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase TEST-0 – Test Foundation Setup
  - Phase TEST-1 – Backend Integration Suite

- **Related documentation:**
  - docs/TESTING.md (Section 10)
  - apps/api/test/integration/\*.test.ts

---

## Preconditions

- **Environment requirements:**
  - [ ] Docker running with `engineo-test-db` (postgres:15) container.
  - [ ] Docker running with `engineo-test-redis` (redis:7-alpine) container.
  - [ ] `.env.test` configured with local test database URL.
  - [ ] `pnpm db:test:reset` run successfully.

- **Test database setup:**
  - [ ] `DATABASE_URL_TEST` points to `postgresql://postgres:postgres@localhost:5432/engineo_test?schema=public`
  - [ ] No production URLs in `.env.test` (safety guard should block).

- **Required tools:**
  - [ ] pnpm installed
  - [ ] Docker Desktop running
  - [ ] Node.js 18+

---

## Test Scenarios

### Scenario 1: Safety guard blocks unsafe DB URLs

**ID:** T1-001

**Preconditions:**

- [ ] `.env.test` exists.

**Steps:**

1. Temporarily set `DATABASE_URL_TEST` to a Neon or production-like URL.
2. Run `pnpm test:api`.

**Expected Results:**

- [ ] Test run aborts immediately.
- [ ] Error message indicates unsafe database URL detected.
- [ ] No database operations executed.

**Cleanup:**

- [ ] Restore `DATABASE_URL_TEST` to local test URL.

---

### Scenario 2: Full backend suite runs successfully

**ID:** T1-002

**Preconditions:**

- [ ] Docker containers running (postgres, redis).
- [ ] `pnpm db:test:reset` completed.
- [ ] `.env.test` configured correctly.

**Steps:**

1. Run `pnpm test:api`.
2. Wait for all tests to complete.

**Expected Results:**

- [ ] All tests pass (green).
- [ ] No database connection errors.
- [ ] Test isolation works (tests don't interfere with each other).
- [ ] Coverage includes:
  - [ ] `onboarding-checklist.test.ts`
  - [ ] `project-overview.test.ts`
  - [ ] `issue-engine-lite.test.ts`
  - [ ] `seo-apply-persistence.test.ts`
  - [ ] `aeo2-manual-sync.test.ts`
  - [ ] `auth-entitlements.test.ts`

---

### Scenario 3: Single suite execution

**ID:** T1-003

**Preconditions:**

- [ ] T1-002 environment ready.

**Steps:**

1. Run `pnpm test:api -- --testPathPattern=onboarding-checklist`.
2. Verify only matching tests run.

**Expected Results:**

- [ ] Only `onboarding-checklist.test.ts` executes.
- [ ] Test passes.
- [ ] Other suites not executed.

---

### Scenario 4: Onboarding checklist signals

**ID:** T1-004

**Preconditions:**

- [ ] T1-002 environment ready.

**Steps:**

1. Run `pnpm test:api -- --testPathPattern=onboarding-checklist`.
2. Review test output.

**Expected Results:**

- [ ] Tests verify:
  - [ ] Fresh project shows incomplete status.
  - [ ] Connected store project shows Shopify connected.
  - [ ] Crawled project shows crawl completed.
  - [ ] Reviewed project shows DEO score present.

---

### Scenario 5: AEO-2 manual sync behavior

**ID:** T1-005

**Preconditions:**

- [ ] T1-002 environment ready.

**Steps:**

1. Run `pnpm test:api -- --testPathPattern=aeo2-manual-sync`.
2. Review test output.

**Expected Results:**

- [ ] Tests verify:
  - [ ] GET endpoint returns answer block data.
  - [ ] POST sync endpoint calls Shopify GraphQL.
  - [ ] Metafield mutation uses correct format.
  - [ ] Success response indicates sync completed.

---

### Scenario 6: Auth and entitlements gating

**ID:** T1-006

**Preconditions:**

- [ ] T1-002 environment ready.

**Steps:**

1. Run `pnpm test:api -- --testPathPattern=auth-entitlements`.
2. Review test output.

**Expected Results:**

- [ ] Tests verify:
  - [ ] Unauthenticated request returns 401.
  - [ ] Free plan user blocked from paid features with 403.
  - [ ] Error response includes `ENTITLEMENTS_LIMIT_REACHED` code.

---

### Scenario 7: Issue Engine Lite determinism

**ID:** T1-007

**Preconditions:**

- [ ] T1-002 environment ready.

**Steps:**

1. Run `pnpm test:api -- --testPathPattern=issue-engine-lite`.
2. Review test output.

**Expected Results:**

- [ ] Tests verify:
  - [ ] Products with missing SEO title detected as issues.
  - [ ] Products with missing SEO description detected as issues.
  - [ ] Products with both missing detected with both issue types.
  - [ ] Products with complete metadata have no issues.
  - [ ] Issue detection is deterministic (same input = same output).

---

## Edge Cases

### EC-001: Database not running

**Description:** Tests should fail gracefully if Docker containers aren't running.

**Steps:**

1. Stop postgres Docker container.
2. Run `pnpm test:api`.

**Expected Behavior:**

- [ ] Clear error message about database connection.
- [ ] No hanging processes.

---

### EC-002: Database not migrated

**Description:** Tests should indicate migration needed.

**Steps:**

1. Drop test database tables.
2. Run `pnpm test:api` without `pnpm db:test:reset`.

**Expected Behavior:**

- [ ] Error indicates schema mismatch or missing tables.
- [ ] Suggestion to run `pnpm db:test:reset`.

---

### EC-003: Redis not running

**Description:** Tests using BullMQ should fail gracefully.

**Steps:**

1. Stop redis Docker container.
2. Run `pnpm test:api`.

**Expected Behavior:**

- [ ] Clear error about Redis connection.
- [ ] Tests that don't need Redis may still pass.

---

## Regression

### Areas potentially impacted:

- [ ] Testkit seed helpers used by other test files.
- [ ] Test database cleanup between tests.
- [ ] Mock implementations for Shopify API.
- [ ] JWT token generation in tests.

### Quick sanity checks:

- [ ] `pnpm test:api` completes without timeouts.
- [ ] Test isolation: running single test doesn't affect others.
- [ ] `cleanupTestDb()` properly removes test data between runs.
- [ ] `createTestApp()` starts NestJS app correctly.

---

## Post-Conditions

### Data cleanup steps:

- [ ] `cleanupTestDb()` called in `beforeEach` hooks.
- [ ] `disconnectTestDb()` called in `afterAll` hooks.
- [ ] Docker containers can be stopped after testing.

### Follow-up verification:

- [ ] No lingering database connections after tests.
- [ ] No orphaned test data in database.
- [ ] Test run time reasonable (< 60 seconds for full suite).

---

## Known Issues

- **Intentionally accepted issues:**
  - Tests require Docker for database; no in-memory fallback.
  - Some tests create temporary test data that relies on cleanup.

- **Out-of-scope items:**
  - Frontend integration tests.
  - End-to-end tests with real browser.
  - Load testing.

- **TODOs:**
  - [ ] Add CI pipeline integration for automated test runs.
  - [ ] Add test coverage reporting.
  - [ ] Consider parallelizing test suites.

---

## Approval

| Field              | Value                                 |
| ------------------ | ------------------------------------- |
| **Tester Name**    | [Name]                                |
| **Date**           | [YYYY-MM-DD]                          |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes**          | TEST-1 Backend Integration Suite      |
