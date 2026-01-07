# EngineO.ai Implementation Plan

This document tracks all implementation phases and their completion status.

> ⚠️ **Authoritative:** `docs/IMPLEMENTATION_PLAN.md` is the single source of truth for EngineO.ai execution. The root `IMPLEMENTATION_PLAN.md` is deprecated.

---

## Completed Phases (Chronological)

### Foundations

*None recorded as standalone phases.*

### Core Platform

### Phase SELF-SERVICE-1: Customer Self-Service Control Plane ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-18

Customer-facing login portal with session management, authentication, and Shopify store connection.

### Key Features

1. **Login/Registration Flow**: Email-based with password reset
2. **Session Management**: JWT tokens with refresh
3. **Stores Dashboard**: View connected Shopify stores
4. **Shopify OAuth**: Connect stores via OAuth flow

### Core Files

- apps/api/src/auth/
- apps/web/src/app/(auth)/
- apps/web/src/lib/auth.ts

---

### Phase ADMIN-OPS-1: Admin Operations Dashboard ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-18

Internal admin dashboard for operations, user management, and system monitoring.

### Key Features

1. **User Management**: View all users, projects, subscriptions
2. **Project Viewer**: Inspect project state and crawl data
3. **System Health**: Monitor API health and background jobs

### Core Files

- apps/api/src/admin/
- apps/web/src/app/admin/

---

### Phase BILLING-GTM-1: Pricing pages & trust-safe upgrade flows ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Pricing pages and upgrade flows with Stripe integration for subscription management.

### Key Features

1. **Pricing Page**: Public pricing page with plan comparison
2. **Checkout Flow**: Stripe Checkout for plan upgrades
3. **Billing Portal**: Customer portal for subscription management
4. **Webhook Handling**: Stripe webhook processing

### Core Files

- apps/api/src/billing/
- apps/web/src/app/pricing/
- apps/web/src/app/billing/

---

### Phase AUTO-PB-1: Automation Playbooks ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Automation playbook system for DEO fixes with preview/apply workflow.

### Key Features

1. **Playbook Registry**: Available automation types
2. **Preview/Apply Flow**: 3-step confirmation flow
3. **Draft Persistence**: Cross-surface draft reuse
4. **Apply Execution**: Shopify API mutations

### Core Files

- apps/api/src/automation/
- apps/web/src/app/projects/[id]/playbooks/

---

### Phase INSIGHTS-1: Project Insights Dashboard ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Project-level insights dashboard with DEO metrics and issue tracking.

### Key Features

1. **DEO Score Overview**: Current score with trend
2. **Issue Breakdown**: By pillar and severity
3. **Action Recommendations**: Prioritized fix suggestions
4. **Performance Metrics**: Load times and API performance

---

### Phase MEDIA-1: Media & Accessibility Pillar ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Media accessibility pillar for image alt text and media optimization.

### Key Features

1. **Alt Text Analysis**: Missing/poor alt text detection
2. **Image Optimization**: Size and format recommendations
3. **Accessibility Score**: WCAG compliance indicators

---

### Phase GEO-FOUNDATION-1: GEO Answer Readiness & Citation Confidence ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Foundation for GEO (Generative Engine Optimization) analysis.

### Key Features

1. **Answer Readiness Score**: Content structure analysis
2. **Citation Confidence**: Source credibility signals
3. **GEO Reports**: Per-product answer optimization reports

---

### Governance & Roles

### Phase ROLES-2: Project Roles & Approval Foundations ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-23

Role-based access control foundations with OWNER/EDITOR/VIEWER matrix.

### Key Features

1. **Role Resolution**: accountRole → projectRole resolution
2. **Capability Matrix**: Per-role action permissions
3. **Apply Restrictions**: VIEWER cannot apply, EDITOR needs approval

---

### Phase ROLES-3: True Multi-User Projects & Approval Chains ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-23

Multi-user project support with approval workflows.

### Key Features

1. **ProjectMember Model**: Multiple users per project
2. **Approval Workflow**: Request → approve → execute pattern
3. **Co-Owner Support**: Multiple OWNERs can approve

---

### Phase ENTERPRISE-GEO-1: Enterprise Governance & Approvals ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-21

Enterprise-grade governance controls for GEO reports and content modifications.

> **Note:** Initially shipped with single-user approval gating. Enforcement was later hardened across all project surfaces by ROLES-2 and ROLES-3.

