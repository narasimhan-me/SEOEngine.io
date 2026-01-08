# COUNT-INTEGRITY-1: Count Integrity Trust Hardening Manual Testing Guide

**Phase:** COUNT-INTEGRITY-1
**Status:** PATCH 1-5 + 4.1 Complete, PATCH 6-9 Pending
**Date:** 2026-01-08

## Overview

- **Purpose of the feature/patch:**
  - Establish count integrity as a core trust contract by implementing server-derived detected/actionable semantics, canonical IssueCountsSummary as single source of truth, and click-integrity guarantees between Work Queue cards and Issues page filtered lists.

- **High-level user impact and what "success" looks like:**
  - Work Queue card counts match Issues page filtered list counts (click integrity)
  - Detected vs actionable semantics are clear and consistent across all UI surfaces
  - Technical issues appear as "detected" with informational badges (no dead clicks)
  - Role-based actionability works correctly (Viewers see detected issues, no actionable counts)
  - Count drift between UI surfaces is eliminated

- **Related phases/sections in IMPLEMENTATION_PLAN.md:**
  - Phase COUNT-INTEGRITY-1

- **Related documentation:**
  - `COUNT-INTEGRITY-1-STATUS.md`
  - `docs/testing/CRITICAL_PATH_MAP.md` (CP-008, CP-009)
  - `apps/web/tests/count-integrity-1.spec.ts` (Planned - PATCH 9)

---

## Preconditions

- **Environment requirements:**
  - [ ] Local development environment running (web + API)
  - [ ] Test project with DEO issues detected
  - [ ] Test project with actionable AND informational (technical) issues

- **Test accounts and sample data:**
  - [ ] User with OWNER role (can see actionable issues)
  - [ ] User with VIEWER role (can only see detected issues, actionable count = 0)
  - [ ] Project with mixed issue types: actionable (missing metadata, thin content) AND informational (indexability, crawl health)

- **Required user roles or subscriptions:**
  - [ ] OWNER role for actionable issue tests
  - [ ] VIEWER role for role-based actionability tests

---

## Test Scenarios (Happy Path)

### Scenario 1: Work Queue → Issues Click Integrity (ASSET_OPTIMIZATION Bundle)

**ID:** HP-001

**Preconditions:**
- Navigate to Store Health or Work Queue page
- Ensure at least one ASSET_OPTIMIZATION bundle exists with actionable issues

**Steps:**
1. Navigate to `/projects/{projectId}/store-health` or `/projects/{projectId}/work-queue`
2. Locate an ASSET_OPTIMIZATION card (e.g., "Fix Missing Metadata")
3. Observe the scope line: "N actionable issues affecting products" (or pages/collections)
4. Note the exact count N displayed on the card
5. Note any detected count shown in parentheses (e.g., "5 actionable (7 detected)")
6. Note the preview list showing issue titles (e.g., "Missing metadata, Thin content")
7. Click the card's primary CTA
8. Observe the Issues page loads with query params: `?actionKey=...&scopeType=...&mode=actionable&pillar=...`
9. Count the number of issue rows displayed in the filtered list

**Expected Results:**
- **Click Integrity:** Issue count on Work Queue card EXACTLY matches the number of rows on Issues page
- **URL Contract:** Issues page URL includes `actionKey`, `scopeType`, `mode=actionable`, and `pillar` params
- **Preview Accuracy:** Issue titles in preview list match the titles of issues shown on Issues page
- **Preview Math (PATCH 4.1):** When card shows "N actionable issues affecting products", the "+X more" suffix (if present) must equal N - (number of issue titles shown in preview)
- **No Drift:** Count remains consistent if you navigate back and forth

---

### Scenario 2: Detected vs Actionable Mode Toggle (Blocked until PATCH 6)

**ID:** HP-002

**Status:** ⚠️ **Blocked until PATCH 6** (Issues Engine UI not yet updated)

**Preconditions:**
- Navigate to Issues page from Work Queue with mixed detected/actionable counts

