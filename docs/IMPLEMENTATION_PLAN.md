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
- apps/web/src/app/(marketing)/pricing/
- apps/web/src/app/settings/billing/

### Test Coverage

- **Smoke Test:** `apps/web/tests/billing-gtm-1.smoke.spec.ts`
- **Manual Testing:** `docs/manual-testing/BILLING-GTM-1.md`

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
- apps/web/src/app/projects/[id]/automation/playbooks/

### Related Documents

- **Canonical Manual Testing:** `docs/manual-testing/phase-automation-1-playbooks.md`
- Secondary references:
  - `docs/manual-testing/auto-pb-1-1-playbooks-hardening.md`
  - `docs/manual-testing/auto-pb-1-2-playbooks-ux-coherence.md`
  - `docs/manual-testing/auto-pb-1-3-scope-binding.md`
  - `docs/manual-testing/auto-pb-1-3-ux-1-resume-and-gating.md`

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

### Test Coverage

- **Smoke Test:** `apps/web/tests/insights-1.smoke.spec.ts`
- **Manual Testing:** `docs/manual-testing/INSIGHTS-1.md`

---

### Phase MEDIA-1: Media & Accessibility Pillar ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-19

Media accessibility pillar for image alt text and media optimization.

### Key Features

1. **Alt Text Analysis**: Missing/poor alt text detection
2. **Image Optimization**: Size and format recommendations
3. **Accessibility Score**: WCAG compliance indicators

### Test Coverage

- **Smoke Test:** `apps/web/tests/media-1.smoke.spec.ts`
- **Manual Testing:** `docs/manual-testing/MEDIA-1.md`

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

### Test Coverage

- **Smoke Test:** `apps/web/tests/products-list-2-0.smoke.spec.ts`
- **Manual Testing:** `docs/manual-testing/PRODUCTS-LIST-2.0.md`

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

## Completed Phases (Chronological)

### Trust Hardening

### Phase ZERO-AFFECTED-SUPPRESSION-1: Zero-Eligible Action Surface Suppression (Trust Hardening) ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-08

Trust principle: "If the system shows an action, the user must be able to take that action meaningfully."

Core contract (locked): 0 eligible = no action surfaces.
- Work Queue: suppress AUTOMATION_RUN tiles with scopeCount === 0 from actionable tabs; no dead-end CTAs.
- Playbooks: when eligibility is 0, hide Preview/Estimate/Apply stepper + Apply semantics and show a calm empty state.
- Copy: use "No eligible items right now" consistently (avoid "Applies to 0…" / "0 affected").

### Key Features

1. **Work Queue Suppression**: Automation bundles with 0 eligible items suppressed from actionable tabs (except Applied Recently history)
2. **Playbooks Empty State**: Calm empty state replaces stepper when eligibility is 0
3. **Consistent Copy**: "No eligible items right now" across all surfaces
4. **CTA Gating**: No dead-end action CTAs for 0-eligible automation actions

### Core Files

**Backend:**
- apps/api/src/projects/work-queue.service.ts
- apps/api/src/testkit/e2e-testkit.controller.ts

**Frontend:**
- apps/web/src/components/work-queue/ActionBundleCard.tsx
- apps/web/src/app/projects/[id]/automation/playbooks/page.tsx

### Test Coverage
- **Automated Tests:** zero-affected-suppression-1.spec.ts
- **Manual Testing:** ZERO-AFFECTED-SUPPRESSION-1.md

### Critical Paths
- CRITICAL_PATH_MAP.md (CP-008, CP-012)

---

### Phase COUNT-INTEGRITY-1: Count Integrity Trust Hardening ⚠️ SUPERSEDED/PARTIAL

**Status:** Work Queue click-integrity remains valid; Store Health clickthrough semantics superseded by COUNT-INTEGRITY-1.1
**Start Date:** 2026-01-08
**Completed:** 2026-01-08 (partial — see note below)

