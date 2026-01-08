# COUNT-INTEGRITY-1.1: Implementation Gaps Analysis

**Status:** 🚧 **INCOMPLETE - SIGNIFICANT GAPS IDENTIFIED**
**Date:** 2026-01-08
**Severity:** HIGH - Current implementation does not meet UEP contract requirements

---

## Executive Summary

The initial COUNT-INTEGRITY-1.1 implementation delivered API endpoint stubs but **does not satisfy the UEP specification requirements**. Critical gaps exist in backend correctness, endpoint naming, filtering logic, asset deduplication, and complete UI migration is missing.

**Current State:**
- ✅ Type definitions exist (CanonicalCountTriplet, CanonicalIssueCountsSummary, AssetIssuesResponse)
- ✅ API routes exist (but wrong path + incomplete logic)
- ❌ Endpoint uses wrong path (`/canonical-summary` not `/summary`)
- ❌ ActionKey filtering is placeholder only (violates click-integrity)
- ❌ Asset deduplication uses capped arrays (incorrect beyond 20 items)
- ❌ Asset-specific endpoint has page/collection ID resolution bugs
- ❌ Media issues count bug (uses sample length not true count)
- ❌ No UI migration (Issues Engine, Store Health, Work Queue, Asset Details)
- ❌ Playwright test is backend-only (required: UI cross-surface smoke)

**Estimated Remediation Effort:** 30-40 hours

---

## Gap 1: Endpoint Naming Violation

**UEP Requirement:** `/projects/:id/issues/summary` (canonical path)

**Current State:** `/projects/:id/issues/canonical-summary`

**Impact:** API consumers using the wrong path; violates REST naming convention

**Fix Required:**
- Add `@Get(':id/issues/summary')` as primary route
- Keep `/canonical-summary` as deprecated alias
- Update web API client to use `/summary`
- Update all documentation

**Effort:** 1-2 hours

---

## Gap 2: ActionKey Filtering Not Implemented

**Location:** `apps/api/src/projects/deo-issues.service.ts:256-262`

```typescript
// Current code (WRONG):
const actionKeysToFilter = actionKeys || (actionKey ? [actionKey] : undefined);
if (actionKeysToFilter && actionKeysToFilter.length > 0) {
  // Placeholder: backend doesn't yet have actionKey on issues, so no filtering
  // When actionKey is added to issues, uncomment:
  // issues = issues.filter((issue) => actionKeysToFilter.includes(issue.actionKey));
}
```

**UEP Requirement:** ActionKey filtering must work to support Work Queue → Issues click-integrity

**Impact:** Work Queue card clicks route to Issues with `?actionKey=FIX_MISSING_METADATA` but Issues page shows ALL issues (not filtered)

**Root Cause:** Issues don't have an `actionKey` field; mapping logic exists only in Work Queue service

**Fix Required:**
1. Extract Work Queue's issue→actionKey mapping to shared helper in `packages/shared/src`
2. Implement filtering in `getCanonicalIssueCountsSummary()` using shared helper
3. Ensure mapping logic matches Work Queue exactly (no drift)

**Effort:** 4-6 hours

---

## Gap 3: Incorrect Asset Deduplication (Uses Capped Arrays)

**Location:** `apps/api/src/projects/deo-issues.service.ts:292-349`

**Current Code (WRONG):**
```typescript
// For products
if (atc?.products && atc.products > 0) {
  const productsAffected = issue.affectedProducts ?? []; // CAPPED AT 20
  if (productsAffected.length > 0) {
    for (const productId of productsAffected) {
      const key = `products:${productId}`;
      uniqueAssets.add(key);
    }
  }
}
```

**UEP Requirement:** Backend must compute deduped unique assets from FULL scan context, not capped sample lists

**Impact:** `affectedItemsCount` and `actionableNowCount` are incorrect when issues affect >20 products

