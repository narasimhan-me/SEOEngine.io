# COUNT-INTEGRITY-1.1: Canonical Triplet Counts + Explicit Labels Manual Testing Guide

**Phase:** COUNT-INTEGRITY-1.1
**Status:** ✅ COMPLETE (Backend + UI Migration + UI Smoke Test)
**Date:** 2026-01-08 (Updated after PATCH 5-10 completion)

## Overview

### Purpose of the Feature/Patch

COUNT-INTEGRITY-1.1 establishes canonical triplet count semantics with explicit UX labels across all surfaces:
- **issueTypesCount**: Count of distinct issue types in scope
- **affectedItemsCount**: Deduped unique assets affected (UEP decision: backend computes)
- **actionableNowCount**: Deduped unique actionable assets (role-gated)

Replaces mixed v1 "groups/instances" semantics with consistent labeled counts.

### Implementation Status

**COMPLETED (PATCH 0 + PATCH BATCH 2 + PATCH BATCH 3):**
- ✅ PATCH 0: Endpoint naming fixed (`/summary` primary, `/canonical-summary` alias)
- ✅ PATCH 1-3: Canonical triplet types + backend endpoints + web client (initial delivery)
- ✅ PATCH 2.1: Media issues count bug fixed (true counts, not capped sample length)
- ✅ PATCH 2.2: Shared issue→actionKey mapper created in packages/shared
- ✅ PATCH 2.3: Work Queue refactored to use shared mapper
- ✅ PATCH 2.4: Real actionKey filtering implemented in canonical summary
- ✅ PATCH 2.5-FIXUP-1: Asset-specific endpoint bugs fixed (ID→URL, project-scoped, deterministic empty)
- ✅ PATCH 2.6-FIXUP-1: Deterministic Playwright backend API tests (accessToken field corrected)
- ✅ PATCH 2.7-FIXUP-1: Documentation truthfulness updated
- ✅ PATCH 3.1: Non-enumerable `__fullAffectedAssetKeys` field infrastructure
- ✅ PATCH 3.2: Product-based builders populate full keys (11+ builders) **[Gap 3a: Products only]**
- ✅ PATCH 3.3: Canonical summary uses full keys for accurate deduplication (when present)
- ✅ PATCH 3.4: Asset endpoint uses full keys for membership checks (when present)
- ✅ PATCH 3.5: Media issues carry full keys
- ✅ PATCH 3.6: CANON-009 regression test (30 products, verifies >20 accuracy for products)
- ✅ PATCH 3.7: Documentation updates (Gap 3a marked resolved; Gap 3b identified)
- ✅ PATCH 4.1: Technical/page-based builders populate full keys (Gap 3b)
- ✅ PATCH 4.2-FIXUP-1: Collections seed endpoint returns collectionIds for asset endpoint
- ✅ PATCH 4.3-FIXUP-1: CANON-010 regression test (30 collections, verifies >20 accuracy for collections)
- ✅ PATCH 4.3-FIXUP-2: CANON-010 scoped to collections-only (scopeType=collections filter)
- ✅ PATCH 4.4-FIXUP-1: Documentation updates (Gap 3b marked resolved)

**COMPLETED (UI Migration - Gap 6 + Gap 7 + Enterprise Trust Hardening):**
- ✅ PATCH 5: Issues Engine filter-aligned canonical summary + labeled triplet with data-testid
- ✅ PATCH 6: Product detail Issues tab uses assetIssues endpoint + labeled triplet
- ✅ PATCH 7: Store Health tiles show Items affected from canonical summary
- ✅ PATCH 8: Work Queue trust fixes + canonical Actionable now display + AI badge copy
- ✅ PATCH 9: Gap 7 cross-surface Playwright UI smoke test
- ✅ PATCH 10: Documentation updates
- ✅ FIX-UP: Enterprise Trust Hardening (pillar-scoped routing, zero-actionable suppression, single end-to-end test)

### High-Level User Impact