> **⚠️ SUPERSEDED:** Store Health tile clickthrough semantics are superseded by COUNT-INTEGRITY-1.1 Enterprise Trust Hardening. Store Health Discoverability/Technical Readiness tiles now route to **Issues Engine** (not Work Queue) with pillar-scoped "Items affected" counts. Work Queue → Issues click-integrity remains valid.

### Overview

Establishes count integrity as a core trust contract across the product by:
1. Defining "detected" vs "actionable" as server-derived, role-aware semantics
2. Implementing `IssueCountsSummary` as single source of truth for all badge/tab counts
3. Enforcing click integrity: Work Queue card counts match Issues page filtered list rows
4. Preventing UI recomputation drift through canonical backend aggregation

### Core Contracts

**Detected vs Actionable:**
- **Detected:** Issue exists in the system (always true if returned in issues array)
- **Actionable:** Issue has an in-app fix surface AND user's role allows taking action
  - Must be in `IN_APP_ACTIONABLE_ISSUE_KEYS` OR have `fixReady && fixType`
  - Must NOT be `actionability: 'informational'`
  - User must have at least one of: `canGenerateDrafts`, `canRequestApproval`, `canApply`

**Asset Type Distribution:**
- Every issue MUST include `assetTypeCounts: { products, pages, collections }`
- Sum must equal `issue.count` for integrity (no truncation via preview arrays)
- URL classification: `/collections/*` → collections, else pages (product URLs treated as pages to avoid double-counting)

**UI Semantics:**
- Pillar/severity badges show actionable count by default with detected as secondary
- "Informational" issues (technical view-only) are detected but not clickable
- Work Queue → Issues routing preserves `actionKey + scopeType + mode` for click integrity

### ✅ Completed (Core Infrastructure)

1. **Type Definitions:**
   - Added `IssueAssetTypeKey`, `IssueAssetTypeCounts`, `IssueCountsSummary` to shared & web types
   - Added `assetTypeCounts` and `isActionableNow` fields to `DeoIssue`

2. **Backend Service:**
   - Implemented `getIssueCountsSummaryForProject()` - server-side counts aggregation
   - Added `getAssetTypeFromUrl()` helper for URL classification
   - Added `IN_APP_ACTIONABLE_ISSUE_KEYS` set defining fix surfaces
   - Implemented issue decoration in `computeIssuesForProject()`:
     - Sets `isActionableNow` based on fix surface + role capabilities + not informational
     - Capability check requires: canGenerateDrafts OR canRequestApproval OR canApply
     - Provides sum-preserving `assetTypeCounts` fallback when not explicitly set (PATCH 1.1)
   - Updated ALL issue builders with `assetTypeCounts`:
     - `buildMissingMetadataIssue` ✅
     - `buildThinContentIssue` ✅
     - `buildLowEntityCoverageIssue` ✅
     - `buildMissingLongDescriptionIssue` ✅ (also changed to `fixType: 'aiFix'`)
     - `buildIndexabilityIssue` ✅ (actionability: 'informational')
     - `buildIndexabilityConflictIssue` ✅ (actionability: 'informational')
     - `buildCrawlHealthIssue` ✅ (actionability: 'informational')
     - `buildRenderBlockingResourcesIssue` ✅ (actionability: 'informational')
     - `buildSlowInitialResponseIssue` ✅ (actionability: 'informational')
     - `buildExcessivePageWeightIssue` ✅ (actionability: 'informational')
     - `buildMobileRenderingRiskIssue` ✅ (actionability: 'informational')

3. **API Endpoints:**
   - Added `GET /projects/:id/issues/counts-summary` returning `IssueCountsSummary`
   - Added `GET /projects/:id/deo-issues/read-only` (no side effects, used by dashboard)

4. **Web API Client:**
   - Added `projectsApi.issueCountsSummary(id)` method
   - Added `projectsApi.deoIssuesReadOnly(id)` method

5. **Pillar Updates:**
   - Media & Accessibility pillar now ACTIVE (`comingSoon: false`)
   - Updated pillar descriptions to emphasize AI/visual search

### ⚠️ Pending Work

