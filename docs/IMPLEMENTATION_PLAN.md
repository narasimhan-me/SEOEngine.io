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

### Phase ROUTE-INTEGRITY-1: Deterministic Deep Links + Scope Banner ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

Trust hardening for deterministic deep link routing with visible navigation context.

### Key Features

1. **URL is Source of Truth**: All navigation context derived from URL params (from + returnTo)
2. **Shared Route Context**: `route-context.ts` provides `withRouteContext()`, `getSafeReturnTo()`, `getReturnToFromCurrentUrl()`, `labelFrom()`
3. **ScopeBanner Component**: Visible navigation context on destination surfaces with Back + Clear filters actions
4. **Consistent Origin Enum**: Extended `FromContext` with `asset_list`, `issues_engine`, `playbook`

### Locked Routing Contract

- **from**: Origin context for back navigation (e.g., `store_health`, `work_queue`, `asset_list`)
- **returnTo**: URL-encoded path to return to (includes filtered state like `?q=...`)
- **Clear filters**: Always resets to base route without query params

### ScopeBanner Surfaces

- Issues Engine page
- Playbooks page
- Products list page
- Pages list page
- Collections list page
- Product detail page

### Test Coverage

- **E2E Tests:** `apps/web/tests/route-integrity-1.spec.ts`
- **Manual Testing:** `docs/manual-testing/ROUTE-INTEGRITY-1.md`

### Critical Paths

- Store Health → Issues Engine → Back (filter context preserved)
- Products list (with filter) → Fix next → Back (original filter restored)
- Work Queue → Playbooks → Back + Clear filters

### FIXUP-1 (2026-01-10)

1. **ScopeBanner Placement**: Moved ScopeBanner after page header on Playbooks and Issues Engine pages for consistent visual hierarchy
2. **Strict E2E Tests**: Removed conditional guards, use correct test IDs (`store-health-card-discoverability`), tests now fail if elements aren't found
3. **Dynamic Back Label**: Issues Engine back link now uses `labelFrom()` for dynamic context-aware label (no longer hardcoded "Back to Store Health")

### FIXUP-2 (2026-01-10)

1. **Issues Engine ScopeBanner "On Arrival"**: Moved ScopeBanner to immediately after h1 header row (before TripletDisplay/counts), removed misleading always-visible back link that claimed "Back to..." even without navigation context
2. **Products Page "Back" Copy Fix**: Changed "← Back to Store Health" to neutral "← Store Health" (not claiming back navigation when it isn't)
3. **Work Queue → Playbooks Test Seed**: Replaced `seedFirstDeoWin` with `seedListSearchFilter1` in Work Queue → Playbooks tests to guarantee Playbooks CTAs exist; tightened locator to target `?playbookId=` param
4. **Removed Unused Import**: Removed `labelFrom` import from issues page (no longer needed after back link removal)

---

### Phase SCOPE-CLARITY-1: Explicit Scope Chips + Normalization ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

SCOPE-CLARITY-1 enhances ScopeBanner to show explicit scope chips instead of plain text descriptions, and introduces canonical scope normalization rules to prevent hidden filter stacking. URL is the single source of truth for all scope params.

#### Canonical Scope Keys (LOCKED)

- `pillar` - DEO pillar ID
- `assetType` - Asset type: 'products' | 'pages' | 'collections'
- `assetId` - Specific asset identifier
- `issueType` - Issue type key
- `mode` - View mode: 'actionable' | 'detected'

#### Priority Rules (LOCKED)

1. **Asset scope** (assetType + assetId both present) → Keep only asset; drop issueType, pillar, mode
2. **Issue type scope** (issueType present) → Keep issueType (+ mode if present); drop pillar
3. **Pillar scope** (pillar present) → Keep pillar (+ mode if present)
4. **Mode alone** → Keep mode

#### Key Features

1. **Scope Normalization**: `normalizeScopeParams()` in `scope-normalization.ts` - canonical normalization with priority rules
2. **Scope Chips**: Ordered `ScopeChip[]` with type + label for explicit display
3. **wasAdjusted Flag**: Shows note when conflicting params were dropped
4. **Test Hooks**: `data-testid="scope-chips"`, `data-testid="scope-chip"` + `data-scope-chip-type="{type}"`, `data-testid="scope-banner-adjusted-note"`

#### Core Files

- `apps/web/src/lib/scope-normalization.ts` (normalization utilities)
- `apps/web/src/components/common/ScopeBanner.tsx` (chip rendering)
- `apps/web/src/lib/route-context.ts` (updated documentation)

#### Surfaces Updated

- Issues Engine page
- Playbooks page
- Product Detail page
- Products List page
- Pages List page
- Collections List page

#### Test Coverage

- **E2E Tests:** `apps/web/tests/scope-clarity-1.spec.ts`
- **Manual Testing:** `docs/manual-testing/SCOPE-CLARITY-1.md`

#### FIXUP-1 (2026-01-10)

Issues Engine pillar filter state is now driven by normalized scope (prevents hidden stacking when issueType overrides pillar):

1. **Normalized Pillar State**: `pillarFilter` initial state and sync effect use `normalizedScopeResult.normalized.pillar` instead of raw `pillarParam`. When issueType takes priority, pillar is `undefined` and filter stays on "All".
2. **User Selection Clears Conflicts**: When user explicitly picks a pillar via `handlePillarFilterChange()`, conflicting higher-priority scope params (`issueType`, `assetType`, `assetId`) are deleted from URL so the selected pillar becomes unambiguous.
3. **Test Coverage**: Playwright test asserts that "All pillars" filter button is visible when issueType overrides pillar.

#### FIXUP-2 (2026-01-10)

Strict, non-brittle test hooks for pillar filter buttons:

1. **Pillar Filter Test Hooks**: Added `data-testid="pillar-filter-all"` and `aria-pressed` to "All pillars" button. Added `data-testid="pillar-filter-${pillar.id}"` (e.g., `pillar-filter-metadata_snippet_quality`) and `aria-pressed` to each pillar button in the DEO_PILLARS loop.
2. **Playwright Strict Assertions**: Replaced brittle `button:has-text("All")` locator with `[data-testid="pillar-filter-all"]`. Test now asserts `aria-pressed="true"` for All button and `aria-pressed="false"` for Metadata pillar button when issueType overrides pillar.

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
- `apps/web/src/app/projects/[id]/issues/page.tsx` - Issues Engine UI (superseded by COUNT-INTEGRITY-1.1)
- `apps/web/src/components/work-queue/ActionBundleCard.tsx` - Card UI & routing ✅
- `apps/web/src/app/projects/[id]/work-queue/page.tsx` - Filter banner ✅
- `apps/web/src/app/projects/[id]/store-health/page.tsx` - Summaries (superseded by COUNT-INTEGRITY-1.1)

### Testing Requirements

**Manual Testing Scenarios (Work Queue click-integrity remains valid):**
1. Work Queue bundle count → Issues filtered list row count matches
2. Pillar/severity badge → rendered list count matches
3. Technical pillar shows "Informational" with no click action
4. VIEWER role: detected count visible, actionable = 0, no dead-click risk

> **Note:** Store Health Discoverability/Technical click-integrity is now governed by COUNT-INTEGRITY-1.1 (Issues Engine destination, not Work Queue).

**Automated Coverage:**
- Playwright E2E: Work Queue → Issues click integrity chain (still valid)
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

#### FIXUP-2: Trust Correctness (2026-01-09)

- ✅ **FIXUP-2 PATCH 1:** Store Health Discoverability/Technical tiles always display numeric pillar-scoped "items affected" (0 fallback; never "Counts unavailable", never store-wide totals)
- ✅ **FIXUP-2 PATCH 2:** Playwright smoke test is STRICT: requires "items affected" parsing, requires asset-detail navigation (no optional branches), removed Work Queue step
- ✅ **FIXUP-2 PATCH 3:** Documentation updates (this section)

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
- `apps/web/tests/count-integrity-1-1.ui.spec.ts` (1 STRICT end-to-end test: Store Health → Issues Engine → Asset Detail)

---

### Phase LIST-SEARCH-FILTER-1: Products List Search & Filtering ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-09

#### Overview

LIST-SEARCH-FILTER-1 adds server-authoritative search and filtering to the Products list page with a reusable ListControls component pattern for future list pages. URL-derived state only (no hidden memory).

#### Scope

- Products list page only (reusable pattern for future Work Queue, Issues, etc.)
- Server-side filtering (q, status, hasDraft params)
- URL-derived state with deterministic router.replace updates

#### Explicit Non-Goals

- Advanced filter builders
- Saved filters
- Pagination (future phase)
- Other list pages (Work Queue, Issues — pattern ready for future extension)

#### Key Features

1. **Search**: Case-insensitive search across product title and handle
2. **Status Filter**: `optimized` (complete SEO metadata in range) vs `needs_attention` (incomplete/suboptimal)
3. **Has Draft Filter**: Products appearing in non-applied AutomationPlaybookDrafts (status READY/PARTIAL, not expired)
4. **URL Persistence**: Filter state serialized to query params, restored on reload
5. **Empty States**: Filtered empty state with "Clear filters" affordance, unfiltered "No products" preserved

#### Completed Patches

- ✅ **PATCH 1:** Added `handle` field to Product model + Prisma migration + Shopify sync persists handle
- ✅ **PATCH 2:** Extended products controller/service with filtering (q, status, hasDraft) + server-side filtering logic
- ✅ **PATCH 3:** Extended web API client `productsApi.list()` with optional filter params
- ✅ **PATCH 4:** Created reusable `ListControls` component (config-driven, URL-derived, stable test selectors)
- ✅ **PATCH 5:** Wired ListControls to Products page + empty state handling
- ✅ **PATCH 6:** Added E2E seed endpoint `/testkit/e2e/seed-list-search-filter-1`
- ✅ **PATCH 7:** Playwright smoke tests (list-search-filter-1.spec.ts)
- ✅ **PATCH 8:** Documentation (this section + manual testing doc)

#### Core Files

- `apps/api/prisma/schema.prisma` (Product.handle field)
- `apps/api/prisma/migrations/20260109_add_product_handle/`
- `apps/api/src/products/products.controller.ts`
- `apps/api/src/products/products.service.ts`
- `apps/api/src/shopify/shopify.service.ts` (handle persistence in syncProducts)
- `apps/web/src/lib/api.ts` (productsApi.list with filters)
- `apps/web/src/components/common/ListControls.tsx`
- `apps/web/src/app/projects/[id]/products/page.tsx`
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed endpoint)