**Backend (COMPLETE - All asset types verified):**
- New API endpoints provide canonical triplet counts for any filter combination
- ActionKey filtering works (shared mapper ensures consistency with Work Queue)
- Zero-affected suppression semantics built-in (affectedItemsCount = 0 when no items)
- **Products deduplication accurate beyond cap-20** (PATCH BATCH 3 resolved Gap 3a, verified by CANON-009)
- **Pages/Collections deduplication accurate beyond cap-20** (PATCH BATCH 4 resolved Gap 3b, verified by CANON-010)
- affectedItemsCount accurate for all asset types (products, pages, collections)
- Backend has NO known limitations for deduplication

**UI Updates (COMPLETE):**
- ✅ All count displays show explicit labels ("Issue types", "Items affected", "Actionable now")
- ✅ No naked numbers or ambiguous parenthetical counts
- ✅ Cross-surface consistency for matching filter sets
- ✅ Clear differentiation between detected counts and actionable counts
- ✅ TripletDisplay component with data-testid attributes for UI testing
- ✅ Zero-actionable suppression with "No items currently eligible for action" message
- ✅ Store Health uses canonical triplet for "Items affected" display
- ✅ Work Queue AI badge shows trust-building copy ("Does not use AI", "AI used for drafts only")

### Related Documentation

- `docs/manual-testing/COUNT-INTEGRITY-1.md` (predecessor phase)
- `docs/testing/CRITICAL_PATH_MAP.md` (CP-008, CP-009)
- `apps/web/tests/count-integrity-1-1.spec.ts` (Playwright backend API tests)
- `apps/web/tests/count-integrity-1-1.ui.spec.ts` (Playwright UI smoke tests - Gap 7)

---

## Backend API Endpoints (COMPLETE)

### 1. Canonical Summary Endpoint

**GET** `/projects/:projectId/issues/summary` (primary route - PATCH 0)
**GET** `/projects/:projectId/issues/canonical-summary` (backward-compatible alias)

**Query Params:**
- `actionKey` (WorkQueueRecommendedActionKey, optional): Filter by single action key [PATCH 2.4]
- `actionKeys` (WorkQueueRecommendedActionKey[], optional): Filter by multiple action keys [PATCH 2.4]
- `scopeType` (IssueAssetTypeKey, optional): Filter by asset type (products/pages/collections)
- `pillar` (DeoPillarId, optional): Filter by single pillar
- `pillars` (DeoPillarId[], optional): Filter by multiple pillars
- `severity` ('critical' | 'warning' | 'info', optional): Filter by severity

**Response:**
```typescript
{
  projectId: string;
  generatedAt: string;
  filters?: { /* echoed filters */ };
  detected: {
    issueTypesCount: number;
    affectedItemsCount: number;
    actionableNowCount: number;
  };
  actionable: {
    issueTypesCount: number;
    affectedItemsCount: number;
    actionableNowCount: number;
  };
  byPillar: Record<DeoPillarId, { detected: CanonicalCountTriplet; actionable: CanonicalCountTriplet }>;
  bySeverity: Record<DeoIssueSeverity, { detected: CanonicalCountTriplet; actionable: CanonicalCountTriplet }>;
}
```

### 2. Asset-Specific Issues Endpoint

**GET** `/projects/:projectId/assets/:assetType/:assetId/issues`

**Path Params:**
- `assetType`: 'products' | 'pages' | 'collections'
- `assetId`: Asset ID (product ID, page URL, or collection ID)

**Query Params:**
- `pillar` (DeoPillarId, optional): Filter by single pillar
- `pillars` (DeoPillarId[], optional): Filter by multiple pillars
- `severity` ('critical' | 'warning' | 'info', optional): Filter by severity

**Response:**
```typescript
{
  projectId: string;
  assetType: IssueAssetTypeKey;
  assetId: string;
  generatedAt: string;
  issues: DeoIssue[];
  summary: {
    detected: CanonicalCountTriplet;
    actionable: CanonicalCountTriplet;
    byPillar: Record<DeoPillarId, { detected: CanonicalCountTriplet; actionable: CanonicalCountTriplet }>;
    bySeverity: Record<DeoIssueSeverity, { detected: CanonicalCountTriplet; actionable: CanonicalCountTriplet }>;
  };
}
```

**Note:** For asset-specific views, `affectedItemsCount` is always 0 (no issues) or 1 (this asset), never > 1.

