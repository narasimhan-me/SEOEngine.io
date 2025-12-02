# EngineO.ai Testing Strategy

This document defines the testing strategy for the EngineO.ai codebase.

It is written as a tactical blueprint for:

- Day-to-day development
- GPT-5.1 supervision
- Claude implementation
- Future QA/engineering hires

It complements (not replaces) the main **Implementation Plan** and the **Test Track** phases defined there.

---

## 1. Goals & Principles

### 1.1 Goals

- Keep EngineO.ai **stable** as DEO features grow (DEO Score, Entities, Answers, Signals).
- Catch regressions **early and cheaply**.
- Provide a clear structure for GPT-5.1 and Claude to add tests **as they implement features**.
- Make it easy for a future engineer or QA to understand:
  - What to test
  - Where tests live
  - How to run them
  - How tests map to product phases

### 1.2 Principles

1. **Single test runner per language**
   - Jest for all TypeScript (API, Web, Shared) in Test Phase 0.
2. **Test close to the code**
   - Unit tests live near their modules.
3. **Higher-level tests are sparse but meaningful**
   - A few strong integration/E2E tests > many brittle ones.
4. **Tests follow product phases**
   - When DEO Score gets more complex, its tests become richer.
5. **Automation > manual**
   - Assume no manual QA team for now; tests must be automatable and explainable to AI agents.

---

## 2. Test Layers & Scope

### 2.1 Layers

We use four main layers:

1. **Unit Tests**
   - Small, fast, isolated.
   - Services, utilities, React components.
   - No external services (DB, Redis, HTTP).

2. **Integration Tests (API)**
   - Real NestJS app + real Postgres test DB + test Redis.
   - Test API endpoints and job processing behavior.
   - Verify DB writes, queue enqueues, auth, entitlements.

3. **End-to-End (E2E) Tests (Web)**
   - Browser-level tests using Playwright (later phase).
   - Exercise real UI + API against a test environment.
   - Cover critical user journeys (signup, login, project view, basic DEO workflows).

4. **Non-functional (Future)**
   - Performance/load (e.g. DEO pipelines under load).
   - Chaos/resilience (queue delays, external failures).
   - Security checks (very lightweight, supplemented by external tooling).

### 2.2 In-Scope by Area

- **Auth & Security**
  - Signup, login, logout
  - CAPTCHA behavior
  - Rate limiting / abuse
- **DEO Core**
  - DEO Score computation pipeline
  - Entity ingestion & linking
  - Answer-ready content modeling
- **Billing & Entitlements**
  - Plan limits
  - Per-plan feature access
  - Project/item limits
- **Infrastructure Flows**
  - Worker queues & job lifecycle
  - Neon + Redis behavior in tests

---

## 3. Tools & Libraries

### 3.1 Common

- **Language:** TypeScript
- **Test Runner:** Jest (phases 0–1)
- **Assertions:** Built-in Jest matchers + `@testing-library/jest-dom` (web)

### 3.2 Backend (apps/api)

- **Framework:** NestJS
- **Test Runner:** Jest + `ts-jest`
- **Helpers:**
  - `@nestjs/testing` (TestingModule)
  - `supertest` (for API integration tests – future phase)
  - Testcontainers or similar (optional, future) for Postgres/Redis

### 3.3 Frontend (apps/web)

- **Framework:** Next.js 14 (App Router)
- **Test Runner:** Jest + `next/jest`
- **Helpers:**
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
- **E2E (future):**
  - Playwright

### 3.4 Shared (packages/shared)

- **Framework:** none (pure TS)
- **Test Runner:** Jest + `ts-jest`
- Tests must be **pure** (no framework coupling).

---

## 4. Folder Structure & Conventions

### 4.1 API (apps/api)

```txt
apps/api/
  src/
    auth/
      auth.controller.ts
      auth.service.ts
      auth-abuse.service.ts
      auth-abuse.service.spec.ts     # unit test near implementation
    captcha/
      captcha.service.ts
      captcha.service.spec.ts        # example
    deo-score/
      deo-score.service.ts
      deo-score.service.spec.ts      # (future)
  test/
    e2e/
      auth.e2e-spec.ts               # future API integration tests
      deo-score.e2e-spec.ts          # future
  jest.config.api.ts
  tsconfig.spec.json
```

**Conventions:**

- Unit tests: `*.spec.ts` colocated with the service/module.
- Integration/e2e tests: under `apps/api/test/`.
- Use Nest's TestingModule for unit tests; spin up full app only for integration tests.

### 4.2 Web (apps/web)

```txt
apps/web/
  src/
    components/
      layout/
        TopNav.tsx
        TopNav.test.tsx              # component test
    app/
      (marketing)/...
      (auth)/...
      (dashboard)/...
  jest.config.web.ts
  jest.setup.ts
  test/                              # future Playwright config, if kept here
```

**Conventions:**

- Component tests: `*.test.tsx` next to the component.
- Simple tests focus on:
  - Rendering
  - Critical text
  - Basic interactions

### 4.3 Shared (packages/shared)

```txt
packages/shared/
  src/
    deo-score.ts
    math-utils.ts
    math-utils.spec.ts
  jest.config.shared.ts
```

**Conventions:**

- Unit tests only.
- No framework imports.
- Good place for:
  - Pure scoring helpers
  - Data transformation utilities
  - Shared normalization logic

---

## 5. Commands & Scripts

### 5.1 Root-Level

In root `package.json`:

- `test` – run all tests
- `test:api` – backend tests
- `test:web` – frontend tests
- `test:shared` – shared package tests

**Example:**