#### Test Selectors

- `data-testid="list-controls-search"` — Search input
- `data-testid="list-controls-status"` — Status filter dropdown
- `data-testid="list-controls-has-draft"` — Has draft filter dropdown
- `data-testid="list-controls-clear"` — Clear filters button

#### Manual Testing

- `docs/manual-testing/LIST-SEARCH-FILTER-1.md`

#### Automated Tests

- `apps/web/tests/list-search-filter-1.spec.ts` (Playwright E2E tests)

---

### Phase LIST-SEARCH-FILTER-1.1: Pages & Collections List Search & Filtering ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-09

#### Overview

LIST-SEARCH-FILTER-1.1 extends the ListControls pattern from LIST-SEARCH-FILTER-1 to the Pages and Collections asset list pages. Server-authoritative filtering with URL-derived state.

#### Scope

- Pages list page (/projects/:id/assets/pages)
- Collections list page (/projects/:id/assets/collections)
- Server-side filtering (q, status, hasDraft, pageType params)
- Reuses existing ListControls component

#### Explicit Non-Goals

- New UI components (reuses ListControls)
- Work Queue or Issues list (future phases)
- Pagination

#### Key Features

1. **Search**: Case-insensitive search across page path/title or collection handle/title
2. **Status Filter**: `optimized` (complete SEO metadata in range) vs `needs_attention` (incomplete/suboptimal)
3. **Has Draft Filter**: Pages/collections appearing in non-applied AutomationPlaybookDrafts (PAGES/COLLECTIONS asset types)
4. **Page Type Filter**: Backend supports `static` (pages) or `collection` filtering via pageType param
5. **URL Persistence**: Filter state serialized to query params, restored on reload
6. **Empty States**: Filtered empty state with "Clear filters" affordance

#### Completed Patches

- ✅ **PATCH 1:** Extended web API client `projectsApi.crawlPages()` with optional filter params (q, status, hasDraft, pageType)
- ✅ **PATCH 2:** Extended projects controller/service with filtering on GET /projects/:id/crawl-pages
- ✅ **PATCH 3:** Integrated ListControls into Pages list page with server-side filtering
- ✅ **PATCH 4:** Integrated ListControls into Collections list page with server-side filtering
- ✅ **PATCH 5:** Added E2E seed endpoint `/testkit/e2e/seed-list-search-filter-1-1`
- ✅ **PATCH 6:** Playwright smoke tests (list-search-filter-1-1.spec.ts)
- ✅ **PATCH 7:** Documentation (this section)

#### Core Files

- `apps/web/src/lib/api.ts` (CrawlPageListOptions, crawlPages with filters)
- `apps/api/src/projects/projects.controller.ts` (filter params on getCrawlPages)
- `apps/api/src/projects/projects.service.ts` (CrawlPageListFilters, filtering logic, getCrawlPageIdsWithPendingDrafts)
- `apps/web/src/app/projects/[id]/assets/pages/page.tsx`
- `apps/web/src/app/projects/[id]/assets/collections/page.tsx`
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed endpoint)

#### Test Selectors