---

## Test Scenarios (Backend Foundation)

### Scenario 1: Canonical Summary Returns Valid Triplet Structure

**ID:** CANON-001

**Preconditions:**
- User authenticated
- Test project exists with issues detected

**Steps:**
1. Call `GET /projects/{projectId}/issues/summary`
2. Verify response has `detected` and `actionable` triplets
3. Verify each triplet has `issueTypesCount`, `affectedItemsCount`, `actionableNowCount`
4. Verify all counts are numbers >= 0
5. Verify `actionable.issueTypesCount <= detected.issueTypesCount`
6. Verify `actionable.affectedItemsCount <= detected.affectedItemsCount`

**Expected Results:**
- ✅ Valid triplet structure returned
- ✅ Actionable counts never exceed detected counts
- ✅ `byPillar` and `bySeverity` breakdowns present

---

### Scenario 2: Canonical Summary with Pillar Filter

**ID:** CANON-002

**Preconditions:**
- User authenticated
- Test project has issues in multiple pillars

**Steps:**
1. Call `GET /projects/{projectId}/issues/summary?pillar=metadata_snippet_quality`
2. Verify `filters.pillar` echoed back in response
3. Verify triplet counts reflect only metadata issues

**Expected Results:**
- ✅ Filters echoed in response
- ✅ Counts filtered to specified pillar
- ✅ Triplet structure valid

---

### Scenario 3: Canonical Summary with Severity Filter

**ID:** CANON-003

**Preconditions:**
- User authenticated
- Test project has issues at multiple severity levels

**Steps:**
1. Call `GET /projects/{projectId}/issues/summary?severity=critical`
2. Verify `filters.severity` echoed back
3. Verify triplet counts reflect only critical issues

**Expected Results:**
- ✅ Severity filter applied correctly
- ✅ Triplet structure valid

---

### Scenario 4: byPillar Breakdown Includes All Pillars

**ID:** CANON-004

**Preconditions:**
- User authenticated
- Test project exists

**Steps:**
1. Call `GET /projects/{projectId}/issues/summary`
2. Verify `byPillar` contains entries for all 10 pillars
3. Verify each pillar has `detected` and `actionable` triplets

**Expected Results:**
- ✅ All pillars present in breakdown (even if counts = 0)
- ✅ Each pillar has valid triplet structure

---

### Scenario 5: bySeverity Breakdown Includes All Severities

**ID:** CANON-005

**Preconditions:**
- User authenticated
- Test project exists

**Steps:**
1. Call `GET /projects/{projectId}/issues/summary`
2. Verify `bySeverity` contains entries for critical, warning, info
3. Verify each severity has `detected` and `actionable` triplets

**Expected Results:**
- ✅ All severities present in breakdown
- ✅ Each severity has valid triplet structure

---

### Scenario 6: Asset-Specific Issues Returns Valid Structure

**ID:** CANON-006

**Preconditions:**
- User authenticated
- Test project has at least one product with issues

**Steps:**
1. Get product ID from `/projects/{projectId}/products`
2. Call `GET /projects/{projectId}/assets/products/{productId}/issues`
3. Verify response has `issues` array and `summary` with triplet structure
4. Verify `affectedItemsCount` is 0 or 1 (never > 1)
5. Verify `assetType` is 'products' and `assetId` matches

**Expected Results:**
- ✅ Issues array contains only issues affecting this product
- ✅ Summary has valid triplet structure
- ✅ affectedItemsCount is 0 (no issues) or 1 (this asset only)

---

### Scenario 7: Asset-Specific Issues with Pillar Filter

**ID:** CANON-007

**Preconditions:**
- User authenticated
- Test product with issues in multiple pillars

**Steps:**
1. Call `GET /projects/{projectId}/assets/products/{productId}/issues?pillar=metadata_snippet_quality`
2. Verify `issues` array contains only metadata issues
3. Verify summary counts reflect filtered issues

**Expected Results:**
- ✅ Issues filtered to specified pillar
- ✅ Summary triplet reflects filtered subset

---

## Automated Test Coverage

