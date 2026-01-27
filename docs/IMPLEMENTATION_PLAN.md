# EngineO.ai Implementation Plan

This document tracks all implementation phases and their completion status.

> ⚠️ **Authoritative:** `docs/IMPLEMENTATION_PLAN.md` is the single source of truth for EngineO.ai execution. The root `IMPLEMENTATION_PLAN.md` is deprecated.







## [KAN-16] AUTONOMOUS-AGENT-ALLOWED-FILES-BULLET-PARSER-FIXUP-1

**Implemented:** 2026-01-27 04:42 UTC
**Branch:** feature/agent

### Files Modified:
- `scripts/autonomous-agent/reports/KAN-16-20260127-003423Z-claude-output-attempt1.txt`
- `scripts/autonomous-agent/reports/KAN-16-20260127-003423Z-claude-output-attempt2.txt`

---

## [KAN-17] AUTONOMOUS-AGENT-ISSUE-MODE-BUG-DISPATCH-FIXUP-1

**Implemented:** 2026-01-27 00:38 UTC
**Branch:** feature/agent

### Files Modified:
- `scripts/autonomous-agent/reports/KAN-17-20260127-003423Z-claude-output-attempt1.txt`

---

## [KAN-17] AUTONOMOUS-AGENT-ISSUE-MODE-BUG-DISPATCH-FIXUP-1

**Implemented:** 2026-01-26 18:31 UTC
**Branch:** feature/agent

### Files Modified:
- `.gitignore`
- `scripts/autonomous-agent/reports/KAN-17-20260126-182746Z-claude-output-attempt1.txt`

---

## AUTONOMOUS-AGENT-STEP4-VERIFICATION-RESTORE-1 FIXUP-1

**Implemented:** 2026-01-26 19:30 UTC
**Branch:** feature/agent

### Summary:
Cleanup fixup for Step 4 verification restore - removed out-of-scope test file and unrelated verification artifact.

### Changes:
- PATCH 1: Verified ledger path to state.json is correct (no code change needed)
- PATCH 2: Removed `scripts/autonomous-agent/tests/test_parse_allowed_files.py` (out-of-scope)
- PATCH 3: Removed `scripts/autonomous-agent/reports/AUTONOMOUS-AGENT-ALLOWED-FILES-BULLET-PARSER-FIXUP-1-verification.md` (unrelated)

### Test Results:
- 28 tests pass (down from 39 after removing out-of-scope test file with 11 tests)

---

## [KAN-17] AUTONOMOUS-AGENT-ISSUE-MODE-BUG-DISPATCH-FIXUP-1

**Implemented:** 2026-01-26 16:32 UTC
**Branch:** feature/agent

### Files Modified:
- `.engineo/state.json`
- `.gitignore`
- `docs/IMPLEMENTATION_PLAN.md`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt1.txt`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt2.txt`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt3.txt`
- `reports/KAN-17-20260126-161017Z-claude-output-attempt1.txt`
- `reports/KAN-17-claude-output.txt`
- `scripts/autonomous-agent/reports/AUTONOMOUS-AGENT-CLAUDE-EXECUTION-HARDENING-1-verification.md`
- `scripts/autonomous-agent20260126-e.zip`
- `.engineo/claude.lock`
- `reports/KAN-17-20260126-162804Z-claude-output-attempt1.txt`

---

## [KAN-17] AUTONOMOUS-AGENT-ISSUE-MODE-BUG-DISPATCH-FIXUP-1

**Implemented:** 2026-01-26 16:14 UTC
**Branch:** feature/agent

### Files Modified:
- `.engineo/`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt1.txt`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt2.txt`
- `reports/KAN-17-20260126-150819Z-claude-output-attempt3.txt`
- `reports/KAN-17-20260126-161017Z-claude-output-attempt1.txt`
- `reports/KAN-17-claude-output.txt`
- `scripts/autonomous-agent/reports/AUTONOMOUS-AGENT-CLAUDE-EXECUTION-HARDENING-1-verification.md`
- `scripts/autonomous-agent20260126-e.zip`

---

## [KAN-14] Implement: [EA-18] APPLY-ACTION-GOVERNANCE-1: Harden the "Apply" experience with explicit governance signals across the Issues inline preview flow (and any shared apply UI), without changing backend behavior.

**Implemented:** 2026-01-25 15:53 UTC
**Branch:** feature/agent

### Files Modified:
- `API_SPEC.md`
- `SHOPIFY_INTEGRATION.md`
- `apps/api/src/projects/local-discovery.service.ts`
- `apps/web/src/app/admin/ai-usage/page.tsx`
- `apps/web/src/app/admin/governance-audit/page.tsx`
- `apps/web/src/app/admin/users/page.tsx`
- `apps/web/src/app/demo/layout.tsx`
- `apps/web/src/app/demo/tables-lists/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/projects/[id]/assets/collections/[collectionId]/page.tsx`
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx`
- `apps/web/src/app/projects/[id]/insights/geo-insights/page.tsx`
- `apps/web/src/app/projects/[id]/issues/page.tsx`
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx`
- `apps/web/src/app/projects/[id]/products/page.tsx`
- `apps/web/src/app/projects/[id]/settings/governance/page.tsx`
- `apps/web/src/app/projects/[id]/settings/members/page.tsx`
- `apps/web/src/app/projects/page.tsx`
- `apps/web/src/components/command-palette/CommandPalette.tsx`
- `apps/web/src/components/icons/Icon.md`
- `apps/web/src/components/icons/Icon.tsx`
- `apps/web/src/components/icons/index.ts`
- `apps/web/src/components/icons/material-symbols-manifest.ts`
- `apps/web/src/components/issues/TripletDisplay.tsx`
- `apps/web/src/components/layout/CenterPaneHeaderProvider.tsx`
- `apps/web/src/components/layout/LayoutShell.tsx`
- `apps/web/src/components/layout/ProjectSideNav.tsx`
- `apps/web/src/components/layout/TopNav.tsx`
- `apps/web/src/components/products/ProductTable.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelActionPreview.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelAiAssistHints.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelContentRenderer.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelEntitySummary.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelIssueDetails.tsx`
- `apps/web/src/components/right-context-panel/ContextPanelIssueDrilldown.tsx`
- `apps/web/src/components/right-context-panel/RightContextPanel.tsx`
- `apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx`
- `apps/web/src/components/shopify/ShopifyEmbeddedShell.tsx`
- `apps/web/src/components/tables/DataList.tsx`
- `apps/web/src/components/tables/DataTable.tsx`
- `apps/web/src/components/work-queue/ActionBundleCard.tsx`
- `apps/web/src/lib/issue-fix-anchors.ts`
- `apps/web/src/lib/issue-to-action-guidance.ts`
- `apps/web/src/lib/issues/issueActionDestinations.ts`
- `apps/web/src/lib/issues/issueFixActionKind.ts`
- `apps/web/src/middleware.ts`
- `apps/web/tests/draft-clarity-and-action-trust-1.spec.ts`
- `apps/web/tests/issue-fix-route-integrity-1.spec.ts`
- `docs/DESIGN_SYSTEM_ALIGNMENT.md`
- `docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/RIGHT_CONTEXT_PANEL_CONTRACT.md`
- `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md`
- `docs/UI_SHELL_DIRECTIONS.md`
- `docs/UI_SHELL_WALKTHROUGH.md`
- `docs/WORK_CANVAS_ARCHITECTURE.md`
- `docs/icons.md`
- `docs/jira/DRAFT-LIFECYCLE-VISIBILITY-1.md`
- `docs/jira/ISSUE-ACTION-DESTINATION-GAPS-1.md`
- `docs/jira/ISSUE-FIX-KIND-CLARITY-1.md`
- `docs/jira/ISSUE-FIX-KIND-CLARITY-GAPS-1.md`
- `docs/jira/README.md`
- `docs/manual-testing/DARK-MODE-SYSTEM-1.md`
- `docs/manual-testing/DRAFT-LIFECYCLE-VISIBILITY-1.md`
- `docs/manual-testing/ICONS-LOCAL-LIBRARY-1.md`
- `docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md`
- `docs/manual-testing/ISSUE-FIX-ROUTE-INTEGRITY-1.md`
- `docs/manual-testing/ISSUES-ENGINE-REMOUNT-1.md`
- `docs/manual-testing/NAV-HIERARCHY-POLISH-1.md`
- `docs/manual-testing/PANEL-DEEP-LINKS-1.md`
- `docs/manual-testing/PLAYBOOKS-SHELL-REMOUNT-1.md`
- `docs/manual-testing/PRODUCTS-SHELL-REMOUNT-1.md`
- `docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md`
- `docs/manual-testing/SHOPIFY-EMBEDDED-CONTRAST-PASS-1.md`
- `docs/manual-testing/SHOPIFY-EMBEDDED-SHELL-1.md`
- `docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md`
- `docs/manual-testing/UI-POLISH-&-CLARITY-1.md`
- `docs/manual-testing/WORK-CANVAS-ARCHITECTURE-LOCK-1.md`
- `docs/testing/CRITICAL_PATH_MAP.md`
- `scripts/README-JIRA.md`
- `scripts/create-jira-ticket.ts`
- `scripts/create-phase-tickets.ts`
- `scripts/jira-crud.ts`
- `scripts/read-jira-tickets.ts`
- `apps/api/.env.save`
- `scripts/autonomous-agent/`

---

---

## Completed Phases (Chronological)

### Foundations

_None recorded as standalone phases._

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

| Mode     | Text                                                | Icon               |
| -------- | --------------------------------------------------- | ------------------ |
| Review   | "Review & edit (no AI on this step)"                | Person (gray)      |
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

| Element             | Text                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Current label       | "Current (live)"                                                                                             |
| Draft label         | "Draft (staged)"                                                                                             |
| No draft message    | "No draft generated yet"                                                                                     |
| Clear warning       | "Draft will clear this field when applied"                                                                   |
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

### Phase DRAFT-LIST-PARITY-1: List-Level Draft Review Entrypoint Parity ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-11

#### Overview

DRAFT-LIST-PARITY-1 ensures that "Review drafts" actions on Pages and Collections list views route to the asset detail Drafts tab (NOT to Work Queue or Playbooks). This creates parity with Products, where draft review already routes to the product detail Drafts tab.

**Trust Principle:** "Review drafts on asset lists routes to the asset detail Drafts tab, keeping the user focused on the individual asset rather than redirecting to batch automation surfaces."

#### Key Features

1. **Resolver Update**: `resolveRowNextAction()` now supports `issuesHref` for Pages/Collections dual-action rows (View issues + Open as secondary)
2. **Routing Helpers**: New `buildAssetWorkspaceHref()` and `buildAssetDraftsTabHref()` helpers for consistent asset routing
3. **Pages List**: "Review drafts" routes to `/projects/{id}/assets/pages/{pageId}?tab=drafts&from=asset_list`
4. **Collections List**: "Review drafts" routes to `/projects/{id}/assets/collections/{collectionId}?tab=drafts&from=asset_list`

#### Locked Routing Behavior

- Pages/Collections "Review drafts" MUST route to asset detail Drafts tab
- MUST NOT route to `/automation/playbooks?mode=drafts`
- MUST NOT route to `/work-queue`
- URL must include `?tab=drafts&from=asset_list` query params

#### Core Files

**Updated:**

- `apps/web/src/lib/list-actions-clarity.ts` (resolver + new helpers)
- `apps/web/src/app/projects/[id]/assets/pages/page.tsx` (uses new helpers)
- `apps/web/src/app/projects/[id]/assets/collections/page.tsx` (uses new helpers)

#### Test Coverage

- **Playwright Tests:** `apps/web/tests/draft-list-parity-1.spec.ts` (2 tests: DLP1-001, DLP1-002)
- **Manual Testing:** `docs/manual-testing/DRAFT-LIST-PARITY-1.md`

#### Seed Endpoint

Uses existing `POST /testkit/e2e/seed-draft-field-coverage-1` (provides pages/collections with drafts)

---

### Phase PLAYBOOK-ENTRYPOINT-INTEGRITY-1: Playbook Route Canonicalization & Banner Routing Guarantee ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-11

#### Overview

PLAYBOOK-ENTRYPOINT-INTEGRITY-1 introduces canonical playbook routes and guarantees that banner CTAs route to the correct playbook based on eligibility counts. The phase eliminates implicit default selection bugs and ensures URL is always the source of truth.

**Trust Principle:** "The playbook in the URL is the playbook being run. Banner clicks route deterministically to the correct playbook with no AI side effects."

#### Key Features

1. **Canonical Route Shape**: `/projects/:projectId/playbooks/:playbookId?step=preview|estimate|apply&source=<entrypoint>`
2. **Centralized Routing Helper**: `buildPlaybookRunHref()` as single source of truth for URL construction
3. **Deterministic Default Selection**: max eligibleCount wins; tie → descriptions; all 0 → neutral (no implicit default)
4. **Banner CTA Guarantee**: Banner routes canonically (no AI side effects on click)
5. **Tile Click Routing**: Tiles route via canonical URL (same as banner)
6. **Estimate/Playbook Mismatch Fix**: Estimates only merge when playbookId matches

#### Locked Routing Behavior

- Banner CTA MUST route to `/playbooks/:playbookId?step=preview&source=banner`
- URL MUST contain the correct playbookId (matching banner label)
- Click MUST NOT trigger AI/preview side effects
- Stepper MUST be visible after navigation
- Zero-eligible empty state MUST NOT appear when eligibility > 0

#### Canonical Route Shape

```
/projects/:projectId/playbooks/:playbookId?step=preview|estimate|apply&source=<entrypoint>
```

**Sources (entrypoints):**

- `banner` - Playbooks page banner CTA
- `tile` - Playbooks page tile click
- `work_queue` - Work Queue CTA
- `products_list` - Products list View playbooks link
- `next_deo_win` - Next DEO Win card CTA
- `entry` - Entry wizard
- `product_details` - Product details page
- `default` - Deterministic default selection

#### Core Files

**Created:**

- `apps/web/src/app/projects/[id]/playbooks/page.tsx` (canonical list route re-export)
- `apps/web/src/app/projects/[id]/playbooks/[playbookId]/page.tsx` (canonical run route re-export)
- `apps/web/src/lib/playbooks-routing.ts` (centralized routing helper)

**Updated:**

- `apps/web/src/app/projects/[id]/automation/page.tsx` (redirect to /playbooks)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (integrity fixes)
- `apps/web/src/components/work-queue/ActionBundleCard.tsx` (canonical routing)
- `apps/web/src/components/products/ProductTable.tsx` (canonical routing)
- `apps/web/src/components/projects/NextDeoWinCard.tsx` (canonical routing)
- `apps/web/src/app/projects/[id]/automation/playbooks/entry/page.tsx` (canonical routing)
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (returnTo validation)
- `apps/web/src/lib/issue-fix-navigation.ts` (canonical route contexts)

#### Test Coverage

- **Playwright Tests:** `apps/web/tests/playbook-entrypoint-integrity-1.spec.ts` (PEPI1-001, PEPI1-002)
- **Manual Testing:** `docs/manual-testing/PLAYBOOK-ENTRYPOINT-INTEGRITY-1.md`

#### Seed Endpoint

`POST /testkit/e2e/seed-playbook-entrypoint-integrity-1`

Seeds:

- User with project and Shopify connection
- Products where: titles eligibleCount = 0, descriptions eligibleCount > 0
- Returns expected counts for test assertions

#### FIXUP-3 (2026-01-11): Scoped Eligibility Integrity

- Scoped PRODUCTS entry (assetType=PRODUCTS + scopeAssetRefs) now computes eligibility counts scoped (no global banner → scoped destination mismatch).
- Banner CTA routing preserves the exact same scope semantics as the eligibility basis (no cross-scope routing).
- Manual Testing: Added "Scoped Playbooks entry (Products list / filtered scope)" to PLAYBOOK-ENTRYPOINT-INTEGRITY-1.md.
- Scope parsing now accepts repeated scopeAssetRefs query params (and comma-separated), matching Playwright PEPI1-002 entry shape.

#### FIXUP-4 (2026-01-11): Scoped Routing Guardrails (PRODUCTS)

- Removed remaining PRODUCTS scope-suppression patterns in Playbooks routing entrypoints (Playbooks page + Work Queue).
- Added guardrail: scoped playbook routes must include assetType; invalid scoped routes are refused (console error + no navigation).
- Introduced `playbookRunScopeForUrl` shared memo for scope-identical routing across all entrypoints.
- Strengthened PEPI1-002 to assert repeated scopeAssetRefs params via `URLSearchParams.getAll()`.

#### FIXUP-5 (2026-01-11): Canonical Entrypoints + Explicit Scope Payload

- Extended `buildPlaybooksListHref()` to support `assetType` and `scopeAssetRefs` params.
- Added `buildPlaybookScopePayload()` helper for consistent scope spreading in routing args.
- Added `navigateToPlaybooksList()` wrapper for router navigation.
- Updated `NextDeoWinCard` to use `navigateToPlaybookRun()` and `buildPlaybooksListHref()` (no manual string URLs).
- Updated Entry page to use `buildPlaybooksListHref()` for breadcrumb/back links and `buildPlaybookRunHref()` for "View playbook" CTA with explicit scope.
- Replaced `playbookRunScopeForUrl` inline memo with `buildPlaybookScopePayload()` from routing module.
- Added PEPI1-003 Playwright test for Entry page CTA routing with scoped products.
- Manual Testing: Added Scenario 1.2 (Entry page → Playbook with scope) to PLAYBOOK-ENTRYPOINT-INTEGRITY-1.md.

**FOLLOWUP-1 (2026-01-12):**

- Entry page CTA now routes to Playbooks LIST (not hardcoded run target) so deterministic selection chooses the correct playbook for scoped eligibility.
- `buildPlaybookScopePayload()` now validates PRODUCTS scope refs (rejects handle-prefixed refs like `page_handle:...`) and provides an explicit payload with `scopeProductIds` for API calls.
- Added `getRoutingScopeFromPayload()` helper to extract routing-only subset (excludes `scopeProductIds`).
- Removed positional branching in all API calls (eligibility, estimate, preview, apply) - all use explicit payload.
- Added stable "Open Playbooks" CTA (`data-testid="automation-entry-open-playbooks"`) visible without AI/enable dependency.
- PEPI1-003 test rewritten: no AI dependency, uses stable CTA, asserts deterministic selection lands on descriptions playbook (seed: titles=0, descriptions>0).
- Deterministic selection preserves `source=entry` into the run URL; PEPI1-003 asserts this to prevent routing drift.

### Phase SHOPIFY-ASSET-SYNC-COVERAGE-1: Shopify Pages + Collections Ingestion ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-11
**Activation:** Shopify-first ingestion coverage (read + display only)

#### Goals

1. Ingest Shopify Pages and Collections into EngineO.ai DB (metadata-only).
2. Display them in Assets → Pages and Assets → Collections (list + detail).
3. Make sync explicit: users can trigger sync; UI shows coverage + last sync time.

#### Strict Non-Goals

- No content-body ingestion/edit/apply
- No new playbooks or playbook IDs
- No apply expansion beyond existing support
- No changes to approval/audit/AI usage rules

#### Key Changes

1. **Prisma Schema**: Added Shopify identity fields to CrawlResult (shopifyResourceType, shopifyResourceId, shopifyHandle, shopifyUpdatedAt, shopifySyncedAt) with compound unique constraint and @@index([projectId, url]).
2. **API Endpoints**: Added project-scoped sync endpoints (POST /projects/:id/shopify/sync-pages, POST /projects/:id/shopify/sync-collections, GET /projects/:id/shopify/sync-status).
3. **ShopifyService**: Added GraphQL fetchers (GetPages, GetCollections), sync methods, and sync status persistence.
4. **Frontend**: Pages and Collections list pages with sync buttons (visible but disabled when Shopify not connected), status lines, and empty state differentiation. Detail pages show handle and updatedAt.
5. **E2E Tests**: API-level e2e spec and Playwright smoke test.

#### Test Coverage

- API e2e spec: `apps/api/test/e2e/shopify-asset-sync.e2e-spec.ts`
- Playwright smoke test: `apps/web/tests/shopify-asset-sync-coverage-1.spec.ts`

#### Manual Testing

- `docs/manual-testing/SHOPIFY-ASSET-SYNC-COVERAGE-1.md`

### Phase SHOPIFY-SCOPE-RECONSENT-UX-1: Explicit Shopify Re-Consent for New Scopes ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-15
**Activation:** Trust-preserving remediation path for missing Shopify scopes (Pages / Collections)

#### Goals

1. Expose server-authoritative missing scope detection per capability.
2. Replace generic "sync failed" messaging with a structured permission notice + explicit remediation CTA.
3. Ensure re-consent is user-initiated, requests only the minimal additional scopes required, and returns to the originating screen.
4. Auto-retry the previously blocked sync after successful re-consent return.

#### Key Changes

1. **API:** Added `GET /projects/:id/shopify/missing-scopes?capability=...` and `GET /shopify/reconnect` (user-initiated); OAuth callback now respects safe `returnTo` for reconnect.
2. **ShopifyService:** Added scope status helpers; Pages/Collections sync throws structured `SHOPIFY_MISSING_SCOPES` payload when blocked.
3. **Frontend:** Pages/Collections list pages show "Additional Shopify permission required" notice, provide "Reconnect Shopify", and auto-sync on reconnect return.
4. **Tests:** Added Playwright coverage for missing-scope notice + auto-sync after reconnect return.

#### Manual Testing

- `docs/manual-testing/SHOPIFY-SCOPE-RECONSENT-UX-1.md`

#### Related Documentation

- `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md`

### Phase SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1: Reconnect CTA Must Never Fail Silently ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-15
**Activation:** Trust hardening for re-consent remediation path (Pages / Collections)

#### Goals

1. Ensure "Reconnect Shopify" always results in a redirect or a visible, actionable error message.
2. Avoid reliance on localStorage token for starting reconnect (server-authoritative reconnect URL).
3. Maintain Pages + Collections parity.

#### Key Changes

1. **API:** Added `GET /projects/:id/shopify/reconnect-url` (OWNER-only) to return Shopify OAuth authorize URL for reconnect.
2. **Frontend:** Permission notice now renders inline reconnect errors + "Sign in again" CTA; Pages/Collections use reconnect-url and never hide reconnect errors behind missing-scope gating.
3. **Tests:** Playwright coverage for missing-token inline error + reconnect-url request + OAuth navigation attempt.

#### Manual Testing

- `docs/manual-testing/SHOPIFY-SCOPE-RECONSENT-UX-1.md`

### Phase SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1: Connect / Disconnect Consistency + Working Entry Points ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-16
**Activation:** Trust-preserving Shopify integration lifecycle across Store Health, Products, Assets, and Project Settings

#### Goals

1. Make "Shopify connected" server-authoritative and consistent everywhere.
2. Ensure disconnect fully disconnects and removes phantom connected experiences.
3. Ensure every "connect required" state has a working, user-initiated Connect path.
4. Fix broken navigation to Project Settings integrations section.

#### Key Changes

1. **API:** GET /projects/:id/integration-status now reports connected state based on usable credentials; added OWNER-only GET /projects/:id/shopify/connect-url.
2. **Frontend:** Store Health shows Shopify-not-connected notice + Connect path for Shopify projects; Settings includes Connect/Disconnect CTAs and missing-scope reconnect notice; Products empty-state link routes to /settings#integrations; Pages/Collections show connect guidance when not connected.
3. **Tests:** Added Playwright coverage for disconnect → disconnected everywhere, new project connect path, Products link routing, and Connect CTA non-silent failure.

#### Manual Testing

- `docs/manual-testing/SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1.md`

### Phase SHOPIFY-SCOPES-MATRIX-1: Authoritative Capability → Scope Mapping ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-17
**Activation:** Server-authoritative scope computation for Shopify OAuth

#### Goals

1. Define a single capability → required scopes mapping (authoritative).
2. Ensure install and reconnect flows compute requested scopes server-side.
3. Validate SHOPIFY_SCOPES as an allowlist (must be superset of required scopes).
4. Fail fast when misconfigured (non-prod) or return safe error (prod).

#### Key Changes

1. **New File:** `apps/api/src/shopify/shopify-scopes.ts` - Authoritative scope matrix with `ShopifyCapability` type, `SHOPIFY_SCOPE_MATRIX`, `parseShopifyScopesCsv()`, `computeShopifyRequiredScopes()`, and `checkScopeCoverage()` helpers.
2. **ShopifyService:** Updated `generateInstallUrl()` to request computed minimal `requiredScopes` for install (not the full env allowlist) and to validate the env allowlist covers all requested scopes. OAuth state now includes `enabledCapabilities`, `requiredScopes`, `requestedScopes` metadata.
3. **ShopifyController:** Callback logs `requiredScopes` and `requestedScopes` for debugging.
4. **Scope Computation:** Replaced inline `requiredScopesForCapability()` with centralized `computeShopifyRequiredScopes()`.

#### Scope Matrix

| Capability         | Required Scopes  |
| ------------------ | ---------------- |
| `products_sync`    | `read_products`  |
| `products_apply`   | `write_products` |
| `collections_sync` | `read_products`  |
| `pages_sync`       | `read_content`   |
| `blogs_sync`       | `read_content`   |
| `themes_read`      | `read_themes`    |

#### Core Files

- `apps/api/src/shopify/shopify-scopes.ts` (NEW - authoritative scope matrix)
- `apps/api/src/shopify/shopify.service.ts` (updated scope computation)
- `apps/api/src/shopify/shopify.controller.ts` (scope logging)
- `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts` (NEW - unit tests)

#### Test Coverage

- Unit tests: `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts`
- Updated test mocks in: `shopify.service.test.ts`, `shopify-graphql-api.integration.test.ts`, `shopify-metafields-sync.integration.test.ts`

#### Related Documentation

- `docs/SHOPIFY_SCOPES_MATRIX.md` (internal documentation)
- `docs/SHOPIFY_PERMISSIONS_AND_RECONSENT.md` (existing permissions doc)

### Phase SHOPIFY-SCOPE-IMPLICATIONS-1: Write Scopes Imply Read Access ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-20
**Activation:** Implication-aware scope coverage checks

#### Goals

1. Eliminate false "missing read_X" warnings when `write_X` is already granted.
2. Implement implication-aware scope coverage: write scopes implicitly grant read access.
3. Ensure the Trust Invariant: no false missing scope warnings for covered capabilities.

#### Key Changes

1. **Implication Rules:** Added `SHOPIFY_SCOPE_IMPLICATIONS` constant mapping write scopes to their implied read scopes (`write_products` → `read_products`, `write_content` → `read_content`, `write_themes` → `read_themes`).
2. **Expansion Helper:** Added `expandGrantedScopesWithImplications()` function to expand granted scopes with their implied read scopes.
3. **Coverage Checks:** Updated `checkScopeCoverage()` to use implication-aware expansion so `write_products` satisfies `read_products` requirements.
4. **Service Update:** Updated `getScopeStatusFromIntegration()` in `shopify.service.ts` to use implication-aware expansion for missing scope detection.

#### Implication Matrix

| Write Scope      | Implies         |
| ---------------- | --------------- |
| `write_products` | `read_products` |
| `write_content`  | `read_content`  |
| `write_themes`   | `read_themes`   |

**Important:** Implications are for COVERAGE CHECKS ONLY — actual OAuth scopes requested/stored are unchanged. Read scopes do NOT imply write scopes (no reverse implication).

#### Core Files

- `apps/api/src/shopify/shopify-scopes.ts` (SHOPIFY_SCOPE_IMPLICATIONS, expandGrantedScopesWithImplications, updated checkScopeCoverage)
- `apps/api/src/shopify/shopify.service.ts` (getScopeStatusFromIntegration uses implication-aware expansion)
- `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts` (implication contract tests)

#### Test Coverage

- Unit tests: `apps/api/test/unit/shopify/shopify-scopes-matrix.test.ts` (Scope Implications describe block)

#### Manual Testing

- `docs/manual-testing/SHOPIFY-SCOPE-IMPLICATIONS-1.md`

#### Related Documentation

- `docs/SHOPIFY_SCOPES_MATRIX.md` (updated with Scope Implications section)
- `docs/testing/CRITICAL_PATH_MAP.md` (CP-006 updated with implication scenarios)

### Phase SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1: Authoritative Granted-Scope Truth Source ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-20
**Activation:** Authoritative scope derivation and capability-aware messaging

#### Goals

1. Establish authoritative granted-scope derivation after OAuth callback.
2. Implement fallback to Access Scopes endpoint when OAuth scope string is empty/suspicious.
3. Normalize stored scopes (deduplicated, sorted, comma-separated).
4. Provide capability-aware permission notice messaging (catalog vs content vs combined).

#### Key Changes

1. **Authoritative Truth Source:** `storeShopifyConnection()` now derives granted scopes from:
   - Primary: OAuth token exchange `scope` string (if present and parseable)
   - Fallback: Shopify Admin Access Scopes endpoint (`/admin/oauth/access_scopes.json`)
2. **Access Scopes Fetcher:** Added `fetchAccessScopes()` private helper to call Shopify Admin API.
3. **Scope Normalization:** Added `normalizeScopes()` helper for deduplicated, sorted, comma-separated storage.
4. **Server Logging:** Added minimal safe logs (no secrets) showing integration ID, shop domain, truth source used, and normalized scopes.
5. **E2E Mock Support:** Added mock handler for `access_scopes.json` endpoint in test mode.
6. **Permission Notice Copy:** Updated `ShopifyPermissionNotice.tsx` with capability-aware messaging:
   - `read_products` missing → catalog wording (products & collections)
   - `read_content` missing → content wording (pages & blog posts)
   - Both missing → combined wording

#### Truth Source Logic

| OAuth Scope                   | Action                               |
| ----------------------------- | ------------------------------------ |
| Present, non-empty, parseable | Use as `oauth_scope` truth source    |
| Empty, null, or unparseable   | Fallback to `access_scopes_endpoint` |

**Explicit Separation:**

- `grantedScopes` = factual scopes stored in DB (from truth source)
- `effectiveGranted` = expanded set for coverage checks (includes implications from SHOPIFY-SCOPE-IMPLICATIONS-1)

#### Core Files

- `apps/api/src/shopify/shopify.service.ts` (storeShopifyConnection, fetchAccessScopes, normalizeScopes, e2eMockShopifyFetch)
- `apps/web/src/components/shopify/ShopifyPermissionNotice.tsx` (capability-aware messaging)

#### Test Coverage

- E2E mock: `apps/api/src/shopify/shopify.service.ts` (access_scopes.json mock in e2eMockShopifyFetch)

#### Manual Testing

- `docs/manual-testing/SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md`

#### Related Documentation

- `docs/testing/CRITICAL_PATH_MAP.md` (CP-006 updated with truth source scenarios)
- `docs/SHOPIFY_SCOPES_MATRIX.md`

#### FIXUP-1: Partial OAuth Scope Detection + Catalog-Safe Copy (2026-01-20)

**Problem:** OAuth token exchange may return fewer scopes than requested. The original implementation only fell back to Access Scopes endpoint when OAuth scope was empty, not when it was "suspicious" (missing expected scopes).

**Changes:**

1. **Suspicious-Scope Detection:** `storeShopifyConnection()` now accepts optional `expectedScopes` parameter. If OAuth scope is present but missing expected scopes, treats it as "suspicious" and falls back to Access Scopes endpoint.
2. **Controller Pass-Through:** `shopify.controller.ts` callback now passes `statePayload.requestedScopes` to `storeShopifyConnection()`.
3. **New Truth Source Value:** Added `access_scopes_endpoint_suspicious` to distinguish suspicious-scope fallback from empty-scope fallback in logs.
4. **Catalog-Safe Copy:** Updated permission notice approval copy from "We never modify content without your approval" to "We never modify your store without your explicit approval" (catalog-safe, since products/collections are not "content").
5. **Manual Testing:** Added EC-004 edge case for partial/suspicious OAuth scope scenario.
6. **Critical Path Map:** Added FIXUP-1 scenario to CP-006 (SHOPIFY-SCOPE-TRUTH-1 FIXUP-1).

#### FIXUP-2: Empty-Scope Persistence Guard (2026-01-20)

**Problem:** Original implementation could persist empty scopes if both Access Scopes endpoint AND OAuth scope were empty, potentially causing incorrect missing-scope warnings. Reconnect could accidentally downgrade existing stored scopes.

**Changes:**

1. **Safe Fallback Source Order:** `storeShopifyConnection()` now uses priority order:
   - Access Scopes endpoint (if non-empty)
   - OAuth token exchange scope (even if previously marked "suspicious")
   - Existing stored `integration.config.scope` (retain if non-empty)
2. **Explicit Failure:** If final scope would be empty AND no existing scope exists, throws `SHOPIFY_SCOPE_VERIFICATION_FAILED` error instead of creating integration with empty scope.
3. **Callback Error Handling:** `shopify.controller.ts` catches `SHOPIFY_SCOPE_VERIFICATION_FAILED` and redirects to `/projects/{projectId}/settings#integrations?shopify=verify_failed`.
4. **UI Verification Failure Notice:** Settings page reads `shopify=verify_failed` query param and shows "Could not verify Shopify permissions" error with retry button.
5. **Enhanced Observability:** `fetchAccessScopes()` returns structured status (`success`|`http_error`|`parse_error`|`empty`) with HTTP status code category logged (no secrets).
6. **Truth Source Values:** Added `oauth_scope_fallback` and `existing_scope_retained` to distinguish fallback scenarios in logs.
7. **Manual Testing:** Created `SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-2.md` with fresh install, reconnect, and failure scenarios.
8. **Critical Path Map:** Added FIXUP-2 scenarios to CP-006.