- `data-testid="list-controls-search"` — Search input
- `data-testid="list-controls-status"` — Status filter dropdown
- `data-testid="list-controls-has-draft"` — Has draft filter dropdown
- `data-testid="list-controls-clear"` — Clear filters button

#### Manual Testing

- `docs/manual-testing/LIST-SEARCH-FILTER-1.1.md`

#### Automated Tests

- `apps/web/tests/list-search-filter-1-1.spec.ts` (Playwright E2E tests)

---

### Phase LIST-ACTIONS-CLARITY-1: Row Chips & Actions Unification ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-09

#### Overview

LIST-ACTIONS-CLARITY-1 unifies the row chips and actions across Products, Pages, and Collections lists with locked vocabulary and consistent navigation. Introduces shared `RowStatusChip` component and `resolveRowNextAction` resolver as single sources of truth.

#### Scope

- Products list row chips and actions
- Pages list row chips and actions
- Collections list row chips and actions
- Issues Engine asset-filtered mode
- Shared components: RowStatusChip, resolveRowNextAction

#### Locked Vocabulary

**Chip Labels:**
- `✅ Optimized` — Green — No actionable issues, no pending drafts
- `⚠ Needs attention` — Yellow — Has actionable issues, no pending drafts
- `🟡 Draft saved (not applied)` — Blue — Has pending draft (can be applied)
- `⛔ Blocked` — Red — Has pending draft but cannot apply (requires approval)

**Action Labels:**
- `Fix next` — Products only, links to Issues Engine filtered by product
- `View issues` — Pages/Collections, links to Issues Engine filtered by asset
- `Review drafts` — Links to Work Queue
- `Request approval` — Blocked state (can request)
- `View approval status` — Blocked state (cannot request)
- `Open` — Secondary action, links to asset detail

#### Key Features

1. **Shared Resolver**: `resolveRowNextAction()` in `list-actions-clarity.ts` — single source of truth for chip labels and actions
2. **Shared Component**: `RowStatusChip` — consistent styling across all list pages
3. **Server-Derived Draft State**: `hasDraftPendingApply` field returned in list payloads (products, crawl pages)
4. **Asset-Filtered Issues**: Issues Engine accepts `assetType` + `assetId` params for filtering
5. **Context Banner**: Issues Engine shows "Filtered by Asset" banner with clear button

#### Completed Patches

- ✅ **PATCH 1:** Created `list-actions-clarity.ts` (resolver + helpers)
- ✅ **PATCH 2:** Created `RowStatusChip.tsx` (shared chip component)
- ✅ **PATCH 3A:** Products service returns `hasDraftPendingApply` per product
- ✅ **PATCH 3B:** Projects service returns `hasDraftPendingApply` per crawl page
- ✅ **PATCH 4:** ProductTable/ProductRow use resolver + RowStatusChip
- ✅ **PATCH 5:** Pages list uses resolver + RowStatusChip
- ✅ **PATCH 6:** Collections list uses resolver + RowStatusChip
- ✅ **PATCH 7:** Issues Engine asset-filtered mode (assetType/assetId params)
- ✅ **PATCH 8:** E2E seed endpoint + Playwright tests
- ✅ **PATCH 9:** Documentation

#### Core Files

- `apps/web/src/lib/list-actions-clarity.ts` (resolver + helpers)
- `apps/web/src/components/common/RowStatusChip.tsx`
- `apps/api/src/products/products.service.ts` (hasDraftPendingApply)
- `apps/api/src/projects/projects.service.ts` (hasDraftPendingApply)
- `apps/web/src/components/products/ProductTable.tsx`
- `apps/web/src/components/products/ProductRow.tsx`
- `apps/web/src/app/projects/[id]/assets/pages/page.tsx`
- `apps/web/src/app/projects/[id]/assets/collections/page.tsx`
- `apps/web/src/app/projects/[id]/issues/page.tsx`
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed endpoint)

#### Manual Testing

- `docs/manual-testing/LIST-ACTIONS-CLARITY-1.md`

#### Automated Tests

- `apps/web/tests/list-actions-clarity-1.spec.ts` (Playwright E2E tests)

---

### Phase DRAFT-ROUTING-INTEGRITY-1: Review Drafts → Draft Review (NOT Work Queue) ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-ROUTING-INTEGRITY-1 ensures "Review drafts" action routes to Draft Review mode (scoped to asset), NOT Work Queue. Provides deterministic, scoped draft review with Back navigation via ScopeBanner.

**Locked Rule:** "Review drafts NEVER routes to Work Queue."

#### Key Features

1. **Draft Review Mode**: `/automation/playbooks?mode=drafts&assetType=...&assetId=...&from=asset_list&returnTo=...`
2. **Server Endpoint**: `GET /projects/:id/automation-playbooks/drafts` returns pending drafts for specific asset
3. **ScopeBanner**: Visible navigation context with Back link to origin list
4. **Zero-Draft Empty State**: "No drafts available for this item." with View issues + Back CTAs
5. **Test Hooks**: `draft-review-panel`, `draft-review-list`, `draft-review-empty`, `scope-banner-back`

#### Completed Patches

- ✅ **PATCH 1:** Updated `buildReviewDraftsHref()` to route to Draft Review (not Work Queue)
- ✅ **PATCH 2:** Updated ProductTable, Pages list, Collections list to pass assetId
- ✅ **PATCH 3:** Added `GET /projects/:id/automation-playbooks/drafts` endpoint
- ✅ **PATCH 4:** Added `projectsApi.listAutomationPlaybookDraftsForAsset()` web client method
- ✅ **PATCH 5:** Implemented Draft Review mode in Playbooks page with ScopeBanner + empty state
- ✅ **PATCH 6:** Updated Playwright test LAC1-008 for Draft Review routing + back navigation
- ✅ **PATCH 7:** Created `DRAFT-ROUTING-INTEGRITY-1.md` manual testing doc, updated LIST-ACTIONS-CLARITY-1.md

#### Core Files

- `apps/web/src/lib/list-actions-clarity.ts` (buildReviewDraftsHref)
- `apps/web/src/components/products/ProductTable.tsx`
- `apps/web/src/app/projects/[id]/assets/pages/page.tsx`
- `apps/web/src/app/projects/[id]/assets/collections/page.tsx`
- `apps/api/src/projects/projects.controller.ts` (drafts endpoint)
- `apps/api/src/projects/automation-playbooks.service.ts` (listPendingDraftsForAsset)
- `apps/web/src/lib/api.ts` (AssetScopedDraftsResponse types + method)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (Draft Review mode)

#### Test Coverage