**Steps:**
1. Navigate to Issues page via Work Queue card click
2. Observe mode=actionable in URL and actionable issues displayed
3. Locate mode toggle (actionable/detected) in UI
4. Click "Detected" mode toggle
5. Observe URL changes to mode=detected
6. Observe additional informational issues appear in the list

**Expected Results:**
- **Mode Toggle:** UI includes actionable/detected toggle
- **Actionable Mode:** Shows only issues where `isActionableNow === true`
- **Detected Mode:** Shows all issues including informational (technical) issues
- **Informational Badge:** Technical issues display "Informational — no action required" badge
- **Non-Clickable:** Informational issues are NOT clickable (no dead-click risk)

---

### Scenario 3: Technical Issues Are Informational (Detected But Not Actionable)

**ID:** HP-003

**Preconditions:**
- Project has technical issues detected (indexability, crawl health, etc.)
- Navigate to Issues page

**Steps:**
1. Navigate to `/projects/{projectId}/issues`
2. Filter by pillar: "Technical & Indexability"
3. Locate technical issues: "Indexability problems", "Crawl health and errors", etc.
4. Observe issue cards have "Informational — no action required" badge
5. Attempt to click the issue card
6. Observe no click affordance (not a button, just static text)

**Expected Results:**
- **Informational Badge:** Technical issues show gray "Informational" badge
- **Not Clickable:** Issue card is NOT rendered as a button (no dead-click)
- **Detected Count:** Technical issues count toward "detected" totals, NOT "actionable"
- **Mode Filtering:** Technical issues appear in mode=detected, hidden in mode=actionable

---

### Scenario 4: IssueCountsSummary Powers Summary Cards (Blocked until PATCH 6)

**ID:** HP-004

**Status:** ⚠️ **Blocked until PATCH 6** (Issues Engine UI not yet updated)

**Preconditions:**
- Navigate to Issues page with no filters applied

**Steps:**
1. Navigate to `/projects/{projectId}/issues`
2. Observe summary cards at top: "Total Issues", "Critical", "Warning", "Info"
3. Note the counts displayed
4. Open browser dev tools Network tab
5. Locate API call to `/projects/{projectId}/issues/counts-summary`
6. Verify counts in summary cards match `IssueCountsSummary` response

**Expected Results:**
- **API Call:** Issues page fetches `issueCountsSummary` endpoint
- **Summary Cards:** Use `IssueCountsSummary.bySeverity.actionableInstances` for counts
- **Pillar Badges:** Use `IssueCountsSummary.byPillar.actionableGroups` for pillar filter counts
- **Detected/Actionable:** When mode=detected, show detected counts with actionable in parentheses

---

### Scenario 5: Scope Type Filtering (scopeType Query Param) (Blocked until PATCH 6)

**ID:** HP-005

**Status:** ⚠️ **Blocked until PATCH 6** (Issues Engine UI not yet updated)

**Preconditions:**
- Navigate to Issues page via Work Queue PRODUCTS bundle

**Steps:**
1. Click Work Queue ASSET_OPTIMIZATION card with scopeType=PRODUCTS
2. Observe Issues page URL includes `scopeType=PRODUCTS`
3. Verify only issues affecting products are displayed (issue.assetTypeCounts.products > 0)
4. Change scopeType in URL to PAGES
5. Observe different issues displayed (those affecting pages)

**Expected Results:**
- **Scope Filtering:** Only issues where `issue.assetTypeCounts[scopeType] > 0` are shown
- **Count Accuracy:** Filtered list count matches Work Queue bundle's scopeCount
- **Asset Type Distribution:** Each issue has `assetTypeCounts` field with products/pages/collections breakdown

---

### Scenario 6: Role-Based Actionability (VIEWER Role)

**ID:** HP-006

**Preconditions:**
- Log in as VIEWER role user
- Navigate to Work Queue or Issues page

**Steps:**
1. Log in as VIEWER (no canGenerateDrafts, canRequestApproval, or canApply capabilities)
2. Navigate to `/projects/{projectId}/work-queue`
3. Locate ASSET_OPTIMIZATION bundles
4. Observe scopeCount = 0, scopeDetectedCount > 0
5. Observe card shows "Informational — no action required · N detected issues affecting..."
6. Click card to navigate to Issues page
7. Observe mode=detected in URL (forced because scopeCount = 0)
8. Observe all issues display as informational with no clickable affordances

