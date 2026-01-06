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

## Phase ENTERPRISE-GEO-1: Enterprise Governance & Approvals ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-21

Enterprise-grade governance controls for GEO reports and content modifications.

### Key Features

1. **Governance Policy**: Per-project settings for approval requirements, share restrictions, expiry, content controls
2. **Approval Workflow**: Request → approve/reject → consume pattern for GEO fixes and Answer Block sync
3. **Passcode-Protected Share Links**: 8-char alphanumeric passcode, bcrypt hashed, shown once at creation
4. **Audit Events**: Immutable log of all governance actions (policy updates, approvals, share links, applies)
5. **Content Redaction**: Optional competitor mention redaction in exported reports

### Hard Contracts

1. **Mutation-Free Views**: Public share view, report assembly, and printing perform no DB writes
2. **PII Never Allowed**: `allowPII` is always `false`; API rejects attempts to enable, UI shows locked toggle
3. **Passcode Security**: Plaintext shown once, only `last4` stored for hints, full hash stored for verification

### Implementation Details

- **Governance Service**: `apps/api/src/projects/governance.service.ts` - Policy CRUD, settings retrieval
- **Approvals Service**: `apps/api/src/projects/approvals.service.ts` - Approval lifecycle
- **Audit Events Service**: `apps/api/src/projects/audit-events.service.ts` - Immutable event logging
- **Governance Controller**: `apps/api/src/projects/governance.controller.ts` - REST endpoints
- **GEO Reports Service**: `apps/api/src/projects/geo-reports.service.ts` - Passcode, expiry, redaction
- **GEO Reports Public Controller**: `apps/api/src/projects/geo-reports-public.controller.ts` - Passcode verification
- **Web UI**: `apps/web/src/components/governance/GovernanceSettingsSection.tsx` - Settings panel
- **Share Page**: `apps/web/src/app/share/geo-report/[token]/page.tsx` - Passcode entry form

### Trust Invariants

1. **View/Print Mutation-Free**: No DB writes during report assembly, public share view GET/POST, or printing
2. **PII Locked**: API enforces `allowPII: false`; UI displays toggle as locked/disabled
3. **Passcode Shown Once**: Plaintext returned only at creation; audit stores only `last4`

### Test Coverage

- Backend: `apps/api/test/integration/enterprise-geo-1.test.ts`
- E2E: `apps/web/tests/enterprise-geo-1.spec.ts`

### Related Documents

- [ENTERPRISE_GEO_GOVERNANCE.md](./ENTERPRISE_GEO_GOVERNANCE.md) - Full specification and contracts
- [GEO_EXPORT.md](./GEO_EXPORT.md) - GEO report export/sharing (v1.1 with ENTERPRISE-GEO-1 updates)
- [ENTERPRISE-GEO-1.md](./manual-testing/ENTERPRISE-GEO-1.md) - Manual testing guide
- [GEO-EXPORT-1.md](./manual-testing/GEO-EXPORT-1.md) - GEO export manual testing guide
- [ADMIN-OPS-1.md](./manual-testing/ADMIN-OPS-1.md) - Admin Operations manual testing guide (governance audit visibility)
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-016 and CP-017 entries (enterprise governance scenarios)
- [API_SPEC.md](../API_SPEC.md) - API documentation

---

## Phase PRODUCTS-LIST-2.0: Decision-First Products List ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-21

Frontend-only redesign of the Products list to be decision-first with Health pills, recommended actions, and progressive disclosure.

### Key Features

1. **Health Pill per Row**: 3 states (Healthy, Needs Attention, Critical) - no numbers
2. **Recommended Action per Row**: Single, deterministic action based on severity + pillar priority
3. **Progressive Disclosure**: Click row to expand; inline issue breakdowns only in expanded details
4. **No Always-Visible Scan SEO**: "Rescan" only visible when data is stale
5. **Command Bar**: Shows "{N} products need attention" and "Fix in bulk" CTA
6. **Health Filter**: All, Critical, Needs Attention, Healthy (replaces metadata status filter)
7. **Sort by Impact**: Authoritative ladder with deterministic ordering and action-aligned clustering
8. **Bulk-Action Confirmation UX**: 3-step, draft-first flow with scope transparency, AI disclosure, and no one-click apply

### Implementation Details

- **page.tsx**: Removed optimization banner, removed issues badge, added `isDeoDataStale` computation
- **ProductTable.tsx**: New Health filter model, Command Bar, enriched `issuesByProductId` with `healthState`, `recommendedAction`, and `impactCounts`; implements authoritative Sort by impact ladder; bulk action modal with 3-step flow (selection → preview/generate → apply)
- **ProductRow.tsx**: Health pill, recommended action line, progressive disclosure (clickable row), "View details" primary action, conditional "Rescan"
- **ProductDetailPanel.tsx**: Shows Handle/ID, Last synced, Meta title/description, Issues by category with deep links
- **api.ts**: Added `generateAutomationPlaybookDraft()` and `getLatestAutomationPlaybookDraft()` for draft lifecycle support
- **Playbooks page.tsx**: Added `playbookId` URL param support for deep-linking from bulk action "Review changes"

### Sort by Impact Ladder

**Primary Groups (in order):**
1. Critical
2. Needs Attention
3. Healthy

**Within Critical:**
1. Missing required metadata (missing_seo_title, missing_seo_description)
2. Blocking technical issues (technical pillar + critical severity)
3. Combined metadata + search intent issues
4. Other

**Within Needs Attention:**
1. Search & Intent issues
2. Content issues
3. Suboptimal metadata
4. Other

**Secondary sort:** Higher category-specific count first, then recommended action ascending, then title, then stable id

### Pillar Priority Order (for tie-breaking recommended action)

1. metadata_snippet_quality
2. search_intent_fit
3. content_commerce_signals
4. technical_indexability
5. media_accessibility
6. competitive_positioning
7. offsite_signals
8. local_discovery

### Trust Invariants

1. **Health Pills - No Numbers**: Health pill shows only text labels, never issue counts
2. **Single Recommended Action**: Deterministically chosen via severity > pillar priority > issue.id
3. **Progressive Disclosure**: Default row shows only essential info; details require expansion
4. **Pre-Crawl Safety**: Products with crawlCount === 0 show "Healthy" without implying issues were checked
5. **Sort by Impact - Deterministic**: Uses only Health + Recommended Action + existing issue category counts + existing severity flags; no traffic/revenue/AI scoring
6. **Sort by Impact - Stable**: Order is consistent across reloads (no jitter)
7. **No Silent Bulk Apply**: Bulk apply requires explicit user confirmation; no one-click apply
8. **AI Used Only on Generate Drafts**: Draft generation uses AI (with explicit disclosure); Apply does not use AI
9. **Scope Transparency**: Bulk action modal shows full product list and affected fields before any action