- **E2E Tests:** `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-008)
- **Manual Testing:** `docs/manual-testing/DRAFT-ROUTING-INTEGRITY-1.md`

---

### Phase DRAFT-EDIT-INTEGRITY-1: Inline Draft Editing in Draft Review Mode ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-EDIT-INTEGRITY-1 adds explicit Edit affordance to Draft Review mode, allowing users to edit draft content before approval/apply. Server draft is source of truth - no autosave, explicit save required.

**Trust Principle:** "If we present a draft for review, the user must be able to edit it safely before approval/apply."

#### Key Features

1. **Per-Item Edit**: Each draft item has Edit button; only one item editable at a time
2. **Explicit Save**: Save changes / Cancel buttons; no auto-save-on-type
3. **Server Source of Truth**: Edits persist to server; UI re-renders from response
4. **Permission Enforcement**: OWNER/EDITOR can edit; VIEWER cannot
5. **Test Hooks**: `draft-item-${id}-${idx}`, `draft-item-edit-*`, `draft-item-save-*`, `draft-item-cancel-*`, `draft-item-input-*`

#### Completed Patches

- ✅ **PATCH 1:** Added `updateDraftItem()` service method in automation-playbooks.service.ts
- ✅ **PATCH 2:** Added `PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/:itemIndex` endpoint
- ✅ **PATCH 3:** Added `projectsApi.updateDraftItem()` web client method + `UpdateDraftItemResponse` type
- ✅ **PATCH 4:** Implemented inline edit mode in Draft Review UI (playbooks/page.tsx)
- ✅ **PATCH 5:** Added Playwright test LAC1-009 for draft editing + persistence verification
- ✅ **PATCH 6:** Created `DRAFT-EDIT-INTEGRITY-1.md` manual testing doc

#### Core Files

- `apps/api/src/projects/automation-playbooks.service.ts` (updateDraftItem)
- `apps/api/src/projects/projects.controller.ts` (PATCH endpoint)
- `apps/web/src/lib/api.ts` (UpdateDraftItemResponse + updateDraftItem method)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (inline edit mode)

#### Test Coverage

- **E2E Tests:** `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-009)
- **Manual Testing:** `docs/manual-testing/DRAFT-EDIT-INTEGRITY-1.md`

---

### Phase DRAFT-ENTRYPOINT-UNIFICATION-1: Product Detail Drafts Tab ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-ENTRYPOINT-UNIFICATION-1 unifies draft review entrypoints by adding a Drafts tab to Product detail page. Products list "Review drafts" action now routes directly to Product detail Drafts tab (NOT Automation/Playbooks Draft Review), establishing Product detail as the canonical draft review entrypoint for product assets.

#### Locked Statements

- **Product detail is the canonical draft review entrypoint for products**: Products list "Review drafts" routes to `/projects/:id/products/:productId?tab=drafts`, NOT to `/automation/playbooks`.
- **Draft Review stays human-only**: AI is never invoked during Draft Review/Approval/Apply. No Generate/Regenerate buttons in Drafts tab.
- **Products list Review drafts does not route to Automation Draft Review**: The Automation/Playbooks Draft Review mode is preserved for Pages/Collections, but Products use their own Drafts tab.

#### Key Features

1. **Drafts Tab**: New tab in Product detail page showing asset-scoped pending drafts
2. **Inline Edit**: Edit/Save/Cancel per draft item (reuses DRAFT-EDIT-INTEGRITY-1 pattern)
3. **itemIndex Tracking**: Server returns original array index for accurate edit API calls
4. **No AI Affordances**: Drafts tab is intentionally non-AI (no Generate/Regenerate buttons)
5. **Unified Navigation**: `buildProductDraftsTabHref()` helper for consistent routing

#### Completed Patches

- ✅ **PATCH 1:** Updated ProductTable to route "Review drafts" to Product detail Drafts tab
- ✅ **PATCH 2:** Added `buildProductDraftsTabHref()` helper in list-actions-clarity.ts
- ✅ **PATCH 3:** Added 'drafts' tab to ProductDetailsTabs.tsx
- ✅ **PATCH 4:** Implemented Drafts tab UI in Product detail page (fetch + edit + render)
- ✅ **PATCH 5:** Added `itemIndex` to asset-scoped drafts response in automation-playbooks.service.ts
- ✅ **PATCH 6:** Extended `AssetScopedDraftItem` type with `itemIndex` field
- ✅ **PATCH 7:** Updated Playbooks Draft Review to use `item.itemIndex` for API calls
- ✅ **PATCH 8:** Updated Playwright tests LAC1-008/009 for Product detail Drafts tab routing
- ✅ **PATCH 9:** Updated testkit seed to use canonical draft shape (field/rawSuggestion/finalSuggestion)
- ✅ **PATCH 10:** Documentation updates (this section + manual testing doc)

#### Core Files

- `apps/web/src/lib/list-actions-clarity.ts` (buildProductDraftsTabHref)
- `apps/web/src/components/products/ProductTable.tsx` (Review drafts routing)
- `apps/web/src/components/products/optimization/ProductDetailsTabs.tsx` (Drafts tab)
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (Drafts tab implementation)
- `apps/api/src/projects/automation-playbooks.service.ts` (itemIndex in listPendingDraftsForAsset)
- `apps/web/src/lib/api.ts` (AssetScopedDraftItem.itemIndex)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (itemIndex usage)
- `apps/api/src/testkit/e2e-testkit.controller.ts` (canonical draft shape in seed)

#### Test Coverage

- **E2E Tests:** `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-008, LAC1-009)
- **Manual Testing:** `docs/manual-testing/DRAFT-ENTRYPOINT-UNIFICATION-1.md`

#### Routing Contract

- Products "Review drafts": `/projects/:projectId/products/:productId?tab=drafts&from=asset_list&returnTo=...`
- Pages/Collections "Review drafts": `/automation/playbooks?mode=drafts&assetType=...&assetId=...` (unchanged)

---

### Phase DRAFT-REVIEW-ISOLATION-1: Structural Non-AI Boundary ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-REVIEW-ISOLATION-1 extracts the Product Drafts tab into an isolated module with a NON-AI BOUNDARY contract. This structural refactor prevents accidental AI creep into the Draft Review surface, enforcing the locked statement: "Draft Review stays human-only."

**Trust Principle:** "If we promise human-only Draft Review, the code structure must enforce it."

#### Why Isolation Exists

1. **Prevent accidental AI creep**: Developers cannot accidentally import AI modules into Draft Review
2. **Self-documenting contract**: The NON-AI BOUNDARY header makes the constraint explicit
3. **Automated enforcement**: Guard test fails if forbidden imports are added
4. **Code review signal**: Any PR touching `ProductDraftsTab.tsx` triggers immediate scrutiny

#### NON-AI BOUNDARY Contract

The `ProductDraftsTab.tsx` module must:
1. Contain the header: `NON-AI BOUNDARY: Draft Review is human-only. Do not import aiApi or add AI generation actions here.`
2. NOT import any of these forbidden tokens:
   - `aiApi`
   - `ProductAiSuggestionsPanel`
   - `suggestProductMetadata`
   - `generateProductAnswers`
   - `AI_DAILY_LIMIT_REACHED`

#### Completed Patches

- ✅ **PATCH 1:** Extracted `ProductDraftsTab.tsx` with NON-AI BOUNDARY header and verbatim behavior
- ✅ **PATCH 2:** Added `draft-review-isolation-1.spec.ts` guard test for forbidden imports
- ✅ **PATCH 3:** Updated Product detail page to use isolated component (conditionally mounted to match standard tab behavior)
- ✅ **PATCH 4:** Verified existing non-AI UI regression tests (LAC1-008) still pass
- ✅ **PATCH 5:** Documentation updates (this section + manual testing doc)

#### Core Files

- `apps/web/src/components/products/ProductDraftsTab.tsx` (NEW - isolated non-AI module)
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (delegates to ProductDraftsTab)
- `apps/web/tests/draft-review-isolation-1.spec.ts` (NEW - no-AI import guard test)

#### Test Coverage

- **Guard Tests:** `apps/web/tests/draft-review-isolation-1.spec.ts` (DRI1-001, DRI1-002, DRI1-003)
- **UI Tests:** `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-008 - existing non-AI assertions)
- **Manual Testing:** `docs/manual-testing/DRAFT-REVIEW-ISOLATION-1.md`