**✅ PATCH 1 - Backend Issue Builders & Gating (COMPLETE):**
- ✅ Added `assetTypeCounts` to all 7 technical issue builders (all marked 'informational')
- ✅ Added check for `issue.actionability !== 'informational'` in decoration block
- ✅ Changed capability check to require: canGenerateDrafts OR canRequestApproval OR canApply
- ✅ Implemented sum-preserving `assetTypeCounts` fallback allocation (PATCH 1.1)
- ✅ Fixed `byAssetType` group counting to track issue types per asset type

**✅ PATCH 2 - Read-Only Issues Endpoint (COMPLETE):**
- ✅ Added `GET /projects/:id/deo-issues/read-only` to controller
- ✅ Added `projectsApi.deoIssuesReadOnly(id)` to web client

**✅ PATCH 3 - Work Queue Bundle Types (COMPLETE):**
- ✅ Added `scopeDetectedCount?` field to `WorkQueueActionBundle`
- ✅ Updated field comments for clarity:
  - `scopeCount`: For ASSET_OPTIMIZATION: actionable issue-group count; for other types: affected item count
  - `scopeDetectedCount`: For ASSET_OPTIMIZATION: detected issue-group count (may exceed scopeCount)

**✅ PATCH 4 - Work Queue Derivation (COMPLETE):**
- ✅ Updated `deriveIssueBundlesByScopeType()` to use `assetTypeCounts` for counts
- ✅ Set `scopeCount` = actionable issue-group count, `scopeDetectedCount` = detected issue-group count
- ✅ Stopped using asset set sizes (`productIds.size`, etc.) for counts
- ✅ Switched `scopePreviewList` to issue titles for ASSET_OPTIMIZATION bundles
- ✅ Preview list prefers actionable issue titles; uses detected titles if scopeCount === 0
- ✅ Create bundle when `scopeDetectedCount > 0` (even if no actionable issues)

**✅ PATCH 4.1 - Work Queue Preview Math Hotfix (COMPLETE):**
- ✅ **PATCH 4.1.1:** Fixed PRODUCTS/PAGES/COLLECTIONS preview "+N more" to match actionable vs detected semantics
  - When scopeCount > 0, "+N more" is based on scopeCount (actionable issue-group count)
  - When scopeCount === 0, "+N more" is based on scopeDetectedCount (detected issue-group count)
- ✅ **PATCH 4.1.2:** Fixed STORE_WIDE bundle to use real scopeCount/scopeDetectedCount and issue titles
  - Replaced hardcoded `scopeCount: 1` with actual actionable issue-group count
  - Replaced hardcoded `scopePreviewList: ['Store-wide']` with issue titles
  - Added `scopeDetectedCount` field (was missing)
- ✅ **PATCH 4.1.3:** Fixed `buildScopePreviewList()` to clamp to top 5 displayed items and compute suffix from visible count
  - Always returns max 5 base items (never returns more than 5 preview items)
  - Computes "+N more" from displayed count (not input length)
  - Ensures helper is input-safe for any caller (even if caller passes >5 previews)

**✅ PATCH 6 - Issues Engine UI (COMPLETE):**
- ✅ **PATCH 6.1:** Switched to `projectsApi.deoIssuesReadOnly()` with parallel `issueCountsSummary()` fetch
- ✅ **PATCH 6.2:** Added `IssueCountsSummary` state and used for severity badge counts (single source of truth)
- ✅ **PATCH 6.3:** Added URL query param parsing: `mode`, `actionKey`, `scopeType`
- ✅ **PATCH 6.4:** Implemented filtering pipeline: mode → actionKey → scopeType → UI filters
- ✅ **PATCH 6.5:** Added mode toggle UI (Actionable/Detected buttons)
- ✅ **PATCH 6.6:** Added click-integrity filter context banner when navigating from Work Queue
- ✅ **PATCH 6.7:** Updated actionability logic to use `issue.isActionableNow` (server-computed, role-aware)
- ✅ **PATCH 6.8:** Added test hooks (`data-testid` attributes) for Playwright tests
- ✅ **PATCH 6.9:** Fixed TypeScript type error in actionKey filtering logic