### Key Features

1. **Governance Policy**: Per-project settings for approval requirements, share restrictions, expiry, content controls
2. **Approval Workflow**: Request → approve/reject → consume pattern for GEO fixes and Answer Block sync
3. **Passcode-Protected Share Links**: 8-char alphanumeric passcode, bcrypt hashed, shown once at creation
4. **Audit Events**: Immutable log of all governance actions (policy updates, approvals, share links, applies)
5. **Content Redaction**: Optional competitor mention redaction in exported reports

---

### Phase GOV-AUDIT-VIEWER-1: Audit & Approvals Viewer ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

Read-only governance viewer with tabs for approvals, audit log, and sharing.

### Key Features

1. **Approvals Tab**: Pending and historical approval requests
2. **Audit Log Tab**: Filtered event history
3. **Sharing Tab**: Share link management

---

### Execution Surfaces

### Phase PRODUCTS-LIST-2.0: Decision-First Products List ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-21

Decision-first products list with health pills and recommended actions.

### Key Features

1. **Health Pills**: Visual status indicators per product
2. **Recommended Actions**: Prioritized fix suggestions
3. **Command Bar**: Quick actions and navigation

---

### Phase WORK-QUEUE-1: Unified Action Bundle Work Queue ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

Unified work queue with action bundles derived from issues and recommendations.

### Key Features

1. **Action Bundles**: Grouped recommendations by type
2. **Tab-Based Filtering**: Critical/Needs Attention/Pending/Drafts/Applied
3. **Bundle CTAs**: Direct routing to fix surfaces

---

### Phase STORE-HEALTH-1.0: Store Optimization Home ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

Store-level optimization home page with 6 decision-cards.

### Key Features

1. **6 Decision Cards**: Products, Pages, Collections, SEO, Content, Performance
2. **Health Indicators**: Per-card status and counts
3. **Work Queue Routing**: Direct links to filtered work queue

---

### Phase ASSETS-PAGES-1: Pages & Collections Visibility ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

Pages and collections visibility as first-class assets.

### Key Features

1. **Asset Lists**: Dedicated pages/collections list pages
2. **Work Queue Integration**: Asset-scoped bundles

---

### Phase ASSETS-PAGES-1.1: Pages & Collections Execution ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

Full execution support for pages and collections SEO fixes.

### Key Features

1. **Asset-Scoped Playbooks**: SEO fixes for pages/collections
2. **Shopify Mutations**: Page/collection SEO updates

---

### Phase ASSETS-PAGES-1.1-UI-HARDEN: End-to-End Shippable UI ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

UI hardening for asset-scoped playbook execution.

### Key Features

1. **Scope Safety Block**: Prevents apply with missing scope
2. **Scope Summary UI**: Visual scope confirmation
3. **Deep Link Support**: Work queue to playbooks routing

---

### Phase NAV-IA-CONSISTENCY-1: Navigation IA Consistency & Terminology ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-06

Navigation information architecture consistency and terminology normalization.

### Key Features

1. **Design Tokens**: Color palette and dark mode
2. **Terminology**: Consistent naming across UI
3. **Navigation Structure**: OPERATE/ASSETS/AUTOMATION/INSIGHTS groups

---

### Phase TRUST-ROUTING-1: UX Trust Hardening (Deterministic Routing + Context Preservation) ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-06

Trust hardening for deterministic routing and context preservation.

### Key Features

1. **Context Propagation**: from/playbookId/returnTo params
2. **Preview Mode**: Draft comparison and expiry handling
3. **Filter Context**: Visible filter state in Work Queue

---

### Phase ISSUE-TO-FIX-PATH-1: Trust-Critical UX Hardening for Issue→Fix Path ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-07

Trust-critical UX hardening for issue→fix path navigation.

### Key Features

1. **Fix Path Routing**: Single source of truth (issue-to-fix-path.ts)
2. **Orphan Suppression**: Non-actionable issues not clickable
3. **Context Banners**: "You're here to fix:" arrival messaging
4. **ID Leakage Prevention**: Safe title helpers for UI display

---

## In Progress

*None.*

---

## Planned / Pending

### Phase GTM-ONBOARD-1: Guided Onboarding & First DEO Win 📄 DOCS COMPLETE — IMPLEMENTATION PENDING

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