#### Behavior Changes

None. This is a pure structural refactor with no behavioral changes.

---

### Phase DRAFT-AI-ENTRYPOINT-CLARITY-1: AI Boundary Notes ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-AI-ENTRYPOINT-CLARITY-1 adds explicit AI boundary labeling at all draft workflow surfaces. The boundary notes provide transparency about AI usage at each step, ensuring users always know when AI is or isn't being used.

**Trust Principle:** "If we use AI, we disclose it. If we don't use AI, we clarify that too."

#### Locked Copy (Do Not Modify Without Phase Approval)

| Mode | Text | Icon |
|------|------|------|
| Review | "Review & edit (no AI on this step)" | Person (gray) |
| Generate | "AI used for drafts only · AI is not used at Apply" | Lightbulb (indigo) |

#### Surfaces Covered

1. **Product Drafts Tab** (review mode) - below "Drafts" heading
2. **Playbooks Draft Review** (review mode) - below ScopeBanner
3. **Playbooks Step 1 Generation** (generate mode) - below "Generate preview" button
4. **Work Queue Generation CTA** (generate mode) - below "Generate Drafts" / "Generate Full Drafts" button

#### Core Files

- `apps/web/src/components/common/DraftAiBoundaryNote.tsx` (NEW - shared component)
- `apps/web/src/components/products/ProductDraftsTab.tsx` (added review note)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (added review + generate notes)
- `apps/web/src/components/work-queue/ActionBundleCard.tsx` (added generate note)
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed endpoint)

#### Test Coverage

- **Playwright Tests:** `apps/web/tests/draft-ai-entrypoint-clarity-1.spec.ts` (6 tests: DAEPC1-001 through DAEPC1-006)
- **Existing Tests:** `apps/web/tests/list-actions-clarity-1.spec.ts` (LAC1-008 updated with boundary note assertion)
- **Manual Testing:** `docs/manual-testing/DRAFT-AI-ENTRYPOINT-CLARITY-1.md`

#### Behavior Changes

None. This is a UX clarity addition with no functional behavior changes.

---

### Phase DRAFT-DIFF-CLARITY-1: Current vs Draft Diff UI ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-10

#### Overview

DRAFT-DIFF-CLARITY-1 adds explicit "Current (live)" vs "Draft (staged)" diff display at draft review surfaces. This provides users with clear visibility into what will change when a draft is applied, preventing confusion about the current state vs proposed changes.

**Trust Principle:** "Make the impact of applying a draft immediately obvious at a glance."

#### Key Features

1. **Diff Display**: Side-by-side "Current (live)" and "Draft (staged)" blocks with distinct visual styling
2. **Empty Draft Messaging**:
   - "No draft generated yet" when both rawSuggestion and finalSuggestion are empty
   - "Draft will clear this field when applied" when explicitly cleared (rawSuggestion exists but finalSuggestion empty)
3. **Save Confirmation**: Confirmation dialog when saving an empty draft that would clear a live field
4. **Test Hooks**: `data-testid="draft-diff-current"` and `data-testid="draft-diff-draft"` for E2E automation

#### Locked Copy (Do Not Modify Without Phase Approval)

| Element | Text |
|---------|------|
| Current label | "Current (live)" |
| Draft label | "Draft (staged)" |
| No draft message | "No draft generated yet" |
| Clear warning | "Draft will clear this field when applied" |
| Confirmation dialog | "Saving an empty draft will clear this field when applied.\n\nAre you sure you want to save an empty draft?" |

#### Surfaces Covered

1. **Product Drafts Tab** - Diff display for each draft item with current/draft blocks
2. **Playbooks Draft Review** - Diff display for each canonical draft item

#### Core Files

- `apps/web/src/components/products/ProductDraftsTab.tsx` (added diff UI + empty draft confirmation)
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (passes currentFieldValues)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (added diff UI + current field fetch)
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed-draft-diff-clarity-1 endpoint)

#### Test Coverage

- **Playwright Tests:** `apps/web/tests/draft-diff-clarity-1.spec.ts` (10 tests: DDC1-001 through DDC1-010)
- **Manual Testing:** `docs/manual-testing/DRAFT-DIFF-CLARITY-1.md`

#### Behavior Changes

- Draft review surfaces now show current live values alongside draft values
- Empty draft saves trigger a confirmation dialog when they would clear a live field

---

### Phase DRAFT-FIELD-COVERAGE-1: Draft Review Parity Across Assets ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-11

#### Overview

DRAFT-FIELD-COVERAGE-1 generalizes the Draft Review UI to work consistently across Products, Pages, and Collections asset types. The Draft Diff Clarity (Current vs Draft display) and edit safeguards now apply uniformly to all asset types.

**Trust Principle:** "Draft review works identically regardless of asset type - users get the same experience whether reviewing product, page, or collection drafts."

#### Key Features

1. **AssetDraftsTab Component**: Generalized from ProductDraftsTab to support all asset types with asset-specific field labels
2. **Pages Detail Route**: New `/projects/[id]/assets/pages/[pageId]` route with Overview and Drafts tabs
3. **Collections Detail Route**: New `/projects/[id]/assets/collections/[collectionId]` route with Overview and Drafts tabs
4. **Field Label Mapping**: Asset-type-specific field labels:
   - Products: "SEO Title", "SEO Description"
   - Pages: "Page Title", "Meta Description"
   - Collections: "Collection Title", "Meta Description"
5. **Non-AI Boundary**: AssetDraftsTab maintains the NON-AI BOUNDARY contract (enforced by guard test)

#### Draft Features Now Available for All Asset Types

- Current (live) vs Draft (staged) diff display
- "No draft generated yet" messaging
- "Draft will clear this field when applied" warning
- Save confirmation dialog for destructive clears
- Inline edit with Save/Cancel