**Backend API Test File:** `apps/web/tests/count-integrity-1-1.spec.ts` [PATCH 2.6-FIXUP-1]
**UI Smoke Test File:** `apps/web/tests/count-integrity-1-1.ui.spec.ts` [PATCH 9]

**Test Infrastructure:**
- ✅ Uses `/testkit/e2e/seed-first-deo-win` for deterministic test data
- ✅ Corrected token field (`accessToken` not `authToken`) [FIXUP-1]
- ✅ No environment variable dependencies (TEST_USER, TEST_PASSWORD removed)
- ✅ Independent of "first project" discovery pattern

**Test Coverage (Backend API Complete):**
- ✅ CANON-001: Valid triplet structure
- ✅ CANON-002: Pillar filter support
- ✅ CANON-003: Severity filter support
- ✅ CANON-004: byPillar breakdown complete
- ✅ CANON-005: bySeverity breakdown complete
- ✅ CANON-006: Asset-specific issues structure
- ✅ CANON-007: Asset-specific pillar filtering
- ✅ CANON-008: ActionKey filter support [PATCH 2.6]
- ✅ CANON-009: affectedItemsCount accuracy beyond cap-20 for products [PATCH 3.6 - Gap 3a]
- ✅ CANON-010: affectedItemsCount accuracy beyond cap-20 for collections [PATCH 4.3 - Gap 3b]

**Test Coverage (UI Smoke Test Complete - Gap 7 + Enterprise Trust Hardening + FIXUP-2):**
- ✅ Single end-to-end test: Store Health → Issues Engine → Asset Detail (FIXUP-2: Work Queue step removed)
- ✅ Store Health shows "X items affected" with pillar-scoped counts (Discoverability/Technical)
- ✅ STRICT parsing: requires "items affected" text + numeric value (no fallbacks)
- ✅ Click-through from Store Health to Issues Engine (not Work Queue) with pillar filter + mode=detected
- ✅ Issues Engine triplet-items-affected-value matches Store Health tile count
- ✅ Product Issues tab triplet visible; zero-actionable suppression verified
- ✅ Asset Detail navigation REQUIRED (no optional branches)

**Run Tests:**
```bash
cd apps/web
# Backend API tests
npx playwright test count-integrity-1-1.spec.ts
# UI smoke tests
npx playwright test count-integrity-1-1.ui.spec.ts
```

---

## UI Implementation Summary (COMPLETE)

### PATCH 5: Issues Engine Filter-Aligned Canonical Summary (✅ COMPLETE)

**Scope:**
- ✅ Issues page passes actionKey, scopeType filters to canonical summary endpoint
- ✅ TripletDisplay component with data-testid attributes for UI testing
- ✅ Mode toggles exist for actionable/detected switching
- ✅ Zero-actionable suppression message when actionableNowCount = 0

**Files Modified:** `apps/web/src/app/projects/[id]/issues/page.tsx`, `apps/web/src/components/issues/TripletDisplay.tsx`

---

### PATCH 6: Product Detail Asset-Specific Issues (✅ COMPLETE)

**Scope:**
- ✅ Product detail page uses `assetIssues` endpoint instead of project-wide issues
- ✅ ProductIssuesPanel receives summary prop with triplet counts
- ✅ Triplet display shows issue types, items affected, actionable now
- ✅ Zero-actionable suppression message

**Files Modified:** `apps/web/src/app/projects/[id]/products/[productId]/page.tsx`, `apps/web/src/components/products/optimization/ProductIssuesPanel.tsx`

---

### PATCH 7: Store Health Canonical Counts (✅ COMPLETE)

**Scope:**
- ✅ Store Health uses `canonicalIssueCountsSummary` endpoint
- ✅ Tiles show "N items affected" with canonical counts
- ✅ Data-testid attributes for UI testing

**Files Modified:** `apps/web/src/app/projects/[id]/store-health/page.tsx`

---

### PATCH 8: Work Queue Trust Fixes (✅ COMPLETE)

**Scope:**
- ✅ AI badge shows "Does not use AI" (was "No AI")
- ✅ AI badge shows "AI used for drafts only" (was "AI Drafts")
- ✅ Data-testid attributes for UI testing