**Expected Results:**
- **VIEWER Role:** No actionable issues (actionableCount = 0 everywhere)
- **Detected Only:** All Work Queue bundles show detected counts with informational label
- **No Dead Clicks:** No buttons or clickable issue cards for VIEWER
- **Mode Forced:** Issues page defaults to mode=detected for VIEWER

---

## Test Scenarios (Edge Cases)

### Scenario 7: Bundle with No Actionable Issues (scopeCount = 0)

**ID:** EC-001

**Preconditions:**
- Project has only technical (informational) issues for a given scope
- Or VIEWER role sees all issues as non-actionable

**Steps:**
1. Navigate to Work Queue
2. Locate ASSET_OPTIMIZATION bundle with scopeCount = 0 and scopeDetectedCount > 0
3. Observe card displays: "Informational — no action required · N detected issues affecting..."
4. Observe preview list shows detected issue titles
5. Click card
6. Observe Issues page URL has mode=detected (not actionable)

**Expected Results:**
- **Informational Label:** Card clearly indicates no action required
- **Detected Count Visible:** scopeDetectedCount is prominently displayed
- **Mode = Detected:** Click navigates to mode=detected (not mode=actionable)
- **No Confusion:** User understands these are diagnostic-only issues

---

### Scenario 8: Mixed Detected/Actionable Counts (scopeDetectedCount > scopeCount)

**ID:** EC-002

**Preconditions:**
- Project has mix of actionable and informational issues for same scope

**Steps:**
1. Navigate to Work Queue
2. Locate ASSET_OPTIMIZATION bundle where scopeDetectedCount > scopeCount (e.g., scopeCount=3, scopeDetectedCount=5)
3. Observe card displays: "3 actionable issues affecting products (5 detected)"
4. Click card (mode=actionable)
5. Observe Issues page shows 3 actionable issues
6. Switch to mode=detected
7. Observe Issues page now shows all 5 issues (3 actionable + 2 informational)

**Expected Results:**
- **Secondary Count:** Detected count shown in parentheses when different from actionable
- **Actionable First:** Default mode is actionable when scopeCount > 0
- **Mode Switch:** Detected mode reveals additional informational issues
- **Count Integrity:** Actionable count (3) + informational count (2) = detected count (5)

---

### Scenario 9: Empty State (No Issues Detected)

**ID:** EC-003

**Preconditions:**
- Project with no DEO issues detected
- Or all issues have been resolved

**Steps:**
1. Navigate to `/projects/{projectId}/work-queue`
2. Observe no ASSET_OPTIMIZATION bundles displayed
3. Navigate to `/projects/{projectId}/issues`
4. Observe empty state message: "No issues detected"

**Expected Results:**
- **Work Queue:** No ASSET_OPTIMIZATION bundles when no detected issues
- **Issues Page:** Empty state with green checkmark and "Your project looks healthy" message
- **Summary Cards:** All counts show 0

---

## Test Scenarios (Error Conditions)

### Scenario 10: API Error Handling (Counts Summary Fetch Fails) (Blocked until PATCH 6)

**ID:** ERR-001

**Status:** ⚠️ **Blocked until PATCH 6** (Issues Engine UI not yet updated)

**Preconditions:**
- Simulate API error for `/projects/{projectId}/issues/counts-summary`

**Steps:**
1. Use browser dev tools to block or fail the counts-summary API call
2. Navigate to Issues page
3. Observe error handling behavior

**Expected Results:**
- **Graceful Degradation:** Issues list still loads from deoIssuesReadOnly endpoint
- **Error Message:** User sees informative error message about count unavailability
- **Fallback:** Summary cards show "—" or fallback to counting issues client-side with warning

---

### Scenario 11: Stale Count Data (Issues Updated, Summary Not Refreshed)

**ID:** ERR-002

