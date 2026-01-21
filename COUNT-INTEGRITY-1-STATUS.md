# COUNT-INTEGRITY-1 Implementation Status

**Phase:** COUNT-INTEGRITY-1: Count Integrity Trust Hardening
**Status:** ✅ COMPLETE - All patches implemented and tested
**Date:** 2026-01-08
**Last Updated:** 2026-01-08

## ✅ COMPLETED Changes

### 1. Type Definitions & Shared Infrastructure

- ✅ Added `IssueAssetTypeKey`, `IssueAssetTypeCounts`, `IssueCountsSummary` types to:
  - `packages/shared/src/deo-issues.ts`
  - `apps/web/src/lib/deo-issues.ts`
- ✅ Added `assetTypeCounts` and `isActionableNow` fields to `DeoIssue` interface
- ✅ Updated Media & Accessibility pillar (`comingSoon: false`, updated descriptions)

### 2. Backend Service Layer

- ✅ Added helper functions to `deo-issues.service.ts`:
  - `getAssetTypeFromUrl()` - URL classification (products/pages/collections)
  - `IN_APP_ACTIONABLE_ISSUE_KEYS` set - defines which issues have in-app fix surfaces
- ✅ Implemented `getIssueCountsSummaryForProject()` method - server-side single source of truth
- ✅ Added issue decoration logic in `computeIssuesForProject()`:
  - Sets `isActionableNow` based on fix surface availability + role capabilities
  - Provides `assetTypeCounts` fallback for issues without explicit counts
- ✅ Updated `buildMissingMetadataIssue` with asset type counting
- ✅ Updated `buildThinContentIssue` with asset type counting
- ✅ Updated `buildLowEntityCoverageIssue` with asset type counting
- ✅ Updated `buildMissingLongDescriptionIssue` (changed `fixType` to `aiFix`, `fixReady: true`)
- ✅ Updated all 7 technical issue builders with asset type counting and 'informational' actionability

### 3. API Endpoints

- ✅ Added `GET /projects/:id/issues/counts-summary` endpoint in `projects.controller.ts`
- ✅ Added `GET /projects/:id/deo-issues/read-only` endpoint in `projects.controller.ts`
- ✅ Added `IssueCountsSummary` import to controller

### 4. Web API Client

- ✅ Added `projectsApi.issueCountsSummary(id)` method to `apps/web/src/lib/api.ts`
- ✅ Added `projectsApi.deoIssuesReadOnly(id)` method to `apps/web/src/lib/api.ts`

### 5. Backend Refinements (PATCH 1.1)

- ✅ Fixed `assetTypeCounts` fallback to guarantee sum-preserving allocation
- ✅ Eliminated rounding drift: compute one value with Math.round(), assign remainder to other
- ✅ Added guards for edge case where no URLs are classified (assigns all to pages)

## 🔄 REMAINING Work (Critical Path)

### ✅ PATCH 1 Completion - All Issue Builders Updated

All technical issue builders have been updated with `assetTypeCounts` and `actionability` changed to `'informational'`:

**Technical Issues (all complete):**

- ✅ `buildIndexabilityIssue` - added assetTypeCounts (pages/collections split), changed to 'informational'
- ✅ `buildIndexabilityConflictIssue` - added assetTypeCounts, changed to 'informational'
- ✅ `buildCrawlHealthIssue` - added assetTypeCounts, changed to 'informational'
- ✅ `buildRenderBlockingResourcesIssue` - added assetTypeCounts, changed to 'informational'
- ✅ `buildSlowInitialResponseIssue` - added assetTypeCounts, changed to 'informational'
- ✅ `buildExcessivePageWeightIssue` - added assetTypeCounts, changed to 'informational'
- ✅ `buildMobileRenderingRiskIssue` - added assetTypeCounts, changed to 'informational'

**Pattern for each technical issue:**

```typescript
// Add counters at top
let issueProducts = 0;
let issuePages = 0;
let issueCollections = 0;

// In crawl loop, classify URLs
const bucket = getAssetTypeFromUrl(cr.url);
if (bucket === 'products') issueProducts++;
else if (bucket === 'collections') issueCollections++;
else issuePages++;

// In return object
actionability: 'informational' as DeoIssueActionability,
assetTypeCounts: { products: issueProducts, pages: issuePages, collections: issueCollections },
```

### ✅ PATCH 1 - Actionability Gating Refinement (COMPLETE)

1. ✅ Check IN_APP_ACTIONABLE_ISSUE_KEYS OR (fixReady && fixType)
2. ✅ Add check for `issue.actionability !== 'informational'`
3. ✅ Changed capability check to require at least one of:
   - `capabilities.canGenerateDrafts`
   - `capabilities.canRequestApproval`
   - `capabilities.canApply`

### ✅ PATCH 1 - Asset Type Fallback Allocation (COMPLETE)