**Files Modified:** `apps/web/src/components/work-queue/ActionBundleCard.tsx`

---

## Implementation History

1. **Phase 1 (Backend Complete):** ✅ DONE
   - Canonical types defined
   - Endpoints implemented
   - API client wired
   - Backend API tests passing (CANON-001 through CANON-010)

2. **Phase 2 (UI Migration - Gap 6):** ✅ DONE (PATCH 5-8)
   - Issues Engine: Filter-aligned canonical summary with TripletDisplay
   - Product Detail: Uses assetIssues endpoint with triplet summary
   - Store Health: Uses canonical counts for "Items affected" display
   - Work Queue: Trust-building AI badge copy

3. **Phase 3 (UI Smoke Test - Gap 7 + Enterprise Trust Hardening + FIXUP-2):** ✅ DONE (PATCH 9 + FIX-UP + FIXUP-2)
   - Created/maintained count-integrity-1-1.ui.spec.ts as a single end-to-end test
   - Covers Store Health → Issues Engine → Asset Detail chain (FIXUP-2: Work Queue step removed)
   - Verifies pillar-scoped "Items affected" click-integrity and zero-actionable suppression
   - STRICT mode: requires numeric parsing, requires asset-detail navigation (no optional branches)

4. **Phase 4 (Documentation - PATCH 10):** ✅ DONE
   - Updated CRITICAL_PATH_MAP.md
   - Updated IMPLEMENTATION_PLAN.md
   - Updated COUNT-INTEGRITY-1.1.md (this document)

---

## Known Limitations (Final)

1. **Store-wide issues represented as 1 pseudo-item**
   - When `affectedProducts` array is empty but `assetTypeCounts.products > 0`
   - Backend uses `products:__store_wide__` composite key
   - affectedItemsCount = 1 (not 0, not total product count)
   - This is intentional design to avoid confusion

2. **No runtime backward compatibility layer**
   - Legacy `IssueCountsSummary` type is deprecated but still present
   - UI has migrated to canonical triplet types
   - No runtime shim between v1 and v1.1 semantics

---

## Sign-Off (COMPLETE)

**Backend (COMPLETE - All asset types verified):**
- [x] PATCH 0: Endpoint naming fixed (`/summary` primary path)
- [x] PATCH 1-3: Backend foundation + types + web client
- [x] PATCH 2.1: Media count bug fixed (true counts)
- [x] PATCH 2.2-2.4: Shared mapper + actionKey filtering working
- [x] PATCH 2.5-FIXUP-1: Asset-specific endpoint bugs fixed (ID→URL, project-scoped, deterministic empty)
- [x] PATCH 2.6-FIXUP-1: Playwright backend API tests deterministic (testkit seeds, accessToken corrected)
- [x] PATCH 2.7-FIXUP-1: Documentation truthfulness updated
- [x] PATCH 3.1-3.5: Non-enumerable full keys infrastructure + product-based builders updated (Gap 3a)
- [x] PATCH 3.6: CANON-009 regression test (30 products, verifies >20 accuracy for products)
- [x] PATCH 3.7: Documentation updates (Gap 3a marked resolved; Gap 3b identified)
- [x] PATCH 4.1: Technical/page-based builders populate full keys (Gap 3b)
- [x] PATCH 4.2-FIXUP-1: Collections seed endpoint returns collectionIds
- [x] PATCH 4.3-FIXUP-1: CANON-010 regression test (30 collections, verifies >20 accuracy)
- [x] PATCH 4.3-FIXUP-2: CANON-010 scoped to collections-only (scopeType=collections filter)
- [x] PATCH 4.4-FIXUP-1: Documentation updates (Gap 3b marked resolved)

**UI Migration (COMPLETE - Gap 6):**
- [x] PATCH 5: Issues Engine filter-aligned canonical summary + labeled triplet with data-testid
- [x] PATCH 6: Product detail Issues tab uses assetIssues endpoint + labeled triplet
- [x] PATCH 7: Store Health tiles show Items affected from canonical summary
- [x] PATCH 8: Work Queue trust fixes + canonical Actionable now display + AI badge copy

