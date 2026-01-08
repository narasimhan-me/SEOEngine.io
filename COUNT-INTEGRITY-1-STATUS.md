# COUNT-INTEGRITY-1 Implementation Status

**Phase:** COUNT-INTEGRITY-1: Count Integrity Trust Hardening
**Status:** PATCH 1 + 2 COMPLETE (Backend Complete, Ready for Frontend Integration)
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

### PATCH 3 - Work Queue Bundle Types
- ⚠️ **TODO:** Add `scopeDetectedCount?` field to `WorkQueueActionBundle` in shared/web types
- ⚠️ **TODO:** Update field comments for clarity

### PATCH 4 - Work Queue Derivation
- ⚠️ **TODO:** Update `deriveIssueBundlesByScopeType()` to use `assetTypeCounts` for counts
- ⚠️ **TODO:** Set `scopeCount` = actionable issues, `scopeDetectedCount` = detected issues
- ⚠️ **TODO:** Stop using truncated preview arrays for counts

### PATCH 6 - Issues Engine UI
- ⚠️ **TODO:** Use `projectsApi.deoIssuesReadOnly()` instead of mutating version
- ⚠️ **TODO:** Fetch and use `IssueCountsSummary` for all badge counts
- ⚠️ **TODO:** Add `mode` (actionable/detected) query param and toggle
- ⚠️ **TODO:** Filter by `actionKey` and `scopeType` from Work Queue routing
- ⚠️ **TODO:** Use `issue.isActionableNow` for actionability instead of href-based check
- ⚠️ **TODO:** Render informational issues as non-clickable

### PATCH 7 - Work Queue Card UI
- ⚠️ **TODO:** Update scope line copy to show issue-group semantics
- ⚠️ **TODO:** Show detected count when different from actionable
- ⚠️ **TODO:** Route ASSET_OPTIMIZATION bundles to Issues page with filters (not assets lists)

### PATCH 8 - Work Queue & Store Health Pages
- ⚠️ **TODO:** Update filter banner language ("issues" not "items")
- ⚠️ **TODO:** Update Store Health summaries to use "issues" language

### PATCH 9 - Playwright Tests
- ⚠️ **TODO:** Create `count-integrity-1.spec.ts` with:
  - Store Health → Work Queue count integrity
  - Work Queue bundle → Issues click integrity
  - Issues pillar/severity integrity
  - Technical pillar regression checks

### PATCH 10 - Documentation
- ⚠️ **TODO:** Update `IMPLEMENTATION_PLAN.md` with COUNT-INTEGRITY-1 phase
- ⚠️ **TODO:** Create `COUNT-INTEGRITY-1.md` manual testing doc
- ⚠️ **TODO:** Update `CRITICAL_PATH_MAP.md` with new test references

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
6. ⚠️ Update Work Queue types and derivation (PATCH 3-5)
7. ⚠️ Update Issues Engine UI to consume IssueCountsSummary (PATCH 6)
8. ⚠️ Update Work Queue Card UI (PATCH 7)
9. ⚠️ Update Store Health pages (PATCH 8)
10. ⚠️ Create Playwright regression tests (PATCH 9)
11. ⚠️ Update documentation (PATCH 10)

## Notes
- Media & Accessibility pillar is now ACTIVE (`comingSoon: false`)
- Technical issues are treated as "informational" (detected but not actionable in-app)
- Count integrity is enforced at server-side; UI displays authoritative backend counts
- Work Queue → Issues routing preserves filter context for click integrity