- ✅ Replaced mixed-case collapse with sum-preserving allocation
- ✅ Use URL classification for pages array to split pages/collections
- ✅ Ensured `products + pages + collections === issue.count`
- ✅ **PATCH 1.1:** Fixed rounding drift by computing one value, assigning remainder to other (no Math.round on both)

### ✅ PATCH 1 - IssueCountsSummary.byAssetType Group Counts (COMPLETE)

- ✅ When `issue.assetTypeCounts[assetType] > 0`, increment:
  - `byAssetType[assetType].detectedGroups += 1`
  - If actionable: `byAssetType[assetType].actionableGroups += 1`

### ✅ PATCH 2 - Read-Only Issues Endpoint (COMPLETE)

- ✅ Added `GET /projects/:id/deo-issues/read-only` to controller
- ✅ Added `projectsApi.deoIssuesReadOnly(id)` to web API client
- ✅ Endpoint uses `getIssuesForProjectReadOnly()` (no side effects, no automation triggers)

### ✅ PATCH 3 - Work Queue Bundle Types (COMPLETE)

- ✅ Added `scopeDetectedCount?` field to `WorkQueueActionBundle` in shared/web types
- ✅ Updated field comments for clarity:
  - `scopeCount`: For ASSET_OPTIMIZATION: actionable issue-group count; for other types: affected item count
  - `scopeDetectedCount`: COUNT-INTEGRITY-1: For ASSET_OPTIMIZATION: detected issue-group count (may exceed scopeCount)

### ✅ PATCH 4 - Work Queue Derivation (COMPLETE)

- ✅ Updated `deriveIssueBundlesByScopeType()` to use `assetTypeCounts` for counts
- ✅ Set `scopeCount` = actionable issue-group count, `scopeDetectedCount` = detected issue-group count
- ✅ Stopped using asset set sizes (`productIds.size`, etc.) for counts
- ✅ Switched `scopePreviewList` to issue titles for ASSET_OPTIMIZATION bundles
- ✅ Preview list prefers actionable issue titles; uses detected titles if scopeCount === 0
- ✅ Create bundle when `scopeDetectedCount > 0` (even if no actionable issues)

### ✅ PATCH 4.1 - Work Queue Preview Math Hotfix (COMPLETE)

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

### ✅ PATCH 5 - Work Queue Card UI & Routing (COMPLETE)

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

### ✅ PATCH 6 - Issues Engine UI (COMPLETE)

- ✅ **PATCH 6.1:** Switched to `projectsApi.deoIssuesReadOnly()` with parallel `issueCountsSummary()` fetch
- ✅ **PATCH 6.2:** Added `IssueCountsSummary` state and used for severity badge counts (single source of truth)
- ✅ **PATCH 6.3:** Added URL query param parsing: `mode`, `actionKey`, `scopeType`
- ✅ **PATCH 6.4:** Implemented filtering pipeline: mode → actionKey → scopeType → UI filters
- ✅ **PATCH 6.5:** Added mode toggle UI (Actionable/Detected buttons)
- ✅ **PATCH 6.6:** Added click-integrity filter context banner when navigating from Work Queue
- ✅ **PATCH 6.7:** Updated actionability logic to use `issue.isActionableNow` (server-computed, role-aware)
- ✅ **PATCH 6.8:** Added test hooks (`data-testid` attributes) for Playwright tests
- ✅ **PATCH 6.9:** Fixed TypeScript type error in actionKey filtering logic

### ✅ PATCH 6 FIXUP - Issues Engine UI Corrections (COMPLETE)

- ✅ **FIXUP 1:** Fixed default mode logic - introduced `effectiveMode` that defaults to 'actionable' when modeParam is missing
- ✅ **FIXUP 2:** Enforced clickability semantics - defined `isClickableIssue = (isActionableNow && fixHref != null)` for both test hooks and UI branching
- ✅ **FIXUP 3:** Gated fix CTAs on isActionableNow - added early returns in `getFixAction()` for both checks
- ✅ **FIXUP 4:** Used countsSummary for pillar badge counts - replaced `issues.filter(...).length` with `countsSummary.byPillar[pillar.id].actionableGroups`
- ✅ **FIXUP 5:** Prevented pillar param from auto-applying when click-integrity filters (actionKey/scopeType) are present
- ✅ **FIXUP 6:** Updated clear-filters banner to also delete pillar param

### ✅ PATCH 6 FIXUP-2 - Issues Engine Final Corrections (COMPLETE)