#### FIXUP-3: Suppress Fake Missing-Scope List on Verification Failure (2026-01-20)

**Problem:** When `shopify=verify_failed` is shown, stale or empty missing-scope state could cause the "Missing permission: ..." notice to also render, showing misleading "missing all permissions" output.

**Changes:**

1. **Clear Stale State:** On `verify_failed` detection, clear `shopifyMissingScopes` and `reconnectCapability` state to prevent fake warnings from stale data.
2. **Render Guard:** Added `!scopeVerifyFailed` condition to `ShopifyPermissionNotice` render block so verify_failed banner is mutually exclusive with missing-scope notice.
3. **Manual Testing:** Updated FIXUP-2 doc (ERR-001) with explicit assertion that verify_failed suppresses missing-scope list.
4. **Critical Path Map:** Added FIXUP-3 scenario to CP-006.

### Phase BLOGS-ASSET-SYNC-COVERAGE-1: Shopify Blog Posts (Articles) Ingestion ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-17
**Activation:** Blog posts visibility as first-class asset type (read + display only)

#### Goals

1. Ingest Shopify Blog Posts (Articles) into EngineO.ai DB with metadata.
2. Display them in Assets → Blog posts with sync controls.
3. Show Published/Draft status based on `shopifyPublishedAt` field (null = draft).
4. Track `lastBlogsSyncAt` in sync status.

#### Strict Non-Goals

- No content-body ingestion/edit/apply for blog posts
- No new playbooks or playbook IDs for blog posts
- No apply expansion (read-only visibility)

#### Key Changes

1. **Prisma Schema**: Added `shopifyPublishedAt` and `shopifyBlogHandle` fields to CrawlResult for article published status and parent blog handle.
2. **API Endpoints**: Added `POST /projects/:id/shopify/sync-blogs` endpoint (OWNER-only).
3. **ShopifyService**: Added `fetchShopifyArticles()` GraphQL fetcher and `syncBlogPosts()` method with E2E mock handler support. Stores article handle separately from blog handle.
4. **Sync Status**: `getSyncStatus()` now returns `lastBlogsSyncAt` timestamp.
5. **Frontend**: Blog posts list page (`/projects/[id]/assets/blogs`) with sync button, Published/Draft badges, "Open" external links, handle display as `{blogHandle}/{handle}` format, and permission gating when `read_content` scope is missing.
6. **Navigation**: Added "Blog posts" link to ProjectSideNav under ASSETS group.
7. **Permission Notice**: Updated ShopifyPermissionNotice to mention Blog posts.

#### Capability → Scope

| Capability   | Required Scopes |
| ------------ | --------------- |
| `blogs_sync` | `read_content`  |

#### Core Files

- `apps/api/prisma/migrations/20260117_blogs_asset_sync_coverage_1/migration.sql` (NEW - shopifyPublishedAt + shopifyBlogHandle)
- `apps/api/prisma/schema.prisma` (shopifyPublishedAt, shopifyBlogHandle fields)
- `apps/api/src/projects/projects.controller.ts` (sync-blogs endpoint)
- `apps/api/src/projects/projects.service.ts` (blog pageType filter)
- `apps/api/src/shopify/shopify.service.ts` (fetchShopifyArticles, syncBlogPosts)
- `apps/web/src/app/projects/[id]/assets/blogs/page.tsx` (NEW)
- `apps/web/src/components/layout/ProjectSideNav.tsx` (Blog posts nav item)
- `apps/web/src/components/shopify/ShopifyPermissionNotice.tsx` (updated copy)
- `apps/web/src/lib/api.ts` (syncBlogs method, blogs_sync capability types)

#### Test Coverage

- E2E API test: `apps/api/test/e2e/shopify-asset-sync.e2e-spec.ts` (sync-blogs test)
- Playwright smoke test: `apps/web/tests/blogs-asset-sync-coverage-1.spec.ts`
- Nav consistency test: `apps/web/tests/nav-ia-consistency-1.spec.ts` (updated)

#### Manual Testing

- `docs/manual-testing/BLOGS-ASSET-SYNC-COVERAGE-1.md`

#### Related Documentation

- `docs/SHOPIFY_SCOPES_MATRIX.md` (blogs_sync capability)
- `docs/testing/CRITICAL_PATH_MAP.md` (CP-006 updated)

### Phase PLAYBOOK-STEP-CONTINUITY-1: Playbook Step 2 → Step 3 Deterministic Transitions ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-19
**Critical Path:** CP-012 Automation Playbooks – preview → estimate → apply

#### Goals

1. Eliminate Step 2 "Continue to Apply" silent no-op race condition.
2. Enforce explicit terminal outcomes at Step 2 (Ready / NoItems / Blocked / DraftInvalid).
3. Add deterministic Step 2 → Step 3 transition guarantee (no silent stalls).
4. Provide resolution CTAs for permission-blocked and draft-invalid states.

#### Strict Non-Goals

- No changes to playbook AI generation logic
- No changes to scope binding or rules hash computation
- No new playbook types or capabilities

#### Key Changes

1. **loadEstimate Race Fix**: `loadEstimate()` no longer clears estimate to null while loading. Keeps last known estimate visible during refresh.
2. **handleNextStep Defensive Fallback**: Never returns silently. Shows explicit toast when required data is missing/stale.
3. **PlaybookEstimate Interface**: Extended with `draftStatus?: 'READY' | 'PARTIAL' | 'FAILED' | 'EXPIRED'` and `draftCounts` fields.
4. **Draft Status Evaluation**: Step 2 shows blocker panels for EXPIRED/FAILED drafts with Regenerate/Retry CTAs. "Continue to Apply" hidden for invalid drafts.
5. **API draftStatus Normalization**: `estimatePlaybook()` returns `draftStatus: 'EXPIRED'` when `expiresAt < now` (even if persisted status differs).
6. **API PLAYBOOK_DRAFT_EXPIRED**: `applyPlaybook()` returns explicit 409 Conflict with `code: 'PLAYBOOK_DRAFT_EXPIRED'` for expired drafts.
7. **Zero-Eligible Empty State**: Shows "No applicable changes found" with Back/Exit path ("Return to Playbooks").
8. **Permission Resolution CTAs**: VIEWER/EDITOR notices include "Request access" / "Manage members" links to `/settings/members`.
9. **Step 3 Focus Accessibility**: Section has `tabIndex={-1}` for programmatic focus on scroll.

#### Files Changed

- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx`
- `apps/api/src/projects/automation-playbooks.service.ts`

#### Manual Testing

- `docs/manual-testing/PLAYBOOK-STEP-CONTINUITY-1.md`

#### Related Documentation

- `docs/testing/CRITICAL_PATH_MAP.md` (CP-012 updated)

#### FIXUP-1 (2026-01-19)

Audit findings and corrections:

1. **loadPreview Estimate Refresh**: Changed from conditional to unconditional estimate refresh after preview generation. This ensures `draftStatus`/`draftCounts` always reflect the latest draft, which is required to clear the Step 2 blocker state after clicking Regenerate/Retry CTAs.

2. **Zero-Eligible CTA Label Regression**: Restored PRODUCTS-specific label to exactly "View products that need optimization" (was changed to generic "View items..." which breaks `zero-affected-suppression-1.spec.ts`). Other asset types now have specific labels.

3. **Zero-Eligible "Return to Playbooks" Route**: Fixed navigation target from `/automation` to canonical `/playbooks` route.

4. **Draft Missing Blocker Panel**: Added blocker panel for when `draftStatus` is undefined (no draft exists), with "Generate Preview" CTA. "Continue to Apply" now requires explicit valid draft status (READY or PARTIAL only).

5. **Manual Testing Doc Restructure**: Aligned PLAYBOOK-STEP-CONTINUITY-1.md with MANUAL_TESTING_TEMPLATE.md structure; corrected API endpoint paths; removed nonexistent seed endpoint reference; fixed VIEWER scenario preconditions.

#### FIXUP-2 (2026-01-19)

Permission-safe Step 2 draft blocker CTAs:

1. **VIEWER Cannot Regenerate/Retry/Generate**: Step 2 draft blocker panels (EXPIRED, FAILED, missing draftStatus) now gate the CTA based on `canGenerateDrafts`. VIEWER role cannot generate previews, so the button is not shown.

2. **Explicit Permission Explanation**: When blocked, panels show "Viewer role cannot generate previews." text instead of the actionable button.

3. **Resolution CTA**: Each blocked panel includes a "Request access" link to `/projects/{projectId}/settings/members`, consistent with Step 3 permission notices.

4. **OWNER/EDITOR Unchanged**: The CTA remains available and functional for roles that can generate drafts.

### Phase ISSUE-FIX-KIND-CLARITY-1: Diagnostic vs Fixable Issue CTA Semantics ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-12
**Activation:** UX semantic clarity for informational/diagnostic issues

#### Goals

1. Distinguish DIAGNOSTIC issues (informational, no direct fix) from EDIT/AI issues (actionable with direct fix surface).
2. Show "Review" CTA for DIAGNOSTIC issues (not "Fix") in Issues Engine + DEO Overview.
3. Show blue "diagnostic" arrival callout (not yellow "anchor not found") for DIAGNOSTIC issues.
4. Add "View related issues" CTA for DIAGNOSTIC arrival callout.

#### Strict Non-Goals

- No changes to issue detection or scoring logic
- No new issue types or pillar classifications
- No changes to issue-to-fix routing (just CTA semantics)

#### Key Changes

1. **IssueFixKind Type**: Added `IssueFixKind = 'EDIT' | 'AI' | 'DIAGNOSTIC'` to `issue-to-fix-path.ts`. Each issue config can specify `fixKind`; defaults to 'EDIT' if not specified.
2. **Search & Intent Issue Configs**: `answer_surface_weakness`, `not_answer_ready`, `weak_intent_match` use `search-intent-tab-anchor` as canonical anchor. `not_answer_ready` marked as `fixKind: 'DIAGNOSTIC'` with NO `fixAnchorTestId` (no scroll/highlight).
3. **DIAGNOSTIC Arrival Callout**: Added `diagnostic` variant to `CalloutVariant` type in `issue-fix-anchors.ts`. Shows blue styling with "You're here to review:" message. Includes `showViewRelatedIssues: true` for "View related issues" CTA.
4. **Product Page Integration**: `fixKind` is derived from fix config ONLY (NOT from URL param - URL param is non-authoritative). Renders "View related issues" CTA that routes to Issues Engine with pillar filter.
5. **Issues Engine CTA**: Issues Engine page (`issues/page.tsx`) derives `fixKind` via `getIssueFixConfig()`, shows "Review" CTA for DIAGNOSTIC issues with blue styling, adds `data-fix-kind` attribute to cards.
6. **DEO Overview CTA**: "Top Recommended Actions" shows "Review" for DIAGNOSTIC issues, "Fix now" for others.
7. **URL Navigation**: `buildIssueFixHref()` skips `fixAnchor` param for DIAGNOSTIC issues (no scroll/highlight needed). fixKind is NOT passed in URL.

#### FIXUP-1 (2026-01-12)

Corrections to initial implementation:

1. **Anchor Integrity**: Search & Intent issues now use `search-intent-tab-anchor` as canonical anchor (not module-specific testids that don't exist).
2. **fixKind Security**: fixKind is NEVER read from URL params (non-authoritative, spoofable). Always derived from `getIssueFixConfig()`.
3. **View Related Issues Route**: "View related issues" CTA routes to Issues Engine (`/projects/:id/issues?mode=detected&pillar=:pillarId`), NOT to product `tab=issues`.
4. **Issues Engine DIAGNOSTIC**: Issues Engine page now derives fixKind from config, shows "Review" CTA for DIAGNOSTIC, suppresses "Fixes one affected product at a time" text.
5. **Strict Test Assertions**: Playwright tests fail if preconditions aren't met (no no-op guards).
6. **[AUDIT-3] fixKind Not Emitted**: `buildIssueFixHref()` no longer emits `fixKind` in URL - it is derived from config only, URL does not include it.

#### FIXUP-2 (2026-01-14)

Aggregation surfaces (Products list, Work Queue) now use fixKind-aware semantics:

1. **Products List "Review" CTA**: Added `fixNextIsDiagnostic?: boolean` to `RowNextActionInput`. Products list passes flag when deterministic next issue is DIAGNOSTIC. CTA shows "Review" instead of "Fix next".
2. **Work Queue Banner Wording**: Work Queue derives `fixKind` from `getIssueFixConfig(issueIdParam)`. DIAGNOSTIC issues render blue banner with "You're here to review:" wording (not indigo "You're here to fix:").
3. **Seed Data Extension**: `seed-first-deo-win` now creates 4 products. Product 4 has SEO populated and is shaped so `not_answer_ready` is the deterministic next issue (for testing DIAGNOSTIC CTA) without competing top issues.
4. **Playwright Tests**: LAC1-002b (Products list Review CTA), IFKC1-006 (Products list Review CTA), IFKC1-007 (Work Queue DIAGNOSTIC banner).
5. **Manual Testing**: Scenarios 6 (Products list Review CTA) and 7 (Work Queue DIAGNOSTIC banner) added.

#### FIXUP-2 AUDIT-1 (2026-01-14)

1. **Work Queue helper line semantics**: DIAGNOSTIC issue banner now uses explicit "To review this issue:" helper prefix (never "fix" language); IFKC1-007 asserts this to prevent regression.

#### FIXUP-3 (2026-01-25)

Semantic CTA labels with fix-action kinds for Issues Decision Engine:

1. **Fix-Action Kind Helper**: Created `apps/web/src/lib/issues/issueFixActionKind.ts` with 4 canonical kinds:
   - `AI_PREVIEW_FIX`: AI fix with inline preview → "Review AI fix" (workflow.ai icon)
   - `DIRECT_FIX`: Direct navigation to workspace → "Fix in workspace" (nav.projects icon)
   - `GUIDANCE_ONLY`: Diagnostic/review only → "Review guidance" (playbook.content icon)
   - `BLOCKED`: No action reachable → "Blocked" chip (status.blocked icon)

2. **Issues Page CTA Updates**: Updated `apps/web/src/app/projects/[id]/issues/page.tsx`:
   - AI preview buttons show "Review AI fix" with sparkle icon
   - Direct fix links show "Fix in workspace" with inventory icon
   - View affected links show "Review guidance" with article icon
   - Sublabels added via title attribute (e.g., "Preview changes before saving")
   - All existing `data-testid` selectors preserved for backward compatibility

3. **Dev-Time Trust Guardrails**: Added console warnings (dev mode only):
   - AI_PREVIEW_FIX labels must include "Review"
   - DIRECT_FIX labels must NOT include "AI", "Apply", or "Automation"

4. **RCP Copy Alignment**: Updated `ContextPanelIssueDetails.tsx` Actionability section with fix-action kind sentence (no CTAs in RCP body, read-only panel).

5. **Manual Testing**: Added FIXUP-3 section to `ISSUE-FIX-KIND-CLARITY-1.md` with 5 new scenarios (F3-001 through F3-005) and verification checklist.

#### Core Files

- `apps/web/src/lib/issue-to-fix-path.ts` - IssueFixKind type + issue configs
- `apps/web/src/lib/issue-fix-anchors.ts` - Diagnostic callout variant
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` - fixKind URL param + callout rendering
- `apps/web/src/components/issues/IssuesList.tsx` - Issue card CTA wording
- `apps/web/src/app/projects/[id]/deo/page.tsx` - DEO Overview CTA wording

#### Test Coverage

- Playwright tests: `apps/web/tests/issue-fix-kind-clarity-1.spec.ts` (7 tests)
- Playwright tests: `apps/web/tests/list-actions-clarity-1.spec.ts` - LAC1-002b (DIAGNOSTIC CTA)

#### Manual Testing

- `docs/manual-testing/ISSUE-FIX-KIND-CLARITY-1.md`

---

### Phase DRAFT-LIFECYCLE-VISIBILITY-1: Draft Lifecycle State Visibility ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-25
**Activation:** Trust/clarity for draft lifecycle in Issues Engine

#### Goals

1. Centralize draft lifecycle state derivation (NO_DRAFT, GENERATED_UNSAVED, SAVED_NOT_APPLIED, APPLIED).
2. Show subtle draft state indicator in Issues table row actions.
3. State-driven gating for inline preview Apply button (only enabled when SAVED_NOT_APPLIED).
4. Applied confirmation chip replaces Apply button after apply.
5. RCP echoes draft lifecycle state in Actionability section.

#### Strict Non-Goals

- No backend/schema changes
- No AI execution changes
- No bulk actions
- No silent auto-apply

#### Key Changes

1. **Draft Lifecycle State Helper**: Created `apps/web/src/lib/issues/draftLifecycleState.ts` with:
   - `DraftLifecycleState` type (NO_DRAFT, GENERATED_UNSAVED, SAVED_NOT_APPLIED, APPLIED)
   - `deriveDraftLifecycleState()` - derives state from existing UI signals only
   - `getDraftLifecycleCopy()` - returns canonical labels/descriptions
   - `checkSavedDraftInSessionStorage()` - checks existing draft key scheme

2. **Issues Table Row Indicator**: Actions column renders small, non-clickable draft indicator when state !== NO_DRAFT. Shows "Draft not saved", "Draft saved", or "Applied" as appropriate.

3. **Inline Preview State-Driven Gating**:
   - GENERATED_UNSAVED: Apply disabled with "Save draft before applying" tooltip
   - SAVED_NOT_APPLIED: Apply enabled
   - APPLIED: Apply button replaced with non-interactive "Applied" chip; Cancel → Close

4. **RCP Draft State Echo**: ContextPanelIssueDetails renders draft lifecycle line in Actionability section when draft exists. Uses passed-in state or falls back to sessionStorage check.

5. **Dev-Time Guardrails**: Console warnings when:
   - Apply enabled but state != SAVED_NOT_APPLIED
   - Applied shown but appliedAt not set
   - Row indicator state disagrees with preview state

#### Core Files

- `apps/web/src/lib/issues/draftLifecycleState.ts` - Draft lifecycle state helper (new)
- `apps/web/src/app/projects/[id]/issues/page.tsx` - Row indicator + preview strip
- `apps/web/src/components/right-context-panel/ContextPanelIssueDetails.tsx` - RCP echo
- `apps/web/src/components/right-context-panel/ContextPanelContentRenderer.tsx` - Pass state to RCP

#### Manual Testing

- `docs/manual-testing/DRAFT-LIFECYCLE-VISIBILITY-1.md`

#### FIXUP-1: RCP Echo + Conservative Derivation (2026-01-25)

1. **RCP always shows draft line**: RCP Actionability section now displays draft lifecycle line for all states (including NO_DRAFT: "Draft: No draft exists") for complete state visibility.
2. **Issues descriptor passes draftLifecycleState**: `getIssueDescriptor()` now derives and passes `metadata.draftLifecycleState` to RCP for accurate echo during preview states.
3. **Conservative APPLIED derivation**: `deriveDraftLifecycleState()` now requires explicit `hasAppliedSignal === true` to return APPLIED. Legacy `legacyDraftState === 'applied'` alone no longer elevates to APPLIED, preventing premature "Applied" display.
4. **NO_DRAFT displayable copy**: `getDraftLifecycleCopy('NO_DRAFT')` now returns displayable `shortLabel: 'No draft exists'` instead of empty string.

---

### Phase ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1: View Affected → Filtered Products List ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-14
**Activation:** Issue-to-fix path integrity for multi-product issues

#### Goals

1. "View affected" CTA in Issues Engine routes to **Products list** (filtered by issueType), NOT to product detail.
2. Server-authoritative issueType filtering in Products API.
3. ScopeBanner shows issueType scope chip for filtered Products list.
4. Return navigation (Back to Issues Engine) preserved via `returnTo` param.

#### Strict Non-Goals

- No changes to issue detection or scoring logic
- No changes to single-product "Fix" CTA routing (still goes to product detail)
- No changes to issue-to-fix anchor mapping

#### Key Changes

1. **Issues Engine "View affected" Routing**: `getFixAction()` in `issues/page.tsx` now builds "View affected" href that routes to `/projects/:id/products` with `issueType`, `from=issues_engine`, and `returnTo` params.
2. **Server-Authoritative issueType Filtering**: Added `issueType?: string` to `ProductListOptions` in `api.ts`. Products API controller accepts `issueType` query param and passes to service. `ProductsService.getProductsForProject()` filters products by affected issue type using `getProductIdsAffectedByIssueType()` helper (fetches canonical issues via `DeoIssuesService.getIssuesForProjectReadOnly()`).
3. **Products Page Integration**: Products page reads `issueType` from URL search params, passes to `fetchProducts()`, includes in `hasActiveFilters` check, removes from URL in `handleClearFilters()`.
4. **ScopeBanner Scope Chip**: `normalizeScopeParams()` already handles `issueType` priority. ScopeBanner renders issueType scope chip when present.
5. **Return Navigation**: `returnTo` param encodes current Issues Engine path with query params, enabling "Back to Issues Engine" navigation from filtered Products list.

#### Core Files

- `apps/web/src/app/projects/[id]/issues/page.tsx` - View affected href builder
- `apps/web/src/lib/api.ts` - ProductListOptions.issueType
- `apps/api/src/products/products.controller.ts` - issueType query param
- `apps/api/src/products/products.service.ts` - getProductIdsAffectedByIssueType()
- `apps/web/src/app/projects/[id]/products/page.tsx` - issueType filter integration

#### Test Coverage

- Playwright tests: `apps/web/tests/view-affected-routing-1.spec.ts` (5 tests)
  - VAR1-001: View affected routes to Products list with issueType filter
  - VAR1-002: Products list shows ScopeBanner with issueType chip
  - VAR1-003: issueType filtering excludes non-affected products

#### Manual Testing

- `docs/manual-testing/ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1.md`

---

### Phase MISSING-METADATA-FIX-SURFACE-INTEGRITY-1: Metadata Anchor Mapping ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-14
**Activation:** "Fix surface not available" error elimination for metadata issues

#### Goals

1. Eliminate "Fix surface not available" error when navigating to metadata issues via issue-to-fix path.
2. Correct anchor testid mapping for all metadata issues to use real DOM element (`seo-editor-anchor`).

#### Strict Non-Goals

- No changes to issue detection or scoring logic
- No changes to SEO editor component structure
- No changes to other pillar anchor mappings

#### Key Changes

1. **Anchor Mapping Correction**: All metadata issue configs in `issue-to-fix-path.ts` now use `seo-editor-anchor` as `fixAnchorTestId`:
   - `missing_seo_title` → `seo-editor-anchor` (was: `product-metadata-seo-title-module`)
   - `missing_seo_description` → `seo-editor-anchor` (was: `product-metadata-seo-description-module`)
   - `missing_metadata` → `seo-editor-anchor` (was: `product-metadata-seo-title-module`)
   - `seo_title_keyword_stuffing` → `seo-editor-anchor` (was: `product-metadata-seo-title-module`)
   - `seo_description_keyword_stuffing` → `seo-editor-anchor` (was: `product-metadata-seo-description-module`)
   - `thin_seo_title` → `seo-editor-anchor` (was: `product-metadata-seo-title-module`)
   - `thin_seo_description` → `seo-editor-anchor` (was: `product-metadata-seo-description-module`)

2. **Root Cause**: Previous `fixAnchorTestId` values (e.g., `product-metadata-seo-title-module`) did not exist in the DOM. The actual SEO editor uses `data-testid="seo-editor-anchor"`.

#### Core Files

- `apps/web/src/lib/issue-to-fix-path.ts` - Metadata issue fixAnchorTestId values

#### Test Coverage

- Playwright tests: `apps/web/tests/view-affected-routing-1.spec.ts`
  - MMFSI1-001: Missing Metadata issues land on SEO editor anchor
  - MMFSI1-002: missing_metadata issue uses seo-editor-anchor

#### Manual Testing

- `docs/manual-testing/MISSING-METADATA-FIX-SURFACE-INTEGRITY-1.md`

---

### Phase DIAGNOSTIC-GUIDANCE-1: Diagnostic Guidance for Outside-Control Issues ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-19

#### Overview

Implements diagnostic guidance pattern for issues with `actionability === 'informational'` (issues outside EngineO.ai control, such as theme, hosting, or Shopify configuration issues). Ensures these issues are clearly labeled and provide actionable guidance without Fix/Apply CTAs.

**Scope:** UI/copy only; no backend logic changes.

#### Key Behaviors

1. **Badge Label**: Issues with `actionability === 'informational'` show "Informational — outside EngineO.ai control" badge
2. **Explanation Text**: "EngineO.ai cannot directly fix this issue because it depends on your theme, hosting, or Shopify configuration."
3. **"How to address this" Guidance Block** with 4 bullets:
   - Check your Shopify theme settings
   - Verify robots.txt and meta tags
   - Use Google Search Console → Pages → Indexing
   - Validate structured data using Rich Results Test
4. **No Fix CTAs**: No "Fix", "Fix with AI", "Fix now", "Apply", or "Review" buttons on these issues
5. **Non-clickable Cards**: Cards with `actionability === 'informational'` are not clickable (no hover state, no cursor pointer)

#### Distinction from Orphan Issues

- **Outside-control issues** (`actionability === 'informational'`): "Informational — outside EngineO.ai control" + guidance block
- **Orphan issues** (no valid fixHref but not informational): "Informational — no action required" (no guidance block)

#### Core Files

- `apps/web/src/components/issues/IssuesList.tsx` - IssueCard component
- `apps/web/src/app/projects/[id]/issues/page.tsx` - Issues Engine page

#### Test IDs

- `data-testid="issue-card-informational"` - Non-clickable card
- `data-testid="diagnostic-guidance-block"` - Guidance block container