## Deferred / Explicitly Excluded

*None at this time.*

---

### Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Created with GTM-ONBOARD-1, SELF-SERVICE-1, ADMIN-OPS-1, MEDIA-1, AUTO-PB-1 phases |
| 1.1 | 2025-12-19 | Corrected GTM-ONBOARD-1 status to "Docs Complete; Implementation Pending". Added locked trust contracts and expanded dependencies. |
| 1.2 | 2025-12-19 | Added INSIGHTS-1: Project Insights Dashboard (Complete) |
| 1.3 | 2025-12-19 | Added BILLING-GTM-1: Pricing pages & trust-safe upgrade flows (Complete) |
| 1.4 | 2025-12-19 | SECURITY HOTFIX: Sanitized auth query params to prevent password leakage in logs/history; added middleware + client-side defense-in-depth + Playwright coverage; added manual testing doc. |
| 1.5 | 2025-12-19 | Added GEO-FOUNDATION-1: GEO Answer Readiness & Citation Confidence (Complete) |
| 1.6 | 2025-12-19 | GEO-FOUNDATION-1: Updated shared package build configuration to exclude test files from dist output |
| 1.7 | 2025-12-21 | Added ENTERPRISE-GEO-1: Enterprise Governance & Approvals (Complete) |
| 1.8 | 2025-12-21 | Added PRODUCTS-LIST-2.0: Decision-First Products List (Complete) - Health pills, recommended actions, progressive disclosure, Command Bar |
| 1.9 | 2025-12-21 | PRODUCTS-LIST-2.0: Added Sort by impact ladder (authoritative, deterministic, action-aligned clustering) |
| 2.0 | 2025-12-21 | PRODUCTS-LIST-2.0: Added Bulk-action confirmation UX (3-step, draft-first, no one-click apply) with API client methods for draft lifecycle and deep-link support |
| 2.1 | 2025-12-23 | Added ROLES-3: True Multi-User Projects & Approval Chains (Complete) - ProjectMember model, membership management API, OWNER-only apply enforcement, multi-user auto-apply blocking |
| 2.2 | 2025-12-23 | ROLES-3 FIXUP-1: Made multi-user projects work end-to-end - membership-aware access for governance services, role resolution fixes, draft generation blocking for VIEWER, frontend role-based UI, Members management page |
| 2.3 | 2025-12-23 | ROLES-3 FIXUP-2: Strict matrix enforcement - OWNER cannot create approval requests in multi-user projects, role simulation correctness (accountRole ignored in multi-user), isMultiUserProject in API response, OWNER-only for Answer Block mutations, updated documentation |
| 2.4 | 2025-12-24 | ROLES-3 FIXUP-3: Frontend correction for strict approval-chain matrix - removed ephemeral approvalRequested flag, derived state from server-sourced pendingApproval, EDITOR can NEVER apply even if approved, button states and CTA copy derived from server truth |
| 2.5 | 2025-12-24 | ROLES-3 FIXUP-4: Membership + Role Enforcement Beyond projects/* - eliminated legacy project.userId ownership gates in AI controller, ProductIssueFixService, SEO scan, Integrations, and Shopify services; replaced with RoleResolutionService assertions (assertProjectAccess, assertOwnerRole, assertCanGenerateDrafts); added integration tests |
| 2.6 | 2025-12-24 | ROLES-3 FIXUP-5: Co-Owner Support for Shopify Actions - Shopify validateProjectOwnership uses RoleResolutionService (supports co-owners), Account disconnectStore uses assertOwnerRole for project-level check, co-owner can perform install/sync-products/ensure-metafield-definitions, added integration tests for multi-owner Shopify actions |
| 2.7 | 2025-12-24 | ROLES-2 FIXUP-3: Role-specific apply denial messages - VIEWER gets "Viewer role cannot apply automation playbooks. Preview and export remain available.", EDITOR gets "Editor role cannot apply automation playbooks. Request approval from an owner." Aligns with test expectations in roles-2.test.ts |
| 2.8 | 2025-12-24 | Added Phase ROLES-2 section with dedicated capability matrix and FIXUP-3 corrections documentation |
| 2.9 | 2025-12-24 | ROLES-3 PENDING-1: Approval attribution UI - Playbooks Step 3 shows requester/approver identity + timestamp. Updated CP-019 Auto Tests to reflect roles-3.test.ts is present. |
| 3.0 | 2025-12-24 | ROLES-3 PENDING-2: Docs consistency fix - marked roles-3.spec.ts as (planned) in Test Coverage section to match reality (Playwright E2E not yet implemented). |
| 3.1 | 2025-12-24 | ROLES-3-HARDEN-1: Implemented Playwright E2E coverage (apps/web/tests/roles-3.spec.ts) and AI usage actor attribution (actorUserId) support; updated CP-019 automated test references accordingly. |
| 3.2 | 2025-12-24 | Added STORE-HEALTH-1.0: Store Optimization Home (Complete) - Decision-only 6-card page, Work Queue actionKey filter support, navigation updates, manual testing doc |
| 3.3 | 2025-12-24 | Added ASSETS-PAGES-1: Pages & Collections as First-Class Assets (Complete) - Extended scope types, separate Work Queue bundles by asset type, dedicated asset list pages, decision-first UX, manual testing doc |
| 3.4 | 2025-12-24 | ASSETS-PAGES-1 Close-Out: Redefined as visibility-only phase. Added explicit Excluded list, deferral note, and follow-up phase ASSETS-PAGES-1.1. Updated manual testing doc for visibility-only contract. Documented scopeType in API_SPEC.md and WORK-QUEUE-1.md. |
| 3.5 | 2025-12-24 | ASSETS-PAGES-1.1 Started: PATCH 1 (Contract + API) complete - added asset-scoped types, parseAssetRef/createAssetRef helpers, extended controller endpoints with assetType/scopeAssetRefs params. Added Automation Playbooks section to API_SPEC.md. |
| 3.6 | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 2 Complete: Applied authoritative constraints - removed non-canonical playbook ID variants (page_seo_title_fix, etc.), updated service to use canonical IDs (missing_seo_title, missing_seo_description) with assetType differentiation. Extended estimatePlaybook() for asset-scoped estimates, wired controller to pass assetType through. Handle-only apply with deterministic blocking for unaddressable items. |
| 3.7 | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 3 Complete: Implemented Shopify Admin API mutations for Page/Collection SEO - updateShopifyPageSeo() (pageUpdate), updateShopifyCollectionSeo() (collectionUpdate), public methods updatePageSeo() and updateCollectionSeo() with OWNER-only access, handle-based lookup, local CrawlResult sync. |
| 3.8 | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 4 Complete: Extended Work Queue derivation for PAGES/COLLECTIONS automation bundles - iterates over all asset types, asset-specific bundle IDs, scope preview from CrawlResult, asset-type-specific labels. |
| 3.9 | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 6+7 Complete: Created ASSETS-PAGES-1.1.md manual testing doc, verified and removed non-canonical playbook ID references from API_SPEC.md. Phase ready for execution testing. |
| 4.0 | 2025-12-24 | **ASSETS-PAGES-1.1 COMPLETE**: PATCH 5 (Frontend + E2E) - Work Queue CTA routing with asset-scoped deep links, Playbooks page assetType support, api.ts assetType/scopeAssetRefs, E2E tests in assets-pages-1-1.e2e-spec.ts. Phase marked complete. |
| 4.1 | 2025-12-24 | **ASSETS-PAGES-1.1-UI-HARDEN COMPLETE**: Full API client param support for all operations, Playbooks UI missing-scope safety block, scope summary UI, Work Queue deep link with scopeAssetRefs, Playwright UI smoke tests (assets-pages-1-1.spec.ts). |
| 4.2 | 2025-12-24 | **GOV-AUDIT-VIEWER-1 COMPLETE**: Read-only governance viewer with 3 tabs (Approvals, Audit Log, Sharing & Links), strict audit event allowlist filtering, cursor-based pagination, passcode security (never expose hash), universal read access for all project members. Added governance-viewer.service.ts, extended governance.controller.ts, created governance viewer UI page, E2E and Playwright tests. |
| 4.3 | 2026-01-06 | **NAV-IA-CONSISTENCY-1 COMPLETE**: Navigation IA consistency and terminology normalization. Design tokens + dark mode, marketing/portal visual consistency, auth terminology ("Sign in" not "Log in", "Create account" not "Sign up"), TopNav contract (removed Settings, added theme toggle, locked dropdown labels), ProjectSideNav grouped sections (OPERATE/ASSETS/AUTOMATION/INSIGHTS/PROJECT), InsightsPillarsSubnav for pillar navigation, "Stores" not "Organization / Stores", "Playbooks" not "Automation". E2E tests in nav-ia-consistency-1.spec.ts. |
| 4.4 | 2026-01-06 | **NAV-IA-CONSISTENCY-1 FINAL CLEANUP**: Removed coming-soon styling exception (all pages now use token palette), aligned marketing button radius (rounded-full → rounded-md for portal consistency), fixed text-white → text-primary-foreground, fixed ring-white → ring-background, added repo-root manual-testing pointer. |
| 4.5 | 2026-01-06 | **TRUST-ROUTING-1 COMPLETE**: UX Trust Hardening - Playbooks preview context propagation (from/playbookId/returnTo params), Product Preview Mode UX (banner + draft comparison + expiry handling), Store Health → Work Queue multi-key routing with visible filter context, CTA safety enforcement (issues routes instead of placeholder pages), Insights nav simplification (single primary strip, pillar dropdown). E2E tests in trust-routing-1.spec.ts. |
| 4.6 | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 COMPLETE**: Trust-Critical UX Hardening for Issue→Fix Path - Single source of truth (issue-to-fix-path.ts), orphan issue suppression, actionable count parity, context banners ("You're here to fix:"), no internal ID leakage. E2E tests in issue-to-fix-path-1.spec.ts. |
| 4.7 | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-1**: Circular import fix + remaining orphan/dead-end surface cleanup - Moved ISSUE_UI_CONFIG to lib/issue-ui-config.ts, issue-fix mode triggers on issueId alone (not requiring from=issues), Overview Top blockers uses actionable-only with from=overview, DEO page pillar scorecards use actionable issues only, Project Issues page counts actionable-only, Playwright test uses /overview route. |
| 4.8 | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-2**: Trust hardening (dead-click prevention + ID leakage) - Href-based actionability on Issues page (buildIssueFixHref !== null), handleIssueClick accepts pre-validated href, internal ID leakage prevention via getSafeIssueTitle/Description in Overview/Performance/Insights panels, new getSafeInsightsIssueTitle helper for insights-style data, dead-click Playwright regression test. |
| 4.9 | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-3**: Alignment-only update — Work Queue banner test + manual testing updated to reflect issue-fix mode triggers on issueId alone (from optional); CP-008 wording updated accordingly. |
| 5.0 | 2026-01-07 | **IMPLEMENTATION-PLAN-RECONCILIATION-1**: Root `IMPLEMENTATION_PLAN.md` deprecated to stub-only; `docs/IMPLEMENTATION_PLAN.md` is now the authoritative single source of truth. Core governance docs updated (ENGINEO_AI_INSTRUCTIONS.md, SESSION_STARTER.md, MANUAL_TESTING_TEMPLATE.md, MANUAL_TESTING_WORKFLOW.md, DEPLOYMENT.md, RENDER_DEPLOYMENT.md, CRAWL_PIPELINE.md, auto-pb-1.3-preview-persistence.md, README.md, ISSUE-TO-FIX-PATH-1.md) to reference the authoritative location. |
| 5.1 | 2026-01-07 | **IMPLEMENTATION-PLAN-RECONCILIATION-1 FIXUP-2**: Self-reference consistency — updated internal checklist items that referenced `IMPLEMENTATION_PLAN.md` to reference `docs/IMPLEMENTATION_PLAN.md` (not the deprecated root stub) for self-referential "updated plan" checklist items and version-history task text. |
| 5.2 | 2026-01-07 | **IMPLEMENTATION-PLAN-ORDERING-CLEANUP-1**: Major restructuring — added 4 top-level sections (Completed Phases/In Progress/Planned or Pending/Deferred or Explicitly Excluded), reordered completed phases under subheadings (Foundations/Core Platform/Governance & Roles/Execution Surfaces), added ENTERPRISE-GEO-1 clarifying note, standardized phase header status formatting, moved Document History to bottom. |
| 5.3 | 2026-01-07 | **IMPLEMENTATION-PLAN-ORDERING-CLEANUP-1 FIXUP-1**: Heading-level compliance — demoted all `## Phase` headers to `### Phase` to ensure exactly 4 top-level sections (Completed Phases/In Progress/Planned or Pending/Deferred or Explicitly Excluded). |