**✅ PATCH 6 FIXUP - Issues Engine UI Corrections (COMPLETE):**
- ✅ **FIXUP 1:** Fixed default mode logic - introduced `effectiveMode` that defaults to 'actionable'
- ✅ **FIXUP 2:** Enforced clickability semantics - `isClickableIssue = (isActionableNow && fixHref != null)`
- ✅ **FIXUP 3:** Gated fix CTAs on isActionableNow - early returns in `getFixAction()`
- ✅ **FIXUP 4:** Used countsSummary for pillar badge counts - replaced client-side filtering
- ✅ **FIXUP 5:** Prevented pillar param from auto-applying when click-integrity filters present
- ✅ **FIXUP 6:** Updated clear-filters banner to also delete pillar param

**✅ PATCH 5 - Work Queue Card UI & Routing (COMPLETE):**
- ✅ **PATCH 5.1:** Updated scope line for ASSET_OPTIMIZATION bundles:
  - Shows "N actionable issues affecting <scope>" when scopeCount > 0
  - Shows detected count in parentheses when detected != actionable
  - Shows "Informational — no action required · N detected issues affecting <scope>" when scopeCount === 0
  - Preview list shows issue titles (from PATCH 4)
- ✅ **PATCH 5.2:** All ASSET_OPTIMIZATION bundles route to Issues page with click-integrity filters:
  - Always includes `actionKey` and `scopeType` query params
  - Sets `mode=actionable` when scopeCount > 0, else `mode=detected`
  - Includes pillar fallback for stable behavior
  - Routes PRODUCTS, PAGES, COLLECTIONS, and STORE_WIDE all to Issues page (not asset lists)

**✅ PATCH 7 - Store Health & Work Queue Updates (COMPLETE):**
- ✅ **Store Health:** Added `issueCountsSummary()` fetch for click-integrity counts
- ✅ **Store Health:** Updated Discoverability and Technical Readiness summaries to use "issues" language
- ✅ **Work Queue:** Added `allBundlesAreAssetOptimization` logic for banner terminology
- ✅ **Work Queue:** Filter banner shows "N issues" for ASSET_OPTIMIZATION, "N items" for others

**✅ PATCH 9 - Playwright Tests (COMPLETE):**
- ✅ Created `apps/web/tests/count-integrity-1.spec.ts` with 3 smoke tests:
  - **Test 1:** Work Queue → Issues click integrity (OWNER seed) - card count matches filtered list
  - **Test 2:** Technical issues are informational (OWNER seed) - badge visible, not clickable
  - **Test 3:** Viewer role sees detected-only (VIEWER seed) - no actionable issues or CTAs

**✅ PATCH 10 - Documentation (COMPLETE):**
- ✅ **PATCH 10.1:** Checked `IMPLEMENTATION_PLAN.md` CRITICAL_PATH_MAP references (already correct, no changes needed)
- ✅ **PATCH 10.2:** Created `docs/manual-testing/COUNT-INTEGRITY-1.md` manual testing guide with 19 scenarios
- ✅ **PATCH 10.3:** Updated `docs/testing/CRITICAL_PATH_MAP.md` with COUNT-INTEGRITY-1 references in CP-008 and CP-009
- ✅ **PATCH 10.4:** Updated status tracking to reflect PATCH 10 completion

### Core Files Modified

**Backend:**
- `apps/api/src/projects/deo-issues.service.ts` - Core aggregation and decoration logic
- `apps/api/src/projects/projects.controller.ts` - New counts endpoint
- `apps/api/src/projects/work-queue.service.ts` - Bundle derivation ✅
- `packages/shared/src/deo-issues.ts` - Type definitions
- `packages/shared/src/deo-pillars.ts` - Media pillar activation

**Frontend:**
- `apps/web/src/lib/deo-issues.ts` - Type definitions
- `apps/web/src/lib/api.ts` - API client methods
- `apps/web/src/app/projects/[id]/issues/page.tsx` - Issues Engine UI (pending)
- `apps/web/src/components/work-queue/ActionBundleCard.tsx` - Card UI & routing ✅
- `apps/web/src/app/projects/[id]/work-queue/page.tsx` - Filter banner (pending)
- `apps/web/src/app/projects/[id]/store-health/page.tsx` - Summaries (pending)

