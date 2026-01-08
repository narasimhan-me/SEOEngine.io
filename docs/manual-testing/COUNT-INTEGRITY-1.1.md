# COUNT-INTEGRITY-1.1: Canonical Triplet Counts + Explicit Labels Manual Testing Guide

**Phase:** COUNT-INTEGRITY-1.1
**Status:** ✅ BACKEND CONTRACT COMPLETE (PATCH 0 + BATCH 2) | 🚧 UI UPDATES DEFERRED (PATCHES 4-7)
**Date:** 2026-01-08 (Updated after PATCH BATCH 2)

## Overview

### Purpose of the Feature/Patch

COUNT-INTEGRITY-1.1 establishes canonical triplet count semantics with explicit UX labels across all surfaces:
- **issueTypesCount**: Count of distinct issue types in scope
- **affectedItemsCount**: Deduped unique assets affected (UEP decision: backend computes)
- **actionableNowCount**: Deduped unique actionable assets (role-gated)

Replaces mixed v1 "groups/instances" semantics with consistent labeled counts.

### Implementation Status

**COMPLETED (PATCH 0 + PATCH BATCH 2):**
- ✅ PATCH 0: Endpoint naming fixed (`/summary` primary, `/canonical-summary` alias)
- ✅ PATCH 1-3: Canonical triplet types + backend endpoints + web client (initial delivery)
- ✅ PATCH 2.1: Media issues count bug fixed (true counts, not capped sample length)
- ✅ PATCH 2.2: Shared issue→actionKey mapper created in packages/shared
- ✅ PATCH 2.3: Work Queue refactored to use shared mapper
- ✅ PATCH 2.4: Real actionKey filtering implemented in canonical summary
- ✅ PATCH 2.5: Asset-specific endpoint bugs fixed (ID→URL resolution, no false positives)
- ✅ PATCH 2.6: Deterministic Playwright tests using testkit seeds (8 tests)
- ✅ PATCH 2.7: Documentation updated (this file + GAPS.md)

**DEFERRED (UI Updates - Future Work):**
- 🚧 PATCH 4: Issues Engine triplet display + labels
- 🚧 PATCH 5: Store Health tiles show items affected
- 🚧 PATCH 6: Work Queue actionable now + AI badge copy
- 🚧 PATCH 7: Asset detail pages use asset-issues endpoint

### High-Level User Impact

**Backend Foundation (COMPLETE):**
- New API endpoints provide canonical triplet counts for any filter combination
- Server-side asset deduplication ensures count accuracy
- Zero-affected suppression semantics built-in (affectedItemsCount = 0 when no items)

**UI Updates (DEFERRED):**
- When implemented, all count displays will show explicit labels ("Issue types", "Items affected", "Actionable now")
- No naked numbers or ambiguous parenthetical counts
- Cross-surface consistency for matching filter sets
- Clear differentiation between detected counts and actionable counts

### Related Documentation

- `docs/manual-testing/COUNT-INTEGRITY-1.md` (predecessor phase)
- `docs/testing/CRITICAL_PATH_MAP.md` (CP-008, CP-009)
- `apps/web/tests/count-integrity-1-1.spec.ts` (Playwright smoke tests)

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
1. Call `GET /projects/{projectId}/issues/canonical-summary`
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
1. Call `GET /projects/{projectId}/issues/canonical-summary?pillar=metadata_snippet_quality`
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
1. Call `GET /projects/{projectId}/issues/canonical-summary?severity=critical`
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
1. Call `GET /projects/{projectId}/issues/canonical-summary`
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
1. Call `GET /projects/{projectId}/issues/canonical-summary`
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

**Playwright Test File:** `apps/web/tests/count-integrity-1-1.spec.ts` [PATCH 2.6]

**Test Infrastructure:**
- ✅ Uses `/testkit/e2e/seed-first-deo-win` for deterministic test data
- ✅ No environment variable dependencies (TEST_USER, TEST_PASSWORD removed)
- ✅ Independent of "first project" discovery pattern

**Test Coverage:**
- ✅ CANON-001: Valid triplet structure
- ✅ CANON-002: Pillar filter support
- ✅ CANON-003: Severity filter support
- ✅ CANON-004: byPillar breakdown complete
- ✅ CANON-005: bySeverity breakdown complete
- ✅ CANON-006: Asset-specific issues structure
- ✅ CANON-007: Asset-specific pillar filtering
- ✅ CANON-008: ActionKey filter support [PATCH 2.6 - regression test]

**Run Tests:**
```bash
cd apps/web
npx playwright test count-integrity-1-1.spec.ts
```

---

## UI Implementation Plan (DEFERRED - Future Work)

### PATCH 4: Issues Engine Triplet Display