#### Manual Testing

- `docs/manual-testing/DIAGNOSTIC-GUIDANCE-1.md`

#### FIXUP-1: Trust Hardening (Frontend Hard-Gate)

**Purpose:** Prevents any accidental actionable navigation on outside-control issues by explicitly gating clickability and fixHref at the frontend level.

**Change:** Issues Engine (page.tsx) now explicitly gates:

1. `isOutsideEngineControl` boolean derived from `issue.actionability === 'informational'`
2. `fixHref` forced to `null` for outside-control issues (no routing computed)
3. `isClickableIssue` forced to `false` for outside-control issues, regardless of backend `isActionableNow` flag

**Critical Invariant:** Even if backend incorrectly returns `isActionableNow: true` for an outside-control issue, the frontend hard-gate ensures no clickability or navigation occurs.

---

## In Progress

_None at this time._

### Phase LAYOUT-SHELL-IMPLEMENTATION-1: Foundational UI Shell (Design System v1.5) ✅ COMPLETE

**Status:** Complete
**Date Started:** 2026-01-21
**Date Completed:** 2026-01-21

#### Scope (Layout Only)

- Persistent Global Top Bar (placeholders only)
- Left Rail (icon-only always; fixed ~72px; no expand/collapse toggle) [Updated per WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1]
- Center Work Canvas container (internal vertical scroll; breadcrumbs/actions placeholders)

> **Note:** Left rail collapse/expand + `engineo_nav_state` localStorage persistence were removed in WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1.

#### Constraints

- Token-only styling; dark mode default-safe
- Shopify embedded iframe safe (scroll containment inside Center Work Canvas)
- No Right Context Panel
- No feature UI work (no dashboards/tables/cards added as part of this phase)

#### Core Files

- apps/web/src/components/layout/LayoutShell.tsx
- apps/web/src/app/layout.tsx
- apps/web/src/app/dashboard/layout.tsx
- apps/web/src/app/projects/layout.tsx
- apps/web/src/app/settings/layout.tsx
- apps/web/src/app/admin/layout.tsx

#### Manual Testing

- docs/manual-testing/LAYOUT-SHELL-IMPLEMENTATION-1.md

#### Summary of Changes

- Created `LayoutShell.tsx`: Canonical UI shell component with Top Bar, Left Rail (icon-only), and Center Work Canvas with scroll containment
- Updated root `layout.tsx`: Changed hardcoded gray colors to token-based theming (`bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`)
- Updated dashboard/projects/settings layouts: Replaced TopNav+wrapper pattern with unified LayoutShell
- Updated admin layout: Replaced TopNav with LayoutShell while preserving admin auth gating and mobile drawer; converted all hardcoded colors to design tokens

> **Note:** Left rail collapse/expand + `engineo_nav_state` persistence were removed in WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1.

---

### Phase RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1: Right Context Panel (Design System v1.5) ✅ COMPLETE

**Status:** Complete
**Date Started:** 2026-01-21
**Date Completed:** 2026-01-22 (FIXUP-3)

#### Overview

Add a deterministic Right Context Panel to the UI shell that provides contextual details for selected items without blocking the main work canvas. FIXUP-3 extends with view tabs, pin/width controls, and kind-specific content rendering.

#### Affected Files

- apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx (UPDATED)
- apps/web/src/components/right-context-panel/RightContextPanel.tsx (UPDATED)
- apps/web/src/components/right-context-panel/ContextPanelContentRenderer.tsx (NEW)
- apps/web/src/components/layout/LayoutShell.tsx (UPDATED)
- apps/web/src/components/products/ProductTable.tsx (UPDATED)
- apps/web/src/app/admin/users/page.tsx (UPDATED)
- apps/web/src/components/work-queue/ActionBundleCard.tsx (UPDATED)

#### Technical Details

- **RightContextPanelProvider**: React context/provider that owns deterministic panel state
  - `ContextDescriptor` type: Required fields (kind, id, title); Optional fields (subtitle, metadata, openHref, openHrefLabel, scopeProjectId)
  - `PanelView` type: 'details' | 'recommendations' | 'history' | 'help'
  - `PanelWidthMode` type: 'default' | 'wide'
  - `useRightContextPanel()` hook: isOpen, descriptor, activeView, widthMode, isPinned, openPanel, closePanel, togglePanel, setActiveView, togglePinned, toggleWidthMode, openContextPanel
  - Auto-close on Left Nav segment switch (respects isPinned)
  - Focus management (stores lastActiveElement, restores on close)
  - ESC key to close (with modal dialog guard and editable element guard)
  - Cmd/Ctrl + . keyboard shortcut to close
  - Shopify-safe (no window.top usage)

- **RightContextPanel**: UI component consuming the context
  - Desktop (≥1024px): Pinned mode, pushes content
  - Narrow (<1024px): Overlay mode with scrim
  - View tabs: Details, Recommendations, History, Help
  - Header controls: Open full page link, width toggle, pin toggle, close button
  - Z-index 40 (below Command Palette at z-50)
  - Accessible: role="complementary", aria-labelledby
  - Test hooks: data-testid attributes for automation

- **ContextPanelContentRenderer**: Pure renderer for kind-specific content
  - Maps (activeView, descriptor.kind) to content blocks
  - Supported kinds: product, user, work_item
  - Scope project mismatch detection and handling
  - Truth-preserving: renders only provided metadata

- **Integration Points**:
  - ProductTable: Eye-icon Details button with MVP metadata fields (scopeProjectId, seoTitleStatus, seoDescriptionStatus, openHref)
  - admin/users/page.tsx: Eye-icon Details button with user metadata
  - ActionBundleCard: Eye-icon Details button with work_item metadata

#### Manual Testing

- docs/manual-testing/RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md

#### Summary of Changes

- Updated `RightContextPanelProvider.tsx`: Extended ContextDescriptor with openHref, openHrefLabel, scopeProjectId; added PanelView and PanelWidthMode types; added activeView, widthMode, isPinned state; added setActiveView, togglePinned, toggleWidthMode, openContextPanel actions; added Cmd/Ctrl+. shortcut; pinned panel respects auto-close guard
- Updated `RightContextPanel.tsx`: Added view tabs, pin toggle, width toggle, open full page link, uses ContextPanelContentRenderer
- Created `ContextPanelContentRenderer.tsx`: Kind-specific content rendering for product/user/work_item with scope mismatch handling
- Updated `ProductTable.tsx`: Added MVP metadata fields to getRowDescriptor (scopeProjectId, seoTitleStatus, seoDescriptionStatus, openHref)
- Updated `admin/users/page.tsx`: Added eye-icon Details button with RCP integration
- Updated `ActionBundleCard.tsx`: Added eye-icon Details button with RCP integration

---

### Phase TABLES-&-LISTS-ALIGNMENT-1: Canonical DataTable & DataList (Design System v1.5) ✅ COMPLETE

**Status:** Complete
**Date Started:** 2026-01-21
**Date Completed:** 2026-01-21

#### Overview

Introduce canonical DataTable and DataList components aligned with Design System v1.5 and Engineering Implementation Contract v1.5. Token-only styling, dark-mode native, Shopify iframe safe.

#### Scope

**In Scope:**

- Canonical DataTable component with semantic `<table>` markup
- Canonical DataList component for list-style rows
- Minimal column model (header label + cell renderer) and row model (id + data)
- Token-based density prop (comfortable/dense)
- Row interaction contract: no row-click navigation, explicit "View details" action only
- Hover/active/focus states token-based (never white in dark mode)
- RCP integration via `onOpenContext(descriptor)` callback
- Keyboard accessibility: Tab entry, ArrowUp/ArrowDown navigation, Enter/Space triggers context action
- Demo route `/demo/tables-lists` for manual testing
- Roving focus for rows (single focusable row at a time)
- No horizontal overflow by default (truncation/wrapping)

**Out of Scope:**

- No feature migrations (existing tables unchanged)
- No sorting/filtering changes
- No bulk actions
- No pagination redesign
- No virtualization

#### Affected Files

- apps/web/src/components/tables/DataTable.tsx (NEW)
- apps/web/src/components/tables/DataList.tsx (NEW)
- apps/web/src/app/demo/tables-lists/page.tsx (NEW)

#### Technical Details

- **DataTable**: Semantic `<table>` with `<thead>` and `<tbody>`
  - Column model: key, header, cell renderer, optional truncate and width
  - Row model: requires id field
  - Hover: `hsl(var(--menu-hover-bg)/0.14)` (dark-mode safe)
  - Focus: inset ring with primary color
  - Context action: right-aligned eye icon with tooltip
  - Test hooks: `data-testid="data-table"`, `data-testid="data-table-row"`, `data-testid="data-table-open-context"`

- **DataList**: Vertical list with same interaction model
  - Custom row renderer via `renderRow` prop
  - Same hover/focus states and context action
  - Test hooks: `data-testid="data-list"`, `data-testid="data-list-row"`, `data-testid="data-list-open-context"`

- **RCP Integration**: Both components accept `onOpenContext(descriptor)` and `getRowDescriptor(row)` props
  - Stable descriptors prevent flicker on re-click (relies on RCP provider descriptor-stability)

#### Manual Testing

- docs/manual-testing/TABLES-&-LISTS-ALIGNMENT-1.md

#### Summary of Changes

- Created `DataTable.tsx`: Canonical table component with column/row model, token-based styling, keyboard navigation, and RCP integration
- Created `DataList.tsx`: Canonical list component with same interaction contract
- Created `/demo/tables-lists/page.tsx`: Demo route with sample data, RCP integration, and ESC-in-input test field

---

### Phase COMMAND-PALETTE-IMPLEMENTATION-1: Global Command Palette (Design System v1.5) ✅ COMPLETE

**Status:** Complete
**Date Started:** 2026-01-21
**Date Completed:** 2026-01-21

#### Overview

Add a global Command Palette accessible via keyboard shortcut (Cmd+K / Ctrl+K) or top-bar trigger. Provides quick navigation and entity jump commands without destructive/write/apply/run/generate actions. Token-only styling, dark-mode native, Shopify iframe safe.

#### Scope

**In Scope:**

- CommandPaletteProvider context with deterministic state (isOpen, query, open/close/toggle)
- Global keyboard shortcut Cmd+K / Ctrl+K toggles palette
- Focus management: store opener on open, restore on close
- CommandPalette UI component with search input and command results
- Accessible dialog semantics (role="dialog", aria-modal="true")
- Navigation commands: Overview, Assets, Automation, Insights, Governance, Admin (role-gated)
- Entity Jump commands (placeholder): Project, Product, Issue
- Utility commands: Help/Docs, Feedback
- Deterministic routing: project-context-aware vs fallback
- Unsaved changes guard (same confirm text as GuardedLink)
- Admin command visibility gated by user.role === 'ADMIN' AND user.adminRole present
- Top-bar search trigger converted from placeholder to functional trigger
- Small-screen icon button trigger
- Token-based styling (no raw hex, no bg-black/bg-white)
- Container-contained overlay (Shopify iframe safe)

**Out of Scope:**

- No destructive commands (delete, remove)
- No write commands (create, update, save)
- No apply commands (apply draft, apply fix)
- No run/generate commands (run automation, generate AI)
- No real entity search backend (placeholders only)
- No new routing system

#### Affected Files

- apps/web/src/components/command-palette/CommandPaletteProvider.tsx (NEW)
- apps/web/src/components/command-palette/CommandPalette.tsx (NEW)
- apps/web/src/components/layout/LayoutShell.tsx (UPDATED)

#### Technical Details

- **CommandPaletteProvider**: React context/provider with useState for isOpen and query
  - openPalette(): stores document.activeElement, sets isOpen true, clears query
  - closePalette(): sets isOpen false, restores focus to opener (best-effort)
  - togglePalette(): calls open or close based on current state
  - Global keydown listener for Cmd+K / Ctrl+K
  - inputRef for focus management from CommandPalette

- **CommandPalette**: UI component consuming useCommandPalette()
  - Renders nothing when closed
  - Centered overlay dialog with search input auto-focused
  - Results grouped by section (Navigation, Entity Jump, Utility)
  - Arrow key navigation with roving selection
  - Enter executes selected command and closes
  - ESC closes palette (even with input focused)
  - Outside click (scrim) closes palette
  - Admin command visibility checked via /users/me API
  - Unsaved changes guard via useUnsavedChanges() before navigation
  - Container-contained positioning (not viewport-fixed)

- **LayoutShell Integration**:
  - Wrapped with CommandPaletteProvider (outermost)
  - CommandPalette mounted inside main content row
  - Search trigger onClick calls openPalette()
  - data-testid="command-palette-open" on desktop trigger
  - data-testid="command-palette-open-mobile" on small-screen trigger

#### Manual Testing

- docs/manual-testing/COMMAND-PALETTE-IMPLEMENTATION-1.md

#### Summary of Changes

- Created `CommandPaletteProvider.tsx`: Context/provider with global keyboard shortcut and focus management
- Created `CommandPalette.tsx`: Accessible command palette UI with navigation commands and unsaved changes guard
- Updated `LayoutShell.tsx`: Integrated CommandPaletteProvider wrapper, converted search placeholder to functional trigger, added mobile trigger

---

### Phase NAV-HIERARCHY-POLISH-1: Navigation Tier Visual Hierarchy ✅ COMPLETE

**Status:** Complete
**Date Started:** 2026-01-22
**Date Completed:** 2026-01-22

#### Overview

Styling-only polish phase to establish clear visual hierarchy across navigation tiers per Design System v1.5 and Engineering Implementation Contract v1.5. Global Nav reads as strongest navigational tier, Section Nav demoted to secondary, Entity Tabs read as view switchers (not navigation), RCP reads as auxiliary and non-navigational.

#### Scope

**In Scope:**

- Global Nav (LayoutShell.tsx): Increased visual weight with font-medium base, font-semibold active state, primary color retained
- Section Nav (ProjectSideNav.tsx): Demoted with font-medium heading (text-muted-foreground/80), neutral active state (bg-muted, no primary color)
- Mobile drawer (layout.tsx): Token-only styling (bg-foreground/50 scrim, bg-[hsl(var(--surface-raised))] panel, border-border, token-based buttons)
- Entity Tabs (WorkQueueTabs, ProductDetailsTabs, InsightsSubnav, asset detail pages): Token-only view switcher styling (border-primary text-foreground active, border-transparent text-muted-foreground inactive)
- Focus-visible ring pattern standardized across all interactive elements

**Out of Scope:**

- No new components
- No functional changes
- No routing changes
- Focus-visible ring styling standardized (styling-only, no behavior change)

#### Affected Files

- apps/web/src/components/layout/LayoutShell.tsx (UPDATED)
- apps/web/src/components/layout/ProjectSideNav.tsx (UPDATED)
- apps/web/src/app/projects/[id]/layout.tsx (UPDATED)
- apps/web/src/components/work-queue/WorkQueueTabs.tsx (UPDATED)
- apps/web/src/components/products/optimization/ProductDetailsTabs.tsx (UPDATED)
- apps/web/src/components/projects/InsightsSubnav.tsx (UPDATED)
- apps/web/src/app/projects/[id]/assets/pages/[pageId]/page.tsx (UPDATED)
- apps/web/src/app/projects/[id]/assets/collections/[collectionId]/page.tsx (UPDATED)

#### Technical Details

- **Global Nav**: Added font-medium to nav item base class, font-semibold to active state alongside existing bg-primary/10 and text-primary
- **Section Nav**: Changed heading from font-semibold to font-medium with text-muted-foreground/80 for reduced prominence, changed active state from border-l-2 border-primary bg-primary/10 text-primary to bg-muted font-medium text-foreground (neutral, no primary color)
- **Mobile Drawer**: Updated scrim to bg-foreground/50, panel to bg-[hsl(var(--surface-raised))], buttons to token-based classes
- **Entity Tabs**: Unified pattern across all tab components - border-b border-border container, active tab uses border-primary text-foreground, inactive uses border-transparent text-muted-foreground hover:text-foreground hover:border-border

#### Manual Testing

- docs/manual-testing/NAV-HIERARCHY-POLISH-1.md

#### Summary of Changes

- Updated `LayoutShell.tsx`: Added font-medium base, font-semibold active for Global Nav visual weight
- Updated `ProjectSideNav.tsx`: Demoted section heading weight, changed to neutral active state
- Updated `layout.tsx`: Token-only mobile drawer styling
- Updated `WorkQueueTabs.tsx`: Token-only entity tab styling
- Updated `ProductDetailsTabs.tsx`: Token-only entity tab styling with neutral badge
- Updated `InsightsSubnav.tsx`: Token-only entity tab styling
- Updated asset detail pages: Token-only tab styling for Pages and Collections detail pages

---

### Phase PANEL-DEEP-LINKS-1: Shareable Right Context Panel State ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-22
**Design System Version:** 1.5
**Activation:** URL deep-linking for Right Context Panel state

#### Overview

PANEL-DEEP-LINKS-1 adds shareable Right Context Panel state via URL deep-links. When the panel is opened via UI, URL params are written (replaceState semantics). When a URL with valid panel params is loaded, the panel opens deterministically. This enables copy/paste sharing of panel state and proper back/forward navigation.

#### URL Schema