**Fix Required:**
1. Modify issue builders to maintain non-enumerable `_fullAffectedProducts` / `_fullAffectedPages` Sets alongside capped sample arrays
2. Attach these as non-enumerable properties (won't appear in JSON responses)
3. Canonical summary must use these full sets for deduplication
4. Store-wide issues use single pseudo-key: `products:__store_wide__` (contributes affectedItemsCount=1)

**Effort:** 8-12 hours (requires refactoring issue builder pipeline)

---

## Gap 4: Media Issues Count Bug

**Location:** `apps/api/src/projects/media-accessibility.service.ts` (multiple issue builders)

**Current Code (WRONG):**
```typescript
count: affectedProducts.length, // CAPPED SAMPLE LENGTH
affectedProducts: affectedProducts.slice(0, 20), // CAPPED SAMPLE
```

**Impact:** Media issues report `count` as min(true_count, 20) which breaks canonical deduplication

**Fix Required:**
1. Compute true affected count separately from capped sample
2. Set `count` field to true count
3. Populate `_fullAffectedProducts` Set for canonical summary deduplication

**Effort:** 2-3 hours

---

## Gap 5: Asset-Specific Endpoint Bugs

**Location:** `apps/api/src/projects/deo-issues.service.ts:417-437`

**Bug 1: Page/Collection ID Resolution**

**Current Code (WRONG):**
```typescript
if (assetType === 'pages') {
  const affected = issue.affectedPages ?? [];
  return affected.length === 0 || affected.includes(assetId); // WRONG: assetId is crawl page ID, affected contains URLs
}
```

**Impact:** Page/collection detail views show wrong issues

**Fix Required:**
- Treat `assetId` as crawl page record ID
- Resolve ID→URL server-side by querying crawl results
- Match using resolved URL

**Bug 2: Store-Wide False Positive**

**Current Code (WRONG):**
```typescript
// For products: check affectedProducts
if (assetType === 'products') {
  const affected = issue.affectedProducts ?? [];
  return affected.length === 0 || affected.includes(assetId); // WRONG: treats empty as "affects all"
}
```

**Impact:** Store-wide issues appear on ALL asset detail pages (incorrect)

**Fix Required:**
- Remove `affected.length === 0` condition
- Only return issues that actually affect the specific asset

**Effort:** 3-4 hours

---

## Gap 6: Missing UI Migration (REQUIRED, NOT OPTIONAL)

### 6.1 Issues Engine (apps/web/src/app/projects/[id]/issues/page.tsx)

**Current State:** Uses COUNT-INTEGRITY-1 v1 endpoints (IssueCountsSummary)

**Required Changes:**
- Replace `issueCountsSummary()` with `canonicalIssueCountsSummary()` (once fixed)
- Display labeled triplets in header cards:
  - "Total Issues" → show `issueTypesCount` with label
  - Add "Items Affected" card → show `affectedItemsCount` with label
  - Add "Actionable Now" card → show `actionableNowCount` with label
- Pillar/severity badges show labeled counts
- Preserve ERR-001 graceful degradation

**Effort:** 6-8 hours

### 6.2 Store Health (apps/web/src/app/projects/[id]/store-health/page.tsx)

**Current State:** Uses Work Queue bundle math

**Required Changes:**
- Fetch `canonicalIssueCountsSummary()` for each pillar card
- Display labeled "Items affected" (not "actionable issues")
- Route to Issues with matching filters (so counts match destination)

**Effort:** 3-4 hours

### 6.3 Work Queue (apps/web/src/components/work-queue/ActionBundleCard.tsx)

**Current State:** Shows "N actionable issues" (unlabeled)

**Required Changes:**
- Replace scope line with labeled "N actionable now (assets)"
- Zero-actionable suppression: If `actionableNowCount === 0`, show "No items currently eligible for action" and suppress CTAs
- Replace "No AI" badge with unambiguous copy:
  - `aiUsage=NONE` → "Does not use AI"
  - `aiUsage=DRAFTS_ONLY` → "AI used for drafts only"

**Effort:** 2-3 hours

### 6.4 Product Detail (apps/web/src/app/projects/[id]/products/[productId]/page.tsx + ProductIssuesPanel.tsx)

**Current State:** Filters `issue.affectedProducts.includes(productId)` using capped array

**Required Changes:**
- Replace with `assetIssues(projectId, 'products', productId)` endpoint call
- Display triplet summary: "N issue types · Affecting 1 item · N actionable now"
- Zero-actionable suppression on detail page

**Effort:** 3-4 hours

### 6.5 Page Detail (apps/web/src/app/projects/[id]/assets/pages/[pageId]/page.tsx)

**Current State:** Likely uses similar capped array filtering

**Required Changes:** Same as Product Detail

**Effort:** 2-3 hours

### 6.6 Collection Detail (NEW - may not exist yet)

**Required:** Add collection detail route if missing, use assetIssues endpoint

**Effort:** 2-3 hours

**Total UI Effort:** 18-25 hours

---

## Gap 7: Inadequate Playwright Test

**Current State:** `count-integrity-1-1.spec.ts` has 7 backend/API authentication tests

**UEP Requirement:** ONE UI cross-surface smoke test that navigates Store Health → Work Queue → Issues → Asset Detail and asserts:
- Labeled counts present (no naked numbers)
- Numeric consistency for same filter set
- Zero-actionable suppression works

**Fix Required:**
- Delete current 7 tests
- Create single deterministic UI smoke test using testkit seed
- Test cross-surface navigation and labeled triplet display

**Effort:** 4-6 hours

---

## Gap 8: Documentation Misrepresentation

**Current State:** `COUNT-INTEGRITY-1.1.md` claims "✅ BACKEND FOUNDATION COMPLETE (PATCHES 1-3, 8-9) | 🚧 UI UPDATES DEFERRED"

**Truth:** Backend endpoints exist but are **not contract-correct** (wrong path, placeholder filters, incorrect deduplication)

**Fix Required:**
1. Rewrite `COUNT-INTEGRITY-1.1.md` to follow `MANUAL_TESTING_TEMPLATE.md` structure
2. Change status to "🚧 IN PROGRESS - Significant gaps remain"
3. Add `IMPLEMENTATION_PLAN.md` Phase COUNT-INTEGRITY-1.1 entry under "In Progress"
4. Update `CRITICAL_PATH_MAP.md` with COUNT-INTEGRITY-1.1 scenarios under CP-008 and CP-009

**Effort:** 2-3 hours

---

## Total Remediation Effort

| Component | Effort (hours) |
|-----------|----------------|
| Gap 1: Endpoint naming | 1-2 |
| Gap 2: ActionKey filtering | 4-6 |
| Gap 3: Asset deduplication | 8-12 |
| Gap 4: Media issues count | 2-3 |
| Gap 5: Asset-specific bugs | 3-4 |
| Gap 6: UI migration | 18-25 |
| Gap 7: Playwright test | 4-6 |
| Gap 8: Documentation | 2-3 |
| **TOTAL** | **42-61 hours** |

---

## Recommended Next Steps

### Option 1: Revert and Reschedule (RECOMMENDED)

1. **Revert commits:**
   - `aaeb2f5` (PATCH 1-3)
   - `fb49338` (PATCH 8-9)

2. **Create ticket for future sprint:**
   - Title: "COUNT-INTEGRITY-1.1: Canonical Triplet Counts + Explicit Labels (Full Delivery)"
   - Estimated effort: 40-60 hours (1-1.5 sprint weeks)
   - Prerequisites: None (can start immediately)

3. **Update documentation:**
   - Remove COUNT-INTEGRITY-1.1 references from IMPLEMENTATION_PLAN.md
   - Mark COUNT-INTEGRITY-1 as current production standard
   - Document COUNT-INTEGRITY-1.1 as planned future enhancement

**Rationale:** Clean slate avoids technical debt from incomplete implementation

### Option 2: Incremental Fix (NOT RECOMMENDED)

1. Keep existing commits
2. Create 6-8 follow-up tickets for each gap
3. Mark COUNT-INTEGRITY-1.1 as "partially complete" in docs

**Risks:**
- Half-implemented feature creates confusion
- Backend endpoints exist but return incorrect data
- UI depends on backend fixes before migration can begin

### Option 3: Sprint Allocation (If Urgent)

If COUNT-INTEGRITY-1.1 is business-critical:

**Week 1 (Backend Correctness):**
- Mon-Tue: Gaps 1-2 (endpoint naming + actionKey filtering)
- Wed-Thu: Gap 3 (asset deduplication refactor)
- Fri: Gaps 4-5 (media issues + asset-specific bugs)

**Week 2 (UI + Testing):**
- Mon-Wed: Gap 6 (UI migration across 5 surfaces)
- Thu: Gap 7 (Playwright UI smoke test)
- Fri: Gap 8 (documentation) + final testing

**Total:** 2 weeks dedicated work

---

## Lessons Learned

1. **"Backend foundation" ≠ Production-ready:** Endpoint stubs without correct implementation create false sense of progress

2. **Deduplication is non-trivial:** Computing unique assets requires refactoring issue builder pipeline, not just endpoint logic

3. **UI migration is mandatory:** Cannot claim phase complete with "UI deferred" when spec requires labeled display

4. **Testing must match delivery:** Backend API tests don't validate UI contract requirements

---

## Sign-Off

**Current Implementation:**
- [ ] Meets UEP contract requirements
- [ ] Backend endpoints correct
- [ ] UI migration complete
- [ ] Testing adequate
- [ ] Documentation accurate

**Status:** ❌ NOT PRODUCTION-READY

**Recommended Action:** Revert commits and reschedule as properly-scoped sprint work

---

**Last Updated:** 2026-01-08
**Prepared By:** Claude Sonnet 4.5
**Reviewed By:** [Pending]