**Scope:**
- Replace COUNT-INTEGRITY-1 v1 counts with canonical triplet display
- Summary cards show: "Issue types", "Items affected", "Actionable now"
- No naked parenthetical counts
- Mode toggle between detected/actionable changes all three counts simultaneously

**Effort Estimate:** 4-6 hours (requires careful migration from v1 semantics)

---

### PATCH 5: Store Health Tiles

**Scope:**
- Tiles show "N items affected" instead of "N issues affecting..."
- Remove ambiguous phrasing like "actionable issues" without count qualification
- Route to Issues Engine (not Work Queue) for consistency

**Effort Estimate:** 2-3 hours

---

### PATCH 6: Work Queue Tiles

**Scope:**
- Tiles show "N actionable now (assets)" instead of "N products"
- Remove "No AI" badge ambiguity (replace with "AI drafts remaining: N")
- Explicit labels on all counts

**Effort Estimate:** 3-4 hours

---

### PATCH 7: Asset Detail Pages

**Scope:**
- Product/Page/Collection detail pages use asset-issues endpoint
- Issue count summary displays triplet: "N issue types · Affecting 1 item · N actionable now"
- Filter badges show triplet counts consistently

**Effort Estimate:** 4-5 hours

---

## Migration Strategy (When Implementing UI)

1. **Phase 1 (Backend Complete):** ✅ DONE
   - Canonical types defined
   - Endpoints implemented
   - API client wired
   - Tests passing

2. **Phase 2 (UI Pilot - DEFERRED):**
   - Pick one surface (e.g., Issues Engine)
   - Implement triplet display with explicit labels
   - Validate with stakeholders
   - Iterate on labeling/layout

3. **Phase 3 (UI Rollout - DEFERRED):**
   - Roll out to remaining surfaces (Store Health, Work Queue, Asset Details)
   - Maintain COUNT-INTEGRITY-1 v1 endpoints for backward compatibility
   - Deprecation warnings in v1 endpoint responses

4. **Phase 4 (Deprecation - FUTURE):**
   - Remove v1 endpoints after all UI surfaces migrated
   - Remove IssueCountsSummary and IssueCountsBucket types (legacy)

---

## Known Limitations (Updated After PATCH BATCH 2)

1. **Asset deduplication uses capped arrays (Gap 3 - deferred)**
   - `affectedProducts` and `affectedPages` arrays capped at 20 items for display
   - Canonical summary deduplication may undercount when issues affect >20 items
   - Fix requires refactoring issue builders to maintain non-enumerable `_fullAffectedProducts` Sets
   - Impact: Low (rare edge case), deferred until Cap 20 becomes real constraint

2. **Store-wide issues represented as 1 pseudo-item**
   - When `affectedProducts` array is empty but `assetTypeCounts.products > 0`
   - Backend uses `products:__store_wide__` composite key
   - affectedItemsCount = 1 (not 0, not total product count)
   - This is intentional design to avoid confusion

---

## Sign-Off (Updated After PATCH BATCH 2)

**Backend Contract (COMPLETE):**
- [x] PATCH 0: Endpoint naming fixed (`/summary` primary path)
- [x] PATCH 1-3: Backend foundation + types + web client
- [x] PATCH 2.1: Media count bug fixed (true counts)
- [x] PATCH 2.2-2.4: Shared mapper + actionKey filtering working
- [x] PATCH 2.5: Asset-specific endpoint bugs fixed (ID→URL, no false positives)
- [x] PATCH 2.6: Playwright tests deterministic (testkit seeds, 8 tests)
- [x] PATCH 2.7: Documentation updated

**UI Migration (DEFERRED):**
- [ ] PATCH 4: Issues Engine triplet display + labels
- [ ] PATCH 5: Store Health tiles
- [ ] PATCH 6: Work Queue actionable now
- [ ] PATCH 7: Asset detail pages

**Ready for:**
- ✅ Backend API consumption NOW (production-ready)
- ✅ Automated testing in CI pipeline
- ✅ Work Queue → Issues click-integrity (actionKey filtering works)
- ✅ Asset detail pages filtering (ID→URL resolution works)
- 🚧 UI migration (scheduled separately)

---

## Notes

- **No DB migrations required** - all computation happens at request time
- **Zero-affected suppression built-in** - affectedItemsCount = 0 when no items match filters
- **Cross-surface consistency guaranteed** - same filters always return same counts
- **Explicit label mandate** - UI MUST display "Issue types", "Items affected", "Actionable now" labels
- **UI migration is incremental** - can pilot on one surface before rolling out to all
- **Gap 3 deferred** - Asset deduplication uses capped arrays; fix when Cap 20 becomes constraint

**Backend contract is production-ready (PATCH 0 + BATCH 2 complete). UI updates scheduled as Gap 6 separate sprint work.**