### Testing Requirements

**Manual Testing Scenarios:**
1. Store Health count → Work Queue filtered total matches
2. Work Queue bundle count → Issues filtered list row count matches
3. Pillar/severity badge → rendered list count matches
4. Technical pillar shows "Informational" with no click action
5. VIEWER role: detected count visible, actionable = 0, no dead-click risk

**Automated Coverage:**
- Playwright E2E: Click integrity chain (Store Health → Work Queue → Issues)
- Role matrix: VIEWER/EDITOR/OWNER actionability rendering
- Filter context preservation across navigation

### Related Documents

- **Status Tracking:** `COUNT-INTEGRITY-1-STATUS.md` (detailed implementation checklist)
- **Manual Testing:** `docs/manual-testing/COUNT-INTEGRITY-1.md` ✅ (created)
- **Critical Path:** `docs/testing/CRITICAL_PATH_MAP.md` ✅ (updated)

---

### Phase COUNT-INTEGRITY-1.1: Canonical Triplet Counts + Explicit Labels ✅ COMPLETE

**Status:** Complete (Backend + UI Migration + UI Smoke Test + Enterprise Trust Hardening)
**Date Started:** 2026-01-08
**Completed:** 2026-01-09

#### Overview

COUNT-INTEGRITY-1.1 establishes canonical triplet count semantics (issueTypesCount, affectedItemsCount, actionableNowCount) with explicit UX labels to replace mixed v1 "groups/instances" semantics. All components verified: backend deduplication (products via CANON-009, collections via CANON-010), UI migration (Gap 6), cross-surface UI smoke tests (Gap 7), and enterprise trust hardening (Fix-Up batch).

**⚠️ Note:** COUNT-INTEGRITY-1 is superseded/partial with respect to Store Health clickthrough semantics. Store Health Discoverability/Technical Readiness tiles now route to **Issues Engine** (not Work Queue) with pillar-scoped "Items affected" counts.

#### Locked Semantics (Enterprise Trust Hardening)

- **Store Health tiles (Discoverability/Technical):** Display pillar-scoped "Items affected" (canonical) and route to Issues Engine filtered to that pillar (mode=detected).
- **Work Queue:** Represents "action bundles"; counts represent "actionable now" (bundle scope) and must not be conflated with "items affected".
- **Zero-actionable suppression:** All bundle types (except APPLIED history and GEO_EXPORT) suppress CTAs when scopeCount === 0 and show "No items currently eligible for action."
- **Product Issues tab:** Triplet always visible when summary provided; neutral message appears when actionableNowCount === 0.

#### Completed Patches