**Testing (COMPLETE):**
- [x] Backend API tests (10 tests: CANON-001 through CANON-010)
- [x] UI smoke test (1 end-to-end test: Store Health → Issues Engine → Asset Detail)

**UI Hardening (COMPLETE):**
- [x] UI HARDEN: Multi-action filtering via actionKeys URL param (OR across keys)
- [x] UI HARDEN: Pillar-aware triplet display (currentTriplet from byPillar when filtered)
- [x] UI HARDEN: Fixed UI smoke test auth pattern (localStorage only)
- [x] UI HARDEN: Fixed product selection shape (response is { products: [...] })
- [x] AUDIT FIX: Severity-aligned canonical summary (passes severity filter to API)
- [x] AUDIT FIX: Pillar-aware hasActionableIssues/hasDetectedIssues checks (byPillar fallback)
- [x] VERIFICATION (NO-OP): All audit fixes confirmed implemented 2026-01-09

**Ready for:**
- ✅ Backend API consumption for all asset types (all dedup verified)
- ✅ Work Queue → Issues click-integrity (actionKey filtering works)
- ✅ Asset detail pages filtering (ID→URL resolution works, project-scoped)
- ✅ affectedItemsCount accuracy for ALL asset types (Gap 3a + Gap 3b verified)
- ✅ UI displays labeled triplet counts across all surfaces
- ✅ Cross-surface navigation verified by UI smoke tests

---

## Notes

- **No DB migrations required** - all computation happens at request time
- **Zero-affected suppression built-in** - affectedItemsCount = 0 when no items match filters
- **Cross-surface consistency guaranteed** - same filters always return same counts
- **Accurate beyond cap-20** - affectedItemsCount uses full keys (verified by CANON-009 + CANON-010)
- **Explicit labels implemented** - UI displays "Issue types", "Items affected", "Actionable now" labels
- **TripletDisplay component** - Reusable component with data-testid attributes for consistent UI testing
- **Trust-building AI badge copy** - "Does not use AI" and "AI used for drafts only" per design spec

---

## Enterprise Trust Hardening Fix-Up (2026-01-09)

### Bug Reproduction + Validation Scenarios

#### Scenario ETH-001: Discoverability Click-Integrity

**Steps:**
1. Navigate to Store Health page
2. Verify Discoverability tile displays "X items affected" (pillar-scoped from `metadata_snippet_quality`)
3. Click Discoverability tile
4. Verify URL contains:
   - `/issues` (not `/work-queue`)
   - `pillar=metadata_snippet_quality`
   - `mode=detected`
   - `from=store_health`
5. Verify Issues Engine triplet displays "Items affected = X" (matches Store Health tile)

**Expected:** Store Health "items affected" count matches Issues Engine filtered triplet.

---

#### Scenario ETH-002: Technical Readiness Click-Integrity

**Steps:**
1. Navigate to Store Health page
2. Verify Technical Readiness tile displays "Y items affected" (pillar-scoped from `technical_indexability`)
3. Click Technical Readiness tile
4. Verify URL contains:
   - `/issues` (not `/work-queue`)
   - `pillar=technical_indexability`
   - `mode=detected`
   - `from=store_health`
5. Verify Issues Engine triplet displays "Items affected = Y" (matches Store Health tile)

**Expected:** Store Health "items affected" count matches Issues Engine filtered triplet.

---

#### Scenario ETH-003: Work Queue Zero-Actionable Suppression (ASSET_OPTIMIZATION)

**Steps:**
1. Navigate to Work Queue
2. Find an ASSET_OPTIMIZATION bundle with scopeCount = 0
3. Verify bundle displays "No items currently eligible for action."
4. Verify NO action CTAs are visible (no "View Issues", no "Generate", no "Preview", no "Apply")

**Expected:** Zero-actionable bundles show neutral message and suppress all CTAs.

---

#### Scenario ETH-004: Work Queue Zero-Actionable Suppression (AUTOMATION_RUN)

**Steps:**
1. Navigate to Work Queue
2. Find an AUTOMATION_RUN bundle with scopeCount = 0
3. Verify bundle displays "No items currently eligible for action."
4. Verify NO action CTAs are visible (no "Generate Drafts", no "Preview", no "Apply")

