# EngineO.ai Implementation Plan

This document tracks all implementation phases and their completion status.

---

## Phase GTM-ONBOARD-1: Guided Onboarding & First DEO Win 📄 DOCS COMPLETE

**Status:** Docs Complete; Implementation Pending
**Activation Milestone:** Project-scoped banner only
**Date Documented:** 2025-12-19

### Overview

Trust-safe guided onboarding flow that helps new users achieve their first DEO win within 5-10 minutes of connecting their Shopify store.

### Implementation Patches (Pending)

#### PATCH 1 — Prisma: Onboarding State
- [ ] Add `ProjectOnboardingStatus` enum: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`
- [ ] Add `ProjectOnboardingState` model with userId, projectId, status, stepIndex, selectedContext, timestamps
- [ ] Add relations to User and Project models
- [ ] Create migration `gtm-onboard-1_onboarding-state`

#### PATCH 2 — API: Onboarding Module
- [ ] Create `onboarding.module.ts`, `onboarding.controller.ts`, `onboarding.service.ts`
- [ ] Register OnboardingModule in `app.module.ts`
- [ ] Implement endpoints (no AI side effects):
  - `GET /onboarding/projects/:projectId/status`
  - `POST /onboarding/projects/:projectId/start`
  - `POST /onboarding/projects/:projectId/advance`
  - `POST /onboarding/projects/:projectId/skip`

#### PATCH 3 — Backend: Locked Issue Selection Ladder
- [ ] Implement issue selection: Search & Intent > Media > Metadata
- [ ] Severity ordering: critical > warning > info (tie-breaker: count, then issue.id)
- [ ] Recommendation payload with pillar-specific fields
- [ ] Eligibility condition: Shopify connected AND no successful APPLY run

#### PATCH 4 — Trust Contract Fix
- [ ] Remove fire-and-forget `triggerAnswerBlockAutomationsForIssues` from `deo-issues.service.ts`
- [ ] Add code comment: "No silent AI; viewing issues must not enqueue or trigger AI work"

#### PATCH 5 — Canonical APPLY Recording (RUNS-1)
- [ ] Update apply endpoints to create AutomationPlaybookRun rows:
  - `search-intent.controller.ts`
  - `media-accessibility.controller.ts`
  - `competitors.controller.ts`
  - `offsite-signals.controller.ts`
  - `local-discovery.controller.ts`
  - `shopify.service.ts` (updateProductSeo)
- [ ] All APPLY records use `aiUsed=false` (critical invariant)
- [ ] Stable playbookId per pillar (e.g., `search_intent_fix`, `shopify_product_seo_update`)

#### PATCH 6 — Web: Onboarding API Client + Analytics
- [ ] Add `analytics.ts` wrapper for GA events via `window.gtag`
- [ ] Update `api.ts` with `onboardingApi` methods
- [ ] Analytics events: `onboarding_started`, `onboarding_step_completed`, `onboarding_first_preview`, `onboarding_first_apply`, `onboarding_completed`, `onboarding_skipped`

#### PATCH 7 — Web: Persistent Banner + Step Panel
- [ ] Create `OnboardingBanner.tsx` (visible under /projects/[id]/* only)
- [ ] Create `OnboardingPanel.tsx` (4-step guidance UI)
- [ ] Update `layout.tsx` to render banner
- [ ] Session dismissal via sessionStorage
- [ ] Celebration copy varies by guided vs non-guided completion

#### PATCH 8 — Web: Deep-link Focus + No Auto Preview
- [ ] Update product page to read onboarding focus params
- [ ] Auto-expand target section without auto-AI
- [ ] Create `ProductMediaAccessibilityPanel.tsx`
- [ ] All preview actions require explicit user click

#### PATCH 9 — Help Hub: Restart Entry Point (Docs Complete)
- [x] Added "Get your first DEO win" section to Help page (Coming Soon indicator)
- [ ] Links to /projects for onboarding resume (pending implementation)

#### PATCH 10 — Tests + Docs (Docs Complete)
- [ ] Create `gtm-onboard-1.test.ts` (backend integration) — Planned
- [ ] Create `gtm-onboard-1.spec.ts` (Playwright E2E) — Planned
- [x] Created `GTM_ONBOARDING.md` (philosophy/spec doc)
- [x] Created `GTM-ONBOARD-1.md` (manual testing guide)
- [x] Updated `CRITICAL_PATH_MAP.md` with CP-015

### Key Invariants (Spec)

1. **No Silent AI**: Onboarding never triggers AI work without explicit user click
2. **APPLY aiUsed=false**: All canonical APPLY records set aiUsed=false
3. **Derived State**: Eligibility and recommendations computed from existing data
4. **Resumable**: Progress persisted per user+project

### Dependencies

**Required (Complete):**
- SELF-SERVICE-1: Session and authentication infrastructure
- AUTO-PB-1 (RUNS-1): AutomationPlaybookRun model for completion tracking
- MEDIA-1: Media pillar issues for selection ladder
- AI-USAGE-1/v2: AI quota tracking and reuse metrics
- DEO Pillars (search_intent_fit, media_accessibility, metadata_snippet_quality): Issue data source

**Optional Enhancement:**
- CACHE/REUSE v2: Draft reuse for onboarding preview persistence

### Locked Trust Contracts

These invariants MUST be preserved during implementation:

1. **No Silent AI**: Onboarding endpoints and UI MUST NOT trigger AI work automatically. All AI operations require explicit user click (e.g., "Preview fix" button).

2. **APPLY aiUsed=false**: When recording canonical APPLY runs to AutomationPlaybookRun, the `aiUsed` field MUST always be `false`. APPLY operations never consume AI quota.

3. **Derived State Only**: Eligibility, recommendations, and completion status are computed from existing data (issues, integrations, AutomationPlaybookRun rows). No new data collection required.

4. **Project-Scoped Only**: Onboarding banner and state are scoped to individual projects under `/projects/[id]/*`. No global onboarding state.

### Related Documents

- [GTM_ONBOARDING.md](./GTM_ONBOARDING.md) - Philosophy and architecture (Spec)
- [GTM-ONBOARD-1.md](./manual-testing/GTM-ONBOARD-1.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-015 entry
- [ACTIVATION_METRICS.md](./ACTIVATION_METRICS.md) - Activation funnel metrics

---

## Phase SELF-SERVICE-1: Customer Self-Service Control Plane ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Customer-facing self-service management of accounts, profiles, preferences, and billing.

### Related Documents

- [SELF_SERVICE.md](./SELF_SERVICE.md) - Architecture and API documentation
- [SELF-SERVICE-1.md](./manual-testing/SELF-SERVICE-1.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-014 entry

---

## Phase ADMIN-OPS-1: Admin Operations Dashboard ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Internal-only operational control plane for Support Agents, Ops Admins, and Management/CEO.

### Related Documents

- [ADMIN_OPS.md](./ADMIN_OPS.md) - Architecture and role definitions
- [ADMIN-OPS-1.md](./manual-testing/ADMIN-OPS-1.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-013 entry

---

## Phase INSIGHTS-1: Project Insights Dashboard ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Read-only derived insights dashboard showing DEO progress, AI efficiency metrics, issue resolution, and opportunity signals.

### Key Features

1. **Overview Cards**: DEO score improvements, AI runs saved, issues resolved, next opportunity
2. **DEO Progress**: Score trends, component deltas, fixes applied over time
3. **AI Efficiency**: Reuse rates, quota status, trust invariant display ("Apply never uses AI")
4. **Issue Resolution**: By-pillar breakdown, high-impact open issues, recently resolved
5. **Opportunity Signals**: Prioritized opportunities by impact level

### Trust Invariants

1. **Read-Only Only**: Insights endpoint never triggers AI or mutations
2. **Cached Data**: Uses `*ReadOnly` service methods that don't recompute
3. **Trust Display**: Shows "Apply never uses AI" prominently in AI Efficiency page
4. **No Side Effects**: Page views cannot trigger automations or AI calls

### Implementation Details

- API: `GET /projects/:id/insights` → `ProjectInsightsService.getProjectInsights()`
- Service: `project-insights.service.ts` with aggregation from existing data
- Read-only methods added to:
  - `deo-issues.service.ts` (`getIssuesForProjectReadOnly`)
  - `offsite-signals.service.ts` (`buildOffsiteIssuesForProjectReadOnly`)
  - `local-discovery.service.ts` (`buildLocalIssuesForProjectReadOnly`)
- E2E seed: `POST /testkit/e2e/seed-insights-1`

### Web UI

- Main page: `/projects/[id]/insights`
- Subpages: `deo-progress`, `ai-efficiency`, `issue-resolution`, `opportunity-signals`
- Components: `InsightsSubnav.tsx`, `Sparkline.tsx`
- Navigation: Added to `ProjectSideNav.tsx`

### Related Documents

- [INSIGHTS-1.md](./manual-testing/INSIGHTS-1.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-016 entry

---

## Phase MEDIA-1: Media & Accessibility Pillar ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-18

Media accessibility pillar with image alt text ingestion, issue detection, and AI-powered fixes.

### Related Documents

- [MEDIA_PILLAR.md](./MEDIA_PILLAR.md) - Pillar specification
- [MEDIA-1.md](./manual-testing/MEDIA-1.md) - Manual testing guide

---

## Phase AUTO-PB-1: Automation Playbooks ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-15

Automation Playbooks v1 with preview → estimate → apply flow.

### Related Documents

- [phase-automation-1-playbooks.md](./manual-testing/phase-automation-1-playbooks.md) - Manual testing guide
- [auto-pb-1-1-playbooks-hardening.md](./manual-testing/auto-pb-1-1-playbooks-hardening.md) - Hardening guide
- [auto-pb-1-2-playbooks-ux-coherence.md](./manual-testing/auto-pb-1-2-playbooks-ux-coherence.md) - UX coherence guide

---

## Upcoming Phases

### Phase AUTO-PB-1.3: Preview Persistence & Cross-Surface Drafts (Planned)

Persistent AI drafts that survive navigation and can be reused across Playbooks and Product detail surfaces.

---

## Phase BILLING-GTM-1: Pricing pages & trust-safe upgrade flows ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Public pricing and in-app upgrade flows that surface value first and enforce quotas via Predict → Warn → Enforce, Stripe-first.

### Key Behaviors

1. **Value before price**: Users see progress and savings before upgrade CTAs
2. **Predict → Warn → Enforce**: Warnings precede limits; no surprise blocks
3. **Stripe is source of truth**: EngineO.ai never handles card data
4. **Apply remains AI-free**: Billing does not change Apply semantics

### Implementation Details

- Env-driven AI quota: `AI_USAGE_MONTHLY_RUN_LIMIT_<PLAN>`
- Fixed billing page to show `aiUsedRuns` (not `totalRuns`)
- Added trust messaging: "APPLY never uses AI", "Reuse saves AI runs"
- Contextual upgrade prompts on Insights pages when quota >=80%
- Marketing pricing aligned with backend limits (removed mismatched claims)
- Self-serve CTAs on all plans (removed enterprise/sales references)

### Related Documents

- [BILLING_GTM.md](./BILLING_GTM.md) - Architecture documentation
- [BILLING-GTM-1.md](./manual-testing/BILLING-GTM-1.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-002 entry

---

## Phase GEO-FOUNDATION-1: GEO Answer Readiness & Citation Confidence ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

GEO (Generative Engine Optimization) foundation layer providing explainable answer readiness signals and citation confidence derived from Answer Units (v1: Answer Blocks).

### Key Features

1. **Readiness Signals**: Clarity, Specificity, Structure, Context, Accessibility
2. **Citation Confidence**: Low/Medium/High derived from signals (no predictions/guarantees)
3. **GEO Issues**: Missing direct answer, vague answer, poor structure, promotional language, missing examples
4. **Preview/Apply Flow**: Draft-first pattern with AI quota tracking and reuse

### Trust Invariants

1. **No Ranking Guarantees**: Citation Confidence is a readiness signal, not a prediction
2. **No Scraping**: GEO never simulates or scrapes AI engine outputs
3. **Apply Never Uses AI**: GEO fixes follow the standard Preview (AI) → Apply (no AI) pattern
4. **Explainable Signals**: Each signal includes a `why` explanation

### Implementation Details

- **Shared Types**: `packages/shared/src/geo.ts` - Core types and evaluation functions
- **API Service**: `apps/api/src/projects/geo.service.ts` - Product GEO readiness evaluation
- **API Controller**: `apps/api/src/projects/geo.controller.ts` - Preview/Apply endpoints
- **Prisma Models**: `ProductGeoFixDraft`, `ProductGeoFixApplication`, `GeoIssueType`, `GeoCitationConfidenceLevel`
- **AI Generation**: `generateGeoAnswerImprovement()` in `ai.service.ts`
- **Issue Integration**: GEO issues added to `deo-issues.service.ts` via `buildGeoIssuesForProject()`
- **Usage Tracking**: `GEO_FIX_PREVIEW` run type in AI usage ledger

### API Endpoints

- `GET /products/:productId/geo` - Get product GEO readiness signals
- `POST /products/:productId/geo/preview` - Generate draft improvement (uses AI, respects quota)
- `POST /products/:productId/geo/apply` - Apply draft to Answer Block (no AI)

### Build Configuration

- Updated `packages/shared/package.json` build script to clean dist before build
- Updated `packages/shared/tsconfig.json` to exclude all test files from build output
- Test files (`*.test.ts`, `*.spec.ts`) remain in source but are not compiled to dist

### Related Documents

- [GEO_FOUNDATION.md](./GEO_FOUNDATION.md) - Philosophy and architecture (TBD)

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Created with GTM-ONBOARD-1, SELF-SERVICE-1, ADMIN-OPS-1, MEDIA-1, AUTO-PB-1 phases |
| 1.1 | 2025-12-19 | Corrected GTM-ONBOARD-1 status to "Docs Complete; Implementation Pending". Added locked trust contracts and expanded dependencies. |
| 1.2 | 2025-12-19 | Added INSIGHTS-1: Project Insights Dashboard (Complete) |
| 1.3 | 2025-12-19 | Added BILLING-GTM-1: Pricing pages & trust-safe upgrade flows (Complete) |
| 1.4 | 2025-12-19 | SECURITY HOTFIX: Sanitized auth query params to prevent password leakage in logs/history; added middleware + client-side defense-in-depth + Playwright coverage; added manual testing doc. |
| 1.5 | 2025-12-19 | Added GEO-FOUNDATION-1: GEO Answer Readiness & Citation Confidence (Complete) |
| 1.6 | 2025-12-19 | GEO-FOUNDATION-1: Updated shared package build configuration to exclude test files from dist output |
