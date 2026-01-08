# COUNT-INTEGRITY-1 Implementation Status

**Phase:** COUNT-INTEGRITY-1: Count Integrity Trust Hardening
**Status:** PATCH 1-5 + 10 COMPLETE (Backend + Work Queue + Documentation Complete, Issues Engine UI Pending)
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
- ✅ **PATCH 4.1.3:** Fixed `buildScopePreviewList()` to use actual preview count instead of hardcoded 5
  - Prevents math errors when `previews.length < 5` but `totalCount > 5`

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

### PATCH 6 - Issues Engine UI
- ⚠️ **TODO:** Use `projectsApi.deoIssuesReadOnly()` instead of mutating version
- ⚠️ **TODO:** Fetch and use `IssueCountsSummary` for all badge counts
- ⚠️ **TODO:** Add `mode` (actionable/detected) query param and toggle
- ⚠️ **TODO:** Filter by `actionKey` and `scopeType` from Work Queue routing
- ⚠️ **TODO:** Use `issue.isActionableNow` for actionability instead of href-based check
- ⚠️ **TODO:** Render informational issues as non-clickable

### PATCH 7 - Store Health Pages
- ⚠️ **TODO:** Update Store Health summaries to use "issues" language
- ⚠️ **TODO:** Show detected vs actionable when counts differ

### PATCH 9 - Playwright Tests
- ⚠️ **TODO:** Create `count-integrity-1.spec.ts` with:
  - Store Health → Work Queue count integrity
  - Work Queue bundle → Issues click integrity
  - Issues pillar/severity integrity
  - Technical pillar regression checks

### ✅ PATCH 10 - Documentation (COMPLETE)
- ✅ **PATCH 10.1:** Checked `IMPLEMENTATION_PLAN.md` CRITICAL_PATH_MAP references (already correct, no changes needed)
- ✅ **PATCH 10.2:** Created `docs/manual-testing/COUNT-INTEGRITY-1.md` manual testing guide with 19 scenarios
- ✅ **PATCH 10.3:** Updated `CRITICAL_PATH_MAP.md` with COUNT-INTEGRITY-1 references in CP-008 and CP-009
- ✅ **PATCH 10.4:** Updated status tracking to reflect PATCH 10 completion

## Core Contracts Established

### IssueCountsSummary Contract
```typescript
interface IssueCountsSummary {
  projectId: string;
  generatedAt: string;
  detectedTotal: number;          // Total detected issue instances
  actionableTotal: number;         // Total actionable issue instances
  detectedGroupsTotal: number;     // Total detected issue types
  actionableGroupsTotal: number;   // Total actionable issue types
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
- ⚠️ **Manual testing:** Not yet performed
- ⚠️ **Automated tests:** Not yet created
- ⚠️ **Smoke tests:** Existing tests may need updates

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
10. ⚠️ Update Issues Engine UI to consume IssueCountsSummary (PATCH 6)
11. ⚠️ Update Store Health pages (PATCH 7)
12. ⚠️ Create Playwright regression tests (PATCH 9)

## Notes
- Media & Accessibility pillar is now ACTIVE (`comingSoon: false`)
- Technical issues are treated as "informational" (detected but not actionable in-app)
- Count integrity is enforced at server-side; UI displays authoritative backend counts
- Work Queue → Issues routing preserves filter context for click integrity