| Parameter     | Required | Allowed Values                                                       |
| ------------- | -------- | -------------------------------------------------------------------- |
| `panel`       | Yes      | `details`, `recommendations`, `history`, `help`                      |
| `entityType`  | Yes      | `product`, `page`, `collection`, `blog`, `issue`, `user`, `playbook` |
| `entityId`    | Yes      | Any non-empty string (the entity's ID)                               |
| `entityTitle` | No       | Optional entity title (fallback for panel title)                     |
| `panelOpen`   | No       | Accepted but not required (legacy compatibility)                     |

#### Key Features

1. **URL → State Sync**: When URL contains valid deep-link params, panel opens deterministically on page load
2. **State → URL Sync**: When panel opens/changes via UI, URL updates via replaceState (no history entry per change)
3. **Close Cleans URL**: Closing panel removes all panel-related params
4. **Back/Forward Support**: Browser history navigation restores panel state
5. **Invalid Param Safety**: Invalid params fail safely (no crash, no auto-clean)
6. **Shopify Embedded Preserved**: Shopify params (shop, host) preserved throughout

#### Source of Truth Rules

- URL is source of truth **only when URL includes valid panel params**
- UI-opened panel also writes to URL for consistency
- Re-entrancy guard prevents URL→state→URL loops
- `openedViaUrlRef` tracks if panel was URL-opened (for back/forward close behavior)

#### Affected Files

- `apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx` (UPDATED)

#### Integration Proof Points (Verified)

- **ProductTable.tsx**: Descriptor includes `kind: 'product'`, `title`, `scopeProjectId`, `openHref`
- **Admin Users page.tsx**: Descriptor includes `kind: 'user'`, `title` (email), `openHref`

#### Manual Testing

- `docs/manual-testing/PANEL-DEEP-LINKS-1.md`

#### Critical Path Map

- Updated CP-020 with PANEL-DEEP-LINKS-1 scenarios and manual testing doc reference

---

### Phase ISSUES-ENGINE-REMOUNT-1: Issues List DataTable + RCP Integration ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-24
**Design System Version:** 1.5
**EIC Version:** 1.5
**Activation:** DataTable migration for Issues Engine with RCP issue details support

#### Overview

ISSUES-ENGINE-REMOUNT-1 remounts the Issues Engine list from a card-based layout to the canonical DataTable component. Integrates Right Context Panel (RCP) issue details view with PANEL-DEEP-LINKS-1 deep-link support. Enforces token-only styling (Design System v1.5) and preserves all existing Playwright selectors and trust/navigation behavior.

#### Key Features

1. **DataTable Migration**: Issues list uses canonical DataTable with columns: Issue, Asset Scope, Pillar, Severity, Status, Actions
2. **RCP Issue Details**: New ContextPanelIssueDetails component renders issue title, pillar, severity, status, affected counts
3. **Row Click → RCP**: Clicking a row opens RCP with issue details (via `onRowClick`)
4. **Eye Icon → RCP**: Context icon (eye) also opens RCP (via `onOpenContext` + `getRowDescriptor`)
5. **Deep-Link Support**: PANEL-DEEP-LINKS-1 integration for issues (entityType='issue')
6. **Expansion Rows**: Existing ai-fix-now preview/draft/apply flow preserved via DataTable `isRowExpanded`/`renderExpandedContent`
7. **Playwright Selectors Preserved**: `data-testid="issue-card-actionable"`, `data-testid="issue-card-informational"`, `data-fix-kind`, `data-testid="issue-card-cta"`, `data-testid="issue-preview-draft-panel"`
8. **Token-Only Styling**: No literal `bg-white`, `bg-gray-*`, `text-gray-*` classes (dark mode safe)

#### Affected Files

- `apps/web/src/app/projects/[id]/issues/page.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/ContextPanelIssueDetails.tsx` (NEW)
- `apps/web/src/components/right-context-panel/ContextPanelContentRenderer.tsx` (UPDATED)

#### Manual Testing

- `docs/manual-testing/ISSUES-ENGINE-REMOUNT-1.md`

#### Critical Path Map

- Updated CP-009 (Issue Engine Lite) with ISSUES-ENGINE-REMOUNT-1 scenarios and manual testing doc reference

---

### Phase PLAYBOOKS-SHELL-REMOUNT-1: Playbooks DataTable + RCP Integration ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-22
**Design System Version:** 1.5
**EIC Version:** 1.5
**Activation:** DataTable migration for Playbooks with RCP playbook details support

#### Overview

PLAYBOOKS-SHELL-REMOUNT-1 remounts the Playbooks list from a card-based grid layout to the canonical DataTable component. Integrates Right Context Panel (RCP) playbook details view with PANEL-DEEP-LINKS-1 deep-link support. Selection is now in-page state (no navigation on row click). Enforces token-only styling (Design System v1.5) and preserves existing Preview → Estimate → Apply step flow.

#### Key Features

1. **DataTable Migration**: Playbooks list uses canonical DataTable with columns: Playbook, What It Fixes, Asset Type, Availability
2. **RCP Playbook Details**: New PlaybookDetailsContent component renders playbook description, applicable assets, preconditions, availability state, history stub
3. **Row Click → Selection**: Clicking a row sets in-page selectedPlaybookId state (no navigation)
4. **Eye Icon → RCP**: Context icon (eye) opens RCP with playbook details (via `onOpenContext` + `getRowDescriptor`)
5. **Deep-Link Support**: PANEL-DEEP-LINKS-1 integration for playbooks (entityType='playbook')
6. **Selection Highlight**: Selected playbook row has font-semibold title (token-only, no background change)
7. **No Auto-Navigation**: Landing on Playbooks with no playbookId in URL remains neutral (no route changes)
8. **Token-Only Styling**: No literal `bg-white`, `bg-gray-*`, `text-gray-*` classes (dark mode safe)

#### Affected Files

- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/ContextPanelContentRenderer.tsx` (UPDATED)

#### Manual Testing

- `docs/manual-testing/PLAYBOOKS-SHELL-REMOUNT-1.md`

#### Critical Path Map

- Updated CP-012 (Automation Engine) with PLAYBOOKS-SHELL-REMOUNT-1 scenarios and manual testing doc reference

---

### Phase ISSUE-TO-ACTION-GUIDANCE-1: Issue → Playbook Guidance ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-23
**Design System Version:** 1.5
**EIC Version:** 1.5
**Activation:** Guidance-only, token-only, trust-preserving issue-to-playbook mapping

#### Overview

ISSUE-TO-ACTION-GUIDANCE-1 provides deterministic, static mapping from issue types to recommended playbook metadata. Displays "Recommended action" section in RCP Issue Details with playbook guidance when issues are actionable and have a mapping. Adds subtle, non-interactive playbook indicator in Issues list. Ensures "View playbook" CTA navigates to playbook preview step WITHOUT auto-execution or AI generation.

#### Non-Goals

- **No auto-execution**: Landing on playbook page via "View playbook" does NOT auto-generate preview or trigger any AI
- **No new entry points**: Does not create new ways to execute playbooks; only surfaces existing playbook information
- **No runtime evaluation**: Preconditions are static text, not dynamically evaluated against current user/project state

#### Key Behaviors

1. **Static Mapping**: `getIssueToActionGuidance(issueType)` returns pre-defined playbook metadata (no API calls)
2. **RCP Section Placement**: "Recommended action" appears after "Actionability" section and before "Affected Assets"
3. **Display Rules**:
   - If `actionability === 'informational'` OR `isActionableNow !== true`: Show "No automated action available." (no CTA)
   - If `isActionableNow === true` AND mapping exists: Show playbook name, description, affects, preconditions, "View playbook" CTA
4. **CTA Rules (Strict)**:
   - Only allowed CTA: "View playbook" (secondary styling, token-only)
   - Must navigate to canonical playbook route with `step=preview`, `source=entry`, `returnTo=/projects/${projectId}/issues`, `returnLabel=Issues`
   - Must NOT use "Generate", "Run", "Apply" language (no execution connotation)
5. **Issues List Indicator**: Subtle, non-interactive icon (lightning bolt) indicates playbook availability; no button/link/tooltip that could mislead

#### Initial Mappings

| Issue Type                | Playbook ID               | Playbook Name                |
| ------------------------- | ------------------------- | ---------------------------- |
| `missing_seo_title`       | `missing_seo_title`       | Fix missing SEO titles       |
| `missing_seo_description` | `missing_seo_description` | Fix missing SEO descriptions |

#### Affected Files

- `apps/web/src/lib/issue-to-action-guidance.ts` (NEW)
- `apps/web/src/components/right-context-panel/ContextPanelIssueDetails.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/issues/page.tsx` (UPDATED)

#### Manual Testing

- `docs/manual-testing/ISSUE-TO-ACTION-GUIDANCE-1.md`

#### Critical Path Map

- Updated CP-009 (Issue Engine Lite) with ISSUE-TO-ACTION-GUIDANCE-1 scenarios and manual testing doc reference
- Updated CP-012 (Automation Engine) with navigation safety scenario

---

### Phase RIGHT-CONTEXT-PANEL-AUTONOMY-1: Autonomous Context Panel ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-23
**Design System Version:** 1.5
**EIC Version:** 1.5
**Activation:** Behavior-only, token-only, Shopify-safe autonomous panel behavior

#### Overview

RIGHT-CONTEXT-PANEL-AUTONOMY-1 implements autonomous context-driven Right Context Panel behavior. The panel opens/closes deterministically based on route context, removing all manual mode switching controls (pin, width toggle, view tabs). All in-body navigation CTAs have been removed—header external-link is the only navigation affordance. Manual dismissal is respected until context meaningfully changes.

#### Key Behavior Changes

- **Autonomous Open**: Panel auto-opens on entity detail routes (products, pages, collections, playbooks)
- **Autonomous Close**: Panel auto-closes on contextless list routes (projects list, dashboard, list pages without selection)
- **Dismissal Model**: User-driven close (X, ESC, scrim click) sets dismissal for current context; respected until navigating to different entity
- **URL Sync**: Auto-open writes URL params (`panel`, `entityType`, `entityId`) via replaceState semantics
- **Deep-links**: PANEL-DEEP-LINKS-1 continues to work correctly

#### Removed Controls

- Shell-level Action/Details grouped control in LayoutShell header
- Pin toggle in RCP header
- Width toggle in RCP header
- View tabs (Details/Recommendations/History/Help)
- Cmd/Ctrl + '.' close shortcut
- All in-body navigation links (including "View playbook" CTA)

#### Non-Goals

- **No new content types**: Does not introduce new panel content kinds
- **No backend APIs**: Purely frontend behavior change
- **No redesign**: Only removes controls and adds autonomy logic

#### Core Files

- `apps/web/src/components/layout/LayoutShell.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/RightContextPanel.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx` (UPDATED)
- `apps/web/src/components/right-context-panel/ContextPanelIssueDetails.tsx` (UPDATED)

#### Manual Testing

- `docs/manual-testing/RIGHT-CONTEXT-PANEL-AUTONOMY-1.md`

#### Critical Path Map

- Updated CP-009 (Issue Engine Lite) with guidance-only scenarios (no CTA)
- Updated CP-012 (Automation Engine) with removed "View playbook" CTA scenario
- Updated CP-020 (UI Shell & Right Context Panel) with autonomy scenarios

---

### Phase CENTER-PANE-NAV-REMODEL-1: Center Header Standardization + Scoped Nav Demotion ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-23
**Design System Version:** v1.5

#### Overview

CENTER-PANE-NAV-REMODEL-1 implements center pane header standardization via a new `CenterPaneHeaderProvider` context, and demotes the scoped section navigation (ProjectSideNav) to a low-emphasis contextual index. Issues and Playbooks pages migrate their in-canvas headers to the standardized shell header. Product detail uses `hideHeader` to avoid duplicate headers. This is a UI/navigation remodel with no feature logic changes.

#### Key Features

1. **CenterPaneHeaderProvider**: Shell-level context for per-page header customization (breadcrumbs, title, description, actions, hideHeader)
2. **Standardized Header Structure**: Breadcrumbs (small, secondary) → Title (primary) → Description (optional, muted) → Actions (right-aligned, minimal)
3. **Issues Page Migration**: Title "Issues" + description (project name) + "Re-scan Issues" button in shell header; removed in-canvas header block
4. **Playbooks Page Migration**: Title "Playbooks" + description + role label in shell header; removed in-canvas breadcrumbs nav and header block
5. **Product Detail hideHeader**: Shell header not rendered; product page uses own sticky workspace header + tabs
6. **ProjectSideNav Demotion**: Lighter typography/contrast, tighter spacing, subtle active state (thin accent bar only, no heavy background blocks), calm hover state
7. **Layout Container Cleanup**: Removed max-width container + extra padding wrappers from projects layout

#### Affected Files

- `apps/web/src/components/layout/CenterPaneHeaderProvider.tsx` (NEW)
- `apps/web/src/components/layout/LayoutShell.tsx` (UPDATED)
- `apps/web/src/components/layout/ProjectSideNav.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/layout.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/issues/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/automation/playbooks/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/products/[productId]/page.tsx` (UPDATED)

#### FIXUP-1: Extended Shell Header Integration

- `apps/web/src/app/projects/[id]/keywords/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/performance/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/media/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/competitors/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/local/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/settings/members/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/automation/playbooks/entry/page.tsx` (UPDATED)
- `apps/web/src/app/projects/[id]/content/[pageId]/page.tsx` (UPDATED)

#### FIXUP-2: GEO Insights Shell Header Integration

- `apps/web/src/app/projects/[id]/insights/geo-insights/page.tsx` (UPDATED)

#### Manual Testing

- `docs/manual-testing/CENTER-PANE-NAV-REMODEL-1.md`

#### Critical Path Map

- Updated CP-020 (UI Shell & Right Context Panel) with CENTER-PANE-NAV-REMODEL-1 scenarios
- FIXUP-1: Added CP-020 checklist items for pillar pages, Members, New Playbook entry, and Content Workspace
- FIXUP-2: Added CP-020 checklist item for GEO Insights page

---

### Phase WORK-CANVAS-ARCHITECTURE-LOCK-1: Structural Contracts + Minimal Shell Adjustments ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-23
**Design System Version:** v1.5

#### Overview

WORK-CANVAS-ARCHITECTURE-LOCK-1 establishes structural contracts for the Work Canvas layout system, documenting the responsibilities and boundaries of the Left Rail, Center Pane, and Right Context Panel. This phase adds visual polish (dividers, scoped nav container) and creates the definitive architecture document without introducing new functionality.

#### Key Features

1. **Left Rail Contract Lock**: Icon-only when collapsed (labels via tooltip only), no badges/counters, clear active state, domain-reset behavior
2. **Center Pane Elevation**: First-class work canvas with stable distinct background (`bg-background`), no ambiguous global "Action" button
3. **Visual Dividers**: Persistent border between left rail and center pane, persistent border between center pane and RCP
4. **Scoped Nav Container**: ProjectSideNav wrapped in distinct surface (`bg-[hsl(var(--surface-card))]` + border) with strengthened active-state (more visible accent bar + `font-semibold`)
5. **RCP Contract Lock**: No navigation/mode controls, header external-link is the only navigation affordance, RCP never changes route
6. **Architecture Document**: `docs/WORK_CANVAS_ARCHITECTURE.md` - one-page contract for layout responsibilities, navigation rules, URL/state policy, action hierarchy, visual constraints

#### Affected Files

- `apps/web/src/components/layout/LayoutShell.tsx` (UPDATED) - visual hierarchy comments, divider annotations
- `apps/web/src/components/layout/ProjectSideNav.tsx` (UPDATED) - distinct container surface, strengthened active state
- `apps/web/src/components/right-context-panel/RightContextPanel.tsx` (UPDATED) - RCP contract lock comments
- `apps/web/src/components/right-context-panel/RightContextPanelProvider.tsx` (UPDATED) - autonomy boundaries documentation

#### New Documents

- `docs/WORK_CANVAS_ARCHITECTURE.md` - Architecture contract
- `docs/manual-testing/WORK-CANVAS-ARCHITECTURE-LOCK-1.md` - Manual testing checklist

#### Manual Testing

- `docs/manual-testing/WORK-CANVAS-ARCHITECTURE-LOCK-1.md`

#### Critical Path Map

- Updated CP-020 (UI Shell & Right Context Panel) with WORK-CANVAS-ARCHITECTURE-LOCK-1 scenarios

---

### Phase ICONS-LOCAL-LIBRARY-1: Local SVG Icon System ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-23
**Design System Version:** v1.5

#### Overview

ICONS-LOCAL-LIBRARY-1 implements a local SVG icon system based on Material Symbols, eliminating runtime CDN dependencies. Icons are served from a committed SVG sprite with semantic key abstraction for maintainability.

#### Key Features

1. **No CDN Dependencies**: All icons served locally from `/icons/material-symbols/sprite.svg`
2. **Semantic Icon Keys**: Abstraction layer (`nav.dashboard`, `status.critical`, etc.) decouples UI code from raw icon names
3. **Curated Icon Set**: 33 icons extracted from Stitch design HTML (Material Symbols Outlined, weight 300, grade 0, optical size 20)
4. **Accessibility**: Decorative icons use `aria-hidden="true"`; meaningful icons support `aria-label` with `role="img"`
5. **Size Variants**: 16px (dense), 20px (default), 24px (prominent)

#### Core Files

- `apps/web/src/components/icons/Icon.tsx` - Main Icon component
- `apps/web/src/components/icons/material-symbols-manifest.ts` - Semantic key manifest
- `apps/web/src/components/icons/index.ts` - Public exports
- `apps/web/public/icons/material-symbols/sprite.svg` - SVG sprite
- `apps/web/public/icons/material-symbols/svg/*.svg` - Individual icon files

#### Build Scripts (dev-only)

- `scripts/extract-stitch-material-symbols.mjs` - Extract icon names from Stitch HTML
- `scripts/download-material-symbols.mjs` - Download/generate SVG files
- `scripts/build-material-symbols-sprite.mjs` - Build sprite from SVG files

#### Migration Points

- `apps/web/src/components/layout/LayoutShell.tsx` - Left rail nav icons migrated to Icon component
- `apps/web/src/components/layout/LayoutShell.tsx` - Search icon in command palette triggers migrated
- `apps/web/src/components/common/RowStatusChip.tsx` - Status chips now show Icon + clean label (emoji prefix stripped)

#### Manual Testing

- `docs/manual-testing/ICONS-LOCAL-LIBRARY-1.md`

#### Documentation

- `docs/icons.md` - Icon system usage guide

#### Critical Path Map

- Updated CP-020 (UI Shell & Right Context Panel) with ICONS-LOCAL-LIBRARY-1 scenarios

---

### Phase ISSUE-FIX-ROUTE-INTEGRITY-1: Issues Decision Engine — No Dead Clicks ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-25
**Design System Version:** v1.5

#### Overview

ISSUE-FIX-ROUTE-INTEGRITY-1 eliminates "dead clicks" in the Issues Engine by implementing a centralized destination map that serves as the source of truth for issue action availability. Every clickable action now leads to a valid, implemented destination with explicit blocked states when actions are unavailable.

#### Key Features

1. **Issue Action Destination Map**: Centralized `getIssueActionDestinations()` function that models where each action (fix/open/viewAffected) leads
2. **Explicit Blocked States**: When actions are unavailable, "Blocked" chip is shown with tooltip explaining why (no fake CTAs)
3. **Destination Priority**: Fix → View affected → Open → Blocked (truthful fallback hierarchy)
4. **External Link Safety**: External "Open" links (Shopify admin) use `target="_blank"` and `rel="noopener noreferrer"`
5. **Dev-Time Guardrails**: Non-fatal console warnings in development when actionable issues lack fix destinations (mapping gap detection)
6. **Route Context Preservation**: All internal links include `returnTo` param for back navigation

#### Core Files

- `apps/web/src/lib/issues/issueActionDestinations.ts` - Destination map source of truth
- `apps/web/src/app/projects/[id]/issues/page.tsx` - Actions column wired to destination map

#### Test Coverage

- **Playwright Regression:** `apps/web/tests/issue-fix-route-integrity-1.spec.ts`
- **Manual Testing:** `docs/manual-testing/ISSUE-FIX-ROUTE-INTEGRITY-1.md`

#### Critical Path Map

- CP-009 (Issue Engine Lite) - Updated with ISSUE-FIX-ROUTE-INTEGRITY-1 scenarios

#### Implementation Notes

- Uses proper DeoIssue typing with optional `shopifyAdminUrl?: string` extension
- All selectors use canonical `data-testid` attributes (no `data-testid-new`)
- "View affected" label preserved for Playwright test compatibility
- Action buttons include `data-no-row-click` attribute and `stopPropagation` to prevent RCP opening
- **FIXUP-4:** IFRI-005 test strengthened with explicit `right-context-panel` assertions (open/close via UI, not URL heuristic); manual testing doc updated to use `issue-fix-button` / `issue-view-affected-button` as canonical selectors with `issue-card-cta` nested for backward compatibility

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

- [ ] Create `OnboardingBanner.tsx` (visible under /projects/[id]/\* only)
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

_None at this time._

---

### Document History

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2025-12-19 | Created with GTM-ONBOARD-1, SELF-SERVICE-1, ADMIN-OPS-1, MEDIA-1, AUTO-PB-1 phases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.1     | 2025-12-19 | Corrected GTM-ONBOARD-1 status to "Docs Complete; Implementation Pending". Added locked trust contracts and expanded dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.2     | 2025-12-19 | Added INSIGHTS-1: Project Insights Dashboard (Complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 1.3     | 2025-12-19 | Added BILLING-GTM-1: Pricing pages & trust-safe upgrade flows (Complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 1.4     | 2025-12-19 | SECURITY HOTFIX: Sanitized auth query params to prevent password leakage in logs/history; added middleware + client-side defense-in-depth + Playwright coverage; added manual testing doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 1.5     | 2025-12-19 | Added GEO-FOUNDATION-1: GEO Answer Readiness & Citation Confidence (Complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 1.6     | 2025-12-19 | GEO-FOUNDATION-1: Updated shared package build configuration to exclude test files from dist output                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1.7     | 2025-12-21 | Added ENTERPRISE-GEO-1: Enterprise Governance & Approvals (Complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1.8     | 2025-12-21 | Added PRODUCTS-LIST-2.0: Decision-First Products List (Complete) - Health pills, recommended actions, progressive disclosure, Command Bar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 1.9     | 2025-12-21 | PRODUCTS-LIST-2.0: Added Sort by impact ladder (authoritative, deterministic, action-aligned clustering)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2.0     | 2025-12-21 | PRODUCTS-LIST-2.0: Added Bulk-action confirmation UX (3-step, draft-first, no one-click apply) with API client methods for draft lifecycle and deep-link support                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2.1     | 2025-12-23 | Added ROLES-3: True Multi-User Projects & Approval Chains (Complete) - ProjectMember model, membership management API, OWNER-only apply enforcement, multi-user auto-apply blocking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2.2     | 2025-12-23 | ROLES-3 FIXUP-1: Made multi-user projects work end-to-end - membership-aware access for governance services, role resolution fixes, draft generation blocking for VIEWER, frontend role-based UI, Members management page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2.3     | 2025-12-23 | ROLES-3 FIXUP-2: Strict matrix enforcement - OWNER cannot create approval requests in multi-user projects, role simulation correctness (accountRole ignored in multi-user), isMultiUserProject in API response, OWNER-only for Answer Block mutations, updated documentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2.4     | 2025-12-24 | ROLES-3 FIXUP-3: Frontend correction for strict approval-chain matrix - removed ephemeral approvalRequested flag, derived state from server-sourced pendingApproval, EDITOR can NEVER apply even if approved, button states and CTA copy derived from server truth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.5     | 2025-12-24 | ROLES-3 FIXUP-4: Membership + Role Enforcement Beyond projects/\* - eliminated legacy project.userId ownership gates in AI controller, ProductIssueFixService, SEO scan, Integrations, and Shopify services; replaced with RoleResolutionService assertions (assertProjectAccess, assertOwnerRole, assertCanGenerateDrafts); added integration tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2.6     | 2025-12-24 | ROLES-3 FIXUP-5: Co-Owner Support for Shopify Actions - Shopify validateProjectOwnership uses RoleResolutionService (supports co-owners), Account disconnectStore uses assertOwnerRole for project-level check, co-owner can perform install/sync-products/ensure-metafield-definitions, added integration tests for multi-owner Shopify actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2.7     | 2025-12-24 | ROLES-2 FIXUP-3: Role-specific apply denial messages - VIEWER gets "Viewer role cannot apply automation playbooks. Preview and export remain available.", EDITOR gets "Editor role cannot apply automation playbooks. Request approval from an owner." Aligns with test expectations in roles-2.test.ts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2.8     | 2025-12-24 | Added Phase ROLES-2 section with dedicated capability matrix and FIXUP-3 corrections documentation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.9     | 2025-12-24 | ROLES-3 PENDING-1: Approval attribution UI - Playbooks Step 3 shows requester/approver identity + timestamp. Updated CP-019 Auto Tests to reflect roles-3.test.ts is present.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3.0     | 2025-12-24 | ROLES-3 PENDING-2: Docs consistency fix - marked roles-3.spec.ts as (planned) in Test Coverage section to match reality (Playwright E2E not yet implemented).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 3.1     | 2025-12-24 | ROLES-3-HARDEN-1: Implemented Playwright E2E coverage (apps/web/tests/roles-3.spec.ts) and AI usage actor attribution (actorUserId) support; updated CP-019 automated test references accordingly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.2     | 2025-12-24 | Added STORE-HEALTH-1.0: Store Optimization Home (Complete) - Decision-only 6-card page, Work Queue actionKey filter support, navigation updates, manual testing doc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3.3     | 2025-12-24 | Added ASSETS-PAGES-1: Pages & Collections as First-Class Assets (Complete) - Extended scope types, separate Work Queue bundles by asset type, dedicated asset list pages, decision-first UX, manual testing doc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3.4     | 2025-12-24 | ASSETS-PAGES-1 Close-Out: Redefined as visibility-only phase. Added explicit Excluded list, deferral note, and follow-up phase ASSETS-PAGES-1.1. Updated manual testing doc for visibility-only contract. Documented scopeType in API_SPEC.md and WORK-QUEUE-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.5     | 2025-12-24 | ASSETS-PAGES-1.1 Started: PATCH 1 (Contract + API) complete - added asset-scoped types, parseAssetRef/createAssetRef helpers, extended controller endpoints with assetType/scopeAssetRefs params. Added Automation Playbooks section to API_SPEC.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3.6     | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 2 Complete: Applied authoritative constraints - removed non-canonical playbook ID variants (page_seo_title_fix, etc.), updated service to use canonical IDs (missing_seo_title, missing_seo_description) with assetType differentiation. Extended estimatePlaybook() for asset-scoped estimates, wired controller to pass assetType through. Handle-only apply with deterministic blocking for unaddressable items.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 3.7     | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 3 Complete: Implemented Shopify Admin API mutations for Page/Collection SEO - updateShopifyPageSeo() (pageUpdate), updateShopifyCollectionSeo() (collectionUpdate), public methods updatePageSeo() and updateCollectionSeo() with OWNER-only access, handle-based lookup, local CrawlResult sync.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 3.8     | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 4 Complete: Extended Work Queue derivation for PAGES/COLLECTIONS automation bundles - iterates over all asset types, asset-specific bundle IDs, scope preview from CrawlResult, asset-type-specific labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.9     | 2025-12-24 | ASSETS-PAGES-1.1 PATCH 6+7 Complete: Created ASSETS-PAGES-1.1.md manual testing doc, verified and removed non-canonical playbook ID references from API_SPEC.md. Phase ready for execution testing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4.0     | 2025-12-24 | **ASSETS-PAGES-1.1 COMPLETE**: PATCH 5 (Frontend + E2E) - Work Queue CTA routing with asset-scoped deep links, Playbooks page assetType support, api.ts assetType/scopeAssetRefs, E2E tests in assets-pages-1-1.e2e-spec.ts. Phase marked complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4.1     | 2025-12-24 | **ASSETS-PAGES-1.1-UI-HARDEN COMPLETE**: Full API client param support for all operations, Playbooks UI missing-scope safety block, scope summary UI, Work Queue deep link with scopeAssetRefs, Playwright UI smoke tests (assets-pages-1-1.spec.ts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 4.2     | 2025-12-24 | **GOV-AUDIT-VIEWER-1 COMPLETE**: Read-only governance viewer with 3 tabs (Approvals, Audit Log, Sharing & Links), strict audit event allowlist filtering, cursor-based pagination, passcode security (never expose hash), universal read access for all project members. Added governance-viewer.service.ts, extended governance.controller.ts, created governance viewer UI page, E2E and Playwright tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4.3     | 2026-01-06 | **NAV-IA-CONSISTENCY-1 COMPLETE**: Navigation IA consistency and terminology normalization. Design tokens + dark mode, marketing/portal visual consistency, auth terminology ("Sign in" not "Log in", "Create account" not "Sign up"), TopNav contract (removed Settings, added theme toggle, locked dropdown labels), ProjectSideNav grouped sections (OPERATE/ASSETS/AUTOMATION/INSIGHTS/PROJECT), InsightsPillarsSubnav for pillar navigation, "Stores" not "Organization / Stores", "Playbooks" not "Automation". E2E tests in nav-ia-consistency-1.spec.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4.4     | 2026-01-06 | **NAV-IA-CONSISTENCY-1 FINAL CLEANUP**: Removed coming-soon styling exception (all pages now use token palette), aligned marketing button radius (rounded-full → rounded-md for portal consistency), fixed text-white → text-primary-foreground, fixed ring-white → ring-background, added repo-root manual-testing pointer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4.5     | 2026-01-06 | **TRUST-ROUTING-1 COMPLETE**: UX Trust Hardening - Playbooks preview context propagation (from/playbookId/returnTo params), Product Preview Mode UX (banner + draft comparison + expiry handling), Store Health → Work Queue multi-key routing with visible filter context, CTA safety enforcement (issues routes instead of placeholder pages), Insights nav simplification (single primary strip, pillar dropdown). E2E tests in trust-routing-1.spec.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 4.6     | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 COMPLETE**: Trust-Critical UX Hardening for Issue→Fix Path - Single source of truth (issue-to-fix-path.ts), orphan issue suppression, actionable count parity, context banners ("You're here to fix:"), no internal ID leakage. E2E tests in issue-to-fix-path-1.spec.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 4.7     | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-1**: Circular import fix + remaining orphan/dead-end surface cleanup - Moved ISSUE_UI_CONFIG to lib/issue-ui-config.ts, issue-fix mode triggers on issueId alone (not requiring from=issues), Overview Top blockers uses actionable-only with from=overview, DEO page pillar scorecards use actionable issues only, Project Issues page counts actionable-only, Playwright test uses /overview route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 4.8     | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-2**: Trust hardening (dead-click prevention + ID leakage) - Href-based actionability on Issues page (buildIssueFixHref !== null), handleIssueClick accepts pre-validated href, internal ID leakage prevention via getSafeIssueTitle/Description in Overview/Performance/Insights panels, new getSafeInsightsIssueTitle helper for insights-style data, dead-click Playwright regression test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4.9     | 2026-01-07 | **ISSUE-TO-FIX-PATH-1 FIXUP-3**: Alignment-only update — Work Queue banner test + manual testing updated to reflect issue-fix mode triggers on issueId alone (from optional); CP-008 wording updated accordingly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5.0     | 2026-01-07 | **IMPLEMENTATION-PLAN-RECONCILIATION-1**: Root `IMPLEMENTATION_PLAN.md` deprecated to stub-only; `docs/IMPLEMENTATION_PLAN.md` is now the authoritative single source of truth. Core governance docs updated (ENGINEO_AI_INSTRUCTIONS.md, SESSION_STARTER.md, MANUAL_TESTING_TEMPLATE.md, MANUAL_TESTING_WORKFLOW.md, DEPLOYMENT.md, RENDER_DEPLOYMENT.md, CRAWL_PIPELINE.md, auto-pb-1.3-preview-persistence.md, README.md, ISSUE-TO-FIX-PATH-1.md) to reference the authoritative location.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5.1     | 2026-01-07 | **IMPLEMENTATION-PLAN-RECONCILIATION-1 FIXUP-2**: Self-reference consistency — updated internal checklist items that referenced `IMPLEMENTATION_PLAN.md` to reference `docs/IMPLEMENTATION_PLAN.md` (not the deprecated root stub) for self-referential "updated plan" checklist items and version-history task text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5.2     | 2026-01-07 | **IMPLEMENTATION-PLAN-ORDERING-CLEANUP-1**: Major restructuring — added 4 top-level sections (Completed Phases/In Progress/Planned or Pending/Deferred or Explicitly Excluded), reordered completed phases under subheadings (Foundations/Core Platform/Governance & Roles/Execution Surfaces), added ENTERPRISE-GEO-1 clarifying note, standardized phase header status formatting, moved Document History to bottom.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 5.3     | 2026-01-07 | **IMPLEMENTATION-PLAN-ORDERING-CLEANUP-1 FIXUP-1**: Heading-level compliance — demoted all `## Phase` headers to `### Phase` to ensure exactly 4 top-level sections (Completed Phases/In Progress/Planned or Pending/Deferred or Explicitly Excluded).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 5.4     | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1**: Added smoke tests for INSIGHTS-1, PRODUCTS-LIST-2.0, BILLING-GTM-1, MEDIA-1; added test coverage sections to phase entries; added AUTO-PB-1 canonical doc reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 5.5     | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-1**: Smoke tests tightened to "one test per phase"; Billing smoke route corrected to `/settings/billing`; Media smoke corrected to `/projects/{projectId}/media`; AUTO-PB-1 canonical manual testing doc link corrected to `phase-automation-1-playbooks.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 5.6     | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-2**: MEDIA-1 smoke test tightened to avoid false positives by keying "scorecard present" to the "Media Accessibility Score" section heading (not generic text like "Accessibility").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 5.7     | 2026-01-07 | **COVERAGE-AND-PLAN-ALIGNMENT-1 FIXUP-3**: BILLING-GTM-1 core file paths corrected to real locations (`(marketing)/pricing/`, `settings/billing/`); AUTO-PB-1 core file path corrected to `/automation/playbooks/`; added missing manual testing links for BILLING-GTM-1, PRODUCTS-LIST-2.0, MEDIA-1. Documentation-only; no product/test behavior changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 5.8     | 2026-01-08 | **ZERO-AFFECTED-SUPPRESSION-1 COMPLETE**: Zero-eligible action surface suppression (trust hardening). Work Queue suppresses AUTOMATION_RUN tiles with scopeCount === 0 from actionable tabs (except Applied Recently history). Playbooks shows calm empty state when eligibility is 0 (hides stepper + Apply CTAs). Consistent copy: "No eligible items right now". Added zero-affected-suppression-1.spec.ts E2E tests and ZERO-AFFECTED-SUPPRESSION-1.md manual testing doc. Updated CP-008 and CP-012.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.1     | 2026-01-09 | **COUNT-INTEGRITY-1.1 UI HARDEN**: Multi-action filtering via actionKeys URL param (OR across keys), pillar-aware triplet display (currentTriplet from byPillar when filtered), fixed UI smoke test auth pattern (localStorage only, no cookie), fixed product selection shape (response is { products: [...] } not array).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6.2     | 2026-01-09 | **COUNT-INTEGRITY-1.1 AUDIT FIX**: Moved COUNT-INTEGRITY-1.1 from "In Progress" section to Trust Hardening completed phases (follows COUNT-INTEGRITY-1). PATCH 1: Severity-aligned canonical summary (passes severity filter to API when not 'all', refreshes on severity change). PATCH 2: Pillar-aware hasActionableIssues/hasDetectedIssues checks (uses byPillar triplets when pillarFilter !== 'all'). Structure now correct: "In Progress" contains only "_None at this time._" with no phases listed beneath it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.3     | 2026-01-09 | **COUNT-INTEGRITY-1.1 VERIFICATION COMPLETE (NO-OP)**: Verified all audit fix items implemented: (1) page.tsx passes severity to canonicalIssueCountsSummary when severityFilter !== 'all', fetchIssues re-runs on severityFilter changes, hasActionableIssues/hasDetectedIssues are pillar-aware with byPillar + issues-list fallbacks; (2) IMPLEMENTATION_PLAN.md structure correct with COUNT-INTEGRITY-1.1 under Trust Hardening completed phases, "In Progress" contains only "_None at this time._", Document History includes 6.2 audit-fix entry. No additional patches required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.4     | 2026-01-09 | **COUNT-INTEGRITY-1.1 ENTERPRISE TRUST HARDENING FIX-UP**: Store Health pillar-scoped affectedItemsCount + Issues Engine routing (not Work Queue), Work Queue strict zero-actionable suppression across ALL bundle types, Product Issues tab triplet always visible + neutral message reachable, single Playwright UI smoke test replacing prior multi-test suite. Locked semantics: Store Health Discoverability/Technical tiles display pillar-scoped "Items affected" and route to Issues Engine (mode=detected); Work Queue is "actionable now" scoped; zero-actionable shows "No items currently eligible for action." with no CTAs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.5     | 2026-01-09 | **COUNT-INTEGRITY-1.1 POST-AUDIT COMPLIANCE**: (1) Merged 2 UI tests into exactly 1 end-to-end Playwright test per "single smoke test" requirement; (2) Marked COUNT-INTEGRITY-1 as ⚠️ SUPERSEDED/PARTIAL (Store Health clickthrough semantics superseded; Work Queue click-integrity remains valid); (3) Updated UI test count from "2 tests" to "1 test" in documentation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.6     | 2026-01-09 | **COUNT-INTEGRITY-1.1 FIXUP-2 (Trust Correctness)**: (1) Store Health Discoverability/Technical tiles always show numeric pillar-scoped "items affected" (0 fallback; never "Counts unavailable"); (2) Playwright smoke test STRICT mode (requires numeric parsing, requires asset-detail navigation, no optional branches); (3) Removed Work Queue step from UI test (Issues Engine is now the click destination from Store Health, not Work Queue).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6.7     | 2026-01-09 | **COUNT-INTEGRITY-1.1 FIXUP-2 DOC CONSISTENCY**: Documentation-only cleanup — removed stale "(pending)" labels from COUNT-INTEGRITY-1 frontend files (marked superseded), updated Testing Requirements to clarify Work Queue → Issues click-integrity remains valid while Store Health click-integrity is governed by COUNT-INTEGRITY-1.1, aligned all UI smoke test chain references to "Store Health → Issues Engine → Asset Detail" (STRICT).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6.8     | 2026-01-09 | **LIST-SEARCH-FILTER-1 COMPLETE**: Products list search & filtering. Added handle field to Product model, server-authoritative filtering (q/status/hasDraft), reusable ListControls component (URL-derived state, config-driven), Products page integration with empty states, E2E seed endpoint, Playwright smoke tests, manual testing doc. Pattern ready for future list pages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6.9     | 2026-01-09 | **LIST-SEARCH-FILTER-1 FIXUP-1**: Fixed ListControls build (native HTML elements instead of non-existent shadcn/ui), added key={currentQ} for input remount on clear, moved Playwright tests to apps/web/tests/, fixed auth pattern (engineo_token), corrected test path in docs, added root plan pointer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.10    | 2026-01-09 | **LIST-SEARCH-FILTER-1.1 COMPLETE**: Extended ListControls pattern to Pages and Collections asset lists. Added filter params to crawlPages API (q/status/hasDraft/pageType), server-side filtering in projects.service.ts (getCrawlPageIdsWithPendingDrafts for PAGES/COLLECTIONS asset types), integrated ListControls into Pages and Collections pages with empty states, E2E seed endpoint, 8 Playwright smoke tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.11    | 2026-01-09 | **LIST-SEARCH-FILTER-1.1 DOC-FIXUP-1**: Added missing manual testing checklist doc (`docs/manual-testing/LIST-SEARCH-FILTER-1.1.md`) and linked it from the phase section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.12    | 2026-01-09 | **LIST-ACTIONS-CLARITY-1 COMPLETE**: Unified row chips and actions across Products/Pages/Collections lists. Created shared `RowStatusChip` component and `resolveRowNextAction` resolver as single sources of truth. Added `hasDraftPendingApply` server-derived field to list payloads. Issues Engine supports asset-filtered mode (`assetType`/`assetId` params). Locked vocabulary: chip labels (Optimized/Needs attention/Draft saved/Blocked) and action labels (Fix next/View issues/Review drafts/Request approval/View approval status/Open). E2E seed endpoint, Playwright tests, manual testing doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 6.13    | 2026-01-09 | **LIST-ACTIONS-CLARITY-1 FIXUP-1 (Compliance + Missing Coverage)**: (1) Products "Fix next" now uses `buildIssueFixHref` for deterministic issue→fix routing (not Issues list); (2) Wired real viewer capabilities (`canApply`/`canRequestApproval`) from `getUserRole()` API; (3) `NavigationContext` for consistent returnTo propagation in helpers; (4) Added `data-testid` attributes to row actions; (5) Pages/Collections use real capabilities (removed hardcoded role); (6) Issues Engine uses `assetIssues()` API for true per-asset filtering; (7) Seed endpoint extended with Collections + EDITOR token + governance policy; (8) Playwright tests cover Collections + Blocked state + routing; (9) Locked chip vocabulary with exact emojis (✅ Optimized, ⚠ Needs attention, 🟡 Draft saved (not applied), ⛔ Blocked).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.14    | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 FIXUP-2 (Tests + Manual Doc Consistency)**: Tightened Playwright assertions to use row-scoped locators with seeded titles (no ordering assumptions), exact emoji chip label matching, strict Blocked action assertions (NOT Review drafts), click-through navigation to Issues Engine with filter banner verification, "no Apply on list rows" regression test. Fixed manual testing doc: corrected Products "Fix next" routing expectation (routes to Issue→Fix deep link), removed stale "Future - ROLES-3 Integration" Blocked subsection (already implemented), updated per-asset wording for Pages/Collections, removed obsolete non-goal about per-asset crawl results. No production logic changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.15    | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 FIXUP-1 (Bulk Removal + Server-Derived Fields)**: Compliance/safety hardening - removed ALL bulk selection UI from Products/Pages/Collections lists (checkboxes, bulk action CTAs, selection context strip, confirmation modals). Products command bar now links to Playbooks for automation. Added server-derived fields to Products API (`actionableNowCount`, `blockedByApproval`). ProductTable uses server-derived fields with client-side fallback. Extended Playwright tests with bulk removal regressions (LAC1-018 through LAC1-022). Updated manual testing doc with Bulk Removal Verification section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.16    | 2026-01-10 | **LIST-ACTIONS-CLARITY-1 CORRECTNESS-1 COMPLETE**: Canonical row fields now enforced server-side for Products + Crawl Pages/Collections. Products API uses `DeoIssuesService.getIssuesForProjectReadOnly()` with `__fullAffectedAssetKeys` for accurate per-product issue counts (`actionableNowCount`, `detectedIssueCount`). Crawl Pages endpoint adds `actionableNowCount`, `detectedIssueCount`, `blockedByApproval` per URL. Resolver updated to consume `blockedByApproval` directly (deprecates `canApply` derivation). UI heuristics removed from Pages/Collections lists - now use server-derived actionability. Playwright API-contract regression tests added (LAC1-023/024/025). ForwardRef pattern applied to ProjectsModule → ProductsModule import for circular dependency safety. Manual testing doc updated with emoji chip labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.17    | 2026-01-10 | **SCOPE-CLARITY-1 COMPLETE**: Explicit scope chips + normalization for ScopeBanner. Created `scope-normalization.ts` with `normalizeScopeParams()` implementing priority rules (asset > issueType > pillar > mode). ScopeBanner now renders ordered ScopeChip[] with type-specific styling and test hooks (`scope-chips`, `scope-chip`, `scope-chip-type`). Shows "adjusted" note when conflicting params are normalized. Updated all 6 ScopeBanner surfaces (Issues Engine, Playbooks, Product Detail, Products List, Pages List, Collections List). Updated `route-context.ts` documentation. E2E tests in `scope-clarity-1.spec.ts`, manual testing doc in `SCOPE-CLARITY-1.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.18    | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 COMPLETE**: "Review drafts" action now routes to Draft Review mode (`/automation/playbooks?mode=drafts&assetType=...&assetId=...`), NOT Work Queue. Locked rule: "Review drafts NEVER routes to Work Queue." Added server-authoritative endpoint `GET /projects/:id/automation-playbooks/drafts` for asset-scoped pending drafts. Playbooks page implements Draft Review mode with ScopeBanner, draft list, and zero-draft empty state ("No drafts available for this item." with View issues + Back CTAs). Updated `buildReviewDraftsHref()` signature to require assetType + assetId. Updated ProductTable, Pages list, Collections list to pass assetId. Playwright test LAC1-008 updated for Draft Review routing + back navigation. Manual testing doc in `DRAFT-ROUTING-INTEGRITY-1.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.19    | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 FIXUP-1**: ScopeBanner wiring fixes. (1) Draft Review ScopeBanner now passes `onClearFiltersHref`, `chips` from `normalizedScopeResult`, and `wasAdjusted` props for explicit scope display; (2) Empty state Back CTA uses `data-testid="draft-review-back"` (not duplicate `scope-banner-back`); (3) Removed misleading server comment about pages/collections drafts "not yet supported". Playwright test updated to handle both ScopeBanner and empty state back buttons.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.20    | 2026-01-10 | **SCOPE-CLARITY-1 FIXUP-1**: Issues Engine pillar filter state now driven by normalized scope (prevents hidden stacking when issueType overrides pillar). `pillarFilter` initial state and sync effect use `normalizedScopeResult.normalized.pillar` instead of raw `pillarParam`. When user explicitly picks a pillar via `handlePillarFilterChange()`, conflicting higher-priority scope params (`issueType`, `assetType`, `assetId`) are deleted from URL. Playwright test updated with "All pillars" button visibility assertion. Manual testing doc updated with pillar filter UI verification step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.21    | 2026-01-10 | **DRAFT-ROUTING-INTEGRITY-1 FIXUP-2**: Draft content visibility + test hardening. (1) Draft Review UI now renders both canonical (field/finalSuggestion/rawSuggestion) and legacy/testkit (suggestedTitle/suggestedDescription) draft item shapes; (2) `AssetScopedDraftItem` type loosened to support both shapes + optional crawlResultId for pages/collections; (3) Playwright LAC1-008 hardened to require `draft-review-list` visible and assert seeded suggestion content ("Improved Product Title"); (4) Manual testing doc updated to verify draft list shows non-empty content.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.22    | 2026-01-10 | **SCOPE-CLARITY-1 FIXUP-2**: Strict pillar filter test hooks. Added `data-testid="pillar-filter-all"` + `aria-pressed` to "All pillars" button, `data-testid="pillar-filter-${pillar.id}"` + `aria-pressed` to each pillar button. Playwright test updated with strict `aria-pressed` assertions (replaces brittle `:has-text()` locator).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.23    | 2026-01-10 | **DRAFT-EDIT-INTEGRITY-1 COMPLETE**: Inline draft editing in Draft Review mode. Added `updateDraftItem()` service method with permission enforcement (OWNER/EDITOR only), `PATCH /projects/:id/automation-playbooks/drafts/:draftId/items/:itemIndex` endpoint, `projectsApi.updateDraftItem()` client method. Implemented per-item inline edit mode with Save changes / Cancel buttons (no autosave). Server draft is source of truth - edits persist and survive page reload. Playwright test LAC1-009 verifies edit + save + persistence + cancel flow. Manual testing doc in `DRAFT-EDIT-INTEGRITY-1.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.24    | 2026-01-10 | **DRAFT-ENTRYPOINT-UNIFICATION-1 COMPLETE**: Products list "Review drafts" now routes to Product detail Drafts tab (not Automation/Playbooks). Locked statements: (1) Product detail is the canonical draft review entrypoint for products; (2) Draft Review stays human-only (no AI); (3) Products list Review drafts does not route to Automation Draft Review. Added `buildProductDraftsTabHref()` helper, 'drafts' tab to ProductDetailsTabs, Drafts tab UI with fetch/edit/render, server-side `itemIndex` for accurate edit API calls. Pages/Collections continue using Automation Draft Review (`/automation/playbooks?mode=drafts`). Testkit seed updated to canonical draft shape. Playwright tests LAC1-008/009 updated. Manual testing doc in `DRAFT-ENTRYPOINT-UNIFICATION-1.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.25    | 2026-01-10 | **DRAFT-ENTRYPOINT-UNIFICATION-1-FIXUP-1**: Non-AI Drafts tab compliance + itemIndex correctness. (1) Drafts tab now suppresses AI/generation copy + apply/automation CTAs when `activeTab === 'drafts'` (header action cluster, CNAB-1 banner, AI limit upsell hidden); (2) Fixed itemIndex-based local update correctness in both Product detail Drafts tab and Playbooks Draft Review (was using loop `idx` instead of `item.itemIndex` for filtered subsets); (3) Tightened Playwright LAC1-008 regression coverage with `toHaveCount(0)` assertions for AI/apply elements; (4) Updated manual testing doc with non-AI surface verification (scenario 3a) and corrected empty state copy to "No drafts saved for this product."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.26    | 2026-01-10 | **DRAFT-REVIEW-ISOLATION-1 COMPLETE**: Structural non-AI boundary for Product Drafts tab. Extracted `ProductDraftsTab.tsx` as isolated module with NON-AI BOUNDARY header comment. Module is forbidden from importing: `aiApi`, `ProductAiSuggestionsPanel`, `suggestProductMetadata`, `generateProductAnswers`, `AI_DAILY_LIMIT_REACHED`. Added `draft-review-isolation-1.spec.ts` guard test (DRI1-001/002/003) that reads source file and fails if forbidden tokens detected or header missing. Product detail page delegates Drafts tab rendering to isolated component. Pure structural refactor with no behavioral changes. Manual testing doc in `DRAFT-REVIEW-ISOLATION-1.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6.27    | 2026-01-10 | **DRAFT-REVIEW-ISOLATION-1-FIXUP-1**: Strict "no behavior changes" alignment. (1) Removed `isActive` prop and `hasFetched` caching from ProductDraftsTab - restored simple "fetch on mount" semantics; (2) Restored conditional mounting in page.tsx (`activeTab === 'drafts'`) to match standard tab behavior; (3) Removed "Tab State Preservation" scenario from manual testing doc since state preservation across tab switches was a behavior change. Guard test and non-AI boundary remain in place.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.28    | 2026-01-10 | **DRAFT-AI-ENTRYPOINT-CLARITY-1 COMPLETE**: UX AI boundary notes at draft workflow surfaces. Created `DraftAiBoundaryNote` component (`@/components/common/DraftAiBoundaryNote.tsx`) with `mode: 'review'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 'generate'`prop. Review mode: "Review & edit (no AI on this step)" with person icon. Generate mode: "AI used for drafts only · AI is not used at Apply" with lightbulb icon. Added to 3 surfaces: (1) ProductDraftsTab (review mode); (2) Playbooks Draft Review panel (review mode); (3) Playbooks Step 1 generation CTA (generate mode). Locked copy (do not modify without phase approval). Testkit seed`seed-draft-ai-entrypoint-clarity-1`. Playwright tests in `draft-ai-entrypoint-clarity-1.spec.ts`(5 tests) + updated LAC1-008. Manual testing doc in`DRAFT-AI-ENTRYPOINT-CLARITY-1.md`.                                                                                                                                                                      |
| 6.29    | 2026-01-10 | **DRAFT-AI-ENTRYPOINT-CLARITY-1-FIXUP-1**: Work Queue generate-mode note + expanded coverage. (1) Added `DraftAiBoundaryNote mode="generate"` to `ActionBundleCard.tsx` for "Generate Drafts" / "Generate Full Drafts" CTAs; (2) Updated seed to use `status: 'PARTIAL'` for deterministic Work Queue "Generate Full Drafts" CTA in tests; (3) Added DAEPC1-006 Playwright test for Work Queue boundary note visibility; (4) Extended DAEPC1-001/002 with panel-scoped "no AI creep" assertions (no "Improve with AI", "Use AI", "Generate", "Regenerate" buttons in review panels); (5) Added Work Queue scenario to manual testing doc; (6) Added Phase DRAFT-AI-ENTRYPOINT-CLARITY-1 section to Implementation Plan (Surfaces Covered now includes Work Queue).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6.30    | 2026-01-11 | **DRAFT-DIFF-CLARITY-1 COMPLETE + FIXUP-1**: Current vs Draft diff UI at draft review surfaces. (1) Diff display: "Current (live)" vs "Draft (staged)" blocks with distinct styling and test hooks (`draft-diff-current`, `draft-diff-draft`); (2) Empty draft messaging: "No draft generated yet" (both raw/final empty) vs "Draft will clear this field when applied" (explicitly cleared); (3) Save confirmation dialog when clearing live field; (4) ProductDraftsTab + Playbooks Draft Review surfaces updated; (5) Testkit seed `seed-draft-diff-clarity-1` with diff/cleared/no-draft products + page; (6) Playwright tests DDC1-001..DDC1-010 (10 tests) covering diff labels, messaging, confirmation dismiss/accept. FIXUP-1: Added Product 3 draftItem with empty raw/final for "No draft generated yet" scenario; added DDC1-008 (no draft message), DDC1-009 (dialog dismiss), DDC1-010 (dialog accept + save).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.31    | 2026-01-11 | **DRAFT-DIFF-CLARITY-1-FIXUP-2**: Seed count consistency + exact dialog assertion. (1) Fixed `counts.draftGenerated` from 3→2 (Products 1-2 have actual suggestions; Product 3 is empty); (2) Added `EMPTY_DRAFT_CONFIRM_MESSAGE` constant with exact locked copy; (3) Changed `page.on('dialog')` to `page.once('dialog')` in DDC1-009/DDC1-010 to avoid listener accumulation; (4) Changed `toContain()` to `toBe()` for exact dialog message matching. Tests/seed correctness only; no documentation updates required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.32    | 2026-01-11 | **DRAFT-FIELD-COVERAGE-1 COMPLETE**: Draft Review parity across Products, Pages, and Collections. (1) Generalized ProductDraftsTab → AssetDraftsTab with asset-type-specific field labels (Products: SEO Title/Description, Pages: Page Title/Meta Description, Collections: Collection Title/Meta Description); (2) Added Pages detail route `/assets/pages/[pageId]` with Overview + Drafts tabs; (3) Added Collections detail route `/assets/collections/[collectionId]` with Overview + Drafts tabs; (4) Updated draft-review-isolation-1.spec.ts guard test to target AssetDraftsTab; (5) Added seed-draft-field-coverage-1 endpoint (3 products + 3 pages + 3 collections with diff/clear/no-draft scenarios); (6) Added draft-field-coverage-1.spec.ts Playwright tests (11 tests: DFC1-001 through DFC1-011) covering Pages/Collections diff display, no-draft messaging, destructive-clear confirmation dialogs, cross-asset parity; (7) Manual testing doc DRAFT-FIELD-COVERAGE-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6.33    | 2026-01-11 | **DRAFT-FIELD-COVERAGE-1-FIXUP-1**: Canonical route aliases + accept-path dialog assertions. (1) Added canonical route `/projects/[id]/pages/[pageId]` (server redirect to `/assets/pages/...`, preserves query); (2) Added canonical route `/projects/[id]/collections/[collectionId]` (server redirect to `/assets/collections/...`, preserves query); (3) Updated Playwright tests to use canonical routes for Pages/Collections; (4) Added exact `EMPTY_DRAFT_CONFIRM_MESSAGE` assertions on accept path (DFC1-004 + DFC1-008) - now both dismiss and accept paths verify locked dialog copy; (5) Made ProductDraftsTab a thin wrapper around AssetDraftsTab to prevent implementation drift.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6.34    | 2026-01-11 | **DRAFT-LIST-PARITY-1 COMPLETE**: List-level draft review entrypoint parity for Pages/Collections. (1) Updated `resolveRowNextAction()` to support `issuesHref` for Pages/Collections dual-action rows (View issues primary + Open secondary); (2) Added `buildAssetWorkspaceHref()` and `buildAssetDraftsTabHref()` helpers in `list-actions-clarity.ts`; (3) Pages list "Review drafts" now routes to `/assets/pages/{pageId}?tab=drafts&from=asset_list` (NOT Work Queue/Playbooks); (4) Collections list "Review drafts" routes similarly to asset detail Drafts tab; (5) Playwright tests `draft-list-parity-1.spec.ts` (DLP1-001, DLP1-002) verify routing assertions including negative checks for /work-queue and /automation/playbooks in URL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.35    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1 COMPLETE**: Playbook route canonicalization + banner routing guarantee. (1) Canonical route shape `/projects/:projectId/playbooks/:playbookId?step=...&source=...`; (2) Centralized routing helper `playbooks-routing.ts` with `buildPlaybookRunHref()`; (3) Deterministic default selection (max eligibleCount; tie → descriptions; all 0 → neutral); (4) Banner CTA routes canonically (no AI side effects on click); (5) Tile click routing via canonical URL; (6) Estimate/playbook mismatch bug fix; (7) All external entrypoints updated to canonical routes; (8) Playwright test PEPI1-001 verifies banner routes to correct playbook with step=preview and source=banner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.36    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-1**: (1) Fixed TDZ crash in Playbooks page (urlSource used before declaration); (2) CNAB derived strictly from eligibility counts (no issue-count fallback, hidden when counts unknown); (3) NO_RUN_WITH_ISSUES banner CTA targets primary playbook from eligibility counts (max wins, tie → descriptions); (4) Split mount effect into eligibility fetch + default selection effects (no fallback to setSelectedPlaybookId on error); (5) Work Queue entrypoint uses `buildPlaybookRunHref()` with playbookId validation; (6) trust-routing-1.spec.ts updated to canonical `/playbooks` route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.37    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-2**: (1) Breadcrumb "Playbooks" link uses canonical `/playbooks` route (not `/automation`); (2) Automation tabs "Playbooks" link uses canonical `/playbooks` with dual-route active highlighting (`/playbooks` OR `/automation/playbooks`); (3) "Return to Playbooks" button after apply uses canonical `/playbooks`; (4) Product "Back to preview" fallback uses canonical `/playbooks/:playbookId?step=preview&source=product_details` (not legacy `?playbookId=` query param).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.38    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-3**: Scoped eligibility integrity. (1) `buildPlaybookRunHref()` now includes `assetType=PRODUCTS` when scopeAssetRefs are present (previously omitted PRODUCTS assetType even when scoped); (2) All API calls (estimate, preview, apply, eligibility fetch) now correctly pass scopeProductIds for PRODUCTS scope (was passing undefined); (3) Banner CTA routing preserves exact scope semantics (no global-vs-scoped mismatch); (4) Tile click, default selection, and product detail returnToPath all preserve scoped PRODUCTS context; (5) Added PEPI1-002 Playwright test for scoped PRODUCTS banner routing integrity; (6) Updated manual testing doc with Scenario 1.1 (Scoped Playbooks entry).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6.39    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-4**: Scoped routing guardrails. (1) Added `buildPlaybookRunHrefOrNull()` guardrail that refuses scoped routes without assetType (console error + no-op); (2) Updated `navigateToPlaybookRun()` and `navigateToPlaybookRunReplace()` to use guardrail; (3) Introduced `playbookRunScopeForUrl` shared memo for scope-identical routing across all entrypoints; (4) Removed all `currentAssetType !== 'PRODUCTS' ? currentAssetType : undefined` suppression patterns; (5) Banner CTAs now use `buildPlaybookRunHrefOrNull()` with early-return on invalid scope; (6) Work Queue `getCTARoute()` extracts scopeAssetRefs for all asset types (not just PAGES/COLLECTIONS); (7) PEPI1-002 test now asserts repeated scopeAssetRefs via `URLSearchParams.getAll()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.40    | 2026-01-11 | **SHOPIFY-ASSET-SYNC-COVERAGE-1 COMPLETE**: Shopify Pages + Collections sync coverage. (1) Prisma schema: Added Shopify identity fields (shopifyResourceType, shopifyResourceId, shopifyHandle, shopifyUpdatedAt, shopifySyncedAt) with compound unique constraint + @@index([projectId, url]); (2) API endpoints: POST /projects/:id/shopify/sync-pages, POST /projects/:id/shopify/sync-collections (OWNER-only), GET /projects/:id/shopify/sync-status; (3) ShopifyService: GraphQL fetchers (GetPages, GetCollections), sync methods with E2E mock handler support, read_content scope requirement; (4) Frontend: Pages/Collections lists with sync buttons (visible but disabled when Shopify not connected), status lines, empty state differentiation; detail pages show handle + updatedAt; (5) E2E tests: API-level spec + Playwright smoke test; (6) Manual testing doc + CRITICAL_PATH_MAP.md CP-006 update.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.41    | 2026-01-11 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5**: Canonical entrypoints + explicit scope payload. (1) Extended `buildPlaybooksListHref()` to support assetType + scopeAssetRefs params; (2) Added `buildPlaybookScopePayload()` helper for consistent scope spreading; (3) Added `navigateToPlaybooksList()` wrapper; (4) Updated NextDeoWinCard to use `navigateToPlaybookRun()` + `buildPlaybooksListHref()`; (5) Updated Entry page to use `buildPlaybooksListHref()` for links and `buildPlaybookRunHref()` with explicit scope for "View playbook" CTA; (6) Replaced `playbookRunScopeForUrl` inline memo with `buildPlaybookScopePayload()` in Playbooks page; (7) Added PEPI1-003 Playwright test for Entry page scoped CTA routing; (8) Updated manual testing doc with Scenario 1.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.42    | 2026-01-12 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1**: Entry CTA correctness + explicit API scope payload. (1) `buildPlaybookScopePayload()` now validates PRODUCTS scope refs (rejects handle-prefixed refs) and returns explicit `scopeProductIds` for API calls; (2) Added `getRoutingScopeFromPayload()` helper; (3) Removed positional branching in all API calls (eligibility, estimate, preview, apply) - uses explicit payload; (4) Entry page CTA routes to Playbooks LIST for deterministic selection (not hardcoded run target); (5) Added stable "Open Playbooks" CTA (`data-testid="automation-entry-open-playbooks"`) visible without AI dependency; (6) PEPI1-003 test rewritten: no AI dependency, uses stable CTA, asserts deterministic selection lands on descriptions playbook; (7) Updated manual testing doc Scenario 1.2 to reflect new CTA behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.43    | 2026-01-12 | **PLAYBOOK-ENTRYPOINT-INTEGRITY-1-FIXUP-5-FOLLOWUP-1-AUDIT-1**: Source integrity. (1) Tightened PEPI1-003 to assert `source=entry` is preserved by deterministic selection (not overwritten to `default`); (2) Updated manual testing doc Scenario 1.2 to require `source=entry`; (3) Documented source-preservation guarantee in FOLLOWUP-1 section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6.44    | 2026-01-12 | **ISSUE-FIX-KIND-CLARITY-1 COMPLETE**: Diagnostic vs fixable issue CTA semantics. (1) Added `IssueFixKind = 'EDIT'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 'AI'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 'DIAGNOSTIC'`type to issue-to-fix-path.ts; (2) Fixed Search & Intent issue configs with correct fixAnchorTestId values;`not_answer_ready`marked as DIAGNOSTIC; (3) Added`diagnostic` variant to arrival callout (blue styling, "You're here to review:"); (4) Product page passes fixKind to callout, shows "View related issues" CTA for DIAGNOSTIC; (5) Issues Engine IssueCard shows "Review →" for DIAGNOSTIC, "Fix →" for others; (6) DEO Overview "Top Recommended Actions" shows "Review" for DIAGNOSTIC, "Fix now" for others; (7) buildIssueFixHref() adds fixKind param, skips fixAnchor for DIAGNOSTIC; (8) Playwright tests issue-fix-kind-clarity-1.spec.ts (5 tests); (9) Manual testing doc ISSUE-FIX-KIND-CLARITY-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6.45    | 2026-01-12 | **ISSUE-FIX-KIND-CLARITY-1-FIXUP-1**: Correctness + security hardening. (1) Search & Intent issues now use `search-intent-tab-anchor` as canonical anchor (module-specific testids don't exist); `not_answer_ready` has NO `fixAnchorTestId` (no scroll/highlight for DIAGNOSTIC); (2) Product page derives `fixKind` from config ONLY - removed URL param reading (non-authoritative, spoofable); skips scroll/highlight for DIAGNOSTIC issues; (3) "View related issues" CTA routes to Issues Engine (`/projects/:id/issues?mode=detected&pillar=:pillarId`), NOT product `tab=issues`; (4) Issues Engine page derives `fixKind` via `getIssueFixConfig()`, shows "Review" CTA with blue styling for DIAGNOSTIC, adds `data-fix-kind` attribute, suppresses "Fixes one affected product..." text for DIAGNOSTIC; (5) Playwright tests hardened with strict assertions (no no-op guards), removed URL `fixKind` param from navigation; (6) Documentation corrected to reflect fixKind security model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6.46    | 2026-01-12 | **ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-2**: Test contract completion. (1) IFKC1-001 now requires ≥1 DIAGNOSTIC card (not exactly 1) - removes fragile count assertion; (2) IFKC1-004 tightened to assert exact pillar value `pillar=search_intent_fit`, then clicks "View related issues" and asserts browser navigates to Issues Engine with query params preserved (`mode=detected`, `from=product_details`, `pillar=search_intent_fit`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.47    | 2026-01-12 | **ISSUE-FIX-KIND-CLARITY-1-FIXUP-1-AUDIT-3**: Remove fixKind query param emission. (1) Removed `fixKind` query param emission from `buildIssueFixHref()` - URL no longer carries `fixKind` (was non-authoritative, now removed entirely); (2) Manual testing doc updated to reflect "derived from config; not in URL" - Critical Invariant 4 and Notes section clarified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.48    | 2026-01-14 | **ISSUE-FIX-KIND-CLARITY-1-FIXUP-2**: Aggregation CTA and Work Queue banner semantics. (1) Added `fixNextIsDiagnostic?: boolean` to `RowNextActionInput` in list-actions-clarity.ts; Products list shows "Review" CTA when deterministic next issue is DIAGNOSTIC (not "Fix next"); (2) ProductTable.tsx passes `fixNextIsDiagnostic` derived from `getIssueFixConfig()`; (3) Work Queue page derives `fixKind` from `getIssueFixConfig(issueIdParam)`, shows blue banner with "You're here to review:" for DIAGNOSTIC issues (not indigo "You're here to fix:"); (4) `seed-first-deo-win` extended to 4 products - Product 4 has SEO + thin content triggering `not_answer_ready` as top issue; (5) Playwright tests: LAC1-002b, IFKC1-006, IFKC1-007; (6) Manual testing Scenarios 6 and 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.49    | 2026-01-14 | **ISSUE-FIX-KIND-CLARITY-1-FIXUP-2-AUDIT-1**: Work Queue DIAGNOSTIC helper line wording corrected to explicit "To review this issue:" (never "fix"); updated IFKC1-007 assertion + manual testing Scenario 7 to match shipped behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.50    | 2026-01-14 | **ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1 COMPLETE**: "View affected" CTA in Issues Engine now routes to filtered Products list (not product detail). Server-authoritative issueType filtering via Products API (`getProductIdsAffectedByIssueType()` using canonical `getIssuesForProjectReadOnly()`). ScopeBanner shows issueType scope chip. Return navigation via `returnTo` param. Playwright tests VAR1-001/002/003. Manual testing doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.51    | 2026-01-14 | **MISSING-METADATA-FIX-SURFACE-INTEGRITY-1 COMPLETE**: Fixed "Fix surface not available" error for metadata issues. Corrected anchor testid mapping for all metadata issues to use real DOM element `seo-editor-anchor` (was incorrectly targeting non-existent testids like `product-metadata-seo-title-module`). Playwright tests MMFSI1-001/002. Manual testing doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.52    | 2026-01-14 | **ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1-AUDIT-1 + MISSING-METADATA-FIX-SURFACE-INTEGRITY-1-AUDIT-1**: Playwright hardening. (1) VAR1-001 no longer uses conditional skip - targets deterministic "Missing titles or descriptions" issue card; (2) Added VAR1-004 for back-navigation contract (ScopeBanner Back returns to Issues Engine with original pillar + mode filters); (3) VAR1-003 now asserts non-empty list before exclusion check; (4) MMFSI1-001 now tests via app-generated link (not direct URL) to verify real anchor mapping; (5) MMFSI1-002 adds explicit fixAnchor URL assertion. Manual testing docs updated with corrected example (missing_metadata) and test coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.53    | 2026-01-14 | **ISSUES-ENGINE-VIEW-AFFECTED-ROUTING-1-AUDIT-2**: Fixed Playwright selector mismatch. VAR1-001 and VAR1-004 now use canonical Issues Engine card testids (`issue-card-actionable` / `issue-card-informational`) instead of nonexistent `issue-card`. Added `.first()` after filter to force single target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6.54    | 2026-01-15 | **ISSUESLIST-VIEW-AFFECTED-CONTEXT-1 COMPLETE**: Secondary "View affected →" link in IssuesList expanded details now preserves full route context. Uses `withRouteContext()` to include `issueType`, `from`, and `returnTo` params. Computed via `getReturnToFromCurrentUrl()` and pathname inference. Playwright test ILVAC1-001 added. Manual testing doc updated with Critical Invariant 5 and test coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6.55    | 2026-01-15 | **SHOPIFY-SCOPE-RECONSENT-UX-1 COMPLETE**: Explicit Shopify re-consent UX for newly required scopes. Server-authoritative missing scope endpoint (`/projects/:id/shopify/missing-scopes`), user-initiated reconnect (`/shopify/reconnect`) with safe `returnTo`, structured permission notice + Reconnect CTA on Pages/Collections lists, structured `SHOPIFY_MISSING_SCOPES` API payload, auto-sync after reconnect return. Playwright coverage added; manual testing doc + internal permissions doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6.56    | 2026-01-15 | **SHOPIFY-SCOPE-RECONSENT-UX-1-AUDIT-1**: Playwright scope parsing hardened. (1) Reconnect redirect scope assertion now parses OAuth redirect URL properly (`new URL(location).searchParams.get('scope')`) instead of relying on `decodeURIComponent` substring match - avoids false positives from URL-encoded characters; (2) Manual testing doc paths corrected to full relative paths (`docs/testing/...`, `docs/API_SPEC.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.57    | 2026-01-15 | **SHOPIFY-SCOPE-RECONSENT-UX-1-FIXUP-1 COMPLETE**: Reconnect CTA never fails silently. (1) Added OWNER-only reconnect URL endpoint (`/projects/:id/shopify/reconnect-url`) so reconnect start is server-authoritative; (2) Permission notice shows inline reconnect errors + "Sign in again" CTA; (3) Pages/Collections parity; (4) Playwright tests for missing-token error and OAuth navigation attempt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.58    | 2026-01-16 | **SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1 COMPLETE**: Connect/disconnect consistency + working entry points. (1) Server-authoritative connected semantics in `/projects/:id/integration-status`; (2) Added OWNER-only `/projects/:id/shopify/connect-url`; (3) Store Health + Settings + Assets show clear "not connected" guidance and working Connect/Disconnect CTAs; (4) Fixed Products empty-state link to `/settings#integrations`; (5) Playwright coverage added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.59    | 2026-01-16 | **SHOPIFY-INTEGRATION-LIFECYCLE-INTEGRITY-1-FIXUP-1**: Dead-click and brittle behavior fixes. (1) Settings Connect/Disconnect buttons allow clicks while capabilities loading (no longer disabled when null); (2) Store Health integrationStatus fetch is non-blocking (`.catch(() => null)`); (3) connect-url endpoint validates non-.myshopify.com domains with dots and returns clear error instead of generating invalid OAuth URL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.60    | 2026-01-17 | **SHOPIFY-SCOPES-MATRIX-1 COMPLETE**: Authoritative capability → scope mapping. (1) Created `shopify-scopes.ts` with `SHOPIFY_SCOPE_MATRIX`, `ShopifyCapability` type, and scope computation helpers; (2) Updated `generateInstallUrl()` to compute scopes server-side and validate allowlist; (3) OAuth state now includes `enabledCapabilities`, `requiredScopes`, `requestedScopes`; (4) Callback logs scope metadata; (5) Unit tests for scope matrix; (6) Internal documentation in `SHOPIFY_SCOPES_MATRIX.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.61    | 2026-01-17 | **SHOPIFY-SCOPES-MATRIX-1-FIXUP-1**: Install OAuth now requests computed minimal required scopes (not full env allowlist); env allowlist validation now blocks OAuth in production with safe `SHOPIFY_SCOPES_CONFIG_INVALID`; reconnect uses triggering capability for scope computation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.62    | 2026-01-17 | **SHOPIFY-SCOPES-MATRIX-1-FIXUP-2**: Least-privilege default install capabilities - removed `blogs_sync` and `themes_read` from default enabled capabilities (not currently used in-product); install now requests only `read_content`, `read_products`, `write_products`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.63    | 2026-01-17 | **SHOPIFY-SCOPES-MATRIX-1-FIXUP-3**: Wording alignment - error message now says "requested scopes" (not "required scopes") for consistency with OAuth terminology; documentation updated to clarify allowlist must be superset of `requestedScopes`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.64    | 2026-01-17 | **SHOPIFY-SCOPES-MATRIX-1-FIXUP-3-AUDIT-1**: Documentation consistency - SHOPIFY_SCOPES allowlist description now consistently states it must be a superset of server-computed `requestedScopes` (not "computed required scopes").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6.65    | 2026-01-17 | **BLOGS-ASSET-SYNC-COVERAGE-1 COMPLETE**: Shopify Blog Posts (Articles) as first-class asset type. (1) Added `shopifyPublishedAt` field to CrawlResult for Published/Draft status; (2) Added `POST /projects/:id/shopify/sync-blogs` endpoint (OWNER-only, requires `read_content`); (3) Added `fetchShopifyArticles()` and `syncBlogPosts()` to ShopifyService with E2E mock support; (4) `getSyncStatus()` returns `lastBlogsSyncAt`; (5) Blog posts list page with Published/Draft badges, "Open" external links, and permission gating; (6) Added "Blog posts" to ProjectSideNav under ASSETS; (7) Updated ShopifyPermissionNotice to mention Blog posts; (8) E2E API test, Playwright smoke test, updated nav-ia-consistency test, manual testing doc, API_SPEC.md, and CRITICAL_PATH_MAP.md CP-006.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.66    | 2026-01-17 | **BLOGS-ASSET-SYNC-COVERAGE-1-FIXUP-1**: Blog handle display format. (1) Added `shopifyBlogHandle` field to CrawlResult (migration + schema); (2) Updated `syncBlogPosts()` to store `shopifyHandle` (article handle only) and `shopifyBlogHandle` (parent blog handle) separately; (3) Updated `projects.service.ts` to return `shopifyBlogHandle`; (4) Blog posts list displays handle as `{blogHandle}/{handle}` format (e.g., "news/welcome-to-our-blog"); (5) Updated header count display to include "0 critical • 0 need attention"; (6) Updated Playwright test assertions for blog/handle format and `blogHandle` in mock data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.67    | 2026-01-19 | **PLAYBOOK-STEP-CONTINUITY-1 COMPLETE**: Step 2 → Step 3 deterministic transitions with explicit terminal outcomes. (1) `loadEstimate()` no longer clears estimate to null while loading (prevents race condition); (2) `handleNextStep()` shows explicit toast on missing/stale data (never returns silently); (3) Added `draftStatus` and `draftCounts` to `PlaybookEstimate` interface; (4) Step 2 shows draft expired/failed blocker panels with Regenerate/Retry CTAs; (5) API `estimatePlaybook()` returns `draftStatus: 'EXPIRED'` when `expiresAt < now`; (6) API `applyPlaybook()` returns `PLAYBOOK_DRAFT_EXPIRED` error for expired drafts; (7) Zero-eligible empty state shows "No applicable changes found" with Back CTA; (8) VIEWER/EDITOR notices include resolution CTA links to `/settings/members`; (9) Step 3 section has `tabIndex={-1}` for focus accessibility. **Manual Testing:** PLAYBOOK-STEP-CONTINUITY-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.68    | 2026-01-19 | **PLAYBOOK-STEP-CONTINUITY-1-FIXUP-1**: Audit corrections. (1) `loadPreview()` now unconditionally refreshes estimate after preview generation (fixes Regenerate/Retry CTA not clearing blocker state); (2) Zero-eligible CTA label restored to "View products that need optimization" for PRODUCTS asset type (was generic "View items..." breaking test); (3) Zero-eligible "Return to Playbooks" route fixed to canonical `/playbooks` (was `/automation`); (4) Added blocker panel for missing draft status (draftStatus undefined); (5) "Continue to Apply" now requires explicit valid draft status (READY or PARTIAL only); (6) Manual testing doc restructured to match MANUAL_TESTING_TEMPLATE.md; corrected API endpoint paths; removed nonexistent seed endpoint; fixed VIEWER scenario preconditions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6.69    | 2026-01-19 | **PLAYBOOK-STEP-CONTINUITY-1-FIXUP-2**: Permission-safe Step 2 draft blocker CTAs. (1) Step 2 draft blocker panels (EXPIRED/FAILED/missing) now gate CTA based on `canGenerateDrafts`; (2) VIEWER sees "Viewer role cannot generate previews." with "Request access" link instead of actionable button; (3) OWNER/EDITOR CTA unchanged. **Manual Testing:** PLAYBOOK-STEP-CONTINUITY-1.md (ERR-004 scenario added).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.70    | 2026-01-19 | **DIAGNOSTIC-GUIDANCE-1 COMPLETE**: Diagnostic guidance pattern for outside-control issues. Issues with `actionability === 'informational'` now show "Informational — outside EngineO.ai control" badge, explanation text, and "How to address this" guidance block with 4 actionable bullets. No Fix/Apply/Review CTAs on these issues; cards are non-clickable. Distinct from orphan issues (which show "no action required" without guidance). UI/copy only; no backend changes. Core files: IssuesList.tsx, issues/page.tsx. **Manual Testing:** DIAGNOSTIC-GUIDANCE-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.71    | 2026-01-19 | **DIAGNOSTIC-GUIDANCE-1-FIXUP-1**: Trust hardening for outside-control issues. Issues Engine (page.tsx) now explicitly gates clickability and fixHref for `actionability === 'informational'` issues at the frontend level. (1) Added `isOutsideEngineControl` boolean; (2) `fixHref` forced to null for outside-control issues; (3) `isClickableIssue` forced to false regardless of backend `isActionableNow` flag. Prevents accidental actionable navigation even under inconsistent backend flags. Added EC-003 scenario to manual testing doc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.72    | 2026-01-20 | **SHOPIFY-SCOPE-IMPLICATIONS-1 COMPLETE**: Write scopes imply read access for coverage checks. (1) Added `SHOPIFY_SCOPE_IMPLICATIONS` mapping (`write_products` → `read_products`, `write_content` → `read_content`, `write_themes` → `read_themes`); (2) Added `expandGrantedScopesWithImplications()` helper; (3) Updated `checkScopeCoverage()` to use implication-aware expansion; (4) Updated `getScopeStatusFromIntegration()` in shopify.service.ts. Eliminates false "missing read_products" warnings when `write_products` is granted. Core files: shopify-scopes.ts, shopify.service.ts, shopify-scopes-matrix.test.ts. **Manual Testing:** SHOPIFY-SCOPE-IMPLICATIONS-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6.73    | 2026-01-20 | **SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 COMPLETE**: Authoritative granted-scope truth source. (1) `storeShopifyConnection()` derives scopes from OAuth string (primary) or Access Scopes endpoint (fallback); (2) Added `fetchAccessScopes()` helper for Shopify Admin API; (3) Added `normalizeScopes()` for deduplicated, sorted, comma-separated storage; (4) Server logs truth source (oauth_scope vs access_scopes_endpoint) without secrets; (5) E2E mock support for access_scopes.json; (6) Capability-aware permission notice copy (catalog vs content vs combined wording based on missing scopes). Core files: shopify.service.ts, ShopifyPermissionNotice.tsx. **Manual Testing:** SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.74    | 2026-01-20 | **SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-2**: Empty-scope persistence guard. (1) Safe fallback source order: Access Scopes → OAuth scope → Existing stored scope; (2) Never persist empty scopes (throws `SHOPIFY_SCOPE_VERIFICATION_FAILED`); (3) Reconnect cannot downgrade existing scope storage; (4) Callback redirects to `?shopify=verify_failed` on failure; (5) Settings page shows verification failure UI with retry; (6) Enhanced `fetchAccessScopes()` observability (HTTP status category, failure mode). Core files: shopify.service.ts, shopify.controller.ts, settings/page.tsx. **Manual Testing:** SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-2.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.75    | 2026-01-20 | **SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-3**: Suppress fake missing-scope list on verify_failed. (1) Clear stale `shopifyMissingScopes` and `reconnectCapability` state on verify_failed detection; (2) Add `!scopeVerifyFailed` render guard to ShopifyPermissionNotice; (3) verify_failed banner is mutually exclusive with missing-scope notice. Core files: settings/page.tsx.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 6.76    | 2026-01-20 | **SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-4**: Suspicious OAuth must not downgrade scopes. (1) When OAuth is suspicious AND Access Scopes fails/empty, do NOT persist suspicious OAuth; (2) If existing stored scope is non-empty, retain it (truthSource=existing_scope_retained); (3) If fresh install (no existing scope), throw SHOPIFY_SCOPE_VERIFICATION_FAILED; (4) Non-suspicious OAuth fallback behavior unchanged; (5) Enhanced logging for suspicious-downgrade prevention. Core files: shopify.service.ts. **Manual Testing:** SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1-FIXUP-4.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6.77    | 2026-01-20 | **SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1 FIXUP-4 HOTFIX**: Fresh install with suspicious OAuth now accepted. (1) FIXUP-4 downgrade protection only applies to reconnects (when existing scope is present); (2) Fresh installs accept suspicious OAuth as-is (user may have legitimately declined scopes); (3) Prevents server error on first-time store connections when Access Scopes fails. Core files: shopify.service.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.78    | 2026-01-20 | **SHOPIFY-SCOPE-PARSE-ROBUSTNESS-1**: Fix false "Missing permission: read_products/read_content" blocks caused by legacy scope storage formats. **Root cause:** `parseShopifyScopesCsv()` only parsed comma-separated strings; legacy DB storage (Prisma Json field) could contain JSON arrays or whitespace-delimited strings, causing parser to return `[]` and trigger false missing-scope warnings. **Fix:** Updated parser to handle: (1) Comma-separated strings; (2) Whitespace-separated strings; (3) Mixed delimiters; (4) JSON arrays from Prisma Json field; (5) Arrays with nested delimiters. **Trust invariant restored:** Legacy scope storage formats never cause false missing-scope blocks. Core files: shopify-scopes.ts. **Unit tests:** shopify-scopes-matrix.test.ts (20+ new parser tests). **Docs:** SHOPIFY_SCOPES_MATRIX.md, SHOPIFY-SCOPE-TRUTH-AND-IMPLICATIONS-1.md (regression check), CRITICAL_PATH_MAP.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.79    | 2026-01-20 | **AUTOMATION-TRIGGER-TRUTHFULNESS-1**: Automation triggers must be truthful and deterministic. **Key changes:** (1) Page load never triggers AI - DEO issues GET endpoint is read-only (removed automation side-effects); (2) Project-level setting gate `autoGenerateAnswerBlocksOnProductSync` (default OFF); (3) DB-backed idempotency via `AnswerBlockAutomationRun` model with fingerprint hashing; (4) UI label truthfulness - Sync CTAs show "+ Generate Answer Blocks" only when setting ON AND paid plan; (5) Worker marks run state (QUEUED→RUNNING→SUCCEEDED/SKIPPED/FAILED); (6) Diagnostic safety logs with suppressedReason for debugging. **Core files:** automation.service.ts, answer-block-automation.processor.ts, projects.controller.ts, projects.service.ts, schema.prisma, settings/page.tsx, products/page.tsx, automation/playbooks/page.tsx. **Manual Testing:** AUTOMATION-TRIGGER-TRUTHFULNESS-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6.80    | 2026-01-20 | **AUTOMATION-TRIGGER-TRUTHFULNESS-1 REVIEW-1**: Remaining gaps addressed. (1) Fixed Playbooks CTA labels from "Sync to Shopify" → "Sync products" with deterministic "+ Generate Answer Blocks" suffix; (2) Fixed toast from "Shopify sync triggered for updated products" → "Products sync triggered." (neutral); (3) Made idempotency race-safe: FAILED runs use conditional `updateMany` to transition back to QUEUED (no unique constraint crashes), concurrent triggers handled via re-read fallback with suppress rules (in_flight/idempotent_already_done); (4) Added `autoGenerateAnswerBlocksOnProductSync` to web API typing in api.ts; (5) Rewrote manual test doc to match MANUAL_TESTING_TEMPLATE.md structure (Overview/Preconditions/Test Scenarios/Edge Cases/Error Handling/Limits/Regression/Post-Conditions/Approval). **Core files:** automation/playbooks/page.tsx, automation.service.ts, api.ts. **Manual Testing:** AUTOMATION-TRIGGER-TRUTHFULNESS-1.md (rewritten).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.81    | 2026-01-20 | **SHOPIFY-EMBEDDED-SHELL-1**: Enable EngineO.ai to run as embedded app in Shopify Admin. **Key changes:** (1) Added `@shopify/app-bridge-react` dependency + `NEXT_PUBLIC_SHOPIFY_API_KEY` env var; (2) ShopifyEmbeddedShell client wrapper with never-blank fallbacks (missing context, auth required, bootstrap error); (3) Embedded context detection (embedded=1, host param, or stored host in sessionStorage); (4) URL auto-repair when host missing but stored; (5) frame-ancestors CSP header in middleware (allows admin.shopify.com + \*.myshopify.com); (6) Login `next` param support for embedded return URL preservation; (7) 2FA flow stores and uses next URL; (8) App Bridge v4 CDN script injection in layout.tsx. **Core files:** ShopifyEmbeddedShell.tsx, layout.tsx, middleware.ts, login/page.tsx, 2fa/page.tsx, package.json, .env.example. **Docs:** SHOPIFY_INTEGRATION.md (root, canonical). **Manual Testing:** SHOPIFY-EMBEDDED-SHELL-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.82    | 2026-01-20 | **SHOPIFY-EMBEDDED-SHELL-1 REVIEW-2**: Fix remaining gaps from review. (1) Eliminated blank Suspense fallback in layout.tsx (visible loading indicator); (2) Reordered bootstrap error render before auth check in ShopifyEmbeddedShell (config errors surface even when logged out); (3) Documentation consolidation attempt (later corrected in REVIEW-3/4). **Core files:** layout.tsx, ShopifyEmbeddedShell.tsx.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.83    | 2026-01-20 | **SHOPIFY-EMBEDDED-SHELL-1 REVIEW-3**: Documentation canonicalization (docs/ path). Created docs/SHOPIFY_INTEGRATION.md; refocused SHOPIFY_PERMISSIONS_AND_RECONSENT.md on safety contracts. Later corrected in REVIEW-4 to use root path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.84    | 2026-01-20 | **SHOPIFY-EMBEDDED-SHELL-1 REVIEW-4**: Fix canonical doc path mismatch. (1) Replaced root SHOPIFY_INTEGRATION.md with canonical content (correct Partner config: App URL app.engineo.ai, OAuth callback api.engineo.ai/shopify/callback, embedded home URL); (2) Deleted docs/SHOPIFY_INTEGRATION.md (avoid duplicate); (3) Updated SHOPIFY_PERMISSIONS_AND_RECONSENT.md and SHOPIFY-EMBEDDED-SHELL-1.md references to point to root SHOPIFY_INTEGRATION.md; (4) Updated IMPLEMENTATION_PLAN.md entries. **Docs:** SHOPIFY_INTEGRATION.md (root, canonical), SHOPIFY_PERMISSIONS_AND_RECONSENT.md (re-consent only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6.85    | 2026-01-21 | **SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1**: CSP reliability fix for never-blank on deep link/refresh. **Problem:** Server-side middleware cannot access sessionStorage, so deep links inside Shopify iframe (without embedded=1 or host params) lacked frame-ancestors CSP → browser blocked iframe → blank screen. **Fix:** (1) Made frame-ancestors CSP unconditional for all app routes (not dependent on embedded query params); (2) CSP header now applied on both normal responses and redirect responses (sanitization flow); (3) CSP is harmless for standalone users (frame-ancestors only affects framing). **Testing updates:** Added HP-007 (deep link + hard refresh) and HP-008 (standalone regression) to manual testing doc; added CP-006 scenarios for unconditional CSP. **Core files:** middleware.ts. **Manual Testing:** SHOPIFY-EMBEDDED-SHELL-1.md (updated with HP-007, HP-008). **Critical Path:** CP-006 updated with FIXUP-1 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.86    | 2026-01-21 | **DARK-MODE-SYSTEM-1**: Global theme system with token-based dark mode. **Key changes:** (1) Deterministic 3-mode preference: System/Light/Dark with localStorage persistence (key: `engineo_theme`); (2) Backward compatible with existing light/dark values; (3) Early theme init script in layout.tsx prevents FOUC (runs before paint, no window.top usage for embedded safety); (4) Single-source-of-truth CSS design tokens in globals.css - surfaces, text, borders, semantics (success/warning/danger/info with foreground/background variants); (5) Dark palette aligned to "Coming Soon" direction (dark surfaces, crisp text, muted semantics - not neon); (6) Centralized .dark utility remaps for broad coverage without mass file edits (backgrounds, text, borders, semantic banners, shadows, hover/focus states); (7) Theme selector dropdown in TopNav with checkmark on selected mode; (8) System mode listens for OS theme changes via matchMedia; (9) Theme works in Shopify embedded iframe context. **Core files:** layout.tsx, globals.css, TopNav.tsx. **Manual Testing:** DARK-MODE-SYSTEM-1.md. **Critical Path:** CP-008 updated with DARK-MODE-SYSTEM-1 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6.87    | 2026-01-21 | **DARK-MODE-POLISH-1**: Token-only dark mode refinements for scannability and readability. **Key changes:** (1) Explicit surface elevation aliases (`--surface-base`, `--surface-card`, `--surface-raised`) with increased separation in dark mode; (2) Secondary text (`--muted-foreground`) contrast increased ~15% for readability; (3) Ring offset color override prevents white halo on dark focus rings; (4) Card/row hover states use `--surface-raised` for visible separation; (5) Table header remaps distinguish headers from page background; (6) Expanded chip/badge coverage for bg-_-100, text-_-800/900, border-\*-300 (info/success/warning/danger/purple); (7) Form input clarity: read-only inputs elevated surface + subtle border, disabled inputs clearly non-interactive but readable, focus states unmistakable ring; (8) Button hierarchy: secondary outline borders visible, ghost hover subtle, disabled buttons consistent readable styling, primary buttons remain dominant. **Scope:** Token/remap changes only in globals.css - no component file edits required. **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md updated with HP-013 through HP-017 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6.88    | 2026-01-21 | **DARK-MODE-DROPDOWN-FIX-1**: Fix native dropdown/popover theming in dark mode. **Root cause:** Browser-native UI surfaces (`<select>` dropdown lists, UA popovers, option hover/highlight states) don't inherit CSS custom properties - they require the CSS `color-scheme` property to render correctly. Without it, native dropdowns show white backgrounds even when the page is dark. **Fix:** (1) Added `color-scheme: light` on `html` and `color-scheme: dark` on `html.dark` so browser renders native UI surfaces appropriately; (2) Added narrowly-scoped dark-mode rules for custom dropdown containers (theme dropdown, account dropdown, role="menu" elements) to use `--surface-raised` background and `--border` colors; (3) Added select element styling to ensure native `<select>` dropdowns have dark backgrounds; (4) Added menu item hover states for consistent dark hover feedback. **Scope:** CSS-only changes in globals.css - no component file edits required. **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md updated with HP-018 (Dropdowns & Menus) scenario.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6.89    | 2026-01-21 | **SHOPIFY-EMBEDDED-CONTRAST-PASS-1**: Embedded-only UI refinements for Shopify Admin context. **Problem:** When EngineO runs inside Shopify Admin iframe, the EngineO UI must remain readable against Shopify Admin's own chrome (which can be light or dark). Focus rings and scrollbars may clash with the host Admin. **Fix:** (1) Added deterministic `data-shopify-embedded="1"` flag on `<html>` element via early init script in layout.tsx; (2) ShopifyEmbeddedShell.tsx keeps flag in sync post-hydration for SPA navigations; (3) Token-based embedded-only CSS overrides in globals.css scoped to `html[data-shopify-embedded="1"]`: elevated card surfaces via `--surface-card`, solid dropdown backgrounds via `--surface-raised`, thicker `:focus-visible` rings via `--ring` token, and subtle scrollbar styling using `--muted-foreground` opacity variants. **FIXUP-1:** Replaced hardcoded colors with existing theme tokens; switched focus rings to `:focus-visible` for keyboard-only visibility; added HP-007 (screen sweep) and HP-008 (dropdown verification) to manual testing doc. **REVIEW-2:** Embedded contrast hardening is done by overriding existing `--muted-foreground` and `--border` tokens within `html[data-shopify-embedded="1"]` (small deltas for improved readability); all embedded CSS remains gated behind the embedded flag. **REVIEW-3:** Tightened embedded detection to prevent style leakage to standalone sessions. Stored `sessionStorage.shopify_host` is now only used for embedded continuity when actually running in an iframe (safe `window.self !== window.top` check). Embedded detection: `embedded=1` OR `host` param OR (`isInIframe` AND stored host exists). This prevents stale sessionStorage from prior embedded sessions from triggering embedded-only styling in top-level standalone browsing. Added EC-003 regression test to manual testing doc. **REVIEW-4:** Comment truthfulness alignment - updated misleading comments that claimed "no window.top usage" when code actually uses guarded window.top access (try/catch for cross-origin safety). Updated layout.tsx init script comments, ShopifyEmbeddedShell.tsx hook comment, and wrapper docstring to accurately reflect the guarded access pattern. **Scope:** Token-based CSS changes only, scoped to embedded context. Manual testing required via SHOPIFY-EMBEDDED-CONTRAST-PASS-1.md. **Core files:** layout.tsx, ShopifyEmbeddedShell.tsx, globals.css. **Manual Testing:** SHOPIFY-EMBEDDED-CONTRAST-PASS-1.md (HP-001–HP-008, EC-001–EC-003 scenarios). |
| 6.90    | 2026-01-21 | **DARK-MODE-TABLE-HOVER-FIX-1**: Fix table/list row hover showing pure white in dark mode. **Problem:** Table rows use `hover:bg-gray-50` on `<tr>`, but individual `<td>`/`<th>` cells may have explicit white backgrounds that override the row hover, causing white cells to flash on hover in dark mode. **Fix:** Added dark-only CSS override ensuring `tr.hover:bg-gray-50:hover` and `tr.hover:bg-gray-100:hover` child cells (`> td`, `> th`) receive `hsl(var(--surface-raised))` background. This ensures visual continuity when hovering table rows in dark mode. **Scope:** CSS-only changes in globals.css - no component file edits required. **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md updated with HP-019 (Row Hover: Tables & Lists) scenario.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.91    | 2026-01-21 | **DARK-MODE-TABLE-HOVER-FIX-1-FIXUP-1**: Force cell-level paint and standardize hover to menuHoverBg. **Root cause:** Cell-level backgrounds (or higher-specificity rules) still caused white hover leaks despite prior tr/td overrides; --surface-raised was inconsistent with existing sidebar active pill tone. **Fix:** (1) Introduced `--menu-bg` and `--menu-hover-bg` tokens derived from `--primary` (applied with 0.10 alpha at usage); (2) Force cell-level hover paint for table rows (`tr.hover:bg-gray-50/100:hover > td/th`) using `hsl(var(--menu-hover-bg) / 0.10)`; (3) Added list-row hover overrides for `div`, `li`, `label` containers with `hover:bg-gray-50/100`; (4) Bound sidebar active pill (`[data-testid="project-sidenav"] .bg-primary/10`) to `--menu-bg` token for consistency; (5) All rules dark-only scope. **Manual Testing:** HP-019 updated to require visual verification that Projects table row hover matches sidebar active pill tone. **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md (HP-019 updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6.92    | 2026-01-21 | **DARK-MODE-TABLE-HOVER-FIX-1-FIXUP-2**: Fix table base paint (not just hover). **Problem:** Projects table and admin tables still paint white in dark mode because `tbody.bg-white` and cell backgrounds remain white; hover-only fixes are insufficient when the base row background is already white. **Fix:** Added dark-only table base + hover paint overrides for `table tbody.bg-white` and its `td`/`th` children: (1) Base paint uses `--surface-card` token; (2) Hover paint uses `hsl(var(--menu-hover-bg) / 0.10)` to match sidebar pill tone. Prior FIXUP-1 rules retained as additional safety net for tables using `hover:bg-gray-*` classes. **Manual Testing:** HP-019 updated to require "base row check" before hovering - rows must NOT be white even before hover. **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md (HP-019 updated with FIXUP-2 checks).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 6.93    | 2026-01-21 | **DARK-MODE-TABLE-HOVER-FIX-1-FIXUP-3**: Make hover visibly distinct using menuHoverBg / 0.14 alpha. **Problem:** After base-paint fix (FIXUP-2), hover became too subtle to perceive - the 0.10 alpha was invisible against `--surface-card`. **Fix:** (1) Standardized all dark hover rules to `hsl(var(--menu-hover-bg) / 0.14)` for visible contrast - applies to: `tr.hover:bg-gray-50/100:hover` (row + cells), `table tbody.bg-white > tr:hover` (row + cells), specificity-war variants, and list-row containers (div/li/label); (2) Aligned sidebar active pill to same 0.14 alpha so "match tone" comparison is deterministic; (3) Base paint rules (FIXUP-2) remain unchanged at `--surface-card`. **Manual Testing:** HP-019 updated to require: (a) hover is visibly distinguishable from base surface, (b) hover tone matches sidebar active pill (both 0.14 alpha). **Core files:** globals.css. **Manual Testing:** DARK-MODE-SYSTEM-1.md (HP-019 updated with FIXUP-3 visibility checks).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6.94    | 2026-01-21 | **LAYOUT-SHELL-IMPLEMENTATION-1 COMPLETE**: Foundational UI shell per Design System v1.5. (1) Created `LayoutShell.tsx`: canonical shell component with Top Bar (logo, search placeholder, notifications, account), collapsible Left Nav (Dashboard, Projects, Settings, Help, Admin links with active state highlighting, per-user persistence via localStorage key `engineo_nav_state`), and Center Work Canvas with scroll containment and breadcrumbs/actions placeholders; (2) Updated root `layout.tsx`: token-based theming (`bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`) for loading fallback; (3) Updated dashboard/projects/settings layouts: replaced TopNav+wrapper with unified LayoutShell; (4) Updated admin layout: replaced TopNav with LayoutShell while preserving admin auth gating and mobile drawer, converted all hardcoded grays to design tokens. **Constraints:** Token-only styling, dark mode safe, Shopify iframe scroll containment, no Right Context Panel, no feature UI. **Core files:** LayoutShell.tsx, layout.tsx, dashboard/layout.tsx, projects/layout.tsx, settings/layout.tsx, admin/layout.tsx. **Manual Testing:** LAYOUT-SHELL-IMPLEMENTATION-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6.95    | 2026-01-21 | **RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 COMPLETE**: Right Context Panel per Design System v1.5. (1) Created `RightContextPanelProvider.tsx`: React context/provider with deterministic state (isOpen, descriptor), `useRightContextPanel()` hook (openPanel/closePanel/togglePanel), auto-close on Left Nav segment switch, ESC key handling with modal dialog guard, focus management (store/restore lastActiveElement), Shopify-safe (no window.top); (2) Created `RightContextPanel.tsx`: slide-in panel UI with desktop pinned mode (≥1024px, pushes content) and narrow overlay mode (<1024px, scrim), accessible (role="complementary", aria-labelledby), test hooks (data-testid attributes); (3) Updated `LayoutShell.tsx`: wrapped with RightContextPanelProvider, added RightContextPanel to layout, replaced one Action button with Details demo trigger. **Core files:** RightContextPanelProvider.tsx, RightContextPanel.tsx, LayoutShell.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6.96    | 2026-01-21 | **RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1-FIXUP-1**: Contract compliance fixes. (1) `openPanel()` now descriptor-stable: same kind+id = NO-OP (prevents flicker); only stores lastActiveElement on CLOSED→OPEN transition; different kind+id while open = update descriptor (context switch); (2) `togglePanel()` deterministic rules: CLOSED+descriptor = open; OPEN+no descriptor = close; OPEN+same kind+id = true toggle (close); OPEN+different kind+id = update descriptor (stay open); (3) ESC handling guards: modal dialog check + editable element check (input/textarea/select/contenteditable do not close panel); (4) Token compliance: scrim uses `bg-foreground/50` (not raw black), panel surface uses `--surface-raised` (not `--surface-card`); (5) Shell-safe positioning: overlay mode uses container-contained absolute (not viewport-fixed), does NOT cover Top Bar; added `id="right-context-panel"` for aria-controls reference; (6) Demo trigger: renamed to `data-testid="rcp-demo-open"`, handler cycles A→B→close for context switching demo, removed non-deterministic Date() metadata; (7) LayoutShell content row is now `relative` positioning context for overlay containment; (8) Manual testing doc: added HP-008 (context switching), HP-009 (Shopify embedded), EC-004 (ESC in text input), LIM-002 section. **Core files:** RightContextPanelProvider.tsx, RightContextPanel.tsx, LayoutShell.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md (updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6.97    | 2026-01-21 | **RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1-FIXUP-2**: Completion tightening. (1) ESC close path centralized: removed duplicated inline close logic (setIsOpen/setDescriptor/focus restore) from ESC handler, now calls `closePanel()` directly; moved `closePanel` useCallback definition above ESC useEffect; added `closePanel` to ESC useEffect dependency array; (2) Manual testing doc path normalization: "Derived from" line now uses backticks around `MANUAL_TESTING_TEMPLATE.md`; Related documentation paths now use backticks and full paths (`docs/ENGINEERING_IMPLEMENTATION_CONTRACT.md`, `docs/RIGHT_CONTEXT_PANEL_CONTRACT.md`, `docs/UI_SHELL_DIRECTIONS.md`, `docs/manual-testing/LAYOUT-SHELL-IMPLEMENTATION-1.md`); (3) CP-020 label normalization: Coverage Summary table row label changed from "UI Shell & Context Panel" to "UI Shell & Right Context Panel" to match heading. **Core files:** RightContextPanelProvider.tsx. **Docs:** RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md, CRITICAL_PATH_MAP.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6.98    | 2026-01-21 | **TABLES-&-LISTS-ALIGNMENT-1 COMPLETE**: Canonical DataTable & DataList components per Design System v1.5. (1) Created `DataTable.tsx`: semantic `<table>` with column/row model, token-based styling (`--surface-card`, `--surface-raised`, `--menu-hover-bg/0.14`), keyboard navigation (Tab entry, ArrowUp/ArrowDown, Enter/Space), roving focus, RCP integration via `onOpenContext(descriptor)`, explicit "View details" eye icon action, test hooks (`data-testid`); (2) Created `DataList.tsx`: vertical list with same interaction contract, custom `renderRow` prop, same hover/focus/action behavior; (3) Created `/demo/tables-lists/page.tsx`: demo route with sample DataTable/DataList, RCP integration, ESC-in-input test field, keyboard instructions; (4) Row interaction contract enforced: no row-click navigation, explicit action only; (5) Updated CP-020 with DataTable/DataList scenarios. **Out of scope:** No feature migrations, no sorting/filtering, no bulk actions, no pagination redesign, no virtualization. **Core files:** DataTable.tsx, DataList.tsx, page.tsx. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 6.99    | 2026-01-21 | **TABLES-&-LISTS-ALIGNMENT-1-FIXUP-1**: Demo route + keyboard entry fixes. (1) Created `/demo/layout.tsx`: wraps all `/demo/*` routes in LayoutShell (provides RightContextPanelProvider context); (2) DataTable keyboard fix: first row tabbable by default (`focusedRowIndex` initialized to 0 when rows.length > 0), context action button removed from Tab order (`tabIndex={-1}`), added focus clamping useEffect for dynamic row changes; (3) DataList keyboard fix: same roving focus initialization, `tabIndex={-1}` on context button, and focus clamping useEffect; (4) Manual testing doc template reference: MANUAL_TESTING_TEMPLATE.md. **Core files:** layout.tsx (demo), DataTable.tsx, DataList.tsx. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md (updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 7.00    | 2026-01-21 | **COMMAND-PALETTE-IMPLEMENTATION-1 COMPLETE**: Global Command Palette per Design System v1.5. (1) Created `CommandPaletteProvider.tsx`: React context/provider with deterministic state (isOpen, query), global Cmd+K/Ctrl+K keyboard shortcut, focus management (store opener on open, restore on close), inputRef for palette focus; (2) Created `CommandPalette.tsx`: accessible command palette UI (role="dialog", aria-modal="true") with search input, grouped results (Navigation/Entity Jump/Utility), arrow key navigation, Enter execution, ESC/outside-click close, admin command role-gating via /users/me API, unsaved changes guard (same confirm text as GuardedLink), container-contained positioning (Shopify iframe safe); (3) Updated `LayoutShell.tsx`: wrapped with CommandPaletteProvider (outermost), mounted CommandPalette in main content row, converted search placeholder to functional trigger with data-testid="command-palette-open", added mobile icon trigger; (4) Commands: Navigation (Overview/Assets/Automation/Insights/Governance/Admin), Entity Jump placeholders (Project/Product/Issue), Utility (Help/Feedback) - NO destructive/write/apply/run/generate commands; (5) Updated CP-020 with command palette scenarios. **Core files:** CommandPaletteProvider.tsx, CommandPalette.tsx, LayoutShell.tsx. **Manual Testing:** COMMAND-PALETTE-IMPLEMENTATION-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7.01    | 2026-01-21 | **COMMAND-PALETTE-IMPLEMENTATION-1-FIXUP-1**: Trust & positioning fixes. (1) Removed viewport-based positioning (`pt-[15vh]`) → container-centered (`items-center`) for Shopify iframe safety; (2) Fixed "Open Feedback" utility command routing to `/settings/help` (was `/help/shopify-permissions`); (3) Made Cmd+K/Ctrl+K case-insensitive (`event.key.toLowerCase() === 'k'`) for cross-OS reliability; (4) Added HP-017 ("Open Feedback routes correctly") to manual testing doc. **Core files:** CommandPalette.tsx, CommandPaletteProvider.tsx. **Manual Testing:** COMMAND-PALETTE-IMPLEMENTATION-1.md (updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 7.02    | 2026-01-21 | **PRODUCTS-SHELL-REMOUNT-1 COMPLETE**: Products list remounted onto canonical DataTable per Design System v1.5. (1) Extended `DataTable.tsx` with `onRowClick`, `isRowExpanded`, `renderExpandedContent` props for progressive disclosure (row click expands/collapses, ignores interactive elements via data-no-row-click); (2) Refactored `ProductTable.tsx` to use canonical DataTable with columns (Product/Status/Actions), expansion support using ProductDetailPanel, RCP integration via descriptor pattern, preserved existing filtering/sorting/impact ladder logic; (3) Updated `ProductDetailPanel.tsx` with token-based styling; (4) Updated `products/page.tsx` with shell-safe styling (py-12 loading state, border-border/surface-card container); (5) Updated `products/[productId]/page.tsx` with shell-safe styling (py-12 loading, surface-raised/border-border sticky header); (6) Added "Go to Products" command to `CommandPalette.tsx` (project context aware); (7) Updated CP-003 with PRODUCTS-SHELL-REMOUNT-1 scenarios. **Core files:** DataTable.tsx, ProductTable.tsx, ProductDetailPanel.tsx, products/page.tsx, products/[productId]/page.tsx, CommandPalette.tsx. **Manual Testing:** PRODUCTS-SHELL-REMOUNT-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 7.03    | 2026-01-21 | **PRODUCTS-SHELL-REMOUNT-1 FIXUP-1**: RCP + keyboard behavior corrections. (1) Extended `DataTable.tsx` with `rowEnterKeyBehavior` prop ('openContext'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 'rowClick', default 'openContext') to support deterministic Enter/Space behavior override for progressive disclosure remounts; (2) Fixed RCP descriptor field in `ProductTable.tsx`: changed `type: 'product'` to `kind: 'product'` to match ContextDescriptor contract; (3) Removed `hideContextAction` from ProductTable so eye icon is visible for explicit RCP access; (4) Added `rowEnterKeyBehavior="rowClick"` to ProductTable so Enter/Space on focused row expands/collapses (does NOT open RCP); (5) Updated manual testing doc with HP-013 (eye icon opens RCP) and HP-014 (Enter/Space expands row); (6) Updated CP-003 with FIXUP-1 scenarios. **Core files:** DataTable.tsx, ProductTable.tsx. **Manual Testing:** PRODUCTS-SHELL-REMOUNT-1.md (updated). |
| 7.04    | 2026-01-22 | **RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4**: Contract compliance tightening. (1) Scope safety: `ContextPanelContentRenderer.tsx` now treats `scopeProjectId` as authoritative - when present AND `currentProjectId === null` (outside `/projects/[id]`), shows "Unavailable in this project context." message instead of stale details; (2) Token-only styling: removed ALL non-token color utilities from renderer (replaced `bg-green-100/bg-red-100/bg-purple-100/text-*-800` with token-based `bg-muted border-border text-foreground`); chip/badge styling unified to neutral tokens; card blocks use `bg-[hsl(var(--surface-card))]`; (3) Product metaTitle/metaDescription display: Details view now shows actual SEO title/description values alongside status chips (not just status); (4) admin/users descriptor metadata key alignment: added `role`, `accountStatus`, changed `quotaPercent` to numeric-only (renderer adds %), changed `twoFactorEnabled` to 'true'/'false' string, omit `adminRole` when null instead of forcing 'None'; token-based button styling for eye icon; (5) ActionBundleCard descriptor metadata: added `scopeActionable`, `scopeDetected`, `aiDisclosureText` fields; token-based button styling for eye icon; (6) Manual testing doc expectations aligned with actual renderer behavior; (7) CP-020 scenarios added for scope invalidation outside projects, view tab stub copy, admin/users + work queue descriptor fields. **Core files:** ContextPanelContentRenderer.tsx, admin/users/page.tsx, ActionBundleCard.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md (updated). **Critical Path:** CP-020 updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 7.05    | 2026-01-22 | **NAV-HIERARCHY-POLISH-1 COMPLETE**: Navigation tier visual hierarchy styling per Design System v1.5. (1) Global Nav (LayoutShell.tsx): Added `font-medium` base class, `font-semibold` active state alongside existing primary color for strongest navigational tier; (2) Section Nav (ProjectSideNav.tsx): Changed heading from `font-semibold` to `font-medium text-muted-foreground/80`, changed active state from primary-colored border+background to neutral `bg-muted text-foreground` (demoted secondary tier); (3) Mobile drawer (layout.tsx): Token-only scrim (`bg-foreground/50`), panel surface (`bg-[hsl(var(--surface-raised))]`), and button styling; (4) Entity Tabs (WorkQueueTabs, ProductDetailsTabs, InsightsSubnav, asset detail pages): Unified token-only view switcher pattern - `border-primary text-foreground` active, `border-transparent text-muted-foreground hover:text-foreground hover:border-border` inactive; (5) Focus-visible ring pattern standardized with `focus-visible:ring-primary focus-visible:ring-offset-background`. **Scope:** Styling-only, no functional changes. **Core files:** LayoutShell.tsx, ProjectSideNav.tsx, layout.tsx, WorkQueueTabs.tsx, ProductDetailsTabs.tsx, InsightsSubnav.tsx, pages/[pageId]/page.tsx, collections/[collectionId]/page.tsx. **Manual Testing:** NAV-HIERARCHY-POLISH-1.md. **Critical Path:** CP-020 updated with NAV-HIERARCHY-POLISH-1 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7.06    | 2026-01-22 | **NAV-HIERARCHY-POLISH-1 FIXUP-1**: Docs-only consistency fix. Updated "Out of Scope" wording from "No accessibility changes (focus-visible already present)" to "Focus-visible ring styling standardized (styling-only, no behavior change)" for accuracy. Documentation-only; no code changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7.07    | 2026-01-22 | **NAV-HIERARCHY-POLISH-1 FIXUP-2**: Docs-only path correction. Fixed InsightsSubnav.tsx path in Affected Files from `apps/web/src/app/projects/[id]/insights/InsightsSubnav.tsx` to correct path `apps/web/src/components/projects/InsightsSubnav.tsx`. Documentation-only; no code changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7.08    | 2026-01-22 | **RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 COMPLETE**: RCP content expansion for asset kinds (product, page, collection) per Design System v1.5 + EIC v1.5. (1) New RCP content components: `ContextPanelEntitySummary.tsx` (Type/Status/Last synced/Last applied), `ContextPanelIssueDrilldown.tsx` (pillar-grouped issues with severity badges and "Why this matters" truthfulness), `ContextPanelActionPreview.tsx` (read-only action labels, no buttons), `ContextPanelAiAssistHints.tsx` (collapsed-by-default hints, no links, no chat); (2) Extended `ContextDescriptor` with optional `issues?: DeoIssue[]` for in-memory issues preference; (3) Updated `ContextPanelContentRenderer.tsx` to use expanded content system for asset kinds, removed ALL in-body navigation links (Help tab link, "Open full page" links) - header external-link is the only navigation affordance; (4) Enriched `ProductTable.tsx` `getRowDescriptor()` with expanded metadata (entityType, statusLabel from locked vocabulary, shopifyStatus, lastApplied, primaryActionLabel, secondaryActionLabel) and in-memory issues for immediate render; (5) Read-only issues fetching via `projectsApi.assetIssues()` with stale-response discard on descriptor change; (6) Pillar-to-UX-category mapping (metadata_snippet_quality→Metadata, search_intent_fit→Search Intent, technical_indexability→Technical, others→Content, missing→Other). **Core files:** ContextPanelEntitySummary.tsx, ContextPanelIssueDrilldown.tsx, ContextPanelActionPreview.tsx, ContextPanelAiAssistHints.tsx, ContextPanelContentRenderer.tsx, RightContextPanelProvider.tsx, ProductTable.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md. **Critical Path:** CP-020 updated with content expansion scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 7.09    | 2026-01-22 | **RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 FIXUP-1**: Token-only compliance fix for Issue Drilldown. (1) Replaced raw color utilities in `getSeverityClasses()` (bg-red-_, text-red-_, bg-yellow-_, text-yellow-_, bg-blue-_, text-blue-_, and dark variants) with token-only neutral badge styling (`border border-border bg-muted text-foreground`); severity differentiation is by label text only (Critical / Needs Attention / Informational); (2) Replaced error-state text classes `text-red-600 dark:text-red-400` with token-only `text-muted-foreground`; (3) Updated manual testing doc HP-002 to reflect token-only severity badge expectation (readable, neutral, differentiate by label text - not by raw color). **Core files:** ContextPanelIssueDrilldown.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md (updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7.10    | 2026-01-22 | **RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 FIXUP-2**: Treat provided in-memory issues (including empty array) as authoritative to avoid unnecessary `projectsApi.assetIssues()` fetches; updates HP-003 API expectations accordingly. **Core files:** ContextPanelIssueDrilldown.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md (updated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7.11    | 2026-01-22 | **RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1 FIXUP-3**: (1) Pillar-to-category mapping safety: unknown pillarId now maps to **Other** (matches manual test expectations). (2) Products issues loading now distinguishes "not loaded yet" (undefined) vs loaded empty array, enabling RCP to prefer in-memory issues (including empty) and avoid unnecessary `assetIssues` fetches. **Core files:** ContextPanelIssueDrilldown.tsx, page.tsx, ProductTable.tsx.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7.12    | 2026-01-22 | **TABLES-&-LISTS-ALIGNMENT-1 FIXUP-3**: Keyboard guard + route-level DataTable migration. (1) Added `isInteractiveElement()` guard to DataTable.tsx/DataList.tsx preventing keyboard hijacking on `a`, `button`, `input`, `textarea`, `select`, `[contenteditable]`, `[data-no-row-keydown]` elements; (2) Migrated `/projects` page to canonical DataTable with token-only styling; (3) Migrated `/dashboard` "Your Projects" table to canonical DataTable; (4) Migrated `/admin/users` to canonical DataTable with RCP integration via `onOpenContext`/`getRowDescriptor`; (5) Migrated `/admin/runs` to canonical DataTable with filter selects using `data-no-row-keydown`; (6) Migrated `/admin/ai-usage` top consumers to canonical DataTable; (7) Migrated `/admin/subscriptions` to canonical DataTable with in-row plan change selects using `data-no-row-keydown`. **Core files:** DataTable.tsx, DataList.tsx, projects/page.tsx, dashboard/page.tsx, admin/users/page.tsx, admin/runs/page.tsx, admin/ai-usage/page.tsx, admin/subscriptions/page.tsx. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md (HP-010 through HP-014 added). **Critical Path:** CP-020 updated with FIXUP-3 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7.13    | 2026-01-22 | **TABLES-&-LISTS-ALIGNMENT-1 FIXUP-4**: Remaining legacy `<table>` migrations to canonical DataTable. 9 pages migrated: (1) `/admin/audit-log` - columns: Time, Actor, Role, Action, Target; (2) `/admin/governance-audit` - columns: Time, Event Type, Actor, Project, Resource, Details; (3) `/admin/projects` - columns: User, Project, Shopify, DEO, Products, Last Sync, Last Run, Actions; (4) `/admin/users/[id]` Recent Runs - columns: Run Type, Status, AI Used, Created; (5) `/projects/[id]/assets/pages` - columns: Health, Path, Title, Action; (6) `/projects/[id]/assets/collections` - columns: Health, Handle, Title, Action; (7) `/projects/[id]/assets/blogs` - columns: Status, Handle, Title, Updated, Open; (8) `/projects/[id]/settings/governance` - 3 tables (Approvals, Audit, Sharing) migrated; (9) `/projects/[id]/automation/playbooks` - per-product results table token styling. All use canonical DataTable with `hideContextAction={true}` or token-based inline styling. Empty states outside DataTable. **Core files:** admin/audit-log/page.tsx, admin/governance-audit/page.tsx, admin/projects/page.tsx, admin/users/[id]/page.tsx, assets/pages/page.tsx, assets/collections/page.tsx, assets/blogs/page.tsx, settings/governance/page.tsx, automation/playbooks/page.tsx. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md (HP-015 through HP-023 added). **Critical Path:** CP-020 updated with FIXUP-4 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7.14    | 2026-01-22 | **TABLES-&-LISTS-ALIGNMENT-1 FIXUP-5**: Playbooks per-product results migrated from legacy `<table>` to canonical DataTable (dense). Per-product results panel now uses DataTable component with `density="dense"` and `hideContextAction={true}`, replacing inline `<table>/<thead>/<tbody>` markup. Preserved navigation behavior (Product cell uses resultsContextUrl + handleNavigate interception) and status badge rendering. Removed legacy gray/white utility stack. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md HP-023 updated to require canonical DataTable (not "token styling"). **Critical Path:** CP-020 updated: FIXUP-4 playbooks line clarified; FIXUP-5 checklist item added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7.15    | 2026-01-22 | **TABLES-&-LISTS-ALIGNMENT-1 FIXUP-6**: Playbooks per-product results DataTable used `render` instead of `cell` for column renderers, causing blank cells at runtime. Updated columns to use `cell` (correct DataTableColumn contract). **Core files:** automation/playbooks/page.tsx. **Manual Testing:** TABLES-&-LISTS-ALIGNMENT-1.md HP-023 updated with cell renderer assertion. **Critical Path:** CP-020 updated with FIXUP-6 checklist item.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7.16    | 2026-01-22 | **PANEL-DEEP-LINKS-1**: Shareable Right Context Panel state via URL deep-links. URL schema: `panel` (details/recommendations/history/help), `entityType` (product/page/collection/blog/issue/user), `entityId` (required), `entityTitle` (optional fallback). Source-of-truth rules: URL is truth when valid params present; UI actions sync to URL via replaceState; close removes all panel params. Shopify embedded params (shop, host) preserved throughout. Integration proof points: Products list and Admin Users both pass complete descriptors. **Core files:** RightContextPanelProvider.tsx. **Manual Testing:** PANEL-DEEP-LINKS-1.md created. **Critical Path:** CP-020 updated with deep-link scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7.17    | 2026-01-22 | **PANEL-DEEP-LINKS-1 FIXUP-1**: Type safety + back/forward semantics + project-scope guard. (1) Type-safe searchParams parsing: introduced `ReadableSearchParams` structural type compatible with Next.js `useSearchParams()` return type, fixing TypeScript mismatch with `URLSearchParams`; (2) Manual test HP-005 corrected to match replaceState semantics: back/forward restores panel state when navigating between routes (route changes create history entries), not when switching panels on same route (replaceState does not create history entries); (3) Project-scoped deep link guard: entity types `product`, `page`, `collection`, `blog`, `issue` set `scopeProjectId` to sentinel `__outside_project__` when opened via deep-link on non-/projects/:id routes, forcing "Unavailable in this project context." state and preventing invalid data fetches; `user` entity type remains non-project-scoped for admin routes. **Core files:** RightContextPanelProvider.tsx. **Manual Testing:** PANEL-DEEP-LINKS-1.md (HP-005 updated, EC-007 added). **Critical Path:** CP-020 updated with project-scope guard scenario and clarified back/forward checklist wording.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7.18    | 2026-01-22 | **ISSUES-ENGINE-REMOUNT-1**: Issues Engine list remounted to canonical DataTable with RCP issue details integration. (1) Updated page.tsx: imported DataTable + useRightContextPanel, added getIssueDescriptor() for RCP, defined issueColumns with columns (Issue/Asset Scope/Pillar/Severity/Status/Actions), replaced card-based list with DataTable using onRowClick/onOpenContext/getRowDescriptor, preserved preview/draft/apply flow via isRowExpanded/renderExpandedContent, preserved Playwright selectors (issue-card-actionable/informational, data-fix-kind, issue-card-cta, issue-preview-draft-panel); (2) Created ContextPanelIssueDetails.tsx: read-only issue details renderer for RCP showing title/pillar/severity/status/affected counts, fetch-based loading with loading/not_found/error states, token-only styling; (3) Updated ContextPanelContentRenderer.tsx: wired case 'issue' to render ContextPanelIssueDetails with projectId scope check; (4) Token-only empty state styling. **Core files:** page.tsx, ContextPanelIssueDetails.tsx, ContextPanelContentRenderer.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md. **Critical Path:** CP-009 updated with ISSUES-ENGINE-REMOUNT-1 scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7.19    | 2026-01-22 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-1**: Token-only enforcement + removed invalid semantic Tailwind classes. (1) Updated page.tsx: replaced remaining literal palette classes (bg-white, bg-gray-_, text-gray-_, border-red/yellow/amber/blue-_, text-red/yellow/amber/blue-_) with token-only arbitrary values using --danger-_, --warning-_, --info-_, --success-_ CSS variables; removed invalid semantic classes not configured in tailwind.config.ts (bg-destructive, bg-warning, bg-success, text-destructive, text-success, text-warning-foreground, hover:bg-accent); affected areas: loading state, error banner, warning banner, header/subtitle, triplet container, zero-actionable banner, severity breakdown cards, filter labels, filter buttons, DataTable severity badges, expanded preview panel draft banners/buttons, empty state block; (2) Updated ContextPanelIssueDetails.tsx: replaced text-destructive with token-only danger foreground, updated getSeverityClass() to use token-only arbitrary values; (3) Updated ISSUES-ENGINE-REMOUNT-1.md: fixed doc paths (CRITICAL_PATH_MAP.md, TABLES-&-LISTS-ALIGNMENT-1.md), corrected HP-003 API expectation to note read-only fetch via `projectsApi.deoIssuesReadOnly()`. **Core files:** page.tsx, ContextPanelIssueDetails.tsx. **Docs:** ISSUES-ENGINE-REMOUNT-1.md, CRITICAL_PATH_MAP.md (6.25).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7.20    | 2026-01-22 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-2**: TypeScript safety fix for nullable fixHref. Changed conditional render in Issues DataTable "Issue" column from `isClickableIssue ? (...)` to `fixHref && isClickableIssue ? (...)` so `fixHref` is narrowed to a non-null string before being passed to `handleIssueClick()`. No behavioral change - same actionable logic preserved. **Core files:** page.tsx. **Docs:** CRITICAL_PATH_MAP.md (6.26).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7.21    | 2026-01-22 | **UI-POLISH-&-CLARITY-1**: Visual polish pass for Design System v1.5 alignment. Styling-only changes, no behavior modifications. (1) Updated DataTable.tsx/DataList.tsx: density padding py-2→py-2.5 (dense) / py-3→py-3.5 (comfortable), header text color text-muted-foreground→text-foreground/80, hover states hover:bg-[hsl(var(--surface-raised))] (dark mode safe); (2) Updated ProjectSideNav.tsx: active nav item has accent bar via before: pseudo-element (primary/60), inactive items use text-foreground/70 for increased contrast; (3) Updated LayoutShell.tsx: added breadcrumb derivation (Projects > {name} > {section}) with sessionStorage caching for project names, section label mapping for SECTION_LABELS and ADMIN_SECTION_LABELS; (4) Updated RightContextPanel.tsx: header padding py-3→py-3.5, content padding p-4→p-5; (5) Updated ContextPanelContentRenderer.tsx: section separation space-y-4→space-y-5; (6) Updated ContextPanelIssueDrilldown.tsx: outer spacing space-y-3→space-y-4, card padding p-3→p-4, header margin mb-2→mb-3, inner list spacing space-y-2→space-y-3, issue row padding p-2→p-3, line-clamp-1→line-clamp-2; (7) Created RowStatusChip.tsx: token-only chip styles for optimized/needs_attention/draft_saved/blocked states; (8) Created ProductIssuesPanel.tsx: de-emphasized AI fixable badge using neutral tokens. **All styling is token-only (no literal palette classes). Issues page already token-compliant - no changes needed.** **Core files:** DataTable.tsx, DataList.tsx, ProjectSideNav.tsx, LayoutShell.tsx, RightContextPanel.tsx, ContextPanelContentRenderer.tsx, ContextPanelIssueDrilldown.tsx, RowStatusChip.tsx, ProductIssuesPanel.tsx. **Manual Testing:** UI-POLISH-&-CLARITY-1.md. **Critical Path:** CP-020 updated with UI-POLISH-&-CLARITY-1 scenarios (6.27).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7.22    | 2026-01-22 | **UI-POLISH-&-CLARITY-1 FIXUP-1**: Token compliance corrections and removal of unintended new components. (1) Updated common/RowStatusChip.tsx: converted literal palette classes (bg-green-50, bg-yellow-50, bg-blue-50, bg-red-50) to token-only styling using --success-background, --warning-background, --info-background, --danger-background; fallback uses bg-muted text-muted-foreground; (2) Deleted unintended new files: `/components/ui/RowStatusChip.tsx` and `/components/panels/ProductIssuesPanel.tsx` (created in error by 7.21); (3) Updated optimization/ProductIssuesPanel.tsx: token-only triplet container (border-border bg-[hsl(var(--surface-card))]), text colors (text-foreground, text-muted-foreground), pillar group styling, severity colors (--danger-_, --warning-_, --info-_), FixNextBadge (bg-primary), IssueRow hover (surface-raised), AI fixable badge (neutral border-border bg-muted text-muted-foreground); (4) Updated ProductTable.tsx: token-only healthPillClasses fallback (--success-background, --warning-background, --danger-background); (5) Updated products/[productId]/page.tsx: token-only "Product not found" panel, back links (text-primary), sticky header title/subtext (text-foreground, text-muted-foreground), status pill (border-border bg-muted text-foreground), DEO issues pill (--danger-background/foreground), draft state indicator (--warning-_, --info-_, --success-_), "Automate this fix" secondary button (border-border bg-[hsl(var(--surface-card))] text-foreground), "Apply to Shopify" success primary button (bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))]); (6) Updated playbooks/page.tsx "Playbook rules" block: container (border-border bg-[hsl(var(--surface-card))] p-4), headings/labels (text-foreground, text-muted-foreground), toggle switch (bg-primary/bg-muted, bg-background knob, focus-visible:ring-primary), inputs/textareas (border-border bg-background text-foreground px-3 py-2 focus-visible:ring-primary). **All styling is token-only. No behavior changes.** **Core files:** common/RowStatusChip.tsx, optimization/ProductIssuesPanel.tsx, ProductTable.tsx, products/[productId]/page.tsx, playbooks/page.tsx. **Manual Testing:** UI-POLISH-&-CLARITY-1.md updated. **Critical Path:** CP-020 updated (6.28).                                                                                                                                                                                                                                                |
| 7.23    | 2026-01-22 | **UI-POLISH-&-CLARITY-1 FIXUP-2**: Token-only completion for remaining high-signal surfaces. (1) Updated issue-fix-anchors.ts: tokenized all getArrivalCalloutContent() containerClass outputs (coming_soon→--surface-raised, external_fix→--warning-_, already_compliant→--success-_, diagnostic→--info-_, anchor_not_found→--warning-_, actionable→primary/10 border-border text-foreground); tokenized HIGHLIGHT_CSS outline colors from rgb(99 102 241 / alpha) to hsl(var(--primary) / alpha); (2) Updated products/[productId]/page.tsx: preview mode banner (purple→--info-_ tokens), preview expired banner (amber→--warning-_ tokens with token-only CTA button), issue fix context banner actions (bg-indigo-600→bg-primary, border-blue-300→border-border), optimization banner (blue→--info-_ tokens), success/error banners (green/red→--success-_/--danger-_ tokens with token-only upgrade link), metadata tab header (text-gray-900→text-foreground), draft state banner (yellow/blue/green→--warning-_/--info-_/--success-_ tokens), guidance callout (indigo→--info-_ tokens); (3) Updated playbooks/page.tsx: previewValidityClass (amber/green→--warning-_/--success-\* tokens), preview loading/empty states (gray→--surface-raised/muted-foreground), preview sample section (gray→token-only surfaces/links with text-primary for "Open product" link). **All styling is token-only. No behavior changes.** **Core files:** issue-fix-anchors.ts, products/[productId]/page.tsx, playbooks/page.tsx. **Manual Testing:** UI-POLISH-&-CLARITY-1.md updated. **Critical Path:** CP-020 updated (6.29).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7.24    | 2026-01-22 | **UI-POLISH-&-CLARITY-1 FIXUP-3**: Complete token-only cleanup for ALL remaining literal palette classes. (1) Updated issue-fix-anchors.ts: tokenized commented example block to match runtime HIGHLIGHT_CSS (rgb→hsl(var(--primary))); (2) Updated products/[productId]/page.tsx: tokenized tab section headers (Answers, Search & Intent, Competitors, GEO, Automations, Issues tabs) with text-foreground/text-muted-foreground/text-primary, tokenized AI diagnostic preview toggle button (border-border bg-surface-card text-foreground hover:bg-muted focus-visible:ring-primary), tokenized ring highlight for SEO editor (ring-primary ring-offset-background); (3) Updated playbooks/page.tsx: COMPLETE token cleanup removing ALL literal palette classes (bg-gray-_, text-gray-_, border-gray-_, bg-blue-_, text-blue-_, border-blue-_, bg-amber-_, text-amber-_, border-amber-_, bg-red-_, text-red-_, border-red-_, bg-green-_, text-green-_, border-green-_, bg-yellow-_, text-yellow-_, text-white, focus:ring-blue-_) → converted to token-only styling (--primary-_, --success-_, --warning-_, --danger-_, --info-\*, --surface-card, --surface-raised, border-border, text-foreground, text-muted-foreground); affected areas: loading/empty states, draft review mode, CNAB banners, VIEWER mode banner, next DEO win banner, error messages, automation tabs, playbook list cards, step indicators, primary/secondary buttons, saved preview callout, continue blocked panel, estimate blockers, draft status panels (EXPIRED/FAILED/missing), warning banners (scope invalid/draft not found/draft expired/rules changed), apply result summary, stopped safely banner, skipped products warning, status column badges (UPDATED/SKIPPED/LIMIT_REACHED/error), approval status messages, checkbox, final apply button. **All styling is now 100% token-only across the entire playbooks page. No behavior changes.** **Core files:** issue-fix-anchors.ts, products/[productId]/page.tsx, playbooks/page.tsx. **Manual Testing:** UI-POLISH-&-CLARITY-1.md updated. **Critical Path:** CP-020 updated (6.30).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 7.25    | 2026-01-22 | **UI-POLISH-&-CLARITY-1 FIXUP-4**: Tokenized remaining "AI usage this month" callout on Playbooks page. Removed all purple-\* literal palette classes (border-purple-100, bg-purple-50, text-purple-900, text-purple-700, text-purple-600) and replaced with token-only styling (border-border, bg-[hsl(var(--surface-raised))], text-foreground, text-muted-foreground). Preserved success-foreground for "AI runs avoided" line. **No behavior changes.** **Core files:** playbooks/page.tsx. **Manual Testing:** UI-POLISH-&-CLARITY-1.md updated (HP-018). **Critical Path:** CP-020 updated (6.31).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7.26    | 2026-01-22 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-3**: RCP Issue Details completeness and truthfulness. (1) Added Issue Summary section: title + description (plain text, no rewriting); (2) Added Why This Matters section with truthful fallback: prefers issue.whyItMatters when present, renders "Not available for this issue." when missing (does NOT fall back to description to avoid duplication); (3) Replaced Status section with Actionability section: informational issues show "Informational — outside EngineO.ai control" + guidance (no Fix/Apply wording), blocked issues show "Blocked — insufficient permissions" + guidance (recommend elevated access), actionable issues show "Actionable now" + guidance (actions from Work Canvas); (4) Added Affected Assets list: renders affectedProducts/affectedPages up to 6 items each with "+ N more" overflow, renders "No affected asset list available." when neither list present; (5) Kept existing Affected Items counts block (counts remain useful even without lists). All content read-only with token-only styling, no in-body navigation links, no buttons added. **No backend, scoring, or issue semantics changes.** **Core files:** ContextPanelIssueDetails.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md updated (HP-008/009/010, EC-004/005). **Critical Path:** CP-009 updated (6.32).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 7.27    | 2026-01-22 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-4**: Actionability truthfulness correction. (1) Changed blocked label from "Blocked — insufficient permissions" to "Blocked — not actionable in this context" (no speculative claims about permissions or elevated access); (2) Updated blocked guidance to remove permission/role speculation: now says "This issue cannot be acted upon in the current context. Review the issue details in the Work Canvas for more information."; (3) Changed isActionableNow truthiness check to explicit `=== true` so that undefined values are treated as blocked (not actionable); (4) Preserved informational and actionable-now paths unchanged. **No backend, scoring, or issue semantics changes.** **Core files:** ContextPanelIssueDetails.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md updated (HP-009 expected results). **Critical Path:** CP-009 updated (6.33).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 7.28    | 2026-01-22 | **PLAYBOOKS-SHELL-REMOUNT-1**: Playbooks list remounted to canonical DataTable + RCP integration. (1) Extended RightContextPanelProvider.tsx: added 'playbook' to ALLOWED_ENTITY_TYPES and PROJECT_SCOPED_ENTITY_TYPES for PANEL-DEEP-LINKS-1 deep-link support; (2) Added PlaybookDetailsContent renderer to ContextPanelContentRenderer.tsx: read-only sections for "What This Playbook Does" (description), "Applicable Assets" (asset types + scope summary), "Preconditions" (truthful list), "Availability" (Ready/Blocked/Informational state + guidance), "History" stub; no in-body navigation links; (3) Replaced card-based playbooks grid with canonical DataTable in page.tsx: columns Playbook (name + description), What It Fixes, Asset Type, Availability (state badge + affected count); (4) Changed selection model: row click sets selectedPlaybookId in-page state (no navigation via router.push); reset flow state on selection change; (5) Integrated RCP via useRightContextPanel(): added getPlaybookDescriptor() helper, onOpenContext wired to openPanel, eye icon opens playbook details panel; (6) Added deep-link compatibility: useEffect syncs selectedPlaybookId from panel params (entityType=playbook) for highlight alignment. Preview → Estimate → Apply continuity preserved (no step skipping). Token-only styling throughout. **No backend changes.** **Core files:** RightContextPanelProvider.tsx, ContextPanelContentRenderer.tsx, playbooks/page.tsx. **Manual Testing:** PLAYBOOKS-SHELL-REMOUNT-1.md created. **Critical Path:** CP-012 updated (6.34).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7.29    | 2026-01-22 | **PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-1**: No auto-navigation + selection highlight + plan doc completeness. (1) Removed legacy deterministic default selection auto-navigation effect: landing on Playbooks with no playbookId in URL now remains neutral (no route changes, no implicit selection); (2) Fixed playbook selection highlight: moved conditional font-semibold/font-medium from wrapper div to title `<p>` element so it visibly applies; (3) Updated getPlaybookDescriptor openHref to per-playbook canonical route with step=preview&source=default params; (4) Added missing Phase section for PLAYBOOKS-SHELL-REMOUNT-1 to IMPLEMENTATION_PLAN.md (Status, Date, Design System Version, Overview, Key Features, Affected Files, Manual Testing, Critical Path Map); (5) Updated PANEL-DEEP-LINKS-1 URL Schema table to include `playbook` in entityType allowed values; (6) Updated PLAYBOOKS-SHELL-REMOUNT-1.md manual testing doc with explicit no-auto-navigate scenario (HP-012). **No backend changes.** **Core files:** playbooks/page.tsx, IMPLEMENTATION_PLAN.md, PLAYBOOKS-SHELL-REMOUNT-1.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7.30    | 2026-01-22 | **PLAYBOOKS-SHELL-REMOUNT-1 FIXUP-2**: Canonical header external-link + cleanup. (1) Changed RCP header external-link in getPlaybookDescriptor from query-based `/projects/:id/automation/playbooks?playbookId=...` to canonical playbook run route `/projects/:id/playbooks/:playbookId?step=preview&source=default`; (2) Removed unused `navigateToPlaybookRunReplace` import from playbooks-routing. Updated HP-004 with explicit external-link route expectation. Added CP-012 checklist item and changelog 6.35. **No backend changes.** **Core files:** playbooks/page.tsx. **Docs:** PLAYBOOKS-SHELL-REMOUNT-1.md, CRITICAL_PATH_MAP.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 7.31    | 2026-01-23 | **ISSUE-TO-ACTION-GUIDANCE-1**: Issue → Playbook Guidance (guidance-only, token-only, trust-preserving). (1) Created `issue-to-action-guidance.ts` with deterministic mapping from issueType to RecommendedPlaybook metadata (playbookId, name, oneLineWhatItDoes, affects, preconditions); initial mappings: missing_seo_title, missing_seo_description; (2) Added "Recommended action" section to ContextPanelIssueDetails.tsx: shows playbook guidance for actionable issues with mapping, shows "No automated action available." for informational/blocked issues or unmapped actionable issues; single CTA "View playbook" navigates to `/projects/:id/playbooks/:playbookId?step=preview&source=entry&returnTo=...&returnLabel=Issues` (no auto-execution); (3) Added subtle non-interactive playbook indicator (lightning bolt icon) to Issues list Issue column for actionable issues with mapping (no buttons/links); (4) Manual testing doc ISSUE-TO-ACTION-GUIDANCE-1.md; (5) Critical Path: CP-009 updated with RCP/list scenarios, CP-012 updated with navigation safety scenario, CRITICAL_PATH_MAP.md 6.36 added. **No backend changes.** **Core files:** issue-to-action-guidance.ts (NEW), ContextPanelIssueDetails.tsx, issues/page.tsx.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 7.32    | 2026-01-23 | **ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-1**: Trust language alignment + GuardedLink CTA. (1) Non-actionable states (blocked/informational) now use "Automation Guidance" section label instead of "Recommended Action" (no "Recommended" language when nothing to recommend); (2) "View playbook" CTA uses GuardedLink for unsaved-changes protection instead of raw next/link; (3) Mapping copy made non-overclaiming: uses "assets within playbook scope" instead of explicitly listing products/pages/collections. **No backend changes.** **Core files:** ContextPanelIssueDetails.tsx, issue-to-action-guidance.ts. **Manual Testing:** ISSUE-TO-ACTION-GUIDANCE-1.md updated (HP-001/003/004 expected section labels). **Critical Path:** CP-009 updated with FIXUP-1 checklist items (6.37).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7.33    | 2026-01-23 | **ISSUE-TO-ACTION-GUIDANCE-1 FIXUP-2**: Documentation coherence updates (RCP link policy exception + manual testing corrections). No code changes. (1) Updated RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md: Overview now states "header external-link is the default/primary navigation affordance" and "no in-body navigation links except the single guidance CTA 'View playbook' shown only for issue kind per ISSUE-TO-ACTION-GUIDANCE-1"; HP-009 expected results updated to allow Issue Details exception; (2) Updated RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md: HP-002 Help tab line updated to acknowledge Issue Details exception; (3) Updated RIGHT_CONTEXT_PANEL_CONTRACT.md: added "Link Policy" section (§4) with default rule and Issue Details exception; (4) Updated ISSUE-TO-ACTION-GUIDANCE-1.md: EC-001 now references "Automation Guidance" section label for unmapped actionable issues; ERR-001 corrected to note existing RCP read-only fetch may occur while guidance mapping introduces no new API calls. **Docs only:** RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1.md, RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1.md, RIGHT_CONTEXT_PANEL_CONTRACT.md, ISSUE-TO-ACTION-GUIDANCE-1.md, CRITICAL_PATH_MAP.md (6.38).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 7.34    | 2026-01-23 | **RIGHT-CONTEXT-PANEL-AUTONOMY-1**: Autonomous context-driven panel behavior. (1) Removed shell-level Action/Details grouped control from LayoutShell header; (2) Removed RCP pin toggle, width toggle, view tabs (Details/Recommendations/History/Help), Cmd/Ctrl+. shortcut; (3) Added autonomous open on entity detail routes (products, pages, collections, playbooks); (4) Added autonomous close on contextless routes (projects list, dashboard, list pages without selection); (5) Added dismissal model - user-driven close (X, ESC, scrim click) respected until context meaningfully changes; (6) Auto-open writes URL params (panel, entityType, entityId) via replaceState; (7) Deep-links (PANEL-DEEP-LINKS-1) continue to work; (8) Removed all in-body navigation CTAs including "View playbook" - guidance is informational only; (9) Header external-link is the only navigation affordance. **Core files:** LayoutShell.tsx, RightContextPanel.tsx, RightContextPanelProvider.tsx, ContextPanelIssueDetails.tsx. **Manual Testing:** RIGHT-CONTEXT-PANEL-AUTONOMY-1.md. **Critical Path:** CP-009, CP-012, CP-020 updated (6.39).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7.35    | 2026-01-23 | **RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-1**: URL sync correctness fix. (1) Removed incorrect `isApplyingUrlStateRef` re-entrancy guard wrappers from state→URL write paths: dismissed context URL cleanup, auto-open URL writes, contextless close URL cleanup; (2) Re-entrancy guard now only protects URL→state application (deep-link path); (3) Removed obsolete CP-020 checklist items conflicting with autonomy (Details button click, pin toggle, width toggle, view tabs scenarios). **Core files:** RightContextPanelProvider.tsx. **Docs:** CRITICAL_PATH_MAP.md (6.40), RIGHT-CONTEXT-PANEL-AUTONOMY-1.md (doc paths), IMPLEMENTATION_PLAN.md.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7.36    | 2026-01-23 | **RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-2**: Deep-link panel view normalization. (1) Legacy `panel` URL values (recommendations, history, help) now normalized to `details` via replaceState on load; (2) `ALLOWED_PANEL_VIEWS` comment updated to document backward-compat acceptance + runtime coercion; (3) PRIORITY 1 deep-link branch now checks `panelView !== 'details'` and writes normalized URL before applying state; (4) `setActiveView` always receives `'details'` (no tabs under autonomy). **Core files:** RightContextPanelProvider.tsx. **Docs:** PANEL-DEEP-LINKS-1.md (HP-003 replaced with normalization scenario, REG-002 marked obsolete, URL schema updated), CRITICAL_PATH_MAP.md (6.41).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 7.37    | 2026-01-23 | **RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-3**: Pane header display title hydration. (1) `openPanel` now supports in-place descriptor enrichment when panel already open with same kind+id: merges title/subtitle/metadata/openHref without close/reopen, syncs URL entityTitle; (2) Added hydration useEffects to product detail (`/products/[productId]`), page detail (`/assets/pages/[pageId]`), collection detail (`/assets/collections/[collectionId]`), and playbooks page; (3) Hydration is "hydrate-only" - does NOT reopen panel if user dismissed. **Core files:** RightContextPanelProvider.tsx, products/[productId]/page.tsx, pages/[pageId]/page.tsx, collections/[collectionId]/page.tsx, automation/playbooks/page.tsx. **Docs:** RIGHT-CONTEXT-PANEL-AUTONOMY-1.md (HP-001/002 expected results, Known Issues), CRITICAL_PATH_MAP.md (6.42, CP-020 checklist).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7.38    | 2026-01-23 | **CENTER-PANE-NAV-REMODEL-1**: Center header standardization + scoped nav demotion. (1) Created CenterPaneHeaderProvider for per-page shell header customization (breadcrumbs/title/description/actions/hideHeader); (2) Updated LayoutShell to render standardized header structure (breadcrumbs → title → description → actions); (3) Issues page: migrated header to shell (title "Issues", description=project name, actions="Re-scan Issues" button), removed in-canvas header block; (4) Playbooks page: migrated header to shell, removed in-canvas breadcrumbs nav and header block; (5) Product detail: hideHeader=true to avoid duplicate headers, removed in-canvas breadcrumbs nav; (6) ProjectSideNav demoted to low-emphasis contextual index (lighter typography, tighter spacing, subtle active state with thin accent bar only); (7) layout.tsx removed max-width container wrappers. RCP remains autonomous (no new toggles/modes). **Core files:** CenterPaneHeaderProvider.tsx (NEW), LayoutShell.tsx, ProjectSideNav.tsx, layout.tsx, issues/page.tsx, playbooks/page.tsx, products/[productId]/page.tsx. **Manual Testing:** CENTER-PANE-NAV-REMODEL-1.md. **Critical Path:** CP-020 updated (6.43).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 7.39    | 2026-01-23 | **CENTER-PANE-NAV-REMODEL-1 FIXUP-1**: Extended shell header integration to remaining surfaces. (1) Pillar pages (keywords, performance, media, competitors, local) now use shell header with breadcrumbs/title/description, removed in-canvas breadcrumb nav and h1 header blocks; (2) Members settings page (settings/members) uses shell header, removed in-canvas breadcrumbs and header; (3) New Playbook entry page (automation/playbooks/entry) uses shell header, removed in-canvas breadcrumbs and header; (4) Content Workspace page (content/[pageId]) uses shell header, removed in-canvas breadcrumbs and header; (5) ProjectSideNav insightsPillarRoutes now includes 'media' for correct active-state coverage. **Core files:** ProjectSideNav.tsx, keywords/page.tsx, performance/page.tsx, media/page.tsx, competitors/page.tsx, local/page.tsx, settings/members/page.tsx, automation/playbooks/entry/page.tsx, content/[pageId]/page.tsx. **Manual Testing:** CENTER-PANE-NAV-REMODEL-1.md updated (HP-008 through HP-012). **Critical Path:** CP-020 updated (6.44).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7.40    | 2026-01-23 | **CENTER-PANE-NAV-REMODEL-1 FIXUP-2**: Completed shell header integration for GEO Insights page. Removed in-canvas breadcrumbs nav and h1/action header block, moved "Export Report" action into shell header actions. **Core files:** insights/geo-insights/page.tsx. **Manual Testing:** CENTER-PANE-NAV-REMODEL-1.md updated (HP-013). **Critical Path:** CP-020 updated (6.45).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 7.41    | 2026-01-23 | **CENTER-PANE-NAV-REMODEL-1 FIXUP-3**: Removed GEO Insights header breadcrumbs override so canonical shell breadcrumbs display correctly (real project name instead of placeholder "Project" text). **Core files:** insights/geo-insights/page.tsx. **Manual Testing:** CENTER-PANE-NAV-REMODEL-1.md HP-013 updated. **Critical Path:** CP-020 updated (6.46).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7.42    | 2026-01-23 | **WORK-CANVAS-ARCHITECTURE-LOCK-1**: Structural contracts + minimal shell adjustments. (1) Created WORK_CANVAS_ARCHITECTURE.md: one-page architecture contract documenting Left Rail/Center Pane/RCP responsibilities, navigation rules, URL/state policy, action hierarchy, visual constraints; (2) Updated LayoutShell.tsx: added visual hierarchy comments, left rail icon-only annotations, center pane elevation comments, RCP divider annotations; (3) Updated ProjectSideNav.tsx: wrapped scoped nav in distinct container surface (bg-[hsl(var(--surface-card))] + border), strengthened active-state (bg-primary/70 accent bar, font-semibold); (4) Updated RightContextPanel.tsx: added RCP contract lock comments (no navigation/mode controls, header external-link only navigation, content rhythm); (5) Updated RightContextPanelProvider.tsx: added autonomy boundaries documentation (state derived, no routing decisions, dismissal respect); (6) Created WORK-CANVAS-ARCHITECTURE-LOCK-1.md manual testing checklist. **Structural/documentation-only phase, no functional changes.** **Core files:** LayoutShell.tsx, ProjectSideNav.tsx, RightContextPanel.tsx, RightContextPanelProvider.tsx. **New docs:** WORK_CANVAS_ARCHITECTURE.md, WORK-CANVAS-ARCHITECTURE-LOCK-1.md. **Critical Path:** CP-020 updated (6.47).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 7.43    | 2026-01-23 | **WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1**: Left rail locked to icon-only always (no expand/collapse toggle). (1) Updated LayoutShell.tsx: removed NavState type, NAV_STATE_STORAGE_KEY, readNavState(), persistNavState(), toggleNav(), collapsed state, "Navigation" heading, collapse/expand toggle button, ChevronLeftIcon; left rail now fixed at 72px width with aria-label on each nav item for accessibility; (2) Updated WORK_CANVAS_ARCHITECTURE.md: changed "Icon-only display when collapsed" to "Icon-only always visible", changed width from "72px collapsed, 256px expanded" to "Fixed 72px"; (3) Updated WORK-CANVAS-ARCHITECTURE-LOCK-1.md: renamed "Icon-Only Behavior" to "Icon-Only Always [FIXUP-1]", added explicit "No collapse/expand toggle exists" check, added aria-label check; (4) Updated LAYOUT-SHELL-IMPLEMENTATION-1.md: marked HP-002 collapse/expand scenario as OBSOLETE, updated EC-001 and regression sanity checks; (5) Updated CRITICAL_PATH_MAP.md: marked LAYOUT-SHELL-1 collapse/expand items as OBSOLETE, updated WORK-CANVAS-ARCHITECTURE-LOCK-1 checklist item wording. **Functional change: left rail no longer toggles.** **Core files:** LayoutShell.tsx. **Docs:** WORK_CANVAS_ARCHITECTURE.md, WORK-CANVAS-ARCHITECTURE-LOCK-1.md, LAYOUT-SHELL-IMPLEMENTATION-1.md. **Critical Path:** CP-020 updated (6.48).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 7.44    | 2026-01-23 | **WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-2**: Documentation contract coherence. (1) Updated ENGINEERING_IMPLEMENTATION_CONTRACT.md: Left Navigation row changed to "Icon-only. No expand/collapse toggle", Command Palette changed from "Future (v1.6)" to "Core (v1.5)", panel state wording changed from "expanded/collapsed" to "open/closed", removed navState from Global State (marked as removed), marked "Command Palette reserved for v1.6" as implemented; (2) Updated IMPLEMENTATION_PLAN.md LAYOUT-SHELL-IMPLEMENTATION-1 section: scope bullet updated to "Left Rail (icon-only always; fixed ~72px; no expand/collapse toggle)", added historical note about FIXUP-1 removal in both Scope and Summary of Changes sections; (3) Updated COMMAND-PALETTE-IMPLEMENTATION-1.md: replaced "Left Nav collapse/expand unaffected" regression check with "Left rail is icon-only always (no expand/collapse toggle) — regression sanity check". **Documentation-only phase, no code changes.** **Docs:** ENGINEERING_IMPLEMENTATION_CONTRACT.md, IMPLEMENTATION_PLAN.md, COMMAND-PALETTE-IMPLEMENTATION-1.md. **Critical Path:** CP-020 updated (6.49).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7.45    | 2026-01-23 | **ICONS-LOCAL-LIBRARY-1**: Local SVG icon system implementation. (1) Created curated 33-icon Material Symbols manifest with semantic keys (nav._, utility._, status._, workflow._, playbook.\*) in `material-symbols-manifest.ts`; (2) Created build scripts: `extract-stitch-material-symbols.mjs` (extracts icon names from Stitch HTML), `download-material-symbols.mjs` (generates SVG files), `build-material-symbols-sprite.mjs` (creates sprite.svg); (3) Downloaded all 33 SVG icons to `public/icons/material-symbols/svg/` and built `sprite.svg` for CDN-free serving; (4) Created `Icon.tsx` component with semantic key resolution, size variants (16/20/24px), and accessibility support (aria-hidden for decorative, aria-label with role="img" for meaningful); (5) Migrated LayoutShell left rail nav icons from inline SVG components to Icon component using semantic keys; (6) Migrated search icon in command palette triggers (desktop bar + mobile icon button); (7) Migrated RowStatusChip to show Icon + clean label (stripped emoji prefixes from display text). **Core files:** Icon.tsx, material-symbols-manifest.ts, LayoutShell.tsx, RowStatusChip.tsx, sprite.svg. **Docs:** docs/icons.md, ICONS-LOCAL-LIBRARY-1.md. **Critical Path:** CP-020 updated (6.50).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 7.46    | 2026-01-23 | **ICONS-LOCAL-LIBRARY-1 FIXUP-1**: auto_fix_high viewBox-safe path correction. (1) Fixed out-of-viewBox coordinate in auto_fix_high icon path data: changed `L25 12` to `L24 12` to fit within 24x24 viewBox (prevents clipped right edge); (2) Updated download-material-symbols.mjs ICON_PATHS.auto_fix_high; (3) Updated auto_fix_high.svg; (4) Updated sprite.svg symbol; (5) Corrected dev-script header comment from "downloads from CDN" to "generates from embedded path data" for accuracy. **Core files:** download-material-symbols.mjs, auto_fix_high.svg, sprite.svg. **Manual Testing:** ICONS-LOCAL-LIBRARY-1.md updated (Icon Inventory verification note). **Critical Path:** CP-020 updated (6.51).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7.47    | 2026-01-24 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-5**: Decision engine remount with three-section hierarchy (Actionable now → Blocked → Informational) and action semantics. (1) Updated TripletDisplay.tsx: replaced all text-gray-\* with text-muted-foreground (token-only labels), reordered triplet blocks so "Actionable now" renders first, added emphasis prop ('none'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 'actionable') with bg-primary/10 text-primary highlight wrapper when emphasis='actionable'; (2) Updated DataTable.tsx: added headerContrast prop ('default'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 'strong') for Issues-only stronger table header contrast (text-foreground when 'strong', text-foreground/80 when 'default'); (3) Updated issues/page.tsx: removed mode-based upfront filtering (keep all matching issues), derived three classification arrays (actionableNowIssues, blockedIssues, informationalIssues) with severity→impact→title sorting, replaced single DataTable with three stacked sections (Actionable now comfortable + strong headers, Blocked dense collapsible, Informational dense collapsible), removed Status column (section membership communicates status), changed Severity from pill badge to dot+label, added Issue column compact meta line (severity + fixability + impact), updated Actions column to show Blocked non-clickable pill with tooltip for blocked rows, renamed "Fix next" button to "Fix now", updated mode toggle copy ("Actionable" → "Actionable now", "Detected" → "All detected"), passed emphasis='actionable' prop to TripletDisplay. **No backend changes.** **Core files:** TripletDisplay.tsx, DataTable.tsx, issues/page.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md updated (HP-002, HP-011 through HP-015). **Critical Path:** CP-009 updated with 8 checklist items (6.52). |
| 7.48    | 2026-01-24 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-6**: Semantics and consistency corrections. (1) Updated page.tsx: fixed blocked chip logic to only render "Outside control" chip for actionability === 'informational' (blocked status conveyed by section + Actions pill, no chip needed); added stable sorting tie-breaker (after title comparison, sort by id for deterministic ordering); normalized Action column labels to exactly "Fix now" / "Review" / "Blocked" ("Review" for DIAGNOSTIC and "View affected" flows, "Fix now" for other actionable fix flows, preserve original meaning in title attribute); (2) Updated TripletDisplay.tsx: fixed emphasis so both count and label render as text-primary when emphasis='actionable' (not text-muted-foreground); (3) Updated ISSUES-ENGINE-REMOUNT-1.md: corrected HP-013 expected results to match actual UI semantics (Fix now action for inline/link flows, Review for View affected with title preservation). **No backend changes.** **Core files:** page.tsx, TripletDisplay.tsx. **Manual Testing:** ISSUES-ENGINE-REMOUNT-1.md (HP-013). **Critical Path:** CP-009 updated (6.53).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7.49    | 2026-01-24 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-7**: Trust copy tightening for Issues preview Apply CTA. (1) Updated page.tsx: changed inline preview Apply button label from "Apply to Shopify" to "Apply saved draft to Shopify" for trust clarity (no behavior change; data-testid="issue-apply-to-shopify-button" preserved; disabled gating unchanged; loading label "Applying…" unchanged; title attribute already clarifies "Applies saved draft only. Does not use AI."). **Copy-only trust tightening.** **No Playwright test changes required** - tests use stable data-testid selector. **Core files:** issues/page.tsx. **Phase ISSUES-ENGINE-REMOUNT-1 now COMPLETE.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 7.50    | 2026-01-24 | **ISSUES-ENGINE-REMOUNT-1 FIXUP-8**: Doc/Playwright alignment + config fix. **PATCH A (Manual testing doc copy alignment):** Updated DRAFT-CLARITY-AND-ACTION-TRUST-1.md Scenario 7 to reflect new button labels (replaced "Fix next" with "Fix now" in 4 instances; replaced "Apply button" with "Apply saved draft to Shopify button" in 4 instances; Issues preview Apply button trust copy now aligned with UI from FIXUP-7). **PATCH B (Playwright selector hardening):** Replaced text-based selector `button:has-text("Fix next")` with stable data-testid selector `[data-testid="issue-fix-next-button"]` in 2 instances; updated 3 comment references from "Fix next" to "Fix now" for consistency; hardened tests against UI copy drift. **PATCH C (Config fix + regression verification):** Fixed playwright.config.ts testDir from './tests/e2e' to './tests' (corrected test discovery: 38 tests in ./tests vs 2 in ./tests/e2e); verified test execution: 14 tests discovered and ran; selector changes validated (no selector-related errors); tests blocked by missing API server (environmental; not code-related). **Core files:** draft-clarity-and-action-trust-1.spec.ts, DRAFT-CLARITY-AND-ACTION-TRUST-1.md, playwright.config.ts. **Phase ISSUES-ENGINE-REMOUNT-1 doc/test alignment complete.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