#### Core Files

**New Routes:**
- `apps/web/src/app/projects/[id]/assets/pages/[pageId]/page.tsx` (implementation)
- `apps/web/src/app/projects/[id]/assets/collections/[collectionId]/page.tsx` (implementation)
- `apps/web/src/app/projects/[id]/pages/[pageId]/page.tsx` (canonical alias, redirects to /assets/pages/...)
- `apps/web/src/app/projects/[id]/collections/[collectionId]/page.tsx` (canonical alias, redirects to /assets/collections/...)

**Component:**
- `apps/web/src/components/products/AssetDraftsTab.tsx` (generalized from ProductDraftsTab)
- `apps/web/src/components/products/ProductDraftsTab.tsx` (thin wrapper around AssetDraftsTab)

**Updated:**
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (uses AssetDraftsTab)
- `apps/web/tests/draft-review-isolation-1.spec.ts` (targets AssetDraftsTab)
- `apps/api/src/testkit/e2e-testkit.controller.ts` (seed-draft-field-coverage-1)

#### Test Coverage

- **Playwright Tests:** `apps/web/tests/draft-field-coverage-1.spec.ts` (11 tests: DFC1-001 through DFC1-011)
- **Guard Test:** `apps/web/tests/draft-review-isolation-1.spec.ts` (updated to target AssetDraftsTab)
- **Manual Testing:** `docs/manual-testing/DRAFT-FIELD-COVERAGE-1.md`

#### Seed Endpoint

`POST /testkit/e2e/seed-draft-field-coverage-1`