- ✅ **PATCH 0:** Endpoint naming fixed (`/summary` primary, `/canonical-summary` alias)
- ✅ **PATCH 1-3:** Canonical triplet types + backend endpoints + web client (initial delivery)
- ✅ **PATCH 2.1:** Media issues count bug fixed (true counts, not capped sample length)
- ✅ **PATCH 2.2:** Shared issue→actionKey mapper created in packages/shared
- ✅ **PATCH 2.3:** Work Queue refactored to use shared mapper
- ✅ **PATCH 2.4:** Real actionKey filtering implemented in canonical summary
- ✅ **PATCH 2.5-FIXUP-1:** Asset-specific endpoint bugs fixed (ID→URL, project-scoped, deterministic empty)
- ✅ **PATCH 2.6-FIXUP-1:** Deterministic Playwright backend API tests (accessToken corrected)
- ✅ **PATCH 2.7-FIXUP-1:** Documentation truthfulness updated
- ✅ **PATCH 3.1:** Non-enumerable `__fullAffectedAssetKeys` field infrastructure
- ✅ **PATCH 3.2:** Product-based builders populate full keys (Gap 3a)
- ✅ **PATCH 3.3:** Canonical summary uses full keys for accurate deduplication
- ✅ **PATCH 3.4:** Asset endpoint uses full keys for membership checks
- ✅ **PATCH 3.5:** Media issues carry full keys
- ✅ **PATCH 3.6:** CANON-009 regression test (30 products, verifies >20 accuracy)
- ✅ **PATCH 3.7:** Documentation updates (Gap 3a resolved; Gap 3b identified)
- ✅ **PATCH 4.1:** Technical issue builders populate full keys (Gap 3b)
- ✅ **PATCH 4.2-FIXUP-1:** Collections seed endpoint returns collectionIds for asset endpoint
- ✅ **PATCH 4.3-FIXUP-1:** CANON-010 uses crawlResult IDs with correct endpoint
- ✅ **PATCH 4.3-FIXUP-2:** CANON-010 scoped to collections-only (scopeType=collections filter)
- ✅ **PATCH 4.4-FIXUP-1:** Documentation consistency sweep (Gap 3b marked resolved)
- ✅ **PATCH 5:** Issues Engine filter-aligned canonical summary + labeled triplet display
- ✅ **PATCH 6:** Product detail Issues tab uses assetIssues endpoint + labeled triplet
- ✅ **PATCH 7:** Store Health tiles show Items affected from canonical summary
- ✅ **PATCH 8:** Work Queue trust fixes + canonical "Actionable now" display + AI badge copy
- ✅ **PATCH 9:** Gap 7 cross-surface Playwright UI smoke test
- ✅ **PATCH 10:** Documentation updates (CRITICAL_PATH_MAP.md, COUNT-INTEGRITY-1.1.md)
- ✅ **UI HARDEN:** Multi-action filtering (actionKeys), pillar-aware triplet, auth pattern fix
- ✅ **AUDIT FIX:** Severity-aligned canonical summary, pillar-aware hasActionableIssues/hasDetectedIssues checks

#### Enterprise Trust Hardening Fix-Up (2026-01-09)

- ✅ **FIX-UP PATCH 1:** Store Health pillar-scoped affectedItemsCount + Issues Engine routing
- ✅ **FIX-UP PATCH 2:** Work Queue strict zero-actionable suppression across bundle types
- ✅ **FIX-UP PATCH 3:** Product Issues tab triplet always visible + neutral message reachable
- ✅ **FIX-UP PATCH 4:** Single Playwright UI smoke test replacing prior multi-test suite
- ✅ **FIX-UP PATCH 5:** COUNT-INTEGRITY-1 test expectations updated for new Work Queue copy
- ✅ **FIX-UP PATCH 6:** Trust-routing test updated (Content Quality card, not Discoverability)
- ✅ **FIX-UP PATCH 7:** Documentation updates (this section)

#### All Gaps Resolved

- ✅ **Gap 3a:** Product-based issues populate full keys (verified by CANON-009)
- ✅ **Gap 3b:** Pages/collections issues populate full keys (verified by CANON-010)
- ✅ **Gap 6:** UI migration complete (Issues Engine, Store Health, Work Queue, Product Detail)
- ✅ **Gap 7:** Cross-surface UI smoke test implemented
- ✅ **Gap 8:** Enterprise trust hardening (Store Health click-integrity, zero-actionable suppression)

#### Manual Testing

- `docs/manual-testing/COUNT-INTEGRITY-1.1.md` (all steps verified + enterprise trust hardening scenarios)

#### Automated Tests

- `apps/web/tests/count-integrity-1-1.spec.ts` (10 backend API tests including CANON-009 + CANON-010)
- `apps/web/tests/count-integrity-1-1.ui.spec.ts` (1 cross-surface end-to-end click-integrity test)

---

## In Progress

