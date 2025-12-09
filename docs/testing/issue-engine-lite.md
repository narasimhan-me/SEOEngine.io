# EngineO.ai – System-Level Manual Testing: Issue Engine Lite

> Manual tests for Issue Engine Lite (Phase UX-7): Product-focused DEO issues with fix actions.

---

## Overview

- **Purpose of this testing doc:**
  - Validate the Issue Engine Lite feature which surfaces product-focused DEO issues with actionable fix buttons.

- **High-level user impact and what "success" looks like:**
  - Users see a consolidated list of product issues at `/projects/[id]/issues`.
  - Each issue shows severity (critical/warning/info), affected count, and appropriate fix action.
  - Fix actions route users to the correct fix flow (AI fix, manual fix, or sync).
  - Severity filtering works correctly.
  - Issue counts in Products page header are accurate.

- **Related phases/sections:**
  - Phase UX-7 (Issue Engine Lite)
  - Phase UX-8 (Issue Engine Full) - extends Lite with rich metadata

- **Related documentation:**
  - `packages/shared/src/deo-issues.ts` (DeoIssue type)
  - `apps/api/src/projects/deo-issues.service.ts` (Issue detection logic)
  - `apps/web/src/app/projects/[id]/issues/page.tsx` (Issues page UI)

---

## Relationship to Issue Engine Full (Phase UX-8)

Issue Engine Lite (UX-7) provides the foundation for product-focused issues with fix actions. Issue Engine Full (UX-8) extends ALL issues (including Lite issues) with additional metadata:

| Field | Lite (UX-7) | Full (UX-8) |
|-------|-------------|-------------|
| type | ✅ | ✅ |
| fixType | ✅ | ✅ |
| fixReady | ✅ | ✅ |
| primaryProductId | ✅ | ✅ |
| category | - | ✅ |
| whyItMatters | - | ✅ |
| recommendedFix | - | ✅ |
| aiFixable | - | ✅ |
| fixCost | - | ✅ |

**Testing Note:** If testing Issue Engine Full fields, see:
- `docs/manual-testing/phase-ux-8-issue-engine-full.md`
- `docs/testing/issue-engine-full-*.md`

---

## Preconditions

- **Environment requirements:**
  - [ ] Backend API running
  - [ ] Frontend web app running
  - [ ] Database with test project and products

- **Test accounts and sample data:**
  - [ ] Project with connected Shopify store
  - [ ] Products with various metadata states:
    - Missing SEO titles
    - Missing SEO descriptions
    - Short/weak descriptions
    - Missing images
    - Missing prices
    - Missing categories
  - [ ] At least one crawl completed

- **Required user roles or subscriptions:**
  - [ ] Any authenticated user with project access

---

## Test Scenarios (Happy Path)

### Scenario 1: View Issues Engine page

**ID:** HP-001

**Preconditions:**
- User has a project with synced products
- At least one crawl has been run

**Steps:**
1. Navigate to `/projects/[id]/issues`
2. Observe the page layout

**Expected Results:**
- **UI:** Page shows "Issues Engine" header with project name
- **Summary Cards:** Total Issues, Critical, Warning, Info counts displayed
- **Issue List:** Issues appear with severity badges and fix actions
- **Empty State:** If no issues, green "No issues detected" message shown

---

### Scenario 2: Severity filtering

**ID:** HP-002

**Preconditions:**
- Project has issues of multiple severities

**Steps:**
1. Navigate to Issues Engine page
2. Click "Critical" filter button
3. Observe filtered list
4. Click "Warning" filter button
5. Click "Info" filter button
6. Click "All" to reset

**Expected Results:**
- **Filtering:** Only issues matching selected severity shown
- **Counts:** Filter buttons show issue counts in parentheses
- **Active State:** Selected filter button highlighted in blue

---

### Scenario 3: Fix with AI action

**ID:** HP-003

**Preconditions:**
- Issue with `fixType: 'aiFix'` and `fixReady: true` exists

**Steps:**
1. Find an issue with purple "Fix with AI" button
2. Click the button
3. Observe navigation

**Expected Results:**
- **Navigation:** Routes to `/projects/[id]/products/[productId]?from=issues&issueId=[issueId]`
- **UI:** Purple button with lightbulb icon visible
- **Product Page:** Opens to the affected product ready for AI optimization

---

### Scenario 4: Manual fix action

**ID:** HP-004

**Preconditions:**
- Issue with `fixType: 'manualFix'` exists

**Steps:**
1. Find an issue with gray "Fix manually" button
2. Click the button

**Expected Results:**
- **Navigation:** Routes to `/projects/[id]/products/[productId]?from=issues`
- **Product Page:** Opens to the affected product for manual editing

---

### Scenario 5: Re-sync fix action

**ID:** HP-005

**Preconditions:**
- Issue with `fixType: 'syncFix'` exists (e.g., missing price from stale sync)

**Steps:**
1. Find an issue with green "Re-sync from Shopify" button
2. Click the button