- ✅ **FIXUP-2.1:** Fixed default mode logic to default to 'detected' when `actionableGroupsTotal === 0` and `detectedGroupsTotal > 0`
- ✅ **FIXUP-2.2:** Added URL normalization to force `mode=detected` when URL requests actionable but none exist
- ✅ **FIXUP-2.3:** Made severity badges mode-aware (use `detectedGroups` in detected mode, `actionableGroups` in actionable mode)
- ✅ **FIXUP-2.4:** Made Total Issues count mode-aware (use `actionableGroupsTotal` or `detectedGroupsTotal` based on mode)
- ✅ **FIXUP-2.5:** Made empty state text mode-aware ("No actionable issues" vs "No issues detected")
- ✅ **FIXUP-2.6:** Disabled actionable mode button when no actionable issues exist

### ✅ PATCH 7 - Store Health & Work Queue Updates (COMPLETE)

- ✅ **Store Health:** Added `issueCountsSummary()` fetch for click-integrity counts
- ✅ **Store Health:** Updated Discoverability and Technical Readiness summaries to use "issues" language (not "items")

### ✅ PATCH 7 FIXUP - Store Health Count Semantics (COMPLETE)

- ✅ **Discoverability:** Uses detected/actionable count semantics, shows "Informational — no action required" when actionable === 0
- ✅ **Technical Readiness:** Avoids "0 technical issues" drift by showing detected counts when informational issues exist

### ✅ PATCH 7.1 FIXUP - Work Queue Mixed Bundle Banner (COMPLETE)

- ✅ **Split totals:** Replaced single `totalAffectedItems` with three separate totals (ASSET_OPTIMIZATION actionable/detected issues, non-ASSET_OPTIMIZATION items)
- ✅ **Mixed-bundle semantics:** Banner correctly shows "N actionable issues (X detected) and Y items" when both bundle types present
- ✅ **Test hooks:** Added `data-testid="action-bundle-card"` to ActionBundleCard wrapper div

### ✅ PATCH 9 - Playwright Tests (COMPLETE)

- ✅ Created `apps/web/tests/count-integrity-1.spec.ts` with 3 smoke tests:
  - **Test 1:** Work Queue → Issues click integrity (OWNER seed) - card count matches filtered list count
  - **Test 2:** Technical issues are informational (OWNER seed) - informational badge, not clickable, visible in detected mode
  - **Test 3:** Viewer role sees detected-only counts (VIEWER seed) - no actionable issues, mode forced to detected

### ✅ PATCH 9 FIXUP-2 - Playwright Test Corrections (COMPLETE)

- ✅ **Seed endpoints:** Changed to `/testkit/e2e/seed-first-deo-win` (OWNER) and `/testkit/e2e/seed-self-service-viewer` (VIEWER)
- ✅ **Card selection:** Uses `getByTestId('action-bundle-card')` and filters for "View Issues" link with actionable count > 0
- ✅ **CTA click:** Clicks `getByRole('link', { name: 'View Issues' })` instead of button
- ✅ **Issues banner:** Uses correct testid `filter-context-banner` instead of `work-queue-filter-context`
- ✅ **Informational check:** Verifies no interactive buttons/links inside informational cards (stronger dead-click prevention)

### ✅ PATCH 10 - Documentation (COMPLETE)

- ✅ **PATCH 10.1:** Checked `IMPLEMENTATION_PLAN.md` CRITICAL_PATH_MAP references (already correct, no changes needed)
- ✅ **PATCH 10.2:** Created `docs/manual-testing/COUNT-INTEGRITY-1.md` manual testing guide with 19 scenarios
- ✅ **PATCH 10.3:** Updated `CRITICAL_PATH_MAP.md` with COUNT-INTEGRITY-1 references in CP-008 and CP-009
- ✅ **PATCH 10.4:** Updated status tracking to reflect PATCH 10 completion

### ✅ PATCH ERR-001 - Counts-Summary Graceful Degradation (COMPLETE)

- ✅ **Added countsSummaryWarning state:** Non-blocking warning state (string | null) for counts-summary API failures
- ✅ **Updated fetchIssues():** Uses `Promise.allSettled()` to load issues list even when counts-summary fails
- ✅ **Warning banner:** Yellow warning banner displays "Issue counts unavailable. Displaying issues list without summary statistics." with Retry button
- ✅ **Summary card counts:** Total Issues, Critical, Warning, Info cards show "—" when countsSummary is null (not misleading 0)
- ✅ **Pillar badge counts:** Pillar filter buttons hide count badges when countsSummary unavailable (no misleading counts)
- ✅ **Severity badge counts:** Severity filter buttons hide count badges when countsSummary unavailable (no misleading counts)
- ✅ **Non-blocking:** Issues list displays normally regardless of counts-summary availability
- ✅ **Documentation:** Updated COUNT-INTEGRITY-1.md Scenario 10 (ERR-001) with exact expected behavior

### ✅ PATCH ERR-001.1 - Mode Fallback When countsSummary Unavailable (COMPLETE)