**Expected:** Zero-actionable bundles show neutral message and suppress all CTAs.

---

#### Scenario ETH-005: Product Issues Tab Zero-Actionable Suppression

**Steps:**
1. Navigate to a product with detected issues but zero actionable issues
2. Click the Issues tab
3. Verify triplet is VISIBLE (shows Issue types, Items affected, Actionable now)
4. Verify "Actionable now" value is 0
5. Verify neutral message "No items currently eligible for action." is displayed
6. Verify NO "Fix next" badge is visible
7. Verify NO actionable issue row links are visible

**Expected:** Triplet always renders; neutral message appears when actionable = 0; no fix CTAs.

---

### Locked Semantics (Enterprise Trust Hardening)

| Surface | Count Semantics | Routing | Copy |
|---------|-----------------|---------|------|
| Store Health Discoverability | pillar-scoped `affectedItemsCount` from `byPillar['metadata_snippet_quality'].detected` | Issues Engine with `pillar=metadata_snippet_quality&mode=detected` | "X items affected" |
| Store Health Technical | pillar-scoped `affectedItemsCount` from `byPillar['technical_indexability'].detected` | Issues Engine with `pillar=technical_indexability&mode=detected` | "X items affected" |
| Work Queue bundles | `scopeCount` (actionable now) | Issues Engine (ASSET_OPTIMIZATION) or Playbooks (AUTOMATION_RUN) | "X actionable now" |
| Zero-actionable bundles | scopeCount = 0 | No CTA (suppressed) | "No items currently eligible for action." |
| Product Issues tab | asset-scoped triplet from `detected` + `actionable` | N/A | Triplet labels + neutral message |

---

### FIXUP-2: Trust Correctness Regression Validation (2026-01-09)

#### FIXUP-2 Changes Summary

| Patch | Component | Before | After |
|-------|-----------|--------|-------|
| PATCH 1 | Store Health tiles | Could show "Counts unavailable" or store-wide totals | Always shows numeric pillar-scoped "items affected" (0 fallback) |
| PATCH 2 | Playwright test | Optional branches, fallback text parsing | STRICT: requires numeric parsing, requires asset-detail navigation |
| PATCH 3 | Test chain | "Store Health → Issues Engine → Product Issues → Work Queue" | "Store Health → Issues Engine → Asset Detail" (Work Queue step removed) |

#### FIXUP-2 Regression Validation Scenarios

##### FIXUP-2-RV-001: Store Health Always-Numeric Display

**Steps:**
1. Navigate to Store Health page
2. Verify Discoverability tile displays "N items affected" where N is a number (never "Counts unavailable")
3. Verify Technical Readiness tile displays "N items affected" where N is a number (never "Counts unavailable")
4. If canonical summary endpoint is slow/missing, N defaults to 0 (not error text)

**Expected:** Both tiles always display a numeric count, even when the count is 0.

---

##### FIXUP-2-RV-002: Playwright Test Strict Parsing

**Steps:**
1. Run `npx playwright test count-integrity-1-1.ui.spec.ts`
2. Verify test FAILS if "items affected" text is missing from Store Health summary
3. Verify test FAILS if "items affected" value cannot be parsed as a number
4. Verify test navigates to asset detail page (product Issues tab)
5. Verify test does NOT have optional branches (no "if visible" fallback paths)

**Expected:** Test passes only when all strict conditions are met; test does not silently pass on missing data.

---

##### FIXUP-2-RV-003: Click-Integrity Chain Ends at Asset Detail

**Steps:**
1. Navigate to Store Health page
2. Click Discoverability tile
3. Verify landing page is Issues Engine (URL contains `/issues`)
4. Click an actionable issue card
5. Verify landing page is asset detail (URL contains `/products/`)
6. Verify Issues tab is accessible and shows triplet

**Expected:** Click chain is "Store Health → Issues Engine → Asset Detail" (Work Queue is NOT part of this chain).

---

**COUNT-INTEGRITY-1.1 is COMPLETE. All backend endpoints verified. All UI surfaces migrated. Enterprise trust hardening applied. FIXUP-2 trust correctness applied. All tests passing.**