**Expected Results:**
- **Navigation:** Routes to `/projects/[id]/products?action=sync`
- **Products Page:** Sync action triggered or user prompted to sync

---

### Scenario 6: Re-scan Issues button

**ID:** HP-006

**Preconditions:**
- User on Issues Engine page

**Steps:**
1. Click "Re-scan Issues" button
2. Observe loading state
3. Wait for completion

**Expected Results:**
- **Loading:** Button shows spinner with "Scanning..."
- **Completion:** Success toast shown, issues list refreshed
- **Error:** If refresh fails, error toast shown

---

### Scenario 7: Issues link from Products page

**ID:** HP-007

**Preconditions:**
- Project has product issues

**Steps:**
1. Navigate to Products page
2. Observe header area

**Expected Results:**
- **Issue Badge:** Orange badge showing issue count appears next to "Products" header
- **Click:** Clicking badge navigates to Issues Engine page

---

### Scenario 8: Pre-crawl banner mentions Issues

**ID:** HP-008

**Preconditions:**
- Project with products but no crawl yet

**Steps:**
1. Navigate to Products page
2. Observe pre-crawl guardrail banner

**Expected Results:**
- **Message:** Banner mentions Issues Engine for diagnosis and AI-powered fixes
- **Link:** "Issues Engine" is a clickable link to `/projects/[id]/issues`

---

## Edge Cases

### EC-001: No issues detected

**Description:** Project has no product issues.

**Steps:**
1. Navigate to Issues Engine page for healthy project

**Expected Behavior:**
- Green checkmark icon displayed
- "No issues detected" message shown
- "Your project looks healthy based on the latest analysis" explanation

---

### EC-002: Empty filter results

**Description:** Filter selected shows no matching issues.

**Steps:**
1. Navigate to Issues Engine page
2. Filter by severity with 0 count

**Expected Behavior:**
- Message: "No [severity] issues"
- Suggestion to select a different filter

---

### EC-003: Issue without fix action

**Description:** Issue has no viable fix action (no `primaryProductId` or default fallback).

**Steps:**
1. Create scenario with orphan issue

**Expected Behavior:**
- Issue displayed without fix button
- Or "View affected" button linking to products list

---

## Error Handling

### ERR-001: API failure on issues fetch

**Scenario:** Backend returns error when fetching issues.

**Steps:**
1. Simulate API failure
2. Navigate to Issues Engine page

**Expected Behavior:**
- Error banner displayed with message
- "Retry" button available
- User can attempt to reload

---

### ERR-002: Re-scan failure

**Scenario:** Re-scan Issues button fails.

**Steps:**
1. Simulate refresh failure
2. Click "Re-scan Issues"

**Expected Behavior:**
- Error toast: "Failed to refresh issues"
- Button returns to idle state
- User can retry

---

## Issue Types Covered

| Issue ID | Type | Severity | Fix Type |
|----------|------|----------|----------|
| `missing_seo_title` | Metadata | Critical | aiFix |
| `missing_seo_description` | Metadata | Critical | aiFix |
| `weak_seo_title` | Content Quality | Warning | aiFix |
| `weak_seo_description` | Content Quality | Warning | aiFix |
| `missing_long_description` | Content Quality | Warning | manualFix |
| `duplicate_product_content` | Content Quality | Warning | manualFix |
| `low_entity_coverage` | AI Visibility | Warning | aiFix |
| `not_answer_ready` | AI Visibility | Warning | aiFix |
| `weak_intent_match` | AI Visibility | Info | aiFix |
| `missing_product_image` | Structural | Critical | syncFix |
| `missing_price` | Structural | Critical | syncFix |
| `missing_category` | Structural | Warning | manualFix |

---

## Regression

### Areas potentially impacted:

- [ ] **DEO Issues API:** Ensure `/projects/:id/deo-issues` returns new issue fields
- [ ] **Products Page:** Ensure issue badge renders correctly
- [ ] **Navigation:** Ensure Issues tab works in project layout
- [ ] **Product Workspace:** Ensure fix action navigation works

### Quick sanity checks:

- [ ] Issues Engine page loads
- [ ] Severity filtering works
- [ ] Fix buttons navigate correctly
- [ ] Issue counts are accurate

---

## Post-Conditions

### Data cleanup steps:

- [ ] No cleanup required (read-only feature)

### Follow-up verification:

- [ ] Issues refresh after crawl
- [ ] Issue counts sync between pages

---

## Known Issues

- **Intentionally accepted issues:**
  - Issues are computed on-demand; may take a moment on first load

- **Out-of-scope items:**
  - Bulk fix actions (future enhancement)
  - Issue history/tracking (future enhancement)

- **TODOs:**
  - [ ] Add issue priority sorting
  - [ ] Add product grouping for issues affecting multiple products

---

## Approval

| Field | Value |
|-------|-------|
| **Tester Name** | [Pending] |
| **Date** | [YYYY-MM-DD] |
| **Overall Status** | [ ] Passed / [ ] Blocked / [ ] Failed |
| **Notes** | Issue Engine Lite (Phase UX-7) manual testing |