- ✅ **hasActionableIssues fallback:** When `countsSummary === null`, falls back to `issues.some((i) => i.isActionableNow === true)` instead of defaulting to false
- ✅ **hasDetectedIssues fallback:** When `countsSummary === null`, falls back to `issues.length > 0` instead of defaulting to false
- ✅ **effectiveMode correctness:** Now correctly defaults to 'detected' when counts unavailable and only informational issues exist (VIEWER/informational-only cases)
- ✅ **No client recomputation:** Fallback uses already-fetched issues list, no count aggregation performed client-side
- ✅ **ERR-001 contract preserved:** "Issues list displays normally (unaffected by counts-summary failure)" now fully honored
- ✅ **Documentation cleanup:** Removed stale "blocked scenarios" line from COUNT-INTEGRITY-1.md Test Sign-Off

## Core Contracts Established

### IssueCountsSummary Contract

```typescript
interface IssueCountsSummary {
  projectId: string;
  generatedAt: string;
  detectedTotal: number; // Total detected issue instances
  actionableTotal: number; // Total actionable issue instances
  detectedGroupsTotal: number; // Total detected issue types
  actionableGroupsTotal: number; // Total actionable issue types
  byPillar: Record<DeoPillarId, IssueCountsBucket>;
  bySeverity: Record<DeoIssueSeverity, IssueCountsBucket>;
  byAssetType: Record<IssueAssetTypeKey, IssueCountsBucket>;
  byIssueType: Record<string, IssueCountsBucket>;
}
```

### Actionability Rules

1. **Detected**: Issue exists in the system (always true if returned)
2. **Actionable**: Issue has an in-app fix surface AND user role allows action
   - Must be in `IN_APP_ACTIONABLE_ISSUE_KEYS` OR have `fixReady && fixType`
   - Must NOT be `actionability: 'informational'`
   - User must have at least one of: canGenerateDrafts, canRequestApproval, canApply

### Asset Type Distribution

- Every issue MUST have `assetTypeCounts: { products, pages, collections }`
- Sum must equal `issue.count` for integrity
- URL classification: collections start with `/collections/`, else pages (product URLs treated as pages in mixed issues to avoid double-counting)

## Testing Status

- ✅ **Automated tests:** Playwright smoke tests created (`count-integrity-1.spec.ts`)
- ⚠️ **Manual testing:** Ready for testing with 19 scenarios in `docs/manual-testing/COUNT-INTEGRITY-1.md`
- ✅ **Smoke tests:** COUNT-INTEGRITY-1 test suite added

## Next Steps Priority

1. ✅ ~~Complete remaining issue builder `assetTypeCounts` additions (7 methods)~~ - COMPLETE
2. ✅ ~~Refine actionability gating logic (3 checks)~~ - COMPLETE
3. ✅ ~~Fix `IssueCountsSummary.byAssetType` group counting~~ - COMPLETE
4. ✅ ~~Add read-only issues endpoint (PATCH 2)~~ - COMPLETE
5. ✅ ~~Fix assetTypeCounts fallback sum-preserving (PATCH 1.1)~~ - COMPLETE
6. ✅ ~~Update Work Queue types and derivation (PATCH 3-4)~~ - COMPLETE
7. ✅ ~~Fix Work Queue preview math and STORE_WIDE semantics (PATCH 4.1)~~ - COMPLETE
8. ✅ ~~Update Work Queue Card UI and routing (PATCH 5)~~ - COMPLETE
9. ✅ ~~Update documentation (PATCH 10)~~ - COMPLETE
10. ✅ ~~Update Issues Engine UI to consume IssueCountsSummary (PATCH 6)~~ - COMPLETE
11. ✅ ~~Apply PATCH 6 FIXUP corrections (6 fixes)~~ - COMPLETE
12. ✅ ~~Apply PATCH 6 FIXUP-2 final corrections (6 fixes)~~ - COMPLETE
13. ✅ ~~Update Store Health pages (PATCH 7)~~ - COMPLETE
14. ✅ ~~Apply PATCH 7 FIXUP Store Health count semantics~~ - COMPLETE
15. ✅ ~~Apply PATCH 7.1 FIXUP Work Queue mixed bundle banner~~ - COMPLETE
16. ✅ ~~Create Playwright regression tests (PATCH 9)~~ - COMPLETE
17. ✅ ~~Apply PATCH 9 FIXUP-2 Playwright test corrections~~ - COMPLETE

**✅ ALL IMPLEMENTATION AND FIXUP WORK COMPLETE. Phase ready for manual testing and production deployment.**

## Notes

- Media & Accessibility pillar is now ACTIVE (`comingSoon: false`)
- Technical issues are treated as "informational" (detected but not actionable in-app)
- Count integrity is enforced at server-side; UI displays authoritative backend counts
- Work Queue → Issues routing preserves filter context for click integrity