*None at this time.*

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
| 5.4 | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1**: Added smoke tests for INSIGHTS-1, PRODUCTS-LIST-2.0, BILLING-GTM-1, MEDIA-1; added test coverage sections to phase entries; added AUTO-PB-1 canonical doc reference. |
| 5.5 | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-1**: Smoke tests tightened to "one test per phase"; Billing smoke route corrected to `/settings/billing`; Media smoke corrected to `/projects/{projectId}/media`; AUTO-PB-1 canonical manual testing doc link corrected to `phase-automation-1-playbooks.md`. |
| 5.6 | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-2**: MEDIA-1 smoke test tightened to avoid false positives by keying "scorecard present" to the "Media Accessibility Score" section heading (not generic text like "Accessibility"). |
| 5.7 | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-3**: BILLING-GTM-1 core file paths corrected to real locations (`(marketing)/pricing/`, `settings/billing/`); AUTO-PB-1 core file path corrected to `/automation/playbooks/`; added missing manual testing links for BILLING-GTM-1, PRODUCTS-LIST-2.0, MEDIA-1. Documentation-only; no product/test behavior changes. |
| 5.8 | 2026-01-08 | **ZERO-AFFECTED-SUPPRESSION-1 COMPLETE**: Zero-eligible action surface suppression (trust hardening). Work Queue suppresses AUTOMATION_RUN tiles with scopeCount === 0 from actionable tabs (except Applied Recently history). Playbooks shows calm empty state when eligibility is 0 (hides stepper + Apply CTAs). Consistent copy: "No eligible items right now". Added zero-affected-suppression-1.spec.ts E2E tests and ZERO-AFFECTED-SUPPRESSION-1.md manual testing doc. Updated CP-008 and CP-012. |
| 6.1 | 2026-01-09 | **COUNT-INTEGRITY-1.1 UI HARDEN**: Multi-action filtering via actionKeys URL param (OR across keys), pillar-aware triplet display (currentTriplet from byPillar when filtered), fixed UI smoke test auth pattern (localStorage only, no cookie), fixed product selection shape (response is { products: [...] } not array). |
| 6.2 | 2026-01-09 | **COUNT-INTEGRITY-1.1 AUDIT FIX**: Moved COUNT-INTEGRITY-1.1 from "In Progress" section to Trust Hardening completed phases (follows COUNT-INTEGRITY-1). PATCH 1: Severity-aligned canonical summary (passes severity filter to API when not 'all', refreshes on severity change). PATCH 2: Pillar-aware hasActionableIssues/hasDetectedIssues checks (uses byPillar triplets when pillarFilter !== 'all'). Structure now correct: "In Progress" contains only "*None at this time.*" with no phases listed beneath it. |
| 6.3 | 2026-01-09 | **COUNT-INTEGRITY-1.1 VERIFICATION COMPLETE (NO-OP)**: Verified all audit fix items implemented: (1) page.tsx passes severity to canonicalIssueCountsSummary when severityFilter !== 'all', fetchIssues re-runs on severityFilter changes, hasActionableIssues/hasDetectedIssues are pillar-aware with byPillar + issues-list fallbacks; (2) IMPLEMENTATION_PLAN.md structure correct with COUNT-INTEGRITY-1.1 under Trust Hardening completed phases, "In Progress" contains only "*None at this time.*", Document History includes 6.2 audit-fix entry. No additional patches required. |
| 6.4 | 2026-01-09 | **COUNT-INTEGRITY-1.1 ENTERPRISE TRUST HARDENING FIX-UP**: Store Health pillar-scoped affectedItemsCount + Issues Engine routing (not Work Queue), Work Queue strict zero-actionable suppression across ALL bundle types, Product Issues tab triplet always visible + neutral message reachable, single Playwright UI smoke test replacing prior multi-test suite. Locked semantics: Store Health Discoverability/Technical tiles display pillar-scoped "Items affected" and route to Issues Engine (mode=detected); Work Queue is "actionable now" scoped; zero-actionable shows "No items currently eligible for action." with no CTAs. |
| 6.5 | 2026-01-09 | **COUNT-INTEGRITY-1.1 POST-AUDIT COMPLIANCE**: (1) Merged 2 UI tests into exactly 1 end-to-end Playwright test per "single smoke test" requirement; (2) Marked COUNT-INTEGRITY-1 as ⚠️ SUPERSEDED/PARTIAL (Store Health clickthrough semantics superseded; Work Queue click-integrity remains valid); (3) Updated UI test count from "2 tests" to "1 test" in documentation. |