Seeds:
- 3 Products (diff / clear / no-draft scenarios)
- 3 Pages (diff / clear / no-draft scenarios)
- 3 Collections (diff / clear / no-draft scenarios)
- Counts: `{ affectedTotal: 3, draftGenerated: 2, noSuggestionCount: 1 }`

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
| 6.6 | 2026-01-09 | **COUNT-INTEGRITY-1.1 FIXUP-2 (Trust Correctness)**: (1) Store Health Discoverability/Technical tiles always show numeric pillar-scoped "items affected" (0 fallback; never "Counts unavailable"); (2) Playwright smoke test STRICT mode (requires numeric parsing, requires asset-detail navigation, no optional branches); (3) Removed Work Queue step from UI test (Issues Engine is now the click destination from Store Health, not Work Queue). |
| 6.7 | 2026-01-09 | **COUNT-INTEGRITY-1.1 FIXUP-2 DOC CONSISTENCY**: Documentation-only cleanup — removed stale "(pending)" labels from COUNT-INTEGRITY-1 frontend files (marked superseded), updated Testing Requirements to clarify Work Queue → Issues click-integrity remains valid while Store Health click-integrity is governed by COUNT-INTEGRITY-1.1, aligned all UI smoke test chain references to "Store Health → Issues Engine → Asset Detail" (STRICT). |
| 6.8 | 2026-01-09 | **LIST-SEARCH-FILTER-1 COMPLETE**: Products list search & filtering. Added handle field to Product model, server-authoritative filtering (q/status/hasDraft), reusable ListControls component (URL-derived state, config-driven), Products page integration with empty states, E2E seed endpoint, Playwright smoke tests, manual testing doc. Pattern ready for future list pages. |
| 6.9 | 2026-01-09 | **LIST-SEARCH-FILTER-1 FIXUP-1**: Fixed ListControls build (native HTML elements instead of non-existent shadcn/ui), added key={currentQ} for input remount on clear, moved Playwright tests to apps/web/tests/, fixed auth pattern (engineo_token), corrected test path in docs, added root plan pointer. |
| 6.10 | 2026-01-09 | **LIST-SEARCH-FILTER-1.1 COMPLETE**: Extended ListControls pattern to Pages and Collections asset lists. Added filter params to crawlPages API (q/status/hasDraft/pageType), server-side filtering in projects.service.ts (getCrawlPageIdsWithPendingDrafts for PAGES/COLLECTIONS asset types), integrated ListControls into Pages and Collections pages with empty states, E2E seed endpoint, 8 Playwright smoke tests. |
| 6.11 | 2026-01-09 | **LIST-SEARCH-FILTER-1.1 DOC-FIXUP-1**: Added missing manual testing checklist doc (`docs/manual-testing/LIST-SEARCH-FILTER-1.1.md`) and linked it from the phase section. |
| 6.12 | 2026-01-09 | **LIST-ACTIONS-CLARITY-1 COMPLETE**: Unified row chips and actions across Products/Pages/Collections lists. Created shared `RowStatusChip` component and `resolveRowNextAction` resolver as single sources of truth. Added `hasDraftPendingApply` server-derived field to list payloads. Issues Engine supports asset-filtered mode (`assetType`/`assetId` params). Locked vocabulary: chip labels (Optimized/Needs attention/Draft saved/Blocked) and action labels (Fix next/View issues/Review drafts/Request approval/View approval status/Open). E2E seed endpoint, Playwright tests, manual testing doc. |
| 6.13 | 2026-01-09 | **LIST-ACTIONS-CLARITY-1 FIXUP-1 (Compliance + Missing Coverage)**: (1) Products "Fix next" now uses `buildIssueFixHref` for deterministic issue→fix routing (not Issues list); (2) Wired real viewer capabilities (`canApply`/`canRequestApproval`) from `getUserRole()` API; (3) `NavigationContext` for consistent returnTo propagation in helpers; (4) Added `data-testid` attributes to row actions; (5) Pages/Collections use real capabilities (removed hardcoded role); (6) Issues Engine uses `assetIssues()` API for true per-asset filtering; (7) Seed endpoint extended with Collections + EDITOR token + governance policy; (8) Playwright tests cover Collections + Blocked state + routing; (9) Locked chip vocabulary with exact emojis (✅ Optimized, ⚠ Needs attention, 🟡 Draft saved (not applied), ⛔ Blocked). |
| 6.14 | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 FIXUP-2 (Tests + Manual Doc Consistency)**: Tightened Playwright assertions to use row-scoped locators with seeded titles (no ordering assumptions), exact emoji chip label matching, strict Blocked action assertions (NOT Review drafts), click-through navigation to Issues Engine with filter banner verification, "no Apply on list rows" regression test. Fixed manual testing doc: corrected Products "Fix next" routing expectation (routes to Issue→Fix deep link), removed stale "Future - ROLES-3 Integration" Blocked subsection (already implemented), updated per-asset wording for Pages/Collections, removed obsolete non-goal about per-asset crawl results. No production logic changes. |
| 6.15 | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 FIXUP-1 (Bulk Removal + Server-Derived Fields)**: Compliance/safety hardening - removed ALL bulk selection UI from Products/Pages/Collections lists (checkboxes, bulk action CTAs, selection context strip, confirmation modals). Products command bar now links to Playbooks for automation. Added server-derived fields to Products API (`actionableNowCount`, `blockedByApproval`). ProductTable uses server-derived fields with client-side fallback. Extended Playwright tests with bulk removal regressions (LAC1-018 through LAC1-022). Updated manual testing doc with Bulk Removal Verification section. |
| 6.16 | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 CORRECTNESS-1 COMPLETE**: Canonical row fields now enforced server-side for Products + Crawl Pages/Collections. Products API uses `DeoIssuesService.getIssuesForProjectReadOnly()` with `__fullAffectedAssetKeys` for accurate per-product issue counts (`actionableNowCount`, `detectedIssueCount`). Crawl Pages endpoint adds `actionableNowCount`, `detectedIssueCount`, `blockedByApproval` per URL. Resolver updated to consume `blockedByApproval` directly (deprecates `canApply` derivation). UI heuristics removed from Pages/Collections lists - now use server-derived actionability. Playwright API-contract regression tests added (LAC1-023/024/025). ForwardRef pattern applied to ProjectsModule → ProductsModule import for circular dependency safety. Manual testing doc updated with emoji chip labels. |
| 6.17 | 2026-01-10 | **SCOPE-CLARITY-1 COMPLETE**: Explicit scope chips + normalization for ScopeBanner. Created `scope-normalization.ts` with `normalizeScopeParams()` implementing priority rules (asset > issueType > pillar > mode). ScopeBanner now renders ordered ScopeChip[] with type-specific styling and test hooks (`scope-chips`, `scope-chip`, `scope-chip-type`). Shows "adjusted" note when conflicting params are normalized. Updated all 6 ScopeBanner surfaces (Issues Engine, Playbooks, Product Detail, Products List, Pages List, Collections List). Updated `route-context.ts` documentation. E2E tests in `scope-clarity-1.spec.ts`, manual testing doc in `SCOPE-CLARITY-1.md`. |
| 6.18 | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 COMPLETE**: "Review drafts" action now routes to Draft Review mode (`/automation/playbooks?mode=drafts&assetType=...&assetId=...`), NOT Work Queue. Locked rule: "Review drafts NEVER routes to Work Queue." Added server-authoritative endpoint `GET /projects/:id/automation-playbooks/drafts` for asset-scoped pending drafts. Playbooks page implements Draft Review mode with ScopeBanner, draft list, and zero-draft empty state ("No drafts available for this item." with View issues + Back CTAs). Updated `buildReviewDraftsHref()` signature to require assetType + assetId. Updated ProductTable, Pages list, Collections list to pass assetId. Playwright test LAC1-008 updated for Draft Review routing + back navigation. Manual testing doc in `DRAFT-ROUTING-INTEGRITY-1.md`. |
| 6.19 | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 FIXUP-1**: ScopeBanner wiring fixes. (1) Draft Review ScopeBanner now passes `onClearFiltersHref`, `chips` from `normalizedScopeResult`, and `wasAdjusted` props for explicit scope display; (2) Empty state Back CTA uses `data-testid="draft-review-back"` (not duplicate `scope-banner-back`); (3) Removed misleading server comment about pages/collections drafts "not yet supported". Playwright test updated to handle both ScopeBanner and empty state back buttons. |
| 6.20 | 2026-01-10 | **SCOPE-CLARITY-1 FIXUP-1**: Issues Engine pillar filter state now driven by normalized scope (prevents hidden stacking when issueType overrides pillar). `pillarFilter` initial state and sync effect use `normalizedScopeResult.normalized.pillar` instead of raw `pillarParam`. When user explicitly picks a pillar via `handlePillarFilterChange()`, conflicting higher-priority scope params (`issueType`, `assetType`, `assetId`) are deleted from URL. Playwright test updated with "All pillars" button visibility assertion. Manual testing doc updated with pillar filter UI verification step. |
| 6.21 | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 FIXUP-2**: Draft content visibility + test hardening. (1) Draft Review UI now renders both canonical (field/finalSuggestion/rawSuggestion) and legacy/testkit (suggestedTitle/suggestedDescription) draft item shapes; (2) `AssetScopedDraftItem` type loosened to support both shapes + optional crawlResultId for pages/collections; (3) Playwright LAC1-008 hardened to require `draft-review-list` visible and assert seeded suggestion content ("Improved Product Title"); (4) Manual testing doc updated to verify draft list shows non-empty content. |
| 6.22 | 2026-01-10 | **SCOPE-CLARITY-1 FIXUP-2**: Strict pillar filter test hooks. Added `data-testid="pillar-filter-all"` + `aria-pressed` to "All pillars" button, `data-testid="pillar-filter-${pillar.id}"` + `aria-pressed` to each pillar button. Playwright test updated with strict `aria-pressed` assertions (replaces brittle `:has-text()` locator). |
| 6.23 | 2026-01-10 | **DRAFT-EDIT-INTEGRITY-1 COMPLETE**: Inline draft editing in Draft Review mode. Added `updateDraftItem()` service method with permission enforcement (OWNER/EDITOR only), `PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/:itemIndex` endpoint, `projectsApi.updateDraftItem()` client method. Implemented per-item inline edit mode with Save changes / Cancel buttons (no autosave). Server draft is source of truth - edits persist and survive page reload. Playwright test LAC1-009 verifies edit + save + persistence + cancel flow. Manual testing doc in `DRAFT-EDIT-INTEGRITY-1.md`. |
| 6.24 | 2026-01-10 | **DRAFT-ENTRYPOINT-UNIFICATION-1 COMPLETE**: Products list "Review drafts" now routes to Product detail Drafts tab (not Automation/Playbooks). Locked statements: (1) Product detail is the canonical draft review entrypoint for products; (2) Draft Review stays human-only (no AI); (3) Products list Review drafts does not route to Automation Draft Review. Added `buildProductDraftsTabHref()` helper, 'drafts' tab to ProductDetailsTabs, Drafts tab UI with fetch/edit/render, server-side `itemIndex` for accurate edit API calls. Pages/Collections continue using Automation Draft Review (`/automation/playbooks?mode=drafts`). Testkit seed updated to canonical draft shape. Playwright tests LAC1-008/009 updated. Manual testing doc in `DRAFT-ENTRYPOINT-UNIFICATION-1.md`. |
| 6.25 | 2026-01-10 | **DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1**: Non-AI Drafts tab compliance + itemIndex correctness. (1) Drafts tab now suppresses AI/generation copy + apply/automation CTAs when `activeTab === 'drafts'` (header action cluster, CNAB-1 banner, AI limit upsell hidden); (2) Fixed itemIndex-based local update correctness in both Product detail Drafts tab and Playbooks Draft Review (was using loop `idx` instead of `item.itemIndex` for filtered subsets); (3) Tightened Playwright LAC1-008 regression coverage with `toHaveCount(0)` assertions for AI/apply elements; (4) Updated manual testing doc with non-AI surface verification (scenario 3a) and corrected empty state copy to "No drafts saved for this product." |
| 6.26 | 2026-01-10 | **DRAFT-REVIEW-ISOLATION-1 COMPLETE**: Structural non-AI boundary for Product Drafts tab. Extracted `ProductDraftsTab.tsx` as isolated module with NON-AI BOUNDARY header comment. Module is forbidden from importing: `aiApi`, `ProductAiSuggestionsPanel`, `suggestProductMetadata`, `generateProductAnswers`, `AI_DAILY_LIMIT_REACHED`. Added `draft-review-isolation-1.spec.ts` guard test (DRI1-001/002/003) that reads source file and fails if forbidden tokens detected or header missing. Product detail page delegates Drafts tab rendering to isolated component. Pure structural refactor with no behavioral changes. Manual testing doc in `DRAFT-REVIEW-ISOLATION-1.md`. |
| 6.27 | 2026-01-10 | **DRAFT-REVIEW-ISOLATION-1-FIXUP-1**: Strict "no behavior changes" alignment. (1) Removed `isActive` prop and `hasFetched` caching from ProductDraftsTab - restored simple "fetch on mount" semantics; (2) Restored conditional mounting in page.tsx (`activeTab === 'drafts'`) to match standard tab behavior; (3) Removed "Tab State Preservation" scenario from manual testing doc since state preservation across tab switches was a behavior change. Guard test and non-AI boundary remain in place. |
| 6.28 | 2026-01-10 | **DRAFT-AI-ENTRYPOINT-CLARITY-1 COMPLETE**: UX AI boundary notes at draft workflow surfaces. Created `DraftAiBoundaryNote` component (`@/components/common/DraftAiBoundaryNote.tsx`) with `mode: 'review' | 'generate'` prop. Review mode: "Review & edit (no AI on this step)" with person icon. Generate mode: "AI used for drafts only · AI is not used at Apply" with lightbulb icon. Added to 3 surfaces: (1) ProductDraftsTab (review mode); (2) Playbooks Draft Review panel (review mode); (3) Playbooks Step 1 generation CTA (generate mode). Locked copy (do not modify without phase approval). Testkit seed `seed-draft-ai-entrypoint-clarity-1`. Playwright tests in `draft-ai-entrypoint-clarity-1.spec.ts` (5 tests) + updated LAC1-008. Manual testing doc in `DRAFT-AI-ENTRYPOINT-CLARITY-1.md`. |
| 6.29 | 2026-01-10 | **DRAFT-AI-ENTRYPOINT-CLARITY-1-FIXUP-1**: Work Queue generate-mode note + expanded coverage. (1) Added `DraftAiBoundaryNote mode="generate"` to `ActionBundleCard.tsx` for "Generate Drafts" / "Generate Full Drafts" CTAs; (2) Updated seed to use `status: 'PARTIAL'` for deterministic Work Queue "Generate Full Drafts" CTA in tests; (3) Added DAEPC1-006 Playwright test for Work Queue boundary note visibility; (4) Extended DAEPC1-001/002 with panel-scoped "no AI creep" assertions (no "Improve with AI", "Use AI", "Generate", "Regenerate" buttons in review panels); (5) Added Work Queue scenario to manual testing doc; (6) Added Phase DRAFT-AI-ENTRYPOINT-CLARITY-1 section to Implementation Plan (Surfaces Covered now includes Work Queue). |
| 6.30 | 2026-01-11 | **DRAFT-DIFF-CLARITY-1 COMPLETE + FIXUP-1**: Current vs Draft diff UI at draft review surfaces. (1) Diff display: "Current (live)" vs "Draft (staged)" blocks with distinct styling and test hooks (`draft-diff-current`, `draft-diff-draft`); (2) Empty draft messaging: "No draft generated yet" (both raw/final empty) vs "Draft will clear this field when applied" (explicitly cleared); (3) Save confirmation dialog when clearing live field; (4) ProductDraftsTab + Playbooks Draft Review surfaces updated; (5) Testkit seed `seed-draft-diff-clarity-1` with diff/cleared/no-draft products + page; (6) Playwright tests DDC1-001..DDC1-010 (10 tests) covering diff labels, messaging, confirmation dismiss/accept. FIXUP-1: Added Product 3 draftItem with empty raw/final for "No draft generated yet" scenario; added DDC1-008 (no draft message), DDC1-009 (dialog dismiss), DDC1-010 (dialog accept + save). |
| 6.31 | 2026-01-11 | **DRAFT-DIFF-CLARITY-1-FIXUP-2**: Seed count consistency + exact dialog assertion. (1) Fixed `counts.draftGenerated` from 3→2 (Products 1-2 have actual suggestions; Product 3 is empty); (2) Added `EMPTY_DRAFT_CONFIRM_MESSAGE` constant with exact locked copy; (3) Changed `page.on('dialog')` to `page.once('dialog')` in DDC1-009/DDC1-010 to avoid listener accumulation; (4) Changed `toContain()` to `toBe()` for exact dialog message matching. Tests/seed correctness only; no documentation updates required. |
| 6.32 | 2026-01-11 | **DRAFT-FIELD-COVERAGE-1 COMPLETE**: Draft Review parity across Products, Pages, and Collections. (1) Generalized ProductDraftsTab → AssetDraftsTab with asset-type-specific field labels (Products: SEO Title/Description, Pages: Page Title/Meta Description, Collections: Collection Title/Meta Description); (2) Added Pages detail route `/assets/pages/[pageId]` with Overview + Drafts tabs; (3) Added Collections detail route `/assets/collections/[collectionId]` with Overview + Drafts tabs; (4) Updated draft-review-isolation-1.spec.ts guard test to target AssetDraftsTab; (5) Added seed-draft-field-coverage-1 endpoint (3 products + 3 pages + 3 collections with diff/clear/no-draft scenarios); (6) Added draft-field-coverage-1.spec.ts Playwright tests (11 tests: DFC1-001 through DFC1-011) covering Pages/Collections diff display, no-draft messaging, destructive-clear confirmation dialogs, cross-asset parity; (7) Manual testing doc DRAFT-FIELD-COVERAGE-1.md. |
| 6.33 | 2026-01-11 | **DRAFT-FIELD-COVERAGE-1-FIXUP-1**: Canonical route aliases + accept-path dialog assertions. (1) Added canonical route `/projects/[id]/pages/[pageId]` (server redirect to `/assets/pages/...`, preserves query); (2) Added canonical route `/projects/[id]/collections/[collectionId]` (server redirect to `/assets/collections/...`, preserves query); (3) Updated Playwright tests to use canonical routes for Pages/Collections; (4) Added exact `EMPTY_DRAFT_CONFIRM_MESSAGE` assertions on accept path (DFC1-004 + DFC1-008) - now both dismiss and accept paths verify locked dialog copy; (5) Made ProductDraftsTab a thin wrapper around AssetDraftsTab to prevent implementation drift. |