### Related Documents

- [PRODUCTS-LIST-2.0.md](./manual-testing/PRODUCTS-LIST-2.0.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-003 entry
- [DEO_INFORMATION_ARCHITECTURE.md](./DEO_INFORMATION_ARCHITECTURE.md) - Updated UX contracts

---

## Phase ROLES-2: Project Roles & Approval Foundations ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-22

Project-level role emulation and approval workflow foundations for single-user projects.

### Key Features

1. **Role Emulation via accountRole**: Project-level role setting (OWNER/EDITOR/VIEWER) for single-user projects
2. **Capability Matrix**: Role-based permissions for view, draft generation, approval requests, and apply actions
3. **Approval Workflow**: EDITOR requests approval, OWNER approves/rejects, approval expires after consumption
4. **Frontend Role-Aware UI**: Buttons and CTAs adapt to user's effective role

### Hard Contracts

1. **OWNER-Only Apply**: Only users with OWNER role can execute apply actions
2. **EDITOR Approval Chain**: EDITOR cannot apply directly; must request approval from OWNER
3. **VIEWER Read-Only**: VIEWER can view data and export but cannot generate drafts or request approval
4. **Apply Never Uses AI**: Apply actions consume zero AI quota regardless of role

### ROLES-2 Capability Matrix

| Capability | OWNER | EDITOR | VIEWER |
|------------|-------|--------|--------|
| View project data | ✅ | ✅ | ✅ |
| Generate drafts (AI) | ✅ | ✅ | ❌ |
| Request approval | ✅ | ✅ | ❌ |
| Apply changes | ✅ | ❌ | ❌ |
| Export/share reports | ✅ | ✅ | ✅ |
| Modify settings | ✅ | ❌ | ❌ |

### FIXUP-3 Corrections Applied

Role-specific apply denial messages now align with test expectations:
- **VIEWER denied**: "Viewer role cannot apply automation playbooks. Preview and export remain available."
- **EDITOR denied**: "Editor role cannot apply automation playbooks. Request approval from an owner."
- **No access**: "You do not have access to this project"

These messages are enforced in `projects.controller.ts` and verified by `roles-2.test.ts`.

### Related Documents

- [ROLES-2.md](./manual-testing/ROLES-2.md) - Manual testing guide
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-018 entry

---

## Phase ROLES-3: True Multi-User Projects & Approval Chains ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-23

True multi-user projects with explicit membership management, approval chains, and enforcement of the OWNER-only apply invariant.

### Key Features

1. **ProjectMember Model**: Real project memberships with OWNER/EDITOR/VIEWER roles
2. **Membership Management API**: OWNER-only add/remove/role-change endpoints
3. **Role Resolution Service**: ProjectMember as source of truth (with legacy fallback)
4. **Locked Capability Matrix**: EDITOR cannot apply; must request approval; VIEWER read-only
5. **Approval Chain Enforcement**: EDITOR requests approval, OWNER approves and applies
6. **Multi-User Auto-Apply Blocking**: Multi-user projects do NOT auto-apply (preserves CP-012)
7. **Audit Trail**: PROJECT_MEMBER_ADDED/REMOVED/ROLE_CHANGED events

### Hard Contracts

1. **OWNER-Only Apply**: Only project owners can execute apply actions
2. **Minimum One Owner**: Projects must always have at least one OWNER
3. **No Silent Auto-Apply for Multi-User**: Multi-user projects block auto-apply; require OWNER approval
4. **Backward Compatibility**: Single-user projects preserve ROLES-2 behavior

### Implementation Details

#### Database / Prisma

- **New Enum**: `ProjectMemberRole` (OWNER, EDITOR, VIEWER)
- **New Model**: `ProjectMember` with projectId, userId, role, createdAt
  - Unique constraint on (projectId, userId)
  - Cascade deletion when project is deleted
  - Indexes for list-by-project, resolve-role, list-by-user
- **Extended Enum**: `GovernanceAuditEventType` with PROJECT_MEMBER_* events
- **Migration**: `20251223_roles_3_project_members` with backfill for existing projects

#### Backend Services

- **role-resolution.service.ts**: Updated to use ProjectMember as source of truth
  - `resolveEffectiveRole()`: ProjectMember first, legacy fallback second
  - `assertProjectAccess()`, `assertOwnerRole()`, `assertCanRequestApproval()`
  - `isMultiUserProject()`: Checks if project has 2+ members
  - `getCapabilities()`: Returns capability matrix for role
- **projects.service.ts**: Multi-user access support
  - `getProjectsForUser()`: Includes projects where user is a member
  - `getProject()`: Membership check, returns memberRole
  - `listMembers()`, `addMember()`, `changeMemberRole()`, `removeMember()`
  - Audit logging for all membership changes
- **automation.service.ts**: Multi-user auto-apply blocking
  - `shouldAutoApplyMetadataForProject()`: Returns false for multi-user projects
  - `runNewProductSeoTitleAutomation()`: Checks isMultiUserProject before auto-apply

#### API Endpoints (projects.controller.ts)

- `GET /projects/:id/members` - List members (all members can view)
- `POST /projects/:id/members` - Add member (OWNER-only)
- `PUT /projects/:id/members/:memberId` - Change role (OWNER-only)
- `DELETE /projects/:id/members/:memberId` - Remove member (OWNER-only)
- `GET /projects/:id/role` - Get current user's role + capabilities
- Updated apply endpoint: OWNER-only enforcement

#### Frontend (api.ts)

- Updated `RoleCapabilities` interface with `canGenerateDrafts`, `canManageMembers`, `canExport`
- Updated `getRoleCapabilities()`: EDITOR cannot apply
- New types: `ProjectMember`, `UserRoleResponse`
- New API methods: `getUserRole()`, `listMembers()`, `addMember()`, `changeMemberRole()`, `removeMember()`

### Capability Matrix

| Capability | OWNER | EDITOR | VIEWER |
|------------|-------|--------|--------|
| View data | Yes | Yes | Yes |
| Generate drafts | Yes | Yes | No |
| Request approval | Yes | Yes | No |
| Approve actions | Yes | No | No |
| Apply changes | Yes | No | No |
| Modify settings | Yes | No | No |
| Manage members | Yes | No | No |
| Export/view reports | Yes | Yes | Yes |

### Critical Paths

- **CP-001 (Auth & Authorization)**: Project membership + role enforcement is real
- **CP-012 (Automation Engine)**: Multi-user projects do NOT auto-apply
- **CP-018 (ROLES-2)**: Single-user projects preserve existing behavior
- **CP-019 (ROLES-3)**: True multi-user project flows

### Test Coverage

- Backend: `apps/api/test/integration/roles-3.test.ts`
- Frontend: `apps/web/tests/roles-3.spec.ts`

### FIXUP History

#### FIXUP-1: End-to-End Multi-User Support
- Membership-aware access for governance services (approvals, policies, audit events)
- Role resolution fixes for assertCanGenerateDrafts()
- Draft generation blocking for VIEWER
- Frontend role-based UI with Members management page

#### FIXUP-2: Strict Matrix Enforcement
- Multi-user OWNER cannot create approval requests (must apply directly)
- Role simulation correctness: accountRole ignored in multi-user projects
- isMultiUserProject in API response
- OWNER-only for Answer Block mutations
- Members page "Add member" wording

#### FIXUP-3: Frontend Approval-Chain Correction
- Removed ephemeral approvalRequested flag
- Derived state from server-sourced pendingApproval object
- EDITOR can NEVER apply, even if approval status is APPROVED
- Button states and CTA copy derived from server truth
- Approval status prefetch when Step 3 visible
- Stale-state reset when switching playbooks

#### FIXUP-4: Membership Enforcement Beyond projects/*
- Eliminated legacy project.userId ownership gates in:
  - AI controller (assertCanGenerateDrafts for drafts, assertProjectAccess for usage)
  - ProductIssueFixService (assertOwnerRole for apply)
  - SEO scan service (assertOwnerRole for mutations, assertProjectAccess for view)
  - Integrations controller (assertProjectAccess for GET, assertOwnerRole for mutations)
  - Shopify service (assertOwnerRole for updateProductSeo)
- Added integration tests for AI usage, integrations, and SEO scan endpoints

#### FIXUP-5: Co-Owner Support for Shopify Actions
- Shopify validateProjectOwnership uses RoleResolutionService (supports co-owners)
- Account disconnectStore uses assertOwnerRole for project-level check
- Co-owner can perform: install, sync-products, ensure-metafield-definitions
- Added integration tests for multi-owner Shopify actions

### Related Documents

- [ROLES-3.md](./manual-testing/ROLES-3.md) - Manual testing guide
- [ROLES-2.md](./manual-testing/ROLES-2.md) - Role foundations (single-user emulation)
- [ENTERPRISE-GEO-1.md](./manual-testing/ENTERPRISE-GEO-1.md) - Approval workflow foundations
- [CRITICAL_PATH_MAP.md](./testing/CRITICAL_PATH_MAP.md) - CP-019 entry

---

## Phase WORK-QUEUE-1: Unified Action Bundle Work Queue COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

### Overview

Unified Work Queue page that derives action bundles from existing persisted artifacts without introducing new storage tables. Provides a single prioritized list of actions organized by health and state.

### Schema Summary

**Action Bundle Core Fields:**
- `bundleId`: Deterministic ID (e.g., `{bundleType}:{recommendedActionKey}:{scopeId}`)
- `bundleType`: ASSET_OPTIMIZATION | AUTOMATION_RUN | GEO_EXPORT
- `state`: NEW | PREVIEWED | DRAFTS_READY | PENDING_APPROVAL | APPROVED | APPLIED | FAILED | BLOCKED
- `health`: CRITICAL | NEEDS_ATTENTION | HEALTHY
- `recommendedActionKey`: FIX_MISSING_METADATA | RESOLVE_TECHNICAL_ISSUES | IMPROVE_SEARCH_INTENT | OPTIMIZE_CONTENT | SHARE_LINK_GOVERNANCE
- `aiUsage`: NONE | DRAFTS_ONLY
- `scopeType`: PRODUCTS | STORE_WIDE
- `scopeCount`, `scopePreviewList`: Affected items summary

**Subschemas:**
- `approval?`: { approvalRequired, approvalStatus, requestedBy/At, approvedBy/At }
- `draft?`: { draftStatus, draftCount, draftCoverage, lastDraftRunId }
- `geoExport?`: { mutationFreeView, shareLinkStatus, passcodeShownOnce }

### Derivation Sources

1. **Issue-derived bundles (ASSET_OPTIMIZATION)**: DeoIssuesService.getIssuesForProjectReadOnly()
   - Groups issues by recommendedActionKey
   - Maps severity to health (critical → CRITICAL, warning → NEEDS_ATTENTION)
   - aiUsage = NONE

2. **Automation bundles (AUTOMATION_RUN)**: AutomationPlaybooksService + drafts
   - Includes playbooks with totalAffectedProducts > 0 OR existing draft
   - Draft status → state mapping (PARTIAL → PREVIEWED, READY → DRAFTS_READY)
   - Approval status from governance + ApprovalRequest
   - aiUsage = DRAFTS_ONLY

3. **GEO export bundle (GEO_EXPORT)**: GeoReportsService.listShareLinks()
   - Single bundle per project for share link governance
   - mutationFreeView = true (viewing doesn't trigger mutations)
   - aiUsage = NONE

### Deterministic Sorting Rules

1. **State priority**: PENDING_APPROVAL (100) → APPROVED (150) → DRAFTS_READY (200) → FAILED (300) → BLOCKED (350) → NEW (400) → PREVIEWED (450) → APPLIED (900)
2. **Health priority**: CRITICAL (100) → NEEDS_ATTENTION (200) → HEALTHY (300)
3. **Impact rank**: FIX_MISSING_METADATA (100) → RESOLVE_TECHNICAL_ISSUES (200) → IMPROVE_SEARCH_INTENT (300) → OPTIMIZE_CONTENT (400) → SHARE_LINK_GOVERNANCE (500)
4. **updatedAt**: Most recent first
5. **bundleId**: Stable tie-breaker

### Implementation Patches (All Complete)

#### PATCH 1 — Shared Contract
- [x] Created `packages/shared/src/work-queue.ts` with types/enums
- [x] Exported from `packages/shared/src/index.ts`
- [x] Created `apps/web/src/lib/work-queue.ts` mirror

#### PATCH 2 — Backend
- [x] Added `GET /projects/:id/work-queue` endpoint
- [x] Created `work-queue.service.ts` with derivation logic
- [x] Registered `WorkQueueService` in `projects.module.ts`
- [x] Added `appliedAt`, `appliedByUserId` to `AutomationPlaybookDraft` schema
- [x] Created Prisma migration
- [x] Updated `automation-playbooks.service.ts` to set applied fields after successful apply

#### PATCH 3 — Frontend
- [x] Created `/projects/[id]/work-queue/page.tsx`
- [x] Created `ActionBundleCard.tsx` with fixed layout
- [x] Created `WorkQueueTabs.tsx` for tab navigation
- [x] Updated `ProjectSideNav.tsx` with Work Queue item
- [x] Updated `ProjectHealthCards.tsx` with routing to Work Queue
- [x] Added `projectsApi.workQueue()` client method

#### PATCH 4 — Testing
- [x] Created `apps/api/test/integration/work-queue-1.test.ts`
- [x] Created `tests/e2e/work-queue/work-queue.spec.ts` (Playwright scaffolding)

#### PATCH 5 — Documentation
- [x] Created `docs/manual-testing/WORK-QUEUE-1.md`
- [x] Updated IMPLEMENTATION_PLAN.md (this section)

### Critical Path Impact

- **CP-018 (ROLES-2 approvals)**: Approval status reflected in Work Queue bundles
- **ENTERPRISE-GEO-1 (GEO export)**: GEO bundle routes to export page, mutation-free view

### Related Documents

- [WORK-QUEUE-1.md](./manual-testing/WORK-QUEUE-1.md) - Manual testing guide
- packages/shared/src/work-queue.ts - Type definitions
- apps/api/test/integration/work-queue-1.test.ts - Integration tests
- tests/e2e/work-queue/work-queue.spec.ts - E2E test scaffolding

---

## Phase STORE-HEALTH-1.0: Store Optimization Home COMPLETE

**Status:** Complete
**Date Completed:** 2025-12-24

### Overview

Calm, executive Store Health page that answers "what's wrong + what first" and routes all actions into Work Queue. Decision-only surface - no preview/generate/apply triggered from this page.

### Key Constraints

- **Decision-only surface**: No new engines, no new scoring, no mutations from this page
- **No new backend models/tables**: All data derived from existing sources
- **Click-through only**: All actions route to Work Queue with pre-filters

### The 6 Cards (Fixed Order)

1. **Discoverability (DEO)** - Derived from FIX_MISSING_METADATA + RESOLVE_TECHNICAL_ISSUES bundles
2. **Generative Visibility (GEO/AEO)** - Derived from projectsApi.insights() geoInsights block
3. **Content Quality** - Derived from OPTIMIZE_CONTENT bundles
4. **Technical Readiness** - Derived from RESOLVE_TECHNICAL_ISSUES bundles
5. **Trust & Compliance** - Derived from IMPROVE_SEARCH_INTENT + SHARE_LINK_GOVERNANCE bundles
6. **AI Usage & Quota** - Derived from aiApi.getProjectAiUsageQuota()

### Card Rendering Rules

Each card MUST render:
- One health pill only: Healthy | Needs Attention | Critical
- One plain-language summary sentence (no jargon, no SEO promises)
- Exactly one primary action label (verb-first)

Prohibited on cards:
- Counts, charts, percentages, scores
- "SEO score" language
- Banners or promotional content

### Health Resolution

Card health = worst applicable state across relevant underlying sources:
- Critical > Needs Attention > Healthy
- Derived from Work Queue bundle health values

### Click-Through Routing

Clicking a card routes to Work Queue with pre-filters only:
- `actionKey` when applicable
- `bundleType` when applicable
- `tab` when applicable

Special routes:
- Generative Visibility → `/projects/:id/insights?tab=geo`
- AI Usage & Quota → `/settings/ai-usage`

### Implementation Patches (All Complete)

#### PATCH 1 — Work Queue actionKey Filter Support
- [x] Extended GET /projects/:id/work-queue to accept `actionKey` query param
- [x] Updated work-queue.service.ts to filter by recommendedActionKey
- [x] Extended WorkQueueQueryParams in shared types
- [x] Updated buildWorkQueueUrl() to support bundleType
- [x] Extended projectsApi.workQueue() with actionKey param
- [x] Work Queue page reads and preserves actionKey, bundleType in URL

#### PATCH 2 — Store Health Page
- [x] Created `/projects/[id]/store-health/page.tsx`
- [x] Renders exactly 6 cards in fixed order
- [x] Derives health from Work Queue bundles + GEO insights + AI quota
- [x] Click-through routing with no side effects

#### PATCH 3 — Navigation + Default Landing
- [x] Updated ProjectSideNav.tsx: Store Health is first nav item
- [x] Updated project [id]/page.tsx: redirects to /store-health
- [x] Updated projects/page.tsx: new project creation routes to /store-health

#### PATCH 4 — Manual Testing
- [x] Created docs/manual-testing/STORE-HEALTH-1.0.md

#### PATCH 5 — Documentation
- [x] Updated IMPLEMENTATION_PLAN.md (this section)

### Derivation Sources

| Card | Source | Health Logic |
|------|--------|--------------|
| Discoverability | Work Queue bundles (FIX_MISSING_METADATA, RESOLVE_TECHNICAL_ISSUES) | Worst bundle health |
| Generative Visibility | projectsApi.insights() geoInsights.overview.productsAnswerReadyPercent | <50% Critical, <80% Needs Attention, else Healthy |
| Content Quality | Work Queue bundles (OPTIMIZE_CONTENT) | Worst bundle health |
| Technical Readiness | Work Queue bundles (RESOLVE_TECHNICAL_ISSUES) | Worst bundle health |
| Trust & Compliance | Work Queue bundles (IMPROVE_SEARCH_INTENT, SHARE_LINK_GOVERNANCE) | Worst bundle health |
| AI Usage & Quota | aiApi.getProjectAiUsageQuota() | >=90% Critical, >=70% Needs Attention, else Healthy |

### Related Documents

- [STORE-HEALTH-1.0.md](./manual-testing/STORE-HEALTH-1.0.md) - Manual testing guide
- [WORK-QUEUE-1.md](./manual-testing/WORK-QUEUE-1.md) - Work Queue testing (click-through target)
- apps/web/src/app/projects/[id]/store-health/page.tsx - Implementation

---

## Phase ASSETS-PAGES-1: Pages & Collections Visibility ✅ COMPLETE

**Status:** Complete (Visibility-Only)
**Date Completed:** 2025-12-24

### Overview

Pages & Collections diagnosis and surfacing only. This phase makes Pages and Collections diagnosable and actionable at the decision level, with Work Queue items visible but no execution paths.

### Phase Intent

**Visibility-Only**: Surfaces Pages and Collections health status and recommended actions through:
- Asset navigation entries
- Work Queue bundles with scope type filtering
- Store Health card aggregation

### Scope (Strict)

**Included:**
- [x] Assets nav entries for Pages + Collections
- [x] Health → Action resolution (same ladder as Products/Work Queue)
- [x] Work Queue inclusion for Pages/Collections bundles
- [x] Store Health coverage via Work Queue derivation
- [x] scopeType query parameter on GET /projects/:id/work-queue

**Excluded (Deferred to ASSETS-PAGES-1.1):**
- Automation playbooks for Pages/Collections
- Draft generation for Pages/Collections
- Apply-to-Shopify for Pages/Collections

### Implementation Patches

#### PATCH 1 — Contracts ✅
- [x] Extended WorkQueueScopeType: PRODUCTS | PAGES | COLLECTIONS | STORE_WIDE
- [x] Extended WorkQueueQueryParams with scopeType filter
- [x] Updated buildWorkQueueUrl() to support scopeType

#### PATCH 2 — Work Queue Derivation ✅
- [x] Added classifyUrlPath() function to categorize URLs by asset type
- [x] Created deriveIssueBundlesByScopeType() method
- [x] Bundle IDs include scope type: `ASSET_OPTIMIZATION:{actionKey}:{scopeType}:{projectId}`
- [x] Added scopeType filter to getWorkQueue() service method

#### PATCH 3 — Frontend Asset Lists ✅
- [x] Created /projects/[id]/assets/pages/page.tsx
- [x] Created /projects/[id]/assets/collections/page.tsx
- [x] Health derivation from crawl page data
- [x] Bulk action routing to Work Queue with scope filters
- [x] Added Pages and Collections to ProjectSideNav.tsx

#### PATCH 4 — Work Queue UI ✅
- [x] Added getScopeTypeLabel() helper for singular/plural labels
- [x] Updated ActionBundleCard scope type display
- [x] Updated getCTARoute() to route to asset pages
- [x] Extended Work Queue page to support scopeType URL filter

#### PATCH 5 — Store Health Extension ✅
- [x] Cards automatically reflect Pages/Collections health via Work Queue

#### PATCH 6 — API Documentation ✅
- [x] Documented scopeType query param in API_SPEC.md
- [x] Updated WORK-QUEUE-1.md with scopeType filter verification

#### PATCH 7 — Testing + Documentation ✅
- [x] Created docs/manual-testing/ASSETS-PAGES-1.md
- [x] Updated IMPLEMENTATION_PLAN.md (this section)

### Health Derivation Rules

| Condition | Health | Action Key |
|-----------|--------|------------|
| Missing title or meta description | Critical | FIX_MISSING_METADATA |
| HTTP status >= 400 | Critical | RESOLVE_TECHNICAL_ISSUES |
| Word count < 300 | Needs Attention | OPTIMIZE_CONTENT |
| All conditions pass | Healthy | None |

### Completion Criteria

- [x] Pages and Collections are diagnosable at the decision level
- [x] Work Queue items exist for Pages/Collections scope types
- [x] No execution paths (no Generate Drafts, no Apply buttons for Pages/Collections)
- [x] Health status visible in Store Health cards

### Deferral Note

**Execution (drafts + apply) deferred to ASSETS-PAGES-1.1.** This phase intentionally excludes any mutation capabilities for Pages/Collections. The Work Queue bundles route to asset lists for visibility only.

### Trust Invariants

1. **No New Storage Tables**: Health derived from existing crawl data
2. **Decision-First UX**: One health pill, one action per row (no score jargon)
3. **Read-Only Asset Lists**: Pages/Collections lists do not trigger mutations
4. **No Side Effects**: Navigation and clicks do not trigger POST/PUT/DELETE

### URL Classification

The classifyUrlPath() function categorizes URLs:
- `/products/*` → PRODUCTS
- `/collections/*` → COLLECTIONS
- `/pages/*` → PAGES
- Static paths (`/about`, `/contact`, `/faq`, etc.) → PAGES
- Everything else → OTHER (excluded from scope type bundles)

### Related Documents

- [ASSETS-PAGES-1.md](./manual-testing/ASSETS-PAGES-1.md) - Manual testing guide
- [WORK-QUEUE-1.md](./manual-testing/WORK-QUEUE-1.md) - Work Queue testing
- [STORE-HEALTH-1.0.md](./manual-testing/STORE-HEALTH-1.0.md) - Store Health testing
- [API_SPEC.md](../API_SPEC.md) - API documentation (scopeType param)

### Follow-Up Phase

See **Phase ASSETS-PAGES-1.1** for execution capabilities (draft generation + apply-to-Shopify).

---

## Phase ASSETS-PAGES-1.1: Pages & Collections Execution ✅ COMPLETE

**Status:** Complete
**Dependencies:** ASSETS-PAGES-1 (Complete)
**Started:** 2025-12-24
**Completed:** 2025-12-24

### Overview

Execution layer for Pages and Collections: draft generation and apply-to-Shopify capabilities (metadata only: SEO title + SEO description). Extends the visibility-only ASSETS-PAGES-1 with full lifecycle support.

### Authoritative Constraints

1. **Canonical Playbook IDs ONLY**: `missing_seo_title`, `missing_seo_description` — no page/collection-specific variants
2. **Metadata-Only Mutations**: SEO title + SEO description only for Pages/Collections
3. **Handle-Only Apply**: `page_handle:<handle>`, `collection_handle:<handle>` format with no URL/title fallback lookups
4. **Apply Never Uses AI**: AUTO-PB-1.3 invariant preserved
5. **ROLES-2/ROLES-3 Gating**: EDITOR request → OWNER approve/apply

### Scope

#### PATCH 1 — Contract + API Surface ✅
- [x] Added asset-scoped types to work-queue.ts: `AutomationAssetType`, `AssetRef`
- [x] Added `parseAssetRef()`, `createAssetRef()`, `validateAssetRefsForType()` helpers
- [x] Added `PLAYBOOK_ASSET_TYPES` mapping (canonical playbooks → supported asset types)
- [x] Extended controller endpoints with `assetType` and `scopeAssetRefs` parameters:
  - estimate, preview, draft/generate, apply
- [x] Added validation: exactly one of (scopeProductIds) OR (scopeAssetRefs with non-PRODUCTS assetType)
- [x] Added Automation Playbooks section to API_SPEC.md

#### PATCH 2 — Service Generalization ✅
- [x] Removed non-canonical playbook ID variants (page_seo_title_fix, etc.)
- [x] Updated service to use canonical IDs (`missing_seo_title`, `missing_seo_description`) with assetType differentiation
- [x] Asset-scoped helper methods preserved:
  - `extractHandleFromUrl()` - extract handle from page/collection URLs
  - `resolveAssetRefs()` - resolve refs to CrawlResult records
  - `getAffectedAssets()` - get assets needing SEO fixes (uses canonical playbookId)
  - `computeAssetScopeId()` - compute scope ID including assetType
- [x] Extended `estimatePlaybook()` with assetType + scopeAssetRefs support
- [x] Wired controller to pass assetType through to service

#### PATCH 3 — Shopify Admin API Mutations ✅
- [x] Implemented `updateShopifyPageSeo()` in shopify.service.ts (GraphQL pageUpdate mutation)
- [x] Implemented `updateShopifyCollectionSeo()` in shopify.service.ts (GraphQL collectionUpdate mutation)
- [x] Implemented `updatePageSeo()` public method with OWNER-only access
- [x] Implemented `updateCollectionSeo()` public method with OWNER-only access
- [x] Handle-based lookup: Uses `pageByHandle` and `collectionByHandle` queries
- [x] Local CrawlResult sync: Updates title/metaDescription in local records
- [ ] Extend previewPlaybook() for asset-scoped preview (deferred - needs AI prompt adaptation)
- [ ] Extend generateDraft() for asset-scoped draft generation (deferred - needs AI prompt adaptation)
- [ ] Extend applyPlaybook() for asset-scoped apply (wiring to Shopify mutations pending)

#### PATCH 4 — Work Queue Lifecycle ✅
- [x] Extended `deriveAutomationBundles()` to iterate over PRODUCTS, PAGES, COLLECTIONS
- [x] Bundle ID format: `AUTOMATION_RUN:FIX_MISSING_METADATA:{playbookId}:{assetType}:{projectId}`
- [x] Asset-type-specific labels: "Fix missing product/page/collection SEO titles/descriptions"
- [x] Scope preview derivation from CrawlResult for PAGES/COLLECTIONS
- [x] State transitions: NEW → DRAFTS_READY → PENDING_APPROVAL → APPROVED → APPLIED (shared logic)

#### PATCH 5 — Frontend Execution Surfaces ✅
- [x] PATCH 5.1: Work Queue CTA routing - ActionBundleCard.tsx routes AUTOMATION_RUN bundles with asset-scoped deep links (?playbookId=&assetType=)
- [x] PATCH 5.2: Playbooks page.tsx accepts assetType from URL params, shows asset type badge, passes to estimate
- [x] PATCH 5.3: api.ts updated with assetType/scopeAssetRefs support in automationPlaybookEstimate()
- [x] PATCH 5.4: Created assets-pages-1-1.e2e-spec.ts E2E tests
- [x] PATCH 5.5: Updated documentation and marked phase complete
- **Note:** AI prompt adaptation for Pages/Collections draft generation deferred to future phase

#### PATCH 6 — Testing ✅
- [x] Created ASSETS-PAGES-1.1.md manual testing doc
- [x] Created assets-pages-1-1.e2e-spec.ts E2E tests for:
  - Estimate with assetType (PAGES, COLLECTIONS)
  - Different scopeId for same playbookId with different assetType
  - scopeAssetRefs validation (page_handle/collection_handle)
  - Work Queue bundle generation with scopeType
  - Canonical playbook ID enforcement

#### PATCH 7 — Documentation ✅
- [x] Verified and removed non-canonical playbook ID references from API_SPEC.md
- [x] Document asset ref format in API_SPEC.md
- [x] Update IMPLEMENTATION_PLAN.md version history
- [x] Updated ASSETS-PAGES-1.1.md manual testing doc with frontend scenarios

### Trust Invariants

1. **Apply Never Uses AI**: Pages/Collections apply follows same pattern as Products
2. **OWNER-Only Apply**: Only OWNER can apply changes to Pages/Collections
3. **Approval Chain**: EDITOR must request approval before apply
4. **Canonical IDs Only**: No playbook ID proliferation — assetType handles differentiation

### Related Documents

- [ASSETS-PAGES-1.md](./manual-testing/ASSETS-PAGES-1.md) - Visibility-only manual testing
- [ASSETS-PAGES-1.1.md](./manual-testing/ASSETS-PAGES-1.1.md) - Execution manual testing
- [assets-pages-1-1.e2e-spec.ts](../apps/api/test/e2e/assets-pages-1-1.e2e-spec.ts) - E2E tests
- Phase ASSETS-PAGES-1 - Visibility layer (prerequisite)

---

## Phase ASSETS-PAGES-1.1-UI-HARDEN: End-to-End Shippable UI ✅ COMPLETE

**Status:** Complete
**Dependencies:** ASSETS-PAGES-1.1 (Complete)
**Started:** 2025-12-24
**Completed:** 2025-12-24

### Overview

UI hardening for Pages/Collections playbook execution. Ensures the frontend properly handles asset-scoped deep links, blocks operations when scope is missing, and provides a complete end-to-end flow for PAGES/COLLECTIONS asset types.

### Authoritative Constraints

1. **Deterministic Safety Block**: PAGES/COLLECTIONS without scopeAssetRefs must be blocked (no silent project-wide scoping)
2. **Canonical Playbook IDs ONLY**: Only `missing_seo_title` and `missing_seo_description` allowed
3. **XOR Scope Enforcement**: PRODUCTS uses scopeProductIds, PAGES/COLLECTIONS uses scopeAssetRefs
4. **Handle-Only Refs**: `page_handle:<handle>`, `collection_handle:<handle>` format required

### Implementation Patches

#### PATCH 1 — API Client Full Param Support ✅
- [x] Extended `previewAutomationPlaybook()` with assetType + scopeAssetRefs params
- [x] Extended `applyAutomationPlaybook()` with assetType + scopeAssetRefs params
- [x] Extended `generateAutomationPlaybookDraft()` with assetType + scopeAssetRefs params
- [x] XOR enforcement: PRODUCTS uses scopeProductIds, PAGES/COLLECTIONS uses scopeAssetRefs

#### PATCH 2 — Playbooks UI Hardening ✅
- [x] Parse and retain URL params: playbookId, assetType, scopeAssetRefs (comma-separated)
- [x] Missing scope safety block: red banner with exact message when PAGES/COLLECTIONS lacks scopeAssetRefs
- [x] Scope summary UI: asset type badge + first 3 handles + "+N more"
- [x] Pass assetType and scopeAssetRefs through loadEstimate(), loadPreview(), handleApplyPlaybook()

#### PATCH 3 — Work Queue Deep Link Completeness ✅
- [x] `extractScopeAssetRefs()`: extract handle refs from scopeQueryRef or bundleId
- [x] `hasMissingScope()`: check if PAGES/COLLECTIONS bundle lacks deterministic refs
- [x] `getCTARoute()`: include scopeAssetRefs in deep link for PAGES/COLLECTIONS
- [x] `deriveCtas()`: disable actions for bundles with missing scope

#### PATCH 4 — Playwright UI Smoke Test ✅
- [x] Created `apps/web/tests/assets-pages-1-1.spec.ts`
- [x] Test: Asset type badge renders for assetType=PAGES
- [x] Test: Scope summary renders with handle refs
- [x] Test: Missing scope block for PAGES without scopeAssetRefs
- [x] Test: Missing scope block for COLLECTIONS without scopeAssetRefs
- [x] Test: PRODUCTS works without scopeAssetRefs (backwards compatibility)
- [x] Test: Deep link preserves all params including scopeAssetRefs
- [x] Test: "+N more" shown for >3 scope refs

#### PATCH 5 — Documentation ✅
- [x] Added ASSETS-PAGES-1.1-UI-HARDEN phase to IMPLEMENTATION_PLAN.md
- [x] Updated ASSETS-PAGES-1.1.md with UI execution verification scenarios
- [x] Linked to Playwright test file

### Trust Invariants

1. **No Silent Broad Scoping**: PAGES/COLLECTIONS without scope refs cannot proceed
2. **Deterministic Deep Links**: Work Queue CTA includes all params needed for scoped execution
3. **Backwards Compatible**: PRODUCTS flow unchanged (no scopeAssetRefs required)
4. **Scope Visibility**: User sees scope summary before any mutation

### Related Documents

- [ASSETS-PAGES-1.1.md](./manual-testing/ASSETS-PAGES-1.1.md) - Manual testing guide
- [assets-pages-1-1.spec.ts](../apps/web/tests/assets-pages-1-1.spec.ts) - Playwright UI smoke tests
- Phase ASSETS-PAGES-1.1 - Execution layer (prerequisite)

---

## Phase GOV-AUDIT-VIEWER-1: Audit & Approvals Viewer ✅ COMPLETE

**Status:** Complete
**Dependencies:** ENTERPRISE-GEO-1 (Complete)
**Started:** 2025-12-24
**Completed:** 2025-12-24

### Overview

Read-only governance viewer providing project members visibility into approval requests, audit events, and share link activity. Part of the Enterprise Trust Surface.

### Key Features

1. **Three-Tab UI**: Approvals, Audit Log, Sharing & Links
2. **Cursor-Based Pagination**: Stable ordering (timestamp DESC, id DESC)
3. **Strict Audit Allowlist**: Only approval and share-link lifecycle events visible
4. **Passcode Security**: Never returns full passcode, only passcodeLast4
5. **Role-Safe Read Access**: Any project member (VIEWER, EDITOR, OWNER) can view

### Authoritative Constraints

1. **Read-Only Only**: All endpoints are GET; no mutations from viewer
2. **Allowlist-Filtered Audit Events**: Only these event types are returned:
   - APPROVAL_REQUESTED
   - APPROVAL_APPROVED
   - APPROVAL_REJECTED
   - SHARE_LINK_CREATED
   - SHARE_LINK_REVOKED
   - SHARE_LINK_EXPIRED
3. **Server-Side Filtering**: Allowlist enforced on server, not client
4. **Deterministic Ordering**: timestamp DESC, id DESC for stable pagination
5. **Data Minimization**: Passcode hash never exposed; only passcodeLast4

### Implementation Patches

#### PATCH 1 — Shared Governance Contract ✅
- [x] Created `packages/shared/src/governance.ts` with DTOs
- [x] Defined `ALLOWED_AUDIT_EVENT_TYPES` authoritative allowlist
- [x] Added cursor pagination helpers: `buildPaginationCursor()`, `parsePaginationCursor()`
- [x] Added type guards: `isAllowedAuditEventType()`
- [x] Exported from `packages/shared/src/index.ts`

#### PATCH 2 — API Read Endpoints ✅
- [x] Created `apps/api/src/projects/governance-viewer.service.ts`
  - `listApprovals()`: Cursor pagination, user name resolution, deep-link fields
  - `listAuditEvents()`: STRICT allowlist filtering, cursor pagination
  - `listShareLinks()`: Status derivation, NEVER returns passcode
- [x] Extended `apps/api/src/projects/governance.controller.ts` with viewer endpoints:
  - `GET /projects/:projectId/governance/viewer/approvals`
  - `GET /projects/:projectId/governance/viewer/audit-events`
  - `GET /projects/:projectId/governance/viewer/share-links`
- [x] Registered `GovernanceViewerService` in `projects.module.ts`
- [x] Added API client methods to `apps/web/src/lib/api.ts`

#### PATCH 3 — Governance UI ✅
- [x] Created `/projects/[id]/settings/governance/page.tsx`
- [x] Three tabs: Approvals, Audit Log, Sharing & Links
- [x] Status filter buttons for each tab
- [x] Detail drawers for each item type
- [x] Badge components for status, event type, audience
- [x] URL-based tab navigation

#### PATCH 4 — Testing ✅
- [x] Created `apps/api/test/e2e/governance-viewer.e2e-spec.ts`
  - Approvals: empty, pagination, user names
  - Audit events: allowlist filtering, type filter
  - Share links: passcode security, status derivation, status filter
  - Access control tests
- [x] Created `apps/web/tests/governance-viewer.spec.ts` (Playwright smoke)
  - Tab navigation
  - Empty states
  - Filter buttons
  - URL-based tab control

#### PATCH 5 — Documentation ✅
- [x] Created `docs/manual-testing/GOV-AUDIT-VIEWER-1.md`
- [x] Updated `docs/IMPLEMENTATION_PLAN.md` (this section)
- [x] Updated `API_SPEC.md` with Governance Viewer endpoints

### Entry Point / Route

Governance Viewer is accessible at:
- `/projects/{id}/settings/governance` - Main page
- `/projects/{id}/settings/governance?tab=approvals` - Approvals tab
- `/projects/{id}/settings/governance?tab=audit` - Audit Log tab
- `/projects/{id}/settings/governance?tab=sharing` - Sharing & Links tab

### Trust Invariants

1. **Mutation-Free Viewer**: No POST/PUT/DELETE from viewer endpoints
2. **Allowlist Enforcement**: Server-side filtering, not client-only
3. **Passcode Protection**: Hash never exposed; last4 only for display
4. **Universal Read Access**: All project members can view governance data

### API Endpoints

| Endpoint | Query Params | Description |
|----------|--------------|-------------|
| `GET /viewer/approvals` | status, cursor, limit | List approvals (pending/history) |
| `GET /viewer/audit-events` | types, actor, from, to, cursor, limit | List allowlist-filtered events |
| `GET /viewer/share-links` | status, cursor, limit | List share links with derived status |

### Related Documents

- [GOV-AUDIT-VIEWER-1.md](./manual-testing/GOV-AUDIT-VIEWER-1.md) - Manual testing guide
- [ENTERPRISE-GEO-1.md](./manual-testing/ENTERPRISE-GEO-1.md) - Governance foundations
- [governance-viewer.e2e-spec.ts](../apps/api/test/e2e/governance-viewer.e2e-spec.ts) - API E2E tests
- [governance-viewer.spec.ts](../apps/web/tests/governance-viewer.spec.ts) - Playwright smoke tests

---

## Phase NAV-IA-CONSISTENCY-1: Navigation IA Consistency & Terminology ✅ COMPLETE

**Status:** Complete
**Date Completed:** 2026-01-06
**Critical Paths:** CP-001 (Auth terminology), CP-008 (Design tokens & theme)

### Overview

Enforces locked contract for navigation information architecture (IA) and terminology across the application. Adds design tokens for theme support, normalizes authentication terminology, and ensures visual consistency between marketing and portal.

### Key Changes

#### Design Tokens & Theme
- Added `darkMode: 'class'` to Tailwind config
- Created CSS variables for token palette (light + dark modes)
- Token colors: background, foreground, muted-foreground, primary, primary-foreground, signal, border
- Theme toggle in TopNav with localStorage persistence

#### Navigation IA Contract

**TopNav (Authenticated):**
- Removed top-level "Settings" link
- Added theme toggle control
- Account dropdown: Profile, Stores, Plan & Billing, AI Usage, Security, Preferences, Help & Support, Sign out
- Removed "Admin Dashboard" from dropdown (Admin link remains conditional in main nav)

**ProjectSideNav:**
- Grouped sections: OPERATE, ASSETS, AUTOMATION, INSIGHTS, PROJECT
- OPERATE: Store Health, Work Queue
- ASSETS: Products, Pages, Collections
- AUTOMATION: Playbooks (label only; route unchanged)
- INSIGHTS: Insights (single item, active for all pillar routes)
- PROJECT: Project Settings
- Removed: Overview, Automation (old), Settings (old), Content, DEO Overview, pillar items

**InsightsPillarsSubnav:**
- New component for pillar navigation under Insights
- Tabs: DEO, Search & Intent, Competitors, Off-site Signals, Local Discovery, Technical

#### Terminology Normalization

| Old Term | New Term |
|----------|----------|
| Log in | Sign in |
| Sign up (button) | Create account |
| Organization / Stores | Stores |
| Overview (InsightsSubnav) | Summary |
| Automation (UI label) | Playbooks |

### Implementation Patches

#### PATCH 1 — Design Tokens ✅
- [x] Added `darkMode: 'class'` to `tailwind.config.ts`
- [x] Extended Tailwind colors with token-backed names
- [x] Created CSS variables in `globals.css` for light and dark modes

#### PATCH 2 — Marketing Visual Consistency ✅
- [x] Updated `layout.tsx` with `bg-background text-foreground`
- [x] Updated `MarketingNavbar.tsx` with token-based colors, "Sign in" terminology
- [x] Updated `MarketingFooter.tsx` with token-based colors
- [x] Updated marketing homepage with token-based styling, "Store Health" terminology

#### PATCH 3 — Auth Terminology ✅
- [x] Login page: "Sign up" → "Create account" link, "Login failed" → "Sign-in failed"
- [x] Signup page: "Sign up" → "Create account" button, "Signup failed" → "Create account failed"

#### PATCH 4 — TopNav Contract ✅
- [x] Removed top-level "Settings" link
- [x] Added theme toggle with localStorage persistence
- [x] Locked account dropdown labels and order
- [x] Removed "Admin Dashboard" from dropdown
- [x] Unauthenticated: "Sign up" → "Create account"
- [x] Token-based styling

#### PATCH 5 — ProjectSideNav Grouped IA ✅
- [x] Implemented grouped sections with headings
- [x] Active-state hardening for Insights on all pillar routes
- [x] Removed forbidden labels (Overview, Automation, Settings, Content, DEO Overview)

#### PATCH 6 — InsightsPillarsSubnav ✅
- [x] Created `InsightsPillarsSubnav.tsx` component
- [x] Tab navigation for all pillar routes

#### PATCH 7 — Terminology Hardening ✅
- [x] InsightsSubnav: "Overview" → "Summary"
- [x] Settings organization page: "Organization / Stores" → "Stores"
- [x] Settings hub card: "Organization / Stores" → "Stores"

#### PATCH 8 — Automation → Playbooks ✅
- [x] Automation page redirects to playbooks
- [x] Playbooks page header: "Automation Playbooks" → "Playbooks"
- [x] Breadcrumbs and button labels updated
- [x] Entry page: "Automation Entry" → "New Playbook"

#### PATCH 9 — Playwright Coverage ✅
- [x] Created `apps/web/tests/nav-ia-consistency-1.spec.ts`
- [x] Marketing navbar assertions
- [x] Portal top nav assertions
- [x] Theme toggle presence
- [x] Account dropdown labels
- [x] Project sidebar group headings and item labels

#### PATCH 10 — Documentation ✅
- [x] Created `docs/manual-testing/NAV-IA-CONSISTENCY-1.md`
- [x] Created `docs/testing/NAV-IA-CONSISTENCY-1.md` (pointer)
- [x] Updated `docs/IMPLEMENTATION_PLAN.md` (this section)
- [x] Updated `docs/testing/CRITICAL_PATH_MAP.md`

### Related Documents

- [NAV-IA-CONSISTENCY-1.md](./manual-testing/NAV-IA-CONSISTENCY-1.md) - Manual testing guide
- [DEO_INFORMATION_ARCHITECTURE.md](./DEO_INFORMATION_ARCHITECTURE.md) - IA foundations
- [nav-ia-consistency-1.spec.ts](../apps/web/tests/nav-ia-consistency-1.spec.ts) - Playwright E2E tests
- [Repo-root pointer](../manual-testing/NAV-IA-CONSISTENCY-1.md) - Quick access from repo root

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