```json
{
  "scripts": {
    "test": "pnpm test:api && pnpm test:web && pnpm test:shared",
    "test:api": "pnpm --filter apps/api test",
    "test:web": "pnpm --filter apps/web test",
    "test:shared": "pnpm --filter packages/shared test"
  }
}
```

### 5.2 API

`apps/api/package.json`:

```json
{
  "scripts": {
    "test": "jest --config jest.config.api.ts",
    "test:watch": "jest --config jest.config.api.ts --watch"
  }
}
```

### 5.3 Web

`apps/web/package.json`:

```json
{
  "scripts": {
    "test": "jest --config jest.config.web.ts",
    "test:watch": "jest --config jest.config.web.ts --watch"
  }
}
```

### 5.4 Shared

`packages/shared/package.json`:

```json
{
  "scripts": {
    "test": "jest --config jest.config.shared.ts",
    "test:watch": "jest --config jest.config.shared.ts --watch"
  }
}
```

---

## 6. Test Phases vs Product Phases

Testing evolves alongside product phases.

### 6.1 Test Phase 0 – Baseline Test Harness (Current)

Jest config for:

- `apps/api`
- `apps/web`
- `packages/shared`

At least:

- One backend service unit test
- One frontend component test
- One shared util test

**Goal:** "pnpm test passes" on any new clone of the repo.

### 6.2 Test Phase 1 – API Integration & Basic E2E (Upcoming)

Add:

- API integration tests (Nest app + test DB + Redis)
- 2–3 Playwright flows for:
  - Signup
  - Login + logout
  - Project overview + DEO Score read (placeholder)

**Goal:** catch regressions in core flows (auth, basic DEO, navigation).

### 6.3 Test Phase 2 – DEO Pipelines & Regression Coverage

Add tests for:

- DEO Score recompute endpoint and worker
- Entities ingestion & linking
- Answer-ready content modeling
- Billing/entitlements critical paths

**Goal:** new DEO features must land with tests that reflect their behavior.

### 6.4 Test Phase 3 – Performance & Resilience (Future)

**Performance tests for:**

- Bulk DEO jobs
- High project counts
- Heavy Stripe usage

**Resilience tests:**

- Queue delays
- External API degradation

---

## 7. What to Test by Domain

### 7.1 Auth & Abuse Protection

**Unit Tests:**

- `AuthAbuseService`:
  - Counter logic
  - Threshold behavior (2 failed logins → CAPTCHA required)
- `CaptchaService`:
  - Behavior when provider returns success/failure
  - Behavior when network fails

**Integration Tests (future):**

- `/auth/signup` rejects when CAPTCHA missing/invalid
- `/auth/login`:
  - 1st/2nd failures: no CAPTCHA required
  - 3rd failure: `captcha_required` response

**E2E (future):**

- Basic signup path (CAPTCHA bypassed in test env)
- Login + logout

### 7.2 DEO Score

**Unit Tests (Phase 2.0+):**

- `DeoScoreService.getLatestForProject` returns correct mapping
- Future scoring helper functions

**Integration Tests (Phase 2.1+):**

- `POST /projects/:id/deo-score/recompute`:
  - Enqueues job
- Worker:
  - Consumes job
  - Writes `deo_score_snapshots` row
  - Updates `projects.current_deo_score`
- `GET /projects/:id/deo-score`:
  - Reflects new snapshot

**E2E (future):**

- On project page:
  - Score reads correctly after recompute
  - Error state displayed if score unavailable

### 7.3 Billing & Entitlements

**Unit Tests:**

- Entitlement checks per plan
- Plan → limit mapping (projects, items, DEO compute pool)

**Integration Tests:**

- Restricted endpoints respect entitlements
- Billing hooks handle basic scenarios (active, canceled, trial)

---

## 8. CI Integration (Skeleton)

### 8.1 CI Stages

Recommended GitHub Actions jobs (names are illustrative):

**lint-and-typecheck**

- `pnpm lint`
- `pnpm typecheck`

**test-unit**

- `pnpm test:shared`
- `pnpm test:api`
- `pnpm test:web`

**test-integration (future)**

- Spin up Postgres + Redis
- Run API integration tests

**test-e2e (future)**

- Start test server
- Run Playwright against it

### 8.2 When They Run

**On every PR:**

- `lint-and-typecheck`
- `test-unit`

**On PRs to main or nightly:**

- `test-integration`
- `test-e2e`

---

## 9. Conventions for GPT-5.1 & Claude

### 9.1 When Adding Features

For every new feature or phase:

- Update Implementation Plan with:
  - Feature phase
  - Associated Test Phase tasks

**Add Tests Together With Code:**

- New API → at least one unit test, ideally one integration test.
- New service → unit tests for success + common failure modes.
- New React component → render test + basic interaction.

**Follow File Placement Rules:**

- Backend service → `*.spec.ts` next to `*.service.ts`.
- Frontend component → `*.test.tsx` next to `*.tsx`.
- Shared util → `*.spec.ts` next to `*.ts`.

### 9.2 When Editing Existing Code

**If behavior changes:**

- Update tests to match new behavior.

**If a bug is found:**

- Add a test that reproduces the bug.
- Fix the bug.
- Ensure the test fails before fix / passes after.

---

## 10. Future Extensions

Beyond Test Phase 0–2, this strategy can be extended to:

- Snapshots for DEO trend charts.
- Contract tests for external APIs (Stripe, search, CAPTCHA provider).
- Synthetic monitoring of key paths in production (very light).

These will be added as separate sections once the core DEO feature set stabilizes.

---

**Author:** Narasimhan Mahendrakumar
