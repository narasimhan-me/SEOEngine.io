
# EngineO.ai – Full Implementation Plan

**Updated Direction — DEO (Discovery Engine Optimization)**
EngineO.ai has evolved from a traditional SEO tool into a full **DEO platform**, covering SEO (Search Engine Optimization), AEO (Answer Engine Optimization), PEO (Product Engine Optimization), VEO (Video Engine Optimization), and multi‑engine discovery. All references to SEO‑only logic in this plan should now be interpreted as part of the broader multi‑engine discovery framework. Features will progressively be expanded to support AI answer engines, product search engines, video platforms, and social discovery channels.

DEO = SEO + AEO + PEO + VEO

This document provides a **step-by-step, execution-ready plan** for building the EngineO.ai SaaS application using a monorepo (Next.js frontend + NestJS backend + Prisma + PostgreSQL + Shopify integration + AI metadata engine).

AI IDEs (Cursor, Claude Code, etc.) should follow these instructions **exactly as written**.  
Each phase should be implemented in sequence.  
Each step should produce diffs and await approval before applying.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend:** NestJS (Node + TypeScript)
- **Database:** PostgreSQL + Prisma (Neon in production)
- **Cache / Queue (later):** Redis
- **AI:** OpenAI / Gemini via REST API

---
## Test Track – Quality & Automation

The Test Track runs in parallel with feature phases (1.x, 2.x, etc.) to ensure EngineO.ai remains stable as DEO features expand.

Planned stages:
- **TEST-0 – Automated Testing Foundation (Backend + Frontend Ready)** (this phase, completed)
- **Test Phase 0 – Baseline Test Harness** (original baseline, partially superseded by TEST-0)
- **Test Phase 1 – API Integration & Basic E2E**
- **Test Phase 2 – DEO Pipelines & Regression Coverage**
- **Test Phase 3 – Performance, Load & Chaos** (later)
- **Automation Engine v1** (including Shopify Answer Block automations) must be covered by unit (rule evaluation), integration (trigger → execution → logging), and E2E (Dashboard/Product Workspace automation flows) tests, with scaffolding created in `tests/unit/automation/`, `tests/integration/automation/`, and `tests/e2e/automation/` before full implementation.

This section defines **Test Phase 0** in detail.

---

## Manual Testing Documentation Workflow

In addition to automated tests from the Test Track, every significant feature, phase, or patch must have a manual testing document.

**Canonical structure:** Defined in `docs/MANUAL_TESTING_TEMPLATE.md`.

**Per-phase/per-feature manual testing docs:**
- Should be created under `docs/manual-testing/` with names that clearly connect to the phase (e.g., `docs/manual-testing/phase-1-5-entitlements-and-crawl.md`).
- For each major phase/feature block in the Implementation Plan, the entry should include a `Manual Testing:` bullet pointing to the corresponding manual testing doc once it exists.

**Cross-cutting system-level manual testing docs:**
- May be created under `docs/testing/` for shared systems that span multiple phases (e.g., Billing & Limits, AI Systems, Frontend UX feedback and limits).
- Should be referenced from each relevant phase/feature section in this plan.

**Claude's responsibilities when implementing a phase:**
- Ensure the manual testing doc is created/updated.
- Add or update the `Manual Testing:` bullet for that phase in this plan.

**Phase R1 – Retroactive Manual Testing Docs (Billing, AI, Frontend UX):**
- Introduces baseline system-level manual testing coverage for:
  - Billing & Limits → `docs/testing/billing-and-limits.md`
  - AI Systems (Product Optimize, fallback, limits) → `docs/testing/ai-systems.md`
  - Frontend UX feedback, error visibility, and limit-reached behavior → `docs/testing/frontend-ux-feedback-and-limits.md`
- Future patches extending these systems should update the corresponding testing documents alongside code changes.

**Phase R2 – Retrofit Testing Coverage (DEO & Shopify systems):**
- Adds system-level manual testing coverage for:
  - DEO Pipeline (crawl triggers, worker execution, status transitions, crawl error handling) → `docs/testing/deo-pipeline.md`
  - Signals Collection (DEO signals extraction, missing-data tolerance, logging) → `docs/testing/signals-collection.md`
  - DEO Score Compute Pipeline (compute process, versioning, partial signals, failure recovery) → `docs/testing/deo-score-compute-pipeline.md`
  - DEO Score Snapshots (snapshot storage, version alignment, history behavior) → `docs/testing/deo-score-snapshots.md`
  - Shopify Integration (OAuth/app install, connect flow, invalid/expired states, store metadata retrieval) → `docs/testing/shopify-integration.md`
  - Product Sync (initial sync, delta sync, deleted products, rate-limit handling) → `docs/testing/product-sync.md`
  - Metadata Sync – SEO fields (writing SEO to Shopify, response validation, conflict handling) → `docs/testing/metadata-sync-seo-fields.md`
  - Sync Status & Progress Feedback (UI status, partial failure handling, worker logs) → `docs/testing/sync-status-and-progress-feedback.md`
- These documents provide retroactive coverage for mid-level priority systems and must be kept up to date as related phases evolve.

**Phase R3 – Testing Coverage (UI, Marketing, Admin, Utilities):**

- UI & UX Supporting Systems:
  - Navigation & Layout System → `docs/testing/navigation-and-layout-system.md`
  - Toast / Inline Feedback System → `docs/testing/toast-and-inline-feedback-system.md`
  - Modal & Dialog Behavior → `docs/testing/modal-and-dialog-behavior.md`
  - Pagination & Tabs → `docs/testing/pagination-and-tabs.md`
  - Search & Filters (UI) → `docs/testing/search-and-filters-ui.md`
- Marketing Surfaces & Public Pages:
  - Homepage → `docs/testing/marketing-homepage.md`
  - Shopify Landing Page → `docs/testing/marketing-shopify-landing-page.md`
  - Pricing Page → `docs/testing/marketing-pricing-page.md`
  - Features Pages → `docs/testing/marketing-features-pages.md`
- Admin / Internal Tools:
  - Admin Panel → `docs/testing/admin-panel.md`
  - Background Job Dashboard → `docs/testing/background-job-dashboard.md`
  - Rate-limit Observability → `docs/testing/rate-limit-observability.md`
  - Error Logging & Monitoring → `docs/testing/error-logging-and-monitoring.md`
  - Worker Health Indicators → `docs/testing/worker-health-indicators.md`
- Supporting Services & Utilities:
  - Token Usage Tracking → `docs/testing/token-usage-tracking.md`
  - Entitlements Matrix → `docs/testing/entitlements-matrix.md`
  - Plan Definitions → `docs/testing/plan-definitions.md`
  - Date/Time Utilities & Reset Behaviors → `docs/testing/datetime-utilities-and-reset-behaviors.md`
  - Thumbnail Fetchers → `docs/testing/thumbnail-fetchers.md`
  - Health-check Endpoints → `docs/testing/health-check-endpoints.md`
  - Project Deletion & Workspace Cleanup → `docs/testing/project-deletion-and-workspace-cleanup.md`
  - User Profile & Account Settings → `docs/testing/user-profile-and-account-settings.md`
- These Phase R3 documents complete retroactive manual testing coverage for lower-risk but high-importance subsystems and should be updated alongside future enhancements in each area.

**Phase R4 – Verification Layer & Enforcement System:**

- Goal:
  - Introduce a verification layer that ensures:
    - Every new feature or patch includes manual testing steps.
    - Every PATCH BATCH references its associated manual testing doc(s).
    - Critical systems have minimum coverage and cannot silently regress.
- Scope (documentation & process only – no code changes):
  - Add a Critical Path Coverage Map:
    - `docs/testing/CRITICAL_PATH_MAP.md` defines the current set of critical paths (Auth, Billing & Limits, Product Optimize, Crawl Pipeline, DEO Score Compute, Shopify Sync, AI Failover, Frontend Global UX Feedback).
    - Each critical path entry links to its manual testing doc(s) and notes whether automated tests exist (where applicable).
  - Add a Release Verification Gate specification:
    - `docs/testing/RELEASE_VERIFICATION_GATE.md` defines the rules that must be satisfied before releases/major merges (critical paths verified, docs present, links valid, regressions checked).
  - Strengthen AI collaboration protocol:
    - `docs/ENGINEO_AI_INSTRUCTIONS.md` updated to v3.4 to include:
      - Supervisor obligations to specify test docs per PATCH BATCH.
      - Enforcement of Critical Path Map updates when critical systems are touched.
      - References to the Release Verification Gate.
    - `docs/SESSION_STARTER.md` updated to v3.4 so new sessions always load the verification rules.
    - `docs/ENGINEO_AI_EXECUTIVE_AND_SUPERVISION_PROTOCOL.md` remains deprecated but now points to the verification-layer docs.
- Enforcement expectations:
  - For any new phase or feature:
    - Implementation Plan entry must contain a `Manual Testing:` reference.
    - Supervisor PATCH BATCH must identify the manual testing doc(s) to create or update and, when applicable, the critical path entry to update.
    - Claude must treat the manual testing doc and any necessary Critical Path Map updates as part of the deliverable.
- Status: **COMPLETE**
  - [x] Created `docs/testing/CRITICAL_PATH_MAP.md` with 8 critical paths defined
  - [x] Created `docs/testing/RELEASE_VERIFICATION_GATE.md` with pre-release checklist and gate criteria
  - [x] `docs/ENGINEO_AI_INSTRUCTIONS.md` updated to v3.4 with verification layer rules
  - [x] `docs/SESSION_STARTER.md` updated to v3.4 with verification layer boot prompts
  - [x] `docs/ENGINEO_AI_EXECUTIVE_AND_SUPERVISION_PROTOCOL.md` points to verification-layer docs
- Manual Testing: N/A (documentation-only phase; verification layer docs are self-documenting)

---

## Test Phase 0 – Baseline Test Harness

### Phase Summary
Establish a minimal but working test harness across the monorepo:

- `apps/api` – NestJS backend unit tests  
- `apps/web` – Next.js component/unit tests  
- `packages/shared` – pure TypeScript unit tests  

This phase focuses on:

- Setting up **Jest** as the primary runner  
- Adding a small number of sample tests in each area  
- Wiring consistent scripts so future phases can layer on integration/E2E tests  

No heavy integration or E2E yet – this is the foundation.

---

### Goals

- Make `pnpm test` run a predictable, fast baseline suite.  
- Give GPT-5.1 and Claude a clear, shared structure for all future tests.  
- Ensure backend, frontend, and shared packages all have at least one passing test.  
- Avoid test-runner fragmentation (single standard: **Jest**).

---

### Scope

#### In Scope

- Root-level scripts for running tests  
- Jest configuration for:
  - `apps/api`
  - `apps/web`
  - `packages/shared`
- Sample tests:
  - 1–2 backend unit tests  
  - 1 frontend component test  
  - 1 shared util test  
- Optional documentation for testing commands  

#### Out of Scope

- Full API integration tests (DB + Redis)  
- Playwright or Cypress E2E  
- Load/performance tests  

Those will be covered in later Test Phases.

---

### Implementation Details

#### 1. Root Test Scripts & Dependencies

- Add Jest-related devDependencies at the root (not duplicated in each app):
  - `jest`  
  - `ts-jest`  
  - `@types/jest`
  - `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (for web)

- Add unified test scripts in `package.json`:

```
test → runs all suites  
test:api  
test:web  
test:shared  
```

These will be wired to the app-level scripts.

---

#### 2. Backend Tests – `apps/api`

- Create Jest config:  
  - `apps/api/jest.config.api.ts`  
  - Use `ts-jest`, `testEnvironment: "node"`, match `src/**/*.spec.ts` and `test/**/*.spec.ts`

- Create/update `apps/api/tsconfig.spec.json`:
  - Extends app tsconfig  
  - Adds `"types": ["jest", "node"]`
  - Includes `src` & `test`

- Add `apps/api/package.json` script:

```
"test": "jest --config jest.config.api.ts"
```

- Add at least one sample unit test, e.g.:
  - `AuthAbuseService` test verifying:
    - `getFailedCount()` default behavior  
    - `isCaptchaRequired()` returns false when below threshold  

---

#### 3. Frontend Tests – `apps/web`

- Configure Jest with `next/jest`:
  - `apps/web/jest.config.web.ts`  
  - `testEnvironment: "jsdom"`  
  - Matches `src/**/*.test.tsx`  

- Create setup file:
  - `apps/web/jest.setup.ts` importing `@testing-library/jest-dom`

- Add script:

```
"test": "jest --config jest.config.web.ts"
```

- Add one sample React component test, e.g.:
  - `TopNav.test.tsx` verifying "EngineO.ai" text renders

---

#### 4. Shared Package Tests – `packages/shared`

- Create Jest config:
  - `packages/shared/jest.config.shared.ts`  
  - Uses `ts-jest`  
  - Matches `src/**/*.spec.ts`

- Add script:  

```
"test": "jest --config jest.config.shared.ts"
```

- Add sample util test:
  - `clamp(value, min, max)` with 3 assertions  

---

#### 5. Optional: Testing Documentation

Create `docs/testing.md` describing:

- How to run:  
  - `pnpm test`  
  - `pnpm test:api`  
  - `pnpm test:web`  
  - `pnpm test:shared`
- Where tests live:
  - `apps/api/src/**/*.spec.ts`
  - `apps/web/src/**/*.test.tsx`
  - `packages/shared/src/**/*.spec.ts`
- What later Test Phases will add (API integration, E2E, etc.)

---

### Dependencies & Ordering

Test Phase 0 depends on:

- Monorepo tooling stable  
- `apps/api`, `apps/web`, `packages/shared` compile without errors  

Should be completed before:

- DEO Score complexity (Phase 2.2+)  
- Heavy billing/entitlement logic  
- Large refactors  

---

### Acceptance Criteria

- `pnpm test` runs all suites successfully  
- `apps/api` has Jest config + at least one passing service unit test  
- `apps/web` has Jest config + one passing component test  
- `packages/shared` has Jest config + one passing util test  
- Optional: `docs/testing.md` created

---

## TEST-0 – Automated Testing Foundation (Backend + Frontend Ready)

### Phase Summary

Establish a reliable, isolated automated testing foundation that:

- Runs backend unit + integration tests against a real local Postgres test DB.
- Provides a golden-path integration test for the Shopify product SEO update flow.
- Scaffolds Playwright for frontend E2E readiness (smoke only).
- Adds deterministic test data factories and DB reset helpers.
- Prevents tests from ever touching production or managed databases.

### Implementation Highlights

- **Test environment guardrails**
  - Added `apps/api/src/config/test-env-guard.ts` with `assertTestEnv()` and `getTestDatabaseUrl()` helpers.
  - API bootstrap (`apps/api/src/main.ts`) asserts a safe test environment when running in test mode.
  - Jest e2e setup (`apps/api/test/setup.ts`) and Prisma test DB utilities (`apps/api/test/utils/test-db.ts`) call the guard before connecting or resetting data.
  - New scripts `apps/api/scripts/db-test-migrate.ts` and `db-test-reset.ts` run Prisma migrations/resets against the validated test DB.

- **Test DB wiring**
  - Root scripts:
    - `pnpm db:test:migrate` → `pnpm --filter api db:test:migrate`
    - `pnpm db:test:reset` → `pnpm --filter api db:test:reset`
  - `apps/api/package.json`:
    - `db:test:migrate` and `db:test:reset` wired to TypeScript helpers that:
      - Load `apps/api/.env.test`.
      - Assert `NODE_ENV/ENGINEO_ENV === "test"`.
      - Assert `DATABASE_URL_TEST`/`DATABASE_URL` is local and non-prod.
      - Execute Prisma `migrate deploy` / `migrate reset` against the test DB.

- **Test data factories and seed helpers**
  - New testkit module: `apps/api/src/testkit/index.ts` with:
    - `createTestUser(prisma, { email?, plan? })`
    - `createTestProject(prisma, { userId, name?, domain? })`
    - `createTestShopifyStoreConnection(prisma, { projectId, shopDomain?, accessToken? })`
    - `createTestProducts(prisma, { projectId, count, withSeo?, withIssues? })`
    - `setTestUserPlan(prisma, { userId, plan })`
    - `seedFirstDeoWinProjectReady(prisma, { userPlan })`
  - Deterministic IDs/keys use `test_<label>_<timestamp>_<counter>` prefixes.

- **Golden-path backend integration test (canary)**
  - Added `apps/api/test/e2e/shopify-update-product-seo.e2e-spec.ts`:
    - Bootstraps the Nest app via `createTestApp()`.
    - Seeds a user + project + Shopify connection + products via `seedFirstDeoWinProjectReady()`.
    - Issues `POST /shopify/update-product-seo` with a signed JWT for the seeded user.
    - Asserts:
      - API responds with the expected payload.
      - The corresponding `Product` row gets updated `seoTitle` / `seoDescription`.
      - `global.fetch` is mocked and invoked once with the `UpdateProductSeo` operation (no real Shopify network calls).

- **Frontend Playwright scaffold**
  - `apps/web/playwright.config.ts` configured with:
    - Test dir `apps/web/tests`.
    - Default base URL `http://localhost:3000` (overridable via `PLAYWRIGHT_BASE_URL`).
    - Single Chromium project.
  - `apps/web/tests/smoke-homepage.spec.ts`:
    - Navigates to `/`.
    - Asserts the marketing homepage hero heading is visible.
  - `apps/web/package.json`:
    - Dev dependency: `@playwright/test`.
    - Script: `"test": "playwright test"`.
  - Root script: `pnpm test:web` → `pnpm --filter web test`.

- **Root test scripts**
  - `pnpm test` → runs backend Jest suite via `pnpm test:api`.
  - `pnpm test:api` → `pnpm --filter api test:api`.
  - `pnpm test:web` → `pnpm --filter web test` (Playwright smoke).

- **CI skeleton**
  - New workflow: `.github/workflows/test.yml`:
    - Triggers on PRs and pushes to `main`/`master`.
    - Starts a Postgres 15 service (`engineo_test` DB).
    - Sets test-mode env vars (including a local `DATABASE_URL` and `NODE_ENV/ENGINEO_ENV = test`).
    - Runs `pnpm db:test:migrate`, `pnpm test`, and `pnpm test:web` (Playwright step marked `continue-on-error` for now).
    - Fails fast if the test guard detects an unsafe DB URL.

- **Docs and env examples**
  - Created `docs/TESTING.md` with:
    - Local setup instructions.
    - Command reference (`pnpm test`, `test:api`, `test:web`, `db:test:migrate`, `db:test:reset`).
    - Explanation of the test env guard, testkit, Shopify mocking, and CI behavior.
  - Created `.env.test.example` at the repo root with:
    - Local `DATABASE_URL_TEST` for `engineo_test` on localhost.
    - Placeholder (non-secret) values for JWT, Redis, Shopify, AI, and Stripe.
  - Manual testing doc:
    - `docs/manual-testing/test-0-automated-testing-foundation.md` describing manual verification for:
      - DB safety guard behavior.
      - DB migrate/reset scripts.
      - Backend Jest suite against the test DB.
      - Golden-path Shopify SEO update test.
      - Playwright smoke test and CI wiring.

### Status

- Status: **COMPLETE**
- Manual Testing: `docs/manual-testing/test-0-automated-testing-foundation.md`

---

## Testing Track

### Phase T0 – Backend API Test Foundation (Completed)

Set up Jest configuration for `apps/api` suitable for unit/integration and e2e tests.

Created a standard test folder structure:
- `apps/api/test/e2e`
- `apps/api/test/integration`
- `apps/api/test/fixtures`
- `apps/api/test/utils`

Implemented test utilities:
- `createTestApp()` helper to bootstrap `AppModule` in test mode using `.env.test`.
- Test DB helper to run Prisma migrations and reset/clean the test database.
- Added basic fixtures/factories for a test user and test project.

Added a working example e2e test (e.g., `/health`) using Supertest and `createTestApp()`.

Added package scripts (e.g., `test:api`, `test:api:e2e`) to run backend tests locally and in CI.

### Phase T1 – Critical API E2E Coverage (Planned)

Add high-confidence e2e tests for:
- Auth flows (signup/login/token).
- Core project endpoints (create/list).
- DEO score endpoints (recompute + fetch latest score).

Cover happy paths and core error/permission cases for these endpoints.

Wire API test commands into CI so that breaking core APIs fails the pipeline.

### Phase T2 – Expanded Coverage & CI Enforcement (Planned)

Expand e2e coverage to additional APIs as they are built.

Add integration tests for critical services (for example, `DeoScoreService` and worker pipelines).

Enforce a rule that every new or modified API endpoint must add or update tests.

Make backend tests a required step in the main CI pipeline.

---

_Author: Narasimhan Mahendrakumar_

---

## High-Level DEO Architecture

EngineO.ai is organized around a set of "engines" that optimize for different discovery surfaces. The phases below should be understood as building blocks for these engines:

- **SEO Engine (Search Engine Optimization)** – classic web search results and technical/content SEO.
- **Answer Engine (AEO)** – AI assistants and answer engines (ChatGPT, Gemini, Perplexity, Copilot, etc.).
- **Product Engine (PEO)** – on-site and marketplace product search (Shopify Search today, Amazon/TikTok Shop later).
- **Video Engine (VEO)** – video discovery surfaces (YouTube, Shorts, TikTok).
- **DEO Core** – entities, knowledge graph, DEO scoring, and multi-engine metadata bundles.
- **Integration Layer** – Shopify first, with future adapters for Amazon, TikTok Shop, YouTube, Google Search Console, and others.
- **Automation Engine** – scheduled scans, automatic fixes, social posting, and workflow automation.
- **Analytics & Monitoring** – multi-engine performance tracking, alerts, and reporting.

Each implementation phase should keep this DEO architecture in mind so that new features are not SEO-only, but can evolve into multi-engine discovery optimization.

---

# PHASE 0 — Monorepo Structure & Tooling

### 0.1. Create Monorepo Structure

Create the directory structure:

```
engineo/
  apps/
    web/        # Next.js 14 app (frontend)
    api/        # NestJS backend API
  packages/
    shared/     # shared types and utility
  .gitignore
  package.json
  tsconfig.base.json
  README.md
```

**Requirements:**

- Use pnpm workspaces (preferred) or Yarn workspaces.
- Configure "apps/" and "packages/" as workspace folders.
- Create a root tsconfig: `tsconfig.base.json` with base compiler options.
- Ensure Node 20+ is assumed.

### 0.2. Initialize Frontend (Next.js 14 + TS + Tailwind)

Inside `apps/web`:

Create a new Next.js app configured with:

- App Router
- TypeScript
- TailwindCSS
- `/src` directory enabled

**Required directory structure:**

```
apps/web/src/
  app/
    (marketing)/
      page.tsx
    dashboard/
      page.tsx
    projects/
      page.tsx
    settings/
      page.tsx
    layout.tsx
  components/
  lib/
```

**Requirements:**

- TailwindCSS configured with JIT.
- Global layout with a simple navigation shell (top nav + optional sidebar).
- Home page text: `EngineO.ai – Discovery Engine Optimization on Autopilot.`
- `/dashboard` renders "Dashboard placeholder".
- `/projects` renders "Projects placeholder".
- `/settings` renders "Settings placeholder".

### 0.3. Initialize Backend (NestJS)

Inside `apps/api`:

Create a NestJS project using the official CLI.

**Required structure:**

```
apps/api/src/
  app.module.ts
  main.ts
  health/
    health.module.ts
    health.controller.ts
  auth/
  users/
  projects/
```

**Add endpoint:**

- `GET /health` → `{ "status": "ok" }`

**Enable CORS** (temporary: allow all origins for development).  
**Add .env support** via `@nestjs/config`.

### 0.4. Shared Package

Inside `packages/shared`:

Create `src/index.ts` exporting shared types/interfaces, e.g.:

```typescript
export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
```

Configure TS path alias: `@engineo/shared` so both web and api can import these types.

### 0.5. Root Tooling

At repo root:

- Add **ESLint + Prettier** configs shared between apps.
- Add root scripts in `package.json`:

```json
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api start:dev",
    "dev": "concurrently \"pnpm dev:web\" \"pnpm dev:api\""
  }
}
```

- Install and configure `concurrently`.
- Ensure `.gitignore` includes standard Node/Next/Nest patterns:
  - `node_modules/`, `.next/`, `.turbo/`, `dist/`, `.env*`, etc.

---

## PHASE 0.5 — Public Marketing Website (Landing, Features, Pricing, Signup Funnel)

*(Insert this between Phase 0 and Phase 1)*

This phase creates the public-facing marketing website that visitors see before logging in. It is separate from the authenticated app UI.

### 0.5.1. Goals

- Provide a professional SaaS landing experience
- Explain EngineO.ai offering clearly
- Show pricing
- Drive signups
- SEO-optimized & fast
- Prepare for scaling into a full marketing site

### 0.5.2. Marketing Routes & Layout

Create a separate marketing route group:

```
apps/web/src/app/(marketing)/
```

Inside it, create:

- `layout.tsx` — marketing-only layout
  - Top navigation (lighter than app UI)
  - Footer
  - No sidebar
  - No authenticated UI elements
- `page.tsx` — Home / Landing Page
- `pricing/page.tsx`
- `features/page.tsx`
- `contact/page.tsx`

**Marketing Navbar:**

- **Left:**
  - Logo
  - Links: Features, Pricing
- **Right:**
  - Login
  - Button: Sign Up Free

**Marketing Footer:**

- Product links
- Docs
- Support
- Terms
- Privacy

### 0.5.3. Required Pages

**Home / Landing Page (`/`)**

**Sections:**

- Hero (headline + subheadline + primary CTA)
- Product value propositions
- Screenshots
- Shopify integration highlights
- Feature summary
- Testimonials (placeholder)
- Footer CTA

**Initial copy (placeholders permitted):**

- Hero text: "EngineO.ai — AI-Powered Discovery Engine Optimization (SEO + AEO + PEO + VEO) for eCommerce & SaaS."
- Primary CTA: "Start Free"

**Features Page (`/features`)**

Breakdown of feature categories:

- AI SEO Automation
- Content Intelligence
- Shopify SEO Optimization
- Performance Monitoring
- Competitor Insights
- Backlinks & Local SEO
- Automations

Each section should include:

- A short description
- Placeholder icons

**Pricing Page (`/pricing`)**

- Starter, Pro, Agency plans (match backend plan definitions)
- Feature comparison table
- Monthly & annual toggle
- CTA: "Sign Up Free"

**Contact Page (`/contact`)**

- Contact form UI
- Support email section

### 0.5.4. UX Requirements

- Mobile-responsive
- Fast-loading (optimized images)
- Clean, SaaS-standard spacing & typography
- SEO-optimized:
  - Title tags
  - Meta descriptions
  - OpenGraph image
  - Schema markup (basic)

### 0.5.5. Frontend Implementation Details

**Directory Structure:**

```
apps/web/src/app/(marketing)/
  layout.tsx
  page.tsx              // home
  features/page.tsx
  pricing/page.tsx
  contact/page.tsx
```

**Shared Components:**

Create reusable:

- `components/marketing/Navbar.tsx`
- `components/marketing/Footer.tsx`
- `components/marketing/Hero.tsx`
- Placeholder components for other sections

### 0.5.6. Authentication Boundary

**Marketing pages:**

- Must not require authentication
- Must not show TopNav used inside the app
- Use the marketing layout exclusively

**Authenticated pages:**

- Use the app layout (Phase 9)
- Logged-in users bypass landing page automatically if visiting `/`
- Redirect logic will be implemented in 0.5.11

### 0.5.7. Backend Requirements

No backend changes required for this phase besides ensuring:

- `/auth/login` and `/auth/signup` still work
- CORS & environment variables for production are configured

### 0.5.8. Deliverables for This Phase

- Marketing layout
- Landing page
- Features page
- Pricing page
- Contact page
- Navbar + Footer
- SEO meta setup
- Public signup funnel connected to `/signup`

### 0.5.9. Marketing Content (Copy, Features, Pricing, Contact)

**Goal:** Replace placeholder text with real, conversion-focused marketing content for all public pages.

#### 0.5.9.1. Messaging Foundations

- Define 1–2 primary personas (e.g. "Shopify store owner", "SEO agency lead").
- Write:
  - One-sentence product positioning
  - 3–5 key value props
  - 3 major pains EngineO.ai solves
- Store this in a simple markdown file:
  - `apps/web/src/marketing/messaging.md` (for future reuse in product, docs, ads).

#### 0.5.9.2. Home / Landing Page Content

Update `(marketing)/page.tsx` to use finalized copy:

- **Hero:**
  - Headline (benefit-driven, ≤ 12 words)
  - Subheadline
  - Primary CTA text ("Start free") + secondary CTA ("Book a demo" or "Learn how it works")
- **Sections:**
  - "Who it's for" (2–3 audience types)
  - 3–4 feature blocks with short descriptions
  - Shopify focus section (how it helps stores)
  - Social proof placeholders (logos/testimonials)
  - Final "Ready to get started?" CTA tied to `/signup`

#### 0.5.9.3. Features Page Content

Update `(marketing)/features/page.tsx`:

- Group features under the same buckets as the product roadmap:
  - AI SEO Automation
  - Content Intelligence
  - Shopify SEO
  - Monitoring & Reporting
  - Competitive & Backlink Intelligence
  - Local SEO & Automations
- For each bucket add:
  - Title
  - 2–3 bullet points
  - Short "Why it matters" paragraph.

#### 0.5.9.4. Pricing Page Content

Update `(marketing)/pricing/page.tsx`:

- Align plans with backend PLANS config (Starter, Pro, Agency).
- For each plan:
  - 1-line summary ("For solo stores getting started", etc.)
  - Price placeholder (can be "TBD" until Stripe live).
  - 5–7 bullets (limits, AI usage, priority features).
- Add FAQ section (4–6 common questions):
  - "Can I cancel anytime?"
  - "Do you work with agencies?"
  - "Do you support multiple stores?"
  - "What is an AI token?"
  - "Do I need a developer?"

#### 0.5.9.5. Contact Page Content

Update `(marketing)/contact/page.tsx`:

- Short intro ("Need help, or want a demo?").
- Form labels: Name, Work email, Website/Store URL, Message.
- Add static info:
  - Support email (e.g. support@engineo.ai)
  - Expected response time (e.g. "within 1 business day").

#### 0.5.9.6. SEO Meta & OG Content

For all marketing routes (`/`, `/features`, `/pricing`, `/contact`):

- Set metadata in the page files:
  - `title`
  - `description`
  - `openGraph` image (use your logo/hero image).
- Make sure copy is keyword-aware:
  - e.g. "AI SEO for Shopify", "eCommerce SEO automation", etc.

### 0.5.10. Contact Form Backend Wiring

Connect the `/contact` page form to a real backend endpoint so submissions don't just disappear.

**Backend (NestJS – `apps/api`):**

**Create Contact module:**

- **Folder:** `apps/api/src/contact`
- **Files:**
  - `contact.module.ts`
  - `contact.service.ts`
  - `contact.controller.ts`
  - `dto/create-contact.dto.ts`

**DTO & validation:**

In `create-contact.dto.ts`:

- **Fields:**
  - `name: string`
  - `email: string`
  - `company?: string`
  - `message: string`
  - (Later, add `captchaToken: string` – see 0.5.12)
- Add class-validator decorators:
  - `@IsEmail()` for email
  - `@IsString() + @IsNotEmpty()` where appropriate

**Endpoint:**

In `contact.controller.ts`:

- `POST /contact`
- Public endpoint (no auth required).
- Body: `CreateContactDto`
- Calls `ContactService.create(...)`.

**Service behavior:**

In `contact.service.ts`:

For now, implement a simple "delivery" mechanism with clear TODOs:

- Log to console in development.
- Optionally send an email via an external provider (when configured):
  ```typescript
  // Pseudocode
  await this.mailer.send({
    to: process.env.SUPPORT_EMAIL_TO,
    subject: "[EngineO.ai] New contact form submission",
    text: `Name: ...\nEmail: ...\nCompany: ...\nMessage: ...`,
  });
  ```
- Read target email from env: `SUPPORT_EMAIL_TO=support@engineo.ai`.
- Do not fail the request if email sending fails — log and return a generic success with a TODO.

**Wire module:**

- Import `ContactModule` into `AppModule`.

**Frontend (Next.js – `apps/web`):**

**Connect the form:**

On `apps/web/src/app/(marketing)/contact/page.tsx`:

- Make the form a client component and handle `onSubmit`.
- Call `POST ${NEXT_PUBLIC_API_URL}/contact` with JSON body:
  ```json
  { "name", "email", "company", "message" }
  ```

**Show:**

- **Success state:** "Thanks, we've received your message."
- **Error state:** friendly, on-brand error message:
  - e.g., "Our SEO robot tripped over a cable. Please try again in a few seconds."

**Validation UX:**

- Basic required-field checks on the client.
- Disabled state + loading indicator on the submit button while sending.

### 0.5.11. Auth-Aware Landing Redirect (`/` → `/projects` when logged in)

Ensure logged-in users skip the marketing landing and go straight into the app.

**Frontend (Next.js – `apps/web`):**

**Auth helper (if not already present):**

In `apps/web/src/lib/auth.ts` (or reuse existing):

- `getToken()` reads `engineo_token` from localStorage (browser only).
- `isAuthenticated()` returns `true` if token exists.

**Create a small wrapper component:**

**File:** `apps/web/src/components/marketing/RedirectIfAuthenticated.tsx`

**Client component:**

On mount:

- Check localStorage for `engineo_token`.
- If present, `router.replace("/projects")`.
- If not, render children.

**Pseudocode:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/projects");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null; // or a tiny spinner
  return <>{children}</>;
}
```

**Wrap the landing page:**

In `apps/web/src/app/(marketing)/page.tsx`:

Wrap the exported page content:

```typescript
import { RedirectIfAuthenticated } from "@/components/marketing/RedirectIfAuthenticated";

export default function MarketingHomePage() {
  return (
    <RedirectIfAuthenticated>
      {/* existing landing content */}
    </RedirectIfAuthenticated>
  );
}
```

**Keep other marketing routes public:**

- `/features`, `/pricing`, `/contact` should not redirect automatically.
- Only the root landing page (`/`) uses `RedirectIfAuthenticated` to send logged-in users to `/projects`.
### 0.5.12. Contact Form CAPTCHA (Anti-Bot Protection)

Add CAPTCHA to the contact form to reduce spam and automated junk submissions.

**Choice:** Use a modern, privacy-friendly CAPTCHA such as Cloudflare Turnstile or hCaptcha (Google reCAPTCHA v3 is also possible if preferred).

#### 0.5.12.1. Environment & Config

Add env vars for your chosen provider, e.g. (Turnstile example):

```
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
CAPTCHA_PROVIDER=turnstile
```

**Backend (`apps/api`):**

Create a small config service or constants file, e.g. `apps/api/src/config/captcha.config.ts`, exporting:

- `captchaProvider`
- `siteKey`
- `secretKey`

**Frontend (`apps/web`):**

Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (or equivalent) for loading the widget on the client.

#### 0.5.12.2. Frontend Integration (Contact Form)

Update `apps/web/src/app/(marketing)/contact/page.tsx`:

- Make it a client component if not already.
- Add a CAPTCHA widget just above the submit button.
- For Turnstile, use their official React snippet or a small wrapper.
- On successful CAPTCHA completion, store the token in component state.
- On submit:
  - Include `captchaToken` in the request body:
    ```json
    {
      "name": "...",
      "email": "...",
      "company": "...",
      "message": "...",
      "captchaToken": "token-from-widget"
    }
    ```

**UX details:**

- Disable submit button while verifying/sending.
- If CAPTCHA fails (token missing/expired), show a friendly error:
  - "Please verify you're not a robot and try again."

#### 0.5.12.3. Backend Verification (NestJS)

**Update CreateContactDto:**

- Add `captchaToken: string` with validation:
  - `@IsString()`
  - `@IsNotEmpty()`

**In ContactService (or a separate CaptchaService):**

Implement `verifyCaptcha(token: string, remoteIp?: string)`:

- For Turnstile, POST to:
  - `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Include:
  - `secret`: from env
  - `response`: captchaToken
  - Optionally `remoteip`: from request if you want
- If verification fails or returns low/invalid score:
  - Throw a `BadRequestException("CAPTCHA verification failed")`.

**In `contact.controller.ts`:**

- Extract IP if you want (e.g. `req.ip`) and pass to verifier.
- Only proceed to email/logging logic if CAPTCHA is valid.

#### 0.5.12.4. Security & Rate-Limit TODOs

Add TODO comments for future hardening:

- **Rate limiting:**
  - Add NestJS guard or middleware to limit `/contact` posts per IP.
- **Logging / alerting:**
  - Log repeated failed CAPTCHA attempts.
- **Abuse monitoring:**
  - Consider blocking IPs with excessive failed attempts.
 
---
# PHASE 1 — Auth, Users & Database

**Note:** Phase 1 starts with a simple Project model that will be evolved in Phase 2 to use a generic Integration model (this matches the current implementation, which uses Integration instead of connectedType).

### 1.1. Set Up Prisma + PostgreSQL

Inside `apps/api`:

1. Install Prisma and PostgreSQL client.
2. Add `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]
}

model Project {
  id            String   @id @default(cuid())
  user          User     @relation(fields: [userId], references: [id])
  userId        String
  name          String
  domain        String?
  connectedType String   // 'website' | 'shopify' (will be replaced by Integration model in Phase 2)
  createdAt     DateTime @default(now())
}
```

3. Create `.env` with `DATABASE_URL` for local Postgres.
4. Run: `npx prisma migrate dev --name init`.

### 1.2. Backend Auth Module

Inside `apps/api/src/auth`:

**Implement:**

**Endpoints:**
- `POST /auth/signup`
  - Body: `{ email, password, name? }`
  - Hash password using bcrypt.
  - Store user in DB.
- `POST /auth/login`
  - Body: `{ email, password }`
  - Validate credentials.
  - Return `{ accessToken, user }`.

**Supporting pieces:**
- `AuthModule`, `AuthService`, `AuthController`.
- `JwtModule` configured with secret and expiration.
- `LocalStrategy` + `JwtStrategy` (if using Nest Passport).
- `JwtAuthGuard` to protect routes.

**Create UsersModule with:**
- `GET /users/me` (JWT-protected) returning `UserDTO`.

### 1.3. Frontend Auth Pages

Inside `apps/web/src/app`:

**Create `/login/page.tsx`:**
- Email + password form.
- Calls `POST /auth/login`.
- On success:
  - Store JWT in localStorage as `engineo_token`.
  - Redirect to `/dashboard`.

**Create `/signup/page.tsx`:**
- Email, password, name form.
- Calls `POST /auth/signup`.
- On success:
  - Optionally auto-login, then redirect to `/dashboard`.

**Add simple client-side auth hook in `src/lib/auth.ts`:**
- `getToken()`, `setToken()`, `isAuthenticated()`.

**Implement a basic "guard" layout for dashboard routes:**
- If not authenticated, redirect to `/login`.

### 1.4. Projects Module (Backend + Frontend)

**Backend (`apps/api/src/projects`):**

Create endpoints:

- `GET /projects`
  - Returns projects for authenticated user.
- `POST /projects`
  - Body: `{ name, domain, connectedType }`.
  - Creates new project linked to `userId`.
- `GET /projects/:id`
  - Returns project by ID (only if belongs to user).
- `DELETE /projects/:id`
  - Soft delete or hard delete, your choice (MVP: hard delete).

**Frontend:**

- `/projects/page.tsx`:
  - Fetches `GET /projects` with JWT.
  - Lists projects in a table or cards.
  - "New Project" button:
    - Opens a simple form/modal.
    - POSTs to `POST /projects`.
    - Refreshes list.
- `/dashboard/page.tsx`:
  - Fetches `GET /projects`.
  - Shows summary:
    - Number of projects.
    - Last created project.
    - Link to `/projects`.

---
## PHASE 1.5 — App Shell + Branding + Docs Alignment (EngineO.ai DEO Transition)

**Author:** Narasimhan Mahendrakumar

### Phase Summary

Phase 1.5 updates the entire product surface area to reflect the new EngineO.ai brand and DEO (Discovery Engine Optimization) strategy.
This phase makes no backend, API, or schema changes.
It focuses entirely on UI shell, documentation structure, marketing copy, and system docs alignment.
This phase is required before Phase 2, which begins the DEO Feature Stack (DEO Score → Entities → Answers → Signals).

### 1.5A — App Shell Brand Alignment

#### Goals

- Replace all references to "SEOEngine.io" with EngineO.ai
- Update UI navigation labels to use DEO vocabulary
- Update layout metadata (title, description)
- Ensure dashboard shell reflects DEO as the core product

#### Scope

Files typically including:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/dashboard/layout.tsx`
- `apps/web/src/components/layout/TopNav.tsx`
- `AdminSideNav.tsx`
- `ProjectSideNav.tsx`

#### Changes

- Update metadata title → EngineO.ai – Discovery Engine Optimization (DEO) Platform
- Update metadata description → DEO description
- Update top-nav brand label → EngineO.ai
- Update any SEO-only nav labels:

| Old Label | New Label |
|-----------|-----------|
| SEO Score | DEO Score |
| On-page SEO | Answer-Ready Content |
| Technical SEO | Crawl & Technical Health |
| Backlinks | Off-site Signals |
| Keywords | Search & Intent |

#### Acceptance Criteria

- No remaining "SEOEngine.io" strings in app shell
- Navigation accurately reflects DEO concepts
- No route structure changes
- No design changes
### 1.5B — Documentation Shell Alignment

#### Goals

- Convert docs system to EngineO.ai and DEO
- Add DEO Fundamentals section
- Update README + Brand Guide
- Create placeholder DEO docs

#### Changes

- Update root `README.md` branding
- Update `BRAND_GUIDE.md` with DEO definition
- Update docs landing page title + intro
- Create new docs:
  - `docs/deo-fundamentals.md`
  - `docs/deo-score-overview.md`
  - `docs/entities-overview.md`
  - `docs/answers-overview.md`
- Update docs sidebar/navigation to include DEO Fundamentals

#### Acceptance Criteria

- Docs shell reflects EngineO.ai + DEO
- All new placeholder docs exist
- No "SEOEngine.io" remains in documentation structure

### 1.5C — Marketing Site DEO Alignment

#### Goals

- Ensure homepage, features, pricing, and about pages reflect the DEO narrative
- Update metadata for marketing pages

#### Changes

- Homepage hero updated to DEO message
- Features page → "DEO Features"
- Pricing tiers updated:
  - "SEO features" → "DEO features"
  - "AI SEO assistant" → "AI DEO assistant"
- About page updated with DEO mission statement
- All metadata updated to DEO wording
- All OG/Twitter tags reflect EngineO.ai

#### Acceptance Criteria

- Marketing copy consistently expresses DEO
- No SEOEngine.io branding remains
- Value props match product direction
### 1.5D — System Docs Sync Update

#### Goals

Synchronize system-level documentation to the new DEO vocabulary and platform direction.

#### Files Updated

- Implementation Plan (this document)
- `TOKEN_USAGE_MODEL.md`
- `PRICING_STRATEGY.md`
- `ENTITLEMENTS_MATRIX.md`
- `BILLING_ROADMAP.md`
- `architecture.md` (if present)

#### Changes

**Global terminology:**

- SEOEngine.io → EngineO.ai
- SEO → DEO (SEO + AEO + PEO + VEO)
- SEO Score → DEO Score
- On-page SEO → Answer-Ready Content
- Technical SEO → Crawl & Technical Health

**Add DEO Feature Stack:**

1. DEO Score
2. Entities & Knowledge Graph
3. Answer-Ready Content
4. Multi-Engine Signals

**Token Model Updates**

- Rename token units:
  - `seo_*` → `deo_score_*`, `deo_entity_*`, `deo_answer_*`, `deo_signal_*`
  - and add new token categories.

**Pricing Updates**

- "SEO features" → "DEO features"
- Add DEO Compute Pool definition

**Entitlements Updates**

- Add: Entity rights, Answer rights, DEO Compute multipliers

**Billing Updates**

- Add DEO compute billing steps
- Add Stripe metadata fields:
  - `deo_project_count`
  - `deo_compute_pool`
  - `deo_entity_count`
  - `deo_answer_count`

**Architecture Updates**

- Rename queues:
  - `deo_score_queue`
  - `deo_entity_queue`
  - `deo_answer_queue`
  - `deo_signal_queue`

#### Acceptance Criteria

- All system docs use EngineO.ai + DEO vocabulary
- No SEOEngine.io leftover
- All system-level features share unified DEO terminology
### 1.5E — Architecture & Infrastructure Sync

#### Goals

Update architecture and infrastructure documentation so DEO features and compute flows are consistent across:

- Workers
- Redis
- Queues
- Neon Postgres
- Render deployment structure
- Future DEO pipelines

#### Changes

**Add Redis queue naming convention:**

- `deo_score_queue`
- `deo_entity_queue`
- `deo_answer_queue`
- `deo_signal_queue`

**Add Worker responsibilities:**

| Worker | Responsibilities |
|--------|-----------------|
| DEO Score Worker | compute scores, recalc signals |
| Entity Worker | entity extraction, KG enrichment |
| Answer Worker | generate/evaluate answer units |
| Signals Worker | crawl, visibility, citation checks |

- Add Neon section (backups, branching, PITR)
- Add Render section (API, Worker, Cron)
- Add diagram showing DEO pipeline:
  - Project → Crawl → Entities → Answers → DEO Score → Signals → Dashboard

#### Acceptance Criteria

- Architecture doc matches DEO technical direction
- Queues + workers clearly documented
- Infra choices justified for upcoming Phase 2–5 features

---
## Phase 1.6 – Abuse Protection & CAPTCHA

**Goal:** Reduce spam and credential-stuffing by adding CAPTCHA protection to:

- Marketing “Contact Us” form  
- Signup flows  
- Login flows (conditional, after failed attempts)

This phase is front-end + API only. No changes to core DEO features.

---

### 1.6.1 Scope

**In-scope**

- Add CAPTCHA to:
  - Contact Us form (marketing site)
  - User signup forms
  - User login forms (shown after N failed attempts)
- Backend verification in NestJS for all three flows
- Basic rate-limiting / lockout behavior based on failed logins + CAPTCHA

**Out-of-scope**

- Advanced bot detection (device fingerprints, risk scoring)
- Per-tenant configurable providers
- Full WAF configuration

---

### 1.6.2 Behavior Specification

#### Contact Us Form

- **When:** Always show CAPTCHA.  
- **Flow:**
  1. User fills name, email, message.
  2. CAPTCHA must be successfully completed.
  3. Frontend sends `captchaToken` with the form payload.
  4. API validates CAPTCHA before:
     - Enqueuing email / notification job
     - Returning success response
- **Error states:**
  - If CAPTCHA invalid/missing: return `400` with `"captcha_failed"` error code.

#### Signup

- **When:** Always show CAPTCHA on all signup forms (email/password, magic link, etc.).
- **Flow:**
  1. User fills signup form.
  2. CAPTCHA widget required.
  3. Frontend sends `captchaToken` along with signup payload.
  4. API validates CAPTCHA before creating user, workspace, or sending verification email.
- **Error states:**
  - Invalid/missing CAPTCHA → `400` `"captcha_failed"`.

#### Login

- **When to show CAPTCHA:**  
  - Do **not** show CAPTCHA on first attempt.
  - Track failed attempts per **(IP, login identifier)** in Redis.
  - After **2 consecutive failed attempts within a short window (e.g. 15 minutes)**:
    - Frontend must render CAPTCHA.
    - Backend requires valid `captchaToken` on subsequent login attempts.

- **Backend logic (pseudo):**
  - On login failure:
    - Increment `failed_login:{ip}:{identifier}` in Redis with TTL (e.g. 15 min).
  - On login success:
    - Reset/delete that key.
  - On every login attempt:
    - If `failed_count >= 2`, require CAPTCHA verification and return `captcha_required` if missing/invalid.

- **Error states:**
  - If `failed_count >= 2` and no/invalid CAPTCHA:
    - Return `400` with `"captcha_required"` or `"captcha_failed"`.

---

### 1.6.3 Technical Design (High Level)

**Provider**

- Use a single, configurable provider (e.g. hCaptcha / Cloudflare Turnstile / reCAPTCHA v2/v3) behind an abstraction.
- Configure via environment variables:
  - `CAPTCHA_PROVIDER` (e.g. `"turnstile"`)
  - `CAPTCHA_SITE_KEY`
  - `CAPTCHA_SECRET_KEY`

**Frontend (Next.js 14, apps/web)**

- Create a shared `<Captcha />` component:
  - Wraps provider library.
  - Exposes:
    - `onVerify(token: string)`
    - `onError`
  - Stores token in local component state.
- Integrate `<Captcha />` into:
  - Contact Us page
  - Signup form(s)
  - Login page (conditionally visible)

**Backend (NestJS, apps/api)**

- Create a `CaptchaService`:
  - `verifyToken(token: string, remoteIp?: string): Promise<boolean>`
  - Calls provider API (server-side) using `CAPTCHA_SECRET_KEY`.
- Add a `CaptchaGuard` / validation pipe for:
  - Contact Us endpoint
  - Signup endpoint
  - Login endpoint (conditional, based on failed count)
- Create a small `AuthAbuseService` using Redis:
  - `incrementFailedLogin(ip, identifier)`
  - `resetFailedLogin(ip, identifier)`
  - `getFailedCount(ip, identifier)`

---

### 1.6.4 Acceptance Criteria

- **Contact Us**
  - Requests without valid CAPTCHA are rejected with a clear error.
  - Spam volume significantly reduced (once live).

- **Signup**
  - Every signup path requires valid CAPTCHA.
  - CAPTCHA errors surfaced cleanly in the UI.

- **Login**
  - First and second failed attempts **do not** require CAPTCHA.
  - From the 3rd attempt onward (within the window), CAPTCHA is required.
  - On successful login, failed-attempt counter resets and CAPTCHA no longer needed next time.

- **Security**
  - CAPTCHA secrets not logged.
  - Provider keys loaded from environment variables.
  - No leaking provider-specific tokens to logs.

- **DX**
  - CAPTCHA specifics isolated behind `CaptchaService` and `<Captcha />` component so provider can be swapped later.

---

### When in the Roadmap?

Concretely:

- **Phase 1.5** – you've just finished: brand, docs, marketing.
- **Phase 1.6 (this one)** – should happen **before**:
  - DEO Score APIs
  - Entity ingestion
  - Answer framework

So: **implement CAPTCHA in Phase 1.6, directly after 1.5 and before Phase 2 (DEO Score system).**

Looking ahead in Phase 3:

**Phase 3.2 – Auto DEO Recompute (completed)** – wires the crawl pipeline into automatic DEO recomputation so that, after each crawl, DEO signals are collected, v1 scores are recomputed, snapshots are written, and freshness timestamps (including `lastDeoComputedAt`) stay up to date without manual triggers.

**Phase 3B – DEO Issues Engine (completed)** – delivered a backend-only DEO Issues Engine that classifies problems into clear issue categories with a critical/warning/info severity model. The engine reads from existing crawl and product data plus DEO signals, counts affected surfaces, and exposes `GET /projects/:id/deo-issues` for future UX phases (project overview issue summary, product badges, and optimization workspace insights).

**Phase 3.3 – Crawl Frequency + Project Settings (completed)** – adds per-project crawl control so users can configure automatic crawling behavior. Key deliverables:
- `CrawlFrequency` enum (DAILY, WEEKLY, MONTHLY) and `autoCrawlEnabled` / `crawlFrequency` fields on Project model
- `CrawlSchedulerService.isProjectDueForCrawl()` logic that respects each project's settings during the nightly cron
- `PUT /projects/:id` endpoint for updating project settings
- Project Settings page UI (`/projects/:id/settings`) with toggle and frequency dropdown
- Auto Crawl status badge on Project Overview page
- Updated documentation in `docs/CRAWL_SCHEDULER.md`
- Added global API error handling so that 401/403 responses from authenticated endpoints redirect users to the Login page with a return URL, and network/server failures surface a friendly, retryable "can't reach server" state instead of a bare load-error banner.

If you'd like, next step I can:

- Generate a **Patch Kit 1.6** like previous phases (with specific file paths + diffs for GPT-5.1/Claude), or
- Help you pick a specific provider (Turnstile vs hCaptcha vs reCAPTCHA) and design the exact environment variable + module structure.

---

## Phase R0 — Redis Infrastructure (Upstash) — Planned

Redis is required for all asynchronous pipelines in EngineO.ai including:
- DEO Score recomputation jobs
- Crawling + indexability jobs (Phase 2.4)
- Entity extraction jobs (Phase 3+)
- Answer-ready content generation (Phase 4+)
- Future rate-limiting + billing guardrails

This phase introduces Redis into the EngineO infrastructure using **Upstash serverless Redis** for production and a matching local development setup via Docker.

### Goals of This Phase

1. Provision a production-grade, serverless Redis database on Upstash.
2. Add a local Redis environment via Docker that mirrors the Upstash configuration.
3. Create a shared Redis provider (ioredis) for the NestJS API and worker, using the Upstash TLS connection string.
4. Configure BullMQ queues (e.g., `deo_score_queue`) to use the shared Redis connection.
5. Update worker runtime to use Redis for job processing (via the same Upstash-backed `REDIS_URL`).
6. Prepare for future Redis-backed queues in Phases 2.4, 3.0, and 4.0.

### Deliverables

#### 1. Provision Redis on Upstash
- Create an Upstash Redis database from the [Upstash dashboard](https://console.upstash.com/).
- In the database view, copy:
  - `UPSTASH_REDIS_URL` (Redis TLS URL, e.g. `rediss://default:<password>@<host>.upstash.io:6379`)
  - `UPSTASH_REDIS_REST_URL` (REST URL – not used for BullMQ, but may be useful for future serverless tasks)
- Set the application connection string using the TLS URL:
  ```env
  REDIS_URL=<UPSTASH_REDIS_URL>
  ```
- Add `REDIS_URL` to:
  - Render API service environment
  - Render worker service environment

#### 2. Local Development Redis (mirrors Upstash)
- Add a Docker Compose file:
  ```yaml
  version: "3.8"
  services:
    redis:
      image: redis:7-alpine
      container_name: engineo-redis
      ports:
        - "6379:6379"
      command: ["redis-server", "--appendonly", "no"]
  ```
- Add `REDIS_URL=redis://localhost:6379` to `.env.development` and `.env.test`.
- Note in docs that local Redis is a drop-in replacement for Upstash: the same `REDIS_URL` environment variable is used, but points to `localhost` instead of the Upstash TLS endpoint.

#### 3. Redis Integration Module (API)
- Implement a `RedisClient` using ioredis.
- Add `RedisModule` that:
  - Lives under `apps/api/src/infra/redis/redis.module.ts` with provider `RedisClient` in `apps/api/src/infra/redis/redis.provider.ts`.
  - Provides the Redis connection using `process.env.REDIS_URL` (Upstash TLS URL in production; `redis://localhost:6379` in local/dev).
  - Ensures lifecycle cleanup via `OnModuleDestroy` (calling `quit()` on the shared ioredis client).
  - Optionally exposes `RedisHealthService` in `apps/api/src/infra/redis/redis.health.ts` with a simple `ping()` check.
  - Is imported into `AppModule` so Redis is available to queues, workers, and health checks.

#### 4. BullMQ Queue Integration
- Update `deo_score_queue` (Phase 2.1+) to use Redis via `RedisClient`.
- Ensure queue creation, job enqueue, and queue events use the shared Redis instance.

#### 5. Worker Runtime
- Update worker entrypoint to:
  - Load `REDIS_URL` (Upstash TLS URL in production; local Redis in development).
  - Instantiate BullMQ Worker + QueueEvents
  - Process DEO Score jobs
  - Log job completion/failures

#### 6. Optional Add-On
- Add a health check service using `client.ping()` for visibility.

### Outcomes

After Phase R0:
- Redis will be fully provisioned for local + production environments, with **Upstash Redis** as the managed production provider.
- API and workers will share a unified Redis connection string (`REDIS_URL=<UPSTASH_TLS_URL>`).
- DEO Score pipelines operate via a durable queue instead of in-process logic.
- Infrastructure is ready for:
  - Phase 2.4: Crawl/indexability jobs
  - Phase 3.0: Entity extraction pipeline
  - Phase 4.0: Answer-ready content generation
  - Phase 10: Billing/rate-limiting
  - Future Upstash-backed queues and caching workloads.

### Follow-Up Tasks After R0

- Add `crawl_queue` (Phase 2.4)
- Add `entity_extraction_queue` (Phase 3.0)
- Add `answer_generation_queue` (Phase 4.0)
- Add Redis test container for T2 integration tests

---

# PHASE 2 — Shopify Integration (MVP) using Generic Integrations

In this phase, we evolve the schema from a Shopify-specific connectedType to a generic Integration model that supports Shopify now and other platforms later. This matches the current implementation (Integration + IntegrationType.SHOPIFY).

This phase also begins the DEO Feature Stack implementation:

1. DEO Score
2. Entities & Knowledge Graph
3. Answer-ready Content Framework
4. Multi-engine Signals

### 2.0. Shopify App Setup in Shopify

Before implementing any code in this phase, create and configure the actual Shopify app in the Shopify Partner dashboard so that OAuth and API calls from EngineO.ai can succeed.

**2.0.1. Create Partner account and test store**

- Go to Shopify's Partner dashboard and sign up (or log in).
- Create at least one development store for testing the EngineO app.

**2.0.2. Create a public app**

- In the Partner dashboard, navigate to **Apps → Create app**.
- Choose **Public app** (later listable on the Shopify App Store) and name it something like `EngineO – AI SEO`.
- Set the app's **App URL / Primary URL** to your backend base URL (for local dev you can use a tunneling service like `ngrok` or `cloudflared`, e.g. `https://<random>.ngrok.io`).

**2.0.3. Configure redirect URLs**

- In app settings, add the allowed redirect URL that the NestJS backend will handle for OAuth:
  - `https://<backend-base-url>/shopify/callback`
- Make sure **App URL** and **Allowed redirection URL(s)** in Shopify match the backend config:
  - `SHOPIFY_APP_URL` → backend base URL (e.g. `https://<random>.ngrok.io`)
  - OAuth callback path → `/shopify/callback`

**2.0.4. Get API credentials and scopes**

- In the app's credentials section, obtain:
  - Client ID / API key
  - Client secret
- Decide initial scopes (minimum for MVP product SEO):
  - `read_products`
  - `write_products`
- Add these to the backend environment:
  - `SHOPIFY_API_KEY=<your-api-key>`
  - `SHOPIFY_API_SECRET=<your-api-secret>`
  - `SHOPIFY_SCOPES=read_products,write_products`
  - `SHOPIFY_APP_URL=https://<backend-base-url>`

**2.0.5. Enable app for your development store**

- From the app detail page in the Partner dashboard, click **Test your app** and install it on your development store (once the backend is ready).
- During development you will:
  - Start the NestJS API server.
  - Expose it via tunnel (if running locally).
  - Trigger OAuth from EngineO (`/shopify/install`) to install/authorize the app on the test store.

Once steps 2.0.1–2.0.5 are complete, proceed with schema + integration steps.

### 2.1. DB Evolution: Generic Integration Model

We migrate away from connectedType on Project and move to a generic Integration model that can represent Shopify and other platforms.

Update `schema.prisma`:

```prisma
enum IntegrationType {
  SHOPIFY
  // Future: WOOCOMMERCE, BIGCOMMERCE, CUSTOM_WEBSITE, etc.
}

model Integration {
  id           String          @id @default(cuid())
  project      Project         @relation(fields: [projectId], references: [id])
  projectId    String
  type         IntegrationType
  externalId   String?         // e.g. shop domain, store ID
  accessToken  String?         // Admin API token for that store
  config       Json?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model Project {
  id        String        @id @default(cuid())
  user      User          @relation(fields: [userId], references: [id])
  userId    String
  name      String
  domain    String?
  // connectedType removed in favor of integrations
  createdAt DateTime      @default(now())

  integrations Integration[]
}
```

**Migration notes:**
- If connectedType still exists in the DB, remove it during migration.
- Run:
  ```
  npx prisma migrate dev --name add_integration_model
  ```

### 2.2. Shopify OAuth Flow (Backend, using Integration)

Create `apps/api/src/shopify`:
- `shopify.module.ts`
- `shopify.service.ts`
- `shopify.controller.ts`
- Optional: `dto/`, `guards/`, `interfaces/`

**Config:**
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (your backend public URL)
- `SHOPIFY_SCOPES` (e.g. `read_products,write_products`)

**2.2.1. Service responsibilities**

`ShopifyService` should:
- Build Shopify install URL:
  - `https://{shop}/admin/oauth/authorize`
  - Params: `client_id`, `scope`, `redirect_uri`, `state`
- Validate HMAC from Shopify on callback using the app's secret.
- Validate state to map back to a `projectId` and protect against CSRF.
- Exchange code for an Admin API access token:
  - `POST https://{shop}/admin/oauth/access_token`
- Upsert an `Integration` row:
  - `type = SHOPIFY`
  - `projectId = ...`
  - `externalId = shopDomain`
  - `accessToken = token`
  - `config = JSON` with scope, etc.

Optionally, use an auxiliary table or cache for state:

```prisma
model ShopifyInstallState {
  id        String   @id @default(cuid())
  projectId String
  state     String   @unique
  createdAt DateTime @default(now())
}
```

**2.2.2. Endpoint: GET /shopify/install?projectId=...&shop=...**

- **Auth:** JWT-protected.
- **Input (query):**
  - `projectId`
  - `shop` (e.g. `mystore.myshopify.com`)
- **Steps:**
  1. Verify authenticated user owns `projectId`.
  2. Create and persist a random state.
  3. Build the Shopify OAuth URL:
     ```
     https://{shop}/admin/oauth/authorize?
       client_id=SHOPIFY_API_KEY&
       scope=SHOPIFY_SCOPES&
       redirect_uri={SHOPIFY_APP_URL}/shopify/callback&
       state={state}
     ```
  4. Respond with a 302 redirect to that URL.

**2.2.3. Endpoint: GET /shopify/callback**

- **Query params:** `shop`, `code`, `state`, `hmac`, `timestamp`, etc.
- **Steps:**
  1. Validate HMAC using all query params except `hmac` and the app's secret.
  2. Validate state:
     - Look up `ShopifyInstallState` by `state`.
     - Retrieve associated `projectId`.
  3. Exchange code for access token:
     ```
     POST https://{shop}/admin/oauth/access_token
     Content-Type: application/json

     {
       "client_id": SHOPIFY_API_KEY,
       "client_secret": SHOPIFY_API_SECRET,
       "code": code
     }
     ```
  4. From response, get:
     - `access_token`
     - `scope`
  5. Upsert `Integration` row:
     ```typescript
     await prisma.integration.upsert({
       where: {
         // one integration per project+type
         projectId_type: {
           projectId,
           type: IntegrationType.SHOPIFY
         }
       },
       update: {
         externalId: shop,
         accessToken,
         config: { scope },
       },
       create: {
         projectId,
         type: IntegrationType.SHOPIFY,
         externalId: shop,
         accessToken,
         config: { scope },
       },
     });
     ```
  6. Redirect to the frontend:
     ```
     https://app.engineo.ai/shopify/success?projectId=...&shop=...
     ```

### 2.3. Integration Status Endpoint

Create an endpoint like:

**GET /projects/:id/integration-status**

**Returns:**

```json
{
  "project": { ... },
  "shopify": {
    "connected": true | false,
    "shopDomain": "mystore.myshopify.com" | null
  }
}
```

**Implementation:**
- Query `Integration` where `projectId = :id` and `type = SHOPIFY`.
- If found, return `connected: true` and `shopDomain` from `externalId`.
- Else, `connected: false`.

### 2.4. Shopify Connect Button (Frontend)

On `/projects/[id]/page.tsx`:

- Fetch `GET /projects/:id/integration-status`.
- If not connected:
  - Show button "Connect Shopify Store".
  - On click:
    - Ask for shop domain (or let the merchant enter `mystore.myshopify.com`).
    - Call `GET /shopify/install?projectId=...&shop=....`
    - Follow redirect to Shopify.
- If connected:
  - Show `shopDomain` and a "Connected" badge.
  - Provide link to `/products` tab (Phase 5).

### 2.5. Local Development vs Production

- For local dev, use a tunnel (`ngrok`, `cloudflared`) to expose the NestJS API over HTTPS.
- Set `SHOPIFY_APP_URL` and redirect URL in the Dev Dashboard to the tunnel URL (e.g. `https://<random>.ngrok.io`).
- Ensure redirect URLs stay consistent between Shopify config and backend env.

---

# PHASE 3 — Discovery Scanner (SEO + AEO + PEO + VEO)

**Updated Scope:**  
This scanner is no longer limited to traditional SEO signals. It will evolve to support multi‑engine discovery checks including:
- SEO: title, meta description, H1, internal links, load time  
- AEO: structured data, entity extraction, answerability  
- PEO: product metadata completeness, category alignment  
- VEO: basic video metadata readiness  
The initial implementation may still focus on traditional SEO, but the architecture should be prepared for multi‑engine expansion.

### 3.1. CrawlResult Schema

Add to `schema.prisma`:

```prisma
model CrawlResult {
  id              String   @id @default(cuid())
  project         Project  @relation(fields: [projectId], references: [id])
  projectId       String
  url             String
  statusCode      Int
  title           String?
  metaDescription String?
  h1              String?
  wordCount       Int?
  loadTimeMs      Int?
  issues          Json
  scannedAt       DateTime @default(now())
}
```

**DEO Note:**
While the initial implementation focuses on SEO fields, the scanner should be designed to expand into multi-engine discovery checks. Each `issues` entry should support DEO-ready structure:

```json
{
  "engine": "seo" | "aeo" | "peo" | "veo",
  "code": "MISSING_TITLE",
  "metadata": {}
}
```

Initial implementation may always use `"engine": "seo"`, but the structure prepares the system for Phases 12–14.

Run migration.

### 3.2. SEO Scan Service (Backend)

Create `seo-scan` module:

**Endpoint:** `POST /seo-scan/start`

- **Body:** `{ projectId }`.
- Validates that the project belongs to the authenticated user.
- Fetches project domain.
- For MVP, scan only `/` (root page), plus any minimal extra paths if desired.

**Steps:**
1. Build URL (`https://{domain}/`).
2. Fetch the page (e.g. using `node-fetch` or `axios`).
3. Measure response time (ms).
4. Parse HTML (using `cheerio` or similar).
5. Extract:
   - `<title>`
   - `<meta name="description">`
   - first `<h1>`
   - basic word count (e.g. text length / 5)
6. Build issues array of strings:
   - `"MISSING_TITLE"`
   - `"MISSING_META_DESCRIPTION"`
   - `"MISSING_H1"`
   - `"THIN_CONTENT"`
7. Create `CrawlResult` row.

**Endpoint:** `GET /seo-scan/results?projectId=...`
- Returns list of `CrawlResult` for that project ordered by `scannedAt DESC`.

### 3.3. SEO Scan UI

On `/projects/[id]/page.tsx`:

- Add "Run SEO Scan" button.
- Calls `POST /seo-scan/start`.
- After success, refresh results list.
- Below, show table:
  - | URL | Status | Title | Issues | Score | Scanned |

Compute SEO Score per page (match current code):
```typescript
const score = Math.max(0, 100 - issues.length * 10);
```

Optionally show an average project score.

### 3.4. Crawl Scheduler (Phase 3.1)

Add a backend-only crawl scheduler so projects are crawled automatically without manual refresh:

- Use NestJS `@nestjs/schedule` with a cron expression `0 2 * * *` (nightly at 2:00 AM server time).
- In production, enumerate all projects and enqueue one job per project onto `crawl_queue` (BullMQ) with payload `{ projectId }`.
- In local/dev, skip Redis entirely and instead call a synchronous crawl runner (`SeoScanService.runFullProjectCrawl(projectId)`) directly for each project.
- After each crawl (queued or sync), update `project.lastCrawledAt` so future phases can derive staleness indicators.
- Do not trigger DEO recompute yet; Phase 3.2 will wire DEO score recalculation after crawls.

Wire this via:

- `CrawlSchedulerService` (cron orchestrator).
- `crawl_queue` in `apps/api/src/queues/queues.ts`.
- `CrawlProcessor` worker bound to `crawl_queue`.
- `CrawlModule` imported into `AppModule` and worker runtime.

**Constraints:**

- Backend-only change; no frontend/UI work is included in this phase.
- Aside from the optional `Project.lastCrawledAt` timestamp, no additional schema changes are introduced.
- DEO scoring formulas and worker behavior are not modified; Phase 3.1 is concerned only with scheduling and executing crawls.

**Acceptance Criteria (met):**

- A nightly cron (`0 2 * * *`) runs `CrawlSchedulerService.scheduleProjectCrawls()` and iterates over all projects.
- In production with Redis configured, the scheduler enqueues one job per project onto `crawl_queue`, and `CrawlProcessor` consumes these jobs to run `runFullProjectCrawl(projectId)` without blocking the HTTP process.
- In local/dev (or when Redis is unavailable), the scheduler falls back to calling `SeoScanService.runFullProjectCrawl(projectId)` synchronously per project.
- `Project.lastCrawledAt` is updated after successful crawls (both queued and sync), and manual crawls update the same field for consistency.
- Logs clearly show when the scheduler runs, how many projects are processed, and whether each project is handled via queue or sync mode.

### 3.5. Auto DEO Recompute (Phase 3.2)

Wire DEO score recomputation into the crawl pipeline so DEO scores stay fresh automatically.

**Scope (implemented):**

- After every successful crawl (scheduled via `CrawlProcessor` or sync via `CrawlSchedulerService` / `SeoScanService`), collect DEO signals and recompute the v1 DEO score using the shared scoring engine.
- Create a new `DeoScoreSnapshot` on every recompute, storing the overall score, component scores, timestamp, and the full `DeoScoreSignals` payload in the snapshot metadata for history and diagnostics.
- Keep `Project.currentDeoScore`, `Project.currentDeoScoreComputedAt`, and `Project.lastDeoComputedAt` updated so the Overview and related views always read fresh DEO data from existing APIs.
- In local/dev mode (no Redis), run the same crawl → signals → DEO recompute flow synchronously inside the API process after each crawl (scheduler-driven and manual `/seo-scan` endpoints).

**Constraints:**

- No UI changes in this phase; existing pages simply pick up fresher scores and timestamps via the current endpoints.
- No changes to the DEO v1 scoring formula or component weights – only orchestration is added.
- No additional schema tables or breaking changes beyond the existing `Project.lastDeoComputedAt` timestamp and `DeoScoreSnapshot` model introduced in earlier phases.

**Acceptance Criteria (met):**

- A scheduled crawl in production enqueues a `crawl_queue` job, runs `runFullProjectCrawl(projectId)`, updates `Project.lastCrawledAt`, computes DEO signals, writes a new `DeoScoreSnapshot`, and updates `Project.lastDeoComputedAt` without manual intervention.
- Manual crawls in local/dev (via SEO Scan endpoints) immediately trigger the same DEO recompute flow synchronously after the crawl completes.
- Every recompute appends a new snapshot row, even if the resulting score matches the previous snapshot (no diffing or de-duplication in v1).
- Logs clearly show the pipeline stages and timings for observability, including messages for crawl completion, signals computation, and DEO recompute completion per project.
- `GET /projects/:id/deo-score` returns updated DEO scores and timestamps that align with recent crawls and recomputes, keeping the Overview and related pages effectively "self-updating".

See `docs/CRAWL_PIPELINE.md` for detailed pipeline documentation and a full end-to-end flow description.

### 3.6. DEO Issues Engine (Phase 3B)

Introduce a backend-only DEO Issues Engine that turns raw DEO signals and crawl/product data into an actionable issue list per project:

- Implement `DeoIssuesService` in the API to aggregate `CrawlResult` + `Product` rows and `DeoScoreSignals` into a set of issue categories:
  - Missing Metadata
  - Thin Content
  - Low Entity Coverage
  - Indexability Problems
  - Answer Surface Weakness
  - Brand Navigational Weakness
  - Crawl Health / Errors
  - Product Content Depth
- Define shared types `DeoIssue` and `DeoIssuesResponse` in `packages/shared` with:
  - `id`, `title`, `description`
  - `severity`: `'critical' | 'warning' | 'info'`
  - `count` plus optional previews of `affectedPages` / `affectedProducts` (each capped at ~20 items).
- Add `GET /projects/:id/deo-issues` to `ProjectsController` to expose the issue list; issues are computed on-demand from latest crawl + product data and the current DEO signals.

**Constraints:**

- No new database schema changes in this phase; the engine reads from existing `CrawlResult`, `Product`, `Project`, and DEO snapshot/signal data only.
- No UI work; UX-4 will consume the new endpoint to render issue summaries, badges, and detailed insights.
- No changes to the DEO v1 scoring formula or component weights; issues are an interpretation layer on top of existing signals.
- Issues are computed on-demand per request; no issue data is persisted in the database.

**Acceptance Criteria (met):**

- `GET /projects/:id/deo-issues` returns a `DeoIssuesResponse` containing `projectId`, `generatedAt`, and an array of `DeoIssue` entries.
- All specified categories are implemented with severity thresholds and detection rules that match the UEP definition (including metrics like `entityCoverage`, `indexability`, `answerSurfacePresence`, `brandNavigationalStrength`, and `crawlHealth` where applicable).
- Issue count values align with underlying `CrawlResult` and `Product` data for representative test projects (e.g., thin content counts match actual short pages/products).
- The endpoint does not write any new rows or columns and remains backend-only; the existing DEO score APIs continue to function unchanged.
- The implementation is documented in `docs/deo-issues-spec.md`, which describes the issue model, categories, thresholds, and data sources.

---

# PHASE 4 — Multi‑Engine AI Metadata Engine (SEO + AEO + Product + Video)

**Updated Scope:**  
This phase now generates **DEO metadata bundles** rather than SEO‑only suggestions. The engine should support multi‑engine outputs:  
- SEO title + meta description  
- AEO answer snippet + knowledge facts  
- PEO product metadata (title, attributes, bullet points)  
- VEO video caption + tags  
The MVP may still only implement SEO titles/descriptions, but the underlying service and DTOs must be ready for multi‑engine expansion.

### 4.1. AI Integration (OpenAI or Gemini)

**Backend `ai` module:**
- Load API key(s) from `.env`.
- Implement:

```typescript
async function generateMetadata(input: {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  pageTextSnippet?: string;
  targetKeywords?: string[];
}): Promise<{
  title: string;
  description: string;
  extra?: any; // richer response allowed
}> {
  // Call AI provider with a prompt like:
  // "You are an SEO assistant. Generate an SEO-friendly title (<= 65 chars) and meta description (<= 155 chars) for the following page..."
}
```

Implementation can return a richer JSON payload as long as at minimum it includes a title and description.

**DEO Metadata Requirement:**
The `extra` field returned by `generateMetadata()` **must** be able to hold multi-engine metadata in a future-safe structure:

```json
{
  "engines": {
    "seo": { },
    "aeo": { },
    "peo": { },
    "veo": { }
  }
}
```

Even if only SEO metadata is implemented now, this ensures smooth expansion into AEO/PEO/VEO in later phases.

### 4.2. Metadata Suggestion Endpoint

**POST /ai/metadata**

**Body:**

```json
{
  "crawlResultId": "string",
  "targetKeywords": ["optional", "queries and intents"]
}
```

**Steps:**
1. Load `CrawlResult` by ID and project.
2. Compose a text snippet from page info (title, H1, meta description, etc.).
3. Call `generateMetadata`.
4. Return:

```json
{
  "current": {
    "title": "current title or null",
    "description": "current meta description or null"
  },
  "suggested": {
    "title": "SEO-optimized title",
    "description": "SEO-optimized meta description"
  },
  "raw": { ... } // optional extra data from AI
}
```

### 4.3. UI for Metadata Suggestions

In the SEO scan table:

- Add column "Actions" with button "Suggest Metadata".
- On click:
  - Call `POST /ai/metadata`.
  - Show modal with:
    - Current title + description.
    - Suggested title + description.
    - Buttons: "Copy title", "Copy description", "Copy both" (MVP can just be one "Copy to clipboard" button).

No CMS updates yet (that comes with Shopify product SEO).

---

# PHASE 5 — Product Discovery Optimization (Shopify-first, PEO Model)

**Updated Scope:**  
This phase evolves beyond "Shopify Product SEO" into **Product Engine Optimization (PEO)**. It prepares the data model and interfaces to later support Amazon, TikTok Shop, and other product engines. The existing Shopify MVP remains intact but should store product attributes in a platform‑agnostic way for future engine adapters.

This phase uses the generic Integration model with `IntegrationType.SHOPIFY`. Products are tied to projects and optionally to a specific integration via `integrationId`. The current implementation uses `externalId` instead of a Shopify-only ID field.

### 5.1. Product Schema

Update Prisma:

```prisma
model Product {
  id             String        @id @default(cuid())
  project        Project       @relation(fields: [projectId], references: [id])
  projectId      String

  integration    Integration?  @relation(fields: [integrationId], references: [id])
  integrationId  String?

  externalId     String        // Product ID from Shopify or other platforms
  source         IntegrationType

  title          String
  description    String?
  seoTitle       String?
  seoDescription String?
  imageUrls      Json?
  lastSyncedAt   DateTime      @default(now())
}
```

Run migration, making sure to match the current code's schema (this plan is aligned with the existing use of `externalId` and `source`).

### 5.2. Shopify Product Sync (Backend)

**Endpoint:** `POST /shopify/sync-products?projectId=...`

**Steps:**

1. Validate user and project.
2. Find `Integration` for the project where `type = SHOPIFY`.
3. Use the stored `accessToken` and `externalId` (shop domain) to call the Shopify Admin API (REST or GraphQL) to fetch the first N products (e.g. 50).
4. For each product:
   - Extract:
     - Shopify product ID (as `externalId`)
     - `title`
     - `body_html` or `description`
     - existing `seoTitle` / `seoDescription` fields, if available
     - image URLs
   - Upsert into `Product` table using a unique constraint on `(projectId, externalId, source)`.

### 5.3. Product List UI

**Route:** `/projects/[id]/products/page.tsx`

**Show:**
- "Sync Products" button → calls sync endpoint.
- Table columns:
  - Product title
  - External ID (Shopify ID)
  - SEO title (if any)
  - SEO description (if any)
  - Last synced
  - Actions (Scan SEO, Suggest SEO, Apply to Shopify in Phase 6)

**Backend endpoints to support this:**
- `GET /projects/:projectId/products`
  - Returns list of products for that project.

### 5.4. Product Metadata AI Suggestions

**Backend:**

**POST /ai/product-metadata**

**Body:**

```json
{
  "productId": "string",
  "targetKeywords": ["optional queries and intents"]
}
```

- Load `Product` by ID.
- Use AI to generate suggested SEO title and description based on:
  - `title`
  - `description`
  - optional `targetKeywords` (queries & intents for the product).
- Return a response similar to page metadata:

```json
{
  "current": {
    "title": "current SEO title or product title",
    "description": "current SEO description or product description"
  },
  "suggested": {
    "title": "AI SEO title",
    "description": "AI SEO description"
  },
  "raw": { ... }
}
```

**Frontend:**

- In product table row, add "Suggest SEO" button.
- Modal shows:
  - Current vs suggested SEO metadata.
  - "Apply to Shopify" (Phase 6) and/or "Copy" actions.

---

# PHASE 6 — Multi-Engine Apply Layer (Shopify-first Writer)

**Updated Scope:**  
This phase is still implemented against Shopify, but the service layer, interfaces, and DTOs should be treated as a generic "writer" for DEO metadata bundles. Shopify is the first concrete writer, with future writers planned for Amazon, TikTok Shop, YouTube (video metadata), structured data (schema/JSON-LD), and AI answer/brand profiles. The existing Shopify-specific behavior remains, but the design must allow plugging in additional writers without large refactors.

### 6.1. Shopify Update Endpoint

**Backend:**

**POST /shopify/update-product-seo**

**Body:**

```json
{
  "productId": "string",
  "seoTitle": "string",
  "seoDescription": "string"
}
```

**Steps:**
1. Validate user + project ownership.
2. Load `Product` by ID and its associated `Integration` (type `SHOPIFY`).
3. Call Shopify Admin API to update product SEO fields:
   - This can be done via:
     - Product update endpoint (if store theme uses these fields), or
     - Metafields (recommended for flexibility).
4. On success, update `Product` row in DB with new `seoTitle` and `seoDescription`.

### 6.2. Frontend Apply Buttons

In the product SEO suggestion modal:

- Add "Apply to Shopify" button.
- On click:
  - Call `/shopify/update-product-seo`.
  - Show success or error toast.
  - Update the product row with new SEO title/description.

---

# PHASE 7 — Dashboard & Reports
**Update:** Dashboard widgets should now include DEO Score (combined SEO + AEO + PEO + VEO readiness) as the primary KPI.

### 7.1. Project Overview API

**Backend:**

**GET /projects/:id/overview**

**Returns:**

```json
{
  "crawlCount": number,
  "issueCount": number,
  "avgSeoScore": number | null,
  "productCount": number,
  "productsWithAppliedSeo": number
}
```

Stats are computed from `CrawlResult` and `Product` tables.
- `crawlCount` → number of `CrawlResult` rows for the project.
- `issueCount` → total number of issues across all `CrawlResults`.
- `avgSeoScore` → initial SEO sub-score used as part of the DEO Score formula from Phase 3.
- `productCount` → number of `Product` rows for the project.
- `productsWithAppliedSeo` → count of products where `seoTitle` or `seoDescription` is set.

### 7.2. Dashboard UI

**`/dashboard/page.tsx`**
- Fetch all projects for the user.
- For each project, fetch overview.
- Show cards/rows:
  - Project name
  - DEO Score (primary KPI)
  - SEO sub-score
  - Product optimization count
  - Crawl count / issue count
  - "View project" button

**`/projects/[id]/page.tsx`**
- Show project-level cards:
  - DEO Score and sub-scores (Content, Entities, Technical, Visibility)
  - Last scan date
  - Number of issues
  - Products synced
- Buttons:
  - "Run SEO Scan"
  - "View Products"

(Reuse existing components from previous phases where possible.)

---
### 7.3. DEO Score Calculation & Storage

To make DEO Score first-class and consistent across the app, introduce a scoring model.

#### 7.3.1. Prisma Model

Add to `schema.prisma`:

```prisma
model DeoScoreSnapshot {
  id              String   @id @default(cuid())
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId       String
  overallScore    Int
  contentScore    Int?
  entityScore     Int?
  technicalScore  Int?
  visibilityScore Int?
  version         String   @default("v1")
  metadata        Json?
  computedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId, computedAt(sort: Desc)])
}
```

Extend Project with denormalized DEO fields:

```prisma
model Project {
  // existing fields...

  currentDeoScore           Int?
  currentDeoScoreComputedAt DateTime?
}
```

#### 7.3.2. Scoring Formula (Initial Version)

```typescript
overallDeoScore = Math.round(
  0.3 * content +
  0.25 * entities +
  0.25 * technical +
  0.2 * visibility
)
```

- **Content** – answer-ready content quality (coverage, depth, freshness).
- **Entities** – coverage, correctness, and schema linkage for key entities.
- **Technical** – crawl health, indexability, and Core Web Vitals.
- **Visibility** – SEO/AEO/PEO/VEO presence and brand navigational strength.

These weights and components are defined in `docs/deo-score-spec.md` and implemented in `packages/shared/src/deo-score-config.ts` / `deo-score-engine.ts` (`DEO_SCORE_WEIGHTS`, `DeoScoreComponents`).

#### 7.3.3. Aggregation Job
A worker-based aggregation flow should:

- Use `deo_score_queue` to process recompute jobs (manual triggers and scheduled runs).
- For each project, gather DEO signals (later Phase 2.x+).
- Compute component scores (content, entities, technical, visibility) and the overall DEO Score.
- Insert a `DeoScoreSnapshot` row for each computation.
- Update `Project.currentDeoScore` and `Project.currentDeoScoreComputedAt` for fast access.

API endpoints:

- `GET /projects/:id/deo-score` → latest snapshot and breakdown for the project.
- (Later phase) `GET /projects/:id/deo-score/history` → historical snapshots for trend charts.

Use this snapshot and denormalized score wherever DEO Score is displayed (dashboard cards, sidebar header).

#### 7.3.4. Implementation Status & Follow-Ups

**Phase 2.0 – Foundations (Completed)**

- Prisma `DeoScoreSnapshot` model and `Project.currentDeoScore` / `currentDeoScoreComputedAt` fields are implemented in `apps/api/prisma/schema.prisma`.
- Shared DEO Score DTOs and placeholder helper `computePlaceholderDeoScore()` live in `@engineo/shared` (see `packages/shared/src/deo-score.ts` and `deo-score-config.ts` / `deo-score-engine.ts`).
- `DeoScoreService` and `GET /projects/:id/deo-score` are wired to read the latest snapshot or create a placeholder snapshot when none exists.

**Phase 2.1 – Recompute Pipeline (Completed)**

- Added `DeoScoreJobPayload` type to the shared package (`packages/shared/src/deo-jobs.ts`).
- Registered `deo_score_queue` in the API (`apps/api/src/queues/queues.ts`).
- Added `POST /projects/:projectId/deo-score/recompute` to enqueue DEO Score recompute jobs with the shared payload.
- Implemented a worker processor for `deo_score_queue` (`DeoScoreProcessor`) that calls `DeoScoreService.createPlaceholderSnapshotForProject(projectId)`.
- Pipeline now supports asynchronous DEO Score recomputation via BullMQ.
- Documented queue, endpoint, and pipeline behavior in `docs/deo-score-spec.md` under "Phase 2.1 – Recompute Pipeline".

**Phase 2.2 – Scoring Engine (Completed)**

- Added full `DeoScoreSignals` interface covering content, entities, technical, and visibility signals.
- Implemented normalization and component score functions in the shared scoring engine (including `normalizeSignal` and component aggregation).
- Implemented `computeOverallDeoScore` using `DEO_SCORE_WEIGHTS` to produce a weighted overall DEO score.
- Added `DeoSignalsService` as a stub-based signal collector returning hardcoded 0.4–0.8 signal values.
- Implemented `computeAndPersistScoreFromSignals` in `DeoScoreService` to create real `DeoScoreSnapshot` rows and update `Project.currentDeoScore`.
- Updated the worker pipeline to run the v1 scoring engine instead of placeholder logic.
- Updated `GET /projects/:id/deo-score` behavior and `docs/deo-score-spec.md` with v1 scoring formulas and flow.

**Phase 2.3 – Real Signal Extraction (Completed)**

- Implemented real DEO pillar signals using existing DB data:
  - Content signals: `contentCoverage`, `contentDepth`, `contentFreshness`.
  - Technical signals: `crawlHealth`, `indexability`, `coreWebVitals` (placeholder 0.5).
  - Visibility proto-signals: `serpPresence`, `brandNavigationalStrength`, `answerSurfacePresence`.
  - Entity proto-signals: `entityCoverage`, heuristic `entityAccuracy`, `entityLinkage`.
- Updated `DeoSignalsService` to replace stub logic with data-driven heuristics over `CrawlResult` and `Product` tables.
- Updated the worker pipeline (`DeoScoreProcessor`) to use real signal ingestion (via `collectSignalsForProject`) feeding into the v1 scoring engine (`computeAndPersistScoreFromSignals`).
- Updated `docs/deo-score-spec.md` with Phase 2.3 heuristic v1 signal definitions, per-pillar heuristics, and the updated worker flow, including the debug endpoint.

**Phase 2.4 – Crawl Signals (Heuristic v1) (Completed)**

- Replaced remaining stubbed crawl-based signals in `DeoSignalsService` with real heuristics over existing `CrawlResult` and `Product` data (no schema changes, no external APIs).

- Implemented **Technical signals** (normalized 0–1) derived from crawl data:
  - `crawlHealth` – healthy pages (2xx/3xx, no HTTP_ERROR/FETCH_ERROR) divided by total crawled pages.
  - `indexability` – healthy pages that also have `title` + `metaDescription` and are not marked `THIN_CONTENT`.
  - `htmlStructuralQuality` – `1 - (issuePages / totalPages)` where issues include missing `title`, `metaDescription`, or `h1`, or `wordCount < 100`.
  - `thinContentQuality` – `1 - (thinPages / totalPages)` where thin pages have `wordCount < 150` or `THIN_CONTENT` in issues.
  - `coreWebVitals` – kept as a fixed placeholder value `0.5` pending later CWV integration.

- Implemented enhanced **Visibility signals** using crawl-only data:
  - `serpPresence` – fraction of pages with `title`, `metaDescription`, and `h1`.
  - `answerSurfacePresence` – fraction of pages that are healthy, have `h1`, `wordCount >= 400`, and are not marked `THIN_CONTENT`.
  - `brandNavigationalStrength` – `min(navPages / 3, 1)`, where navigational pages include `/`, `/home`, `/about`, `/contact`, `/pricing`, `/faq`, `/support`.

- Implemented heuristic **Entity signals** (v1) without changing the underlying schema:
  - `entityHintCoverage` – fraction of crawled pages with both `title` and `h1`.
  - `entityStructureAccuracy` – clamped inverse of entity structure issues (missing `title`, missing `metaDescription`, missing `h1`, or thin content), with `raw = 1 - (entityIssuePages / totalPages)` and clamping to `[0.3, 0.9]` (default `0.5` when no pages exist).
  - `entityLinkageDensity` – internal link density proxy using `internalLinkCount` when available (`min(avgInternalLinks / 20, 1)`), otherwise falling back to the existing word-count heuristic (`min(avgWordCount / 1200, 1)`).

- Extended the shared `DeoScoreSignals` type (`packages/shared/src/deo-score.ts`) with the new Phase 2.4 fields (`htmlStructuralQuality`, `thinContentQuality`, `entityHintCoverage`, `entityStructureAccuracy`, `entityLinkageDensity`) while preserving the v1 scoring engine:
  - `computeDeoScoreFromSignals` and `DEO_SCORE_WEIGHTS` remain unchanged.
  - The v1 component inputs (`entityCoverage`, `entityAccuracy`, `entityLinkage`, `crawlHealth`, `coreWebVitals`, `indexability`, `serpPresence`, `answerSurfacePresence`, `brandNavigationalStrength`) are now populated from the new heuristics.

- Kept the DEO pipeline shape stable:
  - `DeoScoreProcessor` still pulls `DeoScoreJobPayload` from `deo_score_queue`, calls `DeoSignalsService.collectSignalsForProject(projectId)`, and passes signals into `DeoScoreService.computeAndPersistScoreFromSignals`.
  - The debug endpoint `GET /projects/:id/deo-signals/debug` continues to expose the current normalized signals, now including the Phase 2.4 crawl-derived metrics.
  - Manually validated Phase 2.4 via local DEO score recomputes (using the sync recompute endpoint and frontend button) by toggling metadata, thin content, and navigational pages and confirming expected changes in signals and overall DEO score.

**Constraints:**

- Backend-only changes; no new Prisma models or columns were introduced in this phase.
- The DEO v1 scoring engine and weight configuration (`computeDeoScoreFromSignals`, `DEO_SCORE_WEIGHTS`) remained unchanged; Phase 2.4 only refines input signals.
- All heuristics operate on existing `CrawlResult` and `Product` tables; no external data sources or APIs are required.

**Acceptance Criteria (met):**

- Crawl-derived technical, visibility, and entity detail signals (e.g., `crawlHealth`, `indexability`, `htmlStructuralQuality`, `thinContentQuality`, `entityHintCoverage`, `entityStructureAccuracy`, `entityLinkageDensity`) are computed from real data and exposed via `DeoSignalsService.collectSignalsForProject`.
- The worker pipeline (`DeoScoreProcessor`) successfully consumes the enriched `DeoScoreSignals` and persists v1 DEO snapshots without errors.
- The debug endpoint `GET /projects/:id/deo-signals/debug` returns normalized 0–1 values that move in the expected direction when titles, descriptions, headings, or content depth are adjusted on a small test project.
- No schema migration is required for this phase; the application builds and runs against the existing database schema.

**Phase 2.5 – Product Signals (Heuristic v1) (Completed)**

- Extended `DeoSignalsService` so that **Product** metadata contributes to the Content and Entities components alongside crawled pages.

- **Content signals now combine pages + products** using weighted blending based on surface counts (`totalSurfaces = pageCount + productCount`):
  - `contentCoverage`: Pages (title + wordCount > 0) and Products (`(seoTitle ?? title)` + `(seoDescription ?? description)`) → weighted blend.
  - `contentDepth`: Pages (`min(avgPageWordCount / 800, 1)`) and Products (`min(avgProductWordCount / 600, 1)`) → weighted blend.
  - `contentFreshness`: Pages (age-based freshness from `scannedAt`) and Products (fraction within 90 days of `lastSyncedAt`) → weighted blend.

- **Entity signals now combine pages + products**:
  - `entityHintCoverage`: Pages (title + h1) and Products (title + description) → `entityHintTotal / totalSurfaces`.
  - `entityStructureAccuracy`: Pages (missing title/meta/h1 or thin) and Products (missing title/description or thin < 80 words) → `clamp(1 - entityIssueTotal / totalSurfaces, 0.3, 0.9)`.
  - `entityLinkage`: Pages (`min(avgPageWordCount / 1200, 1)`) and Products (`min(avgProductWordCount / 800, 1)`) → weighted blend.

- Technical and Visibility signals remain page-only in Phase 2.5 (derived from `CrawlResult`).

- Kept the DEO pipeline shape stable:
  - `DeoSignalsService.collectSignalsForProject(projectId)` now queries both `CrawlResult` and `Product` tables and computes combined signals.
  - `DeoScoreProcessor` continues to call `collectSignalsForProject` and pipe the result into `DeoScoreService.computeAndPersistScoreFromSignals`, preserving the v1 scoring engine and weights.
  - The debug endpoint `GET /projects/:id/deo-signals/debug` returns the enriched signals, now including product-influenced Content and Entity metrics.

- Updated `docs/deo-score-spec.md` with Phase 2.5 signal definitions, surface calculations, and weighted blending formulas.

**Constraints:**

- No new Prisma models or columns were added; Product signals reuse the existing `Product` table and relationships.
- The DEO v1 scoring engine remains unchanged; Product-derived metrics are blended into existing Content and Entity inputs without altering weights.
- Phase 2.5 does not change crawl behavior or introduce new worker queues; it only extends signal computation.

**Acceptance Criteria (met):**

- `DeoSignalsService.collectSignalsForProject(projectId)` incorporates both `CrawlResult` and `Product` data to populate content and entity metrics (coverage, depth, freshness, hint coverage, structure accuracy, linkage).
- The relative influence of product metadata is visible in the debug signals and resulting DEO scores when product descriptions and SEO fields are edited on a test store.
- The DEO worker (`DeoScoreProcessor`) continues to run successfully with the extended signals set and produces consistent v1 DEO scores for projects with and without products.
- Documentation in `docs/deo-score-spec.md` accurately describes how pages and products are combined into the Content and Entity components.

**Phase 2.6 – DEO Score v2 Explainability (Completed)**

- Introduced DEO Score v2 as an **explainability layer** computed alongside v1, without replacing v1 as the canonical score.
- v2 provides six human-readable components that map directly to existing DeoScoreSignals:
  - **Entity Strength** (20%): Measures entity coverage, accuracy, hint coverage, structure accuracy, and linkage.
  - **Intent Match** (20%): Measures content coverage, depth, SERP presence, answer surface, and navigational strength.
  - **Answerability** (20%): Measures content depth, coverage, answer surface presence, and content quality.
  - **AI Visibility** (20%): Measures SERP presence, answer surface, navigational strength, and indexability.
  - **Content Completeness** (15%): Measures content coverage, depth, freshness, and entity coverage.
  - **Technical Quality** (5%): Measures crawl health, indexability, HTML structure, content quality, and Core Web Vitals.

- Shared package types and helpers:
  - `DeoScoreV2Breakdown` type in `packages/shared/src/deo-score.ts`
  - `DEO_SCORE_MODEL_V2`, `DEO_SCORE_WEIGHTS_V2`, `DeoScoreV2ComponentKey`, `DeoScoreV2Components` in `packages/shared/src/deo-score-config.ts`
  - `computeDeoComponentsV2FromSignals`, `computeOverallDeoScoreV2`, `computeDeoScoreV2FromSignals` helpers in `packages/shared/src/deo-score-engine.ts`

- Backend integration in `DeoScoreService.computeAndPersistScoreFromSignals`:
  - Computes v2 breakdown from signals alongside v1
  - Derives `topOpportunities` (3 lowest-scoring components by potential gain)
  - Derives `topStrengths` (3 highest-scoring components)
  - Stores structured metadata in DeoScoreSnapshot: `{ signals, v1: { modelVersion, breakdown }, v2: { modelVersion, breakdown, components, topOpportunities, topStrengths } }`

- E2E test coverage: `apps/api/test/e2e/deo-score.e2e-spec.ts` asserts v2 metadata presence and structure.

**Constraints:**

- No Prisma schema changes; v2 data stored in existing `metadata` JSON field.
- v1 remains the canonical score; API response shape unchanged.
- No UI changes in this phase (v2 metadata-only).

**Acceptance Criteria (met):**

- v2 breakdown computed on every score recompute with all six components in range [0, 100].
- `metadata.v2` structure present in DeoScoreSnapshot with `modelVersion`, `breakdown`, `components`, `topOpportunities`, and `topStrengths`.
- E2E tests pass with v2 assertions.
- Documentation updated in `docs/deo-score-spec.md` (v2 section) and testing docs.

**Manual Testing:** `docs/manual-testing/phase-2.6-deo-score-v2-explainability.md`

---

# PHASE 8 — Two-Factor Authentication (2FA)

### 8.1. Overview

**Goal:** Add optional Two-Factor Authentication (2FA) for users using TOTP (e.g. Google Authenticator, 1Password, Authy).

**Key points:**

- 2FA is optional but recommended.
- If a user has 2FA enabled, login becomes a two-step flow:
  1. Verify email/password.
  2. Verify 6-digit TOTP code.
- Backend: NestJS (auth + 2FA module).
- Frontend: Next.js (settings screen + 2FA login step).
- DB: extend User model to store TOTP secret and flag.

### 8.2. Database Schema Changes (Prisma)

Update the User model in `apps/api/prisma/schema.prisma`:

```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  password          String
  name              String?
  twoFactorEnabled  Boolean  @default(false)
  twoFactorSecret   String?  // Base32-encoded TOTP secret
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  projects          Project[]
}
```

**Then:**
1. Create a new migration, e.g.:
   ```
   npx prisma migrate dev --name add_two_factor_auth
   ```
2. Regenerate Prisma client.

### 8.3. Backend — 2FA Module (NestJS)

Create a new module in `apps/api/src/two-factor-auth`:
- `two-factor-auth.module.ts`
- `two-factor-auth.service.ts`
- `two-factor-auth.controller.ts`

**Use libraries (or equivalents):**
- `speakeasy` for TOTP generation/verification.
- `qrcode` for QR code PNG/base64.

#### 8.3.1. Service responsibilities

In `TwoFactorAuthService`:
- Generate a TOTP secret for a user.
- Build otpauth URL:
  ```
  otpauth://totp/EngineO.ai:{email}?secret={secret}&issuer=EngineO.ai
  ```
- Generate a QR code as a base64 PNG string.
- Verify a submitted TOTP code.
- Enable/disable 2FA on the user.

#### 8.3.2. Endpoints

All endpoints below (except the 2FA verify during login) require the user to be authenticated (JWT).

**(A) POST /2fa/setup-init**

**Purpose:** Begin 2FA setup (not enabled yet).

**Input:** none (uses current authenticated user).

**Steps:**
1. Generate TOTP secret (if user doesn't already have one).
2. Save `twoFactorSecret` in DB (but keep `twoFactorEnabled = false`).
3. Generate otpauth URL.
4. Generate QR code (base64 PNG).

**Response:**

```json
{
  "otpauthUrl": "otpauth://totp/EngineO.ai:user@example.com?secret=ABC123&issuer=EngineO.ai",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

**(B) POST /2fa/enable**

**Purpose:** Confirm 2FA setup by verifying one TOTP code.

**Body:**

```json
{
  "code": "123456"
}
```

**Steps:**
1. Load user, read `twoFactorSecret`.
2. Verify TOTP with `speakeasy.totp.verify(...)`.
3. If valid:
   - Set `twoFactorEnabled = true`.
4. If invalid: return 400 with error.

**Response (on success):**

```json
{
  "success": true
}
```

**(C) POST /2fa/disable**

**Purpose:** Disable 2FA (user must be authenticated).

**Optional body:** `{ "code": "123456" }` for extra safety (optional).

**Steps:**
1. Verify user identity (and optionally TOTP).
2. Set `twoFactorEnabled = false`.
3. Optionally clear `twoFactorSecret`.

**Response:**

```json
{
  "success": true
}
```

### 8.4. Backend — Update Auth Flow (NestJS)

#### 8.4.1. Login endpoint behaviour change

In `AuthController` / `AuthService` for `POST /auth/login`:

**Current behavior (MVP):**
- Validate email/password → return JWT.

**New behavior with 2FA:**
1. Validate email/password.
2. If `twoFactorEnabled === false`:
   - Return JWT as before:
     ```json
     {
       "accessToken": "jwt...",
       "user": { ... }
     }
     ```
3. If `twoFactorEnabled === true`:
   - DO NOT return the final JWT yet.
   - Instead return a temporary token and a flag:
     ```json
     {
       "requires2FA": true,
       "tempToken": "some-signed-token-or-jwt-for-2fa-step",
       "user": { "id": "...", "email": "..." }
     }
     ```

The `tempToken` should:
- Be short-lived.
- Only allow access to the 2FA verification endpoint.

#### 8.4.2. New endpoint: POST /auth/2fa/verify

**Body:**

```json
{
  "tempToken": "string",
  "code": "123456"
}
```

**Steps:**
1. Verify `tempToken`.
2. Load user and `twoFactorSecret`.
3. Verify TOTP code with `speakeasy`.
4. If valid: return final JWT (normal `accessToken`) and user:
   ```json
   {
     "accessToken": "final-jwt-token",
     "user": { "id": "...", "email": "..." }
   }
   ```

### 8.5. Frontend — Settings UI for 2FA (Next.js)

Create a Security / Account Settings page, e.g.:
`apps/web/src/app/settings/security/page.tsx`

#### 8.5.1. Security page features

**Show:**
- Whether 2FA is currently enabled/disabled (from `/users/me`).

**If disabled:**
- Button: "Enable 2FA"
  - Calls `POST /2fa/setup-init`.
  - Shows the QR code image (`qrCodeDataUrl`).
  - Prompts user to:
    1. Scan QR code with authenticator app.
    2. Enter 6-digit code.
  - Submits code to `POST /2fa/enable`.

**If enabled:**
- Show "2FA is enabled".
- Button: "Disable 2FA" → `POST /2fa/disable` (optionally with code confirmation).

### 8.6. Frontend — Updated Login Flow

Assuming the login UI is in:
`apps/web/src/app/login/page.tsx`

#### 8.6.1. Step 1 — Email + Password

On submit call `POST /auth/login`.

**Behaviors:**
- If response has `accessToken`:
  - Normal login (store JWT, redirect to `/dashboard`).
- If response has `requires2FA: true` and `tempToken`:
  - DO NOT store `accessToken` yet.
  - Store `tempToken` in memory (state) or temporary storage.
  - Navigate to `/2fa` page for the user to enter code.

#### 8.6.2. Step 2 — 2FA Page

Create a new page:
`apps/web/src/app/2fa/page.tsx`

**Features:**

- Simple form:
  - Input: 6-digit TOTP code.
  - Hidden or internal: `tempToken` from previous step.
- On submit:
  - Call `POST /auth/2fa/verify` with `{ tempToken, code }`.
  - If successful:
    - Receive final `accessToken`.
    - Store token (e.g. localStorage, or cookie if you later upgrade).
    - Redirect to `/dashboard`.
  - If failure:
    - Show error message (e.g., "Invalid or expired code").

### 8.7. Security & UX Considerations

- Use short expiry for `tempToken` (e.g. 5–10 minutes).
- Consider rate limiting login + 2FA endpoints.
- Make error messages generic:
  - Instead of "Wrong code", consider "Invalid credentials or code" to avoid leaking info.
- Consider backup codes as a future enhancement phase.

### 8.8. Testing Checklist

**Backend**
- [ ] Migration applies successfully.
- [ ] TOTP secret generation works and is stored.
- [ ] `/2fa/setup-init` returns valid otpauth URL and QR code.
- [ ] `/2fa/enable`:
  - [ ] Accepts valid code.
  - [ ] Rejects invalid code.
- [ ] `/2fa/disable` changes flags correctly.
- [ ] `/auth/login`:
  - [ ] Normal login when 2FA disabled.
  - [ ] `requires2FA: true` and `tempToken` when enabled.
- [ ] `/auth/2fa/verify`:
  - [ ] Rejects invalid or expired `tempToken`.
  - [ ] Rejects invalid TOTP code.
  - [ ] Returns final JWT when valid.

**Frontend**
- [ ] User can enable 2FA from settings page.
- [ ] QR displays correctly and can be scanned by Google Authenticator.
- [ ] After enabling, login requires 2FA.
- [ ] Incorrect 2FA code shows an error.
- [ ] Correct code logs user in and redirects.

---

# EXECUTION NOTES FOR AI IDE

- Implement one phase at a time.
- Before coding each phase:
  - Generate a step-by-step sub-plan.
- After coding each phase:
  - Show Git diffs for human review.
- Do not change tech stack or structure without explicit instruction.
- Ask for clarification if a requirement is ambiguous.
- Prefer small, incremental commits per feature.

---

**Note:** When implementing features, assume you are a renowned SEO, eCommerce, and AI product owner with deep expertise in these domains.

---

# PHASE 9 — DEO-Aware UX & Navigation Redesign

*(Adopted DEO-first navigation as the primary UX model)*

### 9.1. DEO-Centric Global Navigation

The navigation must reflect EngineO.ai’s multi‑engine model (SEO, AEO, PEO, VEO).

**Global Top Nav (authenticated users):**
- Projects
- Content (AEO Content Engine)
- Products (PEO)
- Media (VEO-ready placeholder)
- Automations
- Performance
- Billing
- User Menu

**Project Sidebar (per‑project workspace):**
- Overview (DEO Score)
- Issues (SEO + AEO + PEO readiness issues)
- Content (AEO articles, FAQs, entities)
- Products (Shopify/Amazon)
- Media (video metadata readiness)
- Competitors
- Backlinks
- Local SEO
- Automation
- Settings

### 9.2. DEO Score Integration Everywhere

Every page in the workspace should show:
- DEO Score (combined SEO + AEO + PEO + VEO)
- Breakdown per engine

### 9.3. Unified Error Handling

Replace all earlier logic with:
- A global DEO Error Boundary
- Friendly AI‑branded error messages
- Retry logic
- End‑to‑end structured error JSON from API

---

# PHASE 10 — Admin Console, Billing & Subscription Management

**Current status:** Implemented as an **internal billing system** with a `Subscription` model and admin console. Stripe integration (real checkout sessions, customer portal, and webhook‑driven subscription updates) is planned as a follow‑up enhancement (Phase 10B) and is currently stubbed with TODOs in the billing service.

**Goal:** Add SaaS admin capabilities and subscription management, with Stripe integration planned for a later sub‑phase.

### 10.1. User Roles

**Prisma:**

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      UserRole @default(USER)
  // ... existing fields
  projects  Project[]
}
```

- Migrate: `npx prisma migrate dev --name add_user_role`.
- Update JWT payload to include role.
- Implement an `AdminGuard` in NestJS that enforces `role === ADMIN` on `/admin/*` routes.

### 10.2. Subscriptions & Plans (Internal Billing + Stripe Later)

**Prisma:**

```prisma
model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  stripeCustomerId     String?
  stripeSubscriptionId String?
  plan                 String
  status               String   // "active", "trialing", "canceled", etc.
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

Add subscription relation to User if desired.

**Backend (current implementation):**

- Implement internal subscription management:
  - `Subscription` rows created/updated directly by the API (no external payment processing yet).
  - Endpoints:
    - `GET /billing/plans` → returns available plans from in‑code config.
    - `GET /billing/subscription` (or equivalent) → returns the current user’s subscription or a default “free” state.
    - `POST /billing/subscribe` → switches the user to a new plan (DB only, no Stripe charge).
    - `POST /billing/cancel` → marks the subscription as canceled.
    - `POST /billing/webhook` → currently a stub that logs incoming events and includes TODOs for future Stripe integration.

**Plan Configuration (code, not DB at first):**

`apps/api/src/billing/plans.ts`:

```typescript
export const PLANS = {
  starter: {
    name: 'Starter',
    maxProjects: 3,
    maxProducts: 500,
    aiTokensPerMonth: 200_000,
    features: {
      shopify: true,
      advancedAutomation: false,
      competitiveIntelligence: false,
    },
  },
  pro: { ... },
  agency: { ... },
};
```

---

# PHASE 10B — Production-Ready Stripe Subscription Billing

**Status:** Not started (Stripe stubs exist in code with TODOs).

**Goal:** Convert the internal subscription system implemented in Phase 10A into a real SaaS billing system using Stripe Billing.

This includes:

- Checkout sessions
- Customer portal
- Webhook-driven subscription syncing
- Stripe customer creation
- Plan management
- Frontend billing UI
- Production-ready env variables & deployment

This phase is required before go-live and marketing launch.

### 10B.1. Stripe Setup (Backend + Environment)

**Install Stripe SDK:**

```bash
pnpm add stripe
```

**Add Render (API) environment variables:**

```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_AGENCY=price_xxx

STRIPE_SUCCESS_URL=https://app.engineo.ai/settings/billing/success
STRIPE_CANCEL_URL=https://app.engineo.ai/settings/billing/cancel
```

Create products & recurring prices in Stripe Dashboard and copy price IDs above.

### 10B.2. Extend Prisma Subscription Model

Ensure the model includes Stripe fields:

```prisma
model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  user                 User     @relation(fields: [userId], references: [id])
  stripeCustomerId     String?
  stripeSubscriptionId String?
  plan                 String
  status               String
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

**Run migration:**

```bash
npx prisma migrate dev --name stripe_subscription_fields
```

### 10B.3. API: Create Checkout Session

**POST /billing/create-checkout-session**

**Body:**

```json
{
  "plan": "starter" | "pro" | "agency"
}
```

**Flow:**

1. Authenticate user
2. Find or create Stripe customer (save to DB)
3. Load price ID from env
4. Create Stripe Checkout Session:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: STRIPE_SUCCESS_URL,
  cancel_url: STRIPE_CANCEL_URL
});
```

5. Return `session.url`

### 10B.4. API: Customer Billing Portal

**GET /billing/portal**

Creates a Stripe portal session:

```typescript
stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: "https://app.engineo.ai/settings/billing"
});
```

Return portal URL.

### 10B.5. Stripe Webhook Handler

**POST /billing/webhook**

Must use raw body parsing and verify signature:

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

**Handle events:**

**Event Types to Support:**

| Event | Behavior |
|-------|----------|
| `customer.subscription.created` | Create/update Subscription row |
| `customer.subscription.updated` | Update plan, status, period end |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.paid` | Mark status as active |
| `invoice.payment_failed` | Mark status as past_due |

The webhook becomes the source of truth for subscription state.

### 10B.6. Frontend Billing Page Enhancements

**Location:** `apps/web/src/app/settings/billing/page.tsx`

**Add:**

**Buttons:**

- Upgrade Plan → calls `/billing/create-checkout-session`
- Manage Billing → calls `/billing/portal`

**Display:**

- Current plan
- Subscription status
- Next billing date
- Past due / canceled banners

### 10B.7. Stripe Customer Creation Logic

Inside `BillingService`:

```typescript
if (!subscription.stripeCustomerId) {
  const customer = await stripe.customers.create({
    email: user.email
  });
  save stripeCustomerId;
}
```

Prevents duplicates.

### 10B.8. Map Price IDs → Internal Plan Names

**Utility:**

```typescript
function mapPriceToPlan(priceId: string): "starter" | "pro" | "agency" {
  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === env.STRIPE_PRICE_AGENCY) return "agency";
  throw new Error("Unknown price ID");
}
```

Used inside webhook handlers.

### 10B.9. Plan Enforcement Skeleton (Optional Now)

Add TODOs in:

- Project creation
- SEO scans
- Product sync limits
- AI usage

**Example:**

```typescript
// TODO: enforce plan limits
if (projectCount >= planConfig.maxProjects) {
  throw new ForbiddenException("Limit reached — upgrade your plan.");
}
```

### 10B.10. Testing Checklist (Stripe Test Mode)

**Test Scenarios:**

- Create user → upgrade to Starter
- Complete checkout using Stripe test cards
- Check webhook:
  - Subscription row created
  - Status active
- Cancel from Stripe Dashboard → webhook updates DB
- Upgrade/downgrade via Stripe Customer Portal
- Billing page updates in real time

### 10B.11. Live Mode Preparation

- Switch Stripe keys from test → live
- Add a live webhook endpoint in Stripe Dashboard
- Redeploy API to Render with live env vars
- Test live card payments with a $1 temporary plan
- Verify webhook events in production

### 10B.12. Deliverables

- Fully functional Stripe billing system
- Production-grade webhook processor
- Billing page integrated with real subscription state
- Proper environment configuration for Render & Vercel
- Full test-mode and live-mode validation
- Plan enforcement TODO hooks in place

---

## Phase 1.1 – Webhook Handling v1 (Launch)

**Status:** Completed. Added idempotent webhook handling, retries, event persistence, and safety guards.

**Summary:**

- Webhook endpoint `POST /billing/webhook` validates Stripe signature and processes `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- Added `lastStripeEventId` column to `Subscription` for idempotency: if the event ID matches, the handler returns early without re-applying changes.
- Helper methods `mapPriceIdToPlanId()` and `mapStripeSubscriptionStatus()` normalize Stripe data to internal plan IDs and status values.
- Webhook safely handles missing or unknown price IDs, logging warnings without crashing.
- Added comprehensive webhook setup instructions in `docs/STRIPE_SETUP.md`.

---

## Phase 1.2 – Checkout Session Endpoint (Launch)

**Status:** Completed.

**Summary:**

Backend now supports creation of Stripe Checkout Sessions for paid plans, while enforcing a one active subscription per user rule to avoid duplicate Stripe subscriptions.

**Endpoint:** `POST /billing/checkout`

**Request:**
```json
{ "planId": "pro" | "business" }
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

**Implementation Details:**

1. Validates `planId` is not `free` and has a configured `STRIPE_PRICE_*` env var.
2. Checks if user already has an active Stripe subscription (`stripeSubscriptionId` is not null and status is `active` or `past_due`).
3. If an active subscription exists, short-circuits and returns a Billing Portal URL instead of creating a new Checkout Session.
4. Creates or retrieves a Stripe Customer for the authenticated user.
5. Stores the `stripeCustomerId` in the `Subscription` table for future lookups.
6. Creates a Stripe Checkout Session with metadata (`userId`, `planId`) for webhook correlation.
7. Returns the session URL for frontend redirect.

**Files Modified:**

- `apps/api/src/billing/billing.service.ts` — `createCheckoutSession()` method.
- `apps/api/src/billing/billing.controller.ts` — `POST /billing/checkout` route.
- `apps/api/src/billing/plans.ts` — `STRIPE_PRICES` mapping.

---

## Phase 1.3 – Billing Portal Session Endpoint (Launch)

**Status:** Completed.

**Summary:**

Backend now supports creation of Stripe Billing Portal sessions for subscription management.

**Endpoint:** `POST /billing/portal`

**Response:**
```json
{ "url": "https://billing.stripe.com/..." }
```

**Implementation Details:**

1. Retrieves the authenticated user's subscription from the database.
2. Validates the user has a `stripeCustomerId` (returns error if not).
3. Creates a Stripe Billing Portal session with the customer ID.
4. Sets `return_url` to redirect back to `/settings/billing` after portal actions.
5. Returns the portal URL for frontend redirect.

**What Users Can Do in Portal:**

- View current subscription and billing history
- Update payment method
- Cancel subscription
- Download invoices

**Deferred to Future Phase:**

- Custom portal branding (requires Stripe Dashboard configuration)
- Restricting portal features (e.g., hiding cancel option)

**Manual Testing Steps:**

1. Subscribe to a paid plan via checkout
2. Call `POST /billing/portal` with auth token
3. Open the returned URL in a browser
4. Verify you can view subscription details and manage payment methods
5. After exiting portal, verify redirect back to `/settings/billing`

**Manual Testing:** `docs/testing/billing-and-limits.md`

**Files Modified:**

- `apps/api/src/billing/billing.service.ts` — `createPortalSession()` method.
- `apps/api/src/billing/billing.controller.ts` — `POST /billing/portal` route.

---

## Phase 1.4 – Subscription → Entitlements Sync (v1 — Launch)

**Status:** Planned

**Goal:**

Ensure that Stripe subscription state (plan + status) is the single source of truth for user entitlements in EngineO.ai. When Stripe says "user is on Plan X and active", our entitlements model must reflect that within a few seconds via webhooks.

**Scope (v1 – launch):**

- Map Stripe subscription → internal entitlements model using the existing `ENTITLEMENTS_MATRIX` and plan IDs.
- Update entitlements only via webhook-driven events (no cron, no polling).
- Handle activation, upgrade/downgrade, and cancellation flows.
- Ensure processing is idempotent and safe to re-run.

**Implementation Steps:**

1. **Identify event handler location**
   - Reuse the existing Stripe webhook handler in the billing module (`billing.controller.ts` / `billing.service.ts`).
   - Confirm where `customer.subscription.created|updated|deleted` events are currently parsed.

2. **Plan & price mapping**
   - Use the existing price/plan configuration (the same mapping used by Checkout Session creation) to map `stripe_price_id` → internal `planId`.
   - If the event's price ID is unknown, log a warning and skip entitlements changes.

3. **Entitlements write path**
   - Reuse the existing entitlements persistence mechanism (e.g., user or account record with `currentPlan` / `entitlements`).
   - Implement a single helper in the relevant service (e.g., `BillingService` or `EntitlementsService`):
     - `applySubscriptionEntitlements(userId, planId, status)`
   - Ensure this helper is purely additive (no side effects beyond entitlements/plan fields).

4. **Webhook → entitlements wiring**
   - On `customer.subscription.created` / `updated` / `deleted`:
     - Resolve internal `userId` from Stripe customer metadata or stored mapping.
     - Derive `planId` from the active price on the subscription (or `null` for cancellation).
     - Derive an internal status: `active`, `past_due`, `canceled`, etc.
     - Call `applySubscriptionEntitlements(userId, planId, status)` inside the webhook handler.

5. **Idempotency & safety**
   - Use the existing webhook idempotency mechanism (from Phase 1.1) so that multiple deliveries of the same event do not double-apply entitlements.
   - If user or plan cannot be resolved, log structured warning and return 200 from the webhook (do not break Stripe retries).

**Out-of-scope for v1 (defer to later phases):**

- Historical entitlements backfill.
- Complex multi-seat or team-level entitlements.
- Pro-rated usage visuals in the dashboard.

**Manual Testing (once implemented):**

1. Create a test user and start a Checkout Session for a paid plan.
2. Complete payment in Stripe's test mode.
3. Verify:
   - Webhook receives `customer.subscription.created` / `checkout.session.completed`.
   - Internal entitlements record is updated to the correct `planId` and `status=active`.
4. Switch the user to a different plan in Stripe; confirm entitlements update accordingly.
5. Cancel the subscription in Stripe; confirm entitlements are downgraded/removed.

**Manual Testing:** `docs/testing/billing-and-limits.md`

**Launch Acceptance Criteria:**

- For any Stripe subscription change in test mode, the matching user's entitlements are updated within webhook processing delay.
- No duplicate entitlements updates occur on replayed events.
- Unknown price IDs or unmapped customers are safely logged without crashing the webhook handler.

---

## Phase 1.5 – Entitlements Enforcement & Crawl Trigger (Launch)

**Status:** Completed

**Goal:**

Enforce plan-based entitlements across key product surfaces (projects, crawls, automation suggestions) and provide a unified crawl trigger endpoint with queue support.

**Scope:**

1. **Generic Entitlement Enforcement** — Create a reusable `enforceEntitlement()` method that validates limits for any feature type (projects, crawl, suggestions) before allowing resource-consuming actions.
2. **Crawl Trigger Endpoint** — Add `POST /projects/:id/crawl/run` that validates ownership, enforces crawl entitlements, and routes to queue (production) or synchronous (local/dev) execution.
3. **Automation Suggestion Caps** — Integrate entitlements into `AutomationService` so that daily suggestion limits respect plan-based caps.
4. **Frontend Error Handling** — Ensure ENTITLEMENTS_LIMIT_REACHED errors do not trigger login redirects and display user-friendly upgrade messages.

**Implementation Details:**

### 1. EntitlementsService Generic Enforcement

Added `EntitlementFeature` type and `enforceEntitlement()` method in `entitlements.service.ts`:

```typescript
type EntitlementFeature = 'projects' | 'crawl' | 'suggestions';

async enforceEntitlement(
  userId: string,
  feature: EntitlementFeature,
  current: number,
  allowedOverride?: number,
): Promise<void>
```

- Maps feature to the appropriate limit field in `ENTITLEMENTS_MATRIX`
- Throws `ForbiddenException` with structured payload (`code`, `plan`, `allowed`, `current`, `feature`, `message`) when limit exceeded
- Refactored `ensureCanCreateProject()` to use this method

### 2. Crawl Trigger Endpoint

Added `POST /projects/:id/crawl/run` in `projects.controller.ts`:

```typescript
@Post(':id/crawl/run')
async runCrawl(@Request() req: any, @Param('id') projectId: string)
```

- Validates project ownership via `projectsService.getProject()`
- Enforces crawl entitlement via `entitlementsService.enforceEntitlement(userId, 'crawl', 1)`
- Queue mode (production): Adds job to `crawlQueue` and returns `{ mode: 'queue', status: 'enqueued' }`
- Sync mode (local/dev): Calls `seoScanService.startScan()` directly and returns crawl result

### 3. SEO Scan Controller Enforcement

Updated `seo-scan.controller.ts`:
- Imported `BillingModule` in `seo-scan.module.ts`
- Injected `EntitlementsService` into controller
- Added crawl enforcement before `startScan()` execution

### 4. Automation Service Suggestion Caps

Updated `automation.service.ts`:
- Injected `EntitlementsService` to retrieve plan limits
- Applies `Math.min(projectDailyCap, planLimit)` to calculate effective daily cap
- Respects `-1` (unlimited) plan values

### 5. Frontend Entitlement Error Handling

Updated `apps/web/src/lib/api.ts`:
- Added check for `ENTITLEMENTS_LIMIT_REACHED` error code
- Prevents automatic redirect to login on 403 when it's an entitlements error
- Allows error to propagate to calling component for proper display

Updated `apps/web/src/app/projects/[id]/overview/page.tsx`:
- Updated `handleRunScan()` to use new `/projects/:id/crawl/run` endpoint
- Added structured error handling for entitlement errors with dynamic messaging
- Displays plan name, allowed limit, and upgrade prompt to user

**Files Modified:**

- `apps/api/src/billing/entitlements.service.ts` — Added `EntitlementFeature` type and `enforceEntitlement()` method
- `apps/api/src/billing/billing.module.ts` — Already exports EntitlementsService
- `apps/api/src/seo-scan/seo-scan.module.ts` — Added BillingModule import
- `apps/api/src/seo-scan/seo-scan.controller.ts` — Added EntitlementsService injection and crawl enforcement
- `apps/api/src/projects/automation.service.ts` — Added EntitlementsService for plan-based suggestion caps
- `apps/api/src/projects/projects.module.ts` — Added SeoScanService provider
- `apps/api/src/projects/projects.controller.ts` — Added `POST /projects/:id/crawl/run` endpoint with SeoScanService injection
- `apps/web/src/lib/api.ts` — Added ENTITLEMENTS_LIMIT_REACHED check to prevent login redirects
- `apps/web/src/app/projects/[id]/overview/page.tsx` — Updated handleRunScan with new endpoint and entitlement error handling

**Error Response Format:**

When entitlements are exceeded, API returns:

```json
{
  "code": "ENTITLEMENTS_LIMIT_REACHED",
  "plan": "free",
  "allowed": 1,
  "current": 1,
  "feature": "projects",
  "message": "You've reached the Free plan limit (1 project). Upgrade your plan to add more."
}
```

**Manual Testing Steps:**

1. Create a user on the Free plan
2. Create the maximum allowed projects (1 for Free)
3. Attempt to create another project → should receive ENTITLEMENTS_LIMIT_REACHED error
4. Verify error message displays in UI with upgrade prompt (not login redirect)
5. Run a crawl on an existing project → should succeed if within limits
6. Verify automation suggestions respect plan-based daily caps

**Manual Testing:** `docs/testing/billing-and-limits.md`

**Launch Acceptance Criteria:**

- Project creation blocked with user-friendly message when at plan limit
- Crawl trigger works via queue in production, sync in development
- Automation suggestions respect plan-based daily caps
- Frontend displays structured error messages without login redirects
- Error payloads include `code`, `plan`, `allowed`, `current`, `feature`, and `message` fields

---

## Phase 1.6 – AI Collaboration Protocol v3.2 Update

**Status:** Completed

**Goal:**

Consolidate and modernize the AI collaboration protocol documentation to ensure consistent, auditable, and deterministic multi-agent workflows across UEP, GPT-5.1 Supervisor, and Claude Implementer.

**Summary:**

1. **ENGINEO_AI_INSTRUCTIONS.md** — Complete rewrite to v3.2 format:
   - Added Human Founder role as explicit first step in the workflow chain
   - Reorganized sections for clarity: Roles → Supervision Protocol → Patch Batch Rules → Implementation Plan Workflow → Runtime Rules → Boot Prompts → Versioning
   - Updated Patch Batch format to use unified diff style exclusively (deprecated v2 anchor-based format)
   - Added explicit "No-Speculation & Architecture Alignment" section
   - Added "Safety, Idempotency, and Unknown Areas" section
   - Expanded starter boot prompts for all three agents with complete text
   - **v3.2 Key Rule:** Claude ALWAYS updates IMPLEMENTATION_PLAN.md and documentation after applying patches
   - UEP and Supervisor no longer ask "Who should update the Implementation Plan?"
   - Supervisor must end each patch output with directive to Claude

2. **SESSION_STARTER.md** — New file created:
   - Ready-to-paste boot prompts for fresh sessions
   - Contains complete prompts for UEP, GPT-5.1 Supervisor, and Claude Implementer
   - All prompts updated to v3.2 with documentation responsibility rules

3. **ENGINEO_AI_EXECUTIVE_AND_SUPERVISION_PROTOCOL.md** — Deprecated:
   - Replaced full content with deprecation notice pointing to ENGINEO_AI_INSTRUCTIONS.md
   - All protocol rules now consolidated in a single canonical document

**Files Modified:**

- `docs/ENGINEO_AI_INSTRUCTIONS.md` — Complete v3.2 rewrite
- `docs/SESSION_STARTER.md` — New file with boot prompts
- `docs/ENGINEO_AI_EXECUTIVE_AND_SUPERVISION_PROTOCOL.md` — Deprecated with redirect notice

**Manual Verification:**

1. Open `docs/ENGINEO_AI_INSTRUCTIONS.md` and verify all 8 sections are present (Purpose through Versioning)
2. Confirm the document includes complete boot prompts for UEP, GPT-5.1, and Claude
3. Verify v3.2 rule is present: "Claude ALWAYS updates IMPLEMENTATION_PLAN.md"
4. Open `docs/SESSION_STARTER.md` and verify it contains ready-to-paste boot prompts
5. Open `docs/ENGINEO_AI_EXECUTIVE_AND_SUPERVISION_PROTOCOL.md` and verify it contains only the deprecation notice
6. Verify all files are valid markdown

---

## Phase 1.7 – AI Infrastructure Hardening & Observability

**Status:** Completed

**Goal:**

Improve Gemini client reliability by fixing model name mismatch issues, add observability logging for AI product optimization, and improve frontend error handling for AI failures.

**Summary:**

1. **gemini.client.ts** — Model discovery improvements:
   - Fixed model name normalization: Gemini API returns `models/gemini-1.5-flash` but we were comparing against `gemini-1.5-flash`
   - Added `models/` prefix stripping during discovery
   - Added safe default fallback to `gemini-1.5-flash` when no desired models match
   - Added detailed logging for model discovery completion (desiredModels, availableModels, fallbackChain)
   - Added logging for each generateContent call with model name
   - Removed unused `GeminiModel` interface (inlined type)

2. **ai.controller.ts** — Observability for product optimization:
   - Wrapped `suggestProductMetadata` in try-catch for structured error logging
   - Added `[AI][ProductOptimize] suggestion_result` log with productId, projectId, success flag
   - Added `[AI][ProductOptimize] suggestion_error` log on failure

3. **Product optimization page** — Improved error handling:
   - Changed error message from raw error to friendly "AI suggestions are temporarily unavailable. Please try again later."
   - On AI failure, sets suggestion state with empty suggested values so UI remains functional
   - Preserves current product metadata in suggestion state for display

**Files Modified:**

- `apps/api/src/ai/gemini.client.ts` — Model name normalization, safe default fallback, observability logging
- `apps/api/src/ai/ai.controller.ts` — Try-catch with structured logging for product metadata suggestions
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` — Friendly error message, graceful UI degradation

**Manual Verification:**

1. Start the API and observe `[Gemini] Model discovery complete` log with normalized model names
2. Trigger AI product optimization and verify `[AI][ProductOptimize] suggestion_result` appears in logs
3. Simulate AI failure (e.g., invalid API key) and verify friendly error message appears in frontend
4. Verify the product optimization page remains functional even when AI is unavailable

**Manual Testing:** `docs/testing/ai-systems.md`

---

## Phase 1.8 – Gemini Retry Logic & Fallback Observability

**Status:** Completed

**Goal:**

Enhance the Gemini client's retry logic to handle more error scenarios and add comprehensive observability logging for the fallback chain execution.

**Summary:**

1. **isRetryableGeminiError** — Expanded retry conditions:
   - Network/transport errors (no numeric status) are now retryable
   - Added 403 and 404 as retryable (model-specific permission/availability issues)
   - 429 (rate limit) and 5xx (server errors) remain retryable
   - 4xx request errors (e.g., invalid input) are non-retryable
   - Clearer comments documenting each condition

2. **generateWithFallback** — Improved observability:
   - Added `[Gemini] generateWithFallback start` log with chain info
   - Added `[Gemini] generateWithFallback attempt` log for each model attempt with attemptIndex
   - Added `[Gemini] generateWithFallback success` log with model, attemptIndex, and usedFallback flag
   - Changed to index-based loop for better attempt tracking
   - Added `[Gemini] generateWithFallback terminating` error log when stopping
   - Added `[Gemini] generateWithFallback exhausted all models` error log at chain end
   - Improved logic: only continue if retryable AND not at end of chain

**Files Modified:**

- `apps/api/src/ai/gemini.client.ts` — Expanded retry logic and fallback observability

**Manual Verification:**

1. Start the API and trigger AI generation to see `generateWithFallback start/attempt/success` logs
2. Simulate model failures (e.g., via network issues) and verify fallback to next model with proper logging
3. Verify that non-retryable errors (4xx) terminate immediately with appropriate error log
4. Confirm `usedFallback: true` appears in success log when a fallback model was used

**Manual Testing:** `docs/testing/ai-systems.md`

---

## Phase 1.9 – AI Usage Tracking Per-Project

**Status:** Completed

**Goal:**

Track AI usage events at the project level in addition to user level, enabling per-workspace usage analytics and ensuring usage is always recorded when the AI provider is called (even on failure).

**Summary:**

1. **Prisma schema** — Added `projectId` to `AiUsageEvent`:
   - Added `project` relation and `projectId` field to `AiUsageEvent` model
   - Added `aiUsageEvents` relation to `Project` model
   - Added index on `[projectId, feature, createdAt]` for efficient per-project queries

2. **entitlements.service.ts** — Updated AI usage methods:
   - `getDailyAiUsage(userId, projectId, feature)` — Now filters by projectId
   - `ensureWithinDailyAiLimit(userId, projectId, feature)` — Added projectId parameter
   - `recordAiUsage(userId, projectId, feature)` — Now records projectId with each event
   - Updated limit_reached log to include projectId

3. **ai.controller.ts** — Improved usage recording logic:
   - Pass `product.projectId` to all entitlements methods
   - Added `providerCalled` and `recordedUsage` flags for accurate tracking
   - Record usage immediately after successful AI call
   - Record usage on failure if provider was called but usage wasn't yet recorded
   - Updated dailyCount in logs to reflect actual recorded count

**Files Modified:**

- `apps/api/prisma/schema.prisma` — Added projectId to AiUsageEvent, added relation to Project
- `apps/api/src/billing/entitlements.service.ts` — Added projectId to getDailyAiUsage, ensureWithinDailyAiLimit, recordAiUsage
- `apps/api/src/ai/ai.controller.ts` — Pass projectId to entitlements, improved usage recording logic

**Database Migration Required:**

Run `npx prisma migrate dev` to add the `projectId` column and index to `AiUsageEvent`.

**Manual Verification:**

1. Run Prisma migration to update schema
2. Trigger AI product optimization and verify `AiUsageEvent` records include `projectId`
3. Verify daily limit is enforced per user (across all projects)
4. Check logs show correct `dailyCount` values after usage is recorded
5. Simulate AI provider failure and verify usage is still recorded

**Manual Testing:** `docs/testing/ai-systems.md`

---

## Phase 1.10 – AI Limit Error UX with Upgrade Link

**Status:** Completed

**Goal:**

Improve the user experience when the daily AI suggestion limit is reached by showing a clear error message with a direct link to upgrade their plan.

**Summary:**

1. **Product optimization page** — Enhanced AI limit error handling:
   - Added `isAiLimitError` state to track when error is specifically an AI limit error
   - Set `isAiLimitError: true` when `AI_DAILY_LIMIT_REACHED` error is received
   - Reset `isAiLimitError: false` on new fetch attempts and for other error types
   - Error message now displays in a `<p>` tag for proper formatting
   - Added conditional upgrade link (`/settings/billing`) when `isAiLimitError` is true
   - Upgrade link styled with red color scheme matching error banner

**Files Modified:**

- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` — Added isAiLimitError state, upgrade link in error display

**Manual Verification:**

1. Use AI suggestions until daily limit is reached (5 for free plan)
2. Verify error message shows "Daily AI limit reached..." text
3. Verify "Upgrade your plan to unlock more AI suggestions" link appears below error
4. Click the upgrade link and verify it navigates to `/settings/billing`
5. Trigger a different error (e.g., network failure) and verify upgrade link does NOT appear

**Manual Testing:** `docs/testing/frontend-ux-feedback-and-limits.md`

---

## Phase 1.11 – FeedbackProvider & Toast Notifications

**Status:** Completed

**Goal:**

Create a unified toast notification system for consistent user feedback across all pages, with special support for entitlement limit errors that include upgrade links.

**Summary:**

1. **FeedbackProvider component** — Global toast notification system:
   - Created `apps/web/src/components/feedback/FeedbackProvider.tsx`
   - Context-based provider pattern with `useFeedback()` hook
   - Five toast variants: `success`, `error`, `info`, `warning`, `limit`
   - Auto-dismissing toasts (5s for success/info/warning, 8s for error/limit)
   - `showLimit()` method includes optional upgrade link for entitlement errors
   - Toast styling: colored backgrounds matching variant type
   - Accessible: uses `aria-live="assertive"` and `role="alert"`
   - Positioned bottom-right on mobile, top-right on desktop

2. **Layout integration** — Provider wrapped in app layout:
   - Updated `apps/web/src/app/layout.tsx`
   - `FeedbackProvider` wraps all children inside `UnsavedChangesProvider`

3. **Page integrations** — Consistent feedback across 7+ pages:
   - `projects/[id]/products/[productId]/page.tsx` — AI suggestions, Shopify updates, limit errors
   - `projects/[id]/products/page.tsx` — Products list operations
   - `projects/[id]/overview/page.tsx` — Project overview actions
   - `projects/[id]/content/[pageId]/page.tsx` — Content page optimization
   - `projects/[id]/settings/page.tsx` — Project settings updates
   - `settings/security/page.tsx` — Security settings (password changes, etc.)
   - `settings/billing/page.tsx` — Billing operations

4. **API Error integration** — Special handling for AI limits:
   - When `AI_DAILY_LIMIT_REACHED` error occurs, calls `feedback.showLimit()`
   - Limit toast includes "Upgrade" link to `/settings/billing`
   - Generic errors use `feedback.showError()` for standard error display

**Files Created:**

- `apps/web/src/components/feedback/FeedbackProvider.tsx` — Toast provider, context, and UI component

**Files Modified:**

- `apps/web/src/app/layout.tsx` — Added FeedbackProvider wrapper
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` — Integrated useFeedback hook
- `apps/web/src/app/projects/[id]/products/page.tsx` — Integrated useFeedback hook
- `apps/web/src/app/projects/[id]/overview/page.tsx` — Integrated useFeedback hook
- `apps/web/src/app/projects/[id]/content/[pageId]/page.tsx` — Integrated useFeedback hook
- `apps/web/src/app/projects/[id]/settings/page.tsx` — Integrated useFeedback hook
- `apps/web/src/settings/security/page.tsx` — Integrated useFeedback hook
- `apps/web/src/settings/billing/page.tsx` — Integrated useFeedback hook

**API Methods:**

```typescript
interface FeedbackContextValue {
  show: (variant, message, options?) => void;
  showSuccess: (message) => void;
  showError: (message) => void;
  showInfo: (message) => void;
  showWarning: (message) => void;
  showLimit: (message, actionHref?) => void;
}
```

**Manual Verification:**

1. Visit any page and trigger a success action — verify green toast appears
2. Trigger an error action — verify red toast appears with 8s duration
3. Use AI suggestions until daily limit reached — verify yellow "limit" toast with "Upgrade" link
4. Click "Upgrade" link — verify navigation to `/settings/billing`
5. Verify toasts auto-dismiss after their duration
6. Verify dismiss (X) button manually closes toasts

**Manual Testing:** `docs/testing/frontend-ux-feedback-and-limits.md`

---

## Future Phase: BILLING-2 — Stripe Webhook Robustness v2 (Post-Launch)

**Scope:**

- Add a durable `stripe_webhook_events` table to persist all incoming Stripe webhook payloads.
- Upsert events by `stripeEventId` to deduplicate Stripe retries and manual replays.
- Introduce an async background processor (queue/worker) that reads from the event table/queue and applies subscription updates idempotently, using Stripe as the source of truth.
- Support safe, repeatable replays of historical webhook events to repair subscription state after incidents.

**Operational Add-Ons:**

- Admin dashboard to inspect failed and pending webhook events and manually trigger reprocessing.
- Daily reconciliation cron job that compares Stripe subscription state with local Subscription records and repairs any drift.

**Reasoning:**

- Becomes necessary once traffic and webhook volume grow beyond the launch baseline.
- Eliminates risk of event loss during API/worker restarts or transient outages.
- Enables richer billing workflows later (invoices, usage-based billing, add-ons) on top of a durable event log.

---

# PHASE 10C — Add Free Tier + Plan Limits & Enforcement

**Goal:** Introduce a Free Tier that drives growth while protecting the platform from abuse. Includes new plan definitions, resource limits, backend enforcement logic, and upgrade UX.

### 10C.1. New Pricing Tier: FREE

**FREE ($0/mo)**

For early-stage stores evaluating EngineO.ai.

**Included:**
- 1 project
- 10 synced products
- 50k AI tokens per month
- Basic homepage SEO audit only
- Up to 3 AI metadata generations per month
- Manual product sync (no background sync)

**Not included:**
- No automation features
- No product SEO auto-apply
- No AI blog generation
- No Shopify collection SEO
- No schema generator
- No social media posting
- No competitor insights
- No keyword tracking
- No scheduled jobs
- No backups
- Community support only

**Purpose:** Allow merchants to experience initial value and strongly push them toward the Starter plan.

### 10C.2. Updated Full Tier Structure

- **FREE** — $0
  - Limits focused on evaluation.
- **Starter** — $19
  - For small shops needing basic automation.
- **Pro** — $59
  - Most popular plan. Unlocks automation, schema, blog generation, competitor tools.
- **Agency** — $199
  - Unlimited usage with strong caps on AI to prevent abuse.

### 10C.3. Updated PLANS Configuration

Modify `apps/api/src/billing/plans.ts` to:

```typescript
export const PLANS = {
  free: {
    name: "Free",
    maxProjects: 1,
    maxProducts: 10,
    aiTokens: 50_000,
    aiMetadataGenerations: 3,
    features: {
      shopify: true,
      automation: false,
      aiContent: false,
      schema: false,
      social: false,
      competitor: false,
      keywordTracking: false,
      performance: "basic",
    },
  },

  starter: {
    name: "Starter",
    maxProjects: 3,
    maxProducts: 500,
    aiTokens: 200_000,
    aiMetadataGenerations: 50,
    features: {
      shopify: true,
      automation: true,
      aiContent: "limited",
      schema: "basic",
      social: false,
      competitor: false,
      keywordTracking: "basic",
      performance: "standard",
    },
  },

  pro: {
    name: "Pro",
    maxProjects: 10,
    maxProducts: 5000,
    aiTokens: 2_000_000,
    aiMetadataGenerations: 300,
    features: {
      shopify: true,
      automation: true,
      aiContent: "full",
      schema: "full",
      social: "basic",
      competitor: "full",
      keywordTracking: "full",
      performance: "advanced",
    },
  },

  agency: {
    name: "Agency",
    maxProjects: Infinity,
    maxProducts: Infinity,
    aiTokens: 10_000_000,
    aiMetadataGenerations: Infinity,
    features: {
      shopify: true,
      automation: true,
      aiContent: "full",
      schema: "full",
      social: "full",
      competitor: "full",
      keywordTracking: "full",
      performance: "advanced",
    },
  },
};
```

### 10C.4. Backend Plan Enforcement

Add middleware/guard: `PlanLimitGuard`

**Location:** `apps/api/src/billing/plan-limit.guard.ts`

**Functions to enforce limits:**

**1. Project Creation Limit**

Block new project creation:

```typescript
if (userProjectCount >= plan.maxProjects) {
  throw new ForbiddenException("Upgrade required");
}
```

**2. Product Sync Limit**

During product sync:

```typescript
if (existingProducts + incomingProducts > plan.maxProducts) {
  throw new ForbiddenException("Upgrade to sync more products");
}
```

**3. AI Token Usage**

Wrap AI calls:

```typescript
if (currentUsage.tokens + estimatedTokens > plan.aiTokens) {
  throw new ForbiddenException("You've used all monthly AI credits. Upgrade to continue.");
}
```

**4. AI Metadata Generation Count**

```typescript
if (metadataCount >= plan.aiMetadataGenerations) {
  throw new ForbiddenException("Upgrade to generate more metadata");
}
```

**5. Feature-based Access Control**

Before executing any feature-specific endpoints:

```typescript
if (!plan.features.aiContent) throw new ForbiddenException("Upgrade required");
if (plan.features.social !== "full") ...
```

### 10C.5. Monthly Usage Reset Cron Job

Add a cron job (Render Cron or worker):

- Resets monthly token usage
- Resets metadata generation counts
- Sends summary email

### 10C.6. Frontend Enforcement & Upsell UX

**Unified "Upgrade Required" Modal**

Create component: `apps/web/src/components/billing/UpgradeModal.tsx`

**Trigger it when:**
- User exceeds product sync limits
- User hits AI token cap
- User clicks a locked feature
- User tries to access forbidden pages

**Modal Text Example:**
> You've reached your plan's limit.  
> Upgrade to Starter to unlock more AI SEO features, product sync, and automation.

**Add "locked" UI states:**

For Free plan:
- Show greyed-out buttons
- Show tooltips: "Upgrade to unlock this feature"
- For menu items, show 🔒 icon

### 10C.7. Subscription Enforcement Middleware (Frontend)

In `apps/web/src/lib/subscription.ts`:

**Logic:**
- Fetch subscription on login
- Cache in global state
- On page render, check allowed features
- If locked → show upsell modal instead of the page

**Also add:**
- Auto redirect to `/billing` if subscription expired
- Yellow banner if user is near limits
- Red banner when out of credits

### 10C.8. Shopify Store Change Monitoring

Free Tier can monitor but cannot auto-apply.

**Rules:**

If the store adds new products:
- **Free tier:** notify + prompt upgrade
- **Starter & above:**
  - Summarize changes
  - Queue actions:
    - AI product metadata generation
    - Blog/social posting
    - Schema updates

Processing pipeline uses queues added later in Phase 17.

### 10C.9. Implementation Order

Follow this sequence:

1. Update PLANS config
2. Implement Prisma migration for usage tracking:
   - `MonthlyUsage` table
   - `MetadataGenerationLog`
3. Add backend guards
4. Add frontend upgrade modal
5. Add limit banners
6. Add locked feature UI
7. Add free plan copy to marketing pages
8. Test all limits
9. Test all upgrade flows
10. Launch free tier
11. Add metrics tracking (Mixpanel or PostHog)

### 10C.10. Acceptance Criteria

- Free users can sign up and use basic SEO audit
- Free users cannot abuse AI
- Free users cannot sync full product catalogs
- Users see clear upgrade prompts
- Backend prevents all misuse
- Billing pages reflect free tier properly
- Usage resets monthly
- All plan limits enforced cleanly

### 10C.11. Future Enhancements

- Free → Starter upgrade emails
- In-app "usage meter"
- Plan recommendation engine
- Shopify App Store automated upgrade pop-ups
---

### 10.3. Admin APIs

- `GET /admin/overview` → overall metrics.
- `GET /admin/users` → list users.
- `GET /admin/projects` → list projects.
- `GET /admin/subscriptions` → list subscriptions.

Protected with admin guard.

### 10.4. Admin UI

**Routes:**

- `/admin/layout.tsx` with its own side nav:
  - Overview → `/admin/overview`
  - Users → `/admin/users`
  - Projects → `/admin/projects`
  - Subscriptions → `/admin/subscriptions`
  - Usage (placeholder)
  - System Health (placeholder)

**Screens:**

- Overview: simple metrics cards.
- Users: table listing user info, link to their projects.
- Projects: table listing projects & owner.
- Subscriptions: table listing plan, status, next billing date.

**User (non-admin) Billing UI:**

- `/settings/billing` or `/billing`:
  - Show current plan, status, next billing date.
  - Button to "Manage subscription" (opens Stripe portal).

---

# PHASE 11 — Cloud Infrastructure & Production Deployment (Render + Vercel + Neon + Cloudflare + S3)

**Goal:** Deploy EngineO.ai as a production-grade SaaS using:
- Neon for Postgres
- Render for the NestJS API
- Vercel for the Next.js frontend
- Cloudflare for DNS/SSL
- AWS S3 for DB backups
- Shopify app configured with production URLs

### 11.1. Neon (Production DB)

- Create a Neon project for production.
- Create a prod database and choose region near your main users (e.g. `us-east-1`).
- Get the `DATABASE_URL` connection string.
- In your local repo, create `.env.production` for API with:
  ```
  DATABASE_URL=postgres://...
  ```
- Run migrations against Neon from your local machine (once):
  ```
  cd apps/api
  npx prisma migrate deploy
  ```

### 11.2. Render – Backend (NestJS API)

**Create a new Render Web Service:**

- Connect to your GitHub repo.
- Root: repo root.
- Build command:
  ```
  pnpm install
  pnpm --filter api build
  ```
- Start command:
  ```
  pnpm --filter api start:prod
  ```

**Environment Variables in Render:**

```
NODE_ENV=production
DATABASE_URL=<Neon prod URL>
JWT_SECRET=...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_APP_URL=https://api.engineo.ai (once you set custom domain)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY / GEMINI_API_KEY etc.
Any other secrets.
```

**Custom Domain:**

- In Render, add a custom domain: `api.engineo.ai`.
- Render will give you a CNAME to point to from Cloudflare.

### 11.3. Vercel – Frontend (Next.js 14)

**Create a new Vercel project:**

- Connect to the same GitHub repo.
- Set project root to `apps/web` or keep root and set the correct build command.

**Build & Output:**

- Build command:
  ```
  pnpm install
  pnpm --filter web build
  ```
- Output: `.next`

**Environment Variables:**

```
NEXT_PUBLIC_API_URL=https://api.engineo.ai
Public keys if needed (e.g., public Stripe key).
```

**Domain:**

- Map `app.engineo.ai` → this Vercel project.

### 11.4. Cloudflare – DNS & SSL

- Point your domain's nameservers to Cloudflare.
- In Cloudflare DNS:
  - CNAME `app` → Vercel provided domain.
  - CNAME `api` → Render provided domain (for `api.engineo.ai`).
  - A or CNAME for `engineo.ai` → your marketing site (could also be Vercel).
- SSL:
  - Use "Full (strict)" mode for HTTPS.
  - Add basic WAF rules:
    - Rate limit obvious abusive patterns.
    - Optionally protect `/admin` routes by country/IP for extra security.

### 11.5. AWS S3 – Periodic DB Backups

Even though Neon manages backups, we'll also create our own periodic logical dumps to S3.

- Create an AWS S3 bucket, e.g. `engineo-db-backups-prod`.
- Create an AWS IAM user with:
  - Programmatic access.
  - Permissions to `s3:PutObject` on that bucket.
- Store credentials as env vars in Render (for a separate Cron Job or Worker):
  ```
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_REGION
  S3_BACKUP_BUCKET=engineo-db-backups-prod
  ```
- Create a small backup script in `apps/api/scripts/backup-db.ts` that:
  - Runs `pg_dump` against `DATABASE_URL`.
  - Streams the result to S3 (gzip).
  - File naming: `db-backup-YYYY-MM-DDTHH-mm-ss.sql.gz`.
- Create a Render Cron Job or Background Worker:
  - Schedule: once per day or every 6–12 hours.
  - Command:
    ```
    pnpm install
    pnpm --filter api exec ts-node src/scripts/backup-db.ts
    ```
  - Ensure `pg_dump` is available (Render has Postgres CLI in most images; if not, include a container).

### 11.6. Shopify App (Production)

**In Shopify Partner Dashboard:**

- Set App URL → `https://api.engineo.ai/shopify/app-home` (or wherever you land merchants).
- Redirect URI → `https://api.engineo.ai/shopify/callback`.
- Ensure scopes match your backend config.
- Use production API key/secret in Render env vars.

**Test:**

- Install the app into a production dev store.
- Run through:
  - OAuth flow.
  - Product sync.
  - SEO updates.

### 11.7. Monitoring & Go-Live

- Add uptime monitoring (e.g. UptimeRobot) for:
  - `https://app.engineo.ai`
  - `https://api.engineo.ai/health`
- Enable basic logging & alerts (Render + Vercel dashboards).
- Soft launch with test users.
- Once stable, launch publicly:
  - Marketing site updated.
  - Shopify App listing updated.

---
# PHASE 11.5 — Job Queues & Worker Architecture (BullMQ + Redis)

**Goal:** Define a consistent job + worker architecture for all asynchronous work in EngineO.ai so that later phases (SEO scans, automations, social posting, reporting) plug into a predictable and robust system.

### 11.5.1. Technology Choices

- **Queue library:** BullMQ  
- **Backend worker runtime:** Node + NestJS (separate worker process)  
- **Broker:** Redis (managed, via Upstash serverless Redis)  
- **Deployment:** Independent worker service on Render (`engineo-worker`) using the same codebase as `apps/api` but with a worker entrypoint.

### 11.5.2. Redis Configuration

Add env vars (both API and worker):

- `REDIS_URL=<UPSTASH_TLS_URL>` (e.g. `rediss://default:<password>@<host>.upstash.io:6379`)
- `REDIS_TLS=true|false`
- Optional: `REDIS_PREFIX=engineo`

Create `apps/api/src/config/redis.config.ts`:

```ts
export const redisConfig = {
  url: process.env.REDIS_URL!,
  prefix: process.env.REDIS_PREFIX ?? "engineo",
};
```

### 11.5.3. Queue Names & Responsibilities
Define the following queues:
seo_scan_queue — page scans, recrawls, bulk discovery checks.
deo_issue_queue — detection and creation of DeoIssue records.
deo_fix_queue — auto-apply fixes (metadata, schema, redirects).
product_sync_queue — product sync jobs (Shopify now, others later).
social_post_queue — social post creation and publishing.
reporting_queue — weekly/monthly report generation and email.
webhook_queue — async processing of heavy webhooks (Stripe, Shopify, etc.).
Create a central queue registry:
apps/api/src/queues/queues.ts:

import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.config";

export const seoScanQueue = new Queue("seo_scan_queue", { connection: { url: redisConfig.url } });
export const deoIssueQueue = new Queue("deo_issue_queue", { connection: { url: redisConfig.url } });
export const deoFixQueue = new Queue("deo_fix_queue", { connection: { url: redisConfig.url } });
export const productSyncQueue = new Queue("product_sync_queue", { connection: { url: redisConfig.url } });
export const socialPostQueue = new Queue("social_post_queue", { connection: { url: redisConfig.url } });
export const reportingQueue = new Queue("reporting_queue", { connection: { url: redisConfig.url } });
export const webhookQueue = new Queue("webhook_queue", { connection: { url: redisConfig.url } });
```

### 11.5.4. Job Payload Conventions
All jobs should:
Use a common jobId format: ${projectId}:${resourceType}:${resourceId}:${timestamp} where applicable.
Include projectId in payload so workers can always scope work.
Store minimal but sufficient state; fetch large objects from DB.
Examples (in packages/shared/src/jobs.ts):
// SEO scan job
export type SeoScanJob = {
  projectId: string;
  url: string;
  crawlResultId?: string;
};

// DEO issue creation job
export type DeoIssueJob = {
  projectId: string;
  url?: string;
  engine: "seo" | "aeo" | "peo" | "veo";
  type: string;
  metadata?: Record<string, any>;
};
```

### 11.5.5. Worker Service
Create worker entrypoint: apps/api/src/worker.main.ts
Connect to Redis
Register BullMQ Worker instances for each queue
Call into Nest services
Skeleton:
import { Worker } from "bullmq";
import { redisConfig } from "./config/redis.config";
import { bootstrapNestContext } from "./worker.context"; // helper to init Nest context

async function bootstrap() {
  const appContext = await bootstrapNestContext();

  new Worker(
    "seo_scan_queue",
    async job => {
      const service = appContext.get(SeoScanService);
      await service.handleJob(job.data);
    },
    { connection: { url: redisConfig.url } }
  );

  // Repeat for other queues...
}

bootstrap();
```

**Render worker service:**

- Name: `engineo-worker`
- Start command: `pnpm --filter api start:worker` (runs `node dist/worker.main.js`)

### 11.5.6. Retry & DLQ Strategy
Default retry: 3 attempts, exponential backoff (5s, 30s, 5m).
On final failure:
Leave job as failed in BullMQ.
Optionally persist into:
model FailedJob {
  id        String   @id @default(cuid())
  queueName String
  jobId     String
  projectId String?
  reason    String?
  payload   Json
  createdAt DateTime @default(now())
}
```

### 11.5.7. Integration with Later Phases
Whenever a phase says “queue a job” or “handled by workers” it should:
Import the correct queue from queues.ts.
Add a job with the documented payload object.
Keep API endpoints fast (enqueue → return).

---

# PHASE 12 — DEO Automation Engine (Full Rewrite)

**This is the unified automation engine for SEO + AEO + PEO + VEO.**

### 12.1. Core Goals
- Auto-detect issues across all engines
- Auto‑generate metadata, schema, facts, FAQs
- Auto‑apply fixes (Shopify today, Amazon/TikTok later)
- AI-driven internal linking
- Bulk alt‑text + media optimization
- Redirect management
- Automation rules for events (product added, content updated)

### 12.2. Data Models
Introduce:

```
model DeoIssue {
  id          String   @id @default(cuid())
  projectId   String
  url         String?
  engine      String   // seo | aeo | peo | veo
  type        String   // MISSING_TITLE, MISSING_SCHEMA, etc.
  severity    String
  metadata    Json
  createdAt   DateTime @default(now())
}
```

```
model RedirectRule {
  id          String   @id @default(cuid())
  projectId   String
  fromPath    String
  toPath      String
  createdAt   DateTime @default(now())
}
```

### 12.3. Automation Types
- Auto‑Fix Metadata
- Auto‑Fix Schema
- Auto‑Redirect Manager
- Auto‑Internal‑Linking
- Auto‑Alt‑Text
- Auto‑Video Optimization (placeholder)
- Auto‑AEO FAQ & Answer Snippets

### 12.4. Worker Flows
All jobs handled by queue workers (see Phase 11.5 — BullMQ Worker Architecture).

---

# PHASE 13 — AEO Content Engine (Full Rewrite)

### 13.1. Purpose
Prepare content for answer engines (ChatGPT, Gemini, Perplexity, Copilot).

### 13.2. Capabilities
- Entity extraction & knowledge graph population
- FAQ generation
- Fact cards
- Answer‑ready paragraphs
- Long‑form blog generator (SEO + AEO hybrid)
- SERP/AEO scoring

### 13.3. Models
```
model ContentAsset {
  id        String   @id @default(cuid())
  projectId String
  type      String   // blog, faq, entity, factSheet
  title     String?
  body      String?
  score     Int?
  metadata  Json
}
```

### 13.4. UI
- Content Library
- AEO Optimizer
- AI Writer with structured output modes

---

# PHASE 14 — Multi-Engine Performance Monitoring (SEO + AEO + Product) (Feature Set D)

**Updated Scope:**  
While the initial implementation may focus on early DEO metrics (starting with SEO signals like traffic, rankings, and clicks), the data model and APIs should be designed so they can later incorporate AEO and product-level discovery signals (e.g., AI answer appearance, on-site search performance, product visibility). Think of this phase as the foundation for a DEO-wide performance view, not just Google SEO.

- **Models:** `PageMetric`, `KeywordRank`
- **Integrations:**
  - Google Search Console
  - Analytics (GA4)
- **UI:** "Performance" tab with charts and trend lines.

---
### 13.5. Entities & Knowledge Graph

To support AEO and DEO, content must be mapped to entities and relationships.

#### 13.5.1. Prisma Models

Add to `schema.prisma`:

```prisma
model Entity {
  id            String   @id @default(cuid())
  project       Project  @relation(fields: [projectId], references: [id])
  projectId     String
  name          String
  type          String   // "product", "brand", "category", "person", "place", etc.
  slug          String?
  description   String?
  metadata      Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  mentions      EntityMention[]
  relationsFrom EntityRelation[] @relation("FromEntity")
  relationsTo   EntityRelation[] @relation("ToEntity")
}

model EntityMention {
  id             String        @id @default(cuid())
  project        Project       @relation(fields: [projectId], references: [id])
  projectId      String
  entity         Entity        @relation(fields: [entityId], references: [id])
  entityId       String
  contentAsset   ContentAsset? @relation(fields: [contentAssetId], references: [id])
  contentAssetId String?
  url            String?
  snippet        String?
  metadata       Json
  createdAt      DateTime      @default(now())
}

model EntityRelation {
  id           String   @id @default(cuid())
  fromEntity   Entity   @relation("FromEntity", fields: [fromEntityId], references: [id])
  fromEntityId String
  toEntity     Entity   @relation("ToEntity", fields: [toEntityId], references: [id])
  toEntityId   String
  type         String   // "belongs_to", "similar_to", "related_to", etc.
  metadata     Json
  createdAt    DateTime @default(now())
}
```

#### 13.5.2. Entity Extraction Flow
On new/updated content:

- API enqueues an entity extraction job (e.g. `aeo_entity_queue` or `deo_issue_queue`).
- Worker calls AI with content text to:
  - Extract entity names + types.
  - Suggest basic relationships.
  - Upsert entities into Entity.
  - Create EntityMention rows linking to ContentAsset or raw URL.
  - Optionally create EntityRelation rows.

#### 13.5.3. AEO Usage
Use entities to:

- Build answer snippets grouped by entity.
- Generate FAQ blocks.
- Drive schema (Product, Organization, FAQPage, etc.).

#### 13.5.4. UI
Extend AEO engine UI with Entities tab:
Table: name, type, mentions count, last updated.
Detail view: related content assets, related products (via metadata links).
---

# PHASE 15 — Competitive Intelligence (Full Rewrite)

### 15.1. Scope
- Competitor SEO analysis
- Competitor AEO presence analysis
- Product-level competitor comparison (PEO)
- Competitor backlink graph

### 15.2. Models
```
model Competitor {
  id            String @id @default(cuid())
  projectId     String
  domain        String
  metadata      Json
}
```

---

# PHASE 16 — Local DEO Engine (Full Rewrite)

### 16.1. Scope
- Local SEO for Google Maps
- Local AEO profile (hours, services, entities)
- Local landing pages
- Local keyword clusters

### 16.2. Models
```
model Location {
  id        String @id @default(cuid())
  projectId String
  name      String
  address   String
  metadata  Json
}
```

---

# PHASE 17 — Automation, Workflow & Social Media Integration (Feature Set H + Social)

**Updated Scope:**  
This phase is effectively the **Social & Automation part of the DEO Engine**. Automations and social posting should be designed to react to DEO events (new products, new content, promotions) and to publish multi-engine optimized content across channels (site, search, AI answers, and social feeds). The goal is to turn detection of change into coordinated actions across all discovery surfaces.

**Goal:** Add scheduling, reporting, tasks, chatbot, and social media auto-posting (Facebook, Instagram, LinkedIn).

### 17.1. Automation & Tasks

**Models (as previously proposed):**

```prisma
model AutomationRule {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  name        String
  type        String   // "scheduled_scan", "weekly_report", "auto_apply_seo", "social_post"
  config      Json
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Task {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  title       String
  description String?
  status      String   // "open", "in_progress", "done"
  assignedTo  String?
  dueDate     DateTime?
  createdAt   DateTime @default(now())
}
```

**Backend:**

- Scheduler (cron/worker) that runs:
  - Regular SEO scans.
  - Weekly summary emails.
  - Auto-apply low-risk metadata fixes.

### 17.2. Social Media Integrations

**Models:**

```prisma
enum SocialProvider {
  FACEBOOK
  INSTAGRAM
  LINKEDIN
}

model SocialAccount {
  id           String         @id @default(cuid())
  project      Project        @relation(fields: [projectId], references: [id])
  projectId    String
  provider     SocialProvider
  accessToken  String
  refreshToken String?
  accountId    String?        // page or profile ID
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}
```

**Backend Integration:**

- OAuth flows for:
  - LinkedIn (Share on company page).
  - Facebook + Instagram via Meta Graph API (pages & Instagram Business accounts).
- Auto-posting use case (from your bullets):
  - When a new product is launched/imported from Shopify (Phase 5 sync), or when product SEO is updated:
    - Create a "post candidate" record (e.g., in `ContentAsset` with type `social_post`).
    - If an `AutomationRule` is set for social posting:
      - AI generates a short caption & optional hashtags.
      - Backend publishes to:
        - Facebook Page (product promo post).
        - Instagram (image + caption).
        - Optionally LinkedIn.
  - Provide controls:
    - "Auto-post immediately" vs "Review before posting".
- Endpoints:
  - `POST /social/connect/:provider` → initiates OAuth.
  - `POST /social/disconnect/:provider`.
  - `POST /social/test-post` (for debugging).
  - `POST /automation/social-product-post` (internal usage by automation jobs).

**Frontend:**

- In project Settings → new tab "Social & Sharing":
  - Connect/disconnect buttons for LinkedIn, Facebook, Instagram.
  - Show which accounts are linked.
- In Automation tab:
  - Rule builder: "When new product synced → Generate + publish social post to Facebook & Instagram."
- In Products list:
  - Optional "Post to social" button per product (manual trigger).

### 17.3. AI SEO Assistant Chatbot

- **Backend endpoint:** `POST /ai/assistant`:
  - Input: `projectId`, `message`.
  - Uses project data (issues, products, metrics) to answer.
- **Frontend:**
  - Chat UI in the project Overview or "Assistant" panel.
  - Focus on answering "what should I do next?" and "summarize my SEO health this week".

### 17.4. Automated Reporting

- Weekly email report per project:
  - Summary of:
    - DEO Score and sub-score changes
    - Issues resolved / new issues
    - Top pages/products changes
    - Social posts published (if enabled)
  - Configured via `AutomationRule`.

---

# PHASE 18 — Account Security Enhancements

**Goal:** Add password resets, backup codes, and user profile management.

### 18.1. Password Reset (Forgot Password Flow)

#### 18.1.1. Backend (NestJS API)

Add new module: `password-reset`

**Routes:**

**POST /auth/password/forgot**

- **Input:** `{ email }`
- **Behavior:**
  - Generate secure reset token (random UUID).
  - Store hashed token in DB with expiration (e.g., expires in 60 min).
  - Email user a reset link: `https://app.engineo.ai/reset-password?token=<token>`
  - Return: `{ success: true }`

**POST /auth/password/reset**

- **Input:** `{ token, newPassword }`
- **Steps:**
  - Validate token + expiration.
  - Update password (bcrypt hash).
  - Invalidate token.
  - Return: `{ success: true }`

**DB Changes (Prisma):**

Add table:

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

#### 18.1.2. Frontend (Next.js)

**Routes:**
- `/forgot-password`
- `/reset-password?token=...`

**UI:**
- Step 1: enter email
- Step 2: enter new password

**Security:**
- Success messages should be generic (do not reveal whether email exists)
- Token stored only in URL; never saved in localStorage

### 18.2. Backup Codes (architecture now, UI later)

#### 18.2.1. Backend

Add to User model:

```prisma
backupCodes Json? // array of hashed codes
```

When enabling 2FA:
- Generate 10 one-time 8-digit codes.
- Hash and store them in DB.
- Display plaintext once to the user.

Add endpoint:
- `POST /auth/2fa/consume-backup-code`

#### 18.2.2. Frontend

Add section in `/settings/security`:
- "Download backup codes"
- "Regenerate backup codes"

### 18.3. User Profile Management

#### 18.3.1. Backend

Add endpoint:
- `PATCH /users/me`

**Updatable fields:**
- `name`
- `email` (future)
- `company`
- `avatar` (future)

#### 18.3.2. Frontend

**Page:** `/settings/profile`

**Form fields:**
- Name
- Company
- (Email is read-only unless verification added later)

---

# PHASE 19 — Subscription Hard Enforcement (Full Rewrite)

### 19.1. Enforce per‑engine limits
- SEO scans per month
- AEO generations per month
- PEO sync limits
- Media processing limits (VEO)

### 19.2. Middleware
Every protected endpoint must:
- Load subscription
- Load limits
- Check usage
- Throw `UPGRADE_REQUIRED` errors

### 19.3. Frontend UX
- Unified Upgrade Modal
- Usage meter banners
- Lock icons on restricted tabs

---

# PHASE 20 — Store Monitoring & Automated Actions

**Updated Scope:**  
Treat this phase as the **DEO Event Engine**. Store, content, and catalog changes should be converted into structured events that can trigger multi-engine optimization workflows (SEO fixes, product metadata updates, schema changes, AI answer profile refreshes, and social posts). This is the backbone that keeps EngineO.ai continuously in sync with the merchant's evolving store and content.

**Goal:** Implement an event-driven Shopify monitoring engine. This is one of your strongest differentiators.

### 20.1. Detecting Store Changes

**Two approaches:**

**A) Shopify Webhooks (recommended)**

Register webhooks:
- `products/create`
- `products/update`
- `collections/create`
- `blogs/create`
- `articles/create`
- `orders/create` (optional for promotions)
- `price_rules/create` (for promotions)

**Webhook endpoint:**
- `POST /shopify/webhooks/:topic`

**B) Periodic Polling (fallback)**

Every 15–60 mins:
- Compare hash of product list, blog list, price rules
- Detect changes

### 20.2. Queue Detected Events

Create new table:

```prisma
model StoreEvent {
  id          String   @id @default(cuid())
  projectId   String
  type        String   // PRODUCT_CREATED, BLOG_CREATED, PROMO_CREATED, etc.
  payload     Json     // raw Shopify data
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### 20.3. Automated Action Engine

For each new event:

**(A) New Product Created**

Queue tasks:
- AI-generate:
  - product SEO title
  - product SEO description
  - alt text for images
- Push updates back to Shopify
- Post to all connected social accounts:
  - Instagram
  - Facebook
  - LinkedIn

**(B) New Blog Post Created**

- Summarize blog post
- Generate social post caption
- Auto-publish to social accounts

**(C) New Promotion / Sale Rule**

- Generate promo announcement post
- Push to connected networks

#### 20.3.1. Task Scheduler

Create:

```prisma
model AutomationTask {
  id        String   @id @default(cuid())
  projectId String
  type      String    // AUTO_PRODUCT_SEO, AUTO_SOCIAL_POST
  payload   Json
  status    String @default("pending")
  createdAt DateTime @default(now())
  runAt     DateTime @default(now())
}
```

**Worker cron:**
- Runs every minute
- Processes pending tasks
- Handles retries & exponential backoff

**Implementation note:**
All `StoreEvent → AutomationTask` flows enqueue jobs into the BullMQ queues defined in Phase 11.5 (`productSyncQueue`, `socialPostQueue`, `deoFixQueue`, `reportingQueue`).

---

# PHASE 21 — Blog Auto-Scheduling System

**AEO Integration Requirement:**
Blog generation must leverage the AEO Content Engine from Phase 13, including entities, FAQs, answer-ready paragraphs, and structured blocks, rather than using a free-form standalone prompt.

**Goal:** Automate blog post generation and publishing on a schedule.

### 21.1. User UI for Auto Blog Posting

**Page:** `/projects/[id]/automation/blog-scheduler`

**Fields:**
- List of topic ideas
- **Frequency:**
  - Daily
  - Weekly
  - Biweekly
  - Monthly
- **Post destination:**
  - Shopify blog
  - External CMS (future)

### 21.2. Backend Scheduler

**New table:**

```prisma
model BlogSchedule {
  id          String   @id @default(cuid())
  projectId   String
  topics      Json     // array of strings
  frequency   String // DAILY/WEEKLY/MONTHLY
  nextRun     DateTime
  createdAt   DateTime @default(now())
}
```

**Cron job:**
- Runs every hour
- If `nextRun <= now`:
  - Pick next topic
  - Generate blog using AI
  - Publish to Shopify
  - Generate social media caption
  - Auto-post to socials
  - Update `nextRun` to next interval

---

# PHASE 22 — Advanced Pricing Tiers & Monetization for High-Cost AI Features

**Context:**
Phase 22 extends the billing system built in Phases 10B and 10C. It does not introduce a separate billing stack — instead it adds feature-level add-ons that layer on top of existing Stripe subscriptions and plan limits.

**Goal:** Introduce advanced pricing tiers and add-ons for compute-heavy, high-value capabilities (Phases 23–30) so you can monetize them properly and protect AI/infra costs.

This phase does **not** change core product behavior yet — it defines the pricing architecture, data model, and enforcement hooks that later phases (23–30) will plug into.

### 22.1. Scope of "Advanced Features"

Advanced features that should **not** be bundled into base Pro/Agency plans by default:

- Phase 23 — AI Competitor Intelligence Dashboard
- Phase 24 — AI SEO Opportunity Engine (if added)
- Phase 25 — Technical SEO Theme Audit
- Phase 26 — CRO AI Engine & UX Suggestions
- Phase 27 — A/B Testing & Experimentation
- Phase 28 — Review Mining & VoC Insights
- Phase 29 — Marketplace SEO (Amazon/Etsy/etc.)
- Phase 30 — AI Video & Social Content Studio

These will be gated behind **add-ons** layered on top of base plans (Free/Starter/Pro/Agency).

### 22.2. Pricing Model Overview

Base subscription tiers from Phase 10C remain:

- **Free** — Evaluation tier
- **Starter** — Small shops
- **Pro** — Growing brands
- **Agency** — High-volume stores / agencies

On top of these, introduce the following **add-on products**:

1. **Enterprise Suite Add-On** (for Phases 23–28)
   - Includes:
     - Competitor dashboard
     - AI opportunity engine
     - Theme technical audits
     - CRO recommendations
     - A/B testing
     - Review mining
   - Price range (for Stripe configuration; actual prices set in dashboard):
     - +$99–$149/mo on top of Pro
     - +$149–$199/mo on top of Agency

2. **Marketplace SEO Add-On**
   - Includes:
     - Amazon/Etsy integration
     - Listing sync
     - AI listing optimization
     - Marketplace SEO scoring
   - Pricing:
     - $29–$49/mo per marketplace (e.g. Amazon, Etsy)
     - Bundle option: $79–$99/mo for "All marketplaces"

3. **AI Video & Social Studio Add-On**
   - Includes:
     - AI short-form video templates
     - Auto-caption + hashtags
     - Auto-posting scheduler to social networks
   - Pricing:
     - $29/mo starter usage
     - $49–$59/mo heavier usage (higher AI token pool and posting limits)

4. **Competitor & CRO Bundle Add-On**
   - For users who want competitor tools & CRO, but not marketplaces or video.
   - Includes:
     - Competitor dashboard
     - Keyword overlap & gaps
     - CRO suggestions
     - A/B testing
   - Pricing:
     - $49–$79/mo, only available on top of Pro/Agency

5. **AI Usage Add-Ons (Optional, later)**
   - Buy more AI usage without upgrading plan:
     - +500k tokens → $10
     - +2M tokens → $29
   - Buy more product sync capacity:
     - +1,000 products → $9
     - +5,000 products → $29

(Exact price points will be finalized directly in Stripe Dashboard; the code only needs to map price IDs to internal add-on types.)

### 22.3. Data Model Extensions (Prisma)

Extend billing schema to support add-ons independent of base subscription.

**Step 1 — Add enum:**

```prisma
enum AddonType {
  ENTERPRISE_SUITE
  MARKETPLACE_SEO
  AI_VIDEO_STUDIO
  COMPETITOR_CRO
  EXTRA_AI_TOKENS
  EXTRA_PRODUCTS
}
```

**Step 2 — Add SubscriptionAddon model:**

```prisma
model SubscriptionAddon {
  id             String      @id @default(cuid())
  user           User        @relation(fields: [userId], references: [id])
  userId         String
  type           AddonType
  stripePriceId  String?     // price that created this addon
  status         String      // "active", "canceled", "past_due"
  quantity       Int         @default(1) // for usage-based addons like EXTRA_AI_TOKENS
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

**Step 3 — Migration**

- Update `schema.prisma` as above.
- Run:
  ```bash
  npx prisma migrate dev --name add_subscription_addons
  ```

### 22.4. Backend Plan & Add-On Configuration

Extend `apps/api/src/billing/plans.ts`:

1. Keep `PLANS` as defined in Phase 10C (including Free).
2. Introduce a new `ADDONS` config object:

```typescript
export const ADDONS = {
  enterpriseSuite: {
    type: "ENTERPRISE_SUITE" as const,
    name: "Enterprise Suite",
    description: "Competitors, CRO, A/B tests, review mining, and advanced insights.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_ENTERPRISE_SUITE",
    // Soft limits for advanced features (can be tuned later)
    limits: {
      competitorDomains: 10,
      abTestsPerMonth: 20,
      themeAuditsPerMonth: 4,
      reviewMiningRunsPerMonth: 20,
    },
  },
  marketplaceSeo: {
    type: "MARKETPLACE_SEO" as const,
    name: "Marketplace SEO",
    description: "AI SEO for Amazon, Etsy, and other marketplaces.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_MARKETPLACE_SEO",
    // Per-marketplace limits applied elsewhere
  },
  aiVideoStudio: {
    type: "AI_VIDEO_STUDIO" as const,
    name: "AI Video & Social Studio",
    description: "AI-generated product videos and social posts.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_AI_VIDEO_STUDIO",
    limits: {
      videosPerMonth: 50,
      socialPostsPerMonth: 200,
    },
  },
  competitorCro: {
    type: "COMPETITOR_CRO" as const,
    name: "Competitor & CRO Bundle",
    description: "Competitor intel, CRO suggestions, and experiments.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_COMPETITOR_CRO",
  },
  extraAiTokens: {
    type: "EXTRA_AI_TOKENS" as const,
    name: "Extra AI Tokens",
    description: "Additional AI credits on top of your plan.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_EXTRA_AI_TOKENS",
  },
  extraProducts: {
    type: "EXTRA_PRODUCTS" as const,
    name: "Extra Product Capacity",
    description: "Sync more products without changing your base plan.",
    stripePriceEnvKey: "STRIPE_PRICE_ADDON_EXTRA_PRODUCTS",
  },
} as const;
```

3. Expose helper functions:
   - `getPlanForUser(userId)`
   - `getActiveAddonsForUser(userId)`
   - `hasAddon(userId, AddonType.ENTERPRISE_SUITE)`

### 22.5. Stripe Integration for Add-Ons

Extend Phase 10B's Stripe Billing implementation:

1. **Environment Variables:**

Add to Render/Vercel:

- `STRIPE_PRICE_ADDON_ENTERPRISE_SUITE`
- `STRIPE_PRICE_ADDON_MARKETPLACE_SEO`
- `STRIPE_PRICE_ADDON_AI_VIDEO_STUDIO`
- `STRIPE_PRICE_ADDON_COMPETITOR_CRO`
- `STRIPE_PRICE_ADDON_EXTRA_AI_TOKENS`
- `STRIPE_PRICE_ADDON_EXTRA_PRODUCTS`

2. **Create Checkout Sessions for Add-Ons**

Add endpoint:

- `POST /billing/addons/create-checkout-session`

Body:

```json
{
  "addonType": "ENTERPRISE_SUITE" | "MARKETPLACE_SEO" | "AI_VIDEO_STUDIO" | "COMPETITOR_CRO" | "EXTRA_AI_TOKENS" | "EXTRA_PRODUCTS",
  "quantity": 1
}
```

Behavior:

- Auth user
- Find Stripe customer (create if missing)
- Resolve price ID from `ADDONS[addonKey].stripePriceEnvKey`
- Create Checkout Session in subscription mode (or usage mode for usage add-ons)
- Return `session.url`

3. **Update Webhook Handler**

- When receiving `customer.subscription.updated` or `invoice.payment_succeeded` for add-on price IDs:
  - Map `price.id` to `AddonType`
  - Upsert `SubscriptionAddon` row for that user
  - Update status to `active`
- When receiving `customer.subscription.deleted` or `invoice.payment_failed`:
  - Mark `SubscriptionAddon.status` as `canceled` or `past_due`

### 22.6. Feature Gating Using Add-Ons

Reuse and extend the limit/enforcement logic from Phase 10C & 19.

**Backend helpers:**

Create `BillingAccessService`:

- `canUseFeature(userId, featureKey: string): boolean`
- `assertFeatureAccess(userId, featureKey: string): void` (throws if not allowed)

Map feature keys to required add-on:

- `"competitor.dashboard"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"opportunity.engine"` → requires `ENTERPRISE_SUITE`
- `"theme.audit"` → requires `ENTERPRISE_SUITE`
- `"cro.suggestions"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"abtesting"` → requires `ENTERPRISE_SUITE` or `COMPETITOR_CRO`
- `"review.mining"` → requires `ENTERPRISE_SUITE`
- `"marketplace.amazon"` / `"marketplace.etsy"` → requires `MARKETPLACE_SEO`
- `"ai.video.studio"` → requires `AI_VIDEO_STUDIO`

Then, in each advanced feature controller (Phases 23–30), call:

```typescript
this.billingAccess.assertFeatureAccess(userId, "competitor.dashboard");
```

Return structured error if lacking:

```json
{
  "error": "ADDON_REQUIRED",
  "addonType": "ENTERPRISE_SUITE",
  "message": "This feature is part of the Enterprise Suite add-on. Upgrade your plan to continue."
}
```

### 22.7. Frontend: Pricing Page & Upsell UX

**Pricing Page (`/pricing`):**

- Under main plans, add a section: **"Advanced Add-Ons"**
  - Cards for:
    - Enterprise Suite
    - Marketplace SEO
    - AI Video Studio
    - Competitor & CRO
  - Each card:
    - Short description
    - "Requires Pro or Agency" label (where applicable)
    - "Talk to sales" or "Add to plan" CTA

**Billing Settings Page (`/settings/billing`):**

- Show:
  - Base plan
  - Current add-ons with status
  - Buttons:
    - "Add Enterprise Suite"
    - "Add Marketplace SEO"
    - "Add AI Video Studio"
- Clicking opens flow:
  - Calls `/billing/addons/create-checkout-session`
  - Redirects to Stripe Checkout

**Feature-Level Upsell Modals:**

- When user on Pro/Agency clicks locked content (e.g. Competitors tab without add-on):
  - Show modal:
    - Explains feature
    - Shows price (from config)
    - Button → "Unlock with Enterprise Suite"
    - On click → start add-on checkout session

### 22.8. Analytics & Safeguards

- Track in-product events (later, with PostHog/Mixpanel):
  - Add-on viewed
  - Add-on checkout started
  - Add-on purchased
- Add basic guardrails:
  - Don't show add-on upsell to Free users until they upgrade to Starter/Pro
  - For Free users, first upsell path:
    - Free → Starter/Pro
    - Then → add-on

### 22.9. Implementation Order

1. Update Prisma schema: `AddonType` + `SubscriptionAddon`.
2. Implement `ADDONS` config and helper functions.
3. Extend Stripe config and webhook handling for add-ons.
4. Implement `/billing/addons/create-checkout-session`.
5. Add `BillingAccessService` and feature gating helper.
6. Wire gating into advanced feature endpoints (as they are built in Phases 23–30).
7. Update `/pricing` and `/settings/billing` UI for add-on visibility and purchase.
8. Implement upsell modals on locked advanced features.
9. Smoke-test add-on purchase + access end-to-end in Stripe test mode.

### 22.10. Acceptance Criteria

- Users can view and understand advanced add-ons from the pricing page.
- Pro/Agency users can purchase add-ons through Stripe.
- Add-ons are reflected correctly in the database (`SubscriptionAddon` rows).
- Advanced features are **blocked** without the correct add-on and **unlocked** once purchased.
- Errors when lacking access are friendly and lead users to an upsell path.
- System is designed to prevent AI/compute abuse by requiring paid add-ons for heavy features.

---

# PHASE 23 — AI Competitor Intelligence Dashboard

**Goal:** Turn competitive research into a first-class, data-backed feature that shows merchants where they can win: which competitors to watch, which keywords they're losing, and which pages to build next.

This phase deepens and extends the earlier competitive intelligence models from Phase 15.

### 23.1. Data Model Extensions (Prisma)

Build on the existing `Competitor` model introduced in Phase 15.

Update `schema.prisma` (if not already present or to extend):

```prisma
model Competitor {
  id          String                 @id @default(cuid())
  project     Project                @relation(fields: [projectId], references: [id])
  projectId   String
  domain      String
  label       String?
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt

  snapshots   CompetitorSnapshot[]
}

model CompetitorSnapshot {
  id            String      @id @default(cuid())
  competitor    Competitor  @relation(fields: [competitorId], references: [id])
  competitorId  String
  takenAt       DateTime    @default(now())
  estTraffic    Int?
  estRevenue    Float?
  topKeywords   Json?       // aggregated keyword stats
  topPages      Json?       // URLs + metrics
}
```

Run migration:

```bash
npx prisma migrate dev --name competitor_intel_models
```

### 23.2. Competitor Discovery & Input

**Backend:**

- Endpoint: `POST /projects/:id/competitors`
  - Body: `{ domain: string, label?: string }`
  - Validates ownership.
- Endpoint: `GET /projects/:id/competitors`
  - Returns list of competitors for the project.

Optionally:
- Endpoint: `POST /projects/:id/competitors/discover`
  - Uses AI + search to suggest 3–5 competitors based on:
    - project domain
    - existing queries & intents (keywords, if available)
    - Shopify category

### 23.3. Competitor Snapshot Service

Create module: `apps/api/src/competitor-intel`:

- `competitor-intel.module.ts`
- `competitor-intel.service.ts`
- `competitor-intel.controller.ts`

**Service responsibilities:**

- Given a competitor domain:
  - Query external SEO APIs (or internal crawler when added later) for:
    - Estimated organic traffic
    - Top queries & intents (+ positions, volume)
    - Top ranking pages (URL, title, est traffic)
  - Use AI to:
    - cluster queries & intents by theme
    - guess revenue segments (low confidence but directional)
  - Save a `CompetitorSnapshot` record.

**Endpoints:**

- `POST /competitors/:id/snapshot`
  - Triggers a snapshot for a single competitor.
- `POST /projects/:id/competitors/snapshot-all`
  - Triggers snapshots for all competitors for that project (queued job in future).

### 23.4. AI Competitor Report Generation

Add an AI endpoint:

- `POST /ai/competitor-report`

**Body:**

```json
{
  "projectId": "string"
}
```

**Steps:**

1. Load project competitors + latest snapshots.
2. Load project's own SEO metrics from:
   - Crawl results
   - Product SEO data
3. Ask AI to generate:
   - "Where you're behind"
   - "Quick wins"
   - "Long-term content strategy"
   - "Product / category gaps to fill"

Return:

```json
{
  "summary": "High-level findings",
  "opportunities": [
    {
      "title": "Own 'eco-friendly yoga mats'",
      "impact": "high",
      "difficulty": "medium",
      "recommendations": ["Create a category page...", "Publish 2 blogs on..."]
    }
  ],
  "recommendedContentIdeas": [...],
  "recommendedProductIdeas": [...]
}
```

### 23.5. Competitors UI (`/projects/[id]/competitors`)

Enhance the existing Competitors tab:

- Table of competitors:
  - Domain
  - Label
  - Last snapshot
  - Est. traffic
  - Est. visibility vs your site
- Snapshot detail view:
  - List of top competitor keywords vs your ranking (if known)
  - Top pages with quick "View in SERP" link
- "AI Competitor Report" button:
  - Calls `/ai/competitor-report`
  - Shows an insight panel with:
    - Key findings
    - Recommended actions
    - Links to:
      - Create new content assets (Phase 13)
      - Create tasks/automations (Phase 17)

---

# PHASE 24 — AI SEO Opportunity Engine

**Goal:** Build an "AI growth brain" that surfaces the highest-impact actions for each project and turns your existing data into a prioritized to-do list.

### 24.1. SEO Opportunity Model

Add to `schema.prisma`:

```prisma
model SeoOpportunity {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  type        String   // "content", "product_seo", "technical", "internal_linking", etc.
  title       String
  description String
  priority    String   // "low", "medium", "high", "urgent"
  impactScore Int      // 1–100, estimated impact
  effortScore Int      // 1–100, estimated effort
  source      String?  // e.g., "competitor_intel", "crawl", "ai_insight"
  status      String   @default("open") // "open", "in_progress", "done", "dismissed"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Run migration:

```bash
npx prisma migrate dev --name seo_opportunity_model
```

### 24.2. Opportunity Generation Engine

Backend module: `apps/api/src/seo-opportunities`

Sources of signals:

- Crawl results (Phase 3)
- AI metadata suggestions (Phase 4)
- Products & their SEO status (Phase 5–6)
- Competitor intel (Phase 23)
- Performance metrics (Phase 14, in future)

**Service:**

- `SeoOpportunitiesService.generateForProject(projectId: string)`:
  - Fetches relevant data.
  - Calls an AI model with:
    - issues
    - competitor gaps
    - rankings
    - product catalog shape
  - AI returns a prioritized list of opportunities.
  - Upserts records in `SeoOpportunity` table.

**Endpoint:**

- `POST /projects/:id/seo-opportunities/generate`
  - Auth: JWT + ownership
  - Triggers generation and returns latest list.

- `GET /projects/:id/seo-opportunities`
  - Query parameters: `status`, `type`, `sort=impactScore` etc.

- `PATCH /seo-opportunities/:id`
  - Update status (`done`, `dismissed`, etc.)

### 24.3. UI — "Opportunities" Panel

Integrate into:

- Project Overview page
- Issues tab or new "Opportunities" sub-tab

Features:

- List of opportunities with:
  - Type badge (Content / Product SEO / Technical / etc.)
  - Impact vs Effort (displayed as a 2D indicator or text like "High impact · Low effort")
- Filters:
  - By type
  - By priority
  - By status
- Actions:
  - "Mark as done"
  - "Create Task" (Phase 17 Task model)
  - "Auto-fix" (where possible, e.g., metadata)

Use this as the "home feed" of what to do next.

---

# PHASE 25 — AI Technical SEO Template Optimizer

**Goal:** Move beyond diagnostics and give merchants AI-assisted recommendations for theme-level fixes to performance and technical SEO issues.

> **Important:** For MVP, do NOT directly modify theme code automatically. Instead, generate actionable diffs/instructions developers can apply manually or via a safe review step.

### 25.1. Technical Theme Scan

Create a module: `apps/api/src/theme-audit`

**Inputs:**

- Storefront URLs (home, popular collections, product pages)
- Shopify theme metadata (via Shopify API if available)

**Service tasks:**

- Fetch page HTML + performance timings (LCP, TTFB approximations).
- Detect:
  - render-blocking scripts
  - heavy JavaScript bundles
  - unused CSS patterns
  - unoptimized images
  - missing preload/preconnect hints

Store summary into a new model:

```prisma
model ThemeAudit {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  themeName   String?
  shopDomain  String?
  findings    Json     // structured list of issues
  createdAt   DateTime @default(now())
}
```

### 25.2. AI Theme Optimization Suggestions

AI endpoint:

- `POST /ai/theme-optimizer`

**Body:**

```json
{
  "projectId": "string",
  "themeAuditId": "string"
}
```

**Steps:**

1. Load `ThemeAudit` findings.
2. Ask AI to generate:
   - Summary of main technical bottlenecks
   - Recommended Liquid/JS/CSS changes (at a snippet level)
   - Priority ordering

Return:

```json
{
  "summary": "...",
  "recommendations": [
    {
      "title": "Defer non-critical JS",
      "description": "...",
      "codeExamples": [
        {
          "before": "<script src=\"/app.js\"></script>",
          "after": "<script src=\"/app.js\" defer></script>"
        }
      ],
      "impact": "high"
    }
  ]
}
```

### 25.3. UI — Technical SEO Panel

Add a new section under:
- `/projects/[id]/issues` or `/projects/[id]/performance`

Features:

- Run Theme Audit button.
- List of technical issues grouped by type.
- For each item:
  - AI-generated explanation in plain English.
  - Code suggestion snippet.
  - "Copy code" button.

Future:
- Approve-and-apply flow that integrates with Shopify theme API and a safe staging workflow.

---

# PHASE 26 — AI Conversion Rate Optimization (CRO) Engine

**Goal:** Use AI to analyze product and landing pages for conversion potential, not just SEO, and propose concrete improvements.

### 26.1. CRO Analysis Endpoint

Backend module: `apps/api/src/cro`

**Endpoint:** `POST /cro/analyze-page`

**Body:**

```json
{
  "projectId": "string",
  "url": "https://...",
  "type": "product" | "collection" | "landing"
}
```

**Steps:**

1. Fetch page HTML and basic metrics.
2. Extract:
   - Headlines
   - Product info (price, variants, reviews)
   - CTAs
   - Trust elements
3. Send to AI:

Prompt includes best practices for CRO in eCommerce.

**Response:**

```json
{
  "summary": "Overall CRO assessment",
  "score": 0-100,
  "issues": [
    {
      "type": "cta_visibility",
      "severity": "high",
      "description": "Primary CTA is below the fold...",
      "suggestedChange": "Move 'Add to Cart' above the fold..."
    }
  ],
  "copySuggestions": {
    "headline": "New headline suggestion",
    "subheadline": "New subheadline",
    "bulletPoints": [...]
  },
  "layoutSuggestions": [...]
}
```

### 26.2. Product CRO Review UI

On `/projects/[id]/products`:

- Add "CRO Review" action for each product.
- Modal shows:
  - CRO score
  - Top 3 improvements
  - Suggested hero copy
  - Suggested benefit bullets
- Allow user to:
  - Copy suggestions
  - Create a Task (Phase 17) from any issue.

---

# PHASE 27 — A/B Testing Framework (UX + AI Variant Generator)

**Goal:** Let merchants test AI-suggested variants of titles, descriptions, and hero sections, while keeping technical implementation lightweight.

### 27.1. Data Model

Add:

```prisma
model AbTest {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  targetType  String   // "product_page", "landing_page"
  targetId    String   // externalId or URL
  name        String
  status      String   @default("draft") // "draft", "running", "completed"
  variantA    Json     // baseline content
  variantB    Json     // AI-generated content
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

(Tracking conversions may integrate with GA4 or Shopify analytics later.)

### 27.2. Variant Generation

AI endpoint:

- `POST /ai/abtest/generate-variant`

**Body:**

```json
{
  "projectId": "string",
  "targetType": "product_page",
  "targetId": "product-id-or-url"
}
```

**Steps:**

1. Fetch existing title, hero, copy.
2. Ask AI for:
   - Variant B (alternate headline, bullets, description) optimized for conversions.

### 27.3. UI for A/B Experiments

In product detail or content pages:

- Button: "Create A/B Test"
- Workflow:
  1. Show baseline content (Variant A).
  2. Generate Variant B via AI.
  3. Allow merchant to edit Variant B.
  4. Show instructions on how to manually implement variants in Shopify (MVP).
  5. Save test as `draft` with both variants stored.

Later phases can integrate automatically with storefront rendering and analytics.

---

# PHASE 28 — AI Review Mining & SEO Enrichment

**Goal:** Turn reviews into SEO and conversion assets.

### 28.1. Data Model (Optional Cache)

```prisma
model ProductReviewSummary {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  productId   String
  source      String   // "shopify", "judge.me", etc.
  summary     String
  pros        Json     // list of pros
  cons        Json     // list of cons
  themes      Json     // grouped insights
  keywords    Json     // queries & intents (SEO/DEO-relevant terms)
  createdAt   DateTime @default(now())
}
```

### 28.2. Review Ingestion

- Integrate with Shopify product reviews API or third-party review app APIs where possible (Judge.me, Loox – future).
- Fetch latest N reviews per product.
- Store a raw snapshot or feed them directly into AI.

### 28.3. AI Review Mining Endpoint

`POST /ai/reviews/summarize-product`

**Body:**

```json
{
  "projectId": "string",
  "productId": "string"
}
```

**Response:**

```json
{
  "summary": "What customers love and hate",
  "pros": ["Comfortable", "Durable"],
  "cons": ["Runs small"],
  "seoKeywords": ["sustainable yoga mat", "non-slip", "eco-friendly"],
  "copySuggestions": {
    "description": "AI-suggested description using real language from reviews",
    "headline": "Loved for its grip and eco-friendly materials"
  }
}
```

### 28.4. UI Integration

On `/projects/[id]/products`:

- Add "Review Insights" action.
- Show:
  - Summary
  - Pros/cons
  - SEO keyword suggestions
  - Button "Apply to Description" (Phase 6 integration to push to Shopify).

---

# PHASE 29 — Multi-Marketplace SEO (Amazon, Etsy, Later Walmart)

**Goal:** Help merchants optimize product SEO across Shopify and major marketplaces from one place.

### 29.1. Integration Model Extensions

Extend `IntegrationType` enum:

```prisma
enum IntegrationType {
  SHOPIFY
  AMAZON
  ETSY
  // future: WALMART, EBAY, etc.
}
```

Use the existing `Integration` model:

- For Amazon:
  - `externalId` → Amazon Seller ID or store ID
  - `config` → auth tokens, marketplace region
- For Etsy:
  - `externalId` → Shop ID

Run migration:

```bash
npx prisma migrate dev --name add_marketplace_integration_types
```

### 29.2. Marketplace Connection Flows

Backend modules (future):

- `amazon-integration`
- `etsy-integration`

Each should support:

- OAuth / API credential storage
- Basic account info fetch
- Listing retrieval

### 29.3. Cross-Channel Product Mapping

Reuse `Product` model:

- `source` field (IntegrationType) differentiates Shopify vs Amazon vs Etsy.

Add helper:

- Endpoint: `GET /projects/:id/products/marketplaces`
  - Returns list of products with mapping:
    - Shopify product
    - Amazon listing (if any)
    - Etsy listing (if any)

### 29.4. Marketplace SEO Suggestions (MVP)

AI endpoints:

- `POST /ai/marketplace/amazon-metadata`
- `POST /ai/marketplace/etsy-metadata`

**Inputs:**
- product data (title, description, specs)
- marketplace-specific rules (character limits, bullet style)

**Outputs:**
- Amazon:
  - optimized title
  - 5 bullets
  - backend queries & intents (keywords)
- Etsy:
  - title
  - tags
  - description

UI:

- New tab on product detail: "Marketplace SEO"
- Future: push changes via marketplace APIs.

---

# PHASE 30 — AI Video & Social Content Engine

**Goal:** Deepen social + content automation with short-form video scripts, captions, and campaign bundles, building on Phase 17's social integrations.

### 30.1. Data Model: SocialContentAsset

```prisma
model SocialContentAsset {
  id          String   @id @default(cuid())
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  type        String   // "instagram_post", "tiktok_script", "reel", "youtube_description"
  source      String   // "product_launch", "blog_post", "promo", "manual"
  payload     Json     // structured fields (caption, script, hashtags, etc.)
  status      String   @default("draft") // "draft", "scheduled", "published"
  scheduledAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 30.2. AI Social & Video Script Generator

Endpoint:

- `POST /ai/social/generate`

**Body:**

```json
{
  "projectId": "string",
  "contextType": "product" | "blog" | "promo",
  "contextId": "string",
  "channels": ["instagram", "tiktok", "facebook", "linkedin"]
}
```

**Response:**

```json
{
  "assets": [
    {
      "type": "tiktok_script",
      "script": "Hook, problem, solution, CTA...",
      "durationSec": 30,
      "cta": "Shop now at..."
    },
    {
      "type": "instagram_post",
      "caption": "...",
      "hashtags": ["#shopify", "#ecofriendly"],
      "cta": "Link in bio."
    }
  ]
}
```

Save as `SocialContentAsset` records.

### 30.3. Scheduling & Publishing (Build on Phase 17)

- Reuse `AutomationRule` and task workers.
- Allow user to:
  - Manually schedule posts.
  - Use rules like:
    - "When new product added → generate social bundle and suggest schedule."
- For each connected social account (Phase 17):
  - Provide UI:
    - "Publish now"
    - "Schedule"
    - "Edit before posting"

### 30.4. UI: Social Content Studio

New route:

- `/projects/[id]/social`

Features:

- Calendar view of scheduled posts.
- List of drafted AI-generated posts.
- Filters by channel.
- Editor:
  - Allow user to tweak captions/scripts.
  - Show tokens used vs plan limits (Phases 10C & 22).

---

# PHASE UX-1 — Products Page UX Redesign

**Goal:** Improve the usability and scan-ability of the Products list in the project detail view by replacing the wide, horizontally scrollable table with a compact, responsive row-card layout and an expandable detail panel.

### UX-1.1. Scope

- App: `apps/web` (Next.js, App Router).
- Route: `/projects/[id]/products`.
- Data sources:
  - `productsApi.list(projectId)` for product data.
  - Existing Shopify integration-status endpoint for connection state.
  - Existing `seoScanApi` and `aiApi` endpoints for scan + AI metadata suggestions.

### UX-1.2. Requirements

- Remove horizontal scrolling from the Products page.
- Replace `<table>` with a `<div>`-based, flex layout:
  - Each product rendered as a row card with:
    - Thumbnail, title, and Shopify identifier on the left.
    - Status chip + DEO micro indicators (metadata presence) in the middle.
    - Primary **Optimize** button + overflow menu on the right.
- Add an expandable detail panel beneath each row containing:
  - Meta title.
  - Meta description.
  - Alt text coverage (placeholder until backed by data).
  - Issues (placeholder).
  - Last synced (from `lastSyncedAt`).
  - Last optimized (placeholder).
  - URL (placeholder until product URLs are available).
- Add a simple client-side filter bar:
  - All / Needs Optimization / Optimized / Missing Metadata.
  - Filters operate on the in-memory `products` array; no new backend endpoints.

### UX-1.3. Implementation Notes

- Create a shared `Product` interface for the frontend in `apps/web/src/lib/products.ts`.
- Introduce dedicated UI components:
  - `ProductTable` – owns filters, expanded-row state, and row status classification.
  - `ProductRow` – renders the responsive row card, including:
    - Scan SEO pill button (reusing existing scan handler).
    - Optimize button (reusing existing AI suggestion flow and modal).
    - Overflow menu with `View details`, `Sync`, `Edit` (disabled), `Remove` (disabled).
  - `ProductDetailPanel` – renders secondary metadata/details for the expanded view.
- Update `apps/web/src/app/projects/[id]/products/page.tsx` to:
  - Keep all data-fetch and side-effect logic (auth, API calls, AI modal, Shopify apply).
  - Delegate list rendering to `ProductTable`.
- Styling:
  - Use Tailwind flex/grid utilities (`flex`, `sm:flex-row`, `items-center`, `gap-*`, etc.).
  - Ensure long text truncates rather than forcing horizontal scroll (`truncate`, `min-w-0`).

### UX-1.4. Constraints & Non-Goals

- Do **not** modify:
  - Backend endpoints, Prisma schema, or queues.
  - DEO scoring logic or crawler behavior.
  - Shopify sync/update semantics.
- UX-only refactor:
  - Behavior and data contracts remain unchanged; only presentation and layout are updated.
- Document the redesign in `docs/UX_REDESIGN.md` with:
  - Layout overview.
  - Component boundaries.
  - Known placeholders/future hooks (alt coverage, URL, last optimized, etc.).

---

# PHASE UX-2 — Product Optimization Workspace

**Goal:** Provide a dedicated per-product workspace to optimize Shopify product metadata using AI suggestions, a manual editor, and DEO insights.

### UX-2.1. Scope

- App: `apps/web` (Next.js, App Router).
- Route: `/projects/[id]/products/[productId]`.
- Components: New directory `apps/web/src/components/products/optimization/`.

### UX-2.2. Requirements

- **Frontend-only**: No Prisma changes, no new backend endpoints or services.
- **Reuse existing APIs**:
  - `productsApi.list(projectId)` for product data.
  - `aiApi.suggestProductMetadata(productId)` for AI suggestions.
  - `shopifyApi.updateProductSeo(productId, title, description)` for Shopify updates.
- **Must not break**: Products list, AI modal, or sync flows from UX-1.

### UX-2.3. Layout

3-panel responsive layout:

1. **Left Panel** – Product Overview:
   - Thumbnail, title, handle/ID, price, Shopify status, last synced/optimized, status chip.

2. **Center Panel** – Main workspace:
   - AI Suggestions Panel: Generate suggestions, display with char counts, apply to editor, regenerate.
   - SEO Editor: Title input, description textarea, handle (read-only), alt text placeholder, reset + apply buttons.

3. **Right Panel** – DEO/SEO Insights:
   - Content depth (word count), metadata completeness, thin-content flag, overall status, coming-soon roadmap.

### UX-2.4. Components

```
apps/web/src/components/products/optimization/
├── index.ts                      # Barrel exports
├── ProductOptimizationLayout.tsx # 3-panel responsive layout
├── ProductOverviewPanel.tsx      # Left panel content
├── ProductAiSuggestionsPanel.tsx # AI suggestions with apply buttons
├── ProductSeoEditor.tsx          # Title/description editor
└── ProductDeoInsightsPanel.tsx   # DEO/SEO insights
```

### UX-2.5. Extended Product Interface

Added optional fields to `Product` in `apps/web/src/lib/products.ts`:

- `handle?: string | null`
- `price?: number | null`
- `currency?: string | null`
- `shopifyStatus?: string | null`
- `lastOptimizedAt?: string | null`

Also moved `ProductStatus` type and `getProductStatus()` function to the shared lib file.

### UX-2.6. Acceptance Criteria

- [x] Workspace loads for valid product with auth.
- [x] Breadcrumb and back navigation work correctly.
- [x] AI suggestions can be generated and applied into the editor.
- [x] Editor can apply SEO changes to Shopify with success/error feedback.
- [x] Insights panel shows content depth, metadata completeness, and thin-content signal.
- [x] Layout is fully responsive with no horizontal scrolling.
- [x] Documentation updated in `docs/UX_REDESIGN.md`.

---

# PHASE UX-1.1 — Products Mobile Responsive Improvements

**Goal:** Make the Products list and related navigation usable and legible on mobile by adapting layout responsively, without changing tablet/desktop or backend behavior.

### UX-1.1.1. Scope

- App: `apps/web` (Next.js, App Router).
- Routes:
  - `/projects/[id]/products` (Products list)
  - Project and admin layouts that host the left sidebar.
- Components:
  - `ProjectLayout`, `AdminLayout`
  - `ProjectSideNav`, `AdminSideNav`
  - `ProductTable`, `ProductRow`

### UX-1.1.2. Requirements

- **Responsive-only changes**: No Prisma schema or backend logic changes.
- **Desktop/tablet unchanged**: Layouts must remain visually identical on larger screens.
- **Mobile adaptations**:
  - Sidebar collapses into a drawer accessible via a Menu button.
  - Product cards stack vertically with full-width action buttons.
  - No horizontal scroll under normal usage.

### UX-1.1.3. Implementation

1. **Sidebar → Drawer Pattern**
   - `ProjectLayout` converted to client component with `useState` for drawer state.
   - On `<md`: Hide sidebar, show "Menu" button that opens slide-over drawer.
   - On `≥md`: Keep existing side-by-side layout unchanged.
   - Same pattern applied to `AdminLayout`.

2. **SideNav Components**
   - Added optional `onNavigate` prop to close drawer on link click.
   - Width: `w-full max-w-xs md:w-48` for responsive drawer width.

3. **ProductRow Mobile Stacking**
   - On `<sm`: Vertical stacking with:
     - Header: thumbnail + title (2-line clamp) + handle + status chip.
     - Metadata indicators row.
     - Full-width Optimize button.
     - Scan SEO + overflow menu in secondary row.
   - On `≥sm`: Horizontal 3-zone layout preserved.

4. **Products Page Container**
   - Added `overflow-x-hidden` to prevent horizontal scrolling.
   - Header row: `flex-col sm:flex-row` with full-width Sync button on mobile.

### UX-1.1.4. Files Modified

| File | Changes |
|------|---------|
| `apps/web/src/app/projects/[id]/layout.tsx` | Client component + mobile drawer |
| `apps/web/src/app/admin/layout.tsx` | Mobile drawer pattern |
| `apps/web/src/components/layout/ProjectSideNav.tsx` | `onNavigate` prop, responsive width |
| `apps/web/src/components/layout/AdminSideNav.tsx` | `onNavigate` prop, responsive width |
| `apps/web/src/components/products/ProductRow.tsx` | Mobile stacking, split actions |
| `apps/web/src/app/projects/[id]/products/page.tsx` | Responsive header, overflow-x-hidden |

### UX-1.1.5. Acceptance Criteria

- [x] On mobile: Left sidebar collapses into drawer accessible via Menu button.
- [x] On mobile: Products list occupies full width; product cards stack vertically with actions at bottom.
- [x] No overlapping buttons/pills; tap targets are comfortable.
- [x] No horizontal scroll under normal usage.
- [x] On tablet/desktop: Layout remains consistent with UX-1 (side-by-side sidebar + content, horizontal row-cards).
- [x] Documentation updated in `docs/UX_REDESIGN.md`.

---

# PHASE UX-3 — Project Overview Redesign

**Goal:** Redesign the Project Overview page to be DEO-first, surfacing the latest DEO score, component breakdown, and key signals/health indicators in a single, easy-to-scan dashboard.

### UX-3.1. Scope

- **App:** `apps/web` (Next.js, App Router).
- **Route:** `/projects/[id]` (Project Overview).
- **Layout:**
  - DEO Score card and component breakdown at the top.
  - Signals summary and project health cards in the right column.
  - Crawl & DEO Issues entry point and integrations overview in the secondary section.

### UX-3.2. Constraints

- Frontend-only phase; no new backend endpoints or Prisma schema changes.
- Reuse existing APIs:
  - DEO score: `GET /projects/:id/deo-score`.
  - DEO signals (debug/summary): `GET /projects/:id/deo-signals/debug`.
  - Project overview stats: `GET /projects/:id/overview`.
  - Integration status: `GET /projects/:id/integration-status`.
- Must not break existing flows on the Projects index or Products list; navigation and auth patterns remain unchanged.

### UX-3.3. Implementation Summary

- Introduced a **DEO Score card** that displays the latest overall DEO score and freshness timestamp.
- Added a **component breakdown panel** (Content, Entities, Technical, Visibility) driven by the latest DEO snapshot.
- Added a **Signals Summary** component and **Project Health cards** that visualize crawl health, indexability, thin content, and other key metrics from the DEO signals.
- Reorganized the secondary section to surface:
  - **Crawl & DEO Issues entry point** (Run Crawl button + link to issues/results).
  - **Integrations overview**, including Shopify connection status and product links.
- Ensured responsive layout behavior so the overview remains usable on mobile and desktop.

**UX Refinements (Post-Implementation):**
- Layout refinement (v2): Project Overview now uses a strict two-section grid (2-column top at `lg`, 3-column bottom at `lg`) so DEO score, components, signals, issues, crawl, integration, and stats align cleanly across columns and rows.

### UX-3.4. Acceptance Criteria

- [ ] Project Overview loads successfully for authenticated users and displays DEO score, component breakdown, and signals summary for projects with data.
- [ ] When no DEO snapshot exists, the page renders a sensible empty state without errors.
- [ ] The Crawl & DEO Issues area hooks into existing crawl endpoints and links to the issues/results views without breaking navigation.
- [ ] Integration status (e.g., Shopify connected) is visible on the Overview and links to the relevant Products page.
- [ ] The layout is responsive with no horizontal scrolling on mobile; desktop layout remains consistent with the redesign spec.
- [ ] No new backend endpoints or schema changes were required; all data comes from existing project, DEO, and integration APIs.

---

# PHASE UX-4 — Issues UI Integration

**Frontend-only phase surfacing DEO issues across the web app.**

### UX-4.1. Scope

Connect the backend DEO Issues Engine (`GET /projects/:id/deo-issues`) to the frontend, displaying aggregated issue data in:

1. **Project Overview** – Summary card with severity counts + full issues list modal
2. **Products List** – Per-product issue badges with severity coloring
3. **Product Optimization Workspace** – Detailed issues in DEO Insights panel

### UX-4.2. Constraints

- **Frontend-only**: Consumes existing Phase 3B `/projects/:id/deo-issues` endpoint
- **No backend changes**: All changes in `apps/web`
- **Graceful degradation**: Handles loading, error, and empty states
- **Type-safe**: Uses shared `DeoIssue` and `DeoIssuesResponse` types from `@engineo/shared`

### UX-4.3. Implementation Summary

- Created `apps/web/src/components/issues/` directory with:
  - `IssueBadge.tsx` – Compact severity-colored badge for product rows
  - `IssuesSummaryCard.tsx` – Overview card with Critical/Warning/Info counts
  - `IssuesList.tsx` – Expandable list with affected pages/products; includes `ISSUE_UI_CONFIG` for ID-to-label mapping
- Added `deoIssues` method to `projectsApi` in `apps/web/src/lib/api.ts`
- Updated Project Overview page with issues summary card and "View All Issues" modal
- Updated `ProductRow` and `ProductTable` to display issue badges per product
- Updated Products page to fetch and pass product issues
- Updated `ProductDeoInsightsPanel` with DEO Issues section
- Updated Product Optimization Workspace to fetch and display product-specific issues

### UX-4.4. Acceptance Criteria

- [ ] IssuesSummaryCard displays correctly on Project Overview with severity counts
- [ ] "View All Issues" modal shows expandable IssuesList with affected pages/products
- [ ] Products list shows IssueBadge on rows with issues, colored by highest severity
- [ ] Product Optimization Workspace DEO Insights panel shows issues for current product
- [ ] Loading, error, and empty states are handled gracefully across all integration points
- [ ] No backend changes required; all data comes from existing `/projects/:id/deo-issues` endpoint

---

# PHASE UX-5 — Row-Level Navigation + Workspace Access

**Goal:** Make entering the Product Optimization Workspace intuitive, consistent, and fast by turning product rows into clear navigation affordances while keeping existing optimization flows intact.

### UX-5.1. Scope

- **App:** `apps/web` (Next.js, App Router).
- **Routes:**
  - Products list: `/projects/[id]/products`
  - Product workspace (unchanged): `/projects/[id]/products/[productId]`
- **Components:**
  - `ProductRow` – row-level click/keyboard navigation and visible "Open Workspace" action.
  - `ProductTable` – continues to own filters and expansion state, passes through handlers.
  - `projects/[id]/products/page.tsx` – ensures routing and props remain consistent.
- **Out of scope:**
  - No backend changes or new endpoints.
  - No changes to Product Optimization Workspace internals (UX-2).
  - No changes to DEO Issues UI integration (UX-4).

### UX-5.2. Constraints

- Frontend-only phase; all changes live in `apps/web`.
- No Prisma or API changes; continues to use existing product and workspace routes.
- DEO v1 scoring, DEO Issues Engine, and crawl/DEO pipelines remain unchanged.
- Issues badges, filters, and mobile responsiveness from UX-1/UX-1.1 must remain intact (no new horizontal scroll).

### UX-5.3. Implementation Summary

- Converted each product row card into a primary navigation surface:
  - Row wrapper uses `onClick` + `useRouter` to navigate to `/projects/[projectId]/products/[productId]`.
  - Keyboard navigation supported via `role="button"`, `tabIndex={0}`, and Enter/Space handling.
  - Click/key events originating from buttons, menus, or elements marked with `data-no-row-click` do not trigger row navigation.
- Added a visible "Open Workspace →" link near the product header:
  - Renders under the title/handle as a small tertiary link.
  - Uses `next/link` for direct navigation to the workspace.
  - Styled as a blue text link with hover underline for discoverability.
- Updated action semantics:
  - Optimize button still triggers AI suggestion/optimization flows; it also effectively remains a workspace entry action.
  - Overflow menu is reserved for secondary actions: "View details", "Sync", and future Edit/Remove actions.
  - "Open Workspace" has been removed from the overflow menu in favor of the visible link.
- Preserved existing detail panel behavior:
  - "View details" in the overflow menu continues to toggle the expanded `ProductDetailPanel` below the row.
  - Expansion state remains owned by `ProductTable` via `onToggle`.

### UX-5.4. Acceptance Criteria

- [ ] Clicking anywhere on a product row (excluding buttons, menus, and other elements marked to opt out) navigates to `/projects/[projectId]/products/[productId]`.
- [ ] "Open Workspace" link is visible on both desktop and mobile near the product header and navigates directly to the workspace.
- [ ] Optimize button continues to launch the existing optimization flow and does not accidentally trigger row-level navigation.
- [ ] Overflow menu contains "View details", "Sync", and disabled "Edit"/"Remove" entries; none of these actions trigger row-level navigation.
- [ ] On mobile, tapping the row opens the workspace, Optimize remains full-width, and "Open Workspace" appears cleanly in the stacked layout without introducing horizontal scroll.
- [ ] DEO Issues badges, filters, and product counts remain accurate and unaffected by the new navigation behavior.
- [ ] No backend or schema changes were required; all behavior is implemented in the frontend only.

---

# PHASE UX-6 — "First DEO Win" Onboarding Flow

**Status:** Completed

**Goal:** Every new workspace should be guided through a short, structured path that reliably leads to:
- A project created and a source (Shopify store or website) connected.
- A first crawl completed.
- DEO Score visible.
- At least 1–3 products optimized with AI.
- A clear "You improved X" confirmation that reinforces the win.

### UX-6.1. Scope

- **App:** `apps/web` (Next.js, App Router).
- **Routes:**
  - Projects index: `/projects`
  - Project Overview: `/projects/[id]/overview`
  - Products list: `/projects/[id]/products`
- **Components:**
  - `FirstDeoWinChecklist` – new shared checklist component.
  - `DeoScoreCard` – extended with `onRunFirstCrawl` prop.
- No new backend endpoints or Prisma models are introduced in this phase.
- Activation metrics will be computed using existing database tables as described in `docs/ACTIVATION_METRICS.md`.

### UX-6.2. Implementation Summary

#### Projects list (`/projects`)
- When there are no projects, show a First DEO Win empty state with a static four-step checklist instead of a bare "No projects yet" message.
- After creating a project, automatically navigate the user into `/projects/[id]/overview` to start the guided flow.

#### Project Overview (`/projects/[id]/overview`)
- Add the `FirstDeoWinChecklist` component summarizing the four steps with live progress based on integration status, crawls, DEO Score, and product optimization.
- When there is no DEO Score or crawl yet, show helpful empty states and a prominent "Run first crawl" CTA in both the DEO Score card and the Crawl & DEO Issues area.
- Once the project has a crawl, a DEO Score, and at least three optimized products, hide the checklist and show a one-time First DEO Win confirmation card that nudges users toward auto-crawls and the Issues Engine.

#### Products list (`/projects/[id]/products`)
- Show a pre-crawl guardrail banner when the user visits Products before the first crawl, explaining why data may be empty and linking back to the Overview crawl entry point.
- Refine the "No products" empty state copy to align with the onboarding steps (connect store → sync products → crawl → optimize).

#### Instrumentation & metrics
- % completion and timing metrics for each onboarding step are computed from `Integration`, `CrawlResult`, `DeoScoreSnapshot`, `AiUsageEvent`, and `ProjectOverview` data, as detailed in `docs/ACTIVATION_METRICS.md`.

### UX-6.3. Acceptance Criteria

- [x] New users with no projects see a First DEO Win card on `/projects` with a clear CTA to create their first project.
- [x] On successful project creation, the user is redirected to `/projects/[id]/overview`.
- [x] New projects with no integrations, crawls, or DEO Score show the `FirstDeoWinChecklist` plus empty states that clearly direct users to connect a store/site and run the first crawl.
- [x] After a project has at least one integration, one crawl, a DEO Score, and three or more optimized products, the checklist no longer appears for that project and the First DEO Win confirmation card appears once.
- [x] Visiting `/projects/[id]/products` before a crawl shows a non-blocking guardrail banner that points back to the Overview crawl CTA, while still allowing sync and AI actions.
- [x] The activation metrics described in `docs/ACTIVATION_METRICS.md` can be computed against the production database without additional schema changes.

---

# PHASE UX-Content-1 — Content Pages Tab & List View

**Goal:** Provide a dedicated Content tab and list view for all non-product URLs discovered by the crawler, with DEO status, issues, and crawl context similar to the Products list.

### UX-Content-1.1. Scope

- **App:** `apps/web` (Next.js, App Router).
- **Primary route:** `/projects/[id]/content`.
- **File:** `apps/web/src/app/projects/[id]/content/page.tsx`.
- **Data sources:**
  - New endpoint: `GET /projects/:id/crawl-pages` (non-product CrawlResult rows with pageType classification).
  - Existing DEO issues endpoint: `GET /projects/:id/deo-issues`.

### UX-Content-1.2. Requirements

#### Content Tab in Sidebar

- Ensure `ProjectSideNav` includes a Content nav item that points to `/projects/[id]/content`.
- Navigation behavior matches other project tabs (Overview, Products, Issues & Fixes, Performance, etc.).

#### Content Pages List

Render a list of all non-product pages known to the crawler:

- Collections (`/collections/*`).
- Blogs & articles (`/blogs/*`, `/blog/*`).
- Static pages (`/pages/*`, `/about`, `/contact`, `/faq`, `/support`, `/shipping`, etc.).
- Home page (`/`).
- Other non-product URLs (`misc`).

For each row, display:

- URL path (e.g., `/collections/summer`).
- `pageType` chip (home, collection, blog, static, misc).
- Status chip derived from metadata + crawl issues:
  - **Indexed / Healthy** – 2xx status, title + meta description present, no critical issues.
  - **Missing Metadata** – missing title and/or meta description.
  - **Thin Content** – word count below a configurable threshold.
  - **Error** – HTTP error or fetch error.
- Issue badge summarizing how many DEO issues touch this page (uses `IssueBadge` component).
- Last crawled timestamp (`scannedAt`) formatted for humans.
- Optional AI indicator when suggestions have been generated for this page.

#### Row Behavior & Navigation

- Clicking the row navigates to `/projects/[projectId]/content/[pageId]` (UX-Content-2).
- Buttons/links within the row opt out of row-level navigation using the same `data-no-row-click` pattern from UX-5.
- Optionally expose a small inline link (`Open Workspace →`) under the path.

#### Filtering & Sorting (MVP)

- Optional type filter (All, Home, Collections, Blogs, Static, Misc).
- Optional status filter (All, Healthy, Missing Metadata, Thin Content, Error).
- Implementation is client-side only; no new backend filtering endpoints.

### UX-Content-1.3. Backend Notes

#### Endpoint: `GET /projects/:id/crawl-pages`

- Lives in `ProjectsController` (e.g., `@Get(':id/crawl-pages')`).
- Validates project ownership (reuses existing patterns).
- Queries `CrawlResult` rows for the project excluding product URLs (`/products/*`).
- Derives a `pageType` per row based on the URL:
  - `/` → `home`
  - `/collections/*` → `collection`
  - `/blogs/*`, `/blog/*` → `blog`
  - `/pages/*` or canonical paths like `/about`, `/contact`, `/faq`, `/support`, `/shipping` → `static`
  - Everything else → `misc`
- Returns normalized payload per page: `id`, `projectId`, `url`, `path`, `pageType`, `statusCode`, `title`, `metaDescription`, `h1`, `wordCount`, `issues`, `scannedAt`.
- No Prisma schema changes are required.

#### Frontend API Helper

- Add `projectsApi.crawlPages(projectId: string)` → `GET /projects/:id/crawl-pages`.
- Define a `ContentPage` interface in `apps/web/src/lib`.

### UX-Content-1.4. Acceptance Criteria

- [ ] Clicking Content in the project sidebar navigates to `/projects/[id]/content` without errors.
- [ ] The Content list displays only non-product URLs (no `/products/*` entries).
- [ ] Each row shows path, page type, DEO-style status chip, issue badge, and last crawled timestamp.
- [ ] Rows correctly map DEO issues from `GET /projects/:id/deo-issues` to per-page issue counts and highest severity.
- [ ] Clicking a row (outside of buttons/links) opens the corresponding Content Workspace at `/projects/[projectId]/content/[pageId]`.
- [ ] No new crawl logic or DEO scoring changes were introduced.

---

# PHASE UX-Content-2 — Content Page Optimization Workspace

**Goal:** Provide a dedicated workspace for optimizing individual content pages (non-product URLs) using AI metadata suggestions and DEO insights, mirroring the Product Optimization Workspace.

### UX-Content-2.1. Scope

- **App:** `apps/web` (Next.js, App Router).
- **Route:** `/projects/[id]/content/[pageId]`.
- **File:** `apps/web/src/app/projects/[id]/content/[pageId]/page.tsx`.
- **Data sources:**
  - `projectsApi.crawlPages(projectId)` to load the underlying `CrawlResult` for the given `pageId`.
  - `projectsApi.deoIssues(projectId)` to derive page-specific DEO issues.
  - Existing AI endpoint `POST /ai/metadata` via `aiApi.suggestMetadata(crawlResultId)`.

### UX-Content-2.2. Requirements

#### 3-Panel Layout (Mirrors UX-2)

##### Left Panel – Page Overview

- URL (full) and path.
- Page type badge (home / collection / blog / static / misc).
- Current title, H1, and meta description (read-only).
- Word count and basic crawl health summary (status code, key issue flags).
- Last crawled timestamp.
- Screenshot placeholder area for a later phase.

##### Center Panel – AI Suggestions + Editor

- Uses `aiApi.suggestMetadata(crawlResultId)` to request AI metadata for the page.
- Displays suggested title (X/60) and meta description (X/155).
- Editable H1 field (initially defaulted from the suggestion or existing H1).
- Optional summary / intro paragraph field.
- Users can copy fields to clipboard, apply suggestions, or regenerate.
- "Apply to CMS / Shopify" is copy-to-clipboard only for this phase.

##### Right Panel – DEO Insights + Issues

- Thin content status (word count vs thresholds).
- Missing metadata indicators (title, meta description, H1).
- Entity structure hint (presence of title + H1).
- Answer-surface readiness (sufficient word count and heading presence).
- Crawl health (HTTP errors / fetch errors / slow load time).
- Design matches `ProductDeoInsightsPanel`.

### UX-Content-2.3. Implementation Notes

#### Backend

- Reuse the crawl-pages endpoint added in UX-Content-1; no additional endpoints required.
- Reuse the existing AI metadata endpoint (`POST /ai/metadata`); no new AI routes or DTOs.
- Do not add new Prisma models or columns.

#### Frontend

- Introduce `ContentPage` type and utilities (e.g., `getContentStatus(page)`, `getPageTypeLabel(pageType)`) in `apps/web/src/lib`.
- Add workspace page that validates auth, loads content page, fetches DEO issues, and calls AI when requested.
- Keep styling and responsive behavior aligned with the Product Optimization Workspace (UX-2).

### UX-Content-2.4. Acceptance Criteria

- [ ] Navigating to `/projects/[id]/content/[pageId]` shows a 3-panel workspace with Page Overview, AI Suggestions, and DEO Insights.
- [ ] Page Overview displays URL, page type, metadata fields, word count, and last crawled timestamp from the underlying `CrawlResult`.
- [ ] AI Suggestions panel can successfully call `POST /ai/metadata`, display suggested title + meta description, and allow copying fields to clipboard.
- [ ] Right panel displays per-page DEO insights derived from `GET /projects/:id/deo-issues` plus local heuristics.
- [ ] Row clicks from the Content list (UX-Content-1) reliably open the correct workspace.
- [ ] No new Prisma schema changes were introduced.
- [ ] Mobile layout remains usable: panels stack vertically, no horizontal scrolling.
- [ ] No backend or schema changes were required; all behavior is implemented in the frontend only.

---

## PHASE MARKETING-1 — Universal Homepage & Positioning (Completed)

### Phase Summary

Bring the public marketing homepage in line with EngineO.ai's DEO positioning, moving from a Shopify-centric SEO tool narrative to a universal Discovery Engine Optimization platform that works for ecommerce, SaaS, content sites, and blogs.

### MARKETING-1.1 Scope

- **Route:** `/`
- **Files:**
  - `apps/web/src/app/(marketing)/page.tsx`
  - `apps/web/src/app/(marketing)/layout.tsx`
  - `apps/web/src/components/marketing/MarketingNavbar.tsx`
  - `apps/web/src/components/marketing/MarketingFooter.tsx`
- Update the homepage hero and body copy to:
  - Primary message: "Optimize any website for search & AI discovery."
  - Clearly define DEO (SEO + AEO + PEO + VEO).
  - Emphasize support for ecommerce, SaaS, content-driven sites, and blogs.
- Add universal sections:
  - DEO Components (Content, Entities, Technical, Visibility).
  - Issues Engine overview.
  - Product & Content Optimization Workspaces.
  - Supported Platforms (ecommerce, CMS, headless/custom).
  - "Who it's for" panel and final CTA.

### MARKETING-1.2 Constraints

- Frontend-only changes in `apps/web`.
- No backend, pricing, or dashboard changes.
- Content and component-level updates only; respect existing layout and Tailwind design language.

### MARKETING-1.3 Acceptance Criteria (Completed)

- [x] Homepage hero uses the new universal DEO copy (no Shopify-only framing).
- [x] Homepage includes DEO components, Issues Engine, Workspaces, Supported Platforms, and "Who it's for" sections.
- [x] CTAs route correctly to `/signup`, `/features`, and `/contact`.
- [x] Design remains responsive and consistent with the existing marketing layout.

---

## PHASE MARKETING-2 — Dedicated Shopify Landing Page (Completed)

### Phase Summary

Create a high-conversion Shopify-specific landing page that speaks directly to Shopify merchants while keeping the universal homepage platform-agnostic.

### MARKETING-2.1 Scope

- **Route:** `/shopify`
- **File:** `apps/web/src/app/(marketing)/shopify/page.tsx`
- Add a dedicated vertical landing page containing:
  - **Shopify Hero:**
    - Heading: "EngineO.ai for Shopify".
    - Subheading: "Optimize your products, collections, pages & blogs for search and AI — automatically."
    - CTAs: Start Free (`/signup`) and Connect Your Store (`/login`).
  - **Why Shopify Stores Need DEO (not SEO):**
    - Explain multi-surface discovery: Google, TikTok, YouTube, ChatGPT, Shopping AI, retail AI engines.
    - Emphasize DEO pillars: Content, Entities, Technical health, Visibility signals, Answer-surface readiness.
  - **Deep Crawl of Your Shopify Store:**
    - Coverage of products, collections, home, blogs, About/Contact/Policies, and SEO liquid pages.
  - **Product Optimization Workspace (Shopify Edition):**
    - Product-level DEO score, AI metadata, alt text + metadata analysis, thin content detection, missing metadata fixes, Shopify SEO sync, per-product issues, and collection-aware insights (later phase).
  - **Content Workspace for collections and blogs:**
    - Collection and blog optimization, home page insights, and landing page DEO.
  - **Issues Engine for Shopify** and **Auto-Crawl + Auto-Recompute (Shopify Edition)**.
  - **Supported Shopify themes / stacks** and **Shopify-specific FAQ**.
- Update marketing navigation:
  - Add "Shopify" link in `MarketingNavbar` pointing to `/shopify`.

### MARKETING-2.2 Constraints

- Frontend-only; no changes to Shopify integration code or dashboard flows.
- Homepage remains universal; Shopify messaging stays confined to the `/shopify` route.
- Reuse Tailwind layout patterns and marketing layout components.

### MARKETING-2.3 Acceptance Criteria (Completed)

- [x] `/shopify` renders with all defined Shopify sections (hero, DEO rationale, deep crawl, workspaces, Issues Engine, auto-crawl, supported stack, FAQ, final CTA).
- [x] CTAs on the Shopify page route correctly to `/signup`, `/login`, and `/contact`.
- [x] Marketing navbar includes a Shopify link, visible on desktop and mobile.
- [x] Page is mobile responsive and visually consistent with the universal homepage.

---

## PHASE MARKETING-3 — Pricing Page (Completed)

### Phase Summary

Implement a dedicated pricing page that clearly communicates EngineO.ai's tiers, limits, and upgrade paths using Free, Pro, and Business plans, while aligning with DEO value rather than raw feature lists.

### MARKETING-3.1 Scope

- **Route:** `/pricing`
- **File:** `apps/web/src/app/(marketing)/pricing/page.tsx`
- **Components (marketing):**
  - `PricingHero.tsx` — hero copy + primary CTAs.
  - `PricingTable.tsx` — three-tier pricing cards + feature comparison table.
  - `PricingFAQ.tsx` — pricing-related FAQ section.
  - `PricingCTASection.tsx` — final CTA block.
- **Pricing hero:**
  - Heading: "Simple pricing for every website."
  - Subheading: "Choose a plan that grows with your business."
  - CTAs: Start Free (`/signup`), Contact Sales (`/contact`).
- **Pricing tiers:**
  - **Free — $0/mo**
    - 1 project, 100 crawled pages, weekly crawl.
    - DEO Score (v1), critical issues only.
    - Product Workspace (1 product), Content Workspace (view-only).
    - 5 AI suggestions per day.
  - **Pro — $29/mo (Most Popular)**
    - 5 projects, 5,000 crawled pages, daily crawl.
    - Full Issues Engine, full Product & Content Workspaces.
    - Unlimited AI suggestions, Shopify SEO sync.
    - DEO Trends (coming soon), priority support.
  - **Business — $99/mo**
    - 20 projects, 25,000 crawled pages.
    - Hourly crawl scheduling (coming soon).
    - Team roles, API access, audit exports, dedicated account manager.
- **Optional Enterprise row:**
  - Custom pricing with "Book Demo" CTA.
- **Feature comparison table:**
  - Rows for projects, crawled pages, crawl frequency, Issues Engine scope, workspaces, AI suggestions, Shopify SEO sync, DEO Trends, and support.
  - Columns for Free, Pro, and Business, with values matching tier bullets.
- **Pricing FAQ:**
  - Clarify free plan behavior, theme/code impact, developer needs, AI usage, cancellation, and agency/annual discounts.
- **Final CTA:**
  - Copy: "Ready to improve your visibility across search & AI? Start Free Today."
  - Primary CTA: Start Free (`/signup`), secondary CTA: Talk to Sales (`/contact`).

### MARKETING-3.2 Constraints

- Frontend-only; no backend pricing, entitlement, or billing logic changes.
- Does not wire into billing or subscription enforcement (those are handled in pricing/billing phases).
- Uses existing Tailwind and marketing layout patterns; no major redesign.

### MARKETING-3.3 Acceptance Criteria (Completed)

- [x] `/pricing` page renders with hero, three-tier pricing, optional Enterprise row, comparison table, FAQ, and final CTA.
- [x] CTAs route correctly to `/signup`, `/contact`, and other relevant entry points.
- [x] Layout is mobile responsive and visually consistent with MARKETING-1 and MARKETING-2.
- [x] Pricing content (tiers, bullets, and calls-to-action) matches the defined specification.

---

## PHASE MARKETING-4 — Websites Vertical Landing Page (Completed)

### Phase Summary

Create a dedicated vertical landing page for WordPress, Webflow, and all non-ecommerce websites. This page speaks to website owners, bloggers, documentation sites, and SaaS marketing teams — reinforcing that DEO is not just for product catalogs, but for every crawlable page.

### MARKETING-4.1 Scope

- **Route:** `/websites`
- **File:** `apps/web/src/app/(marketing)/websites/page.tsx`

**Components created:**

1. **WebsitesHero** (`apps/web/src/components/marketing/WebsitesHero.tsx`)
   - Heading: "EngineO.ai for WordPress, Webflow, and Every Website."
   - Subheading: "Optimize all your pages, blogs, documentation, and landing pages for search & AI — automatically."
   - CTAs: Start Free (`/signup`) and Try Demo (`/contact`).

2. **WebsitesFeatures** (`apps/web/src/components/marketing/WebsitesFeatures.tsx`)
   - Why DEO matters for all websites (not just ecommerce).
   - Full-site crawling coverage.
   - Content Workspace (Non-Ecommerce Edition).
   - Issues Engine for content sites.
   - AI-powered metadata generation.

3. **WebsitesPlatforms** (`apps/web/src/components/marketing/WebsitesPlatforms.tsx`)
   - Website & blog CMS: WordPress, Webflow, Wix, Squarespace, Ghost, HubSpot CMS, Drupal, Blogger.
   - Modern headless frameworks: Next.js, Remix, Astro, Gatsby, Nuxt, SvelteKit, Custom frameworks.
   - Custom sites: Static sites, Server-rendered apps, Hybrid architectures.

4. **WebsitesFAQ** (`apps/web/src/components/marketing/WebsitesFAQ.tsx`)
   - Plugin requirements, blog metadata, content rewriting, crawl frequency.

5. **WebsitesCTASection** (`apps/web/src/components/marketing/WebsitesCTASection.tsx`)
   - Final CTA with dark slate background.
   - CTAs: Start Free (`/signup`) and Talk to the founder (`/contact`).

**Navigation update:**

- Added "Websites" link to `MarketingNavbar.tsx` navigation array.
- Visible on desktop nav and mobile menu.

### MARKETING-4.2 Constraints

- Frontend-only; no backend changes.
- Uses existing Tailwind and marketing layout patterns.
- Consistent with MARKETING-1, MARKETING-2, and MARKETING-3 styling.

### MARKETING-4.3 Acceptance Criteria (Completed)

- [x] `/websites` page renders with hero, features, platforms, FAQ, and final CTA.
- [x] CTAs route correctly to `/signup` and `/contact`.
- [x] Layout is mobile responsive and visually consistent with other marketing pages.
- [x] MarketingNavbar includes "Websites" link in both desktop and mobile menus.
- [x] `docs/MARKETING.md` updated with Websites vertical page documentation.

---

## PHASE MARKETING-5 — Full Product Tour Page (Completed)

### Phase Summary

Create a full-length Product Tour page that walks visitors through every major capability of EngineO.ai, demonstrates the DEO Score system, explains signals, issues, crawling, automation, and AI Workspaces, and bridges ecommerce and general site optimization — all using the on-brand DEO narrative.

### MARKETING-5.1 Scope

- **Route:** `/features`
- **File:** `apps/web/src/app/(marketing)/features/page.tsx`

**Components (marketing):**

1. **ProductTourHero.tsx** — hero copy + primary CTAs.
2. **ProductTourDEOSection.tsx** — "What EngineO.ai actually does" and DEO Score explanation.
3. **ProductTourCrawlSection.tsx** — full-site crawling engine and crawl graph placeholder.
4. **ProductTourIssuesSection.tsx** — Issues Engine overview and "View all issues" CTA.
5. **ProductTourProductWorkspace.tsx** — Product Optimization Workspace section with screenshot placeholder.
6. **ProductTourContentWorkspace.tsx** — Content Optimization Workspace section with screenshot placeholder.
7. **ProductTourAutomation.tsx** — DEO automation capabilities.
8. **ProductTourPlatforms.tsx** — supported platforms list linking to `/websites`.
9. **ProductTourSEOComparison.tsx** — DEO vs SEO category clarification.
10. **ProductTourCTASection.tsx** — final CTA block.

**Content and structure:**

- **Hero:** Heading: "A complete visibility engine for your entire website." Body lines describing crawling, signals, DEO Score, AI-powered workflows, and "One platform. Every page. All your discovery signals." CTAs: Start Free (`/signup`) and Try Demo (`/contact`).

- **What EngineO.ai Actually Does:** Make clear that EngineO.ai is a DEO platform, not a traditional SEO tool. Enumerate the seven steps: crawl, extract signals, compute DEO Score, detect issues, generate AI fixes, automate rescans/recompute, and help optimize products/pages/blogs/collections.

- **DEO Score:** Explain the four DEO components (Content Quality, Entities & Semantic Signals, Technical Health, Visibility Strength). Emphasize that DEO Score is a single visibility number across search engines and AI assistants. Include a DEO Score dial/card placeholder visualization.

- **Full-Site Crawling Engine:** List crawled URL types: product, collection/category, blog posts, landing pages, home, documentation, custom routes, hub pages, navigation pages. Copy: "We crawl your entire website automatically. No setup. No plugins. No code." Include a "Crawl graph" placeholder.

- **Issues Engine:** Enumerate issues: missing metadata, thin content, weak structure, answer-surface gaps, low entity coverage, crawl failures, navigation gaps, shallow product content, broken links. Clarify that each issue explains what it is, why it matters, how to fix it, and which pages/products are affected. Include a "View all issues" CTA into the app.

- **Product Optimization Workspace:** Call out: product overview, AI metadata suggestions, SEO + DEO insights, Shopify sync, variant-aware crawling, issue badges, optimization history (future). Include a screenshot placeholder.

- **Content Optimization Workspace:** Call out: title/description editing, AI suggestions, thin content detector, entity structure insights, crawl health, page-level issues. Mention support for WordPress, Webflow, Wix, Squarespace, Ghost, and custom sites. Include a screenshot placeholder.

- **DEO Automation:** Copy: "Your website changes. Your visibility shouldn't break." List automation capabilities: scheduled crawls, DEO recompute, issue re-evaluation, drift detection (Shopify metadata changes), trend snapshots (coming soon).

- **Supported Platforms:** List: WordPress, Webflow, Wix, Squarespace, Shopify, Ghost, Custom, Static headless sites. CTA: "View supported platforms" linking to `/websites`.

- **DEO vs SEO:** Explain that SEO focuses on keywords and SERP ranking, while DEO focuses on visibility across search engines, AI assistants, and answer engines. Note that EngineO.ai evaluates discovery surface, entity relevance, answer readiness, and crawl accessibility.

- **Final CTA:** Copy: "Everything you need to understand and improve your website. Get your DEO Score, issues, and AI-powered fixes in minutes." CTA: Start Free (`/signup`).

### MARKETING-5.2 Constraints

- Frontend-only; no backend, crawling, or scoring logic changes.
- Reuse existing marketing layout (`apps/web/src/app/(marketing)/layout.tsx`) and Tailwind/shadcn/ui patterns from MARKETING-1 through MARKETING-4.
- Keep copy aligned with BRANDING_GUIDE tone (clear, confident, modern, calm, outcome-focused; no emojis or hype).
- Maintain separation of concerns:
  - Homepage (`/`) remains universal positioning.
  - `/shopify` focuses on Shopify merchants.
  - `/websites` focuses on websites/CMS.
  - `/features` becomes the canonical full Product Tour.

### MARKETING-5.3 Acceptance Criteria (Completed)

- [x] `/features` renders as a full Product Tour page using the new ProductTour* components.
- [x] All required sections are present: hero, what EngineO.ai does, DEO Score, crawling, Issues Engine, Product Workspace, Content Workspace, automation, supported platforms, DEO vs SEO, and final CTA.
- [x] Visual placeholder blocks exist for crawl graph, DEO Score, and both workspace screenshots.
- [x] Page is mobile responsive and visually consistent with other marketing pages.
- [x] CTAs route correctly to `/signup`, `/contact`, and `/websites` where applicable.
- [x] `docs/MARKETING.md` documents the Product Tour / Features page structure and components.

---

## PHASE MARKETING-6 — "What Is DEO?" Education Page (Completed)

### Phase Summary

Create a long-form education page that establishes EngineO.ai as the category leader for DEO (Discovery Engine Optimization). This page explains what DEO is, why it matters, how it differs from traditional SEO, and positions EngineO.ai as the definitive platform for DEO implementation.

### MARKETING-6.1 Scope

- **Route:** `/deo`
- **File:** `apps/web/src/app/(marketing)/deo/page.tsx`

**Components (marketing/deo):**

1. **DeoHero.tsx** — category-defining hero with DEO framing.
2. **DeoWhySection.tsx** — why traditional SEO isn't enough.
3. **DeoPillarsSection.tsx** — the four DEO pillars (Content, Entities, Technical, Visibility).
4. **DeoAIVisibilitySection.tsx** — how AI models "see" websites.
5. **DeoResultsSection.tsx** — outcomes from implementing DEO.
6. **DeoComparisonTable.tsx** — side-by-side SEO vs DEO comparison.
7. **DeoEngineSection.tsx** — how EngineO.ai implements DEO.
8. **DeoAudienceSection.tsx** — who DEO is for.
9. **DeoFAQSection.tsx** — common DEO questions.
10. **CTASection.tsx** — final CTA block.

**Content and structure:**

- **Hero:** Heading: "What is DEO?" Subheading: "Discovery Engine Optimization is SEO + AEO + PEO + VEO." Short copy defining DEO as the practice of optimizing for discovery across search engines, AI assistants, and answer engines. Visual placeholder for DEO diagram. CTAs: See your DEO Score (`/signup`) and Learn More (anchor).

- **Why DEO Exists:** Traditional SEO was built for a Google-only world. Lists new discovery surfaces (ChatGPT, Gemini, Perplexity, voice assistants, in-app AI, vertical search). Positions DEO as the framework for multi-channel visibility.

- **The Four DEO Pillars:** Content Quality (deep, unique, authoritative content), Entities & Semantics (structured data, schema, entity linkage), Technical Health (crawlability, speed, indexability, mobile-readiness), Visibility Signals (mentions, citations, answer-surface appearance).

- **How AI "Sees" Your Website:** AI models extract entities, evaluate structure, and score answer-worthiness. Traditional SEO metrics are less relevant than semantic clarity and entity coverage. DEO is the framework for AI-age visibility.

- **DEO Results:** Higher organic traffic, increased AI citations, improved answer-surface presence, more consistent brand visibility across platforms.

- **DEO vs SEO Comparison Table:** Side-by-side showing keyword-focused vs entity-focused, SERP-only vs multi-platform, few pages vs entire site, manual vs automated, human metadata vs AI-suggested, rank-based vs visibility-based.

- **How EngineO.ai Implements DEO:** Full-site crawl, DEO Score, Issues Engine, AI Optimization Workspaces, automation layer, CMS-agnostic.

- **Who DEO Is For:** SaaS companies, ecommerce brands, publishers & bloggers, agencies, local businesses, documentation-heavy sites, any website with 10+ pages.

- **DEO FAQs:** Is DEO meant to replace SEO? Does DEO help with AI visibility? Do I need technical skills? Is DEO only for big websites?

- **Final CTA:** Heading: "Ready to see your DEO Score?" Copy: "Get your visibility analysis and AI-powered fixes in seconds." CTA: Start Free (`/signup`).

### MARKETING-6.2 Constraints

- Frontend-only; no backend, crawling, or scoring logic changes.
- Reuse existing marketing layout and Tailwind/shadcn/ui patterns from MARKETING-1 through MARKETING-5.
- Keep copy aligned with BRANDING_GUIDE tone (clear, confident, modern, calm, outcome-focused; no emojis or hype).
- Components live in a dedicated `deo/` subdirectory under marketing.

### MARKETING-6.3 Acceptance Criteria (Completed)

- [x] `/deo` renders as a long-form DEO education page using the new Deo* components.
- [x] All required sections are present: hero, why DEO exists, four pillars, AI visibility, results, comparison table, how EngineO.ai implements DEO, audience, FAQs, and final CTA.
- [x] Page is mobile responsive and visually consistent with other marketing pages.
- [x] CTAs route correctly to `/signup`.
- [x] `docs/MARKETING.md` documents the DEO education page structure and components.

---

## PHASE UX-7 — Issue Engine Lite (Completed)

### Phase Summary

Enhance the Issues Engine with product-focused issue detection and actionable fix buttons. This phase surfaces 12 product-specific issue types with severity classification and routes users directly to appropriate fix flows (AI fix, manual fix, or sync).

### UX-7.1 Scope

**Backend Changes:**

1. **packages/shared/src/deo-issues.ts:**
   - Added `DeoIssueFixType` type: `'aiFix' | 'manualFix' | 'syncFix'`
   - Extended `DeoIssue` interface with optional fields:
     - `type?: string` — Stable issue identifier
     - `fixType?: DeoIssueFixType` — How to resolve the issue
     - `fixReady?: boolean` — Whether AI fix is available
     - `primaryProductId?: string` — Main product for fix action

2. **apps/api/src/projects/deo-issues.service.ts:**
   - Added 12 product-focused issue builders:
     - `buildMissingSeoTitleIssue()` — Critical, aiFix
     - `buildMissingSeoDescriptionIssue()` — Critical, aiFix
     - `buildWeakTitleIssue()` — Warning, aiFix
     - `buildWeakDescriptionIssue()` — Warning, aiFix
     - `buildMissingLongDescriptionIssue()` — Warning, manualFix
     - `buildDuplicateProductContentIssue()` — Warning, manualFix
     - `buildLowProductEntityCoverageIssue()` — Warning, aiFix
     - `buildNotAnswerReadyIssue()` — Warning, aiFix
     - `buildWeakIntentMatchIssue()` — Info, aiFix
     - `buildMissingProductImageIssue()` — Critical, syncFix
     - `buildMissingPriceIssue()` — Critical, syncFix
     - `buildMissingCategoryIssue()` — Warning, manualFix

**Frontend Changes:**

1. **apps/web/src/components/issues/IssuesList.tsx:**
   - Extended `ISSUE_UI_CONFIG` with all 12 Issue Engine Lite issue IDs

2. **apps/web/src/app/projects/[id]/issues/page.tsx:**
   - Complete rewrite with Issue Engine Lite UI:
     - Summary header with project name and "Re-scan Issues" button
     - Summary cards (Total, Critical, Warning, Info counts)
     - Severity filter buttons (All, Critical, Warning, Info)
     - Issue list with severity badges and fix action buttons
     - Fix action variants: AI (purple), Sync (green), Manual/Default (gray)
     - Empty states for no issues or filtered views

3. **apps/web/src/app/projects/[id]/products/page.tsx:**
   - Added issue count badge next to "Products" header linking to Issues page
   - Updated pre-crawl banner to mention Issues Engine
   - Updated empty state copy to mention Issues Engine

### UX-7.2 Constraints

- No new database tables; leverages existing Product and CrawlResult data
- Issue detection runs on-demand when issues endpoint is called
- Fix actions route to existing product workspace or sync flows

### UX-7.3 Acceptance Criteria (Completed)

- [x] `/projects/[id]/issues` renders Issue Engine Lite page
- [x] 12 product-focused issue types detected and displayed
- [x] Severity filtering (All/Critical/Warning/Info) works correctly
- [x] Fix actions route to appropriate fix flows
- [x] Products page shows issue count badge when issues exist
- [x] Pre-crawl banner mentions Issues Engine
- [x] `docs/testing/issue-engine-lite.md` created with manual testing scenarios
- [x] `docs/testing/CRITICAL_PATH_MAP.md` updated with CP-009: Issue Engine Lite

### UX-7.4 One-Click AI Fix (Completed)

**Goal:** Enable one-click AI fixes for `missing_seo_title` and `missing_seo_description` issues directly from the Issues page, with proper plan gating and daily AI limits.

**Backend Changes:**

1. **apps/api/src/ai/product-issue-fix.service.ts (NEW):**
   - `ProductIssueFixService` with `fixMissingSeoFieldFromIssue()` method
   - Validates product ownership
   - Enforces Free plan gating (ENTITLEMENTS_LIMIT_REACHED)
   - Enforces daily AI limits via `EntitlementsService.ensureWithinDailyAiLimit()`
   - Calls `AiService.generateMetadata()` to generate SEO content
   - Persists AI-generated SEO field to product
   - Returns structured response with `updated`, `field`, and `reason` fields

2. **apps/api/src/ai/ai.module.ts:**
   - Added `ProductIssueFixService` to providers and exports

3. **apps/api/src/ai/ai.controller.ts:**
   - Added `POST /ai/product-metadata/fix-from-issue` endpoint
   - Accepts `{ productId, issueType }` body
   - Delegates to `ProductIssueFixService`

**Frontend Changes:**

1. **apps/web/src/lib/api.ts:**
   - Added `aiApi.fixIssueLite(productId, issueType)` function

2. **apps/web/src/app/projects/[id]/issues/page.tsx:**
   - Added `fixingIssueId` state for loading indicator
   - Added `handleAiFixNow()` handler for inline AI fixes
   - Updated `getFixAction()` to return `kind: 'ai-fix-now'` for supported issue types
   - Added "Fix now" button with spinner for `missing_seo_title` and `missing_seo_description`
   - Proper error handling for AI_DAILY_LIMIT_REACHED and ENTITLEMENTS_LIMIT_REACHED
   - Success/info toasts for fix outcomes

**Tests:**

1. **tests/unit/automation/product-issue-fix.service.test.ts:**
   - Ownership validation test
   - Plan gating test (Free vs Pro)
   - AI daily limit propagation test

2. **tests/integration/automation/issue-lite-ai-fix.integration.test.ts:**
   - End-to-end test: Pro plan fixes missing SEO title

**UX-7.4 Acceptance Criteria (Completed):**

- [x] "Fix next" button appears for `missing_seo_title` and `missing_seo_description` issues
- [x] Free plan users see upgrade toast when attempting AI fix
- [x] Pro/Business users can run one-click AI fixes
- [x] AI fixes respect daily AI limits with proper error messaging
- [x] Success/info toasts provide clear feedback on fix outcomes
- [x] Issue list refreshes after successful fix
- [x] Unit and integration tests cover core scenarios
- [x] `docs/manual-testing/phase-ux-7-issues-engine-lite.md` documents AI fix testing

### UX-7.1 – Microcopy Clarification (Fix next) (Completed)

**Goal:** Clarify Issue Engine Lite "Fix" actions to emphasize per-item safety and improve user understanding of the fix workflow.

**Changes:**

1. **Button Label:**
   - Updated AI fix buttons from "Fix now" to "Fix next" on the Issues page

2. **Helper Copy:**
   - Added helper text under AI-fixable issues: "Fixes one affected product at a time for safe review."

3. **Success Toasts:**
   - Updated success toasts to show SEO field and remaining count:
     - "SEO title generated for one product. X remaining."
     - "SEO description generated for one product. X remaining."

4. **Limit Toasts:**
   - Entitlement limit: "Upgrade to fix additional products with AI."
   - Token limit: "Token limit reached. Upgrade to continue fixing products."

**Files Changed:**

- `apps/web/src/app/projects/[id]/issues/page.tsx` — Updated button label, added helper text, improved toast messages
- `docs/testing/issue-engine-lite.md` — Added UX-7.1 Microcopy Clarification addendum

**UX-7.1 Acceptance Criteria (Completed):**

- [x] Button label reads "Fix next" (not "Fix now")
- [x] Helper text appears under AI-fixable issues
- [x] Success toasts include remaining count
- [x] Limit toasts use concise, actionable copy
- [x] `docs/testing/issue-engine-lite.md` updated with UX-7.1 addendum

### UX-7.2 – Inline Preview Before Fix (Completed)

**Goal:** Add an inline, per-item preview step for Issue Engine Lite AI fixes so DEOs can see the proposed SEO change before applying it.

**Changes:**

1. **Preview Flow:**
   - "Fix next" no longer applies AI fixes immediately for metadata issues (missing_seo_title, missing_seo_description); instead, it opens an inline preview panel in the issue row.
   - Preview panel shows the product being fixed, the field (SEO title/SEO description), the current value (or "Missing"), and an AI-generated preview value (read-only) using existing product metadata suggestion logic.

2. **Inline Actions:**
   - **Apply fix** — persists the AI-generated value via the existing Issue Engine Lite AI fix path and collapses the preview.
   - **Cancel** — collapses the preview without persisting any changes or showing toasts, returning focus to the "Fix next" button.

3. **Loading & Error States:**
   - While generating the preview, an inline loading message "Generating preview…" is displayed.
   - On preview generation failure, an inline error "Couldn't generate a preview. Try again." is shown.

4. **Success Toasts:**
   - On successful apply, a toast is shown in the form:
     - "SEO title applied to '{Product Name}'. {remainingCount} remaining."
     - "SEO description applied to '{Product Name}'. {remainingCount} remaining."

5. **Limit Handling:**
   - When preview generation is blocked by AI token limits, the preview does not open and the existing limit toast is reused:
     - "Token limit reached. Upgrade to continue fixing products."
   - Entitlement-based gating (Free vs Pro/Business) for applying fixes continues to use existing toasts:
     - "Upgrade to fix additional products with AI."

6. **Accessibility:**
   - Preview panel is focusable and receives focus when opened.
   - "Cancel" returns focus to the originating "Fix next" button.

**Files Changed:**

- `apps/web/src/app/projects/[id]/issues/page.tsx` — Added preview state, `handleOpenPreview`, `handleApplyFixFromPreview`, `handleCancelPreview` handlers, inline preview panel UI

**UX-7.2 Acceptance Criteria (Completed):**

- [x] "Fix next" opens an inline preview panel instead of applying immediately
- [x] Preview shows product name, field label, current value, and AI preview
- [x] "Apply fix" persists the change and shows success toast with product name
- [x] "Cancel" closes preview without changes or toasts
- [x] Focus moves to preview panel when opened, returns to button on cancel
- [x] Token limit blocks preview with existing limit toast
- [x] `docs/manual-testing/phase-ux-7-2-inline-preview.md` documents inline preview testing

**Manual Testing:** `docs/manual-testing/phase-ux-7-2-inline-preview.md`

---

## Phase Automation-1 – Automation Playbooks v1 (Completed)

**Status:** Complete

**Goal:** Introduce bulk AI-powered fixes for missing SEO metadata through a safe, user-approved workflow with preview, estimate, and explicit apply steps.

### Automation-1.1 Overview

Automation Playbooks v1 enables DEOs to fix missing SEO titles and missing SEO descriptions in bulk across their product catalog. The workflow ensures user control through:

1. **Preview Step** — Generate AI suggestions for a sample of affected products without persisting changes
2. **Estimate Step** — Show total affected products, estimated token usage, and eligibility status
3. **Apply Step** — Explicit confirmation before writing AI-generated values to products

### Automation-1.2 Backend Changes

**Prisma Schema (apps/api/prisma/schema.prisma):**

```prisma
model TokenUsage {
  id        String   @id @default(cuid())
  userId    String
  source    String   // e.g. "metadata", "automation_playbook:missing_seo_title"
  amount    Int
  createdAt DateTime @default(now())
}
```

**Token Usage Service (apps/api/src/ai/token-usage.service.ts):**

- `TokenUsageService` with `log()` and `getMonthlyUsage()` methods
- `ESTIMATED_METADATA_TOKENS_PER_CALL = 400` constant for token estimation
- Records token usage for manual AI calls and automation playbooks

**AI Module Updates (apps/api/src/ai/ai.module.ts):**

- Added `TokenUsageService` to providers and exports

**AI Controller Updates (apps/api/src/ai/ai.controller.ts):**

- Injected `TokenUsageService` into controller
- Added token logging after successful `suggestProductMetadata` calls
- Source: `manual:product_optimize`

**Automation Playbooks Service (apps/api/src/projects/automation-playbooks.service.ts):**

- `AutomationPlaybooksService` with `estimatePlaybook()` and `applyPlaybook()` methods
- Supports playbook IDs: `missing_seo_title`, `missing_seo_description`
- `estimatePlaybook()` returns:
  - `totalAffectedProducts` — count of products matching criteria
  - `estimatedTokens` — approximate token cost
  - `planId`, `eligible`, `canProceed`, `reasons` — entitlement status
  - `aiDailyLimit` — current limit usage
- `applyPlaybook()` iterates affected products, calls `ProductIssueFixService`, respects daily limits
- Logs token usage with source: `automation_playbook:{playbookId}`

**Projects Controller Updates (apps/api/src/projects/projects.controller.ts):**

- `GET /projects/:id/automation-playbooks/estimate?playbookId=...` — estimate endpoint
- `POST /projects/:id/automation-playbooks/apply` — apply endpoint with `{ playbookId }` body

### Automation-1.3 Frontend Changes

**API Client (apps/web/src/lib/api.ts):**

- `projectsApi.automationPlaybookEstimate(id, playbookId)` — fetch estimate
- `projectsApi.applyAutomationPlaybook(id, playbookId)` — apply playbook

**Automation Activity Page (apps/web/src/app/projects/[id]/automation/page.tsx):**

- Added Activity / Playbooks tab navigation
- Uses `usePathname` for active tab highlighting

**Automation Playbooks Page (apps/web/src/app/projects/[id]/automation/playbooks/page.tsx):**

- New page with 3-step stepper: Preview → Estimate → Apply
- Playbook selection cards showing affected products count
- Preview section with Before/After comparison for sample products
- Estimate section with token usage, daily limit, and eligibility display
- Apply section with confirmation checkbox and progress indicator
- "View updated products" and "Sync to Shopify" post-apply actions
- Plan gating messaging for Free plan users
- Error handling for AI limits and entitlements

### Automation-1.4 Acceptance Criteria (Completed)

- [x] TokenUsage model added to Prisma schema
- [x] TokenUsageService logs token usage for manual and playbook AI calls
- [x] AutomationPlaybooksService supports missing_seo_title and missing_seo_description playbooks
- [x] Estimate endpoint returns affected products, token estimate, and eligibility
- [x] Apply endpoint iterates products, respects daily limits, returns result summary
- [x] Frontend Playbooks page shows Preview → Estimate → Apply workflow
- [x] Free plan users see upgrade messaging and cannot apply playbooks
- [x] Pro/Business users can preview, estimate, and apply playbooks
- [x] Token usage logged with source `automation_playbook:{playbookId}`
- [x] Activity / Playbooks tabs navigate between automation views
- [x] `docs/manual-testing/phase-automation-1-playbooks.md` documents playbook testing

**Manual Testing:** `docs/manual-testing/phase-automation-1-playbooks.md`

---

## Phase SHOP-UX-CTA-1 – Connect Shopify CTA Fix (Completed)

**Status:** Complete

**Goal:** Fix the "Connect Shopify" CTA button in the First DEO Win checklist to reliably initiate OAuth flow when the store domain is already known, providing clear UX feedback during the connection process.

### SHOP-UX-CTA-1.1 Overview

The First DEO Win checklist shows a "Connect your store" step for users who haven't connected Shopify yet. Previously, clicking this button only scrolled to the Shopify integration section. This phase improves the experience by:

1. **Personalized CTA Label** — Shows "Connect {store-domain}" when the store domain is known
2. **Direct OAuth Flow** — Initiates OAuth immediately when domain is available (no scroll/focus needed)
3. **Loading State** — Shows "Connecting…" with disabled state during OAuth redirect
4. **Fallback Behavior** — Scrolls to integration section only when domain is unknown

### SHOP-UX-CTA-1.2 Backend Changes

**Projects Service (apps/api/src/projects/projects.service.ts):**

- Added `projectDomain` field to `getIntegrationStatus()` response
- Returns project's `domain` field alongside Shopify integration status
- Enables frontend to access store domain from multiple sources

### SHOP-UX-CTA-1.3 Frontend Changes

**FirstDeoWinChecklist Component (apps/web/src/components/projects/FirstDeoWinChecklist.tsx):**

- Added `getConnectStoreCtaLabel(storeDomain?: string)` helper function:
  - Returns "Connect {domain}" when storeDomain is provided
  - Returns "Connect Shopify" as fallback
- New props added to interface:
  - `storeDomain?: string` — Store domain for personalized CTA
  - `connectingSource?: boolean` — Loading state flag
- Button renders with:
  - `disabled` attribute when connecting
  - `disabled:opacity-50 disabled:cursor-not-allowed` styling
  - "Connecting…" label during redirect

**Project Overview Page (apps/web/src/app/projects/[id]/overview/page.tsx):**

- Added `connectingSource` state variable
- Added `projectDomain` to `IntegrationStatus` interface
- Updated `handleChecklistConnectSource()`:
  - Checks for known `shopDomain` from integration status
  - If available: sets loading state and redirects to OAuth URL immediately
  - Fallback: scrolls to integration section and focuses input
- Passes `storeDomain` and `connectingSource` props to `FirstDeoWinChecklist`

### SHOP-UX-CTA-1.4 Acceptance Criteria (Completed)

- [x] `getConnectStoreCtaLabel()` helper returns personalized label when domain available
- [x] FirstDeoWinChecklist supports `storeDomain` and `connectingSource` props
- [x] Button shows "Connecting…" and disabled state during OAuth redirect
- [x] OAuth initiates immediately when store domain is known
- [x] Fallback behavior scrolls to integration section when domain unknown
- [x] `projectDomain` added to integration status API response
- [x] Unit tests cover helper functions and button state logic
- [x] Manual testing doc created

**Manual Testing:** `docs/manual-testing/phase-shop-ux-cta-1-connect-shopify.md`

---

## Phase SHOP-UX-CTA-1.1 – Deduplicate Connect Shopify Actions (Direct OAuth, No Scroll) (Completed)

**Status:** Complete

**Goal:** Ensure the Project Overview "Connect Shopify" experience uses a single canonical CTA that always starts Shopify OAuth directly, without relying on scrolling into the Diagnostics drawer or competing buttons.

### SHOP-UX-CTA-1.1 Overview

Phase SHOP-UX-CTA-1.1 tightens the connect experience by:

1. **Canonical OAuth Handler** — Introduces a single `startShopifyOAuth` handler on the Project Overview page used by the First DEO Win checklist for all Shopify connect actions.
2. **Domain Source Precedence** — Uses the integration `shopDomain` when present, falls back to `projectDomain`, and otherwise prompts the user for a Shopify store domain before starting OAuth.
3. **Direct OAuth Only** — Removes scroll/focus behavior to the Diagnostics Shopify Integration card; connect actions always start OAuth directly with the selected domain.
4. **Safe UX States** — Maintains a `connectingSource` loading state that disables the CTA, shows a "Connecting…" label, and surfaces a toast when OAuth cannot be initiated.

### SHOP-UX-CTA-1.1 Frontend Changes

**Project Overview Page (apps/web/src/app/projects/[id]/overview/page.tsx):**

- Added `startShopifyOAuth()` helper that:
  - Reads `status.shopify.shopDomain` and `status.projectDomain` to determine the store domain.
  - Prompts the user for a domain when neither value is set, then normalizes to `*.myshopify.com`.
  - Builds the `/shopify/install` URL with `shop`, `projectId`, and `token` query parameters.
  - Sets `connectingSource` to true during redirect and shows an error toast with "Couldn't start Shopify connection. Try again." if initiation fails.
- Updated `handleChecklistConnectSource()` to call `startShopifyOAuth()` directly with no scroll or focus side effects.
- Updated the Shopify Integration diagnostics card to render only when `status.shopify.connected === true`, removing the second primary "Connect Shopify Store" button when not connected.

**FirstDeoWinChecklist Component (apps/web/src/components/projects/FirstDeoWinChecklist.tsx):**

- Updated the connect step description copy to:
  - "Connect your Shopify store to crawl products and apply optimizations."
- Continues to:
  - Render a personalized CTA label via `getConnectStoreCtaLabel(storeDomain)`.
  - Switch the connect CTA label to "Connecting…" and disable the button when `connectingSource` is true.

**Unit Tests (tests/unit/shopify/shopify-connect-cta.test.ts):**

- Extended tests for Shopify connect helpers to cover:
  - Domain precedence between `shopDomain` and `projectDomain`.
  - Normalization of domains with or without `.myshopify.com` and with/without protocol.
  - Failure behavior when no domain is available from any source.

### SHOP-UX-CTA-1.1 Acceptance Criteria (Completed)

- [x] Only one primary "Connect Shopify" CTA is visible on the Project Overview when not connected.
- [x] First DEO Win "Connect your store" step always initiates Shopify OAuth directly (no scroll/focus to Diagnostics).
- [x] Stored Shopify integration domain is used when available; otherwise `projectDomain` is used; otherwise a prompt collects the domain.
- [x] Connect CTA uses `connectingSource` to disable the button and show a "Connecting…" label during redirect.
- [x] If OAuth initiation fails, the button is re-enabled and a toast appears: "Couldn't start Shopify connection. Try again."
- [x] Shopify Integration card inside Diagnostics is hidden when not connected to avoid duplicate CTAs.
- [x] Unit tests exercise connect CTA label/disabled behavior and domain selection logic.
- [x] Manual testing doc created.

**Manual Testing:** `docs/manual-testing/phase-shop-ux-cta-1-1-dedup-connect-shopify.md`

---

## Phase SHOP-UX-CTA-2 – DEO Score Step Completion (Completed)

**Status:** Complete

**Goal:** Ensure that after a user views their DEO Score from the First DEO Win checklist, the "Review your DEO Score" step is marked complete when the DEO Score / issues banner is closed, and the checklist progress updates immediately.

### SHOP-UX-CTA-2 Overview

This phase tightens the onboarding feedback loop by:

1. **Explicit Review Completion** — Tracking when a user has actually opened and closed the DEO Score / issues banner rather than inferring completion from data alone.
2. **Live Progress Update** — Updating the First DEO Win checklist progress count to 3/4 steps complete as soon as the banner is closed.
3. **Minimal Frontend-Only State** — Implementing the change entirely in frontend state without introducing new backend fields or APIs.

### SHOP-UX-CTA-2 Frontend Changes

**FirstDeoWinChecklist Component (apps/web/src/components/projects/FirstDeoWinChecklist.tsx):**

- Extended props with:
  - `hasReviewedDeoScore?: boolean` — Frontend flag indicating whether the user has completed the "Review your DEO Score" step.
- Inside the component:
  - Derived `deoScoreStepDone = hasReviewedDeoScore ?? hasDeoScore`.
  - Updated the "Review your DEO Score" step to use `deoScoreStepDone` for its `done` state, so it only completes after the review flow is finished when the prop is provided.

**Project Overview Page (apps/web/src/app/projects/[id]/overview/page.tsx):**

- Added local state:
  - `hasReviewedDeoScore` — Tracks whether the user has completed the DEO Score review in the current session.
- Passed `hasReviewedDeoScore` into `FirstDeoWinChecklist` alongside existing step booleans.
- Added `handleCloseIssuesPanel()` helper that:
  - Sets `showIssuesPanel` to `false`.
  - Sets `hasReviewedDeoScore` to `true`.
- Updated the All Issues banner/modal to call `handleCloseIssuesPanel()` from:
  - The backdrop click handler.
  - The header "X" close button handler.
- Kept the banner open/close triggers (View DEO Score from the checklist and View all issues from the Top blockers card) unchanged apart from reusing the shared close handler.

### SHOP-UX-CTA-2 Acceptance Criteria (Completed)

- [x] Clicking "View DEO Score" from the First DEO Win checklist opens the DEO Score / issues banner without immediately marking the step complete.
- [x] Closing the banner via the "X" button or backdrop sets `hasReviewedDeoScore` to `true`.
- [x] After closing the banner, the "Review your DEO Score" step shows as completed and the checklist text updates to "3 of 4 steps complete" (assuming the first two steps are already complete).
- [x] Opening and closing the banner from the "View all issues" button also counts as completing the DEO Score review.
- [x] No new backend fields or endpoints are required; backend-derived metrics remain unchanged.
- [x] Manual testing doc created.

**Manual Testing:** `docs/manual-testing/phase-shop-ux-cta-2-deo-score-completion.md`

---

## Phase AUTO-UX-NEXT-1 – Next DEO Win: Automation Playbooks Entry (Completed)

**Status:** Complete

**Goal:** After users complete the First DEO Win checklist, guide them to a high-leverage "next DEO win" by promoting Automation Playbooks v1 (missing SEO titles/descriptions) from the Project Overview page, using a clear CTA and trust-building preview messaging.

### AUTO-UX-NEXT-1 Overview

This phase introduces a "Next DEO Win" card on the Project Overview page that:

1. **Appears After First DEO Win Completion** — Only visible when all 4 checklist steps are complete (connect store, run crawl, review DEO score, optimize 3 products).
2. **Promotes Automation Playbooks** — Guides users to bulk-fix missing SEO metadata using the existing Automation Playbooks v1 feature.
3. **Shows Plan-Aware Messaging** — Free users see upgrade hints; Pro/Business users see full-access messaging.
4. **Displays Affected Product Counts** — Fetches and shows counts of products missing SEO titles and descriptions.
5. **Navigates with Context** — Clicking the CTA navigates to Playbooks with `source=next_deo_win`, which shows a congratulatory banner.

### AUTO-UX-NEXT-1 Frontend Changes

**New Component: NextDeoWinCard (apps/web/src/components/projects/NextDeoWinCard.tsx):**

- Props:
  - `projectId: string` — The current project ID.
  - `planId?: string | null` — The user's current plan for messaging.
- Behavior:
  - Fetches automation playbook estimates for `missing_seo_title` and `missing_seo_description` in parallel.
  - Displays affected product counts or fallback message on error.
  - Shows plan-aware messaging based on `planId`.
  - CTA button navigates to `/projects/[id]/automation/playbooks?source=next_deo_win`.

**Project Overview Page (apps/web/src/app/projects/[id]/overview/page.tsx):**

- Added imports:
  - `billingApi` from `@/lib/api`
  - `NextDeoWinCard` component
- Added state:
  - `planId` — Fetched via `billingApi.getEntitlements()` on page load.
- Added `fetchPlanId()` callback and included in useEffect.
- Added conditional rendering:
  - Shows `NextDeoWinCard` when all 4 First DEO Win steps are complete.
  - Card appears after the First DEO Win Status Ribbon and before "What Matters Right Now" section.

**Automation Playbooks Page (apps/web/src/app/projects/[id]/automation/playbooks/page.tsx):**

- Added `useSearchParams` import.
- Added state:
  - `source` — Read from `searchParams.get('source')`.
  - `showNextDeoWinBanner` — Derived from `source === 'next_deo_win'`.
  - `bannerDismissed` — Tracks whether user has dismissed the banner.
- Added banner UI:
  - Purple/violet styled banner with checkmark icon.
  - Title: "Nice work on your first DEO win"
  - Copy explains how to use Playbooks for bulk fixes.
  - Dismissible via X button (session-only, local state).
- Banner appears after page header, before automation tabs.

### AUTO-UX-NEXT-1 Acceptance Criteria (Completed)

- [x] "Next DEO win" card appears on Project Overview only when all 4 First DEO Win steps are complete.
- [x] Card shows plan-aware messaging: Free plan users see upgrade hint; Pro/Business users see full-access messaging.
- [x] Card fetches and displays affected product counts for missing SEO titles and descriptions.
- [x] On estimate fetch error, card shows fallback message without blocking CTA.
- [x] Clicking "Open Automation Playbooks" navigates to `/projects/[id]/automation/playbooks?source=next_deo_win`.
- [x] Playbooks page shows congratulatory banner when `source=next_deo_win`.
- [x] Banner is dismissible and does not reappear during the same session.
- [x] No auto-apply behavior; user must still choose playbook → preview → estimate → apply.
- [x] Existing Playbooks page functionality unchanged.
- [x] Manual testing doc created.

**Manual Testing:** `docs/manual-testing/phase-auto-ux-next-1-next-deo-win-automation-playbooks.md`

---

## Phase AUTO-UX-NEXT-2 – Guided "Optimize 3 Products" First DEO Win (Completed)

**Status:** Complete

**Goal:** Guide users toward completing the "Optimize 3 key products" step of the First DEO Win checklist by showing a prioritized list of products missing SEO metadata directly on the Project Overview page, with deep-links that auto-scroll to the SEO metadata section.

### AUTO-UX-NEXT-2 Overview

This phase introduces a "First DEO Win: Optimize 3 products" card on the Project Overview page that:

1. **Appears Before Checklist Completion** — Visible when fewer than 3 products have been optimized and the First DEO Win checklist is still active.
2. **Shows Prioritized Suggestions** — Displays up to 3 products that need SEO optimization, prioritized by those appearing in "Top blockers".
3. **Displays Missing Metadata Badges** — Each product shows badges indicating what's missing (SEO title, description, or both).
4. **Deep-Links to Product Page** — "Optimize" buttons navigate to the Product page with `?focus=metadata` query param.
5. **Auto-Scrolls to Metadata Section** — Product page detects the `focus=metadata` param and auto-scrolls to the SEO Metadata section.
6. **Updated Success Message** — Apply to Shopify shows improved messaging confirming data saved in EngineO.

### AUTO-UX-NEXT-2 Frontend Changes

**Project Overview Page (apps/web/src/app/projects/[id]/overview/page.tsx):**

- Added state:
  - `optimizedProductsCount` — Derived from `overview?.productsWithAppliedSeo`.
- Added computed value:
  - `optimizeThreeSuggestions` — Filters products missing SEO metadata, prioritizes those in `topProductsToFix`, returns up to 3.
- Added conditional rendering:
  - "First DEO Win: Optimize 3 products" card appears when checklist is visible and fewer than 3 products optimized.
  - Card shows amber/orange styling with star icon.
  - Progress indicator shows "X of 3 products optimized".
  - Each suggested product shows name, missing metadata badges, and "Optimize" button.
  - "Optimize" buttons link to `/projects/[id]/products/[productId]?focus=metadata`.

**Product Optimization Page (apps/web/src/app/projects/[id]/products/[productId]/page.tsx):**

- Added imports:
  - `useSearchParams` from `next/navigation`
- Added hooks:
  - `searchParams = useSearchParams()` — For reading query params.
- Added useEffect for deep-link handling:
  - Detects `searchParams.get('focus') === 'metadata'`.
  - Calls `scrollToSection('metadata-section')` after 200ms delay (for DOM readiness).
  - Cleanup clears timeout on unmount.
- Updated success message:
  - Changed from "SEO updated in Shopify successfully!" to "SEO updated in Shopify successfully! Applied to Shopify and saved in EngineO."

### AUTO-UX-NEXT-2 Acceptance Criteria (Completed)

- [x] "Optimize 3 products" card appears on Project Overview when checklist is active and fewer than 3 products optimized.
- [x] Card shows up to 3 products missing SEO metadata with prioritization from "Top blockers".
- [x] Each product displays badges for missing SEO title (orange) and/or missing description (blue).
- [x] "Optimize" buttons navigate to product page with `?focus=metadata` query param.
- [x] Product page auto-scrolls to SEO Metadata section when `focus=metadata` is present.
- [x] Apply to Shopify shows updated success message confirming save in EngineO.
- [x] Card hidden when all 4 First DEO Win steps are complete.
- [x] Existing Product page functionality unchanged for direct navigation.
- [x] Manual testing doc created.

**Manual Testing:** `docs/manual-testing/phase-auto-ux-next-2-optimize-three-products.md`

---

## Phase UX-8 – Issue Engine Full (IE-2.0)

**Status:** Complete

**Goal:** Extend Issue Engine with rich metadata fields for better context, prioritization, and AI fix guidance across all issues.

### UX-8.1 Overview

Issue Engine Full (IE-2.0) enriches all existing issues (Phase 3B aggregated + Issue Engine Lite product-focused) with new metadata fields:

- **category** — Issue classification for filtering and grouping
- **whyItMatters** — User-facing explanation of business impact
- **recommendedFix** — Actionable guidance for resolution
- **aiFixable** — Whether AI can fix this issue
- **fixCost** — Estimated effort level (one_click, manual, advanced)

This is a backend-only enhancement; no UI changes are required in this phase. The enriched fields enable future UI improvements like category filtering, AI fix prioritization, and batch operations.

### UX-8.2 Implementation Changes

**Shared Types (packages/shared/src/deo-issues.ts):**

```typescript
// Issue Engine Full types (Phase UX-8)
export type DeoIssueCategory =
  | 'metadata'
  | 'content_entity'
  | 'answerability'
  | 'technical'
  | 'schema_visibility';

export type DeoIssueFixCost = 'one_click' | 'manual' | 'advanced';

// Extended DeoIssue interface with optional IE-2.0 fields:
// - category?: DeoIssueCategory
// - confidence?: number
// - deoComponentKey?: string
// - deoImpactEstimate?: number
// - whyItMatters?: string
// - recommendedFix?: string
// - aiFixable?: boolean
// - fixCost?: DeoIssueFixCost
// - dependencies?: string[]
```

**Backend Changes (apps/api/src/projects/deo-issues.service.ts):**

All issue builders now include Issue Engine Full metadata:

| Issue ID | Category | aiFixable | fixCost |
|----------|----------|-----------|---------|
| missing_metadata | metadata | false | manual |
| thin_content | content_entity | false | manual |
| low_entity_coverage | schema_visibility | false | manual |
| indexability_problems | technical | false | advanced |
| answer_surface_weakness | answerability | false | manual |
| brand_navigational_weakness | schema_visibility | false | advanced |
| crawl_health_errors | technical | false | advanced |
| product_content_depth | content_entity | false | manual |
| missing_seo_title | metadata | true | one_click |
| missing_seo_description | metadata | true | one_click |
| weak_title | metadata | true | one_click |
| weak_description | metadata | true | one_click |
| missing_long_description | content_entity | false | manual |
| duplicate_product_content | content_entity | true | one_click |
| low_product_entity_coverage | schema_visibility | true | one_click |
| not_answer_ready | answerability | true | one_click |
| weak_intent_match | answerability | true | one_click |
| missing_product_image | technical | false | manual |
| missing_price | technical | false | one_click |
| missing_category | schema_visibility | false | one_click |

### UX-8.3 Issue Category Taxonomy

| Category | Description | Example Issues |
|----------|-------------|----------------|
| metadata | SEO titles, descriptions, meta tags | missing_seo_title, weak_title |
| content_entity | Content depth, entity coverage | thin_content, duplicate_product_content |
| answerability | AI answer readiness | not_answer_ready, weak_intent_match |
| technical | Crawl health, indexability | crawl_health_errors, indexability_problems |
| schema_visibility | Entity signals, brand pages | brand_navigational_weakness, missing_category |

### UX-8.4 Constraints

- No new database tables; all enrichment is computed at runtime
- All new fields are optional to maintain backward compatibility
- No UI changes in this phase; frontend can adopt new fields in future phases
- Issue detection logic unchanged; only return shape is enriched

### UX-8.5 Acceptance Criteria (Completed)

- [x] `DeoIssueCategory` and `DeoIssueFixCost` types added to shared package
- [x] `DeoIssue` interface extended with Issue Engine Full fields
- [x] All Phase 3B aggregated issues enriched with category, whyItMatters, recommendedFix, aiFixable, fixCost
- [x] All Issue Engine Lite issues enriched with the same fields
- [x] `docs/deo-issues-spec.md` updated with Issue Engine Full model
- [x] Testing docs created:
  - `docs/testing/issue-engine-full-metadata.md`
  - `docs/testing/issue-engine-full-content-and-entities.md`
  - `docs/testing/issue-engine-full-answerability.md`
  - `docs/testing/issue-engine-full-crawl-derived.md`
  - `docs/testing/issue-engine-full-schema-and-ai-visibility.md`
  - `docs/testing/issue-engine-full-ai-fix-engine.md`
  - `docs/testing/issue-engine-full-batch-fixes.md`
- [x] `docs/manual-testing/phase-ux-8-issue-engine-full.md` created
- [x] `docs/testing/CRITICAL_PATH_MAP.md` updated with CP-010
- [x] `docs/testing/issue-engine-lite.md` updated with relationship to Full

**Manual Testing:** `docs/manual-testing/phase-ux-8-issue-engine-full.md`, `docs/testing/issue-engine-full-*.md`

---

## Phase AE-1 – Answer Engine Foundations (Model & Spec)

**Status:** Complete

**Goal:** Define the Answer Engine conceptual model, shared types, and specifications for Answer Blocks and Answerability detection.

### AE-1.1 Overview

The Answer Engine is a subsystem designed to:

1. **Detect missing/weak answers** — Identify which key buyer/AI questions a product cannot yet answer well
2. **Generate Answer Blocks** — Create structured, factual answers from existing product and page data
3. **Improve Answerability** — Feed high-quality answer signals into DEO Score v2
4. **Be AI-preferable** — Produce content that AI assistants prefer to cite and surface

This phase establishes the foundational model and specifications; implementation phases (AE 1.1, AE 1.2) will add detection and generation logic.

### AE-1.2 Implementation Changes

**Shared Types (packages/shared/src/answer-engine.ts):**

```typescript
// Answer Block Question Categories (10 canonical questions)
export type AnswerBlockQuestionId =
  | 'what_is_it'
  | 'who_is_it_for'
  | 'why_choose_this'
  | 'key_features'
  | 'how_is_it_used'
  | 'problems_it_solves'
  | 'what_makes_it_different'
  | 'whats_included'
  | 'materials_and_specs'
  | 'care_safety_instructions';

// Source types for Answer Blocks
export type AnswerBlockSourceType = 'generated' | 'userEdited' | 'legacy';

// Answer Block interface
export interface AnswerBlock {
  id: string;
  projectId: string;
  productId?: string;
  questionId: AnswerBlockQuestionId;
  question: string;
  answer: string;
  confidence: number;
  sourceType: AnswerBlockSourceType;
  factsUsed: string[];
  deoImpactEstimate?: AnswerBlockDeoImpact;
  version: string;
  createdAt: string;
  updatedAt: string;
}

// Answerability Status interface
export interface AnswerabilityStatus {
  status: 'answer_ready' | 'partially_answer_ready' | 'needs_answers';
  missingQuestions: AnswerBlockQuestionId[];
  weakQuestions: AnswerBlockQuestionId[];
  answerabilityScore?: number;
}
```

### AE-1.3 Canonical Question Taxonomy

| Question ID | Human-Readable Question | Purpose |
|-------------|-------------------------|---------|
| `what_is_it` | What is this? | Core product identification |
| `who_is_it_for` | Who is it for? | Target audience/use case |
| `why_choose_this` | Why choose this? | Value proposition |
| `key_features` | What are the key features? | Feature highlights |
| `how_is_it_used` | How is it used? | Usage instructions |
| `problems_it_solves` | What problems does it solve? | Pain points addressed |
| `what_makes_it_different` | What makes it different? | Differentiation |
| `whats_included` | What's included? | Contents/components |
| `materials_and_specs` | Materials / Specs | Technical details |
| `care_safety_instructions` | Care / safety / instructions | Maintenance/safety |

### AE-1.4 No-Hallucination Rule

**Critical Requirement:** Answers may only use product/page data and known attributes.

- Answers must be derived strictly from existing, verified data
- When data is insufficient, the system must emit a "cannot answer" outcome
- The Answer Engine must never fabricate or infer content that isn't supported by facts

### AE-1.5 Integration Points

**DEO Score v2:**
- Answer Blocks feed into the Answerability component
- `answerabilityScore` provides a 0-100 input signal
- Missing/weak questions reduce the component score

**Issue Engine:**
- Missing/weak Answer Blocks surface as Answerability issues
- Reserved issue ID patterns: `missing_answer_<questionId>`, `weak_answer_<questionId>`

### AE-1.6 Constraints

- No database schema changes in this phase (model definition only)
- No API endpoints (deferred to AE 1.1)
- No UI implementation (deferred to later phases)
- Types must be stable for implementation phases

### AE-1.7 Acceptance Criteria (Completed)

- [x] `packages/shared/src/answer-engine.ts` created with all types
- [x] `AnswerBlock`, `AnswerabilityStatus`, `AnswerBlockQuestionId`, `AnswerBlockSourceType` types defined
- [x] Canonical 10-question taxonomy documented
- [x] `docs/ANSWER_ENGINE_SPEC.md` created with full specification
- [x] `docs/answers-overview.md` updated with Answer Blocks concept
- [x] `docs/testing/answer-engine.md` created for system-level testing
- [x] `docs/manual-testing/phase-ae-1-answer-engine-foundations.md` created
- [x] `docs/testing/CRITICAL_PATH_MAP.md` updated with CP-011: Answer Engine
- [x] Shared package builds successfully

**Manual Testing:** `docs/manual-testing/phase-ae-1-answer-engine-foundations.md`, `docs/testing/answer-engine.md`

---

## Phase AE-1.1 – Answer Engine Detection & API

**Status:** Complete

**Goal:** Implement heuristic Answerability detection for products and expose it via a backend API, without yet generating or persisting Answer Blocks.

### Scope (AE-1.1 Detection & API)

**Shared Types:**
- Extended `packages/shared/src/answer-engine.ts` with:
  - `ProductAnswerabilitySummary` – Per-product summary with productId, productTitle, and status
  - `ProjectAnswerabilityResponse` – Full API response with projectId, generatedAt, overallStatus, and products array

**Backend Implementation:**
- Added `AnswerEngineService` in `apps/api/src/projects/answer-engine.service.ts`:
  - Validates project ownership (throws 404/403 for invalid access)
  - Loads products and computes per-product `AnswerabilityStatus` using heuristics
  - Classifies each of 10 canonical questions as `missing`, `weak`, or `strong`
  - Aggregates into project-level `overallStatus`

- Detection Heuristics:
  - `what_is_it`: Non-empty title + description with concrete content
  - `who_is_it_for`: Audience indicators ("for runners", "for kids")
  - `key_features`: Feature keywords and bullet patterns
  - `how_is_it_used`: Usage verbs and instructions
  - `problems_it_solves`: Problem/solution language
  - `what_makes_it_different`: Differentiation indicators
  - `whats_included`: Inclusion phrases ("includes", "comes with")
  - `materials_and_specs`: Material keywords and dimension patterns
  - `care_safety_instructions`: Care/safety phrases

- Added `GET /projects/:id/answerability` endpoint in `ProjectsController`:
  - Returns `ProjectAnswerabilityResponse`
  - Enforces project ownership

**E2E Tests:**
- `apps/api/test/e2e/answer-engine.e2e-spec.ts`:
  - Happy path with rich/minimal products
  - Authorization tests (403 for non-owner)
  - Not found tests (404 for invalid project)
  - Empty products edge case

**Documentation:**
- Updated `docs/ANSWER_ENGINE_SPEC.md` with Section 9 (AE-1.1 implementation)
- Updated `docs/testing/answer-engine.md` with concrete endpoint tests
- Created `docs/manual-testing/phase-ae-1.1-answer-engine-detection.md`
- Updated `docs/testing/CRITICAL_PATH_MAP.md` CP-011 with AE-1.1 scenarios

### Constraints

- No Prisma schema changes in AE-1.1
- No Answer Block persistence (deferred to AE-1.2+)
- No AI generation (deferred to AE-1.2+)
- No frontend UI changes

### Acceptance Criteria (Completed)

- [x] `ProductAnswerabilitySummary` and `ProjectAnswerabilityResponse` types in shared package
- [x] `AnswerEngineService` implements heuristic detection for all 10 questions
- [x] `GET /projects/:id/answerability` returns stable `ProjectAnswerabilityResponse`
- [x] Endpoint enforces ownership (403 for non-owners, 404 for missing projects)
- [x] Detection respects non-hallucination rule (insufficient data → `missing`)
- [x] E2E tests cover happy path, auth, and edge cases
- [x] DEO Score v1/v2 APIs continue unchanged

**Manual Testing:** `docs/testing/answer-engine.md`, `docs/manual-testing/phase-ae-1-answer-engine-foundations.md`, `docs/manual-testing/phase-ae-1.1-answer-engine-detection.md`

---

## Phase AE-1.2 – Answer Engine Generation & UI Integration

**Status:** Complete

**Goal:** Implement AI-based Answer Block generation and integrate into Product Optimization workspace UI.

### Scope

Phase AE-1.2 implements:

1. **AnswerGenerationService** – Generates factual Answer Blocks using configured AI provider
2. **POST /ai/product-answers** – API endpoint returning `ProductAnswersResponse` with ephemeral answers
3. **ProductAnswersPanel** – UI component displaying answers in Product Optimization workspace
4. **Entitlements enforcement** – Daily AI limit applied to answer generation

### Implementation Changes

**Backend:**

- `apps/api/src/projects/answer-generation.service.ts` – New service for AI answer generation
- `apps/api/src/ai/ai.service.ts` – Added `generateProductAnswers` method
- `apps/api/src/ai/ai.controller.ts` – Added `POST /ai/product-answers` endpoint
- `apps/api/src/projects/answer-engine.service.ts` – Exposed `computeAnswerabilityForProduct` for reuse
- `apps/api/src/ai/ai.module.ts` – Added AnswerGenerationService, imported ProjectsModule
- `apps/api/src/projects/projects.module.ts` – Exported AnswerEngineService

**Frontend:**

- `apps/web/src/components/products/optimization/ProductAnswersPanel.tsx` – New UI component
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` – Integrated ProductAnswersPanel
- `apps/web/src/lib/api.ts` – Added `generateProductAnswers` method

**Shared Types:**

- `packages/shared/src/answer-engine.ts` – Added `ProductAnswersResponse` interface

**Tests:**

- `apps/api/test/e2e/answer-generation.e2e-spec.ts` – E2E tests for generation endpoint

**Documentation:**

- Updated `docs/ANSWER_ENGINE_SPEC.md` with Section 11-12 (AE-1.2 implementation)
- Created `docs/manual-testing/phase-ae-1.2-answer-engine-generation-and-ui.md`
- Updated `docs/testing/CRITICAL_PATH_MAP.md` CP-011 with AE-1.2 scenarios

### Non-Hallucination Enforcement

The AI prompt instructs providers to:

1. Only use facts explicitly present in product data
2. Return `cannotAnswer: true` when data is insufficient
3. Never infer, assume, or fabricate information
4. Assign appropriate confidence scores (0.7+ required for inclusion)

### Constraints

- No Prisma schema changes in AE-1.2
- Answers are ephemeral (not persisted to database)
- Answer persistence deferred to AE-1.3+
- No DEO Score v2 integration changes

### Acceptance Criteria (Completed)

- [x] `ProductAnswersResponse` type defined in shared package
- [x] `AnswerGenerationService` implemented with AI provider integration
- [x] `POST /ai/product-answers` endpoint returns `ProductAnswersResponse`
- [x] Endpoint enforces product ownership (400 for non-owners/missing products)
- [x] Generation respects non-hallucination rule (AI returns `cannotAnswer: true` when appropriate)
- [x] Daily AI limit enforcement via `EntitlementsService`
- [x] E2E tests cover happy path, auth, and edge cases
- [x] `ProductAnswersPanel` displays answers in Product Optimization workspace
- [x] Web API client updated with `generateProductAnswers` method
- [x] DEO Score v1/v2 and detection APIs continue unchanged

**Manual Testing:** `docs/testing/answer-engine.md`, `docs/manual-testing/phase-ae-1.2-answer-engine-generation-and-ui.md`

## Phase AE-1.3 – Answer Block Persistence (Shopify v1)

**Status:** Complete

**Goal:** Persist Answer Blocks per product (10 canonical questions) as a durable, merchant-editable data layer for Shopify products, and make these persisted answers the canonical source for Answerability signals used by DEO Score, Issues Engine, and Automation Engine in the v1 launch.

### Scope

- Implement a persistent Answer Block store for products (Prisma model or equivalent) keyed by at least projectId, productId, questionId, and a version/timestamp field, consistent with docs/ANSWER_ENGINE_SPEC.md Phase AE-1.3.
- Wire Product Workspace → AEO / Answers tab so that:
  - Answer Blocks generated via AE-1.2 can be saved and later edited by merchants.
  - Reloading the product uses persisted Answer Blocks instead of ephemeral responses.
- Ensure downstream systems read from persisted Answer Blocks:
  - Answerability signals and Answerability score feeding DEO Score v2 explainability (see docs/deo-score-spec.md).
  - Answerability/answer-related issues in the Issues Engine (e.g., not_answer_ready, weak_intent_match in docs/deo-issues-spec.md).
  - Answer Block automations defined in docs/AUTOMATION_ENGINE_SPEC.md Section 8.7 for Shopify v1.
- Limit initial implementation to Shopify products for v1; non-Shopify surfaces remain out of scope for this sub-phase.

### Dependencies & Ordering

- Depends on:
  - Phase AE-1.1 (Answerability detection) and AE-1.2 (ephemeral answer generation) being complete.
  - Core DEO Score v1/v2 plumbing and Issues Engine v1 (Lite) / Full specs.
- Must be completed before:
  - Enabling Shopify Answer Block automations for v1 launch (Automation Engine v1 – Shopify Answer Block Automations).
  - Marking AEO v1 as fully launch-ready in the Shopify-only v1 scope.

### Acceptance Criteria (Completed)

- [x] Persistent Answer Block storage implemented for products via a Prisma AnswerBlock model and relation to Product, aligned with docs/ANSWER_ENGINE_SPEC.md AE-1.3.
- [x] Backend AnswerBlockService created with createOrUpdateAnswerBlocks, getAnswerBlocks, and deleteAnswerBlocks methods for per-product Answer Block persistence.
- [x] Protected API endpoints added for GET /products/:id/answer-blocks and POST /products/:id/answer-blocks, enforcing project ownership while allowing Answer Block persistence for all tiers.
- [x] Unit/integration test scaffolding and fixtures created for Answer Block persistence and Automation Engine v1 (see tests/unit/answer-engine/answer-block-persistence.test.ts, tests/integration/automation/automation-engine.shopify-answers.test.ts, apps/api/test/fixtures/, and docs/manual-testing/phase-ae-1.3-answer-block-persistence.md).

**Manual Testing:** `docs/manual-testing/phase-ae-1.3-answer-block-persistence.md`

---

## Phase AE-1 – Automation Engine Foundations (Framework & Spec)

**Status:** Complete

**Goal:** Define the Automation Engine framework, shared types, and specifications for automation rule models, execution lifecycle, and entitlements integration.

### AE-1.1 Overview (Automation Engine)

The Automation Engine is the "DEO autopilot" — a platform layer that powers intelligent, automated improvements across all EngineO.ai systems:

1. **Detect** when something needs improvement (missing metadata, stale answers, low DEO signals)
2. **Decide** whether an automation should run (based on entitlements, limits, and safety rules)
3. **Execute** improvements or schedule them for review
4. **Log** all actions with clear audit trails

This phase establishes the foundational framework and specifications; implementation phases (AE-2+) will add concrete automation rules and execution logic.

### AE-1.2 Implementation Changes (Automation Engine)

**Shared Types (packages/shared/src/automation-engine.ts):**

```typescript
// Automation classification
export type AutomationKind = 'immediate' | 'scheduled' | 'background';
export type AutomationTargetSurface = 'product' | 'page' | 'answer_block' | 'entity' | 'project' | 'deo_score';
export type AutomationExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

// Initial rule set (9 canonical rules)
export type AutomationRuleId =
  | 'AUTO_GENERATE_METADATA_ON_NEW_PRODUCT'
  | 'AUTO_GENERATE_METADATA_FOR_MISSING_METADATA'
  | 'AUTO_GENERATE_METADATA_FOR_THIN_CONTENT'
  | 'AUTO_REFRESH_DEO_SCORE_AFTER_CRAWL'
  | 'AUTO_REFRESH_ANSWER_BLOCKS'
  | 'AUTO_RECRAWL_HIGH_IMPACT_PAGES'
  | 'AUTO_FILL_MISSING_ALT_TEXT'
  | 'AUTO_REFRESH_STRUCTURED_DATA'
  | 'AUTO_DETECT_LOW_VISIBILITY_SIGNALS';

// Core interfaces
export interface AutomationRule { ... }
export interface AutomationRun { ... }
export interface AutomationSettings { ... }
```

### AE-1.3 Automation Types

| Kind | Description | Examples |
|------|-------------|----------|
| **Immediate** | Reactive, event-triggered automations | Auto-generate metadata on new product, refresh DEO Score after crawl |
| **Scheduled** | Proactive automations on cadences | Weekly re-crawl of high-impact pages, monthly structured data refresh |
| **Background** | Low-noise, continuous improvements | Fill missing alt text, detect low visibility signals |

### AE-1.4 Decision Framework

Every automation follows a Trigger → Evaluate → Execute → Log lifecycle:

1. **Trigger:** Events such as crawl completion, product sync, issue detection
2. **Evaluate:** Rule engine checks entitlements, daily caps, settings, time constraints
3. **Execute:** Delegates to existing subsystems (AutomationService, ShopifyMetadataService, etc.)
4. **Log:** Writes AutomationRun record for audit trail

### AE-1.5 Integration Points (Automation Engine)

**Existing Systems:**
- Crawl Pipeline: After crawls finish, triggers metadata suggestion rules
- AutomationService: Current suggestion engine for metadata (Automation Engine v0)

**Future Systems:**
- Issues Engine: Automation rules for auto-fixing issues (AE-4)
- Answer Engine: Auto-generate/refresh Answer Blocks (AE-5)
- DEO Score: Auto-recompute scores on schedule (AE-3)

### AE-1.6 Constraints (Automation Engine)

- No database schema changes in this phase (model definition only)
- No new API endpoints (deferred to AE-2)
- No UI implementation (deferred to AE-6)
- No changes to existing automation suggestions behavior
- Types must be stable for implementation phases

### AE-1.7 Acceptance Criteria (Automation Engine - Completed)

- [x] `packages/shared/src/automation-engine.ts` created with all types
- [x] Types exported from `@engineo/shared`
- [x] `docs/AUTOMATION_ENGINE_SPEC.md` created with full specification
- [x] `docs/testing/automation-engine.md` created for system-level testing
- [x] `docs/manual-testing/phase-ae-1-automation-engine-foundations.md` created
- [x] `docs/testing/CRITICAL_PATH_MAP.md` updated with CP-012: Automation Engine
- [x] `docs/ENTITLEMENTS_MATRIX.md` updated with Automation Engine details
- [x] `docs/TOKEN_USAGE_MODEL.md` updated with automation source labels
- [x] `ARCHITECTURE.md` updated with Automation Engine references
- [x] `docs/answers-overview.md` updated with Automation Engine integration note
- [x] Shared package builds successfully

**Manual Testing:** `docs/manual-testing/phase-ae-1-automation-engine-foundations.md`, `docs/testing/automation-engine.md`

---

## Phase AE-2 – Product Automations (Design & Test Scaffolding)

**Status:** Complete

**Goal:** Define Product Automation Library design specifications covering metadata, content, drift correction, and Shopify sync automations for products.

### AE-2.1 Overview (Product Automations)

Phase AE-2 introduces product-level automations that:

1. **Automatically improve product metadata** when safe (titles, descriptions, alt text)
2. **Automatically generate or enrich product content elements** (long descriptions, feature bullets)
3. **Detect and correct metadata drift** (Shopify overwrites, manual regressions)
4. **Orchestrate Shopify sync operations** for automated changes

This phase is scoped to **product surfaces only**. Page-level and other surface automations are deferred to later phases.

### AE-2.2 Product Automation Categories

#### A. Metadata Automations (High Priority)

**Automations:**
- Auto-generate missing SEO Titles
- Auto-generate missing SEO Descriptions
- Auto-improve weak titles (short, generic, keyword-stuffed)
- Auto-improve weak descriptions (thin, promotional-only)
- Auto-generate alt text for product images (future AE-2.1.x)
- Auto-populate missing product type / category when inferable

**Automation Engine Mapping:**
- `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT`
- `AUTO_GENERATE_METADATA_FOR_MISSING_METADATA`
- `AUTO_GENERATE_METADATA_FOR_THIN_CONTENT`

#### B. Content Automations (Medium Priority)

**Automations:**
- Auto-generate a long description when absent
- Auto-expand thin descriptions (< 40–60 words)
- Auto-enhance entity completeness (add missing factual details)
- Auto-generate feature/benefit bullet lists

#### C. Drift Correction Automations (High Trust)

**Definition of "Drift":**
- Shopify overwriting optimized metadata with original/inferior values
- Manual edits that remove required fields or degrade quality
- External tools reverting metadata changes

**Modes by Plan:**
| Plan | Drift Behavior |
|------|----------------|
| **Free** | Notify-only; do not auto-apply corrections |
| **Pro** | Auto-correct when allowed by settings; notify on detection |
| **Business** | Full auto-correct with detailed logging; proactive drift scanning |

#### D. Shopify Sync Automations

**Automations:**
- Auto-sync metadata after automation-generated changes
- Auto-sync Answer Blocks to Shopify metafields (in AE-5)
- Auto-sync structured data via Shopify metafields
- Attempt to repair missing Shopify fields when possible

**Entitlements:**
| Plan | Shopify Sync Capabilities |
|------|---------------------------|
| **Free** | No automated writes to Shopify; view-only/suggestions |
| **Pro** | Limited auto-sync automations for metadata |
| **Business** | Full sync automations for products, pages (later), answers, entities |

### AE-2.3 Conditions & Safeguards

**Data Safety:**
- Never overwrite user-written content without reliable confidence, applicable rule, and recorded log entry

**AI Safety:**
- **No hallucinations:** If not enough product data is available, automations must skip rather than guess
- All AI-generated content must trace back to source product data

**Plan Limits:**
| Plan | Automation Limits |
|------|-------------------|
| **Free** | Minimal automations (reactive metadata-only, small caps) |
| **Pro** | Moderate daily caps; access to drift corrections for metadata |
| **Business** | Higher or unlimited daily automation executions (subject to safety rules) |

### AE-2.4 AE-2 Sub-Phases

| Sub-Phase | Focus | Scope |
|-----------|-------|-------|
| **AE-2.1** | Metadata Automations | Titles, descriptions, weak content improvements, alt-text scaffolding, entity enrichers |
| **AE-2.2** | Content Automations | Long descriptions, bullet lists, thin-content expansion |
| **AE-2.3** | Drift Correction System | Detect mismatch → correct (when allowed) → log → notify |
| **AE-2.4** | Shopify Sync Automations | Write-back and reconciliation actions, constrained by entitlements and safety |

### AE-2.5 Constraints (Product Automations)

- **No code implementation in AE-2:** This phase is design and test scaffolding only
- **Implementation deferred:** Actual automation logic will be built in sub-phases AE-2.1 through AE-2.4
- **Product-only scope:** Page automations are explicitly out of scope for AE-2
- **No UI changes:** Automation Center UI deferred to AE-6

### AE-2.6 Acceptance Criteria (Product Automations - Completed)

- [x] `docs/AUTOMATION_ENGINE_SPEC.md` Section 8 added for Product Automations
  - [x] 8.1 Goals defined
  - [x] 8.2 Product Automation Categories (A-D) defined
  - [x] 8.3 Conditions & Safeguards defined
  - [x] 8.4 AE-2 Sub-Phases defined
- [x] `docs/testing/automation-engine-product-automations.md` created
- [x] `docs/manual-testing/phase-ae-2-product-automations.md` created
- [x] `docs/testing/CRITICAL_PATH_MAP.md` CP-012 updated with AE-2 references
- [x] `IMPLEMENTATION_PLAN.md` updated with Phase AE-2 section

**Manual Testing:** `docs/manual-testing/phase-ae-2-product-automations.md`, `docs/testing/automation-engine-product-automations.md`

---

## Phase AE-2.1 – Metadata Product Automations (Implementation)

**Status:** Complete

**Overview:**

Phase AE-2.1 implements the core metadata automation pipeline with plan-aware auto-apply behavior. This is the first implementation phase following the AE-2 design and specification work.

### Key Features

1. **Plan-Aware Auto-Apply:**
   - Free plan users receive suggestions only (user must manually apply)
   - Pro/Business plan users get auto-apply for missing metadata
   - Thin content improvements always require review (all plans)

2. **Schema Changes:**
   - Added `appliedAt DateTime?` field to `AutomationSuggestion` model
   - Tracks when automations were auto-applied for audit trail

3. **Backend Implementation:**
   - `EntitlementsService.canAutoApplyMetadataAutomations(userId)` helper
   - `AutomationService.shouldAutoApplyMetadataForProject()` private helper
   - Auto-apply logic in `createProductSuggestion` for MISSING_METADATA issues
   - Only auto-fills empty fields (never overwrites existing content)

4. **Frontend Implementation:**
   - `ProductAiSuggestionsPanel` shows "Applied by Automation Engine" badge
   - Product optimization page detects recent auto-applies (within 24 hours)
   - One-time success toast: "Automation Engine improved this product's metadata automatically."
   - New Automation Activity page at `/projects/[id]/automation/`

5. **Safety Rules:**
   - Only MISSING_METADATA qualifies for auto-apply
   - Thin content always requires human review
   - Existing content is never overwritten
   - Full audit trail via `appliedAt` timestamp

### Plan Behavior Matrix

| Plan | Metadata Automation Behavior |
|------|------------------------------|
| **Free** | Suggestions only; user must manually apply |
| **Pro** | Auto-apply for missing metadata; suggestions for thin content |
| **Business** | Auto-apply for missing metadata; suggestions for thin content |

### Files Modified

**Backend:**
- `apps/api/prisma/schema.prisma` – Added `appliedAt` field
- `apps/api/src/billing/entitlements.service.ts` – Added `canAutoApplyMetadataAutomations`
- `apps/api/src/projects/automation.service.ts` – Auto-apply logic

**Frontend:**
- `apps/web/src/components/products/optimization/ProductAiSuggestionsPanel.tsx` – Applied badge
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` – Auto-apply toast
- `apps/web/src/app/projects/[id]/automation/page.tsx` – New Automation Activity page

**Documentation:**
- `docs/AUTOMATION_ENGINE_SPEC.md` – Section 8.5 for AE-2.1 implementation
- `docs/manual-testing/phase-ae-2-product-automations.md` – AE-2.1 test scenarios

### AE-2.1 Acceptance Criteria (Completed)

- [x] Prisma schema updated with `appliedAt` field
- [x] `canAutoApplyMetadataAutomations` helper in EntitlementsService
- [x] Auto-apply logic in `AutomationService.createProductSuggestion`
- [x] `getSuggestionsForProject` returns `appliedAt` field
- [x] ProductAiSuggestionsPanel shows "Applied by Automation Engine" badge
- [x] Product optimization page detects recent auto-apply and shows toast
- [x] Automation Activity page implemented
- [x] `docs/AUTOMATION_ENGINE_SPEC.md` Section 8.5 added
- [x] `docs/manual-testing/phase-ae-2-product-automations.md` updated with AE-2.1 test scenarios
- [x] `docs/testing/CRITICAL_PATH_MAP.md` updated with AE-2.1 key scenario

**Manual Testing:** `docs/manual-testing/phase-ae-2-product-automations.md` (AE-2.1 Implementation Test Scenarios section)

---

## Phase AUE-1 – Automation Engine Vertical Slice (New Product SEO Title Auto-Generation)

**Status:** Complete

**Overview:**

Phase AUE-1 implements the first immediate automation rule: `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT`. This rule triggers automatically when new products are synced from Shopify and generates SEO metadata for products with missing titles or descriptions.

### Rule Definition

| Field | Value |
|-------|-------|
| **Rule ID** | `AUTO_GENERATE_METADATA_ON_NEW_PRODUCT` |
| **Kind** | Immediate |
| **Trigger** | New product synced from Shopify |
| **Target Surface** | `product` |
| **Action** | Generate SEO title and description |

### Trigger Flow

```
Shopify Sync → New Product Detected → AutomationService Triggered
                                              ↓
                        Check Entitlements (Daily AI Limit)
                                              ↓
                        Generate Metadata (AI Service)
                                              ↓
                        Record AI Usage → Create AutomationSuggestion
                                              ↓
                        Auto-Apply (Pro/Business) or Suggestion Only (Free)
```

### Key Features

1. **Immediate Trigger on Shopify Sync:**
   - `ShopifyService.syncProducts` detects new products
   - Non-blocking automation call (errors don't block sync)
   - Logged warning if automation fails

2. **Entitlements-Aware:**
   - Checks daily AI limit before generating metadata
   - Records AI usage via `recordAiUsage`
   - Skips gracefully when limit reached

3. **Plan-Based Auto-Apply:**
   - Free: Creates suggestion only, user must manually apply
   - Pro/Business: Auto-applies generated metadata to product

4. **Safety Features:**
   - Skip if SEO fields already populated
   - Non-blocking execution (sync continues even if automation fails)
   - Full audit trail with `source: 'automation_new_product_v1'`

### Files Modified

**Backend:**
- `apps/api/src/shopify/shopify.module.ts` – Import `ProjectsModule` with `forwardRef`
- `apps/api/src/shopify/shopify.service.ts` – Inject `AutomationService`, call automation for new products
- `apps/api/src/projects/automation.service.ts` – New `runNewProductSeoTitleAutomation` method

**Tests:**
- `apps/api/test/e2e/automation-new-product-seo-title.e2e-spec.ts` – E2E tests

**Documentation:**
- `docs/AUTOMATION_ENGINE_SPEC.md` – Section 8.6 for AUE-1 implementation
- `docs/testing/automation-engine-product-automations.md` – AUE-1 specific test scenarios
- `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md` – Manual testing guide
- `docs/testing/CRITICAL_PATH_MAP.md` – Updated CP-012 with AUE-1 scenarios

### Plan Behavior Matrix

| Plan | Behavior |
|------|----------|
| **Free** | Creates suggestion only; user must manually apply |
| **Pro** | Auto-applies generated metadata to product |
| **Business** | Auto-applies generated metadata to product |

### E2E Test Coverage

| Test | Description |
|------|-------------|
| Creates suggestion for missing SEO | Verifies suggestion created with `automation_new_product_v1` source |
| Skips when SEO populated | Verifies no suggestion created when fields already exist |
| Records AI usage | Verifies `AiUsageEvent` created |
| Auto-applies for Pro plan | Verifies metadata applied and suggestion marked `applied: true` |
| Does not auto-apply for Free | Verifies suggestion created but not applied |
| Handles non-existent product | Verifies graceful handling without throwing |

### AUE-1 Acceptance Criteria (Completed)

- [x] `ShopifyModule` imports `ProjectsModule` with `forwardRef`
- [x] `ShopifyService` injects `AutomationService`
- [x] `ShopifyService.syncProducts` triggers automation for new products (non-blocking)
- [x] `AutomationService.runNewProductSeoTitleAutomation` implemented
- [x] Daily AI limit enforced via `ensureWithinDailyAiLimit`
- [x] AI usage recorded via `recordAiUsage`
- [x] Auto-apply for Pro/Business plans only
- [x] E2E tests created
- [x] `docs/AUTOMATION_ENGINE_SPEC.md` Section 8.6 added
- [x] `docs/testing/automation-engine-product-automations.md` updated with AUE-1 scenarios
- [x] `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md` created
- [x] `docs/testing/CRITICAL_PATH_MAP.md` CP-012 updated with AUE-1 key scenarios

**Manual Testing:** `docs/manual-testing/phase-aue-1-automation-new-product-seo-title.md`

## Phase AUE-2 – Shopify Answer Block Automations (Automation Engine v1)

**Status:** Complete

**Goal:** Implement Automation Engine v1 Shopify Answer Block automations that detect missing/weak Answer Blocks for products, trigger AEO-based generation/regeneration, persist results via AE-1.3, and log automation outcomes for v1 Shopify launch.

### Scope

- **Add an Answer Block automation worker:**
  - `AnswerBlockAutomationProcessor` (BullMQ worker) consuming `answer_block_automation_queue` jobs with payload `{ projectId, productId, userId, triggerType, planId }`.
  - For each job:
    - Load product + project.
    - Determine whether to generate missing or regenerate weak Answer Blocks based on existing `AnswerBlock` rows (confidence thresholds).
    - Compute Answerability via `AnswerEngineService.computeAnswerabilityForProduct`.
    - Call `AiService.generateProductAnswers` for AEO-based Answer Block generation.
    - Persist results via `AnswerBlockService.createOrUpdateAnswerBlocks`.
    - Log before/after Answer Blocks and status via `AnswerBlockAutomationLog`.

- **Wire event-driven triggers:**
  - `product_synced`:
    - `ShopifyService.syncProducts` calls `AutomationService.triggerAnswerBlockAutomationForProduct(newProduct.id, userId, 'product_synced')` for newly created products (non-blocking).
  - `issue_detected`:
    - `DeoIssuesService.getIssuesForProject` identifies answerability-related issues (`not_answer_ready`, `weak_intent_match`) and calls `AutomationService.triggerAnswerBlockAutomationForProduct(productId, userId, 'issue_detected')` for affected products (fire-and-forget).

- **Introduce an Automation Engine entrypoint:**
  - `AutomationService.triggerAnswerBlockAutomationForProduct(productId, userId, triggerType)`:
    - Validates ownership.
    - Determines plan via `EntitlementsService.getUserPlan`.
    - Skips Free tier with a logged `AnswerBlockAutomationLog` entry (`action: 'skip_plan_free'`, `status: 'skipped'`).
    - Avoids duplicate work by skipping when a recent `status: 'succeeded'` log exists for the same product + triggerType.
    - Enqueues `answer_block_automation` jobs onto `answer_block_automation_queue`, with higher priority for Business (`priority: 1`) and standard priority for Pro (`priority: 5`).

- **Logging:**
  - `AnswerBlockAutomationLog` Prisma model:
    - Fields: `projectId`, `productId`, `triggerType`, `planId`, `action`, `beforeAnswerBlocks`, `afterAnswerBlocks`, `status`, `errorMessage?`, `modelUsed?`, `tokenEstimate?`, `createdAt`.
    - Used for observability, idempotency checks, and manual debugging of Answer Block automations.

### Acceptance Criteria (Completed)

- [x] **Queue + worker:**
  - `answer_block_automation_queue` created in `apps/api/src/queues/queues.ts`.
  - `AnswerBlockAutomationProcessor` worker processes jobs and orchestrates AEO → persistence → logging, including success, skip, and error paths.

- [x] **Entitlement gating:**
  - Free plan users do not run Answer Block automations; logs record `skip_plan_free` with `status: 'skipped'`.
  - Pro/Business plans can enqueue and run Answer Block automations, with Business receiving higher priority.

- [x] **Event wiring:**
  - `ShopifyService.syncProducts` triggers Answer Block automation for new products (`triggerType: 'product_synced'`).
  - `DeoIssuesService.getIssuesForProject` triggers Answer Block automations for products affected by `not_answer_ready` and `weak_intent_match` issues (`triggerType: 'issue_detected'`), without blocking DEO issues computation.

- [x] **Persistence + logging:**
  - Answer Block automations use `AnswerBlockService` and `AnswerBlock` model introduced in AE-1.3 for persistence.
  - `AnswerBlockAutomationLog` records before/after blocks, actions, statuses, and errors for each run.

- [x] **Test scaffolding and fixtures:**
  - Unit/integration/E2E scaffolding and fixtures for Shopify Answer Block automations are in place:
    - `tests/unit/automation/automation-engine.rules.test.ts`
    - `tests/integration/automation/automation-engine.shopify-answers.test.ts`
    - `tests/e2e/automation/automation-flows.spec.ts`
    - `apps/api/test/fixtures/shopify-product.fixtures.ts`
    - `apps/api/test/fixtures/automation-events.fixtures.ts`
  - Manual testing doc created: `docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md`.
  - Unit tests implemented for Answer Block automation rule evaluation and Answer Block persistence (AE-1.3 / AUE-2).
  - Integration tests implemented for end-to-end Shopify Answer Block automations (product_synced and issue_detected triggers).

**Manual Testing:** `docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md`

---

## Phase AEO-2 – Shopify Metafields Sync for Answer Blocks

**Status:** Complete

**Goal:** Sync persisted Answer Blocks into Shopify metafields so canonical buyer-question answers become part of the Shopify product data model for connected projects.

### Scope

- **Metafield definitions (Shopify Admin API):**
  - Namespace `engineo`, keys per Answer Block type (e.g., `answer_what_is_it`, `answer_key_features`, `answer_how_it_works`, `answer_materials`, `answer_benefits`, `answer_dimensions`, `answer_usage`, `answer_warranty`, `answer_faq`, `answer_care_instructions`).
  - Definitions created or ensured when a Shopify store is connected and reused on subsequent syncs.

- **Answer Block → metafield sync:**
  - Persisted `AnswerBlock` rows for a product are mapped to metafield payloads via a dedicated helper that:
    - Maps known `questionId` values to keys in the `engineo` namespace.
    - Trims answer text and skips empty answers.
    - Skips unknown question IDs while recording them for observability.
  - `ShopifyService.syncAnswerBlocksToShopify(productId)`:
    - Fetches existing `engineo` metafields for the Shopify product.
    - Upserts metafields for mapped keys via the Shopify Admin GraphQL API using `metafieldsSet`, after ensuring the relevant `engineo` metafield definitions exist.
    - Returns a structured result (`syncedCount`, `skippedUnknownQuestionIds`, `errors`, and `skippedReason` for no-op cases).

- **Automation Engine integration (AUE-2 link):**
  - `AnswerBlockAutomationProcessor` now optionally calls `ShopifyService.syncAnswerBlocksToShopify` after a successful Answer Block automation when the project flag is enabled.
  - Additional `AnswerBlockAutomationLog` entries use `action: 'answer_blocks_synced_to_shopify'` with status indicating success/failure and an error message when sync fails.

- **Settings flag and UX wiring:**
  - New project-level flag `aeoSyncToShopifyMetafields` on `Project`:
    - Default `false` to keep behavior strictly opt-in.
    - Exposed via Project Settings (`/projects/:id/settings`) as:
      - **"Sync Answer Blocks to Shopify metafields"** toggle under AI Automation Rules.
  - Product Workspace → Answers (AEO) section:
    - Adds subtle helper text: "These answers can be synced to Shopify as metafields when enabled in Settings." with a link to the project Settings page.
    - **"Sync now" button:** Allows users to manually trigger Answer Block sync to Shopify metafields with clear feedback (success/skip/fail).
      - Entitlement gating: Free plan users see an upgrade prompt; paid plans can sync.
      - Toggle gating: Shows informative message when project toggle is off.
      - Daily quota: Respects existing AI usage limits with graceful skip message when cap is reached.
      - Automation logging: Records `triggerType = 'manual_sync'` with appropriate status in `AnswerBlockAutomationLog`.

### Rate Limiting & Safety

- Shopify Admin API calls made by `ShopifyService` (OAuth token exchange, product fetch, metafield definition management, metafield upserts) now use a simple rate-limited fetch wrapper targeting ~2 requests/second (500ms minimum interval), with test mode bypass.
- Metafield sync failures do not block Answer Block automation completion:
  - Core generation/persistence logs remain `succeeded` even if metafield sync fails.
  - Sync errors are captured as separate `answer_blocks_synced_to_shopify` log entries and surfaced via automation history.

### Tests & Verification

- **Unit tests:**
  - `tests/unit/shopify-metafields/shopify-metafields-mapping.test.ts`
  - Verifies Answer Block → metafield mapping:
    - Known `questionId` values map to expected keys.
    - Values are trimmed and empty/whitespace-only answers are skipped.
    - Unknown `questionId` values are recorded in `skippedUnknownQuestionIds`.
  - `tests/unit/automation/automation-engine.rules.test.ts`
  - Verifies manual Shopify sync behavior:
    - Skips on Free plan with `plan_not_entitled` reason.
    - Skips when project toggle is off with `sync_toggle_off` reason.
    - Succeeds when toggle is on and plan is entitled.
    - Skips when daily cap is reached with `daily_cap_reached` reason.

- **Integration tests:**
  - `tests/integration/shopify-metafields/shopify-metafields-sync.integration.test.ts`
  - Mocks Shopify Admin API and validates:
    - Metafield definitions are created in namespace `engineo` when missing.
    - `syncAnswerBlocksToShopify` upserts metafields for products with persisted Answer Blocks.
    - Result objects correctly report `syncedCount` and contain no errors on success paths.

- **Critical Path Map updates:**
  - `docs/testing/CRITICAL_PATH_MAP.md`:
    - CP-006 (Shopify Sync) now lists AEO-2 metafield sync scenarios and links to this manual testing doc.
    - CP-011 (Answer Engine) references AEO-2 as part of end-to-end Answer Block flows.
    - CP-012 (Automation Engine) includes coverage for `answer_blocks_synced_to_shopify` log entries and metafield sync behavior.

**Manual Testing:** `docs/manual-testing/phase-aeo-2-shopify-metafields-sync.md`

---

## Phase SHOP-API-1 – Shopify Product API Migration (REST → New GraphQL Product APIs)

**Status:** Complete

**Goal:** Migrate all Shopify product sync and product SEO update flows from deprecated REST Admin endpoints to the new GraphQL Admin product APIs, while preserving existing DEO, AEO, Issues Engine, and Automation Engine behavior.

### Scope (SHOP-API-1)

- **Product sync via GraphQL:**
  - Replace REST `/admin/api/*/products.json` usage with a GraphQL `products` query called via the Shopify Admin GraphQL endpoint (`/admin/api/2024-01/graphql.json`).
  - Implement cursor-based pagination (`pageInfo.hasNextPage`, `endCursor`) with a small delay between calls to respect Shopify rate limits.
  - Retrieve and map the following fields into the existing Product model used by DEO/AEO:
    - `id` (mapped from Product GID)
    - `title`
    - `descriptionHtml` → local description/body_html
    - `seo { title, description }`
    - `handle`
    - `status`, `productType`, `vendor` (stored for future use)
    - `images.edges[].node { id, altText, url }`
    - `variants.edges[].node { id, title, price }` (available for downstream features)

- **Product SEO updates via GraphQL:**
  - Replace REST `PUT /admin/api/*/products/{id}.json` with a GraphQL `productUpdate` mutation that:
    - Accepts a `ProductInput` containing the product GID and `seo { title, description }`.
    - Returns updated SEO fields and any `userErrors`.
  - Keep the public `/shopify/update-product-seo` endpoint and Product Workspace "Apply to Shopify" UX unchanged, swapping only the transport layer.
  - Treat GraphQL `userErrors` as failures, surfacing friendly messages in the UI and logging details for debugging.

- **Metafield helpers (GraphQL-based, AEO-2 compatible):**
  - Implement GraphQL helpers for metafield operations:
    - `metafieldDefinitions(ownerType: PRODUCT, namespace: "engineo")` + `metafieldDefinitionCreate` for Answer Block-related metafield definitions.
    - `metafieldsSet` for Answer Block metafield upserts.
  - Update existing Answer Block metafield sync logic to use these GraphQL helpers instead of REST `/metafields*.json`, without changing AEO-2 semantics.

- **Product handle resolution via GraphQL:**
  - Replace REST `GET /admin/api/*/products/{id}.json` in the SEO scan pipeline with a GraphQL `product(id: ...)` query that returns the product handle for building the public product URL.

### Implementation & Tests

- **Backend changes:**
  - `apps/api/src/shopify/shopify.service.ts`:
    - Added a shared `executeShopifyGraphql<T>()` helper built on the existing rate-limited fetch wrapper.
    - Migrated product sync to use a paginated GraphQL `products` query, mapping responses into the existing `ShopifyProduct` DTO and local Product table.
    - Migrated SEO updates to use a GraphQL `productUpdate` mutation for `/shopify/update-product-seo`, handling `userErrors` explicitly.
    - Introduced GraphQL metafield helpers and wired Answer Block metafield sync to use `metafieldsSet`.
  - `apps/api/src/seo-scan/seo-scan.service.ts`:
    - Updated product handle retrieval to use a GraphQL `product(id: ...)` query instead of REST.

- **Tests:**
  - **Unit:**
    - `tests/unit/shopify/shopify-graphql-products-mapping.test.ts` – verifies GraphQL products query mapping into internal ShopifyProduct DTOs.
    - `tests/unit/shopify/shopify-graphql-seo-update.test.ts` – verifies `productUpdate` mutation payload construction and `userErrors` handling for SEO updates.
  - **Integration (mocked Shopify GraphQL endpoint):**
    - `tests/integration/shopify/shopify-graphql-api.integration.test.ts` – covers GraphQL-based product sync and SEO update flows end-to-end against a test database.
    - `tests/integration/shopify-metafields/shopify-metafields-sync.integration.test.ts` – updated to exercise Answer Block metafield sync via GraphQL metafield definitions and `metafieldsSet`.

- **Documentation & Manual Testing:**
  - `SHOPIFY_INTEGRATION.md` updated to:
    - Use GraphQL product queries for product sync examples.
    - Use `productUpdate` for SEO update examples.
    - Document GraphQL metafield operations (`metafieldDefinitions`, `metafieldDefinitionCreate`, `metafieldsSet`) as the primary path for AEO-related metafields.
  - Manual testing guide created for this phase:
    - `docs/manual-testing/phase-shop-api-1-graphql-migration.md`

### Acceptance Criteria (Completed)

- [x] All product sync flows use Shopify Admin GraphQL `products` queries (no REST `/products.json` calls).
- [x] All product SEO update flows use Shopify Admin GraphQL `productUpdate` (no REST `PUT /products/{id}.json` calls).
- [x] Metafield definitions and Answer Block metafield sync use GraphQL metafield APIs (`metafieldDefinitions`, `metafieldDefinitionCreate`, `metafieldsSet`) instead of REST `/metafields*.json`.
- [x] Existing DEO, AEO, Issues Engine, and Automation Engine behaviors remain unchanged from the user perspective.
- [x] Unit and integration tests for GraphQL mapping and error handling are in place and passing.
- [x] Manual testing completed per `docs/manual-testing/phase-shop-api-1-graphql-migration.md`.

**Manual Testing:** `docs/manual-testing/phase-shop-api-1-graphql-migration.md`

---

## Phase UX-2 – Product Workspace AEO and Automation UI

**Status:** Complete

**Goal:** Enhance the Product Workspace AEO and Automation UI to clearly distinguish between diagnostic AI Answer previews and canonical Answer Blocks, add status badges for sync and automation states, and provide toggle visibility for AI previews when Answer Blocks exist.

### Scope

- **Clear distinction between AI Answer previews and canonical Answer Blocks:**
  - **AI Answer Preview (Diagnostics Only)** panel:
    - Header reads "AI Answer Preview (Diagnostics Only)"
    - Status badges: "Preview" and "Not Canonical"
    - Helper text explains: "These previews are temporary AI-generated drafts used to evaluate answerability and data coverage. They are not saved, not published, and not synced to Shopify."
  - **Answer Blocks (Canonical Answers)** panel:
    - Header reads "Answer Blocks (Canonical Answers)"
    - Helper text explains: "Structured, persistent answers that AI engines can safely reuse. These are the source of truth for AEO."
    - Empty state copy: "No canonical answers yet. Review AI Answer previews to identify missing facts, then generate Answer Blocks."

- **Status badges on Answer Blocks panel:**
  - **Canonical** – Always shown when Answer Blocks exist.
  - **Automation-Enabled** – Shown for Pro/Business plans.
  - **Synced to Shopify** – Shown when project has `aeoSyncToShopifyMetafields` flag enabled.

- **Visibility toggle for AI previews:**
  - When product has Answer Blocks, AI Answer previews are hidden by default.
  - A helper box displays: "AI Answer previews are hidden because canonical Answer Blocks already exist for this product. For advanced inspection only. Does not affect published content or DEO Score."
  - Toggle button "Show AI diagnostic previews" reveals the AI Answers panel.
  - Toggle button changes to "Hide AI diagnostic previews" when AI previews are visible.
  - When product has no Answer Blocks, AI previews are shown by default without toggle.

- **Props and state management:**
  - `ProductAnswerBlocksPanel` receives `aeoSyncToShopifyMetafields` and `onBlocksLoaded` props.
  - Parent page tracks `hasAnswerBlocks` state via callback from child panel.
  - `showAiDiagnosticPreviews` state controls visibility of AI Answer previews when Answer Blocks exist.

### Implementation Changes

**Frontend Changes:**

1. **apps/web/src/app/projects/[id]/products/[productId]/page.tsx:**
   - Added `hasAnswerBlocks` and `showAiDiagnosticPreviews` state.
   - Passes `aeoSyncToShopifyMetafields` and `onBlocksLoaded` callback to `ProductAnswerBlocksPanel`.
   - Conditionally renders `ProductAnswersPanel` based on Answer Blocks existence and toggle state.
   - Added helper box with toggle button when Answer Blocks exist.

2. **apps/web/src/components/products/optimization/ProductAnswersPanel.tsx:**
   - Updated header to "AI Answer Preview (Diagnostics Only)".
   - Added "Preview" and "Not Canonical" status badges.
   - Added diagnostic disclaimer text explaining ephemeral nature.

3. **apps/web/src/components/products/optimization/ProductAnswerBlocksPanel.tsx:**
   - Updated header to "Answer Blocks (Canonical Answers)".
   - Added `aeoSyncToShopifyMetafields` and `onBlocksLoaded` props.
   - Added conditional status badges: "Canonical", "Synced to Shopify", "Automation-Enabled".
   - Updated empty state copy to reference AI Answer previews.

### Acceptance Criteria (Completed)

- [x] AI Answer Preview panel displays "AI Answer Preview (Diagnostics Only)" header with "Preview" and "Not Canonical" badges.
- [x] Answer Blocks panel displays "Answer Blocks (Canonical Answers)" header with appropriate status badges.
- [x] "Canonical" badge always shown when Answer Blocks exist.
- [x] "Synced to Shopify" badge shown when `aeoSyncToShopifyMetafields` is enabled.
- [x] "Automation-Enabled" badge shown for Pro/Business plans.
- [x] AI previews hidden by default when Answer Blocks exist.
- [x] "Show AI diagnostic previews" toggle reveals AI Answers panel.
- [x] Toggle state persists during session navigation within workspace.
- [x] When no Answer Blocks exist, AI previews shown by default without toggle.
- [x] Manual testing doc updated with scenario UX2-AEO-HP-004.

**Manual Testing:** `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`

---

## Phase INFRA-REDIS-1 – Redis Background Activity Flags

**Status:** Complete

**Goal:** Introduce environment feature flags to disable non-essential background Redis activity (cron + BullMQ workers) in staging while keeping production behavior unchanged, reducing Upstash Redis command usage in non-production environments.

### Scope

- **Runtime feature flags:**
  - `ENABLE_CRON` – Controls whether the nightly crawl scheduler runs (`CrawlSchedulerService.scheduleProjectCrawls`). When `false`, cron ticks log a skip message and return early without enqueuing crawl jobs.
  - `ENABLE_QUEUE_PROCESSORS` – Controls whether BullMQ worker instances are created in `onModuleInit()` for `DeoScoreProcessor`, `CrawlProcessor`, and `AnswerBlockAutomationProcessor`. When `false`, workers log a skip message and do not initialize, so jobs accumulate in queues until processors are re-enabled.
  - `ENABLE_QUEUE_EVENTS` and `ENABLE_QUEUE_SCHEDULERS` – Reserved for future use; logged in runtime flags for observability.

- **Startup logging:**
  - API (`main.ts`) and worker (`worker-main.ts`) log a `[Runtime] api startup` / `[Runtime] worker startup` object with `NODE_ENV`, `REDIS_PREFIX`, and all `ENABLE_*` flags for observability.

- **Cron guard:**
  - `CrawlSchedulerService.scheduleProjectCrawls()` checks `ENABLE_CRON !== 'false'` at the start of each tick and logs cron flags for debugging.

- **Worker guards:**
  - Each BullMQ processor (`DeoScoreProcessor`, `CrawlProcessor`, `AnswerBlockAutomationProcessor`) checks `ENABLE_QUEUE_PROCESSORS !== 'false'` in `onModuleInit()` and skips worker creation when disabled.

### Implementation Changes

**Backend Changes:**

1. **apps/api/src/main.ts:**
   - Added runtime flags logging on API startup.

2. **apps/api/src/worker-main.ts:**
   - Added runtime flags logging on worker startup.

3. **apps/api/src/crawl/crawl-scheduler.service.ts:**
   - Added `ENABLE_CRON` check with logging at the start of `scheduleProjectCrawls()`.
   - Added `cron tick: enqueued X jobs` log line for better observability.

4. **apps/api/src/projects/deo-score.processor.ts:**
   - Added `ENABLE_QUEUE_PROCESSORS` check in `onModuleInit()`.

5. **apps/api/src/crawl/crawl.processor.ts:**
   - Added `ENABLE_QUEUE_PROCESSORS` check in `onModuleInit()`.

6. **apps/api/src/projects/answer-block-automation.processor.ts:**
   - Added `ENABLE_QUEUE_PROCESSORS` check in `onModuleInit()`.

**Documentation Changes:**

1. **docs/REDIS_SETUP.md:**
   - Added optional feature flags section with `ENABLE_CRON`, `ENABLE_QUEUE_PROCESSORS`, `ENABLE_QUEUE_EVENTS`, `ENABLE_QUEUE_SCHEDULERS`.
   - Updated staging environment section to mention optional flag configuration.
   - Updated prefix recommendations to include staging (`engineo_dev`, `engineo_test`, `engineo_staging`, `engineo_prod`).

### Acceptance Criteria (Completed)

- [x] API startup logs runtime flags including `ENABLE_CRON` and `ENABLE_QUEUE_PROCESSORS`.
- [x] Worker startup logs runtime flags for observability.
- [x] `CrawlSchedulerService.scheduleProjectCrawls()` respects `ENABLE_CRON=false` and logs skip message.
- [x] `DeoScoreProcessor`, `CrawlProcessor`, `AnswerBlockAutomationProcessor` respect `ENABLE_QUEUE_PROCESSORS=false` and skip worker initialization.
- [x] When flags are unset or `true`, production behavior remains unchanged (backward compatible).
- [x] `docs/REDIS_SETUP.md` updated with feature flags documentation.
- [x] Manual testing doc created for staging vs production scenarios.

**Manual Testing:** `docs/manual-testing/redis-background-activity-flags.md`

---

## Phase DASH-1 – Project Dashboard v1 (First DEO Win & AEO Status)

**Status:** Complete

**Goal:** Enhance the Project Overview dashboard to surface AEO (Answer Blocks) status, show top issues inline, display top products to fix, and improve the First DEO Win checklist UX.

### Scope

- **First DEO Win Checklist Improvements:**
  - Updated step labels and descriptions to be more Shopify-focused and concise.
  - Added "In progress" / "Not started" / "Completed" status labels for each step.
  - CTAs updated ("Connect Shopify", "Run crawl", "Optimize products").

- **Project Overview API Enhancements:**
  - `getProjectOverview` in `ProjectsService` now returns:
    - `productsWithAnswerBlocks`: Count of products with at least one Answer Block.
    - `lastAnswerBlockSyncStatus`: Status of the most recent Shopify metafield sync.
    - `lastAnswerBlockSyncAt`: Timestamp of the most recent Shopify metafield sync.

- **Dashboard UI Additions:**
  - **AEO Status Card:** Shows products with Answer Blocks, Shopify sync toggle status (On/Off), last sync timestamp and status, with CTAs to view Answer Blocks and sync now.
  - **Top Issues Card:** Displays up to 5 DEO issues with severity badges and links to the Issues Engine.
  - **Top Products to Fix Section:** Shows up to 3 products with AI-fixable, high-impact issues, ranked by severity weight, with clickable navigation to the product optimization workspace.

- **Frontend Interface Updates:**
  - `ProjectOverview` interface extended in dashboard, products, and overview pages to include new AEO fields.
  - `IntegrationStatus` interface extended with `aeoSyncToShopifyMetafields` flag.
  - Products fetched in overview page to support Top Products to Fix derivation.

### Files Changed

- `apps/web/src/components/projects/FirstDeoWinChecklist.tsx` – Updated labels, descriptions, CTAs, and added In progress status.
- `apps/api/src/projects/projects.service.ts` – Extended `getProjectOverview` with AEO metrics.
- `apps/web/src/app/dashboard/page.tsx` – Extended `ProjectOverview` interface.
- `apps/web/src/app/projects/[id]/products/page.tsx` – Extended `ProjectOverview` interface.
- `apps/web/src/app/projects/[id]/overview/page.tsx` – Added AEO Status card, Top Issues card, Top Products to Fix section, and supporting logic.

### Acceptance Criteria

- [x] First DEO Win checklist shows "In progress" for the first incomplete step and "Not started" for subsequent steps.
- [x] AEO Status card displays products with Answer Blocks count, sync toggle status, and last sync timestamp/status.
- [x] Top Issues card shows up to 5 issues with severity and links to Issues Engine.
- [x] Top Products to Fix section shows up to 3 products ranked by AI-fixable issue severity, with clickable navigation.
- [x] TypeScript compiles without errors for both API and web apps.

**Manual Testing:** `docs/manual-testing/phase-dashboard-v1-first-deo-win.md`

---

## Phase DASH-1.1 – Project Dashboard v1.1 (UX Polish Pass)

**Status:** Complete

**Goal:** Use existing overview data to improve the Project Dashboard's visual hierarchy, with Answer Blocks and "Top Products to Fix" as the primary narrative, while keeping all prior functionality intact.

### Scope

- **Status Ribbon:**
  - Replaced the First DEO Win confirmation card with a slim status ribbon that appears after all activation steps are complete.
  - Ribbon copy: "You've completed your first DEO win. Your visibility is improving."
  - Kept CTAs for daily crawls and issues as de-emphasized, link-style actions.

- **Primary Focus – "What Matters Right Now":**
  - Introduced a new highlighted section that groups:
    - AEO Status card (Shopify Sync ON/OFF, products with Answer Blocks, last sync timestamp/status).
    - Top Products to Fix card with up to 3 products and "Needs fix" labels.
  - AEO Status card uses softer indigo styling and surfaces only the most important Answer Block sync fields.

- **DEO Score (Secondary):**
  - Demoted DEO Score into a secondary section with:
    - Interpretation line: "Your biggest growth opportunities are Answer Readiness and Visibility."
    - Collapsible component breakdown, hidden by default and expanded via a "View full DEO Score" button.
  - Kept DEO Freshness recompute controls unchanged in behavior.

- **Issues Simplification:**
  - Dashboard now shows only the top 3 blockers in a "Top blockers" panel.
  - Issues are phrased as outcomes using recommendedFix/description via a small helper, with a single CTA: "View all issues".

- **Diagnostics & Reference:**
  - Grouped signals summary, crawl tools, Shopify integration, project stats, active integrations, and auto-crawl configuration into a muted "Diagnostics & reference" section.
  - Section is collapsed by default and expanded via a "Show details" toggle; underlying behavior and links remain unchanged.

### Files Changed

- `apps/web/src/app/projects/[id]/overview/page.tsx` – Restructured layout into Status Ribbon, "What Matters Right Now", secondary DEO Score/Top blockers, and collapsible Diagnostics & reference; limited dashboard issues to 3, and adjusted colors to prefer orange over red for issue counts.
- `docs/manual-testing/phase-dashboard-v1-1-ux-polish.md` – New manual testing doc for Dashboard v1.1 UX polish scenarios.

### Acceptance Criteria

- [x] First DEO Win completion renders as a slim status ribbon with the specified copy and link-style CTAs.
- [x] "What Matters Right Now" section prominently shows AEO Status (Shopify Sync, products with Answer Blocks, last sync status/timestamp) and up to 3 Top Products to Fix with "Needs fix" labels.
- [x] DEO Score section is visually secondary, with the breakdown collapsed by default and expandable via "View full DEO Score".
- [x] Dashboard issues panel shows at most 3 top blockers with outcome-style descriptions and a single "View all issues" CTA.
- [x] Diagnostics, crawl tools, integrations, and auto-crawl config are collapsed by default under a muted "Diagnostics & reference" section, but remain fully accessible when expanded.
- [x] No new backend calls or metrics were introduced; all behavior uses existing DASH-1 data.

**Manual Testing:** `docs/manual-testing/phase-dashboard-v1-1-ux-polish.md`

---

## Phase DASH-1.2 – Project Dashboard v1.2 (Diagnostics Drawer & Redundancy Cleanup)

**Status:** Complete

**Goal:** Reduce visual and cognitive load on the Project Overview dashboard by turning the “Diagnostics & reference” section into a true, muted drawer and tightening issue/product callouts so that primary actions remain focused on “What Matters Right Now” and “Top blockers”.

### Scope

- **Diagnostics Drawer Reframe:**
  - Renamed “Diagnostics & reference” to “Diagnostics & system details” and converted it into a slim row that acts as a drawer trigger.
  - Collapsed state shows a single, low-prominence row with helper copy and a “Show details” / “Hide details” toggle.
  - Expanded state uses a 2-column layout:
    - Left column (Evidence): Signals summary and crawl tools / DEO issues controls.
    - Right column (System): Shopify integration card, Active Integrations, Auto Crawl card, and Project Stats card.

- **Visual Tiering & Muted Styling:**
  - Updated diagnostics cards to be visually muted relative to “What Matters Right Now” and “Top blockers”:
    - Smaller headers, lighter borders/backgrounds, and removal of strong, card-like shadows.
    - Kept existing green/gray states for connected/disabled conditions, avoiding new red states except for pre-existing error/broken cases.

- **Issues & Top Products Redundancy Guardrails:**
  - Ensured the main dashboard issues surface is the “Top blockers” panel, capped at 3 issues with outcome-style helper text and a single primary CTA: “View all issues”.
  - Confirmed “Top Products to Fix” appears only once in the “What Matters Right Now” section and continues to show at most 3 products, using existing derivation logic.
  - Left the full issues experience in the modal and Issues page unchanged; this phase is UX-only and does not alter scoring or selection logic.

### Files Changed

- `apps/web/src/app/projects/[id]/overview/page.tsx` – Updated the diagnostics section label and copy, restructured its inner layout into a true 2-column drawer (Evidence vs System), muted diagnostics card styling, tightened issue/product redundancy, and wired the AEO Status “Sync now” button to the existing AEO-2 manual sync endpoint with loading and toast feedback.
- `docs/manual-testing/phase-dashboard-v1-2-diagnostics-drawer.md` – Manual testing doc for Dashboard v1.2 diagnostics drawer behavior, redundancy checks, and regression coverage.
- `docs/manual-testing/phase-dashboard-v1-2-ux-alignment.md` – Manual testing doc for Dashboard v1.2 UX alignment on Project Overview (primary section emphasis, diagnostics drawer behavior, redundancy cleanup, and AEO “Sync now” wiring).

### Acceptance Criteria

- [x] “Diagnostics & system details” appears as a slim, collapsed row by default with the specified helper copy and “Show details” / “Hide details” toggle.
- [x] Expanding the diagnostics drawer renders a 2-column layout on large screens, with Evidence content in the left column and System details (Shopify integration, Active Integrations, Auto Crawl, Project Stats) in the right column.
- [x] All diagnostics cards are visually muted (smaller headers, softer borders/backgrounds, reduced emphasis) compared to primary dashboard action areas.
- [x] The dashboard issues panel surfaces only “Top blockers” (maximum 3) with outcome-style descriptions and a single “View all issues” CTA, with no duplicate issue counts or competing issue panels elsewhere on the dashboard.
- [x] “Top Products to Fix” appears only once on the dashboard and remains limited to 3 products, using existing data and ranking logic.
- [x] AEO Status card on the Project Overview page surfaces Shopify sync status and uses its “Sync now” button to invoke the existing AEO-2 manual sync behavior with clear success/skip/error toasts (including entitlement and toggle gating) without adding new backend endpoints or data sources.

**Manual Testing:** `docs/manual-testing/phase-dashboard-v1-2-diagnostics-drawer.md`, `docs/manual-testing/phase-dashboard-v1-2-ux-alignment.md`

---

These Phases 23–30 plus Phases UX-1, UX-1.1, UX-2, UX-3, UX-4, UX-5, UX-6, UX-7, UX-8, AE-1 (Answer Engine), AE-1 (Automation Engine), AE-2 (Product Automations), AEO-2 (Shopify Metafields Sync), SHOP-API-1 (GraphQL Migration), INFRA-REDIS-1 (Redis Background Activity Flags), DASH-1 (Dashboard v1), DASH-1.1 (Dashboard v1.1 UX Polish Pass), DASH-1.2 (Dashboard v1.2 Diagnostics Drawer & Redundancy Cleanup), UX-Content-1, UX-Content-2, and MARKETING-1 through MARKETING-6 extend your IMPLEMENTATION_PLAN.md and keep your roadmap cohesive:

- Phases 12–17: Core feature sets (automation, content, performance, competitors, local, social).
- Phases 18–22: Security, subscription management, monitoring, fairness & limits.
- Phases 23–30: Advanced AI-powered features gated behind add-ons for sustainable growth.
- Phase UX-1: Targeted UX improvements to the Products page to improve day-to-day usability without backend changes.
- Phase UX-1.1: Mobile responsive improvements for Products page and sidebar navigation.
- Phase UX-2: Per-product optimization workspace with AI suggestions, manual editor, DEO insights, AEO/Automation UI with clear distinction between AI Answer previews and canonical Answer Blocks.
- Phase UX-3: Project Overview page redesign with DEO score visualization and signals summary.
- Phase UX-4: Issues UI integration surfacing DEO issues across Overview, Products, and Optimization Workspace.
- Phase UX-5: Row-level navigation and workspace access improvements for the Products list.
- Phase UX-6: "First DEO Win" onboarding flow for new workspaces.
- Phase UX-7: Issue Engine Lite with 12 product-focused issues, severity filtering, and actionable fix buttons.
- Phase UX-8: Issue Engine Full (IE-2.0) with rich metadata, categories, whyItMatters, recommendedFix, aiFixable, and fixCost fields.
- Phase AE-1 (Answer Engine): Answer Engine Foundations with Answer Block model, 10-question taxonomy, Answerability detection concepts, and no-hallucination rules.
- Phase AE-1 (Automation Engine): Automation Engine foundations (framework, shared types, entitlements & architecture docs, critical-path registration), preparing for Automation Engine implementation in AE-2+.
- Phase AE-2 (Product Automations): Product Automation Library design and test scaffolding covering metadata automations, content automations, drift correction, and Shopify sync automations for products.
- Phase AE-2.1 (Metadata Product Automations): Implementation of plan-aware auto-apply for missing metadata (Pro/Business auto-apply, Free suggestions-only), appliedAt audit field, Automation Activity page, and frontend feedback.
- Phase UX-Content-1: Content Pages tab and non-product content list built on CrawlResult data and DEO issues.
- Phase UX-Content-2: Content optimization workspace for non-product pages with AI metadata suggestions and DEO insights.
- Phase MARKETING-1: Universal marketing homepage and DEO positioning across the public site.
- Phase MARKETING-2: Dedicated Shopify landing page for ecommerce merchants.
- Phase MARKETING-3: Pricing page with Free, Pro, and Business tiers mapped to DEO value.
- Phase MARKETING-4: Websites vertical landing page for WordPress, Webflow, and all non-ecommerce sites.
- Phase MARKETING-5: Full product tour/features page covering DEO Score, crawling, Issues Engine, Product and Content Workspaces, automation, and supported platforms.
- Phase MARKETING-6: "What Is DEO?" education page establishing category leadership and explaining DEO concepts.
- Phase INFRA-REDIS-1: Redis background activity flags (`ENABLE_CRON`, `ENABLE_QUEUE_PROCESSORS`) for staging vs production cost control.
- Manual Testing docs: Canonical template at `docs/MANUAL_TESTING_TEMPLATE.md`, with per-phase manuals under `docs/manual-testing/`, kept up to date by Claude alongside each implemented phase.
- System-level Manual Testing docs (Phase R1): Cross-cutting testing docs under `docs/testing/` for shared systems: `billing-and-limits.md` (Stripe, subscriptions, quotas), `ai-systems.md` (Gemini, usage tracking, errors), `frontend-ux-feedback-and-limits.md` (toasts, loading states, limit prompts).
- System-level Manual Testing docs (Phase R2): DEO & Shopify systems coverage under `docs/testing/`: `deo-pipeline.md`, `signals-collection.md`, `deo-score-compute-pipeline.md`, `deo-score-snapshots.md`, `shopify-integration.md`, `product-sync.md`, `metadata-sync-seo-fields.md`, `sync-status-and-progress-feedback.md`.
- System-level Manual Testing docs (Phase R3): UI, Marketing, Admin & Utilities coverage under `docs/testing/`: UI components (`navigation-and-layout-system.md`, `toast-and-inline-feedback-system.md`, `modal-and-dialog-behavior.md`, `pagination-and-tabs.md`, `search-and-filters-ui.md`), Marketing pages (`marketing-homepage.md`, `marketing-shopify-landing-page.md`, `marketing-pricing-page.md`, `marketing-features-pages.md`), Admin tools (`admin-panel.md`, `background-job-dashboard.md`, `rate-limit-observability.md`, `error-logging-and-monitoring.md`, `worker-health-indicators.md`), Utilities (`token-usage-tracking.md`, `entitlements-matrix.md`, `plan-definitions.md`, `datetime-utilities-and-reset-behaviors.md`, `thumbnail-fetchers.md`, `health-check-endpoints.md`, `project-deletion-and-workspace-cleanup.md`, `user-profile-and-account-settings.md`).

---

## EngineO.ai v1 – Shopify-Only Launch Scope

**Status:** Complete (Specification)

### Summary

- v1 focuses on a single integration surface: **Shopify product catalogs**.
- Scope includes DEO Score, Answer Engine (AEO v1), Issues Engine (Lite), Automation Engine v1, Dashboard UX, and Product Workspace UX for Shopify products only.
- All non-Shopify integrations (other ecommerce platforms, CMSs, video, etc.) are explicitly out of scope for v1 and deferred to later phases.

### AEO – Answer Engine v1

- **Canonical question set:** 10 buyer/AI questions per product, as defined in `docs/ANSWER_ENGINE_SPEC.md` (AE 1.x).
- **Persist Answer Blocks per product with:**
  - Question id + human-readable question
  - Factual answer text (80–120 words)
  - Confidence score (0–1) and factsUsed provenance fields
- **Integrations:**
  - DEO Score v2 answerability component (see `docs/deo-score-spec.md`) uses Answerability signals derived from Answer Blocks and detection.
  - Issues Engine surfaces missing/weak coverage via answerability-related issues (e.g., `not_answer_ready`, `weak_intent_match`) as defined in `docs/deo-issues-spec.md`.
- **Entitlements for AEO v1 at launch:**
  - **Free:** Answer Blocks enabled for 1 product (single Answer set).
  - **Pro:** Answer Blocks for up to 2,000 products.
  - **Business:** Answer Blocks for up to 10,000 products.

### Automation Engine v1

- **Scope limited to product-level automations for Shopify products:**
  - **Immediate automations:** run directly after product sync or issue detection (e.g., missing metadata, missing answers).
  - **Scheduled-light automations:** daily cadence for eligible projects (no complex multi-week scheduling yet).
- **Supported v1 automation actions:**
  - Metadata auto-fix for missing/weak titles and descriptions (existing suggestion engine + auto-apply behavior).
  - Answer Block auto-generation for eligible products where sufficient data exists (hooks into AEO v1 pipeline).
  - Execution logs per automation run (rule id, target product, before/after highlights, status).
- **Test scaffolding for Automation Engine v1:**
  - Create unit, integration, and E2E test scaffolding for Automation Engine v1 (including Shopify Answer Block automations) under `tests/unit/automation/`, `tests/integration/automation/`, and `tests/e2e/automation/` so future implementation work can wire real behavior into pre-defined scenarios.
  - Backend test fixtures for Shopify product payloads and automation events are defined under `apps/api/test/fixtures` for reuse across unit and integration tests.
- **Entitlements at launch:**
  - **Free:** basic metadata automation only (no Answer Block auto-generation; no scheduled/background rules).
  - **Pro + Business:** full Automation Engine v1 scope for products (immediate + scheduled-light automations, metadata + answers) within per-plan product and execution caps.

### DEO Score v1 – Answerability Component

- DEO Score v1 remains the canonical overall score (0–100) per project and per product, backed by snapshots as defined in `docs/deo-score-spec.md`.
- **Incorporate an Answerability component sourced from:**
  - Answerability detection output (AnswerabilityStatus and answerability score) from the Answer Engine.
  - Answer Block coverage across the 10 canonical questions.
- **Weights:**
  - Preserve v1 global weights (Content 30%, Entities 25%, Technical 25%, Visibility 20%) as defined in `docs/deo-score-spec.md`.
  - Use DEO Score v2 explainability weights for the internal answerability component (20% of the v2 model) without changing the v1 aggregate formula.
- **Snapshot expectations for v1 launch:**
  - Store per-product DEO snapshots including Answerability-related metadata (signals + v2 breakdown) in `DeoScoreSnapshot.metadata`.
  - Ensure Product Workspace always reads DEO + Answerability data from the latest snapshot (no ad-hoc recomputation in the UI).

### Issues Engine v1 (Lite)

- **Scope Issues Engine v1 (Lite) to Shopify product-level issues most relevant for launch:**
  - Missing/weak Answer Blocks (mapped to answerability issues like `not_answer_ready` / `weak_intent_match`).
  - Missing or weak metadata (titles, descriptions) and thin descriptions.
  - Missing product image, missing alt text, missing price, missing category.
  - Canonical DEO issues from `docs/deo-issues-spec.md` that can be evaluated from existing Product + CrawlResult data without new schema.
- **UX expectations:**
  - Product-level issue badges in Product Workspace.
  - Issues summary cards in Dashboard highlighting counts by severity (critical/warning/info).
  - Clear linkage from issues to Automation Engine actions (e.g., "Fix with AI" for AI-fixable issues).

### Shopify Integration – v1 Product Surface

- **v1 launch includes Shopify integration only:**
  - **Product sync:** import up to the per-plan product limit into EngineO.ai (Product records linked to Shopify integration).
  - **DEO Score:** compute DEO + Answerability signals for synced Shopify products.
  - **Issues Engine (Lite):** compute issues for synced products only.
  - **AEO v1:** Answerability detection + Answer Block generation for Shopify products.
  - **Automation Engine v1:** product-level metadata + Answer Block automations for Shopify stores.
- Other integrations (crawler-only websites, other ecommerce platforms, CMSs, video, etc.) remain supported where already implemented but are not part of the v1 go-to-market surface.

### v1 UX Surfaces

#### Dashboard Overview (v1)

- **Primary overview widget:** DEO Score summary per Shopify project, including a simple Answerability indicator (e.g., "Answer-ready" / "Needs answers").
- **Issues summary:**
  - Counts by severity (critical, warning, info) and by key categories (metadata, answerability, technical).
  - Quick links into Project Issues and Product Workspace filtered views.
- **Automation overview:**
  - Recent automation runs with status.
  - Short summary of upcoming scheduled-light automations (per project) where applicable.

#### Product Workspace Overview (v1)

- **Per-product header:**
  - DEO Score badge (with Answerability signal visible).
  - Issue badges (counts by severity).
- **Sticky workspace header** with Back to Products link, product name, optimization status pill, and an "Apply to Shopify" action that remains visible while scrolling.
- **Sections:**
  - **Metadata section:** first optimization surface, combining AI suggestions and the metadata editor for SEO title/description (Suggest → Update → Apply to Shopify).
  - **AEO / Answers section:** shows Answer Blocks, Answerability status, and coverage for the 10 canonical questions, including persisted Answer Blocks editing.
  - **Automations section:** shows automation history for the product (runs, status, before/after highlights), with a collapsed-by-default "Last automation" summary card and a "View full history (X)" toggle so long log lists only appear when expanded.
  - **Issues & DEO Insights section:** right-hand DEO / SEO Insights panel, collapsed by default to a "DEO Score & Issues" summary card with content depth and metadata completeness summaries, with an "Expand issues & recommendations" toggle to reveal full issue details and roadmap items.
- **AI suggestions:**
  - Per-product suggestions for metadata and Answer Blocks, gated by daily AI usage limits and plan entitlements.
  - Clear "Apply to Shopify" actions where suggestions can be synced back to Shopify.
- **Navigation:**
  - Sticky "Jump to" anchor bar under the workspace header with links for Metadata, Answers, Automations, and Issues that smoothly scroll to the corresponding sections.

#### Automation Engine UX (v1)

- **Approvals and controls:**
  - Simple project-level toggles to enable/disable Automation Engine v1 rules for products (e.g., auto-apply metadata fixes vs. review-only).
  - Basic per-rule "auto-apply" vs. "review" configuration for metadata and Answer Block automations (Pro/Business only).
- **Logs:**
  - Execution log view listing recent automation runs with timestamps, status, and targets.
  - Ability to drill into a product from a given log entry.
- **Upcoming automations:**
  - Lightweight overview of next scheduled-light automations (e.g., "Daily metadata refresh for 200 products").

### v1 Tier Limits (Launch)

#### Free (Launch)

- Up to 50 products per Shopify project.
- AEO v1: Answer Blocks enabled for 1 product (single Answer set).
- AI usage: up to 10 AI suggestions/day (shared across metadata and AEO features).
- Automation Engine v1: basic metadata-only automations (no Answer Block automations, no scheduled-light rules).

#### Pro ($29/mo)

- Up to 2,000 products per Shopify project.
- Full AEO v1 coverage for products within limit.
- Automation Engine v1: immediate + scheduled-light product automations (metadata + Answer Blocks).

#### Business ($99/mo)

- Up to 10,000 products per Shopify project.
- Full Automation Engine v1 (products) with higher execution caps.
- API access enabled as per `docs/ENTITLEMENTS_MATRIX.md`.

### v1 Launch Roadmap Alignment

**Phases contributing to v1 launch** (non-exhaustive; see detailed sections for full scope):

- **Shopify integration** (Phase 2.x: app setup, OAuth, product sync, apply-to-Shopify writer).
- **DEO Score** (Phase 2.x–3.x: scoring pipeline, signals, snapshots, Answerability integration).
- **Answer Engine** (Phases AE-1.x–AE-1.2: detection, Answer Block generation, UI integration).
- **Issues Engine** (Phase 3B, UX-7, UX-8: backend Issues Engine + Lite/Full UX).
- **Automation Engine** (Phases AE-1, AE-2, AUE-1: framework, product automations, Shopify metadata auto-apply).
- **Dashboard** (Phase 7: core dashboard widgets and summaries).
- **Product Workspace** (Phase UX-2 and related UX phases).
- **Website launch** (Phases 0.5 and MARKETING-1/2: marketing site + Shopify landing page).
- **Shopify App Store launch** (Phase 2.0 and Phase 11.x: Shopify app setup, listing readiness).

### v1 Acceptance Criteria (Specification)

- [x] v1 launch scope documented in IMPLEMENTATION_PLAN.md
- [x] AEO v1 scope defined with entitlements
- [x] Automation Engine v1 scope defined with entitlements
- [x] DEO Score v1 Answerability component specified
- [x] Issues Engine v1 (Lite) scope defined
- [x] Shopify-only integration surface documented
- [x] v1 UX surfaces (Dashboard, Product Workspace, Automation Engine) outlined
- [x] v1 Tier Limits defined (Free, Pro, Business)
- [x] Roadmap alignment to existing phases documented
- [x] Manual testing doc created

**Manual Testing:** `docs/manual-testing/v1-shopify-launch-scope.md`, `docs/manual-testing/phase-ae-1.3-answer-block-persistence.md`, `docs/manual-testing/automation-engine-v1-shopify-answer-block-automations.md`, `docs/manual-testing/phase-ux-2-product-workspace-aeo-and-automation-ui.md`

**Note:** This patch does not change critical path definitions, but v1 launch scenarios must be mapped to existing critical paths in `docs/testing/CRITICAL_PATH_MAP.md` (Shopify Sync, Product Optimize, DEO Score Compute, Automation, Dashboard) and verified per `docs/testing/RELEASE_VERIFICATION_GATE.md`.

---

**Author:** Narasimhan Mahendrakumar
