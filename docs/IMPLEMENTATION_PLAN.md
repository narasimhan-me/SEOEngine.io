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

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Created with GTM-ONBOARD-1, SELF-SERVICE-1, ADMIN-OPS-1, MEDIA-1, AUTO-PB-1 phases |
| 1.1 | 2025-12-19 | Corrected GTM-ONBOARD-1 status to "Docs Complete; Implementation Pending". Added locked trust contracts and expanded dependencies. |