**Preconditions:**
- Issues have been updated (rescan triggered)
- Counts summary cache is stale

**Steps:**
1. Trigger issue rescan
2. Wait for issues to update
3. Observe summary cards and Work Queue counts
4. Refresh page to force re-fetch

**Expected Results:**
- **Cache Invalidation:** Counts summary is regenerated when issues change
- **Timestamp Check:** `generatedAt` timestamp in IssueCountsSummary matches `DeoIssuesResponse.generatedAt`
- **No Drift:** Counts remain consistent after refresh

---

## Regression Checks

### Regression 1: Existing Issue Fix Flows Still Work

**ID:** REG-001

**Preconditions:**
- Project with actionable issues (missing metadata, thin content)

**Steps:**
1. Navigate to Issues page
2. Click actionable issue card
3. Verify fix flow still works (navigate to product optimization page or AI fix preview)
4. Complete fix and verify issue count decrements

**Expected Results:**
- **No Breakage:** Existing fix flows (AI fix, manual edit, etc.) work as before
- **Count Update:** Issue counts update after fix is applied
- **Navigation:** returnTo context preserved in issue fix navigation

---

### Regression 2: Draft Lifecycle Not Affected by COUNT-INTEGRITY-1

**ID:** REG-002

**Preconditions:**
- Product with missing SEO metadata issue

**Steps:**
1. Navigate to Issues page
2. Click "Fix next" on missing metadata issue
3. Observe draft preview panel opens
4. Test draft lifecycle: Generate → Save draft → Apply to Shopify
5. Verify draft state transitions work correctly

**Expected Results:**
- **Draft Lifecycle:** Unsaved → Saved → Applied state transitions work
- **No Interference:** COUNT-INTEGRITY-1 changes don't break draft state machine
- **SessionStorage:** Saved drafts persist across navigation

---

## Performance Checks

### Performance 1: Counts Summary API Response Time

**ID:** PERF-001

**Preconditions:**
- Project with 50+ issues

**Steps:**
1. Navigate to Issues page
2. Open browser dev tools Network tab
3. Measure response time for `/projects/{projectId}/issues/counts-summary`

**Expected Results:**
- **Response Time:** < 500ms for typical project (50 issues)
- **Payload Size:** Reasonable JSON size (< 50KB for 50 issues)
- **Caching:** Subsequent calls use cache when appropriate

---

## Accessibility Checks

### Accessibility 1: Informational Issues Are Announced Correctly

**ID:** A11Y-001

**Preconditions:**
- Screen reader enabled (NVDA, JAWS, or VoiceOver)
- Issues page loaded with informational technical issues

**Steps:**
1. Navigate to Issues page with screen reader
2. Tab through issue cards
3. Verify informational issues announce "Informational — no action required"
4. Verify non-clickable issues don't announce as interactive elements

**Expected Results:**
- **Screen Reader:** Informational badge is announced
- **Semantic HTML:** Informational issues use `<div>` not `<button>` (non-interactive)
- **Focus Order:** Tab order skips non-clickable informational issues

---

## Test Sign-Off

- [ ] All happy path scenarios (HP-001 to HP-006) pass
- [ ] All edge case scenarios (EC-001 to EC-003) pass
- [ ] All error condition scenarios (ERR-001 to ERR-002) pass
- [ ] All regression checks (REG-001 to REG-002) pass
- [ ] Performance checks (PERF-001) pass
- [ ] Accessibility checks (A11Y-001) pass
- [ ] Blocked scenarios (HP-002, HP-004, HP-005, ERR-001) documented for PATCH 6-9

---

## Notes

- **PATCH 1-5 Complete:** Backend, Work Queue types, Work Queue derivation, Work Queue Card UI complete and testable
- **PATCH 6-9 Pending:** Issues Engine UI, Store Health updates, Playwright tests not yet implemented
- **Blocked Scenarios:** Scenarios marked "Blocked until PATCH X" cannot be tested until those patches are implemented
- **Critical Path:** This testing guide covers CP-008 (Work Queue → Issues integrity) and CP-009 (Role-based actionability)
